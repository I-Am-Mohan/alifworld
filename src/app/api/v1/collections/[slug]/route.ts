import { NextRequest, NextResponse } from 'next/server';
import { CollectionService } from '@/features/catalog/services/collection-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CollectionService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const collection = await service.getPublishedBySlug((await params).slug);
    if (!collection) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Collection not found.' } }, { status: 404 });
    return NextResponse.json({ success: true, data: collection });
  } catch (error) { return errorResponse(req, error, 'Failed to load collection'); }
}
