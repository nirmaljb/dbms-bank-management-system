import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  name: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'bank-management-default-secret-key-change-me';
const JWT_EXPIRES_IN = '7d';
export const COOKIE_NAME = 'token';

export const signupSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

// In-memory store for users with pre-seeded demo accounts
class InMemoryStore {
  private users: Map<string, UserRecord> = new Map();
  private initialized = false;

  constructor() {
    this.initDemoUsers();
  }

  private initDemoUsers() {
    if (this.initialized) return;
    this.initialized = true;

    // Pre-seed demo users
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('password123', salt);

    const demoUser: UserRecord = {
      id: 'd9b7f5e0-1234-4b5a-9876-abcdef123456',
      name: 'Jane Doe',
      email: 'demo@example.com',
      passwordHash: demoPasswordHash,
      role: 'customer',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const adminUser: UserRecord = {
      id: 'a1b2c3d4-5678-4e9f-a012-3456789abcde',
      name: 'System Administrator',
      email: 'admin@example.com',
      passwordHash: demoPasswordHash,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(demoUser.id, demoUser);
    this.users.set(adminUser.id, adminUser);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) {
        return { ...u };
      }
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async create(data: { name: string; email: string; passwordHash: string; role?: 'customer' | 'admin' }): Promise<UserRecord> {
    const now = new Date();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role || 'customer',
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return { ...user };
  }
}

// Global singleton in memory so it persists across API requests within dev server runtime
const globalForStore = globalThis as unknown as { __bankUserStore?: InMemoryStore };
export const userStore = globalForStore.__bankUserStore ?? new InMemoryStore();
if (process.env.NODE_ENV !== 'production') globalForStore.__bankUserStore = userStore;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds for Next.js cookies API
  };
}
