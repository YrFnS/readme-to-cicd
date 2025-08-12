/**
 * Enhanced caching system with LRU cache, TTL, and lazy loading
 * Implements performance optimization requirements 10.1, 10.2
 */

import { WorkflowTemplate } from '../types';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

/**
 * Performance cache configuration options
 */
export interface PerformanceCacheConfig {
  maxSize: number;
  ttlMs: number;
  maxMemoryMB: number;
  enableMetrics: boolean;
  compressionEnabled: boolean;
}

/**
 * Cache metrics for monitoring
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUsageMB: number;
  entryCount: number;
}

/**
 * Enhanced LRU cache with TTL and performance monitoring
 */
export class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private config: PerformanceCacheConfig;
  private metrics: CacheMetrics;

  constructor(config: Partial<PerformanceCacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      ttlMs: config.ttlMs || 30 * 60 * 1000, // 30 minutes
      maxMemoryMB: config.maxMemoryMB || 100,
      enableMetrics: config.enableMetrics ?? true,
      compressionEnabled: config.compressionEnabled ?? false
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsageMB: 0,
      entryCount: 0
    };
  }

  /**
   * Get value from cache with lazy loading support
   */
  async get<K extends T>(
    key: string, 
    loader?: () => Promise<K>
  ): Promise<K | undefined> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    const entry = this.cache.get(key);
    
    if (entry && this.isValidEntry(entry)) {
      // Cache hit
      this.metrics.hits++;
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.updateAccessOrder(key);
      
      if (this.config.enableMetrics) {
        this.updateMetrics(performance.now() - startTime);
      }
      
      return entry.value as K;
    }

    // Cache miss
    this.metrics.misses++;
    
    if (loader) {
      // Lazy loading
      try {
        const value = await loader();
        await this.set(key, value);
        
        if (this.config.enableMetrics) {
          this.updateMetrics(performance.now() - startTime);
        }
        
        return value;
      } catch (error) {
        if (this.config.enableMetrics) {
          this.updateMetrics(performance.now() - startTime);
        }
        throw error;
      }
    }

    if (this.config.enableMetrics) {
      this.updateMetrics(performance.now() - startTime);
    }
    
    return undefined;
  }

  /**
   * Set value in cache with automatic eviction
   */
  async set(key: string, value: T): Promise<void> {
    const size = this.calculateSize(value);
    
    // Check memory limits
    if (this.getMemoryUsage() + size > this.config.maxMemoryMB * 1024 * 1024) {
      await this.evictByMemory();
    }

    // Check size limits
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value: this.config.compressionEnabled ? await this.compress(value) : value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.updateCacheMetrics();
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? this.isValidEntry(entry) : false;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
      this.updateCacheMetrics();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.resetMetrics();
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateCacheMetrics();
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getStatistics(): {
    size: number;
    memoryUsageMB: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    mostAccessedKey: string | null;
    leastAccessedKey: string | null;
  } {
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    let mostAccessed = { key: '', count: 0 };
    let leastAccessed = { key: '', count: Infinity };

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
      if (entry.accessCount > mostAccessed.count) {
        mostAccessed = { key, count: entry.accessCount };
      }
      if (entry.accessCount < leastAccessed.count) {
        leastAccessed = { key, count: entry.accessCount };
      }
    }

    return {
      size: this.cache.size,
      memoryUsageMB: this.getMemoryUsage() / (1024 * 1024),
      oldestEntry: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
      newestEntry: newestTimestamp === 0 ? null : new Date(newestTimestamp),
      mostAccessedKey: mostAccessed.key || null,
      leastAccessedKey: leastAccessed.key || null
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        evicted++;
      }
    }

    this.metrics.evictions += evicted;
    this.updateCacheMetrics();
    return evicted;
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isValidEntry(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < this.config.ttlMs;
  }

  /**
   * Update access order for LRU eviction
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.shift();
      this.metrics.evictions++;
    }
  }

  /**
   * Evict entries to free memory
   */
  private async evictByMemory(): Promise<void> {
    const targetMemory = this.config.maxMemoryMB * 0.8 * 1024 * 1024; // 80% of max
    
    while (this.getMemoryUsage() > targetMemory && this.accessOrder.length > 0) {
      this.evictLRU();
    }
  }

  /**
   * Calculate approximate size of value in bytes
   */
  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate for UTF-16
    } catch {
      return 1024; // Default size if serialization fails
    }
  }

  /**
   * Get current memory usage in bytes
   */
  private getMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * Compress value for storage (placeholder implementation)
   */
  private async compress(value: T): Promise<T> {
    // In a real implementation, this would use compression algorithms
    // For now, just return the value as-is
    return value;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(accessTime: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime * (this.metrics.totalRequests - 1) + accessTime) / 
      this.metrics.totalRequests;
  }

  /**
   * Update cache-specific metrics
   */
  private updateCacheMetrics(): void {
    this.metrics.entryCount = this.cache.size;
    this.metrics.memoryUsageMB = this.getMemoryUsage() / (1024 * 1024);
  }

  /**
   * Reset all metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsageMB: 0,
      entryCount: 0
    };
  }
}

/**
 * Template-specific cache manager
 */
