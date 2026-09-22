/**
 * BullMQ Asynchronous Worker Registry Contract
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

export interface WorkerDefinition {
  readonly queueName: string;
  readonly concurrency: number;
  readonly processJob: (job: unknown) => Promise<unknown>;
}

export const WORKER_QUEUES = {
  NOTIFICATIONS: 'notifications',
  TRANSACTIONAL_OUTBOX: 'transactional_outbox',
  SEARCH_INDEXING: 'search_indexing',
  REWARD_DISTRIBUTION: 'reward_distribution',
  AUDIT_LOGS: 'audit_logs',
} as const;

export type WorkerQueueName = (typeof WORKER_QUEUES)[keyof typeof WORKER_QUEUES];
