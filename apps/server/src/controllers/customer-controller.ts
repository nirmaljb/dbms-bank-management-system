import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { query, callAs } from '../db/pool.js';
import {
  parseOr400,
  amountBodySchema,
  loanRequestSchema,
  statementQuerySchema,
} from '../utils/validation.js';

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
      return res.status(404).json({ error: 'No savings account found for this customer' });
    }
    return res.json({ account });
  },

  deposit: async (req: AuthenticatedRequest, res: Response) => {
    const body = parseOr400(amountBodySchema, req.body, res);
    if (!body) return;
    const row = await callAs<{ p_txn_id: string }>(
      userId(req),
      'CALL sp_deposit($1, $2::numeric, NULL)',
      [userId(req), body.amount]
    );
    return res.status(201).json({ txnId: row.p_txn_id, status: 'COMPLETED' });
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
