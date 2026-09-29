/**
 * Authoritative Server-Side Checkout Calculation Engine
 *
 * Implements centralized financial computation for checkout and cart preview:
 * 1. Live stock verification & price snapshotting (ignoring client-side totals)
 * 2. Independent discrete Product Points snapshots (strictly separate from BDT)
 * 3. NBR Mushak-6.3 jurisdiction- and effective-date-aware tax calculation
 * 4. Automatic discounts & coupon evaluation with seller/platform funding splits
 * 5. Multi-vendor shipping rate and delivery promise calculation
 * 6. Platform commission and seller payout partitioning
 *
 * Invariant: All money values in integer poisha (1 BDT = 100 poisha).
 * Invariant: Product Points have no conversion rate to fiat currency.
 * Invariant: Rule versions are tracked for immutable audit snapshots.
 */

import { prisma } from '@/shared/database/prisma';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from '@/shared/errors/app-error';
import { SystemRoleCode } from '@/features/identity/types';
import {
  ServerCheckoutCalculationResultDTO,
  CalculatedSellerGroupDTO,
  CalculatedLineItemDTO,
  AppliedCouponDetailDTO,
  TaxJurisdictionSummaryDTO,
} from '../types/calculation.types';
import { CheckoutCalculationInput } from '../validators/calculation.validators';
import { TaxService } from '@/features/catalog/services/tax-service';
import { shippingRateService, ShippingItemInput } from '@/features/shipping';

const DEFAULT_PLATFORM_COMMISSION_BPS = 500n; // 5.00% (500 basis points)
const DEFAULT_FREE_SHIPPING_THRESHOLD_POISHA = 200000; // ৳2,000.00 per seller

export class ServerCheckoutCalculationService {
  private db = prisma;
  private taxService = new TaxService();

