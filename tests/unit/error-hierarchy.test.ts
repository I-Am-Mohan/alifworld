/**
 * Unit Tests for AppError Domain Error Hierarchy
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 */

import { describe, it, expect } from 'bun:test';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ComplianceGateError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
} from '@/shared/errors/app-error';

describe('Domain Error Hierarchy & Envelope Serialization', () => {
  it('serializes ValidationError to HTTP 422 standard envelope', () => {
    const err = new ValidationError('Invalid request payload', { field: 'phone', reason: 'invalid_format' });
    expect(err.statusCode).toBe(422);
    expect(err.errorCode).toBe('VALIDATION_FAILED');
    expect(err.toJSON()).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid request payload',
        details: { field: 'phone', reason: 'invalid_format' },
      },
    });
  });

  it('serializes AuthenticationError to HTTP 401 standard envelope', () => {
    const err = new AuthenticationError('Authentication required');
    expect(err.statusCode).toBe(401);
    expect(err.errorCode).toBe('UNAUTHENTICATED');
  });

  it('serializes AuthorizationError to HTTP 403 standard envelope', () => {
    const err = new AuthorizationError('Forbidden: Insufficient privileges');
    expect(err.statusCode).toBe(403);
    expect(err.errorCode).toBe('FORBIDDEN');
  });

  it('serializes ComplianceGateError with gate metadata', () => {
    const err = new ComplianceGateError('GATE-02', 'Lottery feature is pending regulatory approval');
    expect(err.statusCode).toBe(403);
    expect(err.errorCode).toBe('FEATURE_PENDING_REGULATORY_APPROVAL');
    expect(err.details).toEqual({ gateId: 'GATE-02' });
  });

  it('serializes NotFoundError to HTTP 404', () => {
    const err = new NotFoundError('Seller not found');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
  });

  it('serializes ConflictError to HTTP 409', () => {
    const err = new ConflictError('Duplicate transaction idempotency key');
    expect(err.statusCode).toBe(409);
    expect(err.errorCode).toBe('CONFLICT');
  });

  it('serializes RateLimitError to HTTP 429', () => {
    const err = new RateLimitError('Too many requests');
    expect(err.statusCode).toBe(429);
    expect(err.errorCode).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('serializes InternalServerError to HTTP 500', () => {
    const err = new InternalServerError('Database connection failed');
    expect(err.statusCode).toBe(500);
    expect(err.errorCode).toBe('INTERNAL_SERVER_ERROR');
  });
});
