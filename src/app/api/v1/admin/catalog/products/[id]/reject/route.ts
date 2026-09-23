import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { ProductApprovalService } from '@/features/catalog/services/product-approval-service';
import { ProductApprovalActionSchema } from '@/features/catalog/approval';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductApprovalService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = authenticateRequest(req); const id = (await params).id; await defaultPolicyEngine.assert(actor, 'catalog:approve', { type: 'CATALOG', id }); const parsed = ProductApprovalActionSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid rejection decision.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.reject(actor.userId, id, parsed.data) }); }
  catch (error) { return errorResponse(req, error, 'Failed to reject product'); }
}
