/**
 * Authoritative Shipping Rate & Delivery Promise Domain Service
 *
 * Implements:
 * 1. Multi-vendor seller shipment package partitioning
 * 2. Weight-tier & volumetric weight calculation (IATA standard)
 * 3. Shipping class surcharges (FRAGILE, HEAVY, BULK, etc.)
 * 4. Free shipping threshold qualification per merchant
 * 5. Delivery promise timeline calculation in 'Asia/Dhaka' with business calendar
 * 6. Pluggable provider SPI coordination with fallback
 * 7. Admin versioned rule configuration and management
 *
 * Invariant: BDT poisha integer minor units strictly conserved.
 * Invariant: Historical transactions lock rule versions for audit immutability.
 */

import { prisma } from '@/shared/database/prisma';
import { NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { DeliveryZone } from '../types/serviceability.types';
import {
  CalculateShippingRatesInput,
  CalculateShippingPromiseInput,
  CreateShippingRateRuleInput,
  UpdateShippingRateRuleInput,
} from '../validators/shipping-rate.validators';
import {
  OrderShippingQuoteDTO,
  SellerShippingQuoteDTO,
  ShippingItemInput,
  ShippingRateOptionDTO,
  DeliveryPromiseSnapshotDTO,
  ShippingRateRuleDTO,
  ShippingMethodCode,
} from '../types/shipping-rate.types';
import { deliveryServiceabilityService } from './delivery-serviceability.service';
import { calculatePackageWeight, calculateDeliveryPromise } from './shipping-promise-calculator';
import { shippingRateProviderRegistry } from '../providers/shipping-rate-provider.registry';
import { shippingRateRepository } from '../repositories/shipping-rate.repository';

const MAX_STANDARD_COD_LIMIT_POISHA = 5000000; // ৳50,000.00 maximum COD threshold

export class ShippingRateService {
  private db = prisma;
  private registry = shippingRateProviderRegistry;
  private repository = shippingRateRepository;

  /**
   * Calculates authoritative multi-vendor shipping rate quote and delivery promises.
   */
  public async calculateOrderShippingQuote(
    input: CalculateShippingRatesInput
  ): Promise<OrderShippingQuoteDTO> {
    const { address, shippingMethod = 'STANDARD' } = input;

    // 1. Determine Customer Delivery Zone
    const zone = deliveryServiceabilityService.determineDeliveryZone(
      address.division,
      address.district,
      address.upazila
    );

    // 2. Extract or Fetch Items (from Cart or direct input array)
    let items: ShippingItemInput[] = [];

    if (input.cartId) {
      items = await this.fetchCartItems(input.cartId);
    } else if (input.items && input.items.length > 0) {
      items = input.items;
    } else {
      throw new ValidationError('Either cartId or a non-empty items array must be provided.');
    }

    if (items.length === 0) {
      throw new ValidationError('Cannot calculate shipping for zero items.');
    }

    // 3. Multi-Vendor Partitioning: Partition items by seller
    const itemsBySeller = new Map<string, ShippingItemInput[]>();
    for (const item of items) {
      const group = itemsBySeller.get(item.sellerId) || [];
      group.push(item);
      itemsBySeller.set(item.sellerId, group);
    }

    const sellerQuotes: SellerShippingQuoteDTO[] = [];
    let totalOrderShippingFeePoisha = 0;
    let totalOrderFreeShippingSavingsPoisha = 0;
    let totalOrderSubtotalPoisha = 0;
    let allSellersCodAllowed = true;
    let earliestDeliveryDate: string | null = null;
    let latestDeliveryDate: string | null = null;
    let appliedRuleVersion = 'v1.0.0';

    for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
      // Fetch seller profile & operational defaults
      const seller = await (this.db as any).seller.findFirst({
        where: { id: sellerId, deletedAt: null },
        include: {
          settings: true,
          operationalDefaults: true,
        },
      });

      const sellerName = seller?.businessName || 'Verified Merchant';
      const sellerSlug = seller?.slug;
      const sellerHandlingDays = seller?.operationalDefaults?.defaultHandlingDays ?? 1;
      const sellerCutoffTime = seller?.operationalDefaults?.orderCutoffTime || '14:00';

      // Calculate package weight breakdown
      const weightBreakdown = calculatePackageWeight(sellerItems);

      // Calculate seller subtotal in poisha
      const sellerSubtotalPoisha = sellerItems.reduce((sum, item) => {
        const lineTotal =
          typeof item.unitPricePoisha === 'bigint'
            ? Number(item.unitPricePoisha) * item.quantity
            : item.unitPricePoisha * item.quantity;
        return sum + lineTotal;
      }, 0);

      totalOrderSubtotalPoisha += sellerSubtotalPoisha;

      // Invoke Shipping Rate Provider (Platform Rule Engine by default)
      const provider = this.registry.getProvider('PLATFORM');
      const rateOptions = await provider.calculateRates({
        originZone: 'METRO_DHAKA', // Standard platform origin hub
        destinationZone: zone,
        destinationAddress: address,
        packageWeight: weightBreakdown,
        items: sellerItems,
        sellerSubtotalPoisha,
        sellerHandlingDays,
        orderCutoffTime: sellerCutoffTime,
        preferredMethod: shippingMethod as ShippingMethodCode,
      });

      // Select active rate based on requested method or fallback to STANDARD
      let activeRate = rateOptions.find((r) => r.methodCode === shippingMethod);
      if (!activeRate) {
        activeRate = rateOptions.find((r) => r.methodCode === 'STANDARD') || rateOptions[0];
      }

      appliedRuleVersion = activeRate.deliveryPromise.appliedRuleVersion;

      // Free shipping threshold progress
      const standardRate = rateOptions.find((r) => r.methodCode === 'STANDARD') || activeRate;
      const freeThresholdPoisha =
        seller?.operationalDefaults?.shippingMode === 'CUSTOM' ? null : 200000; // ৳2,000.00 standard threshold

      const qualifiesForFreeShipping = activeRate.isFreeShipping;
      const amountNeededForFreeShippingPoisha =
        freeThresholdPoisha && sellerSubtotalPoisha < freeThresholdPoisha
          ? freeThresholdPoisha - sellerSubtotalPoisha
          : 0;

      const groupWarnings: string[] = [];
      if (seller?.settings?.vacationMode) {
        groupWarnings.push(
          `${sellerName} is currently on vacation: ${seller.settings.vacationMessage || 'Orders will be dispatched after return.'}`
        );
      }
      if (weightBreakdown.isOverweight) {
        groupWarnings.push(
          `Heavy parcel (${(weightBreakdown.chargeableWeightGrams / 1000).toFixed(1)}kg): Heavy freight handling fee applied.`
        );
      }
      if (weightBreakdown.isVolumetricDominant) {
        groupWarnings.push(
          `Volumetric weight exceeds physical weight (${(weightBreakdown.volumetricWeightGrams / 1000).toFixed(1)}kg dimensional vs ${(weightBreakdown.actualWeightGrams / 1000).toFixed(1)}kg actual).`
        );
      }

      if (!activeRate.isCodAvailable) {
        allSellersCodAllowed = false;
      }

      totalOrderShippingFeePoisha += activeRate.finalRatePoisha;
      totalOrderFreeShippingSavingsPoisha += activeRate.freeShippingDiscountPoisha;

      // Track earliest and latest delivery dates
      const promiseMinDate = activeRate.deliveryPromise.minEstimatedDate;
      const promiseMaxDate = activeRate.deliveryPromise.maxEstimatedDate;

      if (!earliestDeliveryDate || promiseMinDate < earliestDeliveryDate) {
        earliestDeliveryDate = promiseMinDate;
      }
      if (!latestDeliveryDate || promiseMaxDate > latestDeliveryDate) {
        latestDeliveryDate = promiseMaxDate;
      }

      sellerQuotes.push({
        sellerId,
        sellerName,
        sellerSlug,
        originZone: 'METRO_DHAKA',
        destinationZone: zone,
        totalItems: sellerItems.reduce((sum, i) => sum + i.quantity, 0),
        weightBreakdown,
        subtotalPoisha: sellerSubtotalPoisha,
        subtotalBdtFormatted: this.formatBdt(sellerSubtotalPoisha),
        freeShippingThresholdPoisha: freeThresholdPoisha,
        freeShippingThresholdBdtFormatted: freeThresholdPoisha
          ? this.formatBdt(freeThresholdPoisha)
          : null,
        qualifiesForFreeShipping,
        amountNeededForFreeShippingPoisha,
        amountNeededForFreeShippingBdtFormatted:
          amountNeededForFreeShippingPoisha > 0
            ? this.formatBdt(amountNeededForFreeShippingPoisha)
            : null,
        selectedMethod: activeRate.methodCode,
        availableMethods: rateOptions,
        activeRate,
        warnings: groupWarnings,
      });
    }

    // High value COD threshold check
    let requiresPrepayment = false;
    if (totalOrderSubtotalPoisha > MAX_STANDARD_COD_LIMIT_POISHA) {
      allSellersCodAllowed = false;
      requiresPrepayment = true;
    }

    const firstQuote = sellerQuotes[0];
    const overallPromiseTextEn =
      sellerQuotes.length === 1
        ? firstQuote.activeRate.deliveryPromise.promiseTextEn
        : `Multi-Package Delivery (${sellerQuotes.length} shipments): Expected between ${new Date(earliestDeliveryDate || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} and ${new Date(latestDeliveryDate || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

    const overallPromiseTextBn =
      sellerQuotes.length === 1
        ? firstQuote.activeRate.deliveryPromise.promiseTextBn
        : `মাল্টি-প্যাকেজ ডেলিভারি (${sellerQuotes.length}টি পার্সেল): সম্ভাব্য ডেলিভারি ${new Date(earliestDeliveryDate || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(latestDeliveryDate || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

    return {
      destinationAddress: {
        divisionCode: address.division.toUpperCase(),
        district: address.district,
        upazila: address.upazila || null,
        postalCode: address.postalCode || null,
        streetAddress: address.streetAddress || null,
      },
      zone,
      sellerQuotes,
      totalShippingFeePoisha: totalOrderShippingFeePoisha,
      totalShippingFeeBdtFormatted: this.formatBdt(totalOrderShippingFeePoisha),
      totalFreeShippingSavingsPoisha: totalOrderFreeShippingSavingsPoisha,
      totalFreeShippingSavingsBdtFormatted: this.formatBdt(totalOrderFreeShippingSavingsPoisha),
      overallDeliveryPromise: {
        earliestDeliveryDate: earliestDeliveryDate || new Date().toISOString(),
        latestDeliveryDate: latestDeliveryDate || new Date().toISOString(),
        promiseTextEn: overallPromiseTextEn,
        promiseTextBn: overallPromiseTextBn,
      },
      allSellersCodAllowed,
      maxCodLimitPoisha: MAX_STANDARD_COD_LIMIT_POISHA,
      requiresPrepayment,
      appliedRuleVersion,
      quotedAt: new Date().toISOString(),
    };
  }

  /**
   * Fast calculation of delivery promise timeline.
   */
  public async calculateDeliveryPromise(
    input: CalculateShippingPromiseInput
  ): Promise<DeliveryPromiseSnapshotDTO> {
    const zone = deliveryServiceabilityService.determineDeliveryZone(
      input.destinationDivision,
      input.destinationDistrict,
      input.destinationUpazila
    );

    let handlingDays = 1;
    let cutoffTime = '14:00';

    if (input.sellerId) {
      const seller = await (this.db as any).seller.findFirst({
        where: { id: input.sellerId, deletedAt: null },
        include: { operationalDefaults: true },
      });
      if (seller?.operationalDefaults) {
        handlingDays = seller.operationalDefaults.defaultHandlingDays ?? 1;
        if (seller.operationalDefaults.orderCutoffTime) {
          cutoffTime = seller.operationalDefaults.orderCutoffTime;
        }
      }
    }

    let transitDaysMin = 2;
    let transitDaysMax = 4;

    if (zone === 'METRO_DHAKA') {
      transitDaysMin = 1;
      transitDaysMax = 2;
    } else if (zone === 'DHAKA_SUBURBS') {
      transitDaysMin = 1;
      transitDaysMax = 3;
    } else if (zone === 'MAJOR_CITIES') {
      transitDaysMin = 2;
      transitDaysMax = 3;
    } else {
      transitDaysMin = 3;
      transitDaysMax = 5;
    }

    if (input.shippingMethod === 'EXPRESS') {
      transitDaysMin = Math.max(0, transitDaysMin - 1);
      transitDaysMax = Math.max(1, transitDaysMax - 1);
    } else if (input.shippingMethod === 'SAME_DAY') {
      transitDaysMin = 0;
      transitDaysMax = 0;
      handlingDays = 0;
    }

    return calculateDeliveryPromise({
      asOfDate: input.asOfDate ? new Date(input.asOfDate) : new Date(),
      handlingDays,
      transitDaysMin,
      transitDaysMax,
      orderCutoffTime: cutoffTime,
      ruleVersion: 'v1.0.0',
      isGuaranteed: input.shippingMethod === 'EXPRESS' || input.shippingMethod === 'SAME_DAY',
    });
  }

  /**
   * Fetches cart items and maps them into ShippingItemInput DTOs.
   */
  private async fetchCartItems(cartId: string): Promise<ShippingItemInput[]> {
    const cart = await (this.db as any).cart.findFirst({
      where: { id: cartId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundError(`Shopping cart '${cartId}' not found.`);
    }

    return cart.items.map((item: any) => ({
      variantId: item.variantId,
      productTitle: item.variant?.product?.title || 'Unknown Product',
      quantity: item.quantity,
      weightGrams: item.variant?.weightGrams ?? item.variant?.product?.weightGrams ?? 250,
      lengthMm: item.variant?.product?.lengthMm ?? null,
      widthMm: item.variant?.product?.widthMm ?? null,
      heightMm: item.variant?.product?.heightMm ?? null,
      shippingClass: item.variant?.product?.shippingClass ?? 'STANDARD',
      requiresShipping: item.variant?.product?.requiresShipping ?? true,
      unitPricePoisha: BigInt(item.pricePoisha || item.variant?.pricePoisha || 0),
      sellerId: item.sellerId,
    }));
  }

  // --- Admin Rule Management Methods ---

  public async listRules(params: {
    sellerId?: string | null;
    status?: string;
    shippingMethod?: string;
    page?: number;
    limit?: number;
  }): Promise<{ rules: ShippingRateRuleDTO[]; total: number; page: number; limit: number }> {
    return this.repository.listRules(params);
  }

  public async getRuleById(id: string): Promise<ShippingRateRuleDTO> {
    const rule = await this.repository.findById(id);
    if (!rule) {
      throw new NotFoundError(`Shipping rate rule '${id}' not found.`);
    }
    return (this.repository as any).mapToDTO(rule);
  }

  public async createRule(
    input: CreateShippingRateRuleInput,
    actorId?: string
  ): Promise<ShippingRateRuleDTO> {
    const existing = await this.repository.findByCode(input.code);
    if (existing) {
      throw new ValidationError(`Shipping rate rule with code '${input.code}' already exists.`);
    }
    return this.repository.createRule(input, actorId);
  }

  public async updateRule(
    id: string,
    input: UpdateShippingRateRuleInput,
    actorId?: string
  ): Promise<ShippingRateRuleDTO> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Shipping rate rule '${id}' not found.`);
    }
    return this.repository.updateRule(id, input, actorId);
  }

  public async deleteRule(id: string, actorId?: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Shipping rate rule '${id}' not found.`);
    }
    await this.repository.softDelete(id, actorId);
  }

  private formatBdt(poisha: bigint | number): string {
    const num = typeof poisha === 'bigint' ? Number(poisha) : poisha;
    const bdt = (num / 100).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `৳${bdt}`;
  }
}

export const shippingRateService = new ShippingRateService();
