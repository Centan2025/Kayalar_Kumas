export class BaseError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ProviderError extends BaseError {
  constructor(
    message: string,
    public marketplace: string,
    code: string = 'PROVIDER_ERROR',
    statusCode: number = 502,
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, { ...context, marketplace });
  }
}

export class AuthError extends ProviderError {
  constructor(marketplace: string, context?: Record<string, unknown>) {
    super('Authentication failed for marketplace', marketplace, 'AUTH_ERROR', 401, context);
  }
}

export class RateLimitError extends ProviderError {
  constructor(marketplace: string, context?: Record<string, unknown>) {
    super('Rate limit exceeded for marketplace', marketplace, 'RATE_LIMIT_ERROR', 429, context);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
  }
}
