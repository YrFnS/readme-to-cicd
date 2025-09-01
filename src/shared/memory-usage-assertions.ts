/**
 * Memory Usage Assertions
 * 
 * Provides utilities for asserting memory usage in tests to prevent regression.
 * Includes memory threshold checks, memory growth assertions, and memory leak detection.
 */

import { TestWorkerMemoryMonitor, type TestWorkerMemoryUsage } from './test-worker-memory-monitor.js';
import { TestMemoryTracker, type TestMemorySnapshot } from './test-memory-tracking.js';

export interface MemoryThreshold {
  /** Maximum allowed memory usage in bytes */
  maxMemoryBytes?: number;
  /** Maximum allowed memory growth in bytes */
  maxGrowthBytes?: number;
  /** Maximum allowed memory growth as percentage of initial memory */
  maxGrowthPercentage?: number;
  /** Maximum allowed memory usage as percentage of system limit */
  maxUsagePercentage?: number;
  /** Minimum memory efficiency score (0-100) */
  minEfficiencyScore?: number;
}

export interface MemoryAssertionOptions {
  /** Custom error message prefix */
  messagePrefix?: string;
  /** Whether to include detailed memory information in error messages */
  includeDetails?: boolean;
  /** Whether to force garbage collection before assertion */
  forceGC?: boolean;
  /** Whether to log memory usage even when assertion passes */
  logOnSuccess?: boolean;
}

export interface MemoryAssertionResult {
  /** Whether the assertion passed */
  passed: boolean;
  /** Error message if assertion failed */
  errorMessage?: string;
  /** Current memory usage */
  currentUsage: TestWorkerMemoryUsage;
  /** Memory growth since baseline (if available) */
  memoryGrowth?: number;
  /** Memory efficiency score (if available) */
  efficiencyScore?: number;
  /** Additional details */
  details: string;
}

export interface MemoryRegressionCheck {
  /** Test name for tracking */
  testName: string;
  /** Expected memory usage baseline in bytes */
  expectedMemoryUsage: number;
  /** Allowed variance as percentage (e.g., 0.1 for 10%) */
  allowedVariance: number;
  /** Whether to update baseline if test passes */
  updateBaseline?: boolean;
}

/**
 * Memory Usage Assertion Utilities
 * 
 * Provides comprehensive memory assertion capabilities for tests.
 */
export class MemoryUsageAssertions {
  private readonly memoryMonitor: TestWorkerMemoryMonitor;
  private readonly memoryTracker?: TestMemoryTracker;
  private readonly baselineMemory: Map<string, number> = new Map();
  private readonly regressionBaselines: Map<string, number> = new Map();

  constructor(
    memoryMonitor: TestWorkerMemoryMonitor,
    memoryTracker?: TestMemoryTracker
  ) {
    this.memoryMonitor = memoryMonitor;
    this.memoryTracker = memoryTracker;
  }

