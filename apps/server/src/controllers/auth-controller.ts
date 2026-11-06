import type { Response } from 'express';
import type { IUserRepository } from '../db/user-repository.interface.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { validateSignupInput, validateLoginInput, validateAdminLoginInput } from '../utils/validation.js';
import type { UserRecord } from '../db/user-repository.interface.js';
import { mapDbError } from '../utils/db-errors.js';
import { checkPin, DEFAULT_PIN, PIN_PATTERN } from '../services/pin-service.js';

const COOKIE_NAME = 'token';

const publicUser = (user: UserRecord) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  staffId: user.staffId,
  // True until the user replaces the default PIN with their own.
  pinIsDefault: user.pinHash === null,
});

function getCookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export class AuthController {
  constructor(private userRepository: IUserRepository) {}

  signup = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateSignupInput(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0]?.message || 'Invalid input data',
        });
      }

      const { name, email, password, ...application } = validation.data;
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await this.userRepository.findByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await hashPassword(password);
      const user = await this.userRepository.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'customer',
        application,
      });

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      return res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      // sp_register_customer rejects bad age, address or branch with a message.
      const { status, message } = mapDbError(err);
      if (status === 500) console.error(err);
      return res.status(status).json({ error: message });
    }
  };

  /** Customer login with email. Admins are turned away to the admin portal. */
  login = async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateLoginInput(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0]?.message || 'Invalid email or password',
      });
    }
    const { email, password } = validation.data;
    return this.loginAs('customer', () => this.userRepository.findByEmail(email), password, res);
  };

  /** Admin login with Admin ID (e.g. BNBA0001) or email. Customers are turned away. */
  adminLogin = async (req: AuthenticatedRequest, res: Response) => {
    const validation = validateAdminLoginInput(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: validation.error.errors[0]?.message || 'Invalid Admin ID or password',
      });
    }
    const { adminId, password } = validation.data;
    const find = () =>
      adminId.includes('@')
        ? this.userRepository.findByEmail(adminId)
        : this.userRepository.findByStaffId(adminId);
    return this.loginAs('admin', find, password, res);
  };

  private loginAs = async (
    role: 'customer' | 'admin',
    findUser: () => Promise<UserRecord | null>,
    password: string,
    res: Response
  ) => {
    const invalid = role === 'admin' ? 'Invalid Admin ID or password' : 'Invalid email or password';
    try {
      const user = await findUser();
      if (!user) {
        return res.status(401).json({ error: invalid });
      }

      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: invalid });
      }

      if (user.role !== role) {
        return res.status(403).json({
          error:
            role === 'customer'
              ? 'Administrators must sign in at the admin portal'
              : 'This portal is for bank administrators only',
        });
      }

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      return res.status(200).json({ user: publicUser(user) });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  logout = async (_req: AuthenticatedRequest, res: Response) => {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
    });
    return res.status(200).json({ message: 'Logged out successfully' });
  };

  /** Sets a new PIN. The current PIN (or the default one) stands in for the PIN prompt. */
  changePin = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { currentPin, newPin } = (req.body ?? {}) as { currentPin?: unknown; newPin?: unknown };
    if (typeof newPin !== 'string' || !PIN_PATTERN.test(newPin)) {
      return res.status(400).json({ error: 'New PIN must be exactly 4 digits' });
    }
    if (newPin === DEFAULT_PIN) {
      return res.status(400).json({ error: 'Choose a PIN other than the default PIN' });
    }
    if (newPin === currentPin) {
      return res.status(400).json({ error: 'New PIN must be different from the current PIN' });
    }

    try {
      const result = await checkPin(this.userRepository, req.user.id, currentPin);
      if (!result.ok) {
        return res.status(result.status).json({ code: result.code, error: result.error });
      }
      await this.userRepository.setPinHash(req.user.id, await hashPassword(newPin));
      const user = await this.userRepository.findById(req.user.id);
      return res.status(200).json({ user: publicUser(user!) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  me = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await this.userRepository.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({ user: publicUser(user) });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
