import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import {
  getPermittedOrderTransitions,
  getAvailableOrderTransitions,
  ORDER_STATUS_LABELS,
  isOrderTerminal,
} from '@/features/orders/state-machines/order-state-machine';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/orders/[id]/transitions
 * Returns available status transitions for the order, filtered by actor role.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const user = await prisma.user.findFirst({
      where: { id: actor.userId, deletedAt: null },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') throw new AuthorizationError('Active account required.');
    const { id } = await params;

    const order = await (prisma as any).order.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, orderNumber: true, customerId: true },
    });

    if (!order) {
      throw new NotFoundError(`Order '${id}' not found.`);
    }

    const platformAdmin = actor.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
    if (!platformAdmin && order.customerId !== actor.userId) {
      throw new AuthorizationError('Order ownership required.');
    }

    const currentStatus = order.status;
    const actorRole = platformAdmin
      ? 'ADMIN'
      : actor.roles?.includes('SELLER')
        ? 'SELLER'
        : 'CUSTOMER';

    const allTransitions = getAvailableOrderTransitions(currentStatus).filter(
      (status) => !['COMPLETED', 'REFUNDED'].includes(status)
    );
    let permittedTransitions = getPermittedOrderTransitions(currentStatus, actorRole).filter(
      (status) =>
        allTransitions.includes(status) &&
        (actor.roles.includes('SUPER_ADMIN') ||
          actor.permissions.includes(status === 'CANCELLED' ? 'orders:cancel' : 'orders:manage'))
    );
    if (permittedTransitions.includes('CANCELLED')) {
      const groups = await prisma.sellerFulfillmentGroup.findMany({
        where: { orderId: id, deletedAt: null },
        select: { status: true },
      });
      if (
        groups.some(
          (group) => !['PENDING', 'ACCEPTED', 'CANCELLED', 'REJECTED'].includes(group.status)
        )
      ) {
        permittedTransitions = permittedTransitions.filter((status) => status !== 'CANCELLED');
      }
    }
    const terminal = isOrderTerminal(currentStatus);

    const currentLabels = ORDER_STATUS_LABELS[currentStatus as keyof typeof ORDER_STATUS_LABELS];

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          currentStatus,
          currentStatusLabelEn: currentLabels?.en || currentStatus,
          currentStatusLabelBn: currentLabels?.bn || currentStatus,
          isTerminal: terminal,
          allAvailableTransitions: allTransitions.map((s) => ({
            status: s,
            labelEn: ORDER_STATUS_LABELS[s]?.en || s,
            labelBn: ORDER_STATUS_LABELS[s]?.bn || s,
          })),
          permittedTransitions: permittedTransitions.map((s) => ({
            status: s,
            labelEn: ORDER_STATUS_LABELS[s]?.en || s,
            labelBn: ORDER_STATUS_LABELS[s]?.bn || s,
          })),
          actorRole,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
