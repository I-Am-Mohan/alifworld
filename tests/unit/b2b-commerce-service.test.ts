import { describe, expect, it, beforeEach } from 'bun:test';
import { B2BCommerceService } from '@/features/customers/services/b2b-commerce.service';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError,
} from '@/shared/errors/app-error';

class MockPrismaB2BDb {
  public organizations: any[] = [];
  public members: any[] = [];
  public rfqs: any[] = [];
  public quotes: any[] = [];
  public carts: any[] = [];
  public cartItems: any[] = [];
  public products: any[] = [];
  public outboxEvents: any[] = [];

  public buyerOrganization = {
    findFirst: async ({ where }: any) => {
      return (
        this.organizations.find((o) => {
          if (where.id && o.id !== where.id) return false;
          if (where.deletedAt === null && o.deletedAt !== null) return false;
          return true;
        }) || null
      );
    },
    create: async ({ data, include }: any) => {
      const org = {
        ...data,
        creditLimitPoisha: data.creditLimitPoisha ?? 0n,
        creditTermsDays: data.creditTermsDays ?? 0,
        rewardsRuleVersion: data.rewardsRuleVersion ?? 'b2b-rewards-v1.0',
        earnsProductPoints: data.earnsProductPoints ?? false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      if (data.members?.create) {
        const mem = {
          ...data.members.create,
          organizationId: org.id,
          spendingLimitPoisha: data.members.create.spendingLimitPoisha ?? 0n,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        this.members.push(mem);
        org.members = [mem];
      }
      this.organizations.push(org);
      return org;
    },
    update: async ({ where, data, include }: any) => {
      const idx = this.organizations.findIndex((o) => o.id === where.id);
      if (idx === -1) throw new Error('Not found');
      this.organizations[idx] = {
        ...this.organizations[idx],
        ...data,
        version: (this.organizations[idx].version || 1) + 1,
        updatedAt: new Date(),
      };
      return this.organizations[idx];
    },
    findMany: async () => this.organizations.filter((o) => !o.deletedAt),
  };

  public buyerOrganizationMember = {
    findFirst: async ({ where, include }: any) => {
      const m = this.members.find((mem) => {
        if (where.id && mem.id !== where.id) return false;
        if (where.userId && mem.userId !== where.userId) return false;
        if (where.organizationId && mem.organizationId !== where.organizationId) return false;
        if (where.status && mem.status !== where.status) return false;
        if (where.deletedAt === null && mem.deletedAt !== null) return false;
        return true;
      });
      if (!m) return null;
      if (include?.organization) {
        const org = this.organizations.find((o) => o.id === m.organizationId);
        return { ...m, organization: org };
      }
      return m;
    },
    create: async ({ data }: any) => {
      const mem = {
        ...data,
        spendingLimitPoisha: data.spendingLimitPoisha ?? 0n,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.members.push(mem);
      return mem;
    },
    update: async ({ where, data }: any) => {
      const idx = this.members.findIndex((m) => m.id === where.id);
      if (idx === -1) throw new Error('Not found');
      this.members[idx] = {
        ...this.members[idx],
        ...data,
        version: (this.members[idx].version || 1) + 1,
        updatedAt: new Date(),
      };
      return this.members[idx];
    },
    findMany: async ({ where }: any) => {
      return this.members.filter((m) => {
        if (where.organizationId && m.organizationId !== where.organizationId) return false;
        if (where.deletedAt === null && m.deletedAt !== null) return false;
        return true;
      });
    },
  };

  public b2bRfq = {
    findFirst: async ({ where }: any) => {
      const rfq = this.rfqs.find(
        (r) => r.id === where.id && (!where.deletedAt || r.deletedAt === null)
      );
      if (!rfq) return null;
      const org = this.organizations.find((o) => o.id === rfq.organizationId);
      return { ...rfq, organization: org };
    },
    create: async ({ data }: any) => {
      const rfq = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedAt: new Date(),
        deletedAt: null,
        version: 1,
        items: data.items?.create || [],
      };
      this.rfqs.push(rfq);
      const org = this.organizations.find((o) => o.id === rfq.organizationId);
      return { ...rfq, organization: org };
    },
    update: async ({ where, data }: any) => {
      const idx = this.rfqs.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error('Not found');
      this.rfqs[idx] = {
        ...this.rfqs[idx],
        ...data,
        version: (this.rfqs[idx].version || 1) + 1,
        updatedAt: new Date(),
      };
      const org = this.organizations.find((o) => o.id === this.rfqs[idx].organizationId);
      return { ...this.rfqs[idx], organization: org };
    },
    findMany: async ({ where }: any) => {
      return this.rfqs.filter((r) => {
        if (where.organizationId && r.organizationId !== where.organizationId) return false;
        if (where.status && r.status !== where.status) return false;
        return !r.deletedAt;
      });
    },
  };

  public b2bQuote = {
    findFirst: async ({ where }: any) => {
      const quote = this.quotes.find(
        (q) => q.id === where.id && (!where.deletedAt || q.deletedAt === null)
      );
      if (!quote) return null;
      const org = this.organizations.find((o) => o.id === quote.organizationId);
      const rfq = this.rfqs.find((r) => r.id === quote.rfqId);
      return { ...quote, organization: org, rfq };
    },
    create: async ({ data }: any) => {
      const quote = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        version: 1,
        items: data.items?.create || [],
        versions: data.versions?.create ? [{ ...data.versions.create, createdAt: new Date() }] : [],
      };
      this.quotes.push(quote);
      const org = this.organizations.find((o) => o.id === quote.organizationId);
      const rfq = this.rfqs.find((r) => r.id === quote.rfqId);
      return { ...quote, organization: org, rfq };
    },
    update: async ({ where, data }: any) => {
      const idx = this.quotes.findIndex((q) => q.id === where.id);
      if (idx === -1) throw new Error('Not found');
      const current = this.quotes[idx];
      const newVersions = data.versions?.create
        ? [...(current.versions || []), { ...data.versions.create, createdAt: new Date() }]
        : current.versions;
      this.quotes[idx] = {
        ...current,
        ...data,
        versions: newVersions,
        version: (current.version || 1) + 1,
        updatedAt: new Date(),
      };
      const org = this.organizations.find((o) => o.id === this.quotes[idx].organizationId);
      const rfq = this.rfqs.find((r) => r.id === this.quotes[idx].rfqId);
      return { ...this.quotes[idx], organization: org, rfq };
    },
    findMany: async ({ where }: any) => {
      return this.quotes.filter((q) => {
        if (where.organizationId && q.organizationId !== where.organizationId) return false;
        if (where.sellerId && q.sellerId !== where.sellerId) return false;
        return !q.deletedAt;
      });
    },
  };

  public cart = {
    findFirst: async ({ where }: any) => {
      return (
        this.carts.find(
          (c) => c.userId === where.userId && c.status === 'ACTIVE' && !c.deletedAt
        ) || null
      );
    },
    create: async ({ data }: any) => {
      const cart = { ...data, createdAt: new Date(), updatedAt: new Date(), version: 1 };
      this.carts.push(cart);
      return cart;
    },
    update: async ({ where, data }: any) => {
      const idx = this.carts.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error('Not found');
      this.carts[idx] = { ...this.carts[idx], ...data, updatedAt: new Date() };
      return this.carts[idx];
    },
  };

  public cartItem = {
    create: async ({ data }: any) => {
      const item = { ...data, createdAt: new Date(), updatedAt: new Date() };
      this.cartItems.push(item);
      return item;
    },
  };

  public product = {
    findFirst: async ({ where }: any) => {
      return this.products.find((p) => p.id === where.id && !p.deletedAt) || null;
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

describe('Milestone 124: B2B Commerce, RFQs & Negotiated Quoting Unit Tests', () => {
  let mockDb: MockPrismaB2BDb;
  let service: B2BCommerceService;

  beforeEach(() => {
    mockDb = new MockPrismaB2BDb();
    service = new B2BCommerceService();
    (service as any).db = mockDb;

    // Seed mock sellable product with MOQ = 50
    mockDb.products.push({
      id: 'prod_cotton_yarn',
      title: 'Combed Cotton Yarn 40s',
      minOrderQuantity: 50,
      sellerId: 'sel_textiles_01',
      variants: [
        {
          id: 'var_yarn_white',
          title: 'Bleached White',
          minOrderQuantity: 50,
        },
      ],
      deletedAt: null,
    });
  });

  describe('1. Organization Registration & Default Invariants', () => {
    it('registers business buyer organization in PENDING_APPROVAL status with credit terms DISABLED', async () => {
      const org = await service.registerOrganization('usr_buyer_01', {
        companyName: 'Apex Weaving Ltd.',
        businessType: 'CORPORATION',
        tradeLicenseNumber: 'TRAD-DCC-2026-9901',
        binNumber: '009876543-0101',
      });

      expect(org.companyName).toBe('Apex Weaving Ltd.');
      expect(org.status).toBe('PENDING_APPROVAL');
      expect(org.creditStatus).toBe('DISABLED');
      expect(org.creditLimitPoisha).toBe(0);
      expect(org.creditTermsDays).toBe(0);
      expect(org.rewardsRuleVersion).toBe('b2b-rewards-v1.0');
      expect(org.earnsProductPoints).toBe(false);

      // Verify creator was added as ADMIN member
      expect(mockDb.members.length).toBe(1);
      expect(mockDb.members[0].userId).toBe('usr_buyer_01');
      expect(mockDb.members[0].role).toBe('ADMIN');
    });

    it('rejects duplicate organization registration for same user', async () => {
      await service.registerOrganization('usr_buyer_01', {
        companyName: 'First Org Ltd.',
        businessType: 'LLC',
        tradeLicenseNumber: 'TRAD-2026-0001',
      });

      await expect(
        service.registerOrganization('usr_buyer_01', {
          companyName: 'Second Org Ltd.',
          businessType: 'LLC',
          tradeLicenseNumber: 'TRAD-2026-0002',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('2. Admin Review & Credit Terms Governance', () => {
    it('approves organization and configures credit facility', async () => {
      const org = await service.registerOrganization('usr_buyer_01', {
        companyName: 'Apex Weaving Ltd.',
        businessType: 'CORPORATION',
        tradeLicenseNumber: 'TRAD-2026-0001',
      });

      // Admin approves organization
      const reviewed = await service.adminReviewOrganization('usr_admin_01', org.id, {
        status: 'APPROVED',
      });
      expect(reviewed.status).toBe('APPROVED');

      // Admin configures credit facility
      const withCredit = await service.adminConfigureCreditTerms('usr_admin_01', org.id, {
        creditStatus: 'APPROVED',
        creditLimitPoisha: 50000000, // ৳500,000.00
        creditTermsDays: 30, // Net 30
        earnsProductPoints: false,
        rewardsRuleVersion: 'b2b-rewards-v1.0',
      });

      expect(withCredit.creditStatus).toBe('APPROVED');
      expect(withCredit.creditLimitPoisha).toBe(50000000);
      expect(withCredit.creditTermsDays).toBe(30);
    });
  });

  describe('3. RFQ Creation & Minimum Order Quantity (MOQ) Invariant', () => {
    it('enforces MOQ and rejects submission when quantity is below product MOQ', async () => {
      const org = await service.registerOrganization('usr_buyer_01', {
        companyName: 'Apex Weaving Ltd.',
        businessType: 'CORPORATION',
        tradeLicenseNumber: 'TRAD-2026-0001',
      });
      await service.adminReviewOrganization('usr_admin_01', org.id, { status: 'APPROVED' });

      // Product MOQ is 50. Requesting 20 should throw ValidationError
      await expect(
        service.createRfq('usr_buyer_01', {
          title: 'Yarn Request Below MOQ',
          items: [
            {
              productId: 'prod_cotton_yarn',
              variantId: 'var_yarn_white',
              productTitle: 'Combed Cotton Yarn',
              quantity: 20, // Below MOQ 50!
            },
          ],
        })
      ).rejects.toThrow(ValidationError);
    });

    it('creates RFQ when quantity satisfies MOQ', async () => {
      const org = await service.registerOrganization('usr_buyer_01', {
        companyName: 'Apex Weaving Ltd.',
        businessType: 'CORPORATION',
        tradeLicenseNumber: 'TRAD-2026-0001',
      });
      await service.adminReviewOrganization('usr_admin_01', org.id, { status: 'APPROVED' });

      const rfq = await service.createRfq('usr_buyer_01', {
        title: 'Bulk Cotton Yarn 200 Spools',
        purchaseOrderRef: 'PO-APEX-2026-001',
        items: [
          {
            productId: 'prod_cotton_yarn',
            variantId: 'var_yarn_white',
            productTitle: 'Combed Cotton Yarn',
            quantity: 200, // >= MOQ 50
            targetPricePoisha: 45000, // ৳450.00 target
          },
        ],
      });

      expect(rfq.status).toBe('SUBMITTED');
      expect(rfq.rfqNumber).toMatch(/^RFQ-/);
      expect(rfq.items.length).toBe(1);
      expect(rfq.items[0].quantity).toBe(200);
    });
  });

  describe('4. Quoting, Credit Protection & Multi-Round Negotiation', () => {
    it('prevents seller from offering net credit terms when buyer credit is DISABLED', async () => {
      const org = await service.registerOrganization('usr_buyer_01', {
        companyName: 'Apex Weaving Ltd.',
        businessType: 'CORPORATION',
        tradeLicenseNumber: 'TRAD-2026-0001',
      });
      await service.adminReviewOrganization('usr_admin_01', org.id, { status: 'APPROVED' });

      const rfq = await service.createRfq('usr_buyer_01', {
        title: 'Bulk Cotton Yarn',
        items: [
          {
            productId: 'prod_cotton_yarn',
            variantId: 'var_yarn_white',
            productTitle: 'Combed Cotton Yarn',
            quantity: 100,
          },
        ],
      });

      // Credit status is DISABLED by default. Seller offering NET_30 must fail!
      await expect(
        service.createQuote('usr_seller_01', 'sel_textiles_01', rfq.id, {
          paymentTerms: 'NET_30',
          items: [
            {
              productId: 'prod_cotton_yarn',
              variantId: 'var_yarn_white',
              productTitle: 'Combed Cotton Yarn',
              quantity: 100,
              unitPricePoisha: 46000,
            },
          ],
        })
      ).rejects.toThrow(ValidationError);
    });

    it('creates quote with IMMEDIATE terms and supports revision increments', async () => {
      const org = await service.registerOrganization('usr_buyer_01', {
        companyName: 'Apex Weaving Ltd.',
        businessType: 'CORPORATION',
        tradeLicenseNumber: 'TRAD-2026-0001',
      });
      await service.adminReviewOrganization('usr_admin_01', org.id, { status: 'APPROVED' });

      const rfq = await service.createRfq('usr_buyer_01', {
        title: 'Bulk Cotton Yarn',
        items: [
          {
            productId: 'prod_cotton_yarn',
            variantId: 'var_yarn_white',
            productTitle: 'Combed Cotton Yarn',
            quantity: 100,
          },
        ],
      });

      const quote = await service.createQuote('usr_seller_01', 'sel_textiles_01', rfq.id, {
        paymentTerms: 'IMMEDIATE',
        items: [
          {
            productId: 'prod_cotton_yarn',
            variantId: 'var_yarn_white',
            productTitle: 'Combed Cotton Yarn',
            quantity: 100,
            unitPricePoisha: 48000, // ৳480.00
          },
        ],
      });

      expect(quote.status).toBe('PENDING_BUYER_REVIEW');
      expect(quote.currentVersion).toBe(1);
      expect(quote.totalPoisha).toBe(4800000); // 100 * 48000 = ৳48,000.00
      expect(quote.pointsAwarded).toBe(0); // Invariant: B2B rule 0 points

      // Buyer counter-offers
      const negotiated = await service.negotiateQuote(quote.id, 'usr_buyer_01', 'BUYER', {
        notes: 'Targeting ৳450 per unit for 100 units.',
        items: [
          {
            productId: 'prod_cotton_yarn',
            variantId: 'var_yarn_white',
            productTitle: 'Combed Cotton Yarn',
            quantity: 100,
            unitPricePoisha: 45000,
          },
        ],
      });

      expect(negotiated.currentVersion).toBe(2);
      expect(negotiated.totalPoisha).toBe(4500000);
      expect(negotiated.versions.length).toBe(2);
    });
  });

  describe('5. Acceptance, Spending Limit Gate & Cart Conversion', () => {
    it('accepts quote and converts to Cart with locked negotiated pricing', async () => {
      const org = await service.registerOrganization('usr_buyer_01', {
        companyName: 'Apex Weaving Ltd.',
        businessType: 'CORPORATION',
        tradeLicenseNumber: 'TRAD-2026-0001',
      });
      await service.adminReviewOrganization('usr_admin_01', org.id, { status: 'APPROVED' });

      const rfq = await service.createRfq('usr_buyer_01', {
        title: 'Bulk Cotton Yarn',
        purchaseOrderRef: 'PO-APEX-9988',
        items: [
          {
            productId: 'prod_cotton_yarn',
            variantId: 'var_yarn_white',
            productTitle: 'Combed Cotton Yarn',
            quantity: 100,
          },
        ],
      });

      const quote = await service.createQuote('usr_seller_01', 'sel_textiles_01', rfq.id, {
        items: [
          {
            productId: 'prod_cotton_yarn',
            variantId: 'var_yarn_white',
            productTitle: 'Combed Cotton Yarn',
            quantity: 100,
            unitPricePoisha: 45000,
          },
        ],
      });

      // Accept quote
      const accepted = await service.acceptQuote(quote.id, 'usr_buyer_01', {
        purchaseOrderRef: 'PO-APEX-FINAL',
      });
      expect(accepted.status).toBe('ACCEPTED');

      // Convert to cart
      const conversion = await service.convertQuoteToCart(quote.id, 'usr_buyer_01');
      expect(conversion.itemsCount).toBe(1);

      // Verify cart and cartItem created with negotiated price
      expect(mockDb.carts.length).toBe(1);
      expect(mockDb.carts[0].isB2B).toBe(true);
      expect(mockDb.carts[0].b2bQuoteId).toBe(quote.id);
      expect(mockDb.cartItems.length).toBe(1);
      expect(mockDb.cartItems[0].pricePoisha).toBe(45000n); // Locked negotiated unit price!
      expect(mockDb.cartItems[0].productPoint).toBe(0); // Decoupled B2B points
    });
  });
});
