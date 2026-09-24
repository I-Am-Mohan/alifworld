import { PrismaClient, Prisma } from '@prisma/client';

export class CouponRedemptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Transactional coupon reservation.
   * Atomically verifies usage caps and increments usage count before creating the RESERVED record.
   */
  async reserveCoupon(
    params: {
      couponCode: string;
      customerId: string;
      discountAmountPoisha: bigint;
      discountRuleId?: string | null;
      promotionId?: string | null;
      sellerId?: string | null;
      perCustomerLimit?: number;
      usageLimit?: number | null;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    const codeUpper = params.couponCode.toUpperCase();

    // 1. Check customer redemptions count for this coupon
    const activeCustomerCount = await client.couponRedemption.count({
      where: {
        couponCode: codeUpper,
        customerId: params.customerId,
        status: { in: ['RESERVED', 'COMMITTED'] },
      },
    });

    const perCustomerCap = params.perCustomerLimit ?? 1;
    if (activeCustomerCount >= perCustomerCap) {
      throw new Error(`Per-customer limit of ${perCustomerCap} reached for coupon '${codeUpper}'`);
    }

    // 2. Increment usageCount on DiscountRule or Promotion atomically
    if (params.discountRuleId) {
      const rule = await client.discountRule.findUnique({
        where: { id: params.discountRuleId },
      });
      if (!rule || rule.status !== 'ACTIVE' || rule.deletedAt) {
        throw new Error(`Discount rule '${params.discountRuleId}' is invalid or inactive`);
      }
      if (rule.usageLimit !== null && rule.usageCount >= rule.usageLimit) {
        throw new Error(`Coupon '${codeUpper}' usage limit of ${rule.usageLimit} exceeded`);
      }

      await client.discountRule.update({
        where: { id: params.discountRuleId },
        data: { usageCount: { increment: 1 } },
      });
    } else if (params.promotionId) {
      const promo = await client.promotion.findUnique({
        where: { id: params.promotionId },
      });
      if (!promo || promo.status !== 'ACTIVE' || promo.deletedAt) {
        throw new Error(`Promotion '${params.promotionId}' is invalid or inactive`);
      }
      if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
        throw new Error(`Coupon '${codeUpper}' usage limit of ${promo.usageLimit} exceeded`);
      }

      await client.promotion.update({
        where: { id: params.promotionId },
        data: { usageCount: { increment: 1 } },
      });
    }

    // 3. Create RESERVED record
    return client.couponRedemption.create({
      data: {
        couponCode: codeUpper,
        discountRuleId: params.discountRuleId || null,
        promotionId: params.promotionId || null,
        customerId: params.customerId,
        sellerId: params.sellerId || null,
        discountAmountPoisha: params.discountAmountPoisha,
        status: 'RESERVED',
        reservedAt: new Date(),
        ruleVersion: 'v1.0.0',
      },
    });
  }

  /**
   * Commits a reserved redemption to COMMITTED upon order placement.
   */
  async commitRedemption(redemptionId: string, orderId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.couponRedemption.update({
      where: { id: redemptionId },
      data: {
        status: 'COMMITTED',
        orderId,
        committedAt: new Date(),
      },
    });
  }

  /**
   * Transactional reversal of a reserved or committed coupon redemption.
   * Decrements usage count on rule/promotion and sets status to REVERSED.
   */
  async reverseRedemption(redemptionId: string, reason: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    const redemption = await client.couponRedemption.findUnique({
      where: { id: redemptionId },
    });

    if (!redemption || redemption.status === 'REVERSED') {
      return redemption;
    }

    // Decrement counter if previously incremented
    if (redemption.discountRuleId) {
      await client.discountRule.update({
        where: { id: redemption.discountRuleId },
        data: { usageCount: { decrement: 1 } },
      });
    } else if (redemption.promotionId) {
      await client.promotion.update({
        where: { id: redemption.promotionId },
        data: { usageCount: { decrement: 1 } },
      });
    }

    return client.couponRedemption.update({
      where: { id: redemptionId },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversalReason: reason,
      },
    });
  }

  async listRedemptions(params: {
    customerId?: string;
    sellerId?: string;
    couponCode?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CouponRedemptionWhereInput = {
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.sellerId ? { sellerId: params.sellerId } : {}),
      ...(params.couponCode ? { couponCode: params.couponCode.toUpperCase() } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.couponRedemption.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, businessName: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      }),
      this.prisma.couponRedemption.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
