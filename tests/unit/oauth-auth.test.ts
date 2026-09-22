import { describe, it, expect, beforeEach } from 'bun:test';
import * as crypto from 'crypto';
import { GoogleOAuthProvider } from '../../src/features/auth/oauth/google-provider';
import { FacebookOAuthProvider } from '../../src/features/auth/oauth/facebook-provider';
import { OAuthService } from '../../src/features/auth/oauth/oauth.service';
import {
  oauthInitiateQuerySchema,
  oauthCallbackQuerySchema,
  oauthVerifySchema,
} from '../../src/validators/auth.validator';
import { UnauthorizedError, ValidationError } from '../../src/shared/errors/app-error';

// Mock in-memory Prisma client for unit testing OAuth linking and provisioning
class MockPrismaClient {
  users = new Map<string, any>();
  oauthAccounts = new Map<string, any>();
  wallets = new Map<string, any[]>();
  pointAccounts = new Map<string, any>();
  roleAssignments = new Map<string, any[]>();
  auditLogs: any[] = [];
  outboxEvents: any[] = [];

  user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) || null;
      if (where.email) {
        for (const u of Array.from(this.users.values())) {
          if (u.email?.toLowerCase() === where.email?.toLowerCase()) return u;
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const record = {
        ...data,
        roleAssignments: [],
        ownedSellers: [],
        sellerStaff: [],
      };
      this.users.set(data.id, record);
      return record;
    },
    update: async ({ where, data }: any) => {
      const existing = this.users.get(where.id);
      if (existing) {
        Object.assign(existing, data);
      }
      return existing;
    },
  };

  oAuthAccount = {
    findUnique: async ({ where }: any) => {
      if (where.provider_providerUserId) {
        const key = `${where.provider_providerUserId.provider}:${where.provider_providerUserId.providerUserId}`;
        const record = this.oauthAccounts.get(key);
        if (!record) return null;
        const user = this.users.get(record.userId);
        return {
          ...record,
          user,
        };
      }
      return null;
    },
    create: async ({ data }: any) => {
      const key = `${data.provider}:${data.providerUserId}`;
      this.oauthAccounts.set(key, data);
      return data;
    },
    update: async ({ where, data }: any) => {
      for (const [key, val] of Array.from(this.oauthAccounts.entries())) {
        if (val.id === where.id) {
          Object.assign(val, data);
          return val;
        }
      }
      return null;
    },
  };

  role = {
    findUnique: async ({ where }: any) => {
      if (where.code === 'CUSTOMER') {
        return { id: 'rol_customer_123', code: 'CUSTOMER', name: 'Customer' };
      }
      return null;
    },
    create: async ({ data }: any) => data,
  };

  userRoleAssignment = {
    create: async ({ data }: any) => {
      const existing = this.roleAssignments.get(data.userId) || [];
      const record = {
        ...data,
        role: { code: 'CUSTOMER', rolePermissions: [] },
      };
      existing.push(record);
      this.roleAssignments.set(data.userId, existing);

      // Link to user mock
      const user = this.users.get(data.userId);
      if (user) {
        user.roleAssignments = existing;
      }
      return record;
    },
  };

  wallet = {
    create: async ({ data }: any) => {
      const list = this.wallets.get(data.userId) || [];
      list.push(data);
      this.wallets.set(data.userId, list);
      return data;
    },
  };

  pointAccount = {
    create: async ({ data }: any) => {
      this.pointAccounts.set(data.userId, data);
      return data;
    },
  };

  auditLog = {
    create: async ({ data }: any) => {
      this.auditLogs.push(data);
      return data;
    },
  };

  outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };

  async $transaction(fnOrArray: any) {
    if (typeof fnOrArray === 'function') {
      return fnOrArray(this);
    }
    return Promise.all(fnOrArray);
  }
}

