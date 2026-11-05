-- 002_tables.sql
-- Tables, constraints and indexes. Business rules that can be expressed
-- declaratively (non-negative balance, one open loan per customer, ledger
-- shape) live here; the rest is in triggers and procedures.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL CHECK (length(trim(name)) >= 2),
  email         text NOT NULL,
  password_hash text NOT NULL,
  role          user_role NOT NULL DEFAULT 'customer',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

-- One savings account per customer, created by trg_users_create_account.
CREATE TABLE IF NOT EXISTS accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users (id),
  account_number char(11) NOT NULL,
  account_type   text NOT NULL DEFAULT 'SAVINGS',
  balance        numeric(14, 2) NOT NULL DEFAULT 0,
  status         account_status NOT NULL DEFAULT 'ACTIVE',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_user_id_key UNIQUE (user_id),
  CONSTRAINT accounts_account_number_key UNIQUE (account_number),
  CONSTRAINT accounts_account_number_format CHECK (account_number ~ '^[1-9][0-9]{10}$'),
  CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0)
);

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
  created_by   uuid REFERENCES users (id),
  processed_by uuid REFERENCES users (id),
  processed_at timestamptz,
  posted_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_reversal_of_key UNIQUE (reversal_of),
  CONSTRAINT transactions_direction_matches_type CHECK (
    (type IN ('DEPOSIT', 'LOAN_DISBURSAL') AND direction = 'CR')
    OR (type IN ('WITHDRAWAL', 'INTEREST_PAYMENT', 'PRINCIPAL_REPAYMENT') AND direction = 'DR')
    OR type = 'REVERSAL'
  ),
  CONSTRAINT transactions_loan_link CHECK (
    (type IN ('LOAN_DISBURSAL', 'INTEREST_PAYMENT', 'PRINCIPAL_REPAYMENT')) = (loan_id IS NOT NULL)
  ),
  CONSTRAINT transactions_reversal_link CHECK ((type = 'REVERSAL') = (reversal_of IS NOT NULL)),
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
