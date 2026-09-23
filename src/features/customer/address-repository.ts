import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { CustomerAddressInput } from './addresses';

export class CustomerAddressRepository {
  async listByUser(userId: string) {
    return (prisma as any).userAddress.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: { division: true, district: true, upazila: true },
    });
  }

  async create(userId: string, input: CustomerAddressInput) {
    return prisma.$transaction(async (tx: any) => {
      if (input.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId, deletedAt: null },
          data: { isDefault: false },
        });
      }

      return tx.userAddress.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.ADDRESS),
          userId,
          ...input,
          version: 1,
        },
        include: { division: true, district: true, upazila: true },
      });
    });
  }

  async softDelete(userId: string, id: string) {
    return (prisma as any).userAddress.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date(), deletedBy: userId, version: { increment: 1 } },
    });
  }
}
