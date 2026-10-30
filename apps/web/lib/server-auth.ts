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
  accountNumber?: string;
  cifNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  name: string;
  accountNumber?: string;
  cifNumber?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'bank-management-default-secret-key-change-me';
const JWT_EXPIRES_IN = '7d';
export const COOKIE_NAME = 'token';

export const signupSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  accountNumber: z.string().optional(),
  cifNumber: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

/**
 * Generate a unique 11-digit bank account number starting with '30'
 */
export function generateRandomAccountNumber(existingSet: Set<string>): string {
  let acc = '';
  do {
    const rand9 = Math.floor(100000000 + Math.random() * 900000000).toString();
    acc = `30${rand9}`;
  } while (existingSet.has(acc));
  return acc;
}

/**
 * Generate a unique 11-digit CIF number starting with '89'
 */
export function generateRandomCifNumber(existingSet: Set<string>): string {
  let cif = '';
  do {
    const rand9 = Math.floor(100000000 + Math.random() * 900000000).toString();
    cif = `89${rand9}`;
  } while (existingSet.has(cif));
  return cif;
}

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
      accountNumber: '30892019482',
      cifNumber: '89201948210',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const adminUser: UserRecord = {
      id: 'a1b2c3d4-5678-4e9f-a012-3456789abcde',
      name: 'System Administrator',
      email: 'admin@example.com',
      passwordHash: demoPasswordHash,
      role: 'admin',
      accountNumber: '10928374910',
      cifNumber: '89201948210',
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

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: 'customer' | 'admin';
    accountNumber?: string;
    cifNumber?: string;
  }): Promise<UserRecord> {
    const now = new Date();

    // Gather existing account numbers to ensure complete uniqueness
    const existingAccounts = new Set<string>();
    for (const u of this.users.values()) {
      if (u.accountNumber) existingAccounts.add(u.accountNumber);
    }
    existingAccounts.add('30892019482');
    existingAccounts.add('10928374910');

    // Automatically generate a unique random account number if not provided or already taken
    const assignedAccountNumber =
      data.accountNumber && !existingAccounts.has(data.accountNumber)
        ? data.accountNumber
        : generateRandomAccountNumber(existingAccounts);

    const existingCifs = new Set<string>();
    for (const u of this.users.values()) {
      if (u.cifNumber) existingCifs.add(u.cifNumber);
    }
    existingCifs.add('89201948210');

    const assignedCifNumber =
      data.cifNumber && !existingCifs.has(data.cifNumber)
        ? data.cifNumber
        : generateRandomCifNumber(existingCifs);

    const user: UserRecord = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role || 'customer',
      accountNumber: assignedAccountNumber,
      cifNumber: assignedCifNumber,
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
