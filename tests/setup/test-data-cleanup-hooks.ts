/**
 * Test Data Cleanup Hooks - Automatic test data cleanup integration
 * 
 * Provides automatic cleanup hooks that integrate with Vitest lifecycle
 * to ensure test data is cleaned up after each test execution.
 */

import { beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { 
  TestDataCleanupManager, 
  TestDataTracker,
  CleanupResult,
  getTestDataCleanupManager,
  createTestDataTracker
} from '../../src/shared/test-data-cleanup.js';

// Global cleanup state
let cleanupManager: TestDataCleanupManager;
let testDataTracker: TestDataTracker;
let cleanupResults: CleanupResult[] = [];
let testStartTime: number;

// Configuration
const CLEANUP_CONFIG = {
  enableAfterEachCleanup: process.env.TEST_CLEANUP_AFTER_EACH !== 'false',
  enableAfterAllCleanup: true,
  enableVerboseLogging: process.env.TEST_CLEANUP_VERBOSE === 'true',
  enableDryRun: process.env.TEST_CLEANUP_DRY_RUN === 'true',
  trackingEnabled: true,
  reportCleanupStats: process.env.CI !== 'true' // Disable in CI to reduce noise
};

/**
 * Global setup - initialize cleanup manager
 */
beforeAll(async () => {
  console.log('🔧 Initializing test data cleanup hooks...');
  
  try {
    // Initialize cleanup manager with configuration
    cleanupManager = getTestDataCleanupManager({
      autoCleanupEnabled: true,
      verboseLogging: CLEANUP_CONFIG.enableVerboseLogging,
      dryRun: CLEANUP_CONFIG.enableDryRun,
      cleanupDirectories: [
        './test-output',
        './temp',
        './tmp',
        './test-temp',
        './test-validation-output',
        './temp-templates',
        './test-fixtures-temp',
        './debug-output',
        './test-generated',
        './mock-output'
      ],
      cleanupPatterns: [
        '**/*.tmp',
        '**/*.temp',
        '**/test-*.json',
        '**/debug-*.js',
        '**/temp-*.md',
        '**/.test-*',
        '**/mock-*',
        '**/sample-output-*',
        '**/generated-test-*',
        '**/test-data-*',
        '**/temp-readme-*'
      ],
      maxFileAge: 2 * 60 * 60 * 1000 // 2 hours for test files
    });
    
    // Initialize test data tracker
    testDataTracker = createTestDataTracker(cleanupManager);
    
    // Perform initial cleanup to start with clean state
    if (CLEANUP_CONFIG.enableAfterAllCleanup) {
      const initialCleanup = await cleanupManager.cleanupTestData();
      if (CLEANUP_CONFIG.reportCleanupStats && initialCleanup.filesDeleted > 0) {
        console.log(`🧹 Initial cleanup: ${initialCleanup.filesDeleted} files, ${formatBytes(initialCleanup.bytesFreed)} freed`);
      }
    }
    
    console.log('✅ Test data cleanup hooks initialized');
    
  } catch (error) {
    console.error('❌ Failed to initialize test data cleanup hooks:', error);
    throw error;
  }
});

/**
 * Global teardown - final cleanup
 */
afterAll(async () => {
  console.log('🧹 Running final test data cleanup...');
  
  try {
    if (CLEANUP_CONFIG.enableAfterAllCleanup) {
      const finalCleanup = await cleanupManager.cleanupTestData();
      cleanupResults.push(finalCleanup);
      
      if (CLEANUP_CONFIG.reportCleanupStats) {
        generateFinalCleanupReport();
      }
    }
    
    // Reset cleanup manager state
    cleanupManager.reset();
    
    console.log('✅ Final test data cleanup completed');
    
  } catch (error) {
    console.error('❌ Final test data cleanup failed:', error);
    // Don't throw during teardown to avoid breaking test suite
  }
});

/**
 * Before each test - setup tracking
 */
beforeEach(async () => {
  testStartTime = Date.now();
  
  // Clear any previous tracking
  testDataTracker.clearTracking();
  
  if (CLEANUP_CONFIG.enableVerboseLogging) {
    console.log('📝 Test data tracking initialized for test');
  }
});

/**
 * After each test - cleanup test data
 */
afterEach(async () => {
  try {
    if (CLEANUP_CONFIG.enableAfterEachCleanup) {
      const testDuration = Date.now() - testStartTime;
      
      // Perform cleanup
      const cleanupResult = await cleanupManager.cleanupTestData();
      cleanupResults.push(cleanupResult);
      
      // Log cleanup results if significant
      if (CLEANUP_CONFIG.reportCleanupStats && 
          (cleanupResult.filesDeleted > 0 || cleanupResult.errors.length > 0)) {
        
        const summary = `🧹 Test cleanup: ${cleanupResult.filesDeleted} files`;
        if (cleanupResult.bytesFreed > 0) {
          console.log(`${summary}, ${formatBytes(cleanupResult.bytesFreed)} freed`);
        } else {
          console.log(summary);
        }
        
        // Log errors if any
        if (cleanupResult.errors.length > 0) {
          console.warn(`⚠️  Cleanup errors: ${cleanupResult.errors.length}`);
          if (CLEANUP_CONFIG.enableVerboseLogging) {
            cleanupResult.errors.forEach(error => {
              console.warn(`  - ${error.path}: ${error.error}`);
            });
          }
        }
      }
      
      // Keep cleanup results history manageable
      if (cleanupResults.length > 50) {
        cleanupResults = cleanupResults.slice(-50);
      }
    }
    
  } catch (error) {
    console.error('❌ Test data cleanup in afterEach failed:', error);
    // Don't throw to avoid breaking test execution
  }
});

/**
 * Generate final cleanup report
 */
function generateFinalCleanupReport(): void {
  if (cleanupResults.length === 0) {
    return;
  }
  
  const totalFiles = cleanupResults.reduce((sum, result) => sum + result.filesDeleted, 0);
  const totalDirectories = cleanupResults.reduce((sum, result) => sum + result.directoriesDeleted, 0);
  const totalBytes = cleanupResults.reduce((sum, result) => sum + result.bytesFreed, 0);
  const totalErrors = cleanupResults.reduce((sum, result) => sum + result.errors.length, 0);
  const totalDuration = cleanupResults.reduce((sum, result) => sum + result.duration, 0);
  
  let report = '\n📊 Test Data Cleanup Summary\n';
  report += `Total cleanup operations: ${cleanupResults.length}\n`;
  report += `Files cleaned: ${totalFiles}\n`;
  report += `Directories cleaned: ${totalDirectories}\n`;
  report += `Space freed: ${formatBytes(totalBytes)}\n`;
  report += `Total cleanup time: ${totalDuration}ms\n`;
  
  if (totalErrors > 0) {
    report += `Errors encountered: ${totalErrors}\n`;
  }
  
  // Efficiency metrics
  if (cleanupResults.length > 0) {
    const avgFilesPerCleanup = totalFiles / cleanupResults.length;
    const avgBytesPerCleanup = totalBytes / cleanupResults.length;
    const avgDurationPerCleanup = totalDuration / cleanupResults.length;
    
    report += `Average per cleanup: ${avgFilesPerCleanup.toFixed(1)} files, `;
    report += `${formatBytes(avgBytesPerCleanup)}, ${avgDurationPerCleanup.toFixed(1)}ms\n`;
  }
  
  // Cleanup effectiveness assessment
  if (totalFiles === 0 && totalDirectories === 0) {
    report += '✅ Clean test execution - no cleanup needed\n';
  } else if (totalBytes > 100 * 1024 * 1024) { // More than 100MB
    report += '⚠️  High cleanup volume - consider optimizing test data usage\n';
  } else {
    report += 'ℹ️  Normal cleanup volume\n';
  }
  
  console.log(report);
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
  cleanupManager,
  testDataTracker,
  CLEANUP_CONFIG
};

/**
 * Utility function for tests to manually trigger cleanup
 */
export const triggerTestDataCleanup = async (): Promise<CleanupResult> => {
  return await cleanupManager.cleanupTestData();
};

/**
 * Utility function for tests to track temporary files
 */
export const trackTempFile = (filePath: string): void => {
  testDataTracker.trackFile(filePath);
};

/**
 * Utility function for tests to track temporary directories
 */
export const trackTempDirectory = (dirPath: string): void => {
  testDataTracker.trackDirectory(dirPath);
};

/**
 * Utility function to get cleanup statistics
 */
export const getCleanupStats = (): {
  totalOperations: number;
  totalFilesDeleted: number;
  totalBytesFreed: number;
  totalErrors: number;
} => {
  return {
    totalOperations: cleanupResults.length,
    totalFilesDeleted: cleanupResults.reduce((sum, result) => sum + result.filesDeleted, 0),
    totalBytesFreed: cleanupResults.reduce((sum, result) => sum + result.bytesFreed, 0),
    totalErrors: cleanupResults.reduce((sum, result) => sum + result.errors.length, 0)
  };
};

/**
 * Utility function to check if cleanup is enabled
 */
export const isCleanupEnabled = (): boolean => {
  return CLEANUP_CONFIG.enableAfterEachCleanup || CLEANUP_CONFIG.enableAfterAllCleanup;
};

/**
 * Utility function to enable/disable cleanup for specific tests
 */
export const setCleanupEnabled = (enabled: boolean): void => {
  CLEANUP_CONFIG.enableAfterEachCleanup = enabled;
};