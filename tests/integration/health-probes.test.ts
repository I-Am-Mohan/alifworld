/**
 * Integration Tests for System Health Probes
 * Probes: /api/health/live and /api/health/ready
 * Reference: docs/architecture/environment-branching-and-release-strategy.md
 */

import { describe, it, expect } from 'bun:test';
import { GET as getLiveHealth } from '@/app/api/health/live/route';
import { GET as getReadyHealth } from '@/app/api/health/ready/route';

describe('System Health Probes Integration', () => {
  it('GET /api/health/live returns HTTP 200 with process status alive', async () => {
    const response = await getLiveHealth();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('alive');
    expect(typeof body.data.uptimeSeconds).toBe('number');
    expect(body.data.timestamp).toBeDefined();
  });

  it('GET /api/health/ready returns HTTP 200 with configuration & gate checks', async () => {
    const response = await getReadyHealth();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ready');
    expect(body.data.currency).toBe('BDT');
    expect(body.data.timezone).toBe('Asia/Dhaka');
    expect(body.data.checks.configuration).toBe('valid');
    expect(body.data.checks.gates.pointsCashConvertible).toBe(false);
    expect(body.data.checks.gates.affiliateDepth).toBe(1);
  });
});
