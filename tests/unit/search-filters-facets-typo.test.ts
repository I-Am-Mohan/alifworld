import { describe, expect, it, beforeEach } from 'bun:test';
import { PostgresSearchAdapter } from '@/features/search/adapters/postgres-search-adapter';
import { SearchDocument } from '@/features/search/types';

describe('Milestone 113: Search Filters, Facets, Sorting, and Typo Tolerance Unit Tests', () => {
  let adapter: PostgresSearchAdapter;

  const catalogProducts: SearchDocument[] = [
    {
      id: 'prod_walton_01',
      slug: 'walton-primo-s8',
      title: 'Walton Primo S8 Pro Smartphone',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো স্মার্টফোন',
      description: '64MP Quad Camera, 128GB Storage',
      brand: 'Walton',
      categoryName: 'Smartphones',
      categorySlug: 'smartphones',
      sellerId: 'sel_001',
      minPricePoisha: 1850000, // 18,500 BDT
      maxPricePoisha: 1850000,
      currency: 'BDT',
      productPointSnapshot: 150,
      inStock: true,
      tags: ['mobile', 'walton', 'smartphone'],
      rating: 4.8,
      reviewCount: 42,
      isPublished: true,
      createdAt: '2026-09-20T10:00:00.000Z',
      updatedAt: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 'prod_xiaomi_02',
      slug: 'xiaomi-redmi-buds-5',
      title: 'Xiaomi Redmi Buds 5 Pro',
      titleBn: 'শাওমি রেডমি বাডস ৫ প্রো',
      description: 'Active Noise Cancellation Earbuds',
      brand: 'Xiaomi',
      categoryName: 'Audio & Wearables',
      categorySlug: 'audio-wearables',
      sellerId: 'sel_002',
      minPricePoisha: 650000, // 6,500 BDT
      maxPricePoisha: 650000,
      currency: 'BDT',
      productPointSnapshot: 65,
      inStock: true,
      tags: ['audio', 'earbuds', 'xiaomi'],
      rating: 4.6,
      reviewCount: 28,
      isPublished: true,
      createdAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-22T10:00:00.000Z',
    },
    {
      id: 'prod_bata_03',
      slug: 'bata-leather-oxford',
      title: 'Bata Ambassador Premium Leather Oxford',
      titleBn: 'বাটা অ্যাম্বাসেডর প্রিমিয়াম লেদার জুতো',
      description: 'Handcrafted leather shoes',
      brand: 'Bata',
      categoryName: 'Fashion',
      categorySlug: 'fashion',
      sellerId: 'sel_003',
      minPricePoisha: 499000, // 4,990 BDT
      maxPricePoisha: 499000,
      currency: 'BDT',
      productPointSnapshot: 50,
      inStock: true,
      tags: ['footwear', 'bata', 'shoes'],
      rating: 4.7,
      reviewCount: 34,
      isPublished: true,
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:00.000Z',
    },
    {
      id: 'prod_aarong_04',
      slug: 'aarong-cotton-panjabi',
      title: 'Aarong Handcrafted Fine Cotton Panjabi',
      titleBn: 'আড়ং ফাইন কটন পাঞ্জাবি',
      description: 'Festive festive embroidery panjabi',
      brand: 'Aarong',
      categoryName: 'Fashion',
      categorySlug: 'fashion',
      sellerId: 'sel_004',
      minPricePoisha: 350000, // 3,500 BDT
      maxPricePoisha: 350000,
      currency: 'BDT',
      productPointSnapshot: 35,
      inStock: false,
      tags: ['fashion', 'panjabi', 'aarong'],
      rating: 4.9,
      reviewCount: 89,
      isPublished: true,
      createdAt: '2026-09-24T10:00:00.000Z',
      updatedAt: '2026-09-24T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    adapter = new PostgresSearchAdapter(catalogProducts);
  });

  describe('1. Typo-Tolerance Evaluation', () => {
    it('matches "Wlaton" typo to "Walton" product', async () => {
      const res = await adapter.search({ query: 'Wlaton' });
      expect(res.hits.length).toBeGreaterThanOrEqual(1);
      expect(res.hits.some((h) => h.id === 'prod_walton_01')).toBe(true);
    });

    it('matches "Xioami" typo to "Xiaomi" product', async () => {
      const res = await adapter.search({ query: 'Xioami' });
      expect(res.hits.length).toBeGreaterThanOrEqual(1);
      expect(res.hits.some((h) => h.id === 'prod_xiaomi_02')).toBe(true);
    });
  });

  describe('2. Multi-Brand and Multi-Facet Filtering', () => {
    it('filters by multiple brands simultaneously', async () => {
      const res = await adapter.search({
        query: '',
        brands: ['Walton', 'Xiaomi'],
      });

      expect(res.hits.length).toBe(2);
      const hitIds = res.hits.map((h) => h.id);
      expect(hitIds).toContain('prod_walton_01');
      expect(hitIds).toContain('prod_xiaomi_02');
      expect(hitIds).not.toContain('prod_bata_03');
      expect(hitIds).not.toContain('prod_aarong_04');
    });

    it('filters by minimum customer rating', async () => {
      const res = await adapter.search({
        query: '',
        minRating: 4.8,
      });

      expect(res.hits.length).toBe(2);
      const hitIds = res.hits.map((h) => h.id);
      expect(hitIds).toContain('prod_walton_01'); // 4.8
      expect(hitIds).toContain('prod_aarong_04'); // 4.9
      expect(hitIds).not.toContain('prod_xiaomi_02'); // 4.6
    });

    it('filters by minimum Product Points', async () => {
      const res = await adapter.search({
        query: '',
        minPoints: 60,
      });

      expect(res.hits.length).toBe(2);
      expect(res.hits.some((h) => h.id === 'prod_walton_01')).toBe(true); // 150 points
      expect(res.hits.some((h) => h.id === 'prod_xiaomi_02')).toBe(true); // 65 points
    });
  });

  describe('3. Sorting Evaluation', () => {
    it('sorts products by highest Product Points (points_desc)', async () => {
      const res = await adapter.search({
        query: '',
        sortBy: 'points_desc',
      });

      expect(res.hits[0].id).toBe('prod_walton_01'); // 150 points
      expect(res.hits[1].id).toBe('prod_xiaomi_02'); // 65 points
      expect(res.hits[2].id).toBe('prod_bata_03'); // 50 points
      expect(res.hits[3].id).toBe('prod_aarong_04'); // 35 points
    });

    it('sorts products by price ascending (price_asc)', async () => {
      const res = await adapter.search({
        query: '',
        sortBy: 'price_asc',
      });

      expect(res.hits[0].minPricePoisha).toBe(350000); // 3,500 BDT (Aarong)
      expect(res.hits[res.hits.length - 1].minPricePoisha).toBe(1850000); // 18,500 BDT (Walton)
    });
  });

  describe('4. Facet Aggregations', () => {
    it('aggregates ratings facets and categories accurately', async () => {
      const res = await adapter.search({ query: '' });

      expect(res.facets).toBeDefined();
      expect(res.facets?.ratings?.['4_and_above']).toBe(4);
      expect(res.facets?.categories['Fashion']).toBe(2);
      expect(res.facets?.brands['Walton']).toBe(1);
    });
  });
});
