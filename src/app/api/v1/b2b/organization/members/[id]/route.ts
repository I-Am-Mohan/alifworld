import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { UpdateBuyerMemberSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/b2b/organization/members/[id]
 * Updates member role or spending limit. (Organization Admin only)
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const org = await b2bCommerceService.getUserOrganization(actor.userId);
    if (!org) {
      throw new ValidationError('You do not belong to an active business buyer organization.');
    }

    const body = await req.json();
    const validatedInput = UpdateBuyerMemberSchema.parse(body);

    const updated = await b2bCommerceService.updateMember(
      org.id,
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
