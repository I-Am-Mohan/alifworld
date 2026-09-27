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
  QuarantineStockSchema,
  CompensateInventorySchema,
  UpdateStockThresholdsSchema,
  CreateStockTransferSchema,
  ReceiveStockTransferSchema,
  CreateStockCountSchema,
  SubmitStockCountCorrectionSchema,
  ApproveStockCountCorrectionSchema,
  ReceiveRmaReturnSchema,
  InspectQuarantineItemSchema,
  RestockItemSchema,
  ReceiveStockInput,
  ReserveStockInput,
  ReserveStockRawInput,
  ReleaseReservationInput,
  CommitReservationInput,
  AdjustStockInput,
  QuarantineStockInput,
  CompensateInventoryInput,
  UpdateStockThresholdsInput,
  CreateStockTransferInput,
  ReceiveStockTransferInput,
  CreateStockCountInput,
  SubmitStockCountCorrectionInput,
  ApproveStockCountCorrectionInput,
  ReceiveRmaReturnInput,
  InspectQuarantineItemInput,
  RestockItemInput,
} from '../validators';
import {
  StockBalanceModel,
  StockReservationModel,
  StockMovementModel,
  StockTransferRecord,
  StockCountCorrectionRecord,
  RmaReturnRecord,
  MovementType,
  ReservationStatus,
  SourceType,
} from '../types';

