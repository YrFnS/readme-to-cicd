/**
 * Memory Assertions Test Setup
 * 
 * Integrates memory usage assertions into the test environment.
 * This file provides setup and utilities for memory assertion testing.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  MemoryUsageAssertions,
  initializeMemoryAssertions,
  getMemoryAssertions,
  cleanupMemoryAssertions,
  type MemoryThreshold,
  type MemoryAssertionOptions,
  type MemoryRegressionCheck
} from '../../src/shared/memory-usage-assertions.js';
import {
  getTestWorkerMemoryMonitor,
  initializeTestWorkerMemoryMonitoring
} from '../../src/shared/test-worker-memory-monitor.js';
import {
  getTestMemoryTracker,
  initializeTestMemoryTracking
} from '../../src/shared/test-memory-tracking.js';

// Default memory thresholds for tests
export const DEFAULT_MEMORY_THRESHOLDS: MemoryThreshold = {
  maxMemoryBytes: 100 * 1024 * 1024, // 100MB per test
  maxGrowthBytes: 50 * 1024 * 1024,  // 50MB growth per test
  maxGrowthPercentage: 100,          // 100% growth allowed
  maxUsagePercentage: 80,            // 80% of system limit
  minEfficiencyScore: 70             // Minimum efficiency score
};

// Strict memory thresholds for performance-critical tests
export const STRICT_MEMORY_THRESHOLDS: MemoryThreshold = {
  maxMemoryBytes: 50 * 1024 * 1024,  // 50MB per test
  maxGrowthBytes: 20 * 1024 * 1024,  // 20MB growth per test
  maxGrowthPercentage: 50,           // 50% growth allowed
  maxUsagePercentage: 60,            // 60% of system limit
  minEfficiencyScore: 80             // Higher efficiency requirement
};

// Relaxed memory thresholds for integration tests
export const RELAXED_MEMORY_THRESHOLDS: MemoryThreshold = {
  maxMemoryBytes: 200 * 1024 * 1024, // 200MB per test
  maxGrowthBytes: 100 * 1024 * 1024, // 100MB growth per test
  maxGrowthPercentage: 200,          // 200% growth allowed
  maxUsagePercentage: 90,            // 90% of system limit
  minEfficiencyScore: 50             // Lower efficiency requirement
};

// Global instances
let memoryAssertions: MemoryUsageAssertions;
let currentTestName: string | undefined;
let testStartMemory: number | undefined;

/**
 * Initialize memory assertions for test suite
 */
beforeAll(async () => {
  console.log('🔧 Initializing memory assertions...');
  
  try {
    // Get or initialize memory monitor
    const memoryMonitor = getTestWorkerMemoryMonitor();
    if (!memoryMonitor) {
      throw new Error('TestWorkerMemoryMonitor not available');
    }

    // Get memory tracker if available
    const memoryTracker = getTestMemoryTracker(memoryMonitor);

    // Initialize memory assertions
    memoryAssertions = initializeMemoryAssertions(memoryMonitor, memoryTracker);
    
    console.log('✅ Memory assertions initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize memory assertions:', error);
    throw error;
  }
});

/**
 * Cleanup memory assertions after test suite
 */
afterAll(async () => {
  console.log('🧹 Cleaning up memory assertions...');
  
  try {
    // Generate final memory report
    if (memoryAssertions) {
      const report = memoryAssertions.generateMemoryReport();
      console.log(report);
    }
    
    // Cleanup
    cleanupMemoryAssertions();
    
    console.log('✅ Memory assertions cleanup completed');
    
  } catch (error) {
    console.error('❌ Memory assertions cleanup failed:', error);
    // Don't throw during cleanup
  }
});

/**
 * Before each test - set memory baseline
 */
beforeEach(async (context) => {
  try {
    // Get test name from context
    const testName = context?.task?.name || context?.meta?.name || 'unknown-test';
    currentTestName = testName;
    
    // Set memory baseline for this test
    if (memoryAssertions) {
      memoryAssertions.setMemoryBaseline(testName);
      testStartMemory = memoryAssertions.getMemoryBaseline(testName);
    }
    
  } catch (error) {
    console.error('❌ Error setting memory baseline:', error);
  }
});

