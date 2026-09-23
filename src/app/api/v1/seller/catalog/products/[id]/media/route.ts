import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { ProductMediaService } from '@/features/catalog/services/product-media-service';
import { ValidationError } from '@/shared/errors/app-error';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductMediaService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const actor = authenticateRequest(req); return NextResponse.json({ success: true, data: await service.list(actor.userId, (await params).id) }); } catch (error) { return errorResponse(req, error, 'Failed to load product media'); } }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req); const productId = (await params).id; const form = await req.formData(); const file = form.get('file');
    if (!(file instanceof File)) throw new ValidationError('A product image or video file is required.');
    const mediaType = String(form.get('mediaType') || (file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE')) as 'IMAGE' | 'VIDEO';
    const media = await service.upload(actor.userId, productId, { mediaType, isPrimary: String(form.get('isPrimary') || 'false') === 'true', displayOrder: Number(form.get('displayOrder') || 0), altText: String(form.get('altText') || '') || null, altTextBn: String(form.get('altTextBn') || '') || null }, { bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type, fileSize: file.size });
    return NextResponse.json({ success: true, data: media }, { status: 201 });
  } catch (error) { return errorResponse(req, error, 'Failed to upload product media'); }
}
