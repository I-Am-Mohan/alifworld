import { describe, expect, it, beforeEach } from 'bun:test';
import { CustomerAddressService } from '@/features/customer/address-service';
import { CustomerAddressRepository } from '@/features/customer/address-repository';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';

class MockAddressRepository extends CustomerAddressRepository {
  public addresses: any[] = [];

  public async listByUser(userId: string) {
    return this.addresses
      .filter((a) => a.userId === userId && a.deletedAt === null)
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  public async findById(userId: string, id: string) {
    return (
      this.addresses.find((a) => a.id === id && a.userId === userId && a.deletedAt === null) ||
      null
    );
  }

  public async create(userId: string, input: any) {
    if (input.isDefault) {
      for (const a of this.addresses) {
        if (a.userId === userId && a.deletedAt === null) {
          a.isDefault = false;
        }
      }
    }

    const newAddr = {
      id: `addr_${this.addresses.length + 1}`,
      userId,
      ...input,
      version: 1,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.addresses.push(newAddr);
    return newAddr;
  }

  public async update(userId: string, id: string, expectedVersion: number, input: any) {
    const existing = await this.findById(userId, id);
    if (!existing) throw new NotFoundError('Address not found');

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `OCC conflict on address '${id}'. Expected ${expectedVersion}, found ${existing.version}.`
      );
    }

    if (input.isDefault) {
      for (const a of this.addresses) {
        if (a.userId === userId && a.deletedAt === null && a.id !== id) {
          a.isDefault = false;
        }
      }
    }

    const updated = {
      ...existing,
      ...input,
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    const idx = this.addresses.findIndex((a) => a.id === id);
    this.addresses[idx] = updated;
    return updated;
  }

  public async setDefault(userId: string, id: string) {
    const existing = await this.findById(userId, id);
    if (!existing) throw new NotFoundError('Address not found');

    for (const a of this.addresses) {
      if (a.userId === userId && a.deletedAt === null) {
        a.isDefault = a.id === id;
      }
    }

    existing.isDefault = true;
    existing.version++;
    return existing;
  }

  public async softDelete(userId: string, id: string) {
    const existing = await this.findById(userId, id);
    if (!existing) return { count: 0 };
    existing.deletedAt = new Date();
    existing.version++;
    return { count: 1 };
  }
}

describe('Milestone 122: Customer Address Book Unit Tests', () => {
  let mockRepo: MockAddressRepository;
  let service: CustomerAddressService;

  beforeEach(() => {
    mockRepo = new MockAddressRepository();
    // Pre-seed an initial default address
    mockRepo.addresses.push({
      id: 'addr_default_01',
      userId: 'usr_customer_01',
      label: 'Home',
      recipientName: 'Rahim Ahmed',
      recipientPhone: '+8801711223344',
      divisionCode: 'DHAKA',
      districtId: 'dhaka',
      upazilaId: 'gulshan',
      addressLine: 'House 42, Road 11, Banani',
      postalCode: '1213',
      isDefault: true,
      version: 1,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    service = new CustomerAddressService(mockRepo);
  });

  describe('1. Address Listing & Retrieval', () => {
    it('lists non-deleted addresses for user with default address first', async () => {
      // Add a non-default address
      await service.create('usr_customer_01', {
        label: 'Office',
        recipientName: 'Rahim Ahmed',
        recipientPhone: '+8801711223344',
        divisionCode: 'DHAKA',
        districtId: 'dhaka',
        addressLine: 'Motijheel C/A',
        isDefault: false,
      });

      const list = await service.list('usr_customer_01');
      expect(list.length).toBe(2);
      expect(list[0].isDefault).toBe(true);
      expect(list[1].isDefault).toBe(false);
    });

    it('retrieves single address by ID', async () => {
      const addr = await service.getById('usr_customer_01', 'addr_default_01');
      expect(addr).not.toBeNull();
      expect(addr?.label).toBe('Home');
    });

    it('returns null when querying address belonging to another customer', async () => {
      const addr = await service.getById('usr_other_customer_99', 'addr_default_01');
      expect(addr).toBeNull();
    });
  });

  describe('2. Address Creation & Single Default Invariant', () => {
    it('resets previous default address when a new address is created as default', async () => {
      const newDefault = await service.create('usr_customer_01', {
        label: 'New Residence',
        recipientName: 'Rahim Ahmed',
        recipientPhone: '+8801711223344',
        divisionCode: 'DHAKA',
        districtId: 'dhaka',
        addressLine: 'Uttara Sector 4',
        isDefault: true,
      });

      expect(newDefault.isDefault).toBe(true);

      const oldDefault = await service.getById('usr_customer_01', 'addr_default_01');
      expect(oldDefault?.isDefault).toBe(false); // Invariant enforced!
    });
  });

  describe('3. Address Updates & Optimistic Concurrency Control', () => {
    it('updates address attributes when version matches expected version', async () => {
      const updated = await service.update('usr_customer_01', 'addr_default_01', 1, {
        label: 'Main Family Home',
        addressLine: 'House 55, Road 12, Banani',
      });

      expect(updated.label).toBe('Main Family Home');
      expect(updated.addressLine).toBe('House 55, Road 12, Banani');
      expect(updated.version).toBe(2);
    });

    it('rejects update with ConflictError on version mismatch', async () => {
      expect(
        service.update('usr_customer_01', 'addr_default_01', 99, {
          label: 'Conflicting Edit',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('4. Setting Default Address', () => {
    it('atomically sets target address as default and unsets others', async () => {
      const secondAddr = await service.create('usr_customer_01', {
        label: 'Dhanmondi Flat',
        recipientName: 'Rahim Ahmed',
        recipientPhone: '+8801711223344',
        divisionCode: 'DHAKA',
        districtId: 'dhaka',
        addressLine: 'Road 27, Dhanmondi',
        isDefault: false,
      });

      await service.setDefault('usr_customer_01', secondAddr.id);

      const updatedSecond = await service.getById('usr_customer_01', secondAddr.id);
      expect(updatedSecond?.isDefault).toBe(true);

      const first = await service.getById('usr_customer_01', 'addr_default_01');
      expect(first?.isDefault).toBe(false);
    });
  });

  describe('5. Soft Deletion (Preserving Historical Snapshots)', () => {
    it('soft-deletes address while preserving audit trail', async () => {
      const removed = await service.remove('usr_customer_01', 'addr_default_01');
      expect(removed).toBe(true);

      const deleted = await service.getById('usr_customer_01', 'addr_default_01');
      expect(deleted).toBeNull(); // Excluded from active queries

      expect(mockRepo.addresses[0].deletedAt).not.toBeNull(); // Row preserved in DB
    });
  });
});
