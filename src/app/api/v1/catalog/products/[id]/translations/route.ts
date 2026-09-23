import { NextRequest, NextResponse } from 'next/server';
import { ProductContentService } from '@/features/catalog/services/product-content-service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';
const service = new ProductContentService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { return NextResponse.json({ success: true, data: await service.get((await params).id, req.nextUrl.searchParams.get('locale') || undefined) }); } catch (error) { return errorResponse(req, error, 'Failed to load localized product content'); } }