  /**
   * Assert that current memory usage is within specified thresholds
   */
  assertMemoryWithinThresholds(
    thresholds: MemoryThreshold,
    options: MemoryAssertionOptions = {}
  ): MemoryAssertionResult {
    const { forceGC = false, includeDetails = true, logOnSuccess = false } = options;

    // Force garbage collection if requested
    if (forceGC && global.gc) {
      global.gc();
    }

    const currentUsage = this.memoryMonitor.getCurrentMemoryUsage();
    const errors: string[] = [];
    let efficiencyScore: number | undefined;

    // Check maximum memory usage
    if (thresholds.maxMemoryBytes && currentUsage.heapUsed > thresholds.maxMemoryBytes) {
      errors.push(
        `Memory usage ${this.formatBytes(currentUsage.heapUsed)} exceeds limit ${this.formatBytes(thresholds.maxMemoryBytes)}`
      );
    }

    // Check usage percentage
    if (thresholds.maxUsagePercentage && currentUsage.usagePercentage > thresholds.maxUsagePercentage) {
      errors.push(
        `Memory usage ${currentUsage.usagePercentage.toFixed(1)}% exceeds limit ${thresholds.maxUsagePercentage.toFixed(1)}%`
      );
    }

    // Check memory growth if baseline exists
    let memoryGrowth: number | undefined;
    if (thresholds.maxGrowthBytes || thresholds.maxGrowthPercentage) {
      const testName = this.getCurrentTestName();
      const baseline = testName ? this.baselineMemory.get(testName) : undefined;
      
      if (baseline) {
        memoryGrowth = currentUsage.heapUsed - baseline;
        
        if (thresholds.maxGrowthBytes && memoryGrowth > thresholds.maxGrowthBytes) {
          errors.push(
            `Memory growth ${this.formatBytes(memoryGrowth)} exceeds limit ${this.formatBytes(thresholds.maxGrowthBytes)}`
          );
        }
        
        if (thresholds.maxGrowthPercentage) {
          const growthPercentage = (memoryGrowth / baseline) * 100;
          if (growthPercentage > thresholds.maxGrowthPercentage) {
            errors.push(
              `Memory growth ${growthPercentage.toFixed(1)}% exceeds limit ${thresholds.maxGrowthPercentage.toFixed(1)}%`
            );
          }
        }
      }
    }

    // Check efficiency score if available
    if (thresholds.minEfficiencyScore && this.memoryTracker) {
      const testName = this.getCurrentTestName();
      if (testName) {
        const snapshot = this.memoryTracker.getTestSnapshot(testName);
        if (snapshot && snapshot.endMemory) {
          efficiencyScore = this.calculateEfficiencyScore(snapshot);
          if (efficiencyScore < thresholds.minEfficiencyScore) {
            errors.push(
              `Memory efficiency score ${efficiencyScore.toFixed(1)} below minimum ${thresholds.minEfficiencyScore.toFixed(1)}`
            );
          }
        }
      }
    }

    const passed = errors.length === 0;
    const details = this.generateMemoryDetails(currentUsage, memoryGrowth, efficiencyScore, includeDetails);

    // Log results
    if (passed && logOnSuccess) {
      console.log(`✅ Memory assertion passed: ${details}`);
    } else if (!passed) {
      console.error(`❌ Memory assertion failed: ${errors.join(', ')}`);
      if (includeDetails) {
        console.error(`   ${details}`);
      }
    }

    return {
      passed,
      errorMessage: passed ? undefined : errors.join('; '),
      currentUsage,
      memoryGrowth,
      efficiencyScore,
      details
    };
  }

  /**
   * Assert that memory usage has not regressed compared to baseline
   */
  assertNoMemoryRegression(
    check: MemoryRegressionCheck,
    options: MemoryAssertionOptions = {}
  ): MemoryAssertionResult {
    const { forceGC = false, includeDetails = true } = options;

    if (forceGC && global.gc) {
      global.gc();
    }

    const currentUsage = this.memoryMonitor.getCurrentMemoryUsage();
    const baseline = this.regressionBaselines.get(check.testName) || check.expectedMemoryUsage;
    const allowedVariance = baseline * check.allowedVariance;
    const maxAllowedUsage = baseline + allowedVariance;
    
    const memoryGrowth = currentUsage.heapUsed - baseline;
    const growthPercentage = (memoryGrowth / baseline) * 100;
    
    const passed = currentUsage.heapUsed <= maxAllowedUsage;
    
    // Update baseline if test passes and requested
    if (passed && check.updateBaseline) {
      this.regressionBaselines.set(check.testName, currentUsage.heapUsed);
    }

    const details = this.generateRegressionDetails(
      check.testName,
      baseline,
      currentUsage.heapUsed,
      allowedVariance,
      growthPercentage,
      includeDetails
    );

    if (passed) {
      console.log(`✅ No memory regression detected for ${check.testName}: ${details}`);
    } else {
      console.error(`❌ Memory regression detected for ${check.testName}: ${details}`);
    }

    return {
      passed,
      errorMessage: passed ? undefined : `Memory regression: ${this.formatBytes(currentUsage.heapUsed)} > ${this.formatBytes(maxAllowedUsage)} (${growthPercentage.toFixed(1)}% increase)`,
      currentUsage,
      memoryGrowth,
      details
    };
  }

