import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { searchService } from '@/features/search/services/search-service';
import { SearchQuerySchema } from '@/features/search/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/search
 * Full-text product search with faceted filters, multi-lingual support, and automatic degraded-mode fallback.
 * 
 * Query Parameters:
 * - q | query: Search keyword (English or Bengali)
 * - locale: 'en-BD' | 'bn-BD'
 * - categorySlug: Filter by product category
 * - brand: Filter by brand name
 * - sellerId: Filter by seller merchant
 * - minPricePoisha: Minimum price in integer poisha
 * - maxPricePoisha: Maximum price in integer poisha
 * - inStockOnly: Only return in-stock products
 * - sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating'
 * - page: 1-indexed page number
 * - limit: Number of items per page (max 100)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const queryTerm = searchParams.get('q') || searchParams.get('query') || '';

    // Multi-brand support: supports ?brand=A&brand=B or ?brands=A,B
    const brandParams = searchParams.getAll('brand');
    const brandsQuery = searchParams.get('brands');
    const brands = brandParams.length > 0
      ? brandParams
      : brandsQuery
      ? brandsQuery.split(',').map((b) => b.trim()).filter(Boolean)
      : undefined;

    const tagsQuery = searchParams.get('tags');
    const tags = tagsQuery
      ? tagsQuery.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    const validatedInput = SearchQuerySchema.parse({
      query: queryTerm,
      locale: searchParams.get('locale') || undefined,
      categorySlug: searchParams.get('categorySlug') || undefined,
      brand: searchParams.get('brand') || undefined,
      brands,
      sellerId: searchParams.get('sellerId') || undefined,
      minPricePoisha: searchParams.get('minPricePoisha') || undefined,
      maxPricePoisha: searchParams.get('maxPricePoisha') || undefined,
      minRating: searchParams.get('minRating') || undefined,
      minPoints: searchParams.get('minPoints') || undefined,
      inStockOnly: searchParams.get('inStockOnly') || undefined,
      tags,
      sortBy: searchParams.get('sortBy') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const result = await searchService.search(validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: result.hits,
        meta: {
          totalHits: result.totalHits,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          engine: result.engine,
          isDegraded: result.isDegraded,
          executionTimeMs: result.executionTimeMs,
        },
        facets: result.facets,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
