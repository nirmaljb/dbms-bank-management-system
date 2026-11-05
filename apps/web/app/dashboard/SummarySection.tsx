'use client';

import React, { useEffect, useState } from 'react';
import { Panel, StatusBadge, StatTile, TxnAmount, EmptyRow, LoadingRow } from '../components/ui';
import {
  apiGet,
  formatDate,
  formatDateTime,
  formatINR,
  TXN_TYPE_LABELS,
  type CustomerOverview,
  type StatementRow,
} from '../lib/api';

export function SummarySection({
  overview,
  onNavigate,
}: {
  overview: CustomerOverview;
  onNavigate: (tab: string) => void;
}) {
  const [recent, setRecent] = useState<StatementRow[] | null>(null);

  useEffect(() => {
    apiGet<{ transactions: StatementRow[] }>('/customer/statement').then((res) =>
      setRecent(res.data ? res.data.transactions.slice(0, 5) : [])
    );
  }, [overview.balance]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <div className="lg:col-span-8 space-y-3">
        <Panel title="🏦 Savings Account" right={<StatusBadge status={overview.account_status} />}>
          <table className="bank-table">
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Type</th>
                <th>Holder</th>
                <th>Opened</th>
                <th className="text-right">Available Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-mono font-bold">{overview.account_number}</td>
                <td>{overview.account_type}</td>
                <td>{overview.name}</td>
                <td>{formatDate(overview.account_opened_at)}</td>
                <td className="text-right font-mono font-extrabold text-[#006600] text-sm">
                  {formatINR(overview.balance)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="p-2 flex flex-wrap gap-2 bg-[#f0f4f8] border-t border-[#ccd9e8]">
            <button type="button" className="bank-btn" onClick={() => onNavigate('deposit')}>
              Deposit
            </button>
            <button type="button" className="bank-btn" onClick={() => onNavigate('withdraw')}>
              Withdraw
            </button>
            <button type="button" className="bank-btn-secondary" onClick={() => onNavigate('statement')}>
              Full Statement
            </button>
          </div>
        </Panel>

        <Panel title="🧾 Recent Transactions" tone="secondary">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ref #</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {recent === null ? (
                <LoadingRow colSpan={5} />
              ) : recent.length === 0 ? (
                <EmptyRow colSpan={5} text="No transactions yet. Make a deposit to get started." />
              ) : (
                recent.map((t) => (
                  <tr key={t.txn_id}>
                    <td>{formatDateTime(t.posted_at || t.created_at)}</td>
                    <td className="font-mono">{t.txn_id}</td>
                    <td>
                      {t.description}
                      <div className="text-[10px] text-slate-500">{TXN_TYPE_LABELS[t.type]}</div>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="text-right">
                      <TxnAmount direction={t.direction} amount={t.amount} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="lg:col-span-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          <StatTile
            label="Credit Score"
            value={overview.credit_score}
            hint="Range 300 – 900. Click for breakdown."
            tone={overview.credit_score >= 750 ? 'good' : overview.credit_score >= 650 ? 'default' : 'danger'}
            onClick={() => onNavigate('credit')}
          />
          <StatTile
            label="Loan"
            value={overview.open_loan_status ? <StatusBadge status={overview.open_loan_status} /> : 'None'}
            hint={
              overview.open_loan_status === 'ACTIVE'
                ? `Outstanding ${formatINR(overview.open_loan_outstanding)}`
                : overview.open_loan_status === 'PENDING'
                  ? `Requested ${formatINR(overview.open_loan_amount)}`
                  : 'Request a personal loan'
            }
            onClick={() => onNavigate('loans')}
          />
          <StatTile
            label="Unread Notices"
            value={overview.unread_notices ?? 0}
            tone={overview.unread_notices ? 'warn' : 'default'}
            onClick={() => onNavigate('notices')}
          />
        </div>
      </div>
    </div>
  );
}
