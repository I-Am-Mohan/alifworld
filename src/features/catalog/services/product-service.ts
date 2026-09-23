/**
 * AlifWorld Product Catalog Domain Service
 * 
 * Orchestrates merchant product lifecycle, tenant isolation, price/points integrity,
 * variant matrices, media galleries, publication readiness checks, and slug SEO redirects.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0001, ADR-0003, ADR-0005, ADR-0016, ADR-0022, ADR-0025
 */

import { ProductRepository } from '../repositories/product-repository';
import { ProductVariantRepository } from '../repositories/product-variant-repository';
import { ProductMediaRepository } from '../repositories/product-media-repository';
import { CategoryRepository } from '../repositories/category-repository';
import { SellerRepository } from '@/features/seller/repositories/seller-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { ConflictError, NotFoundError, AuthorizationError, ValidationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { ProductModel, ProductStatus } from '../types';
import { CreateProductInput, UpdateProductInput } from '../validators';
import { SystemRoleCode } from '@/features/identity/types';
import { IdentifierPolicyService } from './identifier-policy-service';

export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository = new ProductRepository(),
    private readonly variantRepo: ProductVariantRepository = new ProductVariantRepository(),
    private readonly mediaRepo: ProductMediaRepository = new ProductMediaRepository(),
    private readonly categoryRepo: CategoryRepository = new CategoryRepository(),
    private readonly sellerRepo: SellerRepository = new SellerRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
    private readonly identifierPolicy: IdentifierPolicyService = new IdentifierPolicyService()
  ) {}

  /**
   * Registers a new product draft scoped to a merchant tenant.
   */
  public async createProduct(actorUserId: string, input: CreateProductInput): Promise<ProductModel> {
    await this.assertSellerTenantAccess(actorUserId, input.sellerId);

    if (input.currency !== 'BDT') throw new ValidationError('Product currency must be BDT.');
    if (!Number.isSafeInteger(input.basePricePoisha) || input.basePricePoisha <= 0) throw new ValidationError('Product price must be a positive integer number of poisha.');
    if (!Number.isSafeInteger(input.productPoint) || input.productPoint < 0) throw new ValidationError('Seller-defined Product Point must be a non-negative integer.');

    // Verify category exists and is active
    const category = await this.categoryRepo.findById(input.categoryId);
    if (!category || !category.isActive) {
      throw new ValidationError(`Category with id '${input.categoryId}' is invalid or inactive.`);
    }

    // Check slug uniqueness
    const existingSlug = await this.productRepo.findBySlug(input.slug);
    if (existingSlug.product) {
      throw new ConflictError(`Product slug '${input.slug}' is already taken. Please choose another title or URL handle.`);
    }

    await this.identifierPolicy.assertAvailable({ sku: input.sku || undefined, barcode: input.barcode || undefined });

    // Create root product record
    const product = await this.productRepo.create({
      sellerId: input.sellerId,
      categoryId: input.categoryId,
      brandId: input.brandId,
      title: input.title,
      titleBn: input.titleBn,
      slug: input.slug,
      description: input.description,
      descriptionBn: input.descriptionBn,
      status: ProductStatus.DRAFT,
      basePricePoisha: input.basePricePoisha,
      compareAtPricePoisha: input.compareAtPricePoisha,
      currency: input.currency,
      productPoint: input.productPoint,
      sku: input.sku,
      barcode: input.barcode,
      isPhysical: input.isPhysical,
      weightGrams: input.weightGrams,
      lengthMm: input.lengthMm,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      shippingClass: input.shippingClass,
      requiresShipping: input.requiresShipping,
      warranty: input.warranty,
      tags: input.tags,
      taxRatePercent: input.taxRatePercent,
    });

    // Create nested variants if provided
    if (input.variants && input.variants.length > 0) {
      for (const variant of input.variants) {
        await this.variantRepo.create(product.id, variant);
      }
    }

    // Create nested media assets if provided
    if (input.media && input.media.length > 0) {
      for (const media of input.media) {
        await this.mediaRepo.create(product.id, media);
      }
    }

    // Publish transactional outbox event
    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'PRODUCT_CREATED',
        aggregateType: 'Product',
        aggregateId: product.id,
        payload: {
          productId: product.id,
          sellerId: product.sellerId,
          slug: product.slug,
          basePricePoisha: product.basePricePoisha,
          productPoint: product.productPoint,
        },
      },
    });

    // Write audit log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'PRODUCT_CREATE',
        resource: 'Product',
        resourceId: product.id,
        metadata: {
          sellerId: product.sellerId,
          title: product.title,
          slug: product.slug,
        },
      },
    });

    return (await this.productRepo.findById(product.id))!;
  }

  /**
   * Updates an existing product with slug redirection history and OCC protection.
   */
  public async updateProduct(
    actorUserId: string,
    id: string,
    expectedVersion: number,
    input: UpdateProductInput
  ): Promise<ProductModel> {
    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Product with id '${id}' not found.`);
    }

    await this.assertSellerTenantAccess(actorUserId, existing.sellerId);

    if (input.categoryId) {
      const category = await this.categoryRepo.findById(input.categoryId);
      if (!category || !category.isActive) throw new ValidationError('Product must use an active category.');
    }
    if (input.brandId) {
      const brand = await (prisma as any).brand.findFirst({ where: { id: input.brandId, deletedAt: null } });
      if (!brand || !brand.isActive || brand.approvalStatus !== 'APPROVED') throw new ValidationError('Product brand must be active and approved.');
    }
    if (input.currency && input.currency !== 'BDT') throw new ValidationError('Product currency must be BDT.');
    if (input.basePricePoisha !== undefined && (!Number.isSafeInteger(input.basePricePoisha) || input.basePricePoisha <= 0)) throw new ValidationError('Product price must be a positive integer number of poisha.');
    if (input.productPoint !== undefined && (!Number.isSafeInteger(input.productPoint) || input.productPoint < 0)) throw new ValidationError('Seller-defined Product Point must be a non-negative integer.');

    if (input.sku !== undefined || input.barcode !== undefined) {
      await this.identifierPolicy.assertAvailable({ sku: input.sku || undefined, barcode: input.barcode || undefined, excludeProductId: id });
    }

    // Handle slug change: record slug history for 301 redirects
    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await this.productRepo.findBySlug(input.slug);
      if (slugConflict.product && slugConflict.product.id !== id) {
        throw new ConflictError(`Product slug '${input.slug}' is already in use.`);
      }

      await this.productRepo.recordSlugHistory(id, existing.slug);
    }

    const updated = await this.productRepo.update(id, expectedVersion, input as any);

    // Emit transactional outbox event
    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'PRODUCT_UPDATED',
        aggregateType: 'Product',
        aggregateId: updated.id,
        payload: {
          productId: updated.id,
          sellerId: updated.sellerId,
          version: updated.version,
        },
      },
    });

    // Write audit log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'PRODUCT_UPDATE',
        resource: 'Product',
        resourceId: updated.id,
        metadata: {
          sellerId: updated.sellerId,
          version: updated.version,
        },
      },
    });

    return updated;
  }

  /**
   * Verifies publication readiness checklist and transitions product to PUBLISHED.
   * Checklist:
   * 1. Category is verified and active
   * 2. BDT base price > 0 poisha
   * 3. Discrete Product Points >= 0
   * 4. At least one image media asset is present
   * 5. Seller is verified
   */
  public async publishProduct(
    actorUserId: string,
    id: string,
    expectedVersion: number
  ): Promise<ProductModel> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with id '${id}' not found.`);
    }

    await this.assertSellerTenantAccess(actorUserId, product.sellerId);

    // Check Seller Verification
    const seller = await this.sellerRepo.findById(product.sellerId);
    if (!seller) {
      throw new NotFoundError('Seller tenant not found.');
    }
    if (seller.status === 'SUSPENDED') {
      throw new ValidationError('Cannot publish products while merchant account is suspended.');
    }

    // Publication Readiness Checklist:
    if (!product.category || !product.category.isActive) {
      throw new ValidationError('Publication failed: Product must be assigned to an active category.');
    }

    if (product.currency !== 'BDT') {
      throw new ValidationError('Publication failed: Product currency must be BDT.');
    }

    if (Number(product.basePricePoisha) <= 0) {
      throw new ValidationError('Publication failed: Product price must be greater than 0 poisha.');
    }

    if (product.productPoint < 0) {
      throw new ValidationError('Publication failed: Product Point must be a non-negative integer.');
    }

    const media = await this.mediaRepo.findByProductId(id);
    if (media.length === 0) {
      throw new ValidationError('Publication failed: Product must have at least one gallery image before publishing.');
    }

    const updated = await this.productRepo.update(id, expectedVersion, {
      status: ProductStatus.PUBLISHED,
    });

    // Emit outbox event
    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'PRODUCT_PUBLISHED',
        aggregateType: 'Product',
        aggregateId: updated.id,
        payload: {
          productId: updated.id,
          sellerId: updated.sellerId,
          slug: updated.slug,
        },
      },
    });

    // Write audit log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'PRODUCT_PUBLISH',
        resource: 'Product',
        resourceId: updated.id,
        metadata: {
          sellerId: updated.sellerId,
          status: updated.status,
        },
      },
    });

    return updated;
  }

  /**
   * Archives a product (removes it from active storefront discovery).
   */
  public async archiveProduct(
    actorUserId: string,
    id: string,
    expectedVersion: number
  ): Promise<ProductModel> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with id '${id}' not found.`);
    }

    await this.assertSellerTenantAccess(actorUserId, product.sellerId);

    const updated = await this.productRepo.update(id, expectedVersion, {
      status: ProductStatus.ARCHIVED,
    });

    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'PRODUCT_ARCHIVED',
        aggregateType: 'Product',
        aggregateId: updated.id,
        payload: {
          productId: updated.id,
          sellerId: updated.sellerId,
        },
      },
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'PRODUCT_ARCHIVE',
        resource: 'Product',
        resourceId: updated.id,
        metadata: {
          sellerId: updated.sellerId,
          status: updated.status,
        },
      },
    });

    return updated;
  }

  public async getProductById(id: string): Promise<ProductModel | null> {
    return this.productRepo.findById(id);
  }

  public async getProductBySlug(slug: string): Promise<{ product: ProductModel | null; redirectedFrom?: string }> {
    return this.productRepo.findBySlug(slug);
  }

  public async listProducts(options: {
    sellerId?: string;
    categoryId?: string;
    brandId?: string;
    status?: ProductStatus;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ items: ProductModel[]; total: number }> {
    return this.productRepo.findMany(options);
  }

  /**
   * Enforces multi-tenant isolation: caller must be seller owner, authorized staff, or admin.
   */
  private async assertSellerTenantAccess(userId: string, sellerId: string): Promise<void> {
    const seller = await this.sellerRepo.findById(sellerId);
    if (!seller) {
      throw new NotFoundError(`Seller with id '${sellerId}' not found.`);
    }

    const isOwner = seller.ownerUserId === userId;
    const isStaff = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.SELLER_STAFF, sellerId);
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.SUPER_ADMIN);
    const isAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.ADMIN);

    if (!isOwner && !isStaff && !isSuperAdmin && !isAdmin) {
      throw new AuthorizationError('You are not authorized to manage products for this merchant storefront.');
    }
  }
}