  /**
   * Assert that memory growth during operation is within limits
   */
  async assertMemoryGrowthDuringOperation<T>(
    operation: () => Promise<T> | T,
    maxGrowthBytes: number,
    options: MemoryAssertionOptions = {}
  ): Promise<{ result: T; assertion: MemoryAssertionResult }> {
    const { forceGC = true, includeDetails = true } = options;

    // Force GC before measurement
    if (forceGC && global.gc) {
      global.gc();
    }

    const startUsage = this.memoryMonitor.getCurrentMemoryUsage();
    const startTime = Date.now();

    try {
      const result = await operation();
      
      // Force GC after operation
      if (forceGC && global.gc) {
        global.gc();
      }

      const endUsage = this.memoryMonitor.getCurrentMemoryUsage();
      const endTime = Date.now();
      const duration = endTime - startTime;
      const memoryGrowth = endUsage.heapUsed - startUsage.heapUsed;
      
      const passed = memoryGrowth <= maxGrowthBytes;
      const details = `Operation took ${duration}ms, memory growth: ${this.formatBytes(memoryGrowth)} (limit: ${this.formatBytes(maxGrowthBytes)})`;

      if (passed) {
        console.log(`✅ Memory growth within limits: ${details}`);
      } else {
        console.error(`❌ Memory growth exceeded limits: ${details}`);
      }

      const assertion: MemoryAssertionResult = {
        passed,
        errorMessage: passed ? undefined : `Memory growth ${this.formatBytes(memoryGrowth)} exceeds limit ${this.formatBytes(maxGrowthBytes)}`,
        currentUsage: endUsage,
        memoryGrowth,
        details
      };

      return { result, assertion };

    } catch (error) {
      const endUsage = this.memoryMonitor.getCurrentMemoryUsage();
      const memoryGrowth = endUsage.heapUsed - startUsage.heapUsed;
      
      console.error(`❌ Operation failed with memory growth: ${this.formatBytes(memoryGrowth)}`);
      
      const assertion: MemoryAssertionResult = {
        passed: false,
        errorMessage: `Operation failed: ${error}`,
        currentUsage: endUsage,
        memoryGrowth,
        details: `Operation failed after ${Date.now() - startTime}ms with memory growth: ${this.formatBytes(memoryGrowth)}`
      };

      throw error;
    }
  }

  /**
   * Set memory baseline for current test
   */
  setMemoryBaseline(testName?: string): void {
    const name = testName || this.getCurrentTestName();
    if (name) {
      const usage = this.memoryMonitor.getCurrentMemoryUsage();
      this.baselineMemory.set(name, usage.heapUsed);
      console.log(`📊 Set memory baseline for ${name}: ${usage.formattedHeapUsed}`);
    }
  }

  /**
   * Clear memory baseline for test
   */
  clearMemoryBaseline(testName?: string): void {
    const name = testName || this.getCurrentTestName();
    if (name) {
      this.baselineMemory.delete(name);
    }
  }

  /**
   * Get memory baseline for test
   */
  getMemoryBaseline(testName?: string): number | undefined {
    const name = testName || this.getCurrentTestName();
    return name ? this.baselineMemory.get(name) : undefined;
  }

  /**
   * Set regression baseline for test
   */
  setRegressionBaseline(testName: string, memoryUsage: number): void {
    this.regressionBaselines.set(testName, memoryUsage);
    console.log(`📊 Set regression baseline for ${testName}: ${this.formatBytes(memoryUsage)}`);
  }

