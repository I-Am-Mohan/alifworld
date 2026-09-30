import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import {
  GET as getPreferencesRoute,
  PUT as putPreferencesRoute,
} from '@/app/api/v1/customer/preferences/route';
import {
  GET as getConsentRoute,
  PUT as putConsentRoute,
} from '@/app/api/v1/customer/consent/route';
import {
  GET as getSecurityRoute,
  POST as postSecurityRoute,
} from '@/app/api/v1/customer/security/route';
import { GET as getOrgRoute, POST as postOrgRoute } from '@/app/api/v1/customer/organization/route';
import { customerAccountService } from '@/features/customers/services/customer-account.service';
import { NextRequest } from 'next/server';

describe('Milestone 121: Customer Account REST API Integration Tests', () => {
  afterEach(() => mock.restore());
  const customerActor = {
    userId: 'usr-customer-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    spyOn(customerAccountService, 'getCustomerPreferences').mockResolvedValue({
      userId: 'usr-customer-001',
      emailMarketing: false,
      smsMarketing: false,
      orderStatusUpdates: true,
      promotionalPush: false,
      securityAlerts: true,
      updatedAt: new Date().toISOString(),
    });

    spyOn(customerAccountService, 'updateCustomerPreferences').mockResolvedValue({
      userId: 'usr-customer-001',
      emailMarketing: true,
      smsMarketing: true,
      orderStatusUpdates: true,
      promotionalPush: true,
      securityAlerts: true,
      updatedAt: new Date().toISOString(),
    });

    spyOn(customerAccountService, 'getCustomerConsent').mockResolvedValue({
      userId: 'usr-customer-001',
      termsAccepted: true,
      termsVersion: 'v1.2',
      privacyAccepted: true,
      privacyVersion: 'v1.2',
      marketingConsent: true,
      updatedAt: new Date().toISOString(),
    });

    spyOn(customerAccountService, 'updateCustomerConsent').mockResolvedValue({
      userId: 'usr-customer-001',
      termsAccepted: true,
      termsVersion: 'v1.2',
      privacyAccepted: true,
      privacyVersion: 'v1.2',
      marketingConsent: true,
      updatedAt: new Date().toISOString(),
    });

    spyOn(customerAccountService, 'getAccountSecurity').mockResolvedValue({
      userId: 'usr-customer-001',
      hasPassword: true,
      twoFactorEnabled: false,
      isEmailVerified: true,
      isPhoneVerified: true,
      activeSessionsCount: 1,
      lastLoginAt: new Date().toISOString(),
    });

    spyOn(customerAccountService, 'changePassword').mockResolvedValue({
      success: true,
      tokenVersion: 2,
    });

    spyOn(customerAccountService, 'getBusinessOrganization').mockResolvedValue({
      id: 'org_001',
      companyName: 'Apex Logistics Ltd.',
      businessType: 'LLC',
      tradeLicenseNumber: 'TRAD-99',
      binNumber: '123456789012',
      tinNumber: null,
      creditLimitPoisha: 25000000,
      status: 'APPROVED',
      membershipRole: 'ADMIN',
      membersCount: 2,
      createdAt: new Date().toISOString(),
    });

    spyOn(customerAccountService, 'registerBusinessOrganization').mockResolvedValue({
      id: 'org_002',
      companyName: 'New Corp',
      businessType: 'LLC',
      tradeLicenseNumber: 'TRAD-101',
      binNumber: null,
      tinNumber: null,
      creditLimitPoisha: 0,
      status: 'PENDING_APPROVAL',
      membershipRole: 'ADMIN',
      membersCount: 1,
      createdAt: new Date().toISOString(),
    });
  });

  it('GET /api/v1/customer/preferences returns communication preferences', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/preferences', {
      method: 'GET',
    });
    const res = await getPreferencesRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.securityAlerts).toBe(true);
  });

  it('PUT /api/v1/customer/preferences updates preferences', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailMarketing: true, smsMarketing: true }),
    });
    const res = await putPreferencesRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.emailMarketing).toBe(true);
  });

  it('GET /api/v1/customer/consent returns consent status', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/consent', { method: 'GET' });
    const res = await getConsentRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.termsVersion).toBe('v1.2');
  });

  it('GET /api/v1/customer/security returns account security status', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/security', {
      method: 'GET',
    });
    const res = await getSecurityRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.hasPassword).toBe(true);
    expect(body.data.isEmailVerified).toBe(true);
  });

  it('POST /api/v1/customer/security updates password and invalidates tokens', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/security', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456#',
        confirmPassword: 'NewPassword456#',
      }),
    });
    const res = await postSecurityRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.tokenVersion).toBe(2);
  });

  it('GET /api/v1/customer/organization returns B2B organization details', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/organization', {
      method: 'GET',
    });
    const res = await getOrgRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.companyName).toBe('Apex Logistics Ltd.');
  });
});