/**
 * After each test - check for memory issues
 */
afterEach(async (context) => {
  try {
    const testName = currentTestName || context?.task?.name || context?.meta?.name || 'unknown-test';
    
    // Check for significant memory growth
    if (memoryAssertions && testStartMemory) {
      const currentUsage = memoryAssertions['memoryMonitor'].getCurrentMemoryUsage();
      const memoryGrowth = currentUsage.heapUsed - testStartMemory;
      
      // Warn about significant memory growth (>50MB)
      if (memoryGrowth > 50 * 1024 * 1024) {
        console.warn(`⚠️  Test ${testName} caused significant memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB`);
      }
      
      // Clear baseline for this test
      memoryAssertions.clearMemoryBaseline(testName);
    }
    
    currentTestName = undefined;
    testStartMemory = undefined;
    
  } catch (error) {
    console.error('❌ Error in memory assertions afterEach:', error);
  }
});

/**
 * Export utilities for use in tests
 */
export { memoryAssertions };

/**
 * Assert memory usage is within default thresholds
 */
export function assertMemoryWithinLimits(options?: MemoryAssertionOptions) {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    throw new Error('Memory assertions not initialized');
  }
  
  const result = assertions.assertMemoryWithinThresholds(DEFAULT_MEMORY_THRESHOLDS, options);
  if (!result.passed) {
    throw new Error(`Memory assertion failed: ${result.errorMessage}`);
  }
  
  return result;
}

/**
 * Assert memory usage is within strict thresholds
 */
export function assertMemoryWithinStrictLimits(options?: MemoryAssertionOptions) {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    throw new Error('Memory assertions not initialized');
  }
  
  const result = assertions.assertMemoryWithinThresholds(STRICT_MEMORY_THRESHOLDS, options);
  if (!result.passed) {
    throw new Error(`Strict memory assertion failed: ${result.errorMessage}`);
  }
  
  return result;
}

/**
 * Assert memory usage is within relaxed thresholds
 */
export function assertMemoryWithinRelaxedLimits(options?: MemoryAssertionOptions) {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    throw new Error('Memory assertions not initialized');
  }
  
  const result = assertions.assertMemoryWithinThresholds(RELAXED_MEMORY_THRESHOLDS, options);
  if (!result.passed) {
    throw new Error(`Relaxed memory assertion failed: ${result.errorMessage}`);
  }
  
  return result;
}

/**
 * Assert memory usage is within custom thresholds
 */
export function assertMemoryWithinCustomLimits(
  thresholds: MemoryThreshold,
  options?: MemoryAssertionOptions
) {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    throw new Error('Memory assertions not initialized');
  }
  
  const result = assertions.assertMemoryWithinThresholds(thresholds, options);
  if (!result.passed) {
    throw new Error(`Custom memory assertion failed: ${result.errorMessage}`);
  }
  
  return result;
}

/**
 * Assert no memory regression for current test
 */
export function assertNoMemoryRegressionForTest(
  expectedMemoryUsage: number,
  allowedVariance = 0.1,
  options?: MemoryAssertionOptions
) {
  const assertions = getMemoryAssertions();
  if (!assertions || !currentTestName) {
    throw new Error('Memory assertions not initialized or no current test');
  }
  
  const check: MemoryRegressionCheck = {
    testName: currentTestName,
    expectedMemoryUsage,
    allowedVariance,
    updateBaseline: true
  };
  
  const result = assertions.assertNoMemoryRegression(check, options);
  if (!result.passed) {
    throw new Error(`Memory regression detected: ${result.errorMessage}`);
  }
  
  return result;
}

/**
 * Monitor memory usage during operation and assert growth limits
 */
