/**
 * Memory Optimizer
 * 
 * Provides memory optimization utilities for large batch operations,
 * including memory monitoring, garbage collection optimization,
 * and resource cleanup strategies.
 */

import { Logger } from './logger';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Memory optimization configuration
 */
export interface MemoryOptimizerConfig {
  enableGCOptimization: boolean;
  gcThresholdMB: number;
  maxHeapUsageMB: number;
  enableMemoryPressureDetection: boolean;
  memoryPressureThreshold: number; // 0-1 (percentage)
  enableResourceCleanup: boolean;
  cleanupInterval: number; // milliseconds
  enableDetailedLogging: boolean;
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  heapUsagePercent: number;
  memoryPressure: number;
  gcCount: number;
  lastGCTime?: number;
}

/**
 * Resource cleanup callback
 */
export type CleanupCallback = () => Promise<void> | void;

/**
 * Memory pressure callback
 */
export type MemoryPressureCallback = (stats: MemoryStats) => Promise<void> | void;

/**
 * Batch processing memory context
 */
export interface BatchMemoryContext {
  maxBatchSize: number;
  currentBatchSize: number;
  processedItems: number;
  estimatedMemoryPerItem: number;
  shouldReduceBatchSize: boolean;
  shouldTriggerGC: boolean;
}

/**
 * Main memory optimizer class
 */
export class MemoryOptimizer {
  private config: MemoryOptimizerConfig;
  private logger: Logger;
  private performanceMonitor?: PerformanceMonitor;
  private cleanupCallbacks: CleanupCallback[] = [];
  private memoryPressureCallbacks: MemoryPressureCallback[] = [];
  private cleanupTimer?: NodeJS.Timeout;
  private gcCount = 0;
  private lastGCTime?: number;

  constructor(
    logger: Logger,
    performanceMonitor?: PerformanceMonitor,
    config: Partial<MemoryOptimizerConfig> = {}
  ) {
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;
    this.config = {
      enableGCOptimization: true,
      gcThresholdMB: 100,
      maxHeapUsageMB: 512,
      enableMemoryPressureDetection: true,
      memoryPressureThreshold: 0.8,
      enableResourceCleanup: true,
      cleanupInterval: 30000, // 30 seconds
      enableDetailedLogging: false,
      ...config
    };

    this.logger.debug('MemoryOptimizer initialized', {
      config: this.config
    });

    if (this.config.enableResourceCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    const memoryPressure = Math.min(1, memUsage.heapUsed / (this.config.maxHeapUsageMB * 1024 * 1024));

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
      heapUsagePercent,
      memoryPressure,
      gcCount: this.gcCount,
      lastGCTime: this.lastGCTime
    };
  }

  /**
   * Check if memory pressure is high
   */
  isMemoryPressureHigh(): boolean {
    const stats = this.getMemoryStats();
    return stats.memoryPressure > this.config.memoryPressureThreshold;
  }

  /**
   * Trigger garbage collection if needed and available
   */
  async triggerGCIfNeeded(): Promise<boolean> {
    if (!this.config.enableGCOptimization) {
      return false;
    }

    const stats = this.getMemoryStats();
    const heapUsedMB = stats.heapUsed / 1024 / 1024;

    if (heapUsedMB > this.config.gcThresholdMB || this.isMemoryPressureHigh()) {
      return this.forceGC();
    }

    return false;
  }

