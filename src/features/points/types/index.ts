/**
 * Product Points Engine Domain Types
 * Locked Invariant: Independent from BDT currency. Snapshot on order item.
 */

import { ProductPoint } from '@/shared/types/domain-terms';

export interface OrderItemPointSnapshot {
  readonly orderItemId: string;
  readonly productPointSnapshot: ProductPoint;
  readonly quantity: number;
  readonly totalEligiblePoints: ProductPoint;
}

export enum PointTransactionType {
  ACCRUAL_PENDING = 'ACCRUAL_PENDING',
  ACCRUED_COMPLETED = 'ACCRUED_COMPLETED',
  REDEMPTION = 'REDEMPTION',
  REVERSAL_RETURN = 'REVERSAL_RETURN',
  EXPIRED = 'EXPIRED',
}

export interface PointTransaction {
  readonly id: string;
  readonly customerId: string;
  readonly orderId?: string;
  readonly type: PointTransactionType;
  readonly points: ProductPoint;
  readonly balanceAfter: ProductPoint;
  readonly createdAt: Date;
}
