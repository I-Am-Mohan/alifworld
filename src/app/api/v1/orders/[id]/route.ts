/**
 * Single Order Object-Level Authorization API Route
 * 
 * Enforces customer self-ownership, seller fulfillment-group tenant isolation,
 * rider delivery assignment, and administrative inspection.
 * 
 * Invariants: ADR-0003, ADR-0010, ADR-0022, ADR-0023, Milestone 042, Milestone 047
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultObjectAuthzService } from '@/shared/authz';
import { OrderRepository } from '@/repositories/order.repository';
import { serializeBigInt } from '@/shared/utils/currency';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const orderRepo = new OrderRepository();

/**
 * GET /api/v1/orders/[id]
 * Retrieves a single order with strict object-level authorization.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = authenticateRequest(req);
    const orderId = params.id;

    // Use OrderRepository.findOwnedOrderById which performs:
    // 1. Database retrieval
    // 2. Customer ownership verification (order.customerId === actor.userId) -> OWNERSHIP_VIOLATION (403)
    // 3. Seller tenant verification (fulfillmentGroup.sellerId === actor.sellerId) -> TENANT_VIOLATION (403)
    // 4. Rider assignment verification -> OWNERSHIP_VIOLATION (403)
    // 5. Super Admin / Admin bypass
    const order = await orderRepo.findOwnedOrderById(orderId, actor);

    return NextResponse.json(
      {
        success: true,
        data: serializeBigInt(order),
      },
      { status: 200 }
    );
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
