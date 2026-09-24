import { PrismaClient, Prisma } from '@prisma/client';
import { CouponRedemptionRepository } from '../repositories/coupon-redemption.repository';
import { DiscountRuleRepository } from '../repositories/discount-rule.repository';
import { PromotionAttributionRepository } from '../repositories/promotion-attribution.repository';
import { CouponPolicy } from '../shared/authz/policies/coupon.policy';
import { ActorContext } from '../shared/authz/authz.types';
import {
  ApplyCouponInput,
  ReleaseCouponInput,
  RedemptionQueryInput,
} from '../validators/coupon.validator';
import { evaluateDiscountRule } from '../shared/pricing/discount-rule-engine';

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class CouponLifecycleService {
  private readonly redemptionRepo: CouponRedemptionRepository;
  private readonly discountRuleRepo: DiscountRuleRepository;
  private readonly promotionRepo: PromotionAttributionRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.redemptionRepo = new CouponRedemptionRepository(prisma);
    this.discountRuleRepo = new DiscountRuleRepository(prisma);
    this.promotionRepo = new PromotionAttributionRepository(prisma);
  }

  /**
   * Validates coupon eligibility and reserves a redemption transactionally.
   */
  async applyAndReserveCoupon(actor: ActorContext, input: ApplyCouponInput) {
    if (!actor.userId) {
      throw new AuthorizationError('Authentication required to apply coupon');
    }

    const codeUpper = input.couponCode.toUpperCase();
    const now = new Date();

    // 1. Try finding coupon as a DiscountRule
    const discountRule = await this.discountRuleRepo.getDiscountRuleByCode(codeUpper);
    let promotion = null;

    if (!discountRule) {
      // 2. Try finding as a Promotion
      promotion = await this.promotionRepo.getPromotionByCode(codeUpper);
    }

    if (!discountRule && !promotion) {
      throw new ValidationError(`Coupon code '${codeUpper}' is invalid or expired`);
    }

    let discountAmountPoisha = 0n;
    let discountRuleId: string | null = null;
    let promotionId: string | null = null;
    let sellerId: string | null = null;
    let perCustomerLimit = 1;
    let usageLimit: number | null = null;

    if (discountRule) {
      if (discountRule.status !== 'ACTIVE' || discountRule.deletedAt) {
        throw new ValidationError(`Coupon '${codeUpper}' is inactive`);
      }
      if (now < discountRule.startsAt) {
        throw new ValidationError(`Coupon '${codeUpper}' is not yet active`);
      }
      if (discountRule.endsAt && now > discountRule.endsAt) {
        throw new ValidationError(`Coupon '${codeUpper}' has expired`);
      }
      if (input.subtotalPoisha < discountRule.minOrderSubtotalPoisha) {
        throw new ValidationError(
          `Minimum order subtotal requirement of ${discountRule.minOrderSubtotalPoisha} poisha not met`
        );
      }
      if (discountRule.sellerId && input.sellerId && discountRule.sellerId !== input.sellerId) {
        throw new ValidationError(`Coupon '${codeUpper}' is restricted to another seller`);
      }

      // Calculate discount amount
      const evalResult = evaluateDiscountRule(
        {
          id: discountRule.id,
          code: discountRule.code,
          title: discountRule.title,
          discountType: discountRule.discountType,
          targetScope: discountRule.targetScope,
          discountValue: discountRule.discountValue,
          maxDiscountPoisha: discountRule.maxDiscountPoisha,
          minOrderSubtotalPoisha: discountRule.minOrderSubtotalPoisha,
          minQuantity: discountRule.minQuantity,
          buyQuantity: discountRule.buyQuantity,
          getQuantity: discountRule.getQuantity,
          getDiscountPercent: discountRule.getDiscountPercent,
          isAutomatic: discountRule.isAutomatic,
          fundingType: discountRule.fundingType,
          sellerSharePercent: discountRule.sellerSharePercent,
          platformSharePercent: discountRule.platformSharePercent,
          sellerId: discountRule.sellerId,
          buyerSegment: discountRule.buyerSegment,
          priority: discountRule.priority,
          startsAt: discountRule.startsAt,
          endsAt: discountRule.endsAt,
          status: discountRule.status,
          targets: (discountRule.targets || []).map((t) => ({ targetType: t.targetType, targetId: t.targetId })),
        },
        {
          lineItems: [
            {
              lineItemId: 'cart-item',
              productId: 'prod-cart',
              sellerId: input.sellerId || 'sel-default',
              unitPricePoisha: input.subtotalPoisha,
              quantity: 1,
            },
          ],
          now,
        }
      );

      discountAmountPoisha = evalResult?.discountAmountPoisha || 0n;
      discountRuleId = discountRule.id;
      sellerId = discountRule.sellerId || input.sellerId || null;
      usageLimit = discountRule.usageLimit;
    } else if (promotion) {
      if (promotion.status !== 'ACTIVE' || promotion.deletedAt) {
        throw new ValidationError(`Coupon '${codeUpper}' is inactive`);
      }
      if (now < promotion.startsAt) {
        throw new ValidationError(`Coupon '${codeUpper}' is not yet active`);
      }
      if (promotion.endsAt && now > promotion.endsAt) {
        throw new ValidationError(`Coupon '${codeUpper}' has expired`);
      }
      if (input.subtotalPoisha < promotion.minOrderSubtotalPoisha) {
        throw new ValidationError(
          `Minimum order subtotal requirement of ${promotion.minOrderSubtotalPoisha} poisha not met`
        );
      }
      if (promotion.sellerId && input.sellerId && promotion.sellerId !== input.sellerId) {
        throw new ValidationError(`Coupon '${codeUpper}' is restricted to another seller`);
      }

      let rawPoisha = 0n;
      if (promotion.promotionType === 'PERCENTAGE') {
        const pctScaled = BigInt(Math.round(Number(promotion.discountValue) * 100));
        rawPoisha = (input.subtotalPoisha * pctScaled) / 10000n;
      } else {
        rawPoisha = BigInt(Math.round(Number(promotion.discountValue) * 100));
      }

      if (promotion.maxDiscountPoisha !== null && rawPoisha > promotion.maxDiscountPoisha) {
        rawPoisha = promotion.maxDiscountPoisha;
      }

      discountAmountPoisha = rawPoisha;
      promotionId = promotion.id;
      sellerId = promotion.sellerId || input.sellerId || null;
      perCustomerLimit = promotion.perCustomerLimit ?? 1;
      usageLimit = promotion.usageLimit;
    }

    if (discountAmountPoisha <= 0n) {
      throw new ValidationError(`Coupon '${codeUpper}' provides no discount for current order subtotal`);
    }

    // Atomically reserve redemption in database transaction
    return this.prisma.$transaction(async (tx) => {
      return this.redemptionRepo.reserveCoupon(
        {
          couponCode: codeUpper,
          customerId: actor.userId,
          discountAmountPoisha,
          discountRuleId,
          promotionId,
          sellerId,
          perCustomerLimit,
          usageLimit,
        },
        tx
      );
    });
  }

  /**
   * Commits a reserved redemption upon order placement.
   */
  async commitRedemption(redemptionId: string, orderId: string, tx?: Prisma.TransactionClient) {
    return this.redemptionRepo.commitRedemption(redemptionId, orderId, tx);
  }

  /**
   * Releases or reverses a coupon redemption.
   */
  async releaseRedemption(actor: ActorContext, input: ReleaseCouponInput) {
    const list = await this.redemptionRepo.listRedemptions({ page: 1, limit: 1 });
    const redemption = list.items.find((i) => i.id === input.redemptionId);

    if (redemption && !CouponPolicy.canReleaseRedemption(actor, { customerId: redemption.customerId })) {
      throw new AuthorizationError('Insufficient permissions to release this coupon redemption');
    }

    return this.prisma.$transaction(async (tx) => {
      return this.redemptionRepo.reverseRedemption(input.redemptionId, input.reason, tx);
    });
  }

  /**
   * Lists coupon redemptions with strict tenant isolation and self-scoping.
   */
  async listRedemptions(actor: ActorContext, query: RedemptionQueryInput) {
    const isCustomer = actor.roles.includes('CUSTOMER');
    const isSeller = actor.roles.includes('SELLER');
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');

    let scopedCustomerId = query.customerId;
    let scopedSellerId = query.sellerId;

    if (isCustomer && !isAdmin) {
      scopedCustomerId = actor.userId;
    }

    if (isSeller && !isAdmin) {
      if (query.sellerId && query.sellerId !== actor.sellerId) {
        throw new AuthorizationError('Sellers cannot view redemptions for another store');
      }
      scopedSellerId = actor.sellerId || undefined;
    }

    return this.redemptionRepo.listRedemptions({
      customerId: scopedCustomerId,
      sellerId: scopedSellerId,
      couponCode: query.couponCode,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }
}
