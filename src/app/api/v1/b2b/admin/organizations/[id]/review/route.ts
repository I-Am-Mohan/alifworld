import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { AdminReviewOrganizationSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/b2b/admin/organizations/[id]/review
 * Admin reviews and approves, rejects, or suspends a business buyer organization.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new AuthorizationError('Only AlifWorld Platform Admins can review buyer organizations.');
    }

    const { id } = await props.params;
    const body = await req.json();
    const validatedInput = AdminReviewOrganizationSchema.parse(body);

    const updated = await b2bCommerceService.adminReviewOrganization(
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
