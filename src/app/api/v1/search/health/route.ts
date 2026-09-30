import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { searchService } from '@/features/search/services/search-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/search/health
 * Health and degraded-mode readiness probe for storefront search engines.
 *
 * Returns:
 * - status: 'HEALTHY' | 'DEGRADED' | 'DOWN'
 * - primaryEngine: 'meilisearch'
 * - primaryAvailable: boolean
 * - fallbackEngine: 'postgres'
 * - fallbackAvailable: boolean
 * - activeEngine: 'meilisearch' | 'postgres_fallback'
 */
export async function GET(req: NextRequest) {
  try {
    const health = await searchService.checkHealth();

    return NextResponse.json(
      {
        success: true,
        data: health,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
