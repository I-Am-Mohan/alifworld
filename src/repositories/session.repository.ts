/**
 * AlifWorld User Authentication & Session Repository
 * 
 * Manages persisted user sessions, refresh token hashes, client device records,
 * and token version invalidation counters.
 * 
 * Invariants: ADR-0022, ADR-0031
 */

import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { NotFoundError } from '@/shared/errors/app-error';

export interface CreateSessionParams {
  userId: string;
  sessionToken: string;
  refreshTokenHash?: string | null;
  clientType?: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
}

export class SessionRepository {
  private get prisma() {
    return getPrismaClient() as any;
  }

  /**
   * Creates a new authenticated session for a user.
   */
  async createSession(params: CreateSessionParams) {
    const id = generateId(ID_PREFIXES.SESSION);

    return this.prisma.userSession.create({
      data: {
        id,
        userId: params.userId,
        sessionToken: params.sessionToken,
        refreshTokenHash: params.refreshTokenHash ?? null,
        clientType: params.clientType ?? 'WEB',
        deviceInfo: params.deviceInfo ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        expiresAt: params.expiresAt,
        isRevoked: false,
      },
    });
  }

  /**
   * Finds an active session by its unique sessionToken, including user and RBAC roles.
   */
  async findSessionByToken(sessionToken: string) {
    return this.prisma.userSession.findUnique({
      where: { sessionToken },
      include: {
        user: {
          include: {
            roleAssignments: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Finds a session by its internal primary ID.
   */
  async findSessionById(id: string) {
    return this.prisma.userSession.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  /**
   * Updates the refresh token hash and extends the expiration upon token rotation.
   */
  async rotateSessionRefreshToken(
    sessionId: string,
    newRefreshTokenHash: string,
    newExpiresAt: Date
  ) {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Updates last active timestamp.
   */
  async touchSession(sessionId: string) {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Revokes a single session.
   */
  async revokeSession(sessionId: string, reason = 'LOGOUT') {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  /**
   * Revokes all active sessions belonging to a specific user (e.g. on password reset or compromise).
   */
  async revokeAllUserSessions(userId: string, reason = 'ALL_SESSIONS_REVOKED') {
    return this.prisma.userSession.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  /**
   * Retrieves all active sessions for a user.
   */
  async getActiveSessionsForUser(userId: string) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /**
   * Increments the user's tokenVersion in the database, invalidating all issued JWTs.
   */
  async incrementUserTokenVersion(userId: string): Promise<number> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
      },
      select: { tokenVersion: true },
    });

    if (!user) {
      throw new NotFoundError(`User ${userId} not found`);
    }

    return user.tokenVersion;
  }

  /**
   * Purges or marks revoked sessions that exceed maximum active session limit.
   */
  async enforceSessionLimit(userId: string, maxSessions: number): Promise<void> {
    const active = await this.prisma.userSession.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastActiveAt: 'desc' },
      select: { id: true },
    });

    if (active.length > maxSessions) {
      const surplus = active.slice(maxSessions);
      const surplusIds = surplus.map((s: { id: string }) => s.id);

      await this.prisma.userSession.updateMany({
        where: { id: { in: surplusIds } },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'EXCEEDED_MAX_CONCURRENT_SESSIONS',
        },
      });
    }
  }
}
