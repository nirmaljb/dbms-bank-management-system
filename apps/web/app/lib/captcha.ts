// Client-side image captcha for the login and signup forms.
//
// Codes use uppercase letters and digits with look-alikes removed
// (0/O/D, 1/I/L, 2/Z, 5/S, 8/B, U/V), and matching ignores case and spaces,
// so a code that is read correctly is always accepted.

export const CAPTCHA_CHARS = 'ACEFGHJKMNPQRTWXY34679';
export const CAPTCHA_LENGTH = 5;

export function generateCaptcha(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    code += CAPTCHA_CHARS.charAt(Math.floor(random() * CAPTCHA_CHARS.length));
  }
  return code;
}

export function captchaMatches(input: string, code: string): boolean {
  return code !== '' && input.replace(/\s+/g, '').toUpperCase() === code;
}

/**
 * Deterministic PRNG (mulberry32) seeded from the code, so the same code is
 * always drawn with the same jitter no matter how often the canvas repaints.
 */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
