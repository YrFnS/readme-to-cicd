import { DetectionLogger, getLogger } from '../utils/logger';
import { EventEmitter } from 'events';

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Operation timing data
 */
export interface OperationTiming {
  operation: string;
  component: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
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
 * Performance statistics
 */
export interface PerformanceStats {
  operations: {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    p95Duration: number;
    p99Duration: number;
  };
  memory: {
    current: MemorySnapshot;
    peak: MemorySnapshot;
    average: MemorySnapshot;
  };
  cache: {
    hitRate: number;
    totalRequests: number;
    averageResponseTime: number;
  };
  system: {
    uptime: number;
    cpuUsage: number;
    loadAverage: number[];
  };
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  operationsPerSecond: number;
  memoryUsage: {
    before: MemorySnapshot;
    after: MemorySnapshot;
    peak: MemorySnapshot;
  };
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  enableMetrics: boolean;
  enableProfiling: boolean;
  metricsInterval: number;
  retentionPeriod: number;
  enableMemoryTracking: boolean;
  enableOperationTiming: boolean;
  slowOperationThreshold: number;
}

/**
 * Performance monitor for framework detection system
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private operations: OperationTiming[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private activeOperations = new Map<string, { startTime: number; metadata?: any }>();
  private config: PerformanceConfig;
  private logger: DetectionLogger;
  private metricsTimer?: NodeJS.Timeout;
  private startTime: number;

  constructor(config: Partial<PerformanceConfig> = {}) {
    super();
    
    this.config = {
      enableMetrics: config.enableMetrics ?? true,
      enableProfiling: config.enableProfiling ?? false,
      metricsInterval: config.metricsInterval || 60000, // 1 minute
      retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      enableMemoryTracking: config.enableMemoryTracking ?? true,
      enableOperationTiming: config.enableOperationTiming ?? true,
      slowOperationThreshold: config.slowOperationThreshold || 1000 // 1 second
    };
    
    this.logger = getLogger();
    this.startTime = Date.now();
    
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
    
    this.logger.info('PerformanceMonitor', 'Performance monitoring initialized', {
      config: this.config
    });
  }

  /**
   * Start timing an operation
   */
  startOperation(operationId: string, component: string, metadata?: any): void {
    if (!this.config.enableOperationTiming) return;
    
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      metadata
    });
    
    this.logger.debug('PerformanceMonitor', 'Operation started', {
      operationId,
      component,
      metadata
    });
  }

  /**
   * End timing an operation
   */
  endOperation(operationId: string, component: string, success: boolean = true, error?: string): void {
    if (!this.config.enableOperationTiming) return;
    
    const activeOp = this.activeOperations.get(operationId);
    if (!activeOp) {
      this.logger.warn('PerformanceMonitor', 'Operation not found', { operationId });
      return;
    }
    
    const endTime = Date.now();
    const duration = endTime - activeOp.startTime;
    
    const timing: OperationTiming = {
      operation: operationId,
      component,
      startTime: activeOp.startTime,
      endTime,
      duration,
      success,
      ...(error && { error }),
      metadata: activeOp.metadata
    };
    
    this.operations.push(timing);
    this.activeOperations.delete(operationId);
    
    // Log slow operations
    if (duration > this.config.slowOperationThreshold) {
      this.logger.warn('PerformanceMonitor', 'Slow operation detected', {
        operationId,
        component,
        duration,
        threshold: this.config.slowOperationThreshold
      });
    }
    
    this.logger.debug('PerformanceMonitor', 'Operation completed', {
      operationId,
      component,
      duration,
      success
    });
    
    // Emit performance event
    this.emit('operationCompleted', timing);
    
    // Clean up old operations
    this.cleanupOldData();
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>, metadata?: any): void {
    if (!this.config.enableMetrics) return;
    
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      ...(tags && { tags }),
      ...(metadata && { metadata })
    };
    
    this.metrics.push(metric);
    
    this.logger.debug('PerformanceMonitor', 'Metric recorded', {
      name,
      value,
      unit,
      tags
    });
    
    this.emit('metricRecorded', metric);
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
    }
    
    return snapshot;
  }

  /**
   * Run a benchmark
   */
  async benchmark(
    name: string,
    operation: () => Promise<any> | any,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    this.logger.info('PerformanceMonitor', 'Starting benchmark', {
      name,
      iterations
    });
    
    const times: number[] = [];
    const memoryBefore = this.takeMemorySnapshot();
    let peakMemory = memoryBefore;
    
    // Warm up
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await operation();
    }
    
    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      
      try {
        await operation();
      } catch (error) {
        this.logger.warn('PerformanceMonitor', 'Benchmark iteration failed', {
          name,
          iteration: i,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      times.push(duration);
      
      // Track peak memory usage
      const currentMemory = this.takeMemorySnapshot();
      if (currentMemory.heapUsed > peakMemory.heapUsed) {
        peakMemory = currentMemory;
      }
    }
    
    const memoryAfter = this.takeMemorySnapshot();
    
    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Calculate standard deviation
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);
    
    const operationsPerSecond = 1000 / averageTime;
    
    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      operationsPerSecond,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory
      }
    };
    
    this.logger.info('PerformanceMonitor', 'Benchmark completed', {
      name,
      iterations,
      averageTime: Math.round(averageTime * 100) / 100,
      operationsPerSecond: Math.round(operationsPerSecond * 100) / 100,
      memoryIncrease: memoryAfter.heapUsed - memoryBefore.heapUsed
    });
    
    this.emit('benchmarkCompleted', result);
    
    return result;
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const now = Date.now();
    const recentOperations = this.operations.filter(op => now - op.endTime < 60000); // Last minute
    
    // Calculate operation statistics
    const successfulOps = recentOperations.filter(op => op.success);
    const failedOps = recentOperations.filter(op => !op.success);
    const durations = recentOperations.map(op => op.duration).sort((a, b) => a - b);
    
    const averageDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95Duration = durations.length > 0 ? (durations[p95Index] ?? durations[durations.length - 1]) : 0;
    const p99Duration = durations.length > 0 ? (durations[p99Index] ?? durations[durations.length - 1]) : 0;
    
    // Calculate memory statistics
    const currentMemory = this.takeMemorySnapshot();
    const recentSnapshots = this.memorySnapshots.filter(s => now - s.timestamp < 60000);
    
    let peakMemory = currentMemory;
    let totalHeapUsed = 0;
    let totalHeapTotal = 0;
    let totalRss = 0;
    
    for (const snapshot of recentSnapshots) {
      if (snapshot.heapUsed > peakMemory.heapUsed) {
        peakMemory = snapshot;
      }
      totalHeapUsed += snapshot.heapUsed;
      totalHeapTotal += snapshot.heapTotal;
      totalRss += snapshot.rss;
    }
    
    const avgCount = recentSnapshots.length || 1;
    const averageMemory: MemorySnapshot = {
      timestamp: now,
      heapUsed: totalHeapUsed / avgCount,
      heapTotal: totalHeapTotal / avgCount,
      external: 0,
      rss: totalRss / avgCount,
      arrayBuffers: 0
    };
    
    // System statistics
    const uptime = now - this.startTime;
    const cpuUsage = process.cpuUsage();
    const loadAverage = process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0];
    
    return {
      operations: {
        total: recentOperations.length,
        successful: successfulOps.length,
        failed: failedOps.length,
        averageDuration,
        p95Duration: p95Duration ?? 0,
        p99Duration: p99Duration ?? 0
      },
      memory: {
        current: currentMemory,
        peak: peakMemory,
        average: averageMemory
      },
      cache: {
        hitRate: 0, // Will be populated by cache manager
        totalRequests: 0,
        averageResponseTime: 0
      },
      system: {
        uptime,
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage
      }
    };
  }

  /**
   * Get recent metrics
   */
  getMetrics(since?: number): PerformanceMetric[] {
    const cutoff = since || (Date.now() - 60000); // Default to last minute
    return this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  /**
   * Get recent operations
   */
  getOperations(since?: number): OperationTiming[] {
    const cutoff = since || (Date.now() - 60000); // Default to last minute
    return this.operations.filter(op => op.endTime >= cutoff);
  }

  /**
   * Get memory snapshots
   */
  getMemorySnapshots(since?: number): MemorySnapshot[] {
    const cutoff = since || (Date.now() - 60000); // Default to last minute
    return this.memorySnapshots.filter(snapshot => snapshot.timestamp >= cutoff);
  }

  /**
   * Start metrics collection timer
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metricsInterval);
    
    this.logger.debug('PerformanceMonitor', 'Metrics collection started', {
      interval: this.config.metricsInterval
    });
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    // Memory metrics
    const memSnapshot = this.takeMemorySnapshot();
    this.recordMetric('memory.heap.used', memSnapshot.heapUsed, 'bytes');
    this.recordMetric('memory.heap.total', memSnapshot.heapTotal, 'bytes');
    this.recordMetric('memory.rss', memSnapshot.rss, 'bytes');
    
    // CPU metrics
    const cpuUsage = process.cpuUsage();
    this.recordMetric('cpu.user', cpuUsage.user, 'microseconds');
    this.recordMetric('cpu.system', cpuUsage.system, 'microseconds');
    
    // Event loop lag
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      this.recordMetric('eventloop.lag', lag, 'milliseconds');
    });
    
    // Active operations
    this.recordMetric('operations.active', this.activeOperations.size, 'count');
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    
    // Clean up metrics
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoff);
    
    // Clean up operations
    this.operations = this.operations.filter(op => op.endTime >= cutoff);
    
    // Clean up memory snapshots
    this.memorySnapshots = this.memorySnapshots.filter(snapshot => snapshot.timestamp >= cutoff);
  }

  /**
   * Export performance data
   */
  exportData(): {
    metrics: PerformanceMetric[];
    operations: OperationTiming[];
    memorySnapshots: MemorySnapshot[];
    stats: PerformanceStats;
  } {
    return {
      metrics: [...this.metrics],
      operations: [...this.operations],
      memorySnapshots: [...this.memorySnapshots],
      stats: this.getStats()
    };
  }

  /**
   * Clear all performance data
   */
  clear(): void {
    this.metrics = [];
    this.operations = [];
    this.memorySnapshots = [];
    this.activeOperations.clear();
    
    this.logger.info('PerformanceMonitor', 'Performance data cleared');
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined as any;
    }
    
    this.clear();
    this.logger.info('PerformanceMonitor', 'Performance monitoring stopped');
  }
}

// Singleton instance
let globalPerformanceMonitor: PerformanceMonitor | null = null;

/**
 * Get global performance monitor instance
 */
export function getPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PerformanceMonitor(config);
  }
  return globalPerformanceMonitor;
}

/**
 * Reset global performance monitor (mainly for testing)
 */
export function resetPerformanceMonitor(): void {
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.stop();
    globalPerformanceMonitor = null;
  }
}

/**
 * Decorator for automatic operation timing
 */
export function timed(component: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    if (!descriptor || !descriptor.value) {
      return descriptor;
    }
    
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const operationId = `${component}.${propertyName}`;
      
      monitor.startOperation(operationId, component, { args: args.length });
      
      try {
        const result = await method.apply(this, args);
        monitor.endOperation(operationId, component, true);
        return result;
      } catch (error) {
        monitor.endOperation(operationId, component, false, error instanceof Error ? error.message : String(error));
        throw error;
      }
    };
    
    return descriptor;
  };
}