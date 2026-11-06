'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { accessibleName, useA11y, type KeyboardSession, type TypableField } from '../context/a11y-context';
import { applyKey, shuffled, type KeyAction } from '../lib/a11y';
import { seededRandom } from '../lib/captcha';
import { KeyboardIcon } from './WithKeyboard';

// On-screen keyboard docked to the bottom (or top) of the window. It types into
// whichever text field has focus, so mouse, touch and switch users can fill
// every form without a physical keyboard. Like a bank's login keypad, it can
// shuffle its keys for password fields so screen loggers learn nothing.

const TEXT_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

const SHIFTED: Record<string, string> = {
  '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
  '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?',
};

const NUM_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0'],
];

const isDigit = (k: string) => /^\d$/.test(k);
const isLetter = (k: string) => /^[a-z]$/.test(k);

/** Shuffles digits among digit slots and letters among letter slots. */
function shuffleRows(rows: string[][], seed: string): string[][] {
  const rand = seededRandom(seed);
  const flat = rows.flat();
  const digits = shuffled(flat.filter(isDigit), rand);
  const letters = shuffled(flat.filter(isLetter), rand);
  return rows.map((row) => row.map((k) => (isDigit(k) ? digits.shift()! : isLetter(k) ? letters.shift()! : k)));
}

