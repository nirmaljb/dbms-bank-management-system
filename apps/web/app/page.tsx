'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from './context/auth-context';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navigation */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              BM
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              Bank Management
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          Next.js 16 + Express + NeonDB Authentication
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Modern, Secure <br />
          <span className="text-indigo-600">Bank Management</span>
        </h1>

        <p className="mt-6 text-lg text-slate-600 max-w-2xl">
          A banking platform built with HTTP-only cookie authentication, Drizzle ORM,
          and role-based security.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md transition text-base"
          >
            Create Customer Account
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl border border-slate-300 shadow-sm transition text-base"
          >
            Sign In to Existing Account
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
              🔒
            </div>
            <h3 className="font-bold text-slate-900 mb-1">HTTP-Only JWT Cookies</h3>
            <p className="text-sm text-slate-500">
              Secured against XSS vulnerabilities with SameSite=Lax and HTTP-only cookie transport.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-4">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 mb-1">NeonDB & Drizzle ORM</h3>
            <p className="text-sm text-slate-500">
              Serverless PostgreSQL with instant push migrations and strict TypeScript types.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-4">
              🛡️
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Role-Based Security</h3>
            <p className="text-sm text-slate-500">
              Granular role authorization supporting both customer patrons and bank administrators.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Bank Management System &bull; DBMS Laboratory Project
      </footer>
    </div>
  );
}
