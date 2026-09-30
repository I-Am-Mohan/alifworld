/**
 * Order & Fulfillment Lifecycle State Machines
 *
 * Defines explicit, type-safe state transition maps for:
 * 1. Parent Order Status — the customer-facing lifecycle
 * 2. Seller Fulfillment Group Status — per-merchant package lifecycle
 * 3. Order Item Status — individual line item lifecycle
 *
 * Architecture Decisions:
 * - All transition maps are Record<Status, Status[]> with typed keys.
 * - Terminal states have empty arrays — no outgoing transitions.
 * - Guard functions validate actor role permissions for each transition.
 * - Parent Order status is partially derived from child fulfillment group statuses.
 * - Status history is append-only and immutable (OrderStatusHistory).
 * - Bilingual labels (EN/BN) provided for every state.
 *
 * Invariant: These maps are the SINGLE SOURCE OF TRUTH for valid transitions.
 * No service may bypass them with direct status updates.
 */

// ───────────────────────────────────────────────────────��─────
// 1. Parent Order Status State Machine
// ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

/**
 * Valid parent order status transitions.
 *
 * Lifecycle:
 *   PENDING_PAYMENT → PROCESSING (payment received) | CANCELLED (customer/admin)
 *   PROCESSING      → CONFIRMED (admin/system) | CANCELLED (customer before packaging)
 *   CONFIRMED       → PARTIALLY_SHIPPED | SHIPPED | CANCELLED (admin only)
 *   PARTIALLY_SHIPPED → SHIPPED | DELIVERED (partial auto-derived) | CANCELLED (admin only)
 *   SHIPPED         → DELIVERED
 *   DELIVERED       → COMPLETED | REFUNDED
 *   COMPLETED       → REFUNDED (partial/full return)
 *   CANCELLED       → [] (terminal)
 *   REFUNDED        → [] (terminal)
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PARTIALLY_SHIPPED', 'SHIPPED', 'CANCELLED'],
  PARTIALLY_SHIPPED: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, { en: string; bn: string }> = {
  PENDING_PAYMENT: { en: 'Pending Payment', bn: 'পেমেন্টের অপেক্ষায়' },
  PROCESSING: { en: 'Processing', bn: 'প্রক্রিয়াধীন' },
  CONFIRMED: { en: 'Confirmed', bn: 'নিশ্চিত করা হয়েছে' },
  PARTIALLY_SHIPPED: { en: 'Partially Dispatched', bn: 'আংশিক পাঠানো হয়েছে' },
  SHIPPED: { en: 'Dispatched in Transit', bn: 'শিপমেন্ট পরিবহনরত' },
  DELIVERED: { en: 'Delivered', bn: 'ডেলিভারি সম্পন্ন' },
  COMPLETED: { en: 'Completed', bn: 'সম্পূর্ণ' },
  CANCELLED: { en: 'Cancelled', bn: 'বাতিল' },
  REFUNDED: { en: 'Refunded', bn: 'রিফান্ড করা হয়েছে' },
};

/** Terminal states from which no further transition is possible. */
export const ORDER_TERMINAL_STATES: ReadonlySet<OrderStatus> = new Set(['CANCELLED', 'REFUNDED']);

/** States where customer self-service cancellation is allowed. */
export const ORDER_CUSTOMER_CANCELLABLE_STATES: ReadonlySet<OrderStatus> = new Set([
  'PENDING_PAYMENT',
  'PROCESSING',
]);

// ─────────────────────────────────────────────────────────────
// 2. Seller Fulfillment Group Status State Machine
// ─────────────────────────────────────────────────────────────

export type FulfillmentGroupStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PACKING'
  | 'READY_FOR_PICKUP'
  | 'HANDED_OVER_TO_COURIER'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

/**
 * Valid seller fulfillment group status transitions.
 *
 * Lifecycle:
 *   PENDING                  → ACCEPTED (seller accepts) | REJECTED (seller rejects)
 *   ACCEPTED                 → PACKING (seller starts packing) | CANCELLED (seller/admin)
 *   PACKING                  → READY_FOR_PICKUP | CANCELLED
 *   READY_FOR_PICKUP         → HANDED_OVER_TO_COURIER | CANCELLED
 *   HANDED_OVER_TO_COURIER   → IN_TRANSIT | DELIVERED (direct if local)
 *   IN_TRANSIT               → DELIVERED
 *   DELIVERED                → [] (terminal)
 *   CANCELLED                → [] (terminal)
 *   REJECTED                 → [] (terminal)
 */
export const FULFILLMENT_GROUP_TRANSITIONS: Record<
  FulfillmentGroupStatus,
  FulfillmentGroupStatus[]
