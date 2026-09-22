/**
 * Integration Tests for Background Worker Registry and Queues
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { describe, it, expect } from 'bun:test';
import { WORKER_QUEUES } from '@/workers/index';

describe('Background Worker Cluster Integration', () => {
  it('registers all mandatory transactional and operational queues', () => {
    expect(WORKER_QUEUES.NOTIFICATIONS).toBe('notifications');
    expect(WORKER_QUEUES.TRANSACTIONAL_OUTBOX).toBe('transactional_outbox');
    expect(WORKER_QUEUES.SEARCH_INDEXING).toBe('search_indexing');
    expect(WORKER_QUEUES.REWARD_DISTRIBUTION).toBe('reward_distribution');
    expect(WORKER_QUEUES.AUDIT_LOGS).toBe('audit_logs');
  });

  it('contains no duplicate queue names', () => {
    const queueList = Object.values(WORKER_QUEUES);
    const uniqueQueues = new Set(queueList);
    expect(uniqueQueues.size).toBe(queueList.length);
  });
});
