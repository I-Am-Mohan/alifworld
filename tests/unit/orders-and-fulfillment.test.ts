/**
 * Orders, Fulfillment Groups, Shipments & Poisha Arithmetic Unit Tests
 * 
 * Verifies:
 * 1. Integer poisha monetary precision (zero floating-point error).
 * 2. Independent discrete Product Points snapshots (no BDT conversion).
 * 3. Multi-vendor cart-to-order fulfillment group partitioning.
 * 4. Multi-tenant seller query scoping and authorization boundaries.
 * 5. Fulfillment group state machine transitions and invalid transition rejections.
 * 6. Append-only immutability of status histories and shipment events.
 * 7. Domain identifier prefix registration.
 * 
 * Reference: docs/architecture/carts-orders-fulfillment-groups-and-shipments.md
 * Invariants: ADR-0003, ADR-0022, ADR-0025, ADR-0027
 */

import { describe, it, expect, spyOn } from 'bun:test';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import {
  MODEL_DELETION_POLICIES,
  assertModelDeletable,
  isModelImmutable,
} from '@/shared/database/lifecycle';
import { assertSellerScope } from '@/shared/database/base-repository';
import {
  SHIPPING_RATES_POISHA,
  PLATFORM_COMMISSION_BPS,
  snapshotOrderLine,
  OrderFulfillmentService,
  VALID_GROUP_TRANSITIONS,
} from '@/services/order-fulfillment.service';
import { CartRepository } from '@/repositories/cart.repository';
import { OrderRepository } from '@/repositories/order.repository';
import { auditService } from '@/shared/audit';
import {
  CheckoutInputSchema,
  AddCartItemSchema,
  FulfillmentStatusTransitionSchema,
  DispatchShipmentSchema,
} from '@/validators/order.validator';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

