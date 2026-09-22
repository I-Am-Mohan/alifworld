/**
 * AlifWorld Warehouse Service
 * 
 * Domain service managing warehouses across Bangladesh divisions, platform fulfillment hubs,
 * and seller-affiliated logistics centers with multi-tenant isolation.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0026
 */

import { WarehouseRepository } from '../repositories/warehouse-repository';
import { CreateWarehouseSchema, UpdateWarehouseSchema, CreateWarehouseInput, UpdateWarehouseInput } from '../validators';
import { WarehouseModel } from '../types';
import { AuthorizationError, ConflictError, NotFoundError } from '@/shared/errors/app-error';

export interface ActorContext {
  sellerId?: string | null;
  isAdmin?: boolean;
  userId?: string;
}

export class WarehouseService {
  constructor(private readonly warehouseRepo: WarehouseRepository = new WarehouseRepository()) {}

  public async createWarehouse(input: CreateWarehouseInput, actor?: ActorContext): Promise<WarehouseModel> {
    const validated = CreateWarehouseSchema.parse(input);

    // Multi-tenant check
    if (actor && !actor.isAdmin) {
      if (!actor.sellerId) {
        throw new AuthorizationError('Only authorized sellers or platform administrators can create warehouses.');
      }
      if (validated.isPlatformHub) {
        throw new AuthorizationError('Sellers cannot create platform fulfillment hubs.');
      }
      if (validated.sellerId && validated.sellerId !== actor.sellerId) {
        throw new AuthorizationError('Cannot create warehouse for another seller.');
      }
      validated.sellerId = actor.sellerId;
    }

    // Check code uniqueness
    const existingCode = await this.warehouseRepo.findByCode(validated.code);
    if (existingCode) {
      throw new ConflictError(`Warehouse code '${validated.code}' already exists.`);
    }

    return this.warehouseRepo.create(validated);
  }

  public async updateWarehouse(
    id: string,
    input: UpdateWarehouseInput,
    actor?: ActorContext
  ): Promise<WarehouseModel> {
    const validated = UpdateWarehouseSchema.parse(input);
    const existing = await this.warehouseRepo.findById(id);

    if (!existing) {
      throw new NotFoundError(`Warehouse with id '${id}' not found.`);
    }

    // Multi-tenant check
    if (actor && !actor.isAdmin) {
      if (!actor.sellerId || existing.sellerId !== actor.sellerId) {
        throw new AuthorizationError('Unauthorized to update this warehouse.');
      }
      if (validated.isPlatformHub) {
        throw new AuthorizationError('Sellers cannot designate platform hubs.');
      }
    }

    // Check code uniqueness if changing code
    if (validated.code && validated.code !== existing.code) {
      const existingCode = await this.warehouseRepo.findByCode(validated.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictError(`Warehouse code '${validated.code}' already exists.`);
      }
    }

    return this.warehouseRepo.update(id, validated.version, validated);
  }

  public async getWarehouse(id: string, actor?: ActorContext): Promise<WarehouseModel> {
    const warehouse = await this.warehouseRepo.findById(id);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse with id '${id}' not found.`);
    }

    if (actor && !actor.isAdmin && actor.sellerId) {
      if (warehouse.sellerId && warehouse.sellerId !== actor.sellerId && !warehouse.isPlatformHub) {
        throw new AuthorizationError('Unauthorized to access this warehouse.');
      }
    }

    return warehouse;
  }

  public async listWarehouses(
    options?: {
      sellerId?: string;
      division?: string;
      isPlatformHub?: boolean;
      isActive?: boolean;
    },
    actor?: ActorContext
  ): Promise<WarehouseModel[]> {
    const filter = { ...options };

    if (actor && !actor.isAdmin && actor.sellerId) {
      // Sellers can see their own warehouses or platform fulfillment hubs
      filter.sellerId = actor.sellerId;
    }

    return this.warehouseRepo.findMany(filter);
  }

  public async deleteWarehouse(id: string, actor: ActorContext): Promise<void> {
    const existing = await this.warehouseRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Warehouse with id '${id}' not found.`);
    }

    if (!actor.isAdmin && (!actor.sellerId || existing.sellerId !== actor.sellerId)) {
      throw new AuthorizationError('Unauthorized to delete this warehouse.');
    }

    await this.warehouseRepo.softDelete(id, existing.version, actor.userId ?? actor.sellerId ?? 'system');
  }
}
