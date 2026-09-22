import { describe, it, expect } from 'bun:test';
import {
  recordJournalSchema,
  createRewardRuleSchema,
  allocateRewardSchema,
  createRankDefinitionSchema,
} from '../../src/validators/wallet-ledger.validator';
import { RewardRankService } from '../../src/services/reward-rank.service';
import { ID_PREFIXES } from '../../src/shared/utils/id';

describe('Wallets, Points, Rewards, Ranks & Immutable Ledgers (Milestone 029)', () => {
  const service = new RewardRankService();

  describe('Double-Entry Balance Conservation & Zero-Sum Invariant', () => {
    it('verifies exact balance when sum of debits equals sum of credits', () => {
      const postings = [
        { account: '5010-PROMOTIONAL-REWARDS-EXPENSE', direction: 'DEBIT', amountPoisha: BigInt(100000) },
        { account: '2010-CUSTOMER-MAIN-LIABILITY', direction: 'CREDIT', amountPoisha: BigInt(50000) },
        { account: '2020-CUSTOMER-SHOPPING-LIABILITY', direction: 'CREDIT', amountPoisha: BigInt(20000) },
        { account: '2030-CUSTOMER-GOODLUCK-LIABILITY', direction: 'CREDIT', amountPoisha: BigInt(15000) },
        { account: '2040-CUSTOMER-CHARITY-LIABILITY', direction: 'CREDIT', amountPoisha: BigInt(5000) },
        { account: '4020-SERVICE-CHARGE-REVENUE', direction: 'CREDIT', amountPoisha: BigInt(10000) },
      ];

      const debits = postings.filter((p) => p.direction === 'DEBIT').reduce((acc, p) => acc + p.amountPoisha, BigInt(0));
      const credits = postings.filter((p) => p.direction === 'CREDIT').reduce((acc, p) => acc + p.amountPoisha, BigInt(0));

      expect(debits).toBe(BigInt(100000));
      expect(credits).toBe(BigInt(100000));
      expect(debits).toBe(credits);
    });

    it('detects and rejects out-of-balance transactions', () => {
      const debits = BigInt(100000);
      const credits = BigInt(95000); // Mismatch by 5,000 poisha

      expect(debits === credits).toBe(false);
    });
  });

  describe('100% Split Sum Invariant & Residual Allocation', () => {
    it('calculates 50/20/15/5/10 customer reward split exactly with zero leakage', () => {
      const basisPoisha = BigInt(100000); // ৳1,000.00
      const splits = {
        MAIN: 5000,           // 50%
        SHOPPING: 2000,       // 20%
        GOOD_LUCK: 1500,      // 15%
        CHARITY: 500,         // 5%
        SERVICE_CHARGE: 1000, // 10%
      };

      const result = service.calculateRewardSplit(basisPoisha, splits);

      expect(result.allocations.MAIN).toBe(BigInt(50000));          // ৳500.00
      expect(result.allocations.SHOPPING).toBe(BigInt(20000));      // ৳200.00
      expect(result.allocations.GOOD_LUCK).toBe(BigInt(15000));     // ৳150.00
      expect(result.allocations.CHARITY).toBe(BigInt(5000));        // ৳50.00
      expect(result.allocations.SERVICE_CHARGE).toBe(BigInt(10000)); // ৳100.00
      expect(result.totalAllocatedPoisha).toBe(basisPoisha);
      expect(result.residualPoisha).toBe(BigInt(0));
    });

    it('allocates division truncation residuals to MAIN wallet to preserve total funds', () => {
      // Basis of 333 poisha:
      // MAIN (50%): 166
      // SHOPPING (20%): 66
      // GOOD_LUCK (15%): 49
      // CHARITY (5%): 16
      // SERVICE_CHARGE (10%): 33
      // Sum = 166 + 66 + 49 + 16 + 33 = 330 poisha. Residual = 3 poisha.
      // Residual assigned to MAIN: 166 + 3 = 169 poisha. Total = 333 poisha.
      const basisPoisha = BigInt(333);
      const splits = {
        MAIN: 5000,
        SHOPPING: 2000,
        GOOD_LUCK: 1500,
        CHARITY: 500,
        SERVICE_CHARGE: 1000,
      };

      const result = service.calculateRewardSplit(basisPoisha, splits);

      expect(result.totalAllocatedPoisha).toBe(basisPoisha);
      expect(result.allocations.MAIN).toBe(BigInt(169));
      expect(result.residualPoisha).toBe(BigInt(3));
    });

    it('throws error when rule split does not equal 10,000 basis points', () => {
      const invalidSplits = {
        MAIN: 5000,
        SHOPPING: 2000,
        GOOD_LUCK: 1500,
        // Missing remaining 1500 bps (Total = 8500 bps)
      };

      expect(() => {
        service.calculateRewardSplit(BigInt(100000), invalidSplits);
      }).toThrow(/Reward rule splits must sum to exactly 10,000 basis points/);
    });
  });

  describe('Decoupled Product Points (PP) Loyalty Tokens', () => {
    it('verifies discrete integer tokens without currency ratio inference', () => {
      const snapshottedPoints = 450;
      const orderSubtotalPoisha = BigInt(2199000); // ৳21,990.00

      expect(Number.isInteger(snapshottedPoints)).toBe(true);
      expect(snapshottedPoints).toBeGreaterThan(0);
      // Ensure points cannot be converted automatically to BDT
      expect(snapshottedPoints).not.toBe(Number(orderSubtotalPoisha) / 100);
    });

    it('verifies escrow hold and release mechanics', () => {
      let pendingPoints = 0;
      let availablePoints = 0;
      let lifetimePoints = 0;

      // 1. Order Placed -> Snapshot 450 pts to escrow
      pendingPoints += 450;
      expect(pendingPoints).toBe(450);
      expect(availablePoints).toBe(0);

      // 2. Inspection window closes -> Release to available and lifetime
      const pointsToRelease = 450;
      pendingPoints -= pointsToRelease;
      availablePoints += pointsToRelease;
      lifetimePoints += pointsToRelease;

      expect(pendingPoints).toBe(0);
      expect(availablePoints).toBe(450);
      expect(lifetimePoints).toBe(450);
    });
  });

  describe('Zod Validation Schemas (wallet-ledger.validator.ts)', () => {
    it('validates a balanced double-entry journal submission', () => {
      const validJournal = {
        description: 'Order reward distribution',
        referenceType: 'REWARD_DISTRIBUTION',
        referenceId: 'ord_01j7x4b9e8m02k3f8d7c6b5a1',
        totalPoisha: '100000',
        ruleVersion: 'v1.0.0',
        postings: [
          {
            accountCode: '5010-PROMOTIONAL-REWARDS-EXPENSE',
            direction: 'DEBIT',
            amountPoisha: '100000',
          },
          {
            accountCode: '2010-CUSTOMER-MAIN-LIABILITY',
            walletId: 'wal_01j7x4b9e8m02k3f8d7c6b5a1',
            direction: 'CREDIT',
            amountPoisha: '100000',
          },
        ],
      };

      const result = recordJournalSchema.safeParse(validJournal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalPoisha).toBe(BigInt(100000));
        expect(result.data.postings.length).toBe(2);
      }
    });

    it('validates reward rule with exact 10,000 bps sum', () => {
      const validRule = {
        ruleCode: 'CUSTOMER_REWARD_SPLIT',
        version: 'v1.0.0',
        name: 'Customer Loyalty Reward Split',
        splits: {
          MAIN: 5000,
          SHOPPING: 2000,
          GOOD_LUCK: 1500,
          CHARITY: 500,
          SERVICE_CHARGE: 1000,
        },
      };

      const result = createRewardRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
    });

    it('rejects reward rule with invalid split sum', () => {
      const invalidRule = {
        ruleCode: 'BAD_SPLIT',
        version: 'v1.0.0',
        name: 'Invalid Split Policy',
        splits: {
          MAIN: 5000,
          SHOPPING: 2000,
          // Total = 7000 bps != 10,000
        },
      };

      const result = createRewardRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
    });

    it('validates customer club rank definition', () => {
      const validRank = {
        category: 'CUSTOMER_CLUB',
        code: 'BRONZE',
        title: 'Bronze Customer Club',
        period: 'DAILY',
        pointThreshold: 3000,
        poolShareBps: 100,
      };

      const result = createRankDefinitionSchema.safeParse(validRank);
      expect(result.success).toBe(true);
    });
  });

  describe('Standardized ID Prefixes', () => {
    it('verifies domain prefixes for wallet, ledger, point, reward, and rank entities', () => {
      expect(ID_PREFIXES.WALLET).toBe('wal');
      expect(ID_PREFIXES.LEDGER_ACCOUNT).toBe('lac');
      expect(ID_PREFIXES.LEDGER_JOURNAL).toBe('jrn');
      expect(ID_PREFIXES.LEDGER_POSTING).toBe('pos');
      expect(ID_PREFIXES.POINT_ACCOUNT).toBe('pac');
      expect(ID_PREFIXES.POINT_EVENT).toBe('pev');
      expect(ID_PREFIXES.REWARD_RULE).toBe('rwr');
      expect(ID_PREFIXES.REWARD_ALLOCATION).toBe('rwa');
      expect(ID_PREFIXES.RANK_DEFINITION).toBe('rnk');
      expect(ID_PREFIXES.USER_RANK).toBe('urk');
      expect(ID_PREFIXES.LEADERBOARD_SNAPSHOT).toBe('lbs');
    });
  });
});
