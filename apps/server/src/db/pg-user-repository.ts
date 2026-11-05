import { query } from './pool.js';
import type { IUserRepository, UserRecord, CreateUserData } from './user-repository.interface.js';

const USER_COLUMNS = `
  id, name, email, password_hash AS "passwordHash", role,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;

export class PgUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const rows = await query<UserRecord>(
      `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await query<UserRecord>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  // trg_users_create_account opens the savings account for customers.
  async create(data: CreateUserData): Promise<UserRecord> {
    const rows = await query<UserRecord>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${USER_COLUMNS}`,
      [data.name, data.email.toLowerCase().trim(), data.passwordHash, data.role || 'customer']
    );
    return rows[0]!;
  }
}
