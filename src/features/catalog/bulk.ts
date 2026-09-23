import { z } from 'zod';

export const CatalogImportFormatSchema = z.enum(['CSV', 'JSON']);
export const CatalogImportModeSchema = z.enum(['DRY_RUN', 'COMMIT']);
export const CatalogImportCreateSchema = z.object({
  format: CatalogImportFormatSchema,
  content: z.string().min(1).max(5_000_000),
  mode: CatalogImportModeSchema.default('DRY_RUN'),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
});
export type CatalogImportCreateInput = z.infer<typeof CatalogImportCreateSchema>;

export const CatalogExportCreateSchema = z.object({
  format: z.enum(['CSV']),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).optional(),
});
export type CatalogExportCreateInput = z.infer<typeof CatalogExportCreateSchema>;

export interface CatalogImportRow {
  title: string;
  titleBn?: string;
  slug: string;
  description: string;
  descriptionBn?: string;
  categoryId: string;
  brandId?: string;
  basePricePoisha: number;
  productPoint: number;
  currency: string;
  sku?: string;
  tags: string[];
}

export interface CatalogImportError { rowNumber: number; field?: string; code: string; message: string; details?: Record<string, unknown>; }
