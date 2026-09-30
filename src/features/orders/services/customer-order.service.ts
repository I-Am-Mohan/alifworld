import { orderTransitionService } from '../state-machines/order-transition.service';
/**
 * Customer Parent Order Domain Service
 *
 * Implements:
 * 1. Customer-facing unified parent order views across all multi-vendor sellers
 * 2. Self-service ownership enforcement (customers view only their own orders)
 * 3. Privacy protection with phone masking (+88017****1234)
 * 4. Append-only chronological status timeline tracking with bilingual labels
 * 5. Customer self-service actions (cancellation before courier packaging, reordering)
 *
 * Invariant: BDT monetary values strictly in integer minor units (poisha).
 * Invariant: Product Points remain distinct discrete units with zero conversion to fiat currency.
 */

import { prisma } from '@/shared/database/prisma';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ConflictError,
} from '@/shared/errors/app-error';
import { maskBangladeshPhone } from '@/shared/utils/phone';
import { auditService } from '@/shared/audit';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  CustomerParentOrderDTO,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  SellerPackageForCustomerDTO,
  OrderLineItemSnapshotDTO,
  OrderStatusTimelineEventDTO,
  CustomerSelfServiceActionsDTO,
} from '../types/order.types';
import { QueryCustomerOrdersInput, CancelOrderInput } from '../validators/order.validators';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../state-machines/order-state-machine';

// Re-export labels for backward compatibility
export { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS };

export class CustomerOrderService {
  private db = prisma;

  /**
   * Retrieves single parent customer order by ID or order number with ownership verification.
   */
  public async getCustomerOrder(
    identifier: string,
    customerId: string
  ): Promise<CustomerParentOrderDTO> {
    const isOrderNumber = identifier.startsWith('ORD-');

    const order = await (this.db as any).order.findFirst({
      where: {
        deletedAt: null,
        ...(isOrderNumber ? { orderNumber: identifier } : { id: identifier }),
      },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            fulfillmentGroup: {
              select: {
                groupNumber: true,
                sellerId: true,
                status: true,
                courierProvider: true,
                trackingNumber: true,
              },
            },
          },
        },
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
            items: { where: { deletedAt: null } },
            shipments: {
              where: { deletedAt: null },
              include: { events: { orderBy: { occurredAt: 'desc' } } },
            },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${identifier}' not found.`);
    }

    // Strict Customer Ownership Verification
    if (order.customerId !== customerId) {
      throw new AuthorizationError(
        'You do not have permission to view orders belonging to another customer.',
        {
          code: 'OWNERSHIP_VIOLATION',
        }
      );
    }

