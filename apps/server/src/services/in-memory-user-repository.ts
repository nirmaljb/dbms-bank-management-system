import crypto from 'node:crypto';
import type { IUserRepository, UserRecord, CreateUserData } from '../db/user-repository.interface.js';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, UserRecord> = new Map();
  private adminCount = 0;

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return { ...user };
      }
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByStaffId(staffId: string): Promise<UserRecord | null> {
    const wanted = staffId.toUpperCase().trim();
    for (const user of this.users.values()) {
      if (user.staffId === wanted) {
        return { ...user };
      }
    }
    return null;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const now = new Date();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role || 'customer',
      staffId: data.role === 'admin' ? `BNBA${String(++this.adminCount).padStart(4, '0')}` : null,
      pinHash: null,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return { ...user };
  }

  async setPinHash(id: string, pinHash: string | null): Promise<void> {
    const user = this.users.get(id);
    if (user) Object.assign(user, { pinHash, pinFailedAttempts: 0, pinLockedUntil: null });
  }

  async recordPinFailure(id: string, maxAttempts: number, lockMinutes: number) {
    const user = this.users.get(id)!;
    user.pinFailedAttempts += 1;
    if (user.pinFailedAttempts >= maxAttempts) {
      user.pinFailedAttempts = 0;
      user.pinLockedUntil = new Date(Date.now() + lockMinutes * 60_000);
      return { attemptsLeft: 0, lockedUntil: user.pinLockedUntil };
    }
    return { attemptsLeft: maxAttempts - user.pinFailedAttempts, lockedUntil: user.pinLockedUntil };
  }

  async clearPinFailures(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) Object.assign(user, { pinFailedAttempts: 0, pinLockedUntil: null });
  }
}
