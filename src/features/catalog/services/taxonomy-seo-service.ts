import { prisma } from '@/shared/database/prisma';
import { AuthorizationError } from '@/shared/errors/app-error';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { LocalizedCatalogRepository } from '../repositories/localized-catalog-repository';
import { TaxRuleRepository } from '../repositories/tax-rule-repository';
import { TaxRuleUpdateInput, TaxRuleWriteInput } from '../localization';

export class TaxonomySeoService {
  constructor(private readonly repository: LocalizedCatalogRepository = new LocalizedCatalogRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()) {}

  public async getCategoryTranslation(categoryId: string, locale?: string) { return this.repository.findCategoryTranslation(categoryId, locale); }
  public async getBrandTranslation(brandId: string, locale?: string) { return this.repository.findBrandTranslation(brandId, locale); }
  public async upsertCategoryTranslation(actorId: string, categoryId: string, input: Parameters<LocalizedCatalogRepository['upsertCategoryTranslation']>[1]) { await this.assertAdmin(actorId); const result = await this.repository.upsertCategoryTranslation(categoryId, input); await this.audit(actorId, 'CATEGORY_TRANSLATION_UPSERT', categoryId, { locale: input.locale }); return result; }
  public async upsertBrandTranslation(actorId: string, brandId: string, input: Parameters<LocalizedCatalogRepository['upsertBrandTranslation']>[1]) { await this.assertAdmin(actorId); const result = await this.repository.upsertBrandTranslation(brandId, input); await this.audit(actorId, 'BRAND_TRANSLATION_UPSERT', brandId, { locale: input.locale }); return result; }

  private async assertAdmin(actorId: string): Promise<void> { const [superAdmin, admin] = await Promise.all([this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN), this.roles.hasRole(actorId, SystemRoleCode.ADMIN)]); if (!superAdmin && !admin) throw new AuthorizationError('Only system administrators can manage taxonomy translations and SEO metadata.'); }
  private async audit(actorId: string, action: string, resourceId: string, metadata: Record<string, unknown>) { await (prisma as any).auditLog.create({ data: { actorId, action, resource: 'Taxonomy', resourceId, metadata } }); }
}

export class TaxRuleService {
  constructor(private readonly repository: TaxRuleRepository = new TaxRuleRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()) {}
  public async list(): Promise<Awaited<ReturnType<TaxRuleRepository['findAll']>>> { return this.repository.findAll(); }
  public async create(actorId: string, input: TaxRuleWriteInput) { await this.assertAdmin(actorId); const result = await this.repository.create(actorId, input); await this.audit(actorId, 'TAX_RULE_CREATE', result.id, { status: result.status, version: result.version }); return result; }
  public async update(actorId: string, id: string, input: TaxRuleUpdateInput) { await this.assertAdmin(actorId); const result = await this.repository.update(actorId, id, input); await this.audit(actorId, 'TAX_RULE_UPDATE', result.id, { status: result.status, version: result.version }); return result; }
  public async resolve(categoryId: string | null, effectiveDate: Date) { return this.repository.resolveEffective(categoryId, effectiveDate); }
  private async assertAdmin(actorId: string): Promise<void> { const [superAdmin, admin] = await Promise.all([this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN), this.roles.hasRole(actorId, SystemRoleCode.ADMIN)]); if (!superAdmin && !admin) throw new AuthorizationError('Only system administrators can manage tax rules.'); }
  private async audit(actorId: string, action: string, resourceId: string, metadata: Record<string, unknown>) { await (prisma as any).auditLog.create({ data: { actorId, action, resource: 'TaxRule', resourceId, metadata } }); }
}
