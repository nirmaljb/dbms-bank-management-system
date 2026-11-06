import { query } from './pool.js';
import type { IUserRepository, UserRecord, CreateUserData } from './user-repository.interface.js';

const USER_COLUMNS = `
  id, name, email, password_hash AS "passwordHash", role, staff_id AS "staffId",
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

  async findByStaffId(staffId: string): Promise<UserRecord | null> {
    const rows = await query<UserRecord>(`SELECT ${USER_COLUMNS} FROM users WHERE staff_id = $1`, [
      staffId.toUpperCase().trim(),
    ]);
    return rows[0] ?? null;
  }

  // Customers go through sp_register_customer, which also files their
  // PENDING account application. Admins are inserted directly.
  async create(data: CreateUserData): Promise<UserRecord> {
    if ((data.role || 'customer') === 'customer') {
      const app = data.application;
      if (!app) {
        throw new Error('A customer needs an account application');
      }
      const rows = await query<{ p_user_id: string }>(
        `CALL sp_register_customer($1, $2, $3, $4, $5::date, $6, $7, $8::account_type, NULL, NULL)`,
        [
          data.name,
          data.email,
          data.passwordHash,
          app.phone,
          app.dateOfBirth,
          app.address,
          app.branchCode,
          app.accountType,
        ]
      );
      return (await this.findById(rows[0]!.p_user_id))!;
    }

    const rows = await query<UserRecord>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING ${USER_COLUMNS}`,
      [data.name, data.email.toLowerCase().trim(), data.passwordHash]
    );
    return rows[0]!;
  }
}
