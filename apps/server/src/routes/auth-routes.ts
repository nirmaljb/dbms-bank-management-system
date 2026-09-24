import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller.js';
import { authenticate } from '../middleware/auth.js';
import type { IUserRepository } from '../db/user-repository.interface.js';

export function createAuthRoutes(userRepository: IUserRepository): Router {
  const router = Router();
  const controller = new AuthController(userRepository);

  router.post('/signup', controller.signup);
  router.post('/login', controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}
