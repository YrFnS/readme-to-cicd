/**
 * Automatic Garbage Collection Setup
 * 
 * Integrates automatic garbage collection triggers into the Vitest test environment.
 * This setup file is loaded by Vitest to provide automatic GC triggers between
 * test suites and at appropriate test boundaries.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { 
  initializeAutomaticGCTriggers,
  resetAutomaticGCTriggers,
  getAutomaticGCTriggers,
  generateGCTriggerReport,
  type GCTriggerConfig
} from '../../src/shared/automatic-gc-triggers.js';

// Configuration for automatic GC triggers
const GC_TRIGGER_CONFIG: Partial<GCTriggerConfig> = {
  enabled: true,
  triggerAfterTests: parseInt(process.env.GC_TRIGGER_AFTER_TESTS || '15'), // Every 15 tests
  memoryThresholdMB: parseInt(process.env.GC_MEMORY_THRESHOLD_MB || '400'), // 400MB threshold
  triggerBetweenSuites: process.env.GC_TRIGGER_BETWEEN_SUITES !== 'false', // Default true
  gcPasses: parseInt(process.env.GC_PASSES || '2'), // 2 GC passes
  gcPassDelay: parseInt(process.env.GC_PASS_DELAY || '10'), // 10ms delay between passes
  enableLogging: process.env.GC_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  forceGCForTesting: process.env.NODE_ENV === 'test' && process.env.FORCE_GC_FOR_TESTING === 'true'
};

// Global state
let gcTriggers: ReturnType<typeof initializeAutomaticGCTriggers>;
let currentSuiteName: string | undefined;
let testCount = 0;
let suiteStartTime = 0;

/**
 * Global setup - initialize automatic GC triggers
 */
beforeAll(async () => {
  console.log('🗑️  Initializing automatic garbage collection triggers...');
  
  try {
    // Initialize GC triggers with configuration
    gcTriggers = initializeAutomaticGCTriggers(GC_TRIGGER_CONFIG);
    
    // Log configuration
    if (GC_TRIGGER_CONFIG.enableLogging) {
      console.log('⚙️  GC Trigger Configuration:');
      console.log(`   Enabled: ${GC_TRIGGER_CONFIG.enabled}`);
      console.log(`   Trigger after tests: ${GC_TRIGGER_CONFIG.triggerAfterTests}`);
      console.log(`   Memory threshold: ${GC_TRIGGER_CONFIG.memoryThresholdMB}MB`);
      console.log(`   Between suites: ${GC_TRIGGER_CONFIG.triggerBetweenSuites}`);
      console.log(`   GC passes: ${GC_TRIGGER_CONFIG.gcPasses}`);
      console.log(`   GC available: ${global.gc ? 'Yes' : 'No'}`);
    }
    
    // Warn if GC is not available
    if (!global.gc && !GC_TRIGGER_CONFIG.forceGCForTesting) {
      console.warn('⚠️  Garbage collection not available. Run tests with --expose-gc flag for automatic memory management.');
      console.warn('   Example: npm test -- --node-options="--expose-gc"');
    }
    
    console.log('✅ Automatic GC triggers initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize automatic GC triggers:', error);
    throw error;
  }
});

/**
 * Global teardown - generate final GC report and cleanup
 */
afterAll(async () => {
  console.log('🗑️  Finalizing automatic garbage collection triggers...');
  
  try {
    // Generate final report
    if (gcTriggers && GC_TRIGGER_CONFIG.enableLogging) {
      const report = generateGCTriggerReport();
      console.log(report);
    }
    
    // Final GC trigger for cleanup
    if (gcTriggers) {
      const finalResult = gcTriggers.forceGC('test_suite_end');
      if (finalResult.triggered && finalResult.memoryFreed > 0) {
        console.log(`🗑️  Final GC freed ${formatBytes(finalResult.memoryFreed)} of memory`);
      }
    }
    
    // Reset GC triggers
    resetAutomaticGCTriggers();
    
    console.log('✅ Automatic GC triggers finalized successfully');
    
  } catch (error) {
    console.error('❌ Failed to finalize automatic GC triggers:', error);
    // Don't throw during cleanup to avoid breaking test teardown
  }
});

/**
 * Before each test - register test start and check for suite changes
 */
