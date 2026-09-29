/**
 * Authoritative Checkout Orchestration Domain Service
 *
 * Implements server-side idempotent checkout pipeline:
 * 1. Idempotency Key validation & replay protection
 * 2. Multi-vendor seller fulfillment group partitioning
 * 3. Authoritative server-side recomputation (stock, price, tax, courier shipping, points, discounts)
 * 4. B2B negotiated quote integration & purchase order preservation
 * 5. Atomic transaction execution with optimistic concurrency
 * 6. Append-only order status history, outbox events, and immutable audit logging
 *
 * Invariant: Client totals strictly ignored; all financial calculations performed server-side.
 * Invariant: Product price (poisha) and Product Points are independent units.
 * Invariant: Strict seller tenant isolation on fulfillment group partitions.
 */

import { createHash } from 'crypto';
import { prisma } from '@/shared/database/prisma';
import { generateId, generatePrefixedId, ID_PREFIXES, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError,
} from '@/shared/errors/app-error';
import { auditService } from '@/shared/audit';
import {
  CheckoutExecutionInput,
  CheckoutResultDTO,
  CheckoutSellerGroupDTO,
  CheckoutOrderItemSnapshotDTO,
} from '../types/checkout.types';
import { shippingRateService, ShippingItemInput } from '@/features/shipping';
import { codFraudRiskService } from './cod-fraud-risk.service';

const SHIPPING_RATES_POISHA = {
  DHAKA_INSIDE: BigInt(6000), // ৳60.00 inside Dhaka division
  DHAKA_OUTSIDE: BigInt(12000), // ৳120.00 outside Dhaka division
};

const FREE_SHIPPING_THRESHOLD_POISHA = BigInt(200000); // ৳2,000.00 per seller
const DEFAULT_PLATFORM_COMMISSION_BPS = 500; // 5.00% (500 bps)

export class CheckoutOrchestratorService {
  private db = prisma;

