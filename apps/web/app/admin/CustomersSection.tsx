'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Panel, StatusBadge, FlashMessage, EmptyRow, LoadingRow, PromptDialog, type Flash } from '../components/ui';
import { apiGet, apiPost, formatDate, formatINR, type CustomerOverview } from '../lib/api';

export function CustomersSection({ onChange }: { onChange: () => void }) {
  const [customers, setCustomers] = useState<CustomerOverview[] | null>(null);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [target, setTarget] = useState<CustomerOverview | null>(null);

  const load = useCallback(async () => {
    const res = await apiGet<{ customers: CustomerOverview[] }>('/admin/customers');
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      setCustomers([]);
    } else {
      setCustomers(res.data.customers);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (c: CustomerOverview) => {
    const status = c.account_status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
    const res = await apiPost(`/admin/accounts/${c.account_id}/status`, { status });
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      return;
    }
    setFlash({
      kind: 'success',
      text: `Account ${c.account_number} (${c.name}) is now ${status === 'FROZEN' ? 'frozen' : 'active'}.`,
    });
    await load();
    onChange();
  };

  const q = search.trim().toLowerCase();
  const visible = (customers ?? []).filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.email.includes(q) || c.account_number.startsWith(q)
  );

  return (
    <Panel
      title="👥 Customers"
      tone="admin"
      right={<span className="text-[10.5px]">{customers?.length ?? 0} total</span>}
    >
      <div className="p-2.5 bg-[#f0f4f8] border-b border-[#ccd9e8]">
        <FlashMessage flash={flash} onClose={() => setFlash(null)} />
        <input
          className="bank-input w-full max-w-sm"
          placeholder="Search by name, email or account number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="bank-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Account</th>
              <th className="text-right">Balance</th>
              <th>Status</th>
              <th className="text-right">Credit score</th>
              <th>Open loan</th>
              <th>Since</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {customers === null ? (
              <LoadingRow colSpan={8} />
            ) : visible.length === 0 ? (
              <EmptyRow colSpan={8} text="No customers found." />
            ) : (
              visible.map((c) => (
                <tr key={c.user_id}>
                  <td>
                    <div className="font-bold">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.email}</div>
                  </td>
                  <td className="font-mono">{c.account_number}</td>
                  <td className="text-right font-mono">{formatINR(c.balance)}</td>
                  <td>
                    <StatusBadge status={c.account_status} />
                  </td>
                  <td className="text-right font-mono font-bold">{c.credit_score}</td>
                  <td>
                    {c.open_loan_status ? (
                      <>
                        <StatusBadge status={c.open_loan_status} />
                        <div className="text-[10px] text-slate-500 font-mono">
                          {c.open_loan_status === 'ACTIVE'
                            ? `${formatINR(c.open_loan_outstanding)} outstanding`
                            : formatINR(c.open_loan_amount)}
                        </div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{formatDate(c.customer_since)}</td>
                  <td>
                    <button
                      type="button"
                      className={c.account_status === 'FROZEN' ? 'bank-btn' : 'bank-btn-danger'}
                      onClick={() => setTarget(c)}
                    >
                      {c.account_status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PromptDialog
        isOpen={!!target}
        title={target?.account_status === 'FROZEN' ? 'Unfreeze Account' : 'Freeze Account'}
        message={
          target?.account_status === 'FROZEN'
            ? `Unfreeze account ${target?.account_number} (${target?.name})? Deposits, withdrawals and loans will be allowed again.`
            : `Freeze account ${target?.account_number} (${target?.name})?\nDeposits, withdrawals, loan requests and disbursals will be blocked. The customer can still pay loan dues.`
        }
        confirmText={target?.account_status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
        danger={target?.account_status !== 'FROZEN'}
        onConfirm={() => {
          const c = target;
          setTarget(null);
          if (c) toggle(c);
        }}
        onClose={() => setTarget(null)}
      />
    </Panel>
  );
}
