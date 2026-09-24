'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader } from '../components/BankHeader';
import { BankFooter } from '../components/BankFooter';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { CaptchaBox } from '../components/CaptchaBox';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [currentCaptcha, setCurrentCaptcha] = useState('');
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    captcha?: string;
  }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string; captcha?: string } = {};

    if (!email.trim()) {
      errors.email = 'Username / Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Login Password is required';
    }

    if (!captchaInput.trim()) {
      errors.captcha = 'Please enter the Captcha code shown in the image';
    } else if (captchaInput.trim() !== currentCaptcha) {
      errors.captcha = 'Invalid Captcha code. Note: Captcha is case-sensitive';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (result.success) {
        router.push('/dashboard');
      } else {
        setGeneralError(result.error || 'Invalid Username or Login Password');
      }
    } catch {
      setGeneralError('Communication failure with Core Banking System. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setEmail('');
    setPassword('');
    setCaptchaInput('');
    setFieldErrors({});
    setGeneralError(null);
  };

  const handleFillDemo = (role: 'customer' | 'admin') => {
    if (role === 'customer') {
      setEmail('demo@example.com');
      setPassword('password123');
    } else {
      setEmail('admin@example.com');
      setPassword('password123');
    }
    setCaptchaInput(currentCaptcha);
    setFieldErrors({});
    setGeneralError(null);
  };

  if (authLoading) {
    return (
      <div className="bank-page-container">
        <BankHeader />
        <div className="p-12 text-center text-slate-600 bg-white">
          <div className="font-bold text-sm text-[#003366]">Connecting to CBS Authentication Host...</div>
          <div className="text-xs text-slate-500 mt-2">Verifying secure SSL tunnel...</div>
        </div>
        <BankFooter />
      </div>
    );
  }

  return (
    <div className="bank-page-container">
      <BankHeader />

      <main id="main-content" className="p-3 sm:p-4 bg-[#f4f7fa] flex-1">
        {/* Breadcrumb / Location Bar */}
        <div className="border border-[#b8cde4] bg-[#eef3f8] px-3 py-1.5 mb-3 text-[11px] text-[#003366] flex items-center justify-between">
          <div>
            <Link href="/" className="hover:underline font-semibold">
              Home
            </Link>
            <span className="mx-1.5 text-slate-400">&raquo;</span>
            <span className="font-bold text-slate-800">Personal Banking Login</span>
          </div>
          <div className="text-[10px] text-slate-600">
            Security Protocol: <strong>TLS 1.3 / AES-256</strong>
          </div>
        </div>

        {/* 2-Column Split: Left Advisory / Right Login Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Security Advisories & Dos/Don'ts (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bank-panel-box shadow-xs">
              <div className="bank-panel-header bg-gradient-to-r from-[#800000] to-[#550000]">
                <span>🛡️ Mandatory Instructions for NetBanking Login</span>
              </div>
              <div className="p-3 bg-white space-y-2 text-[11px] text-slate-700">
                <p className="font-bold text-[#800000]">
                  Please adhere strictly to the following security guidelines:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>
                    Verify that URL starts with <strong>https://</strong> and padlock symbol is present.
                  </li>
                  <li>
                    <strong>Never share OTP:</strong> Bank NEVER calls to verify OTP, CVV, Card PIN or passwords.
                  </li>
                  <li>
                    Always use <strong>Virtual Keyboard</strong> when accessing your account from non-personal computers.
                  </li>
                  <li>
                    Do not store User ID and Password in your web browser.
                  </li>
                  <li>
                    Always click <strong>Logout</strong> button and close browser window upon completion.
                  </li>
                  <li>
                    In case of unauthorized debits, immediately call helpline <strong>1930</strong> or block NetBanking access.
                  </li>
                </ol>

                <div className="mt-2 pt-2 border-t border-slate-200">
                  <a
                    href="#lock-access"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('To lock your Internet Banking access immediately in case of emergency, send an SMS "LOCK <User ID>" to 567676 or call 1800 11 2211.');
                    }}
                    className="text-[#990000] hover:underline font-bold text-[10.5px] block"
                  >
                    &raquo; Emergency: Lock / Deactivate NetBanking Access Online
                  </a>
                </div>
              </div>
            </div>

            {/* Phishing Warning Box */}
            <div className="border border-[#eedd82] bg-[#fffdf0] p-3 text-[11px] text-[#554000] shadow-xs">
              <strong className="text-[#8b0000] block mb-1">
                ⚠️ Phishing Alert &amp; Threat Awareness:
              </strong>
              Fraudulent SMS messages stating <em>&quot;Your bank account will be blocked today, please update PAN immediately via this link&quot;</em> are circulated by fraudsters. Bank never sends such links. Do not open or install any APK files.
            </div>

            {/* Quick Demo Credentials Panel */}
            <div className="border border-[#336699] bg-[#eef5fc] p-3 shadow-xs">
              <div className="font-bold text-[#003366] text-xs flex items-center justify-between mb-1.5">
                <span>🧪 Quick Test Credentials (Pre-seeded)</span>
                <span className="text-[10px] bg-[#004c8f] text-white px-1.5 py-0.2">Demo Mode</span>
              </div>
              <p className="text-[10.5px] text-slate-600 mb-2">
                Click a button below to automatically populate the login form:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleFillDemo('customer')}
                  className="bank-btn text-[11px] py-1 bg-[#1967a8] text-white flex-1"
                >
                  Fill Retail Customer
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('admin')}
                  className="bank-btn text-[11px] py-1 bg-[#4a235a] text-white flex-1"
                >
                  Fill Bank Admin
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-mono">
                Customer: demo@example.com / password123
                <br />
                Admin: admin@example.com / password123
              </div>
            </div>
          </div>

          {/* Right Column: The Classic NetBanking Login Box (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bank-panel-box shadow-md border-2 border-[#004c8f]">
              <div className="bank-panel-header bg-gradient-to-r from-[#004c8f] via-[#003366] to-[#002244] py-2 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔐</span>
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Personal Banking &ndash; Retail Internet Banking Login
                    </span>
                    <span className="text-[9.5px] text-[#cfe2f3] font-normal">
                      For Individual Customers, Joint Account Holders &amp; Sole Proprietorships
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white">
                {generalError && (
                  <div className="mb-3 p-2.5 bg-[#fff0f0] border-2 border-[#cc0000] text-[#990000] text-xs font-semibold flex items-center gap-2">
                    <span className="text-base">❌</span>
                    <span>{generalError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                  {/* Username / Customer ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 items-center">
                    <label
                      htmlFor="email"
                      className="sm:col-span-4 text-xs font-bold text-[#003366]"
                    >
                      Username / Email ID <span className="text-red-600">*</span>:
                    </label>
                    <div className="sm:col-span-8">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        placeholder="e.g. demo@example.com"
                        className="bank-input w-full"
                      />
                      {fieldErrors.email && (
                        <p className="mt-0.5 text-[10.5px] text-red-700 font-bold">{fieldErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 items-start">
                    <label
                      htmlFor="password"
                      className="sm:col-span-4 text-xs font-bold text-[#003366] pt-1"
                    >
                      Login Password <span className="text-red-600">*</span>:
                    </label>
                    <div className="sm:col-span-8">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        placeholder="••••••••"
                        className="bank-input w-full"
                      />
                      {fieldErrors.password && (
                        <p className="mt-0.5 text-[10.5px] text-red-700 font-bold">{fieldErrors.password}</p>
                      )}

                      {/* Virtual Keyboard Toggle */}
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={showVirtualKeyboard}
                            onChange={(e) => setShowVirtualKeyboard(e.target.checked)}
                            className="rounded-none text-[#004c8f]"
                          />
                          <span className="font-semibold text-[#004c8f]">
                            Use Virtual Keyboard (Anti-Keylogger)
                          </span>
                        </label>
                        <span className="text-[10px] text-slate-500">Case-sensitive</span>
                      </div>

                      {/* On-screen Virtual Keyboard */}
                      {showVirtualKeyboard && (
                        <VirtualKeyboard
                          onKeyPress={(char) => setPassword((prev) => prev + char)}
                          onBackspace={() => setPassword((prev) => prev.slice(0, -1))}
                          onClear={() => setPassword('')}
                          onClose={() => setShowVirtualKeyboard(false)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Captcha Image and Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-2 items-start pt-1 border-t border-slate-200">
                    <label className="sm:col-span-4 text-xs font-bold text-[#003366] pt-1">
                      Image Verification <span className="text-red-600">*</span>:
                    </label>
                    <div className="sm:col-span-8 space-y-2">
                      <CaptchaBox onCaptchaGenerated={(code) => setCurrentCaptcha(code)} />

                      <div>
                        <input
                          id="captchaInput"
                          name="captchaInput"
                          type="text"
                          value={captchaInput}
                          onChange={(e) => {
                            setCaptchaInput(e.target.value);
                            if (fieldErrors.captcha) setFieldErrors((prev) => ({ ...prev, captcha: undefined }));
                          }}
                          placeholder="Enter text shown in image"
                          className="bank-input w-full max-w-xs font-mono font-bold tracking-wider"
                          autoComplete="off"
                        />
                        {fieldErrors.captcha && (
                          <p className="mt-0.5 text-[10.5px] text-red-700 font-bold">
                            {fieldErrors.captcha}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="bank-btn-secondary px-4 py-1.5"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bank-btn px-6 py-1.5 text-xs font-bold bg-[#004c8f] text-white disabled:opacity-50"
                    >
                      {isSubmitting ? 'Authenticating with CBS...' : 'Login »'}
                    </button>
                  </div>
                </form>

                {/* Helpful Links Below Form */}
                <div className="mt-4 pt-3 border-t-2 border-[#99b4d1] bg-[#f7fafd] p-2.5 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Link
                      href="/signup"
                      className="text-[#004c8f] hover:underline font-bold block"
                    >
                      &raquo; New User? Register Here / Activate
                    </Link>
                    <a
                      href="#forgot-password"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('To reset your Login Password: Go to Home Branch with Passbook and ID proof, or reset via registered ATM Card and Mobile OTP.');
                      }}
                      className="text-[#800000] hover:underline block mt-1"
                    >
                      &raquo; Forgot Login Password / User ID?
                    </a>
                  </div>
                  <div>
                    <a
                      href="#reset-profile"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Forgot Profile Password: You can reset using your secret question and answer, or through branch approval.');
                      }}
                      className="text-slate-700 hover:underline block"
                    >
                      &raquo; Forgot Profile Password?
                    </a>
                    <a
                      href="#lock-user"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Lock User Access: You can lock access online by entering Username, Account Number and Date of Birth.');
                      }}
                      className="text-[#990000] hover:underline block mt-1"
                    >
                      &raquo; Lock User Access Online
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BankFooter />
    </div>
  );
}
