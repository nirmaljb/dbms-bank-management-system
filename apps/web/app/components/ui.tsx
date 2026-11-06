'use client';

import React, { useEffect, useState } from 'react';
import { WithKeyboard } from './WithKeyboard';

// Small building blocks shared by the customer dashboard and admin console,
// styled with the retro classes in globals.css.

export function Panel({
  title,
  right,
  children,
  tone = 'primary',
  className = '',
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'primary' | 'secondary' | 'admin' | 'danger';
  className?: string;
}) {
  const header =
    tone === 'secondary'
      ? 'bank-panel-header-secondary flex items-center justify-between'
      : `bank-panel-header ${
          tone === 'admin'
            ? 'bg-gradient-to-r from-[#4a235a] to-[#2b1236]'
            : tone === 'danger'
              ? 'bg-gradient-to-r from-[#8b0000] to-[#590000]'
              : ''
        }`;
  return (
    <div className={`bank-panel-box shadow-xs ${className}`}>
      <div className={header}>
        <span>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-[#e6f4e6] text-[#006600] border-[#8fc98f]',
  COMPLETED: 'bg-[#e6f4e6] text-[#006600] border-[#8fc98f]',
  PAID: 'bg-[#e6f4e6] text-[#006600] border-[#8fc98f]',
  CLOSED: 'bg-[#eef2f6] text-[#334155] border-[#b8c4d2]',
  PENDING: 'bg-[#fff8e6] text-[#8a5a00] border-[#f0c86e]',
  DUE: 'bg-[#fff8e6] text-[#8a5a00] border-[#f0c86e]',
  REVERSED: 'bg-[#f3e8f8] text-[#5b2a72] border-[#c9a3dc]',
  FROZEN: 'bg-[#e6effa] text-[#004c8f] border-[#99b4d1]',
  REJECTED: 'bg-[#fff0f0] text-[#990000] border-[#e0a0a0]',
  MISSED: 'bg-[#fff0f0] text-[#990000] border-[#e0a0a0]',
  DEFAULTED: 'bg-[#a30000] text-white border-[#800000]',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block border px-1.5 py-px text-[10px] font-bold tracking-wide ${
        STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-300'
      }`}
    >
      {status === 'FROZEN' ? '❄ FROZEN' : status}
    </span>
  );
}

export type Flash = { kind: 'success' | 'error' | 'info'; text: string } | null;

export function FlashMessage({ flash, onClose }: { flash: Flash; onClose?: () => void }) {
  if (!flash) return null;
  const styles = {
    success: 'bg-[#effaef] border-[#2e8b2e] text-[#004d00]',
    error: 'bg-[#fff0f0] border-[#cc0000] text-[#990000]',
    info: 'bg-[#fffdf0] border-[#eedd82] text-[#554000]',
  }[flash.kind];
  const icon = { success: '✅', error: '❌', info: 'ℹ️' }[flash.kind];
  return (
    <div className={`mb-3 p-2.5 border-2 text-xs font-semibold flex items-start gap-2 ${styles}`}>
      <span>{icon}</span>
      <span className="flex-1 whitespace-pre-line">{flash.text}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="text-[10px] underline bg-transparent border-0 cursor-pointer">
          dismiss
        </button>
      )}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'warn' | 'danger' | 'good';
  onClick?: () => void;
}) {
  const color = {
    default: 'text-[#003366]',
    warn: 'text-[#8a5a00]',
    danger: 'text-[#a30000]',
    good: 'text-[#006600]',
  }[tone];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`border border-[#b8cde4] bg-[#f7fafd] p-2.5 text-left w-full ${
        onClick ? 'hover:bg-[#eef5fc] cursor-pointer' : ''
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{label}</div>
      <div className={`text-lg font-extrabold font-mono ${color}`}>{value}</div>
      {hint && <div className="text-[10px] text-slate-500">{hint}</div>}
    </Tag>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-slate-500 py-4 italic">
        {text}
      </td>
    </tr>
  );
}

export function LoadingRow({ colSpan }: { colSpan: number }) {
  return <EmptyRow colSpan={colSpan} text="Loading..." />;
}

/** Restricts an input to digits with at most two decimal places. */
export function sanitizeAmount(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : (whole ?? '');
}

export function AmountInput({
  value,
  onChange,
  id,
  placeholder = '0.00',
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  placeholder?: string;
}) {
  return (
    <WithKeyboard numeric>
      <div className="flex items-center">
        <span className="px-2 py-[3px] bg-[#eef2f6] border border-r-0 border-[#7f9db9] font-bold text-xs">₹</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(sanitizeAmount(e.target.value))}
          placeholder={placeholder}
          className="bank-input w-full font-mono"
          autoComplete="off"
        />
      </div>
    </WithKeyboard>
  );
}

/**
 * Confirmation dialog with an optional text field, in the same retro style
 * as RetroDialog. Used for reasons (reject, reverse) and confirmations.
 */
export function PromptDialog({
  isOpen,
  title,
  message,
  inputLabel,
  confirmText = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  inputLabel?: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: (input: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) setValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white border-2 border-[#004c8f] shadow-2xl">
        <div className="bg-gradient-to-r from-[#004c8f] via-[#003366] to-[#002244] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold">
          <span>{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center bg-[#8b0000] hover:bg-[#aa0000] text-white border border-white/40 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(value.trim());
          }}
        >
          <div className="p-4 bg-[#fbfcfe] text-slate-800 text-[11.5px] leading-relaxed border-b border-[#ccd9e8] space-y-3">
            <div className="whitespace-pre-line">{message}</div>
            {inputLabel && (
              <label className="block">
                <span className="block font-bold text-[#003366] mb-1">{inputLabel}</span>
                <WithKeyboard>
                  <input
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    maxLength={300}
                    className="bank-input w-full"
                  />
                </WithKeyboard>
              </label>
            )}
          </div>
          <div className="bg-[#eef3f8] px-3 py-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="bank-btn-secondary px-4 py-1 text-xs">
              Cancel
            </button>
            <button type="submit" className={`${danger ? 'bank-btn-danger' : 'bank-btn'} px-5 py-1 text-xs`}>
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TxnAmount({ direction, amount }: { direction: 'CR' | 'DR'; amount: string }) {
  return (
    <span className={`font-mono font-bold ${direction === 'CR' ? 'text-[#006600]' : 'text-[#a30000]'}`}>
      {direction === 'CR' ? '+' : '−'}
      {Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}
