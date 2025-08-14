/**
 * Performance monitoring and benchmarking utilities
 * Implements requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';

/**
 * Performance metrics for workflow generation
 */
export interface WorkflowPerformanceMetrics {
  // Timing metrics
  totalDuration: number;
  templateLoadTime: number;
  generationTime: number;
  validationTime: number;
  renderingTime: number;
  
  // Memory metrics
  peakMemoryUsage: number;
  averageMemoryUsage: number;
  memoryLeaks: number;
  
  // Throughput metrics
  templatesPerSecond: number;
  jobsPerSecond: number;
  stepsPerSecond: number;
  
  // Cache metrics
  cacheHitRate: number;
  cacheSize: number;
  
  // Error metrics
  errorCount: number;
  warningCount: number;
  
  // Resource metrics
  cpuUsage: number;
  diskIO: number;
  networkIO: number;
}

/**
 * Performance benchmark configuration
 */
export interface BenchmarkConfig {
  name: string;
  iterations: number;
  warmupIterations: number;
  timeout: number;
  collectGC: boolean;
  collectMemory: boolean;
  collectCPU: boolean;
}

/**
 * Benchmark result
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  metrics: WorkflowPerformanceMetrics;
  statistics: {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    p95: number;
    p99: number;
  };
  baseline?: BenchmarkResult;
  comparison?: {
    improvement: number;
    regression: boolean;
    significant: boolean;
  };
}

/**
 * Performance event types
 */
export interface PerformanceEvents {
  'benchmark-start': (name: string) => void;
  'benchmark-complete': (result: BenchmarkResult) => void;
  'metric-collected': (metric: string, value: number) => void;
  'threshold-exceeded': (metric: string, value: number, threshold: number) => void;
  'memory-leak-detected': (leak: MemoryLeak) => void;
}

/**
 * Memory leak information
 */
export interface MemoryLeak {
  type: 'heap' | 'external' | 'buffer';
  size: number;
  location?: string;
  timestamp: number;
}