beforeEach(async (context) => {
  try {
    testCount++;
    
    // Extract test and suite information from context
    const testName = context?.task?.name || context?.meta?.name || `test-${testCount}`;
    const testFile = context?.task?.file?.name || context?.meta?.file;
    
    // Determine suite name from file path
    let suiteName: string | undefined;
    if (testFile) {
      // Extract suite name from file path (remove extension and path)
      suiteName = testFile.replace(/^.*[\\\/]/, '').replace(/\.(test|spec)\.(ts|js)$/, '');
    }
    
    // Check for suite change
    if (suiteName && suiteName !== currentSuiteName) {
      if (currentSuiteName) {
        // End previous suite
        gcTriggers.onSuiteEnd(currentSuiteName);
        
        if (GC_TRIGGER_CONFIG.enableLogging) {
          const suiteTime = Date.now() - suiteStartTime;
          console.log(`📊 Suite '${currentSuiteName}' completed in ${suiteTime}ms`);
        }
      }
      
      // Start new suite
      gcTriggers.onSuiteStart(suiteName);
      currentSuiteName = suiteName;
      suiteStartTime = Date.now();
      
      if (GC_TRIGGER_CONFIG.enableLogging) {
        console.log(`📊 Starting suite: ${suiteName}`);
      }
    }
    
    // Register test start
    gcTriggers.onTestStart(testName, suiteName);
    
  } catch (error) {
    console.error('❌ Error in GC beforeEach setup:', error);
  }
});

/**
 * After each test - register test end and trigger cleanup if needed
 */
afterEach(async (context) => {
  try {
    // Extract test information from context
    const testName = context?.task?.name || context?.meta?.name || `test-${testCount}`;
    const testResult = context?.task?.result;
    
    // Determine test status
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    if (testResult?.state === 'fail') {
      status = 'failed';
    } else if (testResult?.state === 'skip') {
      status = 'skipped';
    }
    
    // Register test end (this may trigger GC based on configuration)
    gcTriggers.onTestEnd(testName, status);
    
    // Log test completion if debugging is enabled
    if (GC_TRIGGER_CONFIG.enableLogging && status === 'failed') {
      console.log(`❌ Test failed: ${testName} (GC may be triggered for cleanup)`);
    }
    
  } catch (error) {
    console.error('❌ Error in GC afterEach cleanup:', error);
  }
});

/**
 * Export utilities for use in tests
 */
export { gcTriggers };

/**
 * Utility function for tests to manually trigger GC
 */
export function manualGCTrigger(reason: string = 'manual'): void {
  if (gcTriggers) {
    const result = gcTriggers.forceGC(reason);
    if (GC_TRIGGER_CONFIG.enableLogging) {
      console.log(`🗑️  Manual GC trigger: ${result.triggered ? 'Success' : 'Failed'} (${reason})`);
    }
  }
}

/**
 * Utility function for tests to get GC statistics
 */
export function getGCStats(): ReturnType<typeof gcTriggers.getStats> | null {
  return gcTriggers ? gcTriggers.getStats() : null;
}

/**
 * Utility function for tests to check if GC is available
 */
export function isGCAvailable(): boolean {
  return !!global.gc || !!GC_TRIGGER_CONFIG.forceGCForTesting;
}

/**
 * Utility function for tests to update GC configuration
 */
export function updateGCConfig(config: Partial<GCTriggerConfig>): void {
  if (gcTriggers) {
    gcTriggers.updateConfig(config);
    if (GC_TRIGGER_CONFIG.enableLogging) {
      console.log('🔧 GC configuration updated:', config);
    }
  }
}

/**
 * Utility function for tests to generate GC report
 */
export function generateGCReport(): string {
  return gcTriggers ? gcTriggers.generateReport() : 'GC triggers not initialized';
}

/**
 * Utility function for memory-intensive tests to trigger GC before/after
 */
export async function withGCProtection<T>(
  operation: () => Promise<T> | T,
  operationName: string = 'operation'
): Promise<T> {
  // Trigger GC before operation
  if (gcTriggers) {
    gcTriggers.forceGC(`before_${operationName}`);
  }
  
  const startMemory = process.memoryUsage().heapUsed;
  
  try {
    const result = await operation();
    
    // Trigger GC after operation if memory increased significantly
    const endMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = endMemory - startMemory;
    
    if (memoryGrowth > 20 * 1024 * 1024 && gcTriggers) { // More than 20MB growth
      gcTriggers.forceGC(`after_${operationName}`);
      
      if (GC_TRIGGER_CONFIG.enableLogging) {
        console.log(`🗑️  GC triggered after ${operationName} (${formatBytes(memoryGrowth)} growth)`);
      }
    }
    
    return result;
    
  } catch (error) {
    // Trigger GC on error to clean up any partial allocations
    if (gcTriggers) {
      gcTriggers.forceGC(`error_${operationName}`);
    }
    throw error;
  }
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

// Log setup completion
console.log('🗑️  Automatic GC setup loaded');
console.log(`   Trigger after: ${GC_TRIGGER_CONFIG.triggerAfterTests} tests`);
console.log(`   Memory threshold: ${GC_TRIGGER_CONFIG.memoryThresholdMB}MB`);
console.log(`   Between suites: ${GC_TRIGGER_CONFIG.triggerBetweenSuites ? 'enabled' : 'disabled'}`);
console.log(`   GC passes: ${GC_TRIGGER_CONFIG.gcPasses}`);