/**
 * Memory Setup - Global memory monitoring hooks for all tests
 * 
 * This file is automatically loaded by Vitest and provides global
 * memory monitoring, cleanup triggers, and memory usage reporting
 * for all test files.
 */

import { beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { 
  TestMemoryManager, 
  TestResourceCleaner,
  getMemoryManager,
  getResourceCleaner,
  checkAndCleanupMemory,
  type MemoryUsageReport 
} from './memory-management';

// Global memory monitoring state
let memoryManager: TestMemoryManager;
let resourceCleaner: TestResourceCleaner;
let testStartMemory: MemoryUsageReport;
let suiteStartMemory: MemoryUsageReport;
let memoryReports: MemoryUsageReport[] = [];

// Configuration
const MEMORY_MONITORING_CONFIG = {
  enableDetailedLogging: process.env.MEMORY_DEBUG === 'true',
  enableAutomaticCleanup: true,
  memoryThresholdMB: 500,
  reportMemoryUsage: process.env.CI !== 'true', // Disable in CI to reduce noise
  cleanupAfterEachTest: true,
  monitoringInterval: 10000 // 10 seconds
};

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  console.log('🔧 Initializing global memory monitoring...');
  
  // Initialize memory management instances
  memoryManager = getMemoryManager();
  resourceCleaner = getResourceCleaner();
  
  // Record initial memory state
  suiteStartMemory = memoryManager.getCurrentMemoryUsage();
  
  // Register global cleanup callbacks
  memoryManager.registerCleanupCallback(async () => {
    await resourceCleaner.cleanupTestResources();
  });
  
  // Start continuous monitoring if enabled
  if (MEMORY_MONITORING_CONFIG.enableDetailedLogging) {
    memoryManager.startMonitoring(MEMORY_MONITORING_CONFIG.monitoringInterval);
  }
  
  // Log initial memory state
  if (MEMORY_MONITORING_CONFIG.reportMemoryUsage) {
    console.log(`📊 Initial memory usage: ${suiteStartMemory.formattedHeapUsed}`);
  }
  
  // Set up process event handlers for memory issues
  setupProcessEventHandlers();
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
  console.log('🧹 Running global memory cleanup...');
  
  try {
    // Stop monitoring
    memoryManager.stopMonitoring();
    
    // Final cleanup
    await resourceCleaner.cleanupTestResources();
    
    // Generate final memory report
    const finalMemory = memoryManager.getCurrentMemoryUsage();
    
    if (MEMORY_MONITORING_CONFIG.reportMemoryUsage) {
      console.log(generateFinalMemoryReport(finalMemory));
    }
    
    // Reset memory manager state
    memoryManager.reset();
    
  } catch (error) {
    console.error('❌ Global memory cleanup failed:', error);
  }
});

/**
 * Before each test - memory monitoring setup
 */
beforeEach(async () => {
  // Record memory state at test start
  testStartMemory = memoryManager.getCurrentMemoryUsage();
  
  // Check if we're approaching memory limits
  if (testStartMemory.heapUsed > MEMORY_MONITORING_CONFIG.memoryThresholdMB * 1024 * 1024) {
    console.warn(`⚠️  Starting test with high memory usage: ${testStartMemory.formattedHeapUsed}`);
    
    if (MEMORY_MONITORING_CONFIG.enableAutomaticCleanup) {
      await resourceCleaner.cleanupTestResources();
    }
  }
  
  // Log memory usage for debugging if enabled
  if (MEMORY_MONITORING_CONFIG.enableDetailedLogging) {
    console.log(`📊 Test start memory: ${testStartMemory.formattedHeapUsed}`);
  }
});

/**
 * After each test - memory cleanup and monitoring
 */
