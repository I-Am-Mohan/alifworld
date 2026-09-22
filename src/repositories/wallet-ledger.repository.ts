/**
 * AlifWorld Double-Entry Wallet & Ledger Repository
 * 
 * Manages multi-account wallets, formal chart of accounts, and balanced
 * double-entry journal transactions strictly conserving Sum(Debits) == Sum(Credits).
 * 
 * Invariants: ADR-0022, ADR-0028, ADR-0029, Integer Poisha precision
 */

import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { ValidationError, ConflictError, NotFoundError } from '@/shared/errors/app-error';

export interface JournalPostingInput {
  accountCode: string;
  walletId?: string | null;
  direction: 'DEBIT' | 'CREDIT';
  amountPoisha: bigint;
  currency?: string;
  description?: string;
}

export interface RecordJournalParams {
  description: string;
  referenceType: 'ORDER_PAYMENT' | 'REWARD_DISTRIBUTION' | 'REFUND_ADJUSTMENT' | 'SETTLEMENT_CLEARING' | 'WITHDRAWAL' | 'MANUAL_AUDIT';
  referenceId?: string | null;
  totalPoisha: bigint;
  idempotencyKey?: string | null;
  ruleVersion?: string | null;
  postings: JournalPostingInput[];
}

export class WalletLedgerRepository {
  private get prisma() {
    return getPrismaClient() as any;
  }

  /**
   * Retrieves or provisions a wallet for a customer user.
   */
  async getOrCreateUserWallet(userId: string, type: 'MAIN' | 'SHOPPING' | 'GOOD_LUCK' | 'CHARITY') {
    let wallet = await this.prisma.wallet.findFirst({
      where: { userId, type, deletedAt: null },
    });

    if (!wallet) {
      const id = generateId(ID_PREFIXES.WALLET);
      wallet = await this.prisma.wallet.create({
        data: {
          id,
          userId,
          type,
          currency: 'BDT',
          availablePoisha: BigInt(0),
          pendingPoisha: BigInt(0),
          status: 'ACTIVE',
        },
      });
    }

    return wallet;
  }

  /**
   * Retrieves or provisions a wallet for a merchant seller.
   */
  async getOrCreateSellerWallet(sellerId: string, type: 'MAIN' | 'CHARITY' | 'SYSTEM_RESERVE') {
    let wallet = await this.prisma.wallet.findFirst({
      where: { sellerId, type, deletedAt: null },
    });

    if (!wallet) {
      const id = generateId(ID_PREFIXES.WALLET);
      wallet = await this.prisma.wallet.create({
        data: {
          id,
          sellerId,
          type,
          currency: 'BDT',
          availablePoisha: BigInt(0),
          pendingPoisha: BigInt(0),
          status: 'ACTIVE',
        },
      });
    }

    return wallet;
  }

  /**
   * Lists all segregated wallets for a customer.
   */
  async listUserWallets(userId: string) {
    return this.prisma.wallet.findMany({
      where: { userId, deletedAt: null },
      orderBy: { type: 'asc' },
    });
  }

  /**
   * Lists all segregated wallets for a merchant seller.
   */
  async listSellerWallets(sellerId: string) {
    return this.prisma.wallet.findMany({
      where: { sellerId, deletedAt: null },
      orderBy: { type: 'asc' },
    });
  }

  /**
   * Finds or provisions a chart of account by its code.
   */
  async getOrCreateAccount(code: string, name: string, type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE', description?: string) {
    let account = await this.prisma.ledgerAccount.findUnique({
      where: { code },
    });

    if (!account) {
      const id = generateId(ID_PREFIXES.LEDGER_ACCOUNT);
      account = await this.prisma.ledgerAccount.create({
        data: {
          id,
          code,
          name,
          type,
          currency: 'BDT',
          description,
          isActive: true,
        },
      });
    }

    return account;
  }

