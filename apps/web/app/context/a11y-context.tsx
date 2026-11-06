'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  A11ySettings,
  DEFAULT_SETTINGS,
  KeyboardMode,
  STORAGE_KEY,
  TYPABLE_INPUT_TYPES,
  defaultModeFor,
  htmlAttributes,
  parseSettings,
} from '../lib/a11y';
import { VirtualKeyboard } from '../components/VirtualKeyboard';

export type TypableField = HTMLInputElement | HTMLTextAreaElement;

export interface KeyboardSession {
  target: TypableField;
  mode: KeyboardMode;
  /** Seeds the key shuffle; new for every field the keyboard opens on. */
  seed: string;
}

interface A11yContextType {
  settings: A11ySettings;
  update: (patch: Partial<A11ySettings>) => void;
  reset: () => void;
  keyboard: KeyboardSession | null;
  openKeyboard: (field?: TypableField | null, mode?: KeyboardMode) => void;
  closeKeyboard: () => void;
  setKeyboardMode: (mode: KeyboardMode) => void;
  /** Reads text to screen-reader users (live region) and, if enabled, aloud. */
  announce: (text: string) => void;
  /** Speaks only when "read aloud" is on, unless `force` is set. */
  speak: (text: string, force?: boolean) => void;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

// Settings live in localStorage behind a tiny external store, so the server and
// the hydrating client both render the defaults and React then switches to the
// saved values without a hydration mismatch. `memory` covers blocked storage.
const listeners = new Set<() => void>();
let memory: string | null = null;
let cachedRaw: string | null | undefined;
let cachedSettings: A11ySettings = DEFAULT_SETTINGS;

function readSettings(): A11ySettings {
  let raw = memory;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // storage blocked: fall back to this tab's copy
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSettings = parseSettings(raw);
  }
  return cachedSettings;
}

function writeSettings(next: A11ySettings) {
  memory = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, memory);
  } catch {
    // keep the in-memory copy
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function isTypableField(el: EventTarget | null): el is TypableField {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && TYPABLE_INPUT_TYPES.includes(el.type);
}

/** The text a screen reader would announce for a control, roughly. */
export function accessibleName(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (text) return text;
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const label = el.labels?.[0]?.textContent?.trim() || el.closest('label')?.textContent?.trim();
    const name = label || el.getAttribute('placeholder') || el.title || 'text field';
    return el instanceof HTMLInputElement && el.type === 'password' ? `${name}, password field` : name;
  }
  return (el.getAttribute('title') || (el as HTMLElement).innerText || el.textContent || '').trim().slice(0, 140);
}

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(subscribe, readSettings, () => DEFAULT_SETTINGS);
  const [keyboard, setKeyboard] = useState<KeyboardSession | null>(null);
  const [liveText, setLiveText] = useState('');
  const lastField = useRef<TypableField | null>(null);
  const keyboardRef = useRef(keyboard);
  const speakRef = useRef(settings.speakOnFocus);

  useEffect(() => {
    keyboardRef.current = keyboard;
    speakRef.current = settings.speakOnFocus;
  });

  const update = useCallback((patch: Partial<A11ySettings>) => writeSettings({ ...readSettings(), ...patch }), []);
  const reset = useCallback(() => writeSettings({ ...DEFAULT_SETTINGS }), []);

  const speak = useCallback((text: string, force = false) => {
    if ((!speakRef.current && !force) || !text || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN';
    speechSynthesis.speak(u);
  }, []);

  const announce = useCallback(
    (text: string) => {
      // Clearing first makes screen readers repeat an identical message.
      setLiveText('');
      requestAnimationFrame(() => setLiveText(text));
      speak(text);
    },
    [speak]
  );

  const openKeyboard = useCallback(
    (field?: TypableField | null, mode?: KeyboardMode) => {
      const target =
        field ??
        (lastField.current?.isConnected ? lastField.current : null) ??
        Array.from(document.querySelectorAll('main input, main textarea')).find(
          (el): el is TypableField => isTypableField(el) && !el.disabled && !el.readOnly
        ) ??
        null;
      if (!target) {
        announce('There is no text field on this page to type into.');
        return;
      }
      setKeyboard({ target, mode: mode ?? defaultModeFor(target), seed: String(Math.random()) });
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    [announce]
  );

  const closeKeyboard = useCallback(() => setKeyboard(null), []);
  const setKeyboardMode = useCallback(
    (mode: KeyboardMode) => setKeyboard((k) => (k ? { ...k, mode } : k)),
    []
  );

  // Mirror the settings onto <html>, where globals.css picks them up.
  useEffect(() => {
    const root = document.documentElement;
    for (const [attr, value] of Object.entries(htmlAttributes(settings))) {
      if (value) root.setAttribute(attr, value);
      else root.removeAttribute(attr);
    }
    root.style.zoom = settings.textScale === 1 ? '' : String(settings.textScale);
  }, [settings]);

  // Follow focus: remember the last text field, retarget an open keyboard,
  // and read out what gained focus when speech is on.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element | null;
      if (!el || el.closest('#virtual-keyboard')) return;
      if (isTypableField(el)) {
        lastField.current = el;
        const open = keyboardRef.current;
        if (open && open.target !== el) {
          setKeyboard({ target: el, mode: defaultModeFor(el), seed: String(Math.random()) });
        }
      }
      if (speakRef.current) speak(accessibleName(el));
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [speak]);

  // Shortcuts: Alt+Shift+K toggles the keyboard, Alt+Shift+A opens the
  // accessibility menu, Alt+Shift+= / - change text size, Esc closes the keyboard.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && keyboardRef.current) {
        setKeyboard(null);
        return;
      }
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
      if (e.code === 'KeyK') {
        e.preventDefault();
        if (keyboardRef.current) setKeyboard(null);
        else openKeyboard(isTypableField(document.activeElement) ? document.activeElement : null);
      } else if (e.code === 'KeyA') {
        e.preventDefault();
        document.getElementById('a11y-menu-button')?.click();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openKeyboard]);

  // A field that unmounts (dialog closed, tab switched) takes the keyboard with it.
  useEffect(() => {
    if (!keyboard) return;
    const timer = window.setInterval(() => {
      if (!keyboard.target.isConnected) setKeyboard(null);
    }, 500);
    return () => window.clearInterval(timer);
  }, [keyboard]);

  // Stop phones from raising their own keyboard over ours.
  useEffect(() => {
    if (!keyboard) return;
    const el = keyboard.target;
    const previous = el.getAttribute('inputmode');
    el.setAttribute('inputmode', 'none');
    return () => {
      if (previous === null) el.removeAttribute('inputmode');
      else el.setAttribute('inputmode', previous);
    };
  }, [keyboard]);

  return (
    <A11yContext.Provider
      value={{ settings, update, reset, keyboard, openKeyboard, closeKeyboard, setKeyboardMode, announce, speak }}
    >
      {children}
      <VirtualKeyboard />
      <div className="sr-only" role="status" aria-live="polite">
        {liveText}
      </div>
    </A11yContext.Provider>
  );
}

export function useA11y() {
  const context = useContext(A11yContext);
  if (!context) throw new Error('useA11y must be used within an A11yProvider');
  return context;
}
