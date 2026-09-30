/**
 * Rule-Based Shipping Rate & Promise Provider
 *
 * Authoritative platform logistics calculation provider.
 * Implements zone-based rate evaluation, weight-tier surcharges, shipping class rules,
 * seller-specific overrides, and Asia/Dhaka delivery promise windows.
 */

import {
  IShippingRateProvider,
  ProviderRateRequest,
  ShippingRateOptionDTO,
  DeliveryPromiseSnapshotDTO,
  ShippingMethodCode,
} from '../types/shipping-rate.types';
import { DeliveryZone } from '../types/serviceability.types';
import { shippingRateRepository } from '../repositories/shipping-rate.repository';
import {
  calculateDeliveryPromise,
  calculatePackageWeight,
} from '../services/shipping-promise-calculator';

interface BuiltInZoneConfig {
  baseRatePoisha: number;
  baseWeightGrams: number;
  incrementalWeightGrams: number;
  incrementalRatePoisha: number;
  freeShippingThresholdPoisha: number;
  handlingDays: number;
  transitDaysMin: number;
  transitDaysMax: number;
  defaultCourier: string;
}

const BUILT_IN_ZONE_DEFAULTS: Record<DeliveryZone, BuiltInZoneConfig> = {
  METRO_DHAKA: {
    baseRatePoisha: 6000, // ৳60.00
    baseWeightGrams: 1000,
    incrementalWeightGrams: 1000,
    incrementalRatePoisha: 2000, // ৳20.00 / kg
    freeShippingThresholdPoisha: 200000, // ৳2,000.00
    handlingDays: 1,
    transitDaysMin: 1,
    transitDaysMax: 2,
    defaultCourier: 'IN_HOUSE',
  },
  DHAKA_SUBURBS: {
    baseRatePoisha: 10000, // ৳100.00
    baseWeightGrams: 1000,
    incrementalWeightGrams: 1000,
    incrementalRatePoisha: 2500, // ৳25.00 / kg
    freeShippingThresholdPoisha: 200000, // ৳2,000.00
    handlingDays: 1,
    transitDaysMin: 1,
    transitDaysMax: 3,
    defaultCourier: 'PATHAO',
  },
  MAJOR_CITIES: {
    baseRatePoisha: 12000, // ৳120.00
    baseWeightGrams: 1000,
    incrementalWeightGrams: 1000,
    incrementalRatePoisha: 3000, // ৳30.00 / kg
    freeShippingThresholdPoisha: 200000, // ৳2,000.00
    handlingDays: 1,
    transitDaysMin: 2,
    transitDaysMax: 3,
    defaultCourier: 'STEADFAST',
  },
  REMOTE_UPAZILA: {
    baseRatePoisha: 15000, // ৳150.00
    baseWeightGrams: 1000,
    incrementalWeightGrams: 1000,
    incrementalRatePoisha: 3500, // ৳35.00 / kg
    freeShippingThresholdPoisha: 250000, // ৳2,500.00
    handlingDays: 2,
    transitDaysMin: 3,
    transitDaysMax: 5,
    defaultCourier: 'STEADFAST',
  },
};

export class RuleBasedShippingRateProvider implements IShippingRateProvider {
  public readonly providerCode = 'PLATFORM';
  public readonly providerName = 'AlifWorld Platform Logistics Engine';
  public readonly isEnabled = true;

  /**
   * Evaluates address serviceability under standard platform logistics.
   */
  public async isServiceable(): Promise<boolean> {
    return true; // Nationwide delivery supported across all 64 districts
  }