export async function assertMemoryGrowthDuringOperation<T>(
  operation: () => Promise<T> | T,
  maxGrowthMB = 50,
  options?: MemoryAssertionOptions
): Promise<T> {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    throw new Error('Memory assertions not initialized');
  }
  
  const maxGrowthBytes = maxGrowthMB * 1024 * 1024;
  const { result, assertion } = await assertions.assertMemoryGrowthDuringOperation(
    operation,
    maxGrowthBytes,
    options
  );
  
  if (!assertion.passed) {
    throw new Error(`Memory growth assertion failed: ${assertion.errorMessage}`);
  }
  
  return result;
}

/**
 * Set memory baseline for specific test
 */
export function setMemoryBaselineForTest(testName?: string) {
  const assertions = getMemoryAssertions();
  if (assertions) {
    assertions.setMemoryBaseline(testName || currentTestName);
  }
}

/**
 * Get current memory usage information
 */
export function getCurrentMemoryInfo() {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    return null;
  }
  
  return assertions['memoryMonitor'].getCurrentMemoryUsage();
}

/**
 * Generate memory report for current state
 */
export function getMemoryReport() {
  const assertions = getMemoryAssertions();
  if (!assertions) {
    return 'Memory assertions not initialized';
  }
  
  return assertions.generateMemoryReport();
}

/**
 * Force garbage collection and return memory usage
 */
export function forceGCAndGetMemory() {
  if (global.gc) {
    global.gc();
  }
  
  return getCurrentMemoryInfo();
}

/**
 * Utility to measure memory usage of a function
 */
export async function measureMemoryUsage<T>(
  operation: () => Promise<T> | T,
  label?: string
): Promise<{ result: T; memoryGrowth: number; duration: number }> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  try {
    const result = await operation();
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const duration = endTime - startTime;
    const memoryGrowth = endMemory - startMemory;
    
    if (label) {
      console.log(`📊 ${label}: ${duration}ms, memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB`);
    }
    
    return { result, memoryGrowth, duration };
    
  } catch (error) {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const duration = endTime - startTime;
    const memoryGrowth = endMemory - startMemory;
    
    if (label) {
      console.error(`❌ ${label} failed: ${duration}ms, memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB`);
    }
    
    throw error;
  }
}

/**
 * Create a memory-aware test wrapper
 */
export function withMemoryAssertion<T extends any[], R>(
  fn: (...args: T) => Promise<R> | R,
  thresholds: MemoryThreshold = DEFAULT_MEMORY_THRESHOLDS,
  options?: MemoryAssertionOptions
) {
  return async (...args: T): Promise<R> => {
    // Set baseline before operation
    setMemoryBaselineForTest();
    
    try {
      // Execute operation
      const result = await fn(...args);
      
      // Assert memory usage after operation
      assertMemoryWithinCustomLimits(thresholds, options);
      
      return result;
      
    } catch (error) {
      // Log memory state on error
      console.error('Memory state on error:', getMemoryReport());
      throw error;
    }
  };
}

/**
 * Create a memory regression test wrapper
 */
export function withMemoryRegressionCheck<T extends any[], R>(
  fn: (...args: T) => Promise<R> | R,
  expectedMemoryUsage: number,
  allowedVariance = 0.1,
  options?: MemoryAssertionOptions
) {
  return async (...args: T): Promise<R> => {
    try {
      const result = await fn(...args);
      
      // Check for regression
      assertNoMemoryRegressionForTest(expectedMemoryUsage, allowedVariance, options);
      
      return result;
      
    } catch (error) {
      console.error('Memory state on regression check error:', getMemoryReport());
      throw error;
    }
  };
}

// Log memory assertions setup on module load
console.log('📊 Memory assertions setup loaded');
console.log(`   Default max memory: ${(DEFAULT_MEMORY_THRESHOLDS.maxMemoryBytes! / 1024 / 1024).toFixed(0)}MB`);
console.log(`   Default max growth: ${(DEFAULT_MEMORY_THRESHOLDS.maxGrowthBytes! / 1024 / 1024).toFixed(0)}MB`);
console.log(`   Default efficiency: ${DEFAULT_MEMORY_THRESHOLDS.minEfficiencyScore}%`);