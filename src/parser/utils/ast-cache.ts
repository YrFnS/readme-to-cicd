/**
 * AST Cache - Implements caching for parsed markdown ASTs to avoid re-parsing
 */

import { createHash } from 'crypto';
import { MarkdownAST } from '../types';

/**
 * Cache entry for storing parsed AST with metadata
 */
interface CacheEntry {
  ast: MarkdownAST;
  rawContent: string;
  tokenCount: number;
  processingTime: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  contentHash: string;
  size: number; // Approximate memory size in bytes
}

/**
 * Cache statistics for monitoring performance
 */
export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalMemoryUsage: number; // Approximate memory usage in bytes
  averageProcessingTime: number;
  oldestEntry?: number | undefined; // Timestamp
  newestEntry?: number | undefined; // Timestamp
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  maxEntries?: number;        // Maximum number of entries to store
  maxMemoryMB?: number;       // Maximum memory usage in MB
  ttlMs?: number;            // Time to live in milliseconds
  cleanupIntervalMs?: number; // Cleanup interval in milliseconds
}

/**
 * AST Cache implementation with LRU eviction and memory management
 */
export class ASTCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    totalProcessingTime: 0,
    totalEntries: 0
  };
  
  private readonly options: Required<CacheOptions>;
  private cleanupTimer?: ReturnType<typeof setTimeout> | undefined;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries ?? 100,
      maxMemoryMB: options.maxMemoryMB ?? 50, // 50MB default
      ttlMs: options.ttlMs ?? 30 * 60 * 1000, // 30 minutes default
      cleanupIntervalMs: options.cleanupIntervalMs ?? 5 * 60 * 1000 // 5 minutes default
    };

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Get cached AST or return null if not found/expired
   */
  get(content: string): CacheEntry | null {
    const hash = this.generateContentHash(content);
    const entry = this.cache.get(hash);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.options.ttlMs) {
      this.cache.delete(hash);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    return entry;
  }

  /**
   * Store parsed AST in cache
   */
  set(content: string, ast: MarkdownAST, processingTime: number): void {
    const hash = this.generateContentHash(content);
    const now = Date.now();
    const size = this.estimateMemorySize(ast, content);

    const entry: CacheEntry = {
      ast,
      rawContent: content,
      tokenCount: ast.length,
      processingTime,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      contentHash: hash,
      size
    };

    // Check if we need to make room
    this.ensureCapacity(size);

    this.cache.set(hash, entry);
    this.stats.totalEntries++;
    this.stats.totalProcessingTime += processingTime;
  }

  /**
   * Check if content is cached
   */
  has(content: string): boolean {
    const hash = this.generateContentHash(content);
    const entry = this.cache.get(hash);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.options.ttlMs) {
      this.cache.delete(hash);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalProcessingTime: 0,
      totalEntries: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalMemoryUsage = entries.reduce((sum, entry) => sum + entry.size, 0);
    
    const timestamps = entries.map(e => e.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : undefined;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : undefined;

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0,
      totalMemoryUsage,
      averageProcessingTime: this.stats.totalEntries > 0 
        ? this.stats.totalProcessingTime / this.stats.totalEntries 
        : 0,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Get cache configuration
   */
  getOptions(): Required<CacheOptions> {
    return { ...this.options };
  }

  /**
   * Update cache configuration
   */
  updateOptions(options: Partial<CacheOptions>): void {
    Object.assign(this.options, options);
    
    // Restart cleanup with new interval if changed
    if (options.cleanupIntervalMs !== undefined) {
      this.stopCleanup();
      this.startCleanup();
    }

    // Trigger cleanup if limits were reduced
    this.cleanup();
  }

  /**
   * Manually trigger cache cleanup
   */
  cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    // Find expired entries
    for (const [hash, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.ttlMs) {
        entriesToDelete.push(hash);
      }
    }

    // Delete expired entries
    entriesToDelete.forEach(hash => this.cache.delete(hash));

    // Check memory and entry limits
    this.ensureCapacity(0);
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }

  /**
   * Generate content hash for cache key
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Estimate memory size of cache entry
   */
  private estimateMemorySize(ast: MarkdownAST, content: string): number {
    // Rough estimation: content size + AST size (approximated as 2x content size)
    const contentSize = Buffer.byteLength(content, 'utf8');
    const astSize = contentSize * 2; // Rough approximation
    const metadataSize = 200; // Approximate size of metadata
    
    return contentSize + astSize + metadataSize;
  }

  /**
   * Ensure cache doesn't exceed capacity limits
   */
  private ensureCapacity(newEntrySize: number): void {
    const currentMemory = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const maxMemoryBytes = this.options.maxMemoryMB * 1024 * 1024;
    
    // Check if we need to evict entries
    const needsEviction = 
      this.cache.size >= this.options.maxEntries ||
      currentMemory + newEntrySize > maxMemoryBytes;

    if (!needsEviction) {
      return;
    }

    // Sort entries by LRU (least recently used first)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Evict entries until we're under limits
    let memoryFreed = 0;
    let entriesRemoved = 0;

    for (const [hash, entry] of entries) {
      if (this.cache.size - entriesRemoved <= this.options.maxEntries * 0.8 &&
          currentMemory - memoryFreed + newEntrySize <= maxMemoryBytes * 0.8) {
        break;
      }

      this.cache.delete(hash);
      memoryFreed += entry.size;
      entriesRemoved++;
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupIntervalMs);
  }

  /**
   * Stop periodic cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

/**
 * Global AST cache instance
 */
export const globalASTCache = new ASTCache();

/**
 * Create a new AST cache with custom options
 */
export function createASTCache(options?: CacheOptions): ASTCache {
  return new ASTCache(options);
}