import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { AppError, NotFoundError } from '@/shared/errors/app-error';
import { CustomerAddressService } from '@/features/customer/address-service';

const service = new CustomerAddressService();

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const removed = await service.remove(actor.userId, id);
    if (!removed) throw new NotFoundError('Customer address not found.');
    return NextResponse.json({ success: true, data: { id, deleted: true } });
  } catch (error: any) {
    const normalized = error instanceof AppError ? error : new NotFoundError('Customer address not found.');
    return NextResponse.json(normalized.toJSON(), { status: normalized.statusCode });
  }
}
