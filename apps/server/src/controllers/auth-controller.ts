import type { Response } from 'express';
import type { IUserRepository } from '../db/user-repository.interface.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { validateSignupInput, validateLoginInput } from '../utils/validation.js';

const COOKIE_NAME = 'token';

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

      const { name, email, password } = validation.data;
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
      });

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      return res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  login = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = validateLoginInput(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0]?.message || 'Invalid email or password',
        });
      }

      const { email, password } = validation.data;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await this.userRepository.findByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
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

  me = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await this.userRepository.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
