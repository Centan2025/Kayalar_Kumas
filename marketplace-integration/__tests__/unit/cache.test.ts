import { describe, it, expect } from 'vitest';
import { CacheService } from '../../src/services/cache/cache.service';

describe('CacheService', () => {
  it('should return null for missing keys', () => {
    const cache = new CacheService();
    expect(cache.get('missing')).toBeNull();
  });

  it('should store and retrieve values', () => {
    const cache = new CacheService();
    cache.set('key1', { data: 42 });
    expect(cache.get<{ data: number }>('key1')).toEqual({ data: 42 });
  });

  it('should expire entries after TTL', async () => {
    const cache = new CacheService(50); // 50ms TTL
    cache.set('fast', 'value');
    await new Promise((r) => setTimeout(r, 60));
    expect(cache.get('fast')).toBeNull();
  });

  it('should invalidate by prefix', () => {
    const cache = new CacheService();
    cache.set('orders_trendyol', [1]);
    cache.set('orders_amazon', [2]);
    cache.set('health_check', true);

    cache.invalidateByPrefix('orders_');
    expect(cache.get('orders_trendyol')).toBeNull();
    expect(cache.get('orders_amazon')).toBeNull();
    expect(cache.get<boolean>('health_check')).toBe(true);
  });

  it('should clear all entries', () => {
    const cache = new CacheService();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