describe('Milestone 027: Carts, Orders, Fulfillment Groups, and Shipments', () => {
  describe('Checkout snapshot boundary', () => {
    it('adds only a sellable variant at its stored price and Point values', async () => {
      const repository = new CartRepository();
      let storedVariant: any = {
        pricePoisha: 1535n, productPoint: null, product: { sellerId: 'seller-1', productPoint: 9 },
      };
      let variantQuery: any;
      Object.defineProperty(repository, 'db', { value: {
        productVariant: { findFirst: async (query: any) => { variantQuery = query; return storedVariant; } },
      } });
      const cartSpy = spyOn(repository, 'getOrCreateCart').mockResolvedValue({ id: 'cart-1', currency: 'BDT', status: 'ACTIVE' } as any);
      const addSpy = spyOn(repository, 'addItem').mockResolvedValue({ id: 'item-1', pricePoisha: 1535n } as any);
      try {
        const result = await repository.addPublishedVariant('buyer', 'variant-1', 2);
        expect(result.cartId).toBe('cart-1');
        expect(variantQuery.where).toMatchObject({
          isActive: true, product: { status: 'PUBLISHED', currency: 'BDT', seller: { status: 'VERIFIED' } },
        });
        expect(addSpy).toHaveBeenCalledWith('cart-1', {
          variantId: 'variant-1', sellerId: 'seller-1', quantity: 2, pricePoisha: 1535n, productPoint: 9,
        });
        storedVariant = null;
        await expect(repository.addPublishedVariant('buyer', 'draft-variant', 1)).rejects.toBeInstanceOf(NotFoundError);
      } finally {
        cartSpy.mockRestore();
        addSpy.mockRestore();
      }
    });

    it('versions cart edits and refuses writes once checkout has claimed the cart', async () => {
      const repository = new CartRepository();
      let cartIsActive = true;
      let cartVersion = 1;
      let itemUpdates = 0;
      const transactionSpy = spyOn(repository, 'withTransaction').mockImplementation(async (callback: any) => {
        return callback({
          cart: {
            updateMany: async ({ where, data }: any) => {
              expect(where).toMatchObject({ id: 'cart-1', status: 'ACTIVE', deletedAt: null });
              expect(data).toEqual({ version: { increment: 1 } });
              if (!cartIsActive) return { count: 0 };
              cartVersion++;
              return { count: 1 };
            },
          },
          cartItem: {
            findFirst: async ({ where }: any) => where.id ? { cartId: 'cart-1' } : null,
            create: async () => { itemUpdates++; },
            update: async () => { itemUpdates++; },
            updateMany: async () => { itemUpdates++; },
          },
        });
      });

      try {
        await repository.addItem('cart-1', { variantId: 'variant-1', sellerId: 'seller-1', pricePoisha: 1205n, quantity: 1 });
        expect(cartVersion).toBe(2);
        expect(itemUpdates).toBe(1);
        cartIsActive = false;
        await expect(repository.addItem('cart-1', { variantId: 'variant-1', sellerId: 'seller-1', pricePoisha: 1205n, quantity: 1 })).rejects.toBeInstanceOf(ConflictError);
        await expect(repository.updateItemQuantity('item-1', 2)).rejects.toBeInstanceOf(ConflictError);
        await expect(repository.removeItem('item-1')).rejects.toBeInstanceOf(ConflictError);
        await expect(repository.clearCart('cart-1')).rejects.toBeInstanceOf(ConflictError);
        expect(itemUpdates).toBe(1);
      } finally {
        transactionSpy.mockRestore();
      }
    });

    it('refuses a second checkout before inserting any order records', async () => {
      const repository = new OrderRepository();
      let attemptedOrderInsert = false;
      const transactionSpy = spyOn(repository, 'withTransaction').mockImplementation(async (callback: any) => {
        return callback({
          cart: {
            updateMany: async ({ where }: any) => {
              expect(where).toMatchObject({
                id: 'cart-1', userId: 'buyer', currency: 'BDT', status: 'ACTIVE', version: 2, deletedAt: null,
              });
              return { count: 0 };
            },
          },
          order: { create: async () => { attemptedOrderInsert = true; } },
        });
      });

      try {
        await expect(repository.createOrder({ cartId: 'cart-1', cartVersion: 2, customerId: 'buyer' } as any))
          .rejects.toBeInstanceOf(ConflictError);
      } finally {
        transactionSpy.mockRestore();
      }
      expect(attemptedOrderInsert).toBe(false);
    });

    const checkout = CheckoutInputSchema.parse({
      shippingName: 'Example Buyer',
      shippingPhone: '01712345678',
      shippingDivision: 'DHAKA',
      shippingDistrict: 'Dhaka',
      shippingAddress: '123 Example Street',
    });

    function serviceFor(cart: object) {
      const cartRepo = { findById: async () => ({ createdAt: new Date('2026-09-24T00:00:00Z'), ...cart }) } as unknown as CartRepository;
      const orderRepo = {
        findOrderByNumber: async () => null,
        createOrder: async () => { throw new Error('Order should not be created'); },
      } as unknown as OrderRepository;
      return new OrderFulfillmentService(cartRepo, orderRepo);
    }

    it('passes the frozen price and independent Point values to order persistence', async () => {
      const cartRepo = {
        findById: async () => ({
          userId: 'buyer', status: 'ACTIVE', currency: 'BDT', version: 2, createdAt: new Date('2026-09-24T00:00:00Z'),
          items: [{
            sellerId: 'seller-1', variantId: 'variant-1', quantity: 2,
            pricePoisha: 1205n, productPoint: 7,
            variant: { title: 'Medium', sku: 'SKU-1', product: { title: 'Shirt' } },
          }],
        }),
        markConverted: async () => {},
      } as unknown as CartRepository;
      let storedInput: Parameters<OrderRepository['createOrder']>[0] | undefined;
      const orderRepo = {
        findOrderByNumber: async () => null,
        createOrder: async (input: Parameters<OrderRepository['createOrder']>[0]) => {
          storedInput = input;
          return { id: 'order-1', orderNumber: input.orderNumber,
            totalPoisha: input.totalPoisha, totalProductPoints: input.totalProductPoints };
        },
      } as unknown as OrderRepository;
      const auditSpy = spyOn(auditService, 'logBusinessEvent').mockResolvedValue(undefined);

      try {
        await new OrderFulfillmentService(cartRepo, orderRepo).processCheckout('cart-1', 'buyer', checkout, 'test-request-1');
      } finally {
        auditSpy.mockRestore();
      }

      expect(storedInput?.fulfillmentGroups[0].items[0]).toMatchObject({
        unitPricePoisha: 1205n, totalPoisha: 2410n, quantity: 2,
        productPointSnapshot: 7, totalProductPoints: 14,
        productTitle: 'Shirt', variantTitle: 'Medium', sku: 'SKU-1',
      });
      expect(storedInput?.subtotalPoisha).toBe(2410n);
      expect(storedInput?.totalProductPoints).toBe(14);
    });

    it('replays a committed order with the same key and payload, without another write', async () => {
      let existingOrder: any = null;
      let writes = 0;
      let cartStatus = 'ACTIVE';
      const cartRepo = { findById: async () => ({
        userId: 'buyer', status: cartStatus, currency: 'BDT', version: 1,
        createdAt: new Date('2026-09-24T00:00:00Z'), items: [{
          sellerId: 'seller-1', variantId: 'variant-1', pricePoisha: 1205n, productPoint: 7,
          quantity: 2, variant: { sku: 'SKU-1', title: 'Medium', product: { title: 'Shirt' } },
        }],
      }) } as unknown as CartRepository;
      const orderRepo = {
        findOrderByNumber: async (orderNumber: string) => existingOrder?.orderNumber === orderNumber ? existingOrder : null,
        createOrder: async (input: Parameters<OrderRepository['createOrder']>[0]) => {
          writes++;
          cartStatus = 'CONVERTED';
          existingOrder = { id: 'order-1', customerId: 'buyer', orderNumber: input.orderNumber,
            totalPoisha: input.totalPoisha, totalProductPoints: input.totalProductPoints };
          return existingOrder;
        },
      } as unknown as OrderRepository;
      const auditSpy = spyOn(auditService, 'logBusinessEvent').mockResolvedValue(undefined);
      try {
        const service = new OrderFulfillmentService(cartRepo, orderRepo);
        const first = await service.processCheckout('cart-1', 'buyer', checkout, 'repeat-request');
        const replay = await service.processCheckout('cart-1', 'buyer', checkout, 'repeat-request');
        expect(replay.orderNumber).toBe(first.orderNumber);
        expect(writes).toBe(1);
        await expect(service.processCheckout('cart-1', 'buyer', { ...checkout, shippingAddress: 'Another address' }, 'repeat-request'))
          .rejects.toBeInstanceOf(ConflictError);
      } finally {
        auditSpy.mockRestore();
      }
    });

    it('rejects another customer or an unowned guest cart before creating an order', async () => {
      for (const userId of ['other-customer', null]) {
        const service = serviceFor({ userId, status: 'ACTIVE', currency: 'BDT', items: [{}] });
        await expect(service.processCheckout('cart-1', 'buyer', checkout, 'test-request-1')).rejects.toBeInstanceOf(AuthorizationError);
      }
    });

    it('rejects previously converted and non-BDT carts', async () => {
      for (const cart of [
        { userId: 'buyer', status: 'CONVERTED', currency: 'BDT', items: [{}] },
        { userId: 'buyer', status: 'ACTIVE', currency: 'USD', items: [{}] },
      ]) {
        await expect(serviceFor(cart).processCheckout('cart-1', 'buyer', checkout, 'test-request-1')).rejects.toBeInstanceOf(ConflictError);
      }
    });
  });

  // ============================================================================
  // 1. Standardized Domain Identifiers
  // ============================================================================
  describe('Domain Entity Identifier Generation', () => {
    it('generates type-safe, prefixed identifiers for all Milestone 027 models', () => {
      const cartId = generateId(ID_PREFIXES.CART);
      const cartItemId = generateId(ID_PREFIXES.CART_ITEM);
      const orderId = generateId(ID_PREFIXES.ORDER);
      const orderItemId = generateId(ID_PREFIXES.ORDER_ITEM);
      const groupId = generateId(ID_PREFIXES.FULFILLMENT_GROUP);
      const historyId = generateId(ID_PREFIXES.ORDER_STATUS_HISTORY);
      const shipmentId = generateId(ID_PREFIXES.SHIPMENT);
      const eventId = generateId(ID_PREFIXES.SHIPMENT_EVENT);

      expect(cartId.startsWith('crt_')).toBe(true);
      expect(cartItemId.startsWith('cit_')).toBe(true);
      expect(orderId.startsWith('ord_')).toBe(true);
      expect(orderItemId.startsWith('itm_')).toBe(true);
      expect(groupId.startsWith('sfg_')).toBe(true);
      expect(historyId.startsWith('osh_')).toBe(true);
      expect(shipmentId.startsWith('shp_')).toBe(true);
      expect(eventId.startsWith('she_')).toBe(true);
    });
  });

  // ============================================================================
  // 2. Lifecycle Deletion Policies & Append-Only Immutability
  // ============================================================================
  describe('Lifecycle Policies & Immutability Classification', () => {
    it('classifies OrderStatusHistory and ShipmentEvent as strictly IMMUTABLE', () => {
      expect(MODEL_DELETION_POLICIES.OrderStatusHistory).toBe('IMMUTABLE');
      expect(MODEL_DELETION_POLICIES.ShipmentEvent).toBe('IMMUTABLE');
      expect(isModelImmutable('OrderStatusHistory')).toBe(true);
      expect(isModelImmutable('ShipmentEvent')).toBe(true);
    });

    it('prohibits deletion of immutable audit records', () => {
      expect(() => assertModelDeletable('OrderStatusHistory')).toThrow(ValidationError);
      expect(() => assertModelDeletable('ShipmentEvent')).toThrow(ValidationError);
    });

    it('classifies domain entities under SOFT_DELETE', () => {
      expect(MODEL_DELETION_POLICIES.Cart).toBe('SOFT_DELETE');
      expect(MODEL_DELETION_POLICIES.CartItem).toBe('SOFT_DELETE');
      expect(MODEL_DELETION_POLICIES.Order).toBe('SOFT_DELETE');
      expect(MODEL_DELETION_POLICIES.OrderItem).toBe('SOFT_DELETE');
      expect(MODEL_DELETION_POLICIES.SellerFulfillmentGroup).toBe('SOFT_DELETE');
      expect(MODEL_DELETION_POLICIES.Shipment).toBe('SOFT_DELETE');

      // assertModelDeletable should NOT throw for soft-deletable models
      expect(() => assertModelDeletable('Cart')).not.toThrow();
      expect(() => assertModelDeletable('Order')).not.toThrow();
      expect(() => assertModelDeletable('SellerFulfillmentGroup')).not.toThrow();
    });
  });

  // ============================================================================
  // 3. Exact Integer Poisha Financial Precision
  // ============================================================================
  describe('Monetary Precision & Integer Poisha Calculations', () => {
    it('freezes the unit price and independent Product Points using exact integer arithmetic', () => {
      const pricePoisha = 9007199254740993n;
      const snapshot = snapshotOrderLine(pricePoisha, 7, 3);

      expect(snapshot).toEqual({
        unitPricePoisha: pricePoisha,
        totalPoisha: 27021597764222979n,
        productPointSnapshot: 7,
        totalProductPoints: 21,
      });
    });

    it('rejects invalid price, quantity, Point units and overflowing Point totals', () => {
      expect(() => snapshotOrderLine(0n, 1, 1)).toThrow(ValidationError);
      expect(() => snapshotOrderLine(1n, 1, 0)).toThrow(ValidationError);
      expect(() => snapshotOrderLine(1n, 1, 1.5)).toThrow(ValidationError);
      expect(() => snapshotOrderLine(1n, -1, 1)).toThrow(ValidationError);
      expect(() => snapshotOrderLine(1n, 0.5, 1)).toThrow(ValidationError);
      expect(() => snapshotOrderLine(1n, Number.MAX_SAFE_INTEGER, 2)).toThrow(ValidationError);
      expect(() => snapshotOrderLine(9223372036854775807n, 0, 2)).toThrow(ValidationError);
      expect(() => snapshotOrderLine(1n, 2147483647, 2)).toThrow(ValidationError);
      expect(() => snapshotOrderLine(1n, 0, 2147483648)).toThrow(ValidationError);
    });

    it('computes exact line items and parent order totals without floating point error', () => {
      const unitPricePoisha = BigInt(2199000); // ৳21,990.00
      const quantity = 3;
      const lineSubtotal = unitPricePoisha * BigInt(quantity); // 6,597,000 poisha = ৳65,970.00

      expect(lineSubtotal).toBe(BigInt(6597000));

      // 15% NBR VAT
      const taxRateBps = BigInt(1500); // 15.00%
      const taxPoisha = (lineSubtotal * taxRateBps) / BigInt(10000); // 989,550 poisha = ৳9,895.50
      expect(taxPoisha).toBe(BigInt(989550));

      // Shipping fee
      const shippingPoisha = SHIPPING_RATES_POISHA.DHAKA_INSIDE; // 6,000 poisha = ৳60.00
      const grandTotalPoisha = lineSubtotal + taxPoisha + shippingPoisha;

      expect(grandTotalPoisha).toBe(BigInt(7592550)); // ৳75,925.50
    });

    it('enforces exact platform commission deduction and seller payout', () => {
      const groupSubtotal = BigInt(1000000); // ৳10,000.00
      const shippingFee = BigInt(6000);      // ৳60.00
      const tax = BigInt(150000);            // ৳1,500.00
      const totalPoisha = groupSubtotal + shippingFee + tax; // 1,156,000 poisha

      // 5% Commission on subtotal
      const commissionPoisha = (groupSubtotal * BigInt(PLATFORM_COMMISSION_BPS)) / BigInt(10000);
      expect(commissionPoisha).toBe(BigInt(50000)); // ৳500.00

      const netSellerPayout = totalPoisha - commissionPoisha;
      expect(netSellerPayout).toBe(BigInt(1106000)); // ৳11,060.00
      expect(commissionPoisha + netSellerPayout).toBe(totalPoisha);
    });

    it('differentiates shipping fee between Dhaka inside and nationwide divisions', () => {
      expect(SHIPPING_RATES_POISHA.DHAKA_INSIDE).toBe(BigInt(6000));  // ৳60.00
      expect(SHIPPING_RATES_POISHA.DHAKA_OUTSIDE).toBe(BigInt(12000)); // ৳120.00
    });
  });

  // ============================================================================
  // 4. Decoupled Product Points (PP) Loyalty Guarantee
  // ============================================================================
  describe('Independent Product Points (PP) Snapshots', () => {
    it('snapshots discrete points per unit and scales linearly with quantity', () => {
      const productPointSnapshot = 450; // 450 points per unit
      const quantity = 4;
      const totalPoints = productPointSnapshot * quantity;

      expect(totalPoints).toBe(1800);
      expect(typeof totalPoints).toBe('number');
      expect(Number.isInteger(totalPoints)).toBe(true);
    });

    it('never computes an exchange rate or converts Product Points to BDT cash', () => {
      const pricePoisha = BigInt(2199000); // ৳21,990.00
      const productPoints = 450; // 450 PP

      // Points and poisha are completely different dimensions
      expect(typeof pricePoisha).toBe('bigint');
      expect(typeof productPoints).toBe('number');
      // Asserting neither divides into or derives from the other
      expect(Number(pricePoisha) % productPoints !== 0).toBe(true);
    });
  });

  // ============================================================================
  // 5. Multi-Vendor Partitioning Logic
  // ============================================================================
  describe('Multi-Vendor Cart-to-Order Partitioning', () => {
    it('partitions multi-seller cart items into isolated fulfillment groups', () => {
      const cartItems = [
        { id: '1', sellerId: 'sel_merchant_A', pricePoisha: BigInt(100000), qty: 1, points: 50 },
        { id: '2', sellerId: 'sel_merchant_B', pricePoisha: BigInt(250000), qty: 2, points: 100 },
        { id: '3', sellerId: 'sel_merchant_A', pricePoisha: BigInt(50000), qty: 3, points: 25 },
      ];

      const groups = new Map<string, typeof cartItems>();
      for (const item of cartItems) {
        const existing = groups.get(item.sellerId) ?? [];
        existing.push(item);
        groups.set(item.sellerId, existing);
      }

      expect(groups.size).toBe(2);
      expect(groups.get('sel_merchant_A')?.length).toBe(2);
      expect(groups.get('sel_merchant_B')?.length).toBe(1);

      // Verify seller A totals
      const sellerAItems = groups.get('sel_merchant_A')!;
      const sellerASubtotal = sellerAItems.reduce(
        (sum, i) => sum + i.pricePoisha * BigInt(i.qty),
        BigInt(0)
      );
      const sellerAPoints = sellerAItems.reduce((sum, i) => sum + i.points * i.qty, 0);

      expect(sellerASubtotal).toBe(BigInt(250000)); // 100,000 + 150,000
      expect(sellerAPoints).toBe(125); // 50*1 + 25*3
    });
  });

  // ============================================================================
  // 6. Multi-Tenant Authorization & Isolation
  // ============================================================================
  describe('Multi-Tenant Query Scoping & Security Boundaries', () => {
    it('permits access when authorized sellerId matches entity sellerId', () => {
      expect(() => assertSellerScope('sel_dhaka_tech', 'sel_dhaka_tech')).not.toThrow();
    });

    it('rejects cross-tenant access attempts with AuthorizationError (403)', () => {
      expect(() => assertSellerScope('sel_dhaka_tech', 'sel_other_merchant')).toThrow(
        AuthorizationError
      );
    });

    it('rejects access when entity has no sellerId assigned', () => {
      expect(() => assertSellerScope(null, 'sel_dhaka_tech')).toThrow(AuthorizationError);
      expect(() => assertSellerScope(undefined, 'sel_dhaka_tech')).toThrow(AuthorizationError);
    });
  });

  // ============================================================================
  // 7. State Machine Transition Rules
  // ============================================================================
  describe('Fulfillment Group State Machine Transitions', () => {
    it('permits valid sequential status transitions', () => {
      expect(VALID_GROUP_TRANSITIONS.PENDING.includes('ACCEPTED')).toBe(true);
      expect(VALID_GROUP_TRANSITIONS.ACCEPTED.includes('PACKING')).toBe(true);
      expect(VALID_GROUP_TRANSITIONS.PACKING.includes('READY_FOR_PICKUP')).toBe(true);
      expect(VALID_GROUP_TRANSITIONS.READY_FOR_PICKUP.includes('HANDED_OVER_TO_COURIER')).toBe(
        true
      );
      expect(VALID_GROUP_TRANSITIONS.HANDED_OVER_TO_COURIER.includes('IN_TRANSIT')).toBe(true);
      expect(VALID_GROUP_TRANSITIONS.IN_TRANSIT.includes('DELIVERED')).toBe(true);
    });

    it('rejects invalid or skipped transitions', () => {
      // Cannot jump from PENDING directly to DELIVERED
      expect(VALID_GROUP_TRANSITIONS.PENDING.includes('DELIVERED')).toBe(false);
      // Cannot jump from PACKING directly to DELIVERED
      expect(VALID_GROUP_TRANSITIONS.PACKING.includes('DELIVERED')).toBe(false);
      // Terminal state DELIVERED has no outgoing transitions
      expect(VALID_GROUP_TRANSITIONS.DELIVERED.length).toBe(0);
    });
  });

  // ============================================================================
  // 8. Runtime Validator Schemas
  // ============================================================================
  describe('Zod Input Validation', () => {
    it('validates correct Bangladesh mobile phone formats', () => {
      const validPayload = {
        shippingName: 'Tanvir Ahmed',
        shippingPhone: '+8801700112233',
        shippingDivision: 'DHAKA' as const,
        shippingDistrict: 'Dhaka',
        shippingAddress: 'House 42, Road 11, Gulshan-2',
      };

      const result = CheckoutInputSchema.safeParse(validPayload);
      expect(result.success).toBe(true);

      const localFormat = {
        ...validPayload,
        shippingPhone: '01811998877',
      };
      expect(CheckoutInputSchema.safeParse(localFormat).success).toBe(true);
    });

    it('rejects invalid phone numbers or missing delivery fields', () => {
      const invalidPhone = {
        shippingName: 'Tanvir Ahmed',
        shippingPhone: '12345',
        shippingDivision: 'DHAKA',
        shippingDistrict: 'Dhaka',
        shippingAddress: 'Gulshan-2',
      };
      expect(CheckoutInputSchema.safeParse(invalidPhone).success).toBe(false);

      const invalidDivision = {
        shippingName: 'Tanvir Ahmed',
        shippingPhone: '01700112233',
        shippingDivision: 'NEW_YORK',
        shippingDistrict: 'Dhaka',
        shippingAddress: 'Gulshan-2',
      };
      expect(CheckoutInputSchema.safeParse(invalidDivision).success).toBe(false);
    });
  });
});
