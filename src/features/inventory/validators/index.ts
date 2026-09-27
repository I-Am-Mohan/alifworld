/**
 * AlifWorld Warehouse & Inventory Zod Validators
 * 
 * Strict validation for warehouse setups, stock intake, atomic reservations,
 * and ledger adjustments.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0016, ADR-0022, ADR-0026
 */

import { z } from 'zod';
import { MovementType, SourceType } from '../types';

const WAREHOUSE_CODE_REGEX = /^[A-Z0-9_-]{3,20}$/;

export const BangladeshDivisions = [
  'DHAKA',
  'CHITTAGONG',
  'RAJSHAHI',
  'KHULNA',
  'BARISAL',
  'SYLHET',
  'RANGPUR',
  'MYMENSINGH',
] as const;

export const CreateWarehouseSchema = z.object({
  sellerId: z.string().optional().nullable(),
  name: z.string().min(3, 'Warehouse name must be at least 3 characters').max(100),
  code: z.string().regex(WAREHOUSE_CODE_REGEX, 'Code must be uppercase alphanumeric (3-20 chars)'),
  division: z.enum(BangladeshDivisions, {
    errorMap: () => ({ message: 'Must be one of Bangladesh 8 administrative divisions' }),
  }),
  district: z.string().min(2, 'District is required').max(50),
  upazila: z.string().max(50).optional().nullable(),
  addressLine: z.string().min(5, 'Physical address line is required').max(255),
  postalCode: z.string().max(20).optional().nullable(),
  isPlatformHub: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;
export type CreateWarehouseRawInput = z.input<typeof CreateWarehouseSchema>;

export const UpdateWarehouseSchema = CreateWarehouseSchema.partial().extend({
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
});

export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;

export const ReceiveStockSchema = z.object({
  warehouseId: z.string().min(4, 'Warehouse ID is required'),
  variantId: z.string().min(4, 'Product Variant ID is required'),
  quantity: z.number().int().min(1, 'Intake quantity must be at least 1 unit'),
  sourceType: z.nativeEnum(SourceType).default(SourceType.PURCHASE_ORDER),
  sourceId: z.string().min(2, 'Source reference ID is required'),
  reason: z.string().max(255).optional().nullable(),
});

export type ReceiveStockInput = z.infer<typeof ReceiveStockSchema>;

export const ReserveStockSchema = z.object({
  warehouseId: z.string().min(4, 'Warehouse ID is required'),
  variantId: z.string().min(4, 'Product Variant ID is required'),
  quantity: z.number().int().min(1, 'Reservation quantity must be at least 1 unit'),
  orderId: z.string().optional().nullable(),
  cartId: z.string().optional().nullable(),
  ttlMinutes: z.number().int().min(1).max(1440).default(15), // Default 15-minute checkout reservation
});

export type ReserveStockInput = z.infer<typeof ReserveStockSchema>;
export type ReserveStockRawInput = z.input<typeof ReserveStockSchema>;

export const ReleaseReservationSchema = z.object({
  reservationId: z.string().min(4, 'Reservation ID is required'),
  reason: z.string().max(255).optional().nullable(),
});

export type ReleaseReservationInput = z.infer<typeof ReleaseReservationSchema>;

export const CommitReservationSchema = z.object({
  reservationId: z.string().min(4, 'Reservation ID is required'),
  orderId: z.string().min(2, 'Order ID is required to commit reservation'),
});

export type CommitReservationInput = z.infer<typeof CommitReservationSchema>;

export const CompensateInventorySchema = z.object({
  warehouseId: z.string().min(4, 'Warehouse ID is required'),
  variantId: z.string().min(4, 'Product Variant ID is required'),
  quantity: z.number().int().min(1, 'Compensation quantity must be at least 1 unit'),
  orderId: z.string().optional().nullable(),
  reservationId: z.string().optional().nullable(),
  reason: z.string().min(5, 'Mandatory audit reason required for compensating inventory operation'),
});

export type CompensateInventoryInput = z.infer<typeof CompensateInventorySchema>;

export const ExpireStaleReservationsSchema = z.object({
  cutoffDate: z.coerce.date().optional(),
});

export type ExpireStaleReservationsInput = z.infer<typeof ExpireStaleReservationsSchema>;

export const AdjustStockSchema = z.object({
  stockBalanceId: z.string().min(4, 'Stock balance ID is required'),
  movementType: z.enum([MovementType.ADJUST, MovementType.DAMAGE, MovementType.WRITE_OFF]),
  quantityDelta: z.number().int().refine((val) => val !== 0, {
    message: 'Quantity delta cannot be zero',
  }),
  reason: z.string().min(5, 'Mandatory audit reason required for manual inventory adjustments'),
});

export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;

export const QuarantineStockSchema = z.object({
  stockBalanceId: z.string().min(4, 'Stock balance ID is required'),
  action: z.enum(['QUARANTINE', 'RELEASE_TO_AVAILABLE', 'RELEASE_TO_DAMAGED']),
  quantity: z.number().int().min(1, 'Quarantine quantity must be at least 1 unit'),
  reason: z.string().min(5, 'Mandatory audit reason required for quarantine operations'),
});

export type QuarantineStockInput = z.infer<typeof QuarantineStockSchema>;

export const QueryStockBalancesSchema = z.object({
  warehouseId: z.string().optional(),
  variantId: z.string().optional(),
  sellerId: z.string().optional(),
  lowStockOnly: z.coerce.boolean().optional(),
});

export type QueryStockBalancesInput = z.infer<typeof QueryStockBalancesSchema>;

export const QueryStockMovementsSchema = z.object({
  warehouseId: z.string().optional(),
  variantId: z.string().optional(),
  stockBalanceId: z.string().optional(),
  sellerId: z.string().optional(),
  movementType: z.enum([
    MovementType.RECEIVE,
    MovementType.RESERVE,
    MovementType.RELEASE,
    MovementType.COMMIT,
    MovementType.ADJUST,
    MovementType.RETURN,
    MovementType.DAMAGE,
    MovementType.WRITE_OFF,
  ]).optional(),
  sourceType: z.nativeEnum(SourceType).optional(),
  sourceId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryStockMovementsInput = z.infer<typeof QueryStockMovementsSchema>;
export type QueryStockMovementsRawInput = z.input<typeof QueryStockMovementsSchema>;

export const UpdateStockThresholdsSchema = z.object({
  stockBalanceId: z.string().min(4, 'Stock balance ID is required'),
  lowStockThreshold: z.number().int().min(0, 'Low stock threshold must be >= 0'),
  reorderPoint: z.number().int().min(0, 'Reorder point must be >= 0'),
});

export type UpdateStockThresholdsInput = z.infer<typeof UpdateStockThresholdsSchema>;

export const QueryLowStockAlertsSchema = z.object({
  warehouseId: z.string().optional(),
  sellerId: z.string().optional(),
});

export type QueryLowStockAlertsInput = z.infer<typeof QueryLowStockAlertsSchema>;

export const CreateStockTransferSchema = z.object({
  fromWarehouseId: z.string().min(4, 'Source warehouse ID is required'),
  toWarehouseId: z.string().min(4, 'Destination warehouse ID is required'),
  variantId: z.string().min(4, 'Product Variant ID is required'),
  quantity: z.number().int().min(1, 'Transfer quantity must be at least 1 unit'),
  reason: z.string().max(255).optional().nullable(),
});

export type CreateStockTransferInput = z.infer<typeof CreateStockTransferSchema>;

export const ReceiveStockTransferSchema = z.object({
  transferId: z.string().min(4, 'Transfer ID is required'),
  receivedQuantity: z.number().int().min(1).optional(),
  notes: z.string().max(255).optional().nullable(),
});

export type ReceiveStockTransferInput = z.infer<typeof ReceiveStockTransferSchema>;

export const CreateStockCountSchema = z.object({
  warehouseId: z.string().min(4, 'Warehouse ID is required'),
  title: z.string().min(3, 'Audit title must be at least 3 characters'),
  notes: z.string().max(255).optional().nullable(),
});

export type CreateStockCountInput = z.infer<typeof CreateStockCountSchema>;

export const SubmitStockCountCorrectionSchema = z.object({
  countSessionId: z.string().min(4, 'Count session ID is required'),
  stockBalanceId: z.string().min(4, 'Stock balance ID is required'),
  countedQuantity: z.number().int().min(0, 'Counted quantity must be non-negative'),
  reason: z.string().min(5, 'Mandatory audit justification required for count variance correction'),
});

export type SubmitStockCountCorrectionInput = z.infer<typeof SubmitStockCountCorrectionSchema>;

export const ApproveStockCountCorrectionSchema = z.object({
  correctionId: z.string().min(4, 'Correction ID is required'),
  approved: z.boolean(),
  rejectionReason: z.string().max(255).optional().nullable(),
});

export type ApproveStockCountCorrectionInput = z.infer<typeof ApproveStockCountCorrectionSchema>;
