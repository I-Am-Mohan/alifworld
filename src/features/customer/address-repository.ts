import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { CustomerAddressInput } from './addresses';

export class CustomerAddressRepository {
  async listByUser(userId: string) {
    return (prisma as any).userAddress.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: { division: true, district: true, upazila: true },
    });
  }

  async findById(userId: string, id: string) {
    return (prisma as any).userAddress.findFirst({
      where: { id, userId, deletedAt: null },
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

  async update(
    userId: string,
    id: string,
    expectedVersion: number,
    input: Partial<CustomerAddressInput>
  ) {
    const existing = await this.findById(userId, id);
    if (!existing) {
      throw new NotFoundError(`Customer address '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on address '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`,
        { addressId: id, currentVersion: existing.version, expectedVersion }
      );
    }

    return prisma.$transaction(async (tx: any) => {
      if (input.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId, deletedAt: null, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.userAddress.update({
        where: { id },
        data: {
          ...input,
          version: { increment: 1 },
        },
        include: { division: true, district: true, upazila: true },
      });
    });
  }

  async setDefault(userId: string, id: string) {
    const existing = await this.findById(userId, id);
    if (!existing) {
      throw new NotFoundError(`Customer address '${id}' not found.`);
    }

    return prisma.$transaction(async (tx: any) => {
      await tx.userAddress.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      });

      return tx.userAddress.update({
        where: { id },
        data: {
          isDefault: true,
          version: { increment: 1 },
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
