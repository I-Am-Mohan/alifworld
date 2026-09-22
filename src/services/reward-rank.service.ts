/**
 * AlifWorld Reward Distribution & Rank Evaluation Domain Service
 * 
 * Orchestrates multi-wallet split calculations, deterministic rounding residual policy,
 * rank qualification evaluations, star band rankings, and periodic leaderboard snapshots.
 * 
 * Invariants: ADR-0022, ADR-0028, ADR-0029, 100% Split Sum invariant, Double-entry conservation
 */

import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { WalletLedgerRepository } from '@/repositories/wallet-ledger.repository';
import { ValidationError, NotFoundError } from '@/shared/errors/app-error';

export interface SplitResult {
  allocations: Record<string, bigint>;
  totalAllocatedPoisha: bigint;
  residualPoisha: bigint;
}

export class RewardRankService {
  private walletRepo: WalletLedgerRepository;

  constructor(walletRepo?: WalletLedgerRepository) {
    this.walletRepo = walletRepo || new WalletLedgerRepository();
  }

  private get prisma() {
    return getPrismaClient() as any;
  }

  /**
   * Calculates discrete integer minor units for each split target based on basis points.
   * Enforces that splits sum to exactly 10,000 bps (100.00%) and preserves total poisha
   * by assigning any truncation residual to the primary MAIN target.
   */
  calculateRewardSplit(basisPoisha: bigint, splits: Record<string, number>): SplitResult {
    const totalBps = Object.values(splits).reduce((acc, curr) => acc + curr, 0);
    if (totalBps !== 10000) {
      throw new ValidationError(`Reward rule splits must sum to exactly 10,000 basis points (100.00%). Received: ${totalBps} bps`);
    }

    const allocations: Record<string, bigint> = {};
    let allocatedSum = BigInt(0);

    for (const [target, bps] of Object.entries(splits)) {
      const part = (basisPoisha * BigInt(bps)) / BigInt(10000);
      allocations[target] = part;
      allocatedSum += part;
    }

    // Allocate any residual poisha from integer division to the MAIN wallet
    const residualPoisha = basisPoisha - allocatedSum;
    if (residualPoisha > BigInt(0) && allocations['MAIN'] !== undefined) {
      allocations['MAIN'] += residualPoisha;
      allocatedSum += residualPoisha;
    }

    return {
      allocations,
      totalAllocatedPoisha: allocatedSum,
      residualPoisha,
    };
  }

