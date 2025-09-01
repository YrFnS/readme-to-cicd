/**
 * Test Worker Memory Setup
 * 
 * Integrates test worker memory monitoring into the test environment.
 * This file is loaded by Vitest to provide memory monitoring and limits
 * for test worker processes.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { 
  TestWorkerMemoryMonitor,
  getTestWorkerMemoryMonitor,
  initializeTestWorkerMemoryMonitoring,
  cleanupTestWorkerMemoryMonitoring,
  forceTestWorkerMemoryCleanup,
  getTestWorkerMemoryReport
} from '../../src/shared/test-worker-memory-monitor.js';
import {
  TestMemoryTracker,
  getTestMemoryTracker,
  initializeTestMemoryTracking,
  cleanupTestMemoryTracking,
  startTestMemoryTracking,
  endTestMemoryTracking,
  generateTestMemoryReport
} from '../../src/shared/test-memory-tracking.js';

// Test worker memory configuration
const TEST_WORKER_MEMORY_CONFIG = {
  maxMemoryBytes: parseInt(process.env.TEST_WORKER_MAX_MEMORY || '512') * 1024 * 1024, // Default 512MB
  warningThreshold: parseFloat(process.env.TEST_WORKER_WARNING_THRESHOLD || '0.7'), // 70%
  criticalThreshold: parseFloat(process.env.TEST_WORKER_CRITICAL_THRESHOLD || '0.85'), // 85%
  monitoringInterval: parseInt(process.env.TEST_WORKER_MONITORING_INTERVAL || '5000'), // 5 seconds
  enableAutoCleanup: process.env.TEST_WORKER_AUTO_CLEANUP !== 'false', // Default true
  enableDetailedLogging: process.env.TEST_WORKER_DETAILED_LOGGING === 'true' // Default false
};

// Global instances
let memoryMonitor: TestWorkerMemoryMonitor;
let memoryTracker: TestMemoryTracker;
let currentTestName: string | undefined;
let suiteStarted = false;

/**
 * Initialize test worker memory monitoring
 */
