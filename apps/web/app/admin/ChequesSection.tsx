'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRefreshOn } from '../lib/use-live-refresh';
import { Panel, StatusBadge, FlashMessage, EmptyRow, LoadingRow, PromptDialog, type Flash } from '../components/ui';
import {
  apiGet,
  apiPost,
  toQuery,
  formatDate,
  formatDateTime,
  formatINR,
  CHEQUE_RETURN_REASONS,
  type AdminCheque,
  type ChequeReturnReason,
} from '../lib/api';

type Action = { kind: 'clear' | 'return'; cheque: AdminCheque } | null;

// The admin plays the clearing house. Clearing a cheque drawn on this bank
// checks the drawer's balance at that moment and returns it unpaid if short.
export function ChequesSection({ onChange, version = 0 }: { onChange: () => void; version?: number }) {
  const [status, setStatus] = useState('IN_CLEARING');
  const [rows, setRows] = useState<AdminCheque[] | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState<ChequeReturnReason>('FUNDS_INSUFFICIENT');

  const load = useCallback(async (s: string, quiet = false) => {
    if (!quiet) setRows(null);
    const res = await apiGet<{ cheques: AdminCheque[] }>(`/admin/cheques${toQuery({ status: s })}`);
    if (res.error !== undefined) {
      if (quiet) return;
      setFlash({ kind: 'error', text: res.error });
      setRows([]);
    } else {
      setRows(res.data.cheques);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  useRefreshOn(version, () => load(status, true));

  const run = async (a: NonNullable<Action>) => {
    const id = a.cheque.cheque_id;
    const res =
      a.kind === 'clear'
        ? await apiPost<{ status: string; creditTxnId: string | null }>(`/admin/cheques/${id}/clear`)
        : await apiPost<{ status: string; creditTxnId?: null }>(`/admin/cheques/${id}/return`, { reason });
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: `Cheque ref #${id}: ${res.error}` });
      return;
    }
    if (res.data.status === 'CLEARED') {
      setFlash({
        kind: 'success',
        text: `Cheque ref #${id} cleared. ${formatINR(a.cheque.amount)} credited to ${a.cheque.customer_name} (txn #${res.data.creditTxnId}).`,
      });
    } else if (a.kind === 'clear') {
      setFlash({
        kind: 'error',
        text: `Cheque ref #${id} bounced: the drawer's account could not pay it (insufficient funds or frozen). Both customers were notified.`,
      });
    } else {
      setFlash({ kind: 'info', text: `Cheque ref #${id} returned: ${CHEQUE_RETURN_REASONS[reason]}.` });
    }
    await load(status);
    onChange();
  };

  return (
    <Panel
      title="🧾 Cheque Clearing"
      tone="admin"
      right={
        <select
          className="bank-input text-[11px] text-slate-800"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Show cheques"
        >
          <option value="IN_CLEARING">In clearing</option>
          <option value="CLEARED">Cleared</option>
          <option value="BOUNCED">Bounced</option>
          <option value="">All</option>
        </select>
      }
    >
      <div className="p-2 pb-0">
        <FlashMessage flash={flash} onClose={() => setFlash(null)} />
      </div>
      <div className="overflow-x-auto">
        <table className="bank-table">
          <thead>
            <tr>
              <th>Ref #</th>
              <th>Deposited</th>
              <th>Payee / A/c</th>
              <th>Cheque</th>
              <th>Drawer</th>
              <th className="text-right">Amount (₹)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <LoadingRow colSpan={8} />
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={8} text="No cheques here." />
            ) : (
              rows.map((c) => {
                const short = c.is_in_house && Number(c.drawer_balance) < Number(c.amount);
                return (
                  <tr key={c.cheque_id}>
                    <td className="font-mono">{c.cheque_id}</td>
                    <td className="whitespace-nowrap">{formatDateTime(c.created_at)}</td>
                    <td>
                      <div className="font-bold">{c.customer_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {c.account_number}
                        {c.account_status === 'FROZEN' && ' ❄'}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono">{c.cheque_no}</span>
                      <div className="text-[10px] text-slate-500">dated {formatDate(c.cheque_date)}</div>
                    </td>
                    <td>
                      {c.is_in_house ? (
                        <>
                          <div className="font-bold">{c.drawer_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {c.drawer_account_number}
                            {c.drawer_account_status === 'FROZEN' && ' ❄'}
                          </div>
                          {c.status === 'IN_CLEARING' && (
                            <div className={`text-[10px] font-bold ${short ? 'text-[#a30000]' : 'text-[#006600]'}`}>
                              balance {formatINR(c.drawer_balance)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="font-bold">Other bank ({c.drawer_bank_code})</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {c.drawer_ifsc} · {c.drawer_account_number}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="text-right font-mono font-bold">{formatINR(c.amount).slice(1)}</td>
                    <td>
                      <StatusBadge status={c.status} />
                      {c.return_reason_label && (
                        <div className="text-[10px] text-[#990000]">{c.return_reason_label}</div>
                      )}
                      {c.decided_by_name && <div className="text-[10px] text-slate-500">by {c.decided_by_name}</div>}
                    </td>
                    <td className="whitespace-nowrap space-x-1">
                      {c.status === 'IN_CLEARING' && (
                        <>
                          <button type="button" className="bank-btn" onClick={() => setAction({ kind: 'clear', cheque: c })}>
                            Clear
                          </button>
                          <button
                            type="button"
                            className="bank-btn-danger"
                            onClick={() => {
                              setReason(short ? 'FUNDS_INSUFFICIENT' : 'SIGNATURE_MISMATCH');
                              setAction({ kind: 'return', cheque: c });
                            }}
                          >
                            Return
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PromptDialog
        isOpen={!!action}
        title={action?.kind === 'clear' ? 'Clear Cheque' : 'Return Cheque Unpaid'}
        message={
          !action
            ? ''
            : action.kind === 'clear'
              ? action.cheque.is_in_house
                ? `Clear cheque no. ${action.cheque.cheque_no} for ${formatINR(action.cheque.amount)}?\n${action.cheque.drawer_name}'s account is debited and ${action.cheque.customer_name}'s is credited. If the drawer is short of funds right now, the cheque bounces instead.`
                : `Clear cheque no. ${action.cheque.cheque_no} for ${formatINR(action.cheque.amount)} drawn on ${action.cheque.drawer_ifsc}?\n${action.cheque.customer_name}'s account is credited.`
              : `Return cheque no. ${action.cheque.cheque_no} for ${formatINR(action.cheque.amount)} unpaid? ${action.cheque.customer_name}${action.cheque.is_in_house ? ` and ${action.cheque.drawer_name}` : ''} will get a notice.`
        }
        confirmText={action?.kind === 'clear' ? 'Clear' : 'Return'}
        danger={action?.kind === 'return'}
        onConfirm={() => {
          const a = action;
          setAction(null);
          if (a) run(a);
        }}
        onClose={() => setAction(null)}
      >
        {action?.kind === 'return' && (
          <label className="block">
            <span className="block font-bold text-[#003366] mb-1">Return reason</span>
            <select
              className="bank-input w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value as ChequeReturnReason)}
            >
              {(Object.keys(CHEQUE_RETURN_REASONS) as ChequeReturnReason[]).map((r) => (
                <option key={r} value={r}>
                  {CHEQUE_RETURN_REASONS[r]}
                </option>
              ))}
            </select>
          </label>
        )}
      </PromptDialog>
    </Panel>
  );
}
