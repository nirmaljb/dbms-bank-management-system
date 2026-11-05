'use client';

import React from 'react';
import { Panel, StatTile, FlashMessage } from '../components/ui';
import { formatINR, type AdminStats } from '../lib/api';

type Tab = 'overview' | 'customers' | 'transactions' | 'loans' | 'notices';

export function OverviewSection({
  stats,
  error,
  onNavigate,
}: {
  stats: AdminStats | null;
  error: string | null;
  onNavigate: (tab: Tab, preset?: { status?: string; type?: string }) => void;
}) {
  if (error) return <FlashMessage flash={{ kind: 'error', text: error }} />;
  if (!stats) return <div className="p-6 text-center text-slate-600">Loading bank overview...</div>;

  return (
    <div className="space-y-3">
      <Panel title="🏛️ Bank at a Glance" tone="admin">
        <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatTile label="Customers" value={stats.customer_count} onClick={() => onNavigate('customers')} />
          <StatTile label="Total deposits" value={formatINR(stats.total_deposits)} hint="Sum of all balances" tone="good" />
          <StatTile
            label="Frozen accounts"
            value={stats.frozen_accounts}
            tone={stats.frozen_accounts ? 'warn' : 'default'}
            onClick={() => onNavigate('customers')}
          />
          <StatTile label="Transactions today" value={stats.transactions_today} onClick={() => onNavigate('transactions')} />
        </div>
      </Panel>

      <Panel title="⏳ Pending Items" tone="admin">
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          <StatTile
            label="Withdrawals awaiting approval"
            value={stats.pending_withdrawals}
            hint={`${formatINR(stats.pending_withdrawal_amount)} requested · click to review`}
            tone={stats.pending_withdrawals ? 'warn' : 'default'}
            onClick={() => onNavigate('transactions', { status: 'PENDING', type: 'WITHDRAWAL' })}
          />
          <StatTile
            label="Loan requests awaiting decision"
            value={stats.pending_loans}
            hint="Click to sanction or reject"
            tone={stats.pending_loans ? 'warn' : 'default'}
            onClick={() => onNavigate('loans')}
          />
        </div>
      </Panel>

      <Panel title="🤝 Loan Book" tone="admin">
        <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatTile label="Active loans" value={stats.active_loans} onClick={() => onNavigate('loans')} />
          <StatTile label="Outstanding principal" value={formatINR(stats.outstanding_principal)} />
          <StatTile label="Open dues" value={stats.open_dues} hint="Raised, not yet paid" />
          <StatTile
            label="Defaulted loans"
            value={stats.defaulted_loans}
            tone={stats.defaulted_loans ? 'danger' : 'default'}
            onClick={() => onNavigate('loans')}
          />
        </div>
      </Panel>
    </div>
  );
}