export class InventoryService {
  private transfers = new Map<string, StockTransferRecord>();
  private countCorrections = new Map<string, StockCountCorrectionRecord>();
  private rmaReturns = new Map<string, RmaReturnRecord>();

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
   * Features idempotency under retries and atomic OCC retry loop for concurrency protection.
   */
  public async reserveStock(
    input: ReserveStockRawInput
  ): Promise<{ reservation: StockReservationModel; balance: StockBalanceModel }> {
    const validated = ReserveStockSchema.parse(input);

    const initialBalance = await this.stockBalanceRepo.findByWarehouseAndVariant(
      validated.warehouseId,
      validated.variantId
    );

    if (!initialBalance) {
      throw new NotFoundError(
        `No stock balance found for warehouse '${validated.warehouseId}' and variant '${validated.variantId}'.`
      );
    }

    // 1. Idempotency Check: if active unexpired reservation already exists for this cart/order reference, return it
    if (validated.cartId || validated.orderId) {
      const existingReservation = await this.reservationRepo.findExistingActiveReservation({
        stockBalanceId: initialBalance.id,
        cartId: validated.cartId,
        orderId: validated.orderId,
        quantity: validated.quantity,
      });

      if (existingReservation) {
        const currentBal = await this.stockBalanceRepo.findById(initialBalance.id);
        return { reservation: existingReservation, balance: currentBal || initialBalance };
      }
    }

    // 2. Atomic OCC Retry Loop for Concurrency Protection
    const maxRetries = 3;
    let attempt = 0;
    let updatedBalance: StockBalanceModel | null = null;

    while (attempt < maxRetries) {
      attempt++;
      const currentBalance = await this.stockBalanceRepo.findByWarehouseAndVariant(
        validated.warehouseId,
        validated.variantId
      );

      if (!currentBalance) {
        throw new NotFoundError(
          `No stock balance found for warehouse '${validated.warehouseId}' and variant '${validated.variantId}'.`
        );
      }

      if (currentBalance.available < validated.quantity) {
        throw new ConflictError(
          `Insufficient stock available. Requested: ${validated.quantity}, Available: ${currentBalance.available}.`
        );
      }

      try {
        updatedBalance = await this.stockBalanceRepo.atomicUpdate(
          currentBalance.id,
          currentBalance.version,
          { reservedDelta: validated.quantity }
        );
        break; // Success! Break retry loop
      } catch (err) {
        if (err instanceof ConflictError && attempt < maxRetries) {
          // Concurrency collision occurred; retry with fresh balance
          continue;
        }
        throw err;
      }
    }

    if (!updatedBalance) {
      throw new ConflictError('Concurrent inventory reservation race condition. Please retry your request.');
    }

    // 3. Create reservation record with TTL cutoff
    const reservation = await this.reservationRepo.create({
      stockBalanceId: updatedBalance.id,
      quantity: validated.quantity,
      cartId: validated.cartId,
      orderId: validated.orderId,
      ttlMinutes: validated.ttlMinutes,
    });

    // 4. Record audit trail ledger entry
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

    // Idempotent handling: If already released, return existing record and current balance
    if (reservation.status === ReservationStatus.RELEASED) {
      const currentBalance = await this.stockBalanceRepo.findById(reservation.stockBalanceId);
      if (!currentBalance) {
        throw new NotFoundError(`Stock balance '${reservation.stockBalanceId}' not found.`);
      }
      return { reservation, balance: currentBalance };
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

    // Idempotent handling: If already committed, return existing record and current balance
    if (reservation.status === ReservationStatus.COMMITTED) {
      const currentBalance = await this.stockBalanceRepo.findById(reservation.stockBalanceId);
      if (!currentBalance) {
        throw new NotFoundError(`Stock balance '${reservation.stockBalanceId}' not found.`);
      }
      return { reservation, balance: currentBalance };
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

    const deltas: {
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
   * Transfers stock to or from quarantine (e.g. quality inspection, RMA return inspection).
   * Validates available stock non-negativity.
   */
  public async quarantineStock(
    input: QuarantineStockInput,
    actorId: string
  ): Promise<{ balance: StockBalanceModel; movement: StockMovementModel }> {
    const validated = QuarantineStockSchema.parse(input);

    const currentBalance = await this.stockBalanceRepo.findById(validated.stockBalanceId);
    if (!currentBalance) {
      throw new NotFoundError(`Stock balance '${validated.stockBalanceId}' not found.`);
    }

    const deltas: {
      onHandDelta?: number;
      reservedDelta?: number;
      damagedDelta?: number;
      quarantinedDelta?: number;
    } = {};

    let movementType: MovementType = MovementType.ADJUST;
    let quantityDelta = validated.quantity;

    if (validated.action === 'QUARANTINE') {
      deltas.quarantinedDelta = validated.quantity;
      movementType = MovementType.ADJUST;
      quantityDelta = -validated.quantity;
    } else if (validated.action === 'RELEASE_TO_AVAILABLE') {
      if (currentBalance.quarantined < validated.quantity) {
        throw new ConflictError(
          `Cannot release ${validated.quantity} quarantined units. Current quarantined balance: ${currentBalance.quarantined}.`
        );
      }
      deltas.quarantinedDelta = -validated.quantity;
      movementType = MovementType.RELEASE;
      quantityDelta = validated.quantity;
    } else if (validated.action === 'RELEASE_TO_DAMAGED') {
      if (currentBalance.quarantined < validated.quantity) {
        throw new ConflictError(
          `Cannot release ${validated.quantity} quarantined units. Current quarantined balance: ${currentBalance.quarantined}.`
        );
      }
      deltas.quarantinedDelta = -validated.quantity;
      deltas.onHandDelta = -validated.quantity;
      deltas.damagedDelta = validated.quantity;
      movementType = MovementType.DAMAGE;
      quantityDelta = -validated.quantity;
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
      movementType,
      quantityDelta,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.AUDIT_ADJUSTMENT,
      sourceId: currentBalance.id,
      actorId,
      reason: validated.reason,
    });

    await this.recordOutboxEvent('inventory.stock_quarantined', updatedBalance.id, {
      action: validated.action,
      quantity: validated.quantity,
      actorId,
      reason: validated.reason,
    });

    return { balance: updatedBalance, movement };
  }

  /**
   * Performs a compensating inventory operation (e.g. order cancelled post-commit, payment failed, RMA return).
   * Restores on-hand/available stock balances with full audit ledger tracking.
   */
  public async compensateInventory(
    input: CompensateInventoryInput,
    actorId?: string
  ): Promise<{ balance: StockBalanceModel; movement: StockMovementModel }> {
    const validated = CompensateInventorySchema.parse(input);

    const currentBalance = await this.stockBalanceRepo.findByWarehouseAndVariant(
      validated.warehouseId,
      validated.variantId
    );

    if (!currentBalance) {
      throw new NotFoundError(
        `Stock balance not found for warehouse '${validated.warehouseId}' and variant '${validated.variantId}'.`
      );
    }

    let deltas: { onHandDelta?: number; reservedDelta?: number } = {
      onHandDelta: validated.quantity,
    };

    // If reservation ID is provided, check if active and release instead of restoring physical onHand
    if (validated.reservationId) {
      const reservation = await this.reservationRepo.findById(validated.reservationId);
      if (reservation && reservation.status === ReservationStatus.ACTIVE) {
        deltas = { reservedDelta: -reservation.quantity };
        await this.reservationRepo.release(reservation.id, reservation.version);
      }
    }

    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      currentBalance.id,
      currentBalance.version,
      deltas
    );

    const movementType = deltas.onHandDelta ? MovementType.RETURN : MovementType.RELEASE;

    const movement = await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType,
      quantityDelta: validated.quantity,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: validated.orderId ? SourceType.ORDER_FULFILLMENT : SourceType.RETURN_RMA,
      sourceId: validated.orderId ?? validated.reservationId ?? currentBalance.id,
      actorId,
      reason: validated.reason,
    });

    await this.recordOutboxEvent('inventory.stock_compensated', updatedBalance.id, {
      warehouseId: validated.warehouseId,
      variantId: validated.variantId,
      quantity: validated.quantity,
      orderId: validated.orderId,
      reservationId: validated.reservationId,
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

  /**
   * Updates low stock threshold and reorder point configuration for a stock balance.
   * Automatically triggers low stock detection outbox alert if current balance is at or below threshold.
   */
  public async updateStockThresholds(
    input: UpdateStockThresholdsInput,
    actorId?: string
  ): Promise<StockBalanceModel> {
    const validated = UpdateStockThresholdsSchema.parse(input);

    const updated = await this.stockBalanceRepo.updateThresholds(
      validated.stockBalanceId,
      validated.lowStockThreshold,
      validated.reorderPoint
    );

    if (updated.available <= updated.lowStockThreshold) {
      await this.recordOutboxEvent('inventory.low_stock_detected', updated.id, {
        stockBalanceId: updated.id,
        warehouseId: updated.warehouseId,
        variantId: updated.variantId,
        available: updated.available,
        lowStockThreshold: updated.lowStockThreshold,
        reorderPoint: updated.reorderPoint,
        triggeredBy: actorId ?? 'SYSTEM',
      });
    }

    return updated;
  }

  /**
   * Lists stock balances currently triggering low stock alerts (available <= lowStockThreshold).
   */
  public async listLowStockAlerts(options?: {
    warehouseId?: string;
    sellerId?: string;
  }): Promise<StockBalanceModel[]> {
    return this.stockBalanceRepo.findMany({
      warehouseId: options?.warehouseId,
      sellerId: options?.sellerId,
      lowStockOnly: true,
    });
  }

  /**
   * Generates calculated reorder recommendations based on available stock vs reorderPoint.
   */
  public async getReorderRecommendations(options?: {
    warehouseId?: string;
    sellerId?: string;
  }): Promise<
    Array<{
      stockBalance: StockBalanceModel;
      currentAvailable: number;
      reorderPoint: number;
      lowStockThreshold: number;
      recommendedReorderQuantity: number;
      urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    }>
  > {
    const allBalances = await this.stockBalanceRepo.findMany({
      warehouseId: options?.warehouseId,
      sellerId: options?.sellerId,
    });

    const recommendations = allBalances
      .filter((b) => b.available <= b.reorderPoint)
      .map((b) => {
        const recommendedQty = Math.max(b.reorderPoint * 2 - b.available, b.reorderPoint);
        const urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
          b.available === 0 ? 'CRITICAL' : b.available <= b.lowStockThreshold ? 'HIGH' : 'MEDIUM';

        return {
          stockBalance: b,
          currentAvailable: b.available,
          reorderPoint: b.reorderPoint,
          lowStockThreshold: b.lowStockThreshold,
          recommendedReorderQuantity: recommendedQty,
          urgency,
        };
      });

    return recommendations.sort((a, b) => a.currentAvailable - b.currentAvailable);
  }

  public async getMovementLedger(options?: {
    warehouseId?: string;
    variantId?: string;
    stockBalanceId?: string;
    limit?: number;
  }): Promise<StockMovementModel[]> {
    return this.movementRepo.list(options);
  }

  public async listPaginatedMovements(options?: {
    warehouseId?: string;
    variantId?: string;
    stockBalanceId?: string;
    sellerId?: string;
    movementType?: MovementType;
    sourceType?: SourceType;
    sourceId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    return this.movementRepo.listPaginated(options);
  }

  /**
   * Initiates an inter-warehouse stock transfer (from source warehouse to destination warehouse).
   * Atomically deducts stock from source warehouse and sets transfer state to IN_TRANSIT.
   */
  public async transferStock(
    input: CreateStockTransferInput,
    actorId: string
  ): Promise<{ transfer: StockTransferRecord; sourceBalance: StockBalanceModel }> {
    const validated = CreateStockTransferSchema.parse(input);

    if (validated.fromWarehouseId === validated.toWarehouseId) {
      throw new ValidationError('Source and destination warehouses cannot be the same facility.');
    }

    const sourceBalance = await this.stockBalanceRepo.findByWarehouseAndVariant(
      validated.fromWarehouseId,
      validated.variantId
    );

    if (!sourceBalance) {
      throw new NotFoundError(
        `Source stock balance not found for warehouse '${validated.fromWarehouseId}' and variant '${validated.variantId}'.`
      );
    }

    if (sourceBalance.available < validated.quantity) {
      throw new ConflictError(
        `Insufficient available stock for transfer. Requested: ${validated.quantity}, Available: ${sourceBalance.available}.`
      );
    }

    // Atomically deduct stock from source warehouse
    const updatedSourceBalance = await this.stockBalanceRepo.atomicUpdate(
      sourceBalance.id,
      sourceBalance.version,
      { onHandDelta: -validated.quantity }
    );

    // Record transfer departure movement
    await this.movementRepo.record({
      stockBalanceId: updatedSourceBalance.id,
      warehouseId: updatedSourceBalance.warehouseId,
      variantId: updatedSourceBalance.variantId,
      movementType: MovementType.ADJUST,
      quantityDelta: -validated.quantity,
      onHandAfter: updatedSourceBalance.onHand,
      reservedAfter: updatedSourceBalance.reserved,
      availableAfter: updatedSourceBalance.available,
      sourceType: SourceType.AUDIT_ADJUSTMENT,
      sourceId: updatedSourceBalance.id,
      actorId,
      reason: validated.reason ?? `Inter-warehouse transfer to ${validated.toWarehouseId}`,
    });

    const transferId = generatePrefixedId(ENTITY_PREFIXES.STOCK_BALANCE).replace('stb_', 'trf_');
    const transferRecord: StockTransferRecord = {
      id: transferId,
      fromWarehouseId: validated.fromWarehouseId,
      toWarehouseId: validated.toWarehouseId,
      variantId: validated.variantId,
      quantity: validated.quantity,
      status: 'IN_TRANSIT',
      reason: validated.reason,
      initiatedBy: actorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.transfers.set(transferId, transferRecord);

    await this.recordOutboxEvent('inventory.transfer_initiated', transferId, {
      transferId,
      fromWarehouseId: validated.fromWarehouseId,
      toWarehouseId: validated.toWarehouseId,
      variantId: validated.variantId,
      quantity: validated.quantity,
      initiatedBy: actorId,
    });

    return { transfer: transferRecord, sourceBalance: updatedSourceBalance };
  }

  /**
   * Receives an in-transit inter-warehouse stock transfer at destination warehouse.
   * Atomically increments destination stock balance and sets transfer status to COMPLETED.
   */
  public async receiveStockTransfer(
    input: ReceiveStockTransferInput,
    actorId: string
  ): Promise<{ transfer: StockTransferRecord; destBalance: StockBalanceModel }> {
    const validated = ReceiveStockTransferSchema.parse(input);

    const transfer = this.transfers.get(validated.transferId);
    if (!transfer) {
      throw new NotFoundError(`Stock transfer '${validated.transferId}' not found.`);
    }

    if (transfer.status !== 'IN_TRANSIT') {
      throw new ConflictError(`Cannot receive stock transfer in '${transfer.status}' status.`);
    }

    const destBalance = await this.stockBalanceRepo.getOrCreate(
      transfer.toWarehouseId,
      transfer.variantId
    );

    const updatedDestBalance = await this.stockBalanceRepo.atomicUpdate(
      destBalance.id,
      destBalance.version,
      { onHandDelta: transfer.quantity }
    );

    await this.movementRepo.record({
      stockBalanceId: updatedDestBalance.id,
      warehouseId: updatedDestBalance.warehouseId,
      variantId: updatedDestBalance.variantId,
      movementType: MovementType.RECEIVE,
      quantityDelta: transfer.quantity,
      onHandAfter: updatedDestBalance.onHand,
      reservedAfter: updatedDestBalance.reserved,
      availableAfter: updatedDestBalance.available,
      sourceType: SourceType.PURCHASE_ORDER,
      sourceId: transfer.id,
      actorId,
      reason: validated.notes ?? `Inter-warehouse transfer received from ${transfer.fromWarehouseId}`,
    });

    const completedTransfer: StockTransferRecord = {
      ...transfer,
      status: 'COMPLETED',
      updatedAt: new Date(),
    };

    this.transfers.set(transfer.id, completedTransfer);

    await this.recordOutboxEvent('inventory.transfer_completed', transfer.id, {
      transferId: transfer.id,
      destWarehouseId: transfer.toWarehouseId,
      quantity: transfer.quantity,
      receivedBy: actorId,
    });

    return { transfer: completedTransfer, destBalance: updatedDestBalance };
  }

  /**
   * Initiates a physical inventory count session for audit reconciliation.
   */
  public async initiateStockCountSession(
    input: CreateStockCountInput,
    actorId: string
  ): Promise<{ sessionId: string; warehouseId: string; title: string; createdAt: string }> {
    const validated = CreateStockCountSchema.parse(input);
    const sessionId = `cnt_${Math.random().toString(36).substring(2, 9)}`;

    await this.recordOutboxEvent('inventory.stock_count_initiated', sessionId, {
      sessionId,
      warehouseId: validated.warehouseId,
      title: validated.title,
      initiatedBy: actorId,
    });

    return {
      sessionId,
      warehouseId: validated.warehouseId,
      title: validated.title,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Submits a physical count variance correction.
   * If variance > 10 units, requires Maker-Checker Dual Approval from Admin.
   */
  public async submitStockCountCorrection(
    input: SubmitStockCountCorrectionInput,
    actorId: string
  ): Promise<{ correction: StockCountCorrectionRecord; balance?: StockBalanceModel }> {
    const validated = SubmitStockCountCorrectionSchema.parse(input);

    const stockBalance = await this.stockBalanceRepo.findById(validated.stockBalanceId);
    if (!stockBalance) {
      throw new NotFoundError(`Stock balance '${validated.stockBalanceId}' not found.`);
    }

    const variance = validated.countedQuantity - stockBalance.onHand;
    const correctionId = `cor_${Math.random().toString(36).substring(2, 9)}`;
    const requiresApproval = Math.abs(variance) > 10;

    if (requiresApproval) {
      const correctionRecord: StockCountCorrectionRecord = {
        id: correctionId,
        countSessionId: validated.countSessionId,
        stockBalanceId: validated.stockBalanceId,
        currentOnHand: stockBalance.onHand,
        countedQuantity: validated.countedQuantity,
        variance,
        reason: validated.reason,
        requiresApproval: true,
        status: 'PENDING_APPROVAL',
        submittedBy: actorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.countCorrections.set(correctionId, correctionRecord);

      await this.recordOutboxEvent('inventory.stock_count_correction_flagged', correctionId, {
        correctionId,
        variance,
        submittedBy: actorId,
      });

      return { correction: correctionRecord };
    }

    // Auto-approve small variances (<= 10 units)
    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      stockBalance.id,
      stockBalance.version,
      { onHandDelta: variance }
    );

    await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType: MovementType.ADJUST,
      quantityDelta: variance,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.AUDIT_ADJUSTMENT,
      sourceId: correctionId,
      actorId,
      reason: validated.reason,
    });

    const autoApprovedCorrection: StockCountCorrectionRecord = {
      id: correctionId,
      countSessionId: validated.countSessionId,
      stockBalanceId: validated.stockBalanceId,
      currentOnHand: stockBalance.onHand,
      countedQuantity: validated.countedQuantity,
      variance,
      reason: validated.reason,
      requiresApproval: false,
      status: 'APPROVED',
      submittedBy: actorId,
      approvedBy: 'SYSTEM_AUTO',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.countCorrections.set(correctionId, autoApprovedCorrection);

    return { correction: autoApprovedCorrection, balance: updatedBalance };
  }

  /**
   * Maker-Checker Approval for high-variance inventory count corrections.
   * Enforces Gate-05 Maker-Checker dual authorization invariant: approver cannot be submitter (actorId !== correction.submittedBy).
   */
  public async approveStockCountCorrection(
    input: ApproveStockCountCorrectionInput,
    actorId: string
  ): Promise<{ correction: StockCountCorrectionRecord; balance?: StockBalanceModel }> {
    const validated = ApproveStockCountCorrectionSchema.parse(input);

    const correction = this.countCorrections.get(validated.correctionId);
    if (!correction) {
      throw new NotFoundError(`Stock count correction '${validated.correctionId}' not found.`);
    }

    if (correction.status !== 'PENDING_APPROVAL') {
      throw new ConflictError(`Cannot approve correction in '${correction.status}' status.`);
    }

    // Maker-Checker dual authorization security check
    if (actorId === correction.submittedBy) {
      throw new ConflictError(
        'Maker-Checker Dual Authorization Rule Violation: The submitter (maker) cannot approve their own inventory correction adjustment.'
      );
    }

    if (!validated.approved) {
      const rejectedCorrection: StockCountCorrectionRecord = {
        ...correction,
        status: 'REJECTED',
        rejectionReason: validated.rejectionReason ?? 'Rejected by reviewer',
        updatedAt: new Date(),
      };
      this.countCorrections.set(correction.id, rejectedCorrection);
      return { correction: rejectedCorrection };
    }

    const stockBalance = await this.stockBalanceRepo.findById(correction.stockBalanceId);
    if (!stockBalance) {
      throw new NotFoundError(`Stock balance '${correction.stockBalanceId}' not found.`);
    }

    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      stockBalance.id,
      stockBalance.version,
      { onHandDelta: correction.variance }
    );

    await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType: MovementType.ADJUST,
      quantityDelta: correction.variance,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.AUDIT_ADJUSTMENT,
      sourceId: correction.id,
      actorId,
      reason: `Maker-Checker Approved Audit Correction: ${correction.reason}`,
    });

    const approvedCorrection: StockCountCorrectionRecord = {
      ...correction,
      status: 'APPROVED',
      approvedBy: actorId,
      updatedAt: new Date(),
    };

    this.countCorrections.set(correction.id, approvedCorrection);

    await this.recordOutboxEvent('inventory.stock_count_correction_approved', correction.id, {
      correctionId: correction.id,
      approvedBy: actorId,
      variance: correction.variance,
    });

    return { correction: approvedCorrection, balance: updatedBalance };
  }

  public async listPendingCountCorrections(): Promise<StockCountCorrectionRecord[]> {
    return Array.from(this.countCorrections.values()).filter((c) => c.status === 'PENDING_APPROVAL');
  }

  public async listStockTransfers(): Promise<StockTransferRecord[]> {
    return Array.from(this.transfers.values());
  }

  /**
   * Processes RMA return merchandise intake at a warehouse.
   * Depending on initialDisposition, places item in quarantined balance (inspection), onHand (restock), or damaged.
   */
  public async processRmaReturnIntake(
    input: ReceiveRmaReturnInput,
    actorId: string
  ): Promise<{ rmaRecord: RmaReturnRecord; balance: StockBalanceModel }> {
    const validated = ReceiveRmaReturnSchema.parse(input);

    const stockBalance = await this.stockBalanceRepo.getOrCreate(
      validated.warehouseId,
      validated.variantId
    );

    const deltas: {
      onHandDelta?: number;
      quarantinedDelta?: number;
      damagedDelta?: number;
    } = {};

    let status: 'RECEIVED' | 'RESTOCKED' | 'DAMAGED' = 'RECEIVED';
    let movementType: MovementType = MovementType.RETURN;

    if (validated.initialDisposition === 'QUARANTINE_INSPECTION') {
      deltas.onHandDelta = validated.quantity;
      deltas.quarantinedDelta = validated.quantity;
      movementType = MovementType.ADJUST;
      status = 'RECEIVED';
    } else if (validated.initialDisposition === 'RESTOCK_AVAILABLE') {
      deltas.onHandDelta = validated.quantity;
      movementType = MovementType.RETURN;
      status = 'RESTOCKED';
    } else if (validated.initialDisposition === 'MARK_DAMAGED') {
      deltas.damagedDelta = validated.quantity;
      movementType = MovementType.DAMAGE;
      status = 'DAMAGED';
    }

    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      stockBalance.id,
      stockBalance.version,
      deltas
    );

    await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType,
      quantityDelta: validated.quantity,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.RETURN_RMA,
      sourceId: validated.rmaNumber,
      actorId,
      reason: validated.customerReason ?? `RMA Return Intake (${validated.initialDisposition})`,
    });

    const rmaRecord: RmaReturnRecord = {
      id: `rma_${Math.random().toString(36).substring(2, 9)}`,
      rmaNumber: validated.rmaNumber,
      orderId: validated.orderId,
      warehouseId: validated.warehouseId,
      variantId: validated.variantId,
      quantity: validated.quantity,
      disposition: validated.initialDisposition,
      status,
      receivedBy: actorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rmaReturns.set(validated.rmaNumber, rmaRecord);

    await this.recordOutboxEvent('inventory.return_received', rmaRecord.id, {
      rmaNumber: validated.rmaNumber,
      orderId: validated.orderId,
      disposition: validated.initialDisposition,
      quantity: validated.quantity,
      receivedBy: actorId,
    });

    return { rmaRecord, balance: updatedBalance };
  }

  /**
   * Conducts quality control inspection on quarantined returned items.
   * Restocks passed items into available inventory or moves failed items to damaged/write-off.
   */
  public async inspectQuarantinedReturn(
    input: InspectQuarantineItemInput,
    actorId: string
  ): Promise<{ rmaRecord?: RmaReturnRecord; balance: StockBalanceModel }> {
    const validated = InspectQuarantineItemSchema.parse(input);

    const stockBalance = await this.stockBalanceRepo.findById(validated.stockBalanceId);
    if (!stockBalance) {
      throw new NotFoundError(`Stock balance '${validated.stockBalanceId}' not found.`);
    }

    if (stockBalance.quarantined < validated.quantity) {
      throw new ConflictError(
        `Insufficient quarantined stock for inspection. Quarantined: ${stockBalance.quarantined}, Requested: ${validated.quantity}.`
      );
    }

    const deltas: {
      onHandDelta?: number;
      quarantinedDelta?: number;
      damagedDelta?: number;
    } = {
      quarantinedDelta: -validated.quantity,
    };

    let movementType: MovementType = MovementType.RELEASE;

    if (validated.inspectionResult === 'PASSED_RESTOCK') {
      movementType = MovementType.RELEASE;
    } else if (validated.inspectionResult === 'FAILED_DAMAGED') {
      deltas.damagedDelta = validated.quantity;
      movementType = MovementType.DAMAGE;
    } else if (validated.inspectionResult === 'FAILED_WRITE_OFF') {
      deltas.onHandDelta = -validated.quantity;
      movementType = MovementType.WRITE_OFF;
    }

    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      stockBalance.id,
      stockBalance.version,
      deltas
    );

    await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType,
      quantityDelta: validated.quantity,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.RETURN_RMA,
      sourceId: validated.rmaNumber,
      actorId,
      reason: `QC Inspection (${validated.inspectionResult}): ${validated.inspectionNotes}`,
    });

    const rmaRecord = this.rmaReturns.get(validated.rmaNumber);
    if (rmaRecord) {
      const updatedRma: RmaReturnRecord = {
        ...rmaRecord,
        inspectionResult: validated.inspectionResult,
        inspectionNotes: validated.inspectionNotes,
        status: validated.inspectionResult === 'PASSED_RESTOCK' ? 'RESTOCKED' : 'INSPECTED',
        inspectedBy: actorId,
        updatedAt: new Date(),
      };
      this.rmaReturns.set(validated.rmaNumber, updatedRma);
    }

    await this.recordOutboxEvent('inventory.return_inspected', validated.rmaNumber, {
      rmaNumber: validated.rmaNumber,
      inspectionResult: validated.inspectionResult,
      inspectedBy: actorId,
    });

    return { rmaRecord: this.rmaReturns.get(validated.rmaNumber), balance: updatedBalance };
  }

  /**
   * Direct restocking of a returned item into available stock.
   */
  public async restockReturnedItem(
    input: RestockItemInput,
    actorId: string
  ): Promise<{ balance: StockBalanceModel; movement: StockMovementModel }> {
    const validated = RestockItemSchema.parse(input);

    const stockBalance = await this.stockBalanceRepo.findById(validated.stockBalanceId);
    if (!stockBalance) {
      throw new NotFoundError(`Stock balance '${validated.stockBalanceId}' not found.`);
    }

    const updatedBalance = await this.stockBalanceRepo.atomicUpdate(
      stockBalance.id,
      stockBalance.version,
      { onHandDelta: validated.quantity }
    );

    const movement = await this.movementRepo.record({
      stockBalanceId: updatedBalance.id,
      warehouseId: updatedBalance.warehouseId,
      variantId: updatedBalance.variantId,
      movementType: MovementType.RETURN,
      quantityDelta: validated.quantity,
      onHandAfter: updatedBalance.onHand,
      reservedAfter: updatedBalance.reserved,
      availableAfter: updatedBalance.available,
      sourceType: SourceType.RETURN_RMA,
      sourceId: validated.rmaNumber,
      actorId,
      reason: validated.reason ?? `Restocked returned item under RMA ${validated.rmaNumber}`,
    });

    await this.recordOutboxEvent('inventory.return_restocked', validated.rmaNumber, {
      rmaNumber: validated.rmaNumber,
      quantity: validated.quantity,
      restockedBy: actorId,
    });

    return { balance: updatedBalance, movement };
  }

  public async listRmaReturns(): Promise<RmaReturnRecord[]> {
    return Array.from(this.rmaReturns.values());
  }

  private async recordOutboxEvent(eventType: string, aggregateId: string, payload: any): Promise<void> {
    try {
      await (prisma as any).outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
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
