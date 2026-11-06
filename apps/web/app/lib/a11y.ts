// Accessibility preferences and the pure editing logic behind the on-screen
// keyboard. Kept free of React and the DOM so it can be unit tested.

export const TEXT_SCALES = [0.9, 1, 1.15, 1.3, 1.5, 1.75] as const;

export interface A11ySettings {
  /** Page zoom factor, one of TEXT_SCALES. */
  textScale: number;
  highContrast: boolean;
  readableFont: boolean;
  wideSpacing: boolean;
  underlineLinks: boolean;
  strongFocus: boolean;
  bigCursor: boolean;
  reduceMotion: boolean;
  /** Read out the name of each field or button as it receives focus. */
  speakOnFocus: boolean;
  /** Show a keyboard button beside each text field. */
  keyboardButtons: boolean;
  /** Randomise key positions while typing into password fields. */
  shuffleKeys: boolean;
  keyboardDock: 'bottom' | 'top';
}

export const DEFAULT_SETTINGS: A11ySettings = {
  textScale: 1,
  highContrast: false,
  readableFont: false,
  wideSpacing: false,
  underlineLinks: false,
  strongFocus: false,
  bigCursor: false,
  reduceMotion: false,
  speakOnFocus: false,
  keyboardButtons: true,
  shuffleKeys: false,
  keyboardDock: 'bottom',
};

export const STORAGE_KEY = 'bnb.a11y';

/** Merges stored JSON over the defaults, dropping unknown or mistyped keys. */
export function parseSettings(raw: string | null): A11ySettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };
  const out: A11ySettings = { ...DEFAULT_SETTINGS };
  const src = stored as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof A11ySettings)[]) {
    if (typeof src[key] === typeof DEFAULT_SETTINGS[key]) {
      (out as unknown as Record<string, unknown>)[key] = src[key];
    }
  }
  if (!(TEXT_SCALES as readonly number[]).includes(out.textScale)) out.textScale = 1;
  if (out.keyboardDock !== 'top') out.keyboardDock = 'bottom';
  return out;
}

/** Moves one step up or down TEXT_SCALES, staying within its ends. */
export function stepTextScale(current: number, direction: 1 | -1): number {
  const i = TEXT_SCALES.indexOf(current as (typeof TEXT_SCALES)[number]);
  const from = i === -1 ? TEXT_SCALES.indexOf(1) : i;
  const next = Math.min(TEXT_SCALES.length - 1, Math.max(0, from + direction));
  return TEXT_SCALES[next]!;
}

// Boolean settings that globals.css styles through a data attribute on <html>.
const HTML_FLAGS: [keyof A11ySettings, string, string][] = [
  ['highContrast', 'data-a11y-contrast', 'high'],
  ['readableFont', 'data-a11y-font', 'readable'],
  ['wideSpacing', 'data-a11y-spacing', 'wide'],
  ['underlineLinks', 'data-a11y-links', 'underline'],
  ['strongFocus', 'data-a11y-focus', 'strong'],
  ['bigCursor', 'data-a11y-cursor', 'big'],
  ['reduceMotion', 'data-a11y-motion', 'reduce'],
];

/** Attributes to set on <html>; null means remove the attribute. */
export function htmlAttributes(s: A11ySettings): Record<string, string | null> {
  return Object.fromEntries(HTML_FLAGS.map(([key, attr, value]) => [attr, s[key] === true ? value : null]));
}

/**
 * Inline script for <head> that applies saved preferences before first paint,
 * so a returning user never sees the page flash at the default size or colours.
 * The provider takes over after hydration.
 */
export const PREPAINT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)})||"{}"),d=document.documentElement;${JSON.stringify(
  HTML_FLAGS
)}.forEach(function(f){if(s[f[0]]===true)d.setAttribute(f[1],f[2])});if(s.textScale!==1&&${JSON.stringify(
  TEXT_SCALES
)}.indexOf(s.textScale)>-1)d.style.zoom=String(s.textScale)}catch(e){}})()`;

export type KeyAction =
  | { type: 'insert'; text: string }
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'clear' }
  | { type: 'left' }
  | { type: 'right' };

export interface EditResult {
  value: string;
  caret: number;
}

/**
 * Applies one virtual-keyboard action to a field's value and selection.
 * `maxLength` below 0 means unlimited, matching HTMLInputElement.maxLength.
 */
export function applyKey(
  value: string,
  start: number,
  end: number,
  action: KeyAction,
  maxLength = -1
): EditResult {
  const s = Math.max(0, Math.min(start, value.length));
  const e = Math.max(s, Math.min(end, value.length));
  const hasSelection = e > s;
  switch (action.type) {
    case 'insert': {
      const room = maxLength >= 0 ? Math.max(0, maxLength - (value.length - (e - s))) : Infinity;
      const text = action.text.slice(0, room);
      return { value: value.slice(0, s) + text + value.slice(e), caret: s + text.length };
    }
    case 'backspace':
      if (hasSelection) return { value: value.slice(0, s) + value.slice(e), caret: s };
      if (s === 0) return { value, caret: 0 };
      return { value: value.slice(0, s - 1) + value.slice(s), caret: s - 1 };
    case 'delete':
      if (hasSelection) return { value: value.slice(0, s) + value.slice(e), caret: s };
      return { value: value.slice(0, s) + value.slice(s + 1), caret: s };
    case 'clear':
      return { value: '', caret: 0 };
    case 'left':
      return { value, caret: hasSelection ? s : Math.max(0, s - 1) };
    case 'right':
      return { value, caret: hasSelection ? e : Math.min(value.length, e + 1) };
  }
}

/** Fisher–Yates shuffle returning a new array; `rand` is injectable for tests. */
export function shuffled<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export type KeyboardMode = 'text' | 'numpad';

/** Numeric fields (amounts, phone numbers, OTPs) open on the numpad. */
export function defaultModeFor(field: { type: string; inputMode: string }): KeyboardMode {
  if (['tel', 'number'].includes(field.type)) return 'numpad';
  if (['numeric', 'decimal', 'tel'].includes(field.inputMode)) return 'numpad';
  return 'text';
}

/** Input types the on-screen keyboard can type into. */
export const TYPABLE_INPUT_TYPES = ['text', 'email', 'password', 'tel', 'number', 'search', 'url'];
