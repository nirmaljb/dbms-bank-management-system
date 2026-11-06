import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { createApp } from '../app.js';
import { InMemoryUserRepository } from '../services/in-memory-user-repository.js';
import { createRequirePin } from '../middleware/pin.js';
import { authenticate } from '../middleware/auth.js';
import { DEFAULT_PIN, PIN_MAX_ATTEMPTS } from '../services/pin-service.js';
import { hashPassword } from '../utils/password.js';

describe('Transaction PIN', () => {
  let repo: InMemoryUserRepository;
  let cookie: string;
  let userId: string;

  // A stand-in for a PIN-guarded banking route, so these tests need no Postgres.
  const guarded = () => {
    const app = express();
    app.use(cookieParser());
    app.post('/action', authenticate, createRequirePin(repo), (_req, res) => {
      res.json({ done: true });
    });
    return app;
  };

  beforeEach(async () => {
    repo = new InMemoryUserRepository();
    const user = await repo.create({
      name: 'Pin Tester',
      email: 'pin@example.com',
      passwordHash: await hashPassword('password123'),
      role: 'admin',
    });
    userId = user.id;
    const res = await request(createApp({ userRepository: repo }))
      .post('/api/auth/admin/login')
      .send({ adminId: user.staffId, password: 'password123' });
    cookie = (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  });

  it('asks for the PIN when none is sent', async () => {
    const res = await request(guarded()).post('/action').set('Cookie', cookie);
    expect(res.status).toBe(428);
    expect(res.body.code).toBe('PIN_REQUIRED');
  });

  it('accepts the default PIN until the user sets one', async () => {
    const res = await request(guarded()).post('/action').set('Cookie', cookie).set('X-Transaction-Pin', DEFAULT_PIN);
    expect(res.status).toBe(200);
  });

  it('locks the PIN after too many wrong attempts', async () => {
    for (let i = 1; i < PIN_MAX_ATTEMPTS; i++) {
      const res = await request(guarded()).post('/action').set('Cookie', cookie).set('X-Transaction-Pin', '0000');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PIN_INVALID');
    }
    const locked = await request(guarded()).post('/action').set('Cookie', cookie).set('X-Transaction-Pin', '0000');
    expect(locked.status).toBe(423);
    // Even the right PIN is refused while locked.
    const right = await request(guarded()).post('/action').set('Cookie', cookie).set('X-Transaction-Pin', DEFAULT_PIN);
    expect(right.status).toBe(423);
  });

  it('changes the PIN and only accepts the new one afterwards', async () => {
    const app = createApp({ userRepository: repo });
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.body.user.pinIsDefault).toBe(true);

    const changed = await request(app)
      .post('/api/auth/pin')
      .set('Cookie', cookie)
      .send({ currentPin: DEFAULT_PIN, newPin: '4826' });
    expect(changed.status).toBe(200);
    expect(changed.body.user.pinIsDefault).toBe(false);
    expect((await repo.findById(userId))!.pinHash).not.toBeNull();

    const oldPin = await request(guarded()).post('/action').set('Cookie', cookie).set('X-Transaction-Pin', DEFAULT_PIN);
    expect(oldPin.status).toBe(403);
    const newPin = await request(guarded()).post('/action').set('Cookie', cookie).set('X-Transaction-Pin', '4826');
    expect(newPin.status).toBe(200);
  });

  it('rejects a new PIN that is not 4 digits or is the default', async () => {
    const app = createApp({ userRepository: repo });
    for (const newPin of ['12', 'abcd', DEFAULT_PIN]) {
      const res = await request(app).post('/api/auth/pin').set('Cookie', cookie).send({ currentPin: DEFAULT_PIN, newPin });
      expect(res.status).toBe(400);
    }
  });

  it('refuses to change the PIN when the current PIN is wrong', async () => {
    const res = await request(createApp({ userRepository: repo }))
      .post('/api/auth/pin')
      .set('Cookie', cookie)
      .send({ currentPin: '9999', newPin: '4826' });
    expect(res.status).toBe(403);
    expect((await repo.findById(userId))!.pinHash).toBeNull();
  });
});
