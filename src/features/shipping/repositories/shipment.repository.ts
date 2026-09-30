/**
 * Shipment & Logistics Event Repository
 *
 * Scoped Prisma queries for physical parcel shipments and immutable tracking event history.
 * Invariant: Soft deletion preserved with deletedAt timestamp.
 * Invariant: Shipment events are append-only.
 */

import { prisma } from '@/shared/database/prisma';
import { maskBangladeshPhone } from '@/shared/utils/phone';
import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';
import {
  ShipmentDTO,
  ShipmentStatus,
  SHIPMENT_STATUS_LABELS,
  TrackingTimelineEventDTO,
} from '../types/courier.types';

export interface CreateShipmentDbInput {
  id?: string;
  fulfillmentGroupId: string;
  sellerId: string;
  shipmentNumber: string;
  courierProvider: string;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  status: string;
  weightGrams?: number | null;
  packageCount?: number;
  shippingCostPoisha?: bigint;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  division: string;
  district: string;
}

export class ShipmentRepository {
  private db = prisma;

  /**
   * Creates a new shipment and logs the initial lifecycle event atomically.
   */
  public async createShipment(
    input: CreateShipmentDbInput,
    initialEventDescription = 'Shipment created and registered for dispatch',
    transaction?: any
  ): Promise<any> {
    const persist = async (tx: any) => {
      const shipment = await tx.shipment.create({
        data: {
          id: input.id,
          fulfillmentGroupId: input.fulfillmentGroupId,
          sellerId: input.sellerId,
          shipmentNumber: input.shipmentNumber,
          courierProvider: input.courierProvider,
          trackingNumber: input.trackingNumber || null,
          consignmentId: input.consignmentId || null,
          status: input.status,
          weightGrams: input.weightGrams ?? null,
          packageCount: input.packageCount ?? 1,
          shippingCostPoisha: input.shippingCostPoisha ?? 0n,
          recipientName: input.recipientName,
          recipientPhone: input.recipientPhone,
          deliveryAddress: input.deliveryAddress,
          division: input.division,
          district: input.district,
        },
      });

      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: input.status,
          location: 'Origin Logistics Center',
          description: initialEventDescription,
        },
      });

      return shipment;
    };
    return transaction ? persist(transaction) : (this.db as any).$transaction(persist);
  }

  /**
   * Finds shipment by its unique shipment number.
   */
  public async findByShipmentNumber(shipmentNumber: string): Promise<any | null> {
    return (this.db as any).shipment.findFirst({
      where: { shipmentNumber, deletedAt: null },
      include: {
        events: { orderBy: { occurredAt: 'desc' } },
        fulfillmentGroup: {
          include: {
            order: true,
            seller: true,
          },
        },
      },
    });
  }

  /**
   * Finds shipment by its consignment ID.
   */
  public async findByConsignmentId(consignmentId: string): Promise<any | null> {
    return (this.db as any).shipment.findFirst({
      where: { consignmentId, deletedAt: null },
      include: {
        events: { orderBy: { occurredAt: 'desc' } },
        fulfillmentGroup: {
          include: {
            order: true,
            seller: true,
          },
        },
      },
    });
  }

  /**
   * Finds shipment by tracking number.
   */
  public async findByTrackingNumber(trackingNumber: string): Promise<any | null> {
    return (this.db as any).shipment.findFirst({
      where: { trackingNumber, deletedAt: null },
      include: {
        events: { orderBy: { occurredAt: 'desc' } },
        fulfillmentGroup: {
          include: {
            order: true,
            seller: true,
          },
        },
      },
    });
  }

  /**
   * Finds shipment by ID.
   */
  public async findById(id: string): Promise<any | null> {
    return (this.db as any).shipment.findFirst({
      where: { id, deletedAt: null },
      include: {
        events: { orderBy: { occurredAt: 'desc' } },
        fulfillmentGroup: {
          include: {
            order: true,
            seller: true,
          },
        },
      },
    });
  }

  /**
   * Finds existing shipment for a seller fulfillment group.
   */
  public async findByFulfillmentGroupId(fulfillmentGroupId: string): Promise<any | null> {
    return (this.db as any).shipment.findFirst({
      where: { fulfillmentGroupId, deletedAt: null },
      include: {
        events: { orderBy: { occurredAt: 'desc' } },
      },
    });
  }

  /**
   * Updates shipment status and appends a corresponding tracking event.
   */
  public async updateStatusWithEvent(
    shipmentId: string,
    status: string,
    event: {
      description: string;
      location?: string | null;
      carrierPayload?: any;
      occurredAt?: Date;
    },
    additionalData: {
      shippedAt?: Date | null;
      deliveredAt?: Date | null;
      consignmentId?: string | null;
      trackingNumber?: string | null;
    } = {},
    transaction?: any
  ): Promise<any> {
    const persist = async (tx: any) => {
      const updateData: any = {
        status,
        version: { increment: 1 },
        ...(additionalData.shippedAt !== undefined ? { shippedAt: additionalData.shippedAt } : {}),
        ...(additionalData.deliveredAt !== undefined
          ? { deliveredAt: additionalData.deliveredAt }
          : {}),
        ...(additionalData.consignmentId ? { consignmentId: additionalData.consignmentId } : {}),
        ...(additionalData.trackingNumber ? { trackingNumber: additionalData.trackingNumber } : {}),
      };

      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: updateData,
      });

      await tx.shipmentEvent.create({
        data: {
          shipmentId,
          status,
          location: event.location || null,
          description: event.description,
          carrierPayload: event.carrierPayload || undefined,
          occurredAt: event.occurredAt || new Date(),
        },
      });

      return updated;
    };
    return transaction ? persist(transaction) : (this.db as any).$transaction(persist);
  }

  /**
   * Appends an event to the shipment's history.
   */
  public async appendEvent(
    shipmentId: string,
    event: {
      status: string;
      description: string;
      location?: string | null;
      carrierPayload?: any;
      occurredAt?: Date;
    }
  ): Promise<any> {
    return (this.db as any).shipmentEvent.create({
      data: {
        shipmentId,
        status: event.status,
        location: event.location || null,
        description: event.description,
        carrierPayload: event.carrierPayload || undefined,
        occurredAt: event.occurredAt || new Date(),
      },
    });
  }

  /**
   * Lists shipments with pagination and tenant filtering.
   */
  public async listShipments(params: {
    sellerId?: string | null;
    status?: string;
    courierProvider?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(params.sellerId ? { sellerId: params.sellerId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.courierProvider ? { courierProvider: params.courierProvider } : {}),
    };

    const [items, total] = await Promise.all([
      (this.db as any).shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          events: { orderBy: { occurredAt: 'desc' }, take: 1 },
          fulfillmentGroup: {
            select: {
              groupNumber: true,
              status: true,
              totalPoisha: true,
            },
          },
        },
      }),
      (this.db as any).shipment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * SELLER TENANT SCOPING: Retrieves a single shipment with sellerId in the query.
   */
  public async findShipmentByIdAndSellerId(
    idOrNumber: string,
    sellerId: string
  ): Promise<ShipmentDTO> {
    const isShipmentNumber = idOrNumber.startsWith('SHP-');

    // 1. Query with sellerId directly in WHERE clause
    const shipment = await (this.db as any).shipment.findFirst({
      where: {
        sellerId,
        deletedAt: null,
        ...(isShipmentNumber ? { shipmentNumber: idOrNumber } : { id: idOrNumber }),
      },
      include: {
        events: { orderBy: { occurredAt: 'desc' } },
        fulfillmentGroup: {
          include: {
            order: true,
            seller: true,
          },
        },
      },
    });

    if (shipment) {
      return this.mapToDTO(shipment);
    }

    // 2. If not found under seller, inspect whether shipment exists under another seller
    const existsAnywhere = await (this.db as any).shipment.findFirst({
      where: {
        deletedAt: null,
        ...(isShipmentNumber ? { shipmentNumber: idOrNumber } : { id: idOrNumber }),
      },
      select: { id: true, sellerId: true },
    });

    if (existsAnywhere) {
      throw new AuthorizationError(
        'Tenant access violation: you do not have permission to view or manage another seller shipment.',
        { code: 'TENANT_VIOLATION' }
      );
    }

    throw new NotFoundError(`Shipment '${idOrNumber}' not found.`);
  }

  /**
   * ADMIN / PRIVILEGED: Retrieves a single shipment with full details.
   */
  public async findShipmentDTO(idOrNumber: string): Promise<ShipmentDTO> {
    const isShipmentNumber = idOrNumber.startsWith('SHP-');
    const shipment = await (this.db as any).shipment.findFirst({
      where: {
        deletedAt: null,
        ...(isShipmentNumber ? { shipmentNumber: idOrNumber } : { id: idOrNumber }),
      },
      include: {
        events: { orderBy: { occurredAt: 'desc' } },
        fulfillmentGroup: {
          include: {
            order: true,
            seller: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundError(`Shipment '${idOrNumber}' not found.`);
    }

    return this.mapToDTO(shipment);
  }

  /**
   * Maps a database shipment record with relations to a strongly-typed ShipmentDTO.
   */
  public mapToDTO(record: any): ShipmentDTO {
    const shippingCost = Number(record.shippingCostPoisha || 0);
    const formatBdt = (poisha: number) => `৳${(poisha / 100).toFixed(2)}`;

    const status = record.status as ShipmentStatus;
    const labels = SHIPMENT_STATUS_LABELS[status] || {
      en: record.status,
      bn: record.status,
    };

    const events: TrackingTimelineEventDTO[] = (record.events || []).map((e: any) => ({
      status: e.status as ShipmentStatus,
      location: e.location || null,
      description: e.description,
      occurredAt: e.occurredAt?.toISOString?.() || new Date(e.occurredAt).toISOString(),
      carrierPayload: null, // Redacted for security & privacy
    }));

    const trackingNumber = record.trackingNumber || null;
    let trackingUrl: string | null = null;
    if (trackingNumber) {
      trackingUrl = `/shipping/track/${trackingNumber}`;
    }

    return {
      id: record.id,
      fulfillmentGroupId: record.fulfillmentGroupId,
      sellerId: record.sellerId,
      sellerName: record.fulfillmentGroup?.seller?.businessName || null,
      orderNumber: record.fulfillmentGroup?.order?.orderNumber || null,
      groupNumber: record.fulfillmentGroup?.groupNumber || null,
      shipmentNumber: record.shipmentNumber,
      courierProvider: record.courierProvider,
      trackingNumber,
      consignmentId: record.consignmentId || null,
      trackingUrl,
      status,
      statusLabelEn: labels.en,
      statusLabelBn: labels.bn,
      weightGrams: record.weightGrams ?? null,
      packageCount: record.packageCount || 1,
      shippingCostPoisha: shippingCost,
      shippingCostBdtFormatted: formatBdt(shippingCost),
      shippedAt:
        record.shippedAt?.toISOString?.() ||
        (record.shippedAt ? new Date(record.shippedAt).toISOString() : null),
      deliveredAt:
        record.deliveredAt?.toISOString?.() ||
        (record.deliveredAt ? new Date(record.deliveredAt).toISOString() : null),
      recipientName: record.recipientName,
      recipientPhoneMasked: maskBangladeshPhone(record.recipientPhone || ''),
      deliveryAddress: record.deliveryAddress,
      division: record.division,
      district: record.district,
      events,
      version: record.version || 1,
      createdAt: record.createdAt?.toISOString?.() || new Date(record.createdAt).toISOString(),
      updatedAt: record.updatedAt?.toISOString?.() || new Date(record.updatedAt).toISOString(),
    };
  }
}

export const shipmentRepository = new ShipmentRepository();
