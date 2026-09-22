/**
 * Federated OAuth Identity Provider Interfaces
 * 
 * Defines standard contract for third-party identity providers (Google, Facebook, Apple).
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 039
 */

import { ClientType } from '@/shared/auth/token-policy';

export type OAuthProviderName = 'GOOGLE' | 'FACEBOOK' | 'APPLE';

export interface OAuthUserProfile {
  provider: OAuthProviderName;
  providerUserId: string; // Subject ID (sub/id)
  email: string | null;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  rawProfile?: Record<string, any>;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

export interface IOAuthProvider {
  readonly name: OAuthProviderName;

  /**
   * Generates provider-specific authorization URL for browser redirect.
   */
  getAuthorizationUrl(state: string, redirectUri: string): string;

  /**
   * Exchanges an authorization code for access/ID tokens.
   */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse>;

  /**
   * Fetches user profile using acquired token credentials.
   */
  getUserProfile(tokens: OAuthTokenResponse): Promise<OAuthUserProfile>;

  /**
   * Verifies an ID token or access token from native SDKs (Flutter/Mobile/SPA).
   */
  verifyToken(token: string): Promise<OAuthUserProfile>;
}

export interface OAuthInitiateResult {
  authorizationUrl: string;
  state: string;
  cookieOptions: {
    name: string;
    value: string;
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
  };
}

export interface OAuthCallbackResult {
  success: boolean;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    avatarUrl: string | null;
    status: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    roles: string[];
    permissions: string[];
    sellerId: string | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshExpiresIn: number;
  };
  sessionId: string;
  cookies?: Array<{
    name: string;
    value: string;
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
  }>;
  returnUrl?: string;
  isNewUser: boolean;
}

export interface OAuthVerifyInput {
  provider: 'google' | 'facebook';
  idToken?: string;
  accessToken?: string;
  clientType?: ClientType;
  meta?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}
