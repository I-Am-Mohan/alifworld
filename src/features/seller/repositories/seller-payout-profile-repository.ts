import { prisma } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { encryptPayoutSecret, lastFour, payoutFingerprint } from '../payout-profile-crypto';
import type { PayoutProfileInput, SafePayoutProfile } from '../payout-profile';

export class SellerPayoutProfileRepository {
  private readonly db = prisma as any;

  private safe(record: any): SafePayoutProfile {
    return {
      id: record.id,
      sellerId: record.sellerId,
      method: record.method,
      providerName: record.providerName,
      accountLast4: record.accountLast4,
      routingLast4: record.routingLast4,
      displayAccount: `••••••••${record.accountLast4}`,
      status: record.status,
      isPrimary: record.isPrimary,
      version: record.version,
      verifiedAt: record.verifiedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async findPrimary(sellerId: string): Promise<SafePayoutProfile | null> {
    const record = await this.db.sellerPayoutProfile.findFirst({ where: { sellerId, isPrimary: true, deletedAt: null } });
    return record ? this.safe(record) : null;
  }

  async replacePrimary(actorUserId: string, input: PayoutProfileInput): Promise<SafePayoutProfile> {
    const current = await this.db.sellerPayoutProfile.findFirst({ where: { sellerId: input.sellerId, isPrimary: true, deletedAt: null } });
    if (current && current.version !== input.version) throw new ConflictError('Payout profile was modified by another request.', { expectedVersion: input.version, actualVersion: current.version });
    const fingerprint = payoutFingerprint(input.accountNumber);
    const duplicate = await this.db.sellerPayoutProfile.findFirst({ where: { sellerId: input.sellerId, accountFingerprint: fingerprint, deletedAt: null, ...(current ? { id: { not: current.id } } : {}) } });
    if (duplicate) throw new ConflictError('This payout account is already registered for the seller.');

    const record = await this.db.$transaction(async (tx: any) => {
      if (current) {
        await tx.sellerPayoutProfile.update({ where: { id: current.id }, data: { isPrimary: false, deletedAt: new Date(), deletedBy: actorUserId, updatedBy: actorUserId, version: current.version + 1 } });
      }
      return tx.sellerPayoutProfile.create({ data: {
        id: generateId(ID_PREFIXES.PAYOUT_PROFILE), sellerId: input.sellerId, providerName: input.providerName, encryptedAccountReference: encryptPayoutSecret(input.accountNumber), encryptedRoutingReference: input.routingNumber ? encryptPayoutSecret(input.routingNumber) : null, encryptedAccountTitle: encryptPayoutSecret(input.accountTitle), accountFingerprint: fingerprint, accountLast4: lastFour(input.accountNumber), routingLast4: input.routingNumber ? lastFour(input.routingNumber) : null, status: 'PENDING_VERIFICATION', isPrimary: true, version: 1, createdBy: actorUserId, updatedBy: actorUserId,
      } });
    });
    return this.safe(record);
  }

  async deactivate(sellerId: string, profileId: string, expectedVersion: number, actorUserId: string): Promise<void> {
    const current = await this.db.sellerPayoutProfile.findFirst({ where: { id: profileId, sellerId, isPrimary: true, deletedAt: null } });
    if (!current) throw new NotFoundError('Payout profile not found.');
    if (current.version !== expectedVersion) throw new ConflictError('Payout profile was modified by another request.');
    await this.db.sellerPayoutProfile.update({ where: { id: profileId }, data: { isPrimary: false, deletedAt: new Date(), deletedBy: actorUserId, updatedBy: actorUserId, version: expectedVersion + 1 } });
  }
}
