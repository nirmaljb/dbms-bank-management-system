import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchMe, signupUser, loginUser, logoutUser } from '../auth';

describe('Frontend Auth API Utilities', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('fetchMe', () => {
    it('returns user profile when authenticated (200 OK)', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'customer' as const,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUser }),
      } as Response);

      const user = await fetchMe();
      expect(user).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
    });

    it('returns null when unauthenticated (401)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      const user = await fetchMe();
      expect(user).toBeNull();
    });

    it('returns null on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const user = await fetchMe();
      expect(user).toBeNull();
    });
  });

  describe('signupUser', () => {
    it('returns user on successful 201 response', async () => {
      const mockUser = {
        id: 'new-id',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'customer' as const,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ user: mockUser }),
      } as Response);

      const result = await signupUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securePassword123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('returns error message when signup fails (e.g. duplicate email)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Email already registered' }),
      } as Response);

      const result = await signupUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securePassword123',
      });

      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Email already registered');
    });
  });

  describe('loginUser', () => {
    it('returns user on successful 200 response', async () => {
      const mockUser = {
        id: 'user-id',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'customer' as const,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: mockUser }),
      } as Response);

      const result = await loginUser({
        email: 'jane@example.com',
        password: 'securePassword123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('returns error on invalid credentials (401)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid email or password' }),
      } as Response);

      const result = await loginUser({
        email: 'jane@example.com',
        password: 'wrongPassword',
      });

      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid email or password');
    });
  });

  describe('logoutUser', () => {
    it('returns success: true on 200 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Logged out successfully' }),
      } as Response);

      const result = await logoutUser();
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    });
  });
});
