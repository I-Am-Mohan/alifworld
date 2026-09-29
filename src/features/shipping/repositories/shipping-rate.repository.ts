/**
 * Shipping Rate Rule Repository
 *
 * Scoped Prisma queries for versioned shipping rate rules and delivery promise configurations.
 * Invariant: Platform rules have sellerId = null; Merchant rules scoped to sellerId.
 * Invariant: Soft deletion preserved with deletedAt timestamp.
 */

import { prisma } from '@/shared/database/prisma';
import {
  CreateShippingRateRuleInput,
  UpdateShippingRateRuleInput,
} from '../validators/shipping-rate.validators';
import { ShippingRateRuleDTO } from '../types/shipping-rate.types';

export class ShippingRateRepository {
  private db = prisma;

  /**
   * Finds matching active shipping rate rules ordered by priority descending.
   */
  public async findMatchingActiveRules(params: {
    shippingMethod?: string;
    originZone?: string;
    destinationZone?: string;
    sellerId?: string | null;
  }): Promise<any[]> {
    const { shippingMethod, originZone, destinationZone, sellerId } = params;

    const where: any = {
      status: 'ACTIVE',
      deletedAt: null,
      AND: [
        // Match shipping method or ANY
        shippingMethod
          ? { OR: [{ shippingMethod }, { shippingMethod: 'STANDARD' }] }
          : {},
        // Match origin zone or ANY
        originZone ? { OR: [{ originZone }, { originZone: 'ANY' }] } : {},
        // Match destination zone or ANY
        destinationZone
          ? { OR: [{ destinationZone }, { destinationZone: 'ANY' }] }
          : {},
        // Match seller-specific rule OR platform-wide rule (sellerId is null)
        sellerId
          ? { OR: [{ sellerId }, { sellerId: null }] }
          : { sellerId: null },
      ],
    };

    return (this.db as any).shippingRateRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Retrieves rule by its unique business code.
   */
  public async findByCode(code: string): Promise<any | null> {
    return (this.db as any).shippingRateRule.findFirst({
      where: { code, deletedAt: null },
    });
  }

  /**
   * Retrieves rule by ID.
   */
  public async findById(id: string): Promise<any | null> {
    return (this.db as any).shippingRateRule.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Lists rules with optional pagination and filtering.
   */
  public async listRules(params: {
    sellerId?: string | null;
    status?: string;
    shippingMethod?: string;
    page?: number;
    limit?: number;
  }): Promise<{ rules: ShippingRateRuleDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(params.sellerId !== undefined ? { sellerId: params.sellerId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.shippingMethod ? { shippingMethod: params.shippingMethod } : {}),
    };

    const [records, total] = await Promise.all([
      (this.db as any).shippingRateRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      (this.db as any).shippingRateRule.count({ where }),
    ]);

    return {
      rules: records.map(this.mapToDTO),
      total,
      page,
      limit,
    };
  }

  /**
   * Creates a new versioned shipping rate rule.
   */
  public async createRule(
    input: CreateShippingRateRuleInput,
    actorId?: string
  ): Promise<ShippingRateRuleDTO> {
    const created = await (this.db as any).shippingRateRule.create({
      data: {
        code: input.code,
        name: input.name,
        nameBn: input.nameBn || null,
        description: input.description || null,
        shippingMethod: input.shippingMethod,
        originZone: input.originZone,
        destinationZone: input.destinationZone,
        sellerId: input.sellerId || null,
        courierProvider: input.courierProvider || null,
        baseRatePoisha: BigInt(input.baseRatePoisha),
        baseWeightGrams: input.baseWeightGrams,
        incrementalWeightGrams: input.incrementalWeightGrams,
        incrementalRatePoisha: BigInt(input.incrementalRatePoisha),
        freeShippingThresholdPoisha: input.freeShippingThresholdPoisha
          ? BigInt(input.freeShippingThresholdPoisha)
          : null,
        handlingDays: input.handlingDays,
        transitDaysMin: input.transitDaysMin,
        transitDaysMax: input.transitDaysMax,
        cutoffTime: input.cutoffTime,
        isCodAllowed: input.isCodAllowed,
        maxCodAmountPoisha: BigInt(input.maxCodAmountPoisha),
        fragileSurchargePoisha: BigInt(input.fragileSurchargePoisha),
        heavySurchargePoisha: BigInt(input.heavySurchargePoisha),
        priority: input.priority,
        isDefault: input.isDefault,
        status: input.status,
        ruleVersion: input.ruleVersion,
        metadata: input.metadata ? (input.metadata as any) : undefined,
      },
    });

    return this.mapToDTO(created);
  }

  /**
   * Updates an existing shipping rate rule.
   */
  public async updateRule(
    id: string,
    input: UpdateShippingRateRuleInput,
    actorId?: string
  ): Promise<ShippingRateRuleDTO> {
    const data: any = {
      ...(input.name ? { name: input.name } : {}),
      ...(input.nameBn !== undefined ? { nameBn: input.nameBn } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.shippingMethod ? { shippingMethod: input.shippingMethod } : {}),
      ...(input.originZone ? { originZone: input.originZone } : {}),
      ...(input.destinationZone ? { destinationZone: input.destinationZone } : {}),
      ...(input.sellerId !== undefined ? { sellerId: input.sellerId } : {}),
      ...(input.courierProvider !== undefined ? { courierProvider: input.courierProvider } : {}),
      ...(input.baseRatePoisha !== undefined
        ? { baseRatePoisha: BigInt(input.baseRatePoisha) }
        : {}),
      ...(input.baseWeightGrams !== undefined
        ? { baseWeightGrams: input.baseWeightGrams }
        : {}),
      ...(input.incrementalWeightGrams !== undefined
        ? { incrementalWeightGrams: input.incrementalWeightGrams }
        : {}),
      ...(input.incrementalRatePoisha !== undefined
        ? { incrementalRatePoisha: BigInt(input.incrementalRatePoisha) }
        : {}),
      ...(input.freeShippingThresholdPoisha !== undefined
        ? {
            freeShippingThresholdPoisha: input.freeShippingThresholdPoisha
              ? BigInt(input.freeShippingThresholdPoisha)
              : null,
          }
        : {}),
      ...(input.handlingDays !== undefined ? { handlingDays: input.handlingDays } : {}),
      ...(input.transitDaysMin !== undefined ? { transitDaysMin: input.transitDaysMin } : {}),
      ...(input.transitDaysMax !== undefined ? { transitDaysMax: input.transitDaysMax } : {}),
      ...(input.cutoffTime !== undefined ? { cutoffTime: input.cutoffTime } : {}),
      ...(input.isCodAllowed !== undefined ? { isCodAllowed: input.isCodAllowed } : {}),
      ...(input.maxCodAmountPoisha !== undefined
        ? { maxCodAmountPoisha: BigInt(input.maxCodAmountPoisha) }
        : {}),
      ...(input.fragileSurchargePoisha !== undefined
        ? { fragileSurchargePoisha: BigInt(input.fragileSurchargePoisha) }
        : {}),
      ...(input.heavySurchargePoisha !== undefined
        ? { heavySurchargePoisha: BigInt(input.heavySurchargePoisha) }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.ruleVersion ? { ruleVersion: input.ruleVersion } : {}),
      version: { increment: 1 },
    };

    const updated = await (this.db as any).shippingRateRule.update({
      where: { id },
      data,
    });

    return this.mapToDTO(updated);
  }

  /**
   * Soft deletes a shipping rate rule.
   */
  public async softDelete(id: string, actorId?: string): Promise<void> {
    await (this.db as any).shippingRateRule.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: actorId || null,
        status: 'ARCHIVED',
      },
    });
  }

  private mapToDTO(record: any): ShippingRateRuleDTO {
    const basePoisha = Number(record.baseRatePoisha || 0);
    const incPoisha = Number(record.incrementalRatePoisha || 0);
    const freePoisha =
      record.freeShippingThresholdPoisha !== null &&
      record.freeShippingThresholdPoisha !== undefined
        ? Number(record.freeShippingThresholdPoisha)
        : null;

    return {
      id: record.id,
      code: record.code,
      name: record.name,
      nameBn: record.nameBn,
      description: record.description,
      shippingMethod: record.shippingMethod,
      originZone: record.originZone,
      destinationZone: record.destinationZone,
      sellerId: record.sellerId,
      courierProvider: record.courierProvider,
      baseRatePoisha: basePoisha,
      baseRateBdtFormatted: `৳${(basePoisha / 100).toFixed(2)}`,
      baseWeightGrams: record.baseWeightGrams,
      incrementalWeightGrams: record.incrementalWeightGrams,
      incrementalRatePoisha: incPoisha,
      incrementalRateBdtFormatted: `৳${(incPoisha / 100).toFixed(2)}`,
      freeShippingThresholdPoisha: freePoisha,
      freeShippingThresholdBdtFormatted:
        freePoisha !== null ? `৳${(freePoisha / 100).toFixed(2)}` : null,
      handlingDays: record.handlingDays,
      transitDaysMin: record.transitDaysMin,
      transitDaysMax: record.transitDaysMax,
      cutoffTime: record.cutoffTime,
      isCodAllowed: record.isCodAllowed,
      maxCodAmountPoisha: Number(record.maxCodAmountPoisha || 5000000),
      fragileSurchargePoisha: Number(record.fragileSurchargePoisha || 0),
      heavySurchargePoisha: Number(record.heavySurchargePoisha || 0),
      priority: record.priority,
      isDefault: record.isDefault,
      status: record.status,
      ruleVersion: record.ruleVersion,
      createdAt: record.createdAt?.toISOString?.() || new Date(record.createdAt).toISOString(),
      updatedAt: record.updatedAt?.toISOString?.() || new Date(record.updatedAt).toISOString(),
    };
  }
}

export const shippingRateRepository = new ShippingRateRepository();
