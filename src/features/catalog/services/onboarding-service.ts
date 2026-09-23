import { AuthorizationError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { prisma } from '@/shared/database/prisma';
import { CatalogOnboardingRepository } from '../repositories/onboarding-repository';
import { OnboardingContentInput, OnboardingProgressInput } from '../onboarding';

export class CatalogOnboardingService {
  constructor(private readonly repository: CatalogOnboardingRepository = new CatalogOnboardingRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()) {}

  public async getTemplate(categoryId: string, locale: string) { return this.repository.findTemplate(categoryId, locale); }
  public async listTemplates(actorId: string) { await this.assertAdmin(actorId); return this.repository.listTemplates(); }
  public async createTemplate(actorId: string, input: OnboardingContentInput) { await this.assertAdmin(actorId); const template = await this.repository.createTemplate(actorId, input); await this.audit(actorId, 'CATALOG_ONBOARDING_TEMPLATE_CREATE', template.id, { templateKey: template.templateKey, categoryId: template.categoryId, locale: template.locale }); return template; }
  public async updateTemplate(actorId: string, id: string, input: OnboardingContentInput) { await this.assertAdmin(actorId); const template = await this.repository.updateTemplate(actorId, id, input); await this.audit(actorId, 'CATALOG_ONBOARDING_TEMPLATE_UPDATE', id, { version: template.version }); return template; }

  public async getSellerOnboarding(actorId: string, sellerId: string) { await this.assertSellerScope(actorId, sellerId); return this.repository.listProgress(sellerId); }
  public async saveProgress(actorId: string, sellerId: string, input: OnboardingProgressInput) {
    await this.assertSellerScope(actorId, sellerId);
    const template = await this.repository.findTemplateById(input.templateId);
    if (!template) throw new NotFoundError(`Onboarding template '${input.templateId}' not found.`);
    const allowed = new Set([...(template.requiredFields as string[]), ...(template.recommendedFields as string[]), ...(template.validationHints as string[])]);
    const invalid = input.completedItems.filter((item) => !allowed.has(item));
    if (invalid.length) throw new ValidationError(`Unknown onboarding checklist items: ${invalid.join(', ')}`);
    const progress = await this.repository.saveProgress(sellerId, input, template.version);
    await this.audit(actorId, 'SELLER_CATALOG_ONBOARDING_PROGRESS', progress.id, { sellerId, templateId: input.templateId, completedCount: input.completedItems.length, dismissed: input.dismissed });
    return this.withCompletion(progress);
  }

  private withCompletion(progress: any) { const required = Array.isArray(progress.template?.requiredFields) ? progress.template.requiredFields : []; const completed = new Set(progress.completedItems || []); const completionPercentage = required.length ? Math.round((required.filter((item: string) => completed.has(item)).length / required.length) * 100) : 100; return { ...progress, completionPercentage }; }
  private async assertAdmin(actorId: string): Promise<void> { const [superAdmin, admin] = await Promise.all([this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN), this.roles.hasRole(actorId, SystemRoleCode.ADMIN)]); if (!superAdmin && !admin) throw new AuthorizationError('Only system administrators can manage onboarding templates.'); }
  private async assertSellerScope(actorId: string, sellerId: string): Promise<void> { const seller = await (prisma as any).seller.findFirst({ where: { id: sellerId, deletedAt: null }, select: { ownerUserId: true } }); if (!seller) throw new NotFoundError(`Seller '${sellerId}' not found.`); const isAdmin = await this.roles.hasRole(actorId, SystemRoleCode.ADMIN) || await this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN); const isStaff = await this.roles.hasRole(actorId, SystemRoleCode.SELLER_STAFF, sellerId); if (!isAdmin && !isStaff && seller.ownerUserId !== actorId) throw new AuthorizationError('You are not authorized to access this seller onboarding progress.'); }
  private async audit(actorId: string, action: string, resourceId: string, metadata: Record<string, unknown>) { await (prisma as any).auditLog.create({ data: { actorId, action, resource: 'CatalogOnboarding', resourceId, metadata } }); }
}
