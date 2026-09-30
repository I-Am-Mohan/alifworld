import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  OrderTransitionService,
  orderTransitionService,
} from '@/features/orders/state-machines/order-transition.service';
import { customerOrderService } from '@/features/orders/services/customer-order.service';
import { ShipmentRepository } from '@/features/shipping/repositories/shipment.repository';
import { CourierDispatchService } from '@/features/shipping/services/courier-dispatch.service';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error('DATABASE_URL is required for order transition persistence tests.');

describe('Order transition PostgreSQL transactions', () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const service = new OrderTransitionService();
  Object.assign(service, { db });
  const prefix = `m142_${randomUUID()}`;
  const customerId = `${prefix}_customer`;
  const sellerId = `${prefix}_seller`;
  const categoryId = `${prefix}_category`;
  const productId = `${prefix}_product`;
  const variantId = `${prefix}_variant`;
  const orderIds: string[] = [];
  const groupIds: string[] = [];
  const shipmentIds: string[] = [];

  beforeAll(async () => {
    await db.$transaction(async (transaction) => {
      await transaction.user.create({ data: { id: customerId, status: 'ACTIVE' } });
      await transaction.seller.create({
        data: {
          id: sellerId,
          ownerUserId: customerId,
          businessName: 'Test seller',
          slug: sellerId,
          status: 'VERIFIED',
        },
      });
      await transaction.category.create({
        data: { id: categoryId, name: 'Test category', slug: categoryId },
      });
      await transaction.product.create({
        data: {
          id: productId,
          sellerId,
          categoryId,
          title: 'Test product',
          slug: productId,
          description: 'Test fixture',
          basePricePoisha: 10000n,
        },
      });
      await transaction.productVariant.create({
        data: {
          id: variantId,
          productId,
          sku: variantId,
          title: 'Test variant',
          pricePoisha: 10000n,
        },
      });
    });
  });

  afterAll(async () => {
    try {
      await db.$transaction(async (transaction) => {
        const shipments = await transaction.shipment.findMany({
          where: { fulfillmentGroupId: { in: groupIds } },
          select: { id: true },
        });
        const ownedShipmentIds = [...shipmentIds, ...shipments.map((shipment) => shipment.id)];
        await transaction.outboxEvent.deleteMany({
          where: { aggregateId: { in: [...orderIds, ...groupIds, ...ownedShipmentIds] } },
        });
        await transaction.auditLog.deleteMany({ where: { resourceId: { in: ownedShipmentIds } } });
        await transaction.order.deleteMany({ where: { id: { in: orderIds } } });
        await transaction.productVariant.deleteMany({ where: { id: variantId } });
        await transaction.product.deleteMany({ where: { id: productId } });
        await transaction.category.deleteMany({ where: { id: categoryId } });
        await transaction.seller.deleteMany({ where: { id: sellerId } });
        await transaction.user.deleteMany({ where: { id: customerId } });
      });
    } finally {
      await db.$disconnect();
    }
  });

  async function fixture(status: string, groupStatus: string, itemStatus: string, count = 1) {
    const orderId = `${prefix}_${randomUUID()}`;
    orderIds.push(orderId);
    await db.order.create({
      data: {
        id: orderId,
        orderNumber: orderId,
        customerId,
        status,
        subtotalPoisha: 10000n,
        totalPoisha: 10000n,
        shippingName: 'Test recipient',
        shippingPhone: '+8801700000000',
        shippingDivision: 'DHAKA',
        shippingDistrict: 'Dhaka',
        shippingAddress: 'Test address',
      },
    });
    const groups: string[] = [];
    for (let index = 0; index < count; index++) {
      const groupId = `${orderId}_${index}`;
      groups.push(groupId);
      groupIds.push(groupId);
      await db.sellerFulfillmentGroup.create({
        data: {
          id: groupId,
          orderId,
          sellerId,
          groupNumber: groupId,
          status: groupStatus,
          subtotalPoisha: 10000n,
          totalPoisha: 10000n,
        },
      });
      await db.orderItem.create({
        data: {
          orderId,
          fulfillmentGroupId: groupId,
          sellerId,
          variantId,
          productTitle: 'Test product',
          variantTitle: 'Test variant',
          sku: variantId,
          quantity: 1,
          unitPricePoisha: 10000n,
          totalPoisha: 10000n,
          status: itemStatus,
          productPointSnapshot: 7,
          totalProductPoints: 7,
        },
      });
    }
    return { orderId, groups };
  }

  it('rejects a customer claiming administrator authority without a stored role grant', async () => {
    const { orderId } = await fixture('PROCESSING', 'PENDING', 'PENDING');
    await expect(
      service.transitionOrderStatus({
        orderId,
        actorId: customerId,
        actorRole: 'ADMIN',
        nextStatus: 'CANCELLED',
        idempotencyKey: 'forged-admin',
      })
    ).rejects.toThrow('Persisted administrator order-management permission required');
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe(
      'PROCESSING'
    );
    expect(await db.orderStatusHistory.count({ where: { orderId } })).toBe(0);
    expect(await db.outboxEvent.count({ where: { aggregateId: orderId } })).toBe(0);
  });

  it('commits cancellation once and replays concurrent requests without duplicate events', async () => {
    const { orderId } = await fixture('PROCESSING', 'PENDING', 'PENDING');
    const input = {
      orderId,
      actorId: customerId,
      actorRole: 'CUSTOMER' as const,
      nextStatus: 'CANCELLED' as const,
      idempotencyKey: 'cancel-1',
    };
    const results = await Promise.all([
      service.transitionOrderStatus(input),
      service.transitionOrderStatus(input),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(
      await db.outboxEvent.count({ where: { aggregateId: orderId, eventType: 'order.cancelled' } })
    ).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).version).toBe(2);
    expect((await db.orderItem.findFirstOrThrow({ where: { orderId } })).status).toBe('CANCELLED');
    const originalDb = (customerOrderService as unknown as { db: PrismaClient }).db;
    Object.assign(customerOrderService, { db });
    try {
      const customerOrder = await customerOrderService.getCustomerOrder(orderId, customerId);
      expect(customerOrder.statusHistory).toHaveLength(1);
      expect(customerOrder.statusHistory[0].toStatus).toBe('CANCELLED');
      expect(customerOrder.statusHistory[0].reason).not.toBe('Idempotency receipt');
    } finally {
      Object.assign(customerOrderService, { db: originalDb });
    }
    await expect(
      service.transitionOrderStatus({ ...input, reason: 'Changed input' })
    ).rejects.toThrow('different transition input');
  });

  it('rolls back group, parent, item, history and outbox when a related write fails', async () => {
    const { orderId, groups } = await fixture('CONFIRMED', 'ACCEPTED', 'CONFIRMED');
    await expect(
      service.transitionFulfillmentGroupStatus(
        {
          groupId: groups[0],
          sellerId,
          actorId: customerId,
          actorRole: 'SELLER',
          nextStatus: 'PACKING',
          idempotencyKey: 'packing-failure',
        },
        async () => {
          throw new Error('Injected related write failure');
        }
      )
    ).rejects.toThrow('Injected related write failure');
    expect(
      (await db.sellerFulfillmentGroup.findUniqueOrThrow({ where: { id: groups[0] } })).status
    ).toBe('ACCEPTED');
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).version).toBe(1);
    expect((await db.orderItem.findFirstOrThrow({ where: { orderId } })).status).toBe('CONFIRMED');
    expect(await db.orderStatusHistory.count({ where: { orderId } })).toBe(0);
    expect(
      await db.outboxEvent.count({ where: { aggregateId: { in: [orderId, ...groups] } } })
    ).toBe(0);
  });

  it('replays equivalent nested metadata regardless of object key order', async () => {
    const { orderId } = await fixture('PROCESSING', 'PENDING', 'PENDING');
    const input = {
      orderId,
      actorId: customerId,
      actorRole: 'CUSTOMER' as const,
      nextStatus: 'CANCELLED' as const,
      idempotencyKey: 'metadata-replay',
    };
    const result = await service.transitionOrderStatus({
      ...input,
      metadata: { source: 'app', details: { first: 1, second: 2 } },
    });
    expect(
      await service.transitionOrderStatus({
        ...input,
        metadata: { details: { second: 2, first: 1 }, source: 'app' },
      })
    ).toEqual(result);
    await expect(service.transitionOrderStatus({ ...input, idempotencyKey: ' ' })).rejects.toThrow(
      'must not be empty'
    );
  });

  it('rolls back a newly created shipment and its event with a failed handover', async () => {
    const { orderId, groups } = await fixture('CONFIRMED', 'READY_FOR_PICKUP', 'PROCESSING');
    const repository = new ShipmentRepository();
    await expect(
      service.transitionFulfillmentGroupStatus(
        {
          groupId: groups[0],
          sellerId,
          actorId: 'test-system',
          actorRole: 'SYSTEM',
          nextStatus: 'HANDED_OVER_TO_COURIER',
          idempotencyKey: 'shipment-rollback',
        },
        async (transaction) => {
          await repository.createShipment(
            {
              fulfillmentGroupId: groups[0],
              sellerId,
              shipmentNumber: `${orderId}_shipment`,
              courierProvider: 'IN_HOUSE',
              status: 'LABEL_CREATED',
              recipientName: 'Test recipient',
              recipientPhone: '+8801700000000',
              deliveryAddress: 'Test address',
              division: 'DHAKA',
              district: 'Dhaka',
            },
            'Test booking',
            transaction
          );
          throw new Error('Injected booking persistence failure');
        }
      )
    ).rejects.toThrow('Injected booking persistence failure');
    expect(await db.shipment.count({ where: { fulfillmentGroupId: groups[0] } })).toBe(0);
    expect(
      (await db.sellerFulfillmentGroup.findUniqueOrThrow({ where: { id: groups[0] } })).status
    ).toBe('READY_FOR_PICKUP');
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('CONFIRMED');
    expect(await db.orderStatusHistory.count({ where: { orderId } })).toBe(0);
  });

  it('rejects an unrelated dispatcher and a simulated provider booking without writes', async () => {
    const { orderId, groups } = await fixture('CONFIRMED', 'READY_FOR_PICKUP', 'PROCESSING');
    const dispatch = new CourierDispatchService();
    let providerCalls = 0;
    Object.assign(dispatch, {
      db,
      registry: {
        getAdapter: () => ({
          isConfigured: true,
          courierName: 'Test provider',
          createConsignment: async () => {
            providerCalls++;
            return { success: true, consignmentId: 'simulated', rawResponse: { simulated: true } };
          },
        }),
      },
    });
    const input = {
      fulfillmentGroupId: groups[0],
      courierProvider: 'PATHAO' as const,
      recipientName: 'Test recipient',
      recipientPhone: '+8801700000000',
      recipientAlternativePhone: null,
      deliveryAddress: 'Test address',
      division: 'DHAKA',
      district: 'Dhaka',
      codAmountPoisha: 0,
      isPrepaid: true,
      totalWeightGrams: 100,
      itemDescription: 'Test parcel',
      itemQuantity: 1,
    };
    await expect(dispatch.createConsignment(input, 'unrelated-user')).rejects.toThrow(
      'Active dispatch account required'
    );
    expect(providerCalls).toBe(0);
    await expect(dispatch.createConsignment(input, customerId)).rejects.toThrow(
      'did not confirm a real booking'
    );
    expect(providerCalls).toBe(1);
    expect(await db.shipment.count({ where: { fulfillmentGroupId: groups[0] } })).toBe(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('CONFIRMED');
  });

  it('aggregates simultaneous sibling handovers without losing the fully shipped state', async () => {
    const { orderId, groups } = await fixture('CONFIRMED', 'READY_FOR_PICKUP', 'PROCESSING', 2);
    await Promise.all(
      groups.map((groupId) =>
        service.transitionFulfillmentGroupStatus({
          groupId,
          sellerId,
          actorId: 'test-system',
          actorRole: 'SYSTEM',
          nextStatus: 'HANDED_OVER_TO_COURIER',
          idempotencyKey: `handover:${groupId}`,
        })
      )
    );
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('SHIPPED');
    expect(order.version).toBe(3);
    expect(await db.orderItem.count({ where: { orderId, status: 'SHIPPED' } })).toBe(2);
    expect(order.totalPoisha).toBe(10000n);
    expect(order.pointsReleased).toBe(false);
  });

  it('persists an in-house booking, OTP event, handover and outbox together', async () => {
    const { orderId, groups } = await fixture('CONFIRMED', 'READY_FOR_PICKUP', 'PROCESSING');
    const dispatch = new CourierDispatchService();
    const repository = new ShipmentRepository();
    Object.assign(repository, { db });
    Object.assign(dispatch, { db, repo: repository });
    const originalDb = (orderTransitionService as unknown as { db: PrismaClient }).db;
    Object.assign(orderTransitionService, { db });
    try {
      const result = await dispatch.createConsignment(
        {
          fulfillmentGroupId: groups[0],
          courierProvider: 'IN_HOUSE',
          recipientName: 'Test recipient',
          recipientPhone: '+8801700000000',
          recipientAlternativePhone: null,
          deliveryAddress: 'Test address',
          division: 'DHAKA',
          district: 'Dhaka',
          codAmountPoisha: 0,
          isPrepaid: true,
          totalWeightGrams: 100,
          itemDescription: 'Test parcel',
          itemQuantity: 1,
        },
        customerId
      );
      expect(result.success).toBe(true);
      const shipment = await db.shipment.findFirstOrThrow({
        where: { fulfillmentGroupId: groups[0] },
        include: { events: true },
      });
      shipmentIds.push(shipment.id);
      expect(shipment.events).toHaveLength(2);
      expect(
        (await db.sellerFulfillmentGroup.findUniqueOrThrow({ where: { id: groups[0] } })).status
      ).toBe('HANDED_OVER_TO_COURIER');
      expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('SHIPPED');
      expect(
        await db.outboxEvent.count({
          where: { aggregateId: shipment.id, eventType: 'shipment.dispatched' },
        })
      ).toBe(1);
      expect(
        await db.auditLog.count({
          where: { resourceId: shipment.id, action: 'LOGISTICS_SHIPMENT_DISPATCHED' },
        })
      ).toBe(1);
      const tracking = await dispatch.trackShipment(shipment.shipmentNumber);
      expect(tracking.events.every((event) => event.carrierPayload === null)).toBe(true);
      expect(JSON.stringify(tracking)).not.toContain('otpCode');
    } finally {
      Object.assign(orderTransitionService, { db: originalDb });
    }
  });

  it('does not allow cancellation and packing to both commit', async () => {
    const { orderId, groups } = await fixture('PROCESSING', 'ACCEPTED', 'CONFIRMED');
    const results = await Promise.allSettled([
      service.transitionOrderStatus({
        orderId,
        actorId: customerId,
        actorRole: 'CUSTOMER',
        nextStatus: 'CANCELLED',
        idempotencyKey: 'cancel-race',
      }),
      service.transitionFulfillmentGroupStatus({
        groupId: groups[0],
        sellerId,
        actorId: customerId,
        actorRole: 'SELLER',
        nextStatus: 'PACKING',
        idempotencyKey: 'pack-race',
      }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    const group = await db.sellerFulfillmentGroup.findUniqueOrThrow({ where: { id: groups[0] } });
    expect(
      order.status === 'CANCELLED' ? group.status === 'CANCELLED' : group.status === 'PACKING'
    ).toBe(true);
  });

  it('rejects an unconfigured webhook before parsing or reading shipment state', async () => {
    const dispatch = new CourierDispatchService();
    let parsed = false;
    Object.assign(dispatch, {
      registry: {
        getAdapter: () => ({
          parseWebhook: async () => {
            parsed = true;
          },
        }),
      },
    });
    await expect(
      dispatch.handleCourierWebhook('UNCONFIGURED_TEST_PROVIDER', {}, '{}')
    ).rejects.toThrow('verification is not configured');
    expect(parsed).toBe(false);
  });
});
