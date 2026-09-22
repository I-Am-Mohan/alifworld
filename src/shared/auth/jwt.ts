/**
 * AlifWorld Native Cryptographic JWT Engine
 * 
 * Provides RFC 7519 compliant JSON Web Token signing and verification using HMAC-SHA256 (HS256).
 * Features constant-time signature comparison to eliminate timing attack vectors.
 * 
 * Invariants: ADR-0031, OWASP Token Standards
 */

import { createHmac, timingSafeEqual, createHash } from 'crypto';
import { UnauthorizedError } from '@/shared/errors/app-error';
import {
  AccessTokenClaims,
  RefreshTokenClaims,
  TOKEN_POLICIES,
  ClientType,
} from './token-policy';
import { generateId } from '@/shared/utils/id';

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input;
  return buf.toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

export interface JwtSignOptions {
  expiresInSeconds?: number;
  issuer?: string;
  audience?: string;
}

/**
 * Signs an arbitrary JSON payload into an RFC 7519 HS256 JWT token.
 */
export function signJwt<T extends Record<string, unknown>>(
  payload: T,
  secret: string,
  options: JwtSignOptions = {}
): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = options.expiresInSeconds
    ? nowSeconds + options.expiresInSeconds
    : (payload.exp as number) || nowSeconds + TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const finalPayload = {
    ...payload,
    iss: options.issuer || payload.iss || TOKEN_POLICIES.ISSUER,
    aud: options.audience || payload.aud || TOKEN_POLICIES.AUDIENCE,
    iat: nowSeconds,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(finalPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies an HS256 JWT token with constant-time signature validation and expiration checks.
 */
export function verifyJwt<T extends Record<string, unknown>>(
  token: string,
  secret: string
): T {
  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('Authentication token missing or invalid');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new UnauthorizedError('Malformed token format');
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');

  const receivedSigBuf = Buffer.from(receivedSignature);
  const expectedSigBuf = Buffer.from(expectedSignature);

  if (
    receivedSigBuf.length !== expectedSigBuf.length ||
    !timingSafeEqual(receivedSigBuf, expectedSigBuf)
  ) {
    throw new UnauthorizedError('Invalid token signature or token corrupted');
  }

  let claims: T;
  try {
    claims = JSON.parse(base64UrlDecode(encodedPayload)) as T;
  } catch {
    throw new UnauthorizedError('Failed to parse token claims');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof claims.exp === 'number' && claims.exp < nowSeconds) {
    throw new UnauthorizedError('Token has expired', {
      expiredAt: new Date(claims.exp * 1000).toISOString(),
    });
  }

  return claims;
}

/**
 * Issues a typed Access Token for an authenticated actor.
 */
export function generateAccessToken(
  params: {
    userId: string;
    email: string | null;
    phone: string | null;
    roles: string[];
    permissions: string[];
    sellerId?: string | null;
    tokenVersion: number;
    sessionId: string;
    clientType: ClientType;
  },
  secret: string
): string {
  const claims: Omit<AccessTokenClaims, 'iss' | 'aud' | 'exp' | 'iat'> = {
    sub: params.userId,
    email: params.email,
    phone: params.phone,
    roles: params.roles,
    permissions: params.permissions,
    sellerId: params.sellerId ?? null,
    tokenVersion: params.tokenVersion,
    sessionId: params.sessionId,
    clientType: params.clientType,
    jti: generateId('ses'),
  };

  return signJwt(claims as Record<string, unknown>, secret, {
    expiresInSeconds: TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS,
  });
}

/**
 * Issues a typed Refresh Token for session rotation.
 */
export function generateRefreshToken(
  params: {
    userId: string;
    sessionId: string;
    tokenVersion: number;
    clientType: ClientType;
  },
  secret: string
): string {
  const ttl =
    params.clientType === 'MOBILE_FLUTTER'
      ? TOKEN_POLICIES.MOBILE_REFRESH_TOKEN_TTL_SECONDS
      : TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS;

  const claims: Omit<RefreshTokenClaims, 'iss' | 'aud' | 'exp' | 'iat'> = {
    sub: params.userId,
    sessionId: params.sessionId,
    tokenVersion: params.tokenVersion,
    clientType: params.clientType,
    jti: generateId('ses'),
  };

  return signJwt(claims as Record<string, unknown>, secret, {
    expiresInSeconds: ttl,
  });
}

/**
 * Extracts a Bearer token from standard HTTP Authorization header.
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Produces a SHA-256 hexadecimal hash of a token for secure database storage.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
