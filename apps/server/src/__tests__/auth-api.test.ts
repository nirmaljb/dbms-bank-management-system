import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryUserRepository } from '../services/in-memory-user-repository.js';
import { hashPassword } from '../utils/password.js';

describe('Auth API Endpoints', () => {
  let userRepository: InMemoryUserRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    app = createApp({ userRepository });
  });

  describe('POST /api/auth/signup', () => {
    it('creates a new user and sets auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Jane Doe');
      expect(res.body.user.email).toBe('jane@example.com');
      expect(res.body.user.role).toBe('customer');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Check cookie
      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies!.some((c: string) => c.includes('token=') && c.includes('HttpOnly'))).toBe(true);
    });

    it('returns 409 if email already exists', async () => {
      await userRepository.create({
        name: 'Existing User',
        email: 'jane@example.com',
        passwordHash: await hashPassword('password123'),
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/email/i);
    });

    it('returns 400 for validation errors (e.g. short password)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'invalid-email',
          password: 'securePassword123',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await userRepository.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: await hashPassword('securePassword123'),
        role: 'customer',
      });
    });

    it('logs in successfully and returns user and cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('jane@example.com');
      expect(res.body.user.name).toBe('Jane Doe');

      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies!.some((c: string) => c.includes('token=') && c.includes('HttpOnly'))).toBe(true);
    });

    it('returns 401 with generic error on incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'wrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 401 with generic error on unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });

  describe('role-scoped login', () => {
    beforeEach(async () => {
      await userRepository.create({
        name: 'Bank Admin',
        email: 'admin@example.com',
        passwordHash: await hashPassword('adminPassword123'),
        role: 'admin',
      });
      await userRepository.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: await hashPassword('securePassword123'),
        role: 'customer',
      });
    });

    it('rejects an admin on the customer login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'adminPassword123' });

      expect(res.status).toBe(403);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('logs an admin in on the admin login', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@example.com', password: 'adminPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
    });

    it('rejects a customer on the admin login', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'jane@example.com', password: 'securePassword123' });

      expect(res.status).toBe(403);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('returns the generic 401 for a wrong admin password', async () => {
      const res = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });
  });

  describe('banking routes require the right role', () => {
    const cookieFor = async (role: 'customer' | 'admin') => {
      await userRepository.create({
        name: 'Role User',
        email: `${role}@example.com`,
        passwordHash: await hashPassword('rolePassword123'),
        role,
      });
      const path = role === 'admin' ? '/api/auth/admin/login' : '/api/auth/login';
      const res = await request(app)
        .post(path)
        .send({ email: `${role}@example.com`, password: 'rolePassword123' });
      return res.headers['set-cookie'] as unknown as string[];
    };

    it('returns 401 without a session', async () => {
      expect((await request(app).get('/api/customer/overview')).status).toBe(401);
      expect((await request(app).get('/api/admin/overview')).status).toBe(401);
    });

    it('returns 403 for a customer on admin routes', async () => {
      const cookie = await cookieFor('customer');
      const res = await request(app).get('/api/admin/overview').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });

    it('returns 403 for an admin on customer routes', async () => {
      const cookie = await cookieFor('admin');
      const res = await request(app).post('/api/customer/deposit').set('Cookie', cookie).send({ amount: '10' });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears token cookie and returns 200', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies!.some((c: string) => c.includes('token=') && (c.includes('Max-Age=0') || c.includes('expires=')))).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns authenticated user when valid token cookie is sent', async () => {
      // 1. Signup to get token cookie
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securePassword123',
        });

      const cookie = signupRes.headers['set-cookie'] as string[] | undefined;

      // 2. Fetch /api/auth/me
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie || []);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('jane@example.com');
      expect(res.body.user.name).toBe('Jane Doe');
      expect(res.body.user.role).toBe('customer');
    });

    it('returns 401 Unauthorized when no cookie is provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 401 Unauthorized when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['token=invalidtoken123; Path=/']);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });
});
