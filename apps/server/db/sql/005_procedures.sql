-- 005_procedures.sql
-- Stored procedures for every banking operation. Each CALL runs inside one
-- transaction, so the ledger, balances, loans and dues change together or
-- not at all. Balance updates themselves happen in
-- trg_transactions_apply_balance; procedures check the rules first so the
-- caller gets a clear message instead of a constraint violation.
--
-- Procedures that create a row return its id through an INOUT parameter:
--   CALL sp_deposit('<user uuid>', 500.00, NULL);  -- returns p_txn_id

-- Withdrawals above this amount wait for admin approval.
CREATE OR REPLACE FUNCTION fn_withdrawal_approval_limit()
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 50000.00::numeric $$;

CREATE OR REPLACE FUNCTION fn_format_inr(p_amount numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT '₹' || to_char(p_amount, 'FM999999999990.00') $$;

------------------------------------------------------------------------------
-- Customer: register online. Creates the user and a PENDING account
-- application at the chosen branch. No account number yet.
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_register_customer(
  p_name text,
  p_email text,
  p_password_hash text,
  p_phone text,
  p_date_of_birth date,
  p_address text,
  p_branch_code text,
  p_account_type account_type,
  INOUT p_user_id uuid DEFAULT NULL,
  INOUT p_application_no bigint DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Enter a valid 10-digit mobile number';
  END IF;
  IF p_date_of_birth IS NULL OR p_date_of_birth > current_date THEN
    RAISE EXCEPTION 'Enter a valid date of birth';
  END IF;
  IF age(current_date, p_date_of_birth) < interval '18 years' THEN
    RAISE EXCEPTION 'You must be at least 18 years old to open an account online';
  END IF;
  IF p_address IS NULL OR length(trim(p_address)) < 10 THEN
    RAISE EXCEPTION 'Enter your full address (at least 10 characters)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM branches WHERE code = p_branch_code) THEN
    RAISE EXCEPTION 'Unknown branch %', p_branch_code;
  END IF;

  INSERT INTO users (name, email, password_hash, role, phone, date_of_birth, address)
  VALUES (trim(p_name), lower(trim(p_email)), p_password_hash, 'customer', p_phone, p_date_of_birth, trim(p_address))
  RETURNING id INTO p_user_id;

  INSERT INTO accounts (user_id, branch_code, account_type)
  VALUES (p_user_id, p_branch_code, coalesce(p_account_type, 'SAVINGS'))
  RETURNING application_no INTO p_application_no;
END;
$$;

------------------------------------------------------------------------------
-- Admin: approve an account application. Assigns the account number and
-- opens the account with a ₹0 balance.
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_approve_account(
  p_admin_id uuid,
  p_account_id uuid,
  INOUT p_account_number char(12) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts;
BEGIN
  PERFORM fn_require_admin(p_admin_id);

  SELECT * INTO v_account FROM accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account application not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_account.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending applications can be approved (this one is %)', v_account.status;
  END IF;

  p_account_number := fn_generate_account_number(v_account.branch_code, v_account.account_type);

  UPDATE accounts
  SET status = 'ACTIVE',
      account_number = p_account_number,
      opened_at = now(),
      decided_by = p_admin_id,
      decided_at = now()
  WHERE id = p_account_id;
END;
$$;

------------------------------------------------------------------------------
-- Admin: reject an account application
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_reject_account(
  p_admin_id uuid,
  p_account_id uuid,
  p_reason text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts;
BEGIN
  PERFORM fn_require_admin(p_admin_id);

  SELECT * INTO v_account FROM accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account application not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_account.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending applications can be rejected (this one is %)', v_account.status;
  END IF;

  UPDATE accounts
  SET status = 'REJECTED',
      decision_note = nullif(trim(p_reason), ''),
      decided_by = p_admin_id,
      decided_at = now()
  WHERE id = p_account_id;
END;
$$;

------------------------------------------------------------------------------
-- Customer: deposit
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_deposit(
  p_user_id uuid,
  p_amount numeric,
  INOUT p_txn_id bigint DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts;
BEGIN
  PERFORM fn_assert_amount(p_amount);
  v_account := fn_lock_customer_account(p_user_id);

  IF v_account.status = 'FROZEN' THEN
    RAISE EXCEPTION 'Your account is frozen. Deposits are not allowed.';
  END IF;

  INSERT INTO transactions (account_id, type, direction, amount, status, description, created_by, posted_at)
  VALUES (v_account.id, 'DEPOSIT', 'CR', p_amount, 'COMPLETED', 'Cash deposit', p_user_id, now())
  RETURNING id INTO p_txn_id;
END;
$$;

------------------------------------------------------------------------------
-- Customer: withdraw. Up to the approval limit posts immediately; above it the
-- row is PENDING until an admin approves or rejects it. Funds are not held.
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_withdraw(
  p_user_id uuid,
  p_amount numeric,
  INOUT p_txn_id bigint DEFAULT NULL,
  INOUT p_status txn_status DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts;
BEGIN
  PERFORM fn_assert_amount(p_amount);
  v_account := fn_lock_customer_account(p_user_id);

  IF v_account.status = 'FROZEN' THEN
    RAISE EXCEPTION 'Your account is frozen. Withdrawals are not allowed.';
  END IF;
  IF v_account.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %', fn_format_inr(v_account.balance);
  END IF;

  IF p_amount > fn_withdrawal_approval_limit() THEN
    INSERT INTO transactions (account_id, type, direction, amount, status, description, created_by)
    VALUES (v_account.id, 'WITHDRAWAL', 'DR', p_amount, 'PENDING',
            'Cash withdrawal (awaiting approval)', p_user_id)
    RETURNING id, status INTO p_txn_id, p_status;
  ELSE
    INSERT INTO transactions (account_id, type, direction, amount, status, description, created_by, posted_at)
    VALUES (v_account.id, 'WITHDRAWAL', 'DR', p_amount, 'COMPLETED', 'Cash withdrawal', p_user_id, now())
    RETURNING id, status INTO p_txn_id, p_status;
  END IF;
END;
$$;

------------------------------------------------------------------------------
-- "First-name L." form of a holder's name, shown to a payer before a
-- transfer without revealing the full name.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_mask_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_agg(CASE WHEN n = 1 THEN w ELSE left(w, 1) || '.' END, ' ' ORDER BY n)
  FROM regexp_split_to_table(trim(p_name), '\s+') WITH ORDINALITY AS t (w, n);
$$;

------------------------------------------------------------------------------
-- Look up a payee by account number + IFSC. Validates the check digit and
-- that the IFSC belongs to the account's branch, so a typo is caught before
-- any money moves.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_find_payee(p_account_number text, p_ifsc text)
RETURNS accounts
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_account accounts;
  v_number text := regexp_replace(coalesce(p_account_number, ''), '\s', '', 'g');
  v_ifsc text := upper(trim(coalesce(p_ifsc, '')));
BEGIN
  IF v_number !~ '^[0-9]{12}$' THEN
    RAISE EXCEPTION 'Account number must be 12 digits';
  END IF;
  IF NOT fn_is_valid_account_number(v_number) THEN
    RAISE EXCEPTION 'Invalid account number: the check digit does not match. Please re-check the number.';
  END IF;
  IF NOT fn_is_valid_ifsc(v_ifsc) THEN
    RAISE EXCEPTION 'IFSC must be 11 characters, e.g. BNBK0000001';
  END IF;

  SELECT * INTO v_account FROM accounts WHERE account_number = v_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No account exists with number %', v_number USING ERRCODE = 'no_data_found';
  END IF;
  IF (SELECT ifsc FROM branches WHERE code = v_account.branch_code) <> v_ifsc THEN
    RAISE EXCEPTION 'IFSC % does not match the branch of account %', v_ifsc, v_number;
  END IF;
  RETURN v_account;
END;
$$;

CREATE OR REPLACE FUNCTION fn_lookup_payee(p_account_number text, p_ifsc text)
RETURNS TABLE (account_number char(12), holder_name text, branch_name text, branch_city text, ifsc char(11))
LANGUAGE sql
STABLE
AS $$
  SELECT a.account_number, fn_mask_name(u.name), b.name, b.city, b.ifsc
  FROM fn_find_payee(p_account_number, p_ifsc) a
  JOIN users u ON u.id = a.user_id
  JOIN branches b ON b.code = a.branch_code;
$$;

------------------------------------------------------------------------------
-- Customer: transfer money to another account of this bank. Posts a
-- TRANSFER_OUT debit on the payer and a TRANSFER_IN credit on the payee in
-- the same transaction.
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_transfer(
  p_user_id uuid,
  p_to_account_number text,
  p_to_ifsc text,
  p_amount numeric,
  p_remarks text DEFAULT NULL,
  INOUT p_txn_id bigint DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_payee accounts;
  v_from accounts;
  v_from_id uuid;
  v_payer_name text;
  v_payee_name text;
  v_remarks text := nullif(trim(p_remarks), '');
BEGIN
  PERFORM fn_assert_amount(p_amount);
  v_payee := fn_find_payee(p_to_account_number, p_to_ifsc);

  SELECT id INTO v_from_id FROM accounts WHERE user_id = p_user_id;
  IF v_from_id = v_payee.id THEN
    RAISE EXCEPTION 'You cannot transfer money to your own account';
  END IF;

  -- Lock both accounts in id order so two opposite transfers can't deadlock.
  PERFORM 1 FROM accounts WHERE id IN (v_from_id, v_payee.id) ORDER BY id FOR UPDATE;

  v_from := fn_lock_customer_account(p_user_id);
  SELECT * INTO v_payee FROM accounts WHERE id = v_payee.id;

  IF v_from.status = 'FROZEN' THEN
    RAISE EXCEPTION 'Your account is frozen. Transfers are not allowed.';
  END IF;
  IF v_payee.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'The payee account % cannot receive money right now', v_payee.account_number;
  END IF;
  IF v_from.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %', fn_format_inr(v_from.balance);
  END IF;

  SELECT name INTO v_payer_name FROM users WHERE id = v_from.user_id;
  SELECT name INTO v_payee_name FROM users WHERE id = v_payee.user_id;

  INSERT INTO transactions (
    account_id, type, direction, amount, status, description, remarks,
    counterparty_account_id, created_by, posted_at
  )
  VALUES (
    v_from.id, 'TRANSFER_OUT', 'DR', p_amount, 'COMPLETED',
    'Transfer to ' || v_payee.account_number || ' (' || fn_mask_name(v_payee_name) || ')', v_remarks,
    v_payee.id, p_user_id, now()
  )
  RETURNING id INTO p_txn_id;

  INSERT INTO transactions (
    account_id, type, direction, amount, status, description, remarks,
    counterparty_account_id, created_by, posted_at
  )
  VALUES (
    v_payee.id, 'TRANSFER_IN', 'CR', p_amount, 'COMPLETED',
    'Transfer from ' || v_from.account_number || ' (' || fn_mask_name(v_payer_name) || ')', v_remarks,
    v_from.id, p_user_id, now()
  );
END;
$$;

------------------------------------------------------------------------------
-- Admin: approve a pending withdrawal (balance re-checked now)
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_approve_withdrawal(p_admin_id uuid, p_txn_id bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_txn transactions;
  v_account accounts;
BEGIN
  PERFORM fn_require_admin(p_admin_id);

  -- Lock the account before the transaction row, the same order every
  -- other procedure uses.
  SELECT a.* INTO v_account
  FROM accounts a
  WHERE a.id = (SELECT account_id FROM transactions WHERE id = p_txn_id)
  FOR UPDATE;

  SELECT * INTO v_txn FROM transactions WHERE id = p_txn_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_txn_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_txn.type <> 'WITHDRAWAL' OR v_txn.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending withdrawals can be approved';
  END IF;
  IF v_account.status = 'FROZEN' THEN
    RAISE EXCEPTION 'Account % is frozen. Reject the withdrawal or unfreeze the account first.',
      v_account.account_number;
  END IF;
  IF v_account.balance < v_txn.amount THEN
    RAISE EXCEPTION 'Insufficient balance to approve. Available: %, requested: %',
      fn_format_inr(v_account.balance), fn_format_inr(v_txn.amount);
  END IF;

  UPDATE transactions
  SET status = 'COMPLETED',
      description = 'Cash withdrawal (approved)',
      posted_at = now(),
      processed_by = p_admin_id,
      processed_at = now()
  WHERE id = p_txn_id;
END;
$$;

------------------------------------------------------------------------------
-- Admin: reject a pending withdrawal
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_reject_withdrawal(
  p_admin_id uuid,
  p_txn_id bigint,
  p_reason text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_txn transactions;
BEGIN
  PERFORM fn_require_admin(p_admin_id);

  SELECT * INTO v_txn FROM transactions WHERE id = p_txn_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_txn_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_txn.type <> 'WITHDRAWAL' OR v_txn.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending withdrawals can be rejected';
  END IF;

  UPDATE transactions
  SET status = 'REJECTED',
      description = 'Cash withdrawal (rejected)',
      remarks = nullif(trim(p_reason), ''),
      processed_by = p_admin_id,
      processed_at = now()
  WHERE id = p_txn_id;
END;
$$;

------------------------------------------------------------------------------
-- Admin: reverse a completed deposit or withdrawal. Posts an opposite
-- REVERSAL entry and marks the original REVERSED; nothing is deleted.
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_reverse_transaction(
  p_admin_id uuid,
  p_txn_id bigint,
  p_reason text DEFAULT NULL,
  INOUT p_reversal_id bigint DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_txn transactions;
  v_account accounts;
BEGIN
  PERFORM fn_require_admin(p_admin_id);

  SELECT a.* INTO v_account
  FROM accounts a
  WHERE a.id = (SELECT account_id FROM transactions WHERE id = p_txn_id)
  FOR UPDATE;

  SELECT * INTO v_txn FROM transactions WHERE id = p_txn_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_txn_id USING ERRCODE = 'no_data_found';
  END IF;
  IF v_txn.type IN ('LOAN_DISBURSAL', 'INTEREST_PAYMENT', 'PRINCIPAL_REPAYMENT') THEN
    RAISE EXCEPTION 'Loan-related transactions cannot be reversed';
  END IF;
  IF v_txn.type IN ('TRANSFER_OUT', 'TRANSFER_IN') THEN
    RAISE EXCEPTION 'Transfers cannot be reversed';
  END IF;
  IF v_txn.type = 'REVERSAL' THEN
    RAISE EXCEPTION 'A reversal entry cannot itself be reversed';
  END IF;
  IF v_txn.status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Only completed transactions can be reversed (this one is %)', v_txn.status;
  END IF;
  IF v_txn.direction = 'CR' AND v_account.balance < v_txn.amount THEN
    RAISE EXCEPTION 'Cannot reverse deposit: balance % is less than the deposit amount %',
      fn_format_inr(v_account.balance), fn_format_inr(v_txn.amount);
  END IF;

  INSERT INTO transactions (
    account_id, type, direction, amount, status, description, remarks,
    reversal_of, created_by, processed_by, processed_at, posted_at
  )
  VALUES (
    v_txn.account_id,
    'REVERSAL',
    CASE v_txn.direction WHEN 'CR' THEN 'DR' ELSE 'CR' END::txn_direction,
    v_txn.amount,
    'COMPLETED',
    'Reversal of ' || lower(v_txn.type::text) || ' #' || v_txn.id,
    nullif(trim(p_reason), ''),
    v_txn.id,
    p_admin_id,
    p_admin_id,
    now(),
    now()
  )
  RETURNING id INTO p_reversal_id;

  UPDATE transactions SET status = 'REVERSED' WHERE id = v_txn.id;
END;
$$;

------------------------------------------------------------------------------
-- Admin: freeze or unfreeze an account
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_set_account_status(
  p_admin_id uuid,
  p_account_id uuid,
  p_status account_status
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current account_status;
BEGIN
  PERFORM fn_require_admin(p_admin_id);
  IF p_status NOT IN ('ACTIVE', 'FROZEN') THEN
    RAISE EXCEPTION 'An account can only be set to ACTIVE or FROZEN here';
  END IF;

  SELECT status INTO v_current FROM accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_current NOT IN ('ACTIVE', 'FROZEN') THEN
    RAISE EXCEPTION 'This account is %; approve or reject the application instead', v_current;
  END IF;

  UPDATE accounts SET status = p_status WHERE id = p_account_id;
END;
$$;

------------------------------------------------------------------------------
-- Customer: request a loan
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_request_loan(
  p_user_id uuid,
  p_amount numeric,
  p_purpose text,
  INOUT p_loan_id uuid DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts;
BEGIN
  PERFORM fn_assert_amount(p_amount);
  IF p_purpose IS NULL OR length(trim(p_purpose)) = 0 THEN
    RAISE EXCEPTION 'Please state the purpose of the loan';
  END IF;

  v_account := fn_lock_customer_account(p_user_id);
  IF v_account.status = 'FROZEN' THEN
    RAISE EXCEPTION 'Your account is frozen. Loan requests are not allowed.';
  END IF;
  -- loans_one_open_per_user enforces this too; checking first gives a clearer message.
  IF EXISTS (SELECT 1 FROM loans WHERE user_id = p_user_id AND status IN ('PENDING', 'ACTIVE')) THEN
    RAISE EXCEPTION 'You already have a pending or active loan';
  END IF;

  INSERT INTO loans (user_id, account_id, amount, purpose)
  VALUES (p_user_id, v_account.id, p_amount, trim(p_purpose))
  RETURNING id INTO p_loan_id;
END;
$$;

------------------------------------------------------------------------------
-- Admin: sanction a loan at the suggested rate (p_rate NULL) or an override,
-- and credit the amount to the customer's account.
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_sanction_loan(
  p_admin_id uuid,
  p_loan_id uuid,
  p_rate numeric DEFAULT NULL,
  INOUT p_txn_id bigint DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_loan loans;
  v_account accounts;
  v_score integer;
  v_rate numeric(5, 2);
BEGIN
  PERFORM fn_require_admin(p_admin_id);

  SELECT a.* INTO v_account
  FROM accounts a
  WHERE a.id = (SELECT account_id FROM loans WHERE id = p_loan_id)
  FOR UPDATE;

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_loan.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending loans can be sanctioned (this one is %)', v_loan.status;
  END IF;
  IF v_account.status = 'FROZEN' THEN
    RAISE EXCEPTION 'Account % is frozen. A loan cannot be disbursed to it.', v_account.account_number;
  END IF;

  v_score := fn_credit_score(v_loan.user_id);
  IF p_rate IS NOT NULL AND (p_rate <= 0 OR p_rate > 50 OR p_rate <> round(p_rate, 2)) THEN
    RAISE EXCEPTION 'Interest rate must be above 0%% and at most 50%%, with up to 2 decimals';
  END IF;
  v_rate := coalesce(p_rate, fn_suggested_rate(v_score));

  UPDATE loans
  SET status = 'ACTIVE',
      interest_rate = v_rate,
      outstanding_principal = amount,
      credit_score_at_decision = v_score,
      decided_by = p_admin_id,
      decided_at = now()
  WHERE id = p_loan_id;

  INSERT INTO transactions (
    account_id, type, direction, amount, status, description, loan_id,
    created_by, processed_by, processed_at, posted_at
  )
  VALUES (
    v_loan.account_id, 'LOAN_DISBURSAL', 'CR', v_loan.amount, 'COMPLETED',
    'Loan disbursal @ ' || v_rate || '% p.a.', p_loan_id,
    p_admin_id, p_admin_id, now(), now()
  )
  RETURNING id INTO p_txn_id;
END;
$$;

------------------------------------------------------------------------------
-- Admin: reject a loan request
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_reject_loan(
  p_admin_id uuid,
  p_loan_id uuid,
  p_reason text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_loan loans;
BEGIN
  PERFORM fn_require_admin(p_admin_id);

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_loan.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending loans can be rejected (this one is %)', v_loan.status;
  END IF;

  UPDATE loans
  SET status = 'REJECTED',
      credit_score_at_decision = fn_credit_score(v_loan.user_id),
      decision_note = nullif(trim(p_reason), ''),
      decided_by = p_admin_id,
      decided_at = now()
  WHERE id = p_loan_id;
END;
$$;

------------------------------------------------------------------------------
-- Customer: pay the current due in full
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_pay_interest(
  p_user_id uuid,
  p_loan_id uuid,
  INOUT p_txn_id bigint DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts;
  v_loan loans;
  v_due loan_dues;
BEGIN
  v_account := fn_lock_customer_account(p_user_id);

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_loan.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'This loan is % and cannot be paid', v_loan.status;
  END IF;

  SELECT * INTO v_due FROM loan_dues WHERE loan_id = p_loan_id AND status = 'DUE' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nothing is due on this loan right now';
  END IF;
  IF v_account.balance < v_due.amount_due THEN
    RAISE EXCEPTION 'Insufficient balance. Due: %, available: %',
      fn_format_inr(v_due.amount_due), fn_format_inr(v_account.balance);
  END IF;

  INSERT INTO transactions (account_id, type, direction, amount, status, description, loan_id, created_by, posted_at)
  VALUES (v_account.id, 'INTEREST_PAYMENT', 'DR', v_due.amount_due, 'COMPLETED',
          'Loan interest payment (month ' || v_due.cycle_no || ')', p_loan_id, p_user_id, now())
  RETURNING id INTO p_txn_id;

  UPDATE loan_dues SET status = 'PAID', paid_txn_id = p_txn_id, paid_at = now() WHERE id = v_due.id;

  UPDATE loans
  SET consecutive_misses = 0,
      status = CASE WHEN outstanding_principal = 0 THEN 'CLOSED'::loan_status ELSE status END,
      closed_at = CASE WHEN outstanding_principal = 0 THEN now() ELSE closed_at END
  WHERE id = p_loan_id;
END;
$$;

------------------------------------------------------------------------------
-- Customer: repay principal, fully or partly, at any time
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_repay_principal(
  p_user_id uuid,
  p_loan_id uuid,
  p_amount numeric,
  INOUT p_txn_id bigint DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_account accounts;
  v_loan loans;
BEGIN
  PERFORM fn_assert_amount(p_amount);
  v_account := fn_lock_customer_account(p_user_id);

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_loan.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'This loan is % and cannot be repaid', v_loan.status;
  END IF;
  IF p_amount > v_loan.outstanding_principal THEN
    RAISE EXCEPTION 'Amount exceeds the outstanding principal of %', fn_format_inr(v_loan.outstanding_principal);
  END IF;
  IF v_account.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %', fn_format_inr(v_account.balance);
  END IF;

  INSERT INTO transactions (account_id, type, direction, amount, status, description, loan_id, created_by, posted_at)
  VALUES (v_account.id, 'PRINCIPAL_REPAYMENT', 'DR', p_amount, 'COMPLETED',
          'Loan principal repayment', p_loan_id, p_user_id, now())
  RETURNING id INTO p_txn_id;

  UPDATE loans
  SET outstanding_principal = outstanding_principal - p_amount
  WHERE id = p_loan_id
  RETURNING * INTO v_loan;

  IF v_loan.outstanding_principal = 0
     AND NOT EXISTS (SELECT 1 FROM loan_dues WHERE loan_id = p_loan_id AND status = 'DUE') THEN
    UPDATE loans SET status = 'CLOSED', closed_at = now() WHERE id = p_loan_id;
  END IF;
END;
$$;

------------------------------------------------------------------------------
-- Admin: simulate one month passing for every ACTIVE loan.
--   1. An unpaid DUE becomes MISSED; consecutive_misses + 1; its amount
--      carries forward with a 2% late fee on it.
--   2. Three consecutive misses -> DEFAULTED, no new due.
--   3. Otherwise a new due = outstanding x rate / 12 + carry-forward + fee.
------------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_run_monthly_cycle(
  p_admin_id uuid,
  INOUT p_loans_processed integer DEFAULT 0,
  INOUT p_dues_created integer DEFAULT 0,
  INOUT p_dues_missed integer DEFAULT 0,
  INOUT p_loans_defaulted integer DEFAULT 0
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_loan loans;
  v_due loan_dues;
  v_misses integer;
  v_carry numeric(14, 2);
  v_fee numeric(14, 2);
  v_interest numeric(14, 2);
BEGIN
  PERFORM fn_require_admin(p_admin_id);
  p_loans_processed := 0;
  p_dues_created := 0;
  p_dues_missed := 0;
  p_loans_defaulted := 0;

  FOR v_loan IN
    SELECT * FROM loans WHERE status = 'ACTIVE' ORDER BY created_at FOR UPDATE
  LOOP
    p_loans_processed := p_loans_processed + 1;
    v_misses := v_loan.consecutive_misses;
    v_carry := 0;
    v_fee := 0;

    SELECT * INTO v_due FROM loan_dues WHERE loan_id = v_loan.id AND status = 'DUE' FOR UPDATE;
    IF FOUND THEN
      UPDATE loan_dues SET status = 'MISSED' WHERE id = v_due.id;
      v_misses := v_misses + 1;
      v_carry := v_due.amount_due;
      v_fee := round(v_carry * 0.02, 2);
      p_dues_missed := p_dues_missed + 1;
    END IF;

    IF v_misses >= 3 THEN
      UPDATE loans SET status = 'DEFAULTED', consecutive_misses = 3 WHERE id = v_loan.id;
      p_loans_defaulted := p_loans_defaulted + 1;
      CONTINUE;
    END IF;

    v_interest := round(v_loan.outstanding_principal * v_loan.interest_rate / 100 / 12, 2);

    IF v_interest + v_carry + v_fee = 0 THEN
      -- Principal already repaid and nothing owed: the loan is done.
      UPDATE loans SET status = 'CLOSED', closed_at = now(), consecutive_misses = v_misses WHERE id = v_loan.id;
      CONTINUE;
    END IF;

    UPDATE loans SET consecutive_misses = v_misses WHERE id = v_loan.id;

    INSERT INTO loan_dues (loan_id, cycle_no, interest_amount, carried_forward, late_fee)
    VALUES (
      v_loan.id,
      (SELECT coalesce(max(cycle_no), 0) + 1 FROM loan_dues WHERE loan_id = v_loan.id),
      v_interest,
      v_carry,
      v_fee
    );
    p_dues_created := p_dues_created + 1;
  END LOOP;
END;
$$;
