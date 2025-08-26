/**
 * Memory Management Error Handling
 * 
 * Custom error classes and recovery strategies for memory-related failures
 * during test execution. Provides graceful degradation and detailed error
 * reporting for memory exhaustion scenarios.
 */

/**
 * Base class for all memory management errors
 */
export abstract class MemoryManagementError extends Error {
  public readonly timestamp: number;
  public readonly memoryUsage: NodeJS.MemoryUsage;
  public readonly errorCode: string;

  constructor(
    message: string,
    errorCode: string,
    memoryUsage?: NodeJS.MemoryUsage
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.timestamp = Date.now();
    this.memoryUsage = memoryUsage || process.memoryUsage();
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Get formatted memory usage information
   */
  getFormattedMemoryUsage(): string {
    return `Heap: ${this.formatBytes(this.memoryUsage.heapUsed)}/${this.formatBytes(this.memoryUsage.heapTotal)}, ` +
           `RSS: ${this.formatBytes(this.memoryUsage.rss)}, ` +
           `External: ${this.formatBytes(this.memoryUsage.external)}`;
  }

  /**
   * Get error details as JSON
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      memoryUsage: this.memoryUsage,
      formattedMemoryUsage: this.getFormattedMemoryUsage()
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

/**
 * Error thrown when memory usage exceeds critical thresholds
 */
export class MemoryThresholdExceededError extends MemoryManagementError {
  public readonly threshold: number;
  public readonly actualUsage: number;

  constructor(
    actualUsage: number,
    threshold: number,
    memoryUsage?: NodeJS.MemoryUsage
  ) {
    const message = `Memory usage exceeded threshold: ${Math.round(actualUsage / 1024 / 1024)}MB > ${Math.round(threshold / 1024 / 1024)}MB`;
    super(message, 'MEMORY_THRESHOLD_EXCEEDED', memoryUsage);
    
    this.threshold = threshold;
    this.actualUsage = actualUsage;
  }
}

/**
 * Error thrown when test memory cleanup fails
 */
export class TestCleanupFailedError extends MemoryManagementError {
  public readonly cleanupOperation: string;
  public readonly originalError?: Error;

  constructor(
    cleanupOperation: string,
    originalError?: Error,
    memoryUsage?: NodeJS.MemoryUsage
  ) {
    const message = `Test cleanup failed during ${cleanupOperation}: ${originalError?.message || 'Unknown error'}`;
    super(message, 'TEST_CLEANUP_FAILED', memoryUsage);
    
    this.cleanupOperation = cleanupOperation;
    this.originalError = originalError;
  }
}

/**
 * Error thrown when garbage collection fails or is unavailable
 */
export class GarbageCollectionError extends MemoryManagementError {
  public readonly gcAvailable: boolean;

  constructor(
    message: string,
    gcAvailable: boolean,
    memoryUsage?: NodeJS.MemoryUsage
  ) {
    super(message, 'GARBAGE_COLLECTION_ERROR', memoryUsage);
    this.gcAvailable = gcAvailable;
  }
}

/**
 * Error thrown when memory monitoring fails
 */
export class MemoryMonitoringError extends MemoryManagementError {
  public readonly monitoringOperation: string;

  constructor(
    monitoringOperation: string,
    originalError?: Error,
    memoryUsage?: NodeJS.MemoryUsage
  ) {
    const message = `Memory monitoring failed during ${monitoringOperation}: ${originalError?.message || 'Unknown error'}`;
    super(message, 'MEMORY_MONITORING_ERROR', memoryUsage);
    
    this.monitoringOperation = monitoringOperation;
  }
}

/**
 * Error thrown when test resource allocation fails due to memory constraints
 */
export class TestResourceAllocationError extends MemoryManagementError {
  public readonly resourceType: string;
  public readonly requestedSize?: number;

  constructor(
    resourceType: string,
    requestedSize?: number,
    memoryUsage?: NodeJS.MemoryUsage
  ) {
    const sizeInfo = requestedSize ? ` (${Math.round(requestedSize / 1024 / 1024)}MB)` : '';
    const message = `Failed to allocate test resource: ${resourceType}${sizeInfo}`;
    super(message, 'TEST_RESOURCE_ALLOCATION_ERROR', memoryUsage);
    
    this.resourceType = resourceType;
    this.requestedSize = requestedSize;
  }
}

/**
 * Memory Recovery Strategies
 * 
 * Provides various strategies for recovering from memory-related errors
 * and implementing graceful degradation when memory limits are approached.
 */
export class MemoryRecoveryStrategies {
  private static instance: MemoryRecoveryStrategies;
  private recoveryAttempts: Map<string, number> = new Map();
  private readonly maxRecoveryAttempts = 3;

  private constructor() {}

  static getInstance(): MemoryRecoveryStrategies {
    if (!MemoryRecoveryStrategies.instance) {
      MemoryRecoveryStrategies.instance = new MemoryRecoveryStrategies();
    }
    return MemoryRecoveryStrategies.instance;
  }

  /**
   * Attempt to recover from memory threshold exceeded error
   */
  async recoverFromThresholdExceeded(
    error: MemoryThresholdExceededError
  ): Promise<boolean> {
    const recoveryKey = `threshold_${error.threshold}`;
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0;

    if (attempts >= this.maxRecoveryAttempts) {
      console.error(`🚨 Max recovery attempts reached for threshold exceeded (${attempts})`);
      return false;
    }

    this.recoveryAttempts.set(recoveryKey, attempts + 1);

    try {
      console.log(`🔄 Attempting memory recovery (attempt ${attempts + 1}/${this.maxRecoveryAttempts})`);
      
      // Strategy 1: Force garbage collection
      await this.forceGarbageCollection();
      
      // Strategy 2: Clear caches
      await this.clearTestCaches();
      
      // Strategy 3: Clear module cache
      await this.clearModuleCache();
      
      // Check if recovery was successful
      const currentUsage = process.memoryUsage().heapUsed;
      if (currentUsage < error.threshold) {
        console.log(`✅ Memory recovery successful: ${Math.round(currentUsage / 1024 / 1024)}MB`);
        this.recoveryAttempts.delete(recoveryKey);
        return true;
      }
      
      console.warn(`⚠️  Memory recovery partially successful: ${Math.round(currentUsage / 1024 / 1024)}MB (still above threshold)`);
      return false;
      
    } catch (recoveryError) {
      console.error(`❌ Memory recovery failed:`, recoveryError);
      return false;
    }
  }

  /**
   * Attempt to recover from test cleanup failure
   */
  async recoverFromCleanupFailure(
    error: TestCleanupFailedError
  ): Promise<boolean> {
    const recoveryKey = `cleanup_${error.cleanupOperation}`;
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0;

    if (attempts >= this.maxRecoveryAttempts) {
      console.error(`🚨 Max recovery attempts reached for cleanup failure (${attempts})`);
      return false;
    }

    this.recoveryAttempts.set(recoveryKey, attempts + 1);

    try {
      console.log(`🔄 Attempting cleanup recovery for ${error.cleanupOperation} (attempt ${attempts + 1})`);
      
      // Strategy: Try alternative cleanup methods
      switch (error.cleanupOperation) {
        case 'clearTestCaches':
          await this.alternativeCacheClear();
          break;
        case 'clearModuleCache':
          await this.alternativeModuleCacheClear();
          break;
        case 'forceGarbageCollection':
          await this.alternativeGarbageCollection();
          break;
        default:
          await this.genericCleanupRecovery();
      }
      
      console.log(`✅ Cleanup recovery completed for ${error.cleanupOperation}`);
      this.recoveryAttempts.delete(recoveryKey);
      return true;
      
    } catch (recoveryError) {
      console.error(`❌ Cleanup recovery failed for ${error.cleanupOperation}:`, recoveryError);
      return false;
    }
  }

  /**
   * Implement graceful degradation when memory limits are approached
   */
  async implementGracefulDegradation(memoryUsage: NodeJS.MemoryUsage): Promise<void> {
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    
    console.log(`🔄 Implementing graceful degradation (memory: ${Math.round(heapUsedMB)}MB)`);
    
    try {
      // Level 1: Reduce test concurrency
      if (heapUsedMB > 400) {
        await this.reduceConcurrency();
      }
      
      // Level 2: Skip non-essential tests
      if (heapUsedMB > 500) {
        await this.skipNonEssentialTests();
      }
      
      // Level 3: Use simplified test data
      if (heapUsedMB > 600) {
        await this.useSimplifiedTestData();
      }
      
      // Level 4: Emergency cleanup
      if (heapUsedMB > 700) {
        await this.emergencyCleanup();
      }
      
    } catch (error) {
      console.error('❌ Graceful degradation failed:', error);
      throw new MemoryManagementError(
        'Graceful degradation failed',
        'GRACEFUL_DEGRADATION_FAILED',
        memoryUsage
      );
    }
  }

  /**
   * Create detailed error report for memory-related failures
   */
  createDetailedErrorReport(error: MemoryManagementError): string {
    let report = `\n🚨 Memory Management Error Report\n`;
    report += `Error: ${error.name}\n`;
    report += `Code: ${error.errorCode}\n`;
    report += `Message: ${error.message}\n`;
    report += `Timestamp: ${new Date(error.timestamp).toISOString()}\n`;
    report += `Memory Usage: ${error.getFormattedMemoryUsage()}\n`;
    
    // Add specific error details
    if (error instanceof MemoryThresholdExceededError) {
      report += `Threshold: ${Math.round(error.threshold / 1024 / 1024)}MB\n`;
      report += `Actual Usage: ${Math.round(error.actualUsage / 1024 / 1024)}MB\n`;
      report += `Excess: ${Math.round((error.actualUsage - error.threshold) / 1024 / 1024)}MB\n`;
    }
    
    if (error instanceof TestCleanupFailedError) {
      report += `Cleanup Operation: ${error.cleanupOperation}\n`;
      if (error.originalError) {
        report += `Original Error: ${error.originalError.message}\n`;
      }
    }
    
    // Add recovery suggestions
    report += `\n💡 Recovery Suggestions:\n`;
    report += this.getRecoverySuggestions(error);
    
    return report;
  }

  /**
   * Get recovery suggestions based on error type
   */
  private getRecoverySuggestions(error: MemoryManagementError): string {
    let suggestions = '';
    
    if (error instanceof MemoryThresholdExceededError) {
      suggestions += '- Run tests with --expose-gc flag\n';
      suggestions += '- Increase Node.js memory limit with --max-old-space-size\n';
      suggestions += '- Reduce test concurrency\n';
      suggestions += '- Clear test caches more frequently\n';
    }
    
    if (error instanceof TestCleanupFailedError) {
      suggestions += '- Check for hanging timers or event listeners\n';
      suggestions += '- Verify all async operations are properly awaited\n';
      suggestions += '- Review test teardown procedures\n';
    }
    
    if (error instanceof GarbageCollectionError) {
      suggestions += '- Run Node.js with --expose-gc flag\n';
      suggestions += '- Implement manual memory management\n';
      suggestions += '- Use WeakMap/WeakSet for temporary references\n';
    }
    
    return suggestions || '- Review memory usage patterns in tests\n';
  }

  // Private recovery strategy implementations
  private async forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  private async clearTestCaches(): Promise<void> {
    const globalCaches = ['__TEST_CACHE__', '__PARSER_CACHE__', '__DETECTION_CACHE__'];
    globalCaches.forEach(cache => {
      if (global[cache]) {
        global[cache] = {};
      }
    });
  }

  private async clearModuleCache(): Promise<void> {
    const testPatterns = [/\/tests\//, /\.test\./, /mock/i, /fixtures/];
    const keysToDelete = Object.keys(require.cache).filter(key =>
      testPatterns.some(pattern => pattern.test(key))
    );
    keysToDelete.forEach(key => delete require.cache[key]);
  }

  private async alternativeCacheClear(): Promise<void> {
    // More aggressive cache clearing
    Object.keys(global).forEach(key => {
      if (key.includes('CACHE') || key.includes('TEST')) {
        delete global[key];
      }
    });
  }

  private async alternativeModuleCacheClear(): Promise<void> {
    // Clear all non-core modules
    Object.keys(require.cache).forEach(key => {
      if (!key.includes('node_modules') || key.includes('test')) {
        delete require.cache[key];
      }
    });
  }

  private async alternativeGarbageCollection(): Promise<void> {
    // Try different GC approaches
    if (global.gc) {
      global.gc();
    }
    // Force event loop to process
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async genericCleanupRecovery(): Promise<void> {
    await this.clearTestCaches();
    await this.forceGarbageCollection();
  }

  private async reduceConcurrency(): Promise<void> {
    console.log('🔄 Reducing test concurrency for memory management');
    // This would typically involve updating test runner configuration
  }

  private async skipNonEssentialTests(): Promise<void> {
    console.log('⏭️  Skipping non-essential tests due to memory constraints');
    // This would typically involve setting environment variables or flags
  }

  private async useSimplifiedTestData(): Promise<void> {
    console.log('📊 Using simplified test data to reduce memory usage');
    // This would typically involve replacing large fixtures with smaller ones
  }

  private async emergencyCleanup(): Promise<void> {
    console.log('🚨 Performing emergency memory cleanup');
    await this.clearTestCaches();
    await this.clearModuleCache();
    await this.forceGarbageCollection();
  }

  /**
   * Reset recovery attempt counters
   */
  resetRecoveryAttempts(): void {
    this.recoveryAttempts.clear();
  }
}

/**
 * Convenience function to get recovery strategies instance
 */
export const getRecoveryStrategies = (): MemoryRecoveryStrategies => 
  MemoryRecoveryStrategies.getInstance();

/**
 * Convenience function to handle memory errors with recovery
 */
export const handleMemoryError = async (error: MemoryManagementError): Promise<boolean> => {
  const strategies = getRecoveryStrategies();
  
  console.error(strategies.createDetailedErrorReport(error));
  
  if (error instanceof MemoryThresholdExceededError) {
    return await strategies.recoverFromThresholdExceeded(error);
  }
  
  if (error instanceof TestCleanupFailedError) {
    return await strategies.recoverFromCleanupFailure(error);
  }
  
  // Generic recovery attempt
  try {
    await strategies.implementGracefulDegradation(error.memoryUsage);
    return true;
  } catch {
    return false;
  }
};