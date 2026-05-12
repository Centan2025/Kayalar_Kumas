import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryService } from '../../src/services/retry/retry.service';

describe('RetryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await RetryService.execute(fn, { maxAttempts: 3 }, 'test');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('recovered');

    const result = await RetryService.execute(
      fn,
      { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 50 },
      'test'
    );
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after all attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent fail'));
    await expect(
      RetryService.execute(fn, { maxAttempts: 2, baseDelayMs: 10, maxDelayMs: 20 }, 'test')
    ).rejects.toThrow('permanent fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
