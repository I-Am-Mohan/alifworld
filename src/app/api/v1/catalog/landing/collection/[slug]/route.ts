import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { discoveryLandingService } from '@/features/catalog/services/discovery-landing.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/catalog/landing/collection/[slug]
 * Retrieves curated promotional collection landing page with member products.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await discoveryLandingService.getCollectionLanding(slug);

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
