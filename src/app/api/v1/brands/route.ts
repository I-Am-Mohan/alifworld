import { NextRequest, NextResponse } from 'next/server';
import { BrandService } from '@/features/catalog/services/brand-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new BrandService();

export async function GET(req: NextRequest) {
  try { return NextResponse.json({ success: true, data: await service.getAll() }); } catch (error) { return errorResponse(req, error, 'Failed to load approved brands'); }
}
