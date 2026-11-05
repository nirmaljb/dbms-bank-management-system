'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Panel,
  StatusBadge,
  FlashMessage,
  EmptyRow,
  LoadingRow,
  PromptDialog,
  sanitizeAmount,
  type Flash,
} from '../components/ui';
import { apiGet, apiPost, formatDate, formatINR, type LoanStatus, type LoanSummary } from '../lib/api';

const STATUSES: LoanStatus[] = ['PENDING', 'ACTIVE', 'DEFAULTED', 'CLOSED', 'REJECTED'];

export function LoansSection({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState('');
  const [loans, setLoans] = useState<LoanSummary[] | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<LoanSummary | null>(null);
  const [confirmCycle, setConfirmCycle] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (s: string) => {
    setLoans(null);
    const res = await apiGet<{ loans: LoanSummary[] }>(`/admin/loans${s ? `?status=${s}` : ''}`);
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      setLoans([]);
    } else {
      setLoans(res.data.loans);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  const afterAction = async (text: string) => {
    setFlash({ kind: 'success', text });
    await load(status);
    onChange();
  };

  const sanction = async (l: LoanSummary) => {
    const override = rates[l.loan_id]?.trim();
    setBusy(true);
    const res = await apiPost<{ disbursalTxnId: string }>(`/admin/loans/${l.loan_id}/sanction`, {
      rate: override || null,
    });
    setBusy(false);
    if (res.error !== undefined) return setFlash({ kind: 'error', text: res.error });
    await afterAction(
      `Loan for ${l.customer_name} sanctioned at ${override || l.suggested_rate}% p.a. ${formatINR(l.amount)} credited (ref #${res.data.disbursalTxnId}).`
    );
  };

  const reject = async (l: LoanSummary, reason: string) => {
    const res = await apiPost(`/admin/loans/${l.loan_id}/reject`, { reason });
    if (res.error !== undefined) return setFlash({ kind: 'error', text: res.error });
    await afterAction(`Loan request from ${l.customer_name} rejected.`);
  };

  const runCycle = async () => {
    setBusy(true);
    const res = await apiPost<{
      loansProcessed: number;
      duesCreated: number;
      duesMissed: number;
      loansDefaulted: number;
    }>('/admin/monthly-cycle');
    setBusy(false);
    if (res.error !== undefined) return setFlash({ kind: 'error', text: res.error });
    const r = res.data;
    await afterAction(
      `Monthly cycle complete: ${r.loansProcessed} active loan(s) processed, ${r.duesCreated} new due(s) raised, ${r.duesMissed} due(s) marked missed, ${r.loansDefaulted} loan(s) defaulted.`
    );
  };

  return (
    <div className="space-y-3">
      <Panel title="🗓️ Monthly Loan Cycle" tone="admin">
        <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-700">
          <div className="max-w-2xl">
            Simulates one month passing for every <strong>ACTIVE</strong> loan by calling{' '}
            <span className="font-mono">sp_run_monthly_cycle</span>. An unpaid due is marked MISSED and carried
            forward with a 2% late fee. Three misses in a row default the loan. Otherwise a new due of outstanding ×
            rate ÷ 12 is raised.
          </div>
          <button
            type="button"
            className="bank-btn px-5 py-2 disabled:opacity-50"
            disabled={busy}
            onClick={() => setConfirmCycle(true)}
          >
            ▶ Run Monthly Cycle
          </button>
        </div>
      </Panel>

      <FlashMessage flash={flash} onClose={() => setFlash(null)} />

      <Panel
        title="🤝 Loans"
        tone="admin"
        right={
          <select
            className="bank-input text-[11px] text-slate-900"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        }
      >
        <div className="overflow-x-auto">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Requested</th>
                <th className="text-right">Amount</th>
                <th>Credit score</th>
                <th>Rate</th>
                <th>Repayment</th>
                <th>Status</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {loans === null ? (
                <LoadingRow colSpan={8} />
              ) : loans.length === 0 ? (
                <EmptyRow colSpan={8} text="No loans in this view." />
              ) : (
                loans.map((l) => (
                  <tr key={l.loan_id} className={l.status === 'PENDING' ? 'bg-[#fffbea]' : ''}>
                    <td>
                      <div className="font-bold">{l.customer_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {l.account_number}
                        {l.account_status === 'FROZEN' && ' ❄ frozen'}
                      </div>
                    </td>
                    <td>
                      {formatDate(l.requested_at)}
                      <div className="text-[10px] text-slate-500 max-w-[160px] truncate" title={l.purpose}>
                        {l.purpose}
                      </div>
                    </td>
                    <td className="text-right font-mono">{formatINR(l.amount)}</td>
                    <td className="font-mono">
                      {l.status === 'PENDING' ? (
                        <strong>{l.current_credit_score}</strong>
                      ) : (
                        <>
                          {l.credit_score_at_decision ?? '—'}
                          <div className="text-[10px] text-slate-500">at decision</div>
                        </>
                      )}
                    </td>
                    <td className="font-mono">
                      {l.status === 'PENDING' ? (
                        <div className="flex items-center gap-1">
                          <input
                            className="bank-input w-16 font-mono"
                            placeholder={Number(l.suggested_rate).toFixed(2)}
                            value={rates[l.loan_id] ?? ''}
                            onChange={(e) =>
                              setRates((r) => ({ ...r, [l.loan_id]: sanitizeAmount(e.target.value) }))
                            }
                            title="Leave blank to use the suggested rate"
                          />
                          %
                        </div>
                      ) : l.interest_rate ? (
                        `${l.interest_rate}%`
                      ) : (
                        '—'
                      )}
                      {l.status === 'PENDING' && (
                        <div className="text-[10px] text-slate-500">suggested {l.suggested_rate}%</div>
                      )}
                    </td>
                    <td className="text-[10.5px]">
                      {l.status === 'ACTIVE' || l.status === 'DEFAULTED' || l.status === 'CLOSED' ? (
                        <>
                          <div>
                            Outstanding <span className="font-mono">{formatINR(l.outstanding_principal)}</span>
                          </div>
                          {l.current_due_amount && (
                            <div className="text-[#8a5a00]">
                              Due #{l.current_due_cycle}: <span className="font-mono">{formatINR(l.current_due_amount)}</span>
                            </div>
                          )}
                          <div className="text-slate-500">
                            Paid {l.dues_paid} · missed {l.dues_missed}
                            {l.consecutive_misses > 0 && ` (${l.consecutive_misses} in a row)`}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="whitespace-nowrap space-x-1">
                      {l.status === 'PENDING' ? (
                        <>
                          <button
                            type="button"
                            className="bank-btn disabled:opacity-50"
                            disabled={busy}
                            onClick={() => sanction(l)}
                          >
                            Sanction
                          </button>
                          <button type="button" className="bank-btn-danger" onClick={() => setRejecting(l)}>
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {formatDate(l.decided_at)}
                          {l.decision_note && <div className="max-w-[140px] truncate">“{l.decision_note}”</div>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <PromptDialog
        isOpen={!!rejecting}
        title="Reject Loan Request"
        message={`Reject the ${formatINR(rejecting?.amount)} loan request from ${rejecting?.customer_name}?`}
        inputLabel="Reason shown to the customer (optional)"
        confirmText="Reject"
        danger
        onConfirm={(reason) => {
          const l = rejecting;
          setRejecting(null);
          if (l) reject(l, reason);
        }}
        onClose={() => setRejecting(null)}
      />

      <PromptDialog
        isOpen={confirmCycle}
        title="Run Monthly Cycle"
        message="Simulate one month passing for every active loan? This raises new dues and marks unpaid ones as missed. It cannot be undone."
        confirmText="Run Cycle"
        onConfirm={() => {
          setConfirmCycle(false);
          runCycle();
        }}
        onClose={() => setConfirmCycle(false)}
      />
    </div>
  );
}
