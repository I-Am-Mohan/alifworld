/**
 * AlifWorld Customer Account Domain Service
 * 
 * Orchestrates customer self-service profiles, communication preferences,
 * regulatory consent records, account security, and approved B2B organization memberships.
 * 
 * References:
 * - docs/architecture/scope-boundaries-and-domain-map.md
 * - docs/architecture/continuous-integration-and-quality-gates.md
 * Invariants: ADR-0001, ADR-0003, ADR-0006, ADR-0022, ADR-0031
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError, ValidationError, AuthenticationError } from '@/shared/errors/app-error';
import { hashPassword, verifyPassword } from '@/shared/auth/password';
import {
  CustomerProfile,
  CustomerPreferences,
  CustomerConsent,
  AccountSecurityOverview,
  BusinessBuyerOrganization,
} from '../types';
import {
  UpdateProfileInput,
  UpdateProfileSchema,
  UpdatePreferencesInput,
  UpdatePreferencesSchema,
  UpdateConsentInput,
  UpdateConsentSchema,
  ChangePasswordInput,
  ChangePasswordSchema,
  RegisterBusinessBuyerInput,
  RegisterBusinessBuyerSchema,
} from '../validators';

export class CustomerAccountService {
  // In-memory backing stores for dynamic consent and B2B organizations
  private consentRecords = new Map<string, CustomerConsent>();
  private organizationRecords = new Map<string, BusinessBuyerOrganization>();
  private organizationMembers = new Map<string, { orgId: string; role: 'ADMIN' | 'PURCHASER' | 'VIEWER' }>();

  constructor(private readonly db: any = prisma) {}

  /**
   * Retrieves minimized customer profile data.
   */
  public async getCustomerProfile(userId: string): Promise<CustomerProfile> {
    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError(`Customer with ID '${userId}' not found.`);
    }

    return {
      userId: user.id,
      name: user.name || 'AlifWorld Customer',
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      locale: user.locale === 'bn-BD' ? 'bn-BD' : 'en-BD',
      isEmailVerified: Boolean(user.isEmailVerified),
      isPhoneVerified: Boolean(user.isPhoneVerified),
      status: user.status,
      createdAt: user.createdAt?.toISOString?.() || new Date().toISOString(),
      version: user.version,
    };
  }

  /**
   * Updates customer profile fields with optimistic concurrency control.
   */
  public async updateCustomerProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<CustomerProfile> {
    const validated = UpdateProfileSchema.parse(input);

    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError(`Customer with ID '${userId}' not found.`);
    }

    if (user.version !== validated.version) {
      throw new ConflictError(
        `Optimistic concurrency conflict on profile '${userId}'. Expected version ${validated.version}, found ${user.version}.`,
        { currentVersion: user.version, expectedVersion: validated.version }
      );
    }

    const updated = await this.db.user.update({
      where: { id: userId },
      data: {
        name: validated.name,
        avatarUrl: validated.avatarUrl,
        locale: validated.locale,
        version: { increment: 1 },
      },
    });

    await this.recordOutboxEvent('customer.profile_updated', userId, {
      userId,
      name: validated.name,
      locale: validated.locale,
    });

    return {
      userId: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      locale: updated.locale === 'bn-BD' ? 'bn-BD' : 'en-BD',
      isEmailVerified: Boolean(updated.isEmailVerified),
      isPhoneVerified: Boolean(updated.isPhoneVerified),
      status: updated.status,
      createdAt: updated.createdAt?.toISOString?.() || new Date().toISOString(),
      version: updated.version,
    };
  }

  /**
   * Retrieves communication and marketing preferences for a customer.
   */
  public async getCustomerPreferences(userId: string): Promise<CustomerPreferences> {
    try {
      const prefs = await this.db.userNotificationPreference.findMany({
        where: { userId },
      });

      const getPref = (channel: string, eventType: string, defaultVal = false) => {
        const found = prefs.find((p: any) => p.channel === channel && p.eventType === eventType);
        return found ? found.enabled : defaultVal;
      };

      return {
        userId,
        emailMarketing: getPref('EMAIL', 'MARKETING_PROMOTIONS', false),
        smsMarketing: getPref('SMS', 'MARKETING_PROMOTIONS', false),
        orderStatusUpdates: getPref('SMS', 'ORDER_STATUS_CHANGES', true),
        promotionalPush: getPref('PUSH', 'MARKETING_PROMOTIONS', false),
        securityAlerts: true, // Invariant: Security alerts cannot be disabled
        updatedAt: new Date().toISOString(),
      };
    } catch {
      // Default preferences
      return {
        userId,
        emailMarketing: false,
        smsMarketing: false,
        orderStatusUpdates: true,
        promotionalPush: false,
        securityAlerts: true,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Updates customer communication preferences.
   */
  public async updateCustomerPreferences(
    userId: string,
    input: UpdatePreferencesInput
  ): Promise<CustomerPreferences> {
    const validated = UpdatePreferencesSchema.parse(input);

    const preferencePairs = [
      { channel: 'EMAIL', eventType: 'MARKETING_PROMOTIONS', enabled: validated.emailMarketing },
      { channel: 'SMS', eventType: 'MARKETING_PROMOTIONS', enabled: validated.smsMarketing },
      { channel: 'SMS', eventType: 'ORDER_STATUS_CHANGES', enabled: validated.orderStatusUpdates },
      { channel: 'PUSH', eventType: 'MARKETING_PROMOTIONS', enabled: validated.promotionalPush },
      { channel: 'SMS', eventType: 'SECURITY_ALERTS', enabled: true },
    ];

    try {
      for (const pair of preferencePairs) {
        await this.db.userNotificationPreference.upsert({
          where: {
            userId_channel_eventType: {
              userId,
              channel: pair.channel,
              eventType: pair.eventType,
            },
          },
          create: {
            id: `unp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId,
            channel: pair.channel,
            eventType: pair.eventType,
            enabled: pair.enabled,
          },
          update: {
            enabled: pair.enabled,
          },
        });
      }
    } catch (err) {
      console.warn('Non-fatal preference upsert error:', err);
    }

    await this.recordOutboxEvent('customer.preferences_updated', userId, {
      userId,
      preferences: validated,
    });

    return {
      userId,
      emailMarketing: validated.emailMarketing,
      smsMarketing: validated.smsMarketing,
      orderStatusUpdates: validated.orderStatusUpdates,
      promotionalPush: validated.promotionalPush,
      securityAlerts: true,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves regulatory consent record for a customer.
   */
  public async getCustomerConsent(userId: string): Promise<CustomerConsent> {
    const existing = this.consentRecords.get(userId);
    if (existing) {
      return existing;
    }

    return {
      userId,
      termsAccepted: true,
      termsVersion: 'v1.0',
      privacyAccepted: true,
      privacyVersion: 'v1.0',
      marketingConsent: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Updates customer regulatory consent and records an audit event.
   */
  public async updateCustomerConsent(
    userId: string,
    input: UpdateConsentInput
  ): Promise<CustomerConsent> {
    const validated = UpdateConsentSchema.parse(input);

    const consent: CustomerConsent = {
      userId,
      termsAccepted: validated.termsAccepted,
      termsVersion: validated.termsVersion,
      privacyAccepted: validated.privacyAccepted,
      privacyVersion: validated.privacyVersion,
      marketingConsent: validated.marketingConsent,
      updatedAt: new Date().toISOString(),
    };

    this.consentRecords.set(userId, consent);

    await this.recordOutboxEvent('customer.consent_recorded', userId, {
      userId,
      consent,
    });

    return consent;
  }

  /**
   * Retrieves account security overview for customer.
   */
  public async getAccountSecurity(userId: string): Promise<AccountSecurityOverview> {
    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        sessions: {
          where: { expiresAt: { gt: new Date() } },
        },
      },
    });

    if (!user) {
      throw new NotFoundError(`Customer with ID '${userId}' not found.`);
    }

    return {
      userId: user.id,
      hasPassword: Boolean(user.passwordHash),
      twoFactorEnabled: false,
      isEmailVerified: Boolean(user.isEmailVerified),
      isPhoneVerified: Boolean(user.isPhoneVerified),
      activeSessionsCount: user.sessions?.length || 1,
      lastLoginAt: user.lastLoginAt?.toISOString?.() || null,
    };
  }

  /**
   * Updates user account password securely.
   * Invalidates existing JWT sessions by incrementing tokenVersion.
   */
  public async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<{ success: boolean; tokenVersion: number }> {
    const validated = ChangePasswordSchema.parse(input);

    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError(`Customer with ID '${userId}' not found.`);
    }

    if (!user.passwordHash) {
      throw new ValidationError('Account does not have a current password configured. Please use reset password.');
    }

    const isValidCurrent = verifyPassword(validated.currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      throw new AuthenticationError('Current password is incorrect.');
    }

    const newHash = hashPassword(validated.newPassword);
    const updated = await this.db.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    await this.recordOutboxEvent('customer.password_changed', userId, {
      userId,
      tokenVersion: updated.tokenVersion,
    });

    return {
      success: true,
      tokenVersion: updated.tokenVersion,
    };
  }

  /**
   * Resolves Business Buyer Organization details if user belongs to an approved organization.
   * Invariant: Negotiated pricing and credit limits are strictly hidden from non-members.
   */
  public async getBusinessOrganization(
    userId: string
  ): Promise<BusinessBuyerOrganization | null> {
    const membership = this.organizationMembers.get(userId);
    if (!membership) {
      return null;
    }

    const org = this.organizationRecords.get(membership.orgId);
    if (!org) {
      return null;
    }

    return {
      ...org,
      membershipRole: membership.role,
    };
  }

  /**
   * Registers a customer account as a Business Buyer organization.
   */
  public async registerBusinessOrganization(
    userId: string,
    input: RegisterBusinessBuyerInput
  ): Promise<BusinessBuyerOrganization> {
    const validated = RegisterBusinessBuyerSchema.parse(input);

    const existingMembership = this.organizationMembers.get(userId);
    if (existingMembership) {
      throw new ConflictError('User already belongs to an existing Business Buyer organization.');
    }

    const orgId = `org_${Math.random().toString(36).substring(2, 9)}`;
    const organization: BusinessBuyerOrganization = {
      id: orgId,
      companyName: validated.companyName,
      businessType: validated.businessType,
      tradeLicenseNumber: validated.tradeLicenseNumber,
      binNumber: validated.binNumber || null,
      tinNumber: validated.tinNumber || null,
      creditLimitPoisha: 0, // Starts at 0 until credit review
      status: 'PENDING_APPROVAL',
      membershipRole: 'ADMIN',
      membersCount: 1,
      createdAt: new Date().toISOString(),
    };

    this.organizationRecords.set(orgId, organization);
    this.organizationMembers.set(userId, { orgId, role: 'ADMIN' });

    await this.recordOutboxEvent('customer.business_org_registered', orgId, {
      orgId,
      userId,
      companyName: validated.companyName,
    });

    return organization;
  }

  private async recordOutboxEvent(eventType: string, aggregateId: string, payload: any): Promise<void> {
    try {
      await this.db.outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType,
          aggregateType: 'CUSTOMER',
          aggregateId,
          payload: payload ?? {},
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });
    } catch (err) {
      console.warn('Non-fatal outbox record error:', err);
    }
  }
}

export const customerAccountService = new CustomerAccountService();
