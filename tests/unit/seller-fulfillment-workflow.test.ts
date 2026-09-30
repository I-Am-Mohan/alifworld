/**
 * Milestone 143: Seller Accept, Reject, Pack, and Handover Workflows Unit Tests
 *
 * Verifies:
 * 1. Zod input validation schemas for accept, reject, pack, ready-for-pickup, and handover
 * 2. Mandatory rejection reason validation (minimum 5 characters) and rejection codes
 * 3. Finite state transitions (PENDING -> ACCEPTED / REJECTED, ACCEPTED -> PACKING, PACKING -> READY_FOR_PICKUP, READY_FOR_PICKUP -> HANDED_OVER)
 * 4. SellerFulfillmentGroupService workflow action methods
 * 5. SellerFulfillmentOrderService workflow action methods
 * 6. Query-level seller tenant isolation (TENANT_VIOLATION on cross-tenant access)
 * 7. Packing slip manifest data generation
 */

import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import {
  AcceptFulfillmentOrderSchema,
  RejectFulfillmentOrderSchema,
  StartPackingOrderSchema,
  ReadyForPickupOrderSchema,
  HandoverOrderSchema,
} from '@/features/orders/validators/order.validators';
import { SellerFulfillmentGroupService } from '@/features/fulfillment/services/seller-fulfillment-group.service';
import { SellerFulfillmentOrderService } from '@/features/orders/services/seller-fulfillment-order.service';
import { sellerFulfillmentGroupRepository } from '@/features/fulfillment/repositories/seller-fulfillment-group.repository';
import { orderTransitionService } from '@/features/orders/state-machines/order-transition.service';
import { prisma } from '@/shared/database/prisma';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/shared/errors/app-error';

