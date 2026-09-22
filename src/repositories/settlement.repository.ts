/**
 * Settlement, Commission Ledger & Merchant Payout Repository
 * 
 * Manages platform commission audit ledgers, periodic seller settlement batches,
 * and electronic banking payout disbursals (BEFTN/RTGS/MFS).
 * 
 * Invariants:
 * - ADR-0003: Single modular monolith with tenant isolation
 * - ADR-0022: Immutable financial ledgers & audited reversals
 * - ADR-0028: Reconciled merchant settlements and payout disbursals
 */

import { BaseRepository, parseOffsetPagination, formatPaginatedResult, assertSellerScope } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { NotFoundError, ConflictError, ValidationError } from '@/shared/errors/app-error';

export interface RecordCommissionInput {
  sellerId: string;
  orderId: string;
  fulfillmentGroupId: string;
  basisAmountPoisha: bigint;
  commissionRateBps: number;
  commissionPoisha: bigint;
  ruleVersion?: string;
  notes?: string | null;
}

export interface CreateSettlementInput {
  sellerId: string;
  periodStart: Date;
  periodEnd: Date;
  grossOrderPoisha: bigint;
  shippingFeePoisha: bigint;
  taxPoisha: bigint;
  commissionPoisha: bigint;
  refundDeductionPoisha?: bigint;
  netPayoutPoisha: bigint;
  auditedBy?: string | null;
}

export interface CreatePayoutInput {
  settlementId: string;
  sellerId: string;
  channel: string; // BEFTN, RTGS, NPSB, BKASH_DISBURSEMENT, NAGAD_DISBURSEMENT
  bankName?: string | null;
  accountNumber?: string | null;
  accountTitle?: string | null;
  routingNumber?: string | null;
  amountPoisha: bigint;
}

export class SettlementRepository extends BaseRepository {
  /**
   * Appends an immutable commission earning entry to the platform CommissionLedger.
   */
  async recordCommission(input: RecordCommissionInput) {
    return this.executeSafe(async () => {
      const id = generateId(ID_PREFIXES.COMMISSION);
      return (this.db as any).commissionLedger.create({
        data: {
          id,
          sellerId: input.sellerId,
          orderId: input.orderId,
          fulfillmentGroupId: input.fulfillmentGroupId,
          basisAmountPoisha: input.basisAmountPoisha,
          commissionRateBps: input.commissionRateBps,
          commissionPoisha: input.commissionPoisha,
          ruleVersion: input.ruleVersion ?? 'v1.0.0',
          status: 'EARNED',
          notes: input.notes ?? null,
        },
      });
    }, 'SettlementRepository.recordCommission');
  }

  /**
   * Records a linked, reversing entry in the CommissionLedger.
   */
  async recordCommissionReversal(originalCommissionId: string, reversalAmountPoisha: bigint, reason: string) {
    return this.executeSafe(async () => {
      const original = await (this.db as any).commissionLedger.findUnique({
        where: { id: originalCommissionId },
      });

      if (!original) {
        throw new NotFoundError(`Original commission entry '${originalCommissionId}' not found`);
      }

      const reversalId = generateId(ID_PREFIXES.COMMISSION);
      return (this.db as any).commissionLedger.create({
        data: {
          id: reversalId,
          sellerId: original.sellerId,
          orderId: original.orderId,
          fulfillmentGroupId: original.fulfillmentGroupId,
          basisAmountPoisha: original.basisAmountPoisha,
          commissionRateBps: original.commissionRateBps,
          commissionPoisha: -reversalAmountPoisha, // Signed negative reversal
          ruleVersion: original.ruleVersion,
          status: 'REVERSED',
          reversalOfId: original.id,
          notes: `Reversal: ${reason}`,
        },
      });
    }, 'SettlementRepository.recordCommissionReversal');
  }

  /**
   * SELLER TENANT SCOPING: Retrieves commission entries for a specific merchant.
   */
  async findCommissionsBySellerId(sellerId: string, options: { page?: number; limit?: number } = {}) {
    const { skip, take, page, limit } = parseOffsetPagination(options);

    return this.executeSafe(async () => {
      const where = { sellerId };

      const [items, total] = await Promise.all([
        (this.db as any).commissionLedger.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            order: { select: { orderNumber: true } },
            fulfillmentGroup: { select: { groupNumber: true } },
          },
        }),
        (this.db as any).commissionLedger.count({ where }),
      ]);

