import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { seoService } from '@/features/catalog/services/seo.service';

export const dynamic = 'force-dynamic';

const SeoQuerySchema = z.object({
  type: z.enum(['product', 'category', 'brand', 'seller', 'collection']),
  slug: z.string().min(1),
  locale: z.enum(['en-BD', 'bn-BD']).default('en-BD'),
});

/**
 * GET /api/v1/seo/metadata
 * Retrieves canonical URLs, hreflang tags, OpenGraph social cards, and Schema.org JSON-LD
 * for mobile Flutter clients and headless consumers.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const validatedInput = SeoQuerySchema.parse({
      type: searchParams.get('type'),
      slug: searchParams.get('slug'),
      locale: searchParams.get('locale') || undefined,
    });

    const { type, slug, locale } = validatedInput;

    const seoData = await seoService.resolveSeoMetadata(type, slug, locale);

    return NextResponse.json(
      {
        success: true,
        data: seoData,
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
