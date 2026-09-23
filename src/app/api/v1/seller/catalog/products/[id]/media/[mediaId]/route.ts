import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductMediaService } from '@/features/catalog/services/product-media-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductMediaService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) { try { const actor = authenticateRequest(req); return NextResponse.json({ success: true, data: await service.readUrl(actor.userId, (await params).mediaId) }); } catch (error) { return errorResponse(req, error, 'Failed to create product media URL'); } }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) { try { const actor = authenticateRequest(req); return NextResponse.json({ success: true, data: await service.remove(actor.userId, (await params).mediaId) }); } catch (error) { return errorResponse(req, error, 'Failed to delete product media'); } }
