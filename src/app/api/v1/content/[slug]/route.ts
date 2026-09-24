import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/shared/errors/app-error';
import { LocalizableCatalogService } from '@/features/catalog/services/localizable-catalog-service';

export const dynamic = 'force-dynamic';

const service = new LocalizableCatalogService();

/** GET /api/v1/content/[slug]?locale=bn-BD */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const locale = req.nextUrl.searchParams.get('locale') || req.headers.get('x-locale') || undefined;
    const { slug } = await params;
    const content = await service.getPublishedCms(slug, locale);
    if (!content) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Published content was not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: content }, { status: 200 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message, details: error.details } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve content' } }, { status: 500 });
  }
}
