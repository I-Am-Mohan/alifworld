import { prisma } from '@/shared/database/prisma';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { ENTITY_PREFIXES, generatePrefixedId } from '@/shared/utils/id';
import { OnboardingContentInput, OnboardingProgressInput } from '../onboarding';

export class CatalogOnboardingRepository {
  public async findTemplateById(id: string): Promise<any | null> { return (prisma as any).catalogOnboardingTemplate.findFirst({ where: { id, isActive: true }, include: { category: true } }); }

  public async findTemplate(categoryId: string | null, locale: string): Promise<any | null> {
    const exact = await (prisma as any).catalogOnboardingTemplate.findFirst({ where: { categoryId, locale, isActive: true }, include: { category: true } });
    if (exact) return exact;
    if (categoryId) return (prisma as any).catalogOnboardingTemplate.findFirst({ where: { categoryId: null, locale, isActive: true }, include: { category: true } });
    return null;
  }

  public async listTemplates(): Promise<any[]> { return (prisma as any).catalogOnboardingTemplate.findMany({ where: { isActive: true }, include: { category: true }, orderBy: [{ categoryId: 'asc' }, { locale: 'asc' }] }); }

  public async createTemplate(actorId: string, input: OnboardingContentInput): Promise<any> {
    const existing = await (prisma as any).catalogOnboardingTemplate.findFirst({ where: { templateKey: input.templateKey } });
    if (existing) throw new ConflictError(`Onboarding template '${input.templateKey}' already exists.`);
    return (prisma as any).catalogOnboardingTemplate.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.ONBOARDING_TEMPLATE), templateKey: input.templateKey, categoryId: input.categoryId ?? null, locale: input.locale, name: input.name, requiredFields: input.requiredFields, recommendedFields: input.recommendedFields, attributeGuidance: input.attributeGuidance, mediaGuidance: input.mediaGuidance, titleExample: input.titleExample ?? null, descriptionExample: input.descriptionExample ?? null, validationHints: input.validationHints, version: 1, isActive: input.isActive, createdBy: actorId, updatedBy: actorId } });
  }

  public async updateTemplate(actorId: string, id: string, input: OnboardingContentInput): Promise<any> {
    const existing = await (prisma as any).catalogOnboardingTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError(`Onboarding template '${id}' not found.`);
    if (input.version !== existing.version) throw new ConflictError(`Optimistic concurrency conflict on onboarding template '${id}'.`);
    const { version: _version, templateKey: _templateKey, ...data } = input;
    return (prisma as any).catalogOnboardingTemplate.update({ where: { id }, data: { ...data, categoryId: data.categoryId ?? null, titleExample: data.titleExample ?? null, descriptionExample: data.descriptionExample ?? null, updatedBy: actorId, version: { increment: 1 } } });
  }

  public async getProgress(sellerId: string, templateId: string): Promise<any | null> { return (prisma as any).sellerCatalogOnboardingProgress.findUnique({ where: { sellerId_templateId: { sellerId, templateId } } }); }

  public async listProgress(sellerId: string): Promise<any[]> { return (prisma as any).sellerCatalogOnboardingProgress.findMany({ where: { sellerId }, include: { template: true }, orderBy: { updatedAt: 'desc' } }); }

  public async saveProgress(sellerId: string, input: OnboardingProgressInput, templateVersion: number): Promise<any> {
    return (prisma as any).sellerCatalogOnboardingProgress.upsert({
      where: { sellerId_templateId: { sellerId, templateId: input.templateId } },
      create: { id: generatePrefixedId(ENTITY_PREFIXES.ONBOARDING_PROGRESS), sellerId, templateId: input.templateId, completedItems: input.completedItems, dismissed: input.dismissed, lastViewedVersion: templateVersion },
      update: { completedItems: input.completedItems, dismissed: input.dismissed, lastViewedVersion: templateVersion },
      include: { template: true },
    });
  }
}
