'use client';

import React, { useEffect, useState } from 'react';
import { Panel, StatTile, FlashMessage, LoadingRow } from '../components/ui';
import { apiGet, formatINR, type AdminBranch, type AdminStats } from '../lib/api';

type Tab = 'overview' | 'applications' | 'customers' | 'transactions' | 'loans' | 'notices';

export function OverviewSection({
  stats,
  error,
  onNavigate,
}: {
  stats: AdminStats | null;
  error: string | null;
  onNavigate: (tab: Tab, preset?: { status?: string; type?: string }) => void;
}) {
  const [branches, setBranches] = useState<AdminBranch[] | null>(null);

  useEffect(() => {
    apiGet<{ branches: AdminBranch[] }>('/admin/branches').then((res) => setBranches(res.data?.branches ?? []));
  }, [stats]);

  if (error) return <FlashMessage flash={{ kind: 'error', text: error }} />;
  if (!stats) return <div className="p-6 text-center text-slate-600">Loading bank overview...</div>;

  return (
    <div className="space-y-3">
      <Panel title="🏛️ Bank at a Glance" tone="admin">
        <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatTile
            label="Open accounts"
            value={stats.customer_count}
            hint={`across ${stats.branch_count} branches`}
            onClick={() => onNavigate('customers')}
          />
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
        <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <StatTile
            label="Account applications"
            value={stats.pending_applications}
            hint="Click to approve or reject"
            tone={stats.pending_applications ? 'warn' : 'default'}
            onClick={() => onNavigate('applications')}
          />
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

      <Panel title="🏢 Branches & IFSC Codes" tone="admin">
        <div className="overflow-x-auto">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Branch</th>
                <th>IFSC</th>
                <th className="text-right">Open accounts</th>
                <th className="text-right">Pending applications</th>
                <th className="text-right">Deposits</th>
              </tr>
            </thead>
            <tbody>
              {branches === null ? (
                <LoadingRow colSpan={6} />
              ) : (
                branches.map((b) => (
                  <tr key={b.code}>
                    <td className="font-mono">{b.code}</td>
                    <td>
                      {b.name}, {b.city}
                    </td>
                    <td className="font-mono font-bold">{b.ifsc}</td>
                    <td className="text-right">{b.open_accounts}</td>
                    <td className="text-right">{b.pending_applications}</td>
                    <td className="text-right font-mono">{formatINR(b.deposits)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="m-0 px-3 py-2 text-[10.5px] text-slate-500 border-t border-[#ccd9e8]">
          IFSC = bank code BNBK + 0 + branch code padded to 6. Account number = branch (4) + product (2: 10 savings,
          20 current) + sequence (5) + Luhn check digit (1).
        </p>
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
