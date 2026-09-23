import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { IdentifierPolicyService } from '@/features/catalog/services/identifier-policy-service';
import { IdentifierCheckSchema } from '@/features/catalog/identifiers';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new IdentifierPolicyService();

export async function GET(req: NextRequest) {
  try {
    authenticateRequest(req);
    const parsed = IdentifierCheckSchema.safeParse({ sku: req.nextUrl.searchParams.get('sku') || undefined, barcode: req.nextUrl.searchParams.get('barcode') || undefined });
    if (!parsed.success) throw new ValidationError('Invalid SKU or barcode.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.check(parsed.data) });
  } catch (error) { return errorResponse(req, error, 'Failed to check catalog identifier uniqueness'); }
}
