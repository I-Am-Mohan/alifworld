import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { normalizeBarcode, normalizeSku, SKU_SCHEMA, BARCODE_SCHEMA } from '../identifiers';

export class IdentifierPolicyService {
  public async check(input: { sku?: string; barcode?: string; excludeProductId?: string; excludeVariantId?: string }) {
    const sku = input.sku ? normalizeSku(input.sku) : undefined;
    const barcode = input.barcode ? normalizeBarcode(input.barcode) : undefined;
    if (sku) SKU_SCHEMA.parse(sku);
    if (barcode) BARCODE_SCHEMA.parse(barcode);
    const product = await (prisma as any).product.findFirst({ where: { deletedAt: null, ...(input.excludeProductId ? { id: { not: input.excludeProductId } } : {}), OR: [{ sku: sku || undefined }, { barcode: barcode || undefined }] }, select: { id: true, sku: true, barcode: true } });
    const variant = await (prisma as any).productVariant.findFirst({ where: { deletedAt: null, ...(input.excludeVariantId ? { id: { not: input.excludeVariantId } } : {}), OR: [{ sku: sku || undefined }, { barcode: barcode || undefined }] }, select: { id: true, sku: true, barcode: true } });
    return { sku, barcode, available: !product && !variant, conflicts: { productId: product?.id || null, variantId: variant?.id || null, sku: Boolean((product?.sku && product.sku === sku) || (variant?.sku && variant.sku === sku)), barcode: Boolean((product?.barcode && product.barcode === barcode) || (variant?.barcode && variant.barcode === barcode)) } };
  }

  public async assertAvailable(input: { sku?: string; barcode?: string; excludeProductId?: string; excludeVariantId?: string }): Promise<void> {
    const result = await this.check(input);
    if (!result.available) throw new ConflictError('SKU or barcode is already assigned to another catalog item.', result.conflicts);
  }
}
