/**
 * AlifWorld Authoritative Token Policy & Authentication Standards
 * 
 * Defines lifetime policies, cookie configurations, claim schemas,
 * and security invariants for web browsers and mobile Flutter clients.
 * 
 * Reference: docs/architecture/authentication-architecture-and-token-policy.md
 * Invariant: ADR-0031
 */

export const TOKEN_POLICIES = {
  // Access Token: Short-lived stateless JWT
  ACCESS_TOKEN_TTL_SECONDS: 900, // 15 minutes
  ACCESS_TOKEN_COOKIE_NAME: 'aw_access_token',

  // Web Refresh Token: Long-lived rotating token stored in HttpOnly cookie
  WEB_REFRESH_TOKEN_TTL_SECONDS: 7 * 24 * 3600, // 7 days (604,800s)

  // Mobile Flutter Refresh Token: Extended retention for native secure storage
  MOBILE_REFRESH_TOKEN_TTL_SECONDS: 30 * 24 * 3600, // 30 days (2,592,000s)

  // Cookie Identifiers
  REFRESH_TOKEN_COOKIE_NAME: 'aw_refresh_token',

  // Session & Inactivity Limits
  SESSION_INACTIVITY_TIMEOUT_SECONDS: 2 * 24 * 3600, // 48 hours
  MAX_ACTIVE_SESSIONS_PER_USER: 5,

  // Ephemeral Verification Tokens
  OTP_TOKEN_TTL_SECONDS: 300, // 5 minutes
  MAX_OTP_ATTEMPTS: 3,

  // Token Issuer & Audience
  ISSUER: 'https://alifworld.com',
  AUDIENCE: 'https://api.alifworld.com',
} as const;

export type ClientType = 'WEB' | 'MOBILE_FLUTTER' | 'POS' | 'ADMIN_PORTAL';

export interface AccessTokenClaims {
  sub: string;               // User ID (e.g. usr_...)
  email: string | null;      // Primary email address
  phone: string | null;      // Primary E.164 phone
  roles: string[];           // RBAC role codes (SUPER_ADMIN, SELLER_OWNER, CUSTOMER, etc.)
  permissions: string[];     // Granular permission codes (catalog:read, orders:write, etc.)
  sellerId: string | null;   // Active seller tenant ID if seller staff/owner
  tokenVersion: number;      // User tokenVersion for instant global revocation
  sessionId: string;         // Underlying UserSession ID
  clientType: ClientType;    // Client platform category
  iss: string;               // Issuer
  aud: string;               // Audience
  exp: number;               // Unix expiration timestamp in seconds
  iat: number;               // Unix issued-at timestamp in seconds
  jti: string;               // Unique JWT identifier
}

export interface RefreshTokenClaims {
  sub: string;               // User ID
  sessionId: string;         // Underlying UserSession ID
  familyId: string;          // Refresh token family ID (Milestone 035)
  generation: number;        // Monotonically increasing generation number in family (0, 1, 2, ...)
  tokenVersion: number;      // User tokenVersion
  clientType: ClientType;    // Client category
  iss: string;               // Issuer
  aud: string;               // Audience
  exp: number;               // Expiration timestamp in seconds
  iat: number;               // Issued at timestamp in seconds
  jti: string;               // Unique token identifier
}

export interface AuthCookieOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
}

/**
 * Returns security cookie attributes adhering to OWASP and browser standards.
 */
export function getAuthCookieOptions(
  type: 'ACCESS' | 'REFRESH',
  value: string,
  isProduction: boolean = process.env.NODE_ENV === 'production'
): AuthCookieOptions {
  if (type === 'ACCESS') {
    return {
      name: TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME,
      value,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  return {
    name: TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth', // Scoped strictly to authentication refresh endpoints
    maxAge: TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS,
  };
}

/**
 * Strong password complexity policy:
 * - Minimum 8 characters, maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one numeric digit
 * - At least one special symbol
 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,128}$/,
  REQUIREMENTS: [
    'Minimum 8 characters (maximum 128)',
    'At least one uppercase English letter (A-Z)',
    'At least one lowercase English letter (a-z)',
    'At least one number (0-9)',
    'At least one special character (!@#$%^&*...)',
  ],
};
