'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WithKeyboard } from './WithKeyboard';
import { setPinPrompt } from '../lib/api';
import { useAuth } from '../context/auth-context';

// Every user starts with this PIN (DEFAULT_PIN on the server) until they set their own.
export const DEFAULT_PIN = '1234';

const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

function PinField({
  id,
  value,
  onChange,
  autoFocus = false,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <WithKeyboard numeric className="max-w-[10rem]">
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(onlyDigits(e.target.value))}
        placeholder="••••"
        className="bank-input w-full font-mono text-center tracking-[0.5em]"
      />
    </WithKeyboard>
  );
}

function DialogFrame({
  title,
  onClose,
  onSubmit,
  submitText,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm bg-white border-2 border-[#004c8f] shadow-2xl">
        <div className="bg-gradient-to-r from-[#004c8f] via-[#003366] to-[#002244] text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold">
          <span>{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-5 h-5 flex items-center justify-center bg-[#8b0000] hover:bg-[#aa0000] text-white border border-white/40 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          noValidate
        >
          <div className="p-4 bg-[#fbfcfe] text-slate-800 text-[11.5px] leading-relaxed border-b border-[#ccd9e8] space-y-3">
            {children}
          </div>
          <div className="bg-[#eef3f8] px-3 py-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="bank-btn-secondary px-4 py-1 text-xs">
              Cancel
            </button>
            <button type="submit" className="bank-btn px-5 py-1 text-xs">
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="alert" className="p-2 border-2 border-[#cc0000] bg-[#fff0f0] text-[#990000] font-semibold">
      {text}
    </div>
  );
}

/**
 * Shows the PIN dialog whenever the API asks for the PIN before an action,
 * and hands the entered PIN back to the request that is waiting for it.
 */
export function PinPromptProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const resolver = useRef<((pin: string | null) => void) | null>(null);

  const finish = useCallback((value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpen(false);
    setPin('');
  }, []);

  useEffect(() => {
    setPinPrompt(
      (refused) =>
        new Promise<string | null>((resolve) => {
          resolver.current?.(null);
          resolver.current = resolve;
          setPin('');
          setError(refused ?? null);
          setOpen(true);
        })
    );
    return () => setPinPrompt(null);
  }, []);

  return (
    <>
      {children}
      {open && (
        <DialogFrame
          title="🔒 Enter your PIN"
          submitText="Confirm"
          onClose={() => finish(null)}
          onSubmit={() => {
            if (pin.length !== 4) {
              setError('Enter your 4-digit PIN.');
              return;
            }
            finish(pin);
          }}
        >
          <p className="m-0">Enter your 4-digit PIN to authorise this action.</p>
          <ErrorLine text={error} />
          <label htmlFor="pin-prompt" className="block font-bold text-[#003366]">
            PIN:
          </label>
          <PinField id="pin-prompt" value={pin} onChange={setPin} autoFocus />
          {user?.pinIsDefault && (
            <p className="m-0 text-slate-500">
              You have not set your own PIN yet. Your PIN is the default PIN <b className="font-mono">{DEFAULT_PIN}</b>.
            </p>
          )}
        </DialogFrame>
      )}
    </>
  );
}

/** Lets the signed-in user replace their PIN (the default one at first). */
export function ChangePinDialog({ isOpen, onClose }: { isOpen: boolean; onClose: (changed: boolean) => void }) {
  const { changePin } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async () => {
    if (current.length !== 4 || next.length !== 4) {
      setError('PINs are exactly 4 digits.');
      return;
    }
    if (next !== confirm) {
      setError('The new PIN and its confirmation do not match.');
      return;
    }
    setBusy(true);
    const res = await changePin(current, next);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? 'Could not change the PIN.');
      return;
    }
    onClose(true);
  };

  return (
    <DialogFrame title="🔑 Change PIN" submitText={busy ? 'Saving...' : 'Change PIN'} onClose={() => onClose(false)} onSubmit={submit}>
      <p className="m-0">
        Your PIN is asked before every action. If you have never changed it, your current PIN is the default PIN{' '}
        <b className="font-mono">{DEFAULT_PIN}</b>.
      </p>
      <ErrorLine text={error} />
      <div className="grid grid-cols-[8rem_1fr] gap-2 items-center">
        <label htmlFor="pin-current" className="font-bold text-[#003366]">
          Current PIN:
        </label>
        <PinField id="pin-current" value={current} onChange={setCurrent} autoFocus />
        <label htmlFor="pin-new" className="font-bold text-[#003366]">
          New PIN:
        </label>
        <PinField id="pin-new" value={next} onChange={setNext} />
        <label htmlFor="pin-confirm" className="font-bold text-[#003366]">
          Confirm new PIN:
        </label>
        <PinField id="pin-confirm" value={confirm} onChange={setConfirm} />
      </div>
    </DialogFrame>
  );
}