    return this.mapToCustomerOrderDTO(order);
  }

  /**
   * Lists paginated parent orders for the customer.
   */
  public async listCustomerOrders(
    customerId: string,
    query: QueryCustomerOrdersInput
  ): Promise<{ items: CustomerParentOrderDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      customerId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [orders, total] = await Promise.all([
      (this.db as any).order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { where: { deletedAt: null } },
          fulfillmentGroups: {
            where: { deletedAt: null },
            include: {
              seller: true,
              items: { where: { deletedAt: null } },
              shipments: { where: { deletedAt: null } },
            },
          },
          statusHistory: { orderBy: { createdAt: 'asc' } },
          payments: true,
        },
      }),
      (this.db as any).order.count({ where }),
    ]);

    return {
      items: orders.map((o: any) => this.mapToCustomerOrderDTO(o)),
      total,
      page,
      limit,
    };
  }

  /**
   * Cancels parent order if eligible (before merchant handover to courier).
   */
  public async cancelCustomerOrder(
    orderId: string,
    customerId: string,
    input: CancelOrderInput,
    idempotencyKey?: string
  ): Promise<CustomerParentOrderDTO> {
    const order = await this.getCustomerOrder(orderId, customerId);
    await orderTransitionService.transitionOrderStatus({
      orderId: order.id,
      nextStatus: 'CANCELLED',
      actorId: customerId,
      actorRole: 'CUSTOMER',
      reason: input.reason,
      idempotencyKey,
    });
    return this.getCustomerOrder(orderId, customerId);
  }

  private mapToCustomerOrderDTO(record: any): CustomerParentOrderDTO {
    const subtotal = Number(record.subtotalPoisha || 0);
    const discount = Number(record.discountPoisha || 0);
    const sellerDiscount = Number(record.sellerDiscountPoisha || 0);
    const platformDiscount = Number(record.platformDiscountPoisha || 0);
    const shipping = Number(record.shippingFeePoisha || 0);
    const tax = Number(record.taxPoisha || 0);
    const total = Number(record.totalPoisha || 0);

    const formatBdt = (poisha: number) => `৳${(poisha / 100).toFixed(2)}`;

    // Self-service actions evaluation
    const canCancel =
      record.status === 'PENDING_PAYMENT' ||
      (record.status === 'PROCESSING' &&
        (record.fulfillmentGroups || []).every(
          (g: any) => g.status === 'PENDING' || g.status === 'ACCEPTED'
        ));

    let cancelRestrictionReasonEn = null;
    let cancelRestrictionReasonBn = null;
    if (!canCancel && record.status !== 'CANCELLED' && record.status !== 'COMPLETED') {
      cancelRestrictionReasonEn =
        'Order has already entered packaging or courier dispatch and cannot be cancelled self-service.';
      cancelRestrictionReasonBn =
        'অর্ডারটি প্যাকেজিং বা কুরিয়ারে হস্তান্তরের জন্য নির্ধারিত হওয়ায় স্বয়ংক্রিয়ভাবে বাতিল করা সম্ভব নয়।';
    }

    const maskedPhone = maskBangladeshPhone(record.shippingPhone);

    const packages: SellerPackageForCustomerDTO[] = (record.fulfillmentGroups || []).map(
      (g: any) => {
        const pkgItems: OrderLineItemSnapshotDTO[] = (g.items || []).map((i: any) => {
          const uPrice = Number(i.unitPricePoisha || 0);
          const lTotal = Number(i.totalPoisha || 0);
          return {
            id: i.id,
            orderId: record.id,
            fulfillmentGroupId: g.id,
            sellerId: g.sellerId,
            sellerName: g.seller?.businessName,
            variantId: i.variantId,
            productTitle: i.productTitle,
            variantTitle: i.variantTitle,
            sku: i.sku,
            unitPricePoisha: uPrice,
            unitPriceBdtFormatted: formatBdt(uPrice),
            quantity: i.quantity,
            totalPoisha: lTotal,
            totalBdtFormatted: formatBdt(lTotal),
            discountPoisha: Number(i.discountPoisha || 0),
            sellerDiscountPoisha: Number(i.sellerDiscountPoisha || 0),
            platformDiscountPoisha: Number(i.platformDiscountPoisha || 0),
            taxRatePercent: i.taxRatePercent ? Number(i.taxRatePercent) : 0,
            taxPoisha: Number(i.taxPoisha || 0),
            taxBdtFormatted: formatBdt(Number(i.taxPoisha || 0)),
            productPointSnapshot: i.productPointSnapshot || 0,
            totalProductPoints: i.totalProductPoints || 0,
            status: i.status || 'PENDING',
            imageUrl: i.imageUrl || null,
          };
        });

        const groupSub = Number(g.subtotalPoisha || 0);
        const groupShip = Number(g.shippingFeePoisha || 0);
        const groupTax = Number(g.taxPoisha || 0);
        const groupTot = Number(g.totalPoisha || 0);

        const statusLabels = ORDER_STATUS_LABELS[g.status as keyof typeof ORDER_STATUS_LABELS] || {
          en: g.status,
          bn: g.status,
        };

        const trackingNumber = g.trackingNumber || g.shipments?.[0]?.trackingNumber || null;
        let trackingUrl = null;
        if (trackingNumber) {
          trackingUrl = `/shipping/track/${trackingNumber}`;
        }

        return {
          id: g.id,
          groupNumber: g.groupNumber,
          sellerId: g.sellerId,
          sellerName: g.seller?.businessName || 'Verified Merchant',
          sellerSlug: g.seller?.slug || null,
          status: g.status,
          statusLabelEn: statusLabels.en,
          statusLabelBn: statusLabels.bn,
          subtotalPoisha: groupSub,
          subtotalBdtFormatted: formatBdt(groupSub),
          shippingFeePoisha: groupShip,
          shippingFeeBdtFormatted: formatBdt(groupShip),
          isFreeShipping: groupShip === 0,
          courierProvider: g.courierProvider || g.shipments?.[0]?.courierProvider || null,
          trackingNumber,
          consignmentId: g.consignmentId || g.shipments?.[0]?.consignmentId || null,
          trackingUrl,
          estimatedDelivery: g.estimatedDelivery
            ? new Date(g.estimatedDelivery).toISOString()
            : null,
          items: pkgItems,
        };
      }
    );

    const allItems: OrderLineItemSnapshotDTO[] = packages.flatMap((p) => p.items);

    const timeline: OrderStatusTimelineEventDTO[] = (record.statusHistory || [])
      .filter(
        (history: any) =>
          history.metadata?.kind !== 'transition_receipt' &&
          !history.metadata?.fulfillmentGroupId &&
          !history.metadata?.orderItemId
      )
      .map((h: any) => {
        const labels = ORDER_STATUS_LABELS[h.toStatus as keyof typeof ORDER_STATUS_LABELS] || {
          en: h.toStatus,
          bn: h.toStatus,
        };
        return {
          id: h.id,
          fromStatus: h.fromStatus || null,
          toStatus: h.toStatus,
          statusLabelEn: labels.en,
          statusLabelBn: labels.bn,
          actorRole: h.actorRole || 'SYSTEM',
          reason: h.reason || null,
          occurredAt: h.createdAt?.toISOString?.() || new Date(h.createdAt).toISOString(),
        };
      });

    const payments = (record.payments || []).map((p: any) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      gatewayProvider: p.gatewayProvider,
      status: p.status,
      amountPoisha: Number(p.amountPoisha),
      amountBdtFormatted: formatBdt(Number(p.amountPoisha)),
      capturedAt: p.capturedAt ? new Date(p.capturedAt).toISOString() : null,
    }));

    const statusEn =
      ORDER_STATUS_LABELS[record.status as keyof typeof ORDER_STATUS_LABELS]?.en || record.status;
    const statusBn =
      ORDER_STATUS_LABELS[record.status as keyof typeof ORDER_STATUS_LABELS]?.bn || record.status;
    const payStatusEn =
      PAYMENT_STATUS_LABELS[record.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS]?.en ||
      record.paymentStatus;
    const payStatusBn =
      PAYMENT_STATUS_LABELS[record.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS]?.bn ||
      record.paymentStatus;

    return {
      id: record.id,
      orderNumber: record.orderNumber,
      customerId: record.customerId,
      status: record.status as OrderStatus,
      statusLabelEn: statusEn,
      statusLabelBn: statusBn,
      paymentStatus: record.paymentStatus as PaymentStatus,
      paymentStatusLabelEn: payStatusEn,
      paymentStatusLabelBn: payStatusBn,
      fulfillmentStatus: record.fulfillmentStatus as FulfillmentStatus,
      currency: 'BDT',
      financialSummary: {
        subtotalPoisha: subtotal,
        subtotalBdtFormatted: formatBdt(subtotal),
        discountPoisha: discount,
        discountBdtFormatted: formatBdt(discount),
        sellerDiscountPoisha: sellerDiscount,
        platformDiscountPoisha: platformDiscount,
        shippingFeePoisha: shipping,
        shippingFeeBdtFormatted: formatBdt(shipping),
        taxPoisha: tax,
        taxBdtFormatted: formatBdt(tax),
        totalPoisha: total,
        totalBdtFormatted: formatBdt(total),
        totalProductPoints: record.totalProductPoints || 0,
      },
      shippingDestination: {
        recipientName: record.shippingName,
        recipientPhone: record.shippingPhone,
        recipientPhoneMasked: maskedPhone,
        division: record.shippingDivision,
        district: record.shippingDistrict,
        upazila: record.shippingUpazila || null,
        address: record.shippingAddress,
        postalCode: record.shippingPostalCode || null,
      },
      billingAddress: record.billingAddress || null,
      customerNotes: record.customerNotes || null,
      ruleVersion: record.ruleVersion || 'v1.0.0',
      packages,
      items: allItems,
      statusHistory: timeline,
      payments,
      selfServiceActions: {
        canCancel,
        cancelRestrictionReasonEn,
        cancelRestrictionReasonBn,
        canDownloadInvoice: record.paymentStatus === 'PAID' || record.status === 'CONFIRMED',
        canReorder: true,
        canRequestReturn: record.status === 'DELIVERED',
      },
      createdAt: record.createdAt?.toISOString?.() || new Date(record.createdAt).toISOString(),
      updatedAt: record.updatedAt?.toISOString?.() || new Date(record.updatedAt).toISOString(),
    };
  }
}

export const customerOrderService = new CustomerOrderService();
