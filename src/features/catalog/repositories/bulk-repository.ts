import { prisma } from '@/shared/database/prisma';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { ENTITY_PREFIXES, generatePrefixedId } from '@/shared/utils/id';
import { CatalogImportError, CatalogImportRow, CatalogImportCreateInput } from '../bulk';

const MAX_ROWS = 5000;

export class CatalogBulkRepository {
  public async findImportById(id: string, sellerId: string): Promise<any | null> { return (prisma as any).catalogImportJob.findFirst({ where: { id, sellerId }, include: { errors: { orderBy: { rowNumber: 'asc' } } } }); }
  public async findImportByIdempotency(idempotencyKey: string, sellerId: string): Promise<any | null> { return (prisma as any).catalogImportJob.findFirst({ where: { idempotencyKey, sellerId }, include: { errors: { orderBy: { rowNumber: 'asc' } } } }); }
  public async listImports(sellerId: string): Promise<any[]> { return (prisma as any).catalogImportJob.findMany({ where: { sellerId }, include: { _count: { select: { errors: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  public async createImport(sellerId: string, input: CatalogImportCreateInput, sourceObjectKey: string): Promise<any> { return (prisma as any).catalogImportJob.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.CATALOG_IMPORT), sellerId, sourceObjectKey, format: input.format, importMode: input.mode, idempotencyKey: input.idempotencyKey ?? null, status: 'VALIDATING' } }); }
  public async completeValidation(jobId: string, result: { totalRows: number; validRows: number; errors: CatalogImportError[]; status: string }): Promise<any> {
    return (prisma as any).$transaction(async (tx: any) => {
      if (result.errors.length) await tx.catalogImportRowError.createMany({ data: result.errors.map((error) => ({ id: generatePrefixedId(ENTITY_PREFIXES.CATALOG_IMPORT_ERROR), jobId, rowNumber: error.rowNumber, field: error.field ?? null, code: error.code, message: error.message, details: error.details ?? null })) });
      return tx.catalogImportJob.update({ where: { id: jobId }, data: { totalRows: result.totalRows, validRows: result.validRows, errorRows: result.errors.length, status: result.status, completedAt: new Date() }, include: { errors: true } });
    });
  }
  public async commitImport(jobId: string, sellerId: string, rows: CatalogImportRow[], actorId: string): Promise<any> {
    if (rows.length > MAX_ROWS) throw new ValidationError('Import exceeds the maximum row limit.');
    return (prisma as any).$transaction(async (tx: any) => {
      const job = await tx.catalogImportJob.findFirst({ where: { id: jobId, sellerId } });
      if (!job) throw new NotFoundError(`Import job '${jobId}' not found.`);
      if (job.status !== 'READY') throw new ConflictError(`Import job '${jobId}' is not ready for commit.`);
      const created: any[] = [];
      for (const row of rows) {
        const product = await tx.product.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.PRODUCT), sellerId, categoryId: row.categoryId, brandId: row.brandId ?? null, title: row.title, titleBn: row.titleBn ?? null, slug: row.slug, description: row.description, descriptionBn: row.descriptionBn ?? null, status: 'DRAFT', basePricePoisha: BigInt(row.basePricePoisha), productPoint: row.productPoint, currency: 'BDT', sku: row.sku ?? null, tags: row.tags, version: 1 } });
        created.push(product);
      }
      await tx.catalogImportJob.update({ where: { id: jobId }, data: { status: 'COMPLETED', committedRows: created.length, completedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId, action: 'CATALOG_IMPORT_COMMIT', resource: 'CatalogImportJob', resourceId: jobId, metadata: { sellerId, committedRows: created.length } } });
      await tx.outboxEvent.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX), eventType: 'CATALOG_IMPORT_COMMITTED', aggregateType: 'CatalogImportJob', aggregateId: jobId, payload: { jobId, sellerId, committedRows: created.length } } });
      return { jobId, committedRows: created.length, productIds: created.map((product) => product.id) };
    });
  }
  public async listExports(sellerId: string): Promise<any[]> { return (prisma as any).catalogExportJob.findMany({ where: { sellerId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  public async createExport(sellerId: string, format: string, filters: Record<string, unknown>): Promise<any> { return (prisma as any).catalogExportJob.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.CATALOG_EXPORT), sellerId, format, filters, status: 'REQUESTED' } }); }
  public async completeExport(id: string, sellerId: string, objectKey: string, rowCount: number, expiresAt: Date): Promise<any> { return (prisma as any).catalogExportJob.update({ where: { id }, data: { status: 'COMPLETED', outputObjectKey: objectKey, rowCount, expiresAt, completedAt: new Date() } }); }
}
