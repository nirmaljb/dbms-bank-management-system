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

-- Returns the customer's account row, locked FOR UPDATE for the rest of the transaction.
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
    RAISE EXCEPTION 'No savings account found for this customer'
      USING ERRCODE = 'no_data_found';
  END IF;
  RETURN v_account;
END;
$$;

-- Random 11-digit account number that does not start with 0 and is not taken.
CREATE OR REPLACE FUNCTION fn_generate_account_number()
RETURNS char(11)
LANGUAGE plpgsql
AS $$
DECLARE
  v_number char(11);
BEGIN
  LOOP
    v_number := (10000000000 + floor(random() * 90000000000))::bigint::text;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM accounts WHERE account_number = v_number);
  END LOOP;
  RETURN v_number;
END;
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
      coalesce((SELECT fn_months_between(created_at, now()) FROM accounts
        WHERE user_id = p_user_id), 0)                                AS account_months
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
