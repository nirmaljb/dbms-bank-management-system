-- 003_functions.sql
-- Helper functions, credit score and suggested interest rate.
--
-- Error convention used by every function and procedure:
--   RAISE EXCEPTION '...'                          -> business rule broken (SQLSTATE P0001)
--   RAISE EXCEPTION ... USING ERRCODE = 'no_data_found'          -> row not found (P0002)
--   RAISE EXCEPTION ... USING ERRCODE = 'insufficient_privilege' -> wrong role (42501)
-- The Express server maps these to HTTP 400 / 404 / 403.

-- Validates a money amount: positive, at most 2 decimal places, fits numeric(14,2).
CREATE OR REPLACE FUNCTION fn_assert_amount(p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  IF p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Amount can have at most 2 decimal places';
  END IF;
  IF p_amount >= 1000000000000 THEN
    RAISE EXCEPTION 'Amount is too large';
  END IF;
  RETURN p_amount;
END;
$$;

-- Raises unless the given user is an admin.
CREATE OR REPLACE FUNCTION fn_require_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only bank administrators can perform this action'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

-- Returns the customer's account row, locked FOR UPDATE for the rest of the
-- transaction. Raises if the account has not been approved, so no money can
-- move through an account that is still an application.
CREATE OR REPLACE FUNCTION fn_lock_customer_account(p_user_id uuid)
RETURNS accounts
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts;
BEGIN
  SELECT a.* INTO v_account
  FROM accounts a
  JOIN users u ON u.id = a.user_id
  WHERE a.user_id = p_user_id AND u.role = 'customer'
  FOR UPDATE OF a;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No account found for this customer'
      USING ERRCODE = 'no_data_found';
  END IF;
  IF v_account.status = 'PENDING' THEN
    RAISE EXCEPTION 'Your account application is still awaiting approval by the bank';
  END IF;
  IF v_account.status = 'REJECTED' THEN
    RAISE EXCEPTION 'Your account application was rejected by the bank';
  END IF;
  RETURN v_account;
END;
$$;

-- Next account number for a branch and product: branch (4) + product (2) +
-- sequence (5) + Luhn check digit (1). The sequence is shared by all
-- branches, so numbers never repeat even across branches.
CREATE OR REPLACE FUNCTION fn_generate_account_number(p_branch_code char(4), p_type account_type)
RETURNS char(12)
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload text;
BEGIN
  v_payload := p_branch_code || fn_product_code(p_type) || lpad(nextval('account_number_seq')::text, 5, '0');
  RETURN (v_payload || fn_luhn_check_digit(v_payload))::char(12);
END;
$$;

-- IFSC shape: 4 letters, a 0, then 6 letters or digits.
CREATE OR REPLACE FUNCTION fn_is_valid_ifsc(p_ifsc text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p_ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$', false);
$$;

-- Whole months between two timestamps.
CREATE OR REPLACE FUNCTION fn_months_between(p_from timestamptz, p_to timestamptz)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (extract(year FROM age(p_to, p_from)) * 12 + extract(month FROM age(p_to, p_from)))::integer;
$$;

-- Each component of the credit score, so the UI can show how the score was built.
--
--   650
--   + 15 x on-time interest payments    (capped at +150)
--   - 40 x missed dues
--   + 50 x loans closed
--   - 150 x loans defaulted
--   + 2 x account age in months         (capped at +50)
CREATE OR REPLACE FUNCTION fn_credit_score_breakdown(p_user_id uuid)
RETURNS TABLE (sort_order integer, component text, occurrences integer, points integer)
LANGUAGE sql
STABLE
AS $$
  WITH stats AS (
    SELECT
      (SELECT count(*) FROM loan_dues d JOIN loans l ON l.id = d.loan_id
        WHERE l.user_id = p_user_id AND d.status = 'PAID')::integer   AS dues_paid,
      (SELECT count(*) FROM loan_dues d JOIN loans l ON l.id = d.loan_id
        WHERE l.user_id = p_user_id AND d.status = 'MISSED')::integer AS dues_missed,
      (SELECT count(*) FROM loans
        WHERE user_id = p_user_id AND status = 'CLOSED')::integer     AS loans_closed,
      (SELECT count(*) FROM loans
        WHERE user_id = p_user_id AND status = 'DEFAULTED')::integer  AS loans_defaulted,
      coalesce((SELECT fn_months_between(opened_at, now()) FROM accounts
        WHERE user_id = p_user_id AND opened_at IS NOT NULL), 0)                                AS account_months
  )
  SELECT c.sort_order, c.component, c.occurrences, c.points
  FROM stats s
  CROSS JOIN LATERAL (VALUES
    (1, 'Base score',                     NULL::integer,     650),
    (2, 'On-time interest payments',      s.dues_paid,       least(15 * s.dues_paid, 150)),
    (3, 'Missed dues',                    s.dues_missed,     -40 * s.dues_missed),
    (4, 'Loans closed',                   s.loans_closed,    50 * s.loans_closed),
    (5, 'Loans defaulted',                s.loans_defaulted, -150 * s.loans_defaulted),
    (6, 'Account age (months)',           s.account_months,  least(2 * s.account_months, 50))
  ) AS c (sort_order, component, occurrences, points)
  ORDER BY c.sort_order;
$$;

-- Credit score clamped to 300-900.
CREATE OR REPLACE FUNCTION fn_credit_score(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT greatest(300, least(900, sum(points)))::integer
  FROM fn_credit_score_breakdown(p_user_id);
$$;

-- Suggested annual loan interest rate (percent) for a credit score.
CREATE OR REPLACE FUNCTION fn_suggested_rate(p_score integer)
RETURNS numeric(5, 2)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_score >= 750 THEN 9.00
    WHEN p_score >= 650 THEN 11.00
    ELSE 14.00
  END::numeric(5, 2);
$$;

-- The user id the Express server sets with set_config('app.current_user_id', ...).
CREATE OR REPLACE FUNCTION fn_current_actor()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;
