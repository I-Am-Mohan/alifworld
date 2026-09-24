/**
 * Order Fulfillment & Multi-Vendor Lifecycle Service
 * 
 * Implements business transactions for:
 * 1. Multi-vendor cart-to-order checkout with strict seller fulfillment partitioning.
 * 2. Exact integer poisha financial calculations (1 BDT = 100 poisha).
 * 3. Independent discrete Product Points snapshots (zero conversion rate).
 * 4. Seller tenant-scoped state machine transitions and audit logging.
 * 5. Courier dispatch and shipment tracking event management.
 * 
 * Reference: docs/architecture/carts-orders-fulfillment-groups-and-shipments.md
 * Invariants: ADR-0003, ADR-0022, ADR-0025, ADR-0026, ADR-0027
 */

import { CartRepository } from '@/repositories/cart.repository';
import { OrderRepository, CreateOrderFulfillmentGroupInput } from '@/repositories/order.repository';
import { CheckoutInput } from '@/validators/order.validator';
import { ValidationError, NotFoundError, ConflictError, AuthorizationError } from '@/shared/errors/app-error';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { auditService } from '@/shared/audit';
import { createHash } from 'node:crypto';

// Standard logistics rates in minor integer poisha (1 BDT = 100 poisha)
export const SHIPPING_RATES_POISHA = {
  DHAKA_INSIDE: BigInt(6000), // ৳60.00
  DHAKA_OUTSIDE: BigInt(12000), // ৳120.00
} as const;

// Default platform commission rate (5.00%)
export const PLATFORM_COMMISSION_BPS = 500; // 500 basis points = 5.00%

export function snapshotOrderLine(pricePoisha: bigint, productPoint: number, quantity: number) {
  if (pricePoisha <= 0n || pricePoisha > 9223372036854775807n ||
      !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 2147483647 ||
      !Number.isSafeInteger(productPoint) || productPoint < 0 ||
      productPoint > 2147483647 || productPoint * quantity > 2147483647 ||
      pricePoisha * BigInt(quantity) > 9223372036854775807n) {
    throw new ValidationError('Invalid order item price, quantity, or Product Points');
  }

  return {
    unitPricePoisha: pricePoisha,
    totalPoisha: pricePoisha * BigInt(quantity),
    productPointSnapshot: productPoint,
    totalProductPoints: productPoint * quantity,
  };
}

// Valid seller fulfillment group state machine transitions
export const VALID_GROUP_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PACKING', 'CANCELLED'],
  PACKING: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['HANDED_OVER_TO_COURIER'],
  HANDED_OVER_TO_COURIER: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

export class OrderFulfillmentService {
  constructor(
    private cartRepo: CartRepository = new CartRepository(),
    private orderRepo: OrderRepository = new OrderRepository()
  ) {}

  /**
   * Executes checkout, partitioning cart items into multi-vendor seller groups
   * and freezing exact pricing and point snapshots.
   */
  async processCheckout(cartId: string, customerId: string, input: CheckoutInput, idempotencyKey: string) {
    // 1. Fetch cart with active items
    const cart = await this.cartRepo.findById(cartId);
    if (cart && cart.userId !== customerId) {
      throw new AuthorizationError('Cannot checkout cart belonging to another customer', {
        code: 'OWNERSHIP_VIOLATION',
      });
    }

    if (!cart) {
      throw new ValidationError('Cannot checkout with an empty cart');
    }

    const dateStamp = new Date(cart.createdAt).toISOString().slice(0, 10).replace(/-/g, '');
    const requestHash = createHash('sha256')
      .update(JSON.stringify([cartId, customerId, idempotencyKey, input]))
      .digest('hex').slice(0, 24).toUpperCase();
    const orderNumber = `ORD-${dateStamp}-${requestHash}`;
    const previousOrder = await this.orderRepo.findOrderByNumber(orderNumber);
    if (previousOrder) {
      if (previousOrder.customerId !== customerId) {
        throw new ConflictError('Checkout key is already in use');
      }
      return previousOrder;
    }

    if (cart.items.length === 0) {
      throw new ValidationError('Cannot checkout with an empty cart');
    }

    if (cart.status !== 'ACTIVE' || cart.currency !== 'BDT') {
      throw new ConflictError('Only active BDT carts can be checked out');
    }

    // 2. Group items by sellerId (Multi-Vendor Partitioning)
    const itemsBySeller = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const sellerGroup = itemsBySeller.get(item.sellerId) ?? [];
      sellerGroup.push(item);
      itemsBySeller.set(item.sellerId, sellerGroup);
    }

    // 3. Determine shipping fee per seller based on destination division
    const isInsideDhaka = input.shippingDivision.toUpperCase() === 'DHAKA';
    const groupShippingFee = isInsideDhaka
      ? SHIPPING_RATES_POISHA.DHAKA_INSIDE
      : SHIPPING_RATES_POISHA.DHAKA_OUTSIDE;

