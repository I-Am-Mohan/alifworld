/**
 * Seller Fulfillment Group Repository
 *
 * Scoped database operations for merchant-isolated fulfillment groups.
 * Invariant: Every merchant query applies sellerId scope directly inside Prisma where clause.
 * Invariant: Cross-tenant access attempts throw TENANT_VIOLATION.
 */

import { prisma } from '@/shared/database/prisma';
import {
  NotFoundError,
  AuthorizationError,
} from '@/shared/errors/app-error';
import {
  SellerFulfillmentGroupDTO,
  FulfillmentGroupStatus,
  PackingSlipManifestDTO,
} from '../types/fulfillment-group.types';

export class SellerFulfillmentGroupRepository {
  private db = prisma;

  /**
   * SELLER TENANT SCOPING: Lists fulfillment groups exclusively owned by sellerId.
   */
  public async findGroupsBySellerId(
    sellerId: string,
    options: { status?: FulfillmentGroupStatus; page?: number; limit?: number } = {}
  ): Promise<{ items: SellerFulfillmentGroupDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      sellerId,
      deletedAt: null,
      ...(options.status ? { status: options.status } : {}),
    };

    const [records, total] = await Promise.all([
      (this.db as any).sellerFulfillmentGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: true,
          seller: true,
          warehouse: true,
          items: { where: { deletedAt: null } },
          shipments: {
            where: { deletedAt: null },
            include: { events: { orderBy: { occurredAt: 'desc' } } },
          },
        },
      }),
      (this.db as any).sellerFulfillmentGroup.count({ where }),
    ]);

    return {
      items: records.map(this.mapToDTO),
      total,
      page,
      limit,
    };
  }

  /**
   * SELLER TENANT SCOPING: Retrieves a single fulfillment group with sellerId in the query.
   */
  public async findGroupByIdAndSellerId(
    groupId: string,
    sellerId: string
  ): Promise<SellerFulfillmentGroupDTO> {
    // 1. Query directly with sellerId inside WHERE clause
    const sfg = await (this.db as any).sellerFulfillmentGroup.findFirst({
      where: {
        id: groupId,
        sellerId,
        deletedAt: null,
      },
      include: {
        order: true,
        seller: true,
        warehouse: true,
        items: { where: { deletedAt: null } },
        shipments: {
          where: { deletedAt: null },
          include: { events: { orderBy: { occurredAt: 'desc' } } },
        },
      },
    });

    if (sfg) {
      return this.mapToDTO(sfg);
    }

    // 2. If not found under seller, inspect whether group exists under another seller (Tenant Negative Guard)
    const existsAnywhere = await (this.db as any).sellerFulfillmentGroup.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true, sellerId: true },
    });

    if (existsAnywhere) {
      throw new AuthorizationError(
        'Tenant access violation: you do not have permission to view or manage another seller fulfillment group.',
        { code: 'TENANT_VIOLATION' }
      );
    }

    throw new NotFoundError(`Seller fulfillment group '${groupId}' not found.`);
  }

  /**
   * ADMIN INSPECTION: Retrieves fulfillment group without seller tenant restriction.
   */
  public async findGroupByIdAdmin(groupId: string): Promise<SellerFulfillmentGroupDTO> {
    const sfg = await (this.db as any).sellerFulfillmentGroup.findFirst({
      where: { id: groupId, deletedAt: null },
      include: {
        order: true,
        seller: true,
        warehouse: true,
        items: { where: { deletedAt: null } },
        shipments: {
          where: { deletedAt: null },
          include: { events: { orderBy: { occurredAt: 'desc' } } },
        },
      },
    });

    if (!sfg) {
      throw new NotFoundError(`Fulfillment group '${groupId}' not found.`);
    }

    return this.mapToDTO(sfg);
  }

  /**
   * ADMIN INSPECTION: Lists fulfillment groups across all sellers.
   */
  public async listGroupsAdmin(options: {
    sellerId?: string;
    status?: FulfillmentGroupStatus;
    page?: number;
    limit?: number;
  }): Promise<{ items: SellerFulfillmentGroupDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(options.sellerId ? { sellerId: options.sellerId } : {}),
      ...(options.status ? { status: options.status } : {}),
    };

    const [records, total] = await Promise.all([
      (this.db as any).sellerFulfillmentGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: true,
          seller: true,
          warehouse: true,
          items: { where: { deletedAt: null } },
          shipments: {
            where: { deletedAt: null },
            include: { events: { orderBy: { occurredAt: 'desc' } } },
          },
        },
      }),
      (this.db as any).sellerFulfillmentGroup.count({ where }),
    ]);

    return {
      items: records.map(this.mapToDTO),
      total,
      page,
      limit,
    };
  }

  /**
   * Updates fulfillment group status within strict seller scope.
   */
  public async updateStatus(
    groupId: string,
    sellerId: string,
    nextStatus: FulfillmentGroupStatus,
    additionalData: { deliveredAt?: Date; version?: number } = {}
  ): Promise<SellerFulfillmentGroupDTO> {
    const updated = await (this.db as any).sellerFulfillmentGroup.update({
      where: {
        id: groupId,
        sellerId, // Enforced at query level
      },
      data: {
        status: nextStatus,
        version: { increment: 1 },
        ...(additionalData.deliveredAt !== undefined ? { deliveredAt: additionalData.deliveredAt } : {}),
      },
      include: {
        order: true,
        seller: true,
        warehouse: true,
        items: { where: { deletedAt: null } },
        shipments: {
          where: { deletedAt: null },
          include: { events: { orderBy: { occurredAt: 'desc' } } },
        },
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Updates courier assignment details within strict seller scope.
   */
  public async updateCourierDetails(
    groupId: string,
    sellerId: string,
    data: {
      courierProvider: string;
      trackingNumber?: string | null;
      consignmentId?: string | null;
      pickupDate?: Date | null;
    }
  ): Promise<SellerFulfillmentGroupDTO> {
    const updated = await (this.db as any).sellerFulfillmentGroup.update({
      where: {
        id: groupId,
        sellerId, // Enforced at query level
      },
      data: {
        courierProvider: data.courierProvider,
        trackingNumber: data.trackingNumber || null,
        consignmentId: data.consignmentId || null,
        pickupDate: data.pickupDate || null,
        version: { increment: 1 },
      },
      include: {
        order: true,
        seller: true,
        warehouse: true,
        items: { where: { deletedAt: null } },
        shipments: {
          where: { deletedAt: null },
          include: { events: { orderBy: { occurredAt: 'desc' } } },
        },
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Generates packing slip manifest data for a seller fulfillment group.
   */
  public async getPackingSlipManifest(
    groupId: string,
    sellerId: string
  ): Promise<PackingSlipManifestDTO> {
    const sfg = await this.findGroupByIdAndSellerId(groupId, sellerId);

    const isCod = sfg.shippingDestination.address !== null && sfg.totalPoisha > 0;
    const totalWeightGrams = sfg.items.reduce(
      (sum, item) => sum + item.quantity * 300,
      0
    );

    return {
      groupNumber: sfg.groupNumber,
      orderNumber: sfg.orderNumber,
      orderDate: sfg.createdAt,
      seller: {
        id: sfg.sellerId,
        businessName: sfg.sellerName,
        tradeLicenseNumber: null,
        phone: null,
      },
      recipient: {
        name: sfg.shippingDestination.recipientName,
        phone: sfg.shippingDestination.recipientPhone,
        address: sfg.shippingDestination.address,
        division: sfg.shippingDestination.division,
        district: sfg.shippingDestination.district,
        upazila: sfg.shippingDestination.upazila || null,
        postalCode: sfg.shippingDestination.postalCode || null,
      },
      logistics: {
        courierProvider: sfg.courierProvider || 'STANDARD',
        consignmentId: sfg.consignmentId || null,
        trackingNumber: sfg.trackingNumber || null,
        estimatedDelivery: sfg.estimatedDelivery || null,
        totalWeightGrams,
        totalItems: sfg.items.reduce((sum, item) => sum + item.quantity, 0),
      },
      financialSummary: {
        subtotalPoisha: sfg.subtotalPoisha,
        subtotalBdtFormatted: sfg.subtotalBdtFormatted,
        shippingFeePoisha: sfg.shippingFeePoisha,
        shippingFeeBdtFormatted: sfg.shippingFeeBdtFormatted,
        taxPoisha: sfg.taxPoisha,
        taxBdtFormatted: sfg.taxBdtFormatted,
        totalPoisha: sfg.totalPoisha,
        totalBdtFormatted: sfg.totalBdtFormatted,
        isCod,
        amountToCollectPoisha: isCod ? sfg.totalPoisha : 0,
        amountToCollectBdtFormatted: isCod ? sfg.totalBdtFormatted : '৳0.00',
      },
      items: sfg.items.map((item) => ({
        sku: item.sku,
        productTitle: item.productTitle,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        unitPricePoisha: item.unitPricePoisha,
        unitPriceBdtFormatted: item.unitPriceBdtFormatted,
        totalPoisha: item.totalPoisha,
        totalBdtFormatted: item.totalBdtFormatted,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  private mapToDTO(record: any): SellerFulfillmentGroupDTO {
    const subtotal = Number(record.subtotalPoisha || 0);
    const discount = Number(record.discountPoisha || 0);
    const sellerDiscount = Number(record.sellerDiscountPoisha || 0);
    const platformDiscount = Number(record.platformDiscountPoisha || 0);
    const shipping = Number(record.shippingFeePoisha || 0);
    const tax = Number(record.taxPoisha || 0);
    const total = Number(record.totalPoisha || 0);
    const commission = Number(record.sellerCommissionPoisha || 0);
    const payout = Number(record.sellerPayoutPoisha || 0);

    const formatBdt = (poisha: number) => `৳${(poisha / 100).toFixed(2)}`;

    const items = (record.items || []).map((item: any) => {
      const unitPrice = Number(item.unitPricePoisha || 0);
      const lineTotal = Number(item.totalPoisha || 0);
      return {
        id: item.id,
        variantId: item.variantId,
        productTitle: item.productTitle,
        variantTitle: item.variantTitle,
        sku: item.sku,
        unitPricePoisha: unitPrice,
        unitPriceBdtFormatted: formatBdt(unitPrice),
        quantity: item.quantity,
        totalPoisha: lineTotal,
        totalBdtFormatted: formatBdt(lineTotal),
        discountPoisha: Number(item.discountPoisha || 0),
        sellerDiscountPoisha: Number(item.sellerDiscountPoisha || 0),
        platformDiscountPoisha: Number(item.platformDiscountPoisha || 0),
        taxRatePercent: item.taxRatePercent ? Number(item.taxRatePercent) : 0,
        taxPoisha: Number(item.taxPoisha || 0),
        productPointSnapshot: item.productPointSnapshot ?? 0,
        totalProductPoints: item.totalProductPoints ?? 0,
        status: item.status,
      };
    });

    const shipments = (record.shipments || []).map((shp: any) => {
      const cost = Number(shp.shippingCostPoisha || 0);
      return {
        id: shp.id,
        shipmentNumber: shp.shipmentNumber,
        courierProvider: shp.courierProvider,
        trackingNumber: shp.trackingNumber || null,
        consignmentId: shp.consignmentId || null,
        status: shp.status,
        weightGrams: shp.weightGrams ?? null,
        packageCount: shp.packageCount ?? 1,
        shippingCostPoisha: cost,
        shippingCostBdtFormatted: formatBdt(cost),
        shippedAt: shp.shippedAt ? new Date(shp.shippedAt).toISOString() : null,
        deliveredAt: shp.deliveredAt ? new Date(shp.deliveredAt).toISOString() : null,
      };
    });

    return {
      id: record.id,
      orderId: record.orderId,
      orderNumber: record.order?.orderNumber || record.orderId,
      sellerId: record.sellerId,
      sellerName: record.seller?.businessName || 'Verified Merchant',
      sellerSlug: record.seller?.slug || null,
      warehouseId: record.warehouseId || null,
      warehouseName: record.warehouse?.name || null,
      groupNumber: record.groupNumber,
      status: record.status as FulfillmentGroupStatus,
      subtotalPoisha: subtotal,
      subtotalBdtFormatted: formatBdt(subtotal),
      discountPoisha: discount,
      sellerDiscountPoisha: sellerDiscount,
      platformDiscountPoisha: platformDiscount,
      shippingFeePoisha: shipping,
      shippingFeeBdtFormatted: formatBdt(shipping),
      taxPoisha: tax,
      taxBdtFormatted: formatBdt(tax),
      totalPoisha: total,
      totalBdtFormatted: formatBdt(total),
      sellerCommissionPoisha: commission,
      sellerCommissionBdtFormatted: formatBdt(commission),
      sellerPayoutPoisha: payout,
      sellerPayoutBdtFormatted: formatBdt(payout),
      totalProductPoints: record.totalProductPoints ?? 0,
      courierProvider: record.courierProvider || null,
      trackingNumber: record.trackingNumber || null,
      consignmentId: record.consignmentId || null,
      pickupDate: record.pickupDate ? new Date(record.pickupDate).toISOString() : null,
      estimatedDelivery: record.estimatedDelivery
        ? new Date(record.estimatedDelivery).toISOString()
        : null,
      deliveredAt: record.deliveredAt ? new Date(record.deliveredAt).toISOString() : null,
      shippingDestination: {
        recipientName: record.order?.shippingName || '',
        recipientPhone: record.order?.shippingPhone || '',
        division: record.order?.shippingDivision || '',
        district: record.order?.shippingDistrict || '',
        upazila: record.order?.shippingUpazila || null,
        postalCode: record.order?.shippingPostalCode || null,
        address: record.order?.shippingAddress || '',
      },
      items,
      shipments,
      version: record.version ?? 1,
      createdAt: record.createdAt?.toISOString?.() || new Date(record.createdAt).toISOString(),
      updatedAt: record.updatedAt?.toISOString?.() || new Date(record.updatedAt).toISOString(),
    };
  }
}

export const sellerFulfillmentGroupRepository = new SellerFulfillmentGroupRepository();
