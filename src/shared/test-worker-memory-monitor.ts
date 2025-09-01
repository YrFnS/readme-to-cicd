/**
 * Test Worker Memory Monitor
 * 
 * Provides memory monitoring and limits for test worker processes.
 * Tracks memory usage during test execution and enforces limits to prevent
 * memory exhaustion in test environments.
 */

export interface TestWorkerMemoryConfig {
  /** Maximum memory limit in bytes for test worker */
  maxMemoryBytes: number;
  /** Warning threshold as percentage of max memory (0-1) */
  warningThreshold: number;
  /** Critical threshold as percentage of max memory (0-1) */
  criticalThreshold: number;
  /** Monitoring interval in milliseconds */
  monitoringInterval: number;
  /** Enable automatic cleanup when thresholds are exceeded */
  enableAutoCleanup: boolean;
  /** Enable detailed logging */
  enableDetailedLogging: boolean;
}

export interface TestWorkerMemoryUsage {
  /** Current heap used in bytes */
  heapUsed: number;
  /** Current heap total in bytes */
  heapTotal: number;
  /** Resident Set Size in bytes */
  rss: number;
  /** External memory in bytes */
  external: number;
  /** Timestamp of measurement */
  timestamp: number;
  /** Formatted heap used string */
  formattedHeapUsed: string;
  /** Formatted heap total string */
  formattedHeapTotal: string;
  /** Memory usage as percentage of limit */
  usagePercentage: number;
  /** Whether usage exceeds warning threshold */
  isWarning: boolean;
  /** Whether usage exceeds critical threshold */
  isCritical: boolean;
  /** Whether usage exceeds maximum limit */
  isOverLimit: boolean;
}

export interface TestWorkerMemoryEvent {
  type: 'warning' | 'critical' | 'overlimit' | 'cleanup' | 'normal';
  timestamp: number;
  usage: TestWorkerMemoryUsage;
  message: string;
  workerId?: string;
  testName?: string;
}

export type TestWorkerMemoryEventHandler = (event: TestWorkerMemoryEvent) => void | Promise<void>;

/**
 * Test Worker Memory Monitor
 * 
 * Monitors memory usage in test worker processes and enforces limits
 * to prevent memory exhaustion during test execution.
 */
