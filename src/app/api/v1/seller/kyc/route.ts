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
import { AppError, AuthorizationError } from '@/shared/errors/app-error';

const kycService = new SellerKycService();
const kycRepo = new SellerKycDocumentRepository();

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestedSellerId = url.searchParams.get('sellerId');

    const { actor } = await authorizeRequest(req, 'read', {
      type: 'SELLER',
      sellerId: requestedSellerId || undefined,
    });

    const targetSellerId = actor.roles.includes('SUPER_ADMIN')
      ? requestedSellerId || actor.sellerId
      : actor.sellerId;

    if (!targetSellerId) {
      throw new AuthorizationError('No seller tenant associated with this session.');
    }

    const documents = await kycRepo.listBySeller(targetSellerId);

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate request credentials first (rejects unauthenticated requests with 401)
    const actor = authenticateRequest(req);

    // 2. Parse request JSON body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Valid JSON payload is required.' } },
        { status: 400 }
      );
    }

    // 3. Validate input schema
    const parseResult = SubmitKycDocumentInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: parseResult.error.errors[0]?.message || 'Input validation failed',
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const input = parseResult.data;

    // 4. Enforce authorization and tenant isolation
    await defaultPolicyEngine.assert(actor, 'manage', {
      type: 'SELLER',
      id: input.sellerId,
      sellerId: input.sellerId,
    });

    if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== input.sellerId) {
      throw new AuthorizationError('Tenant isolation violation: Cannot submit KYC documents for another store.');
    }

    const document = await kycService.submitDocument(actor.userId, input);

    return NextResponse.json(
      {
        success: true,
        data: document,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
