import { prisma } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { ConflictError } from '@/shared/errors/app-error';
import type { SellerNotificationDefaultsInput, SellerOperationalDefaultsInput } from '../operational-defaults';

export class SellerOperationalDefaultsRepository {
  private readonly db = prisma as any;

  async get(sellerId: string) {
    return this.db.sellerOperationalDefaults.findUnique({ where: { sellerId } });
  }

  async upsert(input: SellerOperationalDefaultsInput, actorId: string) {
    const current = await this.get(input.sellerId);
    if (current && current.version !== input.version) throw new ConflictError('Seller operational defaults were modified by another request.');
    return this.db.sellerOperationalDefaults.upsert({ where: { sellerId: input.sellerId }, update: { taxJurisdiction: input.taxJurisdiction, taxRuleVersion: input.taxRuleVersion ?? null, taxEffectiveFrom: input.taxEffectiveFrom ?? null, shippingMode: input.shippingMode, defaultHandlingDays: input.defaultHandlingDays, orderCutoffTime: input.orderCutoffTime ?? null, autoAcceptOrders: input.autoAcceptOrders, defaultOrderStatus: 'PENDING', version: (current?.version || 0) + 1, updatedBy: actorId }, create: { id: generateId(ID_PREFIXES.CONFIG), sellerId: input.sellerId, taxJurisdiction: input.taxJurisdiction, taxRuleVersion: input.taxRuleVersion ?? null, taxEffectiveFrom: input.taxEffectiveFrom ?? null, shippingMode: input.shippingMode, defaultHandlingDays: input.defaultHandlingDays, orderCutoffTime: input.orderCutoffTime ?? null, autoAcceptOrders: input.autoAcceptOrders, defaultOrderStatus: 'PENDING', version: 1, createdBy: actorId, updatedBy: actorId } });
  }

  async getNotifications(sellerId: string) {
    return this.db.sellerNotificationDefault.findMany({ where: { sellerId }, orderBy: [{ eventType: 'asc' }, { channel: 'asc' }] });
  }

  async replaceNotifications(input: SellerNotificationDefaultsInput) {
    return this.db.$transaction(async (tx: any) => {
      await tx.sellerNotificationDefault.deleteMany({ where: { sellerId: input.sellerId } });
      for (const preference of input.preferences) {
        await tx.sellerNotificationDefault.create({ data: { id: generateId(ID_PREFIXES.CONFIG), sellerId: input.sellerId, channel: preference.channel, eventType: preference.eventType, enabled: preference.enabled, version: 1 } });
      }
      return tx.sellerNotificationDefault.findMany({ where: { sellerId: input.sellerId }, orderBy: [{ eventType: 'asc' }, { channel: 'asc' }] });
    });
  }
}
