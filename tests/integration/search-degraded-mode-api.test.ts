import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import {
  GET as getDegradedModeRoute,
  POST as postDegradedModeRoute,
} from '@/app/api/v1/search/degraded-mode/route';
import { searchService } from '@/features/search/services/search-service';
import { NextRequest } from 'next/server';

describe('Milestone 114: Search Degraded Mode API Integration Tests', () => {
  const adminActor = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    searchService.setForcedDegradedMode(false);
    searchService.resetCircuitBreaker();
  });

  it('GET /api/v1/search/degraded-mode should return current failover telemetry metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/search/degraded-mode', {
      method: 'GET',
    });

    const res = await getDegradedModeRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.isForcedDegraded).toBe(false);
  });

  it('POST /api/v1/search/degraded-mode should enable forced degraded mode', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/search/degraded-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forced: true,
        resetCircuit: true,
      }),
    });

    const res = await postDegradedModeRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.isForcedDegraded).toBe(true);
    expect(searchService.isForcedDegradedMode()).toBe(true);

    // Clean up
    searchService.setForcedDegradedMode(false);
  });
});
