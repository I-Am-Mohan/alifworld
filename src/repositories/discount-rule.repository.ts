import { PrismaClient, Prisma } from '@prisma/client';

export class DiscountRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDiscountRule(
    data: Prisma.DiscountRuleCreateInput,
    targets?: Array<{ targetType: string; targetId: string }>
  ) {
    const rule = await this.prisma.discountRule.create({
      data,
    });

    if (targets && targets.length > 0) {
      await this.prisma.discountRuleTarget.createMany({
        data: targets.map((t) => ({
          discountRuleId: rule.id,
          targetType: t.targetType,
          targetId: t.targetId,
        })),
      });
    }

    return this.getDiscountRuleById(rule.id);
  }

  async getDiscountRuleById(id: string) {
    return this.prisma.discountRule.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, businessName: true, slug: true } },
        targets: true,
      },
    });
  }

  async getDiscountRuleByCode(code: string) {
    return this.prisma.discountRule.findUnique({
      where: { code: code.toUpperCase() },
      include: { targets: true, seller: true },
    });
  }

  async listDiscountRules(params: {
    sellerId?: string | null;
    discountType?: string;
    isAutomatic?: boolean;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DiscountRuleWhereInput = {
      deletedAt: null,
      ...(params.sellerId !== undefined
        ? params.sellerId === null
          ? { sellerId: null }
          : { OR: [{ sellerId: params.sellerId }, { sellerId: null }] }
        : {}),
      ...(params.discountType ? { discountType: params.discountType } : {}),
      ...(params.isAutomatic !== undefined ? { isAutomatic: params.isAutomatic } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.discountRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          seller: { select: { id: true, businessName: true } },
          targets: true,
        },
      }),
      this.prisma.discountRule.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateDiscountRule(id: string, data: Prisma.DiscountRuleUpdateInput) {
    return this.prisma.discountRule.update({
      where: { id },
      data,
    });
  }

  async getActiveAutomaticRules(now: Date = new Date()) {
    return this.prisma.discountRule.findMany({
      where: {
        isAutomatic: true,
        status: 'ACTIVE',
        deletedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      include: {
        targets: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
