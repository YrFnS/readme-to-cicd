/**
 * Performance Monitor - Tracks timing, memory usage, and performance metrics
 */

import { performance, PerformanceObserver } from 'perf_hooks';

// Import Node.js types
type MemoryUsage = {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
};

/**
 * Performance metrics for a single operation
 */
export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  memoryBefore: MemoryUsage;
  memoryAfter: MemoryUsage;
  memoryDelta: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  operationName: string;
  totalCalls: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  averageMemoryDelta: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  errorCount: number;
  lastError?: string;
}

/**
 * Performance monitoring configuration
 */
export interface MonitorConfig {
  enabled?: boolean;
  maxHistorySize?: number;
  enableMemoryTracking?: boolean;
  enableGCTracking?: boolean;
  slowOperationThresholdMs?: number;
}

/**
 * Performance monitor for tracking operation metrics
 */
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics[]>();
  private activeOperations = new Map<string, {
    startTime: number;
    memoryBefore: NodeJS.MemoryUsage;
    metadata?: Record<string, any>;
  }>();
  
  private config: Required<MonitorConfig>;
  private gcObserver?: PerformanceObserver;

  constructor(config: MonitorConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxHistorySize: config.maxHistorySize ?? 1000,
      enableMemoryTracking: config.enableMemoryTracking ?? true,
      enableGCTracking: config.enableGCTracking ?? false,
      slowOperationThresholdMs: config.slowOperationThresholdMs ?? 1000
    };

    if (this.config.enableGCTracking) {
      this.setupGCTracking();
    }
  }

  /**
   * Start timing an operation
   */
  startOperation(operationName: string, metadata?: Record<string, any>): string {
    if (!this.config.enabled) {
      return operationName;
    }

    const operationId = `${operationName}_${Date.now()}_${Math.random()}`;
    const startTime = performance.now();
    const memoryBefore = this.config.enableMemoryTracking ? process.memoryUsage() : {} as NodeJS.MemoryUsage;

    this.activeOperations.set(operationId, {
      startTime,
      memoryBefore,
      ...(metadata && { metadata })
    });

    return operationId;
  }

  /**
   * End timing an operation and record metrics
   */
  endOperation(operationId: string): PerformanceMetrics | null {
    if (!this.config.enabled) {
      return null;
    }

    const activeOp = this.activeOperations.get(operationId);
    if (!activeOp) {
      return null;
    }

    const endTime = performance.now();
    const memoryAfter = this.config.enableMemoryTracking ? process.memoryUsage() : {} as NodeJS.MemoryUsage;
    const duration = endTime - activeOp.startTime;

    // Calculate memory delta
    const memoryDelta = this.config.enableMemoryTracking ? {
      rss: memoryAfter.rss - activeOp.memoryBefore.rss,
      heapUsed: memoryAfter.heapUsed - activeOp.memoryBefore.heapUsed,
      heapTotal: memoryAfter.heapTotal - activeOp.memoryBefore.heapTotal,
      external: memoryAfter.external - activeOp.memoryBefore.external,
      arrayBuffers: memoryAfter.arrayBuffers - activeOp.memoryBefore.arrayBuffers
    } : {
      rss: 0, heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0
    };

    const operationName = operationId.split('_')[0] || 'unknown';
    const metrics: PerformanceMetrics = {
      operationName,
      startTime: activeOp.startTime,
      endTime,
      duration,
      memoryBefore: activeOp.memoryBefore,
      memoryAfter,
      memoryDelta,
      ...(activeOp.metadata && { metadata: activeOp.metadata })
    };

    // Store metrics
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }

    const operationMetrics = this.metrics.get(operationName)!;
    operationMetrics.push(metrics);

    // Maintain history size limit
    if (operationMetrics.length > this.config.maxHistorySize) {
      operationMetrics.shift();
    }

    // Log slow operations
    if (duration > this.config.slowOperationThresholdMs) {
      console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    }

    this.activeOperations.delete(operationId);
    return metrics;
  }

  /**
   * Time a function execution
   */
  async timeOperation<T>(
    operationName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = this.startOperation(operationName, metadata);
    
    try {
      const result = await fn();
      this.endOperation(operationId);
      return result;
    } catch (error) {
      this.endOperation(operationId);
      this.recordError(operationName, error);
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeOperationSync<T>(
    operationName: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const operationId = this.startOperation(operationName, metadata);
    
    try {
      const result = fn();
      this.endOperation(operationId);
      return result;
    } catch (error) {
      this.endOperation(operationId);
      this.recordError(operationName, error);
      throw error;
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operationName: string): PerformanceStats | null {
    const operationMetrics = this.metrics.get(operationName);
    if (!operationMetrics || operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    // Calculate average memory delta
    const avgMemoryDelta = {
      rss: operationMetrics.reduce((sum, m) => sum + m.memoryDelta.rss, 0) / operationMetrics.length,
      heapUsed: operationMetrics.reduce((sum, m) => sum + m.memoryDelta.heapUsed, 0) / operationMetrics.length,
      heapTotal: operationMetrics.reduce((sum, m) => sum + m.memoryDelta.heapTotal, 0) / operationMetrics.length,
      external: operationMetrics.reduce((sum, m) => sum + m.memoryDelta.external, 0) / operationMetrics.length,
      arrayBuffers: operationMetrics.reduce((sum, m) => sum + m.memoryDelta.arrayBuffers, 0) / operationMetrics.length
    };

    return {
      operationName,
      totalCalls: operationMetrics.length,
      totalDuration,
      averageDuration: totalDuration / operationMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50Duration: durations[p50Index] || 0,
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      averageMemoryDelta: avgMemoryDelta,
      errorCount: 0 // Will be implemented with error tracking
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): PerformanceStats[] {
    return Array.from(this.metrics.keys())
      .map(operationName => this.getStats(operationName))
      .filter((stats): stats is PerformanceStats => stats !== null);
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Get memory usage formatted for display
   */
  getFormattedMemoryUsage(): string {
    const usage = this.getCurrentMemoryUsage();
    const formatBytes = (bytes: number) => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(2)} MB`;
    };

    return [
      `RSS: ${formatBytes(usage.rss)}`,
      `Heap Used: ${formatBytes(usage.heapUsed)}`,
      `Heap Total: ${formatBytes(usage.heapTotal)}`,
      `External: ${formatBytes(usage.external)}`,
      `Array Buffers: ${formatBytes(usage.arrayBuffers)}`
    ].join(', ');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.activeOperations.clear();
  }

  /**
   * Get configuration
   */
  getConfig(): Required<MonitorConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitorConfig>): void {
    const oldGCTracking = this.config.enableGCTracking;
    Object.assign(this.config, config);

    // Handle GC tracking changes
    if (oldGCTracking !== this.config.enableGCTracking) {
      if (this.config.enableGCTracking) {
        this.setupGCTracking();
      } else {
        this.teardownGCTracking();
      }
    }
  }

  /**
   * Record an error for an operation
   */
  private recordError(operationName: string, error: unknown): void {
    // Error tracking implementation would go here
    console.error(`Error in operation ${operationName}:`, error);
  }

  /**
   * Setup garbage collection tracking
   */
  private setupGCTracking(): void {
    if (this.gcObserver) {
      return;
    }

    try {
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === 'gc') {
            console.log(`GC: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      this.gcObserver.observe({ entryTypes: ['gc'] });
    } catch (error) {
      console.warn('Failed to setup GC tracking:', error);
    }
  }

  /**
   * Teardown garbage collection tracking
   */
  private teardownGCTracking(): void {
    if (this.gcObserver) {
      this.gcObserver.disconnect();
      delete this.gcObserver;
    }
  }

  /**
   * Destroy monitor and cleanup resources
   */
  destroy(): void {
    this.teardownGCTracking();
    this.clear();
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Create a new performance monitor with custom config
 */
export function createPerformanceMonitor(config?: MonitorConfig): PerformanceMonitor {
  return new PerformanceMonitor(config);
}

/**
 * Decorator for timing method execution
 */
export function timed(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const opName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return globalPerformanceMonitor.timeOperation(opName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}