    // 4. Calculate financials and snapshots for each seller fulfillment group
    const fulfillmentGroups: CreateOrderFulfillmentGroupInput[] = [];
    let orderSubtotalPoisha = BigInt(0);
    let orderShippingFeePoisha = BigInt(0);
    let orderTaxPoisha = BigInt(0);
    let orderTotalProductPoints = 0;

    for (const [sellerId, items] of itemsBySeller.entries()) {
      let groupSubtotal = BigInt(0);
      let groupTax = BigInt(0);
      let groupPoints = 0;

      const groupItems = items.map((item: any) => {
        const snapshot = snapshotOrderLine(item.pricePoisha, item.productPoint, item.quantity);
        const lineSubtotal = snapshot.totalPoisha;
        const linePoints = snapshot.totalProductPoints;

        // VAT calculation (NBR Mushak standard 15% or item override)
        const taxRate = item.variant?.product?.taxRatePercent
          ? Number(item.variant.product.taxRatePercent)
          : 0;
        const lineTax = (lineSubtotal * BigInt(Math.round(taxRate * 100))) / BigInt(10000);

        groupSubtotal += lineSubtotal;
        groupTax += lineTax;
        groupPoints += linePoints;

        return {
          variantId: item.variantId,
          productTitle: item.variant?.product?.title ?? 'Product',
          variantTitle: item.variant?.title ?? 'Standard',
          sku: item.variant?.sku ?? 'SKU-UNKNOWN',
          unitPricePoisha: snapshot.unitPricePoisha,
          quantity: item.quantity,
          totalPoisha: snapshot.totalPoisha,
          taxRatePercent: taxRate,
          taxPoisha: lineTax,
          productPointSnapshot: snapshot.productPointSnapshot,
          totalProductPoints: snapshot.totalProductPoints,
        };
      });

      const groupTotal = groupSubtotal + groupShippingFee + groupTax;
      // 5% Platform Commission
      const groupCommission = (groupSubtotal * BigInt(PLATFORM_COMMISSION_BPS)) / BigInt(10000);
      const groupPayout = groupTotal - groupCommission;

      fulfillmentGroups.push({
        sellerId,
        subtotalPoisha: groupSubtotal,
        shippingFeePoisha: groupShippingFee,
        taxPoisha: groupTax,
        totalPoisha: groupTotal,
        sellerCommissionPoisha: groupCommission,
        sellerPayoutPoisha: groupPayout,
        totalProductPoints: groupPoints,
        items: groupItems,
      });

      orderSubtotalPoisha += groupSubtotal;
      orderShippingFeePoisha += groupShippingFee;
      orderTaxPoisha += groupTax;
      orderTotalProductPoints += groupPoints;
    }

    const orderTotalPoisha = orderSubtotalPoisha + orderShippingFeePoisha + orderTaxPoisha;

    // 5. Persist order with atomic fulfillment groups
    let createdOrder;
    try {
      createdOrder = await this.orderRepo.createOrder({
      cartId,
      cartVersion: cart.version,
      orderNumber,
      customerId,
      subtotalPoisha: orderSubtotalPoisha,
      shippingFeePoisha: orderShippingFeePoisha,
      taxPoisha: orderTaxPoisha,
      totalPoisha: orderTotalPoisha,
      totalProductPoints: orderTotalProductPoints,
      shippingName: input.shippingName,
      shippingPhone: input.shippingPhone,
      shippingDivision: input.shippingDivision,
      shippingDistrict: input.shippingDistrict,
      shippingUpazila: input.shippingUpazila,
      shippingAddress: input.shippingAddress,
      shippingPostalCode: input.shippingPostalCode,
      billingAddress: input.billingAddress,
      customerNotes: input.customerNotes,
      fulfillmentGroups,
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        const committedOrder = await this.orderRepo.findOrderByNumber(orderNumber);
        if (committedOrder && committedOrder.customerId === customerId) {
          return committedOrder;
        }
      }
      throw error;
    }

    // 7. Record immutable business audit log for order placement
    await auditService.logBusinessEvent({
      action: 'ORDER_CREATED',
      resource: 'ORDER',
      resourceId: createdOrder.id,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      metadata: {
        orderNumber: createdOrder.orderNumber,
        totalPoisha: createdOrder.totalPoisha.toString(),
        totalProductPoints: createdOrder.totalProductPoints,
        fulfillmentGroupsCount: fulfillmentGroups.length,
      },
    });

    return (await this.orderRepo.findOrderByNumber(orderNumber)) ?? createdOrder;
  }

