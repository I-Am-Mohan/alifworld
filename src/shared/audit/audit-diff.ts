/**
 * Redaction-Safe Audit State Diff Generator
 * 
 * Computes before and after state diffs while guaranteeing that sensitive
 * credentials and secrets are redacted before serialization.
 * 
 * Invariants: Milestone 040
 */

import { redactSensitiveData, isSensitiveKey } from './redactor';
import { AuditStateDiff } from './audit.interface';

/**
 * Computes a sanitized diff object between two states.
 */
export function computeAuditDiff(
  before?: Record<string, any> | null,
  after?: Record<string, any> | null
): AuditStateDiff | null {
  if (!before && !after) {
    return null;
  }

  const rawBefore = before || {};
  const rawAfter = after || {};

  const allKeys = new Set([
    ...Object.keys(rawBefore),
    ...Object.keys(rawAfter),
  ]);

  const diff: AuditStateDiff = {};

  for (const key of allKeys) {
    const rawValBefore = rawBefore[key];
    const rawValAfter = rawAfter[key];

    // Check if raw values differ
    const areEqual =
      JSON.stringify(rawValBefore ?? null) === JSON.stringify(rawValAfter ?? null);

    if (!areEqual) {
      diff[key] = {
        from: isSensitiveKey(key)
          ? '[REDACTED]'
          : redactSensitiveData(rawValBefore) ?? null,
        to: isSensitiveKey(key)
          ? '[REDACTED]'
          : redactSensitiveData(rawValAfter) ?? null,
      };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}
