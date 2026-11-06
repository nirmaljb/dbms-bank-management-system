'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Panel, StatusBadge, FlashMessage, EmptyRow, LoadingRow, PromptDialog, type Flash } from '../components/ui';
import {
  apiGet,
  apiPost,
  formatAccountNumber,
  formatDate,
  formatDateTime,
  toQuery,
  ACCOUNT_TYPE_LABELS,
  type CustomerOverview,
} from '../lib/api';

type Action = { kind: 'approve' | 'reject'; app: CustomerOverview } | null;

// Age in whole years, for the reviewer.
function ageOf(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age -= 1;
  return age;
}

export function ApplicationsSection({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState('PENDING');
  const [apps, setApps] = useState<CustomerOverview[] | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [action, setAction] = useState<Action>(null);

  const load = useCallback(async (s: string) => {
    setApps(null);
    const res = await apiGet<{ applications: CustomerOverview[] }>(`/admin/applications${toQuery({ status: s })}`);
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      setApps([]);
    } else {
      setApps(res.data.applications);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  const decide = async (a: NonNullable<Action>, reason?: string) => {
    const res = await apiPost<{ accountNumber?: string }>(
      `/admin/applications/${a.app.account_id}/${a.kind}`,
      a.kind === 'reject' ? { reason } : {}
    );
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      return;
    }
    setFlash(
      a.kind === 'approve'
        ? {
            kind: 'success',
            text: `Application #${a.app.application_no} approved. ${a.app.name} now has account ${formatAccountNumber(
              res.data.accountNumber
            )} at ${a.app.branch_name} (IFSC ${a.app.ifsc}).`,
          }
        : { kind: 'info', text: `Application #${a.app.application_no} (${a.app.name}) rejected.` }
    );
    await load(status);
    onChange();
  };

  return (
    <Panel
      title="📝 Account Applications"
      tone="admin"
      right={<span className="text-[10.5px]">{apps?.length ?? 0} shown</span>}
    >
      <div className="p-2.5 bg-[#f0f4f8] border-b border-[#ccd9e8] text-[11px]">
        <FlashMessage flash={flash} onClose={() => setFlash(null)} />
        <label className="font-bold text-[#003366] mr-2" htmlFor="appStatus">
          Show:
        </label>
        <select id="appStatus" className="bank-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="ACTIVE">Approved (active)</option>
          <option value="">All</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="bank-table">
          <thead>
            <tr>
              <th>App #</th>
              <th>Applicant</th>
              <th>KYC details</th>
              <th>Branch / IFSC</th>
              <th>Type</th>
              <th>Applied</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {apps === null ? (
              <LoadingRow colSpan={8} />
            ) : apps.length === 0 ? (
              <EmptyRow colSpan={8} text={status === 'PENDING' ? 'No applications waiting.' : 'Nothing to show.'} />
            ) : (
              apps.map((a) => (
                <tr key={a.account_id}>
                  <td className="font-mono">#{a.application_no}</td>
                  <td>
                    <div className="font-bold">{a.name}</div>
                    <div className="text-[10px] text-slate-500">{a.email}</div>
                  </td>
                  <td className="text-[10.5px]">
                    <div>📱 {a.phone}</div>
                    <div>
                      🎂 {formatDate(a.date_of_birth)} ({ageOf(a.date_of_birth)} yrs)
                    </div>
                    <div className="max-w-[220px]">🏠 {a.address}</div>
                  </td>
                  <td>
                    <div>
                      {a.branch_name}, {a.branch_city}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">{a.ifsc}</div>
                  </td>
                  <td>{ACCOUNT_TYPE_LABELS[a.account_type]}</td>
                  <td>{formatDateTime(a.applied_at)}</td>
                  <td>
                    <StatusBadge status={a.account_status} />
                    {a.account_number && (
                      <div className="font-mono text-[10px]">{formatAccountNumber(a.account_number)}</div>
                    )}
                    {a.decision_note && <div className="text-[10px] text-slate-500">{a.decision_note}</div>}
                  </td>
                  <td className="whitespace-nowrap">
                    {a.account_status === 'PENDING' ? (
                      <div className="flex gap-1">
                        <button type="button" className="bank-btn" onClick={() => setAction({ kind: 'approve', app: a })}>
                          Approve
                        </button>
                        <button
                          type="button"
                          className="bank-btn-danger"
                          onClick={() => setAction({ kind: 'reject', app: a })}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        {a.decided_by_name ? `by ${a.decided_by_name}` : '—'}
                      </span>
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
        title={action?.kind === 'approve' ? 'Approve Application' : 'Reject Application'}
        message={
          action?.kind === 'approve'
            ? `Open a ${ACCOUNT_TYPE_LABELS[action.app.account_type].toLowerCase()} account for ${action.app.name} at ${action.app.branch_name}?\nA new account number will be generated for branch ${action.app.branch_code}.`
            : `Reject application #${action?.app.application_no} from ${action?.app.name}?`
        }
        inputLabel={action?.kind === 'reject' ? 'Reason (shown to the applicant)' : undefined}
        confirmText={action?.kind === 'approve' ? 'Approve' : 'Reject'}
        danger={action?.kind === 'reject'}
        onConfirm={(reason?: string) => {
          const a = action;
          setAction(null);
          if (a) decide(a, reason);
        }}
        onClose={() => setAction(null)}
      />
    </Panel>
  );
}
