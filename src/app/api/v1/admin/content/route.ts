import { NextRequest, NextResponse } from 'next/server';
import { validationErrorResponse, errorResponse } from '@/shared/api/error-response';
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
      return validationErrorResponse(req, parsed.error);
    }
    const content = await service.createCms(auth.userId, parsed.data);
    return NextResponse.json({ success: true, data: content }, { status: 201 });
  } catch (error: any) {
    return errorResponse(req, error, 'Failed to create CMS content');
  }
}
