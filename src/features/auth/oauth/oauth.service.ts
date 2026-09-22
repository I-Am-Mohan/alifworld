/**
 * AlifWorld Federated OAuth Orchestration Service
 * 
 * Manages OAuth 2.0 lifecycle, HMAC-SHA256 anti-CSRF state verification,
 * federated identity linking to local user accounts, atomic customer provisioning
 * (segregated 4 wallets + Point account), and token issuance.
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 039, NIST SP 800-63B
 */

import * as crypto from 'crypto';
import {
  IOAuthProvider,
  OAuthProviderName,
  OAuthInitiateResult,
  OAuthCallbackResult,
  OAuthUserProfile,
  OAuthTokenResponse,
  OAuthVerifyInput,
} from './oauth-provider.interface';
import { GoogleOAuthProvider } from './google-provider';
import { FacebookOAuthProvider } from './facebook-provider';
import { AuthTokenService, UserAuthDetails } from '@/services/auth-token.service';
import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { getServerEnv } from '@/shared/config/environment';
import { UnauthorizedError, ValidationError, ConflictError } from '@/shared/errors/app-error';

export interface OAuthStatePayload {
  nonce: string;
  provider: OAuthProviderName;
  returnUrl: string;
  clientType: 'WEB' | 'MOBILE_FLUTTER';
  timestamp: number;
}

export class OAuthService {
  private providers: Map<OAuthProviderName, IOAuthProvider>;
  private tokenService: AuthTokenService;
  private secret: string;
  private prismaClient?: any;

  constructor(
    tokenService?: AuthTokenService,
    prisma?: any,
    secret?: string,
    providers?: Map<OAuthProviderName, IOAuthProvider>
  ) {
    this.tokenService = tokenService || new AuthTokenService();
    this.prismaClient = prisma;
    this.secret = secret || getServerEnv().JWT_SECRET;

    if (providers) {
      this.providers = providers;
    } else {
      this.providers = new Map<OAuthProviderName, IOAuthProvider>();
      this.providers.set('GOOGLE', new GoogleOAuthProvider());
      this.providers.set('FACEBOOK', new FacebookOAuthProvider());
    }
  }

  private get prisma() {
    return this.prismaClient || (getPrismaClient() as any);
  }

