/**
 * AlifWorld Search Catalog Reindexing CLI Script
 *
 * Usage:
 *   bun run scripts/reindex-search-catalog.ts [--batch-size=100]
 *
 * Invariants: ADR-0003, ADR-0004, ADR-0022
 */

import { searchIndexerService } from '@/features/search';

async function main() {
  console.info('====================================================');
  console.info('  AlifWorld Catalog Search Reindexing Utility');
  console.info('====================================================');

  const batchSizeArg = process.argv.find((arg) => arg.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 50;

  console.info(`[Reindex] Initiating full catalog reindexation (batch size: ${batchSize})...`);

  try {
    const result = await searchIndexerService.reindexAllPublishedProducts(batchSize);

    console.info('[Reindex] Catalog reindexation completed successfully!');
    console.info(`[Reindex] Total Products Processed : ${result.totalProcessed}`);
    console.info(`[Reindex] Total Documents Indexed   : ${result.totalIndexed}`);
    console.info(`[Reindex] Execution Duration       : ${result.durationMs}ms`);
    process.exit(0);
  } catch (err: any) {
    console.error('[Reindex] Fatal error reindexing catalog search:', err);
    process.exit(1);
  }
}

if (import.meta.main || process.argv[1]?.includes('reindex-search-catalog')) {
  main();
}
