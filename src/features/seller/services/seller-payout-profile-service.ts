import { AuthorizationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { SellerPayoutProfileRepository } from '../repositories/seller-payout-profile-repository';
import type { PayoutProfileInput, SafePayoutProfile } from '../payout-profile';

export class SellerPayoutProfileService {
  constructor(private readonly repository = new SellerPayoutProfileRepository()) {}

  async getPrimary(actor: { userId: string; sellerId?: string | null; roles: string[] }, sellerId: string): Promise<SafePayoutProfile | null> {
    this.assertTenant(actor, sellerId);
    return this.repository.findPrimary(sellerId);
  }

  async replace(actor: { userId: string; sellerId?: string | null; roles: string[] }, input: PayoutProfileInput): Promise<SafePayoutProfile> {
    this.assertTenant(actor, input.sellerId);
    if (actor.roles.includes('SELLER_STAFF') && !actor.roles.includes('SELLER_OWNER')) throw new AuthorizationError('Seller staff cannot modify payout profiles.');
    const result = await this.repository.replacePrimary(actor.userId, input);
    await (prisma as any).auditLog.create({ data: { actorId: actor.userId, action: 'SELLER_PAYOUT_PROFILE_REPLACED', resource: 'SellerPayoutProfile', resourceId: result.id, metadata: { sellerId: input.sellerId, providerName: result.providerName, accountLast4: result.accountLast4 } } });
    return result;
  }

  async deactivate(actor: { userId: string; sellerId?: string | null; roles: string[] }, sellerId: string, profileId: string, version: number): Promise<void> {
    this.assertTenant(actor, sellerId);
    if (actor.roles.includes('SELLER_STAFF') && !actor.roles.includes('SELLER_OWNER')) throw new AuthorizationError('Seller staff cannot modify payout profiles.');
    await this.repository.deactivate(sellerId, profileId, version, actor.userId);
    await (prisma as any).auditLog.create({ data: { actorId: actor.userId, action: 'SELLER_PAYOUT_PROFILE_DEACTIVATED', resource: 'SellerPayoutProfile', resourceId: profileId, metadata: { sellerId } } });
  }

  private assertTenant(actor: { sellerId?: string | null; roles: string[] }, sellerId: string): void {
    if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== sellerId) throw new AuthorizationError('Tenant isolation violation: payout profile belongs to another seller.');
  }
}