  public getProvider(name: OAuthProviderName): IOAuthProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ValidationError(`Unsupported OAuth provider: ${name}`);
    }
    return provider;
  }

  /**
   * Cryptographically creates a signed anti-CSRF state token.
   */
  generateState(
    provider: OAuthProviderName,
    returnUrl: string = '/',
    clientType: 'WEB' | 'MOBILE_FLUTTER' = 'WEB'
  ): { state: string; nonce: string } {
    const nonce = crypto.randomUUID();
    const payload: OAuthStatePayload = {
      nonce,
      provider,
      returnUrl,
      clientType,
      timestamp: Date.now(),
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payloadBase64)
      .digest('base64url');

    return {
      state: `${payloadBase64}.${signature}`,
      nonce,
    };
  }

  /**
   * Verifies an anti-CSRF state token with HMAC-SHA256 and constant-time comparison.
   */
  verifyState(
    signedState: string,
    expectedProvider: OAuthProviderName,
    storedNonce?: string | null
  ): OAuthStatePayload {
    const parts = signedState.split('.');
    if (parts.length !== 2) {
      throw new UnauthorizedError('Invalid OAuth state parameter format');
    }

    const [payloadBase64, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payloadBase64)
      .digest('base64url');

    // Constant-time signature verification prevents timing attacks
    const sigBuf = Buffer.from(signature);
    const expectedSigBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      throw new UnauthorizedError('OAuth state signature verification failed (anti-CSRF breach)');
    }

    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedError('Malformed OAuth state payload');
    }

    // Check expiration (15 minutes TTL)
    const MAX_AGE_MS = 15 * 60 * 1000;
    if (Date.now() - payload.timestamp > MAX_AGE_MS) {
      throw new UnauthorizedError('OAuth state token has expired. Please try signing in again.');
    }

    if (payload.provider !== expectedProvider) {
      throw new UnauthorizedError(
        `OAuth provider mismatch: expected ${expectedProvider}, got ${payload.provider}`
      );
    }

    // Verify against HttpOnly cookie nonce if provided
    if (storedNonce && storedNonce !== payload.nonce) {
      throw new UnauthorizedError('OAuth anti-CSRF cookie mismatch');
    }

    return payload;
  }

  /**
   * Initiates browser-based OAuth flow for Web clients.
   */
  initiateAuth(
    providerName: OAuthProviderName,
    returnUrl: string = '/',
    originUrl?: string
  ): OAuthInitiateResult {
    const provider = this.getProvider(providerName);
    const { state, nonce } = this.generateState(providerName, returnUrl, 'WEB');

    const appUrl = originUrl || getServerEnv().APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/v1/auth/oauth/${providerName.toLowerCase()}/callback`;

    const authorizationUrl = provider.getAuthorizationUrl(state, redirectUri);
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      authorizationUrl,
      state,
      cookieOptions: {
        name: `alif_oauth_state_${providerName.toLowerCase()}`,
        value: nonce,
        maxAge: 900, // 15 mins
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      },
    };
  }

  /**
   * Handles browser redirect callback from identity provider.
   */
  async handleCallback(
    providerName: OAuthProviderName,
    code: string,
    state: string,
    storedNonce?: string | null,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
    originUrl?: string
  ): Promise<OAuthCallbackResult> {
    // 1. Verify anti-CSRF state token
    const statePayload = this.verifyState(state, providerName, storedNonce);

    const provider = this.getProvider(providerName);
    const appUrl = originUrl || getServerEnv().APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/v1/auth/oauth/${providerName.toLowerCase()}/callback`;

    // 2. Exchange authorization code for tokens
    const tokens = await provider.exchangeCode(code, redirectUri);

    // 3. Retrieve user profile
    const profile = await provider.getUserProfile(tokens);

    // 4. Link or provision user account in PostgreSQL
    const { user, isNewUser } = await this.findOrCreateOAuthUser(profile, tokens, meta);

    // 5. Build user auth details and issue session & JWTs
    const userAuthDetails: UserAuthDetails = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      status: user.status,
      tokenVersion: user.tokenVersion,
      roleAssignments: user.roleAssignments,
      sellerId: user.ownedSellers?.[0]?.id || user.sellerStaff?.[0]?.sellerId || null,
    };

    const tokenResult = await this.tokenService.issueTokenPair({
      user: userAuthDetails,
      clientType: statePayload.clientType,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      deviceInfo: `OAuth ${providerName} Web Login`,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        avatarUrl: user.avatarUrl,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        roles: tokenResult.user.roles,
        permissions: tokenResult.user.permissions,
        sellerId: tokenResult.user.sellerId,
      },
      tokens: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenType: 'Bearer',
        expiresIn: tokenResult.expiresIn,
        refreshExpiresIn: tokenResult.refreshExpiresIn,
      },
      sessionId: tokenResult.sessionId,
      cookies: tokenResult.cookies,
      returnUrl: statePayload.returnUrl,
      isNewUser,
    };
  }

  /**
   * Verifies native mobile tokens (Google ID token / Facebook access token) for Flutter clients.
   */
  async verifyMobileToken(
    input: OAuthVerifyInput,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<{
    user: any;
    tokens: any;
    sessionId: string;
    isNewUser: boolean;
  }> {
    const providerName: OAuthProviderName = input.provider.toUpperCase() as OAuthProviderName;
    const provider = this.getProvider(providerName);

    const tokenToVerify = input.idToken || input.accessToken;
    if (!tokenToVerify) {
      throw new ValidationError('A valid verification token must be supplied');
    }

    // 1. Verify token with provider
    const profile = await provider.verifyToken(tokenToVerify);

    const dummyTokens: OAuthTokenResponse = {
      accessToken: input.accessToken || tokenToVerify,
      idToken: input.idToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    };

    // 2. Link or provision user
    const { user, isNewUser } = await this.findOrCreateOAuthUser(profile, dummyTokens, meta);

    // 3. Issue mobile token pair
    const userAuthDetails: UserAuthDetails = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      status: user.status,
      tokenVersion: user.tokenVersion,
      roleAssignments: user.roleAssignments,
      sellerId: user.ownedSellers?.[0]?.id || user.sellerStaff?.[0]?.sellerId || null,
    };

    const tokenResult = await this.tokenService.issueTokenPair({
      user: userAuthDetails,
      clientType: input.clientType || 'MOBILE_FLUTTER',
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      deviceInfo: `Flutter Native ${providerName} Login`,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        avatarUrl: user.avatarUrl,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        roles: tokenResult.user.roles,
        permissions: tokenResult.user.permissions,
        sellerId: tokenResult.user.sellerId,
      },
      tokens: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenType: 'Bearer',
        expiresIn: tokenResult.expiresIn,
        refreshExpiresIn: tokenResult.refreshExpiresIn,
      },
      sessionId: tokenResult.sessionId,
      isNewUser,
    };
  }

  /**
   * Atomic user resolution, linking, and 4-wallet initialization.
   */
  async findOrCreateOAuthUser(
    profile: OAuthUserProfile,
    tokens?: OAuthTokenResponse,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<{ user: any; isNewUser: boolean }> {
    // 1. Check if OAuth mapping already exists for this provider and subject ID
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: {
        user: {
          include: {
            roleAssignments: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
            ownedSellers: { select: { id: true, status: true } },
            sellerStaff: { select: { sellerId: true } },
          },
        },
      },
    });

    if (existingOAuth) {
      const user = existingOAuth.user;

      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedError('Your account has been suspended. Please contact support.');
      }
      if (user.deletedAt) {
        throw new UnauthorizedError('Account not found or has been deactivated.');
      }

      // Update tokens, avatar and last login asynchronously
      try {
        await this.prisma.$transaction([
          this.prisma.oAuthAccount.update({
            where: { id: existingOAuth.id },
            data: {
              accessToken: tokens?.accessToken || existingOAuth.accessToken,
              refreshToken: tokens?.refreshToken || existingOAuth.refreshToken,
              displayName: profile.name || existingOAuth.displayName,
              avatarUrl: profile.avatarUrl || existingOAuth.avatarUrl,
              updatedAt: new Date(),
            },
          }),
          this.prisma.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              avatarUrl: user.avatarUrl || profile.avatarUrl,
            },
          }),
        ]);
      } catch {
        // Non-blocking telemetry updates
      }

      return { user, isNewUser: false };
    }

    // 2. Check if a local user exists with the same verified email
    if (profile.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: profile.email.toLowerCase() },
        include: {
          roleAssignments: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
          ownedSellers: { select: { id: true, status: true } },
          sellerStaff: { select: { sellerId: true } },
        },
      });

      if (existingUser) {
        if (existingUser.status === 'SUSPENDED') {
          throw new UnauthorizedError('Your account has been suspended. Please contact support.');
        }
        if (existingUser.deletedAt) {
          throw new UnauthorizedError('Account not found or has been deactivated.');
        }

        // Link new OAuth identity to existing user account
        await this.prisma.$transaction(async (tx: any) => {
          await tx.oAuthAccount.create({
            data: {
              id: generateId(ID_PREFIXES.OAUTH_ACCOUNT),
              userId: existingUser.id,
              provider: profile.provider,
              providerUserId: profile.providerUserId,
              email: profile.email,
              displayName: profile.name,
              avatarUrl: profile.avatarUrl,
              accessToken: tokens?.accessToken,
              refreshToken: tokens?.refreshToken,
              scope: tokens?.scope,
              metadata: profile.rawProfile ? JSON.parse(JSON.stringify(profile.rawProfile)) : undefined,
            },
          });

          // Mark email verified if provider verified it, update avatar if empty
          await tx.user.update({
            where: { id: existingUser.id },
            data: {
              isEmailVerified: existingUser.isEmailVerified || profile.isEmailVerified,
              avatarUrl: existingUser.avatarUrl || profile.avatarUrl,
              lastLoginAt: new Date(),
            },
          });

          // Log linking audit event
          await tx.auditLog.create({
            data: {
              id: generateId(ID_PREFIXES.AUDIT),
              actorId: existingUser.id,
              actorRole: existingUser.roleAssignments?.[0]?.role?.code || 'CUSTOMER',
              action: 'OAUTH_ACCOUNT_LINKED',
              targetType: 'User',
              targetId: existingUser.id,
              description: `Linked ${profile.provider} federated account to user ${existingUser.id}`,
              ipAddress: meta?.ipAddress,
              userAgent: meta?.userAgent,
            },
          });
        });

        return { user: existingUser, isNewUser: false };
      }
    }

    // 3. New user registration via OAuth
    const userId = generateId(ID_PREFIXES.USER);
    const oauthAccountId = generateId(ID_PREFIXES.OAUTH_ACCOUNT);
    const auditId = generateId(ID_PREFIXES.AUDIT);
    const outboxId = generateId(ID_PREFIXES.OUTBOX);

    const result = await this.prisma.$transaction(async (tx: any) => {
      // 3a. Create User
      const user = await tx.user.create({
        data: {
          id: userId,
          email: profile.email ? profile.email.toLowerCase() : null,
          name: profile.name || 'AlifWorld Customer',
          avatarUrl: profile.avatarUrl,
          status: 'ACTIVE',
          isEmailVerified: profile.isEmailVerified,
          isPhoneVerified: false,
          tokenVersion: 1,
          lastLoginAt: new Date(),
        },
      });

      // 3b. Create OAuthAccount mapping
      await tx.oAuthAccount.create({
        data: {
          id: oauthAccountId,
          userId: user.id,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl,
          accessToken: tokens?.accessToken,
          refreshToken: tokens?.refreshToken,
          scope: tokens?.scope,
          metadata: profile.rawProfile ? JSON.parse(JSON.stringify(profile.rawProfile)) : undefined,
        },
      });

      // 3c. Ensure CUSTOMER role exists and assign
      let customerRole = await tx.role.findUnique({
        where: { code: 'CUSTOMER' },
      });

      if (!customerRole) {
        customerRole = await tx.role.create({
          data: {
            id: generateId(ID_PREFIXES.ROLE),
            code: 'CUSTOMER',
            name: 'Customer',
            description: 'Marketplace buyer and rewards club participant',
            isSystem: true,
          },
        });
      }

      await tx.userRoleAssignment.create({
        data: {
          id: generateId(ID_PREFIXES.ROLE_ASSIGNMENT),
          userId: user.id,
          roleId: customerRole.id,
        },
      });

      // 3d. Provision segregated wallets (MAIN, SHOPPING, GOOD_LUCK, CHARITY)
      const walletTypes: Array<'MAIN' | 'SHOPPING' | 'GOOD_LUCK' | 'CHARITY'> = [
        'MAIN',
        'SHOPPING',
        'GOOD_LUCK',
        'CHARITY',
      ];

      for (const wType of walletTypes) {
        await tx.wallet.create({
          data: {
            id: generateId(ID_PREFIXES.WALLET),
            userId: user.id,
            type: wType,
            currency: 'BDT',
            availablePoisha: BigInt(0),
            pendingPoisha: BigInt(0),
            status: 'ACTIVE',
          },
        });
      }

      // 3e. Provision dedicated PointAccount
      await tx.pointAccount.create({
        data: {
          id: generateId(ID_PREFIXES.POINT_ACCOUNT),
          userId: user.id,
          availablePoints: 0,
          pendingPoints: 0,
          lifetimePoints: 0,
        },
      });

      // 3f. Audit log
      await tx.auditLog.create({
        data: {
          id: auditId,
          actorId: user.id,
          actorRole: 'CUSTOMER',
          action: 'OAUTH_USER_REGISTERED',
          targetType: 'User',
          targetId: user.id,
          description: `Registered new customer via ${profile.provider} OAuth`,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
      });

      // 3g. Outbox Event
      await tx.outboxEvent.create({
        data: {
          id: outboxId,
          topic: 'customer.registered',
          payload: {
            userId: user.id,
            email: user.email,
            name: user.name,
            provider: profile.provider,
            registeredAt: new Date().toISOString(),
          },
          status: 'PENDING',
        },
      });

      return user;
    });

    // Re-fetch user with relations
    const fullUser = await this.prisma.user.findUnique({
      where: { id: result.id },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        ownedSellers: { select: { id: true, status: true } },
        sellerStaff: { select: { sellerId: true } },
      },
    });

    return { user: fullUser, isNewUser: true };
  }
}
