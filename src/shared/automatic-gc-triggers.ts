/**
 * Automatic Garbage Collection Triggers
 * 
 * Provides automatic garbage collection triggers between test suites and at
 * appropriate test boundaries to prevent memory exhaustion and improve test
 * suite stability.
 */

export interface GCTriggerConfig {
  /** Enable automatic GC triggers */
  enabled: boolean;
  /** Trigger GC after every N tests */
  triggerAfterTests: number;
  /** Trigger GC when memory usage exceeds threshold (in MB) */
  memoryThresholdMB: number;
  /** Trigger GC between test suites */
  triggerBetweenSuites: boolean;
  /** Number of GC passes to perform */
  gcPasses: number;
  /** Delay between GC passes (in ms) */
  gcPassDelay: number;
  /** Enable detailed logging */
  enableLogging: boolean;
  /** Force GC even if not available (for testing) */
  forceGCForTesting: boolean;
}

export interface GCTriggerStats {
  /** Total number of GC triggers */
  totalTriggers: number;
  /** GC triggers by reason */
  triggersByReason: Record<string, number>;
  /** Memory freed by GC (estimated) */
  memoryFreedBytes: number;
  /** Average memory freed per trigger */
  averageMemoryFreed: number;
  /** Last trigger timestamp */
  lastTriggerTime: number;
  /** GC effectiveness score (0-100) */
  effectivenessScore: number;
}

export interface GCTriggerResult {
  /** Whether GC was actually triggered */
  triggered: boolean;
  /** Reason for triggering (or not triggering) */
  reason: string;
  /** Memory usage before GC */
  memoryBefore: number;
  /** Memory usage after GC */
  memoryAfter: number;
  /** Memory freed (estimated) */
  memoryFreed: number;
  /** Time taken for GC (in ms) */
  gcTime: number;
  /** Number of GC passes performed */
  gcPasses: number;
}

/**
 * Automatic Garbage Collection Trigger Manager
 * 
 * Manages automatic garbage collection triggers based on various conditions
 * such as test count, memory usage, and test suite boundaries.
 */
export class AutomaticGCTriggers {
  private static instance: AutomaticGCTriggers;
  private config: GCTriggerConfig;
  private stats: GCTriggerStats;
  private testCount = 0;
  private currentSuite?: string;
  private suiteTestCounts = new Map<string, number>();
  private lastMemoryCheck = 0;
  private gcHistory: GCTriggerResult[] = [];

