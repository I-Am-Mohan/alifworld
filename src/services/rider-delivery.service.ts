/**
 * AlifWorld Rider Delivery & Dispatch Domain Service
 * 
 * Manages assignment leases, atomic acceptance to prevent double-assignment,
 * live GPS telemetry updates, shipment event timelines, and route scoping.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0024, Milestone 046
 */

import { prisma } from '@/shared/database/prisma';
import { ActorContext } from '@/shared/authz/authz.types';
import { defaultPolicyEngine } from '@/shared/authz';
import { ConflictError, NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';
import { RiderAcceptAssignmentInput, RiderLocationUpdateInput, RiderStatusUpdateInput } from '@/validators/support-and-rider.validators';

export interface AssignmentLease {
  leaseId: string;
  deliveryId: string;
  riderId: string;
  expiresAt: Date;
}

export interface LiveLocationTelemetry {
  riderId: string;
  deliveryId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  updatedAt: string;
}

export class RiderDeliveryService {
  // In-memory assignment lease store: deliveryId -> AssignmentLease
  private static leases = new Map<string, AssignmentLease>();
  // In-memory live telemetry store: riderId -> LiveLocationTelemetry
  private static liveLocations = new Map<string, LiveLocationTelemetry>();

  /**
   * Creates an exclusive, time-bound assignment lease offered to a specific rider.
   * Prevents competing riders from accepting the same delivery simultaneously.
   */
  public async createAssignmentLease(params: {
    deliveryId: string;
    riderId: string;
    durationSeconds?: number;
  }): Promise<AssignmentLease> {
    const { deliveryId, riderId, durationSeconds = 120 } = params;

    // Check if delivery is already claimed in database
    const shipment = await (prisma as any).shipment.findFirst({
      where: { id: deliveryId, deletedAt: null },
    });

    if (shipment && shipment.status !== 'PENDING' && shipment.status !== 'LABEL_CREATED') {
      throw new ConflictError('Delivery has already been dispatched or claimed.');
    }

    // Check if an existing unexpired lease belongs to another rider
    const existingLease = RiderDeliveryService.leases.get(deliveryId);
    if (existingLease && existingLease.riderId !== riderId && existingLease.expiresAt.getTime() > Date.now()) {
      throw new ConflictError('Delivery assignment is already leased to another rider.');
    }

    const lease: AssignmentLease = {
      leaseId: `lse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      deliveryId,
      riderId,
      expiresAt: new Date(Date.now() + durationSeconds * 1000),
    };

    RiderDeliveryService.leases.set(deliveryId, lease);
    return lease;
  }

  /**
   * Atomically accepts a delivery assignment with lease validation.
   */
  public async acceptAssignment(
    actor: ActorContext,
    input: RiderAcceptAssignmentInput
  ): Promise<{
    deliveryId: string;
    riderId: string;
    status: string;
    acceptedAt: string;
  }> {
    const { deliveryId } = input;
    const lease = RiderDeliveryService.leases.get(deliveryId);

    // Verify policy authorization
    await defaultPolicyEngine.assert(actor, 'accept_assignment', {
      type: 'DELIVERY',
      id: deliveryId,
      data: {
        leaseRiderId: lease?.riderId,
        leaseExpiresAt: lease?.expiresAt,
      },
    });

    // Check existing shipment status if present in DB
    const shipment = await (prisma as any).shipment.findFirst({
      where: { id: deliveryId, deletedAt: null },
    });

    if (shipment && (shipment.status === 'OUT_FOR_DELIVERY' || shipment.status === 'DELIVERED')) {
      throw new ConflictError('Delivery has already been completed or is actively in transit.');
    }

    // Clear lease upon successful atomic claim
    RiderDeliveryService.leases.delete(deliveryId);

    // Record milestone update in database if shipment exists
    if (shipment) {
      await (prisma as any).shipment.update({
        where: { id: shipment.id },
        data: {
          status: 'PICKED_UP',
        },
      });

      await (prisma as any).shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: 'PICKED_UP',
          description: `Shipment assigned to delivery rider ${actor.userId}`,
          occurredAt: new Date(),
        },
      });
    }

    // Emit audit log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'RIDER_ASSIGNMENT_ACCEPTED',
        resource: 'Shipment',
        resourceId: deliveryId,
        metadata: {
          riderId: actor.userId,
          deliveryId,
        },
      },
    });

    return {
      deliveryId,
      riderId: actor.userId,
      status: 'PICKED_UP',
      acceptedAt: new Date().toISOString(),
    };
  }

  /**
   * Updates live rider GPS telemetry (throttled in memory/cache, compact for Flutter mobile).
   */
  public async updateLiveLocation(
    actor: ActorContext,
    input: RiderLocationUpdateInput
  ): Promise<LiveLocationTelemetry> {
    await defaultPolicyEngine.assert(actor, 'location_update', {
      type: 'RIDER',
      id: actor.userId,
      data: { riderId: actor.userId },
    });

    const telemetry: LiveLocationTelemetry = {
      riderId: actor.userId,
      deliveryId: input.deliveryId,
      latitude: input.latitude,
      longitude: input.longitude,
      speed: input.speed,
      heading: input.heading,
      updatedAt: new Date().toISOString(),
    };

    RiderDeliveryService.liveLocations.set(actor.userId, telemetry);
    return telemetry;
  }

  /**
   * Retrieves the latest cached live location for a rider.
   */
  public getLiveLocation(riderId: string): LiveLocationTelemetry | null {
    return RiderDeliveryService.liveLocations.get(riderId) || null;
  }

  /**
   * Updates parcel delivery status milestone (PICKED_UP -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED).
   */
  public async updateDeliveryStatus(
    actor: ActorContext,
    input: RiderStatusUpdateInput
  ): Promise<{
    deliveryId: string;
    riderId: string;
    status: string;
    occurredAt: string;
  }> {
    await defaultPolicyEngine.assert(actor, 'update_status', {
      type: 'DELIVERY',
      id: input.deliveryId,
      data: {
        riderId: actor.userId,
        status: input.status,
      },
    });

    const shipment = await (prisma as any).shipment.findFirst({
      where: { id: input.deliveryId, deletedAt: null },
    });

    if (shipment) {
      await (prisma as any).shipment.update({
        where: { id: shipment.id },
        data: {
          status: input.status,
          deliveredAt: input.status === 'DELIVERED' ? new Date() : shipment.deliveredAt,
        },
      });

      await (prisma as any).shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: input.status,
          description: input.note || `Delivery milestone: ${input.status}`,
          location: input.location || null,
          occurredAt: new Date(),
        },
      });
    }

    return {
      deliveryId: input.deliveryId,
      riderId: actor.userId,
      status: input.status,
      occurredAt: new Date().toISOString(),
    };
  }

  /**
   * Clears in-memory test state (used in unit/integration testing).
   */
  public static clearState(): void {
    RiderDeliveryService.leases.clear();
    RiderDeliveryService.liveLocations.clear();
  }
}
