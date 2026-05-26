import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { api } from '../services/api';
import { API_ENDPOINTS } from '../services/endpoints';

export type User = {
  id?: string;
  name?: string;
  email?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type SessionResponse = {
  token?: string;
  user?: User;
};

type ApiErrorData = {
  error?: string;
  message?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
};

const STORAGE_TOKEN_KEY = 'token';
const STORAGE_USER_KEY = 'user';

const clearSession = () => {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
};

const persistSession = (nextToken: string, nextUser: User) => {
  localStorage.setItem(STORAGE_TOKEN_KEY, nextToken);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
};

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

  const syncSessionState = useCallback(() => {
    const nextToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const nextUser = readStoredUser();

    if (!nextToken || !nextUser) {
      clearSession();
      setToken(null);
      setUser(null);
      return;
    }

    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      clearSession();
      setToken(null);
      setUser(null);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_TOKEN_KEY || event.key === STORAGE_USER_KEY || event.key === null) {
        syncSessionState();
      }
    };

    window.addEventListener('auth:logout', handleForcedLogout as EventListener);
    window.addEventListener('storage', handleStorageChange);

    syncSessionState();

    return () => {
      window.removeEventListener('auth:logout', handleForcedLogout as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [syncSessionState]);

  const login = useCallback(async ({ email, password }: LoginInput) => {
    try {
      const response = await api.post(API_ENDPOINTS.LOGIN, { email, password });
      const { token: nextToken, user: nextUser } = response.data as SessionResponse;

      if (!nextToken || !nextUser) {
        throw new Error('Invalid login response');
      }

      persistSession(nextToken, nextUser);
      setToken(nextToken);
      setUser(nextUser);
    } catch (err: unknown) {
      // Build a friendlier error message for the UI while keeping full details in console
      const resp = axios.isAxiosError(err) ? err.response : undefined;
      // eslint-disable-next-line no-console
      console.error('[Auth] login error detailed:', resp?.status, resp?.data ?? (axios.isAxiosError(err) ? err.message : err));

      let message = 'Não foi possível conectar ao servidor. Verifique o backend.';

      if (!resp) {
        // No response at all: network / CORS or server down
        message = 'Erro de rede ou CORS: impossível alcançar o backend. Verifique se o servidor permite requisições do frontend.';
      } else if (resp.data) {
        // Prefer server-provided message when available
        const responseData = resp.data as ApiErrorData | string;

        if (typeof responseData === 'string') message = responseData;
        else if (responseData.error) message = responseData.error;
        else if (responseData.message) message = responseData.message;
        else message = `Erro ${resp.status}: resposta inválida do servidor.`;
      }

      throw new Error(message);
    }
  }, []);

  const register = useCallback(async ({ name, email, password }: RegisterInput) => {
    const payload = { name, email, password };

    try {
      const response = await api.post(API_ENDPOINTS.REGISTER, payload);
      const { token: nextToken, user: nextUser } = response.data as SessionResponse;

      if (nextToken && nextUser) {
        persistSession(nextToken, nextUser);
        setToken(nextToken);
        setUser(nextUser);
        return;
      }

      const loginResponse = await api.post(API_ENDPOINTS.LOGIN, payload);
      const loginData = loginResponse.data as SessionResponse;

      if (!loginData.token || !loginData.user) {
        throw new Error('Invalid registration response');
      }

      persistSession(loginData.token, loginData.user);
      setToken(loginData.token);
      setUser(loginData.user);
    } catch (err: unknown) {
      const resp = axios.isAxiosError(err) ? err.response : undefined;
      // eslint-disable-next-line no-console
      console.error('[Auth] register error detailed:', resp?.status, resp?.data ?? (axios.isAxiosError(err) ? err.message : err));

      let message = 'Não foi possível conectar ao servidor. Verifique o backend.';

      if (!resp) {
        message = 'Erro de rede ou CORS: impossível alcançar o backend. Verifique se o servidor permite requisições do frontend.';
      } else if (resp.data) {
        const responseData = resp.data as ApiErrorData | string;

        if (typeof responseData === 'string') message = responseData;
        else if (responseData.error) message = responseData.error;
        else if (responseData.message) message = responseData.message;
        else message = `Erro ${resp.status}: resposta inválida do servidor.`;
      }

      throw new Error(message);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();

    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
