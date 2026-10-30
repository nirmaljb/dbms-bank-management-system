# Banking Core Specification

Agreed design for the DBMS lab bank management system. Extends [SPEC.md](./SPEC.md) (auth) and uses the terms in [CONTEXT.md](../CONTEXT.md).

## 1. Decisions

| Area | Decision |
|---|---|
| Database | NeonDB PostgreSQL (any Postgres works locally) |
| Logic location | In the database: stored procedures, triggers, functions, views. Express only authenticates and calls them. |
| Schema management | Plain `.sql` files in `apps/server/db/sql/`, run in order by `npm run db:setup`. Drizzle is removed. |
| Driver | `pg` (node-postgres), which works with both Neon and local Postgres. |
| Backend | Express in `apps/server` is the only backend. Next.js rewrites `/api/*` to it. The in-memory Next.js auth route and `lib/server-auth.ts` are deleted. |
| Branding | Fictional **Bharat National Bank**, keeping the existing retro netbanking look. No SBI names, IFSC codes or logos. |
| Old mock features | Removed: fund transfer, beneficiaries, FDs, cheque books, fake CBS terminal, localStorage banking data. |

## 2. Roles and authentication

- **Customer**: signs up at `/signup` and logs in at `/login`. Lands on `/dashboard`.
- **Admin**: comes from the seed only (no signup). Logs in at `/admin/login` and lands on `/admin`.
- Login endpoints are role-scoped: `POST /api/auth/login` rejects admins, and `POST /api/auth/admin/login` rejects customers.
- Middleware: `authenticate`, plus `requireRole('customer' | 'admin')` on every banking route.

## 3. Business rules

### Accounts
- Each customer has one savings account. A trigger creates it when the customer row is inserted.
- The account starts with a generated 11-digit account number and a balance of ₹0.
- `balance >= 0` is enforced by a CHECK constraint.
- Status is `ACTIVE` or `FROZEN`. A frozen account cannot deposit, withdraw, request a loan or receive a disbursal. Paying dues is still allowed, so a freeze can't force a default.

### Deposits and withdrawals
- Amounts must be > 0, with at most 2 decimal places.
- A deposit posts immediately.
- A withdrawal of ₹50,000 or less posts immediately if the balance is enough.
- A withdrawal over ₹50,000 is created as `PENDING`. An admin approves it (the balance is re-checked at that point) or rejects it. Funds are not held while it is pending.

### Admin transaction management
- View and filter every transaction by customer, type, status and date range.
- Reverse a `COMPLETED` deposit or withdrawal. This posts an opposite `REVERSAL` entry and marks the original `REVERSED`. Ledger rows are never updated in amount or deleted.
  - Reversing a deposit fails if the balance is insufficient.
  - Loan-related transactions cannot be reversed.
- Approve or reject pending withdrawals.
- Freeze or unfreeze accounts.

### Loans
- A customer requests a loan with an amount and a purpose.
- A customer can have at most one `PENDING` or `ACTIVE` loan. This is enforced by a partial unique index.
- The admin sees the customer's credit score and a suggested rate, and sanctions at that rate or an override:

  | Score | Suggested rate (p.a.) |
  |---|---|
  | 750–900 | 9% |
  | 650–749 | 11% |
  | 300–649 | 14% |

- Sanctioning sets the loan `ACTIVE` and credits the amount to the account as a `LOAN_DISBURSAL` transaction. Rejecting sets it `REJECTED`.
- **Monthly cycle**: the admin presses **Run monthly cycle**, which simulates one month passing. For each `ACTIVE` loan:
  1. If the previous due is still `DUE`, it is marked `MISSED` and `consecutive_misses` goes up by 1. The unpaid amount carries forward, plus a 2% late fee on that unpaid amount.
  2. When `consecutive_misses` reaches 3, the loan becomes `DEFAULTED` and no new due is created.
  3. Otherwise a new due is created: `outstanding_principal × rate / 12`, plus any carry-forward and late fee.
- **Paying interest**: the customer pays the current due in full from their balance. This posts an `INTEREST_PAYMENT` transaction and resets `consecutive_misses` to 0.
- **Repaying principal**: allowed anytime, and partial payments are fine. It posts a `PRINCIPAL_REPAYMENT` transaction. When the outstanding principal reaches 0 and nothing is due, the loan becomes `CLOSED`.

### Credit score
`fn_credit_score(user_id)` is computed from history and clamped to 300–900:

```
650
+ 15 × on-time interest payments    (capped at +150)
− 40 × missed dues
+ 50 × loans closed
− 150 × loans defaulted
+ 2 × account age in months         (capped at +50)
```

### Notices
- An admin sends a notice (title and body) either to all customers (`recipient_user_id IS NULL`) or to one customer.
- Customers see an inbox with an unread count and can mark notices as read (`notice_reads` table).

## 4. Database objects

**Tables**
- `users`
- `accounts`
- `transactions`
- `loans`
- `loan_dues`
- `notices`
- `notice_reads`
- `audit_log`

**Procedures and functions**
- `sp_deposit`
- `sp_withdraw`
- `sp_approve_withdrawal`
- `sp_reject_withdrawal`
- `sp_reverse_transaction`
- `sp_set_account_status`
- `sp_request_loan`
- `sp_sanction_loan`
- `sp_reject_loan`
- `sp_pay_interest`
- `sp_repay_principal`
- `sp_run_monthly_cycle`
- `fn_credit_score`
- `fn_suggested_rate`

**Triggers**
- Auto-create an account when a customer is inserted.
- Block transactions on frozen accounts.
- Maintain `updated_at`.
- Write row-change audit entries for `accounts`, `loans` and `transactions` to `audit_log`.

**Views**
- `v_account_statement`: running balance per transaction.
- `v_admin_transactions`: transactions joined with customer and account.
- `v_loan_summary`: loan with current due and totals paid.
- `v_customer_overview`: customer, account, balance, status, credit score and active loan.

## 5. Pages

**Customer** (`/dashboard`)
- Account summary
- Deposit
- Withdraw
- Statement
- Loans: request, current due, pay interest, repay principal, history
- Credit score with its breakdown
- Notices

**Admin** (`/admin`)
- Overview: customer count, total deposits, pending items
- Customers: freeze or unfreeze
- Transactions: filter, reverse, approve or reject withdrawals
- Loans: sanction with the suggested rate, reject, run monthly cycle
- Notices: compose and view sent notices

## 6. Setup

1. Put `DATABASE_URL` and `JWT_SECRET` in `apps/server/.env`.
2. Run `npm run db:setup --workspace=apps/server` to apply the SQL files in order and seed the admin account.
3. Run `npm run dev` to start the server and web app.
