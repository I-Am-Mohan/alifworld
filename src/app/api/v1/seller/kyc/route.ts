/**
 * REST API Route Handler: /api/v1/seller/kyc
 * 
 * Manages regulatory KYC document uploads and inspection with strict tenant isolation.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0024, Milestone 043
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest, authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { SellerKycService } from '@/features/seller/services/seller-kyc-service';
import { SellerKycDocumentRepository } from '@/features/seller/repositories/seller-kyc-document-repository';
import { SubmitKycDocumentInputSchema } from '@/features/seller/validators';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';
import { assertRateLimit } from '@/shared/rate-limit/rate-limit.helper';
import { getRateLimitPolicies } from '@/shared/rate-limit/rate-limit-policies';
import { KycDocumentType } from '@/features/seller/types';
import { validateKycFile } from '@/features/seller/kyc-file-validation';

const kycService = new SellerKycService();
const kycRepo = new SellerKycDocumentRepository();

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestedSellerId = url.searchParams.get('sellerId');
    const { actor } = await authorizeRequest(req, 'read', { type: 'SELLER', sellerId: requestedSellerId || undefined });
    const targetSellerId = actor.roles.includes('SUPER_ADMIN') ? requestedSellerId || actor.sellerId : actor.sellerId;
    if (!targetSellerId) throw new AuthorizationError('No seller tenant associated with this session.');
    return NextResponse.json({ success: true, data: await kycRepo.listBySeller(targetSellerId) });
  } catch (error) {
    return errorResponse(req, error, 'Failed to load KYC documents');
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const deviceId = req.headers.get('x-device-id')?.trim() || 'legacy-json';
    if (deviceId.length > 128) throw new ValidationError('A valid device identifier is required for document uploads.');
    await assertRateLimit(req, getRateLimitPolicies().SELLER_KYC_UPLOAD, `${actor.userId}:${deviceId}`);

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      const body = await req.json().catch(() => null);
      const parseResult = SubmitKycDocumentInputSchema.safeParse(body);
      if (!parseResult.success) throw new ValidationError('Multipart form data with a document file is required.', parseResult.error.flatten());
      const input = parseResult.data;
      await defaultPolicyEngine.assert(actor, 'manage', { type: 'SELLER', id: input.sellerId, sellerId: input.sellerId });
      if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== input.sellerId) throw new AuthorizationError('Tenant isolation violation: Cannot submit KYC documents for another store.');
      return NextResponse.json({ success: true, data: await kycService.submitDocument(actor.userId, input) }, { status: 201 });
    }

    const form = await req.formData();
    const file = form.get('file');
    let sellerId = String(form.get('sellerId') || '').trim();
    if (!sellerId || sellerId === 'null' || sellerId === 'undefined') {
      sellerId = actor.sellerId || actor.userId;
    }
    const documentType = String(form.get('documentType') || '') as KycDocumentType;
    const documentNumber = String(form.get('documentNumber') || '').trim() || undefined;
    if (!(file instanceof File)) throw new ValidationError('A document file is required.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateKycFile(file, bytes);
    const parsed = SubmitKycDocumentInputSchema.pick({ sellerId: true, documentType: true, documentNumber: true }).safeParse({ sellerId, documentType, documentNumber });
    if (!parsed.success) throw new ValidationError('Invalid KYC document metadata.', parsed.error.flatten());
    const document = await kycService.uploadDocument(actor.userId, { ...parsed.data, mimeType: file.type }, bytes);
    return NextResponse.json({ success: true, data: document }, { status: 201 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to upload KYC document');
  }
}
