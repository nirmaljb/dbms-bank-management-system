'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Panel, StatusBadge, EmptyRow, LoadingRow, FlashMessage } from '../components/ui';
import {
  apiGet,
  toQuery,
  formatDateTime,
  formatINR,
  TXN_TYPE_LABELS,
  type CustomerOverview,
  type StatementRow,
} from '../lib/api';

const money = (v: string | null) =>
  v === null ? '' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function StatementSection({ overview }: { overview: CustomerOverview }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<StatementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: string, t: string) => {
    setRows(null);
    const res = await apiGet<{ transactions: StatementRow[] }>(`/customer/statement${toQuery({ from: f, to: t })}`);
    if (res.error !== undefined) {
      setError(res.error);
      setRows([]);
    } else {
      setError(null);
      setRows(res.data.transactions);
    }
  }, []);

  useEffect(() => {
    load('', '');
  }, [load]);

  const totals = (rows ?? []).reduce(
    (acc, r) => {
      if (r.posted_at) {
        if (r.credit) acc.cr += Number(r.credit);
        if (r.debit) acc.dr += Number(r.debit);
      }
      return acc;
    },
    { cr: 0, dr: 0 }
  );

  return (
    <Panel
      title={`📜 Account Statement – ${overview.account_number}`}
      right={
        <button type="button" className="bank-btn-secondary text-[10.5px] py-0.5" onClick={() => window.print()}>
          🖨 Print
        </button>
      }
    >
      <form
        className="p-2.5 flex flex-wrap items-end gap-3 bg-[#f0f4f8] border-b border-[#ccd9e8] text-[11px]"
        onSubmit={(e) => {
          e.preventDefault();
          load(from, to);
        }}
      >
        <label>
          <span className="block font-bold text-[#003366]">From</span>
          <input type="date" className="bank-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span className="block font-bold text-[#003366]">To</span>
          <input type="date" className="bank-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="submit" className="bank-btn">
          View
        </button>
        <button
          type="button"
          className="bank-btn-secondary"
          onClick={() => {
            setFrom('');
            setTo('');
            load('', '');
          }}
        >
          All Time
        </button>
        <span className="ml-auto text-slate-600">
          Closing balance: <strong className="font-mono text-[#006600]">{formatINR(overview.balance)}</strong>
        </span>
      </form>

      {error && (
        <div className="p-2">
          <FlashMessage flash={{ kind: 'error', text: error }} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="bank-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Ref #</th>
              <th>Description</th>
              <th>Status</th>
              <th className="text-right">Debit (₹)</th>
              <th className="text-right">Credit (₹)</th>
              <th className="text-right">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <LoadingRow colSpan={7} />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7} text="No transactions in this period." />
            ) : (
              rows.map((r) => (
                <tr key={r.txn_id} className={r.posted_at ? '' : 'text-slate-500'}>
                  <td className="whitespace-nowrap">{formatDateTime(r.posted_at || r.created_at)}</td>
                  <td className="font-mono">{r.txn_id}</td>
                  <td>
                    {r.description}
                    <div className="text-[10px] text-slate-500">
                      {TXN_TYPE_LABELS[r.type]}
                      {r.remarks ? ` · ${r.remarks}` : ''}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="text-right font-mono text-[#a30000]">{money(r.debit)}</td>
                  <td className="text-right font-mono text-[#006600]">{money(r.credit)}</td>
                  <td className="text-right font-mono font-bold">{money(r.running_balance)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows && rows.length > 0 && (
            <tfoot>
              <tr className="bg-[#eef3f8] font-bold">
                <td colSpan={4} className="text-right">
                  Posted totals for this view
                </td>
                <td className="text-right font-mono text-[#a30000]">{money(String(totals.dr))}</td>
                <td className="text-right font-mono text-[#006600]">{money(String(totals.cr))}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="p-2 text-[10px] text-slate-500 border-t border-[#ccd9e8]">
        Running balance comes from the <span className="font-mono">v_account_statement</span> view. Pending and
        rejected entries do not affect it.
      </div>
    </Panel>
  );
}