> = {
  PENDING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PACKING', 'CANCELLED'],
  PACKING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['HANDED_OVER_TO_COURIER', 'CANCELLED'],
  HANDED_OVER_TO_COURIER: ['IN_TRANSIT', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

export const FULFILLMENT_GROUP_STATUS_LABELS: Record<
  FulfillmentGroupStatus,
  { en: string; bn: string }
> = {
  PENDING: { en: 'Pending Seller Action', bn: 'বিক্রেতার পদক্ষেপের অপেক্ষায়' },
  ACCEPTED: { en: 'Accepted by Seller', bn: 'বিক্রেতা কর্তৃক গৃহীত' },
  PACKING: { en: 'Packing in Progress', bn: 'প্যাকেজিং চলছে' },
  READY_FOR_PICKUP: { en: 'Ready for Courier Pickup', bn: 'কুরিয়ার পিকআপের জন্য প্রস্তুত' },
  HANDED_OVER_TO_COURIER: { en: 'Handed Over to Courier', bn: 'কুরিয়ারে হস্তান্তর করা হয়েছে' },
  IN_TRANSIT: { en: 'In Transit', bn: 'পরিবহনরত' },
  DELIVERED: { en: 'Delivered', bn: 'ডেলিভারি সম্পন্ন' },
  CANCELLED: { en: 'Cancelled', bn: 'বাতিল' },
  REJECTED: { en: 'Rejected by Seller', bn: 'বিক্রেতা কর্তৃক প্রত্যাখ্যাত' },
};

export const FULFILLMENT_TERMINAL_STATES: ReadonlySet<FulfillmentGroupStatus> = new Set([
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
]);

/** States from which seller-initiated cancellation is allowed. */
export const FULFILLMENT_SELLER_CANCELLABLE_STATES: ReadonlySet<FulfillmentGroupStatus> = new Set([
  'ACCEPTED',
  'PACKING',
  'READY_FOR_PICKUP',
]);

// ─────────────────────────────────────────��───────────────────
// 3. Order Item Status State Machine
// ─────────────────────────────────────────────────────────────

export type OrderItemStatus =
  'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';

/**
 * Valid order item status transitions.
 *
 * Items inherit transitions from their parent fulfillment group,
 * but may diverge for partial returns or individual cancellations.
 */
export const ORDER_ITEM_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, { en: string; bn: string }> = {
  PENDING: { en: 'Pending', bn: 'অপেক্ষমান' },
  CONFIRMED: { en: 'Confirmed', bn: 'নিশ্চিত' },
  PROCESSING: { en: 'Processing', bn: 'প্রক্রিয়াধীন' },
  SHIPPED: { en: 'Shipped', bn: 'পাঠানো হয়েছে' },
  DELIVERED: { en: 'Delivered', bn: 'ডেলিভারি সম্পন্ন' },
  CANCELLED: { en: 'Cancelled', bn: 'বাতিল' },
  RETURNED: { en: 'Returned', bn: 'ফেরত দেওয়া হয়েছে' },
};

export const ORDER_ITEM_TERMINAL_STATES: ReadonlySet<OrderItemStatus> = new Set([
  'CANCELLED',
  'RETURNED',
]);

// ─────────────────────────────────────────────────────────────
// 4. Payment Status State Machine
// ─────────────────────────────────────────────────────────────

export type PaymentStatus =
  'UNPAID' | 'AUTHORIZED' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED';

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  UNPAID: ['AUTHORIZED', 'PAID', 'FAILED'],
  AUTHORIZED: ['PAID', 'FAILED'],
  PAID: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  REFUNDED: [],
  FAILED: ['UNPAID', 'AUTHORIZED'],
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { en: string; bn: string }> = {
  UNPAID: { en: 'Unpaid / COD Due', bn: 'বকেয়া / ক্যাশ অন ডেলিভারি' },
  AUTHORIZED: { en: 'Authorized', bn: 'অনুমোদিত' },
  PAID: { en: 'Paid in Full', bn: 'পরিশোধিত' },
  PARTIALLY_REFUNDED: { en: 'Partially Refunded', bn: 'আংশিক রিফান্ড' },
  REFUNDED: { en: 'Refunded', bn: 'রিফান্ড সম্পন্ন' },
  FAILED: { en: 'Payment Failed', bn: 'পেমেন্ট ব্যর্থ' },
};

// ─────────────────────────────────────────────────────────────
// 5. Actor Role Permissions for State Transitions
// ─────────────────────────────────────────────────────────────

export type ActorRole = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'SYSTEM';

/**
 * Defines which actor roles can initiate each order status transition.
 * Format: { fromStatus: { toStatus: ActorRole[] } }
 */
export const ORDER_TRANSITION_ACTORS: Record<string, Record<string, ActorRole[]>> = {
  PENDING_PAYMENT: {
    PROCESSING: ['SYSTEM'], // Payment gateway callback
    CANCELLED: ['CUSTOMER', 'ADMIN'], // Customer or admin cancellation
  },
  PROCESSING: {
    CONFIRMED: ['ADMIN', 'SYSTEM'], // Admin or system confirms after payment verified
    CANCELLED: ['CUSTOMER', 'ADMIN'], // Before packaging
  },
  CONFIRMED: {
    PARTIALLY_SHIPPED: ['SYSTEM'], // Auto-derived from fulfillment groups
    SHIPPED: ['SYSTEM'], // Auto-derived when all groups dispatched
    CANCELLED: ['ADMIN'], // Only admin after confirmation
  },
  PARTIALLY_SHIPPED: {
    SHIPPED: ['SYSTEM'],
    DELIVERED: ['SYSTEM'],
    CANCELLED: ['ADMIN'],
  },
  SHIPPED: {
    DELIVERED: ['SYSTEM'], // Courier delivery confirmation
  },
  DELIVERED: {
    COMPLETED: ['SYSTEM', 'ADMIN'], // Auto after return window or admin action
    REFUNDED: ['ADMIN'], // Full refund
  },
  COMPLETED: {
    REFUNDED: ['ADMIN'], // Post-completion refund
  },
};

/**
 * Defines which actor roles can initiate each fulfillment group transition.
 */
export const FULFILLMENT_TRANSITION_ACTORS: Record<string, Record<string, ActorRole[]>> = {
  PENDING: {
    ACCEPTED: ['SELLER'],
    REJECTED: ['SELLER'],
  },
  ACCEPTED: {
    PACKING: ['SELLER'],
    CANCELLED: ['SELLER', 'ADMIN'],
  },
  PACKING: {
    READY_FOR_PICKUP: ['SELLER'],
    CANCELLED: ['SELLER', 'ADMIN'],
  },
  READY_FOR_PICKUP: {
    HANDED_OVER_TO_COURIER: ['SELLER', 'SYSTEM'],
    CANCELLED: ['SELLER', 'ADMIN'],
  },
  HANDED_OVER_TO_COURIER: {
    IN_TRANSIT: ['SYSTEM'], // Courier tracking update
    DELIVERED: ['SYSTEM'], // Direct delivery for local
  },
  IN_TRANSIT: {
    DELIVERED: ['SYSTEM'], // Courier delivery confirmation
  },
};

// ─────────────────────────────────────────────────────────────
// 6. Transition Validation Functions
// ─────────────────────────────────────────────────────────────

export interface TransitionValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessageEn?: string;
  errorMessageBn?: string;
}

/**
 * Validates whether a parent order status transition is allowed.
 */
export function validateOrderTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  actorRole: ActorRole
): TransitionValidationResult {
  // Check if current status is terminal
  if (ORDER_TERMINAL_STATES.has(currentStatus)) {
    return {
      valid: false,
      errorCode: 'TERMINAL_STATE',
      errorMessageEn: `Order is in terminal state '${currentStatus}' and cannot be transitioned.`,
      errorMessageBn: `অর্ডারটি চূড়ান্ত অবস্থায় '${ORDER_STATUS_LABELS[currentStatus]?.bn || currentStatus}' রয়েছে এবং পরিবর্তন করা সম্ভব নয়।`,
    };
  }

  // Check if transition is valid
  const allowedNextStates = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStates.includes(nextStatus)) {
    return {
      valid: false,
      errorCode: 'INVALID_TRANSITION',
      errorMessageEn: `Invalid order transition from '${currentStatus}' to '${nextStatus}'. Allowed: [${allowedNextStates.join(', ')}].`,
      errorMessageBn: `'${ORDER_STATUS_LABELS[currentStatus]?.bn}' থেকে '${ORDER_STATUS_LABELS[nextStatus]?.bn}' অর্ডার পরিবর্তন অবৈধ।`,
    };
  }

  // Check if actor has permission for this transition
  const allowedActors = ORDER_TRANSITION_ACTORS[currentStatus]?.[nextStatus] || [];
  if (!allowedActors.includes(actorRole)) {
    return {
      valid: false,
      errorCode: 'ACTOR_NOT_PERMITTED',
      errorMessageEn: `Role '${actorRole}' is not permitted to transition order from '${currentStatus}' to '${nextStatus}'.`,
      errorMessageBn: `'${actorRole}' ভূমিকার অর্ডারটি '${ORDER_STATUS_LABELS[currentStatus]?.bn}' থেকে '${ORDER_STATUS_LABELS[nextStatus]?.bn}' এ পরিবর্তন করার অনুমতি নেই।`,
    };
  }

  return { valid: true };
}

