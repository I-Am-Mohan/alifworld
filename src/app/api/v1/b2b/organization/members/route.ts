import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { InviteBuyerMemberSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/b2b/organization/members
 * Lists all members of the caller's buyer organization.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const org = await b2bCommerceService.getUserOrganization(actor.userId);
    if (!org) {
      throw new ValidationError('You do not belong to an active business buyer organization.');
    }

    const members = await b2bCommerceService.listMembers(org.id, actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: members,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/b2b/organization/members
 * Invites or adds a member to the caller's buyer organization. (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const org = await b2bCommerceService.getUserOrganization(actor.userId);
    if (!org) {
      throw new ValidationError('You do not belong to an active business buyer organization.');
    }

    const body = await req.json();
    const validatedInput = InviteBuyerMemberSchema.parse(body);

    const member = await b2bCommerceService.inviteMember(org.id, actor.userId, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: member,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
