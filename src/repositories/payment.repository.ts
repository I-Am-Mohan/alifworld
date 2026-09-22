/**
 * Payment & Refund Repository
 * 
 * Manages customer payments, digital gateway authorizations, idempotency boundaries,
 * raw webhook logs, and item-level partial refunds with financial validation.
 * 
 * Reference: docs/architecture/payments-refunds-commissions-settlements-and-payouts.md
 * Invariants: ADR-0003, ADR-0022, ADR-0028
 */

import { BaseRepository, parseOffsetPagination, formatPaginatedResult } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { NotFoundError, ConflictError, ValidationError } from '@/shared/errors/app-error';

export interface CreatePaymentInput {
  orderId: string;
  customerId: string;
  gatewayProvider: string;
  amountPoisha: bigint;
  feePoisha?: bigint;
  clientIp?: string | null;
  idempotencyKey?: string | null;
  gatewayTransactionId?: string | null;
  gatewayPayload?: any;
}

export interface CreateRefundInput {
  paymentId: string;
  orderId: string;
  fulfillmentGroupId?: string | null;
  amountPoisha: bigint;
  reason: string;
  idempotencyKey?: string | null;
  reversalPoints?: number;
  sellerDeductionPoisha?: bigint;
  taxReversalPoisha?: bigint;
  commissionReversalPoisha?: bigint;
  initiatedBy?: string | null;
  approvedBy?: string | null;
  items?: Array<{
    orderItemId: string;
    quantity: number;
    amountPoisha: bigint;
    taxPoisha?: bigint;
    productPoints?: number;
  }>;
}

