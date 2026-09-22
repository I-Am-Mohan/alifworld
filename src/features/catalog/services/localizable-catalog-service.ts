import { AuthorizationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { CmsContentRepository } from '../repositories/cms-content-repository';
import { LocalizedCatalogRepository } from '../repositories/localized-catalog-repository';
import { CreateCmsContentInput, UpdateCmsContentInput } from '../localization';

export class LocalizableCatalogService {
  constructor(
    private readonly catalogRepository: LocalizedCatalogRepository = new LocalizedCatalogRepository(),
    private readonly cmsRepository: CmsContentRepository = new CmsContentRepository(),
    private readonly roleRepository: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()
  ) {}

  async getPublishedCms(slug: string, locale?: string) {
    return this.cmsRepository.findPublishedBySlug(slug, locale);
  }

  async createCms(actorId: string, input: CreateCmsContentInput) {
    await this.assertAdmin(actorId);
    const content = await this.cmsRepository.create(actorId, input);
    await this.audit(actorId, 'CMS_CONTENT_CREATE', content.id, { slug: content.slug, contentType: content.contentType });
    return content;
  }

  async updateCms(actorId: string, id: string, input: UpdateCmsContentInput) {
    await this.assertAdmin(actorId);
    const content = await this.cmsRepository.update(actorId, id, input);
    await this.audit(actorId, 'CMS_CONTENT_UPDATE', content.id, { version: content.version, status: content.status });
    return content;
  }

  async upsertProductTranslation(actorId: string, productId: string, input: { locale: string; title: string; description: string; warranty?: string | null }) {
    await this.assertAdmin(actorId);
    const translation = await this.catalogRepository.upsertProductTranslation(productId, input);
    await this.audit(actorId, 'PRODUCT_TRANSLATION_UPSERT', productId, { locale: input.locale });
    return translation;
  }

  private async assertAdmin(actorId: string): Promise<void> {
    const isSuperAdmin = await this.roleRepository.hasRole(actorId, SystemRoleCode.SUPER_ADMIN);
    const isAdmin = await this.roleRepository.hasRole(actorId, SystemRoleCode.ADMIN);
    if (!isSuperAdmin && !isAdmin) {
      throw new AuthorizationError('Only system administrators can manage localized catalog and CMS content.');
    }
  }

  private async audit(actorId: string, action: string, resourceId: string, metadata: Record<string, unknown>) {
    await (prisma as any).auditLog.create({
      data: { actorId, action, resource: 'CmsContent', resourceId, metadata },
    });
  }
}
