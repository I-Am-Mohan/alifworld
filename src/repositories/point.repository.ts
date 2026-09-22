/**
 * AlifWorld Decoupled Loyalty Product Point Repository
 * 
 * Manages customer point accounts, point events, escrow holds during
 * inspection return windows, and clawbacks on refund.
 * 
 * Invariants: ADR-0022, ADR-0027, ADR-0028, ADR-0029, Decoupled Point Tokens
 */

import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { ValidationError, NotFoundError, ConflictError } from '@/shared/errors/app-error';

export class PointRepository {
  private get prisma() {
    return getPrismaClient() as any;
  }

  /**
   * Retrieves or provisions a decoupled point account for a customer.
   */
  async getOrCreatePointAccount(userId: string) {
    let account = await this.prisma.pointAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      const id = generateId(ID_PREFIXES.POINT_ACCOUNT);
      account = await this.prisma.pointAccount.create({
        data: {
          id,
          userId,
          availablePoints: 0,
          pendingPoints: 0,
          lifetimePoints: 0,
        },
      });
    }

    return account;
  }

  /**
   * Snapshots points on an order item into pending/escrow status during fulfillment.
   */
  async snapshotOrderPoints(userId: string, orderId: string, orderItemId: string, points: number, ruleVersion: string = 'v1.0.0') {
    if (points <= 0) return null;

    const account = await this.getOrCreatePointAccount(userId);

    return this.prisma.$transaction(async (tx: any) => {
      await tx.pointAccount.update({
        where: { id: account.id },
        data: {
          pendingPoints: { increment: points },
          version: { increment: 1 },
        },
      });

      const event = await tx.pointEvent.create({
        data: {
          id: generateId(ID_PREFIXES.POINT_EVENT),
          pointAccountId: account.id,
          eventType: 'ORDER_EARNED',
          points,
          orderId,
          orderItemId,
          ruleVersion,
          notes: `Snapshotted ${points} Product Points for order ${orderId}`,
        },
      });

      return event;
    });
  }

  /**
   * Releases pending points into available/spendable points when inspection window closes.
   */
  async releaseOrderPoints(userId: string, orderId: string, orderItemId: string, points: number, ruleVersion: string = 'v1.0.0') {
    if (points <= 0) return null;

    const account = await this.getOrCreatePointAccount(userId);

    return this.prisma.$transaction(async (tx: any) => {
      // Ensure pending points are available to release
      const current = await tx.pointAccount.findUnique({ where: { id: account.id } });
      const pendingToDeduct = Math.min(current.pendingPoints, points);

      await tx.pointAccount.update({
        where: { id: account.id },
        data: {
          pendingPoints: { decrement: pendingToDeduct },
          availablePoints: { increment: points },
          lifetimePoints: { increment: points },
          version: { increment: 1 },
        },
      });

      const event = await tx.pointEvent.create({
        data: {
          id: generateId(ID_PREFIXES.POINT_EVENT),
          pointAccountId: account.id,
          eventType: 'ORDER_RELEASED',
          points,
          orderId,
          orderItemId,
          ruleVersion,
          notes: `Released ${points} Product Points following inspection window closure`,
        },
      });

      return event;
    });
  }

  /**
   * Reverses / claws back Product Points when an item is refunded.
   */
  async reverseOrderPoints(userId: string, orderId: string, orderItemId: string, pointsToReverse: number, reason: string) {
    if (pointsToReverse <= 0) return null;

    const account = await this.getOrCreatePointAccount(userId);

    return this.prisma.$transaction(async (tx: any) => {
      const current = await tx.pointAccount.findUnique({ where: { id: account.id } });

      // Deduct from pending first if unreleased, else deduct from available
      let deductPending = 0;
      let deductAvailable = 0;

      if (current.pendingPoints >= pointsToReverse) {
        deductPending = pointsToReverse;
      } else {
        deductPending = current.pendingPoints;
        deductAvailable = pointsToReverse - deductPending;
      }

      await tx.pointAccount.update({
        where: { id: account.id },
        data: {
          pendingPoints: { decrement: deductPending },
          availablePoints: { decrement: deductAvailable },
          version: { increment: 1 },
        },
      });

      const event = await tx.pointEvent.create({
        data: {
          id: generateId(ID_PREFIXES.POINT_EVENT),
          pointAccountId: account.id,
          eventType: 'REFUND_REVERSED',
          points: -pointsToReverse,
          orderId,
          orderItemId,
          notes: `Reversed ${pointsToReverse} Product Points: ${reason}`,
        },
      });

      return event;
    });
  }

  /**
   * Lists chronological point events for a customer point account.
   */
  async listPointEvents(userId: string, limit: number = 20, offset: number = 0) {
    const account = await this.getOrCreatePointAccount(userId);
    return this.prisma.pointEvent.findMany({
      where: { pointAccountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
