import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { discoveryLandingService } from '@/features/catalog/services/discovery-landing.service';
import { SearchQuerySchema } from '@/features/search/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/catalog/landing/brand/[slug]
 * Retrieves brand profile, verified authority status, and brand product catalog with category facets.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const searchParams = req.nextUrl.searchParams;

    const validatedQuery = SearchQuerySchema.parse({
      query: searchParams.get('q') || searchParams.get('query') || '',
      categorySlug: searchParams.get('categorySlug') || undefined,
      minPricePoisha: searchParams.get('minPricePoisha') || undefined,
      maxPricePoisha: searchParams.get('maxPricePoisha') || undefined,
      minRating: searchParams.get('minRating') || undefined,
      minPoints: searchParams.get('minPoints') || undefined,
      inStockOnly: searchParams.get('inStockOnly') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    const result = await discoveryLandingService.getBrandLanding(slug, validatedQuery);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
