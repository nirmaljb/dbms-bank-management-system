import { query } from './pool.js';
import type { IUserRepository, UserRecord, CreateUserData } from './user-repository.interface.js';

const USER_COLUMNS = `
  id, name, email, password_hash AS "passwordHash", role, staff_id AS "staffId",
  pin_hash AS "pinHash", pin_failed_attempts AS "pinFailedAttempts", pin_locked_until AS "pinLockedUntil",
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

  async setPinHash(id: string, pinHash: string | null): Promise<void> {
    await query(
      `UPDATE users SET pin_hash = $2, pin_failed_attempts = 0, pin_locked_until = NULL WHERE id = $1`,
      [id, pinHash]
    );
  }

  // One UPDATE, so two wrong PINs sent at once both count. Reaching the limit
  // resets the counter and sets the lock, so the next round starts fresh.
  async recordPinFailure(id: string, maxAttempts: number, lockMinutes: number) {
    const rows = await query<{ attemptsLeft: number; lockedUntil: Date | null }>(
      `UPDATE users SET
         pin_failed_attempts = CASE WHEN pin_failed_attempts + 1 >= $2 THEN 0 ELSE pin_failed_attempts + 1 END,
         pin_locked_until = CASE WHEN pin_failed_attempts + 1 >= $2
                                 THEN now() + make_interval(mins => $3) ELSE pin_locked_until END
       WHERE id = $1
       RETURNING CASE WHEN pin_failed_attempts = 0 THEN 0 ELSE $2 - pin_failed_attempts END AS "attemptsLeft",
                 pin_locked_until AS "lockedUntil"`,
      [id, maxAttempts, lockMinutes]
    );
    return rows[0]!;
  }

  async clearPinFailures(id: string): Promise<void> {
    await query(
      `UPDATE users SET pin_failed_attempts = 0, pin_locked_until = NULL
       WHERE id = $1 AND (pin_failed_attempts <> 0 OR pin_locked_until IS NOT NULL)`,
      [id]
    );
  }
}