  /**
   * Get regression baseline for test
   */
  getRegressionBaseline(testName: string): number | undefined {
    return this.regressionBaselines.get(testName);
  }

  /**
   * Clear all baselines
   */
  clearAllBaselines(): void {
    this.baselineMemory.clear();
    this.regressionBaselines.clear();
  }

  /**
   * Generate memory usage report for current state
   */
  generateMemoryReport(): string {
    const usage = this.memoryMonitor.getCurrentMemoryUsage();
    const testName = this.getCurrentTestName();
    
    let report = '\n📊 Memory Usage Report\n';
    report += '='.repeat(30) + '\n';
    report += `Current Usage: ${usage.formattedHeapUsed}\n`;
    report += `Total Heap: ${usage.formattedHeapTotal}\n`;
    report += `RSS: ${this.formatBytes(usage.rss)}\n`;
    report += `External: ${this.formatBytes(usage.external)}\n`;
    report += `Usage %: ${usage.usagePercentage.toFixed(1)}%\n`;
    report += `Status: ${this.getMemoryStatus(usage)}\n`;
    
    if (testName) {
      report += `Current Test: ${testName}\n`;
      
      const baseline = this.baselineMemory.get(testName);
      if (baseline) {
        const growth = usage.heapUsed - baseline;
        report += `Baseline: ${this.formatBytes(baseline)}\n`;
        report += `Growth: ${growth > 0 ? '+' : ''}${this.formatBytes(growth)}\n`;
      }
      
      const regressionBaseline = this.regressionBaselines.get(testName);
      if (regressionBaseline) {
        const regression = usage.heapUsed - regressionBaseline;
        const regressionPercentage = (regression / regressionBaseline) * 100;
        report += `Regression Baseline: ${this.formatBytes(regressionBaseline)}\n`;
        report += `Regression: ${regression > 0 ? '+' : ''}${this.formatBytes(regression)} (${regressionPercentage.toFixed(1)}%)\n`;
      }
    }
    
    return report;
  }

  /**
   * Get current test name from memory tracker
   */
  private getCurrentTestName(): string | undefined {
    // Try to get from memory tracker context
    if (this.memoryTracker) {
      // Access private property through type assertion
      const tracker = this.memoryTracker as any;
      return tracker.currentTestName;
    }
    return undefined;
  }

  /**
   * Calculate memory efficiency score for a test snapshot
   */
  private calculateEfficiencyScore(snapshot: TestMemorySnapshot): number {
    if (!snapshot.endMemory || !snapshot.memoryGrowth) {
      return 100; // No growth data available
    }

    let score = 100;
    
    // Penalize memory growth
    const growthMB = snapshot.memoryGrowth / (1024 * 1024);
    if (growthMB > 10) score -= Math.min((growthMB - 10) * 2, 40);
    
    // Penalize high absolute usage
    const usageMB = snapshot.endMemory.heapUsed / (1024 * 1024);
    if (usageMB > 100) score -= Math.min((usageMB - 100) * 0.5, 30);
    
    // Penalize long duration with high memory
    if (snapshot.duration && snapshot.duration > 1000) {
      const durationPenalty = Math.min((snapshot.duration - 1000) / 1000 * 5, 20);
      score -= durationPenalty;
    }
    
    return Math.max(score, 0);
  }

  /**
   * Generate detailed memory information
   */
  private generateMemoryDetails(
    usage: TestWorkerMemoryUsage,
    memoryGrowth?: number,
    efficiencyScore?: number,
    includeDetails = true
  ): string {
    if (!includeDetails) {
      return `${usage.formattedHeapUsed} (${usage.usagePercentage.toFixed(1)}%)`;
    }

    let details = `Current: ${usage.formattedHeapUsed}, RSS: ${this.formatBytes(usage.rss)}, Usage: ${usage.usagePercentage.toFixed(1)}%`;
    
    if (memoryGrowth !== undefined) {
      details += `, Growth: ${memoryGrowth > 0 ? '+' : ''}${this.formatBytes(memoryGrowth)}`;
    }
    
    if (efficiencyScore !== undefined) {
      details += `, Efficiency: ${efficiencyScore.toFixed(1)}/100`;
    }
    
    return details;
  }

