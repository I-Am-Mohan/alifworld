import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { BrandService } from '@/features/catalog/services/brand-service';
import { CreateBrandSchema } from '@/features/catalog/validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new BrandService();

export async function GET(req: NextRequest) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'BRAND_ADMIN' }); return NextResponse.json({ success: true, data: await service.getAdminAll() }); } catch (error) { return errorResponse(req, error, 'Failed to load brand administration list'); }
}

export async function POST(req: NextRequest) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: 'BRAND_ADMIN' }); const parsed = CreateBrandSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid brand.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.createBrand(actor.userId, { ...parsed.data, isVerified: false }) }, { status: 201 }); } catch (error) { return errorResponse(req, error, 'Failed to create brand'); }
}
