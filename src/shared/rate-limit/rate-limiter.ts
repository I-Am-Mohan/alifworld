/**
 * Distributed Redis Sliding-Window Rate Limiter
 * 
 * Provides atomic, token-bucket/sliding-window throttling using Redis sorted sets.
 * Implements seamless, boot-safe in-memory fallback if Redis is temporarily unreachable.
 * 
 * Invariants: ADR-0019, ADR-0022, ADR-0031, Milestone 040
 */

import Redis from 'ioredis';
import { getServerEnv } from '@/shared/config/environment';
import {
  IRateLimiter,
  RateLimitPolicy,
  RateLimitResult,
} from './rate-limiter.interface';

export class RedisRateLimiter implements IRateLimiter {
  private redisClient: Redis | null = null;
  private isRedisHealthy = false;
  // In-memory sliding window fallback store: key -> array of timestamps
  private memoryStore = new Map<string, number[]>();

  constructor(customRedis?: Redis) {
    if (customRedis) {
      this.redisClient = customRedis;
      this.isRedisHealthy = true;
    } else {
      this.initRedis();
    }
  }

  private initRedis() {
    try {
      const env = getServerEnv();
      const redisUrl = env.REDIS_URL;

      this.redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times) {
          // Linear backoff capped at 2 seconds
          return Math.min(times * 200, 2000);
        },
      });

      this.redisClient.on('connect', () => {
        this.isRedisHealthy = true;
      });

      this.redisClient.on('ready', () => {
        this.isRedisHealthy = true;
      });

      this.redisClient.on('error', () => {
        this.isRedisHealthy = false;
      });

      this.redisClient.on('close', () => {
        this.isRedisHealthy = false;
      });

      // Initiate connection asynchronously
      this.redisClient.connect().catch(() => {
        this.isRedisHealthy = false;
      });
    } catch {
      this.isRedisHealthy = false;
    }
  }

  /**
   * Consumes one attempt against the specified key and policy.
   */
  async consume(key: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
    const fullKey = `ratelimit:${policy.keyPrefix}:${key}`;
    const now = Date.now();
    const windowStart = now - policy.windowMs;

    // Use Redis if healthy and connected
    if (this.isRedisHealthy && this.redisClient) {
      try {
        const pipeline = this.redisClient.pipeline();
        // 1. Remove expired timestamps outside sliding window
        pipeline.zremrangebyscore(fullKey, 0, windowStart);
        // 2. Add current timestamp with unique member
        const member = `${now}-${Math.random().toString(36).substring(2, 7)}`;
        pipeline.zadd(fullKey, now, member);
        // 3. Count total active hits within current sliding window
        pipeline.zcard(fullKey);
        // 4. Set TTL on the sorted set
        const ttlSeconds = Math.ceil(policy.windowMs / 1000) + 1;
        pipeline.expire(fullKey, ttlSeconds);

        const results = await pipeline.exec();
        if (results && results[2] && !results[2][0]) {
          const currentCount = Number(results[2][1]);
          const isAllowed = currentCount <= policy.maxRequests;
          const remaining = Math.max(0, policy.maxRequests - currentCount);
          const retryAfterSeconds = isAllowed
            ? 0
            : Math.ceil(policy.windowMs / 1000);

          return {
            isAllowed,
            limit: policy.maxRequests,
            remaining,
            resetMs: now + policy.windowMs,
            retryAfterSeconds,
          };
        }
      } catch {
        // Fallback to in-memory store if Redis command fails
        this.isRedisHealthy = false;
      }
    }

    // In-memory sliding window fallback implementation
    return this.consumeMemory(fullKey, policy, now, windowStart);
  }

  private consumeMemory(
    fullKey: string,
    policy: RateLimitPolicy,
    now: number,
    windowStart: number
  ): RateLimitResult {
    let timestamps = this.memoryStore.get(fullKey) || [];

    // Filter out timestamps older than window start
    timestamps = timestamps.filter((t) => t > windowStart);

    // Record current hit
    timestamps.push(now);
    this.memoryStore.set(fullKey, timestamps);

    const currentCount = timestamps.length;
    const isAllowed = currentCount <= policy.maxRequests;
    const remaining = Math.max(0, policy.maxRequests - currentCount);

    let retryAfterSeconds = 0;
    if (!isAllowed && timestamps.length > 0) {
      const oldestRelevantTimestamp = timestamps[0];
      const expiry = oldestRelevantTimestamp + policy.windowMs;
      retryAfterSeconds = Math.max(1, Math.ceil((expiry - now) / 1000));
    }

    return {
      isAllowed,
      limit: policy.maxRequests,
      remaining,
      resetMs: now + policy.windowMs,
      retryAfterSeconds,
    };
  }

  /**
   * Resets rate-limiting counter for a key.
   */
  async reset(key: string, keyPrefix?: string): Promise<void> {
    const fullKey = keyPrefix ? `ratelimit:${keyPrefix}:${key}` : key;
    this.memoryStore.delete(fullKey);

    if (this.isRedisHealthy && this.redisClient) {
      try {
        await this.redisClient.del(fullKey);
      } catch {
        // Ignore deletion errors
      }
    }
  }
}

// Global shared singleton rate limiter instance
export const rateLimiter = new RedisRateLimiter();
