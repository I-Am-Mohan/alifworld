/**
 * AlifWorld Warehouse & Inventory Domain Module
 * 
 * Public API for warehouse management, inventory balances, atomic reservations,
 * and immutable stock movements.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0026
 */

export * from './types';
export * from './validators';
export * from './repositories';
export * from './services';
