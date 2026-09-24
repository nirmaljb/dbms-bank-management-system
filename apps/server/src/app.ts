import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createAuthRoutes } from './routes/auth-routes.js';
import { DrizzleUserRepository } from './db/drizzle-user-repository.js';
import { InMemoryUserRepository } from './services/in-memory-user-repository.js';
import type { IUserRepository } from './db/user-repository.interface.js';

export interface AppOptions {
  userRepository?: IUserRepository;
}

export function createApp(options: AppOptions = {}): express.Express {
  const app: express.Express = express();

  const userRepository =
    options.userRepository ||
    (process.env.DATABASE_URL
      ? new DrizzleUserRepository()
      : new InMemoryUserRepository());

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

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