  /**
   * SELLER TENANT TRANSITION: Transitions a seller fulfillment group along the state machine.
   */
  async transitionGroupStatus(
    groupId: string,
    sellerId: string,
    nextStatus: string,
    actorId?: string,
    reason?: string
  ) {
    const sfg = await this.orderRepo.findFulfillmentGroupByIdAndSeller(groupId, sellerId);
    if (!sfg) {
      throw new NotFoundError(`Fulfillment group '${groupId}' not found`);
    }

    const allowedNext = VALID_GROUP_TRANSITIONS[sfg.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      throw new ConflictError(
        `Invalid status transition from '${sfg.status}' to '${nextStatus}'. Allowed: [${allowedNext.join(', ')}]`,
        { currentStatus: sfg.status, requestedStatus: nextStatus }
      );
    }

    // Perform the status update
    const updated = await this.orderRepo.updateFulfillmentGroupStatus(
      groupId,
      sellerId,
      nextStatus,
      actorId
    );

    // Record audit event in parent order history
    await this.orderRepo.recordStatusTransition(
      sfg.orderId,
      sfg.status,
      nextStatus,
      actorId,
      'SELLER',
      reason ?? `Seller updated fulfillment group ${sfg.groupNumber} to ${nextStatus}`
    );

    // Record immutable audit log
    await auditService.logBusinessEvent({
      action: 'FULFILLMENT_GROUP_STATUS_CHANGED',
      resource: 'SELLER_FULFILLMENT_GROUP',
      resourceId: groupId,
      actorId,
      actorRole: 'SELLER',
      before: { status: sfg.status },
      after: { status: nextStatus },
      metadata: {
        orderId: sfg.orderId,
        sellerId,
        reason: reason ?? `Seller updated fulfillment group ${sfg.groupNumber} to ${nextStatus}`,
      },
    });

    return updated;
  }

  /**
   * Dispatches a physical shipment for a seller fulfillment group.
   */
  async dispatchShipment(
    groupId: string,
    sellerId: string,
    courierProvider: string,
    recipientInfo: {
      recipientName: string;
      recipientPhone: string;
      deliveryAddress: string;
      division: string;
      district: string;
    },
    options: {
      trackingNumber?: string;
      consignmentId?: string;
      weightGrams?: number;
      shippingCostPoisha?: bigint;
    } = {}
  ) {
    // Verify group ownership
    const sfg = await this.orderRepo.findFulfillmentGroupByIdAndSeller(groupId, sellerId);
    if (!sfg) {
      throw new NotFoundError(`Fulfillment group '${groupId}' not found`);
    }

    const shipmentNumber = `SHP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const shipment = await this.orderRepo.createShipment({
      fulfillmentGroupId: groupId,
      sellerId,
      shipmentNumber,
      courierProvider,
      trackingNumber: options.trackingNumber,
      consignmentId: options.consignmentId,
      recipientName: recipientInfo.recipientName,
      recipientPhone: recipientInfo.recipientPhone,
      deliveryAddress: recipientInfo.deliveryAddress,
      division: recipientInfo.division,
      district: recipientInfo.district,
      weightGrams: options.weightGrams,
      shippingCostPoisha: options.shippingCostPoisha,
    });

    // Advance fulfillment group to HANDED_OVER_TO_COURIER if valid
    if (sfg.status === 'READY_FOR_PICKUP' || sfg.status === 'PACKING') {
      await this.orderRepo.updateFulfillmentGroupStatus(
        groupId,
        sellerId,
        'HANDED_OVER_TO_COURIER'
      );
    }

    // Record immutable audit log
    await auditService.logBusinessEvent({
      action: 'SHIPMENT_DISPATCHED',
      resource: 'SHIPMENT',
      resourceId: shipment.id,
      actorId: sellerId,
      actorRole: 'SELLER',
      metadata: {
        fulfillmentGroupId: groupId,
        shipmentNumber,
        courierProvider,
        trackingNumber: options.trackingNumber ?? null,
      },
    });

    return shipment;
  }

  /**
   * Releases Product Points to the buyer once the order completes and the return window expires.
   */
  async releaseOrderPoints(orderId: string, actorId?: string) {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found`);
    }

    if (order.status !== 'COMPLETED') {
      throw new ValidationError(
        `Product Points can only be released when order status is 'COMPLETED'. Current status: '${order.status}'`
      );
    }

    if (order.pointsReleased) {
      throw new ConflictError('Product Points have already been released for this order');
    }

    // In a future phase this connects to ProductPointLedger.
    // For now we record the release and log audit history.
    await this.orderRepo.recordStatusTransition(
      orderId,
      order.status,
      'COMPLETED',
      actorId,
      'SYSTEM',
      `Released ${order.totalProductPoints} Product Points to customer ${order.customerId}`,
      { points: order.totalProductPoints }
    );

    return {
      orderId,
      pointsReleased: order.totalProductPoints,
      releasedAt: new Date().toISOString(),
    };
  }
}
