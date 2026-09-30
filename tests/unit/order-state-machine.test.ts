/**
 * Milestone 142: Order & Fulfillment State Machine Unit Tests
 *
 * Verifies:
 * 1. Order status transition map completeness and correctness
 * 2. Fulfillment group transition map completeness and correctness
 * 3. Order item transition map completeness and correctness
 * 4. Payment status transition map completeness and correctness
 * 5. Terminal state enforcement (no outgoing transitions)
 * 6. Actor role permission guards
 * 7. Transition validation functions (valid, invalid, terminal, actor)
 * 8. Parent order status derivation from fulfillment groups
 * 9. Bilingual labels coverage (EN/BN) for all states
 * 10. Convenience query functions
 */

import { describe, it, expect } from 'bun:test';
import {
  // Order
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  ORDER_TERMINAL_STATES,
  ORDER_CUSTOMER_CANCELLABLE_STATES,
  validateOrderTransition,
  getAvailableOrderTransitions,
  getPermittedOrderTransitions,
  isOrderTerminal,
  type OrderStatus,

  // Fulfillment Group
  FULFILLMENT_GROUP_TRANSITIONS,
  FULFILLMENT_GROUP_STATUS_LABELS,
  FULFILLMENT_TERMINAL_STATES,
  FULFILLMENT_SELLER_CANCELLABLE_STATES,
  validateFulfillmentGroupTransition,
  getAvailableFulfillmentTransitions,
  getPermittedFulfillmentTransitions,
  isFulfillmentTerminal,
  type FulfillmentGroupStatus,

  // Order Item
  ORDER_ITEM_TRANSITIONS,
  ORDER_ITEM_STATUS_LABELS,
  ORDER_ITEM_TERMINAL_STATES,
  validateOrderItemTransition,
  getAvailableItemTransitions,
  isItemTerminal,
  type OrderItemStatus,

  // Payment
  PAYMENT_STATUS_TRANSITIONS,
  PAYMENT_STATUS_LABELS,

  // Actor
  ORDER_TRANSITION_ACTORS,
  FULFILLMENT_TRANSITION_ACTORS,

  // Derivation
  deriveOrderStatusFromFulfillmentGroups,
} from '@/features/orders/state-machines/order-state-machine';

