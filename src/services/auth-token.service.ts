/**
 * AlifWorld Central Authentication & Token Lifecycle Service
 * 
 * Orchestrates token issuance, dual-client delivery (Web HttpOnly cookies vs Flutter Bearer tokens),
 * single-use refresh token rotation with reuse detection, and global token version invalidation.
 * 
 * Invariants: ADR-0022, ADR-0031, OWASP Session Management Guidelines
 */

import { getServerEnv } from '@/shared/config/environment';
import {
  AccessTokenClaims,
  RefreshTokenClaims,
  TOKEN_POLICIES,
  ClientType,
  getAuthCookieOptions,
  AuthCookieOptions,
} from '@/shared/auth/token-policy';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyJwt,
  hashToken,
  extractBearerToken,
} from '@/shared/auth/jwt';
import { SessionRepository } from '@/repositories/session.repository';
import { UnauthorizedError, TokenReuseDetectedError, NotFoundError } from '@/shared/errors/app-error';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { getPrismaClient } from '@/shared/database/prisma';

export interface UserAuthDetails {
  id: string;
  email: string | null;
  phone: string | null;
  name?: string | null;
  status: string;
  tokenVersion: number;
  roleAssignments?: Array<{
    role: {
      code: string;
      rolePermissions?: Array<{
        permission: {
          code: string;
        };
      }>;
    };
  }>;
  sellerId?: string | null;
}

export interface TokenPairResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // In seconds
  refreshExpiresIn: number; // In seconds
  sessionId: string;
  cookies: AuthCookieOptions[];
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    roles: string[];
    permissions: string[];
    sellerId: string | null;
  };
}

export class AuthTokenService {
  private sessionRepo: SessionRepository;
  private secret: string;
  private prismaClient?: any;

  constructor(sessionRepo?: SessionRepository, secret?: string, prisma?: any) {
    this.sessionRepo = sessionRepo || new SessionRepository();
    this.secret = secret || getServerEnv().JWT_SECRET;
    this.prismaClient = prisma;
  }

  private get prisma() {
    return this.prismaClient || (getPrismaClient() as any);
  }

  /**
   * Helper extracting flattened roles and permission codes from Prisma user.
   */
  private extractRolesAndPermissions(user: UserAuthDetails): {
    roles: string[];
    permissions: string[];
  } {
    const roles: string[] = [];
    const permissionSet = new Set<string>();

    if (user.roleAssignments) {
      for (const assignment of user.roleAssignments) {
        if (assignment.role?.code) {
          roles.push(assignment.role.code);
          if (assignment.role.rolePermissions) {
            for (const rp of assignment.role.rolePermissions) {
              if (rp.permission?.code) {
                permissionSet.add(rp.permission.code);
              }
            }
          }
        }
      }
    }

    // Default to CUSTOMER if no roles are explicitly assigned
    if (roles.length === 0) {
      roles.push('CUSTOMER');
    }

    return {
      roles,
      permissions: Array.from(permissionSet),
    };
  }

  /**
   * Uses the metadata-rich repository contract in production while retaining
   * compatibility with the in-memory repositories from earlier auth tests.
   */
  private async persistRefreshRotation(params: {
    sessionId: string;
    newRefreshTokenHash: string;
    newExpiresAt: Date;
    consumedHash?: string;
    newGeneration: number;
  }): Promise<void> {
    if (this.sessionRepo instanceof SessionRepository) {
      await this.sessionRepo.rotateSessionRefreshToken(params);
      return;
    }

    const legacyRotate = (this.sessionRepo as any).rotateSessionRefreshToken;
    if (typeof legacyRotate !== 'function') return;
    if (legacyRotate.length >= 4) {
      await legacyRotate.call(
        this.sessionRepo,
        params.sessionId,
        params.consumedHash || '',
        params.newRefreshTokenHash,
        params.newGeneration
      );
      return;
    }
    await legacyRotate.call(
      this.sessionRepo,
      params.sessionId,
      params.newRefreshTokenHash,
      params.newExpiresAt
    );
  }

