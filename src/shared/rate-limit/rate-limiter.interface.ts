/**
 * Distributed Rate Limiter Interfaces
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 040
 */

export interface RateLimitPolicy {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  isAllowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
}

export interface IRateLimiter {
  consume(key: string, policy: RateLimitPolicy): Promise<RateLimitResult>;
  reset(key: string, keyPrefix?: string): Promise<void>;
}
