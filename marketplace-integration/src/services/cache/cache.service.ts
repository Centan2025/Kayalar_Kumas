import { Logger } from '../logger/logger.service';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = 60000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      Logger.debug('[Cache] Expired entry evicted', { key });
      return null;
    }

    Logger.debug('[Cache] HIT', { key });
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { data, expiresAt });
    Logger.debug('[Cache] SET', { key, ttlMs: ttlMs ?? this.defaultTtlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    let evicted = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        evicted++;
      }
    }
    Logger.debug('[Cache] Invalidated by prefix', { prefix, evicted });
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
