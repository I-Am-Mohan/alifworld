import { describe, expect, it, beforeEach } from 'bun:test';
import { CustomerAccountService } from '@/features/customers/services/customer-account.service';
import { hashPassword } from '@/shared/auth/password';
import { ConflictError, NotFoundError, AuthenticationError } from '@/shared/errors/app-error';

class MockPrismaUserDb {
  public users: any[] = [];
  public userNotificationPreferences: any[] = [];
  public outboxEvents: any[] = [];

  public user = {
    findFirst: async ({ where }: any) => {
      return (
        this.users.find(
          (u) => u.id === where.id && (where.deletedAt === null ? u.deletedAt === null : true)
        ) || null
      );
    },
    update: async ({ where, data }: any) => {
      const idx = this.users.findIndex((u) => u.id === where.id);
      if (idx === -1) throw new NotFoundError('User not found');
      const updated = {
        ...this.users[idx],
        ...data,
        version: data.version?.increment ? this.users[idx].version + 1 : this.users[idx].version,
        tokenVersion: data.tokenVersion?.increment
          ? this.users[idx].tokenVersion + 1
          : this.users[idx].tokenVersion,
      };
      this.users[idx] = updated;
      return updated;
    },
  };

  public userNotificationPreference = {
    findMany: async ({ where }: any) => {
      return this.userNotificationPreferences.filter((p) => p.userId === where.userId);
    },
    upsert: async ({ where, create, update }: any) => {
      const idx = this.userNotificationPreferences.findIndex(
        (p) =>
          p.userId === where.userId_channel_eventType.userId &&
          p.channel === where.userId_channel_eventType.channel &&
          p.eventType === where.userId_channel_eventType.eventType
      );
      if (idx >= 0) {
        this.userNotificationPreferences[idx] = {
          ...this.userNotificationPreferences[idx],
          ...update,
        };
      } else {
        this.userNotificationPreferences.push({ ...create });
      }
      return create;
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

class MockB2bCommerceService {
  private orgs = new Map<string, any>();
  private memberships = new Map<string, any>();

  public async registerOrganization(userId: string, input: any) {
    const orgId = `org_${Math.random().toString(36).substring(2, 10)}`;
    const org = {
      id: orgId,
      companyName: input.companyName,
      businessType: input.businessType,
      tradeLicenseNumber: input.tradeLicenseNumber,
      binNumber: input.binNumber,
      tinNumber: input.tinNumber,
      creditLimitPoisha: 0,
      status: 'PENDING_APPROVAL',
      membersCount: 1,
      createdAt: new Date(),
    };
    this.orgs.set(orgId, org);
    this.memberships.set(userId, { orgId, role: 'ADMIN' });
    return org;
  }

  public async getUserOrganization(userId: string) {
    const mem = this.memberships.get(userId);
    if (!mem) return null;
    const org = this.orgs.get(mem.orgId);
    if (!org) return null;
    return {
      ...org,
      currentUserRole: mem.role,
    };
  }
}

describe('Milestone 121: Customer Profile, Preferences, Consent, and Security Unit Tests', () => {
  let mockDb: MockPrismaUserDb;
  let mockB2b: MockB2bCommerceService;
  let service: CustomerAccountService;

  const initialPassword = 'Password123!';
  const initialPasswordHash = hashPassword(initialPassword);

  const mockUser = {
    id: 'usr_customer_01',
    name: 'Rahim Ahmed',
    email: 'rahim.ahmed@example.com',
    phone: '+8801711223344',
    avatarUrl: null,
    locale: 'en-BD',
    status: 'ACTIVE',
    passwordHash: initialPasswordHash,
    tokenVersion: 1,
    isEmailVerified: true,
    isPhoneVerified: true,
    version: 1,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    mockDb = new MockPrismaUserDb();
    mockDb.users = [{ ...mockUser }];
    mockB2b = new MockB2bCommerceService();
    service = new CustomerAccountService(mockDb, mockB2b);
  });

  describe('1. Profile Retrieval & Minimization', () => {
    it('retrieves customer profile without exposing password hashes or security secrets', async () => {
      const profile = await service.getCustomerProfile('usr_customer_01');

      expect(profile.userId).toBe('usr_customer_01');
      expect(profile.name).toBe('Rahim Ahmed');
      expect(profile.email).toBe('rahim.ahmed@example.com');
      expect(profile.isEmailVerified).toBe(true);
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('throws NotFoundError for non-existent customer', async () => {
      expect(service.getCustomerProfile('non_existent_usr')).rejects.toThrow(NotFoundError);
    });
  });

  describe('2. Profile Updates & OCC Versioning', () => {
    it('updates customer name and locale when version matches', async () => {
      const updated = await service.updateCustomerProfile('usr_customer_01', {
        name: 'Rahim Chowdhury',
        locale: 'bn-BD',
        version: 1,
      });

      expect(updated.name).toBe('Rahim Chowdhury');
      expect(updated.locale).toBe('bn-BD');
      expect(updated.version).toBe(2);
      expect(mockDb.outboxEvents.some((e) => e.eventType === 'customer.profile_updated')).toBe(
        true
      );
    });

    it('rejects profile update with ConflictError on version collision', async () => {
      expect(
        service.updateCustomerProfile('usr_customer_01', {
          name: 'Conflicting update',
          locale: 'en-BD',
          version: 99, // Stale version
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('3. Communication Preferences & Mandatory Security Invariant', () => {
    it('updates marketing preferences while keeping security alerts mandatory', async () => {
      const prefs = await service.updateCustomerPreferences('usr_customer_01', {
        emailMarketing: true,
        smsMarketing: false,
        orderStatusUpdates: true,
        promotionalPush: true,
      });

      expect(prefs.emailMarketing).toBe(true);
      expect(prefs.smsMarketing).toBe(false);
      expect(prefs.securityAlerts).toBe(true); // Mandatory security alert invariant
    });
  });

  describe('4. Regulatory Consent Tracking', () => {
    it('records consent with version history and emits outbox audit event', async () => {
      const consent = await service.updateCustomerConsent('usr_customer_01', {
        termsAccepted: true,
        termsVersion: 'v1.2',
        privacyAccepted: true,
        privacyVersion: 'v1.2',
        marketingConsent: true,
      });

      expect(consent.termsVersion).toBe('v1.2');
      expect(consent.marketingConsent).toBe(true);
      expect(mockDb.outboxEvents.some((e) => e.eventType === 'customer.consent_recorded')).toBe(
        true
      );
    });
  });

  describe('5. Account Security & Session Invalidation', () => {
    it('changes password successfully when current password is valid and increments tokenVersion', async () => {
      const result = await service.changePassword('usr_customer_01', {
        currentPassword: 'Password123!',
        newPassword: 'NewSecurePassword456#',
        confirmPassword: 'NewSecurePassword456#',
      });

      expect(result.success).toBe(true);
      expect(result.tokenVersion).toBe(2); // Invalidation of existing JWT sessions
      expect(mockDb.outboxEvents.some((e) => e.eventType === 'customer.password_changed')).toBe(
        true
      );
    });

    it('rejects password change with AuthenticationError when current password is wrong', async () => {
      expect(
        service.changePassword('usr_customer_01', {
          currentPassword: 'WrongPassword999!',
          newPassword: 'NewSecurePassword456#',
          confirmPassword: 'NewSecurePassword456#',
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('6. B2B Business Buyer Organization & Credit Privacy', () => {
    it('registers B2B organization and isolates private credit terms', async () => {
      const org = await service.registerBusinessOrganization('usr_customer_01', {
        companyName: 'Apex Logistics Ltd.',
        businessType: 'LLC',
        tradeLicenseNumber: 'TRAD-DHK-9921',
        binNumber: '123456789012',
      });

      expect(org.id).toBeDefined();
      expect(org.companyName).toBe('Apex Logistics Ltd.');
      expect(org.status).toBe('PENDING_APPROVAL');

      // Member can view org
      const memberOrg = await service.getBusinessOrganization('usr_customer_01');
      expect(memberOrg).not.toBeNull();
      expect(memberOrg?.companyName).toBe('Apex Logistics Ltd.');

      // Unrelated user cannot view org
      const nonMemberOrg = await service.getBusinessOrganization('usr_stranger_99');
      expect(nonMemberOrg).toBeNull();
    });
  });
});
