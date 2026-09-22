/**
 * Order Domain Types & Invariants
 */

import { OrderStatus, Poisha, ProductPoint } from '@/shared/types/domain-terms';

export interface OrderItem {
  readonly id: string;
  readonly orderId: string;
  readonly productId: string;
  readonly variantId?: string;
  readonly sellerId: string;
  readonly quantity: number;
  readonly unitPricePoisha: Poisha;
  readonly totalPricePoisha: Poisha;
  /** Locked Snapshot: Product Points attached to the item at checkout */
  readonly productPointSnapshot: ProductPoint;
}

export interface Order {
  readonly id: string;
  readonly orderNumber: string;
  readonly customerId: string;
  readonly status: OrderStatus;
  readonly subtotalPoisha: Poisha;
  readonly deliveryFeePoisha: Poisha;
  readonly vatPoisha: Poisha;
  readonly totalPoisha: Poisha;
  readonly idempotencyKey: string;
  readonly items: readonly OrderItem[];
  readonly createdAt: Date;
  readonly completedAt?: Date;
}
