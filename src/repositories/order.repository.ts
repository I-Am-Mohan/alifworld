/**
 * Order & Fulfillment Repository
 * 
 * Manages parent customer orders, multi-vendor seller fulfillment groups,
 * order line item snapshots, shipments, and immutable status audit trails.
 * 
 * Invariants:
 * - ADR-0003: Single modular monolith with tenant isolation
 * - ADR-0022: Immutable audit logs and soft deletion
 * - ADR-0027: Multi-vendor parent orders partitioned into isolated seller fulfillment groups
 */

import { BaseRepository, parseOffsetPagination, formatPaginatedResult, assertSellerScope } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { NotFoundError, AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export interface CreateOrderFulfillmentGroupInput {
  sellerId: string;
  warehouseId?: string | null;
  subtotalPoisha: bigint;
  shippingFeePoisha: bigint;
  taxPoisha: bigint;
  totalPoisha: bigint;
  sellerCommissionPoisha: bigint;
  sellerPayoutPoisha: bigint;
  totalProductPoints: number;
  courierProvider?: string | null;
  items: Array<{
    variantId: string;
    productTitle: string;
    variantTitle: string;
    sku: string;
    unitPricePoisha: bigint;
    quantity: number;
    totalPoisha: bigint;
    taxRatePercent?: number | null;
    taxPoisha: bigint;
    productPointSnapshot: number;
    totalProductPoints: number;
  }>;
}

export interface CreateOrderInput {
  orderNumber: string;
  customerId: string;
  currency?: string;
  subtotalPoisha: bigint;
  discountPoisha?: bigint;
  shippingFeePoisha: bigint;
  taxPoisha: bigint;
  totalPoisha: bigint;
  totalProductPoints: number;
  shippingName: string;
  shippingPhone: string;
  shippingDivision: string;
  shippingDistrict: string;
  shippingUpazila?: string | null;
  shippingAddress: string;
  shippingPostalCode?: string | null;
  billingAddress?: string | null;
  customerNotes?: string | null;
  ruleVersion?: string;
  fulfillmentGroups: CreateOrderFulfillmentGroupInput[];
}

export interface CreateShipmentInput {
  fulfillmentGroupId: string;
  sellerId: string;
  shipmentNumber: string;
  courierProvider: string;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  division: string;
  district: string;
  weightGrams?: number | null;
  packageCount?: number;
  shippingCostPoisha?: bigint;
}

export class OrderRepository extends BaseRepository {
  /**
   * Creates an order with partitioned seller fulfillment groups, item snapshots,
   * and initial status history in an atomic transaction.
   */
  async createOrder(input: CreateOrderInput) {
    return this.executeSafe(async () => {
      return this.withTransaction(async (tx) => {
        const orderId = generateId(ID_PREFIXES.ORDER);

        // 1. Create parent order
        const order = await (tx as any).order.create({
          data: {
            id: orderId,
            orderNumber: input.orderNumber,
            customerId: input.customerId,
            currency: input.currency ?? 'BDT',
            status: 'PENDING_PAYMENT',
            paymentStatus: 'UNPAID',
            fulfillmentStatus: 'UNFULFILLED',
            subtotalPoisha: input.subtotalPoisha,
            discountPoisha: input.discountPoisha ?? BigInt(0),
            shippingFeePoisha: input.shippingFeePoisha,
            taxPoisha: input.taxPoisha,
            totalPoisha: input.totalPoisha,
            totalProductPoints: input.totalProductPoints,
            shippingName: input.shippingName,
            shippingPhone: input.shippingPhone,
            shippingDivision: input.shippingDivision,
            shippingDistrict: input.shippingDistrict,
            shippingUpazila: input.shippingUpazila ?? null,
            shippingAddress: input.shippingAddress,
            shippingPostalCode: input.shippingPostalCode ?? null,
            billingAddress: input.billingAddress ?? null,
            customerNotes: input.customerNotes ?? null,
            ruleVersion: input.ruleVersion ?? 'v1.0.0',
          },
        });

        // 2. Create seller fulfillment groups and their respective items
        let groupIndex = 1;
        for (const groupInput of input.fulfillmentGroups) {
          const groupId = generateId(ID_PREFIXES.FULFILLMENT_GROUP);
          const groupNumber = `${input.orderNumber}-SFG${String(groupIndex).padStart(2, '0')}`;
          groupIndex++;

          const sfg = await (tx as any).sellerFulfillmentGroup.create({
            data: {
              id: groupId,
              orderId,
              sellerId: groupInput.sellerId,
              warehouseId: groupInput.warehouseId ?? null,
              groupNumber,
              status: 'PENDING',
              subtotalPoisha: groupInput.subtotalPoisha,
              shippingFeePoisha: groupInput.shippingFeePoisha,
              taxPoisha: groupInput.taxPoisha,
              totalPoisha: groupInput.totalPoisha,
              sellerCommissionPoisha: groupInput.sellerCommissionPoisha,
              sellerPayoutPoisha: groupInput.sellerPayoutPoisha,
              totalProductPoints: groupInput.totalProductPoints,
              courierProvider: groupInput.courierProvider ?? null,
            },
          });

          // Insert order items for this group
          for (const itemInput of groupInput.items) {
            await (tx as any).orderItem.create({
              data: {
                id: generateId(ID_PREFIXES.ORDER_ITEM),
                orderId,
                fulfillmentGroupId: sfg.id,
                sellerId: groupInput.sellerId,
                variantId: itemInput.variantId,
                productTitle: itemInput.productTitle,
                variantTitle: itemInput.variantTitle,
                sku: itemInput.sku,
                unitPricePoisha: itemInput.unitPricePoisha,
                quantity: itemInput.quantity,
                totalPoisha: itemInput.totalPoisha,
                taxRatePercent: itemInput.taxRatePercent ?? null,
                taxPoisha: itemInput.taxPoisha,
                productPointSnapshot: itemInput.productPointSnapshot,
                totalProductPoints: itemInput.totalProductPoints,
                status: 'PENDING',
              },
            });
          }
        }

        // 3. Append immutable initial status history log
        await (tx as any).orderStatusHistory.create({
          data: {
            id: generateId(ID_PREFIXES.ORDER_STATUS_HISTORY),
            orderId,
            fromStatus: null,
            toStatus: 'PENDING_PAYMENT',
            actorId: input.customerId,
            actorRole: 'CUSTOMER',
            reason: 'Order placed by customer at checkout',
          },
        });

        return order;
      });
    }, 'OrderRepository.createOrder');
  }

  /**
   * Retrieves order by unique order number with all groups, items, and status logs.
   */
  async findOrderByNumber(orderNumber: string) {
    return this.executeSafe(async () => {
      return (this.db as any).order.findFirst({
        where: this.whereNotDeleted({ orderNumber }),
        include: {
          items: {
            where: { deletedAt: null },
          },
          fulfillmentGroups: {
            where: { deletedAt: null },
            include: {
              items: { where: { deletedAt: null } },
              shipments: {
                where: { deletedAt: null },
                include: { events: true },
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  slug: true,
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }, 'OrderRepository.findOrderByNumber');
  }

  /**
   * Retrieves an order by primary ID.
   */
  async findById(orderId: string) {
    return this.executeSafe(async () => {
      return (this.db as any).order.findFirst({
        where: this.whereNotDeleted({ id: orderId }),
        include: {
          items: { where: { deletedAt: null } },
          fulfillmentGroups: { where: { deletedAt: null } },
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      });
    }, 'OrderRepository.findById');
  }

  /**
   * Customer-scoped query: returns paginated orders for a customer.
   */
  async findOrdersByCustomerId(customerId: string, paginationParams = {}) {
    const { skip, take, page, limit } = parseOffsetPagination(paginationParams);

    return this.executeSafe(async () => {
      const where = this.whereNotDeleted({ customerId });

      const [items, total] = await Promise.all([
        (this.db as any).order.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            items: { where: { deletedAt: null } },
            fulfillmentGroups: {
              where: { deletedAt: null },
              include: {
                seller: {
                  select: {
                    id: true,
                    businessName: true,
                    slug: true,
                  },
                },
              },
            },
          },
        }),
        (this.db as any).order.count({ where }),
      ]);

      return formatPaginatedResult(items, total, page, limit);
    }, 'OrderRepository.findOrdersByCustomerId');
  }

  /**
   * SELLER TENANT SCOPING: Retrieves fulfillment groups exclusively owned by sellerId.
   */
  async findFulfillmentGroupsBySellerId(
    sellerId: string,
    options: { status?: string; page?: number; limit?: number } = {}
  ) {
    const { skip, take, page, limit } = parseOffsetPagination(options);

    return this.executeSafe(async () => {
      const where = this.whereNotDeleted({
        sellerId,
        ...(options.status ? { status: options.status } : {}),
      });

      const [items, total] = await Promise.all([
        (this.db as any).sellerFulfillmentGroup.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                shippingName: true,
                shippingPhone: true,
                shippingDivision: true,
                shippingDistrict: true,
                shippingAddress: true,
                createdAt: true,
              },
            },
            items: { where: { deletedAt: null } },
            shipments: {
              where: { deletedAt: null },
              include: { events: { orderBy: { occurredAt: 'desc' } } },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        }),
        (this.db as any).sellerFulfillmentGroup.count({ where }),
      ]);

      return formatPaginatedResult(items, total, page, limit);
    }, 'OrderRepository.findFulfillmentGroupsBySellerId');
  }

  /**
   * SELLER TENANT SCOPING: Retrieves a single fulfillment group, verifying seller ownership.
   */
  async findFulfillmentGroupByIdAndSeller(groupId: string, sellerId: string) {
    return this.executeSafe(async () => {
      const sfg = await (this.db as any).sellerFulfillmentGroup.findFirst({
        where: this.whereNotDeleted({ id: groupId }),
        include: {
          order: true,
          items: { where: { deletedAt: null } },
          shipments: {
            where: { deletedAt: null },
            include: { events: true },
          },
        },
      });

      if (!sfg) {
        throw new NotFoundError(`Fulfillment group '${groupId}' not found`);
      }

      assertSellerScope(sfg.sellerId, sellerId);
      return sfg;
    }, 'OrderRepository.findFulfillmentGroupByIdAndSeller');
  }

  /**
   * SELLER TENANT SCOPING: Updates fulfillment group status with strict seller verification.
   */
  async updateFulfillmentGroupStatus(
    groupId: string,
    sellerId: string,
    nextStatus: string,
    actorId?: string
  ) {
    return this.executeSafe(async () => {
      const sfg = await (this.db as any).sellerFulfillmentGroup.findFirst({
        where: this.whereNotDeleted({ id: groupId }),
      });

      if (!sfg) {
        throw new NotFoundError(`Fulfillment group '${groupId}' not found`);
      }

      assertSellerScope(sfg.sellerId, sellerId);

      return (this.db as any).sellerFulfillmentGroup.update({
        where: { id: groupId },
        data: {
          status: nextStatus,
          version: { increment: 1 },
          ...(nextStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
      });
    }, 'OrderRepository.updateFulfillmentGroupStatus');
  }

  /**
   * Appends an immutable order status transition record to OrderStatusHistory.
   */
  async recordStatusTransition(
    orderId: string,
    fromStatus: string | null,
    toStatus: string,
    actorId?: string,
    actorRole?: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ) {
    return this.executeSafe(async () => {
      return (this.db as any).orderStatusHistory.create({
        data: {
          id: generateId(ID_PREFIXES.ORDER_STATUS_HISTORY),
          orderId,
          fromStatus,
          toStatus,
          actorId: actorId ?? null,
          actorRole: actorRole ?? 'SYSTEM',
          reason: reason ?? null,
          metadata: metadata ?? null,
        },
      });
    }, 'OrderRepository.recordStatusTransition');
  }

  /**
   * Creates a logistics shipment record and appends its first shipment event.
   */
  async createShipment(input: CreateShipmentInput) {
    return this.executeSafe(async () => {
      return this.withTransaction(async (tx) => {
        const shipmentId = generateId(ID_PREFIXES.SHIPMENT);

        const shipment = await (tx as any).shipment.create({
          data: {
            id: shipmentId,
            fulfillmentGroupId: input.fulfillmentGroupId,
            sellerId: input.sellerId,
            shipmentNumber: input.shipmentNumber,
            courierProvider: input.courierProvider,
            trackingNumber: input.trackingNumber ?? null,
            consignmentId: input.consignmentId ?? null,
            status: 'LABEL_CREATED',
            weightGrams: input.weightGrams ?? null,
            packageCount: input.packageCount ?? 1,
            shippingCostPoisha: input.shippingCostPoisha ?? BigInt(0),
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            deliveryAddress: input.deliveryAddress,
            division: input.division,
            district: input.district,
          },
        });

        // Add initial shipment event
        await (tx as any).shipmentEvent.create({
          data: {
            id: generateId(ID_PREFIXES.SHIPMENT_EVENT),
            shipmentId,
            status: 'LABEL_CREATED',
            description: `Shipping label created with ${input.courierProvider}`,
            occurredAt: new Date(),
          },
        });

        return shipment;
      });
    }, 'OrderRepository.createShipment');
  }

  /**
   * Appends an immutable tracking event to a shipment timeline.
   */
  async recordShipmentEvent(
    shipmentId: string,
    status: string,
    description: string,
    location?: string,
    carrierPayload?: any
  ) {
    return this.executeSafe(async () => {
      return this.withTransaction(async (tx) => {
        const event = await (tx as any).shipmentEvent.create({
          data: {
            id: generateId(ID_PREFIXES.SHIPMENT_EVENT),
            shipmentId,
            status,
            description,
            location: location ?? null,
            carrierPayload: carrierPayload ?? null,
            occurredAt: new Date(),
          },
        });

        // Update shipment status
        await (tx as any).shipment.update({
          where: { id: shipmentId },
          data: {
            status,
            version: { increment: 1 },
            ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
            ...(status === 'PICKED_UP' ? { shippedAt: new Date() } : {}),
          },
        });

        return event;
      });
    }, 'OrderRepository.recordShipmentEvent');
  }
}
