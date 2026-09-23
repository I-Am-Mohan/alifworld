import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CatalogModerationService } from '@/features/catalog/services/moderation-service';
import { ModerationResolveSchema } from '@/features/catalog/moderation';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogModerationService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const actor = authenticateRequest(req); return NextResponse.json({ success: true, data: await service.getReview(actor.userId, (await params).id) }); } catch (error) { return errorResponse(req, error, 'Failed to load moderation review'); } }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const actor = authenticateRequest(req); const parsed = ModerationResolveSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid moderation resolution.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.resolve(actor.userId, (await params).id, parsed.data) }); } catch (error) { return errorResponse(req, error, 'Failed to resolve moderation review'); } }