export class TestWorkerMemoryMonitor {
  private readonly config: TestWorkerMemoryConfig;
  private readonly eventHandlers: TestWorkerMemoryEventHandler[] = [];
  private readonly memoryHistory: TestWorkerMemoryUsage[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private workerId: string;
  private currentTestName?: string;
  private cleanupCallbacks: Array<() => Promise<void> | void> = [];

  constructor(config: Partial<TestWorkerMemoryConfig> = {}) {
    this.config = {
      maxMemoryBytes: 512 * 1024 * 1024, // 512MB default
      warningThreshold: 0.7, // 70%
      criticalThreshold: 0.85, // 85%
      monitoringInterval: 5000, // 5 seconds
      enableAutoCleanup: true,
      enableDetailedLogging: false,
      ...config
    };

    this.workerId = this.generateWorkerId();
    
    if (this.config.enableDetailedLogging) {
      console.log(`🔧 TestWorkerMemoryMonitor initialized for worker ${this.workerId}`);
      console.log(`📊 Memory limit: ${this.formatBytes(this.config.maxMemoryBytes)}`);
      console.log(`⚠️  Warning threshold: ${(this.config.warningThreshold * 100).toFixed(1)}%`);
      console.log(`🚨 Critical threshold: ${(this.config.criticalThreshold * 100).toFixed(1)}%`);
    }
  }

  /**
   * Start memory monitoring for the test worker
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Take initial measurement
    this.measureMemoryUsage();
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.measureMemoryUsage();
    }, this.config.monitoringInterval);

    if (this.config.enableDetailedLogging) {
      console.log(`📊 Started memory monitoring for worker ${this.workerId} (interval: ${this.config.monitoringInterval}ms)`);
    }

    // Set up process event handlers
    this.setupProcessEventHandlers();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    
    if (this.config.enableDetailedLogging) {
      console.log(`📊 Stopped memory monitoring for worker ${this.workerId}`);
    }
  }

  /**
   * Set the current test name for context
   */
  setCurrentTest(testName: string): void {
    this.currentTestName = testName;
    
    if (this.config.enableDetailedLogging) {
      console.log(`🧪 Test worker ${this.workerId} starting test: ${testName}`);
    }
  }

  /**
   * Clear the current test name
   */
  clearCurrentTest(): void {
    if (this.config.enableDetailedLogging && this.currentTestName) {
      console.log(`🧪 Test worker ${this.workerId} finished test: ${this.currentTestName}`);
    }
    
    this.currentTestName = undefined;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): TestWorkerMemoryUsage {
    return this.measureMemoryUsage();
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(): TestWorkerMemoryUsage[] {
    return [...this.memoryHistory];
  }

  /**
   * Register event handler for memory events
   */
  onMemoryEvent(handler: TestWorkerMemoryEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Register cleanup callback to be executed during memory cleanup
   */
  registerCleanupCallback(callback: () => Promise<void> | void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Force memory cleanup
   */
  async forceCleanup(): Promise<void> {
    const beforeCleanup = this.measureMemoryUsage();
    
    if (this.config.enableDetailedLogging) {
      console.log(`🧹 Worker ${this.workerId} forcing memory cleanup (current: ${beforeCleanup.formattedHeapUsed})`);
    }

    // Execute cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.warn(`Cleanup callback failed in worker ${this.workerId}:`, error);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      try {
        global.gc();
        // Multiple passes for thorough cleanup
        await new Promise(resolve => setImmediate(resolve));
        global.gc();
        await new Promise(resolve => setImmediate(resolve));
        global.gc();
      } catch (error) {
        console.warn(`Garbage collection failed in worker ${this.workerId}:`, error);
      }
    }

    const afterCleanup = this.measureMemoryUsage();
    const memoryFreed = beforeCleanup.heapUsed - afterCleanup.heapUsed;
    
    if (this.config.enableDetailedLogging) {
      if (memoryFreed > 0) {
        console.log(`✅ Worker ${this.workerId} cleanup freed ${this.formatBytes(memoryFreed)} (now: ${afterCleanup.formattedHeapUsed})`);
      } else {
        console.log(`ℹ️  Worker ${this.workerId} cleanup completed (now: ${afterCleanup.formattedHeapUsed})`);
      }
    }

    // Emit cleanup event
    await this.emitEvent({
      type: 'cleanup',
      timestamp: Date.now(),
      usage: afterCleanup,
      message: `Memory cleanup completed. Freed: ${this.formatBytes(memoryFreed)}`,
      workerId: this.workerId,
      testName: this.currentTestName
    });
  }

  /**
   * Check if memory usage is within limits
   */
  isMemoryWithinLimits(): boolean {
    const usage = this.measureMemoryUsage();
    return !usage.isOverLimit;
  }

  /**
   * Get memory usage report
   */
  getMemoryReport(): string {
    const current = this.measureMemoryUsage();
    const history = this.memoryHistory.slice(-10);
    
    let report = `\n📊 Test Worker Memory Report (${this.workerId})\n`;
    report += `Current Usage: ${current.formattedHeapUsed} / ${this.formatBytes(this.config.maxMemoryBytes)} (${current.usagePercentage.toFixed(1)}%)\n`;
    report += `RSS: ${this.formatBytes(current.rss)}\n`;
    report += `External: ${this.formatBytes(current.external)}\n`;
    report += `Status: ${this.getMemoryStatus(current)}\n`;
    
    if (this.currentTestName) {
      report += `Current Test: ${this.currentTestName}\n`;
    }
    
    if (history.length > 1) {
      const oldest = history[0];
      const growth = current.heapUsed - oldest.heapUsed;
      report += `Growth: ${growth > 0 ? '+' : ''}${this.formatBytes(growth)} over ${history.length} samples\n`;
      
      const maxUsage = Math.max(...history.map(h => h.heapUsed));
      const avgUsage = history.reduce((sum, h) => sum + h.heapUsed, 0) / history.length;
      report += `Peak: ${this.formatBytes(maxUsage)}\n`;
      report += `Average: ${this.formatBytes(avgUsage)}\n`;
    }
    
    return report;
  }

  /**
   * Measure current memory usage and update history
   */
  private measureMemoryUsage(): TestWorkerMemoryUsage {
    const memoryUsage = process.memoryUsage();
    const timestamp = Date.now();
    
    const usage: TestWorkerMemoryUsage = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      timestamp,
      formattedHeapUsed: this.formatBytes(memoryUsage.heapUsed),
      formattedHeapTotal: this.formatBytes(memoryUsage.heapTotal),
      usagePercentage: (memoryUsage.heapUsed / this.config.maxMemoryBytes) * 100,
      isWarning: memoryUsage.heapUsed > (this.config.maxMemoryBytes * this.config.warningThreshold),
      isCritical: memoryUsage.heapUsed > (this.config.maxMemoryBytes * this.config.criticalThreshold),
      isOverLimit: memoryUsage.heapUsed > this.config.maxMemoryBytes
    };

    // Add to history
    this.memoryHistory.push(usage);
    
    // Keep only last 100 measurements to prevent memory leak
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.splice(0, this.memoryHistory.length - 100);
    }

    // Check thresholds and emit events
    this.checkThresholds(usage);

    return usage;
  }

