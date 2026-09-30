import { createHash } from 'node:crypto';
import { describe, expect, it, mock } from 'bun:test';
import { OrderTransitionService } from '@/features/orders/state-machines/order-transition.service';

const activeActor = {
  user: { findFirst: async () => ({ status: 'ACTIVE' }) },
  userRoleAssignment: { findFirst: async () => ({ id: 'admin-assignment' }) },
  seller: { findFirst: async () => ({ status: 'VERIFIED', ownerUserId: 'seller-user' }) },
};

describe('Order transition ownership', () => {
  it('coordinates a consistent item transition through the parent optimistic version', async () => {
    const parentUpdate = mock(async () => ({ count: 1 }));
    const history = mock(async () => ({}));
    const event = mock(async () => ({}));
    const tx = {
      ...activeActor,
      order: {
        findFirst: async () => ({ id: 'order-1', status: 'SHIPPED', version: 7 }),
        updateMany: parentUpdate,
      },
      orderItem: {
        findFirst: async () => ({
          id: 'item-1',
          orderId: 'order-1',
          fulfillmentGroupId: 'group-1',
          sellerId: 'seller-1',
          status: 'SHIPPED',
          version: 2,
        }),
        updateMany: async () => ({ count: 1 }),
      },
      sellerFulfillmentGroup: { findFirst: async () => ({ status: 'DELIVERED' }) },
      orderStatusHistory: { create: history },
      outboxEvent: { create: event },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    const input = {
      itemId: 'item-1',
      orderId: 'order-1',
      actorId: 'admin',
      actorRole: 'ADMIN' as const,
      nextStatus: 'DELIVERED' as const,
    };
    expect((await service.transitionOrderItemStatus(input)).newStatus).toBe('DELIVERED');
    expect(parentUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1', version: 7, deletedAt: null },
      data: { version: { increment: 1 } },
    });
    expect(history).toHaveBeenCalledTimes(1);
    expect(event).toHaveBeenCalledTimes(1);
    parentUpdate.mockImplementation(async () => ({ count: 0 }));
    await expect(service.transitionOrderItemStatus(input)).rejects.toThrow(
      'Parent order changed concurrently'
    );
  });
  it('rejects an item delivery ahead of its fulfillment group without writes', async () => {
    const update = mock();
    const tx = {
      ...activeActor,
      order: { findFirst: async () => ({ id: 'order-1', status: 'SHIPPED', version: 1 }) },
      orderItem: {
        findFirst: async () => ({
          id: 'item-1',
          orderId: 'order-1',
          fulfillmentGroupId: 'group-1',
          sellerId: 'seller-1',
          status: 'SHIPPED',
        }),
        updateMany: update,
      },
      sellerFulfillmentGroup: { findFirst: async () => ({ status: 'IN_TRANSIT' }) },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    await expect(
      service.transitionOrderItemStatus({
        itemId: 'item-1',
        orderId: 'order-1',
        actorId: 'admin',
        actorRole: 'ADMIN',
        nextStatus: 'DELIVERED',
      })
    ).rejects.toThrow('Item transition must agree with its fulfillment group state');
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects a revoked administrator grant before reading state or replaying a receipt', async () => {
    const findOrder = mock();
    const findReceipt = mock();
    const tx = {
      ...activeActor,
      userRoleAssignment: { findFirst: async () => null },
      order: { findFirst: findOrder },
      orderStatusHistory: { findUnique: findReceipt },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    await expect(
      service.transitionOrderStatus({
        orderId: 'order-1',
        actorId: 'former-admin',
        actorRole: 'ADMIN',
        nextStatus: 'CANCELLED',
        idempotencyKey: 'retry-1',
      })
    ).rejects.toThrow('Persisted administrator order-management permission required');
    expect(findOrder).not.toHaveBeenCalled();
    expect(findReceipt).not.toHaveBeenCalled();
  });
  it('rejects seller staff whose persisted order permission was revoked', async () => {
    const findGroup = mock();
    const tx = {
      ...activeActor,
      sellerStaff: {
        findFirst: async () => ({ id: 'staff-1', permissions: ['seller:catalog:manage'] }),
      },
      sellerFulfillmentGroup: { findFirst: findGroup },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    await expect(
      service.transitionFulfillmentGroupStatus({
        groupId: 'group-1',
        sellerId: 'seller-1',
        actorId: 'staff-user',
        actorRole: 'SELLER',
        nextStatus: 'PACKING',
      })
    ).rejects.toThrow('Persisted seller order-management permission required');
    expect(findGroup).not.toHaveBeenCalled();
  });
  it('replays an item result after the parent becomes terminal', async () => {
    const result = {
      success: true,
      previousStatus: 'SHIPPED',
      newStatus: 'DELIVERED',
      statusLabelEn: 'Delivered',
      statusLabelBn: 'Delivered',
      transitionedAt: '2026-09-29T00:00:00.000Z',
    };
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(['item-1', 'DELIVERED', 'ADMIN', null, null, 'order-1']))
      .digest('hex');
    const update = mock();
    const tx = {
      ...activeActor,
      order: { findFirst: async () => ({ id: 'order-1', status: 'COMPLETED' }) },
      orderItem: {
        findFirst: async () => ({ id: 'item-1', orderId: 'order-1', status: 'DELIVERED' }),
        updateMany: update,
      },
      orderStatusHistory: { findUnique: async () => ({ metadata: { fingerprint, result } }) },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    expect(
      await service.transitionOrderItemStatus({
        itemId: 'item-1',
        orderId: 'order-1',
        actorId: 'admin',
        actorRole: 'ADMIN',
        nextStatus: 'DELIVERED',
        idempotencyKey: 'delivery-1',
      })
    ).toEqual(result);
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects a suspended account before reading order state', async () => {
    const findOrder = mock();
    const tx = {
      user: { findFirst: async () => ({ status: 'SUSPENDED' }) },
      order: { findFirst: findOrder },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    await expect(
      service.transitionOrderStatus({
        orderId: 'order-1',
        actorId: 'owner',
        actorRole: 'CUSTOMER',
        nextStatus: 'CANCELLED',
      })
    ).rejects.toThrow('Active account required');
    expect(findOrder).not.toHaveBeenCalled();
  });
  it('rejects a suspended seller before reading fulfillment state', async () => {
    const findGroup = mock();
    const tx = {
      ...activeActor,
      seller: { findFirst: async () => ({ status: 'SUSPENDED' }) },
      sellerFulfillmentGroup: { findFirst: findGroup },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    await expect(
      service.transitionFulfillmentGroupStatus({
        groupId: 'group-1',
        sellerId: 'seller-1',
        actorId: 'owner',
        actorRole: 'SELLER',
        nextStatus: 'PACKING',
      })
    ).rejects.toThrow('Verified unrestricted seller required');
    expect(findGroup).not.toHaveBeenCalled();
  });
  it('bounds serialization retries and returns a controlled conflict', async () => {
    const transaction = mock(async () => {
      throw { code: 'P2034' };
    });
    const service = new OrderTransitionService();
    Object.assign(service, { db: { $transaction: transaction } });
    await expect(
      service.transitionOrderStatus({
        orderId: 'order-1',
        actorId: 'owner',
        actorRole: 'CUSTOMER',
        nextStatus: 'CANCELLED',
      })
    ).rejects.toThrow('Concurrent transition');
    expect(transaction).toHaveBeenCalledTimes(3);
  });
  it('does not retry unrelated database failures', async () => {
    const transaction = mock(async () => {
      throw new Error('connection unavailable');
    });
    const service = new OrderTransitionService();
    Object.assign(service, { db: { $transaction: transaction } });
    await expect(
      service.transitionOrderStatus({
        orderId: 'order-1',
        actorId: 'owner',
        actorRole: 'CUSTOMER',
        nextStatus: 'CANCELLED',
      })
    ).rejects.toThrow('connection unavailable');
    expect(transaction).toHaveBeenCalledTimes(1);
  });
  it('increments the parent version even when the derived status is unchanged', async () => {
    const parentUpdate = mock(async () => ({ count: 1 }));
    const tx = {
      ...activeActor,
      sellerFulfillmentGroup: {
        findFirst: async () => ({
          id: 'group-1',
          orderId: 'order-1',
          sellerId: 'seller-1',
          status: 'ACCEPTED',
          version: 1,
        }),
        updateMany: async () => ({ count: 1 }),
        findMany: async () => [{ id: 'group-1', status: 'PACKING' }],
      },
      order: {
        findFirst: async () => ({ status: 'CONFIRMED', version: 7, orderNumber: 'ORD-1' }),
        updateMany: parentUpdate,
      },
      orderStatusHistory: { create: async () => ({}) },
      orderItem: { findMany: async () => [] },
      outboxEvent: { create: async () => ({}) },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    const result = await service.transitionFulfillmentGroupStatus({
      groupId: 'group-1',
      sellerId: 'seller-1',
      actorId: 'seller-user',
      actorRole: 'SELLER',
      nextStatus: 'PACKING',
    });
    expect(result.parentOrderStatusChanged).toBe(false);
    expect(parentUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1', version: 7, deletedAt: null },
      data: { version: { increment: 1 } },
    });
    const relatedWrite = mock(async (transaction: unknown) => {
      expect(transaction).toBe(tx);
      throw new Error('Shipment write failed');
    });
    await expect(
      service.transitionFulfillmentGroupStatus(
        {
          groupId: 'group-1',
          sellerId: 'seller-1',
          actorId: 'seller-user',
          actorRole: 'SELLER',
          nextStatus: 'PACKING',
        },
        relatedWrite
      )
    ).rejects.toThrow('Shipment write failed');
    expect(relatedWrite).toHaveBeenCalledTimes(1);
    parentUpdate.mockImplementation(async () => ({ count: 0 }));
    await expect(
      service.transitionFulfillmentGroupStatus({
        groupId: 'group-1',
        sellerId: 'seller-1',
        actorId: 'seller-user',
        actorRole: 'SELLER',
        nextStatus: 'PACKING',
      })
    ).rejects.toThrow('Parent order changed concurrently');
  });
  it('replays a committed result without status or event writes', async () => {
    const result = {
      success: true,
      previousStatus: 'PROCESSING',
      newStatus: 'CANCELLED',
      statusLabelEn: 'Cancelled',
      statusLabelBn: 'Cancelled',
      transitionedAt: '2026-09-29T00:00:00.000Z',
    };
    const update = mock();
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(['order-1', 'CANCELLED', 'CUSTOMER', null, null, 'order-1']))
      .digest('hex');
    const tx = {
      ...activeActor,
      order: {
        findFirst: async () => ({ id: 'order-1', customerId: 'owner', status: 'CANCELLED' }),
        updateMany: update,
      },
      orderStatusHistory: { findUnique: async () => ({ metadata: { fingerprint, result } }) },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    expect(
      await service.transitionOrderStatus({
        orderId: 'order-1',
        actorId: 'owner',
        actorRole: 'CUSTOMER',
        nextStatus: 'CANCELLED',
        idempotencyKey: 'retry-1',
      })
    ).toEqual(result);
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects key reuse with different input before writing', async () => {
    const update = mock();
    const tx = {
      ...activeActor,
      order: {
        findFirst: async () => ({ id: 'order-1', customerId: 'owner', status: 'PROCESSING' }),
        updateMany: update,
      },
      orderStatusHistory: {
        findUnique: async () => ({ metadata: { fingerprint: 'different-request' } }),
      },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    await expect(
      service.transitionOrderStatus({
        orderId: 'order-1',
        actorId: 'owner',
        actorRole: 'CUSTOMER',
        nextStatus: 'CANCELLED',
        idempotencyKey: 'retry-1',
      })
    ).rejects.toThrow('different transition input');
    expect(update).not.toHaveBeenCalled();
  });
  it('rejects another customer inside the transaction without writing', async () => {
    const update = mock();
    const tx = {
      ...activeActor,
      order: {
        findFirst: mock(async () => ({
          id: 'order-1',
          customerId: 'owner',
          status: 'PENDING_PAYMENT',
          version: 1,
        })),
        updateMany: update,
      },
    };
    const transaction = mock(
      async (
        operation: (db: typeof tx) => Promise<unknown>,
        options?: { isolationLevel: string }
      ) => {
        expect(options?.isolationLevel).toBe('Serializable');
        return operation(tx);
      }
    );
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: {
        order: {
          findFirst: mock(async () => ({
            id: 'order-1',
            customerId: 'owner',
            status: 'PENDING_PAYMENT',
            version: 1,
          })),
        },
        $transaction: transaction,
      },
    });
    await expect(
      service.transitionOrderStatus({
        orderId: 'order-1',
        actorId: 'other',
        actorRole: 'CUSTOMER',
        nextStatus: 'CANCELLED',
      })
    ).rejects.toThrow('Order ownership required');
    expect(update).not.toHaveBeenCalled();
    expect(transaction.mock.calls[0]?.[1]).toEqual({ isolationLevel: 'Serializable' });
  });
  it('checks packaging inside the transaction before cancellation writes', async () => {
    const update = mock();
    const tx = {
      ...activeActor,
      order: {
        findFirst: mock(async () => ({
          id: 'order-1',
          customerId: 'owner',
          status: 'PROCESSING',
          version: 1,
        })),
        updateMany: update,
      },
      sellerFulfillmentGroup: { findMany: mock(async () => [{ status: 'PACKING' }]) },
    };
    const service = new OrderTransitionService();
    Object.assign(service, {
      db: { $transaction: async (operation: (db: typeof tx) => Promise<unknown>) => operation(tx) },
    });
    await expect(
      service.transitionOrderStatus({
        orderId: 'order-1',
        actorId: 'owner',
        actorRole: 'CUSTOMER',
        nextStatus: 'CANCELLED',
      })
    ).rejects.toThrow('packaging');
    expect(update).not.toHaveBeenCalled();
    expect(tx.sellerFulfillmentGroup.findMany).toHaveBeenCalled();
  });
});
