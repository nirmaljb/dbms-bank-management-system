'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader, type NavItem } from '../components/BankHeader';
import { BankFooter } from '../components/BankFooter';
import { apiGet, type AdminStats } from '../lib/api';
import { usePolling } from '../lib/use-live-refresh';
import { OverviewSection } from './OverviewSection';
import { CustomersSection } from './CustomersSection';
import { TransactionsSection } from './TransactionsSection';
import { ChequesSection } from './ChequesSection';
import { LoansSection } from './LoansSection';
import { NoticesSection } from './NoticesSection';
import { ApplicationsSection } from './ApplicationsSection';

// How often the admin console asks the server whether anything changed.
const POLL_MS = 10_000;

type Tab = 'overview' | 'applications' | 'customers' | 'transactions' | 'cheques' | 'loans' | 'notices';

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

  // Bumped whenever the overview numbers change, so the open section reloads
  // its list quietly (new applications, withdrawals, cheques, loans...).
  const [version, setVersion] = useState(0);
  const lastStats = useRef<string | null>(null);

  const refreshStats = useCallback(async (background = false) => {
    const res = await apiGet<{ stats: AdminStats }>('/admin/overview');
    if (res.error !== undefined) {
      // A dropped poll shouldn't replace the overview with an error.
      if (!background) setStatsError(res.error);
      return;
    }
    setStatsError(null);
    const json = JSON.stringify(res.data.stats);
    if (json === lastStats.current) return;
    if (lastStats.current !== null) setVersion((v) => v + 1);
    lastStats.current = json;
    setStats(res.data.stats);
  }, []);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) refreshStats();
  }, [isAdmin, refreshStats]);

  usePolling(() => refreshStats(true), POLL_MS, isAdmin);

  const navItems: NavItem[] = [
    { id: 'overview', label: '🏛️ Overview' },
    { id: 'applications', label: '📝 Applications', badge: stats?.pending_applications || undefined },
    { id: 'customers', label: '👥 Customers' },
    { id: 'transactions', label: '🧾 Transactions', badge: stats?.pending_withdrawals || undefined },
    { id: 'cheques', label: '🏦 Cheques', badge: stats?.cheques_in_clearing || undefined },
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
        {tab === 'applications' && <ApplicationsSection version={version} onChange={refreshStats} />}
        {tab === 'customers' && <CustomersSection version={version} onChange={refreshStats} />}
        {tab === 'transactions' && <TransactionsSection preset={txnPreset} version={version} onChange={refreshStats} />}
        {tab === 'cheques' && <ChequesSection version={version} onChange={refreshStats} />}
        {tab === 'loans' && <LoansSection version={version} onChange={refreshStats} />}
        {tab === 'notices' && <NoticesSection />}
      </main>

      <BankFooter />
    </div>
  );
}
