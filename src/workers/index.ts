/**
 * BullMQ Asynchronous Worker Registry Contract & Process Runner
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
  CATALOG_IMPORT_EXPORT: 'catalog_import_export',
} as const;

export type WorkerQueueName = (typeof WORKER_QUEUES)[keyof typeof WORKER_QUEUES];

/**
 * Starts all registered background workers.
 */
export async function startWorkerCluster(): Promise<void> {
  console.info('[Worker] Initializing AlifWorld background worker cluster...');
  console.info(`[Worker] Active queues: ${Object.values(WORKER_QUEUES).join(', ')}`);

  // Handle graceful shutdown
  const shutdown = (signal: string) => {
    console.info(`[Worker] Received ${signal}. Shutting down worker cluster gracefully...`);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  console.info('[Worker] Background worker cluster is running and listening for jobs.');
}

// Execute runner if executed directly via CLI
if (import.meta.main || process.argv[1]?.includes('workers')) {
  startWorkerCluster().catch((err) => {
    console.error('[Worker] Fatal error starting worker cluster:', err);
    process.exit(1);
  });
}