      return formatPaginatedResult(items, total, page, limit);
    }, 'SettlementRepository.findCommissionsBySellerId');
  }

  /**
   * Computes unsettled earnings for a merchant across delivered fulfillment groups.
   */
  async getSellerUnsettledEarnings(sellerId: string) {
    return this.executeSafe(async () => {
      const deliveredGroups = await (this.db as any).sellerFulfillmentGroup.findMany({
        where: this.whereNotDeleted({
          sellerId,
          status: 'DELIVERED',
        }),
      });

      let grossOrderPoisha = BigInt(0);
      let shippingFeePoisha = BigInt(0);
      let taxPoisha = BigInt(0);
      let commissionPoisha = BigInt(0);
      let sellerPayoutPoisha = BigInt(0);

      for (const group of deliveredGroups) {
        grossOrderPoisha += BigInt(group.subtotalPoisha);
        shippingFeePoisha += BigInt(group.shippingFeePoisha);
        taxPoisha += BigInt(group.taxPoisha);
        commissionPoisha += BigInt(group.sellerCommissionPoisha);
        sellerPayoutPoisha += BigInt(group.sellerPayoutPoisha);
      }

      return {
        sellerId,
        groupCount: deliveredGroups.length,
        grossOrderPoisha,
        shippingFeePoisha,
        taxPoisha,
        commissionPoisha,
        netPayoutPoisha: sellerPayoutPoisha,
      };
    }, 'SettlementRepository.getSellerUnsettledEarnings');
  }

  /**
   * Creates a formal merchant settlement reconciliation batch.
   */
  async createSettlementBatch(input: CreateSettlementInput) {
    return this.executeSafe(async () => {
      const settlementId = generateId(ID_PREFIXES.SETTLEMENT);
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
      const settlementNumber = `STL-${datePart}-${entropy}`;

      return (this.db as any).sellerSettlement.create({
        data: {
          id: settlementId,
          sellerId: input.sellerId,
          settlementNumber,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          grossOrderPoisha: input.grossOrderPoisha,
          shippingFeePoisha: input.shippingFeePoisha,
          taxPoisha: input.taxPoisha,
          commissionPoisha: input.commissionPoisha,
          refundDeductionPoisha: input.refundDeductionPoisha ?? BigInt(0),
          netPayoutPoisha: input.netPayoutPoisha,
          status: 'AUDITED',
          auditedBy: input.auditedBy ?? null,
          auditedAt: new Date(),
        },
      });
    }, 'SettlementRepository.createSettlementBatch');
  }

  /**
   * Creates an electronic funds payout record against an approved settlement.
   */
  async createPayout(input: CreatePayoutInput) {
    return this.executeSafe(async () => {
      const payoutId = generateId(ID_PREFIXES.PAYOUT);
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
      const payoutNumber = `POT-${datePart}-${entropy}`;

      return (this.db as any).sellerPayout.create({
        data: {
          id: payoutId,
          settlementId: input.settlementId,
          sellerId: input.sellerId,
          payoutNumber,
          channel: input.channel,
          bankName: input.bankName ?? null,
          accountNumber: input.accountNumber ?? null,
          accountTitle: input.accountTitle ?? null,
          routingNumber: input.routingNumber ?? null,
          amountPoisha: input.amountPoisha,
          currency: 'BDT',
          status: 'INITIATED',
        },
      });
    }, 'SettlementRepository.createPayout');
  }

  /**
   * SELLER TENANT SCOPING: Retrieves settlements for a specific merchant.
   */
  async findSettlementsBySellerId(sellerId: string, options: { page?: number; limit?: number } = {}) {
    const { skip, take, page, limit } = parseOffsetPagination(options);

    return this.executeSafe(async () => {
      const where = this.whereNotDeleted({ sellerId });

      const [items, total] = await Promise.all([
        (this.db as any).sellerSettlement.findMany({
          where,
          skip,
          take,
          orderBy: { periodEnd: 'desc' },
          include: {
            payouts: true,
          },
        }),
        (this.db as any).sellerSettlement.count({ where }),
      ]);

      return formatPaginatedResult(items, total, page, limit);
    }, 'SettlementRepository.findSettlementsBySellerId');
  }

  /**
   * Admin Platform Query: Lists all settlements across all merchants with optional status filtering.
   */
  async findAllSettlements(options: { status?: string; page?: number; limit?: number } = {}) {
    const { skip, take, page, limit } = parseOffsetPagination(options);

    return this.executeSafe(async () => {
      const where = this.whereNotDeleted({
        ...(options.status ? { status: options.status } : {}),
      });

      const [items, total] = await Promise.all([
        (this.db as any).sellerSettlement.findMany({
          where,
          skip,
          take,
          orderBy: { periodEnd: 'desc' },
          include: {
            seller: {
              select: {
                id: true,
                businessName: true,
                slug: true,
              },
            },
            payouts: true,
          },
        }),
        (this.db as any).sellerSettlement.count({ where }),
      ]);

      return formatPaginatedResult(items, total, page, limit);
    }, 'SettlementRepository.findAllSettlements');
  }
}
