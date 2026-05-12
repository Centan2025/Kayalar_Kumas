import { Logger } from '../logger/logger.service';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenMaxAttempts: 3,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private readonly options: CircuitBreakerOptions;
  private readonly name: string;

  constructor(name: string, options?: Partial<CircuitBreakerOptions>) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN — rejecting call`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      Logger.info(`[CircuitBreaker:${this.name}] recovered — closing circuit`);
    }
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.transitionTo('CLOSED');
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
        this.transitionTo('OPEN');
      }
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      Logger.warn(`[CircuitBreaker:${this.name}] ${this.state} → ${newState}`, {
        failureCount: this.failureCount,
      });
      this.state = newState;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
  }
}
