'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader, type NavItem } from '../components/BankHeader';
import { BankFooter } from '../components/BankFooter';
import { FlashMessage } from '../components/ui';
import { apiGet, type CustomerOverview } from '../lib/api';
import { SummarySection } from './SummarySection';
import { MoneySection } from './MoneySection';
import { StatementSection } from './StatementSection';
import { LoansSection } from './LoansSection';
import { CreditSection } from './CreditSection';
import { NoticesSection } from './NoticesSection';
import { TransferSection } from './TransferSection';
import { ApplicationStatus } from './ApplicationStatus';

type Tab = 'summary' | 'deposit' | 'withdraw' | 'transfer' | 'statement' | 'loans' | 'credit' | 'notices';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('summary');
  const [overview, setOverview] = useState<CustomerOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
    else if (user.role === 'admin') router.replace('/admin');
  }, [user, authLoading, router]);

  const refresh = useCallback(async () => {
    const res = await apiGet<{ account: CustomerOverview }>('/customer/overview');
    if (res.error !== undefined) {
      setLoadError(res.error);
    } else {
      setLoadError(null);
      setOverview(res.data.account);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'customer') refresh();
  }, [user, refresh]);

  // Until the bank approves the application there is no account to bank
  // with, so only the application status and notices are shown.
  const isOpen = overview?.account_status === 'ACTIVE' || overview?.account_status === 'FROZEN';
  const noticesItem: NavItem = { id: 'notices', label: '📨 Notices', badge: overview?.unread_notices || undefined };
  const navItems: NavItem[] = !overview
    ? []
    : isOpen
      ? [
          { id: 'summary', label: '📋 Account Summary' },
          { id: 'deposit', label: '💵 Deposit' },
          { id: 'withdraw', label: '🏧 Withdraw' },
          { id: 'transfer', label: '🔁 Transfer' },
          { id: 'statement', label: '📜 Statement' },
          { id: 'loans', label: '🤝 Loans' },
          { id: 'credit', label: '📊 Credit Score' },
          noticesItem,
        ]
      : [{ id: 'summary', label: '📋 Application Status' }, noticesItem];

  if (authLoading || !user || user.role !== 'customer') {
    return (
      <div className="bank-page-container">
        <BankHeader />
        <main className="p-6 text-center text-slate-600 flex-1">Verifying your session...</main>
        <BankFooter />
      </div>
    );
  }

  return (
    <div className="bank-page-container">
      <BankHeader navItems={navItems} activeTab={tab} onTabChange={(t) => setTab(t as Tab)} />

      <main id="main-content" className="p-3 sm:p-4 bg-[#f4f7fa] flex-1">
        {loadError && <FlashMessage flash={{ kind: 'error', text: loadError }} />}

        {overview?.account_status === 'FROZEN' && (
          <div className="mb-3 p-2.5 border-2 border-[#004c8f] bg-[#e6effa] text-[#003366] text-xs font-semibold">
            ❄ Your account is frozen by the bank. Deposits, withdrawals, transfers and new loans are blocked. You can still pay
            loan interest and repay principal.
          </div>
        )}

        {!overview ? (
          <div className="p-6 text-center text-slate-600">Loading your account...</div>
        ) : !isOpen ? (
          <>
            {tab !== 'notices' && <ApplicationStatus overview={overview} />}
            {tab === 'notices' && <NoticesSection onRead={refresh} />}
          </>
        ) : (
          <>
            {tab === 'summary' && <SummarySection overview={overview} onNavigate={(t) => setTab(t as Tab)} />}
            {tab === 'deposit' && <MoneySection mode="deposit" overview={overview} onDone={refresh} />}
            {tab === 'withdraw' && <MoneySection mode="withdraw" overview={overview} onDone={refresh} />}
            {tab === 'transfer' && <TransferSection overview={overview} onDone={refresh} />}
            {tab === 'statement' && <StatementSection overview={overview} />}
            {tab === 'loans' && <LoansSection overview={overview} onDone={refresh} />}
            {tab === 'credit' && <CreditSection />}
            {tab === 'notices' && <NoticesSection onRead={refresh} />}
          </>
        )}
      </main>

      <BankFooter />
    </div>
  );
}
