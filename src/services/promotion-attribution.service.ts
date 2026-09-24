import { PrismaClient, Prisma } from '@prisma/client';
import { PromotionAttributionRepository } from '../repositories/promotion-attribution.repository';
import { PromotionPolicy } from '../shared/authz/policies/promotion.policy';
import { ActorContext } from '../shared/authz/authz.types';
import {
  CreatePromotionInput,
  UpdatePromotionInput,
  AttributionQueryInput,
  EvaluatePromotionInput,
} from '../validators/promotion.validator';
import {
  calculatePromotionAttribution,
  calculateSellerPayoutWithPromotions,
  PromotionAttributionResult,
} from '../shared/pricing/promotion-funding-calculator';

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

export class PromotionAttributionService {
  private readonly repo: PromotionAttributionRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new PromotionAttributionRepository(prisma);
  }

  async createPromotion(actor: ActorContext, input: CreatePromotionInput) {
    const resource = {
      sellerId: input.sellerId || null,
      fundingType: input.fundingType,
    };

    if (!PromotionPolicy.canCreatePromotion(actor, resource)) {
      throw new AuthorizationError('Insufficient permissions to create this promotion funding configuration');
    }

    const existing = await this.repo.getPromotionByCode(input.code);
    if (existing) {
      throw new ValidationError(`Promotion code '${input.code}' already exists`);
    }

    // Determine default sellerShare / platformShare percentages if not explicitly passed
    let sellerSharePercent = new Prisma.Decimal(input.sellerSharePercent ?? 0);
    let platformSharePercent = new Prisma.Decimal(input.platformSharePercent ?? 100);

    if (input.fundingType === 'PLATFORM_FUNDED') {
      sellerSharePercent = new Prisma.Decimal(0);
      platformSharePercent = new Prisma.Decimal(100);
    } else if (input.fundingType === 'SELLER_FUNDED') {
      sellerSharePercent = new Prisma.Decimal(100);
      platformSharePercent = new Prisma.Decimal(0);
    }

    return this.repo.createPromotion({
      code: input.code.toUpperCase(),
      title: input.title,
      titleBn: input.titleBn,
      description: input.description,
      promotionType: input.promotionType,
      fundingType: input.fundingType,
      sellerSharePercent,
      platformSharePercent,
      seller: input.sellerId ? { connect: { id: input.sellerId } } : undefined,
      discountValue: new Prisma.Decimal(input.discountValue),
      maxDiscountPoisha: input.maxDiscountPoisha ?? null,
      minOrderSubtotalPoisha: input.minOrderSubtotalPoisha ?? 0n,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit ?? 1,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      status: input.status ?? 'ACTIVE',
      createdBy: actor.userId,
    });
  }

  async updatePromotion(actor: ActorContext, id: string, input: UpdatePromotionInput) {
    const existing = await this.repo.getPromotionById(id);
    if (!existing) {
      throw new NotFoundError(`Promotion with ID '${id}' not found`);
    }

    if (!PromotionPolicy.canUpdatePromotion(actor, existing)) {
      throw new AuthorizationError('Insufficient permissions to update this promotion');
    }

    const data: Prisma.PromotionUpdateInput = {
      updatedBy: actor.userId,
    };
    if (input.title !== undefined) data.title = input.title;
    if (input.titleBn !== undefined) data.titleBn = input.titleBn;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;

    // Only Admin can update fundingType or percentages
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      if (input.fundingType !== undefined) data.fundingType = input.fundingType;
      if (input.sellerSharePercent !== undefined) data.sellerSharePercent = new Prisma.Decimal(input.sellerSharePercent);
      if (input.platformSharePercent !== undefined) data.platformSharePercent = new Prisma.Decimal(input.platformSharePercent);
    }

    return this.repo.updatePromotion(id, data);
  }

  async getPromotionByCode(code: string) {
    const promo = await this.repo.getPromotionByCode(code);
    if (!promo) {
      throw new NotFoundError(`Promotion code '${code}' not found`);
    }
    return promo;
  }

  /**
   * Evaluates coupon eligibility and computes strict integer poisha seller vs platform attribution.
   */
  async evaluateCoupon(input: EvaluatePromotionInput): Promise<{
    promotionId: string;
    code: string;
    discountAmountPoisha: bigint;
    attribution: PromotionAttributionResult;
  }> {
    const promo = await this.repo.getPromotionByCode(input.couponCode);
    if (!promo || promo.deletedAt) {
      throw new ValidationError(`Coupon '${input.couponCode}' is invalid or expired`);
    }

    if (promo.status !== 'ACTIVE') {
      throw new ValidationError(`Coupon '${input.couponCode}' is not active`);
    }

    const now = new Date();
    if (now < promo.startsAt) {
      throw new ValidationError(`Coupon '${input.couponCode}' is not yet active`);
    }

    if (promo.endsAt && now > promo.endsAt) {
      throw new ValidationError(`Coupon '${input.couponCode}' has expired`);
    }

    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
      throw new ValidationError(`Coupon '${input.couponCode}' usage limit exceeded`);
    }

    if (input.subtotalPoisha < promo.minOrderSubtotalPoisha) {
      throw new ValidationError(
        `Minimum subtotal requirement of ${promo.minOrderSubtotalPoisha} poisha not met for coupon '${input.couponCode}'`
      );
    }

    if (promo.sellerId && input.sellerId && promo.sellerId !== input.sellerId) {
      throw new ValidationError(`Coupon '${input.couponCode}' is restricted to a different seller`);
    }

    // Calculate discount amount in poisha
    let rawDiscountPoisha = 0n;
    if (promo.promotionType === 'PERCENTAGE') {
      const pctScaled = BigInt(Math.round(Number(promo.discountValue) * 100)); // e.g. 10.00% -> 1000
      rawDiscountPoisha = (input.subtotalPoisha * pctScaled) / 10000n;
    } else {
      // FIXED_AMOUNT (discountValue in BDT, so * 100 for poisha) or exact poisha
      rawDiscountPoisha = BigInt(Math.round(Number(promo.discountValue) * 100));
    }

    // Apply cap if maxDiscountPoisha is set
    let finalDiscountPoisha = rawDiscountPoisha;
    if (promo.maxDiscountPoisha !== null && finalDiscountPoisha > promo.maxDiscountPoisha) {
      finalDiscountPoisha = promo.maxDiscountPoisha;
    }

    if (finalDiscountPoisha > input.subtotalPoisha) {
      finalDiscountPoisha = input.subtotalPoisha;
    }

    const attribution = calculatePromotionAttribution(finalDiscountPoisha, {
      fundingType: promo.fundingType as any,
      sellerSharePercent: promo.sellerSharePercent,
      platformSharePercent: promo.platformSharePercent,
    });

    return {
      promotionId: promo.id,
      code: promo.code,
      discountAmountPoisha: finalDiscountPoisha,
      attribution,
    };
  }

  /**
   * Records promotion attributions for an order execution in DB.
   */
  async recordOrderAttribution(params: {
    orderId: string;
    fulfillmentGroupId?: string;
    orderItemId?: string;
    sellerId?: string;
    promotionId?: string;
    couponCode?: string;
    discountAmountPoisha: bigint;
    fundingType: 'PLATFORM_FUNDED' | 'SELLER_FUNDED' | 'CO_FUNDED';
    sellerSharePercent?: number;
    platformSharePercent?: number;
    tx?: Prisma.TransactionClient;
  }) {
    const attribution = calculatePromotionAttribution(params.discountAmountPoisha, {
      fundingType: params.fundingType,
      sellerSharePercent: params.sellerSharePercent,
      platformSharePercent: params.platformSharePercent,
    });

    const record: Prisma.PromotionAttributionCreateManyInput = {
      orderId: params.orderId,
      fulfillmentGroupId: params.fulfillmentGroupId || null,
      orderItemId: params.orderItemId || null,
      sellerId: params.sellerId || null,
      promotionId: params.promotionId || null,
      couponCode: params.couponCode ? params.couponCode.toUpperCase() : null,
      fundingType: params.fundingType,
      discountAmountPoisha: attribution.discountAmountPoisha,
      sellerSharePoisha: attribution.sellerSharePoisha,
      platformSharePoisha: attribution.platformSharePoisha,
      sellerSharePercent: new Prisma.Decimal(attribution.sellerSharePercent),
      platformSharePercent: new Prisma.Decimal(attribution.platformSharePercent),
      ruleVersion: 'v1.0.0',
    };

    await this.repo.createAttributionRecords([record], params.tx);
    return attribution;
  }

  /**
   * Retrieves paginated attributions with strict seller-tenant scoping.
   * If actor is a SELLER, forces query.sellerId = actor.sellerId.
   */
  async listAttributions(actor: ActorContext, query: AttributionQueryInput) {
    const isSeller = actor.roles.includes('SELLER');
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');

    if (!isAdmin && !isSeller) {
      throw new AuthorizationError('Insufficient permissions to view promotion attributions');
    }

    let scopedSellerId = query.sellerId;
    if (isSeller) {
      if (!actor.sellerId) {
        throw new AuthorizationError('Seller account is not bound to a valid sellerId');
      }
      if (query.sellerId && query.sellerId !== actor.sellerId) {
        throw new AuthorizationError('Sellers cannot view another seller\'s promotion attributions');
      }
      scopedSellerId = actor.sellerId;
    }

    return this.repo.getAttributions({
      sellerId: scopedSellerId,
      orderId: query.orderId,
      couponCode: query.couponCode,
      fundingType: query.fundingType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Retrieves promotion attribution summary report with strict tenant isolation.
   */
  async getAttributionSummary(actor: ActorContext, targetSellerId?: string) {
    const isSeller = actor.roles.includes('SELLER');
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');

    if (!isAdmin && !isSeller) {
      throw new AuthorizationError('Insufficient permissions to view promotion summary');
    }

    let scopedSellerId = targetSellerId;
    if (isSeller) {
      if (!actor.sellerId) {
        throw new AuthorizationError('Seller account is not bound to a valid sellerId');
      }
      if (targetSellerId && targetSellerId !== actor.sellerId) {
        throw new AuthorizationError('Sellers cannot view another seller\'s promotion summary');
      }
      scopedSellerId = actor.sellerId;
    }

    return this.repo.getAttributionSummary(scopedSellerId);
  }

  /**
   * Computes seller payout with promotion attribution logic for a fulfillment group.
   */
  computeSellerPayout(input: {
    subtotalPoisha: bigint;
    sellerDiscountPoisha: bigint;
    platformDiscountPoisha: bigint;
    sellerCommissionPoisha: bigint;
  }) {
    return calculateSellerPayoutWithPromotions(input);
  }
}
