/**
 * Wallet & Ledger Domain Types
 * Locked Invariant: Double-entry bookkeeping where Debits == Credits.
 */

import { Poisha, WalletAccountType } from '@/shared/types/domain-terms';

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export interface JournalEntryLine {
  readonly accountId: string;
  readonly accountType: WalletAccountType;
  readonly type: EntryType;
  readonly amountPoisha: Poisha;
  readonly description: string;
}

export interface JournalTransaction {
  readonly id: string;
  readonly referenceId: string; // e.g. orderId, payoutId, refundId
  readonly idempotencyKey: string;
  readonly lines: readonly JournalEntryLine[];
  readonly postedAt: Date;
}