  /**
   * Check memory thresholds and trigger appropriate actions
   */
  private async checkThresholds(usage: TestWorkerMemoryUsage): Promise<void> {
    try {
      if (usage.isOverLimit) {
        await this.handleOverLimit(usage);
      } else if (usage.isCritical) {
        await this.handleCritical(usage);
      } else if (usage.isWarning) {
        await this.handleWarning(usage);
      } else {
        await this.handleNormal(usage);
      }
    } catch (error) {
      console.error(`Error checking memory thresholds in worker ${this.workerId}:`, error);
    }
  }

  /**
   * Handle over-limit memory usage
   */
  private async handleOverLimit(usage: TestWorkerMemoryUsage): Promise<void> {
    const message = `Memory usage exceeded limit: ${usage.formattedHeapUsed} > ${this.formatBytes(this.config.maxMemoryBytes)}`;
    
    console.error(`🚨 Worker ${this.workerId}: ${message}`);
    
    await this.emitEvent({
      type: 'overlimit',
      timestamp: usage.timestamp,
      usage,
      message,
      workerId: this.workerId,
      testName: this.currentTestName
    });

    if (this.config.enableAutoCleanup) {
      await this.forceCleanup();
    }
  }

  /**
   * Handle critical memory usage
   */
  private async handleCritical(usage: TestWorkerMemoryUsage): Promise<void> {
    const message = `Critical memory usage: ${usage.formattedHeapUsed} (${usage.usagePercentage.toFixed(1)}%)`;
    
    console.warn(`🚨 Worker ${this.workerId}: ${message}`);
    
    await this.emitEvent({
      type: 'critical',
      timestamp: usage.timestamp,
      usage,
      message,
      workerId: this.workerId,
      testName: this.currentTestName
    });

    if (this.config.enableAutoCleanup) {
      await this.forceCleanup();
    }
  }

  /**
   * Handle warning-level memory usage
   */
  private async handleWarning(usage: TestWorkerMemoryUsage): Promise<void> {
    const message = `High memory usage: ${usage.formattedHeapUsed} (${usage.usagePercentage.toFixed(1)}%)`;
    
    if (this.config.enableDetailedLogging) {
      console.warn(`⚠️  Worker ${this.workerId}: ${message}`);
    }
    
    await this.emitEvent({
      type: 'warning',
      timestamp: usage.timestamp,
      usage,
      message,
      workerId: this.workerId,
      testName: this.currentTestName
    });
  }

