import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken, verifyToken } from '../utils/jwt.js';
import { validateSignupInput, validateLoginInput } from '../utils/validation.js';

describe('Password Utilities', () => {
  it('hashes password and verifies successfully', async () => {
    const raw = 'securePassword123';
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(await comparePassword(raw, hash)).toBe(true);
    expect(await comparePassword('wrongpassword', hash)).toBe(false);
  });
});

describe('JWT Utilities', () => {
  it('signs and verifies a token payload', () => {
    const payload = {
      id: 'uuid-123',
      email: 'jane@example.com',
      role: 'customer' as const,
      name: 'Jane Doe',
    };

    const token = signToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it('rejects an invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });
});

describe('Input Validation', () => {
  it('accepts valid signup input', () => {
    const result = validateSignupInput({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'securePassword123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = validateSignupInput({
      name: 'J',
      email: 'jane@example.com',
      password: 'securePassword123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = validateSignupInput({
      name: 'Jane Doe',
      email: 'not-an-email',
      password: 'securePassword123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = validateSignupInput({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('validates login input', () => {
    const valid = validateLoginInput({
      email: 'jane@example.com',
      password: 'securePassword123',
    });
    expect(valid.success).toBe(true);

    const invalid = validateLoginInput({
      email: 'bad-email',
      password: '',
    });
    expect(invalid.success).toBe(false);
  });
});
