export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  accountNumber?: string;
  cifNumber?: string;
}

export interface AuthResponse {
  user: User;
}

export interface ErrorResponse {
  error: string;
}

export async function fetchMe(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function signupUser(input: {
  name: string;
  email: string;
  password: string;
  accountNumber?: string;
  cifNumber?: string;
}): Promise<{ user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Failed to sign up' };
    }

    return { user: data.user };
  } catch {
    return { error: 'Network error. Please try again later.' };
  }
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user?: User; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Invalid email or password' };
    }

    return { user: data.user };
  } catch {
    return { error: 'Network error. Please try again later.' };
  }
}

export async function logoutUser(): Promise<{ success: boolean }> {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}
