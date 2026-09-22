/**
 * Standard Application Rate Limiting Policies
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 040
 */

import { RateLimitPolicy } from './rate-limiter.interface';
import { getServerEnv } from '@/shared/config/environment';

export function getRateLimitPolicies(): Record<string, RateLimitPolicy> {
  const env = getServerEnv();

  return {
    // Login attempts (5 per 60 seconds by identifier/IP)
    AUTH_LOGIN: {
      keyPrefix: 'auth_login',
      windowMs: 60 * 1000,
      maxRequests: env.RATE_LIMIT_AUTH_MAX_ATTEMPTS || 5,
    },

    // SMS OTP send limit (3 per hour by mobile number/IP)
    AUTH_SMS_OTP: {
      keyPrefix: 'auth_sms_otp',
      windowMs: 60 * 60 * 1000,
      maxRequests: env.RATE_LIMIT_SMS_OTP_MAX_PER_HOUR || 3,
    },

    // Phone OTP verify attempts (5 per 15 minutes)
    AUTH_PHONE_VERIFY: {
      keyPrefix: 'auth_phone_verify',
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    },

    // Password reset requests (3 per hour by email/IP)
    AUTH_PASSWORD_RESET: {
      keyPrefix: 'auth_password_reset',
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
    },

    // Password reset submissions (5 per 15 minutes)
    AUTH_PASSWORD_RESET_SUBMIT: {
      keyPrefix: 'auth_pw_reset_sub',
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    },

    // Token refresh rotation (30 per 60 seconds)
    AUTH_TOKEN_REFRESH: {
      keyPrefix: 'auth_refresh',
      windowMs: 60 * 1000,
      maxRequests: 30,
    },

    // Global baseline API rate limit (100 per minute)
    GLOBAL_API: {
      keyPrefix: 'global',
      windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS || 60 * 1000,
      maxRequests: env.RATE_LIMIT_GLOBAL_MAX_REQUESTS || 100,
    },
  };
}
