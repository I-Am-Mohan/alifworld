import { describe, it, expect } from 'bun:test';
import {
  TOKEN_POLICIES,
  PASSWORD_POLICY,
  getAuthCookieOptions,
} from '../../src/shared/auth/token-policy';
import {
  signJwt,
  verifyJwt,
  generateAccessToken,
  generateRefreshToken,
  extractBearerToken,
  hashToken,
} from '../../src/shared/auth/jwt';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from '../../src/shared/auth/password';
import {
  loginSchema,
  refreshTokenSchema,
  tokenIntrospectSchema,
} from '../../src/validators/auth.validator';
import { AuthTokenService, UserAuthDetails } from '../../src/services/auth-token.service';
import { SessionRepository } from '../../src/repositories/session.repository';
import { UnauthorizedError } from '../../src/shared/errors/app-error';

describe('Authentication Architecture & Token Policy (Milestone 031)', () => {
  const TEST_SECRET = 'test_jwt_secret_min_32_characters_long_for_security_12345';

  describe('Token Policies & Cookie Configuration', () => {
    it('defines authoritative token TTL values according to security spec', () => {
      expect(TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS).toBe(900); // 15 minutes
      expect(TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS).toBe(7 * 24 * 3600); // 7 days
      expect(TOKEN_POLICIES.MOBILE_REFRESH_TOKEN_TTL_SECONDS).toBe(30 * 24 * 3600); // 30 days
      expect(TOKEN_POLICIES.SESSION_INACTIVITY_TIMEOUT_SECONDS).toBe(2 * 24 * 3600); // 48 hours
      expect(TOKEN_POLICIES.MAX_ACTIVE_SESSIONS_PER_USER).toBe(5);
    });

    it('generates secure HttpOnly cookies with correct scoping', () => {
      const accessCookie = getAuthCookieOptions('ACCESS', 'sample_access_token', false);
      expect(accessCookie.name).toBe(TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME);
      expect(accessCookie.value).toBe('sample_access_token');
      expect(accessCookie.httpOnly).toBe(true);
      expect(accessCookie.sameSite).toBe('lax');
      expect(accessCookie.path).toBe('/');
      expect(accessCookie.maxAge).toBe(900);

      const refreshCookie = getAuthCookieOptions('REFRESH', 'sample_refresh_token', false);
      expect(refreshCookie.name).toBe(TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME);
      expect(refreshCookie.value).toBe('sample_refresh_token');
      expect(refreshCookie.httpOnly).toBe(true);
      expect(refreshCookie.path).toBe('/api/v1/auth');
      expect(refreshCookie.maxAge).toBe(7 * 24 * 3600);
    });
  });

  describe('Cryptographic JWT Engine', () => {
    it('signs and verifies valid JWT with custom claims', () => {
      const payload = { sub: 'usr_test123', role: 'ADMIN' };
      const token = signJwt(payload, TEST_SECRET, { expiresInSeconds: 60 });

      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = verifyJwt<{ sub: string; role: string }>(token, TEST_SECRET);
      expect(decoded.sub).toBe('usr_test123');
      expect(decoded.role).toBe('ADMIN');
      expect(decoded.iss).toBe(TOKEN_POLICIES.ISSUER);
    });

    it('rejects tampered token signature', () => {
      const token = signJwt({ sub: 'usr_test123' }, TEST_SECRET, { expiresInSeconds: 60 });
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignatureHere`;

      expect(() => verifyJwt(tamperedToken, TEST_SECRET)).toThrow(UnauthorizedError);
    });

    it('rejects expired tokens', () => {
      const token = signJwt({ sub: 'usr_test123' }, TEST_SECRET, { expiresInSeconds: -10 }); // Already expired
      expect(() => verifyJwt(token, TEST_SECRET)).toThrow(UnauthorizedError);
    });

    it('extracts Bearer token from authorization header correctly', () => {
      expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
      expect(extractBearerToken('bearer xyz123')).toBe('xyz123');
      expect(extractBearerToken('Basic dXNlcjpwYXNz')).toBe(null);
      expect(extractBearerToken(null)).toBe(null);
    });

    it('generates consistent SHA-256 token hash for database lookup', () => {
      const token = 'token_to_hash_for_db_verification';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  describe('Password Hashing & Strength Validation', () => {
    it('approves compliant strong passwords', () => {
      const strong = 'Alif@Dhaka#2026!';
      const result = validatePasswordStrength(strong);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('flags passwords failing complexity requirements', () => {
      // Too short, no uppercase, no special char
      const weak = 'secret';
      const result = validatePasswordStrength(weak);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('8 characters'))).toBe(true);
      expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true);
      expect(result.errors.some((e) => e.includes('special character'))).toBe(true);
    });

    it('hashes passwords using PBKDF2-HMAC-SHA512 with unique salt', () => {
      const password = 'StrongPassword!123';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1.startsWith('$pbkdf2-sha512$')).toBe(true);
      expect(hash2.startsWith('$pbkdf2-sha512$')).toBe(true);
      // Different salts produce different hashes for identical passwords
      expect(hash1).not.toBe(hash2);

      // Both hashes verify successfully against original password
      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);
    });

    it('rejects incorrect password verification', () => {
      const hash = hashPassword('CorrectPassword#123');
      expect(verifyPassword('WrongPassword#123', hash)).toBe(false);
      expect(verifyPassword('', hash)).toBe(false);
      expect(verifyPassword('CorrectPassword#123', 'invalid-hash-string')).toBe(false);
    });
  });

  describe('AuthTokenService Token Lifecycle & Reuse Detection', () => {
    // In-memory mock session repository
    class MockSessionRepository {
      sessions: Map<string, any> = new Map();
      users: Map<string, any> = new Map();

      constructor() {
        this.users.set('usr_01', {
          id: 'usr_01',
          email: 'customer@alifworld.com',
          phone: '+8801700000001',
          status: 'ACTIVE',
          tokenVersion: 1,
        });
      }

      async createSession(params: any) {
        const session = {
          id: `ses_${Math.random().toString(36).substring(2, 9)}`,
          userId: params.userId,
          sessionToken: params.sessionToken,
          refreshTokenHash: params.refreshTokenHash,
          clientType: params.clientType,
          expiresAt: params.expiresAt,
          isRevoked: false,
          user: this.users.get(params.userId),
        };
        this.sessions.set(session.id, session);
        return session;
      }

      async findSessionById(id: string) {
        return this.sessions.get(id) || null;
      }

      async findSessionByToken(sessionToken: string) {
        for (const s of this.sessions.values()) {
          if (s.sessionToken === sessionToken) return s;
        }
        return null;
      }

      async rotateSessionRefreshToken(id: string, hash: string, expiresAt: Date) {
        const session = this.sessions.get(id);
        if (session) {
          session.refreshTokenHash = hash;
          session.expiresAt = expiresAt;
        }
      }

      async enforceSessionLimit() {}

      async revokeAllUserSessions(userId: string, reason: string) {
        for (const s of this.sessions.values()) {
          if (s.userId === userId) {
            s.isRevoked = true;
            s.revokedReason = reason;
          }
        }
      }

      async incrementUserTokenVersion(userId: string) {
        const user = this.users.get(userId);
        if (user) {
          user.tokenVersion += 1;
          return user.tokenVersion;
        }
        return 1;
      }

      async revokeSession(id: string) {
        const session = this.sessions.get(id);
        if (session) session.isRevoked = true;
      }
    }

    const mockRepo = new MockSessionRepository();
    const authService = new AuthTokenService(mockRepo as unknown as SessionRepository, TEST_SECRET);

    const testUser: UserAuthDetails = {
      id: 'usr_01',
      email: 'customer@alifworld.com',
      phone: '+8801700000001',
      status: 'ACTIVE',
      tokenVersion: 1,
      roleAssignments: [
        {
          role: {
            code: 'CUSTOMER',
            rolePermissions: [
              { permission: { code: 'orders:read' } },
              { permission: { code: 'orders:create' } },
            ],
          },
        },
      ],
    };

    it('issues token pair with correct roles, permissions, and cookies', async () => {
      const result = await authService.issueTokenPair({
        user: testUser,
        clientType: 'WEB',
      });

      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(900);
      expect(result.user.roles).toContain('CUSTOMER');
      expect(result.user.permissions).toContain('orders:read');
      expect(result.user.permissions).toContain('orders:create');
      expect(result.cookies.length).toBe(2);

      // Verify access token claims
      const accessClaims = verifyJwt<any>(result.accessToken, TEST_SECRET);
      expect(accessClaims.sub).toBe('usr_01');
      expect(accessClaims.roles).toEqual(['CUSTOMER']);
      expect(accessClaims.tokenVersion).toBe(1);
    });

    it('rotates refresh token and invalidates the previous refresh token', async () => {
      const initial = await authService.issueTokenPair({
        user: testUser,
        clientType: 'WEB',
      });

      const rotated = await authService.rotateRefreshToken(initial.refreshToken, 'WEB');
      expect(rotated.refreshToken).not.toBe(initial.refreshToken);
      expect(rotated.accessToken).not.toBe(initial.accessToken);

      // Presenting the OLD refresh token must trigger reuse detection and fail
      expect(authService.rotateRefreshToken(initial.refreshToken, 'WEB')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('introspects token successfully for active session', async () => {
      const { accessToken } = await authService.issueTokenPair({
        user: testUser,
        clientType: 'WEB',
      });

      const introspection = await authService.introspectToken(accessToken);
      expect(introspection.active).toBe(true);
      expect(introspection.sub).toBe('usr_01');
      expect(introspection.roles).toContain('CUSTOMER');
    });

    it('revokes all sessions globally when user tokenVersion increments', async () => {
      const { accessToken } = await authService.issueTokenPair({
        user: testUser,
        clientType: 'WEB',
      });

      // User changes password or logs out from all devices
      await authService.revokeAllUserSessions(testUser.id, 'PASSWORD_RESET');

      // Previous token must now fail introspection due to tokenVersion mismatch
      const introspection = await authService.introspectToken(accessToken);
      expect(introspection.active).toBe(false);
    });
  });

  describe('Zod Validator Contracts', () => {
    it('validates correct login payload', () => {
      const payload = {
        identifier: 'Customer@AlifWorld.com ',
        password: 'SecurePassword123!',
        clientType: 'WEB',
      };

      const parsed = loginSchema.parse(payload);
      expect(parsed.identifier).toBe('customer@alifworld.com'); // Trimmed and lowercased
      expect(parsed.clientType).toBe('WEB');
    });

    it('validates refresh token payload', () => {
      const valid = { refreshToken: 'valid.jwt.token', clientType: 'MOBILE_FLUTTER' };
      const parsed = refreshTokenSchema.parse(valid);
      expect(parsed.clientType).toBe('MOBILE_FLUTTER');

      expect(() => refreshTokenSchema.parse({ refreshToken: '' })).toThrow();
    });

    it('validates introspection payload', () => {
      const valid = { token: 'sample_token_here' };
      expect(tokenIntrospectSchema.parse(valid).token).toBe('sample_token_here');
      expect(() => tokenIntrospectSchema.parse({})).toThrow();
    });
  });
});
