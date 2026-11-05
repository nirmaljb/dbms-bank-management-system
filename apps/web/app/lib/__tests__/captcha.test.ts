import { describe, it, expect } from 'vitest';
import { CAPTCHA_CHARS, CAPTCHA_LENGTH, captchaMatches, generateCaptcha, seededRandom } from '../captcha';

describe('generateCaptcha', () => {
  it('builds codes of the fixed length from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCaptcha();
      expect(code).toHaveLength(CAPTCHA_LENGTH);
      for (const ch of code) expect(CAPTCHA_CHARS).toContain(ch);
    }
  });

  it('never uses look-alike characters', () => {
    for (const ch of '0O1IL2Z5S8BUVD') expect(CAPTCHA_CHARS).not.toContain(ch);
  });

  it('uses the supplied random source', () => {
    expect(generateCaptcha(() => 0)).toBe(CAPTCHA_CHARS[0]!.repeat(CAPTCHA_LENGTH));
  });
});

describe('captchaMatches', () => {
  it('accepts the code regardless of case and spaces', () => {
    expect(captchaMatches('AC3K7', 'AC3K7')).toBe(true);
    expect(captchaMatches('ac3k7', 'AC3K7')).toBe(true);
    expect(captchaMatches(' a c3k7 ', 'AC3K7')).toBe(true);
  });

  it('rejects wrong or empty input', () => {
    expect(captchaMatches('AC3K9', 'AC3K7')).toBe(false);
    expect(captchaMatches('', 'AC3K7')).toBe(false);
    expect(captchaMatches('', '')).toBe(false);
  });
});

describe('seededRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = seededRandom('AC3K7');
    const b = seededRandom('AC3K7');
    const seqA = Array.from({ length: 10 }, a);
    expect(Array.from({ length: 10 }, b)).toEqual(seqA);
    for (const n of seqA) expect(n >= 0 && n < 1).toBe(true);
  });

  it('gives different sequences for different seeds', () => {
    expect(seededRandom('AC3K7')()).not.toBe(seededRandom('AC3K9')());
  });
});
