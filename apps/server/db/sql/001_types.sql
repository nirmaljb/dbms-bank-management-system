-- 001_types.sql
-- Enumerated types used across the banking schema.
-- Each CREATE TYPE is wrapped so the file can be re-run safely.

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('ACTIVE', 'FROZEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE txn_type AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'REVERSAL',
    'LOAN_DISBURSAL',
    'INTEREST_PAYMENT',
    'PRINCIPAL_REPAYMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CR adds to the balance, DR subtracts from it.
DO $$ BEGIN
  CREATE TYPE txn_direction AS ENUM ('CR', 'DR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE txn_status AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'CLOSED', 'DEFAULTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE due_status AS ENUM ('DUE', 'PAID', 'MISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
