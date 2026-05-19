import { createContext, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';

export type User = {
  id?: string;
  name?: string;
  email?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => void;
};

const STORAGE_TOKEN_KEY = 'token';
const STORAGE_USER_KEY = 'user';

const readStoredUser = () => {
  const raw = localStorage.getItem(STORAGE_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const login = useCallback(async ({ email, password }: LoginInput) => {
    // Log request payload for debugging
    const payload = { email, password };
    // eslint-disable-next-line no-console
    console.log('[Auth] login payload:', payload);

    try {
      const response = await api.post('/login', payload);
      const { token: nextToken, user: nextUser } = response.data as {
        token: string;
        user: User;
      };

      localStorage.setItem(STORAGE_TOKEN_KEY, nextToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));

      setToken(nextToken);
      setUser(nextUser);
    } catch (err: unknown) {
      // Log detailed server error for debugging (400 body, validation errors, etc.)
      // eslint-disable-next-line no-console
      console.error('[Auth] login error:', (err as any)?.response?.status, (err as any)?.response?.data ?? (err as any)?.message ?? err);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);

    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
