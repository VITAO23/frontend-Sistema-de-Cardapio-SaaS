type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

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