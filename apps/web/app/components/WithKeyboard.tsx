'use client';

import React, { useId, useRef } from 'react';
import { isTypableField, useA11y } from '../context/a11y-context';

/** Keyboard pictogram; the ⌨ glyph renders as a dot in several system fonts. */
export function KeyboardIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 20 14" aria-hidden="true" focusable="false">
      <rect x="0.75" y="0.75" width="18.5" height="12.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 4.5h1.5M7.25 4.5h1.5M10.5 4.5h1.5M13.75 4.5h1.5M4 7h1.5M7.25 7h1.5M10.5 7h1.5M13.75 7h1.5M6 9.75h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Wraps a text field and adds a button beside it that opens the on-screen
 * keyboard on that field (numpad for numeric fields). The button hides when
 * the user turns "keyboard buttons" off in the accessibility menu.
 */
export function WithKeyboard({
  children,
  numeric = false,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  numeric?: boolean;
  /** Mirror the field's own disabled state. */
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const { settings, keyboard, openKeyboard, closeKeyboard } = useA11y();
  const isOpen = keyboard?.target.closest('[data-kb-field]')?.getAttribute('data-kb-field') === id;

  const toggle = () => {
    const field = ref.current?.querySelector('input, textarea');
    if (!isTypableField(field ?? null)) return;
    if (isOpen) closeKeyboard();
    else openKeyboard(field as HTMLInputElement, numeric ? 'numpad' : 'text');
  };

  return (
    <div ref={ref} data-kb-field={id} className={`a11y-kb-field ${className}`}>
      {children}
      {settings.keyboardButtons && (
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls="virtual-keyboard"
          aria-label={`${isOpen ? 'Close' : 'Open'} on-screen ${numeric ? 'numpad' : 'keyboard'}`}
          title={`${numeric ? 'Numpad' : 'On-screen keyboard'} (Alt+Shift+K)`}
          className={`a11y-kb-btn ${isOpen ? 'is-open' : ''}`}
        >
          {numeric ? <span className="text-[9px] font-extrabold tracking-tight">123</span> : <KeyboardIcon />}
        </button>
      )}
    </div>
  );
}
