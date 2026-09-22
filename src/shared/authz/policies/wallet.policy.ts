/**
 * AlifWorld Financial Wallet & Double-Entry Ledger Authorization Policy
 * 
 * Enforces customer wallet privacy, finance team ledger access, and
 * Gate-05 Maker-Checker dual authorization for high-value payouts and adjustments.
 * 
 * Invariants: ADR-0003, ADR-0021, ADR-0022, Gate-05, Milestone 042
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

// Threshold in Poisha: 50,000 BDT = 5,000,000 Poisha
const MAKER_CHECKER_THRESHOLD_POISHA = BigInt(process.env.MAKER_CHECKER_THRESHOLD_POISHA || '5000000');

export class WalletPolicy implements IPolicy {
  readonly name = 'WalletPolicy';
  readonly resourceType = 'WALLET';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);

    // 1. Read Wallet Balances
    if (action === 'read' || action === 'finance:read') {
      if (isSuperAdmin || isPlatformAdmin || actor.permissions.includes('finance:read')) {
        return { granted: true, code: 'GRANTED', reason: 'Finance operator authorized to inspect ledger.', policyName: this.name };
      }

      // Customer inspecting own segregated wallet
      if (resource.ownerId && resource.ownerId === actor.userId) {
        return { granted: true, code: 'GRANTED', reason: 'Customer accessing own wallet.', policyName: this.name };
      }

      // Seller inspecting own store wallet
      if (resource.sellerId && actor.sellerId === resource.sellerId) {
        return { granted: true, code: 'GRANTED', reason: 'Merchant accessing store settlement wallet.', policyName: this.name };
      }

      return {
        granted: false,
        code: 'OWNERSHIP_VIOLATION',
        reason: 'Cannot view wallet balances belonging to another entity.',
        policyName: this.name,
      };
    }

    // 2. Post Manual Double-Entry Journal Entries
    if (action === 'ledger' || action === 'finance:ledger') {
      if (isSuperAdmin || actor.permissions.includes('finance:ledger')) {
        return { granted: true, code: 'GRANTED', reason: 'Authorized to post manual double-entry ledger journals.', policyName: this.name };
      }
      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: 'Lacks finance:ledger permission.',
        policyName: this.name,
      };
    }

    // 3. Maker-Checker Payout & Balance Adjustment
    if (action === 'adjust' || action === 'payout' || action === 'finance:adjust' || action === 'finance:payout') {
      const hasPerm = isSuperAdmin || actor.permissions.includes('finance:adjust') || actor.permissions.includes('finance:payout');
      if (!hasPerm) {
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks finance privileges to authorize payouts or adjustments.',
          policyName: this.name,
        };
      }

      // High-Value Maker-Checker Gate Check
      const amountPoisha = resource.data?.amountPoisha ? BigInt(resource.data.amountPoisha) : 0n;
      const isHighValue = amountPoisha >= MAKER_CHECKER_THRESHOLD_POISHA;

      if (isHighValue) {
        const checkerId = resource.data?.checkerId;
        const makerId = resource.data?.makerId || actor.userId;

        // Must have distinct maker and checker
        if (!checkerId || checkerId === makerId) {
          return {
            granted: false,
            code: 'MAKER_CHECKER_REQUIRED',
            reason: `High-value financial operation (${amountPoisha} poisha) strictly requires secondary maker-checker authorization.`,
            policyName: this.name,
            diagnostics: {
              makerId,
              checkerId: checkerId || null,
              amountPoisha: amountPoisha.toString(),
              thresholdPoisha: MAKER_CHECKER_THRESHOLD_POISHA.toString(),
            },
          };
        }
      }

      return { granted: true, code: 'GRANTED', reason: 'Authorized financial payout or ledger adjustment.', policyName: this.name };
    }

    return {
      granted: false,
      code: 'FORBIDDEN',
      reason: `Unrecognized wallet action '${action}'.`,
      policyName: this.name,
    };
  }
}
