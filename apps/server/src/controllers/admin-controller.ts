import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { query, callAs } from '../db/pool.js';
import {
  parseOr400,
  accountStatusSchema,
  reasonSchema,
  sanctionLoanSchema,
  noticeSchema,
  transactionFilterSchema,
  loanFilterSchema,
} from '../utils/validation.js';

// Every handler runs behind authenticate + requireRole('admin'). The
// procedures also re-check the admin role via fn_require_admin.
const adminId = (req: AuthenticatedRequest) => req.user!.id;

function txnIdParam(req: AuthenticatedRequest, res: Response): string | null {
  const id = req.params.id ?? '';
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Invalid transaction id' });
    return null;
  }
  return id;
}

export const adminController = {
  overview: async (_req: AuthenticatedRequest, res: Response) => {
    const [stats] = await query(
      `SELECT
         (SELECT count(*)::int FROM users WHERE role = 'customer')                         AS customer_count,
         (SELECT coalesce(sum(balance), 0) FROM accounts)                                  AS total_deposits,
         (SELECT count(*)::int FROM accounts WHERE status = 'FROZEN')                      AS frozen_accounts,
         (SELECT count(*)::int FROM transactions
           WHERE type = 'WITHDRAWAL' AND status = 'PENDING')                               AS pending_withdrawals,
         (SELECT coalesce(sum(amount), 0) FROM transactions
           WHERE type = 'WITHDRAWAL' AND status = 'PENDING')                               AS pending_withdrawal_amount,
         (SELECT count(*)::int FROM loans WHERE status = 'PENDING')                        AS pending_loans,
         (SELECT count(*)::int FROM loans WHERE status = 'ACTIVE')                         AS active_loans,
         (SELECT coalesce(sum(outstanding_principal), 0) FROM loans WHERE status = 'ACTIVE') AS outstanding_principal,
         (SELECT count(*)::int FROM loans WHERE status = 'DEFAULTED')                      AS defaulted_loans,
         (SELECT count(*)::int FROM loan_dues WHERE status = 'DUE')                        AS open_dues,
         (SELECT count(*)::int FROM transactions WHERE created_at >= current_date)         AS transactions_today`
    );
    return res.json({ stats });
  },

  customers: async (_req: AuthenticatedRequest, res: Response) => {
    const rows = await query(`SELECT * FROM v_customer_overview ORDER BY name`);
    return res.json({ customers: rows });
  },

  setAccountStatus: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(accountStatusSchema, req.body, res);
    if (!body) return;
    await callAs(adminId(req), 'CALL sp_set_account_status($1, $2::uuid, $3::account_status)', [
      adminId(req),
      req.params.id,
      body.status,
    ]);
    return res.json({ status: body.status });
  },

  transactions: async (req: AuthenticatedRequest, res: Response) => {
    const f = parseOr400(transactionFilterSchema, req.query, res);
    if (!f) return;
    const rows = await query(
      `SELECT * FROM v_admin_transactions
       WHERE ($1::text IS NULL
              OR customer_name ILIKE '%' || $1 || '%'
              OR customer_email ILIKE '%' || $1 || '%'
              OR account_number LIKE $1 || '%')
         AND ($2::txn_type IS NULL OR type = $2::txn_type)
         AND ($3::txn_status IS NULL OR status = $3::txn_status)
         AND ($4::date IS NULL OR created_at >= $4::date)
         AND ($5::date IS NULL OR created_at < $5::date + 1)
       ORDER BY created_at DESC, txn_id DESC
       LIMIT 500`,
      [f.customer || null, f.type ?? null, f.status ?? null, f.from ?? null, f.to ?? null]
    );
    return res.json({ transactions: rows });
  },

  approveWithdrawal: async (req: AuthenticatedRequest, res: Response) => {
    const id = txnIdParam(req, res);
    if (!id) return;
    await callAs(adminId(req), 'CALL sp_approve_withdrawal($1, $2::bigint)', [adminId(req), id]);
    return res.json({ status: 'COMPLETED' });
  },

  rejectWithdrawal: async (req: AuthenticatedRequest, res: Response) => {
    const id = txnIdParam(req, res);
    if (!id) return;
    const body = parseOr400(reasonSchema, req.body, res);
    if (!body) return;
    await callAs(adminId(req), 'CALL sp_reject_withdrawal($1, $2::bigint, $3)', [
      adminId(req),
      id,
      body.reason ?? null,
    ]);
    return res.json({ status: 'REJECTED' });
  },

  reverseTransaction: async (req: AuthenticatedRequest, res: Response) => {
    const id = txnIdParam(req, res);
    if (!id) return;
    const body = parseOr400(reasonSchema, req.body, res);
    if (!body) return;
    const row = await callAs<{ p_reversal_id: string }>(
      adminId(req),
      'CALL sp_reverse_transaction($1, $2::bigint, $3, NULL)',
      [adminId(req), id, body.reason ?? null]
    );
    return res.status(201).json({ reversalTxnId: row.p_reversal_id });
  },

  loans: async (req: AuthenticatedRequest, res: Response) => {
    const f = parseOr400(loanFilterSchema, req.query, res);
    if (!f) return;
    const rows = await query(
      `SELECT s.*,
              fn_credit_score(s.user_id) AS current_credit_score,
              fn_suggested_rate(fn_credit_score(s.user_id)) AS suggested_rate
       FROM v_loan_summary s
       WHERE $1::loan_status IS NULL OR s.status = $1::loan_status
       ORDER BY (s.status = 'PENDING') DESC, s.requested_at DESC`,
      [f.status ?? null]
    );
    return res.json({ loans: rows });
  },

  sanctionLoan: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(sanctionLoanSchema, req.body, res);
    if (!body) return;
    const row = await callAs<{ p_txn_id: string }>(
      adminId(req),
      'CALL sp_sanction_loan($1, $2::uuid, $3::numeric, NULL)',
      [adminId(req), req.params.id, body.rate]
    );
    return res.json({ status: 'ACTIVE', disbursalTxnId: row.p_txn_id });
  },

  rejectLoan: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(reasonSchema, req.body, res);
    if (!body) return;
    await callAs(adminId(req), 'CALL sp_reject_loan($1, $2::uuid, $3)', [
      adminId(req),
      req.params.id,
      body.reason ?? null,
    ]);
    return res.json({ status: 'REJECTED' });
  },

  runMonthlyCycle: async (req: AuthenticatedRequest, res: Response) => {
    const row = await callAs<{
      p_loans_processed: number;
      p_dues_created: number;
      p_dues_missed: number;
      p_loans_defaulted: number;
    }>(adminId(req), 'CALL sp_run_monthly_cycle($1, NULL, NULL, NULL, NULL)', [adminId(req)]);
    return res.json({
      loansProcessed: row.p_loans_processed,
      duesCreated: row.p_dues_created,
      duesMissed: row.p_dues_missed,
      loansDefaulted: row.p_loans_defaulted,
    });
  },

  notices: async (_req: AuthenticatedRequest, res: Response) => {
    const rows = await query(
      `SELECT n.id, n.title, n.body, n.created_at, n.recipient_user_id,
              r.name AS recipient_name, r.email AS recipient_email,
              c.name AS created_by_name,
              (SELECT count(*)::int FROM notice_reads nr WHERE nr.notice_id = n.id) AS read_count
       FROM notices n
       LEFT JOIN users r ON r.id = n.recipient_user_id
       JOIN users c ON c.id = n.created_by
       ORDER BY n.created_at DESC`
    );
    return res.json({ notices: rows });
  },

  sendNotice: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(noticeSchema, req.body, res);
    if (!body) return;
    const recipient = body.recipientUserId ?? null;
    if (recipient) {
      const [customer] = await query(`SELECT 1 FROM users WHERE id = $1 AND role = 'customer'`, [
        recipient,
      ]);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
    }
    const [notice] = await query(
      `INSERT INTO notices (title, body, recipient_user_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [body.title, body.body, recipient, adminId(req)]
    );
    return res.status(201).json({ noticeId: notice?.id });
  },
};
