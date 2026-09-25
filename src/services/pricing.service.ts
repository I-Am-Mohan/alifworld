import { PrismaClient, Prisma } from '@prisma/client';
import { PriceListRepository } from '../repositories/price-list.repository';
import { DiscountRuleRepository } from '../repositories/discount-rule.repository';
import { TaxService } from '../features/catalog/services/tax-service';
import { PricingPolicy } from '../shared/authz/policies/pricing.policy';
import { ActorContext } from '../shared/authz/authz.types';
import {
  CreatePriceListInput,
  UpdatePriceListInput,
  CreatePriceListRuleInput,
  ResolvePriceQueryInput,
  CalculateQuoteInput,
  CalculateQuoteRawInput,
  CalculateQuoteSchema,
} from '../validators/pricing.validator';
import {
  resolveEffectivePrice,
  ResolvedPriceResult,
  MOQViolationError,
  EligiblePriceListRule,
} from '../shared/pricing/price-resolver';
import {
  resolveStackedPromotions,
  StackingRuleDescriptor,
} from '../shared/pricing/promotion-stacking-engine';
import { calculatePromotionAttribution } from '../shared/pricing/promotion-funding-calculator';

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

export interface AuthoritativeLineItemQuote {
  lineItemId: string;
  variantId: string;
  productId: string;
  sku: string;
  title: string;
  sellerId: string;
  quantity: number;
  unitPricePoisha: bigint;
  compareAtPricePoisha: bigint | null;
  costPricePoisha: bigint | null;
  minPricePoisha: bigint | null;
  baseTotalPoisha: bigint;
  appliedPriceListId: string | null;
  appliedPriceListCode: string | null;
  isMapClamped: boolean;
  productPointUnit: number;
  totalProductPoints: number;
  discountPoisha: bigint;
  sellerFundedDiscountPoisha: bigint;
  platformFundedDiscountPoisha: bigint;
  netAmountPoisha: bigint;
  taxRatePercent: number;
  taxAmountPoisha: bigint;
  grossAmountPoisha: bigint;
}

export interface AuthoritativeQuoteTotals {
  currency: 'BDT';
  channel: string;
  buyerSegment: string | null;
  subtotalBasePoisha: bigint;
  totalDiscountPoisha: bigint;
  sellerFundedTotalDiscountPoisha: bigint;
  platformFundedTotalDiscountPoisha: bigint;
  netSubtotalPoisha: bigint;
  totalTaxPoisha: bigint;
  shippingFeePoisha: bigint;
  shippingDiscountPoisha: bigint;
  grandTotalPoisha: bigint;
  totalProductPoints: number;
}

export interface AppliedPromotionQuoteDetail {
  ruleId: string;
  code: string | null;
  title: string;
  discountType: string;
  discountAmountPoisha: bigint;
  sellerSharePoisha: bigint;
  platformSharePoisha: bigint;
  fundingType: string;
}

export interface ExcludedPromotionQuoteDetail {
  ruleId: string;
  code: string | null;
  title: string;
  exclusionReason: string;
}

export interface AuthoritativeQuoteResult {
  currency: 'BDT';
  channel: string;
  buyerSegment: string | null;
  lineItems: AuthoritativeLineItemQuote[];
  totals: AuthoritativeQuoteTotals;
  promotions: {
    applied: AppliedPromotionQuoteDetail[];
    excluded: ExcludedPromotionQuoteDetail[];
  };
  calculationSnapshot: {
    currency: 'BDT';
    calculatedAt: string;
    channel: string;
    buyerSegment: string | null;
    lineItems: Array<{
      variantId: string;
      productId: string;
      sellerId: string;
      quantity: number;
      unitPricePoisha: string;
      baseTotalPoisha: string;
      discountPoisha: string;
      netAmountPoisha: string;
      taxAmountPoisha: string;
      grossAmountPoisha: string;
      productPointUnit: number;
      totalProductPoints: number;
    }>;
    totals: {
      subtotalBasePoisha: string;
      totalDiscountPoisha: string;
      sellerFundedTotalDiscountPoisha: string;
      platformFundedTotalDiscountPoisha: string;
      netSubtotalPoisha: string;
      totalTaxPoisha: string;
      shippingFeePoisha: string;
      shippingDiscountPoisha: string;
      grandTotalPoisha: string;
      totalProductPoints: number;
    };
    promotions: Array<{
      ruleId: string;
      code: string | null;
      discountAmountPoisha: string;
      sellerSharePoisha: string;
      platformSharePoisha: string;
    }>;
    taxJurisdiction: 'BD';
  };
}