/**
 * Performance monitor class
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, number[]> = new Map();
  private timers: Map<string, number> = new Map();
  private memoryBaseline: number = 0;
  private observer: PerformanceObserver | null = null;
  private gcObserver: PerformanceObserver | null = null;
  private isMonitoring = false;
  private thresholds: Map<string, number> = new Map();

  constructor() {
    super();
    this.setupPerformanceObservers();
    this.memoryBaseline = process.memoryUsage().heapUsed;
  }

  /**
   * Start monitoring performance
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.memoryBaseline = process.memoryUsage().heapUsed;
    
    if (this.observer) {
      this.observer.observe({ entryTypes: ['measure', 'mark'] });
    }
    
    if (this.gcObserver) {
      this.gcObserver.observe({ entryTypes: ['gc'] });
    }

    // Start periodic memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Stop monitoring performance
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }
  }

  /**
   * Start timing a specific operation
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
    performance.mark(`${name}-start`);
  }

  /**
   * End timing and record duration
   */
  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      throw new Error(`Timer '${name}' was not started`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    this.recordMetric(name, duration);
    this.timers.delete(name);
    
    return duration;
  }

  /**
   * Record a metric value
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(value);
    this.emit('metric-collected', name, value);
    
    // Check thresholds
    const threshold = this.thresholds.get(name);
    if (threshold && value > threshold) {
      this.emit('threshold-exceeded', name, value, threshold);
    }
  }

  /**
   * Set performance threshold for a metric
   */
  setThreshold(metric: string, threshold: number): void {
    this.thresholds.set(metric, threshold);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): WorkflowPerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      totalDuration: this.getMetricValue('total-duration'),
      templateLoadTime: this.getMetricValue('template-load'),
      generationTime: this.getMetricValue('generation'),
      validationTime: this.getMetricValue('validation'),
      renderingTime: this.getMetricValue('rendering'),
      
      peakMemoryUsage: this.getMetricMax('memory-usage'),
      averageMemoryUsage: this.getMetricAverage('memory-usage'),
      memoryLeaks: this.detectMemoryLeaks(),
      
      templatesPerSecond: this.calculateThroughput('templates-processed'),
      jobsPerSecond: this.calculateThroughput('jobs-processed'),
      stepsPerSecond: this.calculateThroughput('steps-processed'),
      
      cacheHitRate: this.getMetricValue('cache-hit-rate'),
      cacheSize: this.getMetricValue('cache-size'),
      
      errorCount: this.getMetricValue('errors'),
      warningCount: this.getMetricValue('warnings'),
      
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      diskIO: this.getMetricValue('disk-io'),
      networkIO: this.getMetricValue('network-io')
    };
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(
    name: string,
    benchmarkFn: () => Promise<void>,
    config?: Partial<BenchmarkConfig>
  ): Promise<BenchmarkResult> {
    const benchmarkConfig: BenchmarkConfig = {
      name,
      iterations: config?.iterations || 10,
      warmupIterations: config?.warmupIterations || 3,
      timeout: config?.timeout || 30000,
      collectGC: config?.collectGC ?? true,
      collectMemory: config?.collectMemory ?? true,
      collectCPU: config?.collectCPU ?? true,
      ...config
    };

    this.emit('benchmark-start', name);

    // Warmup iterations
    for (let i = 0; i < benchmarkConfig.warmupIterations; i++) {
      await benchmarkFn();
    }

    // Clear metrics from warmup
    this.clearMetrics();

    // Benchmark iterations
    const durations: number[] = [];
    const memoryUsages: number[] = [];
    
    for (let i = 0; i < benchmarkConfig.iterations; i++) {
      // Force garbage collection if available
      if (global.gc && benchmarkConfig.collectGC) {
        global.gc();
      }

      const startMemory = process.memoryUsage().heapUsed;
      const startTime = performance.now();
      
      await benchmarkFn();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      durations.push(endTime - startTime);
      memoryUsages.push(endMemory - startMemory);
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(durations);
    const metrics = this.getMetrics();

    const result: BenchmarkResult = {
      name,
      iterations: benchmarkConfig.iterations,
      metrics,
      statistics
    };

    this.emit('benchmark-complete', result);
    return result;
  }

  /**
   * Compare benchmark results
   */
  compareBenchmarks(current: BenchmarkResult, baseline: BenchmarkResult): BenchmarkResult {
    const improvement = ((baseline.statistics.mean - current.statistics.mean) / baseline.statistics.mean) * 100;
    const regression = improvement < 0;
    
    // Simple significance test (t-test would be more accurate)
    const significant = Math.abs(improvement) > 5; // 5% threshold

    return {
      ...current,
      baseline,
      comparison: {
        improvement,
        regression,
        significant
      }
    };
  }

  /**
   * Generate performance report
   */
  generateReport(results: BenchmarkResult[]): string {
    let report = '# Performance Report\n\n';
    
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    for (const result of results) {
      report += `## ${result.name}\n\n`;
      report += `- Iterations: ${result.iterations}\n`;
      report += `- Mean Duration: ${result.statistics.mean.toFixed(2)}ms\n`;
      report += `- Median Duration: ${result.statistics.median.toFixed(2)}ms\n`;
      report += `- Min Duration: ${result.statistics.min.toFixed(2)}ms\n`;
      report += `- Max Duration: ${result.statistics.max.toFixed(2)}ms\n`;
      report += `- Standard Deviation: ${result.statistics.stdDev.toFixed(2)}ms\n`;
      report += `- 95th Percentile: ${result.statistics.p95.toFixed(2)}ms\n`;
      report += `- 99th Percentile: ${result.statistics.p99.toFixed(2)}ms\n`;
      
      if (result.comparison) {
        const { improvement, regression, significant } = result.comparison;
        const status = regression ? 'REGRESSION' : 'IMPROVEMENT';
        const significanceText = significant ? 'SIGNIFICANT' : 'not significant';
        
        report += `- Comparison: ${improvement.toFixed(2)}% ${status} (${significanceText})\n`;
      }
      
      report += '\n### Metrics\n\n';
      report += `- Peak Memory: ${(result.metrics.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
      report += `- Cache Hit Rate: ${(result.metrics.cacheHitRate * 100).toFixed(2)}%\n`;
      report += `- Templates/sec: ${result.metrics.templatesPerSecond.toFixed(2)}\n`;
      report += `- Jobs/sec: ${result.metrics.jobsPerSecond.toFixed(2)}\n`;
      report += `- Steps/sec: ${result.metrics.stepsPerSecond.toFixed(2)}\n`;
      
      if (result.metrics.errorCount > 0) {
        report += `- Errors: ${result.metrics.errorCount}\n`;
      }
      
      if (result.metrics.warningCount > 0) {
        report += `- Warnings: ${result.metrics.warningCount}\n`;
      }
      
      report += '\n';
    }
    
    return report;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers(): void {
    // Performance observer for measures and marks
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          this.recordMetric(entry.name, entry.duration);
        }
      }
    });

    // GC observer for garbage collection metrics
    try {
      this.gcObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'gc') {
            this.recordMetric('gc-duration', entry.duration);
            this.recordMetric('gc-count', 1);
          }
        }
      });
    } catch (error) {
      // GC observer might not be available in all environments
      console.warn('GC performance observer not available');
    }
  }

  /**
   * Start periodic memory monitoring
   */
  private startMemoryMonitoring(): void {
    const interval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }

      const memoryUsage = process.memoryUsage();
      this.recordMetric('memory-usage', memoryUsage.heapUsed);
      this.recordMetric('memory-external', memoryUsage.external);
      
      // Check for memory leaks
      const currentMemory = memoryUsage.heapUsed;
      const memoryIncrease = currentMemory - this.memoryBaseline;
      
      if (memoryIncrease > 50 * 1024 * 1024) { // 50MB threshold
        const leak: MemoryLeak = {
          type: 'heap',
          size: memoryIncrease,
          timestamp: Date.now()
        };
        this.emit('memory-leak-detected', leak);
      }
    }, 1000);
  }

  /**
   * Get metric value (latest or average)
   */
  private getMetricValue(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    const lastValue = values[values.length - 1];
    return lastValue ?? 0;
  }

  /**
   * Get metric average
   */
  private getMetricAverage(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get metric maximum
   */
  private getMetricMax(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    return Math.max(...values);
  }

  /**
   * Calculate throughput (items per second)
   */
  private calculateThroughput(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    const totalItems = values.reduce((sum, val) => sum + val, 0);
    const totalTime = this.getMetricValue('total-duration') / 1000; // Convert to seconds
    
    return totalTime > 0 ? totalItems / totalTime : 0;
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeaks(): number {
    const memoryValues = this.metrics.get('memory-usage');
    if (!memoryValues || memoryValues.length < 10) return 0;

    // Simple leak detection: check if memory consistently increases
    const recentValues = memoryValues.slice(-10);
    let increasingCount = 0;
    
    for (let i = 1; i < recentValues.length; i++) {
      const current = recentValues[i];
      const previous = recentValues[i - 1];
      if (current !== undefined && previous !== undefined && current > previous) {
        increasingCount++;
      }
    }

    // If memory increased in 80% of recent samples, consider it a leak
    return increasingCount >= 8 ? 1 : 0;
  }

  /**
   * Calculate statistics for an array of values
   */
  private calculateStatistics(values: number[]): {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    p95: number;
    p99: number;
  } {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

    return {
      mean,
      median,
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev,
      p95,
      p99
    };
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance decorator for automatic timing
 */
export function timed(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const timerName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startTimer(timerName);
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        performanceMonitor.endTimer(timerName);
      }
    };

    return descriptor;
  };
}

/**
 * Memory usage decorator
 */
export function memoryTracked(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}-memory`;

    descriptor.value = async function (...args: any[]) {
      const startMemory = process.memoryUsage().heapUsed;
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        const endMemory = process.memoryUsage().heapUsed;
        performanceMonitor.recordMetric(metricName, endMemory - startMemory);
      }
    };

    return descriptor;
  };
}