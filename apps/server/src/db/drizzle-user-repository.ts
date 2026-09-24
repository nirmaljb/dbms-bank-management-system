import { eq } from 'drizzle-orm';
import { getDb } from './index.js';
import { users } from './schema.js';
import type { IUserRepository, UserRecord, CreateUserData } from './user-repository.interface.js';

export class DrizzleUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const db = getDb();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!result[0]) return null;
    return result[0] as UserRecord;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const db = getDb();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!result[0]) return null;
    return result[0] as UserRecord;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const db = getDb();
    const [created] = await db
      .insert(users)
      .values({
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        role: data.role || 'customer',
      })
      .returning();

    return created as UserRecord;
  }
}
