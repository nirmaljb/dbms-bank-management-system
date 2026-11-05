-- 004_triggers.sql
-- Trigger functions and their bindings.

------------------------------------------------------------------------------
-- updated_at maintenance
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_loan_dues_updated_at
  BEFORE UPDATE ON loan_dues
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

------------------------------------------------------------------------------
-- Auto-create a savings account when a customer is inserted
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_users_create_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO accounts (user_id, account_number)
  VALUES (NEW.id, fn_generate_account_number());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_create_account
  AFTER INSERT ON users
  FOR EACH ROW
  WHEN (NEW.role = 'customer')
  EXECUTE FUNCTION fn_users_create_account();

-- Backfill: customers created before this trigger existed get an account too.
INSERT INTO accounts (user_id, account_number)
SELECT u.id, fn_generate_account_number()
FROM users u
WHERE u.role = 'customer'
  AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = u.id);

------------------------------------------------------------------------------
-- Block deposits, withdrawals and loan disbursals on frozen accounts.
-- Interest payments, principal repayments and reversals stay allowed, so a
-- freeze can never force a loan into default.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_transactions_block_frozen()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status account_status;
BEGIN
  IF NEW.type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'LOAN_DISBURSAL') THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('PENDING', 'COMPLETED') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status FROM accounts WHERE id = NEW.account_id;
  IF v_status = 'FROZEN' THEN
    RAISE EXCEPTION 'Account is frozen: % is not allowed', replace(lower(NEW.type::text), '_', ' ');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_transactions_block_frozen
  BEFORE INSERT OR UPDATE OF status ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_transactions_block_frozen();

------------------------------------------------------------------------------
-- Keep the ledger append-only: no deletes, no changes to what a row records,
-- and only these status moves: PENDING -> COMPLETED | REJECTED,
-- COMPLETED -> REVERSED.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_transactions_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Ledger rows cannot be deleted (transaction %)', OLD.id;
  END IF;

  IF NEW.account_id IS DISTINCT FROM OLD.account_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.direction IS DISTINCT FROM OLD.direction
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.loan_id IS DISTINCT FROM OLD.loan_id
     OR NEW.reversal_of IS DISTINCT FROM OLD.reversal_of
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Ledger rows cannot be modified (transaction %)', OLD.id;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'PENDING' AND NEW.status IN ('COMPLETED', 'REJECTED'))
    OR (OLD.status = 'COMPLETED' AND NEW.status = 'REVERSED')
  ) THEN
    RAISE EXCEPTION 'Invalid status change % -> % for transaction %', OLD.status, NEW.status, OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_transactions_immutable
  BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_transactions_immutable();

------------------------------------------------------------------------------
-- Apply a transaction to the account balance the moment it becomes COMPLETED
-- (inserted as COMPLETED, or PENDING -> COMPLETED on approval). Because this
-- runs in the same statement as the ledger write, the balance and the ledger
-- can never diverge. accounts_balance_non_negative rejects overdrafts.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_transactions_apply_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'COMPLETED' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status <> 'PENDING' THEN
    RETURN NULL;
  END IF;

  UPDATE accounts
  SET balance = balance + CASE NEW.direction WHEN 'CR' THEN NEW.amount ELSE -NEW.amount END
  WHERE id = NEW.account_id;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_transactions_apply_balance
  AFTER INSERT OR UPDATE OF status ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_transactions_apply_balance();

------------------------------------------------------------------------------
-- Row-change audit for accounts, loans and transactions
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_new jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
BEGIN
  -- Skip no-op updates (e.g. only updated_at changed).
  IF TG_OP = 'UPDATE' AND (v_old - 'updated_at') = (v_new - 'updated_at') THEN
    RETURN NULL;
  END IF;

  INSERT INTO audit_log (table_name, row_id, action, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    coalesce(v_new ->> 'id', v_old ->> 'id'),
    TG_OP,
    v_old,
    v_new,
    fn_current_actor()
  );
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_accounts_audit
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE OR REPLACE TRIGGER trg_loans_audit
  AFTER INSERT OR UPDATE OR DELETE ON loans
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();

CREATE OR REPLACE TRIGGER trg_transactions_audit
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_row_change();
