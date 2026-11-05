'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Panel, FlashMessage, EmptyRow, LoadingRow, type Flash } from '../components/ui';
import { apiGet, apiPost, formatDateTime, type AdminNotice, type CustomerOverview } from '../lib/api';

export function NoticesSection() {
  const [notices, setNotices] = useState<AdminNotice[] | null>(null);
  const [customers, setCustomers] = useState<CustomerOverview[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await apiGet<{ notices: AdminNotice[] }>('/admin/notices');
    if (res.error !== undefined) {
      setFlash({ kind: 'error', text: res.error });
      setNotices([]);
    } else {
      setNotices(res.data.notices);
    }
  }, []);

  useEffect(() => {
    load();
    apiGet<{ customers: CustomerOverview[] }>('/admin/customers').then((res) => setCustomers(res.data?.customers ?? []));
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await apiPost('/admin/notices', { title, body, recipientUserId: recipient || null });
    setBusy(false);
    if (res.error !== undefined) return setFlash({ kind: 'error', text: res.error });
    const who = recipient ? customers.find((c) => c.user_id === recipient)?.name : 'all customers';
    setFlash({ kind: 'success', text: `Notice sent to ${who}.` });
    setTitle('');
    setBody('');
    setRecipient('');
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <div className="lg:col-span-5">
        <Panel title="✉️ Compose Notice" tone="admin">
          <form onSubmit={send} className="p-3 space-y-3" noValidate>
            <FlashMessage flash={flash} onClose={() => setFlash(null)} />
            <label className="block">
              <span className="block text-[11px] font-bold text-[#003366] mb-1">To</span>
              <select className="bank-input w-full" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                <option value="">📢 All customers (broadcast)</option>
                {customers.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.name} – {c.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-[#003366] mb-1">Title *</span>
              <input
                className="bank-input w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-[#003366] mb-1">Message *</span>
              <textarea
                className="bank-input w-full min-h-[120px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
              />
            </label>
            <div className="flex justify-end">
              <button type="submit" className="bank-btn px-6 disabled:opacity-50" disabled={busy}>
                Send Notice »
              </button>
            </div>
          </form>
        </Panel>
      </div>

      <div className="lg:col-span-7">
        <Panel title="📤 Sent Notices" tone="admin">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Sent</th>
                <th>To</th>
                <th>Notice</th>
                <th className="text-right">Read by</th>
              </tr>
            </thead>
            <tbody>
              {notices === null ? (
                <LoadingRow colSpan={4} />
              ) : notices.length === 0 ? (
                <EmptyRow colSpan={4} text="No notices sent yet." />
              ) : (
                notices.map((n) => (
                  <tr key={n.id}>
                    <td className="whitespace-nowrap">{formatDateTime(n.created_at)}</td>
                    <td>{n.recipient_user_id ? n.recipient_name : <strong>All customers</strong>}</td>
                    <td>
                      <div className="font-bold">{n.title}</div>
                      <div className="text-[10.5px] text-slate-600 whitespace-pre-line line-clamp-3">{n.body}</div>
                    </td>
                    <td className="text-right font-mono">{n.read_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
