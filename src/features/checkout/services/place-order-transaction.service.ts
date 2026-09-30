/**
 * Authoritative Place-Order Transaction Engine
 *
 * Implements:
 * 1. Server-side atomic place-order transaction (ACID boundary)
 * 2. Strict idempotency enforcement and replay detection
 * 3. Mandatory customer consent verification (Terms, Privacy, Returns, COD Agreement)
 * 4. Concurrent stock & price revalidation
 * 5. Multi-vendor seller fulfillment group partitioning
 * 6. Explicit state transitions & append-only order status history
 * 7. Transactional wallet balance debiting or gateway payment record creation
 * 8. Outbox event publishing and business audit logging
 *
 * Invariant: Client totals strictly ignored; all financial calculations performed server-side.
 * Invariant: Product price (poisha) and Product Points are independent units.
 * Invariant: Customers see unified parent order; merchants see only their scoped fulfillment groups.
 */

import { createHash } from 'crypto';
import { prisma } from '@/shared/database/prisma';
import { generateId, generatePrefixedId, ID_PREFIXES, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
} from '@/shared/errors/app-error';
import { auditService } from '@/shared/audit';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';
import { PlaceOrderRequestDTO, PlacedOrderResultDTO } from '../types/order-review.types';
import { PlaceOrderInput } from '../validators/order-review.validators';
import { serverCheckoutCalculationService } from './server-checkout-calculation.service';
import { codFraudRiskService } from './cod-fraud-risk.service';
import { paymentMethodDiscoveryService } from '@/features/payment/services/payment-method-discovery.service';
import { customerAccountService } from '@/features/customers/services/customer-account.service';

export class PlaceOrderTransactionService {
  private db = prisma;
  private calculationService = serverCheckoutCalculationService;

  /**
   * Executes the authoritative place-order transaction atomically.
   */
  public async placeOrder(
    input: PlaceOrderInput,
    customerId: string,
    clientIp?: string | null
  ): Promise<PlacedOrderResultDTO> {
    const {
      cartId,
      recipient,
      paymentMethod,
      couponCode,
      codVerificationToken,
      consent,
      idempotencyKey,
    } = input;

    // 1. Mandatory Regulatory & Consumer Legal Consent Verification
    if (!consent.termsAccepted || !consent.privacyAccepted || !consent.returnPolicyAccepted) {
      throw new ValidationError(
        'You must explicitly accept the Terms & Conditions, Privacy Policy, and Return Policy to place an order.'
      );
    }

    if (paymentMethod.toUpperCase() === 'COD' && consent.codAgreementAccepted !== true) {
      throw new ValidationError(
        'You must explicitly agree to the Cash on Delivery Commitment Terms to place a COD order.'
      );
    }

    // 2. Deterministic Idempotency Key & Order Number Computation
    const normalizedPhone = normalizeBangladeshPhone(recipient.phone);
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify([
          cartId,
          customerId,
          idempotencyKey,
          normalizedPhone,
          recipient.address,
          paymentMethod,
        ])
      )
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    const orderNumber = `ORD-${dateStamp}-${requestHash}`;

    // 3. Idempotent Replay Protection: Check if order was already committed
    const existingOrder = await (this.db as any).order.findFirst({
      where: { orderNumber, deletedAt: null },
      include: {
        fulfillmentGroups: { where: { deletedAt: null } },
        payments: { where: { deletedAt: null } },
      },
    });

    if (existingOrder) {
      if (existingOrder.customerId !== customerId) {
        throw new ConflictError('Idempotency key collision: already utilized by another customer.');
      }
      return this.mapOrderToResultDTO(existingOrder, true);
    }

