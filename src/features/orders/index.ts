/**
 * AlifWorld Orders & Fulfillment Feature Barrel Export
 */

export * from './types/order.types';
export * from './validators/order.validators';
export * from './services/customer-order.service';
export * from './services/seller-fulfillment-order.service';

// State machines: re-export selectively to avoid name collisions with order.types.ts
// The state machine versions (in state-machines/order-state-machine.ts) are canonical.
export {
  // Transition maps
  ORDER_STATUS_TRANSITIONS,
  FULFILLMENT_GROUP_TRANSITIONS,
  ORDER_ITEM_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,

  // Labels (also re-exported from customer-order.service for backward compat)
  FULFILLMENT_GROUP_STATUS_LABELS,
  ORDER_ITEM_STATUS_LABELS,

  // Terminal states
  ORDER_TERMINAL_STATES,
  ORDER_CUSTOMER_CANCELLABLE_STATES,
  FULFILLMENT_TERMINAL_STATES,
  FULFILLMENT_SELLER_CANCELLABLE_STATES,
  ORDER_ITEM_TERMINAL_STATES,

  // Actor permissions
  ORDER_TRANSITION_ACTORS,
  FULFILLMENT_TRANSITION_ACTORS,

  // Validation functions
  validateOrderTransition,
  validateFulfillmentGroupTransition,
  validateOrderItemTransition,

  // Derivation
  deriveOrderStatusFromFulfillmentGroups,

  // Query helpers
  getAvailableOrderTransitions,
  getAvailableFulfillmentTransitions,
  getAvailableItemTransitions,
  isOrderTerminal,
  isFulfillmentTerminal,
  isItemTerminal,
  getPermittedOrderTransitions,
  getPermittedFulfillmentTransitions,

  // Types — re-export state machine types with aliases to avoid collision
  type ActorRole,
  type FulfillmentGroupStatus as StateMachineFulfillmentGroupStatus,
  type OrderItemStatus,
  type TransitionValidationResult,
} from './state-machines/order-state-machine';

export {
  type TransitionOrderInput,
  type TransitionFulfillmentGroupInput,
  type TransitionOrderItemInput,
  type TransitionResult,
  OrderTransitionService,
  orderTransitionService,
} from './state-machines/order-transition.service';