describe('Milestone 142: Order & Fulfillment State Machine Unit Tests', () => {
  // ─── 1. Order Status Transition Map ───
  describe('1. Order Status Transition Map', () => {
    const allOrderStatuses: OrderStatus[] = [
      'PENDING_PAYMENT',
      'PROCESSING',
      'CONFIRMED',
      'PARTIALLY_SHIPPED',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ];

    it('defines transitions for every order status', () => {
      for (const status of allOrderStatuses) {
        expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
        expect(Array.isArray(ORDER_STATUS_TRANSITIONS[status])).toBe(true);
      }
    });

    it('PENDING_PAYMENT can transition to PROCESSING or CANCELLED', () => {
      expect(ORDER_STATUS_TRANSITIONS.PENDING_PAYMENT).toContain('PROCESSING');
      expect(ORDER_STATUS_TRANSITIONS.PENDING_PAYMENT).toContain('CANCELLED');
      expect(ORDER_STATUS_TRANSITIONS.PENDING_PAYMENT).toHaveLength(2);
    });

    it('PROCESSING can transition to CONFIRMED or CANCELLED', () => {
      expect(ORDER_STATUS_TRANSITIONS.PROCESSING).toContain('CONFIRMED');
      expect(ORDER_STATUS_TRANSITIONS.PROCESSING).toContain('CANCELLED');
    });

    it('CONFIRMED can transition to PARTIALLY_SHIPPED, SHIPPED, or CANCELLED', () => {
      expect(ORDER_STATUS_TRANSITIONS.CONFIRMED).toContain('PARTIALLY_SHIPPED');
      expect(ORDER_STATUS_TRANSITIONS.CONFIRMED).toContain('SHIPPED');
      expect(ORDER_STATUS_TRANSITIONS.CONFIRMED).toContain('CANCELLED');
    });

    it('SHIPPED can only transition to DELIVERED', () => {
      expect(ORDER_STATUS_TRANSITIONS.SHIPPED).toEqual(['DELIVERED']);
    });

    it('DELIVERED can transition to COMPLETED or REFUNDED', () => {
      expect(ORDER_STATUS_TRANSITIONS.DELIVERED).toContain('COMPLETED');
      expect(ORDER_STATUS_TRANSITIONS.DELIVERED).toContain('REFUNDED');
    });

    it('COMPLETED can only transition to REFUNDED', () => {
      expect(ORDER_STATUS_TRANSITIONS.COMPLETED).toEqual(['REFUNDED']);
    });
  });

  // ─── 2. Terminal State Enforcement ───
  describe('2. Terminal State Enforcement', () => {
    it('CANCELLED has no outgoing transitions', () => {
      expect(ORDER_STATUS_TRANSITIONS.CANCELLED).toHaveLength(0);
    });

    it('REFUNDED has no outgoing transitions', () => {
      expect(ORDER_STATUS_TRANSITIONS.REFUNDED).toHaveLength(0);
    });

    it('ORDER_TERMINAL_STATES contains CANCELLED and REFUNDED', () => {
      expect(ORDER_TERMINAL_STATES.has('CANCELLED')).toBe(true);
      expect(ORDER_TERMINAL_STATES.has('REFUNDED')).toBe(true);
    });

    it('isOrderTerminal returns true for terminal states', () => {
      expect(isOrderTerminal('CANCELLED')).toBe(true);
      expect(isOrderTerminal('REFUNDED')).toBe(true);
    });

    it('isOrderTerminal returns false for non-terminal states', () => {
      expect(isOrderTerminal('PROCESSING')).toBe(false);
      expect(isOrderTerminal('DELIVERED')).toBe(false);
    });

    it('ORDER_CUSTOMER_CANCELLABLE_STATES contains only PENDING_PAYMENT and PROCESSING', () => {
      expect(ORDER_CUSTOMER_CANCELLABLE_STATES.has('PENDING_PAYMENT')).toBe(true);
      expect(ORDER_CUSTOMER_CANCELLABLE_STATES.has('PROCESSING')).toBe(true);
      expect(ORDER_CUSTOMER_CANCELLABLE_STATES.has('CONFIRMED')).toBe(false);
      expect(ORDER_CUSTOMER_CANCELLABLE_STATES.has('SHIPPED')).toBe(false);
    });
  });

  // ─── 3. Fulfillment Group Transition Map ───
  describe('3. Fulfillment Group Transition Map', () => {
    const allFulfillmentStatuses: FulfillmentGroupStatus[] = [
      'PENDING',
      'ACCEPTED',
      'PACKING',
      'READY_FOR_PICKUP',
      'HANDED_OVER_TO_COURIER',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED',
      'REJECTED',
    ];

    it('defines transitions for every fulfillment group status', () => {
      for (const status of allFulfillmentStatuses) {
        expect(FULFILLMENT_GROUP_TRANSITIONS[status]).toBeDefined();
      }
    });

    it('PENDING can transition to ACCEPTED or REJECTED', () => {
      expect(FULFILLMENT_GROUP_TRANSITIONS.PENDING).toContain('ACCEPTED');
      expect(FULFILLMENT_GROUP_TRANSITIONS.PENDING).toContain('REJECTED');
      expect(FULFILLMENT_GROUP_TRANSITIONS.PENDING).toHaveLength(2);
    });

    it('ACCEPTED can transition to PACKING or CANCELLED', () => {
      expect(FULFILLMENT_GROUP_TRANSITIONS.ACCEPTED).toContain('PACKING');
      expect(FULFILLMENT_GROUP_TRANSITIONS.ACCEPTED).toContain('CANCELLED');
    });

    it('PACKING can transition to READY_FOR_PICKUP or CANCELLED', () => {
      expect(FULFILLMENT_GROUP_TRANSITIONS.PACKING).toContain('READY_FOR_PICKUP');
      expect(FULFILLMENT_GROUP_TRANSITIONS.PACKING).toContain('CANCELLED');
    });

    it('HANDED_OVER_TO_COURIER can transition to IN_TRANSIT or DELIVERED', () => {
      expect(FULFILLMENT_GROUP_TRANSITIONS.HANDED_OVER_TO_COURIER).toContain('IN_TRANSIT');
      expect(FULFILLMENT_GROUP_TRANSITIONS.HANDED_OVER_TO_COURIER).toContain('DELIVERED');
    });

    it('terminal fulfillment states have no outgoing transitions', () => {
      expect(FULFILLMENT_GROUP_TRANSITIONS.DELIVERED).toHaveLength(0);
      expect(FULFILLMENT_GROUP_TRANSITIONS.CANCELLED).toHaveLength(0);
      expect(FULFILLMENT_GROUP_TRANSITIONS.REJECTED).toHaveLength(0);
    });

    it('FULFILLMENT_SELLER_CANCELLABLE_STATES contains correct states', () => {
      expect(FULFILLMENT_SELLER_CANCELLABLE_STATES.has('ACCEPTED')).toBe(true);
      expect(FULFILLMENT_SELLER_CANCELLABLE_STATES.has('PACKING')).toBe(true);
      expect(FULFILLMENT_SELLER_CANCELLABLE_STATES.has('READY_FOR_PICKUP')).toBe(true);
      expect(FULFILLMENT_SELLER_CANCELLABLE_STATES.has('PENDING')).toBe(false);
      expect(FULFILLMENT_SELLER_CANCELLABLE_STATES.has('HANDED_OVER_TO_COURIER')).toBe(false);
    });
  });

  // ─── 4. Order Item Transition Map ───
  describe('4. Order Item Transition Map', () => {
    it('PENDING can transition to CONFIRMED or CANCELLED', () => {
      expect(ORDER_ITEM_TRANSITIONS.PENDING).toContain('CONFIRMED');
      expect(ORDER_ITEM_TRANSITIONS.PENDING).toContain('CANCELLED');
    });

    it('DELIVERED can only transition to RETURNED', () => {
      expect(ORDER_ITEM_TRANSITIONS.DELIVERED).toEqual(['RETURNED']);
    });

    it('CANCELLED and RETURNED are terminal', () => {
      expect(ORDER_ITEM_TRANSITIONS.CANCELLED).toHaveLength(0);
      expect(ORDER_ITEM_TRANSITIONS.RETURNED).toHaveLength(0);
      expect(isItemTerminal('CANCELLED')).toBe(true);
      expect(isItemTerminal('RETURNED')).toBe(true);
    });
  });

  // ─── 5. Payment Status Transition Map ───
  describe('5. Payment Status Transition Map', () => {
    it('UNPAID can transition to AUTHORIZED, PAID, or FAILED', () => {
      expect(PAYMENT_STATUS_TRANSITIONS.UNPAID).toContain('AUTHORIZED');
      expect(PAYMENT_STATUS_TRANSITIONS.UNPAID).toContain('PAID');
      expect(PAYMENT_STATUS_TRANSITIONS.UNPAID).toContain('FAILED');
    });

    it('PAID can transition to PARTIALLY_REFUNDED or REFUNDED', () => {
      expect(PAYMENT_STATUS_TRANSITIONS.PAID).toContain('PARTIALLY_REFUNDED');
      expect(PAYMENT_STATUS_TRANSITIONS.PAID).toContain('REFUNDED');
    });

    it('REFUNDED is terminal', () => {
      expect(PAYMENT_STATUS_TRANSITIONS.REFUNDED).toHaveLength(0);
    });

    it('FAILED can retry to UNPAID or AUTHORIZED', () => {
      expect(PAYMENT_STATUS_TRANSITIONS.FAILED).toContain('UNPAID');
      expect(PAYMENT_STATUS_TRANSITIONS.FAILED).toContain('AUTHORIZED');
    });
  });

  // ─── 6. Actor Role Permission Guards ───
  describe('6. Actor Role Permission Guards', () => {
    it('SYSTEM can transition PENDING_PAYMENT to PROCESSING', () => {
      expect(ORDER_TRANSITION_ACTORS['PENDING_PAYMENT']['PROCESSING']).toContain('SYSTEM');
    });

    it('CUSTOMER can cancel PENDING_PAYMENT orders', () => {
      expect(ORDER_TRANSITION_ACTORS['PENDING_PAYMENT']['CANCELLED']).toContain('CUSTOMER');
    });

    it('CUSTOMER can cancel PROCESSING orders', () => {
      expect(ORDER_TRANSITION_ACTORS['PROCESSING']['CANCELLED']).toContain('CUSTOMER');
    });

    it('only ADMIN can cancel CONFIRMED orders', () => {
      expect(ORDER_TRANSITION_ACTORS['CONFIRMED']['CANCELLED']).toContain('ADMIN');
      expect(ORDER_TRANSITION_ACTORS['CONFIRMED']['CANCELLED']).not.toContain('CUSTOMER');
    });

    it('SELLER can accept PENDING fulfillment groups', () => {
      expect(FULFILLMENT_TRANSITION_ACTORS['PENDING']['ACCEPTED']).toContain('SELLER');
    });

    it('SELLER can reject PENDING fulfillment groups', () => {
      expect(FULFILLMENT_TRANSITION_ACTORS['PENDING']['REJECTED']).toContain('SELLER');
    });

    it('SELLER can transition ACCEPTED to PACKING', () => {
      expect(FULFILLMENT_TRANSITION_ACTORS['ACCEPTED']['PACKING']).toContain('SELLER');
    });

    it('only SYSTEM can transition HANDED_OVER_TO_COURIER to IN_TRANSIT', () => {
      expect(FULFILLMENT_TRANSITION_ACTORS['HANDED_OVER_TO_COURIER']['IN_TRANSIT']).toContain(
        'SYSTEM'
      );
      expect(FULFILLMENT_TRANSITION_ACTORS['HANDED_OVER_TO_COURIER']['IN_TRANSIT']).not.toContain(
        'SELLER'
      );
    });
  });

  // ─── 7. Transition Validation Functions ───
  describe('7. Transition Validation Functions', () => {
    // Order transitions
    it('validates valid order transition', () => {
      const result = validateOrderTransition('PENDING_PAYMENT', 'PROCESSING', 'SYSTEM');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid order transition (skipping states)', () => {
      const result = validateOrderTransition('PENDING_PAYMENT', 'DELIVERED', 'SYSTEM');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_TRANSITION');
      expect(result.errorMessageEn).toBeTruthy();
      expect(result.errorMessageBn).toBeTruthy();
    });

    it('rejects transition from terminal state', () => {
      const result = validateOrderTransition('CANCELLED', 'PROCESSING', 'ADMIN');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('TERMINAL_STATE');
    });

    it('rejects actor without permission', () => {
      const result = validateOrderTransition('PENDING_PAYMENT', 'PROCESSING', 'CUSTOMER');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('ACTOR_NOT_PERMITTED');
    });

    it('allows CUSTOMER to cancel PENDING_PAYMENT', () => {
      const result = validateOrderTransition('PENDING_PAYMENT', 'CANCELLED', 'CUSTOMER');
      expect(result.valid).toBe(true);
    });

    it('denies SELLER from cancelling CONFIRMED orders', () => {
      const result = validateOrderTransition('CONFIRMED', 'CANCELLED', 'SELLER');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('ACTOR_NOT_PERMITTED');
    });

    // Fulfillment group transitions
    it('validates valid fulfillment group transition', () => {
      const result = validateFulfillmentGroupTransition('PENDING', 'ACCEPTED', 'SELLER');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid fulfillment transition', () => {
      const result = validateFulfillmentGroupTransition('PENDING', 'DELIVERED', 'SELLER');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_TRANSITION');
    });

    it('rejects fulfillment transition from terminal state', () => {
      const result = validateFulfillmentGroupTransition('DELIVERED', 'PENDING', 'SELLER');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('TERMINAL_STATE');
    });

    it('rejects CUSTOMER from accepting fulfillment groups', () => {
      const result = validateFulfillmentGroupTransition('PENDING', 'ACCEPTED', 'CUSTOMER');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('ACTOR_NOT_PERMITTED');
    });

    // Order item transitions
    it('validates valid order item transition', () => {
      const result = validateOrderItemTransition('PENDING', 'CONFIRMED');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid order item transition', () => {
      const result = validateOrderItemTransition('PENDING', 'DELIVERED');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_TRANSITION');
    });

    it('rejects item transition from terminal state', () => {
      const result = validateOrderItemTransition('CANCELLED', 'PENDING');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('TERMINAL_STATE');
    });
  });

  // ─── 8. Parent Order Status Derivation ───
  describe('8. Parent Order Status Derivation from Fulfillment Groups', () => {
    it('all groups DELIVERED → parent DELIVERED', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(
        ['DELIVERED', 'DELIVERED'],
        'CONFIRMED'
      );
      expect(result).toBe('DELIVERED');
    });

    it('all groups CANCELLED → parent CANCELLED', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(
        ['CANCELLED', 'CANCELLED'],
        'CONFIRMED'
      );
      expect(result).toBe('CANCELLED');
    });

    it('all groups REJECTED → parent CANCELLED', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(['REJECTED', 'REJECTED'], 'CONFIRMED');
      expect(result).toBe('CANCELLED');
    });

    it('mix of DELIVERED and CANCELLED → parent DELIVERED (surviving items)', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(
        ['DELIVERED', 'CANCELLED'],
        'CONFIRMED'
      );
      expect(result).toBe('DELIVERED');
    });

    it('some DELIVERED, some active → parent PARTIALLY_SHIPPED', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(['DELIVERED', 'PACKING'], 'CONFIRMED');
      expect(result).toBe('PARTIALLY_SHIPPED');
    });

    it('dispatched groups, none delivered → parent SHIPPED', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(
        ['HANDED_OVER_TO_COURIER', 'IN_TRANSIT'],
        'CONFIRMED'
      );
      expect(result).toBe('SHIPPED');
    });

    it('dispatched and delivered mix → parent SHIPPED', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(
        ['IN_TRANSIT', 'DELIVERED'],
        'CONFIRMED'
      );
      expect(result).toBe('SHIPPED');
    });

    it('one dispatched package and one packing package remain partially shipped', () => {
      expect(deriveOrderStatusFromFulfillmentGroups(['IN_TRANSIT', 'PACKING'], 'CONFIRMED')).toBe(
        'PARTIALLY_SHIPPED'
      );
    });

    it('does not reopen cancelled, refunded, or completed parents', () => {
      for (const status of ['CANCELLED', 'REFUNDED', 'COMPLETED'] as const) {
        expect(deriveOrderStatusFromFulfillmentGroups(['DELIVERED'], status)).toBeNull();
      }
    });

    it('all groups PENDING → no status change (returns null)', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(['PENDING', 'PENDING'], 'PROCESSING');
      expect(result).toBeNull();
    });

    it('all groups ACCEPTED → no status change', () => {
      const result = deriveOrderStatusFromFulfillmentGroups(['ACCEPTED', 'ACCEPTED'], 'CONFIRMED');
      expect(result).toBeNull();
    });

    it('empty groups array → null', () => {
      const result = deriveOrderStatusFromFulfillmentGroups([], 'PROCESSING');
      expect(result).toBeNull();
    });
  });

  // ─── 9. Bilingual Labels Coverage ───
  describe('9. Bilingual Labels Coverage', () => {
    const orderStatuses: OrderStatus[] = [
      'PENDING_PAYMENT',
      'PROCESSING',
      'CONFIRMED',
      'PARTIALLY_SHIPPED',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ];

    const fulfillmentStatuses: FulfillmentGroupStatus[] = [
      'PENDING',
      'ACCEPTED',
      'PACKING',
      'READY_FOR_PICKUP',
      'HANDED_OVER_TO_COURIER',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED',
      'REJECTED',
    ];

    const itemStatuses: OrderItemStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ];

    it('provides EN and BN labels for all order statuses', () => {
      for (const status of orderStatuses) {
        const labels = ORDER_STATUS_LABELS[status];
        expect(labels).toBeDefined();
        expect(labels.en).toBeTruthy();
        expect(labels.bn).toBeTruthy();
        expect(labels.bn).toMatch(/[\u0980-\u09FF]/);
      }
    });

    it('provides EN and BN labels for all fulfillment group statuses', () => {
      for (const status of fulfillmentStatuses) {
        const labels = FULFILLMENT_GROUP_STATUS_LABELS[status];
        expect(labels).toBeDefined();
        expect(labels.en).toBeTruthy();
        expect(labels.bn).toBeTruthy();
        expect(labels.bn).toMatch(/[\u0980-\u09FF]/);
      }
    });

    it('provides EN and BN labels for all order item statuses', () => {
      for (const status of itemStatuses) {
        const labels = ORDER_ITEM_STATUS_LABELS[status];
        expect(labels).toBeDefined();
        expect(labels.en).toBeTruthy();
        expect(labels.bn).toBeTruthy();
        expect(labels.bn).toMatch(/[\u0980-\u09FF]/);
      }
    });

    it('provides EN and BN labels for all payment statuses', () => {
      for (const status of [
        'UNPAID',
        'AUTHORIZED',
        'PAID',
        'PARTIALLY_REFUNDED',
        'REFUNDED',
        'FAILED',
      ] as const) {
        const labels = PAYMENT_STATUS_LABELS[status];
        expect(labels).toBeDefined();
        expect(labels.en).toBeTruthy();
        expect(labels.bn).toBeTruthy();
        expect(labels.bn).toMatch(/[\u0980-\u09FF]/);
      }
    });
  });

  // ─── 10. Convenience Query Functions ───
  describe('10. Convenience Query Functions', () => {
    it('getAvailableOrderTransitions returns correct transitions', () => {
      const transitions = getAvailableOrderTransitions('PENDING_PAYMENT');
      expect(transitions).toContain('PROCESSING');
      expect(transitions).toContain('CANCELLED');
    });

    it('getAvailableOrderTransitions returns empty for terminal states', () => {
      expect(getAvailableOrderTransitions('CANCELLED')).toHaveLength(0);
      expect(getAvailableOrderTransitions('REFUNDED')).toHaveLength(0);
    });

    it('getPermittedOrderTransitions filters by role', () => {
      const customerPermitted = getPermittedOrderTransitions('PENDING_PAYMENT', 'CUSTOMER');
      expect(customerPermitted).toContain('CANCELLED');
      expect(customerPermitted).not.toContain('PROCESSING'); // Only SYSTEM can do this

      const systemPermitted = getPermittedOrderTransitions('PENDING_PAYMENT', 'SYSTEM');
      expect(systemPermitted).toContain('PROCESSING');
    });

    it('getAvailableFulfillmentTransitions returns correct transitions', () => {
      const transitions = getAvailableFulfillmentTransitions('PENDING');
      expect(transitions).toContain('ACCEPTED');
      expect(transitions).toContain('REJECTED');
    });

    it('getPermittedFulfillmentTransitions filters by role', () => {
      const sellerPermitted = getPermittedFulfillmentTransitions('PENDING', 'SELLER');
      expect(sellerPermitted).toContain('ACCEPTED');
      expect(sellerPermitted).toContain('REJECTED');

      const customerPermitted = getPermittedFulfillmentTransitions('PENDING', 'CUSTOMER');
      expect(customerPermitted).toHaveLength(0);
    });

    it('getAvailableItemTransitions returns correct item transitions', () => {
      expect(getAvailableItemTransitions('PENDING')).toContain('CONFIRMED');
      expect(getAvailableItemTransitions('DELIVERED')).toContain('RETURNED');
    });
  });

  // ─── 11. No Impossible Cycles ───
  describe('11. State Machine Invariants', () => {
    it('no state can transition to itself (no self-loops)', () => {
      for (const [status, targets] of Object.entries(ORDER_STATUS_TRANSITIONS)) {
        expect(targets).not.toContain(status);
      }
      for (const [status, targets] of Object.entries(FULFILLMENT_GROUP_TRANSITIONS)) {
        expect(targets).not.toContain(status);
      }
      for (const [status, targets] of Object.entries(ORDER_ITEM_TRANSITIONS)) {
        expect(targets).not.toContain(status);
      }
    });

    it('terminal states have exactly zero outgoing transitions', () => {
      for (const status of ORDER_TERMINAL_STATES) {
        expect(ORDER_STATUS_TRANSITIONS[status]).toHaveLength(0);
      }
      for (const status of FULFILLMENT_TERMINAL_STATES) {
        expect(FULFILLMENT_GROUP_TRANSITIONS[status]).toHaveLength(0);
      }
      for (const status of ORDER_ITEM_TERMINAL_STATES) {
        expect(ORDER_ITEM_TRANSITIONS[status]).toHaveLength(0);
      }
    });

    it('every transition target is a valid state in the same machine', () => {
      for (const [, targets] of Object.entries(ORDER_STATUS_TRANSITIONS)) {
        for (const target of targets) {
          expect(ORDER_STATUS_TRANSITIONS).toHaveProperty(target);
        }
      }
      for (const [, targets] of Object.entries(FULFILLMENT_GROUP_TRANSITIONS)) {
        for (const target of targets) {
          expect(FULFILLMENT_GROUP_TRANSITIONS).toHaveProperty(target);
        }
      }
    });

    it('every actor-permitted transition exists in the transition map', () => {
      for (const [from, toMap] of Object.entries(ORDER_TRANSITION_ACTORS)) {
        for (const to of Object.keys(toMap)) {
          const allowed = ORDER_STATUS_TRANSITIONS[from as OrderStatus] || [];
          expect(allowed).toContain(to as OrderStatus);
        }
      }
      for (const [from, toMap] of Object.entries(FULFILLMENT_TRANSITION_ACTORS)) {
        for (const to of Object.keys(toMap)) {
          const allowed = FULFILLMENT_GROUP_TRANSITIONS[from as FulfillmentGroupStatus] || [];
          expect(allowed).toContain(to as FulfillmentGroupStatus);
        }
      }
    });
  });
});
