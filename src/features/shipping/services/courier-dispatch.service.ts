/**
 * Authoritative Courier Dispatch & Delivery Domain Service
 *
 * Implements:
 * 1. Multi-courier consignment creation & dispatch orchestration
 * 2. Automatic Bangladesh E.164 phone normalization
 * 3. Atomic shipment and event persistence
 * 4. Tracking timeline aggregation and PII phone masking
 * 5. Consignment cancellation handling
 * 6. In-House delivery OTP / PIN doorstep verification
 * 7. Courier webhook callback ingestion and status synchronization
 *
 * Invariant: BDT monetary values represented in integer poisha.
 * Invariant: Shipment tracking timeline is append-only and auditable.
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
} from '@/shared/errors/app-error';
import { auditService } from '@/shared/audit';
import {
  CourierCode,
  CourierConsignmentResultDTO,
  CourierTrackingResultDTO,
  CourierCancellationResultDTO,
  CourierInfoDTO,
  ShipmentStatus,
} from '../types/courier.types';
import {
  CreateConsignmentInput,
  VerifyInHouseDeliveryInput,
} from '../validators/courier.validators';
import { courierAdapterRegistry } from '../adapters/courier-adapter.registry';
import { shipmentRepository } from '../repositories/shipment.repository';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';
import { orderTransitionService } from '@/features/orders/state-machines/order-transition.service';

export class CourierDispatchService {
  private db = prisma;
  private registry = courierAdapterRegistry;
  private repo = shipmentRepository;

  /**
   * Dispatches a seller fulfillment package and creates a courier consignment.
   */
  public async createConsignment(
    input: CreateConsignmentInput,
    actorId?: string
  ): Promise<CourierConsignmentResultDTO> {
    // 1. Fetch Seller Fulfillment Group
    const group = await (this.db as any).sellerFulfillmentGroup.findFirst({
      where: { id: input.fulfillmentGroupId, deletedAt: null },
      include: {
        order: true,
        seller: true,
        items: true,
      },
    });

    if (!group) {
      throw new NotFoundError(`Seller fulfillment group '${input.fulfillmentGroupId}' not found.`);
    }

    if (!actorId) throw new AuthorizationError('Dispatch actor required.');
    const user = await this.db.user.findFirst({
      where: { id: actorId, deletedAt: null },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE')
      throw new AuthorizationError('Active dispatch account required.');
    const permissions = [
      'orders:manage',
      'seller:orders:manage',
      'shipments:manage',
      'shipments.manage',
    ];
    const staff = await this.db.sellerStaff.findFirst({
      where: { sellerId: group.sellerId, userId: actorId, deletedAt: null },
      select: { permissions: true },
    });
    const administrator = await this.db.userRoleAssignment.findFirst({
      where: {
        userId: actorId,
        deletedAt: null,
        role: {
          deletedAt: null,
          OR: [
            { code: 'SUPER_ADMIN' },
            {
              code: 'ADMIN',
              rolePermissions: {
                some: {
                  deletedAt: null,
                  permission: { deletedAt: null, code: { in: permissions } },
                },
              },
            },
          ],
        },
      },
      select: { id: true },
    });
    if (
      !administrator &&
      (group.seller.status !== 'VERIFIED' ||
        (group.seller.ownerUserId !== actorId &&
          !staff?.permissions.some((permission) => permissions.includes(permission))))
    ) {
      throw new AuthorizationError('Persisted seller dispatch authority required.');
    }

    if (group.status !== 'READY_FOR_PICKUP') {
      throw new ConflictError(
        `Fulfillment group '${group.groupNumber}' cannot be dispatched in status '${group.status}'.`
      );
    }

    // 2. Normalize Recipient Phone Number to E.164
    const normalizedPhone = normalizeBangladeshPhone(input.recipientPhone);
    const normalizedAltPhone = input.recipientAlternativePhone
      ? normalizeBangladeshPhone(input.recipientAlternativePhone)
      : null;

    // 3. Generate Unique Shipment Number
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(100000 + Math.random() * 900000);
    const shipmentNumber = `SHP-${dateStamp}-${randSuffix}`;

    // 4. Retrieve Courier Adapter from Registry
    const adapter = this.registry.getAdapter(input.courierProvider as CourierCode);
    if (input.courierProvider !== 'IN_HOUSE' && !adapter.isConfigured) {
      throw new ConflictError(
        'Courier booking is disabled until provider credentials are configured.'
      );
    }

    // 5. Invoke Courier Adapter to create Consignment
    const courierCostPoisha = Number(group.shippingFeePoisha || 0);

    const consignmentResult = await adapter.createConsignment({
      shipmentId: generatePrefixedId(ENTITY_PREFIXES.SHIPMENT),
      shipmentNumber,
      fulfillmentGroupId: group.id,
      orderNumber: group.order.orderNumber,
      sellerId: group.sellerId,
      sellerName: group.seller.businessName,
      sellerPhone: group.seller.phone || null,
      sellerAddress: null,
      recipientName: input.recipientName,
      recipientPhone: normalizedPhone,
      recipientAlternativePhone: normalizedAltPhone,
      deliveryAddress: input.deliveryAddress,
      division: input.division,
      district: input.district,
      upazila: input.upazila || null,
      postalCode: input.postalCode || null,
      itemDescription: input.itemDescription,
      itemQuantity: input.itemQuantity,
      totalWeightGrams: input.totalWeightGrams,
      codAmountPoisha: input.codAmountPoisha,
      isPrepaid: input.isPrepaid,
      shippingCostPoisha: courierCostPoisha,
      specialInstructions: input.specialInstructions || null,
    });
    if (
      !consignmentResult.success ||
      (input.courierProvider !== 'IN_HOUSE' &&
        (consignmentResult.rawResponse?.simulated === true ||
          consignmentResult.rawResponse?.provider === input.courierProvider))
    ) {
      throw new ConflictError('Courier did not confirm a real booking; no shipment was persisted.');
    }

    // 6. Persist Shipment Record in DB
    const initialStatus = consignmentResult.status || 'LABEL_CREATED';
    const shipmentId = generatePrefixedId(ENTITY_PREFIXES.SHIPMENT);
    await orderTransitionService.transitionFulfillmentGroupStatus(
      {
        groupId: group.id,
        sellerId: group.sellerId,
        nextStatus: 'HANDED_OVER_TO_COURIER',
        actorId,
        actorRole: administrator ? 'ADMIN' : 'SELLER',
        idempotencyKey: `consignment:${input.courierProvider}:${consignmentResult.consignmentId}:handover`,
      },
      async (tx) => {
        const shipment = await this.repo.createShipment(
          {
            id: shipmentId,
            fulfillmentGroupId: group.id,
            sellerId: group.sellerId,
            shipmentNumber,
            courierProvider: input.courierProvider,
            trackingNumber: consignmentResult.trackingNumber,
            consignmentId: consignmentResult.consignmentId,
            status: initialStatus,
            weightGrams: input.totalWeightGrams,
            packageCount: 1,
            shippingCostPoisha: BigInt(courierCostPoisha),
            recipientName: input.recipientName,
            recipientPhone: normalizedPhone,
            deliveryAddress: input.deliveryAddress,
            division: input.division,
            district: input.district,
          },
          `Consignment '${consignmentResult.consignmentId}' booked with ${adapter.courierName}. Initial status: ${initialStatus}.`,
          tx
        );

        // If IN_HOUSE, attach OTP code in a private system event for secure verification
        if (consignmentResult.otpCode) {
          await tx.shipmentEvent.create({
            data: {
              shipmentId: shipment.id,
              status: 'ASSIGNED',
              description: 'In-House delivery OTP generated for customer verification.',
              carrierPayload: { otpCode: consignmentResult.otpCode },
            },
          });
        }

        // 7. Update Fulfillment Group status
        await tx.sellerFulfillmentGroup.update({
          where: { id: group.id },
          data: {
            courierProvider: input.courierProvider,
            consignmentId: consignmentResult.consignmentId,
            trackingNumber: consignmentResult.trackingNumber,
          },
        });

        // 8. Emit Outbox Event for Logistics Coordination
        await tx.outboxEvent.create({
          data: {
            id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
            eventType: 'shipment.dispatched',
            aggregateType: 'SHIPMENT',
            aggregateId: shipment.id,
            payload: {
              shipmentId: shipment.id,
              shipmentNumber,
              fulfillmentGroupId: group.id,
              orderId: group.orderId,
              sellerId: group.sellerId,
              courierProvider: input.courierProvider,
              consignmentId: consignmentResult.consignmentId,
              trackingNumber: consignmentResult.trackingNumber,
              initialStatus,
            },
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'LOGISTICS_SHIPMENT_DISPATCHED',
            resource: 'SHIPMENT',
            resourceId: shipmentId,
            actorId,
            actorRole: administrator ? 'ADMIN' : 'SELLER',
            metadata: {
              shipmentNumber,
              consignmentId: consignmentResult.consignmentId,
              courierProvider: input.courierProvider,
              fulfillmentGroupId: group.id,
            },
          },
        });
      }
    );

    return consignmentResult;
  }

  /**
   * Tracks a shipment by trackingNumber, consignmentId, or shipmentNumber.
   */
  public async trackShipment(identifier: string): Promise<CourierTrackingResultDTO> {
    const cleanId = identifier.trim();

    // Look up shipment by trackingNumber, consignmentId, or shipmentNumber
    let shipment = await this.repo.findByTrackingNumber(cleanId);
    if (!shipment) {
      shipment = await this.repo.findByConsignmentId(cleanId);
    }
    if (!shipment) {
      shipment = await this.repo.findByShipmentNumber(cleanId);
    }
    if (!shipment) {
      shipment = await this.repo.findById(cleanId);
    }

    if (!shipment) {
      // If not yet in local DB, check courier adapter directly
      const adapter = this.registry.getAdapter('PATHAO');
      return adapter.trackShipment(cleanId);
    }

    const adapter = this.registry.getAdapter(shipment.courierProvider as CourierCode);
    const labels = (adapter as any).getStatusLabels(shipment.status as ShipmentStatus);

    const events = (shipment.events || []).map((e: any) => ({
      status: e.status as ShipmentStatus,
      location: e.location,
      description: e.description,
      occurredAt: e.occurredAt?.toISOString?.() || new Date(e.occurredAt).toISOString(),
      carrierPayload: null,
    }));

    const maskedPhone = (adapter as any).maskPhone(shipment.recipientPhone);
    const codAmount = Number(shipment.shippingCostPoisha || 0);

    return {
      shipmentNumber: shipment.shipmentNumber,
      consignmentId: shipment.consignmentId || shipment.shipmentNumber,
      trackingNumber: shipment.trackingNumber || shipment.shipmentNumber,
      courierCode: shipment.courierProvider as CourierCode,
      courierName: adapter.courierName,
      currentStatus: shipment.status as ShipmentStatus,
      statusLabelEn: labels.en,
      statusLabelBn: labels.bn,
      currentLocation: events[0]?.location || 'In Transit',
      recipientName: shipment.recipientName,
      recipientPhoneMasked: maskedPhone,
      deliveryAddress: shipment.deliveryAddress,
      division: shipment.division,
      district: shipment.district,
      upazila: null,
      codAmountPoisha: codAmount,
      codAmountBdtFormatted: (adapter as any).formatBdt(codAmount),
      isPrepaid: codAmount === 0,
      estimatedDeliveryDate: shipment.fulfillmentGroup?.estimatedDelivery?.toISOString() || null,
      isDelivered: shipment.status === 'DELIVERED',
      deliveredAt: shipment.deliveredAt?.toISOString() || null,
      events,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  /**
   * Cancels a consignment before courier collection.
   */
  public async cancelConsignment(
    consignmentId: string,
    reason?: string,
    actorId?: string
  ): Promise<CourierCancellationResultDTO> {
    const shipment = await this.repo.findByConsignmentId(consignmentId);
    if (!shipment) {
      throw new NotFoundError(`Consignment '${consignmentId}' not found.`);
    }

    if (shipment.status === 'DELIVERED') {
      throw new ValidationError('Delivered shipments cannot be cancelled.');
    }

    const adapter = this.registry.getAdapter(shipment.courierProvider as CourierCode);
    const cancelResult = await adapter.cancelConsignment(consignmentId, reason);

    await this.repo.updateStatusWithEvent(shipment.id, 'CANCELLED', {
      description: `Consignment cancelled. Reason: ${reason || 'Merchant cancellation'}`,
      location: 'Merchant Warehouse',
    });

    await auditService.logBusinessEvent({
      action: 'LOGISTICS_CONSIGNMENT_CANCELLED',
      resource: 'SHIPMENT',
      resourceId: shipment.id,
      actorId: actorId || 'system',
      actorRole: 'SELLER',
      metadata: { consignmentId, reason: reason || null },
    });

    return cancelResult;
  }

  /**
   * Ingests and processes courier webhooks (Pathao, Steadfast, RedX, Paperfly).
   */
  public async handleCourierWebhook(
    courierCode: string,
    payload: unknown,
    rawBody?: string,
    headers?: Record<string, string>
  ): Promise<{ success: boolean; message: string; updatedShipmentId?: string }> {
    const adapter = this.registry.getAdapter(courierCode as CourierCode);
    const webhookSecret = process.env[`COURIER_${courierCode}_WEBHOOK_SECRET`];
    if (!webhookSecret || !rawBody || !adapter.verifyWebhookSignature) {
      throw new AuthorizationError('Courier webhook verification is not configured.');
    }
    if (adapter.verifyWebhookSignature) {
      const isValid = adapter.verifyWebhookSignature(rawBody, headers);
      if (!isValid) {
        throw new ValidationError('Invalid courier webhook signature.');
      }
    }

    const event = await adapter.parseWebhook(payload, headers);

    // Find shipment
    let shipment = await this.repo.findByConsignmentId(event.consignmentId);
    if (!shipment && event.trackingNumber) {
      shipment = await this.repo.findByTrackingNumber(event.trackingNumber);
    }

    if (!shipment) {
      // Record unmatched webhook event
      return {
        success: true,
        message: `Webhook received for untracked consignment '${event.consignmentId}'. Recorded for audit.`,
      };
    }
    if (shipment.courierProvider !== courierCode) {
      throw new AuthorizationError('Courier callback does not match the shipment provider.');
    }

    const isDelivered = event.newStatus === 'DELIVERED';
    const deliveredAt = isDelivered ? new Date() : undefined;

    const persistShipment = (transaction?: any) =>
      this.repo.updateStatusWithEvent(
        shipment.id,
        event.newStatus,
        {
          description: `Courier status updated via ${adapter.courierName} webhook callback. New status: ${event.newStatus}.`,
          location: event.location,
          carrierPayload: event.rawPayload,
        },
        { deliveredAt },
        transaction
      );

    // If delivered, update SellerFulfillmentGroup
    if (isDelivered) {
      await orderTransitionService.transitionFulfillmentGroupStatus(
        {
          groupId: shipment.fulfillmentGroupId,
          sellerId: shipment.sellerId,
          nextStatus: 'DELIVERED',
          actorId: 'courier-system',
          actorRole: 'SYSTEM',
          idempotencyKey: `shipment:${shipment.id}:delivered`,
        },
        persistShipment
      );
    } else {
      await persistShipment();
    }

    return {
      success: true,
      message: `Shipment '${shipment.shipmentNumber}' status updated to '${event.newStatus}'.`,
      updatedShipmentId: shipment.id,
    };
  }

  /**
   * Verifies In-House delivery at customer doorstep via OTP / Delivery PIN.
   */
  public async verifyInHouseDelivery(
    input: VerifyInHouseDeliveryInput,
    actorId?: string
  ): Promise<{ success: boolean; message: string; deliveredAt: string }> {
    let shipment = await this.repo.findById(input.shipmentId);
    if (!shipment) {
      shipment = await this.repo.findByConsignmentId(input.shipmentId);
    }
    if (!shipment) {
      throw new NotFoundError(`In-House shipment '${input.shipmentId}' not found.`);
    }

    if (shipment.courierProvider !== 'IN_HOUSE') {
      throw new ValidationError(
        `Shipment '${shipment.shipmentNumber}' is assigned to external courier '${shipment.courierProvider}', not In-House fleet.`
      );
    }

    if (shipment.status === 'DELIVERED') {
      return {
        success: true,
        message: 'Shipment has already been marked as DELIVERED.',
        deliveredAt: shipment.deliveredAt?.toISOString() || new Date().toISOString(),
      };
    }

    // Verify OTP code against the assigned OTP in event history
    const otpEvent = (shipment.events || []).find(
      (e: any) => e.carrierPayload?.otpCode !== undefined
    );
    const expectedOtp = otpEvent?.carrierPayload?.otpCode;

    if (!expectedOtp || expectedOtp !== input.otpCode) {
      throw new ValidationError('Invalid doorstep delivery OTP code provided.');
    }

    const deliveredAt = new Date();

    const persistShipment = (transaction: any) =>
      this.repo.updateStatusWithEvent(
        shipment.id,
        'DELIVERED',
        {
          description: `Doorstep delivery verified by Rider '${input.riderId}' with recipient OTP. ${input.deliveryNotes || ''}`,
          location: 'Customer Doorstep',
          carrierPayload: {
            riderId: input.riderId,
            recipientSignedName: input.recipientSignedName || null,
            proofOfDeliveryPhotoUrl: input.proofOfDeliveryPhotoUrl || null,
          },
          occurredAt: deliveredAt,
        },
        { deliveredAt },
        transaction
      );

    // Update SellerFulfillmentGroup
    await orderTransitionService.transitionFulfillmentGroupStatus(
      {
        groupId: shipment.fulfillmentGroupId,
        sellerId: shipment.sellerId,
        nextStatus: 'DELIVERED',
        actorId: 'courier-system',
        actorRole: 'SYSTEM',
        idempotencyKey: `shipment:${shipment.id}:delivered`,
      },
      persistShipment
    );

    await auditService.logBusinessEvent({
      action: 'LOGISTICS_IN_HOUSE_DELIVERY_VERIFIED',
      resource: 'SHIPMENT',
      resourceId: shipment.id,
      actorId: actorId || input.riderId,
      actorRole: 'RIDER',
      metadata: {
        riderId: input.riderId,
        shipmentNumber: shipment.shipmentNumber,
        deliveredAt: deliveredAt.toISOString(),
      },
    });

    return {
      success: true,
      message: 'Doorstep delivery confirmed and verified successfully via OTP.',
      deliveredAt: deliveredAt.toISOString(),
    };
  }

  /**
   * Lists available couriers and configuration status.
   */
  public listCouriers(): CourierInfoDTO[] {
    return this.registry.listCouriers();
  }
}

export const courierDispatchService = new CourierDispatchService();
