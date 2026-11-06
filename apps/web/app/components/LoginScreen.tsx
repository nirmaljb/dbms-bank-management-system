'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader } from './BankHeader';
import { BankFooter } from './BankFooter';
import { CaptchaBox, useCaptcha } from './CaptchaBox';
import { WithKeyboard } from './WithKeyboard';

// Customers sign in with their email, admins with the Admin ID the bank
// issued them (seeded by db:setup; admins cannot register themselves).
const DEMO = {
  customer: { login: 'demo@example.com', password: 'password123' },
  admin: { login: 'BNBA0001', password: 'password123' },
};

const homeFor = (role: 'customer' | 'admin') => (role === 'admin' ? '/admin' : '/dashboard');

export function LoginScreen({ mode }: { mode: 'customer' | 'admin' }) {
  const router = useRouter();
  const { user, loading: authLoading, login, adminLogin } = useAuth();
  const isAdmin = mode === 'admin';
  const captcha = useCaptcha();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    captcha?: string;
  }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already signed in: go to the home page for that role.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(homeFor(user.role));
    }
  }, [user, authLoading, router]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string; captcha?: string } = {};

    if (!email.trim()) {
      errors.email = isAdmin ? 'Admin ID is required' : 'Email address is required';
    } else if (!isAdmin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    if (!captchaInput.trim()) {
      errors.captcha = 'Please enter the code shown in the image';
    } else if (!captcha.matches(captchaInput)) {
      errors.captcha = 'The code does not match the image';
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
      const result = isAdmin
        ? await adminLogin({ adminId: email.trim(), password })
        : await login({ email: email.trim(), password });
      if (result.success) {
        router.push(homeFor(mode));
      } else {
        setGeneralError(result.error || (isAdmin ? 'Invalid Admin ID or password' : 'Invalid email or password'));
      }
    } catch {
      setGeneralError('Could not reach the bank server. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEMO[mode].login);
    setPassword(DEMO[mode].password);
    setCaptchaInput(captcha.code);
    setFieldErrors({});
    setGeneralError(null);
  };

  return (
    <div className="bank-page-container">
      <BankHeader />

      <main id="main-content" className="p-3 sm:p-6 bg-[#f4f7fa] flex-1">
        <div className="max-w-md mx-auto">
          <div className="bank-panel-box shadow-sm">
            <div className={`bank-panel-header py-2 ${isAdmin ? 'bg-gradient-to-r from-[#4a235a] to-[#2b1236]' : ''}`}>
              <span>{isAdmin ? '⚙️ Admin Login' : '🔐 Customer Login'}</span>
            </div>

            <div className="p-4 bg-white">
              {generalError && (
                <div className="mb-3 p-2.5 bg-[#fff0f0] border border-[#cc0000] text-[#990000] text-xs font-semibold">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-[#003366] mb-0.5">
                    {isAdmin ? 'Admin ID' : 'Email'}
                  </label>
                  <WithKeyboard>
                    <input
                      id="email"
                      name={isAdmin ? 'adminId' : 'email'}
                      type={isAdmin ? 'text' : 'email'}
                      autoComplete="username"
                      placeholder={isAdmin ? 'e.g. BNBA0001' : undefined}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className="bank-input w-full"
                    />
                  </WithKeyboard>
                  {fieldErrors.email && <p className="mt-0.5 text-[10.5px] text-red-700 font-bold">{fieldErrors.email}</p>}
                  {isAdmin && (
                    <p className="mt-0.5 text-[10.5px] text-slate-500">
                      Issued by the bank when your admin account is created. Your email also works.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-[#003366] mb-0.5">
                    Password
                  </label>
                  <WithKeyboard>
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
                      className="bank-input w-full"
                    />
                  </WithKeyboard>
                  {fieldErrors.password && (
                    <p className="mt-0.5 text-[10.5px] text-red-700 font-bold">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="captchaInput" className="block text-xs font-bold text-[#003366] mb-0.5">
                    Captcha
                  </label>
                  <CaptchaBox code={captcha.code} onRefresh={captcha.refresh} />
                  <WithKeyboard className="mt-1.5">
                    <input
                      id="captchaInput"
                      name="captchaInput"
                      type="text"
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value);
                        if (fieldErrors.captcha) setFieldErrors((prev) => ({ ...prev, captcha: undefined }));
                      }}
                      placeholder="Type the code above"
                      className="bank-input w-full font-mono font-bold tracking-wider uppercase"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                    />
                  </WithKeyboard>
                  {fieldErrors.captcha && (
                    <p className="mt-0.5 text-[10.5px] text-red-700 font-bold">{fieldErrors.captcha}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bank-btn w-full py-1.5 text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing in...' : 'Login'}
                </button>
              </form>

              <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                {isAdmin ? (
                  <Link href="/login" className="text-[#004c8f] hover:underline font-bold">
                    Customer login
                  </Link>
                ) : (
                  <Link href="/signup" className="text-[#004c8f] hover:underline font-bold">
                    Open an account
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-slate-600 hover:underline bg-transparent border-0 cursor-pointer p-0"
                  title={`${DEMO[mode].login} / ${DEMO[mode].password}`}
                >
                  Fill demo {isAdmin ? 'admin' : 'customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BankFooter />
    </div>
  );
}
