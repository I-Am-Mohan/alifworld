import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/shared/errors/app-error';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { LocalizableCatalogService } from '@/features/catalog/services/localizable-catalog-service';
import { CreateCmsContentSchema } from '@/features/catalog/localization';

const service = new LocalizableCatalogService();

/** POST /api/v1/admin/content */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const parsed = CreateCmsContentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid CMS content payload', details: parsed.error.flatten() } }, { status: 400 });
    }
    const content = await service.createCms(auth.userId, parsed.data);
    return NextResponse.json({ success: true, data: content }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message, details: error.details } }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create CMS content' } }, { status: 500 });
  }
}
