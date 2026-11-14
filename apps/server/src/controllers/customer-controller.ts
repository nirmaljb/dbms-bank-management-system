import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { query, callAs } from '../db/pool.js';
import {
  parseOr400,
  amountBodySchema,
  chequeDepositSchema,
  paymentVerifySchema,
  loanRequestSchema,
  payeeLookupSchema,
  transferSchema,
  statementQuerySchema,
} from '../utils/validation.js';
import { razorpayKeys, createOrder, isValidPaymentSignature, toPaise } from '../services/razorpay.js';

// Every handler runs behind authenticate + requireRole('customer'), so
// req.user is always set. All writes go through stored procedures.
const userId = (req: AuthenticatedRequest) => req.user!.id;

export const customerController = {
  overview: async (req: AuthenticatedRequest, res: Response) => {
    const [account] = await query(
      `SELECT o.*, fn_withdrawal_approval_limit() AS withdrawal_approval_limit,
              (SELECT count(*)::int FROM notices n
                WHERE (n.recipient_user_id IS NULL OR n.recipient_user_id = o.user_id)
                  AND NOT EXISTS (SELECT 1 FROM notice_reads r
                                   WHERE r.notice_id = n.id AND r.user_id = o.user_id)
              ) AS unread_notices
       FROM v_customer_overview o
       WHERE o.user_id = $1`,
      [userId(req)]
    );
    if (!account) {
      return res.status(404).json({ error: 'No account found for this customer' });
    }
    return res.json({ account });
  },

  // Pays in a cheque. Nothing is credited until an admin clears it.
  depositCheque: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(chequeDepositSchema, req.body, res);
    if (!body) return;
    const row = await callAs<{ p_cheque_id: string }>(
      userId(req),
      'CALL sp_deposit_cheque($1, $2, $3::date, $4::numeric, $5, $6, NULL)',
      [userId(req), body.chequeNo, body.chequeDate, body.amount, body.drawerAccountNumber, body.drawerIfsc]
    );
    return res.status(201).json({ chequeId: row.p_cheque_id, status: 'IN_CLEARING' });
  },

  cheques: async (req: AuthenticatedRequest, res: Response) => {
    const rows = await query(
      `SELECT cheque_id, cheque_no, cheque_date, amount, status, return_reason_label,
              drawer_account_number, drawer_ifsc, is_in_house, credit_txn_id, created_at, decided_at
       FROM v_cheque_deposits WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [userId(req)]
    );
    return res.json({ cheques: rows });
  },

  // What the Add Money page needs: whether the gateway is set up, the
  // per-payment limit, and recent payments.
  onlinePayments: async (req: AuthenticatedRequest, res: Response) => {
    const [limit] = await query<{ limit: string }>(`SELECT fn_online_payment_limit() AS limit`);
    const rows = await query(
      `SELECT p.id, p.amount, p.status, p.gateway_order_id, p.gateway_payment_id, p.txn_id, p.created_at, p.paid_at
       FROM online_payments p JOIN accounts a ON a.id = p.account_id
       WHERE a.user_id = $1
       ORDER BY p.created_at DESC LIMIT 20`,
      [userId(req)]
    );
    return res.json({ enabled: razorpayKeys() !== null, limit: limit?.limit, payments: rows });
  },

  // Step 1 of Add Money: check the account can take the money, create a
  // Razorpay order for it and record the order. The browser then opens
  // Razorpay Checkout with the returned order id.
  createPaymentOrder: async (req: AuthenticatedRequest, res: Response) => {
    const keys = razorpayKeys();
    if (!keys) {
      return res.status(503).json({
        error: 'Online payments are not set up. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test mode) to apps/server/.env.',
      });
    }
    const body = parseOr400(amountBodySchema, req.body, res);
    if (!body) return;
    await query(`SELECT fn_assert_can_add_money($1, $2::numeric)`, [userId(req), body.amount]);

    const [customer] = await query<{ name: string; email: string; phone: string; account_number: string }>(
      `SELECT name, email, phone, account_number FROM v_customer_overview WHERE user_id = $1`,
      [userId(req)]
    );
    let order;
    try {
      order = await createOrder(keys, toPaise(body.amount), `ac${customer!.account_number}-${Date.now()}`, {
        account_number: customer!.account_number,
      });
    } catch (err) {
      console.error(err);
      return res.status(502).json({ error: 'The payment gateway did not respond. Please try again.' });
    }

    await callAs(userId(req), 'CALL sp_create_online_payment($1, $2::numeric, $3, NULL)', [
      userId(req),
      body.amount,
      order.id,
    ]);
    return res.status(201).json({
      keyId: keys.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      prefill: { name: customer!.name, email: customer!.email, contact: customer!.phone },
    });
  },

  // Step 2: Checkout hands the browser a payment id and signature. The
  // signature is the proof of payment, so this needs no PIN; the PIN was
  // asked when the order was created. Credits at most once per order.
  verifyPayment: async (req: AuthenticatedRequest, res: Response) => {
    const keys = razorpayKeys();
    if (!keys) {
      return res.status(503).json({ error: 'Online payments are not set up' });
    }
    const body = parseOr400(paymentVerifySchema, req.body, res);
    if (!body) return;
    if (!isValidPaymentSignature(keys.keySecret, body.orderId, body.paymentId, body.signature)) {
      return res.status(400).json({ error: 'Payment could not be verified. Your account was not credited.' });
    }
    const row = await callAs<{ p_txn_id: string }>(
      userId(req),
      'CALL sp_complete_online_payment($1, $2, $3, NULL)',
      [userId(req), body.orderId, body.paymentId]
    );
    return res.json({ txnId: row.p_txn_id, status: 'COMPLETED' });
  },

  withdraw: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(amountBodySchema, req.body, res);
    if (!body) return;
    const row = await callAs<{ p_txn_id: string; p_status: string }>(
      userId(req),
      'CALL sp_withdraw($1, $2::numeric, NULL, NULL)',
      [userId(req), body.amount]
    );
    return res.status(201).json({ txnId: row.p_txn_id, status: row.p_status });
  },

  // Shows the payee's masked name and branch so the customer can confirm
  // before sending. Check digit and IFSC are validated by fn_find_payee.
  lookupPayee: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(payeeLookupSchema, req.query, res);
    if (!body) return;
    const [payee] = await query(`SELECT * FROM fn_lookup_payee($1, $2)`, [body.accountNumber, body.ifsc]);
    return res.json({ payee });
  },

  transfer: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(transferSchema, req.body, res);
    if (!body) return;
    const row = await callAs<{ p_txn_id: string }>(
      userId(req),
      'CALL sp_transfer($1, $2, $3, $4::numeric, $5, NULL)',
      [userId(req), body.accountNumber, body.ifsc, body.amount, body.remarks ?? null]
    );
    return res.status(201).json({ txnId: row.p_txn_id, status: 'COMPLETED' });
  },

  statement: async (req: AuthenticatedRequest, res: Response) => {
    const filters = parseOr400(statementQuerySchema, req.query, res);
    if (!filters) return;
    const rows = await query(
      `SELECT * FROM v_account_statement
       WHERE user_id = $1
         AND ($2::date IS NULL OR coalesce(posted_at, created_at) >= $2::date)
         AND ($3::date IS NULL OR coalesce(posted_at, created_at) < $3::date + 1)
       ORDER BY coalesce(posted_at, created_at) DESC, txn_id DESC`,
      [userId(req), filters.from ?? null, filters.to ?? null]
    );
    return res.json({ transactions: rows });
  },

  loans: async (req: AuthenticatedRequest, res: Response) => {
    const rows = await query(
      `SELECT * FROM v_loan_summary WHERE user_id = $1 ORDER BY requested_at DESC`,
      [userId(req)]
    );
    return res.json({ loans: rows });
  },

  loanDues: async (req: AuthenticatedRequest, res: Response) => {
    const rows = await query(
      `SELECT d.* FROM loan_dues d
       JOIN loans l ON l.id = d.loan_id
       WHERE d.loan_id = $1 AND l.user_id = $2
       ORDER BY d.cycle_no DESC`,
      [req.params.id, userId(req)]
    );
    return res.json({ dues: rows });
  },

  requestLoan: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(loanRequestSchema, req.body, res);
    if (!body) return;
    const row = await callAs<{ p_loan_id: string }>(
      userId(req),
      'CALL sp_request_loan($1, $2::numeric, $3, NULL)',
      [userId(req), body.amount, body.purpose]
    );
    return res.status(201).json({ loanId: row.p_loan_id });
  },

  payInterest: async (req: AuthenticatedRequest, res: Response) => {
    const row = await callAs<{ p_txn_id: string }>(
      userId(req),
      'CALL sp_pay_interest($1, $2::uuid, NULL)',
      [userId(req), req.params.id]
    );
    return res.status(201).json({ txnId: row.p_txn_id });
  },

  repayPrincipal: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(amountBodySchema, req.body, res);
    if (!body) return;
    const row = await callAs<{ p_txn_id: string }>(
      userId(req),
      'CALL sp_repay_principal($1, $2::uuid, $3::numeric, NULL)',
      [userId(req), req.params.id, body.amount]
    );
    return res.status(201).json({ txnId: row.p_txn_id });
  },

  creditScore: async (req: AuthenticatedRequest, res: Response) => {
    const [summary] = await query<{ score: number; suggested_rate: string }>(
      `SELECT fn_credit_score($1) AS score, fn_suggested_rate(fn_credit_score($1)) AS suggested_rate`,
      [userId(req)]
    );
    const breakdown = await query(
      `SELECT component, occurrences, points FROM fn_credit_score_breakdown($1)`,
      [userId(req)]
    );
    return res.json({ score: summary?.score, suggestedRate: summary?.suggested_rate, breakdown });
  },

  notices: async (req: AuthenticatedRequest, res: Response) => {
    const rows = await query(
      `SELECT n.id, n.title, n.body, n.created_at,
              (n.recipient_user_id IS NULL) AS is_broadcast,
              r.read_at
       FROM notices n
       LEFT JOIN notice_reads r ON r.notice_id = n.id AND r.user_id = $1
       WHERE n.recipient_user_id IS NULL OR n.recipient_user_id = $1
       ORDER BY n.created_at DESC`,
      [userId(req)]
    );
    const unreadCount = rows.filter((n) => !n.read_at).length;
    return res.json({ notices: rows, unreadCount });
  },

  markNoticeRead: async (req: AuthenticatedRequest, res: Response) => {
    if (!/^\d+$/.test(req.params.id ?? '')) {
      return res.status(400).json({ error: 'Invalid notice id' });
    }
    const rows = await query(
      `INSERT INTO notice_reads (notice_id, user_id)
       SELECT n.id, $2 FROM notices n
       WHERE n.id = $1 AND (n.recipient_user_id IS NULL OR n.recipient_user_id = $2)
       ON CONFLICT (notice_id, user_id) DO UPDATE SET read_at = notice_reads.read_at
       RETURNING read_at`,
      [req.params.id, userId(req)]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    return res.json({ readAt: rows[0].read_at });
  },
};
