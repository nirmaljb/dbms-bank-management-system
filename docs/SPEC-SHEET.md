# Spec Sheet — API & Database

One-page reference for the Bharat National Bank backend. Business rules live in [BANKING-SPEC.md](./BANKING-SPEC.md); auth details in [SPEC.md](./SPEC.md).

**Stack:** Express + TypeScript (`apps/server`, port 5001) · PostgreSQL via `pg` · Next.js proxies `/api/*` to Express.
**Auth:** JWT in HTTP-only cookie `token`. 🔓 public · 👤 customer · 🛡 admin.
**Errors:** `{ "error": "<message>" }` — 400 validation / rule, 401 no session, 403 wrong role, 404 not found, 409 duplicate.
**Amounts** are sent as strings (`"1500.00"`) to avoid float loss.
**PIN** 🔒: every action (each POST marked 🔒) needs the user's 4-digit PIN in the `X-Transaction-Pin` header. Everyone starts with the default PIN `1234` (`DEFAULT_PIN`) until they set their own. Missing PIN → `428 { code: "PIN_REQUIRED" }`; wrong → `403 { code: "PIN_INVALID" }`; 3 wrong in a row lock it for 15 min → `423 { code: "PIN_LOCKED" }`. The web client asks for the PIN and resends on 428/403.

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Access | Body / Query | Returns |
|---|---|---|---|---|
| POST | `/signup` | 🔓 | `name, email, password, phone, dateOfBirth (YYYY-MM-DD), address, branchCode, accountType (SAVINGS\|CURRENT)` | `201 { user }` + cookie |
| POST | `/login` | 🔓 | `email, password` (customers only) | `{ user }` + cookie |
| POST | `/admin/login` | 🔓 | `adminId (BNBA0001 or email), password` (admins only) | `{ user }` + cookie |
| POST | `/logout` | 🔓 | — | `{ message }`, clears cookie |
| GET | `/me` | any signed-in | — | `{ user }` (`pinIsDefault` true until the PIN is changed) |
| POST | `/pin` | any signed-in | `currentPin, newPin` (4 digits, not the default) | `{ user }` |

### Public

| Method | Path | Returns |
|---|---|---|
| GET | `/api/branches` | `{ branches: [{ code, name, city, ifsc }] }` |
| GET | `/health` | `{ status: "ok" }` |

### Customer — `/api/customer` 👤

| Method | Path | Body / Query | Returns | DB call |
|---|---|---|---|---|
| GET | `/overview` | — | `{ account }` (+ `withdrawal_approval_limit`, `unread_notices`) | `v_customer_overview` |
| POST 🔒 | `/deposit` | `amount` | `201 { txnId, status }` | `sp_deposit` |
| POST 🔒 | `/withdraw` | `amount` | `201 { txnId, status }` — `PENDING` if > ₹50,000 | `sp_withdraw` |
| GET | `/payee` | `?accountNumber&ifsc` | `{ payee }` (masked name, branch) | `fn_lookup_payee` |
| POST 🔒 | `/transfer` | `accountNumber, ifsc, amount, remarks?` | `201 { txnId, status }` | `sp_transfer` |
| GET | `/statement` | `?from&to` (YYYY-MM-DD) | `{ transactions }` | `v_account_statement` |
| GET | `/loans` | — | `{ loans }` | `v_loan_summary` |
| POST 🔒 | `/loans` | `amount, purpose` | `201 { loanId }` | `sp_request_loan` |
| GET | `/loans/:id/dues` | — | `{ dues }` | `loan_dues` |
| POST 🔒 | `/loans/:id/pay-interest` | — | `201 { txnId }` | `sp_pay_interest` |
| POST 🔒 | `/loans/:id/repay` | `amount` | `201 { txnId }` | `sp_repay_principal` |
| GET | `/credit-score` | — | `{ score, suggestedRate, breakdown }` | `fn_credit_score*` |
| GET | `/notices` | — | `{ notices, unreadCount }` | `notices` |
| POST | `/notices/:id/read` | — | `{ readAt }` | `notice_reads` |

### Admin — `/api/admin` 🛡