/** Sets a field's value the way typing would, so React's onChange runs. */
function setNativeValue(el: TypableField, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// Keys keep focus in the field: pointer-down would otherwise blur it.
const preventBlur = (e: React.PointerEvent) => e.preventDefault();

function Key({
  label,
  onPress,
  aria,
  grow = 1,
  pressed,
  tone = 'char',
}: {
  label: React.ReactNode;
  onPress: () => void;
  aria?: string;
  grow?: number;
  pressed?: boolean;
  tone?: 'char' | 'fn' | 'go';
}) {
  return (
    <button
      type="button"
      onPointerDown={preventBlur}
      onClick={onPress}
      aria-label={aria}
      aria-pressed={pressed}
      className={`vk-key vk-key-${tone}`}
      style={{ flexGrow: grow }}
    >
      {label}
    </button>
  );
}

export function VirtualKeyboard() {
  const { keyboard } = useA11y();
  if (!keyboard) return null;
  // Remount per field so Shift/Caps never carry over to the next field.
  return <KeyboardPanel key={keyboard.seed} session={keyboard} />;
}

function KeyboardPanel({ session }: { session: KeyboardSession }) {
  const { settings, update, closeKeyboard, setKeyboardMode, speak } = useA11y();
  const { target, mode, seed } = session;
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isPassword = target instanceof HTMLInputElement && target.type === 'password';
  const shuffle = isPassword && settings.shuffleKeys;
  const fieldName = useMemo(() => accessibleName(target), [target]);
  const textRows = useMemo(() => (shuffle ? shuffleRows(TEXT_ROWS, seed) : TEXT_ROWS), [shuffle, seed]);
  const numRows = useMemo(() => (shuffle ? shuffleRows(NUM_ROWS, seed) : NUM_ROWS), [shuffle, seed]);
  const dock = settings.keyboardDock;

  // Reserve room under (or over) the page so the keyboard never hides the
  // last field, the way a phone keyboard pushes content up.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const side = dock === 'top' ? 'paddingTop' : 'paddingBottom';
    const observer = new ResizeObserver(() => {
      document.body.style[side] = `${panel.offsetHeight}px`;
    });
    observer.observe(panel);
    return () => {
      observer.disconnect();
      document.body.style[side] = '';
    };
  }, [dock]);

  const press = (action: KeyAction, spoken?: string) => {
    if (!target.isConnected) return closeKeyboard();
    if (target.disabled || target.readOnly) return;
    // email/number inputs expose no selection; treat the caret as at the end.
    const value = target.value;
    const start = target.selectionStart ?? value.length;
    const end = target.selectionEnd ?? value.length;
    const result = applyKey(value, start, end, action, target.maxLength);
    if (result.value !== value) setNativeValue(target, result.value);
    target.focus({ preventScroll: true });
    // React re-renders the controlled field (and may sanitise it) after this
    // handler returns, so place the caret once that has happened.
    queueMicrotask(() => {
      const caret = Math.min(result.caret, target.value.length);
      try {
        target.setSelectionRange(caret, caret);
      } catch {
        // email inputs do not support selection ranges
      }
    });
    if (spoken) speak(isPassword && action.type === 'insert' ? 'star' : spoken);
  };

  const charLabel = (k: string) =>
    isLetter(k) ? (shift !== caps ? k.toUpperCase() : k) : shift ? (SHIFTED[k] ?? k) : k;

  const typeChar = (k: string) => {
    const ch = charLabel(k);
    press({ type: 'insert', text: ch }, ch === ' ' ? 'space' : ch);
    if (shift) setShift(false);
  };

  const enter = () => {
    if (target instanceof HTMLTextAreaElement) return press({ type: 'insert', text: '\n' }, 'new line');
    const form = target.form;
    closeKeyboard();
    form?.requestSubmit();
  };

  return (
    <div
      id="virtual-keyboard"
      ref={panelRef}
      role="group"
      aria-label={`On-screen keyboard, typing into ${fieldName}`}
      className={`vk-panel vk-dock-${dock}`}
    >
      <div className="vk-titlebar">
        <span className="truncate">
          <KeyboardIcon size={13} /> On-screen keyboard <span className="vk-target">· typing into “{fieldName}”</span>
          {shuffle && <span className="vk-badge">Keys shuffled for security</span>}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onPointerDown={preventBlur}
            onClick={() => setKeyboardMode(mode === 'text' ? 'numpad' : 'text')}
            className="vk-title-btn"
          >
            {mode === 'text' ? '123 Numpad' : 'ABC Keyboard'}
          </button>
          {isPassword && (
            <button
              type="button"
              onPointerDown={preventBlur}
              onClick={() => update({ shuffleKeys: !settings.shuffleKeys })}
              aria-pressed={settings.shuffleKeys}
              className="vk-title-btn"
            >
              🔀 Shuffle
            </button>
          )}
          <button
            type="button"
            onPointerDown={preventBlur}
            onClick={() => update({ keyboardDock: dock === 'top' ? 'bottom' : 'top' })}
            className="vk-title-btn"
            aria-label={dock === 'top' ? 'Move keyboard to bottom of screen' : 'Move keyboard to top of screen'}
            title="Move keyboard"
          >
            {dock === 'top' ? '⬇' : '⬆'} Move
          </button>
          <button
            type="button"
            onClick={closeKeyboard}
            className="vk-title-btn vk-close"
            aria-label="Close on-screen keyboard"
          >
            ✕
          </button>
        </span>
      </div>

      {mode === 'text' ? (
        <div className="vk-body">
          <div className="vk-row">
            {textRows[0]!.map((k, i) => (
              <Key key={i} label={charLabel(k)} onPress={() => typeChar(k)} />
            ))}
            <Key label="⌫ Back" aria="Backspace" grow={2} tone="fn" onPress={() => press({ type: 'backspace' }, 'backspace')} />
          </div>
          <div className="vk-row">
            <Key label="Del" aria="Delete" grow={1.5} tone="fn" onPress={() => press({ type: 'delete' }, 'delete')} />
            {textRows[1]!.map((k, i) => (
              <Key key={i} label={charLabel(k)} onPress={() => typeChar(k)} />
            ))}
          </div>
          <div className="vk-row">
            <Key
              label="Caps"
              aria="Caps Lock"
              grow={1.8}
              tone="fn"
              pressed={caps}
              onPress={() => {
                setCaps(!caps);
                speak(caps ? 'caps lock off' : 'caps lock on');
              }}
            />
            {textRows[2]!.map((k, i) => (
              <Key key={i} label={charLabel(k)} onPress={() => typeChar(k)} />
            ))}
            <Key label="Enter ↵" aria="Enter" grow={2.2} tone="go" onPress={enter} />
          </div>
          <div className="vk-row">
            <Key label="⇧ Shift" aria="Shift" grow={2.4} tone="fn" pressed={shift} onPress={() => setShift(!shift)} />
            {textRows[3]!.map((k, i) => (
              <Key key={i} label={charLabel(k)} onPress={() => typeChar(k)} />
            ))}
            <Key label="⇧ Shift" aria="Shift" grow={2.4} tone="fn" pressed={shift} onPress={() => setShift(!shift)} />
          </div>
          <div className="vk-row">
            <Key label="@" onPress={() => press({ type: 'insert', text: '@' }, 'at')} />
            <Key label=".com" grow={1.5} onPress={() => press({ type: 'insert', text: '.com' }, 'dot com')} />
            <Key label="Space" aria="Space" grow={7} onPress={() => typeChar(' ')} />
            <Key label="◀" aria="Move cursor left" tone="fn" onPress={() => press({ type: 'left' }, 'left')} />
            <Key label="▶" aria="Move cursor right" tone="fn" onPress={() => press({ type: 'right' }, 'right')} />
            <Key label="Clear" aria="Clear field" grow={1.5} tone="fn" onPress={() => press({ type: 'clear' }, 'cleared')} />
          </div>
        </div>
      ) : (
        <div className="vk-body vk-numpad">
          <div className="vk-numgrid">
            {numRows.flat().map((k, i) => (
              <Key key={i} label={k} onPress={() => press({ type: 'insert', text: k }, k === '.' ? 'point' : k)} />
            ))}
            <Key label="⌫" aria="Backspace" tone="fn" onPress={() => press({ type: 'backspace' }, 'backspace')} />
          </div>
          <div className="vk-numside">
            <Key label="Clear" aria="Clear field" tone="fn" onPress={() => press({ type: 'clear' }, 'cleared')} />
            <div className="vk-row">
              <Key label="◀" aria="Move cursor left" tone="fn" onPress={() => press({ type: 'left' }, 'left')} />
              <Key label="▶" aria="Move cursor right" tone="fn" onPress={() => press({ type: 'right' }, 'right')} />
            </div>
            <Key label="Enter ↵" aria="Enter" tone="go" onPress={enter} />
          </div>
        </div>
      )}
    </div>
  );
}
