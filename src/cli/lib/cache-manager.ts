/**
 * Cache Manager
 * 
 * Provides caching capabilities for configurations, templates, and other
 * frequently accessed data to improve CLI performance and reduce startup time.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from './logger';

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hash?: string;
  size?: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTtl: number; // Default TTL in milliseconds
  enablePersistence: boolean; // Whether to persist cache to disk
  persistencePath?: string; // Path for cache persistence
  enableCompression: boolean; // Whether to compress cached data
  enableMetrics: boolean; // Whether to collect performance metrics
}

/**
 * Cache key generator function
 */
export type CacheKeyGenerator = (...args: any[]) => string;

/**
 * Main cache manager class
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0
  };
  private config: CacheConfig;
  private logger: Logger;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(logger: Logger, config: Partial<CacheConfig> = {}) {
    this.logger = logger;
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      maxEntries: 1000,
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      enablePersistence: true,
      persistencePath: path.join(process.cwd(), '.cache', 'cli-cache.json'),
      enableCompression: false,
      enableMetrics: true,
      ...config
    };

    this.logger.debug('CacheManager initialized', {
      config: this.config
    });

    // Start cleanup timer
    this.startCleanupTimer();

    // Load persisted cache if enabled
    if (this.config.enablePersistence) {
      this.loadPersistedCache().catch(error => {
        this.logger.debug('Failed to load persisted cache', { error: error.message });
      });
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordMiss();
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.updateStats();
      this.recordMiss();
      return null;
    }

    this.recordHit();
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entryTtl = ttl || this.config.defaultTtl;
    const serializedData = JSON.stringify(value);
    const size = Buffer.byteLength(serializedData, 'utf8');
    const hash = this.generateHash(serializedData);

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: entryTtl,
      hash,
      size
    };

    // Check if we need to evict entries
    await this.ensureCapacity(size);

    this.cache.set(key, entry);
    this.updateStats();

    this.logger.debug('Cache entry set', {
      key,
      size,
      ttl: entryTtl,
      totalEntries: this.cache.size
    });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.updateStats();
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.updateStats();
    this.logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Memoize a function with caching
   */
  memoize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn> | TReturn,
    keyGenerator?: CacheKeyGenerator,
    ttl?: number
  ): (...args: TArgs) => Promise<TReturn> {
    const generateKey = keyGenerator || ((...args) => 
      this.generateHash(JSON.stringify(args))
    );

    return async (...args: TArgs): Promise<TReturn> => {
      const key = `memoized:${fn.name}:${generateKey(...args)}`;
      return this.getOrSet(key, () => fn(...args), ttl);
    };
  }

  /**
   * Cache configuration loading
   */
  async cacheConfig<T>(
    configPath: string,
    loader: (path: string) => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    // Generate cache key based on file path and modification time
    const key = await this.generateFileBasedKey(configPath, 'config');
    
    return this.getOrSet(key, () => loader(configPath), ttl);
  }

  /**
   * Cache template loading
   */
  async cacheTemplate(
    templatePath: string,
    loader: (path: string) => Promise<string> | string,
    ttl?: number
  ): Promise<string> {
    const key = await this.generateFileBasedKey(templatePath, 'template');
    
    return this.getOrSet(key, () => loader(templatePath), ttl);
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    this.updateStats();
    
    this.logger.debug('Cache entries invalidated by pattern', {
      pattern,
      deletedCount: keysToDelete.length
    });

    return keysToDelete.length;
  }

  /**
   * Persist cache to disk
   */
  async persistCache(): Promise<void> {
    if (!this.config.enablePersistence || !this.config.persistencePath) {
      return;
    }

    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };

      const persistenceDir = path.dirname(this.config.persistencePath);
      await fs.mkdir(persistenceDir, { recursive: true });
      
      await fs.writeFile(
        this.config.persistencePath,
        JSON.stringify(cacheData, null, 2),
        'utf8'
      );

      this.logger.debug('Cache persisted to disk', {
        path: this.config.persistencePath,
        entries: this.cache.size
      });

    } catch (error) {
      this.logger.error('Failed to persist cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Load persisted cache from disk
   */
  private async loadPersistedCache(): Promise<void> {
    if (!this.config.persistencePath) {
      return;
    }

    try {
      const data = await fs.readFile(this.config.persistencePath, 'utf8');
      const cacheData = JSON.parse(data);

      // Validate cache data structure
      if (!cacheData.entries || !Array.isArray(cacheData.entries)) {
        return;
      }

      // Load entries, filtering out expired ones
      const now = Date.now();
      let loadedCount = 0;

      for (const [key, entry] of cacheData.entries) {
        if (now <= entry.timestamp + entry.ttl) {
          this.cache.set(key, entry);
          loadedCount++;
        }
      }

      this.updateStats();

      this.logger.debug('Cache loaded from disk', {
        path: this.config.persistencePath,
        totalEntries: cacheData.entries.length,
        loadedEntries: loadedCount
      });

    } catch (error) {
      // Ignore errors when loading cache - it's not critical
      this.logger.debug('Could not load persisted cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Generate file-based cache key including modification time
   */
  private async generateFileBasedKey(filePath: string, prefix: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      const mtime = stats.mtime.getTime();
      return `${prefix}:${filePath}:${mtime}`;
    } catch {
      // If file doesn't exist, use path only
      return `${prefix}:${filePath}:0`;
    }
  }

  /**
   * Generate hash for data
   */
  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    // Check size limit
    while (this.stats.totalSize + newEntrySize > this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.updateStats();
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.entryCount = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + (entry.size || 0), 0);
    
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    if (this.config.enableMetrics) {
      this.stats.hits++;
    }
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    if (this.config.enableMetrics) {
      this.stats.misses++;
    }
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.updateStats();
      this.logger.debug('Cleaned up expired cache entries', {
        deletedCount: keysToDelete.length
      });
    }
  }

  /**
   * Shutdown cache manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.config.enablePersistence) {
      await this.persistCache();
    }

    this.logger.debug('CacheManager shutdown completed');
  }
}