export class PaymentRepository extends BaseRepository {
  /**
   * Creates an inward customer payment record with idempotency enforcement.
   */
  async createPayment(input: CreatePaymentInput) {
    return this.executeSafe(async () => {
      // Check idempotency if key provided
      if (input.idempotencyKey) {
        const existing = await (this.db as any).payment.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) {
          return existing;
        }
      }

      const paymentId = generateId(ID_PREFIXES.PAYMENT);
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
      const paymentNumber = `PAY-${datePart}-${entropy}`;

      return (this.db as any).payment.create({
        data: {
          id: paymentId,
          orderId: input.orderId,
          customerId: input.customerId,
          paymentNumber,
          gatewayProvider: input.gatewayProvider,
          gatewayTransactionId: input.gatewayTransactionId ?? null,
          status: 'PENDING',
          amountPoisha: input.amountPoisha,
          currency: 'BDT',
          feePoisha: input.feePoisha ?? BigInt(0),
          clientIp: input.clientIp ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
          gatewayPayload: input.gatewayPayload ?? null,
        },
      });
    }, 'PaymentRepository.createPayment');
  }

  /**
   * Finds a payment by payment ID.
   */
  async findById(paymentId: string) {
    return this.executeSafe(async () => {
      return (this.db as any).payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
          customer: true,
          refunds: {
            include: { items: true },
          },
        },
      });
    }, 'PaymentRepository.findById');
  }

  /**
   * Finds a payment by order ID.
   */
  async findByOrderId(orderId: string) {
    return this.executeSafe(async () => {
      return (this.db as any).payment.findFirst({
        where: { orderId },
        include: {
          refunds: true,
        },
      });
    }, 'PaymentRepository.findByOrderId');
  }

  /**
   * Updates payment status and timestamps.
   */
  async updateStatus(
    paymentId: string,
    status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED',
    options: {
      gatewayTransactionId?: string;
      gatewayPayload?: any;
      failureReason?: string;
    } = {}
  ) {
    return this.executeSafe(async () => {
      const now = new Date();
      return (this.db as any).payment.update({
        where: { id: paymentId },
        data: {
          status,
          ...(options.gatewayTransactionId ? { gatewayTransactionId: options.gatewayTransactionId } : {}),
          ...(options.gatewayPayload ? { gatewayPayload: options.gatewayPayload } : {}),
          ...(options.failureReason ? { failureReason: options.failureReason, failedAt: now } : {}),
          ...(status === 'AUTHORIZED' ? { authorizedAt: now } : {}),
          ...(status === 'CAPTURED' ? { capturedAt: now } : {}),
        },
      });
    }, 'PaymentRepository.updateStatus');
  }

  /**
   * Calculates total captured amount and already refunded amount for a payment.
   */
  async getRefundableBalance(paymentId: string): Promise<{
    capturedPoisha: bigint;
    refundedPoisha: bigint;
    availableRefundPoisha: bigint;
  }> {
    return this.executeSafe(async () => {
      const payment = await (this.db as any).payment.findUnique({
        where: { id: paymentId },
        include: {
          refunds: {
            where: { status: { in: ['APPROVED', 'PROCESSED'] } },
          },
        },
      });

      if (!payment) {
        throw new NotFoundError(`Payment '${paymentId}' not found`);
      }

      const capturedPoisha = BigInt(payment.amountPoisha);
      const refundedPoisha = payment.refunds.reduce(
        (sum: bigint, r: any) => sum + BigInt(r.amountPoisha),
        BigInt(0)
      );
      const availableRefundPoisha = capturedPoisha - refundedPoisha;

      return {
        capturedPoisha,
        refundedPoisha,
        availableRefundPoisha: availableRefundPoisha > BigInt(0) ? availableRefundPoisha : BigInt(0),
      };
    }, 'PaymentRepository.getRefundableBalance');
  }

  /**
   * Creates a refund with optional item-level breakdown inside an atomic transaction.
   * Enforces that total refunded does not exceed captured payment amount.
   */
  async createRefund(input: CreateRefundInput) {
    return this.executeSafe(async () => {
      return this.withTransaction(async (tx) => {
        // Idempotency check
        if (input.idempotencyKey) {
          const existing = await (tx as any).refund.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: { items: true },
          });
          if (existing) {
            return existing;
          }
        }

        const payment = await (tx as any).payment.findUnique({
          where: { id: input.paymentId },
          include: {
            refunds: {
              where: { status: { in: ['APPROVED', 'PROCESSED'] } },
            },
          },
        });

        if (!payment) {
          throw new NotFoundError(`Payment '${input.paymentId}' not found`);
        }

        const capturedPoisha = BigInt(payment.amountPoisha);
        const alreadyRefunded = payment.refunds.reduce(
          (sum: bigint, r: any) => sum + BigInt(r.amountPoisha),
          BigInt(0)
        );
        const maxRefundable = capturedPoisha - alreadyRefunded;

        if (input.amountPoisha > maxRefundable) {
          throw new ValidationError(
            `Refund amount (${input.amountPoisha} poisha) exceeds max refundable balance (${maxRefundable} poisha)`,
            { requested: input.amountPoisha.toString(), available: maxRefundable.toString() }
          );
        }

        const refundId = generateId(ID_PREFIXES.REFUND);
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
        const refundNumber = `REF-${datePart}-${entropy}`;

        const refund = await (tx as any).refund.create({
          data: {
            id: refundId,
            paymentId: input.paymentId,
            orderId: input.orderId,
            fulfillmentGroupId: input.fulfillmentGroupId ?? null,
            refundNumber,
            amountPoisha: input.amountPoisha,
            currency: 'BDT',
            status: 'PROCESSED',
            reason: input.reason,
            idempotencyKey: input.idempotencyKey ?? null,
            reversalPoints: input.reversalPoints ?? 0,
            sellerDeductionPoisha: input.sellerDeductionPoisha ?? BigInt(0),
            taxReversalPoisha: input.taxReversalPoisha ?? BigInt(0),
            commissionReversalPoisha: input.commissionReversalPoisha ?? BigInt(0),
            initiatedBy: input.initiatedBy ?? null,
            approvedBy: input.approvedBy ?? null,
            processedAt: new Date(),
          },
        });

        // Insert item-level breakdown if provided
        if (input.items && input.items.length > 0) {
          for (const item of input.items) {
            await (tx as any).refundItem.create({
              data: {
                id: generateId(ID_PREFIXES.REFUND_ITEM),
                refundId: refund.id,
                orderItemId: item.orderItemId,
                quantity: item.quantity,
                amountPoisha: item.amountPoisha,
                taxPoisha: item.taxPoisha ?? BigInt(0),
                productPoints: item.productPoints ?? 0,
              },
            });
          }
        }

        // Update payment status (PARTIALLY_REFUNDED or REFUNDED)
        const newTotalRefunded = alreadyRefunded + input.amountPoisha;
        const newPaymentStatus = newTotalRefunded >= capturedPoisha ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await (tx as any).payment.update({
          where: { id: input.paymentId },
          data: { status: newPaymentStatus },
        });

        return refund;
      });
    }, 'PaymentRepository.createRefund');
  }

  /**
   * Logs a raw gateway webhook event and detects duplicates by externalEventId.
   */
  async logWebhookEvent(data: {
    gatewayProvider: string;
    eventType: string;
    externalEventId?: string | null;
    signature?: string | null;
    payload: any;
  }) {
    return this.executeSafe(async () => {
      // Check duplicate
      if (data.externalEventId) {
        const existing = await (this.db as any).paymentWebhookLog.findFirst({
          where: {
            gatewayProvider: data.gatewayProvider,
            externalEventId: data.externalEventId,
          },
        });
        if (existing) {
          return { log: existing, isDuplicate: true };
        }
      }

      const log = await (this.db as any).paymentWebhookLog.create({
        data: {
          id: generateId(ID_PREFIXES.WEBHOOK_LOG),
          gatewayProvider: data.gatewayProvider,
          eventType: data.eventType,
          externalEventId: data.externalEventId ?? null,
          signature: data.signature ?? null,
          payload: data.payload,
          status: 'PENDING',
        },
      });

      return { log, isDuplicate: false };
    }, 'PaymentRepository.logWebhookEvent');
  }

  /**
   * Updates webhook log processing status.
   */
  async updateWebhookLogStatus(logId: string, status: 'VERIFIED' | 'PROCESSED' | 'INVALID_SIGNATURE' | 'DUPLICATE') {
    return this.executeSafe(async () => {
      return (this.db as any).paymentWebhookLog.update({
        where: { id: logId },
        data: {
          status,
          processedAt: new Date(),
        },
      });
    }, 'PaymentRepository.updateWebhookLogStatus');
  }
}
