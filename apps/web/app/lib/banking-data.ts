export interface BankAccount {
  accountNumber: string;
  cifNumber: string;
  accountType: 'SAVINGS BANK ACCOUNT' | 'CURRENT ACCOUNT' | 'MOD ACCOUNT';
  branchName: string;
  ifscCode: string;
  balance: number;
  unclearedBalance: number;
  currency: string;
  status: 'ACTIVE' | 'FROZEN';
  nomineeRegistered: boolean;
  openDate: string;
}

export interface BankTransaction {
  id: string;
  txnDate: string;
  valueDate: string;
  description: string;
  refNo: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  channel: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI' | 'ATM' | 'BRANCH' | 'INTEREST';
}

export interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  limit: number;
  addedOn: string;
  status: 'ACTIVE' | 'COOLING_PERIOD';
}

export interface FixedDeposit {
  depositNumber: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  maturityAmount: number;
  maturityDate: string;
  bookingDate: string;
  type: 'e-TDR (Quarterly Payout)' | 'e-STDR (Cumulative)';
  status: 'ACTIVE';
}

export interface ChequeRequest {
  srn: string;
  accountNumber: string;
  leaves: number;
  requestedDate: string;
  status: 'DISPATCHED_BY_SPEED_POST' | 'PROCESSING';
  trackingNumber: string;
}

const DEFAULT_ACCOUNTS: BankAccount[] = [
  {
    accountNumber: '30892019482',
    cifNumber: '89201948210',
    accountType: 'SAVINGS BANK ACCOUNT',
    branchName: 'CONNAUGHT PLACE, NEW DELHI [00691]',
    ifscCode: 'SBIN0000691',
    balance: 148250.75,
    unclearedBalance: 0.0,
    currency: 'INR',
    status: 'ACTIVE',
    nomineeRegistered: true,
    openDate: '14-Aug-2018',
  },
  {
    accountNumber: '10928374910',
    cifNumber: '89201948210',
    accountType: 'CURRENT ACCOUNT',
    branchName: 'PARLIAMENT STREET, NEW DELHI [00107]',
    ifscCode: 'SBIN0000107',
    balance: 520400.0,
    unclearedBalance: 15000.0,
    currency: 'INR',
    status: 'ACTIVE',
    nomineeRegistered: true,
    openDate: '02-Feb-2021',
  },
];

const DEFAULT_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'TXN-01',
    txnDate: '24-Sep-2026',
    valueDate: '24-Sep-2026',
    description: 'UPI/928172910283/Zomato Online/SBIN',
    refNo: 'UPI92817291',
    type: 'DEBIT',
    amount: 540.0,
    balance: 148250.75,
    channel: 'UPI',
  },
  {
    id: 'TXN-02',
    txnDate: '23-Sep-2026',
    valueDate: '23-Sep-2026',
    description: 'NEFT CR-HDFC0000128-TECHCORP LTD-SALARY SEP 2026',
    refNo: 'NEFT928103948',
    type: 'CREDIT',
    amount: 85000.0,
    balance: 148790.75,
    channel: 'NEFT',
  },
  {
    id: 'TXN-03',
    txnDate: '20-Sep-2026',
    valueDate: '20-Sep-2026',
    description: 'ATM WDL-SBI CASH POINT CONNAUGHT PLACE',
    refNo: 'ATM0092182',
    type: 'DEBIT',
    amount: 10000.0,
    balance: 63790.75,
    channel: 'ATM',
  },
  {
    id: 'TXN-04',
    txnDate: '15-Sep-2026',
    valueDate: '15-Sep-2026',
    description: 'IMPS/P2A/6255192810/RAJESH SHARMA/RENT SEP',
    refNo: 'IMPS625519281',
    type: 'DEBIT',
    amount: 28000.0,
    balance: 73790.75,
    channel: 'IMPS',
  },
  {
    id: 'TXN-05',
    txnDate: '10-Sep-2026',
    valueDate: '10-Sep-2026',
    description: 'ACH DR-TATA POWER DELHI BILL PAYMENT',
    refNo: 'ACH0039218',
    type: 'DEBIT',
    amount: 3420.0,
    balance: 101790.75,
    channel: 'NEFT',
  },
  {
    id: 'TXN-06',
    txnDate: '01-Sep-2026',
    valueDate: '01-Sep-2026',
    description: 'INTEREST CREDIT-SB AUTO SWEEP 30-JUN TO 31-AUG',
    refNo: 'INT-SB-2026Q2',
    type: 'CREDIT',
    amount: 1210.75,
    balance: 105210.75,
    channel: 'INTEREST',
  },
  {
    id: 'TXN-07',
    txnDate: '28-Aug-2026',
    valueDate: '28-Aug-2026',
    description: 'CHQ TRF-CHQ NO 491028-MAHESH GUPTA',
    refNo: 'CHQ491028',
    type: 'DEBIT',
    amount: 15000.0,
    balance: 104000.0,
    channel: 'BRANCH',
  },
  {
    id: 'TXN-08',
    txnDate: '20-Aug-2026',
    valueDate: '20-Aug-2026',
    description: 'UPI/910283746192/Amazon India/SBIN',
    refNo: 'UPI91028374',
    type: 'DEBIT',
    amount: 2199.0,
    balance: 119000.0,
    channel: 'UPI',
  },
];

