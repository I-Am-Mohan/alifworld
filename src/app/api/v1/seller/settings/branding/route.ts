import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { SellerSettingsService } from '@/features/seller/services/seller-settings-service';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';
const service = new SellerSettingsService();

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const form = await req.formData();
    const sellerId = String(form.get('sellerId') || actor.sellerId || '');
    const assetType = String(form.get('assetType') || '') as 'LOGO' | 'BANNER';
    const version = Number(form.get('version'));
    const file = form.get('file');
    if (!sellerId || !['LOGO', 'BANNER'].includes(assetType) || !Number.isInteger(version) || version < 1 || !(file instanceof File)) {
      throw new ValidationError('sellerId, assetType, version, and a branding file are required.');
    }
    if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== sellerId) throw new ValidationError('The seller tenant does not match the active session.');
    await defaultPolicyEngine.assert(actor, 'seller:profile:manage', { type: 'SELLER', id: sellerId, sellerId });
    const settings = await service.uploadBranding(actor.userId, sellerId, assetType, file, version);
    return NextResponse.json({ success: true, data: settings }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error, 'Failed to upload seller branding');
  }
}
