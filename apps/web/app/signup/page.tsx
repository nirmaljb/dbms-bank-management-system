'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader } from '../components/BankHeader';
import { BankFooter } from '../components/BankFooter';
import { CaptchaBox, useCaptcha } from '../components/CaptchaBox';
import { RetroDialog } from '../components/RetroDialog';
import { apiGet, type AccountType, type Branch } from '../lib/api';

type Field =
  | 'name'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'address'
  | 'branchCode'
  | 'accountType'
  | 'password'
  | 'confirmPassword'
  | 'captcha';

// Latest date of birth that is 18 or older today, as YYYY-MM-DD.
function maxAdultBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading, signup } = useAuth();
  const captcha = useCaptcha();

  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('SAVINGS');
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

  useEffect(() => {
    apiGet<{ branches: Branch[] }>('/branches').then((res) => {
      if (res.error !== undefined) {
        setGeneralError(res.error);
        setBranches([]);
      } else {
        setBranches(res.data.branches);
      }
    });
  }, []);

  const selectedBranch = branches?.find((b) => b.code === branchCode);

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

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      errors.phone = 'Enter a valid 10-digit mobile number';
    }

    if (!dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else if (dateOfBirth > maxAdultBirthDate()) {
      errors.dateOfBirth = 'You must be at least 18 years old';
    }

    if (address.trim().length < 10) {
      errors.address = 'Enter your full address (at least 10 characters)';
    }

    if (!branchCode) {
      errors.branchCode = 'Choose a home branch';
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
        phone: phone.trim(),
        dateOfBirth,
        address: address.trim(),
        branchCode,
        accountType,
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

  const label = (id: Field, text: string) => (
    <label htmlFor={id} className="block text-xs font-bold text-[#003366] mb-0.5">
      {text}
    </label>
  );

  const error = (id: Field) =>
    fieldErrors[id] && <p className="text-[10.5px] text-red-700 font-bold mt-0.5">{fieldErrors[id]}</p>;

  const field = (
    id: Field,
    text: string,
    type: string,
    value: string,
    onChange: (v: string) => void,
    autoComplete: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <div>
      {label(id, text)}
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="bank-input w-full"
        {...extra}
      />
      {error(id)}
    </div>
  );

  return (
    <div className="bank-page-container">
      <BankHeader />

      <main id="main-content" className="p-3 sm:p-6 bg-[#f4f7fa] flex-1">
        <div className="max-w-lg mx-auto">
          <div className="bank-panel-box shadow-sm">
            <div className="bank-panel-header py-2">
              <span>📝 Apply for a Bank Account</span>
            </div>

            <div className="p-4 bg-white">
              <p className="text-[11px] text-slate-600 mb-3">
                Fill in your details and choose a home branch. A bank officer reviews every application. Once
                approved you get your account number and your branch&apos;s IFSC code.
              </p>

              {generalError && (
                <div className="mb-3 p-2.5 bg-[#fff0f0] border border-[#cc0000] text-[#990000] text-xs font-semibold">
                  {generalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                <fieldset className="space-y-3 border border-[#ccd9e8] p-3">
                  <legend className="text-[11px] font-bold text-[#004c8f] px-1">Personal details</legend>
                  {field('name', 'Full name (as on ID proof)', 'text', name, setName, 'name')}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {field('phone', 'Mobile number', 'tel', phone, (v) => setPhone(v.replace(/\D/g, '').slice(0, 10)), 'tel', {
                      inputMode: 'numeric',
                      placeholder: '10 digits',
                    })}
                    {field('dateOfBirth', 'Date of birth', 'date', dateOfBirth, setDateOfBirth, 'bday', {
                      max: maxAdultBirthDate(),
                    })}
                  </div>
                  <div>
                    {label('address', 'Residential address')}
                    <textarea
                      id="address"
                      rows={2}
                      value={address}
                      autoComplete="street-address"
                      onChange={(e) => setAddress(e.target.value)}
                      className="bank-input w-full"
                    />
                    {error('address')}
                  </div>
                </fieldset>

                <fieldset className="space-y-3 border border-[#ccd9e8] p-3">
                  <legend className="text-[11px] font-bold text-[#004c8f] px-1">Account</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      {label('branchCode', 'Home branch')}
                      <select
                        id="branchCode"
                        value={branchCode}
                        onChange={(e) => setBranchCode(e.target.value)}
                        className="bank-input w-full"
                        disabled={!branches}
                      >
                        <option value="">{branches ? 'Select a branch' : 'Loading...'}</option>
                        {branches?.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.city} – {b.name}
                          </option>
                        ))}
                      </select>
                      {error('branchCode')}
                      {selectedBranch && (
                        <p className="text-[10.5px] text-slate-500 mt-0.5">
                          IFSC <span className="font-mono font-bold">{selectedBranch.ifsc}</span>
                        </p>
                      )}
                    </div>
                    <div>
                      {label('accountType', 'Account type')}
                      <select
                        id="accountType"
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value as AccountType)}
                        className="bank-input w-full"
                      >
                        <option value="SAVINGS">Savings account</option>
                        <option value="CURRENT">Current account</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-3 border border-[#ccd9e8] p-3">
                  <legend className="text-[11px] font-bold text-[#004c8f] px-1">NetBanking login</legend>
                  {field('email', 'Email (your login ID)', 'email', email, setEmail, 'email')}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {field('password', 'Password (8+ characters)', 'password', password, setPassword, 'new-password')}
                    {field('confirmPassword', 'Confirm password', 'password', confirmPassword, setConfirmPassword, 'new-password')}
                  </div>
                </fieldset>

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
                  {error('captcha')}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bank-btn w-full py-1.5 text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting application...' : 'Submit application'}
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
        title="Application Submitted"
        message="Your account application has been sent to the bank. A bank officer will review it, and once approved your account number and IFSC code will appear on your dashboard."
        confirmText="Go to dashboard"
        onConfirm={() => router.push('/dashboard')}
        onClose={() => router.push('/dashboard')}
      />
    </div>
  );
}
