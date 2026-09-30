/**
 * Order & Fulfillment Transition Service
 *
 * Orchestrates status transitions through the explicit state machines with:
 * 1. Guard validation (state machine + actor role permissions)
 * 2. Optimistic concurrency control (version field)
 * 3. Append-only status history (OrderStatusHistory)
 * 4. Transactional outbox event emission
 * 5. Audit logging with actor attribution
 * 6. Parent order status auto-derivation from child fulfillment groups
 *
 * Invariant: All transitions MUST go through this service. Direct DB status updates are prohibited.
 * Invariant: BDT monetary values strictly in integer minor units (poisha).
 */

import { createHash } from 'node:crypto';
import { prisma } from '@/shared/database/prisma';
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '@/shared/errors/app-error';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  type OrderStatus,
  type FulfillmentGroupStatus,
  type OrderItemStatus,
  type ActorRole,
  validateOrderTransition,
  validateFulfillmentGroupTransition,
  validateOrderItemTransition,
  deriveOrderStatusFromFulfillmentGroups,
  ORDER_STATUS_LABELS,
  FULFILLMENT_GROUP_STATUS_LABELS,
  ORDER_ITEM_STATUS_LABELS,
  ORDER_CUSTOMER_CANCELLABLE_STATES,
} from './order-state-machine';

