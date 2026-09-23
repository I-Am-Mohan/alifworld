import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { AppError, ValidationError } from '@/shared/errors/app-error';
import { CustomerAddressInputSchema } from '@/features/customer/addresses';
import { CustomerAddressService } from '@/features/customer/address-service';

export const dynamic = 'force-dynamic';
const service = new CustomerAddressService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    return NextResponse.json({ success: true, data: await service.list(actor.userId) });
  } catch (error: any) {
    return toErrorResponse(error, 'Failed to retrieve customer addresses');
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const parsed = CustomerAddressInputSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError('Invalid Bangladesh address payload.', parsed.error.flatten());
    const address = await service.create(actor.userId, parsed.data);
    return NextResponse.json({ success: true, data: address }, { status: 201 });
  } catch (error: any) {
    return toErrorResponse(error, 'Failed to create customer address');
  }
}

function toErrorResponse(error: any, fallbackMessage: string) {
  const normalized = error instanceof AppError
    ? error
    : new ValidationError(error instanceof Error ? error.message : fallbackMessage);
  return NextResponse.json(normalized.toJSON(), { status: normalized.statusCode });
}