  private constructor(config?: Partial<GCTriggerConfig>) {
    this.config = {
      enabled: true,
      triggerAfterTests: 10,
      memoryThresholdMB: 300,
      triggerBetweenSuites: true,
      gcPasses: 2,
      gcPassDelay: 10,
      enableLogging: process.env.GC_DEBUG === 'true',
      forceGCForTesting: false,
      ...config
    };

    this.stats = {
      totalTriggers: 0,
      triggersByReason: {},
      memoryFreedBytes: 0,
      averageMemoryFreed: 0,
      lastTriggerTime: 0,
      effectivenessScore: 0
    };

    this.log('🗑️  Automatic GC triggers initialized', this.config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<GCTriggerConfig>): AutomaticGCTriggers {
    if (!AutomaticGCTriggers.instance) {
      AutomaticGCTriggers.instance = new AutomaticGCTriggers(config);
    }
    return AutomaticGCTriggers.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    AutomaticGCTriggers.instance = null as any;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GCTriggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('🔧 GC trigger configuration updated', this.config);
  }

  /**
   * Register test start - called before each test
   */
  onTestStart(testName: string, suiteName?: string): void {
    this.testCount++;
    
    if (suiteName && suiteName !== this.currentSuite) {
      // Suite changed - trigger GC between suites
      if (this.currentSuite && this.config.triggerBetweenSuites) {
        this.triggerGC('suite_boundary', `Between suites: ${this.currentSuite} → ${suiteName}`);
      }
      this.currentSuite = suiteName;
      this.suiteTestCounts.set(suiteName, 0);
    }

    if (suiteName) {
      const suiteTestCount = this.suiteTestCounts.get(suiteName) || 0;
      this.suiteTestCounts.set(suiteName, suiteTestCount + 1);
    }

    // Check if we should trigger GC based on test count
    if (this.config.triggerAfterTests > 0 && this.testCount % this.config.triggerAfterTests === 0) {
      this.triggerGC('test_count', `After ${this.testCount} tests`);
    }

    // Check memory usage periodically (not every test to avoid overhead)
    if (this.testCount % 5 === 0) {
      this.checkMemoryThreshold();
    }
  }

  /**
   * Register test end - called after each test
   */
  onTestEnd(testName: string, status: 'passed' | 'failed' | 'skipped'): void {
    // For failed tests, consider triggering GC to clean up any leaked resources
    if (status === 'failed' && this.config.enabled) {
      const memoryUsage = process.memoryUsage().heapUsed;
      const thresholdBytes = this.config.memoryThresholdMB * 1024 * 1024;
      
      if (memoryUsage > thresholdBytes * 0.8) { // 80% of threshold
        this.triggerGC('test_failure', `After failed test: ${testName}`);
      }
    }
  }

  /**
   * Register suite start - called before each test suite
   */
  onSuiteStart(suiteName: string): void {
    this.log(`📊 Starting suite: ${suiteName}`);
    
    // If we have a previous suite and GC between suites is enabled
    if (this.currentSuite && this.config.triggerBetweenSuites) {
      this.triggerGC('suite_start', `Before starting suite: ${suiteName}`);
    }
    
    this.currentSuite = suiteName;
    this.suiteTestCounts.set(suiteName, 0);
  }

  /**
   * Register suite end - called after each test suite
   */
  onSuiteEnd(suiteName: string): void {
    const testCount = this.suiteTestCounts.get(suiteName) || 0;
    this.log(`📊 Completed suite: ${suiteName} (${testCount} tests)`);
    
    // Always trigger GC after suite completion if enabled
    if (this.config.triggerBetweenSuites) {
      this.triggerGC('suite_end', `After completing suite: ${suiteName}`);
    }
  }

  /**
   * Force garbage collection trigger
   */
  forceGC(reason: string = 'manual'): GCTriggerResult {
    return this.triggerGC(reason, 'Manually triggered');
  }

  /**
   * Check memory threshold and trigger GC if needed
   */
  private checkMemoryThreshold(): void {
    const memoryUsage = process.memoryUsage().heapUsed;
    const thresholdBytes = this.config.memoryThresholdMB * 1024 * 1024;
    
    if (memoryUsage > thresholdBytes) {
      const memoryMB = Math.round(memoryUsage / 1024 / 1024);
      this.triggerGC('memory_threshold', `Memory usage: ${memoryMB}MB > ${this.config.memoryThresholdMB}MB`);
    }
    
    this.lastMemoryCheck = Date.now();
  }

  /**
   * Trigger garbage collection with timing and effectiveness measurement
   */
  private triggerGC(reason: string, description: string): GCTriggerResult {
    if (!this.config.enabled) {
      return {
        triggered: false,
        reason: 'disabled',
        memoryBefore: 0,
        memoryAfter: 0,
        memoryFreed: 0,
        gcTime: 0,
        gcPasses: 0
      };
    }

    const startTime = Date.now();
    const memoryBefore = process.memoryUsage().heapUsed;
    
    let triggered = false;
    let gcPasses = 0;

    try {
      // Check if GC is available
      if (global.gc || this.config.forceGCForTesting) {
        this.log(`🗑️  Triggering GC: ${reason} - ${description}`);
        
        // Perform multiple GC passes for better effectiveness
        for (let i = 0; i < this.config.gcPasses; i++) {
          if (global.gc) {
            global.gc();
            gcPasses++;
          } else if (this.config.forceGCForTesting) {
            // For testing purposes, simulate GC
            gcPasses++;
          }
          
          // Small delay between passes
          if (i < this.config.gcPasses - 1 && this.config.gcPassDelay > 0) {
            // Use synchronous delay for simplicity in GC context
            const start = Date.now();
            while (Date.now() - start < this.config.gcPassDelay) {
              // Busy wait for short delay
            }
          }
        }
        
        triggered = true;
        
      } else {
        this.log(`⚠️  GC not available for trigger: ${reason} - ${description}`);
      }
      
    } catch (error) {
      this.log(`❌ GC trigger failed: ${error}`);
    }

    const endTime = Date.now();
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryFreed = Math.max(0, memoryBefore - memoryAfter);
    const gcTime = endTime - startTime;

    const result: GCTriggerResult = {
      triggered,
      reason,
      memoryBefore,
      memoryAfter,
      memoryFreed,
      gcTime,
      gcPasses
    };

    // Update statistics
    this.updateStats(reason, result);
    
    // Store in history (keep last 50 entries)
    this.gcHistory.push(result);
    if (this.gcHistory.length > 50) {
      this.gcHistory = this.gcHistory.slice(-50);
    }

    if (triggered && memoryFreed > 0) {
      this.log(`✅ GC completed: Freed ${this.formatBytes(memoryFreed)} in ${gcTime}ms (${gcPasses} passes)`);
    }

    return result;
  }

  /**
   * Update statistics after GC trigger
   */
  private updateStats(reason: string, result: GCTriggerResult): void {
    if (result.triggered) {
      this.stats.totalTriggers++;
      this.stats.triggersByReason[reason] = (this.stats.triggersByReason[reason] || 0) + 1;
      this.stats.memoryFreedBytes += result.memoryFreed;
      this.stats.lastTriggerTime = Date.now();
      
      // Calculate average memory freed
      this.stats.averageMemoryFreed = this.stats.memoryFreedBytes / this.stats.totalTriggers;
      
      // Calculate effectiveness score based on memory freed and frequency
      this.calculateEffectivenessScore();
    }
  }

  /**
   * Calculate GC effectiveness score (0-100)
   */
  private calculateEffectivenessScore(): void {
    if (this.stats.totalTriggers === 0) {
      this.stats.effectivenessScore = 0;
      return;
    }

    // Base score on average memory freed
    const avgFreedMB = this.stats.averageMemoryFreed / (1024 * 1024);
    let score = Math.min(avgFreedMB * 10, 50); // Up to 50 points for memory freed
    
    // Add points for consistent triggering
    const recentTriggers = this.gcHistory.slice(-10);
    const successfulTriggers = recentTriggers.filter(r => r.triggered && r.memoryFreed > 0);
    const successRate = successfulTriggers.length / Math.max(recentTriggers.length, 1);
    score += successRate * 30; // Up to 30 points for success rate
    
    // Add points for reasonable frequency (not too often, not too rare)
    const triggerRate = this.stats.totalTriggers / Math.max(this.testCount, 1);
    if (triggerRate > 0.05 && triggerRate < 0.3) { // 5-30% of tests
      score += 20; // 20 points for good frequency
    }
    
    this.stats.effectivenessScore = Math.min(Math.round(score), 100);
  }

  /**
   * Get current statistics
   */
  getStats(): GCTriggerStats {
    return { ...this.stats };
  }

  /**
   * Get GC trigger history
   */
  getHistory(): GCTriggerResult[] {
    return [...this.gcHistory];
  }

  /**
   * Generate comprehensive report
   */
  generateReport(): string {
    const stats = this.getStats();
    const recentHistory = this.gcHistory.slice(-10);
    
    let report = '\n🗑️  Automatic GC Triggers Report\n';
    report += '='.repeat(40) + '\n\n';
    
    // Configuration
    report += '⚙️  Configuration:\n';
    report += `  Enabled: ${this.config.enabled}\n`;
    report += `  Trigger after tests: ${this.config.triggerAfterTests}\n`;
    report += `  Memory threshold: ${this.config.memoryThresholdMB}MB\n`;
    report += `  Between suites: ${this.config.triggerBetweenSuites}\n`;
    report += `  GC passes: ${this.config.gcPasses}\n`;
    
    // Statistics
    report += '\n📊 Statistics:\n';
    report += `  Total triggers: ${stats.totalTriggers}\n`;
    report += `  Total tests: ${this.testCount}\n`;
    report += `  Trigger rate: ${((stats.totalTriggers / Math.max(this.testCount, 1)) * 100).toFixed(1)}%\n`;
    report += `  Memory freed: ${this.formatBytes(stats.memoryFreedBytes)}\n`;
    report += `  Average freed: ${this.formatBytes(stats.averageMemoryFreed)}\n`;
    report += `  Effectiveness: ${stats.effectivenessScore}/100\n`;
    
    // Triggers by reason
    if (Object.keys(stats.triggersByReason).length > 0) {
      report += '\n🎯 Triggers by reason:\n';
      Object.entries(stats.triggersByReason).forEach(([reason, count]) => {
        const percentage = ((count / stats.totalTriggers) * 100).toFixed(1);
        report += `  ${reason}: ${count} (${percentage}%)\n`;
      });
    }
    
    // Recent history
    if (recentHistory.length > 0) {
      report += '\n📈 Recent triggers:\n';
      recentHistory.slice(-5).forEach((result, index) => {
        const status = result.triggered ? '✅' : '❌';
        const freed = result.memoryFreed > 0 ? ` (${this.formatBytes(result.memoryFreed)})` : '';
        report += `  ${status} ${result.reason}${freed}\n`;
      });
    }
    
    // Recommendations
    report += '\n💡 Recommendations:\n';
    if (stats.effectivenessScore < 50) {
      report += '  - Consider adjusting trigger thresholds\n';
    }
    if (stats.totalTriggers === 0) {
      report += '  - Enable GC triggers or check if --expose-gc flag is set\n';
    }
    if (stats.averageMemoryFreed < 5 * 1024 * 1024) {
      report += '  - GC triggers may not be freeing significant memory\n';
    }
    if (!global.gc) {
      report += '  - Run tests with --expose-gc flag for better memory management\n';
    }
    
    return report;
  }

  /**
   * Reset all statistics and history
   */
  reset(): void {
    this.stats = {
      totalTriggers: 0,
      triggersByReason: {},
      memoryFreedBytes: 0,
      averageMemoryFreed: 0,
      lastTriggerTime: 0,
      effectivenessScore: 0
    };
    this.testCount = 0;
    this.currentSuite = undefined;
    this.suiteTestCounts.clear();
    this.gcHistory = [];
    this.lastMemoryCheck = 0;
    
    this.log('🔄 GC trigger statistics reset');
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
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
 * Global instance management
 */
let globalGCTriggers: AutomaticGCTriggers | null = null;

/**
 * Get or create global GC triggers instance
 */
export function getAutomaticGCTriggers(config?: Partial<GCTriggerConfig>): AutomaticGCTriggers {
  if (!globalGCTriggers) {
    globalGCTriggers = AutomaticGCTriggers.getInstance(config);
  }
  return globalGCTriggers;
}

/**
 * Initialize automatic GC triggers
 */
export function initializeAutomaticGCTriggers(config?: Partial<GCTriggerConfig>): AutomaticGCTriggers {
  globalGCTriggers = AutomaticGCTriggers.getInstance(config);
  return globalGCTriggers;
}

/**
 * Reset global GC triggers instance
 */
export function resetAutomaticGCTriggers(): void {
  if (globalGCTriggers) {
    globalGCTriggers.reset();
  }
  AutomaticGCTriggers.resetInstance();
  globalGCTriggers = null;
}

/**
 * Convenience functions for common operations
 */
export const triggerGCAfterTest = (testName: string, status: 'passed' | 'failed' | 'skipped'): void => {
  const gcTriggers = getAutomaticGCTriggers();
  gcTriggers.onTestEnd(testName, status);
};

export const triggerGCBeforeTest = (testName: string, suiteName?: string): void => {
  const gcTriggers = getAutomaticGCTriggers();
  gcTriggers.onTestStart(testName, suiteName);
};

export const triggerGCBetweenSuites = (suiteName: string): void => {
  const gcTriggers = getAutomaticGCTriggers();
  gcTriggers.onSuiteStart(suiteName);
};

export const forceGarbageCollection = (reason: string = 'manual'): GCTriggerResult => {
  const gcTriggers = getAutomaticGCTriggers();
  return gcTriggers.forceGC(reason);
};

export const getGCTriggerStats = (): GCTriggerStats => {
  const gcTriggers = getAutomaticGCTriggers();
  return gcTriggers.getStats();
};

export const generateGCTriggerReport = (): string => {
  const gcTriggers = getAutomaticGCTriggers();
  return gcTriggers.generateReport();
};