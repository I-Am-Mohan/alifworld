import { describe, expect, it } from 'bun:test';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { calculateAvailableStock, MovementType, SourceType, ReservationStatus } from '@/features/inventory/types';
import {
  CreateWarehouseSchema,
  UpdateWarehouseSchema,
  ReceiveStockSchema,
  ReserveStockSchema,
  ReleaseReservationSchema,
  CommitReservationSchema,
  AdjustStockSchema,
} from '@/features/inventory/validators';

describe('Inventory Domain: ID Generation & Prefixes', () => {
  it('generates IDs with correct domain prefixes', () => {
    const warehouseId = generatePrefixedId(ENTITY_PREFIXES.WAREHOUSE);
    const balanceId = generatePrefixedId(ENTITY_PREFIXES.STOCK_BALANCE);
    const reservationId = generatePrefixedId(ENTITY_PREFIXES.STOCK_RESERVATION);
    const movementId = generatePrefixedId(ENTITY_PREFIXES.STOCK_MOVEMENT);

    expect(warehouseId.startsWith('whs_')).toBe(true);
    expect(balanceId.startsWith('stb_')).toBe(true);
    expect(reservationId.startsWith('res_')).toBe(true);
    expect(movementId.startsWith('mov_')).toBe(true);
  });
});

describe('Inventory Domain: Core Availability Invariant', () => {
  it('strictly computes Available = OnHand - Reserved - Damaged - Quarantined', () => {
    const available = calculateAvailableStock({
      onHand: 100,
      reserved: 20,
      damaged: 5,
      quarantined: 3,
    });

    expect(available).toBe(72);
  });

  it('calculates available when reserved and damaged are zero', () => {
    const available = calculateAvailableStock({
      onHand: 50,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
    });

    expect(available).toBe(50);
  });

  it('returns 0 when all on-hand stock is locked in reservations', () => {
    const available = calculateAvailableStock({
      onHand: 30,
      reserved: 30,
      damaged: 0,
      quarantined: 0,
    });

    expect(available).toBe(0);
  });

  it('clamps at zero if theoretical count is negative', () => {
    const available = calculateAvailableStock({
      onHand: 10,
      reserved: 12,
      damaged: 2,
      quarantined: 0,
    });

    expect(available).toBe(0);
  });
});

describe('Inventory Domain: Warehouse Validator Schemas', () => {
  it('validates a valid warehouse setup across Bangladesh divisions', () => {
    const valid = {
      name: 'Dhaka Central Hub',
      code: 'DHK-HUB-01',
      division: 'DHAKA',
      district: 'Dhaka',
      upazila: 'Tejgaon',
      addressLine: 'Tejgaon Industrial Area, Dhaka',
      postalCode: '1208',
      isPlatformHub: true,
      isActive: true,
    };

    const result = CreateWarehouseSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('DHK-HUB-01');
      expect(result.data.division).toBe('DHAKA');
    }
  });

  it('rejects invalid warehouse division not in Bangladesh 8 divisions', () => {
    const invalid = {
      name: 'Invalid Hub',
      code: 'INV-HUB-01',
      division: 'CALIFORNIA',
      district: 'San Francisco',
      addressLine: '123 Market St',
    };

    const result = CreateWarehouseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects lowercase or invalid warehouse codes', () => {
    const lowercaseCode = {
      name: 'Banani Depot',
      code: 'banani-hub',
      division: 'DHAKA',
      district: 'Dhaka',
      addressLine: 'Road 11, Banani',
    };

    expect(CreateWarehouseSchema.safeParse(lowercaseCode).success).toBe(false);
  });

  it('requires version in UpdateWarehouseSchema for OCC protection', () => {
    const missingVersion = {
      name: 'Updated Hub Name',
    };
    expect(UpdateWarehouseSchema.safeParse(missingVersion).success).toBe(false);

    const withVersion = {
      name: 'Updated Hub Name',
      version: 2,
    };
    expect(UpdateWarehouseSchema.safeParse(withVersion).success).toBe(true);
  });
});

describe('Inventory Domain: Stock Movement & Reservation Schemas', () => {
  it('validates stock intake payload with purchase order reference', () => {
    const valid = {
      warehouseId: 'whs_test_123',
      variantId: 'var_test_456',
      quantity: 50,
      sourceType: SourceType.PURCHASE_ORDER,
      sourceId: 'PO-2026-001',
      reason: 'Factory bulk intake',
    };

    const result = ReceiveStockSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects non-positive intake quantity', () => {
    const zeroQty = {
      warehouseId: 'whs_test_123',
      variantId: 'var_test_456',
      quantity: 0,
      sourceId: 'PO-001',
    };
    expect(ReceiveStockSchema.safeParse(zeroQty).success).toBe(false);
  });

  it('validates reservation schema with default 15-minute TTL', () => {
    const payload = {
      warehouseId: 'whs_test_123',
      variantId: 'var_test_456',
      quantity: 2,
      cartId: 'crt_session_789',
    };

    const result = ReserveStockSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ttlMinutes).toBe(15);
    }
  });

  it('validates commit reservation schema requiring orderId', () => {
    const valid = {
      reservationId: 'res_test_123',
      orderId: 'ord_placed_456',
    };
    expect(CommitReservationSchema.safeParse(valid).success).toBe(true);

    const missingOrder = {
      reservationId: 'res_test_123',
    };
    expect(CommitReservationSchema.safeParse(missingOrder).success).toBe(false);
  });

  it('validates adjust stock schema requiring mandatory audit reason', () => {
    const valid = {
      stockBalanceId: 'stb_test_123',
      movementType: MovementType.DAMAGE,
      quantityDelta: -2,
      reason: 'Liquid transit container leakage damage',
    };
    expect(AdjustStockSchema.safeParse(valid).success).toBe(true);

    const noReason = {
      stockBalanceId: 'stb_test_123',
      movementType: MovementType.ADJUST,
      quantityDelta: 5,
      reason: '', // Empty reason
    };
    expect(AdjustStockSchema.safeParse(noReason).success).toBe(false);

    const zeroDelta = {
      stockBalanceId: 'stb_test_123',
      movementType: MovementType.ADJUST,
      quantityDelta: 0,
      reason: 'Valid audit reason',
    };
    expect(AdjustStockSchema.safeParse(zeroDelta).success).toBe(false);
  });
});
