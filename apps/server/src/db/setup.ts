/**
 * Applies db/sql/*.sql in filename order, then seeds the admin account and
 * the demo customers.
 *
 *   npm run db:setup --workspace=apps/server            # create / update in place
 *   npm run db:setup --workspace=apps/server -- --reset # drop everything first
 *
 * The SQL files are idempotent, so running setup again keeps existing data.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { hashPassword } from '../utils/password.js';

const SQL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/sql');

const ADMIN = {
  name: process.env.ADMIN_NAME || 'Bank Administrator',
  email: (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
  password: process.env.ADMIN_PASSWORD || 'password123',
};

// Demo customers: one approved account so the login page's "fill demo"
// button works out of the box, a second approved account to send transfers
// to, and one application still waiting for the admin.
const DEMO_CUSTOMERS = [
  { name: 'Demo Customer', email: 'demo@example.com', branch: '0001', type: 'SAVINGS', approve: true },
  { name: 'Priya Sharma', email: 'priya@example.com', branch: '0004', type: 'SAVINGS', approve: true },
  { name: 'Ravi Kumar', email: 'ravi@example.com', branch: '0002', type: 'CURRENT', approve: false },
] as const;
const DEMO_PASSWORD = 'password123';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add it to apps/server/.env');
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    if (process.argv.includes('--reset')) {
      console.log('Dropping schema public ...');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    } else {
      await assertCurrentSchema(client);
    }

    const files = fs.readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      process.stdout.write(`Applying ${file} ... `);
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(SQL_DIR, file), 'utf8'));
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
      console.log('done');
    }

    const adminId = await seedAdmin(client);
    if (!process.argv.includes('--no-demo')) {
      for (const customer of DEMO_CUSTOMERS) {
        await seedCustomer(client, adminId, customer);
      }
    }
    console.log('Database ready.');
  } finally {
    await client.end();
  }
}

// Databases built before branches, IFSC and account approval have an
// accounts table without branch_code. CREATE TABLE IF NOT EXISTS would skip
// it silently, so stop and ask for a reset instead.
async function assertCurrentSchema(client: pg.Client) {
  const { rows } = await client.query(
    `SELECT
       to_regclass('public.accounts') IS NOT NULL AS has_accounts,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'branch_code') AS has_branch`
  );
  if (rows[0].has_accounts && !rows[0].has_branch) {
    throw new Error(
      'This database uses the old account schema (11-digit numbers, no branches). ' +
        'Re-run with -- --reset to rebuild it.'
    );
  }
}

/** Seeds the admin and returns their user id. The staff ID is assigned by trg_users_assign_staff_id. */
async function seedAdmin(client: pg.Client): Promise<string> {
  const inserted = await client.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [ADMIN.name, ADMIN.email, await hashPassword(ADMIN.password)]
  );
  const { rows } = await client.query(`SELECT id, staff_id FROM users WHERE email = $1`, [ADMIN.email]);
  const admin = rows[0];
  console.log(
    inserted.rowCount
      ? `Seeded admin ${ADMIN.email} with Admin ID ${admin.staff_id}`
      : `Admin ${ADMIN.email} (Admin ID ${admin.staff_id}) already exists, left unchanged`
  );
  return admin.id;
}

async function seedCustomer(
  client: pg.Client,
  adminId: string,
  c: (typeof DEMO_CUSTOMERS)[number]
) {
  const existing = await client.query(`SELECT 1 FROM users WHERE email = $1`, [c.email]);
  if (existing.rowCount) {
    console.log(`Customer ${c.email} already exists, left unchanged`);
    return;
  }

  await client.query('BEGIN');
  try {
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [adminId]);
    const { rows } = await client.query(
      `CALL sp_register_customer($1, $2, $3, $4, $5::date, $6, $7, $8::account_type, NULL, NULL)`,
      [c.name, c.email, await hashPassword(DEMO_PASSWORD), '9876543210', '1998-04-15', '12 Demo Street, Sample City', c.branch, c.type]
    );
    let note = `application #${rows[0].p_application_no} pending`;
    if (c.approve) {
      const account = await client.query(`SELECT id FROM accounts WHERE user_id = $1`, [rows[0].p_user_id]);
      const approved = await client.query(`CALL sp_approve_account($1, $2, NULL)`, [adminId, account.rows[0].id]);
      note = `account ${approved.rows[0].p_account_number}`;
    }
    await client.query('COMMIT');
    console.log(`Seeded customer ${c.email} (${note})`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

main().catch((err) => {
  console.error('\nDatabase setup failed:', err instanceof Error ? err.message : err);
  if (err instanceof Error && /type "role"|column .* of relation "users"/.test(err.message)) {
    console.error('This looks like the old Drizzle schema. Re-run with -- --reset to rebuild it.');
  }
  process.exit(1);
});
