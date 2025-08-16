/**
 * Performance Monitor
 * 
 * Provides execution profiling, performance monitoring, and metrics collection
 * for CLI operations to identify bottlenecks and optimize performance.
 */

import { Logger } from './logger';

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  category: 'parsing' | 'detection' | 'generation' | 'io' | 'network' | 'other';
  tags?: string[];
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

/**
 * Performance summary statistics
 */
export interface PerformanceSummary {
  totalOperations: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  operationsByCategory: Record<string, number>;
  durationsByCategory: Record<string, number>;
  memoryPeakUsage: number;
  memoryAverageUsage: number;
  slowestOperations: PerformanceMetric[];
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enableProfiling: boolean;
  enableMemoryTracking: boolean;
  memorySnapshotInterval: number; // milliseconds
  slowOperationThreshold: number; // milliseconds
  maxMetricsHistory: number;
  enableDetailedLogging: boolean;
}

/**
 * Timer handle for tracking operations
 */
export interface TimerHandle {
  name: string;
  startTime: number;
  category: PerformanceMetric['category'];
  metadata?: Record<string, any>;
}

/**
 * Main performance monitor class
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeTimers = new Map<string, TimerHandle>();
  private memorySnapshots: MemorySnapshot[] = [];
  private config: PerformanceConfig;
  private logger: Logger;
  private memoryTimer?: NodeJS.Timeout;

  constructor(logger: Logger, config: Partial<PerformanceConfig> = {}) {
    this.logger = logger;
    this.config = {
      enableProfiling: true,
      enableMemoryTracking: true,
      memorySnapshotInterval: 5000, // 5 seconds
      slowOperationThreshold: 1000, // 1 second
      maxMetricsHistory: 1000,
      enableDetailedLogging: false,
      ...config
    };

    this.logger.debug('PerformanceMonitor initialized', {
      config: this.config
    });

    if (this.config.enableMemoryTracking) {
      this.startMemoryTracking();
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(
    name: string,
    category: PerformanceMetric['category'] = 'other',
    metadata?: Record<string, any>
  ): string {
    if (!this.config.enableProfiling) {
      return name;
    }

    const timerId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const timer: TimerHandle = {
      name,
      startTime: performance.now(),
      category,
      metadata
    };

    this.activeTimers.set(timerId, timer);

    if (this.config.enableDetailedLogging) {
      this.logger.debug('Timer started', {
        timerId,
        name,
        category,
        metadata
      });
    }

    return timerId;
  }

  /**
   * End timing an operation
   */
  endTimer(timerId: string, additionalMetadata?: Record<string, any>): PerformanceMetric | null {
    if (!this.config.enableProfiling) {
      return null;
    }

    const timer = this.activeTimers.get(timerId);
    if (!timer) {
      this.logger.warn('Timer not found', { timerId });
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;

    const metric: PerformanceMetric = {
      name: timer.name,
      startTime: timer.startTime,
      endTime,
      duration,
      category: timer.category,
      metadata: {
        ...timer.metadata,
        ...additionalMetadata
      }
    };

    this.activeTimers.delete(timerId);
    this.addMetric(metric);

    // Log slow operations
    if (duration > this.config.slowOperationThreshold) {
      this.logger.warn('Slow operation detected', {
        name: timer.name,
        duration: `${duration.toFixed(2)}ms`,
        category: timer.category,
        metadata: metric.metadata
      });
    }

    if (this.config.enableDetailedLogging) {
      this.logger.debug('Timer ended', {
        timerId,
        name: timer.name,
        duration: `${duration.toFixed(2)}ms`,
        category: timer.category
      });
    }

    return metric;
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    category: PerformanceMetric['category'] = 'other',
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTimer(name, category, metadata);
    
    try {
      const result = await fn();
      this.endTimer(timerId, { success: true });
      return result;
    } catch (error) {
      this.endTimer(timerId, { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create a decorator for timing method calls
   */
  timeMethod(
    category: PerformanceMetric['category'] = 'other',
    metadata?: Record<string, any>
  ) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const monitor = this.performanceMonitor || this.monitor;
        if (!monitor || !(monitor instanceof PerformanceMonitor)) {
          return originalMethod.apply(this, args);
        }

        const methodName = `${target.constructor.name}.${propertyKey}`;
        return monitor.timeFunction(
          methodName,
          () => originalMethod.apply(this, args),
          category,
          metadata
        );
      };

      return descriptor;
    };
  }

  /**
   * Record a custom metric
   */
  recordMetric(
    name: string,
    duration: number,
    category: PerformanceMetric['category'] = 'other',
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enableProfiling) {
      return;
    }

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      duration,
      category,
      metadata
    };

    this.addMetric(metric);
  }

  /**
   * Take a memory snapshot
   */
  takeMemorySnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0
    };

    if (this.config.enableMemoryTracking) {
      this.memorySnapshots.push(snapshot);
      
      // Keep only recent snapshots
      if (this.memorySnapshots.length > this.config.maxMetricsHistory) {
        this.memorySnapshots = this.memorySnapshots.slice(-this.config.maxMetricsHistory);
      }
    }

    return snapshot;
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        operationsByCategory: {},
        durationsByCategory: {},
        memoryPeakUsage: 0,
        memoryAverageUsage: 0,
        slowestOperations: []
      };
    }

    const durations = completedMetrics.map(m => m.duration!);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    
    // Group by category
    const operationsByCategory: Record<string, number> = {};
    const durationsByCategory: Record<string, number> = {};
    
    for (const metric of completedMetrics) {
      const category = metric.category;
      operationsByCategory[category] = (operationsByCategory[category] || 0) + 1;
      durationsByCategory[category] = (durationsByCategory[category] || 0) + metric.duration!;
    }

    // Memory statistics
    const memoryUsages = this.memorySnapshots.map(s => s.heapUsed);
    const memoryPeakUsage = memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0;
    const memoryAverageUsage = memoryUsages.length > 0 
      ? memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length 
      : 0;

    // Slowest operations
    const slowestOperations = [...completedMetrics]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    return {
      totalOperations: completedMetrics.length,
      totalDuration,
      averageDuration: totalDuration / completedMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      operationsByCategory,
      durationsByCategory,
      memoryPeakUsage,
      memoryAverageUsage,
      slowestOperations
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * Get memory snapshots
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Clear all metrics and snapshots
   */
  clear(): void {
    this.metrics = [];
    this.memorySnapshots = [];
    this.activeTimers.clear();
    
    this.logger.debug('Performance metrics cleared');
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): {
    metrics: PerformanceMetric[];
    memorySnapshots: MemorySnapshot[];
    summary: PerformanceSummary;
    exportTimestamp: number;
  } {
    return {
      metrics: this.getMetrics(),
      memorySnapshots: this.getMemorySnapshots(),
      summary: this.getSummary(),
      exportTimestamp: Date.now()
    };
  }

  /**
   * Log performance report
   */
  logReport(): void {
    const summary = this.getSummary();
    
    this.logger.info('Performance Report', {
      totalOperations: summary.totalOperations,
      totalDuration: `${summary.totalDuration.toFixed(2)}ms`,
      averageDuration: `${summary.averageDuration.toFixed(2)}ms`,
      minDuration: `${summary.minDuration.toFixed(2)}ms`,
      maxDuration: `${summary.maxDuration.toFixed(2)}ms`,
      memoryPeakUsage: `${(summary.memoryPeakUsage / 1024 / 1024).toFixed(2)}MB`,
      memoryAverageUsage: `${(summary.memoryAverageUsage / 1024 / 1024).toFixed(2)}MB`,
      operationsByCategory: summary.operationsByCategory
    });

    if (summary.slowestOperations.length > 0) {
      this.logger.info('Slowest Operations', {
        operations: summary.slowestOperations.slice(0, 5).map(op => ({
          name: op.name,
          duration: `${op.duration!.toFixed(2)}ms`,
          category: op.category
        }))
      });
    }
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory);
    }
  }

  /**
   * Start memory tracking
   */
  private startMemoryTracking(): void {
    this.memoryTimer = setInterval(() => {
      this.takeMemorySnapshot();
    }, this.config.memorySnapshotInterval);
  }

  /**
   * Shutdown performance monitor
   */
  shutdown(): void {
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
    }

    // End any active timers
    for (const [timerId, timer] of this.activeTimers.entries()) {
      this.logger.warn('Active timer found during shutdown', {
        timerId,
        name: timer.name,
        category: timer.category
      });
      this.endTimer(timerId, { shutdown: true });
    }

    this.logger.debug('PerformanceMonitor shutdown completed');
  }
}