export class TemplateCacheManager {
  private templateCache: PerformanceCache<WorkflowTemplate>;
  private compiledCache: PerformanceCache<HandlebarsTemplateDelegate>;
  private metadataCache: PerformanceCache<any>;

  constructor(config?: Partial<PerformanceCacheConfig>) {
    const cacheConfig = {
      maxSize: 500,
      ttlMs: 60 * 60 * 1000, // 1 hour for templates
      maxMemoryMB: 50,
      enableMetrics: true,
      compressionEnabled: true,
      ...config
    };

    this.templateCache = new PerformanceCache<WorkflowTemplate>(cacheConfig);
    this.compiledCache = new PerformanceCache<HandlebarsTemplateDelegate>({
      ...cacheConfig,
      maxSize: 200, // Compiled templates are larger
      ttlMs: 2 * 60 * 60 * 1000 // 2 hours for compiled templates
    });
    this.metadataCache = new PerformanceCache<any>({
      ...cacheConfig,
      maxSize: 1000,
      ttlMs: 24 * 60 * 60 * 1000 // 24 hours for metadata
    });
  }

  /**
   * Get template with lazy loading
   */
  async getTemplate(
    key: string, 
    loader?: () => Promise<WorkflowTemplate>
  ): Promise<WorkflowTemplate | undefined> {
    return this.templateCache.get(key, loader);
  }

  /**
   * Get compiled template with lazy loading
   */
  async getCompiledTemplate(
    key: string, 
    loader?: () => Promise<HandlebarsTemplateDelegate>
  ): Promise<HandlebarsTemplateDelegate | undefined> {
    return this.compiledCache.get(key, loader);
  }

  /**
   * Get metadata with lazy loading
   */
  async getMetadata(
    key: string, 
    loader?: () => Promise<any>
  ): Promise<any> {
    return this.metadataCache.get(key, loader);
  }

  /**
   * Set template in cache
   */
  async setTemplate(key: string, template: WorkflowTemplate): Promise<void> {
    await this.templateCache.set(key, template);
  }

  /**
   * Set compiled template in cache
   */
  async setCompiledTemplate(key: string, compiled: HandlebarsTemplateDelegate): Promise<void> {
    await this.compiledCache.set(key, compiled);
  }

  /**
   * Set metadata in cache
   */
  async setMetadata(key: string, metadata: any): Promise<void> {
    await this.metadataCache.set(key, metadata);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.templateCache.clear();
    this.compiledCache.clear();
    this.metadataCache.clear();
  }

  /**
   * Cleanup expired entries in all caches
   */
  cleanup(): { templates: number; compiled: number; metadata: number } {
    return {
      templates: this.templateCache.cleanup(),
      compiled: this.compiledCache.cleanup(),
      metadata: this.metadataCache.cleanup()
    };
  }

  /**
   * Get comprehensive cache metrics
   */
  getMetrics(): {
    templates: CacheMetrics;
    compiled: CacheMetrics;
    metadata: CacheMetrics;
    total: {
      memoryUsageMB: number;
      totalEntries: number;
      overallHitRate: number;
    };
  } {
    const templateMetrics = this.templateCache.getMetrics();
    const compiledMetrics = this.compiledCache.getMetrics();
    const metadataMetrics = this.metadataCache.getMetrics();

    const totalRequests = templateMetrics.totalRequests + compiledMetrics.totalRequests + metadataMetrics.totalRequests;
    const totalHits = templateMetrics.hits + compiledMetrics.hits + metadataMetrics.hits;

    return {
      templates: templateMetrics,
      compiled: compiledMetrics,
      metadata: metadataMetrics,
      total: {
        memoryUsageMB: templateMetrics.memoryUsageMB + compiledMetrics.memoryUsageMB + metadataMetrics.memoryUsageMB,
        totalEntries: templateMetrics.entryCount + compiledMetrics.entryCount + metadataMetrics.entryCount,
        overallHitRate: totalRequests > 0 ? totalHits / totalRequests : 0
      }
    };
  }
}