import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import { POST as rebuildRoute } from '@/app/api/v1/search/index/rebuild/route';
import { POST as syncRoute } from '@/app/api/v1/search/index/sync/route';
import { searchIndexerService } from '@/features/search/services/search-indexer.service';
import { NextRequest } from 'next/server';

describe('Milestone 112: Search Indexing REST API Integration Tests', () => {
  const adminActor = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    spyOn(searchIndexerService, 'reindexAllPublishedProducts').mockResolvedValue({
      totalProcessed: 50,
      totalIndexed: 50,
      durationMs: 120,
    });

    spyOn(searchIndexerService, 'syncProductIndex').mockResolvedValue({
      action: 'INDEXED',
      documentId: 'prod_101',
    });

    spyOn(searchIndexerService, 'syncProductsBatch').mockResolvedValue({
      indexed: 2,
      deleted: 0,
    });
  });

  it('POST /api/v1/search/index/rebuild triggers full catalog reindexation', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/search/index/rebuild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: 50 }),
    });

    const res = await rebuildRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.totalProcessed).toBe(50);
    expect(body.data.totalIndexed).toBe(50);
  });

  it('POST /api/v1/search/index/sync synchronizes individual product index', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/search/index/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod_101' }),
    });

    const res = await syncRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.action).toBe('INDEXED');
    expect(body.data.documentId).toBe('prod_101');
  });

  it('POST /api/v1/search/index/sync synchronizes batch of product IDs', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/search/index/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: ['prod_101', 'prod_102'] }),
    });

    const res = await syncRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.indexed).toBe(2);
  });
});