  /**
   * Handle normal memory usage
   */
  private async handleNormal(usage: TestWorkerMemoryUsage): Promise<void> {
    if (this.config.enableDetailedLogging) {
      const message = `Normal memory usage: ${usage.formattedHeapUsed} (${usage.usagePercentage.toFixed(1)}%)`;
      
      await this.emitEvent({
        type: 'normal',
        timestamp: usage.timestamp,
        usage,
        message,
        workerId: this.workerId,
        testName: this.currentTestName
      });
    }
  }

  /**
   * Emit memory event to all registered handlers
   */
  private async emitEvent(event: TestWorkerMemoryEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Memory event handler failed in worker ${this.workerId}:`, error);
      }
    }
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
   * Set up process event handlers for memory-related issues
   */
  private setupProcessEventHandlers(): void {
    // Handle uncaught exceptions that might be memory-related
    process.on('uncaughtException', (error) => {
      if (error.message.includes('heap') || error.message.includes('memory')) {
        console.error(`🚨 Worker ${this.workerId} memory-related uncaught exception:`, error.message);
        
        // Attempt emergency cleanup
        this.forceCleanup().catch(cleanupError => {
          console.error(`Emergency cleanup failed in worker ${this.workerId}:`, cleanupError);
        });
      }
    });

    // Handle process warnings
    process.on('warning', (warning) => {
      if (warning.message.includes('memory') || warning.message.includes('heap')) {
        console.warn(`⚠️  Worker ${this.workerId} memory warning:`, warning.message);
      }
    });
  }

  /**
   * Generate unique worker ID
   */
  private generateWorkerId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `worker-${timestamp}-${random}`;
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
 * Global test worker memory monitor instance
 */
let globalTestWorkerMemoryMonitor: TestWorkerMemoryMonitor | null = null;

/**
 * Get or create global test worker memory monitor
 */
export function getTestWorkerMemoryMonitor(config?: Partial<TestWorkerMemoryConfig>): TestWorkerMemoryMonitor {
  if (!globalTestWorkerMemoryMonitor) {
    globalTestWorkerMemoryMonitor = new TestWorkerMemoryMonitor(config);
  }
  return globalTestWorkerMemoryMonitor;
}

/**
 * Initialize test worker memory monitoring
 */
export function initializeTestWorkerMemoryMonitoring(config?: Partial<TestWorkerMemoryConfig>): TestWorkerMemoryMonitor {
  const monitor = getTestWorkerMemoryMonitor(config);
  monitor.startMonitoring();
  return monitor;
}

/**
 * Cleanup test worker memory monitoring
 */
export function cleanupTestWorkerMemoryMonitoring(): void {
  if (globalTestWorkerMemoryMonitor) {
    globalTestWorkerMemoryMonitor.stopMonitoring();
    globalTestWorkerMemoryMonitor = null;
  }
}

/**
 * Utility function to check if test worker memory is within limits
 */
export function isTestWorkerMemoryWithinLimits(): boolean {
  if (!globalTestWorkerMemoryMonitor) {
    return true; // No monitoring, assume OK
  }
  return globalTestWorkerMemoryMonitor.isMemoryWithinLimits();
}

/**
 * Utility function to force test worker memory cleanup
 */
export async function forceTestWorkerMemoryCleanup(): Promise<void> {
  if (globalTestWorkerMemoryMonitor) {
    await globalTestWorkerMemoryMonitor.forceCleanup();
  }
}

/**
 * Utility function to get test worker memory report
 */
export function getTestWorkerMemoryReport(): string {
  if (!globalTestWorkerMemoryMonitor) {
    return 'Test worker memory monitoring not initialized';
  }
  return globalTestWorkerMemoryMonitor.getMemoryReport();
}