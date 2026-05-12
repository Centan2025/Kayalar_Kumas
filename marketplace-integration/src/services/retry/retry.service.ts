import { Logger } from '../logger/logger.service';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export class RetryService {
  static async execute<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    operationName: string = 'unknown'
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        Logger.debug(`[Retry] Attempt ${attempt}/${opts.maxAttempts}`, { operationName });
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        Logger.warn(`[Retry] Attempt ${attempt} failed for ${operationName}`, {
          attempt,
          maxAttempts: opts.maxAttempts,
          error: lastError.message,
        });

        if (attempt < opts.maxAttempts) {
          const delay = Math.min(
            opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
            opts.maxDelayMs
          );
          const jitter = delay * (0.5 + Math.random() * 0.5);

          Logger.debug(`[Retry] Waiting ${Math.round(jitter)}ms before next attempt`, {
            operationName,
          });

          await new Promise((resolve) => setTimeout(resolve, jitter));
        }
      }
    }

    Logger.error(`[Retry] All ${opts.maxAttempts} attempts exhausted for ${operationName}`, {
      error: lastError?.message,
    });

    throw lastError;
  }
}
