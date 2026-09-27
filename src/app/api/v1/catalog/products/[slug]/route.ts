import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { productDetailService } from '@/features/catalog/services/product-detail.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/catalog/products/[slug]
 * Retrieves comprehensive localized product details, variants, inventory availability,
 * and JSON-LD structured data. Supports permanent redirect instructions for historical slugs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const localeParam = (searchParams.get('locale') as 'en-BD' | 'bn-BD') || 'en-BD';

    const result = await productDetailService.getProductBySlug(slug, localeParam);

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
