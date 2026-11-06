-- 006_views.sql
-- Read models used by the API. Views are dropped and recreated so column
-- changes apply cleanly on re-run.

DROP VIEW IF EXISTS v_account_statement;
DROP VIEW IF EXISTS v_admin_transactions;
DROP VIEW IF EXISTS v_loan_summary;
DROP VIEW IF EXISTS v_customer_overview;

-- Statement with a running balance. Only settled rows (COMPLETED, or
-- REVERSED, whose effect is offset by its REVERSAL row) move the balance;
-- PENDING and REJECTED rows show no running balance.
CREATE VIEW v_account_statement AS
SELECT
  t.id AS txn_id,
  a.id AS account_id,
  a.user_id,
  a.account_number,
  t.type,
  t.direction,
  t.description,
  t.remarks,
  t.amount,
  CASE WHEN t.direction = 'CR' THEN t.amount END AS credit,
  CASE WHEN t.direction = 'DR' THEN t.amount END AS debit,
  t.status,
  t.loan_id,
  t.reversal_of,
  cp.account_number AS counterparty_account_number,
  t.created_at,
  t.posted_at,
  CASE WHEN t.posted_at IS NOT NULL THEN
    sum(CASE WHEN t.direction = 'CR' THEN t.amount ELSE -t.amount END)
      FILTER (WHERE t.posted_at IS NOT NULL)
      OVER (
        PARTITION BY t.account_id
        ORDER BY coalesce(t.posted_at, t.created_at), t.id
        ROWS UNBOUNDED PRECEDING
      )
  END AS running_balance
FROM transactions t
JOIN accounts a ON a.id = t.account_id
LEFT JOIN accounts cp ON cp.id = t.counterparty_account_id;

-- Every transaction with its customer and account, for the admin console.
CREATE VIEW v_admin_transactions AS
SELECT
  t.id AS txn_id,
  t.type,
  t.direction,
  t.amount,
  t.status,
  t.description,
  t.remarks,
  t.loan_id,
  t.reversal_of,
  rv.id AS reversed_by_txn_id,
  cp.account_number AS counterparty_account_number,
  t.created_at,
  t.posted_at,
  t.processed_at,
  pb.name AS processed_by_name,
  a.id AS account_id,
  a.account_number,
  a.status AS account_status,
  a.balance AS account_balance,
  u.id AS user_id,
  u.name AS customer_name,
  u.email AS customer_email
FROM transactions t
JOIN accounts a ON a.id = t.account_id
JOIN users u ON u.id = a.user_id
LEFT JOIN transactions rv ON rv.reversal_of = t.id
LEFT JOIN accounts cp ON cp.id = t.counterparty_account_id
LEFT JOIN users pb ON pb.id = t.processed_by;

-- Loan with its current open due and payment totals.
CREATE VIEW v_loan_summary AS
SELECT
  l.id AS loan_id,
  l.user_id,
  u.name AS customer_name,
  u.email AS customer_email,
  a.account_number,
  a.status AS account_status,
  l.amount,
  l.purpose,
  l.status,
  l.interest_rate,
  l.outstanding_principal,
  l.consecutive_misses,
  l.credit_score_at_decision,
  l.decision_note,
  l.decided_at,
  l.closed_at,
  l.created_at AS requested_at,
  d.id AS current_due_id,
  d.cycle_no AS current_due_cycle,
  d.interest_amount AS current_due_interest,
  d.carried_forward AS current_due_carried_forward,
  d.late_fee AS current_due_late_fee,
  d.amount_due AS current_due_amount,
  d.created_at AS current_due_created_at,
  coalesce(p.interest_paid, 0)::numeric(14, 2) AS total_interest_paid,
  coalesce(p.principal_repaid, 0)::numeric(14, 2) AS total_principal_repaid,
  coalesce(c.dues_paid, 0)::integer AS dues_paid,
  coalesce(c.dues_missed, 0)::integer AS dues_missed
FROM loans l
JOIN users u ON u.id = l.user_id
JOIN accounts a ON a.id = l.account_id
LEFT JOIN loan_dues d ON d.loan_id = l.id AND d.status = 'DUE'
LEFT JOIN LATERAL (
  SELECT
    sum(t.amount) FILTER (WHERE t.type = 'INTEREST_PAYMENT') AS interest_paid,
    sum(t.amount) FILTER (WHERE t.type = 'PRINCIPAL_REPAYMENT') AS principal_repaid
  FROM transactions t
  WHERE t.loan_id = l.id AND t.status = 'COMPLETED'
) p ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE ld.status = 'PAID') AS dues_paid,
    count(*) FILTER (WHERE ld.status = 'MISSED') AS dues_missed
  FROM loan_dues ld
  WHERE ld.loan_id = l.id
) c ON true;

-- One row per customer: KYC details, branch and IFSC, account (or pending
-- application), balance, status, credit score and open loan.
CREATE VIEW v_customer_overview AS
SELECT
  u.id AS user_id,
  u.name,
  u.email,
  u.phone,
  u.date_of_birth,
  u.address,
  u.created_at AS customer_since,
  a.id AS account_id,
  a.application_no,
  a.account_number,
  a.account_type,
  a.balance,
  a.status AS account_status,
  a.created_at AS applied_at,
  a.opened_at AS account_opened_at,
  a.decision_note,
  a.decided_at,
  dby.name AS decided_by_name,
  b.code AS branch_code,
  b.name AS branch_name,
  b.city AS branch_city,
  b.ifsc,
  fn_credit_score(u.id) AS credit_score,
  ol.id AS open_loan_id,
  ol.status AS open_loan_status,
  ol.amount AS open_loan_amount,
  ol.outstanding_principal AS open_loan_outstanding
FROM users u
JOIN accounts a ON a.user_id = u.id
JOIN branches b ON b.code = a.branch_code
LEFT JOIN users dby ON dby.id = a.decided_by
LEFT JOIN loans ol ON ol.user_id = u.id AND ol.status IN ('PENDING', 'ACTIVE')
WHERE u.role = 'customer';
