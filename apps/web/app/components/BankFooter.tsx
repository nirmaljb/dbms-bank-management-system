'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RetroDialog } from './RetroDialog';

export function BankFooter() {
  const [dialogNotice, setDialogNotice] = useState<string | null>(null);
  const [dialogTitle, setDialogTitle] = useState<string>('State Bank Notice');

  const showNotice = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogNotice(message);
  };

  return (
    <>
      <footer className="mt-auto border-t-2 border-[#004c8f] bg-[#eef3f8] text-[#333333] text-[11px] select-none">
        {/* Top Footer Navigation Links */}
        <div className="bg-[#002b4d] text-white py-2 px-4 border-b border-[#001729]">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10.5px]">
            <Link href="/" className="hover:underline text-[#cfe0f1]">
              Home
            </Link>
            <span className="text-[#1a5585]">|</span>
            <button
              type="button"
              onClick={() =>
                showNotice(
                  'Customer Privacy Notice',
                  'Customer Privacy Notice:\nAll customer personal data and banking records are protected strictly per Reserve Bank of India (RBI) Information Security Guidelines and Data Protection Laws.'
                )
              }
              className="hover:underline text-[#cfe0f1] bg-transparent border-0 cursor-pointer text-[10.5px] p-0"
            >
              Privacy Notice
            </button>
            <span className="text-[#1a5585]">|</span>
            <button
              type="button"
              onClick={() =>
                showNotice(
                  'Terms of Service',
                  'Terms of Service:\nRetail Internet Banking facility is governed strictly by the State Bank Internet Banking Service Agreement and electronic fund transfer policies.'
                )
              }
              className="hover:underline text-[#cfe0f1] bg-transparent border-0 cursor-pointer text-[10.5px] p-0"
            >
              Terms of Service
            </button>
            <span className="text-[#1a5585]">|</span>
            <button
              type="button"
              onClick={() =>
                showNotice(
                  'Safe Banking Tips',
                  'Safe Banking Tips:\n• Never share OTP, PIN, CVV or passwords with anyone.\n• Always verify https:// in browser URL bar.\n• Do not click unsolicited links sent via SMS or messaging apps.'
                )
              }
              className="hover:underline text-[#cfe0f1] bg-transparent border-0 cursor-pointer text-[10.5px] p-0"
            >
              Safe Banking Tips
            </button>
            <span className="text-[#1a5585]">|</span>
            <button
              type="button"
              onClick={() =>
                showNotice(
                  'Interest Rates & Service Charges',
                  'Interest Rates & Service Charges:\n• Savings Bank A/c: 2.70% p.a.\n• 1-Yr Domestic Term Deposit: 6.80% p.a.\n• 2-Yr FD: 7.10% p.a. (Senior Citizen: 7.60% p.a.)\n• NEFT/RTGS: Free for online retail accounts'
                )
              }
              className="hover:underline text-[#cfe0f1] bg-transparent border-0 cursor-pointer text-[10.5px] p-0"
            >
              Interest Rates &amp; Service Charges
            </button>
            <span className="text-[#1a5585]">|</span>
            <button
              type="button"
              onClick={() =>
                showNotice(
                  'Customer Grievance Redressal',
                  'Customer Care & Grievance Redressal:\nPrincipal Nodal Officer, State Bank Bhavan, Nariman Point, Mumbai.\nEmail: nodalofficer@bank.in\nToll Free Helpline: 1800-425-3800 / 1800-11-2211'
                )
              }
              className="hover:underline text-[#cfe0f1] bg-transparent border-0 cursor-pointer text-[10.5px] p-0"
            >
              Grievance Redressal
            </button>
            <span className="text-[#1a5585]">|</span>
            <button
              type="button"
              onClick={() =>
                showNotice(
                  'RBI Kehta Hai - Customer Awareness',
                  'RBI Kehta Hai:\nJaankari baniye, satark rahiye!\n• Do not share card details, OTP, or CVV.\n• Never install screen sharing apps.\n• Immediately report cyber fraud to helpline 1930.'
                )
              }
              className="hover:underline text-[#ffdd88] font-bold bg-transparent border-0 cursor-pointer text-[10.5px] p-0"
            >
              RBI Kehta Hai (Be Aware)
            </button>
          </div>
        </div>

        {/* Security Seals & Browser Advisory */}
        <div className="p-3 bg-[#e8eef5] border-b border-[#ccd9e8] flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="space-y-1">
            <p className="font-semibold text-slate-800 text-[11px]">
              Technical Recommendation &amp; Compatibility:
            </p>
            <p className="text-[10px] text-slate-600">
              Site best viewed in Microsoft Internet Explorer 7.0+, Mozilla Firefox 3.6+, Google Chrome with a minimum screen resolution of 1024 &times; 768 pixels. JavaScript and Cookies must be enabled.
            </p>
          </div>

          {/* Security certification seals */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="border border-[#7f9db9] bg-white px-2 py-1 flex items-center gap-1.5 shadow-xs">
              <span className="text-base text-emerald-600">🔒</span>
              <div className="text-left text-[9px] leading-tight">
                <span className="font-bold text-[#003366] block">VeriSign Secured</span>
                <span className="text-slate-500">256-Bit SSL</span>
              </div>
            </div>
            <div className="border border-[#7f9db9] bg-white px-2 py-1 flex items-center gap-1.5 shadow-xs">
              <span className="text-base text-blue-600">🛡️</span>
              <div className="text-left text-[9px] leading-tight">
                <span className="font-bold text-[#003366] block">ISO 27001</span>
                <span className="text-slate-500">Security Certified</span>
              </div>
            </div>
            <div className="border border-[#7f9db9] bg-white px-2 py-1 flex items-center gap-1.5 shadow-xs">
              <span className="text-base text-amber-600">🏛️</span>
              <div className="text-left text-[9px] leading-tight">
                <span className="font-bold text-[#003366] block">RBI Regulated</span>
                <span className="text-slate-500">Scheduled Bank</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Notice */}
        <div className="py-2 px-4 text-center bg-[#dce6f0] text-[10px] text-slate-700">
          &copy; 2004 &ndash; 2026 State Bank of Bharat &bull; Retail NetBanking Division &bull; All Rights Reserved.
        </div>
      </footer>

      {/* Info Dialog */}
      <RetroDialog
        isOpen={!!dialogNotice}
        title={dialogTitle}
        message={dialogNotice || ''}
        onClose={() => setDialogNotice(null)}
      />
    </>
  );
}
