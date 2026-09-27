/**
 * AlifWorld Search Validators
 * 
 * Strict Zod schemas for storefront query requests, indexation payloads, and filters.
 * 
 * Invariants: ADR-0003, ADR-0022
 */

import { z } from 'zod';

export const SearchSortOptionsEnum = z.enum([
  'relevance',
  'price_asc',
  'price_desc',
  'newest',
  'rating',
]);

export const SearchQuerySchema = z.object({
  query: z.string().default(''),
  locale: z.enum(['en-BD', 'bn-BD']).default('en-BD'),
  categorySlug: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  sellerId: z.string().optional().nullable(),
  minPricePoisha: z.coerce.number().int().min(0).optional(),
  maxPricePoisha: z.coerce.number().int().min(0).optional(),
  inStockOnly: z.coerce.boolean().default(false),
  sortBy: SearchSortOptionsEnum.default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type SearchQueryRawInput = z.input<typeof SearchQuerySchema>;

export const SearchDocumentSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  titleBn: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionBn: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  categorySlug: z.string().optional().nullable(),
  sellerId: z.string().min(1),
  sellerName: z.string().optional().nullable(),
  minPricePoisha: z.number().int().min(0),
  maxPricePoisha: z.number().int().min(0),
  currency: z.literal('BDT').default('BDT'),
  productPointSnapshot: z.number().int().min(0),
  inStock: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).optional().nullable(),
  reviewCount: z.number().int().min(0).optional().nullable(),
  isPublished: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const IndexDocumentsSchema = z.object({
  documents: z.array(SearchDocumentSchema).min(1),
});

export type IndexDocumentsInput = z.infer<typeof IndexDocumentsSchema>;

export const DeleteDocumentsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type DeleteDocumentsInput = z.infer<typeof DeleteDocumentsSchema>;
