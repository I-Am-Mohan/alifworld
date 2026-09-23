import { NextRequest, NextResponse } from 'next/server';
import { SellerService } from '@/features/seller/services/seller-service';
import { NotFoundError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new SellerService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const profile = await service.getPublicProfileBySlug(slug);
    if (!profile) throw new NotFoundError('Verified seller store not found.');
    return NextResponse.json({ success: true, data: profile }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load seller store');
  }
}