export class PricingService {
  private readonly repo: PriceListRepository;
  private readonly discountRuleRepo: DiscountRuleRepository;
  private readonly taxService: TaxService;

  constructor(prisma: PrismaClient) {
    this.repo = new PriceListRepository(prisma);
    this.discountRuleRepo = new DiscountRuleRepository(prisma);
    this.taxService = new TaxService();
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

  /**
   * Calculates an authoritative server-side pricing quote for cart or checkout line items.
   * Integrates price resolution, discount rules, promotions stacking, tax calculations, and Product Point snapshots.
   */
  async calculateQuote(rawInput: CalculateQuoteRawInput): Promise<AuthoritativeQuoteResult> {
    const input = CalculateQuoteSchema.parse(rawInput);
    const now = new Date();
    const channel = input.channel || 'RETAIL';
    const buyerSegment = input.buyerSegment || null;
    const shippingFeePoisha = input.shippingFeePoisha || 0n;

    // 1. Resolve unit pricing & product points for each line item
    const resolvedItems: Array<{
      lineItemId: string;
      variantRecord: any;
      resolvedPrice: ResolvedPriceResult;
      sellerId: string;
      categoryId: string | null;
      brandId: string | null;
      quantity: number;
    }> = [];

    for (let i = 0; i < input.lineItems.length; i++) {
      const item = input.lineItems[i];
      const variantRecord = await this.repo.getVariantWithProduct(item.variantId);
      if (!variantRecord) {
        throw new NotFoundError(`Product variant with ID '${item.variantId}' not found`);
      }

      const activeRules = await this.repo.getActiveRulesForVariant(variantRecord.id, variantRecord.productId);
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

      const resolvedPrice = resolveEffectivePrice({
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
        quantity: item.quantity,
        channel,
        buyerSegment,
        activeRules: eligibleRules,
        now,
      });

      const sellerId = item.sellerId || variantRecord.product?.sellerId || '';
      const categoryId = variantRecord.product?.categoryId || null;
      const brandId = variantRecord.product?.brandId || null;

      resolvedItems.push({
        lineItemId: `line_${i + 1}_${variantRecord.id.slice(0, 8)}`,
        variantRecord,
        resolvedPrice,
        sellerId,
        categoryId,
        brandId,
        quantity: item.quantity,
      });
    }

    // 2. Fetch automatic discount rules and optional coupon code rule
    const autoRules = await this.discountRuleRepo.getActiveAutomaticRules(now);
    const candidateRuleMap = new Map<string, StackingRuleDescriptor>();

    autoRules.forEach((rule) => {
      candidateRuleMap.set(rule.id, {
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
        targets: rule.targets.map((t) => ({ targetType: t.targetType, targetId: t.targetId })),
        isStackable: (rule as any).isStackable ?? true,
        exclusionScope: (rule as any).exclusionScope ?? 'STACKABLE',
      });
    });

    if (input.couponCode) {
      const couponRule = await this.discountRuleRepo.getDiscountRuleByCode(input.couponCode);
      if (couponRule && couponRule.status === 'ACTIVE' && !couponRule.deletedAt) {
        candidateRuleMap.set(couponRule.id, {
          id: couponRule.id,
          code: couponRule.code,
          title: couponRule.title,
          discountType: couponRule.discountType,
          targetScope: couponRule.targetScope,
          discountValue: couponRule.discountValue,
          maxDiscountPoisha: couponRule.maxDiscountPoisha,
          minOrderSubtotalPoisha: couponRule.minOrderSubtotalPoisha,
          minQuantity: couponRule.minQuantity,
          buyQuantity: couponRule.buyQuantity,
          getQuantity: couponRule.getQuantity,
          getDiscountPercent: couponRule.getDiscountPercent,
          isAutomatic: couponRule.isAutomatic,
          fundingType: couponRule.fundingType,
          sellerSharePercent: couponRule.sellerSharePercent,
          platformSharePercent: couponRule.platformSharePercent,
          sellerId: couponRule.sellerId,
          buyerSegment: couponRule.buyerSegment,
          priority: couponRule.priority,
          startsAt: couponRule.startsAt,
          endsAt: couponRule.endsAt,
          usageLimit: couponRule.usageLimit,
          usageCount: couponRule.usageCount,
          status: couponRule.status,
          deletedAt: couponRule.deletedAt,
          targets: (couponRule.targets || []).map((t) => ({ targetType: t.targetType, targetId: t.targetId })),
          isStackable: (couponRule as any).isStackable ?? true,
          exclusionScope: (couponRule as any).exclusionScope ?? 'STACKABLE',
        });
      }
    }

    // 3. Resolve stacked promotions
    const cartLineItems = resolvedItems.map((item) => ({
      lineItemId: item.lineItemId,
      productId: item.variantRecord.productId,
      variantId: item.variantRecord.id,
      categoryId: item.categoryId,
      brandId: item.brandId,
      sellerId: item.sellerId,
      unitPricePoisha: item.resolvedPrice.unitPricePoisha,
      quantity: item.quantity,
    }));

    const stackedPromotionsResult = resolveStackedPromotions(
      Array.from(candidateRuleMap.values()),
      {
        lineItems: cartLineItems,
        shippingFeePoisha,
        buyerSegment,
        couponCode: input.couponCode || null,
        now,
      }
    );

    // Map promotions details
    const appliedPromotions: AppliedPromotionQuoteDetail[] = stackedPromotionsResult.appliedPromotions.map((p) => ({
      ruleId: p.ruleId,
      code: p.code,
      title: p.title,
      discountType: p.discountType,
      discountAmountPoisha: p.discountAmountPoisha,
      sellerSharePoisha: p.attribution.sellerSharePoisha,
      platformSharePoisha: p.attribution.platformSharePoisha,
      fundingType: p.attribution.fundingType,
    }));

    const excludedPromotions: ExcludedPromotionQuoteDetail[] = stackedPromotionsResult.excludedPromotions.map((e) => ({
      ruleId: e.ruleId,
      code: e.code,
      title: e.title,
      exclusionReason: e.exclusionReason,
    }));

    // Build line item discount map (lineItemId -> { discountPoisha, sellerSharePoisha, platformSharePoisha })
    const lineDiscountMap = new Map<string, { total: bigint; sellerShare: bigint; platformShare: bigint }>();
    resolvedItems.forEach((ri) => {
      lineDiscountMap.set(ri.lineItemId, { total: 0n, sellerShare: 0n, platformShare: 0n });
    });

    let shippingDiscountPoisha = 0n;

    stackedPromotionsResult.appliedPromotions.forEach((p) => {
      if (p.discountType === 'FREE_SHIPPING' || p.targetScope === 'SHIPPING_FEE') {
        shippingDiscountPoisha += p.discountAmountPoisha;
      }
      p.lineAllocations.forEach((alloc) => {
        const current = lineDiscountMap.get(alloc.lineItemId) || { total: 0n, sellerShare: 0n, platformShare: 0n };
        const allocAttr = calculatePromotionAttribution(alloc.discountPoisha, {
          fundingType: p.attribution.fundingType as any,
          sellerSharePercent: p.attribution.sellerSharePercent,
          platformSharePercent: p.attribution.platformSharePercent,
        });

        lineDiscountMap.set(alloc.lineItemId, {
          total: current.total + alloc.discountPoisha,
          sellerShare: current.sellerShare + allocAttr.sellerSharePoisha,
          platformShare: current.platformShare + allocAttr.platformSharePoisha,
        });
      });
    });

    // 4. Calculate Tax/VAT and Line Item Quotes
    const lineItemsQuote: AuthoritativeLineItemQuote[] = [];
    let subtotalBasePoisha = 0n;
    let totalDiscountPoisha = 0n;
    let sellerFundedTotalDiscountPoisha = 0n;
    let platformFundedTotalDiscountPoisha = 0n;
    let totalTaxPoisha = 0n;
    let totalProductPoints = 0;

    for (const ri of resolvedItems) {
      const lineDisc = lineDiscountMap.get(ri.lineItemId) || { total: 0n, sellerShare: 0n, platformShare: 0n };
      const baseTotalPoisha = ri.resolvedPrice.totalPoisha;
      const netAmountPoisha = baseTotalPoisha > lineDisc.total ? baseTotalPoisha - lineDisc.total : 0n;

      const taxRatePercent = await this.taxService.resolvePersistedTaxRatePercent({
        categoryId: ri.categoryId,
        date: now,
      });

      const taxBreakdown = this.taxService.calculateTaxForLineItem({
        lineItemId: ri.lineItemId,
        title: ri.variantRecord.sku || ri.variantRecord.id,
        netPricePoisha: netAmountPoisha,
        quantity: 1, // netAmountPoisha is already total for line
        taxRatePercent,
        priceIncludesTax: input.priceIncludesTax,
      });

      const linePoints = ri.resolvedPrice.productPoint * ri.quantity;

      subtotalBasePoisha += baseTotalPoisha;
      totalDiscountPoisha += lineDisc.total;
      sellerFundedTotalDiscountPoisha += lineDisc.sellerShare;
      platformFundedTotalDiscountPoisha += lineDisc.platformShare;
      totalTaxPoisha += taxBreakdown.taxAmountPoisha;
      totalProductPoints += linePoints;

      lineItemsQuote.push({
        lineItemId: ri.lineItemId,
        variantId: ri.variantRecord.id,
        productId: ri.variantRecord.productId,
        sku: ri.variantRecord.sku,
        title: ri.variantRecord.product?.title || ri.variantRecord.sku,
        sellerId: ri.sellerId,
        quantity: ri.quantity,
        unitPricePoisha: ri.resolvedPrice.unitPricePoisha,
        compareAtPricePoisha: ri.resolvedPrice.compareAtPricePoisha,
        costPricePoisha: ri.resolvedPrice.costPricePoisha,
        minPricePoisha: ri.resolvedPrice.minPricePoisha,
        baseTotalPoisha,
        appliedPriceListId: ri.resolvedPrice.appliedPriceListId,
        appliedPriceListCode: ri.resolvedPrice.appliedPriceListCode,
        isMapClamped: ri.resolvedPrice.isMapClamped,
        productPointUnit: ri.resolvedPrice.productPoint,
        totalProductPoints: linePoints,
        discountPoisha: lineDisc.total,
        sellerFundedDiscountPoisha: lineDisc.sellerShare,
        platformFundedDiscountPoisha: lineDisc.platformShare,
        netAmountPoisha,
        taxRatePercent,
        taxAmountPoisha: taxBreakdown.taxAmountPoisha,
        grossAmountPoisha: taxBreakdown.grossPricePoisha,
      });
    }

    const netSubtotalPoisha = subtotalBasePoisha - totalDiscountPoisha;
    const effectiveShippingFee = shippingFeePoisha > shippingDiscountPoisha ? shippingFeePoisha - shippingDiscountPoisha : 0n;
    const grandTotalPoisha = netSubtotalPoisha + totalTaxPoisha + effectiveShippingFee;

    const totals: AuthoritativeQuoteTotals = {
      currency: 'BDT',
      channel,
      buyerSegment,
      subtotalBasePoisha,
      totalDiscountPoisha,
      sellerFundedTotalDiscountPoisha,
      platformFundedTotalDiscountPoisha,
      netSubtotalPoisha,
      totalTaxPoisha,
      shippingFeePoisha,
      shippingDiscountPoisha,
      grandTotalPoisha,
      totalProductPoints,
    };

    const calculationSnapshot = {
      currency: 'BDT' as const,
      calculatedAt: now.toISOString(),
      channel,
      buyerSegment,
      lineItems: lineItemsQuote.map((li) => ({
        variantId: li.variantId,
        productId: li.productId,
        sellerId: li.sellerId,
        quantity: li.quantity,
        unitPricePoisha: li.unitPricePoisha.toString(),
        baseTotalPoisha: li.baseTotalPoisha.toString(),
        discountPoisha: li.discountPoisha.toString(),
        netAmountPoisha: li.netAmountPoisha.toString(),
        taxAmountPoisha: li.taxAmountPoisha.toString(),
        grossAmountPoisha: li.grossAmountPoisha.toString(),
        productPointUnit: li.productPointUnit,
        totalProductPoints: li.totalProductPoints,
      })),
      totals: {
        subtotalBasePoisha: subtotalBasePoisha.toString(),
        totalDiscountPoisha: totalDiscountPoisha.toString(),
        sellerFundedTotalDiscountPoisha: sellerFundedTotalDiscountPoisha.toString(),
        platformFundedTotalDiscountPoisha: platformFundedTotalDiscountPoisha.toString(),
        netSubtotalPoisha: netSubtotalPoisha.toString(),
        totalTaxPoisha: totalTaxPoisha.toString(),
        shippingFeePoisha: shippingFeePoisha.toString(),
        shippingDiscountPoisha: shippingDiscountPoisha.toString(),
        grandTotalPoisha: grandTotalPoisha.toString(),
        totalProductPoints,
      },
      promotions: appliedPromotions.map((ap) => ({
        ruleId: ap.ruleId,
        code: ap.code,
        discountAmountPoisha: ap.discountAmountPoisha.toString(),
        sellerSharePoisha: ap.sellerSharePoisha.toString(),
        platformSharePoisha: ap.platformSharePoisha.toString(),
      })),
      taxJurisdiction: 'BD' as const,
    };

    return {
      currency: 'BDT',
      channel,
      buyerSegment,
      lineItems: lineItemsQuote,
      totals,
      promotions: {
        applied: appliedPromotions,
        excluded: excludedPromotions,
      },
      calculationSnapshot,
    };
  }
}