// Mock Token Service for issuing test JWT token pairs
class MockAuthTokenService {
  async issueTokenPair({ user, clientType }: any) {
    return {
      accessToken: `mock_jwt_access_for_${user.id}`,
      refreshToken: `mock_jwt_refresh_for_${user.id}`,
      tokenType: 'Bearer' as const,
      expiresIn: 900,
      refreshExpiresIn: 604800,
      sessionId: `ses_mock_${user.id}`,
      cookies: [
        {
          name: 'alif_access_token',
          value: `mock_jwt_access_for_${user.id}`,
          maxAge: 900,
          httpOnly: true,
          secure: false,
          sameSite: 'lax' as const,
          path: '/',
        },
      ],
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles: ['CUSTOMER'],
        permissions: [],
        sellerId: null,
      },
    };
  }
}

describe('Federated OAuth Authentication Architecture (Milestone 039)', () => {
  const TEST_SECRET = 'test_secret_for_oauth_hmac_signing_min_32_chars_ok';

  describe('Zod Validation Contracts', () => {
    it('validates OAuth initiate query parameters', () => {
      const parsed = oauthInitiateQuerySchema.parse({
        returnUrl: '/checkout',
        clientType: 'WEB',
      });
      expect(parsed.returnUrl).toBe('/checkout');
      expect(parsed.clientType).toBe('WEB');
    });

    it('defaults OAuth initiate query parameters when omitted', () => {
      const parsed = oauthInitiateQuerySchema.parse({});
      expect(parsed.returnUrl).toBe('/');
      expect(parsed.clientType).toBe('WEB');
    });

    it('validates OAuth callback query parameters', () => {
      const parsed = oauthCallbackQuerySchema.parse({
        code: 'auth_code_12345',
        state: 'valid_signed_state_token',
      });
      expect(parsed.code).toBe('auth_code_12345');
      expect(parsed.state).toBe('valid_signed_state_token');
    });

    it('rejects OAuth callback query parameters when missing code or state', () => {
      expect(() => oauthCallbackQuerySchema.parse({})).toThrow();
      expect(() => oauthCallbackQuerySchema.parse({ code: 'only_code' })).toThrow();
    });

    it('validates mobile token verification payload with either idToken or accessToken', () => {
      const googleMobile = oauthVerifySchema.parse({
        idToken: 'google_id_token_xyz',
        clientType: 'MOBILE_FLUTTER',
      });
      expect(googleMobile.idToken).toBe('google_id_token_xyz');

      const fbMobile = oauthVerifySchema.parse({
        accessToken: 'fb_access_token_xyz',
      });
      expect(fbMobile.accessToken).toBe('fb_access_token_xyz');
      expect(fbMobile.clientType).toBe('MOBILE_FLUTTER');
    });

    it('rejects mobile token verification payload when neither token is supplied', () => {
      expect(() => oauthVerifySchema.parse({ clientType: 'MOBILE_FLUTTER' })).toThrow();
    });
  });

  describe('Google OAuth Provider', () => {
    it('constructs well-formed authorization URL with required OIDC scopes', () => {
      const provider = new GoogleOAuthProvider('test_client_id', 'test_client_secret');
      const url = provider.getAuthorizationUrl('state123', 'http://localhost:3000/callback');

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('state=state123');
      expect(url).toContain('scope=openid+email+profile');
    });

    it('exchanges code for mock tokens in test/mock environment', async () => {
      const provider = new GoogleOAuthProvider('mock_client', 'mock_secret');
      const tokens = await provider.exchangeCode('mock_auth_code', 'http://localhost:3000/callback');

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.accessToken).toContain('mock_google_access');
    });

    it('returns normalized profile from tokens', async () => {
      const provider = new GoogleOAuthProvider('mock_client', 'mock_secret');
      const profile = await provider.getUserProfile({
        accessToken: 'mock_token:test.user@gmail.com:google_sub_12345:Test User',
        tokenType: 'Bearer',
      });

      expect(profile.provider).toBe('GOOGLE');
      expect(profile.providerUserId).toBe('google_sub_12345');
      expect(profile.email).toBe('test.user@gmail.com');
      expect(profile.isEmailVerified).toBe(true);
      expect(profile.name).toBe('Test User');
    });

    it('verifies Flutter native ID token', async () => {
      const provider = new GoogleOAuthProvider('mock_client', 'mock_secret');
      const profile = await provider.verifyToken('mock_token:flutter.google@gmail.com:sub_flutter_999:Flutter Google User');

      expect(profile.provider).toBe('GOOGLE');
      expect(profile.email).toBe('flutter.google@gmail.com');
      expect(profile.providerUserId).toBe('sub_flutter_999');
    });
  });

  describe('Facebook OAuth Provider', () => {
    it('constructs well-formed authorization URL with Graph API parameters', () => {
      const provider = new FacebookOAuthProvider('test_fb_id', 'test_fb_secret');
      const url = provider.getAuthorizationUrl('state_fb', 'http://localhost:3000/callback');

      expect(url).toContain('https://www.facebook.com/v19.0/dialog/oauth?');
      expect(url).toContain('client_id=test_fb_id');
      expect(url).toContain('state=state_fb');
      expect(url).toContain('scope=email%2Cpublic_profile');
    });

    it('exchanges code for mock tokens in test/mock environment', async () => {
      const provider = new FacebookOAuthProvider('mock_app_id', 'mock_secret');
      const tokens = await provider.exchangeCode('mock_fb_code', 'http://localhost:3000/callback');

      expect(tokens.accessToken).toContain('mock_facebook_access');
    });

    it('returns normalized profile from tokens', async () => {
      const provider = new FacebookOAuthProvider('mock_app_id', 'mock_secret');
      const profile = await provider.getUserProfile({
        accessToken: 'mock_fb:fb.buyer@facebook.com:fb_user_777888:Facebook Buyer',
        tokenType: 'Bearer',
      });

      expect(profile.provider).toBe('FACEBOOK');
      expect(profile.providerUserId).toBe('fb_user_777888');
      expect(profile.email).toBe('fb.buyer@facebook.com');
      expect(profile.isEmailVerified).toBe(true);
    });

    it('verifies Flutter native Facebook access token', async () => {
      const provider = new FacebookOAuthProvider('mock_app_id', 'mock_secret');
      const profile = await provider.verifyToken('mock_token:fb.flutter@facebook.com:sub_fb_flutter_555:Flutter FB User');

      expect(profile.provider).toBe('FACEBOOK');
      expect(profile.email).toBe('fb.flutter@facebook.com');
      expect(profile.providerUserId).toBe('sub_fb_flutter_555');
    });
  });

  describe('OAuthService Anti-CSRF Protection', () => {
    let mockPrisma: MockPrismaClient;
    let mockTokenService: MockAuthTokenService;
    let oauthService: OAuthService;

    beforeEach(() => {
      mockPrisma = new MockPrismaClient();
      mockTokenService = new MockAuthTokenService();
      oauthService = new OAuthService(
        mockTokenService as any,
        mockPrisma,
        TEST_SECRET
      );
    });

    it('generates cryptographic signed state and verifies successfully', () => {
      const { state, nonce } = oauthService.generateState('GOOGLE', '/store/deals', 'WEB');
      expect(state).toContain('.');

      const payload = oauthService.verifyState(state, 'GOOGLE', nonce);
      expect(payload.provider).toBe('GOOGLE');
      expect(payload.returnUrl).toBe('/store/deals');
      expect(payload.clientType).toBe('WEB');
      expect(payload.nonce).toBe(nonce);
    });

    it('rejects state with tampered signature', () => {
      const { state } = oauthService.generateState('GOOGLE', '/', 'WEB');
      const tampered = state.slice(0, -4) + 'abcd';

      expect(() => oauthService.verifyState(tampered, 'GOOGLE')).toThrow(UnauthorizedError);
    });

    it('rejects state with provider mismatch', () => {
      const { state, nonce } = oauthService.generateState('GOOGLE', '/', 'WEB');

      expect(() => oauthService.verifyState(state, 'FACEBOOK', nonce)).toThrow(
        UnauthorizedError
      );
    });

    it('rejects state with cookie nonce mismatch', () => {
      const { state } = oauthService.generateState('GOOGLE', '/', 'WEB');

      expect(() =>
        oauthService.verifyState(state, 'GOOGLE', 'wrong_nonce_from_attacker')
      ).toThrow(UnauthorizedError);
    });

    it('rejects expired state token', () => {
      const expiredPayload = {
        nonce: 'expired_nonce',
        provider: 'GOOGLE',
        returnUrl: '/',
        clientType: 'WEB',
        timestamp: Date.now() - 20 * 60 * 1000, // 20 mins ago (> 15 min TTL)
      };

      const payloadBase64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
      const sig = crypto.createHmac('sha256', TEST_SECRET).update(payloadBase64).digest('base64url');
      const expiredState = `${payloadBase64}.${sig}`;

      expect(() => oauthService.verifyState(expiredState, 'GOOGLE')).toThrow(UnauthorizedError);
    });
  });

  describe('User Resolution & Multi-Wallet Provisioning Flow', () => {
    let mockPrisma: MockPrismaClient;
    let mockTokenService: MockAuthTokenService;
    let oauthService: OAuthService;

    beforeEach(() => {
      mockPrisma = new MockPrismaClient();
      mockTokenService = new MockAuthTokenService();
      oauthService = new OAuthService(
        mockTokenService as any,
        mockPrisma,
        TEST_SECRET
      );
    });

    it('provisions new customer with 4 segregated wallets, point account, and audit log on first OAuth signup', async () => {
      const profile = {
        provider: 'GOOGLE' as const,
        providerUserId: 'google_uid_new_101',
        email: 'new.shopper@gmail.com',
        name: 'New Shopper',
        isEmailVerified: true,
        avatarUrl: 'https://lh3.googleusercontent.com/avatar',
      };

      const { user, isNewUser } = await oauthService.findOrCreateOAuthUser(profile);

      expect(isNewUser).toBe(true);
      expect(user.id).toBeDefined();
      expect(user.email).toBe('new.shopper@gmail.com');
      expect(user.isEmailVerified).toBe(true);

      // Verify 4 segregated wallets provisioned: MAIN, SHOPPING, GOOD_LUCK, CHARITY
      const userWallets = mockPrisma.wallets.get(user.id) || [];
      expect(userWallets.length).toBe(4);
      const walletTypes = userWallets.map((w: any) => w.type);
      expect(walletTypes).toContain('MAIN');
      expect(walletTypes).toContain('SHOPPING');
      expect(walletTypes).toContain('GOOD_LUCK');
      expect(walletTypes).toContain('CHARITY');
      for (const w of userWallets) {
        expect(w.currency).toBe('BDT');
        expect(w.availablePoisha).toBe(BigInt(0));
        expect(w.status).toBe('ACTIVE');
      }

      // Verify dedicated PointAccount provisioned
      const pointAccount = mockPrisma.pointAccounts.get(user.id);
      expect(pointAccount).toBeDefined();
      expect(pointAccount.availablePoints).toBe(0);

      // Verify Audit Log and Outbox Event
      expect(mockPrisma.auditLogs.length).toBe(1);
      expect(mockPrisma.auditLogs[0].action).toBe('OAUTH_USER_REGISTERED');
      expect(mockPrisma.outboxEvents.length).toBe(1);
      expect(mockPrisma.outboxEvents[0].topic).toBe('customer.registered');
    });

    it('automatically links OAuth account to existing user by verified email', async () => {
      // Pre-seed existing user with password login
      const existingUserId = 'usr_pre_existing_202';
      await mockPrisma.user.create({
        data: {
          id: existingUserId,
          email: 'existing.customer@example.com',
          name: 'Existing Customer',
          isEmailVerified: false,
          status: 'ACTIVE',
          tokenVersion: 1,
        },
      });

      const profile = {
        provider: 'GOOGLE' as const,
        providerUserId: 'google_uid_existing_email_303',
        email: 'existing.customer@example.com',
        name: 'Existing Customer via Google',
        isEmailVerified: true,
        avatarUrl: 'https://lh3.googleusercontent.com/avatar',
      };

      const { user, isNewUser } = await oauthService.findOrCreateOAuthUser(profile);

      expect(isNewUser).toBe(false);
      expect(user.id).toBe(existingUserId);
      // Email verification should be upgraded to true since Google verified it
      expect(mockPrisma.users.get(existingUserId).isEmailVerified).toBe(true);

      // OAuth mapping should now exist
      const oauthKey = 'GOOGLE:google_uid_existing_email_303';
      const oauthAccount = mockPrisma.oauthAccounts.get(oauthKey);
      expect(oauthAccount).toBeDefined();
      expect(oauthAccount.userId).toBe(existingUserId);

      // Audit log should record OAUTH_ACCOUNT_LINKED
      expect(mockPrisma.auditLogs.length).toBe(1);
      expect(mockPrisma.auditLogs[0].action).toBe('OAUTH_ACCOUNT_LINKED');
    });

    it('logs in returning OAuth user directly without duplicating records', async () => {
      const profile = {
        provider: 'FACEBOOK' as const,
        providerUserId: 'fb_returning_404',
        email: 'returning.fb@example.com',
        name: 'Returning FB User',
        isEmailVerified: true,
      };

      // First login
      const first = await oauthService.findOrCreateOAuthUser(profile);
      expect(first.isNewUser).toBe(true);

      // Second login
      const second = await oauthService.findOrCreateOAuthUser(profile);
      expect(second.isNewUser).toBe(false);
      expect(second.user.id).toBe(first.user.id);
    });

    it('blocks suspended accounts attempting OAuth login', async () => {
      const suspendedId = 'usr_suspended_999';
      await mockPrisma.user.create({
        data: {
          id: suspendedId,
          email: 'banned.user@example.com',
          name: 'Banned User',
          status: 'SUSPENDED',
          tokenVersion: 1,
        },
      });

      const profile = {
        provider: 'GOOGLE' as const,
        providerUserId: 'google_suspended_user',
        email: 'banned.user@example.com',
        name: 'Banned User',
        isEmailVerified: true,
      };

      expect(oauthService.findOrCreateOAuthUser(profile)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Flutter / Mobile Token Verification', () => {
    let mockPrisma: MockPrismaClient;
    let mockTokenService: MockAuthTokenService;
    let oauthService: OAuthService;

    beforeEach(() => {
      mockPrisma = new MockPrismaClient();
      mockTokenService = new MockAuthTokenService();
      oauthService = new OAuthService(
        mockTokenService as any,
        mockPrisma,
        TEST_SECRET
      );
    });

    it('verifies Flutter native Google ID token and returns session and Bearer tokens', async () => {
      const result = await oauthService.verifyMobileToken({
        provider: 'google',
        idToken: 'mock_token:flutter.shopper@gmail.com:google_mobile_888:Flutter Shopper',
        clientType: 'MOBILE_FLUTTER',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('flutter.shopper@gmail.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.tokenType).toBe('Bearer');
      expect(result.sessionId).toBeDefined();
    });

    it('verifies Flutter native Facebook access token and returns session and Bearer tokens', async () => {
      const result = await oauthService.verifyMobileToken({
        provider: 'facebook',
        accessToken: 'mock_token:flutter.fb@facebook.com:fb_mobile_999:Flutter FB Shopper',
        clientType: 'MOBILE_FLUTTER',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('flutter.fb@facebook.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.tokenType).toBe('Bearer');
      expect(result.sessionId).toBeDefined();
    });
  });
});