  /**
   * Generate regression check details
   */
  private generateRegressionDetails(
    testName: string,
    baseline: number,
    current: number,
    allowedVariance: number,
    growthPercentage: number,
    includeDetails = true
  ): string {
    if (!includeDetails) {
      return `${this.formatBytes(current)} vs ${this.formatBytes(baseline)} baseline`;
    }

    return `Test: ${testName}, Current: ${this.formatBytes(current)}, Baseline: ${this.formatBytes(baseline)}, Variance: ±${this.formatBytes(allowedVariance)}, Growth: ${growthPercentage.toFixed(1)}%`;
  }

  /**
   * Get memory status string
   */
  private getMemoryStatus(usage: TestWorkerMemoryUsage): string {
    if (usage.isOverLimit) return '🚨 OVER LIMIT';
    if (usage.isCritical) return '🚨 CRITICAL';
    if (usage.isWarning) return '⚠️  WARNING';
    return '✅ NORMAL';
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

/**
 * Global memory assertions instance
 */
let globalMemoryAssertions: MemoryUsageAssertions | null = null;

/**
 * Initialize memory usage assertions
 */
export function initializeMemoryAssertions(
  memoryMonitor: TestWorkerMemoryMonitor,
  memoryTracker?: TestMemoryTracker
): MemoryUsageAssertions {
  globalMemoryAssertions = new MemoryUsageAssertions(memoryMonitor, memoryTracker);
  return globalMemoryAssertions;
}

/**
 * Get global memory assertions instance
 */
export function getMemoryAssertions(): MemoryUsageAssertions | null {
  return globalMemoryAssertions;
}

/**
 * Cleanup memory assertions
 */
export function cleanupMemoryAssertions(): void {
  if (globalMemoryAssertions) {
    globalMemoryAssertions.clearAllBaselines();
    globalMemoryAssertions = null;
  }
}

// Utility functions for common assertions

/**
 * Assert memory is within thresholds (utility function)
 */
export function assertMemoryWithinThresholds(
  thresholds: MemoryThreshold,
  options?: MemoryAssertionOptions
): MemoryAssertionResult {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    throw new Error('Memory assertions not initialized. Call initializeMemoryAssertions() first.');
  }
  return assertions.assertMemoryWithinThresholds(thresholds, options);
}

/**
 * Assert no memory regression (utility function)
 */
export function assertNoMemoryRegression(
  check: MemoryRegressionCheck,
  options?: MemoryAssertionOptions
): MemoryAssertionResult {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    throw new Error('Memory assertions not initialized. Call initializeMemoryAssertions() first.');
  }
  return assertions.assertNoMemoryRegression(check, options);
}

/**
 * Assert memory growth during operation (utility function)
 */
export async function assertMemoryGrowthDuringOperation<T>(
  operation: () => Promise<T> | T,
  maxGrowthBytes: number,
  options?: MemoryAssertionOptions
): Promise<{ result: T; assertion: MemoryAssertionResult }> {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    throw new Error('Memory assertions not initialized. Call initializeMemoryAssertions() first.');
  }
  return assertions.assertMemoryGrowthDuringOperation(operation, maxGrowthBytes, options);
}

/**
 * Set memory baseline (utility function)
 */
export function setMemoryBaseline(testName?: string): void {
  const assertions = getMemoryAssertions();
  if (assertions) {
    assertions.setMemoryBaseline(testName);
  }
}

/**
 * Generate memory report (utility function)
 */
export function generateMemoryReport(): string {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    return 'Memory assertions not initialized';
  }
  return assertions.generateMemoryReport();
}