/**
 * AlifWorld Typed Runtime Environment & Secret Boundaries Configuration
 *
 * Environment variables are limited to infrastructure/runtime configuration
 * and secrets.
 *
 * Operational platform settings such as:
 * - Timezone
 * - Locales
 * - Currencies
 * - Storage provider/configuration
 * - Payment gateways
 * - Courier/logistics providers
 * - SMS gateways
 * - Feature flags
 *
 * are managed through the Admin Operations Console (/admin/setup)
 * and persisted in PostgreSQL.
 *
 * Reference:
 * docs/architecture/environment-branching-and-release-strategy.md
 */

import { z } from 'zod';

// ==============================================================================
// 1. CLIENT ENVIRONMENT SCHEMA
// ==============================================================================
//
// Only NEXT_PUBLIC_* variables may be exposed to browser/client bundles.
// ==============================================================================

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),

  NEXT_PUBLIC_CDN_URL: z
    .string()
    .default(''),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

// ==============================================================================
// 2. SERVER ENVIRONMENT SCHEMA
// ==============================================================================
//
// Contains infrastructure/runtime configuration and secrets only.
//
// Operational business/platform configuration is NOT stored here.
// It is loaded from PostgreSQL through the Admin Operations Console.
// ==============================================================================

export const serverEnvSchema = clientEnvSchema.extend({
  // --------------------------------------------------------------------------
  // Core Application Runtime
  // --------------------------------------------------------------------------

  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  APP_ENV: z
    .enum(['local', 'development', 'staging', 'production'])
    .default('local'),

  PORT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(3000),

  APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),

  API_URL: z
    .string()
    .url()
    .default('http://localhost:3000/api/v1'),

  // --------------------------------------------------------------------------
  // PostgreSQL / Prisma
  // --------------------------------------------------------------------------

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required'),

  DATABASE_POOL_MIN: z
    .coerce
    .number()
    .int()
    .nonnegative()
    .default(2),

  DATABASE_POOL_MAX: z
    .coerce
    .number()
    .int()
    .positive()
    .default(10),

  // --------------------------------------------------------------------------
  // Redis / Cache / Locks / BullMQ
  // --------------------------------------------------------------------------

  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL is required'),

  REDIS_KEY_PREFIX: z
    .string()
    .default('alif:'),

  REDIS_TLS_ENABLED: z
    .preprocess(
      (value) => value === 'true' || value === true,
      z.boolean()
    )
    .default(false),

  // --------------------------------------------------------------------------
  // Authentication / Sessions / Security
  // --------------------------------------------------------------------------

  JWT_SECRET: z
    .string()
    .min(
      32,
      'JWT_SECRET must be at least 32 characters for HMAC SHA-256 security'
    ),

  JWT_EXPIRES_IN: z
    .string()
    .default('7d'),

  REFRESH_TOKEN_EXPIRES_IN: z
    .string()
    .default('30d'),

  SESSION_SECRET: z
    .string()
    .min(
      32,
      'SESSION_SECRET must be at least 32 characters'
    ),

  COOKIE_DOMAIN: z
    .string()
    .default('localhost'),

  COOKIE_SECURE: z
    .preprocess(
      (value) => value === 'true' || value === true,
      z.boolean()
    )
    .default(false),

  // --------------------------------------------------------------------------
  // Rate Limiting
  // --------------------------------------------------------------------------

  RATE_LIMIT_GLOBAL_WINDOW_MS: z
    .coerce
    .number()
    .int()
    .positive()
    .default(60000),

  RATE_LIMIT_GLOBAL_MAX_REQUESTS: z
    .coerce
    .number()
    .int()
    .positive()
    .default(100),

  RATE_LIMIT_AUTH_MAX_ATTEMPTS: z
    .coerce
    .number()
    .int()
    .positive()
    .default(5),

  RATE_LIMIT_SMS_OTP_MAX_PER_HOUR: z
    .coerce
    .number()
    .int()
    .positive()
    .default(3),

  // --------------------------------------------------------------------------
  // Observability / Logging / Telemetry
  // --------------------------------------------------------------------------

  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),

  LOG_FORMAT: z
    .enum(['json', 'pretty'])
    .default('json'),

  SENTRY_DSN: z
    .string()
    .optional(),

  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ==============================================================================
