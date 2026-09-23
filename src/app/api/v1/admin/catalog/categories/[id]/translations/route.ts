import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { TaxonomySeoService } from '@/features/catalog/services/taxonomy-seo-service';
import { CategoryTranslationWriteSchema } from '@/features/catalog/seo';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new TaxonomySeoService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { authenticateRequest(req); const id = (await params).id; return NextResponse.json({ success: true, data: await service.getCategoryTranslation(id, req.nextUrl.searchParams.get('locale') || undefined) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load category translation'); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const parsed = CategoryTranslationWriteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid category translation.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.upsertCategoryTranslation(actor.userId, (await params).id, parsed.data) });
  } catch (error) { return errorResponse(req, error, 'Failed to save category translation'); }
}
