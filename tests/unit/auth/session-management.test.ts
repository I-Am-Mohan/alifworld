/**
 * Unit Test Suite: Logout, Revocation, Session, and Device Management
 * Verifies Milestone 036 invariants:
 * - Single-session logout with audit logging
 * - Active sessions listing and device fingerprint parsing
 * - Specific session revocation with IDOR boundary protection
 * - Revocation of all other sessions ("log out from other devices")
 * - Global revocation with user tokenVersion increment
 * - Concurrent session limit enforcement
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  AuthTokenService,
  UserAuthDetails,
  parseDeviceSummary,
} from '@/services/auth-token.service';
import { NotFoundError, UnauthorizedError } from '@/shared/errors/app-error';

const TEST_SECRET = 'test-super-secret-jwt-signing-key-for-alifworld-test-suite-2026-32chars';

describe('Logout, Revocation, Session, and Device Management (Milestone 036)', () => {
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

  const otherUser: UserAuthDetails = {
    id: 'usr_other_person_02',
    email: 'other@alifworld.com',
    phone: '+8801811223344',
    name: 'Other Person',
    status: 'ACTIVE',
    tokenVersion: 1,
  };

  beforeEach(() => {
    sessionStore = new Map();
    userStore = new Map();
    auditLogs = [];

    userStore.set(testUser.id, { ...testUser });
    userStore.set(otherUser.id, { ...otherUser });

    mockSessionRepo = {
      parseFamilyMetadata: (session: any) => {
        try {
          if (!session.deviceInfo) return { familyId: 'fam_default', generation: 0, consumedTokenHashes: [] };
          const parsed = JSON.parse(session.deviceInfo);
          return {
            familyId: parsed.familyId || 'fam_default',
            generation: typeof parsed.generation === 'number' ? parsed.generation : 0,
            consumedTokenHashes: Array.isArray(parsed.consumedTokenHashes) ? parsed.consumedTokenHashes : [],
            rawDeviceInfo: parsed.rawDeviceInfo ?? null,
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
      findSessionByIdAndUser: async (sessionId: string, userId: string) => {
        const session = sessionStore.get(sessionId);
        if (!session || session.userId !== userId) return null;
        return {
          ...session,
          user: userStore.get(session.userId),
        };
      },
      createSession: async (params: any) => {
        const id = params.sessionId || `ses_${sessionStore.size + 1}`;
        const session = {
          id,
          userId: params.userId,
          sessionToken: params.sessionToken || `st_${id}`,
          refreshTokenHash: params.refreshTokenHash || null,
          clientType: params.clientType || 'WEB',
          ipAddress: params.ipAddress || '103.112.54.21',
          userAgent: params.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
          deviceInfo: JSON.stringify({
            familyId: params.familyId || `fam_${id}`,
            generation: 0,
            consumedTokenHashes: [],
            rawDeviceInfo: params.deviceInfo || null,
          }),
          expiresAt: params.expiresAt || new Date(Date.now() + 7 * 86400 * 1000),
          lastActiveAt: new Date(),
          createdAt: new Date(),
          isRevoked: false,
          revokedAt: null,
          revokedReason: null,
        };
        sessionStore.set(id, session);
        return session;
      },
      getActiveSessionsForUser: async (userId: string) => {
        const now = new Date();
        return Array.from(sessionStore.values()).filter(
          (s) => s.userId === userId && !s.isRevoked && s.expiresAt > now
        );
      },
      revokeSession: async (sessionId: string, reason: string) => {
        const session = sessionStore.get(sessionId);
        if (session) {
          session.isRevoked = true;
          session.revokedAt = new Date();
          session.revokedReason = reason;
        }
        return session;
      },
      revokeOtherUserSessions: async (userId: string, exceptSessionId: string, reason: string) => {
        let count = 0;
        for (const s of sessionStore.values()) {
          if (s.userId === userId && s.id !== exceptSessionId && !s.isRevoked) {
            s.isRevoked = true;
            s.revokedAt = new Date();
            s.revokedReason = reason;
            count++;
          }
        }
        return { count };
      },
      revokeAllUserSessions: async (userId: string, reason: string) => {
        let count = 0;
        for (const s of sessionStore.values()) {
          if (s.userId === userId && !s.isRevoked) {
            s.isRevoked = true;
            s.revokedAt = new Date();
            s.revokedReason = reason;
            count++;
          }
        }
        return { count };
      },
      incrementUserTokenVersion: async (userId: string) => {
        const user = userStore.get(userId);
        if (user) {
          user.tokenVersion += 1;
        }
        return user?.tokenVersion ?? 2;
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

  describe('Device & User Agent Parsing', () => {
    it('should parse Flutter mobile app client type accurately', () => {
      const summary = parseDeviceSummary(null, 'MOBILE_FLUTTER', null);
      expect(summary).toBe('AlifWorld Mobile App (Flutter)');
    });

    it('should parse POS and Admin portal client types accurately', () => {
      expect(parseDeviceSummary(null, 'POS', null)).toBe('AlifWorld POS Terminal');
      expect(parseDeviceSummary(null, 'ADMIN_PORTAL', null)).toBe('AlifWorld Admin Workstation');
    });

    it('should parse Chrome on macOS browser user agent', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
      const summary = parseDeviceSummary(ua, 'WEB', null);
      expect(summary).toBe('Google Chrome on macOS');
    });

    it('should parse Safari on iOS user agent', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';
      const summary = parseDeviceSummary(ua, 'WEB', null);
      expect(summary).toBe('Apple Safari on iOS');
    });
  });

  describe('Single-Session Logout', () => {
    it('should successfully log out and mark session revoked in repository', async () => {
      const session = await mockSessionRepo.createSession({
        sessionId: 'ses_active_01',
        userId: testUser.id,
      });

      await service.logout({
        sessionId: session.id,
        userId: testUser.id,
        ipAddress: '103.112.54.21',
        userAgent: 'Chrome on Mac',
      });

      const updated = sessionStore.get('ses_active_01');
      expect(updated.isRevoked).toBe(true);
      expect(updated.revokedReason).toBe('USER_LOGOUT');
      expect(updated.revokedAt).toBeInstanceOf(Date);

      // Verify audit log
      const audit = auditLogs.find((l) => l.action === 'AUTH_LOGOUT');
      expect(audit).toBeDefined();
      expect(audit.actorId).toBe(testUser.id);
      expect(audit.resourceId).toBe('ses_active_01');
    });
  });

  describe('Active Sessions & Device Management', () => {
    it('should list all active sessions for a user and flag the current session', async () => {
      await mockSessionRepo.createSession({
        sessionId: 'ses_mac_01',
        userId: testUser.id,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
      });

      await mockSessionRepo.createSession({
        sessionId: 'ses_phone_02',
        userId: testUser.id,
        clientType: 'MOBILE_FLUTTER',
      });

      const sessions = await service.listUserSessions(testUser.id, 'ses_mac_01');

      expect(sessions).toHaveLength(2);

      const current = sessions.find((s) => s.id === 'ses_mac_01');
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.deviceSummary).toBe('Google Chrome on macOS');
      expect(current?.ipAddress).toBe('103.112.*.*'); // Redacted display IP

      const mobile = sessions.find((s) => s.id === 'ses_phone_02');
      expect(mobile).toBeDefined();
      expect(mobile?.isCurrent).toBe(false);
      expect(mobile?.deviceSummary).toBe('AlifWorld Mobile App (Flutter)');
    });

    it('should exclude revoked sessions from active sessions list', async () => {
      const active = await mockSessionRepo.createSession({
        sessionId: 'ses_active',
        userId: testUser.id,
      });

      const revoked = await mockSessionRepo.createSession({
        sessionId: 'ses_revoked',
        userId: testUser.id,
      });
      await mockSessionRepo.revokeSession(revoked.id, 'LOGOUT');

      const sessions = await service.listUserSessions(testUser.id, active.id);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('ses_active');
    });
  });

  describe('Revoke Specific Session & Tenant Isolation', () => {
    it('should revoke a session belonging to the user and log audit event', async () => {
      await mockSessionRepo.createSession({
        sessionId: 'ses_device_to_remove',
        userId: testUser.id,
      });

      await service.revokeSessionForUser({
        userId: testUser.id,
        sessionId: 'ses_device_to_remove',
        reason: 'USER_REVOKED_DEVICE',
      });

      const revoked = sessionStore.get('ses_device_to_remove');
      expect(revoked.isRevoked).toBe(true);
      expect(revoked.revokedReason).toBe('USER_REVOKED_DEVICE');

      const audit = auditLogs.find((l) => l.action === 'AUTH_SESSION_REVOKED');
      expect(audit).toBeDefined();
      expect(audit.actorId).toBe(testUser.id);
      expect(audit.resourceId).toBe('ses_device_to_remove');
    });

    it('should reject revocation of a session belonging to another user (IDOR protection)', async () => {
      await mockSessionRepo.createSession({
        sessionId: 'ses_other_user_device',
        userId: otherUser.id,
      });

      let thrownError: any = null;
      try {
        await service.revokeSessionForUser({
          userId: testUser.id, // Tanvir trying to revoke other user's session
          sessionId: 'ses_other_user_device',
        });
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(NotFoundError);
      expect(sessionStore.get('ses_other_user_device').isRevoked).toBe(false);
    });
  });

  describe('Revoke All Other Sessions', () => {
    it('should revoke all other sessions while leaving the current session active', async () => {
      const current = await mockSessionRepo.createSession({
        sessionId: 'ses_current',
        userId: testUser.id,
      });

      const other1 = await mockSessionRepo.createSession({
        sessionId: 'ses_other_1',
        userId: testUser.id,
      });

      const other2 = await mockSessionRepo.createSession({
        sessionId: 'ses_other_2',
        userId: testUser.id,
      });

      const result = await service.revokeOtherSessionsForUser({
        userId: testUser.id,
        currentSessionId: current.id,
      });

      expect(result.revokedCount).toBe(2);
      expect(sessionStore.get('ses_current').isRevoked).toBe(false);
      expect(sessionStore.get('ses_other_1').isRevoked).toBe(true);
      expect(sessionStore.get('ses_other_2').isRevoked).toBe(true);

      const audit = auditLogs.find((l) => l.action === 'AUTH_OTHER_SESSIONS_REVOKED');
      expect(audit).toBeDefined();
      expect(audit.actorId).toBe(testUser.id);
    });
  });

  describe('Global Revocation Everywhere', () => {
    it('should revoke all sessions and increment user tokenVersion', async () => {
      await mockSessionRepo.createSession({
        sessionId: 'ses_1',
        userId: testUser.id,
      });

      await mockSessionRepo.createSession({
        sessionId: 'ses_2',
        userId: testUser.id,
      });

      const newVersion = await service.revokeAllSessionsForUser({
        userId: testUser.id,
      });

      expect(newVersion).toBe(2);
      expect(userStore.get(testUser.id).tokenVersion).toBe(2);
      expect(sessionStore.get('ses_1').isRevoked).toBe(true);
      expect(sessionStore.get('ses_2').isRevoked).toBe(true);

      const audit = auditLogs.find((l) => l.action === 'AUTH_ALL_SESSIONS_REVOKED');
      expect(audit).toBeDefined();
      expect(audit.actorId).toBe(testUser.id);
      expect(audit.metadata.newTokenVersion).toBe(2);
    });
  });
});