  /**
   * Force garbage collection
   */
  async forceGC(): Promise<boolean> {
    if (!global.gc) {
      this.logger.debug('Garbage collection not available (run with --expose-gc)');
      return false;
    }

    const timerId = this.performanceMonitor?.startTimer('garbage-collection', 'other');
    const beforeStats = this.getMemoryStats();

    try {
      this.logger.debug('Triggering garbage collection', {
        heapUsedBefore: `${(beforeStats.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        memoryPressure: beforeStats.memoryPressure.toFixed(2)
      });

      global.gc();
      this.gcCount++;
      this.lastGCTime = Date.now();

      const afterStats = this.getMemoryStats();
      const memoryFreed = beforeStats.heapUsed - afterStats.heapUsed;

      this.logger.debug('Garbage collection completed', {
        heapUsedAfter: `${(afterStats.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        memoryFreed: `${(memoryFreed / 1024 / 1024).toFixed(2)}MB`,
        gcCount: this.gcCount
      });

      this.performanceMonitor?.endTimer(timerId!, {
        success: true,
        memoryFreed,
        heapUsedBefore: beforeStats.heapUsed,
        heapUsedAfter: afterStats.heapUsed
      });

      return true;

    } catch (error) {
      this.logger.error('Garbage collection failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      this.performanceMonitor?.endTimer(timerId!, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      return false;
    }
  }

  /**
   * Optimize batch processing based on memory constraints
   */
  optimizeBatchProcessing(
    totalItems: number,
    initialBatchSize: number,
    estimatedMemoryPerItem?: number
  ): BatchMemoryContext {
    const stats = this.getMemoryStats();
    const availableMemoryMB = (this.config.maxHeapUsageMB * 1024 * 1024 - stats.heapUsed) / 1024 / 1024;
    
    let optimizedBatchSize = initialBatchSize;
    let shouldReduceBatchSize = false;
    let shouldTriggerGC = false;

    // Estimate memory per item if not provided
    const memoryPerItem = estimatedMemoryPerItem || this.estimateMemoryPerItem();

    // Calculate safe batch size based on available memory
    if (memoryPerItem > 0) {
      const safeBatchSize = Math.floor(availableMemoryMB * 1024 * 1024 * 0.7 / memoryPerItem);
      if (safeBatchSize < initialBatchSize) {
        optimizedBatchSize = Math.max(1, safeBatchSize);
        shouldReduceBatchSize = true;
      }
    }

    // Check if GC should be triggered
    if (stats.memoryPressure > this.config.memoryPressureThreshold * 0.8) {
      shouldTriggerGC = true;
    }

    const context: BatchMemoryContext = {
      maxBatchSize: optimizedBatchSize,
      currentBatchSize: optimizedBatchSize,
      processedItems: 0,
      estimatedMemoryPerItem: memoryPerItem,
      shouldReduceBatchSize,
      shouldTriggerGC
    };

    if (this.config.enableDetailedLogging) {
      this.logger.debug('Batch processing optimized', {
        totalItems,
        initialBatchSize,
        optimizedBatchSize,
        availableMemoryMB: availableMemoryMB.toFixed(2),
        memoryPerItem,
        shouldReduceBatchSize,
        shouldTriggerGC
      });
    }

    return context;
  }

  /**
   * Update batch context during processing
   */
  updateBatchContext(
    context: BatchMemoryContext,
    itemsProcessed: number,
    actualMemoryUsed?: number
  ): BatchMemoryContext {
    context.processedItems += itemsProcessed;

    // Update memory estimation if actual usage is provided
    if (actualMemoryUsed && itemsProcessed > 0) {
      const actualMemoryPerItem = actualMemoryUsed / itemsProcessed;
      context.estimatedMemoryPerItem = (context.estimatedMemoryPerItem + actualMemoryPerItem) / 2;
    }

    // Check if batch size should be adjusted
    const stats = this.getMemoryStats();
    if (stats.memoryPressure > this.config.memoryPressureThreshold) {
      context.currentBatchSize = Math.max(1, Math.floor(context.currentBatchSize * 0.8));
      context.shouldReduceBatchSize = true;
      context.shouldTriggerGC = true;
    } else if (stats.memoryPressure < this.config.memoryPressureThreshold * 0.5) {
      // Can increase batch size if memory pressure is low
      context.currentBatchSize = Math.min(
        context.maxBatchSize,
        Math.floor(context.currentBatchSize * 1.2)
      );
    }

    return context;
  }

  /**
   * Register cleanup callback
   */
  registerCleanupCallback(callback: CleanupCallback): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Register memory pressure callback
   */
  registerMemoryPressureCallback(callback: MemoryPressureCallback): void {
    this.memoryPressureCallbacks.push(callback);
  }

  /**
   * Execute all cleanup callbacks
   */
  async executeCleanup(): Promise<void> {
    if (this.cleanupCallbacks.length === 0) {
      return;
    }

    const timerId = this.performanceMonitor?.startTimer('resource-cleanup', 'other');

    try {
      this.logger.debug('Executing resource cleanup', {
        callbackCount: this.cleanupCallbacks.length
      });

      const cleanupPromises = this.cleanupCallbacks.map(async (callback, index) => {
        try {
          await callback();
        } catch (error) {
          this.logger.warn('Cleanup callback failed', {
            index,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      await Promise.allSettled(cleanupPromises);

      this.performanceMonitor?.endTimer(timerId!, { success: true });

    } catch (error) {
      this.logger.error('Resource cleanup failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      this.performanceMonitor?.endTimer(timerId!, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Monitor memory and trigger callbacks if needed
   */
  async monitorMemory(): Promise<void> {
    const stats = this.getMemoryStats();

    if (this.config.enableMemoryPressureDetection && 
        stats.memoryPressure > this.config.memoryPressureThreshold) {
      
      this.logger.warn('High memory pressure detected', {
        memoryPressure: stats.memoryPressure.toFixed(2),
        heapUsed: `${(stats.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(stats.heapTotal / 1024 / 1024).toFixed(2)}MB`
      });

      // Execute memory pressure callbacks
      for (const callback of this.memoryPressureCallbacks) {
        try {
          await callback(stats);
        } catch (error) {
          this.logger.warn('Memory pressure callback failed', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Trigger cleanup and GC
      await this.executeCleanup();
      await this.triggerGCIfNeeded();
    }
  }

  /**
   * Create a memory-optimized stream processor
   */
  createStreamProcessor<T, R>(
    processor: (item: T) => Promise<R> | R,
    options: {
      batchSize?: number;
      memoryThreshold?: number;
      enableGC?: boolean;
    } = {}
  ): (items: T[]) => AsyncGenerator<R[], void, unknown> {
    const batchSize = options.batchSize || 10;
    const memoryThreshold = options.memoryThreshold || this.config.memoryPressureThreshold;
    const enableGC = options.enableGC !== false;

    return async function* (items: T[]) {
      let currentBatch: T[] = [];
      const results: R[] = [];

      for (let i = 0; i < items.length; i++) {
        currentBatch.push(items[i]);

        if (currentBatch.length >= batchSize || i === items.length - 1) {
          // Process current batch
          const batchResults = await Promise.all(
            currentBatch.map(item => processor(item))
          );
          
          results.push(...batchResults);
          currentBatch = [];

          // Check memory pressure
          const stats = this.getMemoryStats();
          if (stats.memoryPressure > memoryThreshold) {
            if (enableGC) {
              await this.triggerGCIfNeeded();
            }
            
            // Yield results to free memory
            yield results.splice(0);
          }
        }
      }

      // Yield remaining results
      if (results.length > 0) {
        yield results;
      }
    }.bind(this);
  }

  /**
   * Estimate memory usage per item (heuristic)
   */
  private estimateMemoryPerItem(): number {
    // Default estimate: 1KB per item (can be overridden with actual measurements)
    return 1024;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.monitorMemory();
    }, this.config.cleanupInterval);
  }

  /**
   * Shutdown memory optimizer
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Execute final cleanup
    await this.executeCleanup();

    // Final GC if enabled
    if (this.config.enableGCOptimization) {
      await this.forceGC();
    }

    this.logger.debug('MemoryOptimizer shutdown completed', {
      totalGCCount: this.gcCount
    });
  }
}