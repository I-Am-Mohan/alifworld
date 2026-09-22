import { describe, it, expect } from 'bun:test';
import { customerRegistrationSchema } from '../../src/validators/auth.validator';
import { AuthRegistrationService } from '../../src/services/auth-registration.service';
import { UserRepository, CreateCustomerParams } from '../../src/repositories/user.repository';
import { verifyPassword } from '../../src/shared/auth/password';
import { ConflictError, ValidationError } from '../../src/shared/errors/app-error';

describe('Customer Email and Password Registration (Milestone 032)', () => {
  describe('Customer Registration Zod Validator', () => {
    it('successfully parses valid customer registration payload', () => {
      const validPayload = {
        name: 'Tanvir Ahmed',
        email: 'Tanvir.Ahmed@Example.Com ',
        phone: '01700112233',
        password: 'Dhaka@Commerce#2026!',
        locale: 'bn-BD',
        acceptTerms: true,
      };

      const parsed = customerRegistrationSchema.parse(validPayload);

      expect(parsed.name).toBe('Tanvir Ahmed');
      expect(parsed.email).toBe('tanvir.ahmed@example.com'); // Trimmed & lowercased
      expect(parsed.phone).toBe('+8801700112233'); // Normalized to E.164 Bangladesh
      expect(parsed.locale).toBe('bn-BD');
      expect(parsed.acceptTerms).toBe(true);
    });

    it('rejects registration with weak password', () => {
      const invalidPayload = {
        name: 'Tanvir Ahmed',
        email: 'tanvir@example.com',
        password: 'weakpassword', // Lacks uppercase, digits, and special characters
        acceptTerms: true,
      };

      expect(() => customerRegistrationSchema.parse(invalidPayload)).toThrow();
    });

    it('rejects registration without accepting terms of service', () => {
      const invalidPayload = {
        name: 'Tanvir Ahmed',
        email: 'tanvir@example.com',
        password: 'Dhaka@Commerce#2026!',
        acceptTerms: false,
      };

      expect(() => customerRegistrationSchema.parse(invalidPayload)).toThrow();
    });

    it('rejects invalid Bangladesh phone number formats', () => {
      const invalidPayload = {
        name: 'Tanvir Ahmed',
        email: 'tanvir@example.com',
        phone: '12345', // Not a valid BD mobile number
        password: 'Dhaka@Commerce#2026!',
        acceptTerms: true,
      };

      expect(() => customerRegistrationSchema.parse(invalidPayload)).toThrow();
    });
  });

  describe('AuthRegistrationService Transactional Flow', () => {
    // In-memory mock UserRepository
    class MockUserRepository {
      users: Map<string, any> = new Map();
      wallets: Map<string, any[]> = new Map();
      pointAccounts: Map<string, any> = new Map();
      roleAssignments: Map<string, any[]> = new Map();
      otpTokens: Map<string, any> = new Map();
      outboxEvents: any[] = [];
      auditLogs: any[] = [];

      async registerCustomer(params: CreateCustomerParams) {
        // Duplicate checks
        for (const u of this.users.values()) {
          if (u.email === params.email) {
            throw new ConflictError(`An account with email '${params.email}' already exists`);
          }
          if (params.phone && u.phone === params.phone) {
            throw new ConflictError(`An account with phone '${params.phone}' already exists`);
          }
        }

        const userId = `usr_test_${Math.random().toString(36).substring(2, 8)}`;
        const user = {
          id: userId,
          email: params.email,
          phone: params.phone ?? null,
          name: params.name,
          passwordHash: params.passwordHash,
          status: 'ACTIVE',
          isEmailVerified: false,
          tokenVersion: 1,
        };
        this.users.set(userId, user);

        // Provision 4 wallets
        const userWallets = ['MAIN', 'SHOPPING', 'GOOD_LUCK', 'CHARITY'].map((type) => ({
          id: `wal_${type.toLowerCase()}_${userId}`,
          userId,
          type,
          currency: 'BDT',
          availablePoisha: BigInt(0),
          pendingPoisha: BigInt(0),
          status: 'ACTIVE',
        }));
        this.wallets.set(userId, userWallets);

        // Provision Point Account
        this.pointAccounts.set(userId, {
          id: `pac_${userId}`,
          userId,
          availablePoints: 0,
          pendingPoints: 0,
          lifetimePoints: 0,
        });

        // Assign CUSTOMER role
        this.roleAssignments.set(userId, [
          { id: `ura_${userId}`, userId, role: { code: 'CUSTOMER' } },
        ]);

        const rawVerificationCode = '654321';
        this.otpTokens.set(userId, {
          id: `otp_${userId}`,
          userId,
          identifier: params.email,
          purpose: 'EMAIL_VERIFICATION',
          isUsed: false,
        });

        this.outboxEvents.push({
          eventType: 'auth.customer_registered',
          payload: { userId, email: params.email, verificationCode: rawVerificationCode },
        });

        this.auditLogs.push({
          action: 'CUSTOMER_REGISTERED',
          actorId: userId,
          resource: 'User',
        });

        return {
          user,
          rawVerificationCode,
          otpTokenId: `otp_${userId}`,
        };
      }
    }

    const mockRepo = new MockUserRepository();
    const service = new AuthRegistrationService(mockRepo as unknown as UserRepository);

    it('successfully registers a customer, hashes password, and initializes wallets', async () => {
      const input = {
        name: 'Rashedul Islam',
        email: 'rashed@example.com',
        phone: '+8801812345678',
        password: 'Secure@Password#2026',
        locale: 'bn-BD' as const,
        acceptTerms: true,
      };

      const result = await service.registerCustomer(input, {
        ipAddress: '103.145.12.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      });

      expect(result.email).toBe('rashed@example.com');
      expect(result.name).toBe('Rashedul Islam');
      expect(result.status).toBe('ACTIVE');
      expect(result.isEmailVerified).toBe(false);
      expect(result.devVerificationCode).toBe('654321');

      // Verify that stored user password was hashed and verifies with original password
      const storedUser = mockRepo.users.get(result.userId);
      expect(storedUser).toBeDefined();
      expect(storedUser.passwordHash).not.toBe(input.password);
      expect(verifyPassword(input.password, storedUser.passwordHash)).toBe(true);

      // Verify segregated wallets (MAIN, SHOPPING, GOOD_LUCK, CHARITY)
      const userWallets = mockRepo.wallets.get(result.userId);
      expect(userWallets?.length).toBe(4);
      expect(userWallets?.map((w) => w.type)).toEqual(['MAIN', 'SHOPPING', 'GOOD_LUCK', 'CHARITY']);

      // Verify point account initialized to 0
      const pointAccount = mockRepo.pointAccounts.get(result.userId);
      expect(pointAccount).toBeDefined();
      expect(pointAccount.availablePoints).toBe(0);

      // Verify outbox notification event
      expect(mockRepo.outboxEvents.some((e) => e.eventType === 'auth.customer_registered')).toBe(true);
    });

    it('rejects registration with duplicate email address with ConflictError', async () => {
      const duplicateInput = {
        name: 'Another User',
        email: 'rashed@example.com', // Duplicate
        password: 'Another@Password#2026',
        locale: 'en-BD' as const,
        acceptTerms: true,
      };

      expect(service.registerCustomer(duplicateInput)).rejects.toThrow(ConflictError);
    });

    it('rejects registration with invalid password in service layer', async () => {
      const weakInput = {
        name: 'Test User',
        email: 'newuser@example.com',
        password: 'short',
        locale: 'en-BD' as const,
        acceptTerms: true,
      };

      expect(service.registerCustomer(weakInput)).rejects.toThrow(ValidationError);
    });
  });
});
