'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader } from '../components/BankHeader';
import { BankFooter } from '../components/BankFooter';
import { CaptchaBox, useCaptcha } from '../components/CaptchaBox';
import { RetroDialog } from '../components/RetroDialog';

type Field = 'name' | 'email' | 'password' | 'confirmPassword' | 'captcha';

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading, signup } = useAuth();
  const captcha = useCaptcha();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user && !showSuccessDialog) {
      router.replace(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, authLoading, router, showSuccessDialog]);

  const validate = (): boolean => {
    const errors: Partial<Record<Field, string>> = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!captcha.matches(captchaInput)) {
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
      const result = await signup({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.success) {
        setShowSuccessDialog(true);
      } else {
        setGeneralError(result.error || 'Registration failed. Please try again.');
      }
    } catch {
      setGeneralError('Could not reach the bank server. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (
    id: Field,
    label: string,
    type: string,
    value: string,
    onChange: (v: string) => void,
    autoComplete: string
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-[#003366] mb-0.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="bank-input w-full"
      />
      {fieldErrors[id] && <p className="text-[10.5px] text-red-700 font-bold mt-0.5">{fieldErrors[id]}</p>}
    </div>
  );

  return (
    <div className="bank-page-container">
      <BankHeader />

      <main id="main-content" className="p-3 sm:p-6 bg-[#f4f7fa] flex-1">
        <div className="max-w-md mx-auto">
          <div className="bank-panel-box shadow-sm">
            <div className="bank-panel-header py-2">
              <span>📝 Open a Savings Account</span>
            </div>

            <div className="p-4 bg-white">
              <p className="text-[11px] text-slate-600 mb-3">
                Registering opens one savings account in your name with a balance of ₹0.
              </p>

              {generalError && (
                <div className="mb-3 p-2.5 bg-[#fff0f0] border border-[#cc0000] text-[#990000] text-xs font-semibold">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                {field('name', 'Full name', 'text', name, setName, 'name')}
                {field('email', 'Email', 'email', email, setEmail, 'email')}
                {field('password', 'Password (8+ characters)', 'password', password, setPassword, 'new-password')}
                {field('confirmPassword', 'Confirm password', 'password', confirmPassword, setConfirmPassword, 'new-password')}

                <div>
                  <label htmlFor="captchaInput" className="block text-xs font-bold text-[#003366] mb-0.5">
                    Captcha
                  </label>
                  <CaptchaBox code={captcha.code} onRefresh={captcha.refresh} />
                  <input
                    id="captchaInput"
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Type the code above"
                    className="bank-input w-full mt-1.5 font-mono font-bold tracking-wider uppercase"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  {fieldErrors.captcha && <p className="text-[10.5px] text-red-700 font-bold mt-0.5">{fieldErrors.captcha}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bank-btn w-full py-1.5 text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Opening account...' : 'Open account'}
                </button>
              </form>

              <div className="mt-3 pt-3 border-t border-slate-200 text-[11px]">
                <Link href="/login" className="text-[#004c8f] hover:underline font-bold">
                  Already a customer? Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BankFooter />

      <RetroDialog
        isOpen={showSuccessDialog}
        title="Account Opened"
        message="Your savings account is open. Make a deposit from your dashboard to start banking."
        confirmText="Go to dashboard"
        onConfirm={() => router.push('/dashboard')}
        onClose={() => router.push('/dashboard')}
      />
    </div>
  );
}
