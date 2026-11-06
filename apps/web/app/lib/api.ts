// Thin fetch wrappers for the Express banking API (proxied at /api).
// Postgres numeric values arrive as strings and are kept that way until
// they are formatted for display.

export type ApiResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/**
 * Asks the user for their transaction PIN; resolves to null if they cancel.
 * `error` is the reason the last PIN was refused. Registered by PinPromptProvider.
 */
export type PinPrompt = (error?: string) => Promise<string | null>;

let pinPrompt: PinPrompt | null = null;

export function setPinPrompt(prompt: PinPrompt | null) {
  pinPrompt = prompt;
}

// Every action route answers 428 PIN_REQUIRED until the request carries the
// PIN, so the server decides which requests need one. A wrong PIN asks again;
// a locked PIN or a cancel ends the request.
async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<ApiResult<T>> {
  let pin: string | null = null;
  try {
    for (;;) {
      const headers: Record<string, string> = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (pin) headers['X-Transaction-Pin'] = pin;
      const res = await fetch(`/api${path}`, {
        method,
        credentials: 'include',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if ((json.code === 'PIN_REQUIRED' || json.code === 'PIN_INVALID') && pinPrompt) {
        pin = await pinPrompt(json.code === 'PIN_INVALID' ? json.error : undefined);
        if (pin === null) return { error: 'Cancelled. Nothing was changed because the PIN was not entered.' };
        continue;
      }
      if (!res.ok) {
        return { error: json.error || `Request failed (${res.status})` };
      }
      return { data: json as T };
    }
  } catch {
    return { error: 'Cannot reach the bank server. Is the API running?' };
  }
}

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiPost = <T>(path: string, body: unknown = {}) => request<T>('POST', path, body);

export function toQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function formatINR(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const TXN_TYPE_LABELS: Record<TxnType, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  TRANSFER_OUT: 'Transfer sent',
  TRANSFER_IN: 'Transfer received',
  REVERSAL: 'Reversal',
  LOAN_DISBURSAL: 'Loan disbursal',
  INTEREST_PAYMENT: 'Interest payment',
  PRINCIPAL_REPAYMENT: 'Principal repayment',
};

export type TxnType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'REVERSAL'
  | 'LOAN_DISBURSAL'
  | 'INTEREST_PAYMENT'
  | 'PRINCIPAL_REPAYMENT';
export type TxnStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'REVERSED';
export type LoanStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'CLOSED' | 'DEFAULTED';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'FROZEN' | 'REJECTED';
export type AccountType = 'SAVINGS' | 'CURRENT';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  SAVINGS: 'Savings',
  CURRENT: 'Current',
};

export interface Branch {
  code: string;
  name: string;
  city: string;
  ifsc: string;
}

export interface Payee {
  account_number: string;
  holder_name: string;
  branch_name: string;
  branch_city: string;
  ifsc: string;
}

/** "000110000015" -> "0001 10 00001 5": branch, product, sequence, check digit. */
export function formatAccountNumber(n: string | null | undefined): string {
  if (!n) return '—';
  return /^\d{12}$/.test(n) ? `${n.slice(0, 4)} ${n.slice(4, 6)} ${n.slice(6, 11)} ${n.slice(11)}` : n;
}

export interface CustomerOverview {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  customer_since: string;
  account_id: string;
  application_no: string;
  // null until an admin approves the application
  account_number: string | null;
  account_type: AccountType;
  balance: string;
  account_status: AccountStatus;
  applied_at: string;
  account_opened_at: string | null;
  decision_note: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  branch_code: string;
  branch_name: string;
  branch_city: string;
  ifsc: string;
  credit_score: number;
  open_loan_id: string | null;
  open_loan_status: LoanStatus | null;
  open_loan_amount: string | null;
  open_loan_outstanding: string | null;
  withdrawal_approval_limit?: string;
  unread_notices?: number;
}

export interface StatementRow {
  txn_id: string;
  account_number: string;
  type: TxnType;
  direction: 'CR' | 'DR';
  description: string;
  remarks: string | null;
  amount: string;
  credit: string | null;
  debit: string | null;
  status: TxnStatus;
  reversal_of: string | null;
  counterparty_account_number: string | null;
  created_at: string;
  posted_at: string | null;
  running_balance: string | null;
}

export interface AdminTransaction {
  txn_id: string;
  type: TxnType;
  direction: 'CR' | 'DR';
  amount: string;
  status: TxnStatus;
  description: string;
  remarks: string | null;
  reversal_of: string | null;
  reversed_by_txn_id: string | null;
  counterparty_account_number: string | null;
  created_at: string;
  posted_at: string | null;
  processed_at: string | null;
  processed_by_name: string | null;
  account_id: string;
  account_number: string;
  account_status: AccountStatus;
  account_balance: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
}

export interface LoanSummary {
  loan_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  account_number: string;
  account_status: AccountStatus;
  amount: string;
  purpose: string;
  status: LoanStatus;
  interest_rate: string | null;
  outstanding_principal: string;
  consecutive_misses: number;
  credit_score_at_decision: number | null;
  decision_note: string | null;
  decided_at: string | null;
  closed_at: string | null;
  requested_at: string;
  current_due_id: string | null;
  current_due_cycle: number | null;
  current_due_interest: string | null;
  current_due_carried_forward: string | null;
  current_due_late_fee: string | null;
  current_due_amount: string | null;
  current_due_created_at: string | null;
  total_interest_paid: string;
  total_principal_repaid: string;
  dues_paid: number;
  dues_missed: number;
  // Admin listing only
  current_credit_score?: number;
  suggested_rate?: string;
}

export interface LoanDue {
  id: string;
  cycle_no: number;
  interest_amount: string;
  carried_forward: string;
  late_fee: string;
  amount_due: string;
  status: 'DUE' | 'PAID' | 'MISSED';
  paid_at: string | null;
  created_at: string;
}

export interface CreditScore {
  score: number;
  suggestedRate: string;
  breakdown: { component: string; occurrences: number | null; points: number }[];
}

export interface CustomerNotice {
  id: string;
  title: string;
  body: string;
  created_at: string;
  is_broadcast: boolean;
  read_at: string | null;
}

export interface AdminNotice {
  id: string;
  title: string;
  body: string;
  created_at: string;
  recipient_user_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  created_by_name: string;
  read_count: number;
}

export interface AdminBranch extends Branch {
  open_accounts: number;
  pending_applications: number;
  deposits: string;
}

export interface AdminStats {
  customer_count: number;
  pending_applications: number;
  branch_count: number;
  total_deposits: string;
  frozen_accounts: number;
  pending_withdrawals: number;
  pending_withdrawal_amount: string;
  pending_loans: number;
  active_loans: number;
  outstanding_principal: string;
  defaulted_loans: number;
  open_dues: number;
  transactions_today: number;
}
