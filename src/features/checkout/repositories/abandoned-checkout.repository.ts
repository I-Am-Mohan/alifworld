/**
 * Abandoned Checkout Recovery Repository
 *
 * Scoped database operations for tracking and recovering abandoned carts.
 */

import { prisma } from '@/shared/database/prisma';
import {
  AbandonedCheckoutDTO,
  AbandonedCheckoutStatus,
  MarkCartAbandonedParams,
} from '../types/abandoned-checkout.types';
import { maskBangladeshPhone } from '@/shared/utils/phone';

export class AbandonedCheckoutRepository {
  private db = prisma;

  /**
   * Creates or updates an abandoned checkout recovery record.
   */
  public async createOrUpdateRecovery(
    params: MarkCartAbandonedParams & {
      recoveryToken: string;
      totalPoisha: bigint;
      itemCount: number;
      customerId?: string | null;
    }
  ): Promise<AbandonedCheckoutDTO> {
    const expiresAt = new Date(Date.now() + (params.expiresInHours || 72) * 60 * 60 * 1000);

    const existing = await (this.db as any).abandonedCheckoutRecovery.findFirst({
      where: { cartId: params.cartId },
    });

    let record;
    if (existing && existing.recoveryStatus === 'ABANDONED') {
      record = await (this.db as any).abandonedCheckoutRecovery.update({
        where: { id: existing.id },
        data: {
          recoveryToken: params.recoveryToken,
          recipientEmail: params.recipientEmail || existing.recipientEmail,
          recipientPhone: params.recipientPhone || existing.recipientPhone,
          savedAddress: params.savedAddress || existing.savedAddress,
          totalPoisha: params.totalPoisha,
          itemCount: params.itemCount,
          incentiveCouponCode: params.incentiveCouponCode || existing.incentiveCouponCode,
          expiresAt,
          updatedAt: new Date(),
        },
      });
    } else {
      record = await (this.db as any).abandonedCheckoutRecovery.create({
        data: {
          cartId: params.cartId,
          recoveryToken: params.recoveryToken,
          customerId: params.customerId || null,
          recipientEmail: params.recipientEmail || null,
          recipientPhone: params.recipientPhone || null,
          savedAddress: params.savedAddress || undefined,
          totalPoisha: params.totalPoisha,
          itemCount: params.itemCount,
          incentiveCouponCode: params.incentiveCouponCode || null,
          recoveryStatus: 'ABANDONED',
          expiresAt,
        },
      });
    }

    return this.mapToDTO(record);
  }

  /**
   * Retrieves an abandoned checkout record by its recovery token.
   */
  public async findByToken(recoveryToken: string): Promise<any | null> {
    return (this.db as any).abandonedCheckoutRecovery.findUnique({
      where: { recoveryToken },
      include: {
        cart: {
          include: {
            items: {
              where: { deletedAt: null },
              include: {
                variant: { include: { product: { include: { seller: true } } } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retrieves by ID.
   */
  public async findById(id: string): Promise<any | null> {
    return (this.db as any).abandonedCheckoutRecovery.findUnique({
      where: { id },
      include: {
        cart: {
          include: {
            items: {
              where: { deletedAt: null },
              include: {
                variant: { include: { product: { include: { seller: true } } } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Marks recovery as NOTIFIED.
   */
  public async markNotified(id: string): Promise<void> {
    await (this.db as any).abandonedCheckoutRecovery.update({
      where: { id },
      data: {
        recoveryStatus: 'NOTIFIED',
        notifiedAt: new Date(),
      },
    });
  }

  /**
   * Marks recovery as RECOVERED upon order completion.
   */
  public async markRecovered(id: string, orderId: string): Promise<void> {
    await (this.db as any).abandonedCheckoutRecovery.update({
      where: { id },
      data: {
        recoveryStatus: 'RECOVERED',
        recoveredAt: new Date(),
        recoveredOrderId: orderId,
      },
    });
  }

  /**
   * Lists abandoned checkouts with filters and pagination.
   */
  public async listAbandoned(options: {
    status?: AbandonedCheckoutStatus;
    page?: number;
    limit?: number;
    minTotalPoisha?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ items: AbandonedCheckoutDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      ...(options.status ? { recoveryStatus: options.status } : {}),
      ...(options.minTotalPoisha ? { totalPoisha: { gte: BigInt(options.minTotalPoisha) } } : {}),
      ...(options.startDate || options.endDate
        ? {
            createdAt: {
              ...(options.startDate ? { gte: options.startDate } : {}),
              ...(options.endDate ? { lte: options.endDate } : {}),
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      (this.db as any).abandonedCheckoutRecovery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cart: {
            select: {
              items: { select: { id: true } },
              currency: true,
              isB2B: true,
            },
          },
        },
      }),
      (this.db as any).abandonedCheckoutRecovery.count({ where }),
    ]);

    return {
      items: records.map(this.mapToDTO),
      total,
      page,
      limit,
    };
  }

  private mapToDTO(record: any): AbandonedCheckoutDTO {
    const total = Number(record.totalPoisha || 0);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const recoveryUrl = `${appUrl}/checkout/recover?token=${record.recoveryToken}`;

    let maskedPhone = null;
    if (record.recipientPhone) {
      try {
        maskedPhone = maskBangladeshPhone(record.recipientPhone);
      } catch {
        maskedPhone = record.recipientPhone.slice(0, 3) + '****' + record.recipientPhone.slice(-3);
      }
    }

    return {
      id: record.id,
      cartId: record.cartId,
      recoveryToken: record.recoveryToken,
      recoveryUrl,
      customerId: record.customerId,
      recipientEmail: record.recipientEmail,
      recipientPhone: record.recipientPhone,
      recipientPhoneMasked: maskedPhone,
      savedAddress: record.savedAddress || null,
      totalPoisha: total,
      totalBdtFormatted: `৳${(total / 100).toFixed(2)}`,
      itemCount: record.itemCount,
      incentiveCouponCode: record.incentiveCouponCode,
      recoveryStatus: record.recoveryStatus as AbandonedCheckoutStatus,
      notifiedAt: record.notifiedAt ? new Date(record.notifiedAt).toISOString() : null,
      recoveredAt: record.recoveredAt ? new Date(record.recoveredAt).toISOString() : null,
      recoveredOrderId: record.recoveredOrderId,
      expiresAt: new Date(record.expiresAt).toISOString(),
      createdAt: record.createdAt?.toISOString?.() || new Date(record.createdAt).toISOString(),
      cart: record.cart
        ? {
            itemsCount: record.cart.items?.length || record.itemCount,
            currency: 'BDT',
            isB2B: Boolean(record.cart.isB2B),
          }
        : null,
    };
  }
}

export const abandonedCheckoutRepository = new AbandonedCheckoutRepository();
