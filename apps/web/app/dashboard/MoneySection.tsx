'use client';

import React, { useState } from 'react';
import { Panel, FlashMessage, AmountInput, type Flash } from '../components/ui';
import { apiPost, formatINR, type CustomerOverview } from '../lib/api';

export function MoneySection({
  mode,
  overview,
  onDone,
}: {
  mode: 'deposit' | 'withdraw';
  overview: CustomerOverview;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);
  const isDeposit = mode === 'deposit';
  const limit = Number(overview.withdrawal_approval_limit ?? 50000);
  const frozen = overview.account_status === 'FROZEN';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setFlash({ kind: 'error', text: 'Enter an amount greater than zero.' });
      return;
    }
    setBusy(true);
    const res = await apiPost<{ txnId: string; status: string }>(`/customer/${mode}`, { amount });
    setBusy(false);
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      return;
    }
    setAmount('');
    if (res.data.status === 'PENDING') {
      setFlash({
        kind: 'info',
        text: `Withdrawal of ${formatINR(amount)} is above ${formatINR(limit)} and is awaiting approval from a bank officer.\nReference #${res.data.txnId}. Your balance will change once it is approved.`,
      });
    } else {
      setFlash({
        kind: 'success',
        text: `${isDeposit ? 'Deposit' : 'Withdrawal'} of ${formatINR(amount)} completed. Reference #${res.data.txnId}.`,
      });
    }
    onDone();
  };

  return (
    <div className="max-w-xl">
      <Panel title={isDeposit ? '💵 Deposit' : '🏧 Withdraw'}>
        <div className="p-4">
          <FlashMessage flash={flash} onClose={() => setFlash(null)} />
          <form onSubmit={submit} className="space-y-3" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <span className="sm:col-span-4 text-xs font-bold text-[#003366]">Account:</span>
              <span className="sm:col-span-8 font-mono text-xs">{overview.account_number}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <span className="sm:col-span-4 text-xs font-bold text-[#003366]">Available balance:</span>
              <span className="sm:col-span-8 font-mono text-xs font-bold text-[#006600]">
                {formatINR(overview.balance)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <label htmlFor="amount" className="sm:col-span-4 text-xs font-bold text-[#003366]">
                Amount:
              </label>
              <div className="sm:col-span-8">
                <AmountInput id="amount" value={amount} onChange={setAmount} />
              </div>
            </div>
            {!isDeposit && (
              <p className={`text-[11px] m-0 ${Number(amount) > limit ? 'bank-security-notice' : 'text-slate-500'}`}>
                Withdrawals above {formatINR(limit)} are sent to a bank officer for approval.
              </p>
            )}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button type="submit" className="bank-btn px-6 disabled:opacity-50" disabled={busy || frozen}>
                {busy ? 'Processing...' : isDeposit ? 'Deposit' : 'Withdraw'}
              </button>
            </div>
          </form>
        </div>
      </Panel>
    </div>
  );
}
