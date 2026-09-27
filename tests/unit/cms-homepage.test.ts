import { describe, expect, it, beforeEach } from 'bun:test';
import { CmsService } from '@/features/cms/services/cms-service';
import { ConflictError } from '@/shared/errors/app-error';

class MockPrismaCmsDb {
  public cmsRecord: any = null;
  public outboxEvents: any[] = [];

  public cmsContent = {
    findFirst: async () => this.cmsRecord,
    upsert: async ({ create, update }: any) => {
      if (!this.cmsRecord) {
        this.cmsRecord = { ...create, translations: [] };
      } else {
        this.cmsRecord = { ...this.cmsRecord, ...update };
      }
      return this.cmsRecord;
    },
  };

  public cmsContentTranslation = {
    upsert: async ({ create, update, where }: any) => {
      if (!this.cmsRecord.translations) {
        this.cmsRecord.translations = [];
      }
      const existingIdx = this.cmsRecord.translations.findIndex(
        (t: any) => t.locale === where.contentId_locale.locale
      );
      if (existingIdx >= 0) {
        this.cmsRecord.translations[existingIdx] = {
          ...this.cmsRecord.translations[existingIdx],
          ...update,
        };
      } else {
        this.cmsRecord.translations.push({ ...create });
      }
      return create;
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

describe('Milestone 115: CMS-Driven Storefront Home Sections & Banners Unit Tests', () => {
  let mockDb: MockPrismaCmsDb;
  let cmsService: CmsService;

  beforeEach(() => {
    mockDb = new MockPrismaCmsDb();
    cmsService = new CmsService(mockDb);
  });

  describe('1. Default Resilient Fallback Layout', () => {
    it('serves high-fidelity default homepage sections when DB is unseeded', async () => {
      const home = await cmsService.getStorefrontHomepage('en-BD');

      expect(home.slug).toBe('storefront-home');
      expect(home.locale).toBe('en-BD');
      expect(home.sections.length).toBeGreaterThanOrEqual(4);

      const hero = home.sections.find((s) => s.type === 'HERO_CAROUSEL');
      expect(hero).toBeDefined();
      expect(hero?.data.banners.length).toBe(3);
      expect(hero?.data.banners[0].title).toContain('Walton Primo S8 Pro');
      expect(hero?.data.banners[0].ctaLink).toBe('/search?categorySlug=smartphones&brand=Walton');
    });

    it('deep-localizes banners and feature blocks into Bengali for bn-BD locale', async () => {
      const homeBn = await cmsService.getStorefrontHomepage('bn-BD');

      expect(homeBn.locale).toBe('bn-BD');
      const hero = homeBn.sections.find((s) => s.type === 'HERO_CAROUSEL');
      expect(hero?.title).toBe('বিশেষ অফার ও ক্যাম্পেইন');
      expect(hero?.data.banners[0].title).toBe('ওয়ালটন প্রিমো এস৮ প্রো: বাংলাদেশের নিজস্ব ফ্ল্যাগশিপ');
      expect(hero?.data.banners[0].ctaText).toBe('স্মার্টফোন দেখুন');

      const highlights = homeBn.sections.find((s) => s.type === 'FEATURE_HIGHLIGHTS');
      expect(highlights?.data.highlights[0].title).toBe('১০০% খাঁটি দেশীয় পণ্য');
    });
  });

  describe('2. Layout Updates and Optimistic Concurrency Control', () => {
    it('updates homepage layout and increments version', async () => {
      // 1. Initial update with version 1
      const updated = await cmsService.updateHomepageLayout(
        {
          version: 1,
          status: 'PUBLISHED',
          sections: [
            {
              id: 'sec_custom_hero',
              type: 'HERO_CAROUSEL',
              title: 'Eid Flash Surge 2026',
              order: 1,
              isActive: true,
              data: { banners: [] },
            },
          ],
        },
        'usr_admin_001'
      );

      expect(updated.version).toBe(1);
      expect(updated.sections.length).toBe(1);
      expect(updated.sections[0].title).toBe('Eid Flash Surge 2026');

      // 2. Next update with matching version 1 -> increments to version 2
      const secondUpdate = await cmsService.updateHomepageLayout(
        {
          version: 1,
          status: 'PUBLISHED',
          sections: [
            {
              id: 'sec_custom_hero',
              type: 'HERO_CAROUSEL',
              title: 'Pohela Boishakh Exclusive',
              order: 1,
              isActive: true,
              data: { banners: [] },
            },
          ],
        },
        'usr_admin_001'
      );

      expect(secondUpdate.version).toBe(2);
      expect(secondUpdate.sections[0].title).toBe('Pohela Boishakh Exclusive');
    });

    it('rejects update with ConflictError when version does not match current version', async () => {
      // Set existing record with version 5
      mockDb.cmsRecord = {
        id: 'cms_home_01',
        slug: 'storefront-home',
        contentType: 'HOMEPAGE_LAYOUT',
        version: 5,
        status: 'PUBLISHED',
      };

      // Attempt update expecting version 2 (stale update)
      expect(
        cmsService.updateHomepageLayout(
          {
            version: 2,
            status: 'PUBLISHED',
            sections: [
              {
                id: 'sec_hero',
                type: 'HERO_CAROUSEL',
                title: 'Stale update',
                order: 1,
                isActive: true,
                data: {},
              },
            ],
          },
          'usr_admin_001'
        )
      ).rejects.toThrow(ConflictError);
    });
  });
});