// 3. ENVIRONMENT PARSER & REDACTION UTILITY
// ==============================================================================

const SENSITIVE_KEY_PATTERNS = [
  /SECRET/i,
  /KEY/i,
  /PASSWORD/i,
  /PASSWD/i,
  /TOKEN/i,
  /AUTH/i,
  /DATABASE_URL/i,
  /REDIS_URL/i,
];

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function redactSecret(
  key: string,
  value: unknown
): string {
  if (value === undefined || value === null) {
    return '[UNSET]';
  }

  if (isSensitiveKey(key)) {
    return '***[REDACTED]***';
  }

  return String(value);
}

function formatZodErrors(
  issues: z.ZodIssue[]
): string {
  return issues
    .map((issue) => {
      const path = issue.path.join('.');
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');
}

// ==============================================================================
// 4. CLIENT ENVIRONMENT VALIDATION
// ==============================================================================

export function validateClientEnv(
  input: Record<string, unknown> =
    (typeof process !== 'undefined'
      ? process.env
      : {}) as Record<string, unknown>
): ClientEnv {
  const result = clientEnvSchema.safeParse(input);

  if (!result.success) {
    const errorMsg =
      `\n[AlifWorld Configuration Error] ` +
      `Invalid Client Environment Variables:\n` +
      `${formatZodErrors(result.error.issues)}\n`;

    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return result.data;
}

// ==============================================================================
// 5. SERVER ENVIRONMENT VALIDATION
// ==============================================================================

export function validateServerEnv(
  input: Record<string, unknown> =
    (typeof process !== 'undefined'
      ? process.env
      : {}) as Record<string, unknown>
): ServerEnv {
  // Server environment must never be validated in the browser.
  if (typeof window !== 'undefined') {
    throw new Error(
      '[Security Violation] Server environment validation attempted ' +
        'in browser context. Server secrets must never be exposed to ' +
        'the client!'
    );
  }

  const result = serverEnvSchema.safeParse(input);

  if (!result.success) {
    const errorMsg =
      `\n[AlifWorld Configuration Error] ` +
      `Invalid Server Environment Variables:\n` +
      `${formatZodErrors(result.error.issues)}\n`;

    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return result.data;
}

// ==============================================================================
// 6. RUNTIME SINGLETONS & SECRET BOUNDARY GUARDS
// ==============================================================================

/**
 * Safe client environment singleton.
 *
 * Contains ONLY NEXT_PUBLIC_* configuration.
 */
export const clientEnv: ClientEnv = validateClientEnv();

/**
 * Lazily validated server environment singleton.
 *
 * Server secrets are protected from accidental client access.
 */
let cachedServerEnv: ServerEnv | null = null;

export const env: ServerEnv = new Proxy(
  {} as ServerEnv,
  {
    get(_target, prop: string | symbol) {
      if (typeof window !== 'undefined') {
        throw new Error(
          `[Security Violation] Attempted to read server environment ` +
            `variable '${String(prop)}' on the client. ` +
            `Only NEXT_PUBLIC_* variables may be accessed in browser ` +
            `code via clientEnv.`
        );
      }

      if (!cachedServerEnv) {
        cachedServerEnv = validateServerEnv();
      }

      return cachedServerEnv[prop as keyof ServerEnv];
    },
  }
);

/**
 * Returns the lazily validated server environment.
 */
export function getServerEnv(): ServerEnv {
  if (!cachedServerEnv) {
    cachedServerEnv = validateServerEnv();
  }

  return cachedServerEnv;
}

// ==============================================================================
// 7. APPLICATION CONFIGURATION
// ==============================================================================
//
// IMPORTANT:
// Operational configuration is intentionally NOT read from process.env.
// It must come from PostgreSQL / Admin Operations Console.
// ==============================================================================

export function getAppConfig() {
  return {
    appEnv: env.APP_ENV,

    databaseUrl: env.DATABASE_URL,

    gates: {},
  };
}