  /**
   * Primary entry point: Calculates authoritative checkout totals entirely on the server.
   */
  public async calculateCheckout(
    input: CheckoutCalculationInput,
    options: {
      customerId?: string | null;
      isB2B?: boolean;
      b2bQuoteId?: string | null;
      asOfDate?: Date;
    } = {}
  ): Promise<ServerCheckoutCalculationResultDTO> {
    const asOfDate = options.asOfDate || new Date();
    const warnings: string[] = [];

    // 1. Resolve raw items from cartId or direct items array
    const rawItems = await this.resolveItems(input);
    if (rawItems.length === 0) {
      throw new ValidationError('Cannot calculate checkout for zero items.');
    }

    // 2. Fetch variants, products, sellers, categories, and inventory
    const variantIds = rawItems.map((i) => i.variantId);
    const variants = await (this.db as any).productVariant.findMany({
      where: {
        id: { in: variantIds },
        deletedAt: null,
      },
      include: {
        product: {
          include: {
            seller: {
              include: {
                settings: true,
                operationalDefaults: true,
              },
            },
            category: true,
          },
        },
        stockBalances: { where: { deletedAt: null } },
      },
    });

    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));

    // 3. Process line items, prices, points, and stock
    const calculatedLines: CalculatedLineItemDTO[] = [];
    const shippingItemsForQuote: ShippingItemInput[] = [];

    for (const rawItem of rawItems) {
      const variant = variantMap.get(rawItem.variantId);
      if (!variant) {
        throw new NotFoundError(`Product variant '${rawItem.variantId}' not found.`);
      }

      const product = variant.product;
      if (!product || product.deletedAt || product.status !== 'PUBLISHED') {
        throw new ValidationError(`Product '${product?.title || 'Unknown'}' is not published.`);
      }

      const seller = product.seller;
      if (!seller || seller.status !== 'VERIFIED' || seller.deletedAt) {
        throw new ValidationError(
          `Seller '${seller?.businessName || 'Unknown'}' is unavailable for order fulfillment.`
        );
      }

      if (seller.settings?.vacationMode) {
        throw new ValidationError(
          `Seller '${seller.businessName}' is currently on vacation: ${seller.settings.vacationMessage || 'Orders cannot be placed.'}`
        );
      }

      // Live inventory availability check
      const totalAvailableStock = (variant.stockBalances || []).reduce(
        (sum: number, sb: any) =>
          sum + Math.max(0, (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)),
        0
      );

      if (variant.stockBalances?.length > 0 && rawItem.quantity > totalAvailableStock) {
        throw new ValidationError(
          `Insufficient inventory for '${product.title} - ${variant.title}'. Requested: ${rawItem.quantity}, Available: ${totalAvailableStock}.`
        );
      }

      // Unit price in poisha (authoritative live price)
      const unitPricePoisha = Number(variant.pricePoisha || 0);
      const grossSubtotalPoisha = unitPricePoisha * rawItem.quantity;

      // Discrete Product Points snapshot (strictly independent integer loyalty units)
      const unitProductPoint = variant.productPoint ?? product.productPoint ?? 0;
      const lineProductPoints = unitProductPoint * rawItem.quantity;

      // Resolve tax rate percentage
      const taxRatePercent = this.taxService.resolveTaxRatePercent({
        productTaxRatePercent: product.taxRatePercent ? Number(product.taxRatePercent) : null,
        categoryTaxRatePercent: product.category?.taxRatePercent
          ? Number(product.category.taxRatePercent)
          : null,
        date: asOfDate,
      });

      calculatedLines.push({
        variantId: variant.id,
        productId: product.id,
        productTitle: product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        sellerId: seller.id,
        sellerName: seller.businessName,
        quantity: rawItem.quantity,
        unitPricePoisha,
        unitPriceBdtFormatted: this.formatBdt(unitPricePoisha),
        grossSubtotalPoisha,
        grossSubtotalBdtFormatted: this.formatBdt(grossSubtotalPoisha),
        discountPoisha: 0,
        sellerDiscountPoisha: 0,
        platformDiscountPoisha: 0,
        netPriceAfterDiscountPoisha: grossSubtotalPoisha,
        taxRatePercent,
        taxPoisha: 0, // Calculated after discounts
        taxBdtFormatted: '৳0.00',
        taxType: 'VAT',
        priceIncludesTax: false,
        productPointSnapshot: unitProductPoint,
        totalProductPoints: lineProductPoints,
        lineTotalPoisha: grossSubtotalPoisha,
        lineTotalBdtFormatted: this.formatBdt(grossSubtotalPoisha),
      });

      shippingItemsForQuote.push({
        variantId: variant.id,
        productTitle: product.title,
        quantity: rawItem.quantity,
        weightGrams: variant.weightGrams ?? product.weightGrams ?? 250,
        lengthMm: product.lengthMm ?? null,
        widthMm: product.widthMm ?? null,
        heightMm: product.heightMm ?? null,
        shippingClass: product.shippingClass ?? 'STANDARD',
        requiresShipping: product.requiresShipping ?? true,
        unitPricePoisha: BigInt(unitPricePoisha),
        sellerId: seller.id,
      });
    }

    // 4. Calculate Subtotal
    const orderSubtotalPoisha = calculatedLines.reduce(
      (sum, line) => sum + line.grossSubtotalPoisha,
      0
    );

    // 5. Evaluate Coupon Code
    let appliedCoupon: AppliedCouponDetailDTO | null = null;
    if (input.couponCode) {
      appliedCoupon = await this.evaluateCoupon(
        input.couponCode,
        orderSubtotalPoisha,
        calculatedLines,
        options.customerId,
        asOfDate
      );

      if (appliedCoupon && appliedCoupon.discountAmountPoisha > 0) {
        // Proportionately distribute coupon discount across lines
        const totalDiscount = appliedCoupon.discountAmountPoisha;
        let distributedDiscount = 0;

        for (let i = 0; i < calculatedLines.length; i++) {
          const line = calculatedLines[i];
          const isEligible =
            !appliedCoupon.sellerId || line.sellerId === appliedCoupon.sellerId;

          if (isEligible) {
            let lineDiscount = 0;
            if (i === calculatedLines.length - 1) {
              lineDiscount = totalDiscount - distributedDiscount;
            } else {
              lineDiscount = Math.round(
                (totalDiscount * line.grossSubtotalPoisha) / orderSubtotalPoisha
              );
              distributedDiscount += lineDiscount;
            }

            line.discountPoisha = lineDiscount;
            line.sellerDiscountPoisha = Math.round(
              (lineDiscount * appliedCoupon.sellerSharePercent) / 100
            );
            line.platformDiscountPoisha = lineDiscount - line.sellerDiscountPoisha;
            line.netPriceAfterDiscountPoisha = Math.max(
              0,
              line.grossSubtotalPoisha - lineDiscount
            );
          }
        }
      }
    }

    // 6. Calculate Tax for each line item (NBR Mushak-6.3 compliant)
    let orderTaxPoisha = 0;
    const rateBreakdownMap = new Map<number, { taxable: number; tax: number }>();

    for (const line of calculatedLines) {
      const taxCalc = this.taxService.calculateTaxForLineItem({
        title: line.productTitle,
        netPricePoisha: line.netPriceAfterDiscountPoisha,
        quantity: 1, // Already multiplied in netPriceAfterDiscountPoisha
        taxRatePercent: line.taxRatePercent,
        priceIncludesTax: false,
      });

      const lineTax = Number(taxCalc.taxAmountPoisha);
      line.taxPoisha = lineTax;
      line.taxBdtFormatted = this.formatBdt(lineTax);
      line.lineTotalPoisha = line.netPriceAfterDiscountPoisha + lineTax;
      line.lineTotalBdtFormatted = this.formatBdt(line.lineTotalPoisha);

      orderTaxPoisha += lineTax;

      // Group into rate breakdown
      const existing = rateBreakdownMap.get(line.taxRatePercent) || { taxable: 0, tax: 0 };
      existing.taxable += line.netPriceAfterDiscountPoisha;
      existing.tax += lineTax;
      rateBreakdownMap.set(line.taxRatePercent, existing);
    }

    // 7. Multi-Vendor Partitioning & Shipping Rate Calculation
    const linesBySeller = new Map<string, CalculatedLineItemDTO[]>();
    for (const line of calculatedLines) {
      const group = linesBySeller.get(line.sellerId) || [];
      group.push(line);
      linesBySeller.set(line.sellerId, group);
    }

    // Authoritative Shipping Quote
    const shippingQuote = await shippingRateService.calculateOrderShippingQuote({
      address: {
        division: input.shippingAddress.division,
        district: input.shippingAddress.district,
        upazila: input.shippingAddress.upazila,
        postalCode: input.shippingAddress.postalCode,
        streetAddress: input.shippingAddress.streetAddress,
      },
      items: shippingItemsForQuote,
      shippingMethod: input.shippingMethod,
    });

    const sellerGroups: CalculatedSellerGroupDTO[] = [];
    let groupIndex = 1;
    let orderShippingFeePoisha = 0;
    let orderTotalDiscountPoisha = 0;
    let orderSellerDiscountPoisha = 0;
    let orderPlatformDiscountPoisha = 0;
    let orderTotalProductPoints = 0;

    for (const [sellerId, lines] of linesBySeller.entries()) {
      const sellerQuote = shippingQuote.sellerQuotes.find((sq) => sq.sellerId === sellerId);

      const groupSubtotalPoisha = lines.reduce((sum, l) => sum + l.grossSubtotalPoisha, 0);
      const groupDiscountPoisha = lines.reduce((sum, l) => sum + l.discountPoisha, 0);
      const groupSellerDiscountPoisha = lines.reduce((sum, l) => sum + l.sellerDiscountPoisha, 0);
      const groupPlatformDiscountPoisha = lines.reduce(
        (sum, l) => sum + l.platformDiscountPoisha,
        0
      );
      const groupTaxPoisha = lines.reduce((sum, l) => sum + l.taxPoisha, 0);
      const groupProductPoints = lines.reduce((sum, l) => sum + l.totalProductPoints, 0);

      const groupShippingFeePoisha = sellerQuote ? sellerQuote.activeRate.finalRatePoisha : 6000;
      const isFreeShipping = sellerQuote ? sellerQuote.activeRate.isFreeShipping : false;
      const courierProvider = sellerQuote ? sellerQuote.activeRate.courierProvider : 'PATHAO';

      const groupTotalPoisha =
        groupSubtotalPoisha - groupDiscountPoisha + groupShippingFeePoisha + groupTaxPoisha;

      // Platform commission (5.00% default)
      const commissionPoisha = Math.floor(
        (groupSubtotalPoisha * Number(DEFAULT_PLATFORM_COMMISSION_BPS)) / 10000
      );
      const sellerPayoutPoisha = groupTotalPoisha - commissionPoisha;

      const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const groupNumber = `SFG-${dateStamp}-SEL${String(groupIndex++).padStart(2, '0')}`;

      sellerGroups.push({
        sellerId,
        sellerName: lines[0].sellerName,
        groupNumber,
        subtotalPoisha: groupSubtotalPoisha,
        subtotalBdtFormatted: this.formatBdt(groupSubtotalPoisha),
        discountPoisha: groupDiscountPoisha,
        sellerDiscountPoisha: groupSellerDiscountPoisha,
        platformDiscountPoisha: groupPlatformDiscountPoisha,
        discountBdtFormatted: this.formatBdt(groupDiscountPoisha),
        shippingFeePoisha: groupShippingFeePoisha,
        shippingFeeBdtFormatted: this.formatBdt(groupShippingFeePoisha),
        isFreeShipping,
        courierProvider,
        taxPoisha: groupTaxPoisha,
        taxBdtFormatted: this.formatBdt(groupTaxPoisha),
        totalPoisha: groupTotalPoisha,
        totalBdtFormatted: this.formatBdt(groupTotalPoisha),
        sellerCommissionPoisha: commissionPoisha,
        sellerCommissionBdtFormatted: this.formatBdt(commissionPoisha),
        sellerPayoutPoisha,
        sellerPayoutBdtFormatted: this.formatBdt(sellerPayoutPoisha),
        totalProductPoints: groupProductPoints,
        items: lines,
      });

      orderShippingFeePoisha += groupShippingFeePoisha;
      orderTotalDiscountPoisha += groupDiscountPoisha;
      orderSellerDiscountPoisha += groupSellerDiscountPoisha;
      orderPlatformDiscountPoisha += groupPlatformDiscountPoisha;
      orderTotalProductPoints += groupProductPoints;
    }

    const orderTotalPoisha =
      orderSubtotalPoisha - orderTotalDiscountPoisha + orderShippingFeePoisha + orderTaxPoisha;

    // 8. Tax Summary
    const taxSummary: TaxJurisdictionSummaryDTO = {
      jurisdiction: 'BD',
      standardRatePercent: 15.0,
      taxableAmountPoisha: orderSubtotalPoisha - orderTotalDiscountPoisha,
      taxableAmountBdtFormatted: this.formatBdt(orderSubtotalPoisha - orderTotalDiscountPoisha),
      taxAmountPoisha: orderTaxPoisha,
      taxAmountBdtFormatted: this.formatBdt(orderTaxPoisha),
      mushakStandard: 'Mushak-6.3',
      rateBreakdown: Array.from(rateBreakdownMap.entries()).map(([rate, vals]) => ({
        ratePercent: rate,
        taxablePoisha: vals.taxable,
        taxPoisha: vals.tax,
        description: `NBR VAT @ ${rate}%`,
      })),
    };

    return {
      currency: 'BDT',
      subtotalPoisha: orderSubtotalPoisha,
      subtotalBdtFormatted: this.formatBdt(orderSubtotalPoisha),
      discountPoisha: orderTotalDiscountPoisha,
      sellerDiscountPoisha: orderSellerDiscountPoisha,
      platformDiscountPoisha: orderPlatformDiscountPoisha,
      discountBdtFormatted: this.formatBdt(orderTotalDiscountPoisha),
      coupon: appliedCoupon,
      shippingFeePoisha: orderShippingFeePoisha,
      shippingFeeBdtFormatted: this.formatBdt(orderShippingFeePoisha),
      taxPoisha: orderTaxPoisha,
      taxBdtFormatted: this.formatBdt(orderTaxPoisha),
      taxSummary,
      totalPoisha: orderTotalPoisha,
      totalBdtFormatted: this.formatBdt(orderTotalPoisha),
      totalProductPoints: orderTotalProductPoints,
      sellerGroups,
      appliedRuleVersion: 'v1.0.0',
      calculatedAt: new Date().toISOString(),
      warnings,
    };
  }

  /**
   * Retrieves authoritative NBR Mushak-6.3 tax breakdown for a committed order.
   * Enforces customer self-ownership and seller tenant isolation.
   */
  public async getOrderTaxBreakdown(orderId: string, actor: any) {
    const order = await (this.db as any).order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            fulfillmentGroup: {
              select: {
                groupNumber: true,
                sellerId: true,
              },
            },
          },
        },
        fulfillmentGroups: { where: { deletedAt: null } },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found.`);
    }

    const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles?.includes(SystemRoleCode.ADMIN);
    const isOwnerCustomer = actor.userId === order.customerId;
    const isOwnerSeller =
      actor.sellerId &&
      order.fulfillmentGroups.some((g: any) => g.sellerId === actor.sellerId);

    if (!isSuperAdmin && !isPlatformAdmin && !isOwnerCustomer && !isOwnerSeller) {
      throw new AuthorizationError('You do not have permission to view tax breakdown for this order.', {
        code: 'OWNERSHIP_VIOLATION',
      });
    }

    // Filter items if caller is a seller
    let eligibleItems = order.items;
    if (isOwnerSeller && !isSuperAdmin && !isPlatformAdmin) {
      eligibleItems = order.items.filter((i: any) => i.sellerId === actor.sellerId);
    }

    const rateMap = new Map<number, { taxablePoisha: bigint; taxPoisha: bigint; itemsCount: number }>();
    let totalTaxablePoisha = 0n;
    let totalTaxPoisha = 0n;

    const itemBreakdown = eligibleItems.map((item: any) => {
      const rate = item.taxRatePercent ? Number(item.taxRatePercent) : 0;
      const taxable = BigInt(item.totalPoisha || 0) - BigInt(item.discountPoisha || 0);
      const tax = BigInt(item.taxPoisha || 0);

      totalTaxablePoisha += taxable;
      totalTaxPoisha += tax;

      const current = rateMap.get(rate) || { taxablePoisha: 0n, taxPoisha: 0n, itemsCount: 0 };
      current.taxablePoisha += taxable;
      current.taxPoisha += tax;
      current.itemsCount += item.quantity;
      rateMap.set(rate, current);

      return {
        orderItemId: item.id,
        groupNumber: item.fulfillmentGroup?.groupNumber,
        productTitle: item.productTitle,
        variantTitle: item.variantTitle,
        sku: item.sku,
        quantity: item.quantity,
        unitPricePoisha: Number(item.unitPricePoisha),
        unitPriceBdtFormatted: this.formatBdt(Number(item.unitPricePoisha)),
        taxableAmountPoisha: Number(taxable),
        taxableAmountBdtFormatted: this.formatBdt(Number(taxable)),
        taxRatePercent: rate,
        taxAmountPoisha: Number(tax),
        taxAmountBdtFormatted: this.formatBdt(Number(tax)),
      };
    });

    const rates = Array.from(rateMap.entries()).map(([rate, vals]) => ({
      ratePercent: rate,
      itemsCount: vals.itemsCount,
      taxableAmountPoisha: Number(vals.taxablePoisha),
      taxableAmountBdtFormatted: this.formatBdt(Number(vals.taxablePoisha)),
      taxAmountPoisha: Number(vals.taxPoisha),
      taxAmountBdtFormatted: this.formatBdt(Number(vals.taxPoisha)),
      description: rate === 0 ? 'NBR VAT Exempt (0%)' : `NBR Standard VAT (${rate}%)`,
    }));

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currency: 'BDT',
      mushakStandard: 'Mushak-6.3',
      jurisdiction: 'BD',
      ruleVersion: order.ruleVersion || 'v1.0.0',
      totalTaxableAmountPoisha: Number(totalTaxablePoisha),
      totalTaxableAmountBdtFormatted: this.formatBdt(Number(totalTaxablePoisha)),
      totalTaxAmountPoisha: Number(totalTaxPoisha),
      totalTaxAmountBdtFormatted: this.formatBdt(Number(totalTaxPoisha)),
      rates,
      items: itemBreakdown,
    };
  }

  /**
   * Evaluates coupon code eligibility and discount amount.
   */
  private async evaluateCoupon(
    couponCode: string,
    orderSubtotalPoisha: number,
    lines: CalculatedLineItemDTO[],
    customerId?: string | null,
    now: Date = new Date()
  ): Promise<AppliedCouponDetailDTO | null> {
    const codeUpper = couponCode.trim().toUpperCase();

    // 1. Search in discount_rules
    const discountRule = await (this.db as any).discountRule.findFirst({
      where: { code: codeUpper, deletedAt: null },
    });

    if (discountRule) {
      if (discountRule.status !== 'ACTIVE') {
        throw new ValidationError(`Coupon '${codeUpper}' is inactive.`);
      }
      if (now < new Date(discountRule.startsAt)) {
        throw new ValidationError(`Coupon '${codeUpper}' is not yet active.`);
      }
      if (discountRule.endsAt && now > new Date(discountRule.endsAt)) {
        throw new ValidationError(`Coupon '${codeUpper}' has expired.`);
      }
      if (orderSubtotalPoisha < Number(discountRule.minOrderSubtotalPoisha || 0)) {
        throw new ValidationError(
          `Minimum order subtotal requirement of ${this.formatBdt(Number(discountRule.minOrderSubtotalPoisha))} not met.`
        );
      }
      if (discountRule.usageLimit && (discountRule.usageCount || 0) >= discountRule.usageLimit) {
        throw new ValidationError(`Coupon '${codeUpper}' usage limit has been reached.`);
      }

      // Calculate discount amount
      let discountAmountPoisha = 0;
      if (discountRule.discountType === 'PERCENTAGE') {
        const pct = Number(discountRule.discountValue || 0);
        discountAmountPoisha = Math.round((orderSubtotalPoisha * pct) / 100);
      } else {
        discountAmountPoisha = Math.round(Number(discountRule.discountValue || 0) * 100);
      }

      if (discountRule.maxDiscountPoisha) {
        discountAmountPoisha = Math.min(
          discountAmountPoisha,
          Number(discountRule.maxDiscountPoisha)
        );
      }

      const sellerSharePercent = Number(discountRule.sellerSharePercent ?? 0);
      const platformSharePercent = Number(discountRule.platformSharePercent ?? 100);

      const sellerDiscountPoisha = Math.round((discountAmountPoisha * sellerSharePercent) / 100);
      const platformDiscountPoisha = discountAmountPoisha - sellerDiscountPoisha;

      return {
        couponCode: codeUpper,
        discountAmountPoisha,
        discountAmountBdtFormatted: this.formatBdt(discountAmountPoisha),
        discountRuleId: discountRule.id,
        sellerId: discountRule.sellerId || null,
        sellerSharePercent,
        platformSharePercent,
        sellerDiscountPoisha,
        platformDiscountPoisha,
        ruleVersion: discountRule.ruleVersion || 'v1.0.0',
      };
    }

    // 2. Search in promotions
    const promotion = await (this.db as any).promotion.findFirst({
      where: { code: codeUpper, deletedAt: null },
    });

    if (promotion) {
      if (promotion.status !== 'ACTIVE') {
        throw new ValidationError(`Promotion coupon '${codeUpper}' is inactive.`);
      }
      if (now < new Date(promotion.startsAt)) {
        throw new ValidationError(`Promotion coupon '${codeUpper}' is not yet active.`);
      }
      if (promotion.endsAt && now > new Date(promotion.endsAt)) {
        throw new ValidationError(`Promotion coupon '${codeUpper}' has expired.`);
      }
      if (orderSubtotalPoisha < Number(promotion.minOrderSubtotalPoisha || 0)) {
        throw new ValidationError(
          `Minimum order subtotal requirement of ${this.formatBdt(Number(promotion.minOrderSubtotalPoisha))} not met.`
        );
      }

      let discountAmountPoisha = 0;
      if (promotion.promotionType === 'PERCENTAGE') {
        const pct = Number(promotion.discountValue || 0);
        discountAmountPoisha = Math.round((orderSubtotalPoisha * pct) / 100);
      } else {
        discountAmountPoisha = Math.round(Number(promotion.discountValue || 0) * 100);
      }

      if (promotion.maxDiscountPoisha) {
        discountAmountPoisha = Math.min(
          discountAmountPoisha,
          Number(promotion.maxDiscountPoisha)
        );
      }

      return {
        couponCode: codeUpper,
        discountAmountPoisha,
        discountAmountBdtFormatted: this.formatBdt(discountAmountPoisha),
        promotionId: promotion.id,
        sellerId: promotion.sellerId || null,
        sellerSharePercent: 0,
        platformSharePercent: 100,
        sellerDiscountPoisha: 0,
        platformDiscountPoisha: discountAmountPoisha,
        ruleVersion: 'v1.0.0',
      };
    }

    throw new ValidationError(`Coupon code '${codeUpper}' is invalid or does not exist.`);
  }

  /**
   * Resolves raw line items from either cartId or direct items input array.
   */
  private async resolveItems(
    input: CheckoutCalculationInput
  ): Promise<Array<{ variantId: string; quantity: number }>> {
    if (input.cartId) {
      const cart = await (this.db as any).cart.findFirst({
        where: { id: input.cartId, deletedAt: null },
        include: {
          items: { where: { deletedAt: null } },
        },
      });

      if (!cart) {
        throw new NotFoundError(`Shopping cart '${input.cartId}' not found.`);
      }

      return cart.items.map((i: any) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      }));
    }

    return input.items || [];
  }

  private formatBdt(poisha: number): string {
    return `৳${(poisha / 100).toFixed(2)}`;
  }
}

export const serverCheckoutCalculationService = new ServerCheckoutCalculationService();
