'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader, type NavItem } from '../components/BankHeader';
import { BankFooter } from '../components/BankFooter';
import { apiGet, type AdminStats } from '../lib/api';
import { OverviewSection } from './OverviewSection';
import { CustomersSection } from './CustomersSection';
import { TransactionsSection } from './TransactionsSection';
import { LoansSection } from './LoansSection';
import { NoticesSection } from './NoticesSection';

type Tab = 'overview' | 'customers' | 'transactions' | 'loans' | 'notices';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  // Lets the overview tiles open the transactions tab pre-filtered.
  const [txnPreset, setTxnPreset] = useState<{ status?: string; type?: string } | undefined>();

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/admin/login');
    else if (user.role !== 'admin') router.replace('/dashboard');
  }, [user, authLoading, router]);

  const refreshStats = useCallback(async () => {
    const res = await apiGet<{ stats: AdminStats }>('/admin/overview');
    if (res.error !== undefined) {
      setStatsError(res.error);
    } else {
      setStatsError(null);
      setStats(res.data.stats);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') refreshStats();
  }, [user, refreshStats]);

  const navItems: NavItem[] = [
    { id: 'overview', label: '🏛️ Overview' },
    { id: 'customers', label: '👥 Customers' },
    { id: 'transactions', label: '🧾 Transactions', badge: stats?.pending_withdrawals || undefined },
    { id: 'loans', label: '🤝 Loans', badge: stats?.pending_loans || undefined },
    { id: 'notices', label: '📨 Notices' },
  ];

  const go = (t: Tab, preset?: { status?: string; type?: string }) => {
    setTxnPreset(preset);
    setTab(t);
  };

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="bank-page-container">
        <BankHeader />
        <main className="p-6 text-center text-slate-600 flex-1">Verifying administrator session...</main>
        <BankFooter />
      </div>
    );
  }

  return (
    <div className="bank-page-container">
      <BankHeader navItems={navItems} activeTab={tab} onTabChange={(t) => go(t as Tab)} />

      <main id="main-content" className="p-3 sm:p-4 bg-[#f4f7fa] flex-1">
        {tab === 'overview' && <OverviewSection stats={stats} error={statsError} onNavigate={go} />}
        {tab === 'customers' && <CustomersSection onChange={refreshStats} />}
        {tab === 'transactions' && <TransactionsSection preset={txnPreset} onChange={refreshStats} />}
        {tab === 'loans' && <LoansSection onChange={refreshStats} />}
        {tab === 'notices' && <NoticesSection />}
      </main>

      <BankFooter />
    </div>
  );
}