  /**
   * Distributes a customer reward across Main (50%), Shopping (20%), Good-Luck (15%),
   * Charity (5%), and Service Charge (10%) via a balanced double-entry journal.
   */
  async distributeCustomerOrderReward(params: {
    orderId: string;
    customerId: string;
    basisPoisha: bigint;
    ruleCode?: string;
    ruleVersion?: string;
  }) {
    const ruleCode = params.ruleCode || 'CUSTOMER_REWARD_SPLIT';
    const ruleVersion = params.ruleVersion || 'v1.0.0';

    // Fetch active reward rule
    let rule = await this.prisma.rewardRule.findFirst({
      where: { ruleCode, version: ruleVersion, isActive: true, deletedAt: null },
    });

    const defaultSplits: Record<string, number> = {
      MAIN: 5000,           // 50%
      SHOPPING: 2000,       // 20%
      GOOD_LUCK: 1500,      // 15%
      CHARITY: 500,         // 5%
      SERVICE_CHARGE: 1000, // 10%
    };

    const splitsToApply = rule ? (rule.splits as Record<string, number>) : defaultSplits;
    const splitResult = this.calculateRewardSplit(params.basisPoisha, splitsToApply);

    // Retrieve or provision customer wallets
    const mainWallet = await this.walletRepo.getOrCreateUserWallet(params.customerId, 'MAIN');
    const shoppingWallet = await this.walletRepo.getOrCreateUserWallet(params.customerId, 'SHOPPING');
    const goodLuckWallet = await this.walletRepo.getOrCreateUserWallet(params.customerId, 'GOOD_LUCK');
    const charityWallet = await this.walletRepo.getOrCreateUserWallet(params.customerId, 'CHARITY');

    // Chart of accounts codes
    const PROMO_EXPENSE_CODE = '5010-PROMOTIONAL-REWARDS-EXPENSE';
    const SERVICE_CHARGE_REVENUE_CODE = '4020-SERVICE-CHARGE-REVENUE';

    await this.walletRepo.getOrCreateAccount(PROMO_EXPENSE_CODE, 'Promotional Rewards Expense', 'EXPENSE');
    await this.walletRepo.getOrCreateAccount(SERVICE_CHARGE_REVENUE_CODE, 'Platform Service Charge Revenue', 'REVENUE');
    await this.walletRepo.getOrCreateAccount('2010-CUSTOMER-MAIN-LIABILITY', 'Customer Main Wallet Liability', 'LIABILITY');
    await this.walletRepo.getOrCreateAccount('2020-CUSTOMER-SHOPPING-LIABILITY', 'Customer Shopping Wallet Liability', 'LIABILITY');
    await this.walletRepo.getOrCreateAccount('2030-CUSTOMER-GOODLUCK-LIABILITY', 'Customer Good Luck Wallet Liability', 'LIABILITY');
    await this.walletRepo.getOrCreateAccount('2040-CUSTOMER-CHARITY-LIABILITY', 'Customer Charity Wallet Liability', 'LIABILITY');

    // Postings array strictly balancing Sum(Debits) == Sum(Credits)
    const postings = [
      // Debit: Promotional Expense (Total basis amount funded)
      {
        accountCode: PROMO_EXPENSE_CODE,
        direction: 'DEBIT' as const,
        amountPoisha: params.basisPoisha,
        description: `Promotional reward pool debit for order ${params.orderId}`,
      },
      // Credit: Customer Main Wallet
      {
        accountCode: '2010-CUSTOMER-MAIN-LIABILITY',
        walletId: mainWallet.id,
        direction: 'CREDIT' as const,
        amountPoisha: splitResult.allocations['MAIN'] || BigInt(0),
        description: 'Customer Main Wallet reward credit',
      },
      // Credit: Customer Shopping Wallet
      {
        accountCode: '2020-CUSTOMER-SHOPPING-LIABILITY',
        walletId: shoppingWallet.id,
        direction: 'CREDIT' as const,
        amountPoisha: splitResult.allocations['SHOPPING'] || BigInt(0),
        description: 'Customer Shopping Wallet reward credit',
      },
      // Credit: Customer Good Luck Wallet
      {
        accountCode: '2030-CUSTOMER-GOODLUCK-LIABILITY',
        walletId: goodLuckWallet.id,
        direction: 'CREDIT' as const,
        amountPoisha: splitResult.allocations['GOOD_LUCK'] || BigInt(0),
        description: 'Customer Good Luck Wallet reward credit',
      },
      // Credit: Customer Charity Wallet
      {
        accountCode: '2040-CUSTOMER-CHARITY-LIABILITY',
        walletId: charityWallet.id,
        direction: 'CREDIT' as const,
        amountPoisha: splitResult.allocations['CHARITY'] || BigInt(0),
        description: 'Customer Charity Wallet reward credit',
      },
      // Credit: Platform Service Charge Revenue
      {
        accountCode: SERVICE_CHARGE_REVENUE_CODE,
        direction: 'CREDIT' as const,
        amountPoisha: splitResult.allocations['SERVICE_CHARGE'] || BigInt(0),
        description: 'Platform service charge revenue deduction',
      },
    ].filter((p) => p.amountPoisha > BigInt(0));

    // Record journal transaction
    const journal = await this.walletRepo.recordJournal({
      description: `Customer order reward distribution for order ${params.orderId}`,
      referenceType: 'REWARD_DISTRIBUTION',
      referenceId: params.orderId,
      totalPoisha: params.basisPoisha,
      ruleVersion,
      postings,
    });

    // Record immutable RewardAllocation snapshot
    let ruleId = rule ? rule.id : generateId(ID_PREFIXES.REWARD_RULE);
    if (!rule) {
      const createdRule = await this.prisma.rewardRule.create({
        data: {
          id: ruleId,
          ruleCode,
          version: ruleVersion,
          name: 'Standard Customer Reward Split (50/20/15/5/10)',
          splits: defaultSplits,
          isActive: true,
        },
      });
      ruleId = createdRule.id;
    }

    const allocationJson: Record<string, string> = {};
    for (const [k, v] of Object.entries(splitResult.allocations)) {
      allocationJson[k] = v.toString();
    }

    const allocation = await this.prisma.rewardAllocation.create({
      data: {
        id: generateId(ID_PREFIXES.REWARD_ALLOCATION),
        ruleId,
        ruleVersion,
        sourceType: 'ORDER',
        sourceId: params.orderId,
        beneficiaryType: 'CUSTOMER',
        beneficiaryId: params.customerId,
        basisPoisha: params.basisPoisha,
        allocatedPoisha: splitResult.totalAllocatedPoisha,
        splitBreakdown: allocationJson,
        journalId: journal.id,
      },
    });

    return { journal, allocation, splitResult };
  }

  /**
   * Evaluates and records rank qualification for a user or seller based on accumulated points.
   */
  async evaluateRankQualification(params: {
    actorId: string;
    actorType: 'CUSTOMER' | 'SELLER';
    points: number;
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    periodDate?: Date;
  }) {
    const category = params.actorType === 'CUSTOMER' ? 'CUSTOMER_CLUB' : 'SELLER_CLUB';
    const periodDate = params.periodDate || new Date();

    // Query active definitions for this category and period, sorted descending by point threshold
    const definitions = await this.prisma.rankDefinition.findMany({
      where: { category, period: params.period, isActive: true, deletedAt: null },
      orderBy: { pointThreshold: 'desc' },
    });

    // Find the highest tier the actor qualifies for
    const qualifiedDef = definitions.find((d: any) => d.pointThreshold !== null && params.points >= d.pointThreshold);
    if (!qualifiedDef) {
      return null;
    }

    const id = generateId(ID_PREFIXES.USER_RANK);
    const userRank = await this.prisma.userRank.create({
      data: {
        id,
        userId: params.actorType === 'CUSTOMER' ? params.actorId : null,
        sellerId: params.actorType === 'SELLER' ? params.actorId : null,
        rankDefinitionId: qualifiedDef.id,
        period: params.period,
        periodDate,
        qualifyingPoints: params.points,
        status: 'ACTIVE',
      },
      include: { rankDefinition: true },
    });

    return userRank;
  }
}
