import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '@/features/catalog/services/category-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CategoryService();

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({ success: true, data: await service.getHierarchy() }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load category hierarchy');
  }
}
