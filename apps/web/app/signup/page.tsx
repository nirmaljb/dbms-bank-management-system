'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { BankHeader } from '../components/BankHeader';
import { BankFooter } from '../components/BankFooter';
import { CaptchaBox } from '../components/CaptchaBox';
import { RetroDialog } from '../components/RetroDialog';

// Helper to generate a unique random 11-digit account number (starting with 30)
function generateRandomAccount(): string {
  const rand9 = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `30${rand9}`;
}

// Helper to generate a unique random 11-digit CIF number (starting with 89)
function generateRandomCif(): string {
  const rand9 = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `89${rand9}`;
}

export default function SignupPage() {
  const router = useRouter();
  const { user, loading: authLoading, signup } = useAuth();

  // Every new registration is assigned a unique random account number & CIF
  const [accountNumber, setAccountNumber] = useState('');
  const [cifNumber, setCifNumber] = useState('');
  const [branchCode, setBranchCode] = useState('00691');
  const [mobileNumber, setMobileNumber] = useState('');
  const [facilityType, setFacilityType] = useState('full');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [captchaInput, setCaptchaInput] = useState('');
  const [currentCaptcha, setCurrentCaptcha] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    accountNumber?: string;
    cifNumber?: string;
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    captcha?: string;
  }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Initialize random unique account and CIF on component mount
  useEffect(() => {
    setAccountNumber(generateRandomAccount());
    setCifNumber(generateRandomCif());
    const randMobile = '98' + Math.floor(10000000 + Math.random() * 90000000).toString();
    setMobileNumber(randMobile);
  }, []);

  const handleRegenerateAccount = useCallback(() => {
    setAccountNumber(generateRandomAccount());
    setCifNumber(generateRandomCif());
  }, []);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const validate = (): boolean => {
    const errors: {
      accountNumber?: string;
      cifNumber?: string;
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
      captcha?: string;
    } = {};

    if (!accountNumber || accountNumber.trim().length !== 11) {
      errors.accountNumber = 'Valid 11-digit account number must be generated';
    }

    if (!cifNumber || cifNumber.trim().length !== 11) {
      errors.cifNumber = 'Valid CIF Number must be generated';
    }

    if (!name.trim()) {
      errors.name = 'Customer Name as per passbook is mandatory';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Registered Email address is mandatory';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Login Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptedTerms) {
      errors.terms = 'You must accept the Internet Banking Terms & Conditions';
    }

    if (!captchaInput.trim() || captchaInput.trim() !== currentCaptcha) {
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
      const result = await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        accountNumber: accountNumber.trim(),
        cifNumber: cifNumber.trim(),
      });

      if (result.success) {
        setShowSuccessDialog(true);
      } else {
        setGeneralError(result.error || 'Registration failed. Please contact your home branch.');
      }
    } catch {
      setGeneralError('Communication failure with Core Banking System.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bank-page-container">
      <BankHeader />

      <main id="main-content" className="p-3 sm:p-4 bg-[#f4f7fa] flex-1">
        {/* Breadcrumb */}
        <div className="border border-[#b8cde4] bg-[#eef3f8] px-3 py-1.5 mb-3 text-[11px] text-[#003366] flex items-center justify-between">
          <div>
            <Link href="/" className="hover:underline font-semibold">
              Home
            </Link>
            <span className="mx-1.5 text-slate-400">&raquo;</span>
            <span className="font-bold text-slate-800">New User Registration / Self-Activation</span>
          </div>
          <div className="text-[10px] text-slate-600">Form: REG-NB-2026/V1</div>
        </div>

        {/* Advisory banner */}
        <div className="border border-[#eedd82] bg-[#fffdf0] p-3 mb-3 text-[11px] text-[#554000] shadow-xs">
          <strong className="text-[#8b0000]">ONLINE NEW ACCOUNT ALLOCATION POLICY:</strong>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[10.5px]">
            <li>
              Every new user is automatically assigned a <strong>unique 11-digit Account Number</strong> and <strong>CIF Number</strong> generated by the Core Banking System.
            </li>
            <li>Account numbers are securely system-allocated and cannot be manually keyed in by customers to prevent collision.</li>
            <li>Initial Savings Account will be activated with ₹50,000.00 opening balance upon submission.</li>
          </ul>
        </div>

        {/* Master Registration Panel */}
        <div className="bank-panel-box shadow-sm border border-[#004c8f]">
          <div className="bank-panel-header bg-gradient-to-r from-[#004c8f] to-[#002b4d] px-3 py-2 text-white font-bold text-xs">
            <span>📝 State Bank Internet Banking &ndash; Customer Self Registration Form</span>
          </div>

          <div className="p-4 bg-white">
            {generalError && (
              <div className="mb-3 p-2.5 bg-[#fff0f0] border border-[#cc0000] text-[#990000] text-xs font-semibold">
                ❌ {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Fieldset 1: Account Particulars */}
              <fieldset className="border border-[#99b4d1] p-3 bg-[#fbfcfe]">
                <legend className="px-2 font-bold text-[#003366] text-xs bg-white border border-[#99b4d1]">
                  Section A: Core Account Particulars (System Generated)
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-bold text-slate-800">
                        Account Number <span className="text-red-600">*</span>:
                      </label>
                      <span className="text-[10px] bg-[#e1f0fa] text-[#004c8f] border border-[#b8cde4] px-1.5 py-0.5 rounded font-bold">
                        ⚡ Randomly Generated
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={accountNumber}
                        readOnly
                        className="bank-input w-full font-mono font-bold bg-[#f4f6f8] text-[#003366] border-slate-300 cursor-not-allowed select-all"
                        title="Unique account number allocated by Core Banking System"
                      />
                      <button
                        type="button"
                        onClick={handleRegenerateAccount}
                        title="Generate another unique random account number"
                        className="px-2.5 py-1 text-xs bg-[#eef2f5] hover:bg-[#dbe8f5] border border-[#7f9db9] text-[#003366] font-semibold whitespace-nowrap active:bg-[#c8daf0]"
                      >
                        🎲 Re-roll
                      </button>
                    </div>
                    {fieldErrors.accountNumber ? (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5">{fieldErrors.accountNumber}</p>
                    ) : (
                      <p className="text-[9.5px] text-slate-500 mt-0.5">
                        Unique 11-digit account number auto-allocated for every new user.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] font-bold text-slate-800">
                        CIF Number (Customer Info File) <span className="text-red-600">*</span>:
                      </label>
                      <span className="text-[10px] bg-[#e1f0fa] text-[#004c8f] border border-[#b8cde4] px-1.5 py-0.5 rounded font-bold">
                        ⚡ Auto-Assigned
                      </span>
                    </div>
                    <input
                      type="text"
                      value={cifNumber}
                      readOnly
                      className="bank-input w-full font-mono font-bold bg-[#f4f6f8] text-[#003366] border-slate-300 cursor-not-allowed select-all"
                      title="System-assigned unique CIF number"
                    />
                    {fieldErrors.cifNumber ? (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5">{fieldErrors.cifNumber}</p>
                    ) : (
                      <p className="text-[9.5px] text-slate-500 mt-0.5">
                        Customer Information File record allocated automatically.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                      Branch Code (5-Digits):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={branchCode}
                        onChange={(e) => setBranchCode(e.target.value)}
                        placeholder="e.g. 00691"
                        className="bank-input w-24 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 self-center">
                        (Home Branch: CONNAUGHT PLACE, NEW DELHI)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                      Registered Mobile Number:
                    </label>
                    <div className="flex gap-1 items-center">
                      <span className="px-1.5 py-1 bg-slate-100 border border-slate-300 font-mono text-xs">+91</span>
                      <input
                        type="text"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="10-digit mobile"
                        className="bank-input flex-1 font-mono"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-1 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Facility Required:
                    </label>
                    <div className="flex flex-wrap gap-4 text-[11px]">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="facility"
                          value="full"
                          checked={facilityType === 'full'}
                          onChange={() => setFacilityType('full')}
                        />
                        <span className="font-semibold text-[#003366]">
                          Full Transaction Rights (Transfers, Bill Payments, FDs)
                        </span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="facility"
                          value="limited"
                          checked={facilityType === 'limited'}
                          onChange={() => setFacilityType('limited')}
                        />
                        <span>Limited Transaction Rights</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="facility"
                          value="view"
                          checked={facilityType === 'view'}
                          onChange={() => setFacilityType('view')}
                        />
                        <span>View Only Rights</span>
                      </label>
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Fieldset 2: User Login Profile */}
              <fieldset className="border border-[#99b4d1] p-3 bg-[#fbfcfe]">
                <legend className="px-2 font-bold text-[#003366] text-xs bg-white border border-[#99b4d1]">
                  Section B: NetBanking User Credentials
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                      Full Name of Account Holder <span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar Verma"
                      className="bank-input w-full"
                    />
                    {fieldErrors.name && (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                      Email Address (Login User ID) <span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ramesh@example.com"
                      className="bank-input w-full"
                    />
                    {fieldErrors.email && (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                      Set Login Password <span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="bank-input w-full"
                    />
                    {fieldErrors.password && (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-0.5">
                      Confirm Login Password <span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="bank-input w-full"
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Fieldset 3: Verification & Legal Agreement */}
              <fieldset className="border border-[#99b4d1] p-3 bg-[#fbfcfe]">
                <legend className="px-2 font-bold text-[#003366] text-xs bg-white border border-[#99b4d1]">
                  Section C: Security Verification &amp; Undertaking
                </legend>

                <div className="space-y-3 mt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Enter Verification Captcha <span className="text-red-600">*</span>:
                    </label>
                    <div className="space-y-2">
                      <CaptchaBox onCaptchaGenerated={(code) => setCurrentCaptcha(code)} />
                      <input
                        type="text"
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="Enter captcha text"
                        className="bank-input w-48 font-mono font-bold"
                        autoComplete="off"
                      />
                      {fieldErrors.captcha && (
                        <p className="text-[10px] text-red-600 font-bold">{fieldErrors.captcha}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        I have read, understood and agree to be bound by the Terms and Conditions of Internet Banking Services of the Bank as displayed on the portal. I declare that all details furnished above are true and match my Bank account records.
                      </span>
                    </label>
                    {fieldErrors.terms && (
                      <p className="text-[10px] text-red-600 font-bold mt-0.5">{fieldErrors.terms}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-300 flex items-center justify-end gap-2">
                <Link
                  href="/login"
                  className="bank-btn-secondary px-4 py-1.5 text-xs"
                >
                  Cancel / Return to Login
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bank-btn px-6 py-1.5 text-xs font-bold bg-[#004c8f] text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering with CBS...' : 'Submit Registration »'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <BankFooter />

      {/* Success Dialog */}
      <RetroDialog
        isOpen={showSuccessDialog}
        title="Online Registration Successful"
        message={`Online Registration Successful!\n\nWelcome, ${name}!\nYour new bank account has been opened and registered in Core Banking.\n\nAssigned Account Number: ${accountNumber}\nAssigned CIF Number: ${cifNumber}\n\nYour Internet Banking credentials are now active.\nClick below to proceed to your secure dashboard.`}
        confirmText="Proceed to Dashboard »"
        onConfirm={() => router.push('/dashboard')}
        onClose={() => router.push('/dashboard')}
      />
    </div>
  );
}
