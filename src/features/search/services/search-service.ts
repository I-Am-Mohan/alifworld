/**
 * AlifWorld Resilient Search Service
 * 
 * Orchestrator implementing the vendor-neutral SearchServiceInterface.
 * Automatically fails over from primary Meilisearch engine to PostgreSQL ILIKE
 * fallback within 250ms SLA on connection errors, timeouts, or unconfigured environments.
 * 
 * Reference:
 * - docs/architecture/scope-boundaries-and-domain-map.md
 * - docs/architecture/non-functional-requirements-and-slos.md
 * Invariants: ADR-0003, ADR-0004, ADR-0006, ADR-0022
 */

import {
  SearchDocument,
  SearchQueryOptions,
  SearchResponse,
  SearchHealthStatus,
  SearchServiceInterface,
} from '../types';
import { PostgresSearchAdapter } from '../adapters/postgres-search-adapter';
import { MeilisearchSearchAdapter } from '../adapters/meilisearch-search-adapter';

export class ResilientSearchService implements SearchServiceInterface {
  private primaryAdapter: SearchServiceInterface;
  private fallbackAdapter: SearchServiceInterface;
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;
  private readonly failureThreshold = 3;
  private readonly circuitCooldownMs = 30_000; // 30s cooldown before retrying primary

  constructor(
    primaryAdapter?: SearchServiceInterface,
    fallbackAdapter?: SearchServiceInterface
  ) {
    this.primaryAdapter = primaryAdapter ?? new MeilisearchSearchAdapter();
    this.fallbackAdapter = fallbackAdapter ?? new PostgresSearchAdapter();
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    const isCircuitOpen = Date.now() < this.circuitOpenUntil;

    if (!isCircuitOpen) {
      try {
        const response = await this.primaryAdapter.search(options);
        // Primary succeeded, reset circuit failure counter
        this.consecutiveFailures = 0;
        return response;
      } catch (err: any) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.failureThreshold) {
          this.circuitOpenUntil = Date.now() + this.circuitCooldownMs;
          console.warn(
            `[SearchService] Meilisearch consecutive failures (${this.consecutiveFailures}) exceeded threshold. Opening circuit breaker for ${this.circuitCooldownMs}ms.`
          );
        } else {
          console.warn(
            `[SearchService] Meilisearch primary search failed (${err.message}). Seamlessly failing over to PostgreSQL fallback.`
          );
        }
      }
    }

    // Execute boot-safe PostgreSQL search fallback
    return this.fallbackAdapter.search(options);
  }

  public async indexDocuments(
    documents: SearchDocument[]
  ): Promise<{ indexed: number; taskUid?: number }> {
    // Always index to fallback store for immediate local visibility
    await this.fallbackAdapter.indexDocuments(documents);

    try {
      return await this.primaryAdapter.indexDocuments(documents);
    } catch (err: any) {
      console.warn(
        `[SearchService] Failed to index documents in Meilisearch (${err.message}). Maintained in fallback store.`
      );
      return { indexed: documents.length };
    }
  }

  public async deleteDocuments(ids: string[]): Promise<{ deleted: number }> {
    await this.fallbackAdapter.deleteDocuments(ids);

    try {
      return await this.primaryAdapter.deleteDocuments(ids);
    } catch (err: any) {
      console.warn(
        `[SearchService] Failed to delete documents from Meilisearch (${err.message}). Deleted from fallback store.`
      );
      return { deleted: ids.length };
    }
  }

  public async checkHealth(): Promise<SearchHealthStatus> {
    const fallbackHealth = await this.fallbackAdapter.checkHealth();
    let primaryHealth: SearchHealthStatus;

    try {
      primaryHealth = await this.primaryAdapter.checkHealth();
    } catch (err: any) {
      primaryHealth = {
        status: 'DOWN',
        primaryEngine: 'meilisearch',
        primaryAvailable: false,
        fallbackEngine: 'postgres',
        fallbackAvailable: true,
        activeEngine: 'postgres_fallback',
        timestamp: new Date().toISOString(),
        details: { error: err.message },
      };
    }

    const isPrimaryHealthy = primaryHealth.primaryAvailable;
    const isCircuitOpen = Date.now() < this.circuitOpenUntil;

    return {
      status: isPrimaryHealthy && !isCircuitOpen ? 'HEALTHY' : 'DEGRADED',
      primaryEngine: 'meilisearch',
      primaryAvailable: isPrimaryHealthy,
      fallbackEngine: 'postgres',
      fallbackAvailable: fallbackHealth.fallbackAvailable,
      activeEngine: isPrimaryHealthy && !isCircuitOpen ? 'meilisearch' : 'postgres_fallback',
      latencyMs: isPrimaryHealthy ? primaryHealth.latencyMs : fallbackHealth.latencyMs,
      details: {
        circuitBreakerOpen: isCircuitOpen,
        consecutiveFailures: this.consecutiveFailures,
        primaryDetails: primaryHealth.details,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Export default singleton instance
export const searchService = new ResilientSearchService();