    // 4. Fetch Cart and Verify Ownership
    const cart = await (this.db as any).cart.findFirst({
      where: { id: cartId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            variant: {
              include: {
                product: { include: { seller: true } },
                stockBalances: { where: { deletedAt: null } },
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
      throw new AuthorizationError('You do not have permission to place an order from this cart.', {
        code: 'OWNERSHIP_VIOLATION',
      });
    }

    if (cart.items.length === 0) {
      throw new ValidationError('Cannot place an order with an empty shopping cart.');
    }

    if (cart.status !== 'ACTIVE') {
      throw new ConflictError('Shopping cart is no longer active for checkout.');
    }

    // 5. Authoritative Server-Side Calculation (Pricing, Discounts, VAT, Shipping, Points)
    const calculation = await this.calculationService.calculateCheckout(
      {
        cartId: cart.id,
        shippingAddress: {
          division: recipient.division,
          district: recipient.district,
          upazila: recipient.upazila,
          postalCode: recipient.postalCode,
          streetAddress: recipient.address,
        },
        couponCode: couponCode || cart.appliedCouponCode || undefined,
        shippingMethod: 'STANDARD',
      },
      { customerId }
    );

    // 6. Cash on Delivery (COD) Fraud-Risk Gating & Prepayment Enforcement
    if (paymentMethod.toUpperCase() === 'COD') {
      const hasDigital = cart.items.some((i: any) => i.variant?.product?.isPhysical === false);
      const codEvaluation = await codFraudRiskService.evaluateCodEligibility(
        {
          recipientPhone: normalizedPhone,
          orderSubtotalPoisha: calculation.subtotalPoisha,
          division: recipient.division,
          district: recipient.district,
          upazila: recipient.upazila || undefined,
          hasDigitalItems: hasDigital,
          cartId: cart.id,
          clientIp: clientIp || undefined,
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

      if (codEvaluation.requiresOtpVerification && !codVerificationToken) {
        throw new ValidationError(
          'Phone verification via SMS OTP is required before Cash on Delivery order placement.',
          { code: 'COD_OTP_REQUIRED', requiresOtp: true }
        );
      }
    }

    // 7. Atomic Place-Order Database Transaction
    const orderId = generatePrefixedId(ENTITY_PREFIXES.ORDER);
    const orderTotalBigInt = BigInt(calculation.totalPoisha);

    const createdOrder = await (this.db as any).$transaction(async (tx: any) => {
      // 7a. Claim and convert cart optimistically
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
        throw new ConflictError(
          'Cart was modified concurrently or is no longer available for checkout.'
        );
      }

      // 7b. Customer Wallet Balance Processing
      let orderPaymentStatus = 'UNPAID';
      let orderInitialStatus = 'PENDING_PAYMENT';

      if (paymentMethod.toUpperCase() === 'CUSTOMER_WALLET') {
        const wallet = await tx.wallet.findFirst({
          where: { userId: customerId, type: 'MAIN', status: 'ACTIVE' },
        });

        if (!wallet || wallet.availablePoisha < orderTotalBigInt) {
          throw new ValidationError('Insufficient AlifWorld wallet balance to complete order.');
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availablePoisha: { decrement: orderTotalBigInt },
            version: { increment: 1 },
          },
        });

        orderPaymentStatus = 'PAID';
        orderInitialStatus = 'PROCESSING';
      }

      // 7c. Create parent Order record
      const order = await tx.order.create({
        data: {
          id: orderId,
          orderNumber,
          customerId,
          currency: 'BDT',
          status: orderInitialStatus,
          paymentStatus: orderPaymentStatus,
          fulfillmentStatus: 'UNFULFILLED',
          subtotalPoisha: BigInt(calculation.subtotalPoisha),
          discountPoisha: BigInt(calculation.discountPoisha),
          sellerDiscountPoisha: BigInt(calculation.sellerDiscountPoisha),
          platformDiscountPoisha: BigInt(calculation.platformDiscountPoisha),
          shippingFeePoisha: BigInt(calculation.shippingFeePoisha),
          taxPoisha: BigInt(calculation.taxPoisha),
          totalPoisha: orderTotalBigInt,
          totalProductPoints: calculation.totalProductPoints,
          shippingName: recipient.name,
          shippingPhone: normalizedPhone,
          shippingDivision: recipient.division,
          shippingDistrict: recipient.district,
          shippingUpazila: recipient.upazila || null,
          shippingAddress: recipient.address,
          shippingPostalCode: recipient.postalCode || null,
          billingAddress: null,
          customerNotes: recipient.customerNotes || null,
          ruleVersion: calculation.appliedRuleVersion || 'v1.0.0',
          version: 1,
        },
      });

      // 7d. Create Multi-Vendor Seller Fulfillment Groups & Item Snapshots
      for (const group of calculation.sellerGroups) {
        const groupId = generateId(ID_PREFIXES.FULFILLMENT_GROUP);

        const createdGroup = await tx.sellerFulfillmentGroup.create({
          data: {
            id: groupId,
            orderId: order.id,
            sellerId: group.sellerId,
            groupNumber: group.groupNumber,
            status: 'PENDING',
            subtotalPoisha: BigInt(group.subtotalPoisha),
            discountPoisha: BigInt(group.discountPoisha),
            sellerDiscountPoisha: BigInt(group.sellerDiscountPoisha),
            platformDiscountPoisha: BigInt(group.platformDiscountPoisha),
            shippingFeePoisha: BigInt(group.shippingFeePoisha),
            taxPoisha: BigInt(group.taxPoisha),
            totalPoisha: BigInt(group.totalPoisha),
            sellerCommissionPoisha: BigInt(group.sellerCommissionPoisha),
            sellerPayoutPoisha: BigInt(group.sellerPayoutPoisha),
            totalProductPoints: group.totalProductPoints,
            courierProvider: group.courierProvider || null,
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
              unitPricePoisha: BigInt(item.unitPricePoisha),
              quantity: item.quantity,
              totalPoisha: BigInt(item.lineTotalPoisha),
              discountPoisha: BigInt(item.discountPoisha),
              sellerDiscountPoisha: BigInt(item.sellerDiscountPoisha),
              platformDiscountPoisha: BigInt(item.platformDiscountPoisha),
              taxRatePercent: item.taxRatePercent,
              taxPoisha: BigInt(item.taxPoisha),
              productPointSnapshot: item.productPointSnapshot,
              totalProductPoints: item.totalProductPoints,
              status: 'PENDING',
              version: 1,
            },
          });
        }
      }

      // 7e. Append-Only Order Status History Log with Consent Snapshot
      await tx.orderStatusHistory.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.ORDER_STATUS_HISTORY),
          orderId: order.id,
          fromStatus: null,
          toStatus: orderInitialStatus,
          reason: 'Order placed by customer checkout orchestration',
          actorId: customerId,
          actorRole: 'CUSTOMER',
          metadata: {
            consent: {
              termsAccepted: consent.termsAccepted,
              termsVersion: consent.termsVersion,
              privacyAccepted: consent.privacyAccepted,
              privacyVersion: consent.privacyVersion,
              returnPolicyAccepted: consent.returnPolicyAccepted,
              returnPolicyVersion: consent.returnPolicyVersion,
              codAgreementAccepted: consent.codAgreementAccepted ?? null,
              acceptedAt: new Date().toISOString(),
              clientIp: clientIp || null,
            },
            paymentMethod,
          },
        },
      });

