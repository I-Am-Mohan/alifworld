import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { AdminConfigureCreditTermsSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/b2b/admin/organizations/[id]/credit
 * Admin configures credit terms, limits, and versioned loyalty reward rules.
 * Invariant: Credit terms remain disabled until explicitly approved here.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new AuthorizationError('Only AlifWorld Platform Admins can configure credit terms.');
    }

    const { id } = await props.params;
    const body = await req.json();
    const validatedInput = AdminConfigureCreditTermsSchema.parse(body);

    const updated = await b2bCommerceService.adminConfigureCreditTerms(
      actor.userId,
      id,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
