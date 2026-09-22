import { describe, it, expect, beforeEach } from 'bun:test';
import { loginSchema } from '../../src/validators/auth.validator';
import { AuthLoginService } from '../../src/services/auth-login.service';
import { AuthTokenService } from '../../src/services/auth-token.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { SessionRepository } from '../../src/repositories/session.repository';
import { hashPassword } from '../../src/shared/auth/password';
import { verifyJwt } from '../../src/shared/auth/jwt';
import { AccessTokenClaims, RefreshTokenClaims, TOKEN_POLICIES } from '../../src/shared/auth/token-policy';
import { UnauthorizedError } from '../../src/shared/errors/app-error';

describe('Customer Login and Access Token Issuance (Milestone 034)', () => {
  const TEST_SECRET = 'test_jwt_secret_for_alifworld_milestone_034_32_chars_minimum';

  describe('Login Input Validation (loginSchema)', () => {
    it('successfully parses valid email and password payload', () => {
      const payload = {
        identifier: '  Customer@Example.Com ',
        password: 'Dhaka@Commerce#2026!',
        clientType: 'WEB',
      };

      const parsed = loginSchema.parse(payload);
      expect(parsed.identifier).toBe('customer@example.com');
      expect(parsed.password).toBe('Dhaka@Commerce#2026!');
      expect(parsed.clientType).toBe('WEB');
    });

    it('successfully parses Bangladesh mobile phone number as identifier', () => {
      const payload = {
        identifier: '01700112233',
        password: 'Dhaka@Commerce#2026!',
      };

      const parsed = loginSchema.parse(payload);
      expect(parsed.identifier).toBe('01700112233');
      expect(parsed.clientType).toBe('WEB'); // Default
    });

    it('rejects login payload with empty password', () => {
      expect(() =>
        loginSchema.parse({
          identifier: 'customer@example.com',
          password: '',
        })
      ).toThrow();
    });

    it('rejects login payload with identifier shorter than 3 characters', () => {
      expect(() =>
        loginSchema.parse({
          identifier: 'ab',
          password: 'Password123!',
        })
      ).toThrow();
    });
  });

  describe('AuthLoginService Execution Flow', () => {
    let mockUsers: Map<string, any>;
    let mockSessions: Map<string, any>;
    let mockAuditLogs: any[];
    let mockPrisma: any;
    let mockUserRepo: any;
    let mockSessionRepo: any;
    let tokenService: AuthTokenService;
    let loginService: AuthLoginService;

    const rawPassword = 'Dhaka@SecurePassword#2026!';
    const validPasswordHash = hashPassword(rawPassword);

    beforeEach(() => {
      mockUsers = new Map();
      mockSessions = new Map();
      mockAuditLogs = [];

      // Create a test user
      const user = {
        id: 'usr_01j7x4b9e8m02k3f8d7c6b5a1',
        email: 'tanvir@example.com',
        phone: '+8801700112233',
        name: 'Tanvir Ahmed',
        status: 'ACTIVE',
        passwordHash: validPasswordHash,
        tokenVersion: 1,
        isEmailVerified: true,
        isPhoneVerified: true,
        lastLoginAt: null,
        roleAssignments: [
          {
            role: {
              code: 'CUSTOMER',
              rolePermissions: [
                { permission: { code: 'orders:create' } },
                { permission: { code: 'orders:read' } },
              ],
            },
          },
        ],
        wallets: [
          {
            id: 'wal_main_1',
            type: 'MAIN',
            currency: 'BDT',
            availablePoisha: BigInt(50000),
            pendingPoisha: BigInt(0),
            status: 'ACTIVE',
          },
          {
            id: 'wal_shopping_1',
            type: 'SHOPPING',
            currency: 'BDT',
            availablePoisha: BigInt(25000),
            pendingPoisha: BigInt(0),
            status: 'ACTIVE',
          },
        ],
        pointAccount: {
          id: 'pac_user_1',
          availablePoints: 450,
          pendingPoints: 0,
          lifetimePoints: 450,
        },
        ownedSellers: [],
        sellerStaff: [],
      };

      mockUsers.set(user.id, user);

      // Mock Prisma Client
      mockPrisma = {
        auditLog: {
          create: async ({ data }: any) => {
            mockAuditLogs.push(data);
            return data;
          },
        },
      };

      // Mock UserRepository
      mockUserRepo = {
        findUserByIdentifier: async (identifier: string) => {
          const clean = identifier.trim().toLowerCase();
          for (const u of mockUsers.values()) {
            if (u.email?.toLowerCase() === clean) return u;
            if (u.phone === clean || u.phone === `+88${clean}`) return u;
          }
          return null;
        },
        findUserById: async (id: string) => {
          return mockUsers.get(id) || null;
        },
        updateLastLogin: async (userId: string) => {
          const u = mockUsers.get(userId);
          if (u) u.lastLoginAt = new Date();
        },
      };

      // Mock SessionRepository
      mockSessionRepo = {
        createSession: async (params: any) => {
          const session = {
            id: `ses_${Math.random().toString(36).substring(2, 10)}`,
            ...params,
            isRevoked: false,
          };
          mockSessions.set(session.id, session);
          return session;
        },
        rotateSessionRefreshToken: async (sessionId: string, hash: string, expiresAt: Date) => {
          const s = mockSessions.get(sessionId);
          if (s) {
            s.refreshTokenHash = hash;
            s.expiresAt = expiresAt;
          }
        },
        enforceSessionLimit: async () => {},
        findSessionById: async (id: string) => {
          const s = mockSessions.get(id);
          if (!s) return null;
          return { ...s, user: mockUsers.get(s.userId) };
        },
      };

      tokenService = new AuthTokenService(
        mockSessionRepo as unknown as SessionRepository,
        TEST_SECRET
      );

      loginService = new AuthLoginService(
        mockUserRepo as unknown as UserRepository,
        tokenService,
        mockPrisma,
        TEST_SECRET
      );
    });

    describe('login()', () => {
      it('successfully authenticates with valid email and password (Web Client)', async () => {
        const input = {
          identifier: 'tanvir@example.com',
          password: rawPassword,
          clientType: 'WEB' as const,
          deviceInfo: 'Mozilla/5.0 Test Browser',
        };

        const result = await loginService.login(input, {
          ipAddress: '103.145.12.1',
          userAgent: 'Mozilla/5.0 Test Browser',
        });

        // 1. Verify User Profile returned
        expect(result.user.id).toBe('usr_01j7x4b9e8m02k3f8d7c6b5a1');
        expect(result.user.email).toBe('tanvir@example.com');
        expect(result.user.name).toBe('Tanvir Ahmed');
        expect(result.user.roles).toContain('CUSTOMER');
        expect(result.user.permissions).toContain('orders:create');

        // 2. Verify Tokens returned
        expect(result.tokens.accessToken).toBeDefined();
        expect(result.tokens.refreshToken).toBeDefined();
        expect(result.tokens.tokenType).toBe('Bearer');
        expect(result.tokens.expiresIn).toBe(TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS);

        // 3. Verify Decoded Access Token Claims
        const claims = verifyJwt<AccessTokenClaims>(result.tokens.accessToken, TEST_SECRET);
        expect(claims.sub).toBe('usr_01j7x4b9e8m02k3f8d7c6b5a1');
        expect(claims.email).toBe('tanvir@example.com');
        expect(claims.roles).toContain('CUSTOMER');
        expect(claims.clientType).toBe('WEB');
        expect(claims.tokenVersion).toBe(1);

        // 4. Verify Decoded Refresh Token Claims
        const refreshClaims = verifyJwt<RefreshTokenClaims>(result.tokens.refreshToken, TEST_SECRET);
        expect(refreshClaims.sub).toBe('usr_01j7x4b9e8m02k3f8d7c6b5a1');
        expect(refreshClaims.clientType).toBe('WEB');

        // 5. Verify Cookies prepared for Web
        expect(result.cookies.length).toBe(2);
        const accessCookie = result.cookies.find(
          (c) => c.name === TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME
        );
        const refreshCookie = result.cookies.find(
          (c) => c.name === TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME
        );
        expect(accessCookie?.httpOnly).toBe(true);
        expect(refreshCookie?.httpOnly).toBe(true);

        // 6. Verify Audit Log recorded
        expect(mockAuditLogs.some((l) => l.action === 'USER_LOGIN')).toBe(true);

        // 7. Verify lastLoginAt updated on user
        const storedUser = mockUsers.get('usr_01j7x4b9e8m02k3f8d7c6b5a1');
        expect(storedUser.lastLoginAt).not.toBeNull();
      });

      it('successfully authenticates with Bangladesh mobile phone number', async () => {
        const input = {
          identifier: '01700112233',
          password: rawPassword,
          clientType: 'WEB' as const,
        };

        const result = await loginService.login(input);
        expect(result.user.id).toBe('usr_01j7x4b9e8m02k3f8d7c6b5a1');
        expect(result.user.phone).toBe('+8801700112233');
      });

      it('issues 30-day refresh token for Mobile Flutter clients', async () => {
        const input = {
          identifier: 'tanvir@example.com',
          password: rawPassword,
          clientType: 'MOBILE_FLUTTER' as const,
        };

        const result = await loginService.login(input);
        expect(result.tokens.refreshExpiresIn).toBe(
          TOKEN_POLICIES.MOBILE_REFRESH_TOKEN_TTL_SECONDS
        );

        const refreshClaims = verifyJwt<RefreshTokenClaims>(
          result.tokens.refreshToken,
          TEST_SECRET
        );
        expect(refreshClaims.clientType).toBe('MOBILE_FLUTTER');
      });

      it('rejects login with incorrect password with generic error', async () => {
        const input = {
          identifier: 'tanvir@example.com',
          password: 'WrongPassword#2026!',
          clientType: 'WEB' as const,
        };

        await expect(loginService.login(input)).rejects.toThrow(
          new UnauthorizedError('Invalid email/phone or password')
        );
      });

      it('rejects login for non-existent user with generic error to prevent enumeration', async () => {
        const input = {
          identifier: 'nonexistent@example.com',
          password: rawPassword,
          clientType: 'WEB' as const,
        };

        await expect(loginService.login(input)).rejects.toThrow(
          new UnauthorizedError('Invalid email/phone or password')
        );
      });

      it('rejects login for suspended account with explicit suspension message', async () => {
        const user = mockUsers.get('usr_01j7x4b9e8m02k3f8d7c6b5a1');
        user.status = 'SUSPENDED';

        const input = {
          identifier: 'tanvir@example.com',
          password: rawPassword,
          clientType: 'WEB' as const,
        };

        await expect(loginService.login(input)).rejects.toThrow(
          new UnauthorizedError(
            'Your account has been suspended. Please contact customer support for assistance.'
          )
        );
      });
    });

    describe('getCurrentUser()', () => {
      it('returns active user profile, segregated wallets, and points for valid access token', async () => {
        // Issue token first
        const loginResult = await loginService.login({
          identifier: 'tanvir@example.com',
          password: rawPassword,
        });

        const profile = await loginService.getCurrentUser(loginResult.tokens.accessToken);

        expect(profile.id).toBe('usr_01j7x4b9e8m02k3f8d7c6b5a1');
        expect(profile.email).toBe('tanvir@example.com');
        expect(profile.name).toBe('Tanvir Ahmed');
        expect(profile.wallets.length).toBe(2);
        expect(profile.wallets[0].availablePoisha).toBe('50000');
        expect(profile.pointAccount?.availablePoints).toBe(450);
      });

      it('rejects profile retrieval if tokenVersion in database is incremented (revoked)', async () => {
        const loginResult = await loginService.login({
          identifier: 'tanvir@example.com',
          password: rawPassword,
        });

        // Simulate global tokenVersion bump (e.g. password reset)
        const user = mockUsers.get('usr_01j7x4b9e8m02k3f8d7c6b5a1');
        user.tokenVersion = 2; // Old token has tokenVersion: 1

        await expect(
          loginService.getCurrentUser(loginResult.tokens.accessToken)
        ).rejects.toThrow(UnauthorizedError);
      });

      it('rejects profile retrieval if token signature is invalid', async () => {
        const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsig';
        await expect(loginService.getCurrentUser(tamperedToken)).rejects.toThrow(
          UnauthorizedError
        );
      });
    });
  });
});