export interface TransitionOrderInput {
  idempotencyKey?: string;
  orderId: string;
  nextStatus: OrderStatus;
  actorId: string;
  actorRole: ActorRole;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionFulfillmentGroupInput {
  idempotencyKey?: string;
  groupId: string;
  sellerId: string;
  nextStatus: FulfillmentGroupStatus;
  actorId: string;
  actorRole: ActorRole;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionOrderItemInput {
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  itemId: string;
  orderId: string;
  nextStatus: OrderItemStatus;
  actorId: string;
  actorRole: ActorRole;
  reason?: string;
}

export interface TransitionResult {
  success: boolean;
  previousStatus: string;
  newStatus: string;
  statusLabelEn: string;
  statusLabelBn: string;
  transitionedAt: string;
  parentOrderStatusChanged?: boolean;
  derivedOrderStatus?: string;
}

export class OrderTransitionService {
  private db = prisma;

  private async assertActiveActor(
    tx: any,
    actorId: string,
    actorRole: ActorRole,
    sellerId?: string
  ) {
    if (actorRole === 'SYSTEM') return;
    const user = await tx.user.findFirst({
      where: { id: actorId, deletedAt: null },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') throw new AuthorizationError('Active account required.');
    if (actorRole === 'ADMIN') {
      const assignment = await tx.userRoleAssignment.findFirst({
        where: {
          userId: actorId,
          deletedAt: null,
          role: {
            deletedAt: null,
            OR: [
              { code: 'SUPER_ADMIN' },
              {
                code: 'ADMIN',
                rolePermissions: {
                  some: {
                    deletedAt: null,
                    permission: { deletedAt: null, code: 'orders:manage' },
                  },
                },
              },
            ],
          },
        },
        select: { id: true },
      });
      if (!assignment)
        throw new AuthorizationError(
          'Persisted administrator order-management permission required.'
        );
    }
    if (actorRole === 'SELLER') {
      const seller = await tx.seller.findFirst({
        where: { id: sellerId, deletedAt: null },
        select: { status: true, ownerUserId: true },
      });
      if (!seller || seller.status !== 'VERIFIED')
        throw new AuthorizationError('Verified unrestricted seller required.');
      if (seller.ownerUserId !== actorId) {
        const staff = await tx.sellerStaff.findFirst({
          where: { sellerId, userId: actorId, deletedAt: null },
          select: { id: true, permissions: true },
        });
        if (!staff) throw new AuthorizationError('Seller membership required.');
        if (
          !staff.permissions.some((permission: string) =>
            ['orders:manage', 'seller:orders:manage'].includes(permission)
          )
        ) {
          throw new AuthorizationError('Persisted seller order-management permission required.');
        }
      }
    }
  }

  private async runTransition<T>(operation: (tx: any) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await (this.db as any).$transaction(operation, { isolationLevel: 'Serializable' });
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2034') throw error;
        if (attempt === 2)
          throw new ConflictError('Concurrent transition; retry with the same idempotency key.');
      }
    }
    throw new ConflictError('Transition retry limit reached.');
  }

  private transitionReceipt(
    input: TransitionOrderInput | TransitionFulfillmentGroupInput | TransitionOrderItemInput,
    targetId: string
  ) {
    if (input.idempotencyKey === undefined) return null;
    if (!input.idempotencyKey.trim())
      throw new ValidationError('Idempotency key must not be empty.');
    if (input.idempotencyKey.length > 200)
      throw new ValidationError('Idempotency key must not exceed 200 characters.');
    const digest = (value: unknown) =>
      createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const canonicalize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(canonicalize);
      if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value)
            .sort(([first], [second]) => first.localeCompare(second))
            .map(([key, entry]) => [key, canonicalize(entry)])
        );
      }
      return value;
    };
    return {
      id: `osh_${digest([targetId, input.actorId, input.idempotencyKey])}`,
      fingerprint: digest([
        targetId,
        input.nextStatus,
        input.actorRole,
        input.reason || null,
        canonicalize(input.metadata || null),
        'sellerId' in input ? input.sellerId : input.orderId,
      ]),
    };
  }

  private async replay(
    tx: any,
    receipt: { id: string; fingerprint: string } | null
  ): Promise<TransitionResult | null> {
    if (!receipt) return null;
    const history = await tx.orderStatusHistory.findUnique({ where: { id: receipt.id } });
    if (!history) return null;
    if (history.metadata?.fingerprint !== receipt.fingerprint) {
      throw new ConflictError('Idempotency key reused with different transition input.');
    }
    return history.metadata.result;
  }

  private async saveReceipt(
    tx: any,
    receipt: { id: string; fingerprint: string } | null,
    input: TransitionOrderInput | TransitionFulfillmentGroupInput | TransitionOrderItemInput,
    orderId: string,
    result: TransitionResult
  ) {
    if (!receipt) return;
    await tx.orderStatusHistory.create({
      data: {
        id: receipt.id,
        orderId,
        fromStatus: result.previousStatus,
        toStatus: result.newStatus,
        actorId: input.actorId,
        actorRole: input.actorRole,
        reason: 'Idempotency receipt',
        metadata: { kind: 'transition_receipt', fingerprint: receipt.fingerprint, result },
      },
    });
  }

  // ─── Parent Order Transitions ───

  /**
   * Transitions a parent order status through the state machine.
   */
  public async transitionOrderStatus(input: TransitionOrderInput): Promise<TransitionResult> {
    const { orderId, nextStatus, actorId, actorRole, reason, metadata } = input;

    return this.runTransition(async (tx: any) => {
      await this.assertActiveActor(tx, actorId, actorRole);
      // 1. Fetch current order
      const order = await this.findOrder(orderId, tx);

      if (actorRole === 'CUSTOMER' && order.customerId !== actorId) {
        throw new AuthorizationError('Order ownership required.');
      }

      const receipt = this.transitionReceipt(input, orderId);
      const replay = await this.replay(tx, receipt);
      if (replay) return replay;

      if (nextStatus === 'COMPLETED' || nextStatus === 'REFUNDED') {
        throw new ConflictError(
          'Completion and refund require their dedicated verified workflows.'
        );
      }

      const currentStatus = order.status as OrderStatus;

      // 2. Validate state machine transition
      const validation = validateOrderTransition(currentStatus, nextStatus, actorRole);
      if (!validation.valid) {
        if (validation.errorCode === 'ACTOR_NOT_PERMITTED') {
          throw new AuthorizationError(validation.errorMessageEn!, {
            code: validation.errorCode,
          });
        }
        throw new ConflictError(validation.errorMessageEn!, {
          code: validation.errorCode,
          currentStatus,
          requestedStatus: nextStatus,
        });
      }

      // 3. Customer cancellation guard: check fulfillment group statuses
      if (nextStatus === 'CANCELLED') {
        if (actorRole === 'CUSTOMER' && !ORDER_CUSTOMER_CANCELLABLE_STATES.has(currentStatus)) {
          throw new ValidationError(
            'Order has progressed beyond the self-service cancellation window.'
          );
        }

        const groups = await tx.sellerFulfillmentGroup.findMany({
          where: { orderId, deletedAt: null },
          select: { status: true },
        });
        const allPendingOrAccepted = groups.every((group: any) =>
          ['PENDING', 'ACCEPTED', 'CANCELLED', 'REJECTED'].includes(group.status)
        );
        if (!allPendingOrAccepted) {
          throw new ValidationError(
            'Order cannot be cancelled as merchant packaging or courier dispatch is already underway.'
          );
        }
      }

      const transitionedAt = new Date();

      // 4. Execute transactional update
      // Update order status with optimistic concurrency
      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          version: order.version,
          deletedAt: null,
        },
        data: {
          status: nextStatus,
          version: { increment: 1 },
          ...(nextStatus === 'CANCELLED'
            ? {
                cancelReason: reason || 'Order cancelled',
                cancelledAt: transitionedAt,
              }
            : {}),
          ...(nextStatus === 'CONFIRMED' ? { confirmedAt: transitionedAt } : {}),
        },
      });

      if (updated.count === 0) {
        throw new ConflictError('Order was modified by another process. Please retry.', {
          code: 'OPTIMISTIC_LOCK_FAILURE',
        });
      }

      // Cancel pending fulfillment groups if order is cancelled
      if (nextStatus === 'CANCELLED') {
        const cancelledGroups = await tx.sellerFulfillmentGroup.findMany({
          where: { orderId, status: { in: ['PENDING', 'ACCEPTED'] }, deletedAt: null },
          select: { id: true, status: true },
        });
        await tx.sellerFulfillmentGroup.updateMany({
          where: {
            orderId,
            status: { in: ['PENDING', 'ACCEPTED'] },
            deletedAt: null,
          },
          data: {
            status: 'CANCELLED',
            version: { increment: 1 },
          },
        });
        for (const group of cancelledGroups) {
          await tx.orderStatusHistory.create({
            data: {
              id: generatePrefixedId(ENTITY_PREFIXES.ORDER_STATUS_HISTORY),
              orderId,
              fromStatus: group.status,
              toStatus: 'CANCELLED',
              actorId,
              actorRole,
              reason: reason || 'Parent order cancelled',
              metadata: { fulfillmentGroupId: group.id },
            },
          });
          await tx.outboxEvent.create({
            data: {
              id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
              eventType: 'fulfillment_group.cancelled',
              aggregateType: 'SELLER_FULFILLMENT_GROUP',
              aggregateId: group.id,
              payload: {
                orderId,
                groupId: group.id,
                previousStatus: group.status,
                newStatus: 'CANCELLED',
                actorId,
                actorRole,
              },
            },
          });
        }
        await tx.orderItem.updateMany({
          where: {
            orderId,
            deletedAt: null,
            status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] },
          },
          data: { status: 'CANCELLED', version: { increment: 1 } },
        });
      }

      // Append to order status history
      await tx.orderStatusHistory.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.ORDER_STATUS_HISTORY),
          orderId,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          actorId,
          actorRole,
          reason: reason || `Order status changed from ${currentStatus} to ${nextStatus}`,
          metadata: metadata || {},
        },
      });

      // Emit outbox event
      await tx.outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType: `order.${nextStatus.toLowerCase()}`,
          aggregateType: 'ORDER',
          aggregateId: orderId,
          payload: {
            orderId,
            orderNumber: order.orderNumber,
            previousStatus: currentStatus,
            newStatus: nextStatus,
            actorId,
            actorRole,
            reason: reason || null,
            transitionedAt: transitionedAt.toISOString(),
          },
        },
      });
      const labels = ORDER_STATUS_LABELS[nextStatus];

      const result: TransitionResult = {
        success: true,
        previousStatus: currentStatus,
        newStatus: nextStatus,
        statusLabelEn: labels.en,
        statusLabelBn: labels.bn,
        transitionedAt: transitionedAt.toISOString(),
      };
      await this.saveReceipt(tx, receipt, input, orderId, result);
      return result;
    });
  }

  // ─── Fulfillment Group Transitions ───

  /**
   * Transitions a seller fulfillment group through the state machine.
   * After successful transition, derives and updates the parent order status.
   */
  public async transitionFulfillmentGroupStatus(
    input: TransitionFulfillmentGroupInput,
    persistRelatedState?: (tx: any) => Promise<unknown>
  ): Promise<TransitionResult> {
    const { groupId, sellerId, nextStatus, actorId, actorRole, reason, metadata } = input;

    return this.runTransition(async (tx: any) => {
      await this.assertActiveActor(tx, actorId, actorRole, sellerId);
      // 1. Fetch group with strict seller scoping
      const group = await this.findFulfillmentGroup(groupId, sellerId, tx);
      const receipt = this.transitionReceipt(input, groupId);
      const replay = await this.replay(tx, receipt);
      if (replay) return replay;
      const parentOrder = await tx.order.findFirst({
        where: { id: group.orderId, deletedAt: null },
        select: { status: true, version: true, orderNumber: true },
      });
      if (!parentOrder) throw new NotFoundError('Parent order not found.');
      if (['PENDING_PAYMENT', 'CANCELLED', 'COMPLETED', 'REFUNDED'].includes(parentOrder.status)) {
        throw new ConflictError('Parent order does not permit fulfillment.');
      }

      const currentStatus = group.status as FulfillmentGroupStatus;

      // 2. Validate state machine transition
      const validation = validateFulfillmentGroupTransition(currentStatus, nextStatus, actorRole);
      if (!validation.valid) {
        if (validation.errorCode === 'ACTOR_NOT_PERMITTED') {
          throw new AuthorizationError(validation.errorMessageEn!, {
            code: validation.errorCode,
          });
        }
        throw new ConflictError(validation.errorMessageEn!, {
          code: validation.errorCode,
          currentStatus,
          requestedStatus: nextStatus,
        });
      }

      const transitionedAt = new Date();

      let parentOrderStatusChanged = false;
      let derivedOrderStatus: string | undefined;

      // 3. Execute transactional update
      // Update fulfillment group with optimistic concurrency
      const updated = await tx.sellerFulfillmentGroup.updateMany({
        where: {
          id: groupId,
          sellerId,
          version: group.version,
          deletedAt: null,
        },
        data: {
          status: nextStatus,
          version: { increment: 1 },
          ...(nextStatus === 'DELIVERED' ? { deliveredAt: transitionedAt } : {}),
        },
      });

      if (updated.count === 0) {
        throw new ConflictError(
          'Fulfillment group was modified by another process. Please retry.',
          { code: 'OPTIMISTIC_LOCK_FAILURE' }
        );
      }

      // Append to order status history
      await tx.orderStatusHistory.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.ORDER_STATUS_HISTORY),
          orderId: group.orderId,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          actorId,
          actorRole,
          reason:
            reason || `Fulfillment group ${group.groupNumber} status changed to ${nextStatus}`,
          metadata: {
            ...(metadata || {}),
            fulfillmentGroupId: groupId,
            groupNumber: group.groupNumber,
          },
        },
      });

      // Emit outbox event for fulfillment group
      await tx.outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType: `fulfillment_group.${nextStatus.toLowerCase()}`,
          aggregateType: 'SELLER_FULFILLMENT_GROUP',
          aggregateId: groupId,
          payload: {
            groupId,
            groupNumber: group.groupNumber,
            orderId: group.orderId,
            sellerId,
            previousStatus: currentStatus,
            newStatus: nextStatus,
            actorId,
            actorRole,
            reason: reason || null,
            transitionedAt: transitionedAt.toISOString(),
          },
        },
      });

      // 4. Derive parent order status from all fulfillment groups
      const itemStatus: Partial<Record<FulfillmentGroupStatus, OrderItemStatus>> = {
        ACCEPTED: 'CONFIRMED',
        PACKING: 'PROCESSING',
        HANDED_OVER_TO_COURIER: 'SHIPPED',
        DELIVERED: 'DELIVERED',
        CANCELLED: 'CANCELLED',
        REJECTED: 'CANCELLED',
      };
      const nextItemStatus = itemStatus[nextStatus];
      if (nextItemStatus) {
        const items = await tx.orderItem.findMany({
          where: { fulfillmentGroupId: groupId, sellerId, deletedAt: null },
        });
        for (const item of items) {
          if (item.status === nextItemStatus) continue;
          const itemValidation = validateOrderItemTransition(item.status, nextItemStatus);
          if (!itemValidation.valid)
            throw new ConflictError('Item state is inconsistent with fulfillment transition.');
          await tx.orderItem.update({
            where: { id: item.id },
            data: { status: nextItemStatus, version: { increment: 1 } },
          });
        }
      }
      const allGroups = await tx.sellerFulfillmentGroup.findMany({
        where: { orderId: group.orderId, deletedAt: null },
        select: { id: true, status: true },
      });

      // Apply the in-flight transition to get the effective statuses
      const effectiveStatuses = allGroups.map((g: any) =>
        g.id === groupId ? nextStatus : g.status
      ) as FulfillmentGroupStatus[];

      if (parentOrder) {
        const newOrderStatus = deriveOrderStatusFromFulfillmentGroups(
          effectiveStatuses,
          parentOrder.status as OrderStatus
        );

        if (newOrderStatus && newOrderStatus !== parentOrder.status) {
          // Auto-transition parent order
          const parentUpdated = await tx.order.updateMany({
            where: {
              id: group.orderId,
              version: parentOrder.version,
              deletedAt: null,
            },
            data: {
              status: newOrderStatus,
              version: { increment: 1 },
              ...(newOrderStatus === 'CANCELLED' ? { cancelledAt: transitionedAt } : {}),
            },
          });

          if (parentUpdated.count !== 1) {
            throw new ConflictError('Parent order changed concurrently. Please retry.');
          }

          // Record parent order transition in history
          await tx.orderStatusHistory.create({
            data: {
              id: generatePrefixedId(ENTITY_PREFIXES.ORDER_STATUS_HISTORY),
              orderId: group.orderId,
              fromStatus: parentOrder.status,
              toStatus: newOrderStatus,
              actorId: 'SYSTEM',
              actorRole: 'SYSTEM',
              reason: `Auto-derived from fulfillment group statuses: [${effectiveStatuses.join(', ')}]`,
              metadata: {
                derivedFrom: 'fulfillment_groups',
                triggeringGroupId: groupId,
                groupStatuses: effectiveStatuses,
              },
            },
          });

          // Emit parent order status event
          await tx.outboxEvent.create({
            data: {
              id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
              eventType: `order.${newOrderStatus.toLowerCase()}`,
              aggregateType: 'ORDER',
              aggregateId: group.orderId,
              payload: {
                orderId: group.orderId,
                orderNumber: parentOrder.orderNumber,
                previousStatus: parentOrder.status,
                newStatus: newOrderStatus,
                actorId: 'SYSTEM',
                actorRole: 'SYSTEM',
                reason: 'Auto-derived from fulfillment group status changes',
                transitionedAt: transitionedAt.toISOString(),
              },
            },
          });

          parentOrderStatusChanged = true;
          derivedOrderStatus = newOrderStatus;
        } else {
          const parentUpdated = await tx.order.updateMany({
            where: { id: group.orderId, version: parentOrder.version, deletedAt: null },
            data: { version: { increment: 1 } },
          });
          if (parentUpdated.count !== 1) {
            throw new ConflictError('Parent order changed concurrently. Please retry.');
          }
        }
      }

      const labels = FULFILLMENT_GROUP_STATUS_LABELS[nextStatus];

      const result: TransitionResult = {
        success: true,
        previousStatus: currentStatus,
        newStatus: nextStatus,
        statusLabelEn: labels.en,
        statusLabelBn: labels.bn,
        transitionedAt: transitionedAt.toISOString(),
        parentOrderStatusChanged,
        derivedOrderStatus,
      };
      if (persistRelatedState) await persistRelatedState(tx);
      await this.saveReceipt(tx, receipt, input, group.orderId, result);
      return result;
    });
  }

  // ─── Order Item Transitions ───

  /**
   * Transitions an individual order item status.
   */
  public async transitionOrderItemStatus(
    input: TransitionOrderItemInput
  ): Promise<TransitionResult> {
    const { itemId, orderId, nextStatus, actorId, actorRole, reason } = input;

    if (actorRole !== 'ADMIN' && actorRole !== 'SYSTEM') {
      throw new AuthorizationError('Individual item transitions require platform authority.');
    }

    if (nextStatus === 'RETURNED')
      throw new ConflictError('Returns require their dedicated verified workflow.');
    return this.runTransition(async (tx: any) => {
      await this.assertActiveActor(tx, actorId, actorRole);
      const parent = await this.findOrder(orderId, tx);
      const item = await this.findOrderItem(itemId, orderId, tx);
      const receipt = this.transitionReceipt(input, itemId);
      const replay = await this.replay(tx, receipt);
      if (replay) return replay;
      if (['PENDING_PAYMENT', 'CANCELLED', 'COMPLETED', 'REFUNDED'].includes(parent.status)) {
        throw new ConflictError('Parent order does not permit item transitions.');
      }
      const group = item.fulfillmentGroupId
        ? await tx.sellerFulfillmentGroup.findFirst({
            where: {
              id: item.fulfillmentGroupId,
              orderId,
              sellerId: item.sellerId,
              deletedAt: null,
            },
            select: { status: true },
          })
        : null;
      const groupStates: Partial<Record<OrderItemStatus, FulfillmentGroupStatus[]>> = {
        CONFIRMED: ['ACCEPTED'],
        PROCESSING: ['PACKING', 'READY_FOR_PICKUP'],
        SHIPPED: ['HANDED_OVER_TO_COURIER', 'IN_TRANSIT'],
        DELIVERED: ['DELIVERED'],
        CANCELLED: ['CANCELLED', 'REJECTED'],
      };
      if (!group || !groupStates[nextStatus]?.includes(group.status)) {
        throw new ConflictError('Item transition must agree with its fulfillment group state.');
      }
      const currentStatus = item.status as OrderItemStatus;

      const validation = validateOrderItemTransition(currentStatus, nextStatus);
      if (!validation.valid) {
        throw new ConflictError(validation.errorMessageEn!, {
          code: validation.errorCode,
          currentStatus,
          requestedStatus: nextStatus,
        });
      }

      const transitionedAt = new Date();

      const updated = await tx.orderItem.updateMany({
        where: {
          id: itemId,
          orderId,
          version: item.version,
          deletedAt: null,
        },
        data: {
          status: nextStatus,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictError('Order item was modified by another process. Please retry.', {
          code: 'OPTIMISTIC_LOCK_FAILURE',
        });
      }

      const parentUpdated = await tx.order.updateMany({
        where: { id: orderId, version: parent.version, deletedAt: null },
        data: { version: { increment: 1 } },
      });
      if (parentUpdated.count !== 1)
        throw new ConflictError('Parent order changed concurrently. Please retry.');

      await tx.orderStatusHistory.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.ORDER_STATUS_HISTORY),
          orderId,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          actorId,
          actorRole,
          reason: reason || `Order item ${item.productTitle} status changed to ${nextStatus}`,
          metadata: {
            orderItemId: itemId,
            productTitle: item.productTitle,
            sku: item.sku,
          },
        },
      });
      await tx.outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType: 'order_item.status_changed',
          aggregateType: 'ORDER_ITEM',
          aggregateId: itemId,
          payload: {
            orderId,
            itemId,
            previousStatus: currentStatus,
            newStatus: nextStatus,
            actorId,
            actorRole,
          },
        },
      });

      const labels = ORDER_ITEM_STATUS_LABELS[nextStatus];

      const result: TransitionResult = {
        success: true,
        previousStatus: currentStatus,
        newStatus: nextStatus,
        statusLabelEn: labels.en,
        statusLabelBn: labels.bn,
        transitionedAt: transitionedAt.toISOString(),
      };
      await this.saveReceipt(tx, receipt, input, orderId, result);
      return result;
    });
  }

  // ─── Private Helpers ───

  private async findOrder(orderId: string, db: any = this.db) {
    const order = await db.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        status: true,
        version: true,
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    return order;
  }

  private async findFulfillmentGroup(groupId: string, sellerId: string, db: any = this.db) {
    // Query-level tenant scoping
    const group = await db.sellerFulfillmentGroup.findFirst({
      where: {
        id: groupId,
        sellerId,
        deletedAt: null,
      },
      select: {
        id: true,
        orderId: true,
        sellerId: true,
        groupNumber: true,
        status: true,
        version: true,
      },
    });

    if (group) return group;

    // Check if it exists under another seller (tenant violation)
    const existsAnywhere = await db.sellerFulfillmentGroup.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true, sellerId: true },
    });

    if (existsAnywhere) {
      throw new AuthorizationError(
        "Tenant access violation: you do not have permission to manage another seller's fulfillment group.",
        { code: 'TENANT_VIOLATION' }
      );
    }

    throw new NotFoundError(`Fulfillment group '${groupId}' not found.`);
  }

  private async findOrderItem(itemId: string, orderId: string, db: any = this.db) {
    const item = await db.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        deletedAt: null,
      },
      select: {
        id: true,
        orderId: true,
        fulfillmentGroupId: true,
        sellerId: true,
        productTitle: true,
        sku: true,
        status: true,
        version: true,
      },
    });

    if (!item) {
      throw new NotFoundError(`Order item '${itemId}' not found in order '${orderId}'.`);
    }

    return item;
  }
}

export const orderTransitionService = new OrderTransitionService();
