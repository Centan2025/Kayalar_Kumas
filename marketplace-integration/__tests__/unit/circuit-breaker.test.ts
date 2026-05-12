import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '../../src/services/retry/circuit-breaker';

describe('CircuitBreaker', () => {
  it('should start in CLOSED state', () => {
    const cb = new CircuitBreaker('test');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should stay CLOSED on success', async () => {
    const cb = new CircuitBreaker('test');
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should transition to OPEN after threshold failures', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2, resetTimeoutMs: 100 });

    for (let i = 0; i < 2; i++) {
      try { await cb.execute(() => Promise.reject(new Error('fail'))); } catch { /* expected */ }
    }

    expect(cb.getState()).toBe('OPEN');
  });

  it('should reject calls when OPEN', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 60000 });

    try { await cb.execute(() => Promise.reject(new Error('fail'))); } catch { /* expected */ }

    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow('OPEN');
  });

  it('should transition to HALF_OPEN after reset timeout', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeoutMs: 50 });

    try { await cb.execute(() => Promise.reject(new Error('fail'))); } catch { /* expected */ }
    expect(cb.getState()).toBe('OPEN');

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 60));

    // Next call should transition to HALF_OPEN then CLOSED on success
    const result = await cb.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should reset state manually', () => {
    const cb = new CircuitBreaker('test');
    cb.reset();
    expect(cb.getState()).toBe('CLOSED');
  });
});
