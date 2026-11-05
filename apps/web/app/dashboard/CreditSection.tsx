'use client';

import React, { useEffect, useState } from 'react';
import { Panel, FlashMessage } from '../components/ui';
import { apiGet, type CreditScore } from '../lib/api';

const BANDS = [
  { min: 750, max: 900, rate: '9.00%', label: 'Excellent', color: '#006600' },
  { min: 650, max: 749, rate: '11.00%', label: 'Fair', color: '#b07800' },
  { min: 300, max: 649, rate: '14.00%', label: 'Poor', color: '#a30000' },
];

export function CreditSection() {
  const [data, setData] = useState<CreditScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CreditScore>('/customer/credit-score').then((res) =>
      res.error !== undefined ? setError(res.error) : setData(res.data)
    );
  }, []);

  if (error) return <FlashMessage flash={{ kind: 'error', text: error }} />;
  if (!data) return <div className="p-6 text-center text-slate-600">Calculating your score...</div>;

  const band = BANDS.find((b) => data.score >= b.min) ?? BANDS[2]!;
  const pct = ((data.score - 300) / 600) * 100;
  const rawTotal = data.breakdown.reduce((s, r) => s + r.points, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <div className="lg:col-span-5 space-y-3">
        <Panel title="📊 Your Credit Score">
          <div className="p-4 text-center">
            <div className="text-5xl font-extrabold font-mono" style={{ color: band.color }}>
              {data.score}
            </div>
            <div className="text-xs font-bold mt-1" style={{ color: band.color }}>
              {band.label}
            </div>
            <div className="mt-3 h-3 border border-[#7f9db9] relative bg-gradient-to-r from-[#a30000] via-[#f8991d] to-[#006600]">
              <div
                className="absolute -top-1 w-1 h-5 bg-black"
                style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 2px)` }}
                title={`${data.score}`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
              <span>300</span>
              <span>650</span>
              <span>750</span>
              <span>900</span>
            </div>
            <div className="mt-3 text-[11px] text-slate-700">
              Suggested loan rate for you: <strong className="font-mono">{Number(data.suggestedRate).toFixed(2)}% p.a.</strong>
            </div>
          </div>
        </Panel>

        <Panel title="📈 Score Bands" tone="secondary">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Band</th>
                <th className="text-right">Loan rate</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b) => (
                <tr key={b.label} className={b === band ? 'font-bold' : ''}>
                  <td>
                    {b.min} – {b.max}
                  </td>
                  <td style={{ color: b.color }}>{b.label}</td>
                  <td className="text-right font-mono">{b.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="lg:col-span-7">
        <Panel title="🧮 How Your Score Is Calculated" tone="secondary">
          <table className="bank-table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Rule</th>
                <th className="text-right">Count</th>
                <th className="text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((r) => (
                <tr key={r.component}>
                  <td>{r.component}</td>
                  <td className="text-[10.5px] text-slate-600">{RULES[r.component] ?? ''}</td>
                  <td className="text-right font-mono">{r.occurrences ?? '—'}</td>
                  <td
                    className={`text-right font-mono font-bold ${
                      r.points > 0 && r.component !== 'Base score'
                        ? 'text-[#006600]'
                        : r.points < 0
                          ? 'text-[#a30000]'
                          : ''
                    }`}
                  >
                    {r.points > 0 && r.component !== 'Base score' ? '+' : ''}
                    {r.points}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#eef3f8] font-bold">
                <td colSpan={3} className="text-right">
                  Total {rawTotal !== data.score && `(${rawTotal}, clamped to 300 – 900)`}
                </td>
                <td className="text-right font-mono">{data.score}</td>
              </tr>
            </tfoot>
          </table>
          <div className="p-2 text-[10px] text-slate-500 border-t border-[#ccd9e8]">
            Computed live by <span className="font-mono">fn_credit_score()</span> from your loan and repayment history.
          </div>
        </Panel>
      </div>
    </div>
  );
}

const RULES: Record<string, string> = {
  'Base score': 'Everyone starts at 650',
  'On-time interest payments': '+15 each, up to +150',
  'Missed dues': '−40 each',
  'Loans closed': '+50 each',
  'Loans defaulted': '−150 each',
  'Account age (months)': '+2 per month, up to +50',
};
