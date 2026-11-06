import type { IUserRepository } from '../db/user-repository.interface.js';
import { comparePassword } from '../utils/password.js';

// Every user starts with this PIN until they set their own.
export const DEFAULT_PIN = process.env.DEFAULT_PIN || '1234';
export const PIN_PATTERN = /^\d{4}$/;
export const PIN_MAX_ATTEMPTS = 3;
export const PIN_LOCK_MINUTES = 15;

export type PinCode = 'PIN_REQUIRED' | 'PIN_INVALID' | 'PIN_LOCKED';
export type PinCheck = { ok: true } | { ok: false; status: number; code: PinCode; error: string };

const lockedMessage = (until: Date) =>
  `Too many wrong PINs. Your PIN is locked until ${until.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: process.env.TZ || 'Asia/Kolkata',
  })}.`;

/** Checks `pin` against the user's PIN (or the default one) and counts wrong attempts. */
export async function checkPin(repo: IUserRepository, userId: string, pin: unknown): Promise<PinCheck> {
  const user = await repo.findById(userId);
  if (!user) {
    return { ok: false, status: 401, code: 'PIN_INVALID', error: 'Unauthorized' };
  }
  if (user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date()) {
    return { ok: false, status: 423, code: 'PIN_LOCKED', error: lockedMessage(new Date(user.pinLockedUntil)) };
  }

  const entered = typeof pin === 'string' ? pin.trim() : '';
  const matches =
    PIN_PATTERN.test(entered) &&
    (user.pinHash ? await comparePassword(entered, user.pinHash) : entered === DEFAULT_PIN);

  if (matches) {
    if (user.pinFailedAttempts || user.pinLockedUntil) await repo.clearPinFailures(userId);
    return { ok: true };
  }

  const { attemptsLeft, lockedUntil } = await repo.recordPinFailure(userId, PIN_MAX_ATTEMPTS, PIN_LOCK_MINUTES);
  if (attemptsLeft === 0 && lockedUntil) {
    return { ok: false, status: 423, code: 'PIN_LOCKED', error: lockedMessage(new Date(lockedUntil)) };
  }
  return {
    ok: false,
    status: 403,
    code: 'PIN_INVALID',
    error: `Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left before it is locked.`,
  };
}
