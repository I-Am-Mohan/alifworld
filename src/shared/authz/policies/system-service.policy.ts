/**
 * AlifWorld System Service & Background Worker Authorization Policy
 * 
 * Enforces strict security boundaries around internal automated daemons,
 * transactional outbox processing, BullMQ jobs, webhook ingestion, and
 * financial reconciliation routines.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0013, ADR-0022, Milestone 046
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class SystemServicePolicy implements IPolicy {
  readonly name = 'SystemServicePolicy';
  readonly resourceType = 'SYSTEM_SERVICE';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isSystemService =
      actor.roles.includes(SystemRoleCode.SYSTEM_SERVICE) ||
      actor.roles.includes('WORKER') ||
      actor.roles.includes('SERVICE');
    const hasServicePermission =
      actor.permissions.includes('system:service:execute') ||
      actor.permissions.includes('system:outbox:process');

    // 1. Super Administrator Global Bypass
    if (isSuperAdmin) {
      return {
        granted: true,
        code: 'GRANTED',
        reason: 'Super Administrator holds emergency execution privileges for internal system services.',
        policyName: this.name,
      };
    }

    // 2. Prohibit External Users (Customer, Seller, Rider, Support) from Invoking Service Jobs
    const isUnauthorizedRole =
      actor.roles.includes(SystemRoleCode.CUSTOMER) ||
      actor.roles.includes(SystemRoleCode.RIDER) ||
      actor.roles.includes(SystemRoleCode.SELLER_OWNER) ||
      actor.roles.includes(SystemRoleCode.SELLER_STAFF) ||
      actor.roles.includes(SystemRoleCode.SUPPORT);

    if (isUnauthorizedRole && !isSystemService && !hasServicePermission) {
      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: `External role '${actor.roles[0]}' is strictly forbidden from triggering internal system service jobs.`,
        policyName: this.name,
        diagnostics: { role: actor.roles[0], action },
      };
    }

    switch (action) {
      case 'outbox:process':
      case 'events:relay': {
        if (isSystemService || actor.permissions.includes('system:outbox:process')) {
          return { granted: true, code: 'GRANTED', reason: 'System worker authorized to relay outbox events.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks system:outbox:process permission.',
          policyName: this.name,
        };
      }

      case 'job:execute':
      case 'cron:run': {
        if (isSystemService || actor.permissions.includes('system:service:execute')) {
          return { granted: true, code: 'GRANTED', reason: 'Internal scheduler authorized to execute job.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Background job execution requires system service authorization.',
          policyName: this.name,
        };
      }

      case 'webhook:ingest': {
        // Payment gateway or courier webhook ingestion
        if (isSystemService || actor.permissions.includes('system:service:execute') || actor.roles.includes(SystemRoleCode.ADMIN)) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to ingest and process verified external webhook.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Unauthorized webhook ingestion source.',
          policyName: this.name,
        };
      }

      case 'reconciliation:run': {
        // Financial or inventory reconciliation batch
        if (isSystemService || actor.permissions.includes('system:reconcile')) {
          return { granted: true, code: 'GRANTED', reason: 'Reconciliation daemon authorized to run ledger checks.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks system:reconcile permission.',
          policyName: this.name,
        };
      }

      case 'cache:purge': {
        if (isSystemService || actor.roles.includes(SystemRoleCode.ADMIN)) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to purge internal distributed cache.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Cache purge restricted to platform operators.',
          policyName: this.name,
        };
      }

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized system service action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
