import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductContentService } from '@/features/catalog/services/product-content-service';
import { LocalizedProductTranslationSchema } from '@/features/catalog/localization';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductContentService();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const actor = authenticateRequest(req); const parsed = LocalizedProductTranslationSchema.safeParse(await req.json().catch(() => ({}))); if (!parsed.success) throw new ValidationError('Invalid localized product content.', parsed.error.flatten()); return NextResponse.json({ success: true, data: await service.upsert(actor.userId, (await params).id, parsed.data) }); } catch (error) { return errorResponse(req, error, 'Failed to save localized product content'); } }
