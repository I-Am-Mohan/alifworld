import { NextRequest, NextResponse } from 'next/server';
import { CategoryAttributeService } from '@/features/catalog/services/attribute-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CategoryAttributeService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ success: true, data: await service.list((await params).id) }); }
  catch (error) { return errorResponse(req, error, 'Failed to load category attributes'); }
}
