import { PrismaClient, Prisma } from '@prisma/client';

export class PromotionAttributionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createPromotion(data: Prisma.PromotionCreateInput) {
    return this.prisma.promotion.create({ data });
  }

  async getPromotionByCode(code: string) {
    return this.prisma.promotion.findUnique({
      where: { code: code.toUpperCase() },
      include: { seller: true },
    });
  }

  async getPromotionById(id: string) {
    return this.prisma.promotion.findUnique({
      where: { id },
      include: { seller: true },
    });
  }

  async listPromotions(params: {
    sellerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PromotionWhereInput = {
      deletedAt: null,
      ...(params.sellerId !== undefined ? { sellerId: params.sellerId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { seller: { select: { id: true, businessName: true, slug: true } } },
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updatePromotion(id: string, data: Prisma.PromotionUpdateInput) {
    return this.prisma.promotion.update({
      where: { id },
      data,
    });
  }

  async createAttributionRecords(
    attributions: Prisma.PromotionAttributionCreateManyInput[],
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return client.promotionAttribution.createMany({
      data: attributions,
    });
  }

  /**
   * Scoped query for promotion attributions.
   * Note: sellerId filter is applied inside Prisma WHERE clause, preventing cross-tenant data leakage.
   */
  async getAttributions(params: {
    sellerId?: string;
    orderId?: string;
    couponCode?: string;
    fundingType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PromotionAttributionWhereInput = {
      ...(params.sellerId !== undefined ? { sellerId: params.sellerId } : {}),
      ...(params.orderId ? { orderId: params.orderId } : {}),
      ...(params.couponCode ? { couponCode: params.couponCode.toUpperCase() } : {}),
      ...(params.fundingType ? { fundingType: params.fundingType } : {}),
      ...(params.startDate || params.endDate
        ? {
            createdAt: {
              ...(params.startDate ? { gte: params.startDate } : {}),
              ...(params.endDate ? { lte: params.endDate } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.promotionAttribution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, businessName: true } },
          promotion: { select: { id: true, code: true, title: true } },
        },
      }),
      this.prisma.promotionAttribution.count({ where }),
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
   * Summarizes seller-funded vs platform-funded promotion metrics.
   * Scoped inside DB query via `where: { sellerId }`.
   */
  async getAttributionSummary(sellerId?: string) {
    const where: Prisma.PromotionAttributionWhereInput = sellerId ? { sellerId } : {};

    const [aggregations, countByFundingType] = await Promise.all([
      this.prisma.promotionAttribution.aggregate({
        where,
        _sum: {
          discountAmountPoisha: true,
          sellerSharePoisha: true,
          platformSharePoisha: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.promotionAttribution.groupBy({
        by: ['fundingType'],
        where,
        _sum: {
          discountAmountPoisha: true,
          sellerSharePoisha: true,
          platformSharePoisha: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    const totalDiscountPoisha = aggregations._sum.discountAmountPoisha ?? 0n;
    const totalSellerSharePoisha = aggregations._sum.sellerSharePoisha ?? 0n;
    const totalPlatformSharePoisha = aggregations._sum.platformSharePoisha ?? 0n;

    return {
      sellerId: sellerId || null,
      totalCount: aggregations._count.id,
      totalDiscountPoisha,
      totalSellerSharePoisha,
      totalPlatformSharePoisha,
      fundingBreakdown: countByFundingType.map((g) => ({
        fundingType: g.fundingType,
        count: g._count.id,
        discountAmountPoisha: g._sum.discountAmountPoisha ?? 0n,
        sellerSharePoisha: g._sum.sellerSharePoisha ?? 0n,
        platformSharePoisha: g._sum.platformSharePoisha ?? 0n,
      })),
    };
  }
}
