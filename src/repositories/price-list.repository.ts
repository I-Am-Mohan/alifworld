import { PrismaClient, Prisma } from '@prisma/client';

export class PriceListRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createPriceList(data: Prisma.PriceListCreateInput) {
    return this.prisma.priceList.create({ data });
  }

  async getPriceListById(id: string) {
    return this.prisma.priceList.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, businessName: true, slug: true } },
        rules: {
          include: {
            variant: { select: { id: true, sku: true, title: true, pricePoisha: true } },
            product: { select: { id: true, title: true, basePricePoisha: true } },
          },
        },
      },
    });
  }

  async getPriceListByCode(code: string) {
    return this.prisma.priceList.findUnique({
      where: { code: code.toUpperCase() },
      include: { rules: true },
    });
  }

  async listPriceLists(params: {
    sellerId?: string | null;
    channel?: string;
    buyerSegment?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PriceListWhereInput = {
      deletedAt: null,
      ...(params.sellerId !== undefined
        ? params.sellerId === null
          ? { sellerId: null }
          : { OR: [{ sellerId: params.sellerId }, { sellerId: null }] }
        : {}),
      ...(params.channel ? { channel: params.channel } : {}),
      ...(params.buyerSegment ? { buyerSegment: params.buyerSegment } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.priceList.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          seller: { select: { id: true, businessName: true } },
          _count: { select: { rules: true } },
        },
      }),
      this.prisma.priceList.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updatePriceList(id: string, data: Prisma.PriceListUpdateInput) {
    return this.prisma.priceList.update({
      where: { id },
      data,
    });
  }

  async addPriceListRule(data: Prisma.PriceListRuleCreateInput) {
    return this.prisma.priceListRule.create({ data });
  }

  /**
   * Fetches variant snapshot along with product snapshot.
   */
  async getVariantWithProduct(variantId: string) {
    return this.prisma.productVariant.findUnique({
      where: { id: variantId, deletedAt: null },
      include: {
        product: true,
      },
    });
  }

  /**
   * Fetches active price list rules applicable to a variant or product.
   */
  async getActiveRulesForVariant(variantId: string, productId: string) {
    return this.prisma.priceListRule.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ variantId }, { productId }],
        priceList: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      include: {
        priceList: true,
      },
    });
  }

  /**
   * Records an append-only price history entry.
   */
  async createPriceHistoryEntry(data: Prisma.PriceHistoryCreateInput) {
    return this.prisma.priceHistory.create({ data });
  }

  /**
   * Lists append-only price history records with filtering and pagination.
   */
  async listPriceHistory(params: {
    variantId?: string;
    productId?: string;
    sellerId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PriceHistoryWhereInput = {
      ...(params.variantId ? { variantId: params.variantId } : {}),
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.sellerId ? { sellerId: params.sellerId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.priceHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { effectiveAt: 'desc' },
        include: {
          variant: { select: { id: true, sku: true, title: true } },
          product: { select: { id: true, title: true, sellerId: true } },
        },
      }),
      this.prisma.priceHistory.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lists scheduled future price lists and price list rules.
   */
  async listScheduledPrices(params: {
    variantId?: string;
    productId?: string;
    sellerId?: string | null;
    channel?: string;
    now?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const now = params.now || new Date();

    const where: Prisma.PriceListRuleWhereInput = {
      status: 'ACTIVE',
      priceList: {
        status: 'ACTIVE',
        deletedAt: null,
        startsAt: { gt: now },
        ...(params.sellerId !== undefined
          ? params.sellerId === null
            ? { sellerId: null }
            : { OR: [{ sellerId: params.sellerId }, { sellerId: null }] }
          : {}),
        ...(params.channel ? { channel: params.channel } : {}),
      },
      ...(params.variantId ? { variantId: params.variantId } : {}),
      ...(params.productId ? { productId: params.productId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.priceListRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { priceList: { startsAt: 'asc' } },
        include: {
          priceList: { select: { id: true, code: true, name: true, channel: true, priority: true, startsAt: true, endsAt: true, sellerId: true } },
          variant: { select: { id: true, sku: true, title: true } },
          product: { select: { id: true, title: true } },
        },
      }),
      this.prisma.priceListRule.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Updates base variant pricing poisha and compare-at poisha.
   */
  async updateVariantBasePrice(variantId: string, data: { pricePoisha: bigint; compareAtPricePoisha?: bigint | null }) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        pricePoisha: data.pricePoisha,
        compareAtPricePoisha: data.compareAtPricePoisha,
      },
      include: {
        product: true,
      },
    });
  }
}
