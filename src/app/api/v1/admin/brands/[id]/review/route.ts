import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { BrandService } from '@/features/catalog/services/brand-service';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const service = new BrandService();
const reviewSchema = z.object({ action: z.enum(['APPROVE', 'REJECT']), version: z.number().int().positive(), reason: z.string().trim().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = authenticateRequest(req); await defaultPolicyEngine.assert(actor, 'catalog:write', { type: 'CATALOG', id: (await params).id }); const parsed = reviewSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid brand review.', parsed.error.flatten()); const id = (await params).id; const result = parsed.data.action === 'APPROVE' ? await service.approveBrand(actor.userId, id, parsed.data.version) : await service.rejectBrand(actor.userId, id, parsed.data.version, parsed.data.reason || 'Brand approval requirements were not met.'); return NextResponse.json({ success: true, data: result }); } catch (error) { return errorResponse(req, error, 'Failed to review brand'); }
}