| Method | Path | Body / Query | Returns | DB call |
|---|---|---|---|---|
| GET | `/overview` | — | `{ stats }` (counts and totals) | aggregates |
| GET | `/branches` | — | `{ branches }` with open/pending counts, deposits | `branches` ⨝ `accounts` |
| GET | `/applications` | `?status` (account_status) | `{ applications }` | `v_customer_overview` |
| POST 🔒 | `/applications/:id/approve` | — | `{ status, accountNumber }` | `sp_approve_account` |
| POST 🔒 | `/applications/:id/reject` | `reason?` | `{ status }` | `sp_reject_account` |
| GET | `/customers` | — | `{ customers }` (ACTIVE / FROZEN) | `v_customer_overview` |
| POST 🔒 | `/accounts/:id/status` | `status (ACTIVE\|FROZEN)` | `{ status }` | `sp_set_account_status` |
| POST 🔒 | `/customers/:userId/reset-pin` | — | `{ name }` — PIN back to default, lock cleared | `users` |
| GET | `/transactions` | `?customer&type&status&from&to` (max 500 rows) | `{ transactions }` | `v_admin_transactions` |
| POST 🔒 | `/transactions/:id/approve` | — | `{ status }` | `sp_approve_withdrawal` |
| POST 🔒 | `/transactions/:id/reject` | `reason?` | `{ status }` | `sp_reject_withdrawal` |
| POST 🔒 | `/transactions/:id/reverse` | `reason?` | `201 { reversalTxnId }` | `sp_reverse_transaction` |
| GET | `/loans` | `?status` (loan_status) | `{ loans }` + current score, suggested rate | `v_loan_summary` |
| POST 🔒 | `/loans/:id/sanction` | `rate?` (defaults to suggested) | `{ status, disbursalTxnId }` | `sp_sanction_loan` |
| POST 🔒 | `/loans/:id/reject` | `reason?` | `{ status }` | `sp_reject_loan` |
| POST 🔒 | `/monthly-cycle` | — | `{ loansProcessed, duesCreated, duesMissed, loansDefaulted }` | `sp_run_monthly_cycle` |
| GET | `/notices` | — | `{ notices }` with read counts | `notices` |
| POST 🔒 | `/notices` | `title, body, recipientUserId?` (null = broadcast) | `201 { noticeId }` | `notices` |

---

## Database Schema

SQL lives in `apps/server/db/sql/` and runs in order via `npm run db:setup`.

### Enums

| Type | Values |
|---|---|
| `user_role` | customer, admin |
| `account_type` | SAVINGS, CURRENT |
| `account_status` | PENDING, ACTIVE, FROZEN, REJECTED |
| `txn_type` | DEPOSIT, WITHDRAWAL, REVERSAL, LOAN_DISBURSAL, INTEREST_PAYMENT, PRINCIPAL_REPAYMENT, TRANSFER_OUT, TRANSFER_IN |
| `txn_direction` | CR, DR |
| `txn_status` | PENDING, COMPLETED, REJECTED, REVERSED |
| `loan_status` | PENDING, ACTIVE, REJECTED, CLOSED, DEFAULTED |
| `due_status` | DUE, PAID, MISSED |

### Relationships

```
branches     1 ── * accounts       (branch_code)
users        1 ── 1 accounts       (user_id)
accounts     1 ── * transactions   (account_id, counterparty_account_id)
users        1 ── * loans          (user_id)   loans * ── 1 accounts (account_id)
loans        1 ── * transactions   (loan_id)
loans        1 ── * loan_dues      (loan_id)   loan_dues 0..1 ── 1 transactions (paid_txn_id)
transactions 1 ── 0..1 transactions (reversal_of)
users        1 ── * notices        (created_by, recipient_user_id)
notices      * ── * users          via notice_reads
```

### Tables

**branches**
| Column | Type | Notes |
|---|---|---|
| code | char(4) | PK, 4 digits |
| name, city | text | |
| ifsc | char(11) | generated `BNBK000‖code`, unique |