  /**
   * Issues a complete token pair and establishes a database session for an authenticated user.
   */
  async issueTokenPair(params: {
    user: UserAuthDetails;
    clientType?: ClientType;
    deviceInfo?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<TokenPairResult> {
    const clientType = params.clientType || 'WEB';
    const { roles, permissions } = this.extractRolesAndPermissions(params.user);

    const ttl =
      clientType === 'MOBILE_FLUTTER'
        ? TOKEN_POLICIES.MOBILE_REFRESH_TOKEN_TTL_SECONDS
        : TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS;

    const expiresAt = new Date(Date.now() + ttl * 1000);
    const sessionToken = generateId(ID_PREFIXES.SESSION);
    const familyId = generateId(ID_PREFIXES.FAMILY);

    // Create session in database with token family tracking
    const session = await this.sessionRepo.createSession({
      userId: params.user.id,
      sessionToken,
      clientType,
      deviceInfo: params.deviceInfo,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt,
      familyId,
    });

    // Generate Initial Refresh Token (Family generation 0)
    const refreshToken = generateRefreshToken(
      {
        userId: params.user.id,
        sessionId: session.id,
        familyId,
        generation: 0,
        tokenVersion: params.user.tokenVersion,
        clientType,
      },
      this.secret
    );

    // Store hash of issued refresh token and record initial generation
    const refreshTokenHash = hashToken(refreshToken);
    await this.persistRefreshRotation({
      sessionId: session.id,
      newRefreshTokenHash: refreshTokenHash,
      newExpiresAt: expiresAt,
      newGeneration: 0,
    });

    // Enforce concurrent session limit
    if (typeof (this.sessionRepo as any).enforceSessionLimit === 'function') {
      await this.sessionRepo.enforceSessionLimit(
        params.user.id,
        TOKEN_POLICIES.MAX_ACTIVE_SESSIONS_PER_USER
      );
    }

    // Generate Access Token
    const accessToken = generateAccessToken(
      {
        userId: params.user.id,
        email: params.user.email,
        phone: params.user.phone,
        roles,
        permissions,
        sellerId: params.user.sellerId,
        tokenVersion: params.user.tokenVersion,
        sessionId: session.id,
        clientType,
      },
      this.secret
    );

    const accessCookie = getAuthCookieOptions('ACCESS', accessToken);
    const refreshCookie = getAuthCookieOptions('REFRESH', refreshToken);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS,
      refreshExpiresIn: ttl,
      sessionId: session.id,
      cookies: [accessCookie, refreshCookie],
      user: {
        id: params.user.id,
        email: params.user.email,
        phone: params.user.phone,
        roles,
        permissions,
        sellerId: params.user.sellerId ?? null,
      },
    };
  }

  /**
   * Rotates a single-use refresh token.
   * Detects reuse and invalidates the session family if a breach is detected.
   */
  async rotateRefreshToken(
    incomingRefreshToken: string,
    requestedClientType?: ClientType
  ): Promise<TokenPairResult> {
    let claims: RefreshTokenClaims;
    try {
      claims = verifyJwt<RefreshTokenClaims>(incomingRefreshToken, this.secret);
    } catch (err: any) {
      throw new UnauthorizedError(`Refresh token verification failed: ${err.message}`);
    }

    const session = await this.sessionRepo.findSessionById(claims.sessionId);
    if (!session) {
      throw new UnauthorizedError('Session does not exist or has expired');
    }

    if (session.isRevoked) {
      if (session.revokedReason === 'SECURITY_BREACH_REFRESH_TOKEN_REUSE_DETECTED') {
        throw new TokenReuseDetectedError(
          'Security breach detected: This refresh token family was previously revoked due to token reuse.'
        );
      }
      throw new UnauthorizedError('Session has been revoked');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError('Session has expired');
    }

    const user = session.user;
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is inactive or suspended');
    }

    if (user.tokenVersion !== claims.tokenVersion) {
      throw new UnauthorizedError('Token has been revoked due to credential rotation');
    }

    // Parse Token Family Lineage & Consumed Hashes
    const familyMeta = typeof (this.sessionRepo as any).parseFamilyMetadata === 'function'
      ? this.sessionRepo.parseFamilyMetadata(session)
      : {
          familyId: claims.familyId,
          generation: claims.generation,
          consumedTokenHashes: [],
        };
    const familyId = claims.familyId || familyMeta.familyId;
    const incomingHash = hashToken(incomingRefreshToken);

    const isCurrentActive = session.refreshTokenHash === incomingHash;
    const isConsumed = familyMeta.consumedTokenHashes.includes(incomingHash);
    const isOldGeneration = typeof claims.generation === 'number' && claims.generation < familyMeta.generation;

    // Token Reuse Detection: If token is not current active, is consumed, or is an older generation
    if (!isCurrentActive || isConsumed || isOldGeneration) {
      // SECURITY BREACH: Old or stolen token was presented!
      // Invalidate the session family and all active sessions for this user immediately
      await this.sessionRepo.revokeSession(session.id, 'SECURITY_BREACH_REFRESH_TOKEN_REUSE_DETECTED');
      await this.sessionRepo.revokeAllUserSessions(
        session.userId,
        'SECURITY_BREACH_REFRESH_TOKEN_REUSE_DETECTED'
      );
      await this.sessionRepo.incrementUserTokenVersion(session.userId);

      // Record high-severity security audit log
      try {
        await this.prisma.auditLog.create({
          data: {
            id: generateId(ID_PREFIXES.AUDIT),
            actorId: session.userId,
            actorRole: 'SECURITY_SYSTEM',
            action: 'SECURITY_ALERT_REFRESH_TOKEN_REUSE_DETECTED',
            resource: 'RefreshTokenFamily',
            resourceId: familyId,
            ipAddress: null,
            userAgent: null,
            metadata: {
              sessionId: session.id,
              familyId,
              attemptedGeneration: claims.generation ?? null,
              activeGeneration: familyMeta.generation,
              isConsumed,
              isOldGeneration,
              clientType: claims.clientType,
            },
          },
        });
      } catch {
        // Non-blocking audit
      }

      throw new TokenReuseDetectedError(
        'Security breach detected: Refresh token reuse detected. All active sessions have been terminated.',
        {
          familyId,
          attemptedGeneration: claims.generation ?? null,
          activeGeneration: familyMeta.generation,
        }
      );
    }

    const clientType = requestedClientType || (session.clientType as ClientType) || 'WEB';
    const ttl =
      clientType === 'MOBILE_FLUTTER'
        ? TOKEN_POLICIES.MOBILE_REFRESH_TOKEN_TTL_SECONDS
        : TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS;
    const newExpiresAt = new Date(Date.now() + ttl * 1000);

    const nextGeneration = (claims.generation ?? familyMeta.generation) + 1;

    // Generate brand new Refresh Token in the family lineage
    const newRefreshToken = generateRefreshToken(
      {
        userId: user.id,
        sessionId: session.id,
        familyId,
        generation: nextGeneration,
        tokenVersion: user.tokenVersion,
        clientType,
      },
      this.secret
    );

    // Update session record with the new token hash and record previous token as consumed
    const newHash = hashToken(newRefreshToken);
    await this.persistRefreshRotation({
      sessionId: session.id,
      newRefreshTokenHash: newHash,
      newExpiresAt,
      consumedHash: incomingHash,
      newGeneration: nextGeneration,
    });

    // Re-fetch full user with roles for fresh access token claims
    const fullSession = typeof (this.sessionRepo as any).findSessionByToken === 'function'
      ? await this.sessionRepo.findSessionByToken(session.sessionToken)
      : session;
    const userWithRoles = fullSession?.user || user;
    const { roles, permissions } = this.extractRolesAndPermissions(userWithRoles);

    // Generate brand new Access Token
    const accessToken = generateAccessToken(
      {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        roles,
        permissions,
        sellerId: null,
        tokenVersion: user.tokenVersion,
        sessionId: session.id,
        clientType,
      },
      this.secret
    );

    // Record routine rotation audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: user.id,
          actorRole: roles[0] || 'CUSTOMER',
          action: 'TOKEN_REFRESH_ROTATED',
          resource: 'RefreshTokenFamily',
          resourceId: familyId,
          metadata: {
            sessionId: session.id,
            familyId,
            generation: nextGeneration,
            clientType,
          },
        },
      });
    } catch {
      // Audit non-blocking
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS,
      refreshExpiresIn: ttl,
      sessionId: session.id,
      cookies: [
        getAuthCookieOptions('ACCESS', accessToken),
        getAuthCookieOptions('REFRESH', newRefreshToken),
      ],
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles,
        permissions,
        sellerId: null,
      },
    };
  }

  /**
   * Introspects an Access Token against active database session and user state.
   */
  async introspectToken(token: string): Promise<{
    active: boolean;
    sub?: string;
    email?: string | null;
    phone?: string | null;
    roles?: string[];
    permissions?: string[];
    sellerId?: string | null;
    clientType?: string;
    tokenVersion?: number;
    exp?: number;
    iat?: number;
    error?: string;
  }> {
    try {
      const claims = verifyJwt<AccessTokenClaims>(token, this.secret);

      const session = await this.sessionRepo.findSessionById(claims.sessionId);
      if (!session || session.isRevoked || session.expiresAt.getTime() < Date.now()) {
        return { active: false, error: 'Underlying session is inactive or revoked' };
      }

      if (session.user?.tokenVersion !== claims.tokenVersion) {
        return { active: false, error: 'Token version mismatch' };
      }

      if (session.user?.status !== 'ACTIVE') {
        return { active: false, error: 'User account is not active' };
      }

      return {
        active: true,
        sub: claims.sub,
        email: claims.email,
        phone: claims.phone,
        roles: claims.roles,
        permissions: claims.permissions,
        sellerId: claims.sellerId,
        clientType: claims.clientType,
        tokenVersion: claims.tokenVersion,
        exp: claims.exp,
        iat: claims.iat,
      };
    } catch (err: any) {
      return { active: false, error: err.message };
    }
  }

  /**
   * Explicitly logs out a session.
   */
  async revokeSession(sessionId: string, reason = 'LOGOUT'): Promise<void> {
    await this.sessionRepo.revokeSession(sessionId, reason);
  }

  /**
   * Globally invalidates all tokens and sessions for a user (e.g. on password reset or security alert).
   */
  async revokeAllUserSessions(userId: string, reason = 'GLOBAL_SECURITY_REVOCATION'): Promise<number> {
    const newVersion = await this.sessionRepo.incrementUserTokenVersion(userId);
    await this.sessionRepo.revokeAllUserSessions(userId, reason);
    return newVersion;
  }

  /**
   * Authenticates an incoming Next.js Request using Bearer token or HttpOnly cookie.
   * Validates JWT signature, active session state, and user status.
   */
  async authenticateRequest(req: {
    headers: { get: (name: string) => string | null };
    cookies: { get: (name: string) => { value: string } | undefined };
  }): Promise<{
    user: any;
    session: any;
    claims: AccessTokenClaims;
  }> {
    let token = extractBearerToken(req.headers.get('authorization'));
    if (!token) {
      token = req.cookies.get(TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME)?.value || null;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    const claims = verifyJwt<AccessTokenClaims>(token, this.secret);

    const session = await this.sessionRepo.findSessionById(claims.sessionId);
    if (!session || session.isRevoked || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError('Session is invalid, revoked, or expired');
    }

    const user = session.user;
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is inactive or suspended');
    }

    if (user.tokenVersion !== claims.tokenVersion) {
      throw new UnauthorizedError('Session credentials have changed. Please log in again.');
    }

    return { user, session, claims };
  }

  /**
   * Performs user logout for the current session.
   */
  async logout(params: {
    sessionId?: string;
    userId?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    reason?: string;
  }): Promise<void> {
    if (params.sessionId) {
      await this.sessionRepo.revokeSession(params.sessionId, params.reason || 'USER_LOGOUT');
    }

    if (params.userId) {
      try {
        await this.prisma.auditLog.create({
          data: {
            id: generateId(ID_PREFIXES.AUDIT),
            actorId: params.userId,
            actorRole: 'CUSTOMER',
            action: 'AUTH_LOGOUT',
            resource: 'UserSession',
            resourceId: params.sessionId || params.userId,
            ipAddress: params.ipAddress ?? null,
            userAgent: params.userAgent ?? null,
            metadata: {
              sessionId: params.sessionId ?? null,
              reason: params.reason || 'USER_LOGOUT',
            },
          },
        });
      } catch {}
    }
  }

  /**
   * Lists all active sessions for a user with user-friendly device info.
   */
  async listUserSessions(userId: string, currentSessionId?: string): Promise<FormattedSessionItem[]> {
    const sessions = await this.sessionRepo.getActiveSessionsForUser(userId);

    return sessions.map((s: any) => {
      const familyMeta = this.sessionRepo.parseFamilyMetadata(s);
      const deviceSummary = parseDeviceSummary(s.userAgent, s.clientType, familyMeta.rawDeviceInfo);

      return {
        id: s.id,
        clientType: s.clientType as ClientType,
        deviceSummary,
        ipAddress: s.ipAddress ? s.ipAddress.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.*.*') : null,
        userAgent: s.userAgent,
        isCurrent: s.id === currentSessionId,
        createdAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastActiveAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      };
    });
  }

  /**
   * Revokes a specific session belonging to the user.
   */
  async revokeSessionForUser(params: {
    userId: string;
    sessionId: string;
    reason?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const session = await this.sessionRepo.findSessionByIdAndUser(params.sessionId, params.userId);
    if (!session) {
      throw new NotFoundError('Session not found or does not belong to user');
    }

    await this.sessionRepo.revokeSession(params.sessionId, params.reason || 'USER_REVOKED_DEVICE');

    try {
      await this.prisma.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: params.userId,
          actorRole: 'CUSTOMER',
          action: 'AUTH_SESSION_REVOKED',
          resource: 'UserSession',
          resourceId: params.sessionId,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          metadata: {
            sessionId: params.sessionId,
            reason: params.reason || 'USER_REVOKED_DEVICE',
          },
        },
      });
    } catch {}
  }

  /**
   * Revokes all active sessions for a user except their current session.
   */
  async revokeOtherSessionsForUser(params: {
    userId: string;
    currentSessionId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ revokedCount: number }> {
    const result = await this.sessionRepo.revokeOtherUserSessions(
      params.userId,
      params.currentSessionId,
      'USER_REVOKED_OTHER_DEVICES'
    );

    try {
      await this.prisma.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: params.userId,
          actorRole: 'CUSTOMER',
          action: 'AUTH_OTHER_SESSIONS_REVOKED',
          resource: 'UserSession',
          resourceId: params.currentSessionId,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          metadata: {
            currentSessionId: params.currentSessionId,
            revokedCount: result.count ?? 0,
          },
        },
      });
    } catch {}

    return { revokedCount: result.count ?? 0 };
  }

  /**
   * Globally invalidates all sessions for a user, increments tokenVersion.
   */
  async revokeAllSessionsForUser(params: {
    userId: string;
    reason?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<number> {
    const newVersion = await this.sessionRepo.incrementUserTokenVersion(params.userId);
    await this.sessionRepo.revokeAllUserSessions(params.userId, params.reason || 'USER_REVOKED_ALL_DEVICES');

    try {
      await this.prisma.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: params.userId,
          actorRole: 'CUSTOMER',
          action: 'AUTH_ALL_SESSIONS_REVOKED',
          resource: 'User',
          resourceId: params.userId,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          metadata: {
            newTokenVersion: newVersion,
            reason: params.reason || 'USER_REVOKED_ALL_DEVICES',
          },
        },
      });
    } catch {}

    return newVersion;
  }
}

export interface FormattedSessionItem {
  id: string;
  clientType: ClientType;
  deviceSummary: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export function parseDeviceSummary(
  userAgent?: string | null,
  clientType?: string,
  rawDevice?: string | null
): string {
  if (rawDevice) {
    try {
      const parsed = JSON.parse(rawDevice);
      if (parsed.deviceSummary) return parsed.deviceSummary;
    } catch {}
    if (rawDevice.trim() && !rawDevice.startsWith('{')) return rawDevice;
  }

  if (clientType === 'MOBILE_FLUTTER') {
    return 'AlifWorld Mobile App (Flutter)';
  }
  if (clientType === 'POS') {
    return 'AlifWorld POS Terminal';
  }
  if (clientType === 'ADMIN_PORTAL') {
    return 'AlifWorld Admin Workstation';
  }

  if (!userAgent) return 'Web Browser';

  let browser = 'Web Browser';
  if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Google Chrome';
  else if (userAgent.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) browser = 'Apple Safari';

  let os = 'Unknown OS';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
}
