# Bharat National Bank — DBMS Lab Bank Management System

A fictional retail bank. Customers apply online for a savings or current account at a branch, and once an admin approves it they get a 12-digit account number (branch + product + sequence + check digit) and their branch's IFSC code. They can then deposit, withdraw, transfer money to other accounts by account number + IFSC, take a loan and track their credit score. Admins sign in with a bank-issued Admin ID and approve account applications, approve large withdrawals, reverse transactions, freeze accounts, sanction loans, run the monthly loan cycle and send notices.

All banking rules live **in PostgreSQL** as stored procedures, triggers, functions and views ([ADR 0002](docs/adr/0002-banking-logic-in-postgres.md)). Express only authenticates the caller and `CALL`s them. Full rules: [docs/BANKING-SPEC.md](docs/BANKING-SPEC.md).

## Layout

| Path | What |
|---|---|
| `apps/server` | Express + TypeScript API on port 5001 (`pg` driver) |
| `apps/server/db/sql` | The database: `001_types` → `006_views`, applied in order |
| `apps/web` | Next.js app on port 3000; `/api/*` is rewritten to the Express server |

## Setup

1. Create `apps/server/.env` (see `apps/server/.env.example`):
   ```
   DATABASE_URL=postgresql://...   # NeonDB or any Postgres 14+
   JWT_SECRET=some-long-random-string
   ```
2. Install and build the database:
   ```sh
   npm install
   npm run db:setup
   ```
   This applies every SQL file and seeds test users (password `password123` for all):
   - admin: Admin ID `BNBA0001` / `admin@example.com` (override the email and password with `ADMIN_EMAIL` / `ADMIN_PASSWORD`). Admins never register on the site; the database issues each one an Admin ID and setup prints it.
   - customers: `demo@example.com` and `priya@example.com` (approved accounts), `ravi@example.com` (application waiting for approval). Skip them with `npm run db:setup --workspace=apps/server -- --no-demo`

   Setup is idempotent. To wipe and rebuild (for example, a database created by the old Drizzle schema):
   ```sh
   npm run db:setup --workspace=apps/server -- --reset
   ```
3. Run both apps:
   ```sh
   npm run dev
   ```
   Customers: http://localhost:3000/login · Admins: http://localhost:3000/admin/login

## Database objects

- **Tables**: `users`, `accounts`, `transactions`, `loans`, `loan_dues`, `notices`, `notice_reads`, `audit_log`
- **Procedures**: `sp_deposit`, `sp_withdraw`, `sp_approve_withdrawal`, `sp_reject_withdrawal`, `sp_reverse_transaction`, `sp_set_account_status`, `sp_request_loan`, `sp_sanction_loan`, `sp_reject_loan`, `sp_pay_interest`, `sp_repay_principal`, `sp_run_monthly_cycle`
- **Functions**: `fn_credit_score`, `fn_credit_score_breakdown`, `fn_suggested_rate`, plus helpers
- **Triggers**: account auto-creation, frozen-account block, append-only ledger, balance posting, `updated_at`, row audit
- **Views**: `v_account_statement`, `v_admin_transactions`, `v_loan_summary`, `v_customer_overview`

Try it in `psql`:

```sql
CALL sp_deposit((SELECT id FROM users WHERE email = 'demo@example.com'), 2500.00, NULL);
SELECT * FROM v_account_statement ORDER BY posted_at DESC LIMIT 5;
SELECT * FROM fn_credit_score_breakdown((SELECT id FROM users WHERE email = 'demo@example.com'));
SELECT table_name, action, changed_at FROM audit_log ORDER BY id DESC LIMIT 10;
```

## Tests

```sh
npm test
```