afterEach(async () => {
  try {
    // Record memory state at test end
    const testEndMemory = memoryManager.getCurrentMemoryUsage();
    const memoryGrowth = testEndMemory.heapUsed - testStartMemory.heapUsed;
    
    // Store memory report for analysis
    memoryReports.push({
      ...testEndMemory,
      timestamp: Date.now()
    });
    
    // Keep only last 50 reports to prevent memory leak
    if (memoryReports.length > 50) {
      memoryReports = memoryReports.slice(-50);
    }
    
    // Log memory growth if significant
    if (Math.abs(memoryGrowth) > 10 * 1024 * 1024) { // More than 10MB change
      const growthFormatted = formatBytes(memoryGrowth);
      const direction = memoryGrowth > 0 ? 'increased' : 'decreased';
      
      if (MEMORY_MONITORING_CONFIG.reportMemoryUsage) {
        console.log(`📊 Test memory ${direction} by ${growthFormatted}`);
      }
    }
    
    // Trigger cleanup if memory usage is high
    if (testEndMemory.heapUsed > MEMORY_MONITORING_CONFIG.memoryThresholdMB * 1024 * 1024) {
      console.warn(`⚠️  High memory usage detected: ${testEndMemory.formattedHeapUsed}`);
      
      if (MEMORY_MONITORING_CONFIG.enableAutomaticCleanup) {
        await resourceCleaner.cleanupTestResources();
      }
    }
    
    // Routine cleanup after each test if enabled
    if (MEMORY_MONITORING_CONFIG.cleanupAfterEachTest) {
      // Light cleanup - just garbage collection
      memoryManager.forceGarbageCollection();
    }
    
    // Check for memory threshold violations
    checkAndCleanupMemory();
    
  } catch (error) {
    console.error('❌ Memory monitoring in afterEach failed:', error);
  }
});

/**
 * Set up process event handlers for memory-related issues
 */
function setupProcessEventHandlers(): void {
  // Handle uncaught exceptions that might be memory-related
  process.on('uncaughtException', (error) => {
    if (error.message.includes('heap') || error.message.includes('memory')) {
      console.error('🚨 Memory-related uncaught exception:', error.message);
      
      // Attempt emergency cleanup
      try {
        memoryManager.forceGarbageCollection();
      } catch (cleanupError) {
        console.error('Failed emergency cleanup:', cleanupError);
      }
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    if (reason && typeof reason === 'object' && 'message' in reason) {
      const message = (reason as Error).message;
      if (message.includes('heap') || message.includes('memory')) {
        console.error('🚨 Memory-related unhandled rejection:', message);
      }
    }
  });
  
  // Handle process warnings (including memory warnings)
  process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning' || 
        warning.message.includes('memory') ||
        warning.message.includes('heap')) {
      console.warn('⚠️  Process warning (possibly memory-related):', warning.message);
    }
  });
}

/**
 * Generate final memory report for the entire test suite
 */
function generateFinalMemoryReport(finalMemory: MemoryUsageReport): string {
  const totalGrowth = finalMemory.heapUsed - suiteStartMemory.heapUsed;
  const growthFormatted = formatBytes(totalGrowth);
  const direction = totalGrowth > 0 ? 'increased' : 'decreased';
  
  let report = '\n📊 Final Memory Report\n';
  report += `Initial: ${suiteStartMemory.formattedHeapUsed}\n`;
  report += `Final: ${finalMemory.formattedHeapUsed}\n`;
  report += `Total Change: ${direction} by ${growthFormatted}\n`;
  
  if (memoryReports.length > 0) {
    const maxMemory = Math.max(...memoryReports.map(r => r.heapUsed));
    const avgMemory = memoryReports.reduce((sum, r) => sum + r.heapUsed, 0) / memoryReports.length;
    
    report += `Peak Usage: ${formatBytes(maxMemory)}\n`;
    report += `Average Usage: ${formatBytes(avgMemory)}\n`;
  }
  
  // Memory efficiency assessment
  if (totalGrowth > 100 * 1024 * 1024) { // More than 100MB growth
    report += '⚠️  High memory growth detected - consider investigating memory leaks\n';
  } else if (totalGrowth < 0) {
    report += '✅ Memory usage decreased - good cleanup effectiveness\n';
  } else {
    report += 'ℹ️  Memory usage stable\n';
  }
  
  return report;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Export utilities for use in individual tests
 */
export {
  memoryManager,
  resourceCleaner,
  MEMORY_MONITORING_CONFIG,
  checkAndCleanupMemory
};

/**
 * Utility function for tests to manually trigger memory cleanup
 */
export const triggerMemoryCleanup = async (): Promise<void> => {
  await resourceCleaner.cleanupTestResources();
};

/**
 * Utility function for tests to get current memory usage
 */
export const getCurrentMemoryUsage = (): MemoryUsageReport => {
  return memoryManager.getCurrentMemoryUsage();
};

/**
 * Utility function for tests to check if memory usage is high
 */
export const isMemoryUsageHigh = (): boolean => {
  const current = memoryManager.getCurrentMemoryUsage();
  return current.heapUsed > MEMORY_MONITORING_CONFIG.memoryThresholdMB * 1024 * 1024;
};