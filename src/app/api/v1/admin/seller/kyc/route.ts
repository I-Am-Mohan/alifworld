import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerKycDocumentRepository } from '@/features/seller/repositories/seller-kyc-document-repository';

export const dynamic = 'force-dynamic';
const repository = new SellerKycDocumentRepository();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'sellers:verify', { type: 'SELLER', id: 'KYC_REVIEW_QUEUE' });
    return NextResponse.json({ success: true, data: await repository.listPendingForAdmin() }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load KYC review queue');
  }
}
