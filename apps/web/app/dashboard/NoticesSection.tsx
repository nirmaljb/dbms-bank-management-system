'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Panel, FlashMessage } from '../components/ui';
import { apiGet, apiPost, formatDateTime, type CustomerNotice } from '../lib/api';

export function NoticesSection({ onRead }: { onRead: () => void }) {
  const [notices, setNotices] = useState<CustomerNotice[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiGet<{ notices: CustomerNotice[]; unreadCount: number }>('/customer/notices');
    if (res.error !== undefined) {
      setError(res.error);
      setNotices([]);
      return;
    }
    setNotices(res.data.notices);
    setUnread(res.data.unreadCount);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (n: CustomerNotice) => {
    setOpenId(openId === n.id ? null : n.id);
    if (!n.read_at) {
      const res = await apiPost(`/customer/notices/${n.id}/read`);
      if (!res.error) {
        await load();
        onRead();
      }
    }
  };

  return (
    <Panel title="📨 Notices from the Bank" right={<span className="text-[10.5px]">{unread} unread</span>}>
      {error && (
        <div className="p-2">
          <FlashMessage flash={{ kind: 'error', text: error }} />
        </div>
      )}
      {notices === null ? (
        <div className="p-4 text-center text-slate-500">Loading...</div>
      ) : notices.length === 0 ? (
        <div className="p-4 text-center text-slate-500 italic">Your inbox is empty.</div>
      ) : (
        <ul className="divide-y divide-[#d6e2ef]">
          {notices.map((n) => (
            <li key={n.id} className={n.read_at ? 'bg-white' : 'bg-[#fffbea]'}>
              <button
                type="button"
                onClick={() => open(n)}
                className="w-full text-left px-3 py-2 flex items-center gap-2 bg-transparent border-0 cursor-pointer hover:bg-[#eef5fc]"
              >
                <span>{n.read_at ? '📭' : '📬'}</span>
                <span className={`flex-1 text-[11.5px] ${n.read_at ? 'text-slate-700' : 'font-bold text-[#003366]'}`}>
                  {n.title}
                </span>
                <span className="text-[10px] text-slate-500">
                  {n.is_broadcast ? 'All customers' : 'Personal'} · {formatDateTime(n.created_at)}
                </span>
              </button>
              {openId === n.id && (
                <div className="px-9 pb-3 text-[11.5px] text-slate-800 whitespace-pre-line">{n.body}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
