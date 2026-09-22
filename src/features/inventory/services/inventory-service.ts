/**
 * AlifWorld Inventory Service
 * 
 * Core domain service orchestrating warehouse stock balances, intake movements,
 * atomic checkout reservations, commitments, releases, manual audit adjustments,
 * and deterministic TTL expiration sweeps.
 * 
 * Core Invariant:
 * Available = OnHand - Reserved - Damaged - Quarantined >= 0
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0026
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { StockBalanceRepository } from '../repositories/stock-balance-repository';
import { StockReservationRepository } from '../repositories/stock-reservation-repository';
import { StockMovementRepository } from '../repositories/stock-movement-repository';
import { WarehouseRepository } from '../repositories/warehouse-repository';
import {
  ReceiveStockSchema,
  ReserveStockSchema,
  ReleaseReservationSchema,
  CommitReservationSchema,
  AdjustStockSchema,
  ReceiveStockInput,
  ReserveStockInput,
  ReleaseReservationInput,
  CommitReservationInput,
  AdjustStockInput,
} from '../validators';
import {
  StockBalanceModel,
  StockReservationModel,
  StockMovementModel,
  MovementType,
  ReservationStatus,
  SourceType,
} from '../types';

export class InventoryService {
  constructor(
    private readonly stockBalanceRepo: StockBalanceRepository = new StockBalanceRepository(),
    private readonly reservationRepo: StockReservationRepository = new StockReservationRepository(),
    private readonly movementRepo: StockMovementRepository = new StockMovementRepository(),
    private readonly warehouseRepo: WarehouseRepository = new WarehouseRepository()
  ) {}

  /**
   * Receives incoming stock at a warehouse facility (e.g. from purchase order intake).
   * Increases on-hand stock and appends an immutable RECEIVE movement.
   */
  public async receiveStock(
    input: ReceiveStockInput,
    actorId?: string
  ): Promise<{ balance: StockBalanceModel; movement: StockMovementModel }> {
    const validated = ReceiveStockSchema.parse(input);

    const warehouse = await this.warehouseRepo.findById(validated.warehouseId);
    if (!warehouse || !warehouse.isActive) {
      throw new ValidationError(`Warehouse '${validated.warehouseId}' is invalid or inactive.`);
    }

    const currentBalance = await this.stockBalanceRepo.getOrCreate(
      validated.warehouseId,
      validated.variantId
    );

    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      currentBalance.id,
      currentBalance.version,
      { onHandDelta: validated.quantity }
    );

    const movement = await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType: MovementType.RECEIVE,
      quantityDelta: validated.quantity,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: validated.sourceType as SourceType,
      sourceId: validated.sourceId,
      actorId,
      reason: validated.reason ?? 'Stock intake purchase order',
    });

    await this.recordOutboxEvent('inventory.stock_received', updatedBalance.id, {
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      quantity: validated.quantity,
      newAvailable: updatedBalance.available,
      movementId: movement.id,
    });

    return { balance: updatedBalance, movement };
  }

  /**
   * Reserves available stock for a checkout session with deterministic TTL expiry.
   * Throws ConflictError if available stock is insufficient or concurrent updates race.
   */
  public async reserveStock(
    input: ReserveStockInput
  ): Promise<{ reservation: StockReservationModel; balance: StockBalanceModel }> {
    const validated = ReserveStockSchema.parse(input);

    const balance = await this.stockBalanceRepo.findByWarehouseAndVariant(
      validated.warehouseId,
      validated.variantId
    );

    if (!balance) {
      throw new NotFoundError(
        `No stock balance found for warehouse '${validated.warehouseId}' and variant '${validated.variantId}'.`
      );
    }

    if (balance.available < validated.quantity) {
      throw new ConflictError(
        `Insufficient stock available. Requested: ${validated.quantity}, Available: ${balance.available}.`
      );
    }

    // Atomically lock reserved quantity via OCC
    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      balance.id,
      balance.version,
      { reservedDelta: validated.quantity }
    );

    // Create reservation record with TTL cutoff
    const reservation = await this.reservationRepo.create({
      stockBalanceId: updatedBalance.id,
      quantity: validated.quantity,
      cartId: validated.cartId,
      orderId: validated.orderId,
      ttlMinutes: validated.ttlMinutes,
    });

    // Record audit trail ledger entry
    await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType: MovementType.RESERVE,
      quantityDelta: -validated.quantity,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.CHECKOUT_RESERVATION,
      sourceId: reservation.id,
      reason: validated.cartId ? `Checkout reservation for cart ${validated.cartId}` : 'Checkout reservation',
    });

    await this.recordOutboxEvent('inventory.stock_reserved', reservation.id, {
      stockBalanceId: updatedBalance.id,
      reservationId: reservation.id,
      quantity: validated.quantity,
      expiresAt: reservation.expiresAt.toISOString(),
    });

    return { reservation, balance: updatedBalance };
  }

  /**
   * Releases an active checkout reservation, returning locked units to available stock.
   */
  public async releaseReservation(
    input: ReleaseReservationInput,
    actorId?: string
  ): Promise<{ reservation: StockReservationModel; balance: StockBalanceModel }> {
    const validated = ReleaseReservationSchema.parse(input);

    const reservation = await this.reservationRepo.findById(validated.reservationId);
    if (!reservation) {
      throw new NotFoundError(`Stock reservation '${validated.reservationId}' not found.`);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new ConflictError(`Cannot release reservation in '${reservation.status}' status.`);
    }

    const currentBalance = await this.stockBalanceRepo.findById(reservation.stockBalanceId);
    if (!currentBalance) {
      throw new NotFoundError(`Stock balance '${reservation.stockBalanceId}' not found.`);
    }

    // Update reservation state to RELEASED
    const releasedReservation = await this.reservationRepo.release(
      reservation.id,
      reservation.version
    );

    // Atomically decrement reserved quantity on balance
    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      currentBalance.id,
      currentBalance.version,
      { reservedDelta: -reservation.quantity }
    );

    // Record release movement
    await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType: MovementType.RELEASE,
      quantityDelta: reservation.quantity,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.CHECKOUT_RESERVATION,
      sourceId: reservation.id,
      actorId,
      reason: validated.reason ?? 'Cart session expired or abandoned',
    });

    await this.recordOutboxEvent('inventory.stock_released', reservation.id, {
      stockBalanceId: updatedBalance.id,
      quantity: reservation.quantity,
      reason: validated.reason,
    });

    return { reservation: releasedReservation, balance: updatedBalance };
  }

  /**
   * Commits an active reservation upon payment confirmation / order placement.
   * Decrements physical onHand and locked reserved simultaneously.
   */
  public async commitReservation(
    input: CommitReservationInput,
    actorId?: string
  ): Promise<{ reservation: StockReservationModel; balance: StockBalanceModel }> {
    const validated = CommitReservationSchema.parse(input);

    const reservation = await this.reservationRepo.findById(validated.reservationId);
    if (!reservation) {
      throw new NotFoundError(`Stock reservation '${validated.reservationId}' not found.`);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new ConflictError(`Cannot commit reservation in '${reservation.status}' status.`);
    }

    if (new Date() > new Date(reservation.expiresAt)) {
      throw new ConflictError(`Reservation '${reservation.id}' has already expired.`);
    }

    const currentBalance = await this.stockBalanceRepo.findById(reservation.stockBalanceId);
    if (!currentBalance) {
      throw new NotFoundError(`Stock balance '${reservation.stockBalanceId}' not found.`);
    }

    // Mark reservation as COMMITTED
    const committedReservation = await this.reservationRepo.commit(
      reservation.id,
      reservation.version,
      validated.orderId
    );

    // Atomically decrement onHand and reserved simultaneously
    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      currentBalance.id,
      currentBalance.version,
      {
        onHandDelta: -reservation.quantity,
        reservedDelta: -reservation.quantity,
      }
    );

    // Record COMMIT movement
    await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType: MovementType.COMMIT,
      quantityDelta: -reservation.quantity,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.ORDER_FULFILLMENT,
      sourceId: validated.orderId,
      actorId,
      reason: `Order fulfillment commitment for ${validated.orderId}`,
    });

    await this.recordOutboxEvent('inventory.stock_committed', reservation.id, {
      stockBalanceId: updatedBalance.id,
      orderId: validated.orderId,
      quantity: reservation.quantity,
    });

    return { reservation: committedReservation, balance: updatedBalance };
  }

  /**
   * Performs an authorized manual stock adjustment (audit correction, physical damage, write-off).
   * Requires mandatory audit justification.
   */
  public async adjustStock(
    input: AdjustStockInput,
    actorId: string
  ): Promise<{ balance: StockBalanceModel; movement: StockMovementModel }> {
    const validated = AdjustStockSchema.parse(input);

    const currentBalance = await this.stockBalanceRepo.findById(validated.stockBalanceId);
    if (!currentBalance) {
      throw new NotFoundError(`Stock balance '${validated.stockBalanceId}' not found.`);
    }

    let deltas: {
      onHandDelta?: number;
      reservedDelta?: number;
      damagedDelta?: number;
      quarantinedDelta?: number;
    } = {};

    if (validated.movementType === MovementType.ADJUST) {
      deltas.onHandDelta = validated.quantityDelta;
    } else if (validated.movementType === MovementType.DAMAGE) {
      const units = Math.abs(validated.quantityDelta);
      deltas.onHandDelta = -units;
      deltas.damagedDelta = units;
    } else if (validated.movementType === MovementType.WRITE_OFF) {
      const units = Math.abs(validated.quantityDelta);
      deltas.damagedDelta = -units;
    }

    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      currentBalance.id,
      currentBalance.version,
      deltas
    );

    const movement = await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType: validated.movementType as MovementType,
      quantityDelta: validated.quantityDelta,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.AUDIT_ADJUSTMENT,
      sourceId: currentBalance.id,
      actorId,
      reason: validated.reason,
    });

    await this.recordOutboxEvent('inventory.stock_adjusted', updatedBalance.id, {
      movementType: validated.movementType,
      quantityDelta: validated.quantityDelta,
      actorId,
      reason: validated.reason,
    });

    return { balance: updatedBalance, movement };
  }

  /**
   * Scans and expires active reservations whose TTL cutoff has passed.
   * Returns unlocked units to available inventory.
   */
  public async expireStaleReservations(cutoffDate: Date = new Date()): Promise<number> {
    const expiredList = await this.reservationRepo.findExpiredActiveReservations(cutoffDate);
    let expiredCount = 0;

    for (const res of expiredList) {
      try {
        const currentBalance = await this.stockBalanceRepo.findById(res.stockBalanceId);
        if (!currentBalance) continue;

        await this.reservationRepo.expire(res.id, res.version);

        const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
          currentBalance.id,
          currentBalance.version,
          { reservedDelta: -res.quantity }
        );

        await this.movementRepo.record({
          stockBalanceId: updatedBalance.id,
          warehouseId: updatedBalance.warehouseId,
          variantId: updatedBalance.variantId,
          movementType: MovementType.RELEASE,
          quantityDelta: res.quantity,
          onHandAfter: updatedBalance.onHand,
          reservedAfter: updatedBalance.reserved,
          availableAfter: updatedBalance.available,
          sourceType: SourceType.CHECKOUT_RESERVATION,
          sourceId: res.id,
          reason: 'Automated TTL expiry sweep',
        });

        await this.recordOutboxEvent('inventory.stock_released', res.id, {
          stockBalanceId: updatedBalance.id,
          quantity: res.quantity,
          reason: 'Automated TTL expiry sweep',
        });

        expiredCount++;
      } catch (err) {
        console.error(`Failed to expire reservation '${res.id}':`, err);
      }
    }

    return expiredCount;
  }

  public async getBalance(warehouseId: string, variantId: string): Promise<StockBalanceModel | null> {
    return this.stockBalanceRepo.findByWarehouseAndVariant(warehouseId, variantId);
  }

  public async listBalances(options?: {
    warehouseId?: string;
    variantId?: string;
    sellerId?: string;
    lowStockOnly?: boolean;
  }): Promise<StockBalanceModel[]> {
    return this.stockBalanceRepo.findMany(options);
  }

  public async getMovementLedger(options?: {
    warehouseId?: string;
    variantId?: string;
    stockBalanceId?: string;
    limit?: number;
  }): Promise<StockMovementModel[]> {
    return this.movementRepo.list(options);
  }

  private async recordOutboxEvent(eventType: string, aggregateId: string, payload: any): Promise<void> {
    try {
      await (prisma as any).outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX_EVENT ?? 'evt'),
          eventType,
          aggregateType: 'INVENTORY',
          aggregateId,
          payload: payload ?? {},
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });
    } catch (err) {
      console.warn('Non-fatal: failed to persist outbox event for inventory', err);
    }
  }
}
