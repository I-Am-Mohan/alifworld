import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { CategoryAttributeService } from '@/features/catalog/services/attribute-service';
import { CategoryAttributeAssignmentsSchema } from '@/features/catalog/validators';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CategoryAttributeService();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const categoryId = (await params).id;
    await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: categoryId });
    const parsed = CategoryAttributeAssignmentsSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ValidationError('Invalid category attribute assignments.', parsed.error.flatten());
    return NextResponse.json({ success: true, data: await service.replace(actor.userId, categoryId, parsed.data.assignments) });
  } catch (error) { return errorResponse(req, error, 'Failed to assign category attributes'); }
}
