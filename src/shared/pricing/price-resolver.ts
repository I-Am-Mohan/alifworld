import { Prisma } from '@prisma/client';

export interface VariantPricingSnapshot {
  id: string;
  productId: string;
  sku: string;
  pricePoisha: bigint;
  compareAtPricePoisha?: bigint | null;
  costPricePoisha?: bigint | null;
  minPricePoisha?: bigint | null;
  minOrderQuantity?: number | null;
  productPoint?: number | null;
}

export interface ProductPricingSnapshot {
  id: string;
  basePricePoisha: bigint;
  compareAtPricePoisha?: bigint | null;
  costPricePoisha?: bigint | null;
  minPricePoisha?: bigint | null;
  minOrderQuantity: number;
}

export interface EligiblePriceListRule {
  id: string;
  priceListId: string;
  pricePoisha: bigint;
  compareAtPricePoisha?: bigint | null;
  minQuantity: number;
  maxQuantity?: number | null;
  productPointOverride?: number | null;
  priceList: {
    id: string;
    code: string;
    channel: string;
    buyerSegment?: string | null;
    priority: number;
    startsAt?: Date | null;
    endsAt?: Date | null;
    status: string;
    deletedAt?: Date | null;
  };
}

export interface ResolvePriceInput {
  variant: VariantPricingSnapshot;
  product?: ProductPricingSnapshot | null;
  quantity: number;
  channel?: 'RETAIL' | 'B2B' | 'CAMPAIGN' | 'NEGOTIATED' | string;
  buyerSegment?: string | null;
  activeRules?: EligiblePriceListRule[];
  now?: Date;
}

export interface ResolvedPriceResult {
  unitPricePoisha: bigint;
  compareAtPricePoisha: bigint | null;
  costPricePoisha: bigint | null;
  minPricePoisha: bigint | null;
  totalPoisha: bigint;
  minOrderQuantity: number;
  appliedPriceListId: string | null;
  appliedPriceListCode: string | null;
  channel: string;
  buyerSegment: string | null;
  isMapClamped: boolean;
  productPoint: number;
}

export class MOQViolationError extends Error {
  public readonly minOrderQuantity: number;
  public readonly requestedQuantity: number;

  constructor(minOrderQuantity: number, requestedQuantity: number) {
    super(`Requested quantity (${requestedQuantity}) is below minimum order quantity (${minOrderQuantity})`);
    this.name = 'MOQViolationError';
    this.minOrderQuantity = minOrderQuantity;
    this.requestedQuantity = requestedQuantity;
  }
}

/**
 * Server-side authoritative price resolution engine.
 *
 * Rules:
 * 1. MOQ Check: requested quantity must be >= variant/product minimum order quantity.
 * 2. Channel & Tier Selection: Select active matching rule with highest priority & matching volume tier.
 * 3. MAP Protection: Effective price cannot be below minPricePoisha. Clamps to minPricePoisha if violated.
 * 4. Pure integer poisha calculations with 0 floating point errors.
 */
export function resolveEffectivePrice(input: ResolvePriceInput): ResolvedPriceResult {
  const { variant, product, quantity, buyerSegment = null, activeRules = [], now = new Date() } = input;
  const channel = input.channel || 'RETAIL';

  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  // 1. Determine MOQ
  const minOrderQuantity = variant.minOrderQuantity ?? product?.minOrderQuantity ?? 1;
  if (quantity < minOrderQuantity) {
    throw new MOQViolationError(minOrderQuantity, quantity);
  }

  // 2. Filter & Sort Eligible Price List Rules
  const eligibleRules = activeRules.filter((rule) => {
    if (rule.priceList.status !== 'ACTIVE' || rule.priceList.deletedAt) {
      return false;
    }

    // Date range check
    if (rule.priceList.startsAt && now < new Date(rule.priceList.startsAt)) {
      return false;
    }
    if (rule.priceList.endsAt && now > new Date(rule.priceList.endsAt)) {
      return false;
    }

    // Channel check
    if (rule.priceList.channel !== channel) {
      return false;
    }

    // Buyer segment check (null in rule means available to all segments)
    if (rule.priceList.buyerSegment && rule.priceList.buyerSegment !== buyerSegment) {
      return false;
    }

    // Volume break check
    if (quantity < rule.minQuantity) {
      return false;
    }
    if (rule.maxQuantity !== null && rule.maxQuantity !== undefined && quantity > rule.maxQuantity) {
      return false;
    }

    return true;
  });

  // Sort by priority DESC, then minQuantity DESC (most specific volume break wins)
  eligibleRules.sort((a, b) => {
    if (b.priceList.priority !== a.priceList.priority) {
      return b.priceList.priority - a.priceList.priority;
    }
    return b.minQuantity - a.minQuantity;
  });

  const bestRule = eligibleRules[0];

  let rawUnitPricePoisha: bigint;
  let compareAtPricePoisha: bigint | null;
  let appliedPriceListId: string | null = null;
  let appliedPriceListCode: string | null = null;
  let productPoint = variant.productPoint ?? 0;

  if (bestRule) {
    rawUnitPricePoisha = bestRule.pricePoisha;
    compareAtPricePoisha = bestRule.compareAtPricePoisha ?? variant.compareAtPricePoisha ?? product?.compareAtPricePoisha ?? null;
    appliedPriceListId = bestRule.priceList.id;
    appliedPriceListCode = bestRule.priceList.code;
    if (bestRule.productPointOverride !== null && bestRule.productPointOverride !== undefined) {
      productPoint = bestRule.productPointOverride;
    }
  } else {
    rawUnitPricePoisha = variant.pricePoisha;
    compareAtPricePoisha = variant.compareAtPricePoisha ?? product?.compareAtPricePoisha ?? null;
  }

  // 3. MAP Protection (Minimum Advertised Price Floor)
  const minPricePoisha = variant.minPricePoisha ?? product?.minPricePoisha ?? null;
  let unitPricePoisha = rawUnitPricePoisha;
  let isMapClamped = false;

  if (minPricePoisha !== null && unitPricePoisha < minPricePoisha) {
    unitPricePoisha = minPricePoisha;
    isMapClamped = true;
  }

  const costPricePoisha = variant.costPricePoisha ?? product?.costPricePoisha ?? null;
  const totalPoisha = unitPricePoisha * BigInt(quantity);

  return {
    unitPricePoisha,
    compareAtPricePoisha,
    costPricePoisha,
    minPricePoisha,
    totalPoisha,
    minOrderQuantity,
    appliedPriceListId,
    appliedPriceListCode,
    channel,
    buyerSegment,
    isMapClamped,
    productPoint,
  };
}
