import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CatalogModerationService } from '@/features/catalog/services/moderation-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new CatalogModerationService();

export async function GET(req: NextRequest) { try { const actor = authenticateRequest(req); return NextResponse.json({ success: true, data: await service.listQueue(actor.userId, { status: req.nextUrl.searchParams.get('status') || undefined, severity: req.nextUrl.searchParams.get('severity') || undefined }) }); } catch (error) { return errorResponse(req, error, 'Failed to load moderation queue'); } }