  /**
   * Records an atomic, balanced double-entry journal transaction.
   * Enforces that Sum(Debits) == Sum(Credits) == totalPoisha.
   */
  async recordJournal(params: RecordJournalParams) {
    // Check idempotency if key provided
    if (params.idempotencyKey) {
      const existing = await this.prisma.ledgerJournal.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
        include: { postings: true },
      });
      if (existing) {
        return existing;
      }
    }

    // Verify postings balance
    let sumDebits = BigInt(0);
    let sumCredits = BigInt(0);

    for (const post of params.postings) {
      if (post.amountPoisha <= BigInt(0)) {
        throw new ValidationError('Posting amount must be strictly positive integer poisha', { amount: post.amountPoisha.toString() });
      }
      if (post.direction === 'DEBIT') {
        sumDebits += post.amountPoisha;
      } else if (post.direction === 'CREDIT') {
        sumCredits += post.amountPoisha;
      }
    }

    if (sumDebits !== sumCredits) {
      throw new ValidationError('Double-entry accounting invariant violated: Total Debits must equal Total Credits', {
        sumDebits: sumDebits.toString(),
        sumCredits: sumCredits.toString(),
      });
    }

    if (sumDebits !== params.totalPoisha) {
      throw new ValidationError('Journal total does not match balanced posting sum', {
        journalTotal: params.totalPoisha.toString(),
        postingSum: sumDebits.toString(),
      });
    }

    const journalId = generateId(ID_PREFIXES.LEDGER_JOURNAL);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const journalNumber = `JRN-${dateStr}-${randomSuffix}`;

    return this.prisma.$transaction(async (tx: any) => {
      // Create journal header
      const journal = await tx.ledgerJournal.create({
        data: {
          id: journalId,
          journalNumber,
          description: params.description,
          referenceType: params.referenceType,
          referenceId: params.referenceId || null,
          totalPoisha: params.totalPoisha,
          idempotencyKey: params.idempotencyKey || null,
          ruleVersion: params.ruleVersion || 'v1.0.0',
        },
      });

      // Process each posting and resolve account
      for (const p of params.postings) {
        const account = await tx.ledgerAccount.findUnique({
          where: { code: p.accountCode },
        });

        if (!account) {
          throw new NotFoundError(`Ledger account '${p.accountCode}' does not exist in chart of accounts`);
        }

        const postingId = generateId(ID_PREFIXES.LEDGER_POSTING);
        await tx.ledgerPosting.create({
          data: {
            id: postingId,
            journalId: journal.id,
            accountId: account.id,
            walletId: p.walletId || null,
            direction: p.direction,
            amountPoisha: p.amountPoisha,
            currency: p.currency || 'BDT',
            description: p.description || null,
          },
        });

        // If posting affects a customer or seller wallet, update the balance
        if (p.walletId) {
          const wallet = await tx.wallet.findUnique({
            where: { id: p.walletId },
          });

          if (!wallet) {
            throw new NotFoundError(`Wallet '${p.walletId}' not found for balance update`);
          }

          // In double-entry:
          // Liability/Customer wallet credit increases customer balance; debit decreases it.
          let balanceDelta = BigInt(0);
          if (p.direction === 'CREDIT') {
            balanceDelta = p.amountPoisha;
          } else {
            balanceDelta = -p.amountPoisha;
          }

          const newAvailable = wallet.availablePoisha + balanceDelta;
          if (newAvailable < BigInt(0)) {
            throw new ConflictError(`Insufficient wallet balance: operation would result in negative available balance (${newAvailable} poisha)`, {
              walletId: p.walletId,
              currentAvailable: wallet.availablePoisha.toString(),
              attemptedDebit: p.amountPoisha.toString(),
            });
          }

          await tx.wallet.update({
            where: { id: p.walletId },
            data: {
              availablePoisha: newAvailable,
              version: { increment: 1 },
            },
          });
        }
      }

      return journal;
    });
  }

  /**
   * Reverses a previously posted double-entry journal transaction by posting inverted entries.
   */
  async reverseJournal(originalJournalId: string, reason: string) {
    const original = await this.prisma.ledgerJournal.findUnique({
      where: { id: originalJournalId },
      include: {
        postings: {
          include: { account: true },
        },
      },
    });

    if (!original) {
      throw new NotFoundError(`Original journal '${originalJournalId}' not found for reversal`);
    }

    if (original.reversalOfId) {
      throw new ConflictError('Cannot reverse a journal that is itself a reversal transaction');
    }

    const existingReversal = await this.prisma.ledgerJournal.findFirst({
      where: { reversalOfId: original.id },
    });

    if (existingReversal) {
      throw new ConflictError('This journal transaction has already been reversed', {
        reversalJournalId: existingReversal.id,
      });
    }

    // Invert the postings (Debit becomes Credit, Credit becomes Debit)
    const invertedPostings: JournalPostingInput[] = original.postings.map((p: any) => ({
      accountCode: p.account.code,
      walletId: p.walletId,
      direction: p.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amountPoisha: p.amountPoisha,
      currency: p.currency,
      description: `Reversal of posting ${p.id}: ${reason}`,
    }));

    const reversalId = generateId(ID_PREFIXES.LEDGER_JOURNAL);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reversalNumber = `REV-${dateStr}-${randomSuffix}`;

    return this.prisma.$transaction(async (tx: any) => {
      const reversalJournal = await tx.ledgerJournal.create({
        data: {
          id: reversalId,
          journalNumber: reversalNumber,
          description: `Reversal of ${original.journalNumber}: ${reason}`,
          referenceType: 'REFUND_ADJUSTMENT',
          referenceId: original.referenceId,
          totalPoisha: original.totalPoisha,
          ruleVersion: original.ruleVersion,
          reversalOfId: original.id,
        },
      });

      for (const p of invertedPostings) {
        const account = await tx.ledgerAccount.findUnique({
          where: { code: p.accountCode },
        });

        await tx.ledgerPosting.create({
          data: {
            id: generateId(ID_PREFIXES.LEDGER_POSTING),
            journalId: reversalJournal.id,
            accountId: account.id,
            walletId: p.walletId || null,
            direction: p.direction,
            amountPoisha: p.amountPoisha,
            currency: p.currency || 'BDT',
            description: p.description || null,
          },
        });

        if (p.walletId) {
          const wallet = await tx.wallet.findUnique({ where: { id: p.walletId } });
          if (wallet) {
            const delta = p.direction === 'CREDIT' ? p.amountPoisha : -p.amountPoisha;
            const newBal = wallet.availablePoisha + delta;
            await tx.wallet.update({
              where: { id: p.walletId },
              data: { availablePoisha: newBal, version: { increment: 1 } },
            });
          }
        }
      }

      return reversalJournal;
    });
  }
}
