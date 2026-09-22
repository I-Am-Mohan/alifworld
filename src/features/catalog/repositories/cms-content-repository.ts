import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { localeCandidates } from '../localization';
import { CreateCmsContentInput, UpdateCmsContentInput } from '../localization';

export class CmsContentRepository {
  async findPublishedBySlug(slug: string, locale?: string) {
    const content = await (prisma as any).cmsContent.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: { translations: { where: { locale: { in: localeCandidates(locale) } } } },
    });
    if (!content) return null;
    return { ...content, translation: this.selectTranslation(content.translations, locale) };
  }

  async findById(id: string) {
    return (prisma as any).cmsContent.findFirst({
      where: { id, deletedAt: null },
      include: { translations: true },
    });
  }

  async create(actorId: string, input: CreateCmsContentInput) {
    const existing = await (prisma as any).cmsContent.findFirst({ where: { slug: input.slug, deletedAt: null } });
    if (existing) throw new ConflictError(`CMS content slug '${input.slug}' is already in use.`);

    const id = generatePrefixedId(ENTITY_PREFIXES.CMS_CONTENT);
    return (prisma as any).cmsContent.create({
      data: {
        id,
        contentType: input.contentType,
        slug: input.slug,
        status: input.status,
        createdBy: actorId,
        updatedBy: actorId,
        translations: {
          create: input.translations.map((translation) => ({
            id: generatePrefixedId(ENTITY_PREFIXES.CMS_CONTENT_TRANSLATION),
            ...translation,
          })),
        },
      },
      include: { translations: true },
    });
  }

  async update(actorId: string, id: string, input: UpdateCmsContentInput) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError(`CMS content '${id}' was not found.`);
    if (existing.version !== input.version) {
      throw new ConflictError(`Optimistic concurrency conflict on CMS content '${id}'.`, {
        contentId: id,
        expectedVersion: input.version,
        currentVersion: existing.version,
      });
    }

    return prisma.$transaction(async (tx: any) => {
      const updated = await tx.cmsContent.update({
        where: { id },
        data: {
          contentType: input.contentType,
          slug: input.slug,
          status: input.status,
          updatedBy: actorId,
          version: { increment: 1 },
          ...(input.status === 'PUBLISHED' ? { publishedAt: new Date(), publishedBy: actorId } : {}),
        },
        include: { translations: true },
      });
      if (input.translations) {
        for (const translation of input.translations) {
          await tx.cmsContentTranslation.upsert({
            where: { contentId_locale: { contentId: id, locale: translation.locale } },
            create: { id: generatePrefixedId(ENTITY_PREFIXES.CMS_CONTENT_TRANSLATION), contentId: id, ...translation },
            update: { ...translation, version: { increment: 1 } },
          });
        }
      }
      return updated;
    });
  }

  private selectTranslation(rows: Array<{ locale: string }>, locale?: string) {
    const candidates = localeCandidates(locale);
    for (const candidate of candidates) {
      const match = rows.find((row) => row.locale === candidate);
      if (match) return match;
    }
    return null;
  }
}
