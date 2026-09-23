import { AuthorizationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { SellerOperationalDefaultsRepository } from '../repositories/seller-operational-defaults-repository';
import type { SellerNotificationDefaultsInput, SellerOperationalDefaultsInput } from '../operational-defaults';

export class SellerOperationalDefaultsService {
  constructor(private readonly repository = new SellerOperationalDefaultsRepository()) {}

  async get(actor: { sellerId?: string | null; roles: string[] }, sellerId: string) { this.assertTenant(actor, sellerId); return this.repository.get(sellerId); }
  async save(actor: { userId: string; sellerId?: string | null; roles: string[] }, input: SellerOperationalDefaultsInput) { this.assertTenant(actor, input.sellerId); if (actor.roles.includes('SELLER_STAFF') && !actor.roles.includes('SELLER_OWNER')) throw new AuthorizationError('Seller staff cannot update operational defaults.'); const result = await this.repository.upsert(input, actor.userId); await (prisma as any).auditLog.create({ data: { actorId: actor.userId, action: 'SELLER_OPERATIONAL_DEFAULTS_UPDATED', resource: 'SellerOperationalDefaults', resourceId: result.id, metadata: { sellerId: input.sellerId, taxJurisdiction: input.taxJurisdiction, shippingMode: input.shippingMode, autoAcceptOrders: input.autoAcceptOrders } } }); return result; }
  async getNotifications(actor: { sellerId?: string | null; roles: string[] }, sellerId: string) { this.assertTenant(actor, sellerId); return this.repository.getNotifications(sellerId); }
  async saveNotifications(actor: { userId: string; sellerId?: string | null; roles: string[] }, input: SellerNotificationDefaultsInput) { this.assertTenant(actor, input.sellerId); if (actor.roles.includes('SELLER_STAFF') && !actor.roles.includes('SELLER_OWNER')) throw new AuthorizationError('Seller staff cannot update notification defaults.'); const result = await this.repository.replaceNotifications(input); await (prisma as any).auditLog.create({ data: { actorId: actor.userId, action: 'SELLER_NOTIFICATION_DEFAULTS_UPDATED', resource: 'SellerNotificationDefault', resourceId: input.sellerId, metadata: { sellerId: input.sellerId, preferenceCount: input.preferences.length } } }); return result; }
  private assertTenant(actor: { sellerId?: string | null; roles: string[] }, sellerId: string) { if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== sellerId) throw new AuthorizationError('Tenant isolation violation: seller defaults belong to another seller.'); }
}
