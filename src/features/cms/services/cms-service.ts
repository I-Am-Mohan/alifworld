/**
 * AlifWorld CMS Storefront Service
 * 
 * Orchestrates published homepage layout, hero banners, feature highlight blocks,
 * and localized content delivery for customer discovery.
 * 
 * Invariants: ADR-0001, ADR-0003, ADR-0016, ADR-0022
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import {
  HomepageLayout,
  LocalizedHomepage,
  LocalizedHomeSection,
  HomeSection,
  HeroBanner,
} from '../types';
import {
  UpdateHomepageLayoutSchema,
  UpdateHomepageLayoutInput,
} from '../validators';

const DEFAULT_BANNERS: HeroBanner[] = [
  {
    id: 'banner_walton_surge',
    title: 'Walton Primo S8 Pro: The Flagship of Bangladesh',
    titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো: বাংলাদেশের নিজস্ব ফ্ল্যাগশিপ',
    subtitle: '64MP Quad Camera, 128GB ROM, 5000mAh Battery at ৳18,500',
    subtitleBn: '৬৪ মেগাপিক্সেল ক্যামেরা, ১২৮ জিবি রম এবং ৫০০০ এমএএইচ ব্যাটারি মাত্র ১৮,৫০০ টাকায়',
    imageUrl: '/images/banners/walton-s8.jpg',
    ctaText: 'Explore Smartphone',
    ctaTextBn: 'স্মার্টফোন দেখুন',
    ctaLink: '/search?categorySlug=smartphones&brand=Walton',
    badgeText: 'Up to ৳2,000 Cashback',
    badgeTextBn: '২,০০০ টাকা পর্যন্ত ক্যাশব্যাক',
    bgColor: '#1E293B',
    order: 1,
    isActive: true,
  },
  {
    id: 'banner_xiaomi_audio',
    title: 'Xiaomi Redmi Buds 5 Pro Wireless Sound',
    titleBn: 'শাওমি রেডমি বাডস ৫ প্রো ওয়্যারলেস অড���ও',
    subtitle: 'Deep Active Noise Cancellation with +65 Reward Product Points',
    subtitleBn: 'অ্যাক্টিভ নয়েজ ক্যানসেলিং সাথে পাচ্ছেন +৬৫ রিওয়ার্ড প্রোডাক্ট পয়েন্ট',
    imageUrl: '/images/banners/xiaomi-buds.jpg',
    ctaText: 'Shop Earbuds',
    ctaTextBn: 'ইয়ারবাডস কিনুন',
    ctaLink: '/search?categorySlug=audio-wearables&brand=Xiaomi',
    badgeText: 'New Launch',
    badgeTextBn: 'নতুন আগমন',
    bgColor: '#0F172A',
    order: 2,
    isActive: true,
  },
  {
    id: 'banner_aarong_festive',
    title: 'Aarong Handcrafted Festive Panjabi Collection',
    titleBn: 'আড়ং হস্তশিল্প উৎসবের পাঞ্জাবি কালেকশন',
    subtitle: 'Authentic 100% combed cotton embroidered festive wear',
    subtitleBn: '১০০% খাঁটি সুতি ঐতিহ্যবাহী উৎসবের নান্দনিক পোশাক',
    imageUrl: '/images/banners/aarong-panjabi.jpg',
    ctaText: 'View Collection',
    ctaTextBn: 'কালেকশন দেখুন',
    ctaLink: '/search?categorySlug=fashion&brand=Aarong',
    badgeText: 'Festive Exclusive',
    badgeTextBn: 'উৎসবের বিশেষ উপহার',
    bgColor: '#7C2D12',
    order: 3,
    isActive: true,
  },
];

const DEFAULT_SECTIONS: HomeSection[] = [
  {
    id: 'sec_hero_carousel',
    type: 'HERO_CAROUSEL',
    title: 'Featured Campaigns',
    titleBn: 'বিশেষ অফার ও ক্যাম্পেইন',
    subtitle: 'Top promotions and product launches across Bangladesh',
    subtitleBn: 'বাংলাদেশব্যাপী শীর্ষ পণ্য ও ক্যাম্পেইন অফারসমূহ',
    order: 1,
    isActive: true,
    data: {
      banners: DEFAULT_BANNERS,
    },
  },
  {
    id: 'sec_feature_highlights',
    type: 'FEATURE_HIGHLIGHTS',
    title: 'Why Shop on AlifWorld',
    titleBn: 'কেন আলিফওয়ার্ল্ডে কেনাকাটা করবেন',
    subtitle: 'Safe, localized, and multi-wallet reward e-commerce',
    subtitleBn: 'নিরাপদ, স্থানীয় এবং মাল্টি-ওয়ালেট সমৃদ্ধ ই-কমার্স',
    order: 2,
    isActive: true,
    data: {
      highlights: [
        {
          id: 'hl_authentic',
          icon: 'ShieldCheck',
          title: '100% Authentic BD Products',
          titleBn: '১০০% খাঁটি দেশীয় পণ্য',
          description: 'Direct verified sourcing from authorized brands',
          descriptionBn: 'অনুমোদিত ব্র্যান্ড ও সেলার থেকে সরাসরি সংগৃহীত',
        },
        {
          id: 'hl_nationwide',
          icon: 'Truck',
          title: '64 Districts Fast Delivery',
          titleBn: '৬৪ জেলায় দ্রুত ডেলিভারি',
          description: 'Reliable express logistics across all administrative divisions',
          descriptionBn: 'সকল প্রশাসনিক বিভাগে নির্ভরযোগ্য এক্সপ্রেস ডেলিভারি',
        },
        {
          id: 'hl_wallets',
          icon: 'Sparkles',
          title: '4 Segregated Wallets',
          titleBn: '৪টি আলাদা সুরক্ষিত ওয়ালেট',
          description: 'Main, Shopping, Good Luck, and Charity wallet system',
          descriptionBn: 'মেইন, শপিং, গুড লাক এবং চ্যারিটি ওয়ালেট সুবিধা',
        },
        {
          id: 'hl_escrow',
          icon: 'CheckCircle2',
          title: 'Safe Escrow Protection',
          titleBn: 'নিরাপদ এসক্রো সুরক্ষা',
          description: 'Delivery confirmation before merchant payout release',
          descriptionBn: 'পণ্য বুঝে পাওয়ার পর সেলারের নিকট টাকা প্রদান',
        },
      ],
    },
  },
  {
    id: 'sec_featured_categories',
    type: 'FEATURED_CATEGORIES',
    title: 'Explore Top Categories',
    titleBn: 'জনপ্রিয় ক্যাটাগরিগুলো দেখুন',
    subtitle: 'Find everything you need organized by department',
    subtitleBn: 'আপনার প্রয়োজনীয় সকল পণ্য বিভাগ অনুসারে খুঁজুন',
    order: 3,
    isActive: true,
    data: {
      categories: [
        { name: 'Smartphones', nameBn: 'স্মার্টফোন', slug: 'smartphones', count: 120 },
        { name: 'Audio & Wearables', nameBn: 'অডিও ও পরিধানযোগ্য', slug: 'audio-wearables', count: 85 },
        { name: 'Fashion & Clothing', nameBn: 'ফ্যাশন ও পোশাক', slug: 'fashion', count: 340 },
        { name: 'Groceries & Staples', nameBn: 'মুদি ও খাদ্যপণ্য', slug: 'groceries', count: 450 },
        { name: 'Home Appliances', nameBn: 'গৃহস্থালী যন্ত্রপাতি', slug: 'home-appliances', count: 90 },
      ],
    },
  },
  {
    id: 'sec_special_rewards',
    type: 'SPECIAL_REWARDS',
    title: 'Reward Product Points Spotlight',
    titleBn: 'প্রোডাক্ট পয়েন্ট রিওয়ার্ড স্পটলাইট',
    subtitle: 'Earn independent product points to advance Customer Club tier status',
    subtitleBn: 'কাস্টমার ক্লাব টায়ার উন্নীত করতে বিশেষ প্রোডাক্ট পয়েন্ট অর্জন করুন',
    order: 4,
    isActive: true,
    data: {
      callout: 'Points post upon confirmed order completion (ADR-0001/0003)',
      calloutBn: 'অর্ডার সফলভাবে সম্পূর্ণ হলে পয়েন্ট ক্রেডিট হয়',
    },
  },
  {
    id: 'sec_brand_showcase',
    type: 'BRAND_SHOWCASE',
    title: 'Official Brand Partners',
    titleBn: 'অফিসিয়াল ব্র্যান্ড পার্টনারসমূহ',
    subtitle: 'Authorized brand flagships with verified warranties',
    subtitleBn: 'অনুমোদিত ব্র্যান্ড ফ্ল্যাগশিপ এবং নিশ্চিত ওয়ারেন্টি',
    order: 5,
    isActive: true,
    data: {
      brands: ['Walton', 'Xiaomi', 'Aarong', 'Bata', 'PRAN', 'Apex'],
    },
  },
];

export class CmsService {
  constructor(private readonly db: any = prisma) {}

  /**
   * Retrieves the published storefront homepage layout localized for the given language.
   * If not yet seeded in DB, returns high-fidelity fallback layout.
   */
  public async getStorefrontHomepage(locale: 'en-BD' | 'bn-BD' = 'en-BD'): Promise<LocalizedHomepage> {
    try {
      const cmsRecord = await this.db.cmsContent.findFirst({
        where: {
          slug: 'storefront-home',
          contentType: 'HOMEPAGE_LAYOUT',
          deletedAt: null,
        },
        include: {
          translations: true,
        },
      });

      if (!cmsRecord) {
        return this.localizeLayout(DEFAULT_SECTIONS, 1, locale);
      }

      // Check if there is a locale-specific translation payload
      let sections: HomeSection[] = DEFAULT_SECTIONS;
      const translation = cmsRecord.translations?.find((t: any) => t.locale === locale) ||
        cmsRecord.translations?.find((t: any) => t.locale === 'en-BD');

      if (translation && translation.body && Array.isArray((translation.body as any).sections)) {
        sections = (translation.body as any).sections;
      }

      return this.localizeLayout(sections, cmsRecord.version, locale);
    } catch (err) {
      console.warn('Failed to load CMS homepage from database; serving resilient fallback:', err);
      return this.localizeLayout(DEFAULT_SECTIONS, 1, locale);
    }
  }

  /**
   * Updates storefront homepage sections with optimistic concurrency control.
   */
  public async updateHomepageLayout(
    input: UpdateHomepageLayoutInput,
    actorId: string
  ): Promise<HomepageLayout> {
    const validated = UpdateHomepageLayoutSchema.parse(input);

    const existing = await this.db.cmsContent.findFirst({
      where: {
        slug: 'storefront-home',
        contentType: 'HOMEPAGE_LAYOUT',
        deletedAt: null,
      },
    });

    if (existing && existing.version !== validated.version) {
      throw new ConflictError(
        `Optimistic concurrency conflict on homepage layout. Expected version ${validated.version}, found ${existing.version}.`,
        { currentVersion: existing.version, expectedVersion: validated.version }
      );
    }

    const nextVersion = existing ? existing.version + 1 : 1;
    const contentId = existing?.id || generatePrefixedId(ENTITY_PREFIXES.CMS_CONTENT);

    await this.db.cmsContent.upsert({
      where: { slug: 'storefront-home' },
      create: {
        id: contentId,
        contentType: 'HOMEPAGE_LAYOUT',
        slug: 'storefront-home',
        status: validated.status,
        version: nextVersion,
        publishedAt: validated.status === 'PUBLISHED' ? new Date() : null,
        publishedBy: validated.status === 'PUBLISHED' ? actorId : null,
        createdBy: actorId,
        updatedBy: actorId,
      },
      update: {
        status: validated.status,
        version: nextVersion,
        publishedAt: validated.status === 'PUBLISHED' ? new Date() : null,
        publishedBy: validated.status === 'PUBLISHED' ? actorId : null,
        updatedBy: actorId,
      },
    });

    // Upsert English translation
    await this.db.cmsContentTranslation.upsert({
      where: {
        contentId_locale: {
          contentId,
          locale: 'en-BD',
        },
      },
      create: {
        id: generatePrefixedId(ENTITY_PREFIXES.CMS_CONTENT_TRANSLATION),
        contentId,
        locale: 'en-BD',
        title: 'AlifWorld Storefront Homepage (English)',
        body: { sections: validated.sections },
        version: nextVersion,
      },
      update: {
        body: { sections: validated.sections },
        version: nextVersion,
      },
    });

    // Record outbox event
    try {
      await this.db.outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType: 'cms.homepage_updated',
          aggregateType: 'CMS',
          aggregateId: contentId,
          payload: {
            slug: 'storefront-home',
            version: nextVersion,
            status: validated.status,
            sectionCount: validated.sections.length,
            updatedBy: actorId,
          },
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });
    } catch (err) {
      console.warn('Non-fatal: failed to record outbox event for CMS update', err);
    }

    return {
      id: contentId,
      slug: 'storefront-home',
      contentType: 'HOMEPAGE_LAYOUT',
      version: nextVersion,
      status: validated.status,
      sections: validated.sections,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private localizeLayout(
    sections: HomeSection[],
    version: number,
    locale: 'en-BD' | 'bn-BD'
  ): LocalizedHomepage {
    const isBn = locale === 'bn-BD';

    const localizedSections: LocalizedHomeSection[] = sections
      .filter((sec) => sec.isActive)
      .sort((a, b) => a.order - b.order)
      .map((sec) => {
        const title = isBn && sec.titleBn ? sec.titleBn : sec.title;
        const subtitle = isBn && sec.subtitleBn ? sec.subtitleBn : sec.subtitle;

        // Deep localize section-specific data
        const localizedData = { ...sec.data };

        if (sec.type === 'HERO_CAROUSEL' && Array.isArray(sec.data.banners)) {
          localizedData.banners = sec.data.banners
            .filter((b: HeroBanner) => b.isActive)
            .sort((a: HeroBanner, b: HeroBanner) => a.order - b.order)
            .map((b: HeroBanner) => ({
              ...b,
              title: isBn && b.titleBn ? b.titleBn : b.title,
              subtitle: isBn && b.subtitleBn ? b.subtitleBn : b.subtitle,
              ctaText: isBn && b.ctaTextBn ? b.ctaTextBn : b.ctaText,
              badgeText: isBn && b.badgeTextBn ? b.badgeTextBn : b.badgeText,
            }));
        }

        if (sec.type === 'FEATURE_HIGHLIGHTS' && Array.isArray(sec.data.highlights)) {
          localizedData.highlights = sec.data.highlights.map((h: any) => ({
            ...h,
            title: isBn && h.titleBn ? h.titleBn : h.title,
            description: isBn && h.descriptionBn ? h.descriptionBn : h.description,
          }));
        }

        if (sec.type === 'FEATURED_CATEGORIES' && Array.isArray(sec.data.categories)) {
          localizedData.categories = sec.data.categories.map((c: any) => ({
            ...c,
            name: isBn && c.nameBn ? c.nameBn : c.name,
          }));
        }

        return {
          id: sec.id,
          type: sec.type,
          title,
          subtitle,
          order: sec.order,
          isActive: sec.isActive,
          data: localizedData,
        };
      });

    return {
      slug: 'storefront-home',
      locale,
      version,
      sections: localizedSections,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const cmsService = new CmsService();
