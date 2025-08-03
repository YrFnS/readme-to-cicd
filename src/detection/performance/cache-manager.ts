import { DetectionResult } from '../interfaces/detection-result';
import { ProjectInfo } from '../interfaces/framework-detector';
import { CIPipeline } from '../interfaces/ci-pipeline';
import { DetectionLogger, getLogger } from '../utils/logger';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  hash: string;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum number of entries to store */
  maxEntries: number;
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** Enable cache statistics */
  enableStats: boolean;
  /** Cache cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * High-performance cache manager for framework detection results
 */
export class CacheManager {
  private detectionCache = new Map<string, CacheEntry<DetectionResult>>();
  private pipelineCache = new Map<string, CacheEntry<CIPipeline>>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private logger: DetectionLogger;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries || 1000,
      defaultTTL: config.defaultTTL || 30 * 60 * 1000, // 30 minutes
      enableStats: config.enableStats ?? true,
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000 // 5 minutes
    };
    
    this.logger = getLogger();
    this.startCleanupTimer();
    
    this.logger.info('CacheManager', 'Cache initialized', {
      maxEntries: this.config.maxEntries,
      defaultTTL: this.config.defaultTTL,
      cleanupInterval: this.config.cleanupInterval
    });
  }

  /**
   * Generate cache key from project info
   */
  private generateProjectKey(projectInfo: ProjectInfo, projectPath?: string): string {
    const keyData = {
      name: projectInfo.name,
      languages: projectInfo.languages.sort(),
      dependencies: projectInfo.dependencies.sort(),
      configFiles: projectInfo.configFiles?.sort() || [],
      buildCommands: projectInfo.buildCommands.sort(),
      projectPath: projectPath || null,
      // Include a hash of raw content for change detection
      contentHash: this.hashString(projectInfo.rawContent)
    };
    
    return this.hashString(JSON.stringify(keyData));
  }

  /**
   * Generate cache key from detection result
   */
  private generateDetectionKey(detectionResult: DetectionResult): string {
    const keyData = {
      frameworks: detectionResult.frameworks.map(f => ({ name: f.name, version: f.version })).sort(),
      buildTools: detectionResult.buildTools.map(b => ({ name: b.name, version: b.version })).sort(),
      containers: detectionResult.containers.map(c => ({ type: c.type, baseImages: c.baseImages })).sort(),
      confidence: Math.round(detectionResult.confidence.score * 100) // Round to avoid minor variations
    };
    
    return this.hashString(JSON.stringify(keyData));
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache detection result
   */
  cacheDetectionResult(
    projectInfo: ProjectInfo, 
    result: DetectionResult, 
    projectPath?: string,
    ttl?: number
  ): void {
    const key = this.generateProjectKey(projectInfo, projectPath);
    const entry: CacheEntry<DetectionResult> = {
      data: result,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      hash: key
    };

    // Ensure cache size limit
    if (this.detectionCache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed(this.detectionCache);
    }

    this.detectionCache.set(key, entry);
    
    this.logger.debug('CacheManager', 'Detection result cached', {
      key: key.substring(0, 8),
      frameworks: result.frameworks.length,
      ttl: entry.ttl,
      cacheSize: this.detectionCache.size
    });
  }

  /**
   * Get cached detection result
   */
  getCachedDetectionResult(projectInfo: ProjectInfo, projectPath?: string): DetectionResult | null {
    const key = this.generateProjectKey(projectInfo, projectPath);
    const entry = this.detectionCache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.detectionCache.delete(key);
      this.stats.misses++;
      this.logger.debug('CacheManager', 'Cache entry expired', { key: key.substring(0, 8) });
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    this.logger.debug('CacheManager', 'Cache hit for detection result', {
      key: key.substring(0, 8),
      accessCount: entry.accessCount,
      age: Date.now() - entry.timestamp
    });

    return entry.data;
  }

  /**
   * Cache CI pipeline result
   */
  cachePipelineResult(detectionResult: DetectionResult, pipeline: CIPipeline, ttl?: number): void {
    const key = this.generateDetectionKey(detectionResult);
    const entry: CacheEntry<CIPipeline> = {
      data: pipeline,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      hash: key
    };

    // Ensure cache size limit
    if (this.pipelineCache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed(this.pipelineCache);
    }

    this.pipelineCache.set(key, entry);
    
    this.logger.debug('CacheManager', 'Pipeline result cached', {
      key: key.substring(0, 8),
      setupSteps: pipeline.setup.length,
      buildSteps: pipeline.build.length,
      ttl: entry.ttl,
      cacheSize: this.pipelineCache.size
    });
  }

  /**
   * Get cached CI pipeline result
   */
  getCachedPipelineResult(detectionResult: DetectionResult): CIPipeline | null {
    const key = this.generateDetectionKey(detectionResult);
    const entry = this.pipelineCache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.pipelineCache.delete(key);
      this.stats.misses++;
      this.logger.debug('CacheManager', 'Pipeline cache entry expired', { key: key.substring(0, 8) });
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    this.logger.debug('CacheManager', 'Cache hit for pipeline result', {
      key: key.substring(0, 8),
      accessCount: entry.accessCount,
      age: Date.now() - entry.timestamp
    });

    return entry.data;
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed<T>(cache: Map<string, CacheEntry<T>>): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      this.stats.evictions++;
      this.logger.debug('CacheManager', 'Evicted LRU entry', { 
        key: oldestKey.substring(0, 8),
        age: Date.now() - oldestTime
      });
    }
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean detection cache
    for (const [key, entry] of this.detectionCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.detectionCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean pipeline cache
    for (const [key, entry] of this.pipelineCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.pipelineCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('CacheManager', 'Cleaned up expired entries', {
        cleanedCount,
        detectionCacheSize: this.detectionCache.size,
        pipelineCacheSize: this.pipelineCache.size
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    const allEntries = [
      ...Array.from(this.detectionCache.values()),
      ...Array.from(this.pipelineCache.values())
    ];
    
    const timestamps = allEntries.map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;
    
    // Rough memory usage estimation
    const memoryUsage = (this.detectionCache.size + this.pipelineCache.size) * 1024; // Rough estimate

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.detectionCache.size + this.pipelineCache.size,
      hitRate,
      memoryUsage,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear all caches
   */
  clear(): void {
    const totalEntries = this.detectionCache.size + this.pipelineCache.size;
    
    this.detectionCache.clear();
    this.pipelineCache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    
    this.logger.info('CacheManager', 'All caches cleared', { entriesCleared: totalEntries });
  }

  /**
   * Invalidate cache entries for a specific project
   */
  invalidateProject(projectInfo: ProjectInfo, projectPath?: string): void {
    const key = this.generateProjectKey(projectInfo, projectPath);
    const deleted = this.detectionCache.delete(key);
    
    if (deleted) {
      this.logger.debug('CacheManager', 'Project cache invalidated', { 
        key: key.substring(0, 8),
        project: projectInfo.name
      });
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined as any;
    }
    
    this.clear();
    this.logger.info('CacheManager', 'Cache manager destroyed');
  }
}

// Singleton instance for global use
let globalCacheManager: CacheManager | null = null;

/**
 * Get global cache manager instance
 */
export function getCacheManager(config?: Partial<CacheConfig>): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager(config);
  }
  return globalCacheManager;
}

/**
 * Reset global cache manager (mainly for testing)
 */
export function resetCacheManager(): void {
  if (globalCacheManager) {
    globalCacheManager.destroy();
    globalCacheManager = null;
  }
}