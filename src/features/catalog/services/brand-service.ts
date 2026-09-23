/**
 * AlifWorld Brand Registry Service
 * 
 * Orchestrates brand creation, trademark approvals, and registry governance.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0025
 */

import { BrandRepository } from '../repositories/brand-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { ConflictError, NotFoundError, AuthorizationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { BrandModel } from '../types';
import { CreateBrandInput, UpdateBrandInput } from '../validators';
import { SystemRoleCode } from '@/features/identity/types';

export class BrandService {
  constructor(
    private readonly brandRepo: BrandRepository = new BrandRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()
  ) {}

  public async createBrand(adminUserId: string, input: CreateBrandInput): Promise<BrandModel> {
    await this.assertAdminAccess(adminUserId);

    const existingSlug = await this.brandRepo.findBySlug(input.slug);
    if (existingSlug) {
      throw new ConflictError(`Brand slug '${input.slug}' is already registered.`, { slug: input.slug });
    }

    const brand = await this.brandRepo.create({
      name: input.name,
      slug: input.slug,
      logoUrl: input.logoUrl,
      website: input.website,
      isVerified: input.isVerified,
      isActive: input.isActive,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'BRAND_CREATE',
        resource: 'Brand',
        resourceId: brand.id,
        metadata: {
          name: brand.name,
          slug: brand.slug,
        },
      },
    });

    return brand;
  }

  public async updateBrand(
    adminUserId: string,
    id: string,
    expectedVersion: number,
    input: UpdateBrandInput
  ): Promise<BrandModel> {
    await this.assertAdminAccess(adminUserId);

    if (input.slug) {
      const existingSlug = await this.brandRepo.findBySlug(input.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictError(`Brand slug '${input.slug}' is already taken.`);
      }
    }

    const updated = await this.brandRepo.update(id, expectedVersion, input);

    await (prisma as any).auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'BRAND_UPDATE',
        resource: 'Brand',
        resourceId: updated.id,
        metadata: {
          name: updated.name,
          version: updated.version,
        },
      },
    });

    return updated;
  }

  public async approveBrand(adminUserId: string, id: string, expectedVersion: number): Promise<BrandModel> {
    await this.assertAdminAccess(adminUserId);
    const updated = await this.brandRepo.update(id, expectedVersion, { isVerified: true, approvalStatus: 'APPROVED', rejectionReason: null, reviewedBy: adminUserId, reviewedAt: new Date(), isActive: true });
    await (prisma as any).auditLog.create({ data: { actorId: adminUserId, action: 'BRAND_APPROVED', resource: 'Brand', resourceId: id, metadata: { status: 'APPROVED' } } });
    return updated;
  }

  public async rejectBrand(adminUserId: string, id: string, expectedVersion: number, reason: string): Promise<BrandModel> {
    await this.assertAdminAccess(adminUserId);
    if (!reason || reason.trim().length < 5) throw new ConflictError('A descriptive rejection reason is required.');
    const updated = await this.brandRepo.update(id, expectedVersion, { isVerified: false, approvalStatus: 'REJECTED', rejectionReason: reason.trim(), reviewedBy: adminUserId, reviewedAt: new Date() });
    await (prisma as any).auditLog.create({ data: { actorId: adminUserId, action: 'BRAND_REJECTED', resource: 'Brand', resourceId: id, metadata: { status: 'REJECTED', reason: reason.trim() } } });
    return updated;
  }

  public async getAll(): Promise<BrandModel[]> {
    return this.brandRepo.findAll({ isActive: true, isVerified: true });
  }

  public async getAdminAll(): Promise<BrandModel[]> {
    return this.brandRepo.findAll({ isActive: true });
  }

  public async getBySlug(slug: string): Promise<BrandModel | null> {
    return this.brandRepo.findBySlug(slug);
  }

  private async assertAdminAccess(userId: string): Promise<void> {
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.SUPER_ADMIN);
    const isAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.ADMIN);

    if (!isSuperAdmin && !isAdmin) {
      throw new AuthorizationError('Only system administrators can manage the brand registry.');
    }
  }
}
