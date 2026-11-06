import { Router } from 'express';
import { query } from '../db/pool.js';
import { handle } from '../utils/db-errors.js';

// Public: the registration form needs the branch list before anyone signs in.
export function createBranchRoutes(): Router {
  const router = Router();

  router.get(
    '/',
    handle(async (_req, res) => {
      const rows = await query(`SELECT code, name, city, ifsc FROM branches ORDER BY code`);
      return res.json({ branches: rows });
    })
  );

  return router;
}
