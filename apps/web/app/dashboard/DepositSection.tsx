'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Panel, FlashMessage, AmountInput, StatusBadge, EmptyRow, LoadingRow, type Flash } from '../components/ui';
import { WithKeyboard } from '../components/WithKeyboard';
import { BANK_NAME } from '../components/BankHeader';
import {
  apiGet,
  apiPost,
  formatAccountNumber,
  formatDate,
  formatDateTime,
  formatINR,
  type ChequeDeposit,
  type CustomerOverview,
  type OnlinePayment,
} from '../lib/api';
import { amountInWords } from '../lib/amount-words';

// There is no "type an amount and it appears" deposit. Money comes in the
// two ways a real account receives it from outside:
//   - a cheque, which sits in clearing until the bank clears or returns it
//   - an online payment from another bank account through a payment gateway
export function DepositSection({ overview, onDone }: { overview: CustomerOverview; onDone: () => void }) {
  const [mode, setMode] = useState<'cheque' | 'online'>('cheque');

  const tab = (id: typeof mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      aria-pressed={mode === id}
      className={`px-3 py-1.5 text-xs font-bold border border-b-0 cursor-pointer ${
        mode === id ? 'bg-white text-[#003366] border-[#7f9db9]' : 'bg-[#e4ebf3] text-slate-600 border-transparent'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex gap-1 border-b border-[#7f9db9]">
        {tab('cheque', '🧾 Deposit a cheque')}
        {tab('online', '📲 Add money (UPI / Card)')}
      </div>
      <div className="pt-3">
        {mode === 'cheque' ? (
          <ChequeDepositPanel overview={overview} />
        ) : (
          <AddMoneyPanel overview={overview} onDone={onDone} />
        )}
      </div>
    </div>
  );
}

const today = () => new Date().toLocaleDateString('en-CA');

function ChequeDepositPanel({ overview }: { overview: CustomerOverview }) {
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState(today());
  const [drawerAccount, setDrawerAccount] = useState('');
  const [drawerIfsc, setDrawerIfsc] = useState('');
  const [amount, setAmount] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);
  const [cheques, setCheques] = useState<ChequeDeposit[] | null>(null);
  const frozen = overview.account_status === 'FROZEN';

  const load = useCallback(async () => {
    const res = await apiGet<{ cheques: ChequeDeposit[] }>('/customer/cheques');
    setCheques(res.error !== undefined ? [] : res.data.cheques);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setFlash({ kind: 'error', text: 'Enter the amount written on the cheque.' });
      return;
    }
    setBusy(true);
    const res = await apiPost<{ chequeId: string }>('/customer/cheques', {
      chequeNo,
      chequeDate,
      amount,
      drawerAccountNumber: drawerAccount,
      drawerIfsc,
    });
    setBusy(false);
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      return;
    }
    setFlash({
      kind: 'info',
      text: `Cheque no. ${chequeNo} for ${formatINR(amount)} sent for clearing. Clearing ref #${res.data.chequeId}.\nYour balance will change once the cheque clears.`,
    });
    setChequeNo('');
    setDrawerAccount('');
    setDrawerIfsc('');
    setAmount('');
    setChequeDate(today());
    load();
  };

  const words = amountInWords(amount);
  const isOurBank = drawerIfsc.startsWith('BNBK');

  return (
    <div className="space-y-3">
      <Panel title="🧾 Cheque Deposit">
        <div className="p-4 space-y-3">
          <FlashMessage flash={flash} onClose={() => setFlash(null)} />
          <p className="text-[11px] text-slate-600 m-0">
            Copy the details from the cheque you received. Paying into{' '}
            <span className="font-mono font-bold">{formatAccountNumber(overview.account_number)}</span>.
          </p>

          {/* Laid out like the cheque leaf itself, so the fields are easy to find. */}
          <form
            onSubmit={submit}
            noValidate
            className="border-2 border-[#7f9db9] bg-gradient-to-br from-[#f3f8fd] to-[#e6f0f8] p-3 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Drawn on (IFSC)</div>
                <WithKeyboard className="w-44">
                  <input
                    aria-label="IFSC of the bank the cheque is drawn on"
                    className="bank-input w-full font-mono uppercase"
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    value={drawerIfsc}
                    autoCapitalize="characters"
                    onChange={(e) => setDrawerIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  />
                </WithKeyboard>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {drawerIfsc.length === 11 && (isOurBank ? `${BANK_NAME} cheque` : 'Other bank cheque')}
                </div>
              </div>
              <label>
                <span className="block text-[10px] uppercase tracking-wide text-slate-500">Date on cheque</span>
                <input
                  type="date"
                  className="bank-input font-mono"
                  value={chequeDate}
                  max={today()}
                  onChange={(e) => setChequeDate(e.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <label htmlFor="chequeAmount" className="sm:col-span-3 text-xs font-bold text-[#003366]">
                Amount (₹):
              </label>
              <div className="sm:col-span-5">
                <AmountInput id="chequeAmount" value={amount} onChange={setAmount} />
              </div>
            </div>
            <div className="min-h-[1.25rem] border-b border-dashed border-[#7f9db9] text-xs italic text-[#003366]">
              {words}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>
                <span className="block text-xs font-bold text-[#003366]">Drawer&apos;s account number:</span>
                <WithKeyboard numeric>
                  <input
                    className="bank-input w-full font-mono"
                    inputMode="numeric"
                    placeholder={isOurBank ? '12 digits' : '9 to 18 digits'}
                    value={drawerAccount}
                    onChange={(e) => setDrawerAccount(e.target.value.replace(/[^\d ]/g, '').slice(0, 22))}
                  />
                </WithKeyboard>
              </label>
              <label>
                <span className="block text-xs font-bold text-[#003366]">Cheque number:</span>
                <WithKeyboard numeric>
                  <input
                    className="bank-input w-full font-mono tracking-[0.2em]"
                    inputMode="numeric"
                    placeholder="000123"
                    maxLength={6}
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </WithKeyboard>
              </label>
            </div>

            <div className="font-mono text-[11px] tracking-[0.25em] text-slate-500 bg-white/60 px-2 py-1 overflow-x-auto whitespace-nowrap">
              ⑈{chequeNo.padEnd(6, '·')}⑈ {(drawerIfsc || '···········').padEnd(11, '·')}⑆{' '}
              {drawerAccount.replace(/\s/g, '') || '············'}⑈
            </div>

            <div className="flex justify-end">
              <button type="submit" className="bank-btn px-6 disabled:opacity-50" disabled={busy || frozen}>
                {busy ? 'Submitting...' : 'Deposit cheque'}
              </button>
            </div>
          </form>

          <ul className="text-[11px] text-slate-500 m-0 pl-4 space-y-0.5">
            <li>A cheque is valid for 3 months from its date. Post-dated cheques can be deposited on or after their date.</li>
            <li>
              {BANK_NAME} cheques (IFSC BNBK…) clear against the drawer&apos;s balance and bounce if it is short.
              Other banks&apos; cheques are cleared by our clearing desk.
            </li>
            <li>The same cheque cannot be deposited twice unless it was returned.</li>
          </ul>
        </div>
      </Panel>

      <Panel title="📋 My Cheques" tone="secondary">
        <div className="overflow-x-auto">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Clearing ref</th>
                <th>Deposited</th>
                <th>Cheque</th>
                <th>Drawn on</th>
                <th className="text-right">Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cheques === null ? (
                <LoadingRow colSpan={6} />
              ) : cheques.length === 0 ? (
                <EmptyRow colSpan={6} text="No cheques deposited yet." />
              ) : (
                cheques.map((c) => (
                  <tr key={c.cheque_id}>
                    <td className="font-mono">{c.cheque_id}</td>
                    <td className="whitespace-nowrap">{formatDateTime(c.created_at)}</td>
                    <td>
                      <span className="font-mono">{c.cheque_no}</span>
                      <div className="text-[10px] text-slate-500">dated {formatDate(c.cheque_date)}</div>
                    </td>
                    <td>
                      <span className="font-mono">{c.drawer_ifsc}</span>
                      <div className="text-[10px] text-slate-500 font-mono">{c.drawer_account_number}</div>
                    </td>
                    <td className="text-right font-mono font-bold">{formatINR(c.amount).slice(1)}</td>
                    <td>
                      <StatusBadge status={c.status} />
                      {c.return_reason_label && (
                        <div className="text-[10px] text-[#990000]">{c.return_reason_label}</div>
                      )}
                      {c.credit_txn_id && <div className="text-[10px] text-slate-500">txn #{c.credit_txn_id}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Razorpay Checkout (test mode)
// ---------------------------------------------------------------------------

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckout {
  open(): void;
  on(event: 'payment.failed', cb: (r: { error: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface OrderResponse {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  prefill: { name: string; email: string; contact: string };
}

function AddMoneyPanel({ overview, onDone }: { overview: CustomerOverview; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ enabled: boolean; limit: string; payments: OnlinePayment[] } | null>(null);
  const frozen = overview.account_status === 'FROZEN';

  const load = useCallback(async () => {
    const res = await apiGet<{ enabled: boolean; limit: string; payments: OnlinePayment[] }>('/customer/add-money');
    if (res.error !== undefined) setFlash({ kind: 'error', text: res.error });
    else setInfo(res.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const verify = async (r: RazorpaySuccess, paid: string) => {
    setBusy(true);
    const res = await apiPost<{ txnId: string }>('/customer/add-money/verify', {
      orderId: r.razorpay_order_id,
      paymentId: r.razorpay_payment_id,
      signature: r.razorpay_signature,
    });
    setBusy(false);
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
    } else {
      setFlash({
        kind: 'success',
        text: `${formatINR(paid)} added to your account. Reference #${res.data.txnId} (Razorpay ${r.razorpay_payment_id}).`,
      });
      setAmount('');
      onDone();
    }
    load();
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setFlash({ kind: 'error', text: 'Enter an amount greater than zero.' });
      return;
    }
    setFlash(null);
    setBusy(true);
    const [order, loaded] = await Promise.all([
      apiPost<OrderResponse>('/customer/add-money/order', { amount }),
      loadCheckout(),
    ]);
    setBusy(false);
    if (order.error !== undefined) {
      setFlash({ kind: 'error', text: order.error });
      return;
    }
    if (!loaded || !window.Razorpay) {
      setFlash({ kind: 'error', text: 'Could not load the Razorpay payment window. Check your internet connection.' });
      return;
    }
    const paid = amount;
    const checkout = new window.Razorpay({
      key: order.data.keyId,
      order_id: order.data.orderId,
      amount: order.data.amount,
      currency: order.data.currency,
      name: BANK_NAME,
      description: `Add money to A/c ${formatAccountNumber(overview.account_number)}`,
      prefill: order.data.prefill,
      theme: { color: '#004c8f' },
      handler: (r: RazorpaySuccess) => verify(r, paid),
      modal: {
        ondismiss: () => setFlash({ kind: 'info', text: 'Payment window closed. Your account was not credited.' }),
      },
    });
    checkout.on('payment.failed', (r) =>
      setFlash({ kind: 'error', text: `Payment failed: ${r.error.description ?? 'declined'}. You can try again.` })
    );
    checkout.open();
    load();
  };

  return (
    <div className="space-y-3">
      <Panel title="📲 Add Money from Another Bank">
        <div className="p-4 space-y-3">
          <FlashMessage flash={flash} onClose={() => setFlash(null)} />
          {info && !info.enabled && (
            <div className="p-2.5 border-2 border-[#f0c86e] bg-[#fff8e6] text-xs text-[#8a5a00]">
              Online payments are not set up on this server. Add Razorpay <b>test mode</b> keys as{' '}
              <span className="font-mono">RAZORPAY_KEY_ID</span> and <span className="font-mono">RAZORPAY_KEY_SECRET</span>{' '}
              in <span className="font-mono">apps/server/.env</span> and restart it.
            </div>
          )}
          <form onSubmit={pay} className="space-y-3" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <span className="sm:col-span-4 text-xs font-bold text-[#003366]">To account:</span>
              <span className="sm:col-span-8 font-mono text-xs">{formatAccountNumber(overview.account_number)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <label htmlFor="addAmount" className="sm:col-span-4 text-xs font-bold text-[#003366]">
                Amount:
              </label>
              <div className="sm:col-span-8">
                <AmountInput id="addAmount" value={amount} onChange={setAmount} />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 m-0">
              Up to {formatINR(info?.limit ?? 100000)} per payment. You pay from your account at another bank with UPI,
              card or net banking on the Razorpay screen; your balance is credited once the payment is verified.
            </p>
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="bank-btn px-6 disabled:opacity-50"
                disabled={busy || frozen || info?.enabled === false}
              >
                {busy ? 'Please wait...' : 'Proceed to pay'}
              </button>
            </div>
          </form>
          <div className="p-2 bg-[#eef3f8] border border-[#ccd9e8] text-[11px] text-slate-600">
            <b>Test mode:</b> no real money moves. On the Razorpay screen choose UPI and enter{' '}
            <span className="font-mono">success@razorpay</span> for a successful payment, or{' '}
            <span className="font-mono">failure@razorpay</span> to see a failed one.
          </div>
        </div>
      </Panel>

      <Panel title="📋 Recent Online Payments" tone="secondary">
        <div className="overflow-x-auto">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Razorpay order / payment</th>
                <th className="text-right">Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {info === null ? (
                <LoadingRow colSpan={4} />
              ) : info.payments.length === 0 ? (
                <EmptyRow colSpan={4} text="No online payments yet." />
              ) : (
                info.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{formatDateTime(p.created_at)}</td>
                    <td className="font-mono text-[10.5px]">
                      {p.gateway_order_id}
                      {p.gateway_payment_id && <div className="text-slate-500">{p.gateway_payment_id}</div>}
                    </td>
                    <td className="text-right font-mono font-bold">{formatINR(p.amount).slice(1)}</td>
                    <td>
                      <StatusBadge status={p.status === 'PAID' ? 'COMPLETED' : 'PENDING'} />
                      {p.txn_id ? (
                        <div className="text-[10px] text-slate-500">txn #{p.txn_id}</div>
                      ) : (
                        <div className="text-[10px] text-slate-500">not paid</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
