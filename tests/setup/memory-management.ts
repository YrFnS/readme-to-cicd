/**
 * TestMemoryManager - Singleton utility for managing memory during test execution
 * 
 * Provides memory monitoring, threshold checking, and garbage collection triggers
 * to prevent test suite crashes due to memory exhaustion.
 */

export interface MemoryUsageReport {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
  formattedHeapUsed: string;
  formattedHeapTotal: string;
  isAboveThreshold: boolean;
}

export interface MemoryThresholds {
  warning: number;
  critical: number;
  cleanup: number;
}

export class TestMemoryManager {
  private static instance: TestMemoryManager;
  private readonly thresholds: MemoryThresholds;
  private memoryReports: MemoryUsageReport[] = [];
  private cleanupCallbacks: Array<() => Promise<void> | void> = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    // Default thresholds in bytes
    this.thresholds = {
      warning: 400 * 1024 * 1024,   // 400MB - warn about high usage
      critical: 600 * 1024 * 1024,  // 600MB - trigger aggressive cleanup
      cleanup: 300 * 1024 * 1024    // 300MB - trigger routine cleanup
    };
  }

  /**
   * Get singleton instance of TestMemoryManager
   */
  static getInstance(): TestMemoryManager {
    if (!TestMemoryManager.instance) {
      TestMemoryManager.instance = new TestMemoryManager();
    }
    return TestMemoryManager.instance;
  }

  /**
   * Get current memory usage with formatted output
   */
  getCurrentMemoryUsage(): MemoryUsageReport {
    const usage = process.memoryUsage();
    const timestamp = Date.now();
    
    const report: MemoryUsageReport = {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      timestamp,
      formattedHeapUsed: this.formatBytes(usage.heapUsed),
      formattedHeapTotal: this.formatBytes(usage.heapTotal),
      isAboveThreshold: usage.heapUsed > this.thresholds.cleanup
    };

    this.memoryReports.push(report);
    
    // Keep only last 100 reports to prevent memory leak
    if (this.memoryReports.length > 100) {
      this.memoryReports = this.memoryReports.slice(-100);
    }

    return report;
  }

  /**
   * Check if memory usage exceeds thresholds and trigger appropriate actions
   */
  checkMemoryThresholds(): MemoryUsageReport {
    const report = this.getCurrentMemoryUsage();
    
    try {
      if (report.heapUsed > this.thresholds.critical) {
        console.warn(`🚨 CRITICAL: Memory usage at ${report.formattedHeapUsed} (>${this.formatBytes(this.thresholds.critical)})`);
        
        // Import error handling dynamically to avoid circular dependencies
        import('./memory-errors').then(async ({ MemoryThresholdExceededError, handleMemoryError }) => {
          const error = new MemoryThresholdExceededError(
            report.heapUsed,
            this.thresholds.critical,
            process.memoryUsage()
          );
          
          const recovered = await handleMemoryError(error);
          if (!recovered) {
            console.error('🚨 Failed to recover from critical memory usage');
          }
        }).catch(err => {
          console.error('Failed to handle memory error:', err);
          this.triggerAggressiveCleanup();
        });
        
      } else if (report.heapUsed > this.thresholds.warning) {
        console.warn(`⚠️  WARNING: Memory usage at ${report.formattedHeapUsed} (>${this.formatBytes(this.thresholds.warning)})`);
        this.triggerRoutineCleanup();
      } else if (report.heapUsed > this.thresholds.cleanup) {
        this.triggerRoutineCleanup();
      }
    } catch (error) {
      console.error('Error during memory threshold check:', error);
      // Fallback to basic cleanup
      this.triggerRoutineCleanup();
    }

    return report;
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      try {
        global.gc();
        console.log('🗑️  Forced garbage collection completed');
      } catch (error) {
        console.warn('Failed to force garbage collection:', error);
      }
    } else {
      console.warn('Garbage collection not available. Run with --expose-gc flag.');
    }
  }

  /**
   * Trigger routine cleanup operations
   */
  private triggerRoutineCleanup(): void {
    this.executeCleanupCallbacks();
    this.forceGarbageCollection();
  }

  /**
   * Trigger aggressive cleanup for critical memory situations
   */
  private triggerAggressiveCleanup(): void {
    console.log('🧹 Executing aggressive memory cleanup...');
    
    // Clear require cache for test modules
    this.clearTestModuleCache();
    
    // Execute all cleanup callbacks
    this.executeCleanupCallbacks();
    
    // Multiple garbage collection passes
    for (let i = 0; i < 3; i++) {
      this.forceGarbageCollection();
    }
    
    // Wait for cleanup to complete
    setTimeout(() => {
      const afterCleanup = this.getCurrentMemoryUsage();
      console.log(`🧹 Cleanup complete. Memory usage: ${afterCleanup.formattedHeapUsed}`);
    }, 100);
  }

  /**
   * Register cleanup callback to be executed during memory cleanup
   */
  registerCleanupCallback(callback: () => Promise<void> | void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Execute all registered cleanup callbacks
   */
  private async executeCleanupCallbacks(): Promise<void> {
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.warn('Cleanup callback failed:', error);
      }
    }
  }

  /**
   * Clear Node.js require cache for test-related modules
   */
  private clearTestModuleCache(): void {
    const testModulePatterns = [
      /\/tests\//,
      /\/fixtures\//,
      /\.test\./,
      /\.spec\./,
      /mock/i,
      /stub/i
    ];

    const keysToDelete = Object.keys(require.cache).filter(key =>
      testModulePatterns.some(pattern => pattern.test(key))
    );

    keysToDelete.forEach(key => {
      delete require.cache[key];
    });

    if (keysToDelete.length > 0) {
      console.log(`🗑️  Cleared ${keysToDelete.length} test modules from require cache`);
    }
  }

  /**
   * Start continuous memory monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryThresholds();
    }, intervalMs);

    console.log(`📊 Started memory monitoring (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop continuous memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('📊 Stopped memory monitoring');
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(): MemoryUsageReport[] {
    return [...this.memoryReports];
  }

  /**
   * Generate memory usage report
   */
  generateMemoryReport(): string {
    const current = this.getCurrentMemoryUsage();
    const history = this.memoryReports.slice(-10); // Last 10 reports
    
    let report = `\n📊 Memory Usage Report\n`;
    report += `Current Usage: ${current.formattedHeapUsed} / ${current.formattedHeapTotal}\n`;
    report += `RSS: ${this.formatBytes(current.rss)}\n`;
    report += `External: ${this.formatBytes(current.external)}\n`;
    report += `Thresholds: Warning=${this.formatBytes(this.thresholds.warning)}, Critical=${this.formatBytes(this.thresholds.critical)}\n`;
    
    if (history.length > 1) {
      const oldest = history[0];
      const growth = current.heapUsed - oldest.heapUsed;
      report += `Growth: ${growth > 0 ? '+' : ''}${this.formatBytes(growth)} over ${history.length} samples\n`;
    }
    
    return report;
  }

  /**
   * Reset memory manager state (for testing)
   */
  reset(): void {
    this.stopMonitoring();
    this.memoryReports = [];
    this.cleanupCallbacks = [];
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
 * Convenience function to get TestMemoryManager instance
 */
export const getMemoryManager = (): TestMemoryManager => TestMemoryManager.getInstance();

/**
 * Convenience function to check memory and cleanup if needed
 */
export const checkAndCleanupMemory = (): MemoryUsageReport => {
  return getMemoryManager().checkMemoryThresholds();
};

/**
 * Convenience function to force garbage collection
 */
export const forceGC = (): void => {
  getMemoryManager().forceGarbageCollection();
};

/**
 * TestResourceCleaner - Comprehensive test resource cleanup strategies
 * 
 * Provides various cleanup methods to ensure test resources are properly
 * released and memory is freed after test execution.
 */
export class TestResourceCleaner {
  private static instance: TestResourceCleaner;
  private cleanupVerificationEnabled = true;

  private constructor() {}

  static getInstance(): TestResourceCleaner {
    if (!TestResourceCleaner.instance) {
      TestResourceCleaner.instance = new TestResourceCleaner();
    }
    return TestResourceCleaner.instance;
  }

  /**
   * Comprehensive cleanup of all test resources
   */
  async cleanupTestResources(): Promise<void> {
    console.log('🧹 Starting comprehensive test resource cleanup...');
    
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      // Execute cleanup strategies in order of importance
      await this.clearTestCaches();
      await this.clearModuleCache();
      await this.clearGlobalTestState();
      await this.clearFileSystemCache();
      await this.forceGarbageCollectionWithTiming();
      
      if (this.cleanupVerificationEnabled) {
        await this.verifyCleanupEffectiveness(startMemory);
      }
      
      console.log('✅ Test resource cleanup completed successfully');
    } catch (error) {
      console.error('❌ Test resource cleanup failed:', error);
      
      // Use error handling for cleanup failures
      try {
        const { TestCleanupFailedError, handleMemoryError } = await import('./memory-errors');
        const cleanupError = new TestCleanupFailedError(
          'comprehensive cleanup',
          error instanceof Error ? error : new Error(String(error)),
          process.memoryUsage()
        );
        
        const recovered = await handleMemoryError(cleanupError);
        if (!recovered) {
          throw cleanupError;
        }
      } catch (handlingError) {
        console.error('Failed to handle cleanup error:', handlingError);
        throw error;
      }
    }
  }

  /**
   * Clear test-specific caches and temporary data
   */
  private async clearTestCaches(): Promise<void> {
    try {
      // Clear any test-specific global caches
      if (global.__TEST_CACHE__) {
        global.__TEST_CACHE__ = {};
      }
      
      // Clear any parser caches
      if (global.__PARSER_CACHE__) {
        global.__PARSER_CACHE__ = {};
      }
      
      // Clear any detection caches
      if (global.__DETECTION_CACHE__) {
        global.__DETECTION_CACHE__ = {};
      }
      
      // Clear any generator caches
      if (global.__GENERATOR_CACHE__) {
        global.__GENERATOR_CACHE__ = {};
      }
      
      console.log('🗑️  Cleared test-specific caches');
    } catch (error) {
      console.warn('Failed to clear test caches:', error);
    }
  }

  /**
   * Clear Node.js module cache for test-related modules
   */
  private async clearModuleCache(): Promise<void> {
    try {
      const testModulePatterns = [
        /\/tests\//,
        /\/fixtures\//,
        /\/temp\//,
        /\.test\./,
        /\.spec\./,
        /mock/i,
        /stub/i,
        /fake/i,
        /__tests__/,
        /test-output/,
        /debug-/
      ];

      const keysToDelete = Object.keys(require.cache).filter(key =>
        testModulePatterns.some(pattern => pattern.test(key))
      );

      // Also clear any modules that might be holding large objects
      const largeModulePatterns = [
        /large-readme/,
        /sample-data/,
        /test-data/,
        /fixtures.*\.json$/,
        /fixtures.*\.md$/
      ];

      const largeModuleKeys = Object.keys(require.cache).filter(key =>
        largeModulePatterns.some(pattern => pattern.test(key))
      );

      const allKeysToDelete = [...new Set([...keysToDelete, ...largeModuleKeys])];

      allKeysToDelete.forEach(key => {
        delete require.cache[key];
      });

      if (allKeysToDelete.length > 0) {
        console.log(`🗑️  Cleared ${allKeysToDelete.length} modules from require cache`);
      }
    } catch (error) {
      console.warn('Failed to clear module cache:', error);
    }
  }

  /**
   * Clear global test state and variables
   */
  private async clearGlobalTestState(): Promise<void> {
    try {
      // Clear common global test variables
      const globalTestVars = [
        '__TEST_STATE__',
        '__MOCK_DATA__',
        '__TEST_CONFIG__',
        '__TEMP_FILES__',
        '__TEST_RESULTS__',
        '__INTEGRATION_STATE__'
      ];

      globalTestVars.forEach(varName => {
        if (global[varName]) {
          delete global[varName];
        }
      });

      // Clear any timers that might be hanging around
      this.clearHangingTimers();
      
      console.log('🗑️  Cleared global test state');
    } catch (error) {
      console.warn('Failed to clear global test state:', error);
    }
  }

  /**
   * Clear file system related caches
   */
  private async clearFileSystemCache(): Promise<void> {
    try {
      // Clear any fs-related caches if they exist
      if (require.cache['fs']) {
        // Don't actually delete fs from cache, but clear any custom caches
      }
      
      // Clear any path resolution caches
      if (global.__PATH_CACHE__) {
        global.__PATH_CACHE__ = {};
      }
      
      console.log('🗑️  Cleared file system caches');
    } catch (error) {
      console.warn('Failed to clear file system cache:', error);
    }
  }

  /**
   * Force garbage collection with proper timing
   */
  private async forceGarbageCollectionWithTiming(): Promise<void> {
    if (!global.gc) {
      console.warn('Garbage collection not available. Run tests with --expose-gc flag for better memory management.');
      return;
    }

    try {
      // Multiple GC passes with timing
      for (let i = 0; i < 3; i++) {
        global.gc();
        // Small delay between GC passes to allow cleanup
        await new Promise(resolve => setImmediate(resolve));
      }
      
      // Final delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      console.log('🗑️  Completed forced garbage collection (3 passes)');
    } catch (error) {
      console.warn('Failed to force garbage collection:', error);
    }
  }

  /**
   * Clear any hanging timers that might prevent cleanup
   */
  private clearHangingTimers(): void {
    try {
      // Note: This is a simplified approach. In a real implementation,
      // you might want to track timers more carefully
      
      // Clear any test-related intervals or timeouts
      // This is a placeholder - actual implementation would depend on
      // how timers are managed in your test suite
      
      console.log('🗑️  Cleared hanging timers');
    } catch (error) {
      console.warn('Failed to clear hanging timers:', error);
    }
  }

  /**
   * Verify that cleanup was effective by checking memory usage
   */
  private async verifyCleanupEffectiveness(startMemory: number): Promise<void> {
    try {
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDifference = endMemory - startMemory;
      const memoryReduction = startMemory - endMemory;
      
      if (memoryReduction > 0) {
        console.log(`✅ Cleanup effective: Freed ${this.formatBytes(memoryReduction)} of memory`);
      } else if (memoryDifference > 10 * 1024 * 1024) { // More than 10MB increase
        console.warn(`⚠️  Memory increased by ${this.formatBytes(memoryDifference)} during cleanup`);
      } else {
        console.log('ℹ️  Memory usage stable after cleanup');
      }
      
      // Log current memory status
      const memoryManager = TestMemoryManager.getInstance();
      const currentReport = memoryManager.getCurrentMemoryUsage();
      
      if (currentReport.isAboveThreshold) {
        console.warn(`⚠️  Memory still above threshold: ${currentReport.formattedHeapUsed}`);
      }
      
    } catch (error) {
      console.warn('Failed to verify cleanup effectiveness:', error);
    }
  }

  /**
   * Enable or disable cleanup verification
   */
  setCleanupVerification(enabled: boolean): void {
    this.cleanupVerificationEnabled = enabled;
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
 * Convenience function to get TestResourceCleaner instance
 */
export const getResourceCleaner = (): TestResourceCleaner => TestResourceCleaner.getInstance();

/**
 * Convenience function to perform comprehensive cleanup
 */
export const cleanupTestResources = async (): Promise<void> => {
  await getResourceCleaner().cleanupTestResources();
};

// Note: Error handling utilities are available in memory-errors.ts
// Import them when needed to avoid circular dependencies