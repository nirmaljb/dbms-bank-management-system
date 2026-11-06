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
| Old mock features | Removed: beneficiaries, FDs, cheque books, fake CBS terminal, localStorage banking data. Fund transfer is back as a real, in-database feature (§3). |

## 2. Roles and authentication

- **Customer**: applies at `/signup` (name, mobile, date of birth, address, home branch, account type, email, password) and logs in at `/login` with their email. Lands on `/dashboard`. Until an admin approves the application, the dashboard shows only the application status and notices.
- **Admin**: comes from the seed only (no signup). The database gives every admin a staff **Admin ID** (`BNBA0001`, `BNBA0002`, ...) from `staff_id_seq` when the row is inserted; `db:setup` prints it. Admins log in at `/admin/login` with that Admin ID (email also works) and land on `/admin`. The seeded admin's email and password come from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Login endpoints are role-scoped: `POST /api/auth/login` rejects admins, and `POST /api/auth/admin/login` (body `{ adminId, password }`) rejects customers.
- Middleware: `authenticate`, plus `requireRole('customer' | 'admin')` on every banking route.

## 3. Business rules

### Branches and IFSC
- The bank has branches (`branches` table, seeded: 0001 New Delhi, 0002 Mumbai, 0003 Bengaluru, 0004 Puducherry).
- Each branch's IFSC is a generated column: bank code `BNBK` + `0` + branch code padded to 6, e.g. branch `0004` → `BNBK0000004`.

### Account numbers
12 digits, built from functional blocks:

| Block | Digits | Source |
|---|---|---|
| Branch code | 4 | the applicant's home branch |
| Product code | 2 | `10` savings, `20` current |
| Sequence | 5 | `account_number_seq`, shared by all branches so numbers never repeat |
| Check digit | 1 | Luhn (mod 10) over the first 11 digits |

Example: `0001 10 00001 5`. CHECK constraints enforce the check digit and that the branch and product blocks match the account's own branch and type. The check digit catches every single-digit typo before a transfer.

### Account opening and approval
- Registering (`sp_register_customer`) creates the user and a `PENDING` account application with an application number. Applicants must be 18 or older.
- An admin approves (`sp_approve_account`), which generates the account number and opens the account (`ACTIVE`, balance ₹0), or rejects it with a reason (`REJECTED`). Only `ACTIVE` and `FROZEN` accounts have a number.
- No money moves through a `PENDING` or `REJECTED` account (`fn_lock_customer_account` and the frozen-account trigger refuse it).

### Accounts
- Each customer has one account (savings or current).
- `balance >= 0` is enforced by a CHECK constraint.
- An open account is `ACTIVE` or `FROZEN`. A frozen account cannot deposit, withdraw, transfer, receive transfers, request a loan or receive a disbursal. Paying dues is still allowed, so a freeze can't force a default.

### Transfers
- A customer sends money to another account of the bank by account number + IFSC.
- They first verify the payee: the server checks the check digit and that the IFSC belongs to the payee's branch, and shows the masked holder name (`Priya S.`) and branch.
- `sp_transfer` posts a `TRANSFER_OUT` debit and a `TRANSFER_IN` credit in one transaction, linked through `counterparty_account_id`. Both accounts are locked in id order to avoid deadlocks.
- Transfers to your own account, to non-active accounts, or above the balance are refused. Transfers cannot be reversed.

### Deposits and withdrawals
- Amounts must be > 0, with at most 2 decimal places.
- A deposit posts immediately.
- A withdrawal of ₹50,000 or less posts immediately if the balance is enough.
- A withdrawal over ₹50,000 is created as `PENDING`. An admin approves it (the balance is re-checked at that point) or rejects it. Funds are not held while it is pending.

### Admin transaction management
- View and filter every transaction by customer, type, status and date range.
- Reverse a `COMPLETED` deposit or withdrawal (not transfers or loan transactions). This posts an opposite `REVERSAL` entry and marks the original `REVERSED`. Ledger rows are never updated in amount or deleted.
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
- `branches`
- `users`
- `accounts`
- `transactions`
- `loans`
- `loan_dues`
- `notices`
- `notice_reads`
- `audit_log`

**Procedures and functions**
- `sp_register_customer`
- `sp_approve_account`
- `sp_reject_account`
- `sp_deposit`
- `sp_withdraw`
- `sp_transfer`
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
- `fn_generate_account_number`, `fn_luhn_check_digit`, `fn_is_valid_account_number`, `fn_is_valid_ifsc`
- `fn_lookup_payee`, `fn_mask_name`

**Triggers**
- Assign a staff Admin ID when an admin is inserted.
- Block transactions on frozen and unopened accounts.
- Maintain `updated_at`.
- Write row-change audit entries for `accounts`, `loans` and `transactions` to `audit_log`.

**Views**
- `v_account_statement`: running balance per transaction.
- `v_admin_transactions`: transactions joined with customer and account.
- `v_loan_summary`: loan with current due and totals paid.
- `v_customer_overview`: customer KYC, branch and IFSC, account or application, balance, status, credit score and active loan.

## 5. Pages

**Customer** (`/dashboard`)
- Application status (while pending or rejected)
- Account summary with IFSC and branch
- Deposit
- Withdraw
- Transfer (verify payee, then send)
- Statement
- Loans: request, current due, pay interest, repay principal, history
- Credit score with its breakdown
- Notices

**Admin** (`/admin`)
- Overview: open accounts, total deposits, pending items, branches with IFSC codes
- Applications: review KYC details, approve (generates the account number) or reject with a reason
- Customers: freeze or unfreeze
- Transactions: filter, reverse, approve or reject withdrawals
- Loans: sanction with the suggested rate, reject, run monthly cycle
- Notices: compose and view sent notices

## 6. Setup

1. Put `DATABASE_URL` and `JWT_SECRET` in `apps/server/.env`.
2. Run `npm run db:setup --workspace=apps/server` to apply the SQL files in order and seed the admin (Admin ID `BNBA0001`) and demo customers: `demo@example.com` and `priya@example.com` (approved) and `ravi@example.com` (pending), all with password `password123`. A database from before branches/IFSC must be rebuilt with `-- --reset`.
3. Run `npm run dev` to start the server and web app.