      // 7f. Initial Inward Payment Record
      const isPaid = orderPaymentStatus === 'PAID';
      const paymentNumber = `PAY-${dateStamp}-${requestHash.slice(0, 8)}`;

      if (tx.payment) {
        await tx.payment.create({
          data: {
            id: generateId(ID_PREFIXES.PAYMENT),
            orderId: order.id,
            customerId,
            paymentNumber,
            gatewayProvider: paymentMethod.toUpperCase(),
            status: isPaid ? 'CAPTURED' : 'PENDING',
            amountPoisha: orderTotalBigInt,
            currency: 'BDT',
            feePoisha: 0n,
            idempotencyKey: `pay_${idempotencyKey}`,
            clientIp: clientIp || null,
            capturedAt: isPaid ? new Date() : null,
            authorizedAt: isPaid ? new Date() : null,
          },
        });
      }

      // 7g. Commit Coupon Redemption (if applied)
      if (calculation.coupon) {
        await tx.couponRedemption.create({
          data: {
            id: crypto.randomUUID(),
            couponCode: calculation.coupon.couponCode,
            discountRuleId: calculation.coupon.discountRuleId || null,
            promotionId: calculation.coupon.promotionId || null,
            customerId,
            orderId: order.id,
            sellerId: calculation.coupon.sellerId || null,
            discountAmountPoisha: BigInt(calculation.coupon.discountAmountPoisha),
            status: 'COMMITTED',
            committedAt: new Date(),
            ruleVersion: calculation.coupon.ruleVersion,
          },
        });

        if (calculation.coupon.discountRuleId) {
          await tx.discountRule.update({
            where: { id: calculation.coupon.discountRuleId },
            data: { usageCount: { increment: 1 } },
          });
        }
      }

