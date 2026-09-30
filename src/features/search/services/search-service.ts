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
  private isForceDegraded = false;
  private totalQueries = 0;
  private primaryQueries = 0;
  private fallbackQueries = 0;
  private circuitTrips = 0;
  private lastFallbackReason: string | null = null;
  private readonly failureThreshold = 3;
  private readonly circuitCooldownMs = 30_000; // 30s cooldown before retrying primary

  constructor(primaryAdapter?: SearchServiceInterface, fallbackAdapter?: SearchServiceInterface) {
    this.primaryAdapter = primaryAdapter ?? new MeilisearchSearchAdapter();
    this.fallbackAdapter = fallbackAdapter ?? new PostgresSearchAdapter();
  }

  /**
   * Enables or disables forced degraded mode for testing, chaos experiments, or operational maintenance.
   */
  public setForcedDegradedMode(enabled: boolean): void {
    this.isForceDegraded = enabled;
    if (enabled) {
      this.lastFallbackReason = 'Forced degraded mode enabled by administrator';
    }
    console.info(`[SearchService] Forced degraded mode set to: ${enabled}`);
  }

  public isForcedDegradedMode(): boolean {
    return this.isForceDegraded;
  }

  /**
   * Resets the circuit breaker and consecutive failure counters.
   */
  public resetCircuitBreaker(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
    console.info('[SearchService] Search circuit breaker manually reset.');
  }

  /**
   * Returns telemetry metrics tracking primary vs fallback search query volumes.
   */
  public getTelemetryMetrics() {
    return {
      totalQueries: this.totalQueries,
      primaryQueries: this.primaryQueries,
      fallbackQueries: this.fallbackQueries,
      circuitTrips: this.circuitTrips,
      isForcedDegraded: this.isForceDegraded,
      lastFallbackReason: this.lastFallbackReason,
    };
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    this.totalQueries++;

    // 1. If administratively forced into degraded mode, skip Meilisearch immediately
    if (this.isForceDegraded) {
      this.fallbackQueries++;
      return this.fallbackAdapter.search(options);
    }

    const isCircuitOpen = Date.now() < this.circuitOpenUntil;

    // 2. Try primary Meilisearch engine if circuit breaker is closed
    if (!isCircuitOpen) {
      try {
        const response = await this.primaryAdapter.search(options);
        this.primaryQueries++;
        this.consecutiveFailures = 0;
        return response;
      } catch (err: any) {
        this.consecutiveFailures++;
        this.lastFallbackReason = err.message || 'Primary search failed';

        if (this.consecutiveFailures >= this.failureThreshold) {
          this.circuitOpenUntil = Date.now() + this.circuitCooldownMs;
          this.circuitTrips++;
          console.warn(
            `[SearchService] Meilisearch consecutive failures (${this.consecutiveFailures}) exceeded threshold. Opening circuit breaker for ${this.circuitCooldownMs}ms.`
          );
        } else {
          console.warn(
            `[SearchService] Meilisearch primary search failed (${err.message}). Seamlessly failing over to PostgreSQL fallback.`
          );
        }
      }
    } else {
      this.lastFallbackReason = 'Circuit breaker open; bypassing Meilisearch';
    }

    // 3. Execute boot-safe PostgreSQL search fallback
    this.fallbackQueries++;
    return this.fallbackAdapter.search(options);
  }

  public async indexDocuments(
    documents: SearchDocument[]
  ): Promise<{ indexed: number; taskUid?: number }> {
    // Always index to fallback store for immediate local visibility
    await this.fallbackAdapter.indexDocuments(documents);

    if (this.isForceDegraded) {
      return { indexed: documents.length };
    }

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

    if (this.isForceDegraded) {
      return { deleted: ids.length };
    }

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

    if (this.isForceDegraded) {
      primaryHealth = {
        status: 'DEGRADED',
        primaryEngine: 'meilisearch',
        primaryAvailable: false,
        fallbackEngine: 'postgres',
        fallbackAvailable: true,
        activeEngine: 'postgres_fallback',
        timestamp: new Date().toISOString(),
        details: { reason: 'Forced degraded mode enabled by administrator' },
      };
    } else {
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
    }

    const isPrimaryHealthy = primaryHealth.primaryAvailable && !this.isForceDegraded;
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
        isForceDegraded: this.isForceDegraded,
        telemetry: this.getTelemetryMetrics(),
        primaryDetails: primaryHealth.details,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Export default singleton instance
export const searchService = new ResilientSearchService();
