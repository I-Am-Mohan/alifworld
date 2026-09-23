import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { CategoryService } from '@/features/catalog/services/category-service';
import { UpdateCategorySchema } from '@/features/catalog/validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new CategoryService();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: (await params).id }); const parsed = UpdateCategorySchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid category update.', parsed.error.flatten()); const result = await service.updateCategory(actor.userId, (await params).id, parsed.data.version, parsed.data); return NextResponse.json({ success: true, data: result }); } catch (error) { return errorResponse(req, error, 'Failed to update category'); }
}