beforeAll(async () => {
  console.log('🔧 Initializing test worker memory monitoring...');
  
  try {
    // Initialize memory monitor
    memoryMonitor = initializeTestWorkerMemoryMonitoring(TEST_WORKER_MEMORY_CONFIG);
    
    // Initialize memory tracker
    memoryTracker = initializeTestMemoryTracking(memoryMonitor);
    
    // Register cleanup callback with memory monitor
    memoryMonitor.registerCleanupCallback(async () => {
      // Clear test-specific caches
      if (global.__TEST_CACHE__) {
        global.__TEST_CACHE__ = {};
      }
      
      // Clear any large test data
      if (global.__LARGE_TEST_DATA__) {
        global.__LARGE_TEST_DATA__ = null;
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    });
    
    // Set up memory event handlers
    memoryMonitor.onMemoryEvent(async (event) => {
      switch (event.type) {
        case 'warning':
          console.warn(`⚠️  Test worker memory warning: ${event.message}`);
          break;
        case 'critical':
          console.error(`🚨 Test worker memory critical: ${event.message}`);
          break;
        case 'overlimit':
          console.error(`🚨 Test worker memory over limit: ${event.message}`);
          // Consider failing the test or suite
          if (currentTestName) {
            console.error(`🚨 Test ${currentTestName} exceeded memory limit`);
          }
          break;
        case 'cleanup':
          console.log(`🧹 Test worker memory cleanup: ${event.message}`);
          break;
      }
    });
    
    // Log initial configuration
    console.log(`📊 Test worker memory limit: ${(TEST_WORKER_MEMORY_CONFIG.maxMemoryBytes / 1024 / 1024).toFixed(0)}MB`);
    console.log(`⚠️  Warning threshold: ${(TEST_WORKER_MEMORY_CONFIG.warningThreshold * 100).toFixed(1)}%`);
    console.log(`🚨 Critical threshold: ${(TEST_WORKER_MEMORY_CONFIG.criticalThreshold * 100).toFixed(1)}%`);
    console.log(`🔄 Monitoring interval: ${TEST_WORKER_MEMORY_CONFIG.monitoringInterval}ms`);
    console.log(`🧹 Auto cleanup: ${TEST_WORKER_MEMORY_CONFIG.enableAutoCleanup ? 'enabled' : 'disabled'}`);
    
    console.log('✅ Test worker memory monitoring initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize test worker memory monitoring:', error);
    throw error;
  }
});

/**
 * Cleanup test worker memory monitoring
 */
afterAll(async () => {
  console.log('🧹 Cleaning up test worker memory monitoring...');
  
  try {
    // Generate final memory report
    if (memoryTracker) {
      const report = generateTestMemoryReport();
      console.log(report);
    }
    
    // Stop monitoring
    cleanupTestWorkerMemoryMonitoring();
    cleanupTestMemoryTracking();
    
    console.log('✅ Test worker memory monitoring cleanup completed');
    
  } catch (error) {
    console.error('❌ Test worker memory monitoring cleanup failed:', error);
    // Don't throw during cleanup to avoid breaking test teardown
  }
});

/**
 * Before each test - start memory tracking
 */
beforeEach(async (context) => {
  try {
    // Get test name from context
    const testName = context?.task?.name || context?.meta?.name || 'unknown-test';
    const testFile = context?.task?.file?.name || context?.meta?.file;
    
    currentTestName = testName;
    
    // Start memory tracking for this test
    if (memoryTracker) {
      memoryTracker.startTest(testName, testFile);
    }
    
    // Start suite tracking if this is the first test
    if (!suiteStarted && testFile) {
      const suiteName = testFile.replace(/\.(test|spec)\.(ts|js)$/, '');
      memoryTracker.startSuite(suiteName);
      suiteStarted = true;
    }
    
    // Check memory before test starts
    if (memoryMonitor) {
      const usage = memoryMonitor.getCurrentMemoryUsage();
      
      if (usage.isWarning) {
        console.warn(`⚠️  Starting test ${testName} with high memory usage: ${usage.formattedHeapUsed}`);
        
        // Force cleanup if memory is high
        if (usage.isCritical) {
          await forceTestWorkerMemoryCleanup();
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error in beforeEach memory setup:', error);
  }
});

/**
 * After each test - end memory tracking and cleanup
 */
afterEach(async (context) => {
  try {
    // Get test result
    const testName = currentTestName || context?.task?.name || context?.meta?.name || 'unknown-test';
    const testResult = context?.task?.result;
    
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    if (testResult?.state === 'fail') {
      status = 'failed';
    } else if (testResult?.state === 'skip') {
      status = 'skipped';
    }
    
    // End memory tracking for this test
    if (memoryTracker) {
      const snapshot = memoryTracker.endTest(testName, status);
      
      // Log significant memory growth
      if (snapshot && snapshot.memoryGrowth && snapshot.memoryGrowth > 20 * 1024 * 1024) {
        console.warn(`⚠️  Test ${testName} caused significant memory growth: ${(snapshot.memoryGrowth / 1024 / 1024).toFixed(1)}MB`);
      }
    }
    
    // Check memory after test
    if (memoryMonitor) {
      const usage = memoryMonitor.getCurrentMemoryUsage();
      
      // Force cleanup if memory is high after test
      if (usage.isCritical) {
        console.warn(`🧹 Forcing cleanup after test ${testName} due to high memory usage: ${usage.formattedHeapUsed}`);
        await forceTestWorkerMemoryCleanup();
      }
    }
    
    currentTestName = undefined;
    
  } catch (error) {
    console.error('❌ Error in afterEach memory cleanup:', error);
  }
});

/**
 * Export utilities for use in tests
 */
export {
  memoryMonitor,
  memoryTracker,
  TEST_WORKER_MEMORY_CONFIG
};

/**
 * Utility function for tests to check memory usage
 */
export function getCurrentTestMemoryUsage() {
  return memoryMonitor?.getCurrentMemoryUsage();
}

/**
 * Utility function for tests to force memory cleanup
 */
export async function forceTestMemoryCleanup() {
  await forceTestWorkerMemoryCleanup();
}

/**
 * Utility function for tests to get memory report
 */
export function getTestMemoryReport() {
  return getTestWorkerMemoryReport();
}

/**
 * Utility function for tests to check if memory is within limits
 */
export function isMemoryWithinLimits() {
  return memoryMonitor?.isMemoryWithinLimits() ?? true;
}

/**
 * Utility function for tests to get memory tracking snapshot
 */
export function getCurrentTestSnapshot() {
  if (!memoryTracker || !currentTestName) {
    return undefined;
  }
  return memoryTracker.getTestSnapshot(currentTestName);
}

/**
 * Utility function to manually trigger memory monitoring for specific operations
 */
export async function monitorMemoryDuringOperation<T>(
  operationName: string,
  operation: () => Promise<T> | T
): Promise<T> {
  const startUsage = memoryMonitor?.getCurrentMemoryUsage();
  const startTime = Date.now();
  
  try {
    const result = await operation();
    
    const endUsage = memoryMonitor?.getCurrentMemoryUsage();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (startUsage && endUsage) {
      const memoryGrowth = endUsage.heapUsed - startUsage.heapUsed;
      
      console.log(`📊 Operation ${operationName}:`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   Final usage: ${endUsage.formattedHeapUsed}`);
      
      // Warn about significant memory growth
      if (memoryGrowth > 50 * 1024 * 1024) {
        console.warn(`⚠️  Operation ${operationName} caused significant memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB`);
      }
    }
    
    return result;
    
  } catch (error) {
    const endUsage = memoryMonitor?.getCurrentMemoryUsage();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ Operation ${operationName} failed after ${duration}ms`);
    if (endUsage) {
      console.error(`   Final memory usage: ${endUsage.formattedHeapUsed}`);
    }
    
    throw error;
  }
}

// Log memory configuration on module load
console.log('📊 Test worker memory setup loaded');
console.log(`   Max memory: ${(TEST_WORKER_MEMORY_CONFIG.maxMemoryBytes / 1024 / 1024).toFixed(0)}MB`);
console.log(`   Warning: ${(TEST_WORKER_MEMORY_CONFIG.warningThreshold * 100).toFixed(1)}%`);
console.log(`   Critical: ${(TEST_WORKER_MEMORY_CONFIG.criticalThreshold * 100).toFixed(1)}%`);