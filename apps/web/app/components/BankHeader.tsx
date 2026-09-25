'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/auth-context';
import { RetroDialog } from './RetroDialog';

interface BankHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function BankHeader({ activeTab, onTabChange }: BankHeaderProps) {
  const { user, logout } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');

  // Modal dialog state
  const [dialogNotice, setDialogNotice] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setCurrentDateTime(`${now.toLocaleDateString('en-GB', options)} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogoutConfirm = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      <header className="w-full select-none">
        {/* Top Utility Bar (Classic SBI Accessibility & Language Bar) */}
        <div className="bank-top-utility flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-300">Accessibility:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="bg-[#0b3356] hover:bg-[#1a4a75] px-1.5 py-0.2 border border-[#3377aa] text-[10px] text-white"
                title="Decrease Font Size"
              >
                A-
              </button>
              <button
                type="button"
                className="bg-[#0b3356] hover:bg-[#1a4a75] px-1.5 py-0.2 border border-[#3377aa] text-[10px] text-white font-bold"
                title="Normal Font Size"
              >
                A
              </button>
              <button
                type="button"
                className="bg-[#0b3356] hover:bg-[#1a4a75] px-1.5 py-0.2 border border-[#3377aa] text-[10px] text-white"
                title="Increase Font Size"
              >
                A+
              </button>
            </div>
            <span className="text-slate-400">|</span>
            <a href="#main-content" className="text-[10px] hover:underline">
              Skip to Main Content
            </a>
            <span className="text-slate-400">|</span>
            <span className="text-[10px] text-[#ffdd88]">
              National Cyber Crime Helpline: <strong className="text-white">1930</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-slate-300">Language:</span>
              <button
                type="button"
                onClick={() => setLanguage('EN')}
                className={`px-1 font-bold ${
                  language === 'EN' ? 'bg-[#ff9900] text-slate-900' : 'text-slate-200'
                }`}
              >
                English
              </button>
              <span className="text-slate-400">/</span>
              <button
                type="button"
                onClick={() => setLanguage('HI')}
                className={`px-1 font-bold ${
                  language === 'HI' ? 'bg-[#ff9900] text-slate-900' : 'text-slate-200'
                }`}
              >
                हिन्दी
              </button>
            </div>
            <span className="text-slate-400">|</span>
            <span className="font-mono text-[10px] text-emerald-300 font-semibold">
              🕒 {currentDateTime || '24-Sep-2026 18:30:00 IST'}
            </span>
          </div>
        </div>

        {/* Main Bank Brand Header */}
        <div className="bank-header-main flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Classic Bank Keyhole Emblem */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#0066b3] via-[#004c8f] to-[#002b4d] border-2 border-[#f8991d] flex items-center justify-center shadow-md">
                <div className="w-5 h-5 rounded-full bg-white flex flex-col items-center justify-center">
                  <div className="w-1.5 h-3 bg-[#004c8f] mt-1 rounded-sm"></div>
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-widest text-[#ffd27f] uppercase font-bold">
                  {language === 'HI' ? 'भारतीय स्टेट बैंक' : 'STATE BANK OF BHARAT'}
                </div>
                <h1 className="text-lg font-extrabold text-white tracking-tight leading-none m-0 font-sans">
                  OnlineSBI NetBanking
                </h1>
                <div className="text-[9.5px] text-[#cfe2f3] mt-0.5 font-normal tracking-wide">
                  Pure Banking, Nothing Else &bull; Personal &amp; Corporate Services
                </div>
              </div>
            </Link>
          </div>

          {/* Header Right Side Badge & User Status */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end border-r border-[#1e588b] pr-4">
              <div className="flex items-center gap-1.5 text-xs text-white">
                <span className="text-sm">🔒</span>
                <span className="font-bold text-[11px] text-[#d6e7f8]">VeriSign Secured</span>
              </div>
              <span className="text-[9px] text-[#a9c9e8]">256-Bit SSL High-Grade Encryption</span>
              <span className="text-[9px] text-[#ffd27f]">Toll Free: 1800 425 3800</span>
            </div>

            <div>
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-white flex items-center justify-end gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{user.name.toUpperCase()}</span>
                    </div>
                    <div className="text-[9.5px] text-[#c2daf2]">
                      PATRON &bull; {user.role === 'admin' ? 'SYSTEM ADMIN' : 'RETAIL PATRON'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="bank-btn-danger text-xs px-2.5 py-1 font-bold flex items-center gap-1"
                    title="Secure Session Logout"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="bank-btn text-xs px-3 py-1.5 bg-[#f8991d] hover:bg-[#e6850d] text-slate-950 font-bold border border-[#d97c00]"
                  >
                    Login Portal
                  </Link>
                  <Link
                    href="/signup"
                    className="bank-btn-secondary text-xs px-2.5 py-1.5 font-bold"
                  >
                    New User Registration
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Primary Tab Navigation Ribbon */}
        <nav className="bank-nav-bar flex items-center overflow-x-auto whitespace-nowrap">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => onTabChange && onTabChange('accounts')}
                className={`bank-nav-tab ${activeTab === 'accounts' ? 'active' : ''}`}
              >
                📋 My Accounts &amp; Profile
              </button>
              <button
                type="button"
                onClick={() => onTabChange && onTabChange('transfer')}
                className={`bank-nav-tab ${activeTab === 'transfer' ? 'active' : ''}`}
              >
                💸 Payments / Transfers
              </button>
              <button
                type="button"
                onClick={() => onTabChange && onTabChange('beneficiary')}
                className={`bank-nav-tab ${activeTab === 'beneficiary' ? 'active' : ''}`}
              >
                👥 Manage Beneficiaries
              </button>
              <button
                type="button"
                onClick={() => onTabChange && onTabChange('deposits')}
                className={`bank-nav-tab ${activeTab === 'deposits' ? 'active' : ''}`}
              >
                🏦 e-Deposits (FD / RD)
              </button>
              <button
                type="button"
                onClick={() => onTabChange && onTabChange('cheques')}
                className={`bank-nav-tab ${activeTab === 'cheques' ? 'active' : ''}`}
              >
                📝 e-Services &amp; Cheques
              </button>
              <button
                type="button"
                onClick={() => onTabChange && onTabChange('statement')}
                className={`bank-nav-tab ${activeTab === 'statement' ? 'active' : ''}`}
              >
                📜 Account Statements
              </button>
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => onTabChange && onTabChange('admin')}
                  className={`bank-nav-tab ${activeTab === 'admin' ? 'active text-purple-900' : 'bg-purple-900/60'}`}
                >
                  ⚙️ Admin CBS Terminal
                </button>
              )}
            </>
          ) : (
            <>
              <Link href="/" className="bank-nav-tab active">
                🏠 Home
              </Link>
              <Link href="/login" className="bank-nav-tab">
                🔐 Personal Banking Login
              </Link>
              <Link href="/login" className="bank-nav-tab">
                🏢 Corporate Banking
              </Link>
              <Link href="/signup" className="bank-nav-tab">
                📝 Online Registration
              </Link>
              <button
                type="button"
                onClick={() =>
                  setDialogNotice(
                    'Current Domestic Term Deposit Interest Rate:\n• 1 Year: 6.80% p.a.\n• 2 Years: 7.10% p.a.\n• Senior Citizens: 7.60% p.a. (+0.50% special rate)'
                  )
                }
                className="bank-nav-tab bg-transparent border-0 cursor-pointer"
              >
                📈 Interest Rates
              </button>
              <button
                type="button"
                onClick={() =>
                  setDialogNotice(
                    'Safe Banking Advisory:\n• Helpline: 1800-425-3800 / 1800-11-2211\n• National Cyber Crime Helpline: 1930\n• Never share OTP or PIN with anyone under any circumstance.'
                  )
                }
                className="bank-nav-tab bg-transparent border-0 cursor-pointer"
              >
                🛡️ Security &amp; Safety Tips
              </button>
            </>
          )}
        </nav>

        {/* Scrolling Announcement Marquee */}
        <div className="bank-ticker flex items-center overflow-hidden border-b border-[#eedd82]">
          <span className="shrink-0 bg-[#a30000] text-white px-2 py-0.5 text-[10.5px] font-bold mr-2 uppercase tracking-wide">
            ⚠️ Important Notice:
          </span>
          <div className="overflow-hidden whitespace-nowrap w-full">
            <div className="bank-marquee-content text-[11px] text-[#6b1212]">
              <span>
                State Bank never calls or messages to ask for your User ID, Login Password, Profile Password, Debit Card PIN, CVV or OTP.
                &bull; Beware of fraudulent APK links and APK installation files sent over WhatsApp or SMS.
                &bull; In case of unauthorized electronic transactions, report immediately to Cyber Crime Helpline 1930 or call 1800 1234.
                &bull; Mandatory Re-KYC update for inactive accounts: submit documents at your home branch or through registered portal.
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Logout confirmation dialog */}
      <RetroDialog
        isOpen={showLogoutConfirm}
        title="Secure NetBanking Session Logout"
        message="Are you sure you want to securely log out of your Internet Banking session? Any unsaved transaction changes will be discarded."
        confirmText="Confirm Logout"
        isConfirm={true}
        onConfirm={handleLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
      />

      {/* Info dialog */}
      <RetroDialog
        isOpen={!!dialogNotice}
        message={dialogNotice || ''}
        onClose={() => setDialogNotice(null)}
      />
    </>
  );
}
