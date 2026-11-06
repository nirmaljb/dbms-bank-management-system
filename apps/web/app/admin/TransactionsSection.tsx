'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Panel,
  StatusBadge,
  FlashMessage,
  EmptyRow,
  LoadingRow,
  PromptDialog,
  TxnAmount,
  type Flash,
} from '../components/ui';
import {
  apiGet,
  apiPost,
  toQuery,
  formatDateTime,
  formatINR,
  TXN_TYPE_LABELS,
  type AdminTransaction,
  type TxnType,
} from '../lib/api';
import { WithKeyboard } from '../components/WithKeyboard';

interface Filters {
  customer: string;
  type: string;
  status: string;
  from: string;
  to: string;
}

const EMPTY: Filters = { customer: '', type: '', status: '', from: '', to: '' };

type Action = { kind: 'approve' | 'reject' | 'reverse'; txn: AdminTransaction } | null;

export function TransactionsSection({
  preset,
  onChange,
}: {
  preset?: { status?: string; type?: string };
  onChange: () => void;
}) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, ...preset });
  const [rows, setRows] = useState<AdminTransaction[] | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [action, setAction] = useState<Action>(null);

  const load = useCallback(async (f: Filters) => {
    setRows(null);
    const res = await apiGet<{ transactions: AdminTransaction[] }>(`/admin/transactions${toQuery({ ...f })}`);
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      setRows([]);
    } else {
      setRows(res.data.transactions);
    }
  }, []);

  useEffect(() => {
    load({ ...EMPTY, ...preset });
  }, [load, preset]);

  const run = async (a: NonNullable<Action>, reason: string) => {
    const id = a.txn.txn_id;
    const res = await apiPost(`/admin/transactions/${id}/${a.kind}`, a.kind === 'approve' ? {} : { reason });
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: `Transaction #${id}: ${res.error}` });
      return;
    }
    const verb = { approve: 'approved', reject: 'rejected', reverse: 'reversed' }[a.kind];
    setFlash({ kind: 'success', text: `Transaction #${id} ${verb}.` });
    await load(filters);
    onChange();
  };

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  const canReverse = (t: AdminTransaction) =>
    t.status === 'COMPLETED' && (t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL');

  return (
    <Panel title="🧾 All Transactions" tone="admin" right={<span className="text-[10.5px]">latest 500</span>}>
      <form
        className="p-2.5 flex flex-wrap items-end gap-2 bg-[#f0f4f8] border-b border-[#ccd9e8] text-[11px]"
        onSubmit={(e) => {
          e.preventDefault();
          load(filters);
        }}
      >
        <label>
          <span className="block font-bold text-[#003366]">Customer</span>
          <WithKeyboard className="w-52">
            <input
              className="bank-input w-full"
              placeholder="name, email or A/c no."
              value={filters.customer}
              onChange={set('customer')}
            />
          </WithKeyboard>
        </label>
        <label>
          <span className="block font-bold text-[#003366]">Type</span>
          <select className="bank-input" value={filters.type} onChange={set('type')}>
            <option value="">All types</option>
            {(Object.keys(TXN_TYPE_LABELS) as TxnType[]).map((t) => (
              <option key={t} value={t}>
                {TXN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block font-bold text-[#003366]">Status</span>
          <select className="bank-input" value={filters.status} onChange={set('status')}>
            <option value="">All statuses</option>
            {['PENDING', 'COMPLETED', 'REJECTED', 'REVERSED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block font-bold text-[#003366]">From</span>
          <input type="date" className="bank-input" value={filters.from} onChange={set('from')} />
        </label>
        <label>
          <span className="block font-bold text-[#003366]">To</span>
          <input type="date" className="bank-input" value={filters.to} onChange={set('to')} />
        </label>
        <button type="submit" className="bank-btn">
          Filter
        </button>
        <button
          type="button"
          className="bank-btn-secondary"
          onClick={() => {
            setFilters(EMPTY);
            load(EMPTY);
          }}
        >
          Clear
        </button>
      </form>

      <div className="p-2 pb-0">
        <FlashMessage flash={flash} onClose={() => setFlash(null)} />
      </div>

      <div className="overflow-x-auto">
        <table className="bank-table">
          <thead>
            <tr>
              <th>Ref #</th>
              <th>Date</th>
              <th>Customer / A/c</th>
              <th>Type</th>
              <th className="text-right">Amount (₹)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <LoadingRow colSpan={7} />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7} text="No transactions match these filters." />
            ) : (
              rows.map((t) => (
                <tr key={t.txn_id}>
                  <td className="font-mono">{t.txn_id}</td>
                  <td className="whitespace-nowrap">{formatDateTime(t.created_at)}</td>
                  <td>
                    <div className="font-bold">{t.customer_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {t.account_number}
                      {t.account_status === 'FROZEN' && ' ❄'}
                    </div>
                  </td>
                  <td>
                    {TXN_TYPE_LABELS[t.type]}
                    <div className="text-[10px] text-slate-500">
                      {t.reversal_of && `of #${t.reversal_of}`}
                      {t.reversed_by_txn_id && `reversed by #${t.reversed_by_txn_id}`}
                      {t.counterparty_account_number &&
                        `${t.type === 'TRANSFER_OUT' ? 'to' : 'from'} ${t.counterparty_account_number}`}
                      {t.remarks && ` · ${t.remarks}`}
                    </div>
                  </td>
                  <td className="text-right">
                    <TxnAmount direction={t.direction} amount={t.amount} />
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                    {t.processed_by_name && (
                      <div className="text-[10px] text-slate-500">by {t.processed_by_name}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap space-x-1">
                    {t.status === 'PENDING' && t.type === 'WITHDRAWAL' && (
                      <>
                        <button type="button" className="bank-btn" onClick={() => setAction({ kind: 'approve', txn: t })}>
                          Approve
                        </button>
                        <button
                          type="button"
                          className="bank-btn-danger"
                          onClick={() => setAction({ kind: 'reject', txn: t })}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {canReverse(t) && (
                      <button
                        type="button"
                        className="bank-btn-secondary"
                        onClick={() => setAction({ kind: 'reverse', txn: t })}
                      >
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PromptDialog
        isOpen={!!action}
        title={
          action?.kind === 'approve'
            ? 'Approve Withdrawal'
            : action?.kind === 'reject'
              ? 'Reject Withdrawal'
              : 'Reverse Transaction'
        }
        message={
          !action
            ? ''
            : action.kind === 'approve'
              ? `Approve withdrawal #${action.txn.txn_id} of ${formatINR(action.txn.amount)} for ${action.txn.customer_name}?\nCurrent balance: ${formatINR(action.txn.account_balance)}. The balance is checked again when you approve.`
              : action.kind === 'reject'
                ? `Reject withdrawal #${action.txn.txn_id} of ${formatINR(action.txn.amount)} for ${action.txn.customer_name}?`
                : `Reverse ${TXN_TYPE_LABELS[action.txn.type].toLowerCase()} #${action.txn.txn_id} of ${formatINR(action.txn.amount)}?\nAn opposite REVERSAL entry will be posted and the original marked REVERSED. Nothing is deleted.`
        }
        inputLabel={action?.kind === 'approve' ? undefined : 'Reason (optional)'}
        confirmText={action?.kind === 'approve' ? 'Approve' : action?.kind === 'reject' ? 'Reject' : 'Reverse'}
        danger={action?.kind !== 'approve'}
        onConfirm={(reason) => {
          const a = action;
          setAction(null);
          if (a) run(a, reason);
        }}
        onClose={() => setAction(null)}
      />
    </Panel>
  );
}
