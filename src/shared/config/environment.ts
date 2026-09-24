/**
 * AlifWorld Typed Runtime Environment & Secret Boundaries Configuration
 * 
 * Enforces strict Zod validation at process boot and prevents server-side secrets
 * from leaking into client-side browser bundles.
 * 
 * Reference: docs/architecture/environment-branching-and-release-strategy.md
 * Invariants: docs/architecture/project-charter.md
 */

import { z } from 'zod';

// ==============================================================================
// 1. CLIENT ENVIRONMENT SCHEMA (Safe to expose in browser bundles)
// ==============================================================================
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_CDN_URL: z.string().default(''),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['bn-BD', 'en-BD', 'bn', 'en'], {
    errorMap: () => ({ message: 'Unsupported locale in NEXT_PUBLIC_DEFAULT_LOCALE' }),
  }).default('bn-BD'),
  NEXT_PUBLIC_BASE_CURRENCY: z.string().default('BDT'),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

// ==============================================================================
// 2. SERVER ENVIRONMENT SCHEMA (Restricted to server & worker runtimes)
// ==============================================================================
export const serverEnvSchema = clientEnvSchema.extend({
  // Core Application Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3000/api/v1'),
  TZ: z.string().refine((val) => val === 'Asia/Dhaka', {
    message: 'Invalid timezone: platform business timezone must be Asia/Dhaka',
  }).default('Asia/Dhaka'),
  DEFAULT_LOCALE: z.string().default('bn-BD'),
  SUPPORTED_LOCALES: z.string().default('en-BD,bn-BD'),
  BASE_CURRENCY: z.string().default('BDT'),

  // PostgreSQL Database & Connection Pooling
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .default('postgresql://user:pass@host:5432/db'),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  // Redis Distributed Cache, Locks & BullMQ
  REDIS_URL: z.string().min(1).default('redis://localhost:6379/0'),
  REDIS_KEY_PREFIX: z.string().default('alif:'),
  REDIS_TLS_ENABLED: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),

  // Authentication, Sessions & Security Secrets
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for HMAC SHA-256 security')
    .default('change_me_to_a_secure_random_string_in_production_min_32_chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('change_me_to_another_secret_32_chars'),
  PAYOUT_PROFILE_ENCRYPTION_KEY: z.string().min(32, 'PAYOUT_PROFILE_ENCRYPTION_KEY must be at least 32 characters').default('local_payout_profile_key_change_in_production_32'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_GLOBAL_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_AUTH_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_SMS_OTP_MAX_PER_HOUR: z.coerce.number().int().positive().default(3),

  // Object Storage (AWS S3 / Cloudflare R2)
  STORAGE_PROVIDER: z.enum(['AWS_S3', 'CLOUDFLARE_R2', 'AMAZON_S3']).default('AWS_S3'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_BUCKET_NAME: z.string().default('alifworld-media'),
  S3_FORCE_PATH_STYLE: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  S3_PUBLIC_BASE_URL: z.string().default(''),
  R2_ACCOUNT_ID: z.string().optional(),

  // Bangladesh MFS & Payment Gateways
  BKASH_APP_KEY: z.string().default('mock_bkash_app_key'),
  BKASH_APP_SECRET: z.string().default('mock_bkash_app_secret'),
  BKASH_USERNAME: z.string().default('mock_bkash_user'),
  BKASH_PASSWORD: z.string().default('mock_bkash_pass'),
  BKASH_BASE_URL: z.string().url().default('https://tokenized.sandbox.bka.sh/v1.2.0-beta'),

  NAGAD_MERCHANT_ID: z.string().default('mock_nagad_merchant'),
  NAGAD_PUBLIC_KEY: z.string().default('mock_nagad_pubkey'),
  NAGAD_PRIVATE_KEY: z.string().default('mock_nagad_privkey'),
  NAGAD_BASE_URL: z
    .string()
    .url()
    .default('http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'),

  SSLCOMMERZ_STORE_ID: z.string().default('mock_sslcommerz_store'),
  SSLCOMMERZ_STORE_PASSWD: z.string().default('mock_sslcommerz_passwd'),
  SSLCOMMERZ_IS_SANDBOX: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(true),

  // Bangladesh Logistics Partners
  PATHAO_CLIENT_ID: z.string().default('mock_pathao_client_id'),
  PATHAO_CLIENT_SECRET: z.string().default('mock_pathao_client_secret'),
  PATHAO_USERNAME: z.string().default('mock_pathao_user'),
  PATHAO_PASSWORD: z.string().default('mock_pathao_pass'),
  PATHAO_BASE_URL: z.string().url().default('https://courier-api-sandbox.pathao.com'),

  REDX_ACCESS_TOKEN: z.string().default('mock_redx_token'),
  REDX_BASE_URL: z.string().url().default('https://sandbox.redx.com.bd/v1.0.0-beta'),

  STEADFAST_API_KEY: z.string().default('mock_steadfast_api_key'),
  STEADFAST_SECRET_KEY: z.string().default('mock_steadfast_secret_key'),
  STEADFAST_BASE_URL: z.string().url().default('https://portal.steadfast.com.bd/api/v1'),

  // SMS Gateway
  SMS_GATEWAY_PROVIDER: z.enum(['mock', 'greenweb', 'twilio']).default('mock'),
  GREENWEB_API_TOKEN: z.string().default('mock_greenweb_token'),
  TWILIO_ACCOUNT_SID: z.string().default('mock_twilio_sid'),
  TWILIO_AUTH_TOKEN: z.string().default('mock_twilio_token'),
  TWILIO_PHONE_NUMBER: z.string().default('+1234567890'),

  // Third-Party OAuth Providers (Google & Facebook)
  GOOGLE_CLIENT_ID: z.string().default('mock_google_client_id'),
  GOOGLE_CLIENT_SECRET: z.string().default('mock_google_client_secret'),
  FACEBOOK_APP_ID: z.string().default('mock_facebook_app_id'),
  FACEBOOK_APP_SECRET: z.string().default('mock_facebook_app_secret'),

  // Compliance Approval Gates & Locked Invariants
  FEATURE_AFFILIATE_MULTI_TIER_ENABLED: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(true),
  MAX_AFFILIATE_DEPTH: z.coerce
    .number()
    .int()
    .min(1)
    .max(1, 'Locked Invariant: Multi-tier pyramid referral is prohibited. Depth must be exactly 1')
    .default(1),
  FEATURE_LOTTERY_ENABLED: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(true),
  FEATURE_MFS_DIRECT_DEBIT_ENABLED: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(true),
  FEATURE_NBR_TAX_INTEGRATION_ENABLED: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(true),
  FEATURE_MAKER_CHECKER_PAYOUT_ENABLED: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(true),
  MAKER_CHECKER_THRESHOLD_POISHA: z.coerce.number().int().positive().default(5000000), // 50,000 BDT
  FEATURE_POINTS_CASH_CONVERTIBLE: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .refine((val) => val === false, {
      message: 'Locked Invariant: Product Points are non-convertible loyalty metric',
    })
    .default(false),
  FEATURE_ADVANCED_SHOPPING_ENABLED: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(true),

  // Observability & Telemetry
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
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

/**
 * Returns true if a key name is considered a secret/credential.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Redacts sensitive credentials from strings or values before logging.
 */
export function redactSecret(key: string, value: unknown): string {
  if (value === undefined || value === null) return '[UNSET]';
  if (isSensitiveKey(key)) {
    return '***[REDACTED]***';
  }
  return String(value);
}

/**
 * Formats Zod errors into clean, redacted error output without leaking sensitive data.
 */
function formatZodErrors(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.join('.');
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');
}

/**
 * Validates client environment variables. Safe for browser usage.
 */
export function validateClientEnv(
  input: Record<string, unknown> = (typeof process !== 'undefined' ? process.env : {}) as Record<string, unknown>
): ClientEnv {
  const result = clientEnvSchema.safeParse(input);
  if (!result.success) {
    const errorMsg = `\n[AlifWorld Configuration Error] Invalid Client Environment Variables:\n${formatZodErrors(
      result.error.issues
    )}\n`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return result.data;
}

/**
 * Validates server environment variables. Strictly prohibited in browser runtimes.
 */
export function validateServerEnv(
  input: Record<string, unknown> = (typeof process !== 'undefined' ? process.env : {}) as Record<string, unknown>
): ServerEnv {
  // Guard against accidental execution in browser
  if (typeof window !== 'undefined') {
    throw new Error(
      '[Security Violation] Server environment validation attempted in browser context. Server secrets must never be exposed to the client!'
    );
  }

  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    const errorMsg = `\n[AlifWorld Configuration Error] Invalid Server Environment Variables:\n${formatZodErrors(
      result.error.issues
    )}\n`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return result.data;
}

// ==============================================================================
// 4. RUNTIME SINGLETONS & SECRET BOUNDARY GUARDS
// ==============================================================================

/**
 * Safe client environment singleton, containing only NEXT_PUBLIC_* variables.
 */
export const clientEnv: ClientEnv = validateClientEnv();

/**
 * Lazily validated server environment singleton.
 * Uses a Proxy guard to throw an immediate descriptive error if accessed on the client.
 */
let cachedServerEnv: ServerEnv | null = null;

export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string | symbol) {
    if (typeof window !== 'undefined') {
      throw new Error(
        `[Security Violation] Attempted to read server environment variable '${String(
          prop
        )}' on the client. Only NEXT_PUBLIC_* variables may be accessed in browser code via clientEnv.`
      );
    }

    if (!cachedServerEnv) {
      cachedServerEnv = validateServerEnv();
    }

    return cachedServerEnv[prop as keyof ServerEnv];
  },
});

/**
 * Returns the lazily validated server environment.
 * Kept as a function so services can defer secret access until runtime.
 */
export function getServerEnv(): ServerEnv {
  if (!cachedServerEnv) {
    cachedServerEnv = validateServerEnv();
  }
  return cachedServerEnv;
}

/**
 * Convenient structured application configuration getter.
 */
export function getAppConfig() {
  return {
    appEnv: env.APP_ENV,
    timezone: env.TZ,
    baseCurrency: env.BASE_CURRENCY,
    supportedLocales: env.SUPPORTED_LOCALES,
    databaseUrl: env.DATABASE_URL,
    gates: {
      featureAffiliateMultiTierEnabled: env.FEATURE_AFFILIATE_MULTI_TIER_ENABLED,
      maxAffiliateDepth: env.MAX_AFFILIATE_DEPTH,
      featureLotteryEnabled: env.FEATURE_LOTTERY_ENABLED,
      featureMfsDirectDebitEnabled: env.FEATURE_MFS_DIRECT_DEBIT_ENABLED,
      featureNbrTaxIntegrationEnabled: env.FEATURE_NBR_TAX_INTEGRATION_ENABLED,
      featureMakerCheckerPayoutEnabled: env.FEATURE_MAKER_CHECKER_PAYOUT_ENABLED,
      featurePointsCashConvertible: env.FEATURE_POINTS_CASH_CONVERTIBLE,
      featureAdvancedShoppingEnabled: env.FEATURE_ADVANCED_SHOPPING_ENABLED,
    },
  };
}
