'use client';

import React from 'react';
import Link from 'next/link';

export function BankFooter() {
  return (
    <footer className="mt-auto border-t-2 border-[#004c8f] bg-[#eef3f8] text-[#333333] text-[11px] select-none">
      {/* Top Footer Navigation Links */}
      <div className="bg-[#002b4d] text-white py-2 px-4 border-b border-[#001729]">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10.5px]">
          <Link href="/" className="hover:underline text-[#cfe0f1]">
            Home
          </Link>
          <span className="text-[#1a5585]">|</span>
          <a
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              alert('Customer Privacy Notice: All customer personal data and banking records are protected strictly per RBI Information Security Guidelines.');
            }}
            className="hover:underline text-[#cfe0f1]"
          >
            Privacy Notice
          </a>
          <span className="text-[#1a5585]">|</span>
          <a
            href="#terms"
            onClick={(e) => {
              e.preventDefault();
              alert('Terms of Service: Retail Internet Banking facility is governed by State Bank Internet Banking Service Agreement.');
            }}
            className="hover:underline text-[#cfe0f1]"
          >
            Terms of Service
          </a>
          <span className="text-[#1a5585]">|</span>
          <a
            href="#security"
            onClick={(e) => {
              e.preventDefault();
              alert('Safe Banking Tips: Never share OTP, PIN, CVV or passwords. Always check for https:// in browser URL.');
            }}
            className="hover:underline text-[#cfe0f1]"
          >
            Safe Banking Tips
          </a>
          <span className="text-[#1a5585]">|</span>
          <a
            href="#rates"
            onClick={(e) => {
              e.preventDefault();
              alert('Deposit Rates: Savings Bank A/c: 2.70% p.a. | 1-Yr Domestic Term Deposit: 6.80% p.a. | 2-Yr FD: 7.10% p.a. (Senior Citizen: 7.60% p.a.)');
            }}
            className="hover:underline text-[#cfe0f1]"
          >
            Interest Rates &amp; Service Charges
          </a>
          <span className="text-[#1a5585]">|</span>
          <a
            href="#grievance"
            onClick={(e) => {
              e.preventDefault();
              alert('Customer Care & Grievance Redressal: Principal Nodal Officer, State Bank Bhavan, Mumbai. Email: nodalofficer@bank.in, Phone: 1800-425-3800');
            }}
            className="hover:underline text-[#cfe0f1]"
          >
            Grievance Redressal
          </a>
          <span className="text-[#1a5585]">|</span>
          <a
            href="#rbi"
            onClick={(e) => {
              e.preventDefault();
              alert('RBI Kehta Hai: Jaankari baniye, satark rahiye! Report cyber fraud to 1930.');
            }}
            className="hover:underline text-[#ffdd88] font-bold"
          >
            RBI Kehta Hai (Be Aware)
          </a>
        </div>
      </div>

      {/* Security Seals & Browser Advisory */}
      <div className="p-3 bg-[#e8eef5] border-b border-[#ccd9e6] flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
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
  );
}
