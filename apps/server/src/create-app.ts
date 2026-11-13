import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createAuthRoutes } from './routes/auth-routes.js';
import { createCustomerRoutes } from './routes/customer-routes.js';
import { createAdminRoutes } from './routes/admin-routes.js';
import { createBranchRoutes } from './routes/branch-routes.js';
import { PgUserRepository } from './db/pg-user-repository.js';
import type { IUserRepository } from './db/user-repository.interface.js';
import { createRequirePin } from './middleware/pin.js';

export interface AppOptions {
  userRepository?: IUserRepository;
}

export function createApp(options: AppOptions = {}): express.Express {
  const app: express.Express = express();

  const userRepository = options.userRepository || new PgUserRepository();
  const requirePin = createRequirePin(userRepository);

  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  // Mount API endpoints
  app.use('/api/auth', createAuthRoutes(userRepository));
  app.use('/api/customer', createCustomerRoutes(requirePin));
  app.use('/api/admin', createAdminRoutes(requirePin));
  app.use('/api/branches', createBranchRoutes());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
