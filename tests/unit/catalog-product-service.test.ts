import { describe, expect, it, mock } from 'bun:test';
import { ProductService } from '@/features/catalog/services/product-service';
import { ProductStatus } from '@/features/catalog/types';
import { AuthorizationError, ConflictError, ValidationError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';

describe('ProductService: Catalog Management & Tenant Isolation', () => {
  const mockSeller = {
    id: 'sel_dhaka_tech_01',
    name: 'Dhaka Tech Electronics',
    ownerUserId: 'usr_owner_01',
    status: 'ACTIVE',
    isVerified: true,
  };

  const mockCategory = {
    id: 'cat_smartphones_01',
    name: 'Smartphones & Tablets',
    slug: 'smartphones-tablets',
    isActive: true,
    taxRatePercent: 5.0,
    version: 1,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: 'prd_walton_01',
    sellerId: 'sel_dhaka_tech_01',
    categoryId: 'cat_smartphones_01',
    title: 'Walton Primo S8 Pro',
    slug: 'walton-primo-s8-pro',
    description: 'High performance smartphone',
    status: ProductStatus.DRAFT,
    basePricePoisha: 2199000,
    compareAtPricePoisha: 2499000,
    currency: 'BDT',
    productPoint: 450,
    tags: ['smartphone'],
    isPhysical: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: mockCategory,
  };

  it('creates product draft with outbox event and audit log', async () => {
    let outboxCreated = false;
    let auditCreated = false;

    const mockProductRepo: any = {
      findBySlug: mock(async () => ({ product: null })),
      findById: mock(async () => mockProduct),
      create: mock(async (data: any) => ({ ...mockProduct, ...data })),
    };

    const mockVariantRepo: any = {
      create: mock(async () => {}),
    };

    const mockMediaRepo: any = {
      create: mock(async () => {}),
    };

    const mockCategoryRepo: any = {
      findById: mock(async () => mockCategory),
    };

    const mockSellerRepo: any = {
      findById: mock(async () => mockSeller),
    };

    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    (prisma as any).outboxEvent = {
      create: mock(async () => {
        outboxCreated = true;
        return { id: 'evt_01' };
      }),
    };

    (prisma as any).auditLog = {
      create: mock(async () => {
        auditCreated = true;
        return { id: 'aud_01' };
      }),
    };

    const service = new ProductService(
      mockProductRepo,
      mockVariantRepo,
      mockMediaRepo,
      mockCategoryRepo,
      mockSellerRepo,
      mockRoleRepo
    );

    const created = await service.createProduct('usr_owner_01', {
      sellerId: 'sel_dhaka_tech_01',
      categoryId: 'cat_smartphones_01',
      title: 'Walton Primo S8 Pro',
      slug: 'walton-primo-s8-pro',
      description: 'High performance smartphone',
      basePricePoisha: 2199000,
      productPoint: 450,
      currency: 'BDT',
      tags: ['smartphone'],
      isPhysical: true,
    });

    expect(created.id).toBe('prd_walton_01');
    expect(outboxCreated).toBe(true);
    expect(auditCreated).toBe(true);
  });

  it('rejects product creation when user does not belong to seller tenant', async () => {
    const mockProductRepo: any = {
      findBySlug: mock(async () => ({ product: null })),
    };
    const mockCategoryRepo: any = {
      findById: mock(async () => mockCategory),
    };
    const mockSellerRepo: any = {
      findById: mock(async () => mockSeller),
    };
    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    const service = new ProductService(
      mockProductRepo,
      {} as any,
      {} as any,
      mockCategoryRepo,
      mockSellerRepo,
      mockRoleRepo
    );

    expect(
      service.createProduct('usr_intruder_99', {
        sellerId: 'sel_dhaka_tech_01',
        categoryId: 'cat_smartphones_01',
        title: 'Unauthorized Product',
        slug: 'unauthorized-product',
        description: 'Should fail authorization check',
        basePricePoisha: 10000,
        productPoint: 0,
        currency: 'BDT',
        tags: [],
        isPhysical: true,
      })
    ).rejects.toThrow(AuthorizationError);
  });

  it('records slug history when product slug is updated', async () => {
    let recordedOldSlug = '';
    const mockProductRepo: any = {
      findById: mock(async () => mockProduct),
      findBySlug: mock(async (slug: string) => ({ product: null })),
      recordSlugHistory: mock(async (_id: string, oldSlug: string) => {
        recordedOldSlug = oldSlug;
      }),
      update: mock(async (_id: string, _ver: number, data: any) => ({
        ...mockProduct,
        ...data,
        version: 2,
      })),
    };

    const mockSellerRepo: any = {
      findById: mock(async () => mockSeller),
    };

    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    (prisma as any).outboxEvent = { create: mock(async () => ({})) };
    (prisma as any).auditLog = { create: mock(async () => ({})) };

    const service = new ProductService(
      mockProductRepo,
      {} as any,
      {} as any,
      {} as any,
      mockSellerRepo,
      mockRoleRepo
    );

    await service.updateProduct('usr_owner_01', 'prd_walton_01', 1, {
      slug: 'walton-primo-s8-pro-2026',
    });

    expect(recordedOldSlug).toBe('walton-primo-s8-pro');
  });

  it('validates publication readiness: fails if product has no media gallery images', async () => {
    const mockProductRepo: any = {
      findById: mock(async () => mockProduct),
    };
    const mockMediaRepo: any = {
      findByProductId: mock(async () => []), // No media!
    };
    const mockSellerRepo: any = {
      findById: mock(async () => mockSeller),
    };
    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    const service = new ProductService(
      mockProductRepo,
      {} as any,
      mockMediaRepo,
      {} as any,
      mockSellerRepo,
      mockRoleRepo
    );

    expect(
      service.publishProduct('usr_owner_01', 'prd_walton_01', 1)
    ).rejects.toThrow(ValidationError);
  });

  it('successfully publishes product when all checklist items pass', async () => {
    let publishedStatus = '';
    let outboxEventType = '';

    const mockProductRepo: any = {
      findById: mock(async () => mockProduct),
      update: mock(async (_id: string, _ver: number, data: any) => {
        publishedStatus = data.status;
        return { ...mockProduct, status: data.status, version: 2 };
      }),
    };

    const mockMediaRepo: any = {
      findByProductId: mock(async () => [{ id: 'med_01', isPrimary: true }]),
    };

    const mockSellerRepo: any = {
      findById: mock(async () => mockSeller),
    };

    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    (prisma as any).outboxEvent = {
      create: mock(async (params: any) => {
        outboxEventType = params.data.eventType;
        return { id: 'evt_publish' };
      }),
    };
    (prisma as any).auditLog = { create: mock(async () => ({})) };

    const service = new ProductService(
      mockProductRepo,
      {} as any,
      mockMediaRepo,
      {} as any,
      mockSellerRepo,
      mockRoleRepo
    );

    const result = await service.publishProduct('usr_owner_01', 'prd_walton_01', 1);

    expect(publishedStatus).toBe(ProductStatus.PUBLISHED);
    expect(result.status).toBe(ProductStatus.PUBLISHED);
    expect(outboxEventType).toBe('PRODUCT_PUBLISHED');
  });

  it('blocks publication if merchant seller account is suspended', async () => {
    const suspendedSeller = { ...mockSeller, status: 'SUSPENDED' };

    const mockProductRepo: any = {
      findById: mock(async () => mockProduct),
    };
    const mockMediaRepo: any = {
      findByProductId: mock(async () => [{ id: 'med_01' }]),
    };
    const mockSellerRepo: any = {
      findById: mock(async () => suspendedSeller),
    };
    const mockRoleRepo: any = {
      hasRole: mock(async () => false),
    };

    const service = new ProductService(
      mockProductRepo,
      {} as any,
      mockMediaRepo,
      {} as any,
      mockSellerRepo,
      mockRoleRepo
    );

    expect(
      service.publishProduct('usr_owner_01', 'prd_walton_01', 1)
    ).rejects.toThrow(ValidationError);
  });
});
