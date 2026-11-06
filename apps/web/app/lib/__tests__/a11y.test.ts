import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  TEXT_SCALES,
  applyKey,
  defaultModeFor,
  parseSettings,
  shuffled,
  stepTextScale,
} from '../a11y';

describe('parseSettings', () => {
  it('falls back to defaults for missing or broken storage', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps known keys of the right type and drops the rest', () => {
    const s = parseSettings(JSON.stringify({ highContrast: true, textScale: '2', bogus: 1, keyboardDock: 'left' }));
    expect(s.highContrast).toBe(true);
    expect(s.textScale).toBe(1);
    expect(s.keyboardDock).toBe('bottom');
    expect(s).not.toHaveProperty('bogus');
  });

  it('rejects a text scale that is not one of the steps', () => {
    expect(parseSettings(JSON.stringify({ textScale: 7 })).textScale).toBe(1);
    expect(parseSettings(JSON.stringify({ textScale: 1.3 })).textScale).toBe(1.3);
  });
});

describe('stepTextScale', () => {
  it('moves one step and stops at both ends', () => {
    expect(stepTextScale(1, 1)).toBe(1.15);
    expect(stepTextScale(1, -1)).toBe(0.9);
    expect(stepTextScale(TEXT_SCALES[0], -1)).toBe(TEXT_SCALES[0]);
    expect(stepTextScale(TEXT_SCALES.at(-1)!, 1)).toBe(TEXT_SCALES.at(-1));
  });
});

describe('applyKey', () => {
  it('inserts at the caret and replaces a selection', () => {
    expect(applyKey('abef', 2, 2, { type: 'insert', text: 'cd' })).toEqual({ value: 'abcdef', caret: 4 });
    expect(applyKey('abXXef', 2, 4, { type: 'insert', text: 'cd' })).toEqual({ value: 'abcdef', caret: 4 });
  });

  it('respects maxLength, counting the replaced selection as free room', () => {
    expect(applyKey('12345', 5, 5, { type: 'insert', text: '6' }, 5)).toEqual({ value: '12345', caret: 5 });
    expect(applyKey('12345', 0, 2, { type: 'insert', text: '999' }, 5)).toEqual({ value: '99345', caret: 2 });
  });

  it('backspaces and deletes around the caret or selection', () => {
    expect(applyKey('abc', 2, 2, { type: 'backspace' })).toEqual({ value: 'ac', caret: 1 });
    expect(applyKey('abc', 0, 0, { type: 'backspace' })).toEqual({ value: 'abc', caret: 0 });
    expect(applyKey('abcd', 1, 3, { type: 'backspace' })).toEqual({ value: 'ad', caret: 1 });
    expect(applyKey('abc', 1, 1, { type: 'delete' })).toEqual({ value: 'ac', caret: 1 });
  });

  it('moves the caret and collapses selections', () => {
    expect(applyKey('abc', 1, 1, { type: 'left' }).caret).toBe(0);
    expect(applyKey('abc', 0, 0, { type: 'left' }).caret).toBe(0);
    expect(applyKey('abc', 3, 3, { type: 'right' }).caret).toBe(3);
    expect(applyKey('abc', 1, 2, { type: 'right' }).caret).toBe(2);
  });

  it('clamps an out-of-range selection', () => {
    expect(applyKey('ab', 9, 9, { type: 'insert', text: 'c' })).toEqual({ value: 'abc', caret: 3 });
  });

  it('clears the field', () => {
    expect(applyKey('secret', 3, 3, { type: 'clear' })).toEqual({ value: '', caret: 0 });
  });
});

describe('shuffled', () => {
  it('returns a permutation without touching the input', () => {
    const src = ['1', '2', '3', '4', '5'];
    const out = shuffled(src);
    expect(out).toHaveLength(5);
    expect([...out].sort()).toEqual(src);
    expect(src).toEqual(['1', '2', '3', '4', '5']);
  });

  it('is deterministic for a given random source', () => {
    expect(shuffled([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });
});

describe('defaultModeFor', () => {
  it('opens the numpad for numeric fields', () => {
    expect(defaultModeFor({ type: 'tel', inputMode: '' })).toBe('numpad');
    expect(defaultModeFor({ type: 'text', inputMode: 'decimal' })).toBe('numpad');
    expect(defaultModeFor({ type: 'password', inputMode: '' })).toBe('text');
  });
});