const DEFAULT_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'BEN-01',
    name: 'RAJESH KUMAR SHARMA',
    accountNumber: '50100291827419',
    bankName: 'HDFC BANK (KASTURBA GANDHI MARG)',
    ifscCode: 'HDFC0000128',
    limit: 100000,
    addedOn: '12-May-2025',
    status: 'ACTIVE',
  },
  {
    id: 'BEN-02',
    name: 'PRIYA SUNIL VERMA',
    accountNumber: '91802004819284',
    bankName: 'ICICI BANK (BARAKHAMBA ROAD)',
    ifscCode: 'ICIC0000007',
    limit: 50000,
    addedOn: '04-Jan-2026',
    status: 'ACTIVE',
  },
  {
    id: 'BEN-03',
    name: 'AMIT SENGUPTA (LANDLORD)',
    accountNumber: '20194820194',
    bankName: 'STATE BANK OF INDIA (KOLKATA MAIN)',
    ifscCode: 'SBIN0000001',
    limit: 50000,
    addedOn: '18-Aug-2026',
    status: 'ACTIVE',
  },
];

const DEFAULT_FDS: FixedDeposit[] = [
  {
    depositNumber: 'e-TDR-9928172910',
    principalAmount: 200000,
    interestRate: 7.1,
    tenureMonths: 24,
    maturityAmount: 230480,
    maturityDate: '15-Mar-2027',
    bookingDate: '15-Mar-2025',
    type: 'e-STDR (Cumulative)',
    status: 'ACTIVE',
  },
];

const DEFAULT_CHEQUE_REQUESTS: ChequeRequest[] = [
  {
    srn: 'SRN-2026-928103',
    accountNumber: '30892019482',
    leaves: 25,
    requestedDate: '10-Sep-2026',
    status: 'DISPATCHED_BY_SPEED_POST',
    trackingNumber: 'ED928103948IN',
  },
];

// Helper to get or set user-specific data from localStorage
export function getBankingData(userEmail: string) {
  if (typeof window === 'undefined') {
    return {
      accounts: DEFAULT_ACCOUNTS,
      transactions: DEFAULT_TRANSACTIONS,
      beneficiaries: DEFAULT_BENEFICIARIES,
      fds: DEFAULT_FDS,
      chequeRequests: DEFAULT_CHEQUE_REQUESTS,
    };
  }

  const key = `bank_store_${userEmail.toLowerCase().trim()}`;
  const stored = localStorage.getItem(key);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // fallback
    }
  }

  const initial = {
    accounts: DEFAULT_ACCOUNTS,
    transactions: DEFAULT_TRANSACTIONS,
    beneficiaries: DEFAULT_BENEFICIARIES,
    fds: DEFAULT_FDS,
    chequeRequests: DEFAULT_CHEQUE_REQUESTS,
  };
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

export function saveBankingData(userEmail: string, data: unknown) {
  if (typeof window === 'undefined') return;
  const key = `bank_store_${userEmail.toLowerCase().trim()}`;
  localStorage.setItem(key, JSON.stringify(data));
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(val)
    .replace('₹', '₹ ');
}
