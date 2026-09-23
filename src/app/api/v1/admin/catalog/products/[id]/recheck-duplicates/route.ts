import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CatalogModerationService } from '@/features/catalog/services/moderation-service';
import { DuplicateRecheckSchema } from '@/features/catalog/moderation';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogModerationService();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const actor = authenticateRequest(req); const parsed = DuplicateRecheckSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid duplicate recheck.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.recheckProduct(actor.userId, (await params).id, parsed.data.reason) }); } catch (error) { return errorResponse(req, error, 'Failed to recheck product duplicates'); } }
