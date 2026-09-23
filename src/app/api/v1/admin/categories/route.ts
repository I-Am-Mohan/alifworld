import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { CategoryService } from '@/features/catalog/services/category-service';
import { CreateCategorySchema } from '@/features/catalog/validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new CategoryService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'CATEGORY_ADMIN' }); return NextResponse.json({ success: true, data: await service.getHierarchy() }); } catch (error) { return errorResponse(req, error, 'Failed to load category administration tree'); }
}

export async function POST(req: NextRequest) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'CATEGORY_ADMIN' }); const parsed = CreateCategorySchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid category.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.createCategory(actor.userId, parsed.data) }, { status: 201 }); } catch (error) { return errorResponse(req, error, 'Failed to create category'); }
}
