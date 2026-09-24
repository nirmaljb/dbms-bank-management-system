'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, fetchMe, loginUser, signupUser, logoutUser } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  signup: (input: { name: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await fetchMe();
      setUser(currentUser);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (input: { email: string; password: string }) => {
    const res = await loginUser(input);
    if (res.user) {
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Login failed' };
  };

  const signup = async (input: { name: string; email: string; password: string }) => {
    const res = await signupUser(input);
    if (res.user) {
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Signup failed' };
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
