'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Panel,
  StatusBadge,
  FlashMessage,
  AmountInput,
  EmptyRow,
  LoadingRow,
  PromptDialog,
  type Flash,
} from '../components/ui';
import {
  apiGet,
  apiPost,
  formatDate,
  formatINR,
  type CustomerOverview,
  type LoanDue,
  type LoanSummary,
} from '../lib/api';
import { WithKeyboard } from '../components/WithKeyboard';

export function LoansSection({ overview, onDone }: { overview: CustomerOverview; onDone: () => void }) {
  const [loans, setLoans] = useState<LoanSummary[] | null>(null);
  const [dues, setDues] = useState<LoanDue[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);

  const [reqAmount, setReqAmount] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [confirmPay, setConfirmPay] = useState(false);

  const load = useCallback(async () => {
    const res = await apiGet<{ loans: LoanSummary[] }>('/customer/loans');
    const list = res.data?.loans ?? [];
    setLoans(list);
    if (res.error !== undefined) setFlash({ kind: 'error', text: res.error });
    setSelectedId((prev) => prev ?? list.find((l) => l.status === 'PENDING' || l.status === 'ACTIVE')?.loan_id ?? list[0]?.loan_id ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDues([]);
      return;
    }
    setDues(null);
    apiGet<{ dues: LoanDue[] }>(`/customer/loans/${selectedId}/dues`).then((res) => setDues(res.data?.dues ?? []));
  }, [selectedId, loans]);

  const openLoan = loans?.find((l) => l.status === 'PENDING' || l.status === 'ACTIVE') ?? null;
  const selected = loans?.find((l) => l.loan_id === selectedId) ?? null;

  const after = async (text: string) => {
    setFlash({ kind: 'success', text });
    await load();
    onDone();
  };

  const requestLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await apiPost<{ loanId: string }>('/customer/loans', { amount: reqAmount, purpose: reqPurpose });
    setBusy(false);
    if (res.error !== undefined) return setFlash({ kind: 'error', text: res.error });
    setReqAmount('');
    setReqPurpose('');
    setSelectedId(res.data.loanId);
    await after('Loan request submitted. A bank officer will review it and set your interest rate.');
  };

  const payInterest = async () => {
    if (!openLoan) return;
    setBusy(true);
    const res = await apiPost<{ txnId: string }>(`/customer/loans/${openLoan.loan_id}/pay-interest`);
    setBusy(false);
    if (res.error !== undefined) return setFlash({ kind: 'error', text: res.error });
    await after(`Paid ${formatINR(openLoan.current_due_amount)}. Reference #${res.data.txnId}.`);
  };

  const repay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openLoan) return;
    setBusy(true);
    const res = await apiPost<{ txnId: string }>(`/customer/loans/${openLoan.loan_id}/repay`, {
      amount: repayAmount,
    });
    setBusy(false);
    if (res.error !== undefined) return setFlash({ kind: 'error', text: res.error });
    const amt = repayAmount;
    setRepayAmount('');
    await after(`Repaid ${formatINR(amt)} of principal. Reference #${res.data.txnId}.`);
  };

  if (loans === null) {
    return <div className="p-6 text-center text-slate-600">Loading loans...</div>;
  }

  const frozen = overview.account_status === 'FROZEN';

  return (
    <div className="space-y-3">
      <FlashMessage flash={flash} onClose={() => setFlash(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7 space-y-3">
          {openLoan?.status === 'ACTIVE' && (
            <Panel title="🤝 Active Loan" right={<StatusBadge status="ACTIVE" />}>
              <table className="bank-table">
                <tbody>
                  <tr>
                    <th className="w-1/2">Sanctioned amount</th>
                    <td className="font-mono">{formatINR(openLoan.amount)}</td>
                  </tr>
                  <tr>
                    <th>Interest rate</th>
                    <td className="font-mono">{openLoan.interest_rate}% p.a.</td>
                  </tr>
                  <tr>
                    <th>Outstanding principal</th>
                    <td className="font-mono font-bold text-[#a30000]">{formatINR(openLoan.outstanding_principal)}</td>
                  </tr>
                  <tr>
                    <th>Consecutive missed dues</th>
                    <td className={openLoan.consecutive_misses ? 'font-bold text-[#a30000]' : ''}>
                      {openLoan.consecutive_misses} of 3
                    </td>
                  </tr>
                  <tr>
                    <th>Paid so far</th>
                    <td className="font-mono text-[11px]">
                      Interest {formatINR(openLoan.total_interest_paid)} · Principal{' '}
                      {formatINR(openLoan.total_principal_repaid)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 border-t border-[#ccd9e8] bg-[#fffdf0]">
                {openLoan.current_due_id ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px]">
                      <div className="font-bold text-[#8a5a00]">
                        Month {openLoan.current_due_cycle} due: {formatINR(openLoan.current_due_amount)}
                      </div>
                      <div className="text-slate-600">
                        Interest {formatINR(openLoan.current_due_interest)}
                        {Number(openLoan.current_due_carried_forward) > 0 &&
                          ` + carried forward ${formatINR(openLoan.current_due_carried_forward)} + late fee ${formatINR(openLoan.current_due_late_fee)}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="bank-btn px-5 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => setConfirmPay(true)}
                    >
                      Pay Due »
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600">
                    Nothing is due right now. A new due is raised each time the bank runs its monthly cycle.
                  </div>
                )}
              </div>

              <form onSubmit={repay} className="p-3 border-t border-[#ccd9e8] flex flex-wrap items-end gap-2">
                <label className="flex-1 min-w-[180px]">
                  <span className="block text-[11px] font-bold text-[#003366] mb-1">Repay principal (any amount)</span>
                  <AmountInput value={repayAmount} onChange={setRepayAmount} />
                </label>
                <button
                  type="button"
                  className="bank-btn-secondary"
                  onClick={() => setRepayAmount(openLoan.outstanding_principal)}
                >
                  Full
                </button>
                <button type="submit" className="bank-btn disabled:opacity-50" disabled={busy || !repayAmount}>
                  Repay »
                </button>
              </form>
            </Panel>
          )}

          {openLoan?.status === 'PENDING' && (
            <Panel title="⏳ Loan Request Under Review" right={<StatusBadge status="PENDING" />}>
              <div className="p-3 text-[11px] text-slate-700 space-y-1">
                <div>
                  Requested <strong className="font-mono">{formatINR(openLoan.amount)}</strong> for “
                  {openLoan.purpose}” on {formatDate(openLoan.requested_at)}.
                </div>
                <div>
                  A bank officer will sanction it at the rate for your credit score ({overview.credit_score}), or
                  reject it. You can only have one pending or active loan at a time.
                </div>
              </div>
            </Panel>
          )}

          {!openLoan && (
            <Panel title="📝 Request a Personal Loan">
              <form onSubmit={requestLoan} className="p-4 space-y-3" noValidate>
                {frozen && (
                  <FlashMessage flash={{ kind: 'error', text: 'Your account is frozen. Loan requests are blocked.' }} />
                )}
                <label className="block">
                  <span className="block text-[11px] font-bold text-[#003366] mb-1">Loan amount *</span>
                  <AmountInput value={reqAmount} onChange={setReqAmount} />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold text-[#003366] mb-1">Purpose *</span>
                  <WithKeyboard>
                    <input
                      className="bank-input w-full"
                      value={reqPurpose}
                      onChange={(e) => setReqPurpose(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. Home repairs, education, medical"
                    />
                  </WithKeyboard>
                </label>
                <div className="flex justify-end">
                  <button type="submit" className="bank-btn px-6 disabled:opacity-50" disabled={busy || frozen}>
                    Submit Request »
                  </button>
                </div>
              </form>
            </Panel>
          )}

          <Panel title="📅 Monthly Dues" tone="secondary">
            <table className="bank-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="text-right">Interest</th>
                  <th className="text-right">Carried fwd</th>
                  <th className="text-right">Late fee</th>
                  <th className="text-right">Total due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dues === null ? (
                  <LoadingRow colSpan={6} />
                ) : dues.length === 0 ? (
                  <EmptyRow colSpan={6} text="No dues raised for this loan yet." />
                ) : (
                  dues.map((d) => (
                    <tr key={d.id}>
                      <td>#{d.cycle_no}</td>
                      <td className="text-right font-mono">{formatINR(d.interest_amount)}</td>
                      <td className="text-right font-mono">{formatINR(d.carried_forward)}</td>
                      <td className="text-right font-mono">{formatINR(d.late_fee)}</td>
                      <td className="text-right font-mono font-bold">{formatINR(d.amount_due)}</td>
                      <td>
                        <StatusBadge status={d.status} />
                        {d.paid_at && <div className="text-[10px] text-slate-500">{formatDate(d.paid_at)}</div>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="lg:col-span-5 space-y-3">
          <Panel title="📚 Loan History" tone="secondary">
            <table className="bank-table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th className="text-right">Amount</th>
                  <th>Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.length === 0 ? (
                  <EmptyRow colSpan={4} text="No loans yet." />
                ) : (
                  loans.map((l) => (
                    <tr
                      key={l.loan_id}
                      onClick={() => setSelectedId(l.loan_id)}
                      className={`cursor-pointer ${l.loan_id === selectedId ? 'outline outline-2 outline-[#f8991d]' : ''}`}
                    >
                      <td>
                        {formatDate(l.requested_at)}
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{l.purpose}</div>
                      </td>
                      <td className="text-right font-mono">{formatINR(l.amount)}</td>
                      <td>{l.interest_rate ? `${l.interest_rate}%` : '—'}</td>
                      <td>
                        <StatusBadge status={l.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {selected?.decision_note && (
              <div className="p-2 text-[10.5px] text-slate-600 border-t border-[#ccd9e8]">
                Bank note: {selected.decision_note}
              </div>
            )}
          </Panel>

          <div className="bank-security-notice space-y-1">
            <div>
              <strong>How loans work</strong>
            </div>
            <div>• Each month the bank raises a due of outstanding × rate ÷ 12.</div>
            <div>• Pay it in full before the next cycle. An unpaid due carries forward with a 2% late fee.</div>
            <div>• Three missed dues in a row and the loan defaults (−150 credit score).</div>
            <div>• Repay principal any time. The loan closes when principal and dues are both zero.</div>
          </div>
        </div>
      </div>

      <PromptDialog
        isOpen={confirmPay}
        title="Pay Loan Due"
        message={`Pay ${formatINR(openLoan?.current_due_amount)} from account ${overview.account_number}?`}
        confirmText="Pay Now"
        onConfirm={() => {
          setConfirmPay(false);
          payInterest();
        }}
        onClose={() => setConfirmPay(false)}
      />
    </div>
  );
}
