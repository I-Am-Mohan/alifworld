/**
 * AlifWorld Search Indexing Background Worker
 *
 * Processes asynchronous catalog search indexing jobs from BullMQ.
 * Handles full catalog rebuilds, incremental product synchronizations, and outbox event batching.
 *
 * References:
 * - docs/architecture/local-development-infrastructure-profiles.md
 * - docs/decisions/0025-model-catalog-taxonomy-products-variants-and-media.md
 * Invariants: ADR-0003, ADR-0004, ADR-0022
 */

import { WorkerDefinition, WORKER_QUEUES } from '@/workers';
import { searchIndexerService, SearchIndexerService } from '../services/search-indexer.service';

export interface SearchIndexingJobData {
  type: 'FULL_REINDEX' | 'SYNC_PRODUCT' | 'SYNC_BATCH' | 'PROCESS_OUTBOX_EVENT';
  productId?: string;
  productIds?: string[];
  events?: Array<{ eventType: string; payload: any }>;
  batchSize?: number;
  triggeredBy?: string;
}

export class SearchIndexingWorker {
  constructor(private readonly indexer: SearchIndexerService = searchIndexerService) {}

  public async processJob(jobData: SearchIndexingJobData): Promise<any> {
    const startTime = Date.now();
    console.info(`[SearchWorker] Processing search indexing job: ${jobData.type}`);

    try {
      switch (jobData.type) {
        case 'FULL_REINDEX': {
          const result = await this.indexer.reindexAllPublishedProducts(jobData.batchSize ?? 50);
          console.info(
            `[SearchWorker] FULL_REINDEX completed: ${result.totalIndexed} indexed in ${result.durationMs}ms`
          );
          return result;
        }

        case 'SYNC_PRODUCT': {
          if (!jobData.productId) {
            throw new Error('productId is required for SYNC_PRODUCT job');
          }
          const result = await this.indexer.syncProductIndex(jobData.productId);
          console.info(
            `[SearchWorker] SYNC_PRODUCT completed: ${result.action} for ${jobData.productId}`
          );
          return result;
        }

        case 'SYNC_BATCH': {
          if (!jobData.productIds || jobData.productIds.length === 0) {
            throw new Error('productIds array is required for SYNC_BATCH job');
          }
          const result = await this.indexer.syncProductsBatch(jobData.productIds);
          console.info(
            `[SearchWorker] SYNC_BATCH completed: ${result.indexed} indexed, ${result.deleted} deleted`
          );
          return result;
        }

        case 'PROCESS_OUTBOX_EVENT': {
          if (!jobData.events || jobData.events.length === 0) {
            return { processed: 0 };
          }
          const result = await this.indexer.processOutboxEvents(jobData.events);
          console.info(
            `[SearchWorker] PROCESS_OUTBOX_EVENT completed: ${result.processed} events processed`
          );
          return result;
        }

        default:
          throw new Error(`Unknown search indexing job type: ${(jobData as any).type}`);
      }
    } catch (err: any) {
      console.error(`[SearchWorker] Error processing job ${jobData.type}:`, err);
      throw err;
    }
  }
}

export const searchIndexingWorker = new SearchIndexingWorker();

export const searchIndexingWorkerDefinition: WorkerDefinition = {
  queueName: WORKER_QUEUES.SEARCH_INDEXING,
  concurrency: 5,
  processJob: async (job: any) => {
    const data: SearchIndexingJobData = job?.data || job;
    return searchIndexingWorker.processJob(data);
  },
};