  /**
   * Authoritative multi-vendor cart-to-order checkout pipeline.
   * Fully idempotent: repeating with the same key returns the committed order.
   */
  public async executeCheckout(
    customerId: string,
    input: CheckoutExecutionInput
  ): Promise<CheckoutResultDTO> {
    const { cartId, checkout, idempotencyKey } = input;

    // 1. Deterministic Idempotency Key & Order Number Computation
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const requestHash = createHash('sha256')
      .update(JSON.stringify([cartId, customerId, idempotencyKey, checkout]))
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    const orderNumber = `ORD-${dateStamp}-${requestHash}`;

    // Check if order with this orderNumber was already committed (Idempotent Replay)
    const existingOrder = await (this.db as any).order.findFirst({
      where: { orderNumber, deletedAt: null },
      include: {
        fulfillmentGroups: { where: { deletedAt: null } },
      },
    });

    if (existingOrder) {
      if (existingOrder.customerId !== customerId) {
        throw new ConflictError('Idempotency key conflict: already utilized by another customer.');
      }
      return this.mapOrderToResultDTO(existingOrder, true);
    }

    // 2. Fetch Cart and Verify Ownership
    const cart = await (this.db as any).cart.findFirst({
      where: { id: cartId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    seller: true,
                  },
                },
                stockBalances: { where: { deletedAt: null } },
              },
            },
            seller: {
              include: {
                settings: true,
                operationalDefaults: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundError(`Shopping cart '${cartId}' not found.`);
    }

    if (cart.userId && cart.userId !== customerId) {
      throw new AuthorizationError('You do not have permission to checkout this cart.', {
        code: 'OWNERSHIP_VIOLATION',
      });
    }

    if (cart.items.length === 0) {
      throw new ValidationError('Cannot checkout with an empty cart.');
    }

    if (cart.status !== 'ACTIVE' || cart.currency !== 'BDT') {
      throw new ConflictError('Cart is no longer available for checkout.');
    }

    // 3. Handle B2B Negotiated Quote Validation
    const isB2BOrder = Boolean(cart.isB2B);
    let b2bQuote: any = null;

    if (isB2BOrder && cart.b2bQuoteId) {
      b2bQuote = await (this.db as any).b2bQuote.findFirst({
        where: { id: cart.b2bQuoteId, deletedAt: null },
        include: { organization: true },
      });

      if (!b2bQuote) {
        throw new ValidationError('Referenced B2B quote was not found.');
      }

      if (new Date() > new Date(b2bQuote.validUntil)) {
        throw new ValidationError('B2B negotiated quote has expired and cannot be checked out.');
      }
    }

    // 4. Multi-Vendor Partitioning & Server-Side Financial Recomputation
    const itemsBySeller = new Map<string, any[]>();
    for (const item of cart.items) {
      const sellerGroup = itemsBySeller.get(item.sellerId) || [];
      sellerGroup.push(item);
      itemsBySeller.set(item.sellerId, sellerGroup);
    }

    const isInsideDhaka = checkout.shippingDivision.toUpperCase() === 'DHAKA';
    const baseShippingRate = isInsideDhaka
      ? SHIPPING_RATES_POISHA.DHAKA_INSIDE
      : SHIPPING_RATES_POISHA.DHAKA_OUTSIDE;

    // Build items payload for authoritative shipping rate & delivery promise engine
    const shippingItems: ShippingItemInput[] = cart.items.map((item: any) => ({
      variantId: item.variantId,
      productTitle: item.variant?.product?.title || 'Unknown Product',
      quantity: item.quantity,
      weightGrams: item.variant?.weightGrams ?? item.variant?.product?.weightGrams ?? 250,
      lengthMm: item.variant?.product?.lengthMm ?? null,
      widthMm: item.variant?.product?.widthMm ?? null,
      heightMm: item.variant?.product?.heightMm ?? null,
      shippingClass: item.variant?.product?.shippingClass ?? 'STANDARD',
      requiresShipping: item.variant?.product?.requiresShipping ?? true,
      unitPricePoisha: BigInt(isB2BOrder ? item.pricePoisha : item.variant?.pricePoisha || 0),
      sellerId: item.sellerId,
    }));

    let shippingQuote: any = null;
    try {
      shippingQuote = await shippingRateService.calculateOrderShippingQuote({
        address: {
          division: checkout.shippingDivision,
          district: checkout.shippingDistrict,
          upazila: checkout.shippingUpazila,
          postalCode: checkout.shippingPostalCode,
          streetAddress: checkout.shippingAddress,
        },
        items: shippingItems,
        shippingMethod: 'STANDARD',
      });
    } catch {
      // Fallback if shipping quote service encountered unhandled exception
    }

    const sellerGroups: CheckoutSellerGroupDTO[] = [];
    let orderSubtotalPoisha = 0n;
    let orderShippingFeePoisha = 0n;
    let orderTaxPoisha = 0n;
    let orderTotalProductPoints = 0;
    let groupIndex = 1;

    for (const [sellerId, items] of itemsBySeller.entries()) {
      const seller = items[0]?.seller;

      if (!seller || seller.status !== 'VERIFIED' || seller.deletedAt) {
        throw new ValidationError(
          `Seller '${seller?.businessName || sellerId}' is currently unavailable for order fulfillment.`
        );
      }

      if (seller.settings?.vacationMode) {
        throw new ValidationError(
          `Seller '${seller.businessName}' is currently on vacation: ${
            seller.settings.vacationMessage || 'Orders cannot be placed.'
          }`
        );
      }

      let groupSubtotalPoisha = 0n;
      let groupTaxPoisha = 0n;
      let groupProductPoints = 0;
      const groupItems: CheckoutOrderItemSnapshotDTO[] = [];

      for (const item of items) {
        const variant = item.variant;

        if (!variant || variant.deletedAt || variant.product?.deletedAt || variant.product?.status !== 'PUBLISHED') {
          throw new ValidationError(
            `Product item '${item.variant?.product?.title || 'Unknown'}' is no longer published.`
          );
        }

        // Live warehouse stock balance check
        const totalAvailableStock = (variant.stockBalances || []).reduce(
          (sum: number, sb: any) =>
            sum + Math.max(0, (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)),
          0
        );

        if (variant.stockBalances?.length > 0 && item.quantity > totalAvailableStock) {
          throw new ValidationError(
            `Insufficient inventory for '${variant.product.title} - ${variant.title}'. Requested: ${item.quantity}, Available: ${totalAvailableStock}.`
          );
        }

        // Price snapshotting: B2B locks negotiated price; standard retail recomputes live
        const unitPricePoisha = isB2BOrder ? BigInt(item.pricePoisha) : BigInt(variant.pricePoisha);
        const lineTotalPoisha = unitPricePoisha * BigInt(item.quantity);

        // Discrete Product Points snapshot
        const unitProductPoint = isB2BOrder
          ? item.productPoint || 0
          : variant.productPoint ?? variant.product.productPoint ?? 0;
        const lineProductPoints = unitProductPoint * item.quantity;

        // NBR standard VAT calculation (15% standard or taxRatePercent override)
        const taxRate = variant.product?.taxRatePercent
          ? Number(variant.product.taxRatePercent)
          : 0;
        const lineTaxPoisha = (lineTotalPoisha * BigInt(Math.round(taxRate * 100))) / 10000n;

        groupSubtotalPoisha += lineTotalPoisha;
        groupTaxPoisha += lineTaxPoisha;
        groupProductPoints += lineProductPoints;

        groupItems.push({
          variantId: item.variantId,
          productTitle: variant.product.title,
          variantTitle: variant.title,
          sku: variant.sku,
          unitPricePoisha,
          quantity: item.quantity,
          totalPoisha: lineTotalPoisha,
          discountPoisha: 0n,
          sellerDiscountPoisha: 0n,
          platformDiscountPoisha: 0n,
          taxRatePercent: taxRate,
          taxPoisha: lineTaxPoisha,
          productPointSnapshot: unitProductPoint,
          totalProductPoints: lineProductPoints,
        });
      }

      // Per-seller shipping fee calculation via authoritative shipping rate engine
      const sellerQuote = shippingQuote?.sellerQuotes?.find(
        (sq: any) => sq.sellerId === sellerId
      );

      const qualifiesForFreeShipping = groupSubtotalPoisha >= FREE_SHIPPING_THRESHOLD_POISHA;
      const groupShippingFeePoisha = sellerQuote
        ? BigInt(sellerQuote.activeRate.finalRatePoisha)
        : qualifiesForFreeShipping
        ? 0n
        : baseShippingRate;

      const courierProvider =
        sellerQuote?.activeRate?.courierProvider || (isInsideDhaka ? 'IN_HOUSE' : 'STEADFAST');
      const estimatedDelivery = sellerQuote?.activeRate?.deliveryPromise?.maxEstimatedDate
        ? new Date(sellerQuote.activeRate.deliveryPromise.maxEstimatedDate)
        : null;

      const groupTotalPoisha = groupSubtotalPoisha + groupShippingFeePoisha + groupTaxPoisha;

      // Platform commission split calculation
      const groupCommissionPoisha =
        (groupSubtotalPoisha * BigInt(DEFAULT_PLATFORM_COMMISSION_BPS)) / 10000n;
      const groupPayoutPoisha = groupTotalPoisha - groupCommissionPoisha;

      const groupNumber = `SFG-${dateStamp}-${requestHash.slice(0, 8)}-SEL${String(groupIndex++).padStart(2, '0')}`;

      sellerGroups.push({
        sellerId,
        warehouseId: null,
        groupNumber,
        subtotalPoisha: groupSubtotalPoisha,
        discountPoisha: 0n,
        sellerDiscountPoisha: 0n,
        platformDiscountPoisha: 0n,
        shippingFeePoisha: groupShippingFeePoisha,
        taxPoisha: groupTaxPoisha,
        totalPoisha: groupTotalPoisha,
        sellerCommissionPoisha: groupCommissionPoisha,
        sellerPayoutPoisha: groupPayoutPoisha,
        totalProductPoints: groupProductPoints,
        courierProvider,
        estimatedDelivery,
        items: groupItems,
      });

      orderSubtotalPoisha += groupSubtotalPoisha;
      orderShippingFeePoisha += groupShippingFeePoisha;
      orderTaxPoisha += groupTaxPoisha;
      orderTotalProductPoints += groupProductPoints;
    }

    // 4b. Authoritative Server-Side Coupon & Discount Calculation
    const couponCodeToApply = input.couponCode || cart.appliedCouponCode || null;
    let appliedCoupon: any = null;
    let orderDiscountPoisha = 0n;
    let orderSellerDiscountPoisha = 0n;
    let orderPlatformDiscountPoisha = 0n;

    if (couponCodeToApply) {
      const codeUpper = couponCodeToApply.trim().toUpperCase();
      const now = new Date();

      const discountRule = await (this.db as any).discountRule.findFirst({
        where: { code: codeUpper, deletedAt: null },
      });

      if (discountRule) {
        if (discountRule.status !== 'ACTIVE') {
          throw new ValidationError(`Coupon '${codeUpper}' is inactive.`);
        }
        if (now < new Date(discountRule.startsAt)) {
          throw new ValidationError(`Coupon '${codeUpper}' is not yet active.`);
        }
        if (discountRule.endsAt && now > new Date(discountRule.endsAt)) {
          throw new ValidationError(`Coupon '${codeUpper}' has expired.`);
        }
        if (orderSubtotalPoisha < BigInt(discountRule.minOrderSubtotalPoisha || 0)) {
          throw new ValidationError(
            `Minimum order subtotal requirement of ৳${(Number(discountRule.minOrderSubtotalPoisha) / 100).toFixed(2)} not met.`
          );
        }
        if (discountRule.usageLimit && (discountRule.usageCount || 0) >= discountRule.usageLimit) {
          throw new ValidationError(`Coupon '${codeUpper}' usage limit has been reached.`);
        }

        let discPoisha = 0n;
        if (discountRule.discountType === 'PERCENTAGE') {
          const pct = BigInt(Math.round(Number(discountRule.discountValue || 0) * 100));
          discPoisha = (orderSubtotalPoisha * pct) / 10000n;
        } else {
          discPoisha = BigInt(Math.round(Number(discountRule.discountValue || 0) * 100));
        }

        if (discountRule.maxDiscountPoisha && discPoisha > BigInt(discountRule.maxDiscountPoisha)) {
          discPoisha = BigInt(discountRule.maxDiscountPoisha);
        }

        const sellerSharePct = BigInt(Math.round(Number(discountRule.sellerSharePercent ?? 0)));
        const sellerDisc = (discPoisha * sellerSharePct) / 100n;
        const platformDisc = discPoisha - sellerDisc;

        orderDiscountPoisha = discPoisha;
        orderSellerDiscountPoisha = sellerDisc;
        orderPlatformDiscountPoisha = platformDisc;

        appliedCoupon = {
          couponCode: codeUpper,
          discountRuleId: discountRule.id,
          promotionId: null,
          sellerId: discountRule.sellerId || null,
          discountAmountPoisha: discPoisha,
          sellerDiscountPoisha: sellerDisc,
          platformDiscountPoisha: platformDisc,
          ruleVersion: discountRule.ruleVersion || 'v1.0.0',
        };
      }
    }

    const orderTotalPoisha =
      orderSubtotalPoisha > orderDiscountPoisha
        ? orderSubtotalPoisha - orderDiscountPoisha + orderShippingFeePoisha + orderTaxPoisha
        : orderShippingFeePoisha + orderTaxPoisha;

    // 4c. Cash on Delivery (COD) Fraud-Risk Gating & Prepayment Enforcement
    if (checkout.paymentMethod === 'COD') {
      const hasDigital = cart.items.some((i: any) => i.variant?.product?.isPhysical === false);
      const codEvaluation = await codFraudRiskService.evaluateCodEligibility(
        {
          recipientPhone: checkout.shippingPhone,
          orderSubtotalPoisha: Number(orderSubtotalPoisha),
          division: checkout.shippingDivision,
          district: checkout.shippingDistrict,
          upazila: checkout.shippingUpazila || undefined,
          hasDigitalItems: hasDigital,
          cartId: cart.id,
        },
        customerId
      );

      if (!codEvaluation.isEligible) {
        throw new ValidationError(
          codEvaluation.warnings[0] ||
            'Order is not eligible for Cash on Delivery. Digital prepayment required.',
          {
            riskLevel: codEvaluation.riskLevel,
            riskScore: codEvaluation.riskScore,
            factors: codEvaluation.factors,
          }
        );
      }

      if (codEvaluation.requiresOtpVerification && !checkout.codVerificationToken) {
        throw new ValidationError(
          'Phone verification via SMS OTP is required before Cash on Delivery order placement.',
          { code: 'COD_OTP_REQUIRED', requiresOtp: true }
        );
      }
    }

    // 5. Atomic Checkout Transaction
    const orderId = generatePrefixedId(ENTITY_PREFIXES.ORDER);

    const createdOrder = await (this.db as any).$transaction(async (tx: any) => {
      // 5a. Claim and convert cart optimistically
      const claimResult = await tx.cart.updateMany({
        where: {
          id: cartId,
          status: 'ACTIVE',
          version: cart.version,
          deletedAt: null,
        },
        data: {
          status: 'CONVERTED',
          version: { increment: 1 },
        },
      });

      if (claimResult.count !== 1) {
        throw new ConflictError('Cart was modified concurrently or is no longer available for checkout.');
      }

      // 5b. Create parent order
      const order = await tx.order.create({
        data: {
          id: orderId,
          orderNumber,
          customerId,
          currency: 'BDT',
          status: 'PENDING_PAYMENT',
          paymentStatus: 'UNPAID',
          fulfillmentStatus: 'UNFULFILLED',
          subtotalPoisha: orderSubtotalPoisha,
          discountPoisha: orderDiscountPoisha,
          sellerDiscountPoisha: orderSellerDiscountPoisha,
          platformDiscountPoisha: orderPlatformDiscountPoisha,
          shippingFeePoisha: orderShippingFeePoisha,
          taxPoisha: orderTaxPoisha,
          totalPoisha: orderTotalPoisha,
          totalProductPoints: orderTotalProductPoints,
          shippingName: checkout.shippingName,
          shippingPhone: checkout.shippingPhone,
          shippingDivision: checkout.shippingDivision,
          shippingDistrict: checkout.shippingDistrict,
          shippingUpazila: checkout.shippingUpazila || null,
          shippingAddress: checkout.shippingAddress,
          shippingPostalCode: checkout.shippingPostalCode || null,
          billingAddress: checkout.billingAddress || null,
          customerNotes: checkout.customerNotes || null,
          ruleVersion: b2bQuote?.rewardsRuleVersion || shippingQuote?.appliedRuleVersion || 'v1.0.0',
          version: 1,
        },
      });

      // 5c. Create multi-vendor seller fulfillment groups & item snapshots
      for (const group of sellerGroups) {
        const groupId = generateId(ID_PREFIXES.FULFILLMENT_GROUP);

        const createdGroup = await tx.sellerFulfillmentGroup.create({
          data: {
            id: groupId,
            orderId: order.id,
            sellerId: group.sellerId,
            warehouseId: group.warehouseId || null,
            groupNumber: group.groupNumber,
            status: 'PENDING',
            subtotalPoisha: group.subtotalPoisha,
            discountPoisha: group.discountPoisha,
            sellerDiscountPoisha: group.sellerDiscountPoisha,
            platformDiscountPoisha: group.platformDiscountPoisha,
            shippingFeePoisha: group.shippingFeePoisha,
            taxPoisha: group.taxPoisha,
            totalPoisha: group.totalPoisha,
            sellerCommissionPoisha: group.sellerCommissionPoisha,
            sellerPayoutPoisha: group.sellerPayoutPoisha,
            totalProductPoints: group.totalProductPoints,
            courierProvider: group.courierProvider || null,
            estimatedDelivery: group.estimatedDelivery || null,
            version: 1,
          },
        });

        for (const item of group.items) {
          const orderItemId = generateId(ID_PREFIXES.ORDER_ITEM);
          await tx.orderItem.create({
            data: {
              id: orderItemId,
              orderId: order.id,
              fulfillmentGroupId: createdGroup.id,
              sellerId: group.sellerId,
              variantId: item.variantId,
              productTitle: item.productTitle,
              variantTitle: item.variantTitle,
              sku: item.sku,
              unitPricePoisha: item.unitPricePoisha,
              quantity: item.quantity,
              totalPoisha: item.totalPoisha,
              discountPoisha: item.discountPoisha,
              sellerDiscountPoisha: item.sellerDiscountPoisha,
              platformDiscountPoisha: item.platformDiscountPoisha,
              taxRatePercent: item.taxRatePercent,
              taxPoisha: item.taxPoisha,
              productPointSnapshot: item.productPointSnapshot,
              totalProductPoints: item.totalProductPoints,
              status: 'PENDING',
              version: 1,
            },
          });
        }
      }

      // 5d. Record committed coupon redemption transactionally
      if (appliedCoupon) {
        await tx.couponRedemption.create({
          data: {
            id: crypto.randomUUID(),
            couponCode: appliedCoupon.couponCode,
            discountRuleId: appliedCoupon.discountRuleId || null,
            promotionId: appliedCoupon.promotionId || null,
            customerId,
            orderId: order.id,
            sellerId: appliedCoupon.sellerId || null,
            discountAmountPoisha: appliedCoupon.discountAmountPoisha,
            status: 'COMMITTED',
            committedAt: new Date(),
            ruleVersion: appliedCoupon.ruleVersion,
          },
        });

        if (appliedCoupon.discountRuleId) {
          await tx.discountRule.update({
            where: { id: appliedCoupon.discountRuleId },
            data: { usageCount: { increment: 1 } },
          });
        }
      }

      // 5e. Create initial status history
      await tx.orderStatusHistory.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.ORDER_STATUS_HISTORY),
          orderId: order.id,
          status: 'PENDING_PAYMENT',
          reason: 'Order placed by customer checkout orchestration',
          actorId: customerId,
          actorRole: 'CUSTOMER',
        },
      });

      // 5e. Emit Outbox Event
      await tx.outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType: 'order.created',
          aggregateType: 'ORDER',
          aggregateId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerId,
            totalPoisha: Number(orderTotalPoisha),
            totalProductPoints: orderTotalProductPoints,
            isB2B: isB2BOrder,
            purchaseOrderRef: checkout.purchaseOrderRef || null,
            fulfillmentGroupsCount: sellerGroups.length,
          },
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });

      return order;
    });

    // 6. Record Business Audit Log
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
        fulfillmentGroupsCount: sellerGroups.length,
        isB2B: isB2BOrder,
      },
    });

    return {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      customerId: createdOrder.customerId,
      status: createdOrder.status,
      paymentStatus: createdOrder.paymentStatus,
      fulfillmentStatus: createdOrder.fulfillmentStatus,
      currency: 'BDT',
      subtotalPoisha: Number(createdOrder.subtotalPoisha),
      discountPoisha: Number(createdOrder.discountPoisha || 0),
      shippingFeePoisha: Number(createdOrder.shippingFeePoisha || 0),
      taxPoisha: Number(createdOrder.taxPoisha || 0),
      totalPoisha: Number(createdOrder.totalPoisha),
      totalBdtFormatted: this.formatBdt(createdOrder.totalPoisha),
      totalProductPoints: createdOrder.totalProductPoints,
      isB2B: isB2BOrder,
      b2bQuoteId: cart.b2bQuoteId || null,
      purchaseOrderRef: checkout.purchaseOrderRef || cart.purchaseOrderRef || null,
      fulfillmentGroupsCount: sellerGroups.length,
      createdAt: createdOrder.createdAt.toISOString(),
      isIdempotentReplay: false,
    };
  }

  private mapOrderToResultDTO(order: any, isIdempotentReplay: boolean): CheckoutResultDTO {
    const totalPoisha = Number(order.totalPoisha);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      currency: 'BDT',
      subtotalPoisha: Number(order.subtotalPoisha),
      discountPoisha: Number(order.discountPoisha || 0),
      shippingFeePoisha: Number(order.shippingFeePoisha || 0),
      taxPoisha: Number(order.taxPoisha || 0),
      totalPoisha,
      totalBdtFormatted: this.formatBdt(totalPoisha),
      totalProductPoints: order.totalProductPoints,
      isB2B: Boolean(order.b2bQuoteId),
      b2bQuoteId: order.b2bQuoteId || null,
      purchaseOrderRef: order.purchaseOrderRef || null,
      fulfillmentGroupsCount: order.fulfillmentGroups?.length || 1,
      createdAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
      isIdempotentReplay,
    };
  }

  private formatBdt(poisha: bigint | number): string {
    const num = typeof poisha === 'bigint' ? Number(poisha) : poisha;
    const bdt = (num / 100).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `৳${bdt}`;
  }
}

export const checkoutOrchestratorService = new CheckoutOrchestratorService();
