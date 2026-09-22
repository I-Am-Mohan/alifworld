/**
 * Unit Test Suite: Rotating Refresh Token Families and Reuse Detection
 * Verifies Milestone 035 invariants:
 * - Single-use rotating refresh tokens
 * - Generation counter and family lineage tracking
 * - Immediate reuse detection, family revocation, and security alerting
 * - Token version invalidation on breach
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AuthTokenService, UserAuthDetails } from '@/services/auth-token.service';
import { SessionRepository } from '@/repositories/session.repository';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyJwt,
} from '@/shared/auth/jwt';
import { RefreshTokenClaims } from '@/shared/auth/token-policy';
import { UnauthorizedError, TokenReuseDetectedError } from '@/shared/errors/app-error';

const TEST_SECRET = 'test-super-secret-jwt-signing-key-for-alifworld-test-suite-2026-32chars';

describe('Rotating Refresh Token Families & Reuse Detection (Milestone 035)', () => {
  let mockSessionRepo: any;
  let mockPrisma: any;
  let service: AuthTokenService;
  let sessionStore: Map<string, any>;
  let userStore: Map<string, any>;
  let auditLogs: any[];

  const testUser: UserAuthDetails = {
    id: 'usr_test_tanvir_01',
    email: 'tanvir@alifworld.com',
    phone: '+8801700112233',
    name: 'Tanvir Ahmed',
    status: 'ACTIVE',
    tokenVersion: 1,
    roleAssignments: [
      {
        role: {
          code: 'CUSTOMER',
          rolePermissions: [{ permission: { code: 'orders:create' } }],
        },
      },
    ],
  };

  beforeEach(() => {
    sessionStore = new Map();
    userStore = new Map();
    auditLogs = [];

    userStore.set(testUser.id, { ...testUser });

    mockSessionRepo = {
      parseFamilyMetadata: (session: any) => {
        try {
          if (!session.deviceInfo) return { familyId: 'fam_default', generation: 0, consumedTokenHashes: [] };
          const parsed = JSON.parse(session.deviceInfo);
          return {
            familyId: parsed.familyId || 'fam_default',
            generation: typeof parsed.generation === 'number' ? parsed.generation : 0,
            consumedTokenHashes: Array.isArray(parsed.consumedTokenHashes) ? parsed.consumedTokenHashes : [],
          };
        } catch {
          return { familyId: 'fam_default', generation: 0, consumedTokenHashes: [] };
        }
      },
      findSessionById: async (sessionId: string) => {
        const session = sessionStore.get(sessionId);
        if (!session) return null;
        return {
          ...session,
          user: userStore.get(session.userId),
        };
      },
      createSession: async (params: any) => {
        const sessionId = params.sessionId || 'ses_test_01';
        const familyId = params.familyId || 'fam_test_01';
        const session = {
          id: sessionId,
          userId: params.userId,
          refreshTokenHash: params.refreshTokenHash,
          clientType: params.clientType || 'WEB',
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          deviceInfo: JSON.stringify({
            familyId,
            generation: 0,
            consumedTokenHashes: [],
          }),
          expiresAt: params.expiresAt,
          isRevoked: false,
          revokedAt: null,
          revokedReason: null,
        };
        sessionStore.set(sessionId, session);
        return session;
      },
      rotateSessionRefreshToken: async (
        sessionId: string,
        consumedTokenHash: string,
        newRefreshTokenHash: string,
        nextGeneration: number
      ) => {
        const session = sessionStore.get(sessionId);
        if (!session) return null;
        const meta = mockSessionRepo.parseFamilyMetadata(session);
        meta.consumedTokenHashes.push(consumedTokenHash);
        meta.generation = nextGeneration;

        session.refreshTokenHash = newRefreshTokenHash;
        session.deviceInfo = JSON.stringify(meta);
        sessionStore.set(sessionId, session);
        return session;
      },
      revokeSession: async (sessionId: string, reason: string) => {
        const session = sessionStore.get(sessionId);
        if (session) {
          session.isRevoked = true;
          session.revokedAt = new Date();
          session.revokedReason = reason;
        }
      },
      revokeAllUserSessions: async (userId: string, reason: string) => {
        for (const [id, s] of sessionStore.entries()) {
          if (s.userId === userId) {
            s.isRevoked = true;
            s.revokedAt = new Date();
            s.revokedReason = reason;
          }
        }
      },
      incrementUserTokenVersion: async (userId: string) => {
        const user = userStore.get(userId);
        if (user) {
          user.tokenVersion += 1;
        }
      },
    };

    mockPrisma = {
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return data;
        },
      },
    };

    service = new AuthTokenService(mockSessionRepo, TEST_SECRET, mockPrisma);
  });

  describe('Token Generation and Initial Lineage', () => {
    it('should generate initial refresh token with generation 0 and unique familyId', async () => {
      const tokenPair = await service.issueTokenPair({
        user: testUser,
        clientType: 'WEB',
      });

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.sessionId).toBeDefined();

      const claims = verifyJwt<RefreshTokenClaims>(tokenPair.refreshToken, TEST_SECRET);
      expect(claims.familyId).toBeDefined();
      expect(claims.familyId).toMatch(/^fam_/);
      expect(claims.generation).toBe(0);
      expect(claims.tokenVersion).toBe(1);
      expect(claims.sub).toBe(testUser.id);
    });

    it('should compute deterministic SHA-256 hashes for tokens', () => {
      const sample = 'sample-refresh-token-xyz';
      const hash1 = hashToken(sample);
      const hash2 = hashToken(sample);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });
  });

  describe('Single-Use Token Rotation', () => {
    it('should successfully rotate generation 0 token into generation 1 and mark generation 0 consumed', async () => {
      const initial = await service.issueTokenPair({
        user: testUser,
        clientType: 'WEB',
      });

      const rotated = await service.rotateRefreshToken(initial.refreshToken);

      expect(rotated.accessToken).toBeDefined();
      expect(rotated.refreshToken).toBeDefined();
      expect(rotated.refreshToken).not.toBe(initial.refreshToken);

      const rotatedClaims = verifyJwt<RefreshTokenClaims>(rotated.refreshToken, TEST_SECRET);
      const initialClaims = verifyJwt<RefreshTokenClaims>(initial.refreshToken, TEST_SECRET);

      expect(rotatedClaims.familyId).toBe(initialClaims.familyId);
      expect(rotatedClaims.generation).toBe(1);

      // Verify the session now has generation 0's hash in consumedTokenHashes
      const session = sessionStore.get(initial.sessionId);
      const meta = mockSessionRepo.parseFamilyMetadata(session);
      expect(meta.generation).toBe(1);
      expect(meta.consumedTokenHashes).toContain(hashToken(initial.refreshToken));
      expect(session.refreshTokenHash).toBe(hashToken(rotated.refreshToken));
    });

    it('should successfully rotate multiple successive generations in sequence (RT0 -> RT1 -> RT2)', async () => {
      const gen0 = await service.issueTokenPair({ user: testUser, clientType: 'WEB' });
      const gen1 = await service.rotateRefreshToken(gen0.refreshToken);
      const gen2 = await service.rotateRefreshToken(gen1.refreshToken);

      const claims2 = verifyJwt<RefreshTokenClaims>(gen2.refreshToken, TEST_SECRET);
      expect(claims2.generation).toBe(2);

      const session = sessionStore.get(gen0.sessionId);
      const meta = mockSessionRepo.parseFamilyMetadata(session);
      expect(meta.generation).toBe(2);
      expect(meta.consumedTokenHashes).toContain(hashToken(gen0.refreshToken));
      expect(meta.consumedTokenHashes).toContain(hashToken(gen1.refreshToken));
      expect(session.refreshTokenHash).toBe(hashToken(gen2.refreshToken));
    });
  });

  describe('Token Reuse Detection and Security Alerting', () => {
    it('should detect reuse when an already consumed token (RT0) is replayed after rotation', async () => {
      const gen0 = await service.issueTokenPair({ user: testUser, clientType: 'WEB' });
      // Normal rotation to gen 1
      const gen1 = await service.rotateRefreshToken(gen0.refreshToken);
      expect(gen1).toBeDefined();

      // Attacker or replay attempts to reuse gen0 token!
      let thrownError: any = null;
      try {
        await service.rotateRefreshToken(gen0.refreshToken);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(TokenReuseDetectedError);
      expect(thrownError.statusCode).toBe(401);
      expect(thrownError.code).toBe('REFRESH_TOKEN_REUSE_DETECTED');

      // Verify that the entire session was revoked with breach reason
      const session = sessionStore.get(gen0.sessionId);
      expect(session.isRevoked).toBe(true);
      expect(session.revokedReason).toBe('SECURITY_BREACH_REFRESH_TOKEN_REUSE_DETECTED');

      // Verify user tokenVersion was incremented to invalidate any active access tokens
      const updatedUser = userStore.get(testUser.id);
      expect(updatedUser.tokenVersion).toBe(2);

      // Verify high-severity security audit log was created
      const securityLog = auditLogs.find(
        (log) => log.action === 'SECURITY_ALERT_REFRESH_TOKEN_REUSE_DETECTED'
      );
      expect(securityLog).toBeDefined();
      expect(securityLog.actorRole).toBe('SECURITY_SYSTEM');
      expect(securityLog.resource).toBe('RefreshTokenFamily');
    });

    it('should prevent legitimate user (RT1) from continuing once family is revoked due to breach', async () => {
      const gen0 = await service.issueTokenPair({ user: testUser, clientType: 'WEB' });
      const gen1 = await service.rotateRefreshToken(gen0.refreshToken);

      // Malicious replay of gen0 causes breach revocation
      try {
        await service.rotateRefreshToken(gen0.refreshToken);
      } catch {}

      // Even though gen1 was legitimate, the family is now compromised and must be rejected
      let legitimateAttemptError: any = null;
      try {
        await service.rotateRefreshToken(gen1.refreshToken);
      } catch (err) {
        legitimateAttemptError = err;
      }

      expect(legitimateAttemptError).toBeInstanceOf(TokenReuseDetectedError);
      expect(legitimateAttemptError.code).toBe('REFRESH_TOKEN_REUSE_DETECTED');
    });

    it('should detect reuse when an older generation token is submitted', async () => {
      const gen0 = await service.issueTokenPair({ user: testUser, clientType: 'WEB' });
      const gen1 = await service.rotateRefreshToken(gen0.refreshToken);
      const gen2 = await service.rotateRefreshToken(gen1.refreshToken);
      expect(gen2).toBeDefined();

      // Submit gen0 again
      let errorGen0: any = null;
      try {
        await service.rotateRefreshToken(gen0.refreshToken);
      } catch (err) {
        errorGen0 = err;
      }

      expect(errorGen0).toBeInstanceOf(TokenReuseDetectedError);
      expect(errorGen0.code).toBe('REFRESH_TOKEN_REUSE_DETECTED');
    });
  });

  describe('Invalid or Tampered Session Handling', () => {
    it('should reject refresh token if user tokenVersion changed (e.g. global password reset)', async () => {
      const tokenPair = await service.issueTokenPair({ user: testUser, clientType: 'WEB' });

      // User changed password, incrementing tokenVersion to 2
      userStore.get(testUser.id).tokenVersion = 2;

      let error: any = null;
      try {
        await service.rotateRefreshToken(tokenPair.refreshToken);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toContain('Token has been revoked due to credential rotation');
    });

    it('should reject refresh token if user account becomes suspended or inactive', async () => {
      const tokenPair = await service.issueTokenPair({ user: testUser, clientType: 'WEB' });

      // User suspended by admin
      userStore.get(testUser.id).status = 'SUSPENDED';

      let error: any = null;
      try {
        await service.rotateRefreshToken(tokenPair.refreshToken);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toContain('inactive or suspended');
    });

    it('should reject refresh token if session has expired', async () => {
      const tokenPair = await service.issueTokenPair({ user: testUser, clientType: 'WEB' });

      // Simulate expired session
      const session = sessionStore.get(tokenPair.sessionId);
      session.expiresAt = new Date(Date.now() - 1000);

      let error: any = null;
      try {
        await service.rotateRefreshToken(tokenPair.refreshToken);
      } catch (err) {
        error = err;
      }

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toContain('Session has expired');
    });
  });
});
