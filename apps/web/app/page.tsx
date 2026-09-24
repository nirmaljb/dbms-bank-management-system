'use client';

import React from 'react';
import Link from 'next/link';
import { BankHeader } from './components/BankHeader';
import { BankFooter } from './components/BankFooter';
import { useAuth } from './context/auth-context';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="bank-page-container">
      <BankHeader />

      <main id="main-content" className="p-3 sm:p-4 bg-[#f4f7fa] flex-1">
        {/* Welcome Announcement Bar */}
        <div className="border border-[#99b4d1] bg-white p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base text-[#004c8f]">🏛️</span>
            <div>
              <span className="font-bold text-[#003366] text-xs">
                Welcome to OnlineSBI Retail &amp; Corporate Internet Banking Portal
              </span>
              <p className="text-[10.5px] text-slate-600 m-0">
                Safe, Convenient and Secure 24&times;7 Banking at your fingertips.
              </p>
            </div>
          </div>

          <div>
            {user ? (
              <Link
                href="/dashboard"
                className="bank-btn bg-[#f8991d] border-[#d97c00] text-slate-950 font-bold px-4 py-1.5 flex items-center gap-1.5"
              >
                <span>📂</span>
                <span>Proceed to Internet Banking Dashboard</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="bank-btn bg-[#005599] text-white font-bold px-4 py-1.5 flex items-center gap-1.5"
                >
                  <span>🔐</span>
                  <span>CONTINUE TO LOGIN</span>
                </Link>
                <Link
                  href="/signup"
                  className="bank-btn-secondary px-3 py-1.5 font-bold text-slate-800"
                >
                  New User Registration
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 3-Column Classic Banking Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Column 1: Personal & Corporate Banking Gateway (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            {/* Personal Banking Box */}
            <div className="bank-panel-box shadow-xs">
              <div className="bank-panel-header flex items-center gap-1.5">
                <span>👤</span>
                <span>Personal Banking (Retail)</span>
              </div>
              <div className="p-3 bg-[#ffffff] space-y-2.5">
                <p className="text-[11px] text-slate-700 leading-tight">
                  Retail internet banking service for individual account holders. Transfer funds, pay bills, open fixed deposits, view mini-statements, and request cheque books.
                </p>

                <div className="bg-[#fffdf0] border border-[#eedd82] p-2 text-[10.5px] text-[#6b4c00]">
                  <strong>Mandatory Notice:</strong> Please ensure your mobile number is updated in CBS to receive One Time Password (OTP).
                </div>

                <div className="pt-1 flex flex-col gap-1.5">
                  <Link
                    href="/login"
                    className="bank-btn text-center py-2 bg-gradient-to-b from-[#0066b3] to-[#003d73] text-white font-bold text-xs"
                  >
                    🔐 LOGIN TO PERSONAL BANKING
                  </Link>

                  <div className="flex justify-between items-center text-[10.5px] pt-1 border-t border-slate-200">
                    <Link href="/signup" className="text-[#004c8f] hover:underline font-bold">
                      &raquo; New User Registration / Activation
                    </Link>
                    <Link href="/login" className="text-[#990000] hover:underline">
                      &raquo; How Do I? / FAQs
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Corporate Banking Box */}
            <div className="bank-panel-box shadow-xs">
              <div className="bank-panel-header flex items-center gap-1.5 bg-gradient-to-r from-[#175486] to-[#0d3b60]">
                <span>🏢</span>
                <span>Corporate Banking (Vyapaar / SME)</span>
              </div>
              <div className="p-3 bg-[#ffffff] space-y-2">
                <p className="text-[11px] text-slate-700">
                  Comprehensive financial solutions for corporate firms, SMEs, institutions, and government departments.
                </p>
                <div className="flex gap-2">
                  <select className="bank-input text-[11px] flex-1">
                    <option>Select Corporate Module (SARAL / Vyapaar)</option>
                    <option>SME Saral (Single User)</option>
                    <option>Vyapaar (Multi-user Maker/Checker)</option>
                    <option>Vistaar (Large Corporates)</option>
                  </select>
                  <Link
                    href="/login"
                    className="bank-btn px-3 py-1 font-bold text-xs"
                  >
                    Login
                  </Link>
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Supports bulk NEFT/RTGS uploads, direct tax payments, and customs duty.
                </div>
              </div>
            </div>

            {/* Fast Online Services Links */}
            <div className="bank-panel-box shadow-xs">
              <div className="bank-panel-header-secondary">
                <span>⚡ Quick Banking Links</span>
              </div>
              <div className="divide-y divide-slate-200 text-[11px]">
                <a
                  href="#sb-account"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Online Savings Bank Account opening with Video KYC is available 24x7.');
                  }}
                  className="block px-3 py-2 text-[#004c8f] hover:bg-[#eef3f8] hover:text-[#990000]"
                >
                  &rsaquo; Apply for Savings Bank Account Online (Video KYC)
                </a>
                <a
                  href="#doorstep"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Doorstep Banking Services: Cash pickup, cash delivery, cheque pickup available for senior citizens.');
                  }}
                  className="block px-3 py-2 text-[#004c8f] hover:bg-[#eef3f8] hover:text-[#990000]"
                >
                  &rsaquo; Doorstep Banking Services (DSB)
                </a>
                <a
                  href="#form15"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Form 15G / 15H submission for Nil TDS deduction on Fixed Deposit interest.');
                  }}
                  className="block px-3 py-2 text-[#004c8f] hover:bg-[#eef3f8] hover:text-[#990000]"
                >
                  &rsaquo; Online Submission of Form 15G / Form 15H
                </a>
                <a
                  href="#positivepay"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Positive Pay System (PPS) is mandatory for cheques valued at ₹50,000 and above.');
                  }}
                  className="block px-3 py-2 text-[#004c8f] hover:bg-[#eef3f8] hover:text-[#990000]"
                >
                  &rsaquo; Positive Pay System (PPS) for Cheques &ge; ₹50,000
                </a>
                <a
                  href="#debitcard"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Manage Debit Card limits and International usage through NetBanking.');
                  }}
                  className="block px-3 py-2 text-[#004c8f] hover:bg-[#eef3f8] hover:text-[#990000]"
                >
                  &rsaquo; Block ATM / Debit Card or Reset ATM PIN
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Highlights, Products & Advisories (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            {/* Core Features Overview Box */}
            <div className="bank-panel-box shadow-xs">
              <div className="bank-panel-header">
                <span>🌟 Retail Banking Features</span>
              </div>
              <div className="p-3 bg-white">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="border border-[#b8cde4] bg-[#f7fafd] p-2 hover:bg-[#eef5fc] cursor-pointer">
                    <span className="text-xl">💸</span>
                    <div className="font-bold text-[#003366] text-xs mt-1">24&times;7 Funds Transfer</div>
                    <div className="text-[10px] text-slate-500">IMPS, NEFT &amp; RTGS</div>
                  </div>
                  <div className="border border-[#b8cde4] bg-[#f7fafd] p-2 hover:bg-[#eef5fc] cursor-pointer">
                    <span className="text-xl">📈</span>
                    <div className="font-bold text-[#003366] text-xs mt-1">e-Fixed Deposit (FD)</div>
                    <div className="text-[10px] text-slate-500">Earn up to 7.60% p.a.</div>
                  </div>
                  <div className="border border-[#b8cde4] bg-[#f7fafd] p-2 hover:bg-[#eef5fc] cursor-pointer">
                    <span className="text-xl">📖</span>
                    <div className="font-bold text-[#003366] text-xs mt-1">Instant Passbook</div>
                    <div className="text-[10px] text-slate-500">Download Statements</div>
                  </div>
                  <div className="border border-[#b8cde4] bg-[#f7fafd] p-2 hover:bg-[#eef5fc] cursor-pointer">
                    <span className="text-xl">✉️</span>
                    <div className="font-bold text-[#003366] text-xs mt-1">Cheque Book Services</div>
                    <div className="text-[10px] text-slate-500">Request &amp; Stop Payment</div>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-[#f0f4f9] border border-[#ccd9e8] text-[11px] text-slate-700">
                  <strong className="text-[#003366]">Demo System Ready:</strong> Try out real transactions using pre-configured customer accounts:
                  <div className="mt-1 font-mono text-[10.5px] bg-white p-1 border border-slate-300">
                    ID: <strong>demo@example.com</strong> | Password: <strong>password123</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Mandatory Cyber Security Advisories */}
            <div className="bank-panel-box shadow-xs">
              <div className="bank-panel-header bg-gradient-to-r from-[#8b0000] to-[#590000]">
                <span>🛡️ Security Guidelines for Safe NetBanking</span>
              </div>
              <div className="p-3 bg-white space-y-2">
                <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-700">
                  <li>
                    <strong>Never share passwords or OTP:</strong> Bank officials never ask for Login Password, Profile Password, OTP or Debit Card CVV.
                  </li>
                  <li>
                    <strong>Check URL Security:</strong> Always verify that the address bar displays <code>https://</code> with the verified padlock seal.
                  </li>
                  <li>
                    <strong>Beware of Screen Sharing Apps:</strong> Never install remote access applications (AnyDesk, TeamViewer, QuickSupport) on recommendation of unknown callers.
                  </li>
                  <li>
                    <strong>Use Virtual Keyboard:</strong> While logging in on public cybercafés or shared computers, use our on-screen Virtual Keyboard to safeguard against hardware keyloggers.
                  </li>
                </ul>

                <div className="mt-2 p-2 bg-[#fff4f4] border border-[#e0a0a0] text-[10.5px] text-[#800000]">
                  <strong>Incident Reporting:</strong> If you suspect any fraudulent activity on your account, dial National Cyber Crime Portal at <strong>1930</strong> or block access immediately.
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Rates, Tenders & Notices (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            {/* Interest Rates Table */}
            <div className="bank-panel-box shadow-xs">
              <div className="bank-panel-header-secondary flex items-center justify-between">
                <span>📈 Current Interest Rates</span>
                <span className="text-[9.5px] text-slate-500 font-normal">w.e.f. Sep 2026</span>
              </div>
              <table className="bank-table">
                <thead>
                  <tr>
                    <th>Product / Tenure</th>
                    <th className="text-right">Rate p.a.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Savings Bank Balance</td>
                    <td className="text-right font-bold text-[#006600]">2.70%</td>
                  </tr>
                  <tr>
                    <td>1 Year Domestic Term Deposit</td>
                    <td className="text-right font-bold text-[#003366]">6.80%</td>
                  </tr>
                  <tr>
                    <td>2 Years to &lt; 3 Years FD</td>
                    <td className="text-right font-bold text-[#003366]">7.10%</td>
                  </tr>
                  <tr>
                    <td>Senior Citizen FD (&ge; 60 yrs)</td>
                    <td className="text-right font-bold text-[#8b0000]">7.60%</td>
                  </tr>
                  <tr>
                    <td>Home Loan (Floating)</td>
                    <td className="text-right font-bold text-slate-800">8.50%</td>
                  </tr>
                  <tr>
                    <td>Car Loan</td>
                    <td className="text-right font-bold text-slate-800">8.75%</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-1.5 text-center bg-[#f0f4f8] border-t border-[#ccd9e8]">
                <a
                  href="#all-rates"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Detailed Interest Rate schedules are published on branch notice boards.');
                  }}
                  className="text-[10px] text-[#004c8f] hover:underline font-bold"
                >
                  View Complete Interest Schedule &raquo;
                </a>
              </div>
            </div>

            {/* Forex Card */}
            <div className="bank-panel-box shadow-xs">
              <div className="bank-panel-header-secondary flex items-center justify-between">
                <span>💱 Indicative Forex Rates</span>
                <span className="text-[9.5px] text-slate-500 font-normal">TT Rates</span>
              </div>
              <table className="bank-table">
                <thead>
                  <tr>
                    <th>Currency</th>
                    <th className="text-right">Buy (₹)</th>
                    <th className="text-right">Sell (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>USD / INR</td>
                    <td className="text-right font-mono">83.45</td>
                    <td className="text-right font-mono">84.10</td>
                  </tr>
                  <tr>
                    <td>EUR / INR</td>
                    <td className="text-right font-mono">91.20</td>
                    <td className="text-right font-mono">92.05</td>
                  </tr>
                  <tr>
                    <td>GBP / INR</td>
                    <td className="text-right font-mono">107.50</td>
                    <td className="text-right font-mono">108.65</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Customer Care Box */}
            <div className="border border-[#7f9db9] bg-[#fffdef] p-2.5 shadow-xs">
              <div className="font-bold text-[#003366] text-xs flex items-center gap-1">
                <span>📞</span>
                <span>24&times;7 Customer Helpline</span>
              </div>
              <p className="text-[10.5px] text-slate-700 mt-1">
                Toll Free Numbers:
                <br />
                <strong className="text-base text-[#800000]">1800 1234</strong> / <strong className="text-base text-[#800000]">1800 2100</strong>
              </p>
              <div className="mt-1 text-[10px] text-slate-600 border-t border-amber-200 pt-1">
                Email: <span className="text-[#004c8f] font-mono">customercare@bank.in</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BankFooter />
    </div>
  );
}
