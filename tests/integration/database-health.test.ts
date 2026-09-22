/**
 * Integration Tests for Database Health Probe in Readiness Endpoint
 * 
 * Verifies that /api/health/ready accurately probes database health,
 * calculates query latency, and preserves non-blocking resilience.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 */

import { describe, it, expect } from 'bun:test';
import { GET as getReadyHealth } from '@/app/api/health/ready/route';

describe('Database Health Integration Tests', () => {
  it('GET /api/health/ready returns database health checks in telemetry envelope', async () => {
    const response = await getReadyHealth();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ready');

    // Database health checks
    expect(body.data.checks.database).toBeDefined();
    expect(['connected', 'disconnected']).toContain(body.data.checks.database);
    expect(body.data.checks.databaseDetails).toBeDefined();
    expect(['healthy', 'unhealthy']).toContain(body.data.checks.databaseDetails.status);
    expect(typeof body.data.checks.databaseDetails.latencyMs).toBe('number');
    expect(body.data.checks.databaseDetails.latencyMs).toBeGreaterThanOrEqual(0);

    // Platform invariants preservation
    expect(body.data.currency).toBe('BDT');
    expect(body.data.timezone).toBe('Asia/Dhaka');
    expect(body.data.checks.gates.pointsCashConvertible).toBe(false);
    expect(body.data.checks.gates.affiliateDepth).toBe(1);
  });
});