/**
 * Validates whether a fulfillment group status transition is allowed.
 */
export function validateFulfillmentGroupTransition(
  currentStatus: FulfillmentGroupStatus,
  nextStatus: FulfillmentGroupStatus,
  actorRole: ActorRole
): TransitionValidationResult {
  if (FULFILLMENT_TERMINAL_STATES.has(currentStatus)) {
    return {
      valid: false,
      errorCode: 'TERMINAL_STATE',
      errorMessageEn: `Fulfillment group is in terminal state '${currentStatus}' and cannot be transitioned.`,
      errorMessageBn: `ফুলফিলমেন্ট গ্রুপটি চূড়ান্ত অবস্থায় '${FULFILLMENT_GROUP_STATUS_LABELS[currentStatus]?.bn}' রয়েছে।`,
    };
  }

  const allowedNextStates = FULFILLMENT_GROUP_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStates.includes(nextStatus)) {
    return {
      valid: false,
      errorCode: 'INVALID_TRANSITION',
      errorMessageEn: `Invalid fulfillment transition from '${currentStatus}' to '${nextStatus}'. Allowed: [${allowedNextStates.join(', ')}].`,
      errorMessageBn: `'${FULFILLMENT_GROUP_STATUS_LABELS[currentStatus]?.bn}' থেকে '${FULFILLMENT_GROUP_STATUS_LABELS[nextStatus]?.bn}' ফুলফিলমেন্ট পরিবর্তন অবৈধ।`,
    };
  }

  const allowedActors = FULFILLMENT_TRANSITION_ACTORS[currentStatus]?.[nextStatus] || [];
  if (!allowedActors.includes(actorRole)) {
    return {
      valid: false,
      errorCode: 'ACTOR_NOT_PERMITTED',
      errorMessageEn: `Role '${actorRole}' is not permitted to transition fulfillment group from '${currentStatus}' to '${nextStatus}'.`,
      errorMessageBn: `'${actorRole}' ভূমিকার ফুলফিলমেন্ট গ্রুপটি পরিবর্তন করার অনুমতি নেই।`,
    };
  }

  return { valid: true };
}

