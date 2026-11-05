/**
 * Applies db/sql/*.sql in filename order, then seeds the admin account.
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

// Demo customer so the login page's "fill demo" button works out of the box.
const DEMO_CUSTOMER = {
  name: 'Demo Customer',
  email: 'demo@example.com',
  password: 'password123',
};

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

    await seedUser(client, ADMIN, 'admin');
    if (!process.argv.includes('--no-demo')) {
      await seedUser(client, DEMO_CUSTOMER, 'customer');
    }
    console.log('Database ready.');
  } finally {
    await client.end();
  }
}

async function seedUser(
  client: pg.Client,
  user: { name: string; email: string; password: string },
  role: 'admin' | 'customer'
) {
  const result = await client.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [user.name, user.email, await hashPassword(user.password), role]
  );
  console.log(
    result.rowCount ? `Seeded ${role} ${user.email}` : `${role} ${user.email} already exists, left unchanged`
  );
}

main().catch((err) => {
  console.error('\nDatabase setup failed:', err instanceof Error ? err.message : err);
  if (err instanceof Error && /type "role"|column .* of relation "users"/.test(err.message)) {
    console.error('This looks like the old Drizzle schema. Re-run with -- --reset to rebuild it.');
  }
  process.exit(1);
});
