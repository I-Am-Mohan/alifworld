/**
 * Multi-Vendor Seller Fulfillment Group Domain Service
 *
 * Implements:
 * 1. Strict seller tenant isolation at query boundaries
 * 2. Finite state machine transitions (PENDING -> ACCEPTED -> PACKING -> READY_FOR_PICKUP -> HANDED_OVER -> IN_TRANSIT -> DELIVERED)
 * 3. Immutable protection of financial commission and payout fields
 * 4. Courier dispatch integration with Pathao, Steadfast, RedX, Paperfly, and In-House
 * 5. Packing slip and warehouse manifest generation
 * 6. Audit trail and outbox event publishing
 *
 * Invariant: Seller cannot modify another seller's fulfillment objects.
 * Invariant: Rejection or cancellation of one seller group leaves other seller groups intact.
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '@/shared/errors/app-error';
import { auditService } from '@/shared/audit';
import {
  SellerFulfillmentGroupDTO,
  FulfillmentGroupStatus,
  FULFILLMENT_GROUP_TRANSITIONS,
  PackingSlipManifestDTO,
} from '../types/fulfillment-group.types';
import {
  FulfillmentGroupQueryInput,
  DispatchGroupToCourierInput,
} from '../validators/fulfillment-group.validators';
import { sellerFulfillmentGroupRepository } from '../repositories/seller-fulfillment-group.repository';
import { courierDispatchService } from '@/features/shipping/services/courier-dispatch.service';
import { CourierCode } from '@/features/shipping/types/courier.types';

export class SellerFulfillmentGroupService {
  private db = prisma;
  private repo = sellerFulfillmentGroupRepository;

  /**
   * SELLER TENANT SCOPING: Lists fulfillment groups exclusively owned by the merchant.
   */
  public async listGroupsForSeller(
    sellerId: string,
    options: FulfillmentGroupQueryInput
  ): Promise<{ items: SellerFulfillmentGroupDTO[]; total: number; page: number; limit: number }> {
    return this.repo.findGroupsBySellerId(sellerId, {
      status: options.status,
      page: options.page,
      limit: options.limit,
    });
  }

  /**
   * SELLER TENANT SCOPING: Retrieves a single fulfillment group belonging to the merchant.
   */
  public async getGroupForSeller(
    groupId: string,
    sellerId: string
  ): Promise<SellerFulfillmentGroupDTO> {
    return this.repo.findGroupByIdAndSellerId(groupId, sellerId);
  }

  /**
   * SELLER TENANT TRANSITION: Transitions a fulfillment group through the state machine.
   * Enforces that sellers cannot alter commissions, payouts, or another seller's group.
   */
  public async transitionGroupStatus(
    groupId: string,
    sellerId: string,
    nextStatus: FulfillmentGroupStatus,
    options: { actorId?: string; reason?: string } = {}
  ): Promise<SellerFulfillmentGroupDTO> {
    // 1. Fetch group within strict seller scope
    const group = await this.repo.findGroupByIdAndSellerId(groupId, sellerId);

    // 2. Validate finite state machine transition
    const allowedTransitions = FULFILLMENT_GROUP_TRANSITIONS[group.status] || [];
    if (!allowedTransitions.includes(nextStatus)) {
      throw new ConflictError(
        `Invalid status transition from '${group.status}' to '${nextStatus}'. Allowed transitions: [${allowedTransitions.join(', ')}]`,
        { currentStatus: group.status, requestedStatus: nextStatus }
      );
    }

    // 3. Update status in database
    const isDelivered = nextStatus === 'DELIVERED';
    const deliveredAt = isDelivered ? new Date() : undefined;

    const updated = await this.repo.updateStatus(groupId, sellerId, nextStatus, {
      deliveredAt,
      version: group.version,
    });

    // 4. Record order status history
    await (this.db as any).orderStatusHistory.create({
      data: {
        id: generatePrefixedId(ENTITY_PREFIXES.ORDER_STATUS_HISTORY),
        orderId: group.orderId,
        status: nextStatus,
        reason:
          options.reason ||
          `Merchant updated fulfillment group ${group.groupNumber} to ${nextStatus}`,
        actorId: options.actorId || sellerId,
        actorRole: 'SELLER',
      },
    });

    // 5. Emit Outbox Event for Asynchronous Processing
    await (this.db as any).outboxEvent.create({
      data: {
        id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
        eventType: 'fulfillment_group.status_changed',
        aggregateType: 'SELLER_FULFILLMENT_GROUP',
        aggregateId: groupId,
        payload: {
          groupId,
          groupNumber: group.groupNumber,
          orderId: group.orderId,
          sellerId,
          previousStatus: group.status,
          newStatus: nextStatus,
          reason: options.reason || null,
        },
      },
    });

    // 6. Audit Logging
    await auditService.logBusinessEvent({
      action: 'FULFILLMENT_GROUP_STATUS_CHANGED',
      resource: 'SELLER_FULFILLMENT_GROUP',
      resourceId: groupId,
      actorId: options.actorId || sellerId,
      actorRole: 'SELLER',
      metadata: {
        groupId,
        groupNumber: group.groupNumber,
        sellerId,
        fromStatus: group.status,
        toStatus: nextStatus,
        reason: options.reason || null,
      },
    });

    return updated;
  }

  /**
   * Dispatches seller fulfillment group parcel to a chosen courier service.
   */
  public async dispatchGroupToCourier(
    groupId: string,
    sellerId: string,
    input: DispatchGroupToCourierInput,
    actorId?: string
  ): Promise<{
    group: SellerFulfillmentGroupDTO;
    consignmentId: string;
    trackingNumber: string;
    labelUrl?: string | null;
  }> {
    // 1. Fetch group within strict seller scope
    const group = await this.repo.findGroupByIdAndSellerId(groupId, sellerId);

    // 2. Validate that group is ready for dispatch
    const validDispatchStatuses: FulfillmentGroupStatus[] = [
      'ACCEPTED',
      'PACKING',
      'READY_FOR_PICKUP',
    ];

    if (!validDispatchStatuses.includes(group.status)) {
      throw new ConflictError(
        `Fulfillment group '${group.groupNumber}' cannot be dispatched in status '${group.status}'. Must be in [${validDispatchStatuses.join(', ')}].`
      );
    }

    // 3. Compute total weight from items if not provided
    const totalWeight =
      input.weightGrams ||
      group.items.reduce((sum, item) => sum + item.quantity * 300, 0);

    // 4. Invoke Courier Dispatch Service
    const consignmentResult = await courierDispatchService.createConsignment(
      {
        fulfillmentGroupId: group.id,
        courierProvider: input.courierProvider as CourierCode,
        recipientName: group.shippingDestination.recipientName,
        recipientPhone: group.shippingDestination.recipientPhone,
        recipientAlternativePhone: null,
        deliveryAddress: group.shippingDestination.address,
        division: group.shippingDestination.division,
        district: group.shippingDestination.district,
        upazila: group.shippingDestination.upazila,
        postalCode: group.shippingDestination.postalCode,
        itemDescription: `${group.sellerName} Order Package (${group.items.length} items)`,
        itemQuantity: group.items.reduce((sum, item) => sum + item.quantity, 0),
        totalWeightGrams: totalWeight,
        codAmountPoisha: group.totalPoisha,
        isPrepaid: false,
        specialInstructions: input.specialInstructions,
      },
      actorId || sellerId
    );

    // 5. Update courier details and advance status to HANDED_OVER_TO_COURIER
    const updated = await this.repo.updateCourierDetails(groupId, sellerId, {
      courierProvider: input.courierProvider,
      consignmentId: consignmentResult.consignmentId,
      trackingNumber: consignmentResult.trackingNumber,
      pickupDate: input.pickupDate ? new Date(input.pickupDate) : new Date(),
    });

    // Advance status to HANDED_OVER_TO_COURIER
    const transitioned = await this.transitionGroupStatus(
      groupId,
      sellerId,
      'HANDED_OVER_TO_COURIER',
      {
        actorId,
        reason: `Dispatched to ${input.courierProvider} with Consignment ID: ${consignmentResult.consignmentId}`,
      }
    );

    return {
      group: transitioned,
      consignmentId: consignmentResult.consignmentId,
      trackingNumber: consignmentResult.trackingNumber,
      labelUrl: consignmentResult.labelUrl,
    };
  }

  /**
   * Generates printable packing slip manifest for warehouse staff.
   */
  public async getPackingSlipManifest(
    groupId: string,
    sellerId: string
  ): Promise<PackingSlipManifestDTO> {
    return this.repo.getPackingSlipManifest(groupId, sellerId);
  }

  // --- Admin Inspection Methods ---

  public async listGroupsAdmin(
    options: FulfillmentGroupQueryInput
  ): Promise<{ items: SellerFulfillmentGroupDTO[]; total: number; page: number; limit: number }> {
    return this.repo.listGroupsAdmin(options);
  }

  public async getGroupAdmin(groupId: string): Promise<SellerFulfillmentGroupDTO> {
    return this.repo.findGroupByIdAdmin(groupId);
  }
}

export const sellerFulfillmentGroupService = new SellerFulfillmentGroupService();
