import { redisCache } from '@/config/redis';
import { logger } from '@/utils/logger';

/**
 * PERFORMANCE: Redis Caching Service
 * 
 * Implements multi-layer caching strategy:
 * - Query result caching (5-minute TTL)
 * - Session data caching
 * - API response caching
 * - Computed aggregations caching
 * 
 * Cache invalidation strategies:
 * - TTL-based expiration
 * - Event-based invalidation
 * - Manual invalidation
 * 
 * Performance targets:
 * - Cache hit rate: >80%
 * - Cache lookup: <5ms
 * - Reduce database load by 60%
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  compress?: boolean;
}

export class CacheService {
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB

  /**
   * Get cached value
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const cached = await redisCache.get(fullKey);

      if (!cached) {
        logger.debug('Cache miss', { key: fullKey });
        return null;
      }

      logger.debug('Cache hit', { key: fullKey });

      // Parse JSON
      const parsed = JSON.parse(cached);

      // Decompress if needed
      if (parsed._compressed) {
        return this.decompress(parsed.data) as T;
      }

      return parsed as T;
    } catch (error) {
      logger.error('Cache get error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const ttl = options.ttl || this.DEFAULT_TTL;

      let data: any = value;

      // Compress large payloads
      if (options.compress) {
        const serialized = JSON.stringify(value);
        if (serialized.length > this.COMPRESSION_THRESHOLD) {
          data = {
            _compressed: true,
            data: this.compress(serialized),
          };
        }
      }

      const serialized = JSON.stringify(data);
      await redisCache.setex(fullKey, ttl, serialized);

      logger.debug('Cache set', {
        key: fullKey,
        ttl,
        size: serialized.length,
      });
    } catch (error) {
      logger.error('Cache set error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string, namespace?: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key, namespace);
      await redisCache.del(fullKey);

      logger.debug('Cache deleted', { key: fullKey });
    } catch (error) {
      logger.error('Cache delete error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string, namespace?: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, namespace);
      const keys = await redisCache.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      await redisCache.del(...keys);

      logger.info('Cache pattern deleted', {
        pattern: fullPattern,
        count: keys.length,
      });

      return keys.length;
    } catch (error) {
      logger.error('Cache delete pattern error', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return 0;
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options.namespace);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Increment counter
   */
  async increment(key: string, namespace?: string, amount: number = 1): Promise<number> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await redisCache.incrby(fullKey, amount);

      logger.debug('Cache incremented', { key: fullKey, amount, result });

      return result;
    } catch (error) {
      logger.error('Cache increment error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return 0;
    }
  }

  /**
   * Set with expiration
   */
  async setWithExpiry(
    key: string,
    value: any,
    expirySeconds: number,
    namespace?: string
  ): Promise<void> {
    await this.set(key, value, { ttl: expirySeconds, namespace });
  }

  /**
   * Check if key exists
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await redisCache.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async getTTL(key: string, namespace?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, namespace);
      return await redisCache.ttl(fullKey);
    } catch (error) {
      logger.error('Cache TTL error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return -1;
    }
  }

  /**
   * Cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await redisCache.info('stats');
      const lines = info.split('\r\n');
      const stats: Record<string, any> = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      }

      return {
        hits: parseInt(stats.keyspace_hits || '0'),
        misses: parseInt(stats.keyspace_misses || '0'),
        hitRate: this.calculateHitRate(
          parseInt(stats.keyspace_hits || '0'),
          parseInt(stats.keyspace_misses || '0')
        ),
      };
    } catch (error) {
      logger.error('Cache stats error', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return { hits: 0, misses: 0, hitRate: 0 };
    }
  }

  /**
   * Flush all cache (use with caution)
   */
  async flushAll(): Promise<void> {
    try {
      await redisCache.flushdb();
      logger.warn('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * Build full cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  /**
   * Compress data (simple base64 for now, can use zlib for production)
   */
  private compress(data: string): string {
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decompress data
   */
  private decompress(data: string): any {
    const decompressed = Buffer.from(data, 'base64').toString('utf-8');
    return JSON.parse(decompressed);
  }
}

export const cacheService = new CacheService();

/**
 * Cache namespaces for organization
 */
export const CacheNamespaces = {
  THREATS: 'threats',
  IDENTITIES: 'identities',
  USERS: 'users',
  STATISTICS: 'stats',
  QUERIES: 'queries',
  SESSIONS: 'sessions',
  RATE_LIMITS: 'rate_limits',
} as const;

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;
