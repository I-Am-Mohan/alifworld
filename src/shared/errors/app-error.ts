/**
 * AlifWorld Standardized Domain Error Catalog & Exception Hierarchy
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly details?: Record<string, unknown> | Array<unknown>;

  constructor(message: string, details?: Record<string, unknown> | Array<unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get code(): string {
    return this.errorCode;
  }

  toJSON() {
    return {
      success: false as const,
      error: {
        code: this.errorCode,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  readonly errorCode = 'VALIDATION_FAILED';
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHENTICATED';
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode: string = 'UNAUTHORIZED';
}

export class TokenReuseDetectedError extends UnauthorizedError {
  readonly errorCode = 'REFRESH_TOKEN_REUSE_DETECTED';
}

export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
}

export class ComplianceGateError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'FEATURE_PENDING_REGULATORY_APPROVAL';

  constructor(gateId: string, message: string) {
    super(message, { gateId });
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly errorCode = 'RATE_LIMIT_EXCEEDED';
  readonly retryAfterSeconds: number;

  constructor(
    message: string = 'Too many requests. Please try again later.',
    retryAfterSeconds: number = 60,
    details?: Record<string, unknown>
  ) {
    super(message, { retryAfterSeconds, ...details });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';
}
