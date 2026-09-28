import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { CheckoutOrchestratorService } from '@/features/checkout/services/checkout-orchestrator.service';
import { auditService } from '@/shared/audit';
import {
  ValidationError,
  AuthorizationError,
  ConflictError,
} from '@/shared/errors/app-error';

class MockPrismaCheckoutDb {
  public carts: any[] = [];
  public cartItems: any[] = [];
  public orders: any[] = [];
  public orderItems: any[] = [];
  public fulfillmentGroups: any[] = [];
  public statusHistories: any[] = [];
  public outboxEvents: any[] = [];
  public quotes: any[] = [];

  public cart = {
    findFirst: async ({ where, include }: any) => {
      const c = this.carts.find((cart) => {
        if (where.id && cart.id !== where.id) return false;
        if (where.userId && cart.userId !== where.userId) return false;
        if (where.deletedAt === null && cart.deletedAt !== null) return false;
        return true;
      });
      if (!c) return null;
      if (include?.items) {
        return {
          ...c,
          items: this.cartItems.filter((i) => i.cartId === c.id && !i.deletedAt),
        };
      }
      return c;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (let idx = 0; idx < this.carts.length; idx++) {
        const c = this.carts[idx];
        if (c.id === where.id && c.status === where.status && c.version === where.version) {
          this.carts[idx] = { ...c, ...data, version: c.version + 1 };
          count++;
        }
      }
      return { count };
    },
  };

  public order = {
    findFirst: async ({ where }: any) => {
      return this.orders.find((o) => o.orderNumber === where.orderNumber && !o.deletedAt) || null;
    },
    create: async ({ data }: any) => {
      const o = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.orders.push(o);
      return o;
    },
  };

  public sellerFulfillmentGroup = {
    create: async ({ data }: any) => {
      const g = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      this.fulfillmentGroups.push(g);
      return g;
    },
  };

  public orderItem = {
    create: async ({ data }: any) => {
      const item = { ...data, createdAt: new Date() };
      this.orderItems.push(item);
      return item;
    },
  };

  public orderStatusHistory = {
    create: async ({ data }: any) => {
      const h = { ...data, createdAt: new Date() };
      this.statusHistories.push(h);
      return h;
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      const evt = { ...data, createdAt: new Date() };
      this.outboxEvents.push(evt);
      return evt;
    },
  };

  public b2bQuote = {
    findFirst: async ({ where }: any) => {
      return this.quotes.find((q) => q.id === where.id && !q.deletedAt) || null;
    },
  };

  public $transaction = async (callback: any) => {
    return callback(this);
  };
}

