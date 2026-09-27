import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz/guard.helper';
import { AppError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { CustomerAddressService } from '@/features/customer/address-service';
import { CustomerAddressInputSchema } from '@/features/customer/addresses';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const service = new CustomerAddressService();

const UpdateAddressSchema = CustomerAddressInputSchema.partial().extend({
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
});

/**
 * GET /api/v1/customer/addresses/[id]
 * Retrieves a single customer address by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const address = await service.getById(actor.userId, id);
    if (!address) throw new NotFoundError('Customer address not found.');
    return NextResponse.json({ success: true, data: address }, { status: 200 });
  } catch (error: any) {
    return toErrorResponse(error, 'Failed to retrieve address');
  }
}

/**
 * PUT /api/v1/customer/addresses/[id]
 * Updates a customer delivery address with optimistic concurrency control.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();

    const parsed = UpdateAddressSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid address update payload', parsed.error.flatten());
    }

    const { version, ...addressData } = parsed.data;
    const updated = await service.update(actor.userId, id, version, addressData);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return toErrorResponse(error, 'Failed to update address');
  }
}

/**
 * PATCH /api/v1/customer/addresses/[id]
 * Sets the specified customer address as the primary default address.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;

    const updated = await service.setDefault(actor.userId, id);
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return toErrorResponse(error, 'Failed to set default address');
  }
}

/**
 * DELETE /api/v1/customer/addresses/[id]
 * Soft-deletes a customer delivery address to preserve historical order snapshots.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const removed = await service.remove(actor.userId, id);
    if (!removed) throw new NotFoundError('Customer address not found.');
    return NextResponse.json({ success: true, data: { id, deleted: true } }, { status: 200 });
  } catch (error: any) {
    const normalized = error instanceof AppError ? error : new NotFoundError('Customer address not found.');
    return NextResponse.json(normalized.toJSON(), { status: normalized.statusCode });
  }
}

function toErrorResponse(error: any, fallbackMessage: string) {
  const normalized =
    error instanceof AppError
      ? error
      : new ValidationError(error instanceof Error ? error.message : fallbackMessage);
  return NextResponse.json(normalized.toJSON(), { status: normalized.statusCode });
}
