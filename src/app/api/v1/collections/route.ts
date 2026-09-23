import { NextRequest, NextResponse } from 'next/server';
import { CollectionService } from '@/features/catalog/services/collection-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CollectionService();

export async function GET(req: NextRequest) {
  try { return NextResponse.json({ success: true, data: await service.getPublished() }); }
  catch (error) { return errorResponse(req, error, 'Failed to load collections'); }
}
