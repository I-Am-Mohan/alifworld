/**
 * Scoped Orders Collection API Route
 * 
 * Enforces server-side tenant scoping and customer ownership at query boundaries.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 043, Milestone 047
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { OrderRepository } from '@/repositories/order.repository';
import { SystemRoleCode } from '@/features/identity/types';
import { serializeBigInt } from '@/shared/utils/currency';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const orderRepo = new OrderRepository();

/**
 * GET /api/v1/orders
 * Returns orders scoped to the caller:
 * - Customers receive exclusively their own placed orders
 * - Sellers receive exclusively orders within their fulfillment groups
 * - Platform Admins receive global orders
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles?.includes(SystemRoleCode.ADMIN);
    const isSeller =
      actor.roles?.includes(SystemRoleCode.SELLER_OWNER) ||
      actor.roles?.includes(SystemRoleCode.SELLER_STAFF);

    // 1. Merchant Tenant Scoping: return seller fulfillment groups
    if (isSeller && actor.sellerId && !isSuperAdmin && !isPlatformAdmin) {
      const result = await orderRepo.findFulfillmentGroupsBySellerId(actor.sellerId, {
        page,
        limit,
        status: searchParams.get('status') || undefined,
      });
      return NextResponse.json({ success: true, ...serializeBigInt(result) }, { status: 200 });
    }

    // 2. Customer Scoping: strictly return orders where customerId matches actor.userId
    // If query parameter 'customerId' was passed, ignore it or verify it matches actor.userId
    const targetCustomerId =
      isSuperAdmin || isPlatformAdmin
        ? searchParams.get('customerId') || undefined
        : actor.userId;

    if (targetCustomerId) {
      const result = await orderRepo.findOrdersByCustomerId(targetCustomerId, { page, limit });
      return NextResponse.json({ success: true, ...serializeBigInt(result) }, { status: 200 });
    }

    // 3. Platform Admin Global View
    const result = await orderRepo.findOrdersByCustomerId('', { page, limit });
    return NextResponse.json({ success: true, ...serializeBigInt(result) }, { status: 200 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