/**
 * Validates whether an order item status transition is allowed.
 */
export function validateOrderItemTransition(
  currentStatus: OrderItemStatus,
  nextStatus: OrderItemStatus
): TransitionValidationResult {
  if (ORDER_ITEM_TERMINAL_STATES.has(currentStatus)) {
    return {
      valid: false,
      errorCode: 'TERMINAL_STATE',
      errorMessageEn: `Order item is in terminal state '${currentStatus}'.`,
      errorMessageBn: `অর্ডার আইটেমটি চূড়ান্ত অবস্থায় '${ORDER_ITEM_STATUS_LABELS[currentStatus]?.bn}' রয়েছে।`,
    };
  }

  const allowedNextStates = ORDER_ITEM_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStates.includes(nextStatus)) {
    return {
      valid: false,
      errorCode: 'INVALID_TRANSITION',
      errorMessageEn: `Invalid item transition from '${currentStatus}' to '${nextStatus}'. Allowed: [${allowedNextStates.join(', ')}].`,
      errorMessageBn: `'${ORDER_ITEM_STATUS_LABELS[currentStatus]?.bn}' থেকে '${ORDER_ITEM_STATUS_LABELS[nextStatus]?.bn}' আইটেম পরিবর্তন অবৈধ।`,
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────
// 7. Parent Order Status Derivation from Fulfillment Groups
// ─────────────────────────────────────────────────────────────

/**
 * Derives the parent order status from child fulfillment group statuses.
 *
 * Rules:
 * - All groups DELIVERED → parent DELIVERED
 * - All groups CANCELLED/REJECTED → parent CANCELLED
 * - Mix of DELIVERED and active → parent PARTIALLY_SHIPPED
 * - Any group HANDED_OVER_TO_COURIER/IN_TRANSIT and none PENDING → parent SHIPPED
 * - All groups PENDING/ACCEPTED → parent stays at current (CONFIRMED or PROCESSING)
 */
export function deriveOrderStatusFromFulfillmentGroups(
  groupStatuses: FulfillmentGroupStatus[],
  currentOrderStatus: OrderStatus
): OrderStatus | null {
  if (
    groupStatuses.length === 0 ||
    ORDER_TERMINAL_STATES.has(currentOrderStatus) ||
    currentOrderStatus === 'COMPLETED'
  )
    return null;

  const allDelivered = groupStatuses.every((s) => s === 'DELIVERED');
  const allTerminal = groupStatuses.every(
    (s) => s === 'DELIVERED' || s === 'CANCELLED' || s === 'REJECTED'
  );
  const allCancelledOrRejected = groupStatuses.every((s) => s === 'CANCELLED' || s === 'REJECTED');
  const anyInTransitOrDispatched = groupStatuses.some(
    (s) => s === 'HANDED_OVER_TO_COURIER' || s === 'IN_TRANSIT'
  );
  const someDelivered = groupStatuses.some((s) => s === 'DELIVERED');
  const someNotDelivered = groupStatuses.some(
    (s) => s !== 'DELIVERED' && s !== 'CANCELLED' && s !== 'REJECTED'
  );
  const allActiveDispatched = groupStatuses.every((status) =>
    ['HANDED_OVER_TO_COURIER', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(status)
  );

  // All groups delivered
  if (allDelivered) {
    return 'DELIVERED';
  }

  // All groups cancelled or rejected
  if (allCancelledOrRejected) {
    return 'CANCELLED';
  }

  // Some delivered, some still active/terminal → PARTIALLY_SHIPPED
  if (someDelivered && someNotDelivered && !allActiveDispatched) {
    return 'PARTIALLY_SHIPPED';
  }

  // All terminal (mix of delivered + cancelled) → DELIVERED (surviving items delivered)
  if (allTerminal && someDelivered) {
    return 'DELIVERED';
  }

  // Any group dispatched to courier but not all delivered
  if (anyInTransitOrDispatched && !someDelivered) {
    return allActiveDispatched ? 'SHIPPED' : 'PARTIALLY_SHIPPED';
  }

  // Mixed: some dispatched, some delivered
  if (anyInTransitOrDispatched && someDelivered) {
    return allActiveDispatched ? 'SHIPPED' : 'PARTIALLY_SHIPPED';
  }

  // No change derivable — keep current status
  return null;
}

// ─────────────────────────────────────────────────────────────
// 8. Convenience Query Functions
// ─────────────────────────────────────────────────────────────

/** Returns all states reachable from a given order status. */
export function getAvailableOrderTransitions(status: OrderStatus): OrderStatus[] {
  return [...(ORDER_STATUS_TRANSITIONS[status] || [])];
}

/** Returns all states reachable from a given fulfillment group status. */
export function getAvailableFulfillmentTransitions(
  status: FulfillmentGroupStatus
): FulfillmentGroupStatus[] {
  return [...(FULFILLMENT_GROUP_TRANSITIONS[status] || [])];
}

/** Returns all states reachable from a given order item status. */
export function getAvailableItemTransitions(status: OrderItemStatus): OrderItemStatus[] {
  return [...(ORDER_ITEM_TRANSITIONS[status] || [])];
}

/** Checks if an order status is terminal. */
export function isOrderTerminal(status: OrderStatus): boolean {
  return ORDER_TERMINAL_STATES.has(status);
}

/** Checks if a fulfillment group status is terminal. */
export function isFulfillmentTerminal(status: FulfillmentGroupStatus): boolean {
  return FULFILLMENT_TERMINAL_STATES.has(status);
}

/** Checks if an order item status is terminal. */
export function isItemTerminal(status: OrderItemStatus): boolean {
  return ORDER_ITEM_TERMINAL_STATES.has(status);
}

/** Returns available transitions filtered by actor role. */
export function getPermittedOrderTransitions(
  status: OrderStatus,
  actorRole: ActorRole
): OrderStatus[] {
  const allTransitions = ORDER_STATUS_TRANSITIONS[status] || [];
  return allTransitions.filter((nextStatus) => {
    const allowedActors = ORDER_TRANSITION_ACTORS[status]?.[nextStatus] || [];
    return allowedActors.includes(actorRole);
  });
}

/** Returns available fulfillment transitions filtered by actor role. */
export function getPermittedFulfillmentTransitions(
  status: FulfillmentGroupStatus,
  actorRole: ActorRole
): FulfillmentGroupStatus[] {
  const allTransitions = FULFILLMENT_GROUP_TRANSITIONS[status] || [];
  return allTransitions.filter((nextStatus) => {
    const allowedActors = FULFILLMENT_TRANSITION_ACTORS[status]?.[nextStatus] || [];
    return allowedActors.includes(actorRole);
  });
}
