/**
 * AlifWorld Authorization & Tenancy Security Test Matrix Types
 * 
 * Formalizes role-permission-resource Cartesian mappings, negative attack categories,
 * tenant isolation invariants, and verification expectation contracts.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 050
 */

import { ActorContext, PolicyDecisionCode, ResourceType } from './authz.types';
import { ObjectResourceDescriptor, OwnershipRelation } from './object-authz.types';
import { SystemRoleCode } from '@/features/identity/types';

/**
 * Security test attack vector categories for negative testing.
 */
export type SecurityAttackCategory =
  | 'HORIZONTAL_PRIVILEGE_ESCALATION' // Cross-user / cross-merchant unauthorized access
  | 'VERTICAL_PRIVILEGE_ESCALATION'   // Low-privilege role attempting high-privilege action
  | 'TENANT_ISOLATION_BREACH'         // Merchant attempting to access foreign store data
  | 'OBJECT_OWNERSHIP_VIOLATION'      // Customer attempting to view/modify foreign customer object
  | 'ACCOUNT_LIFECYCLE_VIOLATION'     // Suspended or soft-deleted account attempting operational access
  | 'STATE_INVARIANT_VIOLATION'       // Mutation attempted in an ineligible lifecycle state
  | 'FINANCIAL_GATE_VIOLATION'        // High-value transaction lacking secondary Maker-Checker approval
  | 'WEB_PERIMETER_ATTACK';           // CSRF, CORS, or clickjacking framing breach

/**
 * Expected outcome for a specific security matrix evaluation.
 */
export interface MatrixExpectedOutcome {
  granted: boolean;
  code: PolicyDecisionCode | string;
  expectedRelation?: OwnershipRelation;
  description: string;
}

/**
 * Complete test scenario binding an actor, an action, a target resource, and expected outcome.
 */
export interface SecurityMatrixTestCase {
  id: string;
  category: SecurityAttackCategory;
  name: string;
  actor: ActorContext;
  action: string;
  resource: ObjectResourceDescriptor;
  expected: MatrixExpectedOutcome;
}

/**
 * Aggregate summary report of security matrix execution.
 */
export interface SecurityMatrixReport {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  categories: Record<
    SecurityAttackCategory,
    { total: number; passed: number; failed: number }
  >;
  timestamp: string;
}
