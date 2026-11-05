'use client';

import React from 'react';
import Link from 'next/link';
import { BankHeader, BANK_NAME } from './components/BankHeader';
import { BankFooter } from './components/BankFooter';
import { useAuth } from './context/auth-context';

const FEATURES = [
  'Savings account opened automatically when you register',
  'Instant deposits; withdrawals above ₹50,000 need officer approval',
  'Statement with a running balance',
  'Personal loans priced by your credit score (300 – 900)',
  'Notices from the bank in your inbox',
];

export default function Home() {
  const { user } = useAuth();
  const dashboardHref = user?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <div className="bank-page-container">
      <BankHeader />

      <main id="main-content" className="p-3 sm:p-6 bg-[#f4f7fa] flex-1">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="bank-panel-box shadow-xs p-4">
            <h2 className="text-base font-bold text-[#003366] m-0">Welcome to {BANK_NAME} NetBanking</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-[11.5px] text-slate-700">
              {FEATURES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {user ? (
                <Link href={dashboardHref} className="bank-btn px-4 py-1.5">
                  {user.role === 'admin' ? 'Go to Admin Console' : 'Go to My Dashboard'}
                </Link>
              ) : (
                <>
                  <Link href="/login" className="bank-btn px-4 py-1.5">
                    Customer Login
                  </Link>
                  <Link href="/signup" className="bank-btn-secondary px-4 py-1.5">
                    Open an Account
                  </Link>
                </>
              )}
            </div>
          </div>

          {!user && (
            <div className="border border-[#b8cde4] bg-[#f7fafd] p-3 text-[11px] text-slate-700">
              <strong className="text-[#003366]">Demo logins</strong> (password <span className="font-mono">password123</span>):
              customer <span className="font-mono">demo@example.com</span>, admin{' '}
              <span className="font-mono">admin@example.com</span>
            </div>
          )}
        </div>
      </main>

      <BankFooter />
    </div>
  );
}
