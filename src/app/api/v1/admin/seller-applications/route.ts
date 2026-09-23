import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerApplicationService } from '@/features/seller/services/seller-application-service';
import { SellerApplicationAdminQuerySchema } from '@/features/seller/application';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new SellerApplicationService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    await defaultPolicyEngine.assert(actor, 'seller_application:review', { type: 'SELLER', id: 'SELLER_APPLICATION_DIRECTORY' });
    const query = SellerApplicationAdminQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
    if (!query.success) throw new ValidationError('Invalid seller application filters.', query.error.flatten());
    const result = await service.listForAdmin(query.data);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to list seller applications');
  }
}
