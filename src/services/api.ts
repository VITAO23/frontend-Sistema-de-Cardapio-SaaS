import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api-saas-sistema-cardapio.onrender.com';

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function hasFreshCache(key: string) {
  const entry = cache.get(key);

  if (!entry) {
    return false;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return false;
  }

  return true;
}

export function readCache<T>(key: string) {
  const cachedEntry = cache.get(key);

  if (!cachedEntry || cachedEntry.expiresAt <= Date.now()) {
    if (cachedEntry) {
      cache.delete(key);
    }

    return null;
  }

  return cachedEntry.data as T;
}

export async function cachedRequest<T>(
  key: string,
  request: () => Promise<T>,
  ttlMs = 5 * 60 * 1000,
): Promise<T> {
  const cachedEntry = cache.get(key);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.data as T;
  }

  const inflightRequest = inflightRequests.get(key) as Promise<T> | undefined;
  if (inflightRequest) {
    return inflightRequest;
  }

  const nextRequest = request()
    .then((data) => {
      cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
      });
      inflightRequests.delete(key);
      return data;
    })
    .catch((error) => {
      inflightRequests.delete(key);
      throw error;
    });

  inflightRequests.set(key, nextRequest);
  return nextRequest;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    inflightRequests.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }

  for (const key of inflightRequests.keys()) {
    if (key.startsWith(prefix)) {
      inflightRequests.delete(key);
    }
  }
}
