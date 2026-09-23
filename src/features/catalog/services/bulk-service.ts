import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { prisma } from '@/shared/database/prisma';
import { S3PrivateObjectStorage } from '@/shared/storage/s3-object-storage';
import { CatalogBulkRepository } from '../repositories/bulk-repository';
import { CatalogImportCreateInput, CatalogImportError, CatalogImportRow } from '../bulk';
import { ENTITY_PREFIXES, generatePrefixedId } from '@/shared/utils/id';

const MAX_ROWS = 5000;
const MAX_BYTES = 5_000_000;
const REQUIRED_COLUMNS = ['title', 'slug', 'description', 'categoryId', 'basePricePoisha', 'productPoint'];

export class CatalogBulkService {
  constructor(private readonly repository: CatalogBulkRepository = new CatalogBulkRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(), private readonly storage: S3PrivateObjectStorage = new S3PrivateObjectStorage()) {}

  public async createImport(actorId: string, sellerId: string, input: CatalogImportCreateInput) {
    await this.assertSellerScope(actorId, sellerId);
    if (Buffer.byteLength(input.content, 'utf8') > MAX_BYTES) throw new ValidationError('Import content exceeds the 5 MB limit.');
    if (input.idempotencyKey) { const existing = await this.repository.findImportByIdempotency(input.idempotencyKey, sellerId); if (existing) return { job: existing, idempotent: true }; }
    const objectKey = `catalog-imports/${sellerId}/${Date.now()}-${generatePrefixedId(ENTITY_PREFIXES.CATALOG_IMPORT)}.${input.format.toLowerCase()}`;
    await this.storage.putObject({ key: objectKey, body: new TextEncoder().encode(input.content), contentType: input.format === 'CSV' ? 'text/csv' : 'application/json', metadata: { sellerId, purpose: 'catalog-import' } });
    const job = await this.repository.createImport(sellerId, input, objectKey);
    const validation = await this.validateContent(sellerId, input.format, input.content);
    const completed = await this.repository.completeValidation(job.id, { ...validation, status: validation.errors.length ? 'FAILED' : 'READY' });
    if (input.mode === 'COMMIT' && !validation.errors.length) return { job: completed, commit: await this.repository.commitImport(job.id, sellerId, validation.rows, actorId) };
    return { job: completed, validation: { totalRows: validation.totalRows, validRows: validation.validRows, errors: validation.errors } };
  }

  public async validateImport(actorId: string, sellerId: string, jobId: string, content: string) { await this.assertSellerScope(actorId, sellerId); const job = await this.repository.findImportById(jobId, sellerId); if (!job) throw new NotFoundError(`Import job '${jobId}' not found.`); const validation = await this.validateContent(sellerId, job.format, content); return this.repository.completeValidation(jobId, { ...validation, status: validation.errors.length ? 'FAILED' : 'READY' }); }
  public async commitImport(actorId: string, sellerId: string, jobId: string, content: string) { await this.assertSellerScope(actorId, sellerId); const job = await this.repository.findImportById(jobId, sellerId); if (!job) throw new NotFoundError(`Import job '${jobId}' not found.`); const validation = await this.validateContent(sellerId, job.format, content); if (validation.errors.length) throw new ValidationError('Import must pass validation before commit.', { errors: validation.errors }); await this.repository.completeValidation(jobId, { ...validation, status: 'READY' }); return this.repository.commitImport(jobId, sellerId, validation.rows, actorId); }
  public async listImports(actorId: string, sellerId: string) { await this.assertSellerScope(actorId, sellerId); return this.repository.listImports(sellerId); }
  public async getImport(actorId: string, sellerId: string, jobId: string) { await this.assertSellerScope(actorId, sellerId); const job = await this.repository.findImportById(jobId, sellerId); if (!job) throw new NotFoundError(`Import job '${jobId}' not found.`); return job; }

  public async createExport(actorId: string, sellerId: string, filters: { status?: string; format: 'CSV' }) {
    await this.assertSellerScope(actorId, sellerId);
    const job = await this.repository.createExport(sellerId, filters.format, filters);
    const products = await (prisma as any).product.findMany({ where: { sellerId, deletedAt: null, ...(filters.status ? { status: filters.status } : {}) }, orderBy: { createdAt: 'desc' }, take: 5000, select: { id: true, title: true, titleBn: true, slug: true, description: true, categoryId: true, brandId: true, basePricePoisha: true, productPoint: true, currency: true, sku: true, status: true, tags: true } });
    const header = ['id', 'title', 'titleBn', 'slug', 'description', 'categoryId', 'brandId', 'basePricePoisha', 'productPoint', 'currency', 'sku', 'status', 'tags'];
    const csv = [header.join(','), ...products.map((product: any) => header.map((key) => this.csvCell(key === 'basePricePoisha' ? product[key].toString() : key === 'tags' ? (product[key] || []).join('|') : product[key] ?? '')).join(','))].join('\n');
    const objectKey = `catalog-exports/${sellerId}/${job.id}.csv`;
    await this.storage.putObject({ key: objectKey, body: new TextEncoder().encode(csv), contentType: 'text/csv', metadata: { sellerId, purpose: 'catalog-export' } });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.repository.completeExport(job.id, sellerId, objectKey, products.length, expiresAt);
    const signed = await this.storage.createReadUrl(objectKey, 15 * 60);
    return { ...job, status: 'COMPLETED', rowCount: products.length, expiresAt, downloadUrl: signed.url };
  }
  public async listExports(actorId: string, sellerId: string) { await this.assertSellerScope(actorId, sellerId); return this.repository.listExports(sellerId); }

