import { prisma } from '@/shared/database/prisma';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { TaxRuleModel } from '../types';
import { TaxRuleUpdateInput, TaxRuleWriteInput } from '../localization';

export class TaxRuleRepository {
  public async findById(id: string): Promise<TaxRuleModel | null> {
    const rule = await (prisma as any).taxRule.findUnique({ where: { id } });
    return rule ? this.map(rule) : null;
  }

  public async findAll(): Promise<TaxRuleModel[]> {
    const rules = await (prisma as any).taxRule.findMany({ orderBy: [{ effectiveFrom: 'desc' }, { name: 'asc' }] });
    return rules.map((rule: any) => this.map(rule));
  }

  public async create(actorId: string, input: TaxRuleWriteInput): Promise<TaxRuleModel> {
    const rule = await (prisma as any).taxRule.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.TAX_RULE), ...input, createdBy: actorId, updatedBy: actorId, version: 1 } });
    return this.map(rule);
  }

  public async update(actorId: string, id: string, input: TaxRuleUpdateInput): Promise<TaxRuleModel> {
    const existing = await (prisma as any).taxRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError(`Tax rule '${id}' not found.`);
    if (existing.version !== input.version) throw new ConflictError(`Optimistic concurrency conflict on tax rule '${id}'.`);
    const { version: _version, ...data } = input;
    const rule = await (prisma as any).taxRule.update({ where: { id }, data: { ...data, updatedBy: actorId, version: { increment: 1 } } });
    return this.map(rule);
  }

  public async resolveEffective(categoryId: string | null, effectiveDate: Date): Promise<TaxRuleModel | null> {
    const rules = await (prisma as any).taxRule.findMany({ where: { jurisdiction: 'BD', status: 'ACTIVE', effectiveFrom: { lte: effectiveDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveDate } }], AND: [{ OR: [{ categoryId }, { categoryId: null }] }] }, orderBy: [{ categoryId: 'desc' }, { effectiveFrom: 'desc' }] });
    return rules.length ? this.map(rules[0]) : null;
  }

  private map(rule: any): TaxRuleModel { return { id: rule.id, jurisdiction: rule.jurisdiction, categoryId: rule.categoryId, name: rule.name, taxType: rule.taxType, ratePercent: Number(rule.ratePercent), priceIncludesTax: rule.priceIncludesTax, effectiveFrom: rule.effectiveFrom, effectiveTo: rule.effectiveTo, status: rule.status, version: rule.version, createdAt: rule.createdAt, updatedAt: rule.updatedAt }; }
}
