import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { VariantCombinationService } from '@/features/catalog/services/variant-combination-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new VariantCombinationService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { authenticateRequest(req); return NextResponse.json({ success: true, data: await service.validate((await params).id) }); }
  catch (error) { return errorResponse(req, error, 'Failed to validate product variants'); }
}
