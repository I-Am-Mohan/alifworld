/**
 * AlifWorld Customer Domain Types & Contracts
 * 
 * Defines type contracts for customer profiles, communication preferences,
 * regulatory consent records, account security overviews, and B2B organization memberships.
 * 
 * Invariants: ADR-0001, ADR-0003, ADR-0006, ADR-0022
 */

export interface CustomerProfile {
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  locale: 'en-BD' | 'bn-BD';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: string;
  createdAt: string;
  version: number;
}

export interface CustomerPreferences {
  userId: string;
  emailMarketing: boolean;
  smsMarketing: boolean;
  orderStatusUpdates: boolean;
  promotionalPush: boolean;
  securityAlerts: boolean; // Mandatory true for account security
  updatedAt: string;
}

export interface CustomerConsent {
  userId: string;
  termsAccepted: boolean;
  termsVersion: string;
  privacyAccepted: boolean;
  privacyVersion: string;
  marketingConsent: boolean;
  updatedAt: string;
}

export interface AccountSecurityOverview {
  userId: string;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  activeSessionsCount: number;
  lastLoginAt: string | null;
}

export interface BusinessBuyerOrganization {
  id: string;
  companyName: string;
  businessType: 'CORPORATION' | 'LLC' | 'PARTNERSHIP' | 'SOLE_PROPRIETORSHIP';
  tradeLicenseNumber: string | null;
  binNumber: string | null;
  tinNumber: string | null;
  creditLimitPoisha: number; // Invariant: Kept strictly private to organization members!
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'SUSPENDED';
  membershipRole: 'ADMIN' | 'PURCHASER' | 'VIEWER';
  membersCount: number;
  createdAt: string;
}

export * from './wishlist.types';
export * from './b2b.types';
export * from './dashboard.types';


