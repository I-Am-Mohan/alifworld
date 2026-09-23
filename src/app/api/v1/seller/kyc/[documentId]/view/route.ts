import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerKycService } from '@/features/seller/services/seller-kyc-service';

export const dynamic = 'force-dynamic';
const service = new SellerKycService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { documentId } = await params;
    const result = await service.getSecureDocumentViewUrl(actor.userId, documentId);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to create secure document view URL');
  }
}
