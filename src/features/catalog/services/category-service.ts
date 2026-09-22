/**
 * AlifWorld Category Taxonomy Service
 * 
 * Orchestrates category creation, hierarchical nesting, slug conflict validation,
 * and NBR VAT rate assignments.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0025
 */

import { CategoryRepository } from '../repositories/category-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { ConflictError, NotFoundError, AuthorizationError, ValidationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { CategoryModel } from '../types';
import { CreateCategoryInput, UpdateCategoryInput } from '../validators';
import { SystemRoleCode } from '@/features/identity/types';

export class CategoryService {
  constructor(
    private readonly categoryRepo: CategoryRepository = new CategoryRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()
  ) {}

  public async createCategory(adminUserId: string, input: CreateCategoryInput): Promise<CategoryModel> {
    await this.assertAdminAccess(adminUserId);

    const existingSlug = await this.categoryRepo.findBySlug(input.slug);
    if (existingSlug) {
      throw new ConflictError(`Category slug '${input.slug}' is already in use.`, { slug: input.slug });
    }

    if (input.parentId) {
      const parent = await this.categoryRepo.findById(input.parentId);
      if (!parent) {
        throw new NotFoundError(`Parent category with id '${input.parentId}' not found.`);
      }
    }

    const category = await this.categoryRepo.create({
      name: input.name,
      nameBn: input.nameBn,
      slug: input.slug,
      description: input.description,
      parentId: input.parentId,
      imageUrl: input.imageUrl,
      icon: input.icon,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      taxRatePercent: input.taxRatePercent,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'CATEGORY_CREATE',
        resource: 'Category',
        resourceId: category.id,
        metadata: {
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          taxRatePercent: category.taxRatePercent,
        },
      },
    });

    return category;
  }

  public async updateCategory(
    adminUserId: string,
    id: string,
    expectedVersion: number,
    input: UpdateCategoryInput
  ): Promise<CategoryModel> {
    await this.assertAdminAccess(adminUserId);

    if (input.slug) {
      const existingSlug = await this.categoryRepo.findBySlug(input.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictError(`Category slug '${input.slug}' is already taken.`);
      }
    }

    if (input.parentId) {
      if (input.parentId === id) {
        throw new ValidationError('A category cannot be its own parent.');
      }
      const parent = await this.categoryRepo.findById(input.parentId);
      if (!parent) {
        throw new NotFoundError(`Parent category with id '${input.parentId}' not found.`);
      }
    }

    const updated = await this.categoryRepo.update(id, expectedVersion, input);

    await (prisma as any).auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'CATEGORY_UPDATE',
        resource: 'Category',
        resourceId: updated.id,
        metadata: {
          name: updated.name,
          version: updated.version,
        },
      },
    });

    return updated;
  }

  public async getHierarchy(): Promise<CategoryModel[]> {
    // Returns top-level categories with populated children
    return this.categoryRepo.findAll({ parentId: null, isActive: true });
  }

  public async getBySlug(slug: string): Promise<CategoryModel | null> {
    return this.categoryRepo.findBySlug(slug);
  }

  private async assertAdminAccess(userId: string): Promise<void> {
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.SUPER_ADMIN);
    const isAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.ADMIN);

    if (!isSuperAdmin && !isAdmin) {
      throw new AuthorizationError('Only system administrators can manage the category taxonomy.');
    }
  }
}
