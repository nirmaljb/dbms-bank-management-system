'use client';

import React from 'react';
import { Panel, StatusBadge } from '../components/ui';
import { ACCOUNT_TYPE_LABELS, formatDate, formatDateTime, type CustomerOverview } from '../lib/api';

// Shown instead of the banking tabs while the account is a PENDING or
// REJECTED application.
export function ApplicationStatus({ overview }: { overview: CustomerOverview }) {
  const rejected = overview.account_status === 'REJECTED';

  const row = (label: string, value: React.ReactNode) => (
    <tr>
      <th className="text-left w-48">{label}</th>
      <td>{value}</td>
    </tr>
  );

  return (
    <div className="max-w-2xl space-y-3">
      <div
        className={`p-3 border-2 text-xs font-semibold ${
          rejected ? 'bg-[#fff0f0] border-[#cc0000] text-[#990000]' : 'bg-[#fff8e6] border-[#f0c86e] text-[#8a5a00]'
        }`}
      >
        {rejected ? (
          <>
            ❌ Your account application was rejected
            {overview.decided_at ? ` on ${formatDate(overview.decided_at)}` : ''}.
            {overview.decision_note && (
              <div className="mt-1 font-normal">Reason: {overview.decision_note}</div>
            )}
            <div className="mt-1 font-normal">Please visit your home branch for help.</div>
          </>
        ) : (
          <>
            ⏳ Your application is waiting for approval by a bank officer. Your account number will be issued as soon
            as it is approved. Check back here, or watch your notices.
          </>
        )}
      </div>

      <Panel title="📝 Account Application" right={<StatusBadge status={overview.account_status} />}>
        <table className="bank-table">
          <tbody>
            {row('Application no.', <span className="font-mono font-bold">#{overview.application_no}</span>)}
            {row('Applied on', formatDateTime(overview.applied_at))}
            {row('Account type', ACCOUNT_TYPE_LABELS[overview.account_type])}
            {row('Home branch', `${overview.branch_name}, ${overview.branch_city}`)}
            {row('Branch IFSC', <span className="font-mono">{overview.ifsc}</span>)}
            {row('Account number', <span className="text-slate-500">Issued on approval</span>)}
            {row('Name', overview.name)}
            {row('Mobile', overview.phone)}
            {row('Date of birth', formatDate(overview.date_of_birth))}
            {row('Address', overview.address)}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
