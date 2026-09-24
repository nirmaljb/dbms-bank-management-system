'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Route verification: check session via /api/auth/me
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-sm text-slate-500 font-medium">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              BM
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block">
                Bank Management
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-900">{user.name}</span>
              <span className="text-xs text-slate-500">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Active • Verified
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 uppercase tracking-wide border border-indigo-400/30">
                  {user.role}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user.name}!
              </h1>
              <p className="text-indigo-200 text-sm mt-1">
                Connected to secure banking portal. All sessions are monitored and encrypted.
              </p>
            </div>
            <div>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-indigo-900 hover:bg-slate-100 rounded-xl font-medium text-sm shadow transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* User Identity Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              User Profile
            </div>
            <div className="text-lg font-bold text-slate-900 mt-1">{user.name}</div>
            <div className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                />
              </svg>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Assigned Role
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                {user.role}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {user.role === 'admin'
                ? 'Full system management and administrative privileges.'
                : 'Standard banking patron account privileges.'}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Security Status
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-semibold text-slate-900">Active & Authenticated</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Session secured with HTTP-only signed JWT cookies.
            </div>
          </div>
        </div>

        {/* Banking Overview Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Financial Accounts Overview</h2>
          <p className="text-sm text-slate-600 mb-6">
            Ledger-tracked financial accounts associated with your customer profile.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition bg-slate-50/50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Primary Checking</span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">$14,250.00</div>
              <div className="text-xs text-slate-400 mt-1">Account ending in •••• 4192</div>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition bg-slate-50/50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">High Yield Savings</span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">$32,800.50</div>
              <div className="text-xs text-slate-400 mt-1">Account ending in •••• 8831</div>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-2">
                +
              </div>
              <span className="text-sm font-semibold text-slate-700">Open New Account</span>
              <span className="text-xs text-slate-400 mt-0.5">Apply for checking or savings</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
