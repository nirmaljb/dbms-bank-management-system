-- 002_tables.sql
-- Tables, constraints and indexes. Business rules that can be expressed
-- declaratively (non-negative balance, one open loan per customer, ledger
-- shape) live here; the rest is in triggers and procedures.

------------------------------------------------------------------------------
-- Identifier rules. Defined here because the CHECK constraints below use them.
--
-- Account number (12 digits), built from functional blocks:
--
--   BBBB  PP  SSSSS  C
--   |     |   |      +-- check digit (Luhn / mod 10 over the first 11 digits)
--   |     |   +--------- running sequence from account_number_seq
--   |     +------------- product code: 10 = savings, 20 = current
--   +------------------- branch code
--
-- IFSC (11 characters): bank code BNBK, a fixed 0, then the branch code
-- padded to 6 characters, e.g. branch 0004 -> BNBK0000004.
------------------------------------------------------------------------------

-- Luhn check digit for a string of digits (the digit that would be appended).
CREATE OR REPLACE FUNCTION fn_luhn_check_digit(p_payload text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_len integer := length(p_payload);
  v_sum integer := 0;
  v_digit integer;
BEGIN
  IF p_payload !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Check digit input must contain digits only';
  END IF;
  -- From the right, double every other digit starting with the last one,
  -- because it sits next to the check digit once that is appended.
  FOR i IN 0 .. v_len - 1 LOOP
    v_digit := substr(p_payload, v_len - i, 1)::integer;
    IF i % 2 = 0 THEN
      v_digit := v_digit * 2;
      IF v_digit > 9 THEN
        v_digit := v_digit - 9;
      END IF;
    END IF;
    v_sum := v_sum + v_digit;
  END LOOP;
  RETURN (10 - v_sum % 10) % 10;
END;
$$;

-- True when the value is 12 digits and its last digit is the Luhn check digit
-- of the first 11. Catches every single-digit typo and most swapped digits.
CREATE OR REPLACE FUNCTION fn_is_valid_account_number(p_number text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_number IS NULL OR p_number !~ '^[0-9]{12}$' THEN
    RETURN false;
  END IF;
  RETURN right(p_number, 1)::integer = fn_luhn_check_digit(left(p_number, 11));
END;
$$;

CREATE OR REPLACE FUNCTION fn_product_code(p_type account_type)
RETURNS char(2)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type WHEN 'SAVINGS' THEN '10' WHEN 'CURRENT' THEN '20' END::char(2);
$$;

CREATE SEQUENCE IF NOT EXISTS account_number_seq MINVALUE 1 MAXVALUE 99999 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS staff_id_seq MINVALUE 1 MAXVALUE 9999 NO CYCLE;

CREATE TABLE IF NOT EXISTS branches (
  code char(4) PRIMARY KEY CHECK (code ~ '^[0-9]{4}$'),
  name text NOT NULL,
  city text NOT NULL,
  ifsc char(11) GENERATED ALWAYS AS ('BNBK000' || code) STORED,
  CONSTRAINT branches_ifsc_key UNIQUE (ifsc)
);

INSERT INTO branches (code, name, city) VALUES
  ('0001', 'Main Branch', 'New Delhi'),
  ('0002', 'Fort', 'Mumbai'),
  ('0003', 'MG Road', 'Bengaluru'),
  ('0004', 'Kalapet', 'Puducherry')
ON CONFLICT (code) DO NOTHING;

-- Customers register themselves (sp_register_customer) and fill in the KYC
-- columns. Admins are created by the setup seed and get a staff_id such as
-- BNBA0001 from trg_users_assign_staff_id; they sign in with it.
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL CHECK (length(trim(name)) >= 2),
  email         text NOT NULL,
  password_hash text NOT NULL,
  role          user_role NOT NULL DEFAULT 'customer',
  staff_id      text,
  phone         char(10) CHECK (phone ~ '^[6-9][0-9]{9}$'),
  date_of_birth date,
  address       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_staff_id_key UNIQUE (staff_id),
  CONSTRAINT users_staff_id_format CHECK (staff_id ~ '^BNBA[0-9]{4}$'),
  CONSTRAINT users_staff_id_for_admins CHECK ((role = 'admin') = (staff_id IS NOT NULL))
);

-- Transaction PIN, asked before every action (deposit, transfer, approval,
-- ...). A NULL pin_hash means the user still has the default PIN. Three wrong
-- PINs in a row lock it until pin_locked_until. Added with ALTER so existing
-- databases pick the columns up without a reset.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_failed_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;

-- One account per customer. It starts PENDING with no number; an admin
-- approves it (sp_approve_account), which assigns the number and opens it.
CREATE TABLE IF NOT EXISTS accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no bigint GENERATED ALWAYS AS IDENTITY (START WITH 1001),
  user_id        uuid NOT NULL REFERENCES users (id),
  branch_code    char(4) NOT NULL REFERENCES branches (code),
  account_type   account_type NOT NULL DEFAULT 'SAVINGS',
  account_number char(12),
  balance        numeric(14, 2) NOT NULL DEFAULT 0,
  status         account_status NOT NULL DEFAULT 'PENDING',
  decision_note  text,
  decided_by     uuid REFERENCES users (id),
  decided_at     timestamptz,
  opened_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_user_id_key UNIQUE (user_id),
  CONSTRAINT accounts_application_no_key UNIQUE (application_no),
  CONSTRAINT accounts_account_number_key UNIQUE (account_number),
  CONSTRAINT accounts_number_when_open CHECK ((status IN ('ACTIVE', 'FROZEN')) = (account_number IS NOT NULL)),
  CONSTRAINT accounts_opened_when_numbered CHECK ((account_number IS NULL) = (opened_at IS NULL)),
  CONSTRAINT accounts_account_number_valid CHECK (account_number IS NULL OR fn_is_valid_account_number(account_number)),
  CONSTRAINT accounts_account_number_branch CHECK (account_number IS NULL OR left(account_number, 4) = branch_code),
  CONSTRAINT accounts_account_number_product CHECK (
    account_number IS NULL OR substr(account_number, 5, 2) = fn_product_code(account_type)
  ),
  CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX IF NOT EXISTS accounts_status_idx ON accounts (status);

CREATE TABLE IF NOT EXISTS loans (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES users (id),
  account_id               uuid NOT NULL REFERENCES accounts (id),
  amount                   numeric(14, 2) NOT NULL CHECK (amount > 0),
  purpose                  text NOT NULL CHECK (length(trim(purpose)) > 0),
  status                   loan_status NOT NULL DEFAULT 'PENDING',
  interest_rate            numeric(5, 2) CHECK (interest_rate > 0 AND interest_rate <= 50),
  outstanding_principal    numeric(14, 2) NOT NULL DEFAULT 0,
  consecutive_misses       integer NOT NULL DEFAULT 0 CHECK (consecutive_misses BETWEEN 0 AND 3),
  credit_score_at_decision integer,
  decision_note            text,
  decided_by               uuid REFERENCES users (id),
  decided_at               timestamptz,
  closed_at                timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loans_outstanding_range CHECK (outstanding_principal BETWEEN 0 AND amount),
  CONSTRAINT loans_rate_when_sanctioned CHECK (status IN ('PENDING', 'REJECTED') OR interest_rate IS NOT NULL)
);

-- A customer may have at most one PENDING or ACTIVE loan.
CREATE UNIQUE INDEX IF NOT EXISTS loans_one_open_per_user
  ON loans (user_id) WHERE status IN ('PENDING', 'ACTIVE');

CREATE INDEX IF NOT EXISTS loans_status_idx ON loans (status);

-- The ledger. Rows are append-only: amounts never change and rows are never
-- deleted (see trg_transactions_immutable). Balance changes are applied by
-- trg_transactions_apply_balance when a row becomes COMPLETED.
CREATE TABLE IF NOT EXISTS transactions (
  id           bigint GENERATED ALWAYS AS IDENTITY (START WITH 100001) PRIMARY KEY,
  account_id   uuid NOT NULL REFERENCES accounts (id),
  type         txn_type NOT NULL,
  direction    txn_direction NOT NULL,
  amount       numeric(14, 2) NOT NULL CHECK (amount > 0),
  status       txn_status NOT NULL,
  description  text NOT NULL,
  remarks      text,
  loan_id      uuid REFERENCES loans (id),
  reversal_of  bigint REFERENCES transactions (id),
  -- The other side of a transfer: payee on TRANSFER_OUT, payer on TRANSFER_IN.
  counterparty_account_id uuid REFERENCES accounts (id),
  created_by   uuid REFERENCES users (id),
  processed_by uuid REFERENCES users (id),
  processed_at timestamptz,
  posted_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_reversal_of_key UNIQUE (reversal_of),
  CONSTRAINT transactions_direction_matches_type CHECK (
    (type IN ('DEPOSIT', 'LOAN_DISBURSAL', 'TRANSFER_IN') AND direction = 'CR')
    OR (type IN ('WITHDRAWAL', 'INTEREST_PAYMENT', 'PRINCIPAL_REPAYMENT', 'TRANSFER_OUT') AND direction = 'DR')
    OR type = 'REVERSAL'
  ),
  CONSTRAINT transactions_loan_link CHECK (
    (type IN ('LOAN_DISBURSAL', 'INTEREST_PAYMENT', 'PRINCIPAL_REPAYMENT')) = (loan_id IS NOT NULL)
  ),
  CONSTRAINT transactions_reversal_link CHECK ((type = 'REVERSAL') = (reversal_of IS NOT NULL)),
  CONSTRAINT transactions_transfer_link CHECK (
    (type IN ('TRANSFER_OUT', 'TRANSFER_IN')) = (counterparty_account_id IS NOT NULL)
  ),
  CONSTRAINT transactions_posted_when_settled CHECK (
    (status IN ('COMPLETED', 'REVERSED')) = (posted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS transactions_account_idx ON transactions (account_id, posted_at, id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions (status);
CREATE INDEX IF NOT EXISTS transactions_loan_idx ON transactions (loan_id) WHERE loan_id IS NOT NULL;

-- One row per simulated month per active loan.
CREATE TABLE IF NOT EXISTS loan_dues (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loan_id         uuid NOT NULL REFERENCES loans (id),
  cycle_no        integer NOT NULL CHECK (cycle_no > 0),
  interest_amount numeric(14, 2) NOT NULL CHECK (interest_amount >= 0),
  carried_forward numeric(14, 2) NOT NULL DEFAULT 0 CHECK (carried_forward >= 0),
  late_fee        numeric(14, 2) NOT NULL DEFAULT 0 CHECK (late_fee >= 0),
  amount_due      numeric(14, 2) GENERATED ALWAYS AS (interest_amount + carried_forward + late_fee) STORED,
  status          due_status NOT NULL DEFAULT 'DUE',
  paid_txn_id     bigint REFERENCES transactions (id),
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loan_dues_cycle_key UNIQUE (loan_id, cycle_no),
  CONSTRAINT loan_dues_paid_txn_key UNIQUE (paid_txn_id),
  CONSTRAINT loan_dues_paid_link CHECK ((status = 'PAID') = (paid_txn_id IS NOT NULL))
);

-- At most one open due per loan.
CREATE UNIQUE INDEX IF NOT EXISTS loan_dues_one_open_per_loan
  ON loan_dues (loan_id) WHERE status = 'DUE';

-- recipient_user_id NULL means the notice is broadcast to every customer.
CREATE TABLE IF NOT EXISTS notices (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title             text NOT NULL CHECK (length(trim(title)) > 0),
  body              text NOT NULL CHECK (length(trim(body)) > 0),
  recipient_user_id uuid REFERENCES users (id),
  created_by        uuid NOT NULL REFERENCES users (id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notices_recipient_idx ON notices (recipient_user_id);

CREATE TABLE IF NOT EXISTS notice_reads (
  notice_id bigint NOT NULL REFERENCES notices (id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users (id),
  read_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notice_id, user_id)
);

-- Row-level change history written by trg_*_audit.
CREATE TABLE IF NOT EXISTS audit_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  row_id     text NOT NULL,
  action     text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data   jsonb,
  new_data   jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_row_idx ON audit_log (table_name, row_id);