describe('Milestone 131: Authoritative Checkout Orchestration Unit Tests', () => {
  let mockDb: MockPrismaCheckoutDb;
  let service: CheckoutOrchestratorService;

  const mockSeller = {
    id: 'sel_walton_01',
    businessName: 'Walton Official Flagship Store',
    slug: 'walton-flagship',
    status: 'VERIFIED',
    operationalDefaults: {
      shippingMode: 'PLATFORM',
      defaultHandlingDays: 2,
    },
    settings: {
      vacationMode: false,
    },
    deletedAt: null,
  };

  const mockProduct = {
    id: 'prod_phone_01',
    title: 'Walton Primo S8 Pro',
    slug: 'walton-primo-s8-pro',
    sellerId: 'sel_walton_01',
    status: 'PUBLISHED',
    currency: 'BDT',
    productPoint: 150,
    taxRatePercent: 0,
    deletedAt: null,
    seller: mockSeller,
  };

  const mockVariant = {
    id: 'var_phone_blue',
    productId: 'prod_phone_01',
    title: 'Ocean Blue (8GB/128GB)',
    sku: 'WLT-S8-BLU',
    pricePoisha: BigInt(1850000), // 18,500.00 BDT
    productPoint: 150,
    isActive: true,
    deletedAt: null,
    product: mockProduct,
    stockBalances: [
      {
        onHand: 15,
        reserved: 0,
        damaged: 0,
        quarantined: 0,
        deletedAt: null,
      },
    ],
  };

  beforeEach(() => {
    mockDb = new MockPrismaCheckoutDb();
    service = new CheckoutOrchestratorService();
    (service as any).db = mockDb;

    spyOn(auditService, 'logBusinessEvent').mockResolvedValue();

    // Reset seller vacation status
    mockSeller.settings.vacationMode = false;
  });

  describe('1. Idempotent Multi-Vendor Checkout Execution', () => {
    it('creates an order with seller fulfillment groups, item snapshots, and outbox event', async () => {
      // Seed cart with 1 item
      mockDb.carts.push({
        id: 'crt_user_01',
        userId: 'usr_customer_01',
        currency: 'BDT',
        status: 'ACTIVE',
        version: 1,
        isB2B: false,
        b2bQuoteId: null,
        purchaseOrderRef: null,
        deletedAt: null,
      });

      mockDb.cartItems.push({
        id: 'cit_101',
        cartId: 'crt_user_01',
        variantId: 'var_phone_blue',
        sellerId: 'sel_walton_01',
        quantity: 2,
        pricePoisha: BigInt(1850000),
        productPoint: 150,
        variant: mockVariant,
        seller: mockSeller,
        deletedAt: null,
      });

      const result = await service.executeCheckout('usr_customer_01', {
        cartId: 'crt_user_01',
        checkout: {
          shippingName: 'Rahim Ahmed',
          shippingPhone: '01711223344',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka',
          shippingAddress: 'House 42, Road 11, Banani',
        },
        idempotencyKey: 'idemp-key-abc-12345',
      });

      expect(result.orderNumber).toMatch(/^ORD-/);
      expect(result.status).toBe('PENDING_PAYMENT');
      expect(result.subtotalPoisha).toBe(3700000); // 2 * 18,500 = ৳37,000
      expect(result.shippingFeePoisha).toBe(0); // Qualifies for free delivery (>= ৳2,000)
      expect(result.totalPoisha).toBe(3700000);
      expect(result.totalProductPoints).toBe(300); // 2 * 150 PP
      expect(result.fulfillmentGroupsCount).toBe(1);
      expect(result.isIdempotentReplay).toBe(false);

      // Verify cart claimed and converted
      expect(mockDb.carts[0].status).toBe('CONVERTED');

      // Verify fulfillment groups and order items
      expect(mockDb.fulfillmentGroups.length).toBe(1);
      expect(mockDb.orderItems.length).toBe(1);
      expect(mockDb.orderItems[0].productPointSnapshot).toBe(150);

      // Verify outbox event created
      expect(mockDb.outboxEvents.length).toBe(1);
      expect(mockDb.outboxEvents[0].eventType).toBe('order.created');
    });

    it('returns existing committed order idempotently on replay with the same key', async () => {
      mockDb.carts.push({
        id: 'crt_user_02',
        userId: 'usr_customer_01',
        status: 'ACTIVE',
        currency: 'BDT',
        version: 1,
        deletedAt: null,
      });

      mockDb.cartItems.push({
        id: 'cit_102',
        cartId: 'crt_user_02',
        variantId: 'var_phone_blue',
        sellerId: 'sel_walton_01',
        quantity: 1,
        pricePoisha: BigInt(1850000),
        productPoint: 150,
        variant: mockVariant,
        seller: mockSeller,
        deletedAt: null,
      });

      const firstCall = await service.executeCheckout('usr_customer_01', {
        cartId: 'crt_user_02',
        checkout: {
          shippingName: 'Rahim Ahmed',
          shippingPhone: '01711223344',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka',
          shippingAddress: 'House 42, Road 11, Banani',
        },
        idempotencyKey: 'idemp-replay-key-9988',
      });

      expect(firstCall.isIdempotentReplay).toBe(false);

      // Replay with identical idempotency key and checkout payload
      const replayCall = await service.executeCheckout('usr_customer_01', {
        cartId: 'crt_user_02',
        checkout: {
          shippingName: 'Rahim Ahmed',
          shippingPhone: '01711223344',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka',
          shippingAddress: 'House 42, Road 11, Banani',
        },
        idempotencyKey: 'idemp-replay-key-9988',
      });

      expect(replayCall.isIdempotentReplay).toBe(true);
      expect(replayCall.orderNumber).toBe(firstCall.orderNumber);
      expect(replayCall.totalPoisha).toBe(firstCall.totalPoisha);
    });
  });

  describe('2. B2B Negotiated Quote Pipeline Integration', () => {
    it('checks out B2B converted cart with locked negotiated pricing and PO reference', async () => {
      mockDb.carts.push({
        id: 'crt_b2b_01',
        userId: 'usr_buyer_corp',
        currency: 'BDT',
        status: 'ACTIVE',
        version: 1,
        isB2B: true,
        b2bQuoteId: 'quo_corp_99',
        purchaseOrderRef: 'PO-CORP-2026-001',
        deletedAt: null,
      });

      mockDb.cartItems.push({
        id: 'cit_b2b_1',
        cartId: 'crt_b2b_01',
        variantId: 'var_phone_blue',
        sellerId: 'sel_walton_01',
        quantity: 10,
        pricePoisha: BigInt(1600000), // Locked negotiated wholesale price: ৳16,000 (below retail ৳18,500)
        productPoint: 0, // B2B rule: 0 points
        variant: mockVariant,
        seller: mockSeller,
        deletedAt: null,
      });

      mockDb.quotes.push({
        id: 'quo_corp_99',
        status: 'ACCEPTED',
        validUntil: new Date(Date.now() + 864000000),
        rewardsRuleVersion: 'b2b-rewards-v1.0',
        deletedAt: null,
      });

      const result = await service.executeCheckout('usr_buyer_corp', {
        cartId: 'crt_b2b_01',
        checkout: {
          shippingName: 'Corporate Procurement',
          shippingPhone: '01711998877',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka',
          shippingAddress: 'Gulshan Corporate Tower Level 9',
          purchaseOrderRef: 'PO-CORP-2026-001',
        },
        idempotencyKey: 'idemp-b2b-checkout-key',
      });

      expect(result.isB2B).toBe(true);
      expect(result.purchaseOrderRef).toBe('PO-CORP-2026-001');
      expect(result.subtotalPoisha).toBe(16000000); // 10 * 16,000 = ৳160,000
      expect(result.totalProductPoints).toBe(0); // Decoupled B2B point rule preserved!
    });
  });

  describe('3. Inventory and Vacation Guard Invariants', () => {
    it('blocks checkout when requested quantity exceeds available stock', async () => {
      mockDb.carts.push({
        id: 'crt_stock_test',
        userId: 'usr_customer_01',
        currency: 'BDT',
        status: 'ACTIVE',
        version: 1,
        isB2B: false,
        deletedAt: null,
      });

      mockDb.cartItems.push({
        id: 'cit_over_qty',
        cartId: 'crt_stock_test',
        variantId: 'var_phone_blue',
        sellerId: 'sel_walton_01',
        quantity: 50, // Exceeds available stock of 15!
        pricePoisha: BigInt(1850000),
        productPoint: 150,
        variant: mockVariant,
        seller: mockSeller,
        deletedAt: null,
      });

      await expect(
        service.executeCheckout('usr_customer_01', {
          cartId: 'crt_stock_test',
          checkout: {
            shippingName: 'Rahim Ahmed',
            shippingPhone: '01711223344',
            shippingDivision: 'DHAKA',
            shippingDistrict: 'Dhaka',
            shippingAddress: 'Banani',
          },
          idempotencyKey: 'idemp-stock-fail',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('blocks checkout when seller is on vacation mode', async () => {
      mockDb.carts.push({
        id: 'crt_vac_test',
        userId: 'usr_customer_01',
        currency: 'BDT',
        status: 'ACTIVE',
        version: 1,
        isB2B: false,
        deletedAt: null,
      });

      mockDb.cartItems.push({
        id: 'cit_vac',
        cartId: 'crt_vac_test',
        variantId: 'var_phone_blue',
        sellerId: 'sel_walton_01',
        quantity: 1,
        pricePoisha: BigInt(1850000),
        productPoint: 150,
        variant: mockVariant,
        seller: {
          ...mockSeller,
          settings: {
            vacationMode: true,
            vacationMessage: 'Closed for Eid holiday.',
          },
        },
        deletedAt: null,
      });

      await expect(
        service.executeCheckout('usr_customer_01', {
          cartId: 'crt_vac_test',
          checkout: {
            shippingName: 'Rahim Ahmed',
            shippingPhone: '01711223344',
            shippingDivision: 'DHAKA',
            shippingDistrict: 'Dhaka',
            shippingAddress: 'Banani',
          },
          idempotencyKey: 'idemp-vac-fail',
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