  /**
   * Calculates rate options and delivery promises for a seller shipment package.
   */
  public async calculateRates(request: ProviderRateRequest): Promise<ShippingRateOptionDTO[]> {
    const {
      destinationZone,
      packageWeight,
      items,
      sellerSubtotalPoisha,
      sellerHandlingDays,
      orderCutoffTime,
      asOfDate,
    } = request;

    // Check if entire package is digital/non-physical
    const physicalItems = items.filter(
      (item) => item.requiresShipping !== false && item.shippingClass !== 'DIGITAL'
    );

    if (physicalItems.length === 0) {
      // Free instant digital fulfillment
      const digitalPromise: DeliveryPromiseSnapshotDTO = {
        minEstimatedDate: (asOfDate || new Date()).toISOString(),
        maxEstimatedDate: (asOfDate || new Date()).toISOString(),
        minEstimatedFormattedEn: 'Instant',
        maxEstimatedFormattedEn: 'Instant',
        minEstimatedFormattedBn: 'তাৎক্ষণিক',
        maxEstimatedFormattedBn: 'তাৎক্ষণিক',
        promiseTextEn: 'Instant Digital Delivery',
        promiseTextBn: 'তাৎক্ষণিক ডিজিটাল ডেলিভারি',
        handlingDays: 0,
        transitDaysMin: 0,
        transitDaysMax: 0,
        orderCutoffTime: '23:59',
        cutoffRemainingMinutes: null,
        isCutoffPassed: false,
        confidenceLevel: 'GUARANTEED',
        isGuaranteed: true,
        slaHours: 1,
        appliedRuleVersion: 'v1.0.0',
      };

      return [
        {
          methodCode: 'STANDARD',
          methodNameEn: 'Digital Instant Delivery',
          methodNameBn: 'তাৎক্ষণিক ডিজিটাল ডেলিভারি',
          courierProvider: 'IN_HOUSE',
          baseRatePoisha: 0,
          weightSurchargePoisha: 0,
          classSurchargePoisha: 0,
          freeShippingDiscountPoisha: 0,
          finalRatePoisha: 0,
          finalRateBdtFormatted: '৳0.00',
          isFreeShipping: true,
          isCodAvailable: false,
          maxCodAmountPoisha: 0,
          deliveryPromise: digitalPromise,
        },
      ];
    }

    // Try matching DB rules first
    const sellerId = items[0]?.sellerId;
    let matchedRule: any = null;
    try {
      const activeRules = await shippingRateRepository.findMatchingActiveRules({
        destinationZone,
        sellerId,
      });
      if (activeRules && activeRules.length > 0) {
        matchedRule = activeRules[0];
      }
    } catch {
      // Fallback to built-in defaults
    }

    const zoneDefaults =
      BUILT_IN_ZONE_DEFAULTS[destinationZone] || BUILT_IN_ZONE_DEFAULTS.MAJOR_CITIES;

    // Base rate & weight brackets
    const baseRatePoisha = matchedRule
      ? Number(matchedRule.baseRatePoisha)
      : zoneDefaults.baseRatePoisha;
    const baseWeightGrams = matchedRule
      ? matchedRule.baseWeightGrams
      : zoneDefaults.baseWeightGrams;
    const incWeightGrams = matchedRule
      ? matchedRule.incrementalWeightGrams
      : zoneDefaults.incrementalWeightGrams;
    const incRatePoisha = matchedRule
      ? Number(matchedRule.incrementalRatePoisha)
      : zoneDefaults.incrementalRatePoisha;
    const freeThresholdPoisha =
      matchedRule && matchedRule.freeShippingThresholdPoisha !== null
        ? Number(matchedRule.freeShippingThresholdPoisha)
        : zoneDefaults.freeShippingThresholdPoisha;

    const handlingDays =
      sellerHandlingDays !== undefined
        ? sellerHandlingDays
        : matchedRule
          ? matchedRule.handlingDays
          : zoneDefaults.handlingDays;
    const transitDaysMin = matchedRule ? matchedRule.transitDaysMin : zoneDefaults.transitDaysMin;
    const transitDaysMax = matchedRule ? matchedRule.transitDaysMax : zoneDefaults.transitDaysMax;
    const cutoffTime = orderCutoffTime || (matchedRule ? matchedRule.cutoffTime : '14:00');
    const courier = matchedRule?.courierProvider || zoneDefaults.defaultCourier;
    const ruleVersion = matchedRule?.ruleVersion || 'v1.0.0';

    // 1. Weight Surcharge Calculation
    const chargeableWeight = packageWeight.chargeableWeightGrams;
    let weightSurchargePoisha = 0;
    if (chargeableWeight > baseWeightGrams) {
      const extraGrams = chargeableWeight - baseWeightGrams;
      const blocks = Math.ceil(extraGrams / incWeightGrams);
      weightSurchargePoisha = blocks * incRatePoisha;
    }

    // 2. Shipping Class Surcharges
    let classSurchargePoisha = 0;
    const hasFragile = items.some((i) => i.shippingClass === 'FRAGILE');
    const hasHeavy = items.some((i) => i.shippingClass === 'HEAVY') || packageWeight.isOverweight;

    if (hasFragile) {
      classSurchargePoisha += matchedRule ? Number(matchedRule.fragileSurchargePoisha || 0) : 5000; // ৳50.00
    }
    if (hasHeavy) {
      classSurchargePoisha += matchedRule ? Number(matchedRule.heavySurchargePoisha || 0) : 10000; // ৳100.00
    }

    // 3. Free Shipping Qualification
    const grossRatePoisha = baseRatePoisha + weightSurchargePoisha + classSurchargePoisha;
    const qualifiesForFreeShipping =
      freeThresholdPoisha > 0 && sellerSubtotalPoisha >= freeThresholdPoisha;
    const freeShippingDiscountPoisha = qualifiesForFreeShipping ? grossRatePoisha : 0;
    const finalRatePoisha = Math.max(0, grossRatePoisha - freeShippingDiscountPoisha);

    // 4. Calculate Standard Delivery Promise
    const standardPromise = calculateDeliveryPromise({
      asOfDate,
      handlingDays,
      transitDaysMin,
      transitDaysMax,
      orderCutoffTime: cutoffTime,
      ruleVersion,
      isGuaranteed: false,
    });

    const isCodAllowed = matchedRule ? matchedRule.isCodAllowed : true;
    const maxCodPoisha = matchedRule ? Number(matchedRule.maxCodAmountPoisha || 5000000) : 5000000;

    const rateOptions: ShippingRateOptionDTO[] = [
      {
        methodCode: 'STANDARD',
        methodNameEn: 'Standard Courier Delivery',
        methodNameBn: 'স্ট্যান্ডার্ড ডেলিভারি',
        courierProvider: courier,
        baseRatePoisha,
        weightSurchargePoisha,
        classSurchargePoisha,
        freeShippingDiscountPoisha,
        finalRatePoisha,
        finalRateBdtFormatted: `৳${(finalRatePoisha / 100).toFixed(2)}`,
        isFreeShipping: qualifiesForFreeShipping,
        isCodAvailable: isCodAllowed,
        maxCodAmountPoisha: maxCodPoisha,
        deliveryPromise: standardPromise,
      },
    ];

    // 5. Check if Express / Fast-Track Delivery Option is Available
    if (destinationZone === 'METRO_DHAKA' || destinationZone === 'DHAKA_SUBURBS') {
      const expressBaseRatePoisha = baseRatePoisha + 6000; // ৳60 extra for fast-track
      const expressGrossPoisha =
        expressBaseRatePoisha + weightSurchargePoisha + classSurchargePoisha;
      const expressFinalRatePoisha = qualifiesForFreeShipping
        ? 6000 // In free shipping, express only charges the expedited difference
        : expressGrossPoisha;

      const expressPromise = calculateDeliveryPromise({
        asOfDate,
        handlingDays: 0, // Express prioritized handling
        transitDaysMin: 1,
        transitDaysMax: 1,
        orderCutoffTime: cutoffTime,
        ruleVersion,
        isGuaranteed: true,
      });

      rateOptions.push({
        methodCode: 'EXPRESS',
        methodNameEn: 'Fast-Track Express (Next-Day)',
        methodNameBn: 'ফাস্ট-ট্র্যাক এক্সপ্রেস (পরবর্তী দিন)',
        courierProvider: 'IN_HOUSE',
        baseRatePoisha: expressBaseRatePoisha,
        weightSurchargePoisha,
        classSurchargePoisha,
        freeShippingDiscountPoisha: qualifiesForFreeShipping
          ? expressGrossPoisha - expressFinalRatePoisha
          : 0,
        finalRatePoisha: expressFinalRatePoisha,
        finalRateBdtFormatted: `৳${(expressFinalRatePoisha / 100).toFixed(2)}`,
        isFreeShipping: false,
        isCodAvailable: isCodAllowed,
        maxCodAmountPoisha: maxCodPoisha,
        deliveryPromise: expressPromise,
      });

      // 6. Same-Day Option for Metro Dhaka if before cutoff
      if (destinationZone === 'METRO_DHAKA' && !standardPromise.isCutoffPassed) {
        const sameDayBaseRatePoisha = baseRatePoisha + 9000; // ৳90 extra for same-day
        const sameDayGrossPoisha =
          sameDayBaseRatePoisha + weightSurchargePoisha + classSurchargePoisha;
        const sameDayFinalRatePoisha = qualifiesForFreeShipping ? 9000 : sameDayGrossPoisha;

        const sameDayPromise = calculateDeliveryPromise({
          asOfDate,
          handlingDays: 0,
          transitDaysMin: 0,
          transitDaysMax: 0,
          orderCutoffTime: cutoffTime,
          ruleVersion,
          isGuaranteed: true,
        });

        rateOptions.push({
          methodCode: 'SAME_DAY',
          methodNameEn: 'Same-Day Fast Delivery',
          methodNameBn: 'একই দিনে দ্রুত ডেলিভারি',
          courierProvider: 'IN_HOUSE',
          baseRatePoisha: sameDayBaseRatePoisha,
          weightSurchargePoisha,
          classSurchargePoisha,
          freeShippingDiscountPoisha: qualifiesForFreeShipping
            ? sameDayGrossPoisha - sameDayFinalRatePoisha
            : 0,
          finalRatePoisha: sameDayFinalRatePoisha,
          finalRateBdtFormatted: `৳${(sameDayFinalRatePoisha / 100).toFixed(2)}`,
          isFreeShipping: false,
          isCodAvailable: isCodAllowed,
          maxCodAmountPoisha: maxCodPoisha,
          deliveryPromise: sameDayPromise,
        });
      }
    }

    return rateOptions;
  }

  /**
   * Estimates delivery promise for a given destination and item configuration.
   */
  public async estimatePromise(request: ProviderRateRequest): Promise<DeliveryPromiseSnapshotDTO> {
    const rates = await this.calculateRates(request);
    const preferred = request.preferredMethod || 'STANDARD';
    const chosen = rates.find((r) => r.methodCode === preferred) || rates[0];

    return chosen.deliveryPromise;
  }
}
