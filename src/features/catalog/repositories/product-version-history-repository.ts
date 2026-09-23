import { prisma } from '@/shared/database/prisma';
import { ENTITY_PREFIXES, generatePrefixedId } from '@/shared/utils/id';
import { NotFoundError } from '@/shared/errors/app-error';

export class ProductVersionHistoryRepository {
  public async list(productId: string): Promise<any[]> {
    return (prisma as any).productVersionHistory.findMany({ where: { productId }, orderBy: { version: 'desc' }, take: 100 });
  }

  public async find(productId: string, version: number): Promise<any | null> {
    return (prisma as any).productVersionHistory.findUnique({ where: { productId_version: { productId, version } } });
  }

  public async record(input: { productId: string; version: number; action: string; snapshot: Record<string, unknown>; actorId?: string | null; actorRole?: string | null; requestId?: string | null; ipAddress?: string | null; userAgent?: string | null }): Promise<any> {
    try {
      return await (prisma as any).productVersionHistory.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.PRODUCT_VERSION), productId: input.productId, version: input.version, action: input.action, snapshot: input.snapshot, actorId: input.actorId ?? null, actorRole: input.actorRole ?? null, requestId: input.requestId ?? null, ipAddress: input.ipAddress ?? null, userAgent: input.userAgent ?? null } });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const existing = await this.find(input.productId, input.version);
        if (existing) return existing;
      }
      throw error;
    }
  }

  public async requireProduct(productId: string): Promise<any> {
    const product = await (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    return product;
  }
}
