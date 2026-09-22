/**
 * Integration Tests for REST API v1 Root & OpenAPI Schema Routes
 * Routes: /api/v1 and /api/v1/openapi.json
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { describe, it, expect } from 'bun:test';
import { GET as getApiV1Root } from '@/app/api/v1/route';
import { GET as getOpenApiJson } from '@/app/api/v1/openapi.json/route';

describe('REST API v1 Root & OpenAPI Integration', () => {
  it('GET /api/v1 returns HTTP 200 with platform metadata and endpoints', async () => {
    const response = await getApiV1Root();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.platform).toContain('AlifWorld');
    expect(body.data.version).toBe('v1');
    expect(body.data.currency).toBe('BDT');
    expect(body.data.minorUnit).toContain('poisha');
    expect(body.data.timezone).toBe('Asia/Dhaka');
    expect(body.data.endpoints.healthLive).toBe('/api/health/live');
    expect(body.data.endpoints.healthReady).toBe('/api/health/ready');
    expect(body.data.endpoints.openapi).toBe('/api/v1/openapi.json');
  });

  it('GET /api/v1/openapi.json returns HTTP 200 with valid OpenAPI 3.1 specification', async () => {
    const response = await getOpenApiJson();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const schema = await response.json();
    expect(schema.openapi).toBe('3.1.0');
    expect(schema.info.title).toBe('AlifWorld Modular Monolith REST API');
    expect(schema.paths['/api/health/live']).toBeDefined();
    expect(schema.paths['/api/health/ready']).toBeDefined();
    expect(schema.paths['/api/v1']).toBeDefined();
    expect(schema.components.securitySchemes.BearerAuth).toBeDefined();
  });
});
