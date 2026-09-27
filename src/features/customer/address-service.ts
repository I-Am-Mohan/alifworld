import { prisma } from '@/shared/database/prisma';
import { CustomerAddressRepository } from './address-repository';
import { CustomerAddressInput, validateAddressHierarchy } from './addresses';

export class CustomerAddressService {
  constructor(private readonly repository = new CustomerAddressRepository()) {}

  async list(userId: string) {
    return this.repository.listByUser(userId);
  }

  async getById(userId: string, id: string) {
    return this.repository.findById(userId, id);
  }

  async create(userId: string, rawInput: CustomerAddressInput) {
    const input = validateAddressHierarchy(rawInput);
    const address = await this.repository.create(userId, input);
    await (prisma as any).auditLog.create({
      data: {
        actorId: userId,
        action: 'CUSTOMER_ADDRESS_CREATE',
        resource: 'UserAddress',
        resourceId: address.id,
        metadata: {
          divisionCode: address.divisionCode,
          districtId: address.districtId,
          upazilaId: address.upazilaId,
          isDefault: address.isDefault,
        },
      },
    });
    return address;
  }

  async update(
    userId: string,
    id: string,
    expectedVersion: number,
    rawInput: Partial<CustomerAddressInput>
  ) {
    const address = await this.repository.update(userId, id, expectedVersion, rawInput);
    await (prisma as any).auditLog.create({
      data: {
        actorId: userId,
        action: 'CUSTOMER_ADDRESS_UPDATE',
        resource: 'UserAddress',
        resourceId: id,
        metadata: {
          version: address.version,
          isDefault: address.isDefault,
        },
      },
    });
    return address;
  }

  async setDefault(userId: string, id: string) {
    const address = await this.repository.setDefault(userId, id);
    await (prisma as any).auditLog.create({
      data: {
        actorId: userId,
        action: 'CUSTOMER_ADDRESS_SET_DEFAULT',
        resource: 'UserAddress',
        resourceId: id,
      },
    });
    return address;
  }

  async remove(userId: string, id: string) {
    const result = await this.repository.softDelete(userId, id);
    if (result.count > 0) {
      await (prisma as any).auditLog.create({
        data: {
          actorId: userId,
          action: 'CUSTOMER_ADDRESS_DELETE',
          resource: 'UserAddress',
          resourceId: id,
        },
      });
    }
    return result.count > 0;
  }
}