  public async getExport(actorId: string, sellerId: string, exportId: string) {
    await this.assertSellerScope(actorId, sellerId);
    const job = (await this.repository.listExports(sellerId)).find((item: any) => item.id === exportId);
    if (!job) throw new NotFoundError(`Export job '${exportId}' not found.`);
    if (job.status !== 'COMPLETED' || !job.outputObjectKey || !job.expiresAt || new Date(job.expiresAt) <= new Date()) throw new ConflictError('Export is not ready or has expired.');
    const signed = await this.storage.createReadUrl(job.outputObjectKey, 15 * 60);
    return { ...job, downloadUrl: signed.url, expiresAt: signed.expiresAt };
  }

  private async validateContent(sellerId: string, format: 'CSV' | 'JSON', content: string): Promise<{ rows: CatalogImportRow[]; totalRows: number; errors: CatalogImportError[]; validRows: number }> {
    const records = format === 'CSV' ? this.parseCsv(content) : this.parseJson(content);
    const errors: CatalogImportError[] = []; const rows: CatalogImportRow[] = [];
    if (records.length > MAX_ROWS) errors.push({ rowNumber: 0, code: 'ROW_LIMIT_EXCEEDED', message: `Import cannot contain more than ${MAX_ROWS} rows.` });
    const slugs = new Set<string>();
    const categories = new Set((await (prisma as any).category.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true } })).map((row: any) => row.id));
    const brands = new Set((await (prisma as any).brand.findMany({ where: { isActive: true, approvalStatus: 'APPROVED', deletedAt: null }, select: { id: true } })).map((row: any) => row.id));
    for (const [index, record] of records.slice(0, MAX_ROWS).entries()) {
      const rowNumber = index + 2; const rowErrors: CatalogImportError[] = [];
      for (const column of REQUIRED_COLUMNS) if (!record[column]) rowErrors.push({ rowNumber, field: column, code: 'REQUIRED_FIELD', message: `${column} is required.` });
      const price = Number(record.basePricePoisha); const points = Number(record.productPoint);
      if (record.categoryId && !categories.has(record.categoryId)) rowErrors.push({ rowNumber, field: 'categoryId', code: 'INVALID_CATEGORY', message: 'Category is not active or does not exist.' });
      if (record.brandId && !brands.has(record.brandId)) rowErrors.push({ rowNumber, field: 'brandId', code: 'INVALID_BRAND', message: 'Brand is not approved or does not exist.' });
      if (!Number.isSafeInteger(price) || price <= 0) rowErrors.push({ rowNumber, field: 'basePricePoisha', code: 'INVALID_POISHA', message: 'Price must be a positive integer in poisha.' });
      if (!Number.isSafeInteger(points) || points < 0) rowErrors.push({ rowNumber, field: 'productPoint', code: 'INVALID_PRODUCT_POINT', message: 'Product Point must be a non-negative integer.' });
      if (slugs.has(record.slug)) rowErrors.push({ rowNumber, field: 'slug', code: 'DUPLICATE_SLUG', message: 'Slug is duplicated in the import.' });
      slugs.add(record.slug);
      if (rowErrors.length) errors.push(...rowErrors); else rows.push({ title: record.title, titleBn: record.titleBn, slug: record.slug, description: record.description, descriptionBn: record.descriptionBn, categoryId: record.categoryId, brandId: record.brandId || undefined, basePricePoisha: price, productPoint: points, currency: 'BDT', sku: record.sku || undefined, tags: record.tags ? record.tags.split('|').map((tag: string) => tag.trim()).filter(Boolean) : [] });
    }
    return { rows, totalRows: records.length, validRows: rows.length, errors, };
  }
  private parseJson(content: string): Record<string, string>[] { try { const value = JSON.parse(content); if (!Array.isArray(value)) throw new Error('JSON import must be an array.'); return value.map((row) => Object.fromEntries(Object.entries(row).map(([key, item]) => [key, String(item ?? '')]))); } catch (error) { throw new ValidationError(error instanceof Error ? error.message : 'Invalid JSON import.'); } }
  private parseCsv(content: string): Record<string, string>[] { const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length); if (lines.length < 2) throw new ValidationError('CSV import must include a header and at least one row.'); const header = this.parseCsvLine(lines[0]); for (const column of REQUIRED_COLUMNS) if (!header.includes(column)) throw new ValidationError(`CSV is missing required column '${column}'.`); return lines.slice(1).map((line) => { const values = this.parseCsvLine(line); return Object.fromEntries(header.map((key, index) => [key, values[index] || ''])); }); }
  private parseCsvLine(line: string): string[] { const result: string[] = []; let current = ''; let quoted = false; for (let index = 0; index < line.length; index += 1) { const char = line[index]; if (char === '"' && line[index + 1] === '"' && quoted) { current += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { result.push(current.trim()); current = ''; } else current += char; } result.push(current.trim()); return result; }
  private csvCell(value: string): string { return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value; }
  private async assertSellerScope(actorId: string, sellerId: string): Promise<void> { const seller = await (prisma as any).seller.findFirst({ where: { id: sellerId, deletedAt: null }, select: { ownerUserId: true } }); if (!seller) throw new NotFoundError(`Seller '${sellerId}' not found.`); const isAdmin = await this.roles.hasRole(actorId, SystemRoleCode.ADMIN) || await this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN); const isStaff = await this.roles.hasRole(actorId, SystemRoleCode.SELLER_STAFF, sellerId); if (!isAdmin && !isStaff && seller.ownerUserId !== actorId) throw new AuthorizationError('You are not authorized to run catalog bulk operations for this seller.'); }
}
