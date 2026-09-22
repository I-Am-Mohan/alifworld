/**
 * AlifWorld Warehouse & Inventory Domain Types
 * 
 * Defines type contracts for warehouses, stock balances, atomic reservations,
 * movement ledgers, and inventory availability invariants.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0026
 */

export const MovementType = {
  RECEIVE: 'RECEIVE',
  RESERVE: 'RESERVE',
  RELEASE: 'RELEASE',
  COMMIT: 'COMMIT',
  ADJUST: 'ADJUST',
  RETURN: 'RETURN',
  DAMAGE: 'DAMAGE',
  WRITE_OFF: 'WRITE_OFF',
} as const;

export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export const ReservationStatus = {
  ACTIVE: 'ACTIVE',
  COMMITTED: 'COMMITTED',
  RELEASED: 'RELEASED',
  EXPIRED: 'EXPIRED',
} as const;

export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const SourceType = {
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  CHECKOUT_RESERVATION: 'CHECKOUT_RESERVATION',
  ORDER_FULFILLMENT: 'ORDER_FULFILLMENT',
  RETURN_RMA: 'RETURN_RMA',
  AUDIT_ADJUSTMENT: 'AUDIT_ADJUSTMENT',
} as const;

export type SourceType = (typeof SourceType)[keyof typeof SourceType];

export interface WarehouseModel {
  id: string;
  sellerId?: string | null;
  name: string;
  code: string;
  division: string;
  district: string;
  upazila?: string | null;
  addressLine: string;
  postalCode?: string | null;
  isPlatformHub: boolean;
  isActive: boolean;
  version: number;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockBalanceModel {
  id: string;
  warehouseId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  damaged: number;
  quarantined: number;
  available: number; // Invariant: OnHand - Reserved - Damaged - Quarantined
  lowStockThreshold: number;
  reorderPoint: number;
  version: number;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  warehouse?: WarehouseModel;
  variant?: {
    id: string;
    sku: string;
    title: string;
    product?: {
      id: string;
      title: string;
      sellerId: string;
    };
  };
}

export interface StockReservationModel {
  id: string;
  stockBalanceId: string;
  orderId?: string | null;
  cartId?: string | null;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  committedAt?: Date | null;
  releasedAt?: Date | null;
  version: number;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  stockBalance?: StockBalanceModel;
}

export interface StockMovementModel {
  id: string;
  stockBalanceId: string;
  warehouseId: string;
  variantId: string;
  movementType: MovementType;
  quantityDelta: number;
  onHandAfter: number;
  reservedAfter: number;
  availableAfter: number;
  sourceType: SourceType;
  sourceId: string;
  actorId?: string | null;
  reason?: string | null;
  createdAt: Date;
}

/**
 * Pure calculation helper enforcing the core inventory invariant:
 * Available = onHand - reserved - damaged - quarantined
 */
export function calculateAvailableStock(balances: {
  onHand: number;
  reserved: number;
  damaged: number;
  quarantined: number;
}): number {
  const calculated = balances.onHand - balances.reserved - balances.damaged - balances.quarantined;
  return Math.max(0, calculated);
}
