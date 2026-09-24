'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader } from '../components/BankHeader';
import { BankFooter } from '../components/BankFooter';
import {
  BankAccount,
  BankTransaction,
  Beneficiary,
  FixedDeposit,
  ChequeRequest,
  getBankingData,
  saveBankingData,
  formatINR,
} from '../lib/banking-data';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  // Session state
  const [activeTab, setActiveTab] = useState<string>('accounts');
  const [sessionSeconds, setSessionSeconds] = useState(300); // 5 minutes countdown
  const [lastLoginTime] = useState('23-Sep-2026 18:32:14 IST');

  // Banking data state per user
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [fds, setFds] = useState<FixedDeposit[]>([]);
  const [chequeRequests, setChequeRequests] = useState<ChequeRequest[]>([]);

  // Selected account for details/operations
  const [selectedAccountNo, setSelectedAccountNo] = useState<string>('30892019482');

  // Mini statement modal / inline toggle
  const [showMiniStatement, setShowMiniStatement] = useState<boolean>(true);

  // Fund transfer form state
  const [transferType, setTransferType] = useState<'IMPS' | 'NEFT' | 'RTGS'>('IMPS');
  const [transferMode, setTransferMode] = useState<'BENEFICIARY' | 'QUICK'>('QUICK');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>('');
  const [transferBeneficiaryName, setTransferBeneficiaryName] = useState('');
  const [transferBeneficiaryAccount, setTransferBeneficiaryAccount] = useState('');
  const [transferConfirmAccount, setTransferConfirmAccount] = useState('');
  const [transferIfsc, setTransferIfsc] = useState('HDFC0000128');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('Personal Transfer');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Transfer OTP & confirmation modal
  const [transferStep, setTransferStep] = useState<'FORM' | 'OTP' | 'RECEIPT'>('FORM');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('482910');
  const [lastReceipt, setLastReceipt] = useState<{
    utr: string;
    amount: number;
    beneficiaryName: string;
    accountNo: string;
    date: string;
    mode: string;
  } | null>(null);

  // Statement filter state
  const [statementFilterPeriod, setStatementFilterPeriod] = useState<string>('all');
  const [statementStartDate, setStatementStartDate] = useState<string>('2026-08-01');
  const [statementEndDate, setStatementEndDate] = useState<string>('2026-09-24');

  // Open FD form state
  const [fdAmount, setFdAmount] = useState<string>('50000');
  const [fdTenureMonths, setFdTenureMonths] = useState<number>(24);
  const [isSeniorCitizen, setIsSeniorCitizen] = useState<boolean>(false);
  const [fdType, setFdType] = useState<'STDR' | 'TDR'>('STDR');
  const [fdSuccessNotice, setFdSuccessNotice] = useState<string | null>(null);

  // Beneficiary addition form state
  const [newBenName, setNewBenName] = useState('');
  const [newBenAccount, setNewBenAccount] = useState('');
  const [newBenConfirmAccount, setNewBenConfirmAccount] = useState('');
  const [newBenIfsc, setNewBenIfsc] = useState('');
  const [newBenBankName, setNewBenBankName] = useState('');
  const [newBenLimit, setNewBenLimit] = useState('50000');
  const [benSuccessNotice, setBenSuccessNotice] = useState<string | null>(null);

  // Cheque request state
  const [chequeLeaves, setChequeLeaves] = useState<number>(25);
  const [chequeNotice, setChequeNotice] = useState<string | null>(null);
  const [stopChequeNo, setStopChequeNo] = useState('');
  const [stopChequeReason, setStopChequeReason] = useState('Cheque Leaf Misplaced');
  const [stopChequeNotice, setStopChequeNotice] = useState<string | null>(null);

  // Route verification
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Load banking data from storage
  useEffect(() => {
    if (user?.email) {
      const data = getBankingData(user.email);
      setAccounts(data.accounts);
      setTransactions(data.transactions);
      setBeneficiaries(data.beneficiaries);
      setFds(data.fds);
      setChequeRequests(data.chequeRequests);
    }
  }, [user]);

  // Session countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('Session Expired: Your Internet Banking session has timed out due to inactivity.');
          logout().then(() => router.replace('/login'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [logout, router]);

  const currentAccount: BankAccount = useMemo(() => {
    return (
      accounts.find((a) => a.accountNumber === selectedAccountNo) ||
      accounts[0] || {
        accountNumber: '30892019482',
        cifNumber: '89201948210',
        accountType: 'SAVINGS BANK ACCOUNT' as const,
        branchName: 'CONNAUGHT PLACE, NEW DELHI [00691]',
        ifscCode: 'SBIN0000691',
        balance: 148250.75,
        unclearedBalance: 0.0,
        currency: 'INR',
        status: 'ACTIVE' as const,
        nomineeRegistered: true,
        openDate: '14-Aug-2018',
      }
    );
  }, [accounts, selectedAccountNo]);

  // Save changes to local banking store
  const syncData = useCallback(
    (updatedAccounts: BankAccount[], updatedTxns: BankTransaction[], updatedBens?: Beneficiary[], updatedFds?: FixedDeposit[], updatedCheques?: ChequeRequest[]) => {
      if (!user?.email) return;
      const data = {
        accounts: updatedAccounts,
        transactions: updatedTxns,
        beneficiaries: updatedBens || beneficiaries,
        fds: updatedFds || fds,
        chequeRequests: updatedCheques || chequeRequests,
      };
      saveBankingData(user.email, data);
      setAccounts(updatedAccounts);
      setTransactions(updatedTxns);
      if (updatedBens) setBeneficiaries(updatedBens);
      if (updatedFds) setFds(updatedFds);
      if (updatedCheques) setChequeRequests(updatedCheques);
    },
    [user, beneficiaries, fds, chequeRequests]
  );

  // FD live calculation
  const calculatedFd = useMemo(() => {
    const principal = parseFloat(fdAmount) || 0;
    const rate = isSeniorCitizen ? 7.6 : 7.1;
    const timeYears = fdTenureMonths / 12;
    // quarterly compounding for STDR
    const maturity = principal * Math.pow(1 + rate / 400, 4 * timeYears);
    const interest = maturity - principal;

    const maturityDateObj = new Date();
    maturityDateObj.setMonth(maturityDateObj.getMonth() + fdTenureMonths);
    const maturityFormatted = maturityDateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return {
      rate,
      interest: Math.round(interest),
      maturity: Math.round(maturity),
      maturityDate: maturityFormatted,
    };
  }, [fdAmount, fdTenureMonths, isSeniorCitizen]);

  // Execute Transfer flow
  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferError('Please enter a valid transfer amount');
      return;
    }

    if (!currentAccount || amt > currentAccount.balance) {
      setTransferError(`Insufficient available balance! Current balance is ${formatINR(currentAccount?.balance || 0)}`);
      return;
    }

    let benName = transferBeneficiaryName.trim();
    let benAccount = transferBeneficiaryAccount.trim();

    if (transferMode === 'BENEFICIARY') {
      const ben = beneficiaries.find((b) => b.id === selectedBeneficiaryId);
      if (!ben) {
        setTransferError('Please select a registered beneficiary');
        return;
      }
      if (amt > ben.limit) {
        setTransferError(`Amount exceeds maximum approved limit of ${formatINR(ben.limit)} for this beneficiary`);
        return;
      }
      benName = ben.name;
      benAccount = ben.accountNumber;
    } else {
      if (!benName) {
        setTransferError('Beneficiary Name is mandatory');
        return;
      }
      if (!benAccount || benAccount.length < 8) {
        setTransferError('Please enter a valid beneficiary account number');
        return;
      }
      if (benAccount !== transferConfirmAccount.trim()) {
        setTransferError('Account numbers do not match');
        return;
      }
      if (!transferIfsc.trim()) {
        setTransferError('IFSC Code is required');
        return;
      }
    }

    if (transferType === 'RTGS' && amt < 200000) {
      setTransferError('RTGS is only available for transaction amounts of ₹ 2,00,000 and above. Please select IMPS or NEFT.');
      return;
    }

    // Generate random OTP
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(generated);
    setOtpInput(generated); // Pre-fill for seamless user experience
    setTransferStep('OTP');
  };

  const handleConfirmOtp = () => {
    if (otpInput.trim() !== generatedOtp) {
      setTransferError('Invalid OTP entered. Please re-enter the 6-digit OTP.');
      return;
    }

    const amt = parseFloat(transferAmount);
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const utrNo = `SBIN${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const benName =
      transferMode === 'BENEFICIARY'
        ? beneficiaries.find((b) => b.id === selectedBeneficiaryId)?.name || 'BENEFICIARY'
        : transferBeneficiaryName.trim().toUpperCase();

    const benAcc =
      transferMode === 'BENEFICIARY'
        ? beneficiaries.find((b) => b.id === selectedBeneficiaryId)?.accountNumber || ''
        : transferBeneficiaryAccount.trim();

    // Deduct balance
    const updatedAccounts = accounts.map((acc) => {
      if (acc.accountNumber === currentAccount.accountNumber) {
        return {
          ...acc,
          balance: acc.balance - amt,
        };
      }
      return acc;
    });

    // Create Transaction Record
    const newTxn: BankTransaction = {
      id: `TXN-${Date.now()}`,
      txnDate: dateFormatted,
      valueDate: dateFormatted,
      description: `${transferType}/TRF/${benName}/${transferRemarks || 'FUND TRF'}/${utrNo.slice(-6)}`,
      refNo: utrNo,
      type: 'DEBIT',
      amount: amt,
      balance: currentAccount.balance - amt,
      channel: transferType,
    };

    const updatedTxns = [newTxn, ...transactions];
    syncData(updatedAccounts, updatedTxns);

    setLastReceipt({
      utr: utrNo,
      amount: amt,
      beneficiaryName: benName,
      accountNo: benAcc,
      date: `${dateFormatted} ${now.toLocaleTimeString()}`,
      mode: transferType,
    });

    setTransferStep('RECEIPT');
    setTransferAmount('');
    setTransferBeneficiaryName('');
    setTransferBeneficiaryAccount('');
    setTransferConfirmAccount('');
  };

  // Open Fixed Deposit
  const handleOpenFd = (e: React.FormEvent) => {
    e.preventDefault();
    setFdSuccessNotice(null);
    const amt = parseFloat(fdAmount);

    if (isNaN(amt) || amt < 1000) {
      alert('Minimum deposit amount for opening e-Fixed Deposit is ₹ 1,000.00');
      return;
    }

    if (!currentAccount || amt > currentAccount.balance) {
      alert('Insufficient balance in your Savings Account to fund this deposit!');
      return;
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const fdAccountNo = `e-TDR-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // Debit savings account
    const updatedAccounts = accounts.map((acc) => {
      if (acc.accountNumber === currentAccount.accountNumber) {
        return { ...acc, balance: acc.balance - amt };
      }
      return acc;
    });

    // Create debit txn
    const newTxn: BankTransaction = {
      id: `TXN-FD-${Date.now()}`,
      txnDate: dateFormatted,
      valueDate: dateFormatted,
      description: `e-TDR OPENING/DR TO OPEN ${fdAccountNo}`,
      refNo: `FD-BK-${Date.now().toString().slice(-8)}`,
      type: 'DEBIT',
      amount: amt,
      balance: currentAccount.balance - amt,
      channel: 'BRANCH',
    };

    const newFd: FixedDeposit = {
      depositNumber: fdAccountNo,
      principalAmount: amt,
      interestRate: calculatedFd.rate,
      tenureMonths: fdTenureMonths,
      maturityAmount: calculatedFd.maturity,
      maturityDate: calculatedFd.maturityDate,
      bookingDate: dateFormatted,
      type: fdType === 'STDR' ? 'e-STDR (Cumulative)' : 'e-TDR (Quarterly Payout)',
      status: 'ACTIVE',
    };

    const updatedFds = [newFd, ...fds];
    const updatedTxns = [newTxn, ...transactions];
    syncData(updatedAccounts, updatedTxns, beneficiaries, updatedFds);

    setFdSuccessNotice(
      `Term Deposit successfully booked! Account No: ${fdAccountNo}. Maturity Value: ${formatINR(calculatedFd.maturity)} on ${calculatedFd.maturityDate}. An e-Advice receipt has been dispatched to your registered email.`
    );
  };

  // Add Beneficiary
  const handleAddBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    setBenSuccessNotice(null);

    if (!newBenName.trim()) {
      alert('Beneficiary Name is required');
      return;
    }
    if (!newBenAccount.trim() || newBenAccount.length < 8) {
      alert('Please enter a valid account number');
      return;
    }
    if (newBenAccount !== newBenConfirmAccount) {
      alert('Account numbers do not match');
      return;
    }
    if (!newBenIfsc.trim()) {
      alert('IFSC Code is required');
      return;
    }

    const newBen: Beneficiary = {
      id: `BEN-${Date.now()}`,
      name: newBenName.trim().toUpperCase(),
      accountNumber: newBenAccount.trim(),
      bankName: newBenBankName.trim() || 'SCHEDULED COMMERCIAL BANK',
      ifscCode: newBenIfsc.trim().toUpperCase(),
      limit: parseFloat(newBenLimit) || 50000,
      addedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'ACTIVE',
    };

    const updatedBens = [newBen, ...beneficiaries];
    syncData(accounts, transactions, updatedBens);
    setBenSuccessNotice(
      `Beneficiary ${newBen.name} successfully registered with maximum limit of ${formatINR(newBen.limit)}. Approved with CBS URN verification.`
    );
    setNewBenName('');
    setNewBenAccount('');
    setNewBenConfirmAccount('');
    setNewBenIfsc('');
    setNewBenBankName('');
  };

  // Request Cheque Book
  const handleRequestCheque = (e: React.FormEvent) => {
    e.preventDefault();
    setChequeNotice(null);

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const srn = `SRN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const tracking = `ED${Math.floor(100000000 + Math.random() * 900000000)}IN`;

    const newReq: ChequeRequest = {
      srn,
      accountNumber: currentAccount.accountNumber,
      leaves: chequeLeaves,
      requestedDate: dateFormatted,
      status: 'DISPATCHED_BY_SPEED_POST',
      trackingNumber: tracking,
    };

    const updatedCheques = [newReq, ...chequeRequests];
    syncData(accounts, transactions, beneficiaries, fds, updatedCheques);
    setChequeNotice(
      `Cheque book request registered successfully! Service Request Number: ${srn}. Tracking No: ${tracking} (Speed Post). Expected delivery in 3-5 working days.`
    );
  };

  // Stop Cheque
  const handleStopCheque = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopChequeNo.trim() || stopChequeNo.length !== 6) {
      alert('Please enter valid 6-digit cheque number');
      return;
    }

    setStopChequeNotice(
      `Stop payment instruction registered in CBS for Cheque No: ${stopChequeNo}. Reason: "${stopChequeReason}". A nominal charge of ₹ 50 + GST will be debited as per schedule.`
    );
    setStopChequeNo('');
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Export CSV function
  const handleExportCSV = () => {
    const headers = 'Txn Date,Value Date,Description,Ref Number,Channel,Debit (INR),Credit (INR),Balance (INR)\n';
    const rows = transactions
      .map((t) => {
        const debit = t.type === 'DEBIT' ? t.amount.toFixed(2) : '0.00';
        const credit = t.type === 'CREDIT' ? t.amount.toFixed(2) : '0.00';
        return `"${t.txnDate}","${t.valueDate}","${t.description.replace(/"/g, '""')}","${t.refNo}","${t.channel}",${debit},${credit},${t.balance.toFixed(2)}`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Account_Statement_${currentAccount?.accountNumber || '30892019482'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || !user) {
    return (
      <div className="bank-page-container">
        <BankHeader />
        <div className="p-12 text-center text-slate-700 bg-white">
          <div className="font-bold text-sm text-[#003366]">Loading Internet Banking Core Portal...</div>
          <div className="text-xs text-slate-500 mt-2">Connecting to host branch CBS...</div>
        </div>
        <BankFooter />
      </div>
    );
  }

  // Format session minutes:seconds
  const sessionMin = Math.floor(sessionSeconds / 60);
  const sessionSec = sessionSeconds % 60;
  const sessionFormatted = `${sessionMin.toString().padStart(2, '0')}:${sessionSec.toString().padStart(2, '0')}`;

  return (
    <div className="bank-page-container">
      <BankHeader activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {/* Authenticated User Status Bar */}
      <div className="bg-[#eef3f8] border-b-2 border-[#b8cde4] px-3 py-2 text-[11px] text-[#003366]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-slate-900">
              Welcome: <span className="text-[#004c8f]">{user.name.toUpperCase()}</span>
            </span>
            <span className="text-slate-400">|</span>
            <span>
              CIF No: <strong className="font-mono text-slate-900">{currentAccount?.cifNumber || '89201948210'}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span>
              Home Branch: <strong className="text-slate-800">{currentAccount?.branchName || 'CONNAUGHT PLACE [00691]'}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span>
              IFSC: <strong className="font-mono text-slate-800">{currentAccount?.ifscCode || 'SBIN0000691'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10.5px] text-slate-600">
              Last Login: <strong>{lastLoginTime}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-600">Session Expiry:</span>
              <span
                className={`font-mono font-bold px-1.5 py-0.5 border ${
                  sessionSeconds < 60
                    ? 'bg-[#ffe0e0] text-[#cc0000] border-[#cc0000] animate-pulse'
                    : 'bg-[#fffdec] text-[#805500] border-[#eedd82]'
                }`}
              >
                {sessionFormatted}
              </span>
              <button
                type="button"
                onClick={() => setSessionSeconds(300)}
                title="Extend session timeout"
                className="text-[10px] text-[#004c8f] hover:underline ml-1"
              >
                [Extend]
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid (Left Sidebar + Right Work Area) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 bg-[#f4f7fa]">
        {/* Left Navigation Tree Sidebar (3 cols) */}
        <aside className="md:col-span-3 border-r border-[#99b4d1] bg-[#ffffff] p-2 space-y-3">
          {/* Account Selector Widget */}
          <div className="border border-[#7f9db9] bg-[#f0f4f9] p-2 text-[11px]">
            <label className="block font-bold text-[#003366] mb-1">Select Primary Operating A/c:</label>
            <select
              value={selectedAccountNo}
              onChange={(e) => setSelectedAccountNo(e.target.value)}
              className="bank-input w-full font-mono text-xs font-semibold"
            >
              {accounts.map((acc) => (
                <option key={acc.accountNumber} value={acc.accountNumber}>
                  {acc.accountNumber} &ndash; {acc.accountType.split(' ')[0]} ({formatINR(acc.balance)})
                </option>
              ))}
            </select>
            <div className="mt-1 text-[10px] text-slate-600 flex justify-between">
              <span>Status: <strong className="text-emerald-700">ACTIVE</strong></span>
              <span>Nominee: <strong className="text-[#004c8f]">REGISTERED</strong></span>
            </div>
          </div>

          {/* Classic SBI / HDFC Tree Menu */}
          <nav className="bank-sidebar-menu shadow-xs">
            {/* Folder 1: Accounts */}
            <div>
              <div className="bank-sidebar-cat-title flex items-center justify-between">
                <span>📁 Accounts &amp; Profile</span>
                <span className="text-[10px]">▼</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab('accounts')}
                  className={`bank-sidebar-link w-full text-left ${activeTab === 'accounts' ? 'active' : ''}`}
                >
                  &raquo; Account Summary
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('accounts');
                    setShowMiniStatement(true);
                  }}
                  className="bank-sidebar-link w-full text-left"
                >
                  &raquo; Mini Statement (Last 10 Txns)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('statement')}
                  className={`bank-sidebar-link w-full text-left ${activeTab === 'statement' ? 'active' : ''}`}
                >
                  &raquo; Detailed Account Statement
                </button>
              </div>
            </div>

            {/* Folder 2: Payments & Transfers */}
            <div>
              <div className="bank-sidebar-cat-title flex items-center justify-between">
                <span>📁 Payments / Fund Transfers</span>
                <span className="text-[10px]">▼</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('transfer');
                    setTransferMode('QUICK');
                  }}
                  className={`bank-sidebar-link w-full text-left ${activeTab === 'transfer' && transferMode === 'QUICK' ? 'active' : ''}`}
                >
                  &raquo; Quick Transfer (Without Payee)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('transfer');
                    setTransferMode('BENEFICIARY');
                  }}
                  className={`bank-sidebar-link w-full text-left ${activeTab === 'transfer' && transferMode === 'BENEFICIARY' ? 'active' : ''}`}
                >
                  &raquo; Transfer to Registered Payee
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('beneficiary')}
                  className={`bank-sidebar-link w-full text-left ${activeTab === 'beneficiary' ? 'active' : ''}`}
                >
                  &raquo; Add / Manage Beneficiary
                </button>
              </div>
            </div>

            {/* Folder 3: e-Deposits */}
            <div>
              <div className="bank-sidebar-cat-title flex items-center justify-between">
                <span>📁 e-Deposits (FD / RD)</span>
                <span className="text-[10px]">▼</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab('deposits')}
                  className={`bank-sidebar-link w-full text-left ${activeTab === 'deposits' ? 'active' : ''}`}
                >
                  &raquo; Open e-TDR / e-STDR (Fixed Deposit)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('deposits')}
                  className="bank-sidebar-link w-full text-left"
                >
                  &raquo; View Active Term Deposits
                </button>
              </div>
            </div>

            {/* Folder 4: e-Services & Cheques */}
            <div>
              <div className="bank-sidebar-cat-title flex items-center justify-between">
                <span>📁 e-Services &amp; Cheques</span>
                <span className="text-[10px]">▼</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab('cheques')}
                  className={`bank-sidebar-link w-full text-left ${activeTab === 'cheques' ? 'active' : ''}`}
                >
                  &raquo; Issue of Cheque Book
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cheques')}
                  className="bank-sidebar-link w-full text-left"
                >
                  &raquo; Stop Cheque Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert('Interest Certificate (Form 16A) for FY 2025-2026 generated. Total interest credited: ₹ 1,210.75. TDS deducted: ₹ 0.00.');
                  }}
                  className="bank-sidebar-link w-full text-left"
                >
                  &raquo; Download TDS / Interest Certificate
                </button>
              </div>
            </div>

            {/* Folder 5: Profile & Security */}
            <div>
              <div className="bank-sidebar-cat-title flex items-center justify-between">
                <span>📁 Profile &amp; Security</span>
                <span className="text-[10px]">▼</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`bank-sidebar-link w-full text-left ${activeTab === 'profile' ? 'active' : ''}`}
                >
                  &raquo; Change Profile Password
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="bank-sidebar-link w-full text-left"
                >
                  &raquo; Manage Daily Transfer Limits
                </button>
              </div>
            </div>

            {/* Admin Folder if user role is admin */}
            {user.role === 'admin' && (
              <div>
                <div className="bank-sidebar-cat-title bg-gradient-to-r from-purple-900 to-indigo-950 flex items-center justify-between text-amber-200">
                  <span>⚙️ CBS Admin Terminal</span>
                  <span className="text-[10px]">▼</span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className={`bank-sidebar-link w-full text-left ${activeTab === 'admin' ? 'active text-purple-900 font-bold' : ''}`}
                  >
                    &raquo; Core Banking Ledger &amp; Audit
                  </button>
                </div>
              </div>
            )}
          </nav>

          {/* Quick Help Helpline Badge */}
          <div className="border border-[#eedd82] bg-[#fffdef] p-2 text-[10.5px] text-[#554000]">
            <strong>Urgent Card Hotlisting:</strong>
            <p className="mt-0.5 text-slate-700">
              SMS &quot;BLOCK &lt;Last 4 digits of card&gt;&quot; to <strong>567676</strong> from your registered mobile.
            </p>
          </div>
        </aside>

        {/* Right Main Content Area (9 cols) */}
        <main className="md:col-span-9 p-3 sm:p-4 bg-white">
          {/* TAB 1: ACCOUNTS SUMMARY & MINI STATEMENT */}
          {activeTab === 'accounts' && (
            <div className="space-y-4">
              <div className="bank-panel-box shadow-xs">
                <div className="bank-panel-header">
                  <div className="flex items-center gap-1.5">
                    <span>📋</span>
                    <span>Account Summary &ndash; Transaction Accounts</span>
                  </div>
                  <span className="text-[10px] font-normal text-[#d6e7f8]">Currency: INR (Indian Rupee)</span>
                </div>

                <div className="p-3">
                  <table className="bank-table">
                    <thead>
                      <tr>
                        <th>Account Number</th>
                        <th>Account Type</th>
                        <th>Branch Name</th>
                        <th className="text-right">Available Balance (₹)</th>
                        <th className="text-right">Uncleared (₹)</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((acc) => (
                        <tr
                          key={acc.accountNumber}
                          className={selectedAccountNo === acc.accountNumber ? 'bg-[#fffdec] font-semibold' : ''}
                        >
                          <td className="font-mono text-[#004c8f]">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountNo(acc.accountNumber);
                                setShowMiniStatement(true);
                              }}
                              className="hover:underline font-bold"
                            >
                              {acc.accountNumber}
                            </button>
                          </td>
                          <td>{acc.accountType}</td>
                          <td className="text-[11px]">{acc.branchName}</td>
                          <td className="text-right font-mono font-bold text-slate-900">
                            {formatINR(acc.balance)}
                          </td>
                          <td className="text-right font-mono text-slate-500">
                            {formatINR(acc.unclearedBalance)}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountNo(acc.accountNumber);
                                setShowMiniStatement(true);
                              }}
                              className="bank-btn text-[10px] px-2 py-0.5 mr-1"
                            >
                              Mini Statement
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountNo(acc.accountNumber);
                                setActiveTab('transfer');
                              }}
                              className="bank-btn-secondary text-[10px] px-2 py-0.5"
                            >
                              Transfer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-2 text-[10.5px] text-slate-500 italic">
                    * Click on an Account Number to inspect the transaction ledger and download passbook records.
                  </div>
                </div>
              </div>

              {/* Mini Statement Section (Classic Passbook Ledger) */}
              {showMiniStatement && (
                <div className="bank-panel-box shadow-xs border-2 border-[#004c8f]">
                  <div className="bank-panel-header bg-gradient-to-r from-[#004c8f] to-[#002b4d] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📖</span>
                      <span className="font-bold">
                        Mini Statement &ndash; Account No: {currentAccount?.accountNumber} ({currentAccount?.accountType})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="bank-btn-secondary text-[10px] px-2 py-0.5 flex items-center gap-1"
                        title="Print Statement"
                      >
                        <span>🖨️</span>
                        <span>Print</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="bank-btn-secondary text-[10px] px-2 py-0.5 flex items-center gap-1"
                        title="Export as CSV/Excel"
                      >
                        <span>📥</span>
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="mb-2 bg-[#f0f4f9] p-2 border border-[#ccd9e8] flex flex-wrap justify-between items-center text-[11px]">
                      <div>
                        Branch: <strong>{currentAccount?.branchName}</strong> | IFSC: <strong className="font-mono">{currentAccount?.ifscCode}</strong>
                      </div>
                      <div>
                        Current Available Balance: <strong className="font-mono text-emerald-800 text-xs">{formatINR(currentAccount?.balance || 0)}</strong>
                      </div>
                    </div>

                    <table className="bank-table">
                      <thead>
                        <tr>
                          <th>Txn Date</th>
                          <th>Value Date</th>
                          <th>Narration / Description</th>
                          <th>Ref / Chq No</th>
                          <th>Channel</th>
                          <th className="text-right">Debit (Dr) ₹</th>
                          <th className="text-right">Credit (Cr) ₹</th>
                          <th className="text-right">Running Balance ₹</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id}>
                            <td className="font-mono whitespace-nowrap">{t.txnDate}</td>
                            <td className="font-mono whitespace-nowrap text-slate-500">{t.valueDate}</td>
                            <td className="font-mono text-[11px] text-slate-800 font-medium">
                              {t.description}
                            </td>
                            <td className="font-mono text-[10.5px] text-slate-600">{t.refNo}</td>
                            <td>
                              <span className="px-1 py-0.2 bg-slate-100 border border-slate-300 font-mono text-[10px]">
                                {t.channel}
                              </span>
                            </td>
                            <td className="text-right font-mono font-bold text-[#a30000]">
                              {t.type === 'DEBIT' ? formatINR(t.amount) : '-'}
                            </td>
                            <td className="text-right font-mono font-bold text-[#006600]">
                              {t.type === 'CREDIT' ? formatINR(t.amount) : '-'}
                            </td>
                            <td className="text-right font-mono font-semibold text-slate-900">
                              {formatINR(t.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-3 flex justify-between items-center text-[10.5px] text-slate-600 border-t border-slate-200 pt-2">
                      <span>Displaying latest {transactions.length} cleared electronic ledger entries.</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('statement')}
                        className="text-[#004c8f] hover:underline font-bold"
                      >
                        View Detailed Statement with Custom Date Filter &raquo;
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETAILED ACCOUNT STATEMENT */}
          {activeTab === 'statement' && (
            <div className="space-y-3">
              <div className="bank-panel-box shadow-xs">
                <div className="bank-panel-header">
                  <span>📜 Detailed Account Statement Inquiry</span>
                </div>
                <div className="p-3 bg-white space-y-3">
                  <div className="border border-[#b8cde4] p-3 bg-[#f7f9fb]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <label className="block font-bold text-[#003366] mb-1">Select Account:</label>
                        <select
                          value={selectedAccountNo}
                          onChange={(e) => setSelectedAccountNo(e.target.value)}
                          className="bank-input w-full font-mono font-semibold"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.accountNumber} value={acc.accountNumber}>
                              {acc.accountNumber} &ndash; {acc.accountType} ({formatINR(acc.balance)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#003366] mb-1">Statement Duration:</label>
                        <select
                          value={statementFilterPeriod}
                          onChange={(e) => setStatementFilterPeriod(e.target.value)}
                          className="bank-input w-full"
                        >
                          <option value="all">All Available Transactions</option>
                          <option value="month">Current Month (Sep 2026)</option>
                          <option value="quarter">Last 3 Months</option>
                          <option value="fy">Financial Year 2025-2026</option>
                          <option value="custom">Custom Date Range</option>
                        </select>
                      </div>

                      {statementFilterPeriod === 'custom' && (
                        <>
                          <div>
                            <label className="block font-bold text-slate-700 mb-0.5">Start Date:</label>
                            <input
                              type="date"
                              value={statementStartDate}
                              onChange={(e) => setStatementStartDate(e.target.value)}
                              className="bank-input w-full"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 mb-0.5">End Date:</label>
                            <input
                              type="date"
                              value={statementEndDate}
                              onChange={(e) => setStatementEndDate(e.target.value)}
                              className="bank-input w-full"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="bank-btn-secondary px-3 py-1 text-xs flex items-center gap-1 font-bold"
                      >
                        <span>📥</span>
                        <span>Download as MS Excel (CSV)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="bank-btn px-4 py-1 text-xs font-bold flex items-center gap-1"
                      >
                        <span>🖨️</span>
                        <span>Print / Save as PDF</span>
                      </button>
                    </div>
                  </div>

                  <table className="bank-table">
                    <thead>
                      <tr>
                        <th>Txn Date</th>
                        <th>Narration</th>
                        <th>Ref Number</th>
                        <th className="text-right">Debit (Dr) ₹</th>
                        <th className="text-right">Credit (Cr) ₹</th>
                        <th className="text-right">Balance ₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="font-mono whitespace-nowrap">{t.txnDate}</td>
                          <td className="font-mono text-slate-800">{t.description}</td>
                          <td className="font-mono text-slate-600">{t.refNo}</td>
                          <td className="text-right font-mono font-bold text-[#a30000]">
                            {t.type === 'DEBIT' ? formatINR(t.amount) : '-'}
                          </td>
                          <td className="text-right font-mono font-bold text-[#006600]">
                            {t.type === 'CREDIT' ? formatINR(t.amount) : '-'}
                          </td>
                          <td className="text-right font-mono font-semibold">{formatINR(t.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FUND TRANSFER (IMPS / NEFT / RTGS) */}
          {activeTab === 'transfer' && (
            <div className="space-y-3">
              <div className="bank-panel-box shadow-xs">
                <div className="bank-panel-header">
                  <div className="flex items-center gap-1.5">
                    <span>💸</span>
                    <span>Electronic Funds Transfer (IMPS 24&times;7 / NEFT / RTGS)</span>
                  </div>
                </div>

                <div className="p-3 bg-white">
                  {/* Mode selector */}
                  <div className="flex gap-2 mb-3 border-b border-slate-200 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferMode('QUICK');
                        setTransferStep('FORM');
                      }}
                      className={`px-3 py-1 font-bold text-xs border ${
                        transferMode === 'QUICK'
                          ? 'bg-[#004c8f] text-white border-[#003366]'
                          : 'bg-[#eef3f8] text-[#003366] border-[#99b4d1]'
                      }`}
                    >
                      ⚡ Quick Transfer (Without Adding Payee)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferMode('BENEFICIARY');
                        setTransferStep('FORM');
                      }}
                      className={`px-3 py-1 font-bold text-xs border ${
                        transferMode === 'BENEFICIARY'
                          ? 'bg-[#004c8f] text-white border-[#003366]'
                          : 'bg-[#eef3f8] text-[#003366] border-[#99b4d1]'
                      }`}
                    >
                      👥 Transfer to Saved Beneficiary
                    </button>
                  </div>

                  {transferError && (
                    <div className="mb-3 p-2 bg-[#fff0f0] border border-[#cc0000] text-[#990000] text-xs font-semibold">
                      ❌ {transferError}
                    </div>
                  )}

                  {/* STEP 1: FORM */}
                  {transferStep === 'FORM' && (
                    <form onSubmit={handleInitiateTransfer} className="space-y-3">
                      {/* Debit Account Info */}
                      <div className="bg-[#f0f4f9] border border-[#ccd9e8] p-2.5 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-[#003366] mb-0.5">Debit From Account:</label>
                          <select
                            value={selectedAccountNo}
                            onChange={(e) => setSelectedAccountNo(e.target.value)}
                            className="bank-input w-full font-mono font-bold"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.accountNumber} value={acc.accountNumber}>
                                {acc.accountNumber} &ndash; {acc.accountType}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col justify-center sm:items-end">
                          <span className="text-slate-600">Available Balance:</span>
                          <span className="text-base font-bold font-mono text-emerald-800">
                            {formatINR(currentAccount?.balance || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Payment Channel Options */}
                      <div>
                        <label className="block font-bold text-[#003366] text-xs mb-1">
                          Select Payment Mode <span className="text-red-600">*</span>:
                        </label>
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <label
                            className={`border p-2 cursor-pointer flex flex-col justify-between ${
                              transferType === 'IMPS'
                                ? 'bg-[#fffdec] border-[#f8991d]'
                                : 'bg-[#fafbfc] border-[#b8cde4]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-[#003366]">
                              <input
                                type="radio"
                                name="transferType"
                                value="IMPS"
                                checked={transferType === 'IMPS'}
                                onChange={() => setTransferType('IMPS')}
                              />
                              <span>IMPS (24&times;7 Instant)</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1">
                              Real-time transfer. Max ₹ 5 Lakh.
                            </span>
                          </label>

                          <label
                            className={`border p-2 cursor-pointer flex flex-col justify-between ${
                              transferType === 'NEFT'
                                ? 'bg-[#fffdec] border-[#f8991d]'
                                : 'bg-[#fafbfc] border-[#b8cde4]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-[#003366]">
                              <input
                                type="radio"
                                name="transferType"
                                value="NEFT"
                                checked={transferType === 'NEFT'}
                                onChange={() => setTransferType('NEFT')}
                              />
                              <span>NEFT (Batch Mode)</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1">
                              Processed in half-hourly batches. Free of charge.
                            </span>
                          </label>

                          <label
                            className={`border p-2 cursor-pointer flex flex-col justify-between ${
                              transferType === 'RTGS'
                                ? 'bg-[#fffdec] border-[#f8991d]'
                                : 'bg-[#fafbfc] border-[#b8cde4]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-[#003366]">
                              <input
                                type="radio"
                                name="transferType"
                                value="RTGS"
                                checked={transferType === 'RTGS'}
                                onChange={() => setTransferType('RTGS')}
                              />
                              <span>RTGS (Gross Settlement)</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1">
                              For high value &ge; ₹ 2,00,000 only.
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Beneficiary Details */}
                      {transferMode === 'BENEFICIARY' ? (
                        <div>
                          <label className="block font-bold text-[#003366] text-xs mb-1">
                            Choose Registered Payee:
                          </label>
                          <select
                            value={selectedBeneficiaryId}
                            onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
                            className="bank-input w-full font-semibold"
                          >
                            <option value="">-- Select Beneficiary --</option>
                            {beneficiaries.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} &ndash; {b.bankName} (A/c: {b.accountNumber}, Limit: {formatINR(b.limit)})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="border border-[#b8cde4] p-3 bg-[#fafbfc] space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <label className="block font-bold text-slate-800 mb-0.5">
                                Beneficiary Name <span className="text-red-600">*</span>:
                              </label>
                              <input
                                type="text"
                                value={transferBeneficiaryName}
                                onChange={(e) => setTransferBeneficiaryName(e.target.value)}
                                placeholder="e.g. Ramesh Kumar"
                                className="bank-input w-full"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-800 mb-0.5">
                                IFSC Code <span className="text-red-600">*</span>:
                              </label>
                              <input
                                type="text"
                                value={transferIfsc}
                                onChange={(e) => setTransferIfsc(e.target.value.toUpperCase())}
                                placeholder="e.g. HDFC0000128"
                                className="bank-input w-full font-mono uppercase"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-800 mb-0.5">
                                Beneficiary Account No <span className="text-red-600">*</span>:
                              </label>
                              <input
                                type="text"
                                value={transferBeneficiaryAccount}
                                onChange={(e) => setTransferBeneficiaryAccount(e.target.value)}
                                placeholder="Account Number"
                                className="bank-input w-full font-mono"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-800 mb-0.5">
                                Re-enter Account No <span className="text-red-600">*</span>:
                              </label>
                              <input
                                type="text"
                                value={transferConfirmAccount}
                                onChange={(e) => setTransferConfirmAccount(e.target.value)}
                                placeholder="Confirm Account Number"
                                className="bank-input w-full font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Amount and Purpose */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <label className="block font-bold text-[#003366] mb-0.5">
                            Amount to Transfer (₹) <span className="text-red-600">*</span>:
                          </label>
                          <div className="flex items-center">
                            <span className="px-2 py-1 bg-slate-100 border border-slate-300 font-bold">₹</span>
                            <input
                              type="number"
                              step="any"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              placeholder="0.00"
                              className="bank-input flex-1 font-mono font-bold text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-[#003366] mb-0.5">
                            Purpose / Remarks:
                          </label>
                          <input
                            type="text"
                            value={transferRemarks}
                            onChange={(e) => setTransferRemarks(e.target.value)}
                            placeholder="e.g. Rent, Family Maintenance, Bill Payment"
                            className="bank-input w-full"
                          />
                        </div>
                      </div>

                      {/* Charges Advisory */}
                      <div className="bg-[#fffdec] border border-[#eedd82] p-2 text-[10.5px] text-[#554000]">
                        <strong>Bank Charges:</strong> IMPS: ₹ 2.50 + GST. NEFT: ₹ 0.00 (Free per RBI directive). RTGS: ₹ 0.00.
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTransferAmount('');
                            setTransferError(null);
                          }}
                          className="bank-btn-secondary px-4 py-1.5 text-xs"
                        >
                          Clear
                        </button>
                        <button
                          type="submit"
                          className="bank-btn px-6 py-1.5 text-xs font-bold bg-[#004c8f] text-white"
                        >
                          Proceed to Verification &raquo;
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STEP 2: HIGH SECURITY OTP VERIFICATION */}
                  {transferStep === 'OTP' && (
                    <div className="border-2 border-[#a30000] p-4 bg-[#fffefe] space-y-3">
                      <div className="border-b border-[#a30000] pb-1 flex items-center justify-between">
                        <span className="font-bold text-[#a30000] text-sm flex items-center gap-1.5">
                          <span>🛡️</span>
                          <span>High Security Password (OTP) Verification</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Secured by 256-Bit SSL</span>
                      </div>

                      <div className="text-[11px] text-slate-700 space-y-1">
                        <p>
                          A 6-digit High Security Password (OTP) has been dispatched to your registered mobile number ending with <strong>••••••••9281</strong>.
                        </p>
                        <div className="p-2 bg-[#f4f7fa] border border-[#ccd9e8] text-[10.5px]">
                          <div>Transfer Amount: <strong className="font-mono text-sm text-[#003366]">{formatINR(parseFloat(transferAmount) || 0)}</strong></div>
                          <div>Beneficiary: <strong>{transferBeneficiaryName || 'REGISTERED PAYEE'}</strong> ({transferBeneficiaryAccount || 'ACC••••'})</div>
                          <div>Mode: <strong>{transferType}</strong> (Charges: ₹ 0.00)</div>
                        </div>
                      </div>

                      <div className="bg-[#fff9e6] p-2 border border-[#d4a840] text-[10.5px] text-[#7a5200]">
                        <span>Test Assistant:</span> Your simulated SMS OTP is: <strong className="font-mono text-xs text-[#a30000]">{generatedOtp}</strong>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-800 text-xs mb-1">
                          Enter 6-Digit OTP <span className="text-red-600">*</span>:
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="e.g. 482910"
                          className="bank-input font-mono font-bold text-base tracking-widest w-48 text-center"
                        />
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setTransferStep('FORM')}
                          className="bank-btn-secondary px-4 py-1.5 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmOtp}
                          className="bank-btn px-6 py-1.5 text-xs font-bold bg-[#006600] border-[#004d00] text-white"
                        >
                          Confirm &amp; Debit Account &raquo;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: TRANSACTION ACKNOWLEDGMENT RECEIPT */}
                  {transferStep === 'RECEIPT' && lastReceipt && (
                    <div className="border-2 border-[#006600] p-4 bg-[#f8fff8] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#006600] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl text-emerald-700">✓</span>
                          <div>
                            <span className="font-bold text-[#006600] text-sm block">
                              Transaction Successful &ndash; Funds Transferred
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Electronic Payment Reference: {lastReceipt.utr}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="bank-btn-secondary text-xs px-3 py-1 flex items-center gap-1"
                        >
                          <span>🖨️</span>
                          <span>Print Receipt</span>
                        </button>
                      </div>

                      <table className="bank-table bg-white">
                        <tbody>
                          <tr>
                            <td className="w-1/3 font-semibold text-slate-600">UTR / Reference Number</td>
                            <td className="font-mono font-bold text-[#004c8f]">{lastReceipt.utr}</td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Debit Account</td>
                            <td className="font-mono">{currentAccount?.accountNumber}</td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Beneficiary Name</td>
                            <td className="font-bold text-slate-800">{lastReceipt.beneficiaryName}</td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Beneficiary Account</td>
                            <td className="font-mono">{lastReceipt.accountNo}</td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Amount Transferred</td>
                            <td className="font-mono font-bold text-lg text-emerald-800">
                              {formatINR(lastReceipt.amount)}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Payment Channel</td>
                            <td>{lastReceipt.mode} (24&times;7 Clearance)</td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Transaction Timestamp</td>
                            <td className="font-mono text-slate-700">{lastReceipt.date}</td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Updated Account Balance</td>
                            <td className="font-mono font-bold text-slate-900">
                              {formatINR(currentAccount?.balance || 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="pt-2 flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">
                          A confirmation SMS and transaction advice email have been transmitted.
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTransferStep('FORM');
                              setActiveTab('accounts');
                              setShowMiniStatement(true);
                            }}
                            className="bank-btn-secondary text-xs px-3 py-1 font-bold"
                          >
                            View in Passbook
                          </button>
                          <button
                            type="button"
                            onClick={() => setTransferStep('FORM')}
                            className="bank-btn text-xs px-4 py-1 font-bold bg-[#004c8f] text-white"
                          >
                            Make Another Transfer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MANAGE BENEFICIARIES */}
          {activeTab === 'beneficiary' && (
            <div className="space-y-4">
              <div className="bank-panel-box shadow-xs">
                <div className="bank-panel-header">
                  <span>👥 Registered Beneficiaries (Payees)</span>
                </div>

                <div className="p-3">
                  {benSuccessNotice && (
                    <div className="mb-3 p-2 bg-[#f0fff0] border border-[#008800] text-[#006600] text-xs font-semibold">
                      ✓ {benSuccessNotice}
                    </div>
                  )}

                  <table className="bank-table mb-4">
                    <thead>
                      <tr>
                        <th>Beneficiary Name</th>
                        <th>Account Number</th>
                        <th>Bank &amp; Branch</th>
                        <th>IFSC Code</th>
                        <th className="text-right">Max Limit (₹)</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaries.map((b) => (
                        <tr key={b.id}>
                          <td className="font-bold text-[#003366]">{b.name}</td>
                          <td className="font-mono">{b.accountNumber}</td>
                          <td className="text-[11px] text-slate-600">{b.bankName}</td>
                          <td className="font-mono text-[11px]">{b.ifscCode}</td>
                          <td className="text-right font-mono font-bold text-slate-900">{formatINR(b.limit)}</td>
                          <td>
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                              {b.status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBeneficiaryId(b.id);
                                setTransferMode('BENEFICIARY');
                                setActiveTab('transfer');
                              }}
                              className="bank-btn text-[10px] px-2 py-0.5"
                            >
                              Transfer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Add Beneficiary Form */}
                  <div className="border border-[#99b4d1] bg-[#f7f9fb] p-3">
                    <div className="font-bold text-[#003366] text-xs border-b border-[#ccd9e8] pb-1 mb-2">
                      ➕ Add New Beneficiary (Inter-Bank Payee)
                    </div>

                    <form onSubmit={handleAddBeneficiary} className="space-y-2 text-[11px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">
                            Beneficiary Full Name <span className="text-red-600">*</span>:
                          </label>
                          <input
                            type="text"
                            value={newBenName}
                            onChange={(e) => setNewBenName(e.target.value)}
                            placeholder="e.g. ANIL KUMAR"
                            className="bank-input w-full"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">
                            Bank &amp; Branch Name:
                          </label>
                          <input
                            type="text"
                            value={newBenBankName}
                            onChange={(e) => setNewBenBankName(e.target.value)}
                            placeholder="e.g. PUNJAB NATIONAL BANK, DELHI"
                            className="bank-input w-full"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">
                            Account Number <span className="text-red-600">*</span>:
                          </label>
                          <input
                            type="text"
                            value={newBenAccount}
                            onChange={(e) => setNewBenAccount(e.target.value)}
                            placeholder="Account Number"
                            className="bank-input w-full font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">
                            Confirm Account Number <span className="text-red-600">*</span>:
                          </label>
                          <input
                            type="text"
                            value={newBenConfirmAccount}
                            onChange={(e) => setNewBenConfirmAccount(e.target.value)}
                            placeholder="Re-enter Account Number"
                            className="bank-input w-full font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">
                            Branch IFSC Code <span className="text-red-600">*</span>:
                          </label>
                          <input
                            type="text"
                            value={newBenIfsc}
                            onChange={(e) => setNewBenIfsc(e.target.value.toUpperCase())}
                            placeholder="e.g. PUNB0012800"
                            className="bank-input w-full font-mono uppercase"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">
                            Maximum Daily Transfer Limit (₹):
                          </label>
                          <input
                            type="number"
                            value={newBenLimit}
                            onChange={(e) => setNewBenLimit(e.target.value)}
                            placeholder="50000"
                            className="bank-input w-full font-mono"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          type="submit"
                          className="bank-btn px-4 py-1 text-xs font-bold bg-[#004c8f] text-white"
                        >
                          Register Beneficiary &raquo;
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: e-DEPOSITS (FIXED / RECURRING DEPOSITS) */}
          {activeTab === 'deposits' && (
            <div className="space-y-4">
              <div className="bank-panel-box shadow-xs">
                <div className="bank-panel-header">
                  <span>🏦 Open e-Fixed Deposit (e-TDR / e-STDR)</span>
                </div>

                <div className="p-3 bg-white space-y-3">
                  {fdSuccessNotice && (
                    <div className="p-2.5 bg-[#f0fff0] border border-[#008800] text-[#006600] text-xs font-semibold">
                      ✓ {fdSuccessNotice}
                    </div>
                  )}

                  {/* Active Deposits Table */}
                  <div>
                    <div className="font-bold text-[#003366] text-xs mb-1">
                      Active Term Deposits Held Under CIF {currentAccount?.cifNumber}:
                    </div>
                    <table className="bank-table mb-3">
                      <thead>
                        <tr>
                          <th>Deposit Number</th>
                          <th>Type</th>
                          <th className="text-right">Principal Amount (₹)</th>
                          <th className="text-center">Rate p.a.</th>
                          <th>Booking Date</th>
                          <th>Maturity Date</th>
                          <th className="text-right">Maturity Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fds.map((d) => (
                          <tr key={d.depositNumber}>
                            <td className="font-mono font-bold text-[#004c8f]">{d.depositNumber}</td>
                            <td>{d.type}</td>
                            <td className="text-right font-mono font-bold text-slate-800">
                              {formatINR(d.principalAmount)}
                            </td>
                            <td className="text-center font-mono font-bold text-emerald-800">
                              {d.interestRate.toFixed(2)}%
                            </td>
                            <td className="font-mono text-slate-600">{d.bookingDate}</td>
                            <td className="font-mono text-slate-900 font-bold">{d.maturityDate}</td>
                            <td className="text-right font-mono font-bold text-[#006600]">
                              {formatINR(d.maturityAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Form to Open New Deposit */}
                  <div className="border border-[#7f9db9] bg-[#f7f9fb] p-3">
                    <div className="font-bold text-[#003366] text-xs border-b border-[#ccd9e8] pb-1 mb-2">
                      New Term Deposit Booking Calculator
                    </div>

                    <form onSubmit={handleOpenFd} className="space-y-3 text-[11px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-800 mb-0.5">
                            Debit From Savings Account:
                          </label>
                          <select
                            value={selectedAccountNo}
                            onChange={(e) => setSelectedAccountNo(e.target.value)}
                            className="bank-input w-full font-mono font-semibold"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.accountNumber} value={acc.accountNumber}>
                                {acc.accountNumber} &ndash; Available: {formatINR(acc.balance)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-800 mb-0.5">
                            Deposit Amount (₹) [Min ₹ 1,000]:
                          </label>
                          <input
                            type="number"
                            min="1000"
                            step="500"
                            value={fdAmount}
                            onChange={(e) => setFdAmount(e.target.value)}
                            className="bank-input w-full font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-800 mb-0.5">
                            Deposit Tenure (Months):
                          </label>
                          <select
                            value={fdTenureMonths}
                            onChange={(e) => setFdTenureMonths(parseInt(e.target.value))}
                            className="bank-input w-full font-semibold"
                          >
                            <option value={6}>6 Months (180 Days) &ndash; 5.75% p.a.</option>
                            <option value={12}>1 Year (365 Days) &ndash; 6.80% p.a.</option>
                            <option value={24}>2 Years &ndash; 7.10% p.a. (Special Rate)</option>
                            <option value={36}>3 Years &ndash; 6.75% p.a.</option>
                            <option value={60}>5 Years Tax Saving FD &ndash; 6.50% p.a.</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-800 mb-0.5">
                            Deposit Payout Option:
                          </label>
                          <div className="flex gap-4 pt-1">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name="fdType"
                                value="STDR"
                                checked={fdType === 'STDR'}
                                onChange={() => setFdType('STDR')}
                              />
                              <span>Cumulative (e-STDR, Interest reinvested)</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name="fdType"
                                value="TDR"
                                checked={fdType === 'TDR'}
                                onChange={() => setFdType('TDR')}
                              />
                              <span>Quarterly Payout (e-TDR)</span>
                            </label>
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-[#800000]">
                            <input
                              type="checkbox"
                              checked={isSeniorCitizen}
                              onChange={(e) => setIsSeniorCitizen(e.target.checked)}
                            />
                            <span>Senior Citizen Benefit (+0.50% Extra Interest Rate p.a.)</span>
                          </label>
                        </div>
                      </div>

                      {/* Live Calculation Box */}
                      <div className="p-2.5 bg-[#fffdec] border border-[#eedd82] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Applicable Rate</span>
                          <span className="font-mono font-bold text-base text-[#003366]">
                            {calculatedFd.rate.toFixed(2)}% p.a.
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Interest Earned</span>
                          <span className="font-mono font-bold text-base text-emerald-700">
                            {formatINR(calculatedFd.interest)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Maturity Amount</span>
                          <span className="font-mono font-bold text-base text-[#006600]">
                            {formatINR(calculatedFd.maturity)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Maturity Date</span>
                          <span className="font-mono font-bold text-xs text-slate-900 mt-1 block">
                            {calculatedFd.maturityDate}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          type="submit"
                          className="bank-btn px-6 py-1.5 text-xs font-bold bg-[#004c8f] text-white"
                        >
                          Book Fixed Deposit Now &raquo;
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CHEQUES & SERVICES */}
          {activeTab === 'cheques' && (
            <div className="space-y-4">
              <div className="bank-panel-box shadow-xs">
                <div className="bank-panel-header">
                  <span>📝 Cheque Book Issuance &amp; Cheque Management</span>
                </div>

                <div className="p-3 bg-white space-y-4">
                  {chequeNotice && (
                    <div className="p-2.5 bg-[#f0fff0] border border-[#008800] text-[#006600] text-xs font-semibold">
                      ✓ {chequeNotice}
                    </div>
                  )}

                  {/* Previous Requests Table */}
                  <div>
                    <div className="font-bold text-[#003366] text-xs mb-1">Previous Cheque Book Requests:</div>
                    <table className="bank-table mb-3">
                      <thead>
                        <tr>
                          <th>Service Request No (SRN)</th>
                          <th>Account Number</th>
                          <th>Leaves</th>
                          <th>Request Date</th>
                          <th>Status</th>
                          <th>Dispatch Tracking (India Post)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chequeRequests.map((r) => (
                          <tr key={r.srn}>
                            <td className="font-mono font-bold text-[#004c8f]">{r.srn}</td>
                            <td className="font-mono">{r.accountNumber}</td>
                            <td>{r.leaves} Leaves</td>
                            <td className="font-mono">{r.requestedDate}</td>
                            <td>
                              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold">
                                {r.status}
                              </span>
                            </td>
                            <td className="font-mono font-bold text-slate-800">{r.trackingNumber}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Request Cheque Book */}
                    <div className="border border-[#99b4d1] bg-[#f7f9fb] p-3">
                      <div className="font-bold text-[#003366] text-xs border-b border-[#ccd9e8] pb-1 mb-2">
                        Request New Cheque Book
                      </div>

                      <form onSubmit={handleRequestCheque} className="space-y-2 text-[11px]">
                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">Account Number:</label>
                          <select
                            value={selectedAccountNo}
                            onChange={(e) => setSelectedAccountNo(e.target.value)}
                            className="bank-input w-full font-mono font-bold"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.accountNumber} value={acc.accountNumber}>
                                {acc.accountNumber} &ndash; {acc.accountType}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">Number of Leaves:</label>
                          <select
                            value={chequeLeaves}
                            onChange={(e) => setChequeLeaves(parseInt(e.target.value))}
                            className="bank-input w-full"
                          >
                            <option value={25}>25 Leaves (Personal)</option>
                            <option value={50}>50 Leaves (Standard)</option>
                            <option value={100}>100 Leaves (Commercial)</option>
                          </select>
                        </div>

                        <div className="p-2 bg-[#fffdec] border border-[#eedd82] text-[10px] text-slate-700">
                          <strong>Delivery Address:</strong> Registered CBS Communication Address (Connaught Place, New Delhi). Cheque book will be dispatched via India Post Speed Post.
                        </div>

                        <button
                          type="submit"
                          className="bank-btn w-full py-1.5 font-bold text-xs bg-[#004c8f] text-white"
                        >
                          Submit Cheque Book Request »
                        </button>
                      </form>
                    </div>

                    {/* Stop Cheque */}
                    <div className="border border-[#cc8888] bg-[#fffbfb] p-3">
                      <div className="font-bold text-[#800000] text-xs border-b border-[#eeaaaa] pb-1 mb-2">
                        Stop Cheque Payment Instruction
                      </div>

                      {stopChequeNotice && (
                        <div className="mb-2 p-2 bg-[#fff0f0] border border-[#cc0000] text-[#990000] text-xs font-semibold">
                          ✓ {stopChequeNotice}
                        </div>
                      )}

                      <form onSubmit={handleStopCheque} className="space-y-2 text-[11px]">
                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">
                            Cheque Number (6 Digits):
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={stopChequeNo}
                            onChange={(e) => setStopChequeNo(e.target.value)}
                            placeholder="e.g. 482910"
                            className="bank-input w-full font-mono text-center font-bold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">Reason for Stop Payment:</label>
                          <select
                            value={stopChequeReason}
                            onChange={(e) => setStopChequeReason(e.target.value)}
                            className="bank-input w-full"
                          >
                            <option>Cheque Leaf Misplaced / Lost</option>
                            <option>Cheque Destroyed / Mutilated</option>
                            <option>Commercial Dispute with Payee</option>
                            <option>Payment Already Made by Alternate Mode</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="bank-btn-danger w-full py-1.5 font-bold text-xs"
                        >
                          Apply Stop Payment Marker »
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PROFILE & SECURITY PASSWORD */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bank-panel-box shadow-xs">
                <div className="bank-panel-header">
                  <span>🔒 NetBanking Profile Password &amp; Limits</span>
                </div>

                <div className="p-3 bg-white space-y-3 text-[11px]">
                  <div className="bg-[#fff9e6] border border-[#d4a840] p-2.5 text-[#553b00]">
                    <strong className="block mb-1 text-xs">About Profile Password in OnlineSBI:</strong>
                    The Profile Password is a distinctive security layer used to safeguard your account against unauthorized modifications. It is required to add beneficiaries, increase transfer limits, update registered mobile numbers, or alter PAN/Aadhaar credentials.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-[#99b4d1] p-3 bg-[#f7f9fb]">
                      <div className="font-bold text-[#003366] text-xs border-b border-[#ccd9e8] pb-1 mb-2">
                        Customer Profile Particulars
                      </div>
                      <table className="bank-table">
                        <tbody>
                          <tr>
                            <td className="font-semibold text-slate-600">Full Name</td>
                            <td className="font-bold text-slate-900">{user.name}</td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">User ID / Email</td>
                            <td className="font-mono">{user.email}</td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Role Authority</td>
                            <td>
                              <span className="uppercase font-bold text-[#004c8f]">{user.role}</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">KYC Status</td>
                            <td>
                              <span className="text-emerald-700 font-bold">COMPLIANT &bull; VERIFIED</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="font-semibold text-slate-600">Aadhaar Seeding</td>
                            <td className="text-emerald-700 font-bold">YES &bull; ACTIVE FOR NPCI SWEEP</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="border border-[#99b4d1] p-3 bg-[#f7f9fb]">
                      <div className="font-bold text-[#003366] text-xs border-b border-[#ccd9e8] pb-1 mb-2">
                        Set / Change Profile Password
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          alert('Profile Password updated successfully! Stored securely in CBS auth vault.');
                        }}
                        className="space-y-2"
                      >
                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">Enter New Profile Password:</label>
                          <input
                            type="password"
                            placeholder="At least 8 characters"
                            className="bank-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">Confirm Profile Password:</label>
                          <input
                            type="password"
                            placeholder="Re-enter Profile Password"
                            className="bank-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">Hint Question:</label>
                          <select className="bank-input w-full">
                            <option>What is your first school name?</option>
                            <option>What is your childhood pet name?</option>
                            <option>What is your favorite book?</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-0.5">Answer:</label>
                          <input type="text" placeholder="Secret Answer" className="bank-input w-full" />
                        </div>
                        <button
                          type="submit"
                          className="bank-btn w-full py-1.5 font-bold text-xs bg-[#004c8f] text-white mt-1"
                        >
                          Update Profile Password »
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ADMIN CBS TERMINAL (only when user.role === 'admin') */}
          {activeTab === 'admin' && user.role === 'admin' && (
            <div className="space-y-4">
              <div className="bank-panel-box shadow-xs border-2 border-purple-900">
                <div className="bank-panel-header bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-amber-200">
                  <div className="flex items-center gap-2">
                    <span>🏛️</span>
                    <span className="font-bold text-xs">
                      CORE BANKING SYSTEM (CBS) &ndash; MASTER LEDGER TERMINAL
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-mono">SYS_AUTH: LEVEL_4_MANAGER</span>
                </div>

                <div className="p-3 bg-white space-y-3 text-[11px]">
                  <div className="p-2 bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold">
                    Branch: 00691 &ndash; CONNAUGHT PLACE | Day Status: <strong>ONLINE (BATCH OPEN)</strong>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border border-slate-300 p-2.5 bg-slate-50 text-center">
                      <span className="text-[10.5px] text-slate-500 block">Total Active Customer Accounts</span>
                      <span className="text-xl font-bold font-mono text-[#003366]">14,291</span>
                    </div>
                    <div className="border border-slate-300 p-2.5 bg-slate-50 text-center">
                      <span className="text-[10.5px] text-slate-500 block">Branch Total Deposit Book</span>
                      <span className="text-xl font-bold font-mono text-[#006600]">₹ 182.45 Cr</span>
                    </div>
                    <div className="border border-slate-300 p-2.5 bg-slate-50 text-center">
                      <span className="text-[10.5px] text-slate-500 block">EOD Clearing Queue Status</span>
                      <span className="text-xl font-bold font-mono text-emerald-700">0 PENDING</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900 mb-1">Recent Inter-Branch Clearing Queue:</div>
                    <table className="bank-table">
                      <thead>
                        <tr>
                          <th>Batch ID</th>
                          <th>Clearing House</th>
                          <th>Instrument Count</th>
                          <th className="text-right">Net Settle Value (₹)</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-mono">CLG-2026-0924-B1</td>
                          <td>NPCI / IMPS Switch</td>
                          <td>4,120 Txns</td>
                          <td className="text-right font-mono font-bold">₹ 4,18,29,100.00</td>
                          <td>
                            <span className="text-emerald-700 font-bold">SETTLED</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => alert('Batch CLG-2026-0924-B1 audit trail downloaded.')}
                              className="bank-btn text-[10px] px-2 py-0.5"
                            >
                              Audit Log
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="font-mono">CLG-2026-0924-B2</td>
                          <td>RBI NEFT Batch #18</td>
                          <td>1,840 Txns</td>
                          <td className="text-right font-mono font-bold">₹ 12,89,40,250.00</td>
                          <td>
                            <span className="text-emerald-700 font-bold">SETTLED</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => alert('Batch CLG-2026-0924-B2 audit trail downloaded.')}
                              className="bank-btn text-[10px] px-2 py-0.5"
                            >
                              Audit Log
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => alert('End of Day (EOD) dry run executed. All branch ledgers in balance.')}
                      className="bank-btn px-4 py-1.5 text-xs font-bold bg-purple-900 text-white"
                    >
                      Run EOD Day-End Reconciliation Check »
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <BankFooter />
    </div>
  );
}
