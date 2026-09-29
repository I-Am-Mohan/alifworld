/**
 * Shipment & Logistics Event Repository
 *
 * Scoped Prisma queries for physical parcel shipments and immutable tracking event history.
 * Invariant: Soft deletion preserved with deletedAt timestamp.
 * Invariant: Shipment events are append-only.
 */

import { prisma } from '@/shared/database/prisma';

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
    initialEventDescription = 'Shipment created and registered for dispatch'
  ): Promise<any> {
    return (this.db as any).$transaction(async (tx: any) => {
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
    });
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
    } = {}
  ): Promise<any> {
    return (this.db as any).$transaction(async (tx: any) => {
      const updateData: any = {
        status,
        version: { increment: 1 },
        ...(additionalData.shippedAt !== undefined ? { shippedAt: additionalData.shippedAt } : {}),
        ...(additionalData.deliveredAt !== undefined ? { deliveredAt: additionalData.deliveredAt } : {}),
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
    });
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
}

export const shipmentRepository = new ShipmentRepository();
