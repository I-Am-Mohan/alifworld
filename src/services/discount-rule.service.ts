import { PrismaClient, Prisma } from '@prisma/client';
import { DiscountRuleRepository } from '../repositories/discount-rule.repository';
import { DiscountRulePolicy } from '../shared/authz/policies/discount-rule.policy';
import { ActorContext } from '../shared/authz/authz.types';
import {
  CreateDiscountRuleInput,
  UpdateDiscountRuleInput,
  EvaluateDiscountRulesInput,
} from '../validators/discount-rule.validator';
import {
  evaluateDiscountRule,
  DiscountEvaluationResult,
  DiscountRuleDescriptor,
} from '../shared/pricing/discount-rule-engine';

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

export class DiscountRuleService {
  private readonly repo: DiscountRuleRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new DiscountRuleRepository(prisma);
  }

  async createDiscountRule(actor: ActorContext, input: CreateDiscountRuleInput) {
    const resource = { sellerId: input.sellerId || null, fundingType: input.fundingType };

    if (!DiscountRulePolicy.canCreateDiscountRule(actor, resource)) {
      throw new AuthorizationError('Insufficient permissions to create discount rule');
    }

    if (input.code) {
      const existing = await this.repo.getDiscountRuleByCode(input.code);
      if (existing) {
        throw new ValidationError(`Discount code '${input.code}' already exists`);
      }
    }

    let sellerSharePercent = new Prisma.Decimal(input.sellerSharePercent ?? 0);
    let platformSharePercent = new Prisma.Decimal(input.platformSharePercent ?? 100);

    if (input.fundingType === 'PLATFORM_FUNDED') {
      sellerSharePercent = new Prisma.Decimal(0);
      platformSharePercent = new Prisma.Decimal(100);
    } else if (input.fundingType === 'SELLER_FUNDED') {
      sellerSharePercent = new Prisma.Decimal(100);
      platformSharePercent = new Prisma.Decimal(0);
    }

    return this.repo.createDiscountRule(
      {
        code: input.code ? input.code.toUpperCase() : null,
        title: input.title,
        titleBn: input.titleBn || null,
        description: input.description || null,
        discountType: input.discountType,
        targetScope: input.targetScope,
        discountValue: new Prisma.Decimal(input.discountValue),
        maxDiscountPoisha: input.maxDiscountPoisha ?? null,
        minOrderSubtotalPoisha: input.minOrderSubtotalPoisha ?? 0n,
        minQuantity: input.minQuantity ?? 1,
        buyQuantity: input.buyQuantity ?? null,
        getQuantity: input.getQuantity ?? null,
        getDiscountPercent: input.getDiscountPercent != null ? new Prisma.Decimal(input.getDiscountPercent) : null,
        isAutomatic: input.isAutomatic ?? true,
        fundingType: input.fundingType,
        sellerSharePercent,
        platformSharePercent,
        seller: input.sellerId ? { connect: { id: input.sellerId } } : undefined,
        buyerSegment: input.buyerSegment || null,
        priority: input.priority ?? 0,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        usageLimit: input.usageLimit ?? null,
        status: input.status ?? 'ACTIVE',
        createdBy: actor.userId,
      },
      input.targets
    );
  }

  async updateDiscountRule(actor: ActorContext, id: string, input: UpdateDiscountRuleInput) {
    const existing = await this.repo.getDiscountRuleById(id);
    if (!existing) {
      throw new NotFoundError(`Discount rule with ID '${id}' not found`);
    }

    if (!DiscountRulePolicy.canUpdateDiscountRule(actor, existing)) {
      throw new AuthorizationError('Insufficient permissions to update this discount rule');
    }

    const data: Prisma.DiscountRuleUpdateInput = {
      updatedBy: actor.userId,
    };
    if (input.title !== undefined) data.title = input.title;
    if (input.titleBn !== undefined) data.titleBn = input.titleBn;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;

    return this.repo.updateDiscountRule(id, data);
  }

  async listDiscountRules(
    actor: ActorContext,
    params: { discountType?: string; isAutomatic?: boolean; status?: string; page?: number; limit?: number }
  ) {
    const isSeller = actor.roles.includes('SELLER');
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');

    let scopedSellerId: string | null | undefined = undefined;
    if (isSeller) {
      scopedSellerId = actor.sellerId || null;
    } else if (isAdmin) {
      scopedSellerId = undefined;
    }

    return this.repo.listDiscountRules({
      sellerId: scopedSellerId,
      discountType: params.discountType,
      isAutomatic: params.isAutomatic,
      status: params.status,
      page: params.page,
      limit: params.limit,
    });
  }

  async getDiscountRuleById(actor: ActorContext, id: string) {
    const rule = await this.repo.getDiscountRuleById(id);
    if (!rule) {
      throw new NotFoundError(`Discount rule with ID '${id}' not found`);
    }

    if (!DiscountRulePolicy.canReadDiscountRule(actor, rule)) {
      throw new AuthorizationError('Insufficient permissions to view this discount rule');
    }

    return rule;
  }

  /**
   * Evaluates all applicable automatic and coupon discount rules for a shopping cart.
   */
  async evaluateDiscounts(input: EvaluateDiscountRulesInput): Promise<{
    totalDiscountAmountPoisha: bigint;
    appliedDiscounts: DiscountEvaluationResult[];
  }> {
    const now = new Date();
    const automaticRules = await this.repo.getActiveAutomaticRules(now);
    const rulesToEvaluate = [...automaticRules];

    if (input.couponCode) {
      const couponRule = await this.repo.getDiscountRuleByCode(input.couponCode);
      if (couponRule && couponRule.status === 'ACTIVE' && !couponRule.deletedAt) {
        rulesToEvaluate.push(couponRule);
      }
    }

    const appliedDiscounts: DiscountEvaluationResult[] = [];
    let totalDiscountAmountPoisha = 0n;

    for (const rule of rulesToEvaluate) {
      const descriptor: DiscountRuleDescriptor = {
        id: rule.id,
        code: rule.code,
        title: rule.title,
        discountType: rule.discountType,
        targetScope: rule.targetScope,
        discountValue: rule.discountValue,
        maxDiscountPoisha: rule.maxDiscountPoisha,
        minOrderSubtotalPoisha: rule.minOrderSubtotalPoisha,
        minQuantity: rule.minQuantity,
        buyQuantity: rule.buyQuantity,
        getQuantity: rule.getQuantity,
        getDiscountPercent: rule.getDiscountPercent,
        isAutomatic: rule.isAutomatic,
        fundingType: rule.fundingType,
        sellerSharePercent: rule.sellerSharePercent,
        platformSharePercent: rule.platformSharePercent,
        sellerId: rule.sellerId,
        buyerSegment: rule.buyerSegment,
        priority: rule.priority,
        startsAt: rule.startsAt,
        endsAt: rule.endsAt,
        usageLimit: rule.usageLimit,
        usageCount: rule.usageCount,
        status: rule.status,
        deletedAt: rule.deletedAt,
        targets: (rule.targets || []).map((t) => ({ targetType: t.targetType, targetId: t.targetId })),
      };

      const result = evaluateDiscountRule(descriptor, {
        lineItems: input.lineItems.map((li) => ({
          lineItemId: li.lineItemId,
          productId: li.productId,
          variantId: li.variantId,
          categoryId: li.categoryId,
          brandId: li.brandId,
          sellerId: li.sellerId,
          unitPricePoisha: li.unitPricePoisha,
          quantity: li.quantity,
        })),
        shippingFeePoisha: input.shippingFeePoisha,
        buyerSegment: input.buyerSegment,
        couponCode: input.couponCode,
        now,
      });

      if (result && result.discountAmountPoisha > 0n) {
        appliedDiscounts.push(result);
        totalDiscountAmountPoisha += result.discountAmountPoisha;
      }
    }

    return {
      totalDiscountAmountPoisha,
      appliedDiscounts,
    };
  }
}
