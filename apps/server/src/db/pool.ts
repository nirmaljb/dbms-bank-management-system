import pg from 'pg';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }
    pool = new pg.Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

/**
 * Runs `fn` in one transaction with `app.current_user_id` set, so the audit
 * triggers record who made the change. Use it for every CALL that writes.
 */
export async function withActor<T>(
  actorId: string,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [actorId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** CALLs a procedure as `actorId` and returns its INOUT values. */
export async function callAs<T extends pg.QueryResultRow = pg.QueryResultRow>(
  actorId: string,
  text: string,
  params: unknown[]
): Promise<T> {
  return withActor(actorId, async (client) => {
    const result = await client.query<T>(text, params);
    return result.rows[0] as T;
  });
}
