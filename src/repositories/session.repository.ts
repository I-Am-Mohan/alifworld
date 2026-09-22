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

export interface SessionFamilyMetadata {
  familyId: string;
  generation: number;
  consumedTokenHashes: string[];
  rawDeviceInfo?: string | null;
}

export interface CreateSessionParams {
  userId: string;
  sessionToken: string;
  refreshTokenHash?: string | null;
  clientType?: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  familyId?: string;
}

export class SessionRepository {
  private get prisma() {
    return getPrismaClient() as any;
  }

  /**
   * Safely parses family lineage metadata from session deviceInfo.
   */
  parseFamilyMetadata(session: { id: string; deviceInfo?: string | null }): SessionFamilyMetadata {
    if (session.deviceInfo) {
      try {
        const parsed = JSON.parse(session.deviceInfo);
        if (parsed && typeof parsed === 'object' && parsed.familyId) {
          return {
            familyId: parsed.familyId,
            generation: typeof parsed.generation === 'number' ? parsed.generation : 0,
            consumedTokenHashes: Array.isArray(parsed.consumedTokenHashes) ? parsed.consumedTokenHashes : [],
            rawDeviceInfo: parsed.rawDeviceInfo ?? null,
          };
        }
      } catch {
        // Fallback for legacy plain text deviceInfo
      }
    }

    return {
      familyId: `fam_${session.id}`,
      generation: 0,
      consumedTokenHashes: [],
      rawDeviceInfo: session.deviceInfo ?? null,
    };
  }

  /**
   * Creates a new authenticated session for a user with initialized token family.
   */
  async createSession(params: CreateSessionParams) {
    const id = generateId(ID_PREFIXES.SESSION);
    const familyId = params.familyId || `fam_${id}`;

    const familyMeta: SessionFamilyMetadata = {
      familyId,
      generation: 0,
      consumedTokenHashes: [],
      rawDeviceInfo: params.deviceInfo ?? null,
    };

    return this.prisma.userSession.create({
      data: {
        id,
        userId: params.userId,
        sessionToken: params.sessionToken,
        refreshTokenHash: params.refreshTokenHash ?? null,
        clientType: params.clientType ?? 'WEB',
        deviceInfo: JSON.stringify(familyMeta),
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
   * Tracks consumed token hashes and increments family generation counter.
   */
  async rotateSessionRefreshToken(
    sessionIdOrParams:
      | string
      | {
          sessionId: string;
          newRefreshTokenHash: string;
          newExpiresAt: Date;
          consumedHash?: string;
          newGeneration?: number;
        },
    legacyNewHash?: string,
    legacyExpiresAt?: Date
  ) {
    let sessionId: string;
    let newRefreshTokenHash: string;
    let newExpiresAt: Date;
    let consumedHash: string | undefined;
    let newGeneration: number | undefined;

    if (typeof sessionIdOrParams === 'object') {
      sessionId = sessionIdOrParams.sessionId;
      newRefreshTokenHash = sessionIdOrParams.newRefreshTokenHash;
      newExpiresAt = sessionIdOrParams.newExpiresAt;
      consumedHash = sessionIdOrParams.consumedHash;
      newGeneration = sessionIdOrParams.newGeneration;
    } else {
      sessionId = sessionIdOrParams;
      newRefreshTokenHash = legacyNewHash!;
      newExpiresAt = legacyExpiresAt!;
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { id: true, deviceInfo: true, refreshTokenHash: true },
    });

    if (!session) {
      throw new NotFoundError(`Session ${sessionId} not found`);
    }

    const metadata = this.parseFamilyMetadata(session);
    const updatedConsumed = [...metadata.consumedTokenHashes];

    // Record the consumed token hash
    const hashToConsume = consumedHash || session.refreshTokenHash;
    if (hashToConsume && !updatedConsumed.includes(hashToConsume)) {
      updatedConsumed.push(hashToConsume);
    }

    // Keep bounded history to last 50 rotated tokens in this family
    const trimmedConsumed = updatedConsumed.slice(-50);

    const updatedMetadata: SessionFamilyMetadata = {
      ...metadata,
      generation: newGeneration ?? (metadata.generation + 1),
      consumedTokenHashes: trimmedConsumed,
    };

    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        deviceInfo: JSON.stringify(updatedMetadata),
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
   * Revokes all active sessions for a user EXCEPT a specified session (e.g. "log out of other devices").
   */
  async revokeOtherUserSessions(userId: string, exceptSessionId: string, reason = 'REVOKED_OTHER_SESSIONS') {
    return this.prisma.userSession.updateMany({
      where: {
        userId,
        id: { not: exceptSessionId },
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
   * Finds a session by its ID ensuring it belongs to the specified user.
   */
  async findSessionByIdAndUser(sessionId: string, userId: string) {
    return this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: { user: true },
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
