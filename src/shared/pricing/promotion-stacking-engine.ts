import {
  evaluateDiscountRule,
  DiscountRuleDescriptor,
  EvaluateDiscountRulesInput,
  DiscountEvaluationResult,
} from './discount-rule-engine';

export interface StackingRuleDescriptor extends DiscountRuleDescriptor {
  isStackable: boolean;
  exclusionScope: 'EXCLUSIVE_SITEWIDE' | 'EXCLUSIVE_CATEGORY' | 'EXCLUSIVE_PRODUCT' | 'STACKABLE' | string;
}

export interface ExcludedPromotionDetail {
  ruleId: string;
  code: string | null;
  title: string;
  exclusionReason: string;
}

export interface StackedPromotionsResult {
  appliedPromotions: DiscountEvaluationResult[];
  excludedPromotions: ExcludedPromotionDetail[];
  totalDiscountPoisha: bigint;
}

/**
 * Resolves promotion stacking, priority ordering, and exclusion conflicts across candidate rules.
 */
export function resolveStackedPromotions(
  candidateRules: StackingRuleDescriptor[],
  input: EvaluateDiscountRulesInput
): StackedPromotionsResult {
  const now = input.now || new Date();

  // 1. Sort candidate rules by priority DESC, then discount value DESC
  const sortedRules = [...candidateRules].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return Number(b.discountValue) - Number(a.discountValue);
  });

  const appliedPromotions: DiscountEvaluationResult[] = [];
  const excludedPromotions: ExcludedPromotionDetail[] = [];

  let isSitewideExclusiveApplied = false;
  const excludedProductIds = new Set<string>();
  const excludedCategoryIds = new Set<string>();

  // Track remaining subtotal per line item to prevent over-discounting beyond line item price
  const lineItemRemainingPoisha = new Map<string, bigint>();
  input.lineItems.forEach((li) => {
    lineItemRemainingPoisha.set(li.lineItemId, li.unitPricePoisha * BigInt(li.quantity));
  });

  for (const rule of sortedRules) {
    // Conflict Check 1: If a sitewide exclusive rule is already applied, all subsequent rules are excluded
    if (isSitewideExclusiveApplied) {
      excludedPromotions.push({
        ruleId: rule.id,
        code: rule.code || null,
        title: rule.title,
        exclusionReason: 'Excluded because an EXCLUSIVE_SITEWIDE promotion is already active',
      });
      continue;
    }

    // Conflict Check 2: Non-stackable rule check if another rule is already applied
    if (!rule.isStackable && appliedPromotions.length > 0) {
      excludedPromotions.push({
        ruleId: rule.id,
        code: rule.code || null,
        title: rule.title,
        exclusionReason: 'Excluded because non-stackable rule conflicts with previously applied promotions',
      });
      continue;
    }

    // Conflict Check 3: Exclusion Scope Check for Category/Product
    if (rule.targetScope === 'SPECIFIC_PRODUCTS' && rule.targets) {
      const hasExcludedTarget = rule.targets.some(
        (t) => t.targetType === 'PRODUCT' && excludedProductIds.has(t.targetId)
      );
      if (hasExcludedTarget) {
        excludedPromotions.push({
          ruleId: rule.id,
          code: rule.code || null,
          title: rule.title,
          exclusionReason: 'Excluded because target product is locked by a higher-priority exclusive promotion',
        });
        continue;
      }
    }

    if (rule.targetScope === 'SPECIFIC_CATEGORIES' && rule.targets) {
      const hasExcludedTarget = rule.targets.some(
        (t) => t.targetType === 'CATEGORY' && excludedCategoryIds.has(t.targetId)
      );
      if (hasExcludedTarget) {
        excludedPromotions.push({
          ruleId: rule.id,
          code: rule.code || null,
          title: rule.title,
          exclusionReason: 'Excluded because target category is locked by a higher-priority exclusive promotion',
        });
        continue;
      }
    }

    // Evaluate candidate rule against current line items
    // Evaluate candidate rule against current line items
    const evalResult = evaluateDiscountRule(rule, { ...input, now });
    if (!evalResult || evalResult.discountAmountPoisha <= 0n) {
      continue;
    }

    // Check if line item allocations exceed remaining poisha on any target line item
    let capExceeded = false;
    for (const alloc of evalResult.lineAllocations) {
      const remaining = lineItemRemainingPoisha.get(alloc.lineItemId) ?? 0n;
      if (alloc.discountPoisha > remaining) {
        capExceeded = true;
        break;
      }
    }

    if (capExceeded && evalResult.lineAllocations.length > 0) {
      // Adjust line allocations to remaining poisha if stackable
      let adjustedTotal = 0n;
      const adjustedAllocations = evalResult.lineAllocations.map((alloc) => {
        const remaining = lineItemRemainingPoisha.get(alloc.lineItemId) ?? 0n;
        const cappedDiscount = alloc.discountPoisha > remaining ? remaining : alloc.discountPoisha;
        adjustedTotal += cappedDiscount;
        return { lineItemId: alloc.lineItemId, discountPoisha: cappedDiscount };
      });

      if (adjustedTotal <= 0n) {
        excludedPromotions.push({
          ruleId: rule.id,
          code: rule.code || null,
          title: rule.title,
          exclusionReason: 'Excluded because line item price floors have been reached',
        });
        continue;
      }

      evalResult.discountAmountPoisha = adjustedTotal;
      evalResult.lineAllocations = adjustedAllocations;
    }

    // Update remaining poisha for applied line items
    evalResult.lineAllocations.forEach((alloc) => {
      const current = lineItemRemainingPoisha.get(alloc.lineItemId) ?? 0n;
      lineItemRemainingPoisha.set(alloc.lineItemId, current - alloc.discountPoisha);
    });

    // Mark rule as applied
    appliedPromotions.push(evalResult);

    // Apply exclusion locks for future lower-priority rules
    if (rule.exclusionScope === 'EXCLUSIVE_SITEWIDE') {
      isSitewideExclusiveApplied = true;
    } else if (rule.exclusionScope === 'EXCLUSIVE_PRODUCT' && rule.targets) {
      rule.targets.forEach((t) => {
        if (t.targetType === 'PRODUCT') excludedProductIds.add(t.targetId);
      });
    } else if (rule.exclusionScope === 'EXCLUSIVE_CATEGORY' && rule.targets) {
      rule.targets.forEach((t) => {
        if (t.targetType === 'CATEGORY') excludedCategoryIds.add(t.targetId);
      });
    }
  }

  const totalDiscountPoisha = appliedPromotions.reduce((sum, p) => sum + p.discountAmountPoisha, 0n);

  return {
    appliedPromotions,
    excludedPromotions,
    totalDiscountPoisha,
  };
}
