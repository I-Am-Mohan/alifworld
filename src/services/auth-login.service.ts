/**
 * AlifWorld User Authentication & Login Service
 * 
 * Manages user authentication, multi-identifier resolution (email or Bangladesh mobile),
 * constant-time password hash verification, session initialization, and access-token issuance.
 * 
 * Invariants: ADR-0022, ADR-0031, ADR-0034, NIST SP 800-63B Guidelines
 */

import { UserRepository } from '@/repositories/user.repository';
import { AuthTokenService, UserAuthDetails, TokenPairResult } from './auth-token.service';
import { verifyPassword } from '@/shared/auth/password';
import { UnauthorizedError, NotFoundError } from '@/shared/errors/app-error';
import { LoginInput } from '@/validators/auth.validator';
import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { verifyJwt } from '@/shared/auth/jwt';
import { AccessTokenClaims } from '@/shared/auth/token-policy';
import { getServerEnv } from '@/shared/config/environment';

export interface LoginResult {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string | null;
    status: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    roles: string[];
    permissions: string[];
    sellerId: string | null;
    lastLoginAt?: Date | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshExpiresIn: number;
  };
  sessionId: string;
  cookies: TokenPairResult['cookies'];
}

export interface CurrentUserProfile {
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
  wallets: Array<{
    id: string;
    type: string;
    currency: string;
    availablePoisha: string;
    pendingPoisha: string;
    status: string;
  }>;
  pointAccount: {
    id: string;
    availablePoints: number;
    pendingPoints: number;
    lifetimePoints: number;
  } | null;
  lastLoginAt: Date | null;
}

export class AuthLoginService {
  private userRepo: UserRepository;
  private tokenService: AuthTokenService;
  private prismaClient?: any;
  private secret: string;

  constructor(
    userRepo?: UserRepository,
    tokenService?: AuthTokenService,
    prisma?: any,
    secret?: string
  ) {
    this.userRepo = userRepo || new UserRepository();
    this.tokenService = tokenService || new AuthTokenService();
    this.prismaClient = prisma;
    this.secret = secret || getServerEnv().JWT_SECRET;
  }

  private get prisma() {
    return this.prismaClient || (getPrismaClient() as any);
  }

  /**
   * Authenticates user credentials and issues access & refresh token pair with established session.
   */
  async login(
    input: LoginInput,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<LoginResult> {
    const cleanIdentifier = input.identifier.trim();

    // 1. Locate user account by email or phone
    const user = await this.userRepo.findUserByIdentifier(cleanIdentifier);
    if (!user) {
      // Generic message to prevent user enumeration
      throw new UnauthorizedError('Invalid email/phone or password');
    }

    // 2. Enforce account status check
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError(
        'Your account has been suspended. Please contact customer support for assistance.'
      );
    }

    if (user.status === 'DELETED' || user.deletedAt) {
      throw new UnauthorizedError('Invalid email/phone or password');
    }

    // 3. Verify password hash using constant-time evaluation
    if (!user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedError('Invalid email/phone or password');
    }

    // 4. Update lastLoginAt timestamp
    try {
      await this.userRepo.updateLastLogin(user.id);
    } catch {
      // Non-blocking telemetry update
    }

    // 5. Determine active sellerId if merchant staff or merchant owner
    const sellerId =
      user.ownedSellers?.[0]?.id ||
      user.sellerStaff?.[0]?.sellerId ||
      user.roleAssignments?.find((ra: any) => ra.sellerId)?.sellerId ||
      null;

    const userAuthDetails: UserAuthDetails = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      status: user.status,
      tokenVersion: user.tokenVersion,
      roleAssignments: user.roleAssignments,
      sellerId,
    };

    // 6. Issue access and refresh tokens, establish user session
    const tokenResult = await this.tokenService.issueTokenPair({
      user: userAuthDetails,
      clientType: input.clientType,
      deviceInfo: input.deviceInfo,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    // 7. Security audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: user.id,
          actorRole: tokenResult.user.roles[0] || 'CUSTOMER',
          action: 'USER_LOGIN',
          resource: 'User',
          resourceId: user.id,
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
          metadata: {
            clientType: input.clientType,
            identifierType: cleanIdentifier.includes('@') ? 'EMAIL' : 'PHONE',
            sessionId: tokenResult.sessionId,
          },
        },
      });
    } catch {
      // Audit non-blocking
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        roles: tokenResult.user.roles,
        permissions: tokenResult.user.permissions,
        sellerId: tokenResult.user.sellerId,
        lastLoginAt: new Date(),
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
    };
  }

  /**
   * Retrieves profile, wallets, and loyalty points for an authenticated access token.
   */
  async getCurrentUser(token: string): Promise<CurrentUserProfile> {
    const claims = verifyJwt<AccessTokenClaims>(token, this.secret);

    const user = await this.userRepo.findUserById(claims.sub);
    if (!user) {
      throw new NotFoundError('Authenticated user not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is suspended or inactive');
    }

    // Global tokenVersion check for immediate session revocation
    if (user.tokenVersion !== claims.tokenVersion) {
      throw new UnauthorizedError(
        'Session has expired or credentials have been changed. Please sign in again.'
      );
    }

    // Extract roles and permissions
    const roles: string[] = [];
    const permissions = new Set<string>();

    if (user.roleAssignments) {
      for (const assignment of user.roleAssignments) {
        if (assignment.role?.code) {
          roles.push(assignment.role.code);
          if (assignment.role.rolePermissions) {
            for (const rp of assignment.role.rolePermissions) {
              if (rp.permission?.code) {
                permissions.add(rp.permission.code);
              }
            }
          }
        }
      }
    }

    if (roles.length === 0) roles.push('CUSTOMER');

    const formattedWallets = (user.wallets || []).map((w: any) => ({
      id: w.id,
      type: w.type,
      currency: w.currency,
      availablePoisha: w.availablePoisha.toString(),
      pendingPoisha: w.pendingPoisha.toString(),
      status: w.status,
    }));

    const formattedPointAccount = user.pointAccount
      ? {
          id: user.pointAccount.id,
          availablePoints: user.pointAccount.availablePoints,
          pendingPoints: user.pointAccount.pendingPoints,
          lifetimePoints: user.pointAccount.lifetimePoints,
        }
      : null;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      roles,
      permissions: Array.from(permissions),
      sellerId: claims.sellerId ?? null,
      wallets: formattedWallets,
      pointAccount: formattedPointAccount,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
