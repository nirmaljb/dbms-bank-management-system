import crypto from 'node:crypto';
import type { IUserRepository, UserRecord, CreateUserData } from '../db/user-repository.interface.js';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, UserRecord> = new Map();

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

  async create(data: CreateUserData): Promise<UserRecord> {
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
