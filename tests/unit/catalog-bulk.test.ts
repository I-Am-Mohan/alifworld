import { describe, expect, it, mock } from 'bun:test';
import { CatalogBulkService } from '@/features/catalog/services/bulk-service';
import { CatalogImportCreateSchema } from '@/features/catalog/bulk';
import { prisma } from '@/shared/database/prisma';

describe('Milestone 078 safe catalog bulk operations', () => {
  it('validates bounded import requests', () => {
    expect(CatalogImportCreateSchema.safeParse({ format: 'CSV', content: 'title,slug', mode: 'DRY_RUN' }).success).toBe(true);
    expect(CatalogImportCreateSchema.safeParse({ format: 'XML', content: '<x/>' }).success).toBe(false);
  });

  it('dry-validates CSV rows without committing products', async () => {
    (prisma as any).seller = { findFirst: mock(async () => ({ ownerUserId: 'usr_owner' })) };
    (prisma as any).category = { findMany: mock(async () => [{ id: 'cat_01' }]) };
    (prisma as any).brand = { findMany: mock(async () => [{ id: 'brd_01' }]) };
    const repository: any = {
      findImportByIdempotency: mock(async () => null),
      createImport: mock(async () => ({ id: 'cim_01' })),
      completeValidation: mock(async (_id: string, result: any) => result),
    };
    const roles: any = { hasRole: mock(async () => false) };
    const storage: any = { putObject: mock(async () => {}) };
    const service = new CatalogBulkService(repository, roles, storage);
    const result = await service.createImport('usr_owner', 'sel_01', { format: 'CSV', mode: 'DRY_RUN', content: 'title,slug,description,categoryId,basePricePoisha,productPoint\nPhone,phone,Good phone,cat_01,10000,10' });
    expect(result.validation?.validRows).toBe(1);
    expect(repository.completeValidation).toHaveBeenCalled();
  });

  it('rejects duplicate slugs during validation', async () => {
    (prisma as any).seller = { findFirst: mock(async () => ({ ownerUserId: 'usr_owner' })) };
    (prisma as any).category = { findMany: mock(async () => [{ id: 'cat_01' }]) };
    (prisma as any).brand = { findMany: mock(async () => []) };
    const repository: any = { findImportByIdempotency: mock(async () => null), createImport: mock(async () => ({ id: 'cim_02' })), completeValidation: mock(async (_id: string, result: any) => result) };
    const service = new CatalogBulkService(repository, { hasRole: mock(async () => false) } as any, { putObject: mock(async () => {}) } as any);
    const result = await service.createImport('usr_owner', 'sel_01', { format: 'CSV', mode: 'DRY_RUN', content: 'title,slug,description,categoryId,basePricePoisha,productPoint\nOne,duplicate,Description,cat_01,100,1\nTwo,duplicate,Description,cat_01,100,1' });
    expect(result.validation?.errors.some((error: any) => error.code === 'DUPLICATE_SLUG')).toBe(true);
  });
});