**users**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | ≥ 2 chars |
| email | text | unique, lowercase |
| password_hash | text | bcrypt |
| role | user_role | default customer |
| staff_id | text | `BNBA####`, admins only, auto-assigned |
| phone | char(10) | `[6-9]` + 9 digits |
| date_of_birth, address | date, text | KYC |
| created_at, updated_at | timestamptz | |

**accounts** — one per customer
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| application_no | bigint | identity from 1001, unique |
| user_id | uuid | FK users, unique |
| branch_code | char(4) | FK branches |
| account_type | account_type | default SAVINGS |
| account_number | char(12) | set on approval; `BBBB PP SSSSS C` (branch, product 10/20, sequence, Luhn digit) |
| balance | numeric(14,2) | ≥ 0 |
| status | account_status | default PENDING |
| decision_note, decided_by, decided_at | | approval audit |
| opened_at, created_at, updated_at | timestamptz | |

**transactions** — append-only ledger
| Column | Type | Notes |
|---|---|---|
| id | bigint | PK, identity from 100001 |
| account_id | uuid | FK accounts |
| type / direction / status | enums | direction must match type |
| amount | numeric(14,2) | > 0 |
| description, remarks | text | |
| loan_id | uuid | FK loans; required for loan txn types |
| reversal_of | bigint | FK transactions, unique; required for REVERSAL |
| counterparty_account_id | uuid | FK accounts; required for transfers |
| created_by, processed_by | uuid | FK users |
| processed_at, posted_at, created_at, updated_at | timestamptz | posted_at set when COMPLETED / REVERSED |

**loans** — max one PENDING/ACTIVE per user (partial unique index)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id, account_id | uuid | FKs |
| amount | numeric(14,2) | > 0 |
| purpose | text | |
| status | loan_status | default PENDING |
| interest_rate | numeric(5,2) | 0–50, required once sanctioned |
| outstanding_principal | numeric(14,2) | 0..amount |
| consecutive_misses | int | 0–3 (3 → DEFAULTED) |
| credit_score_at_decision, decision_note, decided_by, decided_at, closed_at | | |

**loan_dues** — one row per loan per monthly cycle; max one DUE per loan
| Column | Type | Notes |
|---|---|---|
| id | bigint | PK |
| loan_id | uuid | FK loans; unique with cycle_no |
| cycle_no | int | > 0 |
| interest_amount, carried_forward, late_fee | numeric(14,2) | ≥ 0 |
| amount_due | numeric(14,2) | generated sum of the three |
| status | due_status | default DUE |
| paid_txn_id, paid_at | | set when PAID |

**notices** / **notice_reads**
| Column | Type | Notes |
|---|---|---|
| notices.id | bigint | PK |
| title, body | text | non-empty |
| recipient_user_id | uuid | NULL = broadcast |
| created_by | uuid | FK users |
| notice_reads (notice_id, user_id) | PK | read_at timestamptz |

**audit_log** — written by triggers on accounts, loans, transactions
`id, table_name, row_id, action (INSERT|UPDATE|DELETE), old_data jsonb, new_data jsonb, changed_by, changed_at`

### Views

| View | Used for |
|---|---|
| `v_customer_overview` | customer dashboard, admin applications/customers |
| `v_account_statement` | customer statement |
| `v_admin_transactions` | admin transaction search |
| `v_loan_summary` | customer and admin loan lists |

### Triggers

| Trigger | Effect |
|---|---|
| `trg_*_updated_at` | maintains `updated_at` |
| `trg_users_assign_staff_id` | gives admins a `BNBA####` ID |
| `trg_transactions_block_frozen` | blocks new transactions on FROZEN accounts |
| `trg_transactions_immutable` | ledger rows can't be deleted or have amounts changed |
| `trg_transactions_apply_balance` | updates `accounts.balance` when a row becomes COMPLETED |
| `trg_{accounts,loans,transactions}_audit` | writes `audit_log` |

### Key functions

`fn_luhn_check_digit`, `fn_is_valid_account_number`, `fn_generate_account_number`, `fn_is_valid_ifsc`, `fn_find_payee` / `fn_lookup_payee`, `fn_credit_score` / `fn_credit_score_breakdown`, `fn_suggested_rate`, `fn_withdrawal_approval_limit` (₹50,000), `fn_require_admin`.
