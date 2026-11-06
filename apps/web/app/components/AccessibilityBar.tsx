'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useA11y } from '../context/a11y-context';
import { KeyboardIcon } from './WithKeyboard';
import { TEXT_SCALES, stepTextScale, type A11ySettings } from '../lib/a11y';

// The thin strip above the bank header, in the style of Indian government and
// bank portals: skip link, A− A A+ text size, contrast, the on-screen keyboard
// and a menu with the rest of the reading and input options.

type Toggle = { key: keyof A11ySettings; label: string; hint: string };

const TOGGLES: { group: string; items: Toggle[] }[] = [
  {
    group: 'Reading',
    items: [
      { key: 'highContrast', label: 'High contrast', hint: 'Yellow and white on black' },
      { key: 'readableFont', label: 'Readable font', hint: 'Wider, clearer letters' },
      { key: 'wideSpacing', label: 'Wider line spacing', hint: 'More room between lines' },
      { key: 'underlineLinks', label: 'Underline links', hint: 'Spot links without colour' },
      { key: 'speakOnFocus', label: 'Read aloud', hint: 'Speak each field and button as you reach it' },
    ],
  },
  {
    group: 'Navigation',
    items: [
      { key: 'strongFocus', label: 'Strong focus outline', hint: 'Thick ring around the focused item' },
      { key: 'bigCursor', label: 'Large mouse pointer', hint: 'Easier to follow on screen' },
      { key: 'reduceMotion', label: 'Reduce motion', hint: 'Turn off animations' },
    ],
  },
  {
    group: 'Typing',
    items: [
      { key: 'keyboardButtons', label: 'Keyboard button beside fields', hint: 'Keyboard or 123 button next to every text box' },
      { key: 'shuffleKeys', label: 'Shuffle keys for passwords', hint: 'Random key order defeats screen loggers' },
    ],
  },
];

const SHORTCUTS: [string, string][] = [
  ['Alt + Shift + K', 'Open or close the on-screen keyboard'],
  ['Alt + Shift + A', 'Open this accessibility menu'],
  ['Esc', 'Close the keyboard or this menu'],
  ['Tab / Shift + Tab', 'Move between fields and buttons'],
];

export function AccessibilityBar() {
  const { settings, update, reset, keyboard, openKeyboard, closeKeyboard, announce, speak } = useA11y();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const setScale = (textScale: number) => {
    update({ textScale });
    announce(`Text size ${Math.round(textScale * 100)} percent`);
  };

  const toggle = (item: Toggle) => {
    const on = !settings[item.key];
    update({ [item.key]: on });
    // Speak the confirmation even when this click is what turns speech off.
    if (item.key === 'speakOnFocus') speak(on ? 'Read aloud on' : 'Read aloud off', true);
    announce(`${item.label} ${on ? 'on' : 'off'}`);
  };

  // Close on Escape or a click outside, and hand focus back to the button.
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  const sizeBtn = (label: string, aria: string, onClick: () => void, opts: { active?: boolean; disabled?: boolean; size: string }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      aria-pressed={opts.active}
      disabled={opts.disabled}
      className={`a11y-bar-btn ${opts.size} ${opts.active ? 'is-active' : ''}`}
    >
      {label}
    </button>
  );

  const minScale = TEXT_SCALES[0];
  const maxScale = TEXT_SCALES[TEXT_SCALES.length - 1];

  return (
    <div className="a11y-bar" role="region" aria-label="Accessibility options">
      <a href="#main-content" className="a11y-bar-link">
        Skip to main content
      </a>

      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <span className="a11y-bar-label" id="a11y-text-size-label">
          Text size
        </span>
        <span role="group" aria-labelledby="a11y-text-size-label" className="flex items-center gap-0.5">
          {sizeBtn('A−', 'Decrease text size', () => setScale(stepTextScale(settings.textScale, -1)), {
            disabled: settings.textScale === minScale,
            size: 'text-[10px]',
          })}
          {sizeBtn('A', 'Default text size', () => setScale(1), { active: settings.textScale === 1, size: 'text-[12px]' })}
          {sizeBtn('A+', 'Increase text size', () => setScale(stepTextScale(settings.textScale, 1)), {
            disabled: settings.textScale === maxScale,
            size: 'text-[14px]',
          })}
        </span>
        <span className="a11y-bar-value" aria-hidden>
          {Math.round(settings.textScale * 100)}%
        </span>

        <span className="a11y-bar-sep" aria-hidden />

        <button
          type="button"
          onClick={() => toggle(TOGGLES[0]!.items[0]!)}
          aria-pressed={settings.highContrast}
          className={`a11y-bar-btn ${settings.highContrast ? 'is-active' : ''}`}
          title="High contrast"
        >
          <span aria-hidden>◐</span> Contrast
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => (keyboard ? closeKeyboard() : openKeyboard())}
          aria-pressed={!!keyboard}
          aria-controls="virtual-keyboard"
          className={`a11y-bar-btn ${keyboard ? 'is-active' : ''}`}
          title="On-screen keyboard (Alt+Shift+K)"
        >
          <KeyboardIcon size={13} /> Keyboard
        </button>

        <div className="relative">
          <button
            id="a11y-menu-button"
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="a11y-menu"
            className={`a11y-bar-btn ${menuOpen ? 'is-active' : ''}`}
            title="Accessibility menu (Alt+Shift+A)"
          >
            <span aria-hidden>♿</span> Accessibility <span aria-hidden>▾</span>
          </button>

          {menuOpen && (
            <div id="a11y-menu" ref={menuRef} role="dialog" aria-label="Accessibility settings" className="a11y-menu">
              <div className="bank-panel-header">
                <span>♿ Accessibility settings</span>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    buttonRef.current?.focus();
                  }}
                  aria-label="Close accessibility settings"
                  className="a11y-menu-close"
                >
                  ✕
                </button>
              </div>

              <div className="a11y-menu-body">
                {TOGGLES.map(({ group, items }) => (
                  <fieldset key={group} className="a11y-menu-group">
                    <legend>{group}</legend>
                    {items.map((item) => (
                      <label key={item.key} className="a11y-menu-item">
                        <input type="checkbox" checked={settings[item.key] === true} onChange={() => toggle(item)} />
                        <span>
                          <span className="block font-bold">{item.label}</span>
                          <span className="block text-[10.5px] text-slate-500">{item.hint}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}

                <fieldset className="a11y-menu-group">
                  <legend>Keyboard shortcuts</legend>
                  <dl className="a11y-shortcuts">
                    {SHORTCUTS.map(([keys, what]) => (
                      <React.Fragment key={keys}>
                        <dt>
                          <kbd>{keys}</kbd>
                        </dt>
                        <dd>{what}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </fieldset>
              </div>

              <div className="a11y-menu-footer">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    announce('Accessibility settings reset to default');
                  }}
                  className="bank-btn-secondary"
                >
                  Reset to default
                </button>
                <span className="text-[10.5px] text-slate-500">Saved on this device</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