      // 7h. Emit Outbox Event for Asynchronous Processing
      await tx.outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType: 'order.placed',
          aggregateType: 'ORDER',
          aggregateId: order.id,
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerId,
            totalPoisha: calculation.totalPoisha,
            totalProductPoints: calculation.totalProductPoints,
            paymentMethod,
            paymentStatus: orderPaymentStatus,
            fulfillmentPackagesCount: calculation.sellerGroups.length,
            recipientPhone: normalizedPhone,
            placedAt: new Date().toISOString(),
          },
        },
      });

      return order;
    });

    // 8. Update Customer Profile Consent Record
    try {
      await customerAccountService.updateCustomerConsent(customerId, {
        termsAccepted: consent.termsAccepted,
        termsVersion: consent.termsVersion,
        privacyAccepted: consent.privacyAccepted,
        privacyVersion: consent.privacyVersion,
        marketingConsent: Boolean(consent.marketingConsent),
      });
    } catch {
      // Non-blocking secondary profile sync
    }

    // 9. Immutable Audit Logging
    await auditService.logBusinessEvent({
      action: 'ORDER_PLACED',
      resource: 'ORDER',
      resourceId: createdOrder.id,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      metadata: {
        orderNumber: createdOrder.orderNumber,
        totalPoisha: calculation.totalPoisha,
        totalProductPoints: calculation.totalProductPoints,
        paymentMethod,
        consentVersion: consent.termsVersion,
        clientIp: clientIp || null,
      },
    });

    // 10. Gateway Selection Details
    const selection = await paymentMethodDiscoveryService.selectPaymentMethod({
      orderId: createdOrder.id,
      paymentMethod: paymentMethod as any,
    });

    return {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      customerId,
      status: createdOrder.status,
      paymentStatus: createdOrder.paymentStatus,
      fulfillmentStatus: createdOrder.fulfillmentStatus,
      currency: 'BDT',
      financialSummary: {
        subtotalPoisha: calculation.subtotalPoisha,
        subtotalBdtFormatted: calculation.subtotalBdtFormatted,
        discountPoisha: calculation.discountPoisha,
        discountBdtFormatted: calculation.discountBdtFormatted,
        shippingFeePoisha: calculation.shippingFeePoisha,
        shippingFeeBdtFormatted: calculation.shippingFeeBdtFormatted,
        taxPoisha: calculation.taxPoisha,
        taxBdtFormatted: calculation.taxBdtFormatted,
        totalPoisha: calculation.totalPoisha,
        totalBdtFormatted: calculation.totalBdtFormatted,
        totalProductPoints: calculation.totalProductPoints,
      },
      payment: {
        paymentMethod: paymentMethod.toUpperCase(),
        paymentNumber: `PAY-${dateStamp}-${requestHash.slice(0, 8)}`,
        status: createdOrder.paymentStatus === 'PAID' ? 'CAPTURED' : 'PENDING',
        requiresRedirect: selection.requiresAction && selection.actionType === 'REDIRECT',
        redirectUrl: selection.redirectUrl,
        instructionsEn: selection.instructionsEn,
        instructionsBn: selection.instructionsBn,
      },
      fulfillmentPackagesCount: calculation.sellerGroups.length,
      consentSnapshot: {
        termsVersion: consent.termsVersion,
        privacyVersion: consent.privacyVersion,
        returnPolicyVersion: consent.returnPolicyVersion,
        acceptedAt: new Date().toISOString(),
      },
      isIdempotentReplay: false,
      placedAt: createdOrder.createdAt.toISOString(),
    };
  }

  private mapOrderToResultDTO(order: any, isIdempotentReplay: boolean): PlacedOrderResultDTO {
    const total = Number(order.totalPoisha);
    const subtotal = Number(order.subtotalPoisha);
    const discount = Number(order.discountPoisha || 0);
    const shipping = Number(order.shippingFeePoisha || 0);
    const tax = Number(order.taxPoisha || 0);

    const formatBdt = (poisha: number) => `৳${(poisha / 100).toFixed(2)}`;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      currency: 'BDT',
      financialSummary: {
        subtotalPoisha: subtotal,
        subtotalBdtFormatted: formatBdt(subtotal),
        discountPoisha: discount,
        discountBdtFormatted: formatBdt(discount),
        shippingFeePoisha: shipping,
        shippingFeeBdtFormatted: formatBdt(shipping),
        taxPoisha: tax,
        taxBdtFormatted: formatBdt(tax),
        totalPoisha: total,
        totalBdtFormatted: formatBdt(total),
        totalProductPoints: order.totalProductPoints,
      },
      payment: {
        paymentMethod: order.payments?.[0]?.gatewayProvider || 'COD',
        paymentNumber: order.payments?.[0]?.paymentNumber || '',
        status: order.payments?.[0]?.status || 'PENDING',
        requiresRedirect: false,
        redirectUrl: null,
        instructionsEn: 'Order placed successfully.',
        instructionsBn: 'অর্ডার সফলভাবে সম্পন্ন হয়েছে।',
      },
      fulfillmentPackagesCount: order.fulfillmentGroups?.length || 1,
      consentSnapshot: {
        termsVersion: order.ruleVersion || 'v1.0.0',
        privacyVersion: order.ruleVersion || 'v1.0.0',
        returnPolicyVersion: order.ruleVersion || 'v1.0.0',
        acceptedAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
      },
      isIdempotentReplay,
      placedAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
    };
  }
}

export const placeOrderTransactionService = new PlaceOrderTransactionService();
