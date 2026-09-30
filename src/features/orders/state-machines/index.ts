/**
 * Order & Fulfillment State Machines — Barrel Export
 */

export {
  // Order Status
  type OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  ORDER_TERMINAL_STATES,
  ORDER_CUSTOMER_CANCELLABLE_STATES,

  // Fulfillment Group Status
  type FulfillmentGroupStatus,
  FULFILLMENT_GROUP_TRANSITIONS,
  FULFILLMENT_GROUP_STATUS_LABELS,
  FULFILLMENT_TERMINAL_STATES,
  FULFILLMENT_SELLER_CANCELLABLE_STATES,

  // Order Item Status
  type OrderItemStatus,
  ORDER_ITEM_TRANSITIONS,
  ORDER_ITEM_STATUS_LABELS,
  ORDER_ITEM_TERMINAL_STATES,

  // Payment Status
  type PaymentStatus,
  PAYMENT_STATUS_TRANSITIONS,
  PAYMENT_STATUS_LABELS,

  // Actor Roles
  type ActorRole,
  ORDER_TRANSITION_ACTORS,
  FULFILLMENT_TRANSITION_ACTORS,

  // Validation Functions
  type TransitionValidationResult,
  validateOrderTransition,
  validateFulfillmentGroupTransition,
  validateOrderItemTransition,

  // Derivation
  deriveOrderStatusFromFulfillmentGroups,

  // Query Functions
  getAvailableOrderTransitions,
  getAvailableFulfillmentTransitions,
  getAvailableItemTransitions,
  isOrderTerminal,
  isFulfillmentTerminal,
  isItemTerminal,
  getPermittedOrderTransitions,
  getPermittedFulfillmentTransitions,
} from './order-state-machine';

export {
  type TransitionOrderInput,
  type TransitionFulfillmentGroupInput,
  type TransitionOrderItemInput,
  type TransitionResult,
  OrderTransitionService,
  orderTransitionService,
} from './order-transition.service';
