import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { GET as getOrgRoute, POST as registerOrgRoute } from '@/app/api/v1/b2b/organization/route';
import { GET as listMembersRoute, POST as inviteMemberRoute } from '@/app/api/v1/b2b/organization/members/route';
import { POST as reviewOrgRoute } from '@/app/api/v1/b2b/admin/organizations/[id]/review/route';
import { POST as configureCreditRoute } from '@/app/api/v1/b2b/admin/organizations/[id]/credit/route';
import { GET as listRfqsRoute, POST as createRfqRoute } from '@/app/api/v1/b2b/rfqs/route';
import { GET as getRfqRoute } from '@/app/api/v1/b2b/rfqs/[id]/route';
import { POST as createQuoteRoute } from '@/app/api/v1/b2b/quotes/route';
import { POST as acceptQuoteRoute } from '@/app/api/v1/b2b/quotes/[id]/accept/route';
import { POST as convertQuoteRoute } from '@/app/api/v1/b2b/quotes/[id]/convert/route';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { NextRequest } from 'next/server';

describe('Milestone 124: B2B Commerce & RFQ REST API Integration Tests', () => {
  const buyerActor = {
    userId: 'usr_buyer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const adminActor = {
    userId: 'usr_admin_01',
    roles: ['ADMIN'],
    permissions: [],
    sellerId: null,
  };

  const sellerActor = {
    userId: 'usr_seller_01',
    roles: ['SELLER'],
    permissions: [],
    sellerId: 'sel_textiles_01',
  };

  const mockOrg = {
    id: 'org_apex_01',
    companyName: 'Apex Weaving Ltd.',
    businessType: 'CORPORATION',
    tradeLicenseNumber: 'TRAD-2026-001',
    binNumber: '001234567-0101',
    tinNumber: null,
    status: 'APPROVED' as const,
    creditStatus: 'DISABLED' as const,
    creditLimitPoisha: 0,
    creditTermsDays: 0,
    rewardsRuleVersion: 'b2b-rewards-v1.0',
    earnsProductPoints: false,
    approvedAt: new Date().toISOString(),
    approvedBy: 'usr_admin_01',
    rejectionReason: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membersCount: 1,
    currentUserRole: 'ADMIN' as const,
  };

  const mockRfq = {
    id: 'rfq_101',
    rfqNumber: 'RFQ-202610-0099',
    organizationId: 'org_apex_01',
    requesterId: 'bom_101',
    sellerId: null,
    title: 'Bulk Cotton Yarn 200 Spools',
    status: 'SUBMITTED' as const,
    purchaseOrderRef: 'PO-APEX-9988',
    currency: 'BDT',
    requiredDeliveryDate: null,
    shippingAddress: null,
    notes: null,
    expiresAt: new Date(Date.now() + 864000000).toISOString(),
    submittedAt: new Date().toISOString(),
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
  };

  const mockQuote = {
    id: 'quo_201',
    quoteNumber: 'QUO-202610-0077',
    rfqId: 'rfq_101',
    organizationId: 'org_apex_01',
    sellerId: 'sel_textiles_01',
    currentVersion: 1,
    status: 'PENDING_BUYER_REVIEW' as const,
    currency: 'BDT',
    validUntil: new Date(Date.now() + 864000000).toISOString(),
    poishaSubtotal: 4500000,
    taxPoisha: 0,
    shippingPoisha: 0,
    totalPoisha: 4500000,
    pointsAwarded: 0,
    ruleVersion: 'b2b-rewards-v1.0',
    paymentTerms: 'IMMEDIATE' as const,
    convertedCartId: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
    versions: [],
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(buyerActor as any);
    spyOn(b2bCommerceService, 'getUserOrganization').mockResolvedValue(mockOrg as any);
    spyOn(b2bCommerceService, 'registerOrganization').mockResolvedValue(mockOrg as any);
    spyOn(b2bCommerceService, 'listMembers').mockResolvedValue([]);
    spyOn(b2bCommerceService, 'inviteMember').mockResolvedValue({
      id: 'bom_new',
      organizationId: 'org_apex_01',
      userId: 'usr_new_buyer',
      role: 'PURCHASER',
      spendingLimitPoisha: 5000000,
      status: 'ACTIVE',
      version: 1,
      createdAt: new Date().toISOString(),
    } as any);
    spyOn(b2bCommerceService, 'adminReviewOrganization').mockResolvedValue({
      ...mockOrg,
      status: 'APPROVED',
    } as any);
    spyOn(b2bCommerceService, 'adminConfigureCreditTerms').mockResolvedValue({
      ...mockOrg,
      creditStatus: 'APPROVED',
      creditLimitPoisha: 100000000,
      creditTermsDays: 30,
    } as any);
    spyOn(b2bCommerceService, 'createRfq').mockResolvedValue(mockRfq as any);
    spyOn(b2bCommerceService, 'listRfqs').mockResolvedValue([mockRfq as any]);
    spyOn(b2bCommerceService, 'getRfqById').mockResolvedValue(mockRfq as any);
    spyOn(b2bCommerceService, 'createQuote').mockResolvedValue(mockQuote as any);
    spyOn(b2bCommerceService, 'acceptQuote').mockResolvedValue({
      ...mockQuote,
      status: 'ACCEPTED',
    } as any);
    spyOn(b2bCommerceService, 'convertQuoteToCart').mockResolvedValue({
      cartId: 'crt_b2b_01',
      quoteId: 'quo_201',
      itemsCount: 1,
    });
  });

  it('GET /api/v1/b2b/organization returns active organization', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/b2b/organization');
    const res = await getOrgRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.companyName).toBe('Apex Weaving Ltd.');
  });

  it('POST /api/v1/b2b/organization registers a new organization', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/b2b/organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Apex Weaving Ltd.',
        businessType: 'CORPORATION',
        tradeLicenseNumber: 'TRAD-2026-001',
      }),
    });
    const res = await registerOrgRoute(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.companyName).toBe('Apex Weaving Ltd.');
  });

  it('POST /api/v1/b2b/organization/members invites a purchaser member', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/b2b/organization/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_new_buyer',
        role: 'PURCHASER',
        spendingLimitPoisha: 5000000,
      }),
    });
    const res = await inviteMemberRoute(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('PURCHASER');
  });

  it('POST /api/v1/b2b/admin/organizations/[id]/credit configures credit facility', async () => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    const req = new NextRequest('http://localhost:3000/api/v1/b2b/admin/organizations/org_apex_01/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creditStatus: 'APPROVED',
        creditLimitPoisha: 100000000,
        creditTermsDays: 30,
        earnsProductPoints: false,
      }),
    });
    const res = await configureCreditRoute(req, {
      params: Promise.resolve({ id: 'org_apex_01' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.creditStatus).toBe('APPROVED');
    expect(body.data.creditTermsDays).toBe(30);
  });

  it('POST /api/v1/b2b/rfqs creates an RFQ', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/b2b/rfqs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Bulk Cotton Yarn 200 Spools',
        purchaseOrderRef: 'PO-APEX-9988',
        items: [
          {
            productId: 'prod_cotton_yarn',
            productTitle: 'Combed Cotton Yarn',
            quantity: 200,
          },
        ],
      }),
    });
    const res = await createRfqRoute(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.rfqNumber).toBe('RFQ-202610-0099');
  });

  it('POST /api/v1/b2b/quotes allows seller to create a quote responding to an RFQ', async () => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

    const req = new NextRequest('http://localhost:3000/api/v1/b2b/quotes?rfqId=rfq_101', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentTerms: 'IMMEDIATE',
        items: [
          {
            productId: 'prod_cotton_yarn',
            productTitle: 'Combed Cotton Yarn',
            quantity: 200,
            unitPricePoisha: 22500,
          },
        ],
      }),
    });
    const res = await createQuoteRoute(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.quoteNumber).toBe('QUO-202610-0077');
  });

  it('POST /api/v1/b2b/quotes/[id]/accept and /convert converts quote to cart', async () => {
    const acceptReq = new NextRequest('http://localhost:3000/api/v1/b2b/quotes/quo_201/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseOrderRef: 'PO-FINAL-2026' }),
    });
    const acceptRes = await acceptQuoteRoute(acceptReq, {
      params: Promise.resolve({ id: 'quo_201' }),
    });
    expect(acceptRes.status).toBe(200);

    const convertReq = new NextRequest('http://localhost:3000/api/v1/b2b/quotes/quo_201/convert', {
      method: 'POST',
    });
    const convertRes = await convertQuoteRoute(convertReq, {
      params: Promise.resolve({ id: 'quo_201' }),
    });
    expect(convertRes.status).toBe(200);

    const body = await convertRes.json();
    expect(body.success).toBe(true);
    expect(body.data.cartId).toBe('crt_b2b_01');
  });
});
