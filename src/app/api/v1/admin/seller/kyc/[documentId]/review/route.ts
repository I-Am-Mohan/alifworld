import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerKycService } from '@/features/seller/services/seller-kyc-service';
import { VerifyKycDocumentInputSchema } from '@/features/seller/validators';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new SellerKycService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { documentId } = await params;
    await defaultPolicyEngine.assert(actor, 'sellers:verify', { type: 'SELLER', id: documentId });
    const body = await req.json().catch(() => ({}));
    const version = Number(body.version);
    if (!Number.isInteger(version) || version < 1) throw new ValidationError('A positive review version is required.');
    const parsed = VerifyKycDocumentInputSchema.safeParse({ ...body, documentId });
    if (!parsed.success) throw new ValidationError('Invalid KYC review payload.', parsed.error.flatten());
    const result = await service.reviewDocument(actor.userId, version, parsed.data);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to review KYC document');
  }
}
