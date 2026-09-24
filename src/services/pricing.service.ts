import { PrismaClient, Prisma } from '@prisma/client';
import { PriceListRepository } from '../repositories/price-list.repository';
import { PricingPolicy } from '../shared/authz/policies/pricing.policy';
import { ActorContext } from '../shared/authz/authz.types';
import {
  CreatePriceListInput,
  UpdatePriceListInput,
  CreatePriceListRuleInput,
  ResolvePriceQueryInput,
} from '../validators/pricing.validator';
import {
  resolveEffectivePrice,
  ResolvedPriceResult,
  MOQViolationError,
  EligiblePriceListRule,
} from '../shared/pricing/price-resolver';

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

export class PricingService {
  private readonly repo: PriceListRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new PriceListRepository(prisma);
  }

  async createPriceList(actor: ActorContext, input: CreatePriceListInput) {
    const resource = { sellerId: input.sellerId || null, channel: input.channel };

    if (!PricingPolicy.canCreatePriceList(actor, resource)) {
      throw new AuthorizationError('Insufficient permissions to create price list');
    }

    const existing = await this.repo.getPriceListByCode(input.code);
    if (existing) {
      throw new ValidationError(`Price list code '${input.code}' already exists`);
    }

    return this.repo.createPriceList({
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description,
      channel: input.channel,
      currency: input.currency || 'BDT',
      buyerSegment: input.buyerSegment || null,
      priority: input.priority ?? 0,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      status: input.status ?? 'ACTIVE',
      seller: input.sellerId ? { connect: { id: input.sellerId } } : undefined,
      createdBy: actor.userId,
    });
  }

  async updatePriceList(actor: ActorContext, id: string, input: UpdatePriceListInput) {
    const existing = await this.repo.getPriceListById(id);
    if (!existing) {
      throw new NotFoundError(`Price list with ID '${id}' not found`);
    }

    if (!PricingPolicy.canUpdatePriceList(actor, existing)) {
      throw new AuthorizationError('Insufficient permissions to update this price list');
    }

    const data: Prisma.PriceListUpdateInput = {
      updatedBy: actor.userId,
    };
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;
    if (input.buyerSegment !== undefined) data.buyerSegment = input.buyerSegment;
    if (input.startsAt !== undefined) data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;

    return this.repo.updatePriceList(id, data);
  }

  async addRuleToPriceList(actor: ActorContext, input: CreatePriceListRuleInput) {
    const priceList = await this.repo.getPriceListById(input.priceListId);
    if (!priceList) {
      throw new NotFoundError(`Price list with ID '${input.priceListId}' not found`);
    }

    if (!PricingPolicy.canUpdatePriceList(actor, priceList)) {
      throw new AuthorizationError('Insufficient permissions to add rules to this price list');
    }

    return this.repo.addPriceListRule({
      priceList: { connect: { id: input.priceListId } },
      product: input.productId ? { connect: { id: input.productId } } : undefined,
      variant: input.variantId ? { connect: { id: input.variantId } } : undefined,
      pricePoisha: input.pricePoisha,
      compareAtPricePoisha: input.compareAtPricePoisha ?? null,
      minQuantity: input.minQuantity ?? 1,
      maxQuantity: input.maxQuantity ?? null,
      productPointOverride: input.productPointOverride ?? null,
    });
  }

  async listPriceLists(
    actor: ActorContext,
    params: { channel?: string; buyerSegment?: string; status?: string; page?: number; limit?: number }
  ) {
    const isSeller = actor.roles.includes('SELLER');
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');

    let scopedSellerId: string | null | undefined = undefined;
    if (isSeller) {
      scopedSellerId = actor.sellerId || null;
    } else if (isAdmin) {
      scopedSellerId = undefined; // Admin sees all
    }

    return this.repo.listPriceLists({
      sellerId: scopedSellerId,
      channel: params.channel,
      buyerSegment: params.buyerSegment,
      status: params.status,
      page: params.page,
      limit: params.limit,
    });
  }

  async getPriceListById(actor: ActorContext, id: string) {
    const priceList = await this.repo.getPriceListById(id);
    if (!priceList) {
      throw new NotFoundError(`Price list with ID '${id}' not found`);
    }

    if (!PricingPolicy.canReadPriceList(actor, priceList)) {
      throw new AuthorizationError('Insufficient permissions to view this price list');
    }

    return priceList;
  }

  /**
   * Server-side authoritative price resolution.
   */
  async resolveVariantPrice(input: ResolvePriceQueryInput): Promise<ResolvedPriceResult> {
    const variantRecord = await this.repo.getVariantWithProduct(input.variantId);
    if (!variantRecord) {
      throw new NotFoundError(`Product variant '${input.variantId}' not found`);
    }

    const activeRules = await this.repo.getActiveRulesForVariant(variantRecord.id, variantRecord.productId);

    // Map rules to domain format
    const eligibleRules: EligiblePriceListRule[] = activeRules.map((rule) => ({
      id: rule.id,
      priceListId: rule.priceListId,
      pricePoisha: rule.pricePoisha,
      compareAtPricePoisha: rule.compareAtPricePoisha,
      minQuantity: rule.minQuantity,
      maxQuantity: rule.maxQuantity,
      productPointOverride: rule.productPointOverride,
      priceList: {
        id: rule.priceList.id,
        code: rule.priceList.code,
        channel: rule.priceList.channel,
        buyerSegment: rule.priceList.buyerSegment,
        priority: rule.priceList.priority,
        startsAt: rule.priceList.startsAt,
        endsAt: rule.priceList.endsAt,
        status: rule.priceList.status,
        deletedAt: rule.priceList.deletedAt,
      },
    }));

    return resolveEffectivePrice({
      variant: {
        id: variantRecord.id,
        productId: variantRecord.productId,
        sku: variantRecord.sku,
        pricePoisha: variantRecord.pricePoisha,
        compareAtPricePoisha: variantRecord.compareAtPricePoisha,
        costPricePoisha: variantRecord.costPricePoisha,
        minPricePoisha: variantRecord.minPricePoisha,
        minOrderQuantity: variantRecord.minOrderQuantity,
        productPoint: variantRecord.productPoint,
      },
      product: variantRecord.product
        ? {
            id: variantRecord.product.id,
            basePricePoisha: variantRecord.product.basePricePoisha,
            compareAtPricePoisha: variantRecord.product.compareAtPricePoisha,
            costPricePoisha: variantRecord.product.costPricePoisha,
            minPricePoisha: variantRecord.product.minPricePoisha,
            minOrderQuantity: variantRecord.product.minOrderQuantity,
          }
        : null,
      quantity: input.quantity,
      channel: input.channel,
      buyerSegment: input.buyerSegment,
      activeRules: eligibleRules,
    });
  }
}
