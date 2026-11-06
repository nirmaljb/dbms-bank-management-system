'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/auth-context';
import { RetroDialog } from './RetroDialog';
import { AccessibilityBar } from './AccessibilityBar';
import { ChangePinDialog, DEFAULT_PIN } from './PinPrompt';

export interface NavItem {
  id: string;
  label: string;
  badge?: number;
}

interface BankHeaderProps {
  navItems?: NavItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const BANK_NAME = 'Bharat National Bank';

export function BankHeader({ navItems, activeTab, onTabChange }: BankHeaderProps) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [pinChanged, setPinChanged] = useState(false);

  const handleLogoutConfirm = async () => {
    const wasAdmin = user?.role === 'admin';
    await logout();
    window.location.href = wasAdmin ? '/admin/login' : '/login';
  };

  const homeHref = user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/';

  return (
    <>
      <header className="w-full select-none">
        <AccessibilityBar />

        <div className="bank-header-main flex items-center justify-between gap-3">
          <Link href={homeHref} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066b3] to-[#002b4d] border-2 border-[#f8991d] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-[#ffd27f] uppercase font-bold">{BANK_NAME}</div>
              <h1 className="text-lg font-extrabold text-white leading-none m-0">NetBanking</h1>
            </div>
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] font-bold text-white">{user.name}</div>
                <div className="text-[9.5px] text-[#c2daf2]">
                  {user.role === 'admin' ? `Administrator · ${user.staffId ?? ''}` : 'Customer'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePin(true)}
                className="bank-btn-secondary text-xs px-2.5 py-1"
              >
                🔑 Change PIN
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="bank-btn-danger text-xs px-2.5 py-1"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <nav className="bank-nav-bar flex items-center overflow-x-auto whitespace-nowrap">
          {navItems && navItems.length > 0 ? (
            navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange && onTabChange(item.id)}
                className={`bank-nav-tab ${activeTab === item.id ? 'active' : ''}`}
              >
                {item.label}
                {item.badge ? (
                  <span className="ml-1.5 bg-[#a30000] text-white text-[9.5px] px-1.5 py-0.5 rounded-sm">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))
          ) : user ? (
            <Link href={homeHref} className="bank-nav-tab active">
              {user.role === 'admin' ? 'Admin Console' : 'My Dashboard'}
            </Link>
          ) : (
            <>
              <Link href="/" className="bank-nav-tab">
                Home
              </Link>
              <Link href="/login" className="bank-nav-tab">
                Customer Login
              </Link>
              <Link href="/signup" className="bank-nav-tab">
                Open an Account
              </Link>
            </>
          )}
        </nav>

        {user?.pinIsDefault && (
          <div className="px-3 py-1.5 bg-[#fff8e6] border-b-2 border-[#f0c86e] text-[#8a5a00] text-[11px] font-semibold flex flex-wrap items-center gap-2">
            <span>
              🔒 Every action asks for your PIN. You are still using the default PIN{' '}
              <b className="font-mono">{DEFAULT_PIN}</b>. Set your own PIN to keep your account safe.
            </span>
            <button type="button" onClick={() => setShowChangePin(true)} className="bank-btn text-[11px] px-2.5 py-0.5">
              Set my PIN
            </button>
          </div>
        )}
        {pinChanged && !user?.pinIsDefault && (
          <div className="px-3 py-1.5 bg-[#effaef] border-b-2 border-[#2e8b2e] text-[#004d00] text-[11px] font-semibold flex items-center gap-2">
            <span className="flex-1">✅ Your PIN has been changed. Use the new PIN for every action from now on.</span>
            <button type="button" onClick={() => setPinChanged(false)} className="text-[10px] underline bg-transparent border-0 cursor-pointer">
              dismiss
            </button>
          </div>
        )}
      </header>

      <ChangePinDialog
        isOpen={showChangePin}
        onClose={(changed) => {
          setShowChangePin(false);
          if (changed) setPinChanged(true);
        }}
      />

      <RetroDialog
        isOpen={showLogoutConfirm}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        isConfirm={true}
        onConfirm={handleLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