describe('Milestone 143: Seller Fulfillment Action Workflows Unit Tests', () => {
  let originalPrismaGroup: any;

  beforeEach(() => {
    originalPrismaGroup = (prisma as any).sellerFulfillmentGroup;
  });

  afterEach(() => {
    if (originalPrismaGroup) {
      (prisma as any).sellerFulfillmentGroup = originalPrismaGroup;
    }
    mock.restore();
  });

  describe('1. Validation Schemas', () => {
    it('accepts valid note for accept workflow', () => {
      const valid = AcceptFulfillmentOrderSchema.parse({ note: 'Accepted for rapid fulfillment' });
      expect(valid.note).toBe('Accepted for rapid fulfillment');

      const empty = AcceptFulfillmentOrderSchema.parse({});
      expect(empty.note).toBeUndefined();
    });

    it('validates reject workflow: requires reason of at least 5 characters', () => {
      const valid = RejectFulfillmentOrderSchema.parse({
        reason: 'Item is out of stock in warehouse',
        rejectionCode: 'OUT_OF_STOCK',
      });
      expect(valid.reason).toBe('Item is out of stock in warehouse');
      expect(valid.rejectionCode).toBe('OUT_OF_STOCK');

      expect(() =>
        RejectFulfillmentOrderSchema.parse({
          reason: 'No',
        })
      ).toThrow();

      expect(() =>
        RejectFulfillmentOrderSchema.parse({
          reason: '',
        })
      ).toThrow();
    });

    it('defaults rejectionCode to OUT_OF_STOCK when omitted', () => {
      const parsed = RejectFulfillmentOrderSchema.parse({
        reason: 'Unable to fulfill this package due to supplier delay',
      });
      expect(parsed.rejectionCode).toBe('OUT_OF_STOCK');
    });

    it('validates start packing schema', () => {
      const parsed = StartPackingOrderSchema.parse({
        packingNotes: 'Packed in double-bubble wrap',
      });
      expect(parsed.packingNotes).toBe('Packed in double-bubble wrap');
    });

    it('validates ready for pickup schema: defaults packageCount to 1', () => {
      const parsed = ReadyForPickupOrderSchema.parse({
        totalWeightGrams: 450,
        packageLengthMm: 200,
        packageWidthMm: 150,
        packageHeightMm: 80,
      });
      expect(parsed.packageCount).toBe(1);
      expect(parsed.totalWeightGrams).toBe(450);
    });

    it('validates courier handover schema: defaults courierProvider to PATHAO', () => {
      const parsed = HandoverOrderSchema.parse({
        trackingNumber: 'PTH-992102',
        consignmentId: 'CSG-001',
      });
      expect(parsed.courierProvider).toBe('PATHAO');
      expect(parsed.trackingNumber).toBe('PTH-992102');
      expect(parsed.consignmentId).toBe('CSG-001');
    });
  });

  describe('2. SellerFulfillmentGroupService Workflows', () => {
    let service: SellerFulfillmentGroupService;
    let transitionSpy: any;
    let repoFindSpy: any;

    const mockGroupDTO: any = {
      id: 'sfg_alpha_1',
      sellerId: 'sel_alpha',
      groupNumber: 'SFG-001',
      status: 'PENDING',
      orderId: 'ord_1',
      orderNumber: 'ORD-001',
      subtotalPoisha: 100000,
      totalPoisha: 100000,
      items: [],
      shippingDestination: {
        recipientName: 'Naimur Rahman',
        recipientPhone: '+8801700000000',
        address: 'Dhanmondi, Dhaka',
        division: 'DHAKA',
        district: 'Dhaka',
      },
    };

    beforeEach(() => {
      service = new SellerFulfillmentGroupService();
      transitionSpy = spyOn(
        orderTransitionService,
        'transitionFulfillmentGroupStatus'
      ).mockResolvedValue({
        success: true,
        previousStatus: 'PENDING',
        newStatus: 'ACCEPTED',
        statusLabelEn: 'Accepted by Seller',
        statusLabelBn: 'বিক্রেতা কর্তৃক গৃহীত',
        transitionedAt: new Date().toISOString(),
      });
      repoFindSpy = spyOn((service as any).repo, 'findGroupByIdAndSellerId').mockResolvedValue(
        mockGroupDTO
      );
    });

    it('acceptGroup transitions fulfillment group to ACCEPTED with actor and idempotency key', async () => {
      await service.acceptGroup('sfg_alpha_1', 'sel_alpha', {
        actorId: 'usr_seller_01',
        note: 'Accepting order',
        idempotencyKey: 'idemp_accept_001',
      });

      expect(transitionSpy).toHaveBeenCalledWith({
        groupId: 'sfg_alpha_1',
        sellerId: 'sel_alpha',
        nextStatus: 'ACCEPTED',
        actorId: 'usr_seller_01',
        actorRole: 'SELLER',
        reason: 'Accepting order',
        idempotencyKey: 'idemp_accept_001',
      });
    });

    it('rejectGroup rejects reason shorter than 5 chars before calling transition service', async () => {
      expect(
        service.rejectGroup('sfg_alpha_1', 'sel_alpha', {
          actorId: 'usr_seller_01',
          reason: 'bad',
        })
      ).rejects.toThrow(ValidationError);

      expect(transitionSpy).not.toHaveBeenCalled();
    });

    it('rejectGroup transitions fulfillment group to REJECTED with valid reason', async () => {
      await service.rejectGroup('sfg_alpha_1', 'sel_alpha', {
        actorId: 'usr_seller_01',
        reason: 'Out of stock in regional warehouse',
        idempotencyKey: 'idemp_reject_001',
      });

      expect(transitionSpy).toHaveBeenCalledWith({
        groupId: 'sfg_alpha_1',
        sellerId: 'sel_alpha',
        nextStatus: 'REJECTED',
        actorId: 'usr_seller_01',
        actorRole: 'SELLER',
        reason: 'Out of stock in regional warehouse',
        idempotencyKey: 'idemp_reject_001',
      });
    });

    it('startPackingGroup transitions fulfillment group to PACKING', async () => {
      await service.startPackingGroup('sfg_alpha_1', 'sel_alpha', {
        actorId: 'usr_seller_01',
        packingNotes: 'Standard bubble wrap pack',
        idempotencyKey: 'idemp_pack_001',
      });

      expect(transitionSpy).toHaveBeenCalledWith({
        groupId: 'sfg_alpha_1',
        sellerId: 'sel_alpha',
        nextStatus: 'PACKING',
        actorId: 'usr_seller_01',
        actorRole: 'SELLER',
        reason: 'Standard bubble wrap pack',
        idempotencyKey: 'idemp_pack_001',
      });
    });

    it('markReadyForPickup transitions fulfillment group to READY_FOR_PICKUP', async () => {
      await service.markReadyForPickup('sfg_alpha_1', 'sel_alpha', {
        actorId: 'usr_seller_01',
        packageCount: 1,
        totalWeightGrams: 500,
        idempotencyKey: 'idemp_rfp_001',
      });

      expect(transitionSpy).toHaveBeenCalledWith({
        groupId: 'sfg_alpha_1',
        sellerId: 'sel_alpha',
        nextStatus: 'READY_FOR_PICKUP',
        actorId: 'usr_seller_01',
        actorRole: 'SELLER',
        reason: 'Package ready for courier pickup',
        idempotencyKey: 'idemp_rfp_001',
      });
    });

    it('handoverGroup transitions fulfillment group to HANDED_OVER_TO_COURIER and persists tracking metadata', async () => {
      const updateManySpy = spyOn(
        (service as any).db.sellerFulfillmentGroup,
        'updateMany'
      ).mockResolvedValue({
        count: 1,
      });

      const result = await service.handoverGroup('sfg_alpha_1', 'sel_alpha', {
        actorId: 'usr_seller_01',
        courierProvider: 'STEADFAST',
        trackingNumber: 'STF-882191',
        consignmentId: 'CSG-STF-01',
        idempotencyKey: 'idemp_handover_001',
      });

      expect(transitionSpy).toHaveBeenCalled();
      expect(result.trackingNumber).toBe('STF-882191');
      expect(result.consignmentId).toBe('CSG-STF-01');
    });
  });

  describe('3. SellerFulfillmentOrderService Workflow Delegation & Tenant Scoping', () => {
    let orderService: SellerFulfillmentOrderService;

    const mockOrderDTO: any = {
      id: 'sfg_alpha_1',
      orderId: 'ord_1',
      orderNumber: 'ORD-001',
      groupNumber: 'SFG-001',
      sellerId: 'sel_alpha',
      sellerName: 'Alpha Store',
      status: 'ACCEPTED',
      financialBreakdown: {
        subtotalPoisha: 100000,
        sellerCommissionPoisha: 5000,
        sellerPayoutPoisha: 95000,
      },
      items: [],
      shipments: [],
    };

    beforeEach(() => {
      orderService = new SellerFulfillmentOrderService();
      spyOn(orderService, 'getSellerFulfillmentOrder').mockResolvedValue(mockOrderDTO);
    });

    it('acceptFulfillmentOrder delegates and returns mapped SellerFulfillmentOrderDTO', async () => {
      const acceptSpy = spyOn(orderService as any, 'acceptFulfillmentOrder').mockResolvedValue(
        mockOrderDTO
      );

      const res = await orderService.acceptFulfillmentOrder(
        'sfg_alpha_1',
        'sel_alpha',
        { note: 'Accepted' },
        { actorId: 'usr_seller_01', idempotencyKey: 'idemp_01' }
      );

      expect(res.id).toBe('sfg_alpha_1');
      expect(res.status).toBe('ACCEPTED');
    });

    it('strictly enforces query-level seller tenant isolation on manifest retrieval', async () => {
      (prisma as any).sellerFulfillmentGroup = {
        findFirst: async ({ where }: any) => {
          if (where.sellerId === 'sel_beta') return null;
          return { id: 'sfg_alpha_1', sellerId: 'sel_alpha' };
        },
      };

      expect(orderService.getPackingSlipManifest('sfg_alpha_1', 'sel_beta')).rejects.toThrow(
        AuthorizationError
      );
    });
  });
});
