'use client';

import React, { useState } from 'react';
import { Panel, FlashMessage, AmountInput, type Flash } from '../components/ui';
import { apiGet, apiPost, formatAccountNumber, formatINR, toQuery, type CustomerOverview, type Payee } from '../lib/api';
import { WithKeyboard } from '../components/WithKeyboard';

// Two steps, like a real NetBanking transfer: verify the payee (the server
// checks the account number's check digit and that the IFSC matches its
// branch, and returns the masked holder name), then send.
export function TransferSection({ overview, onDone }: { overview: CustomerOverview; onDone: () => void }) {
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [payee, setPayee] = useState<Payee | null>(null);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);
  const frozen = overview.account_status === 'FROZEN';

  const resetPayee = () => setPayee(null);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlash(null);
    setBusy(true);
    const res = await apiGet<{ payee: Payee }>(`/customer/payee${toQuery({ accountNumber, ifsc })}`);
    setBusy(false);
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      return;
    }
    if (res.data.payee.account_number === overview.account_number) {
      setFlash({ kind: 'error', text: 'That is your own account. Choose a different payee.' });
      return;
    }
    setPayee(res.data.payee);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payee) return;
    if (!amount || Number(amount) <= 0) {
      setFlash({ kind: 'error', text: 'Enter an amount greater than zero.' });
      return;
    }
    setBusy(true);
    const res = await apiPost<{ txnId: string }>('/customer/transfer', {
      accountNumber: payee.account_number,
      ifsc: payee.ifsc,
      amount,
      remarks: remarks.trim() || undefined,
    });
    setBusy(false);
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      return;
    }
    setFlash({
      kind: 'success',
      text: `${formatINR(amount)} sent to ${payee.holder_name} (${formatAccountNumber(payee.account_number)}). Reference #${res.data.txnId}.`,
    });
    setAmount('');
    setRemarks('');
    setAccountNumber('');
    setIfsc('');
    setPayee(null);
    onDone();
  };

  const row = (labelText: React.ReactNode, value: React.ReactNode) => (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
      <span className="sm:col-span-4 text-xs font-bold text-[#003366]">{labelText}</span>
      <div className="sm:col-span-8 text-xs">{value}</div>
    </div>
  );

  return (
    <div className="max-w-xl">
      <Panel title="🔁 Transfer Money">
        <div className="p-4 space-y-3">
          <FlashMessage flash={flash} onClose={() => setFlash(null)} />
          {row('From account:', <span className="font-mono">{formatAccountNumber(overview.account_number)}</span>)}
          {row(
            'Available balance:',
            <span className="font-mono font-bold text-[#006600]">{formatINR(overview.balance)}</span>
          )}

          <form onSubmit={verify} className="space-y-3 pt-3 border-t border-slate-200" noValidate>
            {row(
              <label htmlFor="payeeAccount">Payee account number:</label>,
              <WithKeyboard numeric disabled={!!payee}>
                <input
                  id="payeeAccount"
                  className="bank-input w-full font-mono"
                  inputMode="numeric"
                  placeholder="12 digits"
                  value={accountNumber}
                  disabled={!!payee}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/[^\d ]/g, '').slice(0, 15));
                    resetPayee();
                  }}
                />
              </WithKeyboard>
            )}
            {row(
              <label htmlFor="payeeIfsc">IFSC code:</label>,
              <WithKeyboard disabled={!!payee}>
                <input
                  id="payeeIfsc"
                  className="bank-input w-full font-mono uppercase"
                  placeholder="e.g. BNBK0000001"
                  maxLength={11}
                  value={ifsc}
                  disabled={!!payee}
                  autoCapitalize="characters"
                  onChange={(e) => {
                    setIfsc(e.target.value.toUpperCase());
                    resetPayee();
                  }}
                />
              </WithKeyboard>
            )}
            {!payee && (
              <div className="flex justify-end">
                <button type="submit" className="bank-btn-secondary px-4 disabled:opacity-50" disabled={busy || frozen}>
                  {busy ? 'Checking...' : 'Verify payee'}
                </button>
              </div>
            )}
          </form>

          {payee && (
            <form onSubmit={send} className="space-y-3" noValidate>
              <div className="p-2.5 border-2 border-[#2e8b2e] bg-[#effaef] text-xs text-[#004d00]">
                <div className="font-bold">✔ Payee verified: {payee.holder_name}</div>
                <div>
                  {payee.branch_name}, {payee.branch_city} · IFSC <span className="font-mono">{payee.ifsc}</span>
                </div>
                <button
                  type="button"
                  className="mt-1 text-[10px] underline bg-transparent border-0 cursor-pointer p-0 text-[#004d00]"
                  onClick={resetPayee}
                >
                  change payee
                </button>
              </div>
              {row(
                <label htmlFor="amount">Amount:</label>,
                <AmountInput id="amount" value={amount} onChange={setAmount} />
              )}
              {row(
                <label htmlFor="remarks">Remarks (optional):</label>,
                <WithKeyboard>
                  <input
                    id="remarks"
                    className="bank-input w-full"
                    maxLength={100}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </WithKeyboard>
              )}
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button type="submit" className="bank-btn px-6 disabled:opacity-50" disabled={busy || frozen}>
                  {busy ? 'Sending...' : 'Send money'}
                </button>
              </div>
            </form>
          )}

          <p className="text-[11px] text-slate-500 m-0">
            The last digit of every account number is a check digit, so a mistyped number is caught before any
            money moves. The IFSC must belong to the payee&apos;s branch.
          </p>
        </div>
      </Panel>
    </div>
  );
}
