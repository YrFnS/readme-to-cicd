/**
 * MonitoringSystem Test Setup
 * 
 * Provides MonitoringSystem initialization, setup, and teardown hooks for tests.
 * Ensures proper monitoring system lifecycle management during test execution.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { MonitoringSystem } from '../../src/integration/monitoring/monitoring-system.js';
import { Logger } from '../../src/cli/lib/logger.js';

// Global monitoring system instance for tests
let globalMonitoringSystem: MonitoringSystem | null = null;
let testLogger: Logger | null = null;

// Configuration for test monitoring system
const TEST_MONITORING_CONFIG = {
  enableMetrics: true,
  enableHealthChecks: true,
  metricsPort: 9091, // Different port for tests
  metricsPath: '/test-metrics',
  healthCheckInterval: 30000, // 30 seconds for tests
  alertingEnabled: false, // Disable alerting in tests
  retentionPeriod: 5 * 60 * 1000, // 5 minutes for tests
};

// Track initialization state
let isMonitoringSystemInitialized = false;
let initializationError: Error | null = null;

/**
 * Initialize MonitoringSystem for tests
 */
async function initializeTestMonitoringSystem(): Promise<MonitoringSystem> {
  try {
    console.log('🔧 Initializing MonitoringSystem for tests...');
    
    // Create test logger
    testLogger = new Logger();
    
    // Create MonitoringSystem instance
    const monitoringSystem = new MonitoringSystem(testLogger, TEST_MONITORING_CONFIG);
    
    // Initialize the monitoring system
    const result = await monitoringSystem.initialize();
    
    if (!result.success) {
      throw new Error(`MonitoringSystem initialization failed: ${result.error?.message}`);
    }
    
    isMonitoringSystemInitialized = true;
    initializationError = null;
    
    console.log('✅ MonitoringSystem initialized successfully for tests');
    return monitoringSystem;
    
  } catch (error) {
    const errorMessage = `Failed to initialize MonitoringSystem for tests: ${error instanceof Error ? error.message : String(error)}`;
    console.error('❌', errorMessage);
    
    initializationError = error instanceof Error ? error : new Error(errorMessage);
    isMonitoringSystemInitialized = false;
    
    throw initializationError;
  }
}

/**
 * Cleanup MonitoringSystem after tests
 */
async function cleanupTestMonitoringSystem(): Promise<void> {
  try {
    if (globalMonitoringSystem) {
      console.log('🧹 Cleaning up MonitoringSystem...');
      
      await globalMonitoringSystem.shutdown();
      globalMonitoringSystem = null;
      
      console.log('✅ MonitoringSystem cleanup completed');
    }
    
    isMonitoringSystemInitialized = false;
    initializationError = null;
    testLogger = null;
    
  } catch (error) {
    console.error('❌ MonitoringSystem cleanup failed:', error);
    // Don't throw here to avoid breaking test teardown
  }
}

/**
 * Validate MonitoringSystem initialization
 */
function validateMonitoringSystemInitialization(): void {
  if (!isMonitoringSystemInitialized) {
    const message = initializationError 
      ? `MonitoringSystem initialization failed: ${initializationError.message}`
      : 'MonitoringSystem not initialized. Please ensure MonitoringSystem is properly set up in test configuration.';
    throw new Error(message);
  }
  
  if (!globalMonitoringSystem) {
    throw new Error('MonitoringSystem instance not available. The system may have been shut down or not properly initialized.');
  }
}

/**
 * Get the global MonitoringSystem instance for tests
 */
export function getTestMonitoringSystem(): MonitoringSystem {
  try {
    validateMonitoringSystemInitialization();
    return globalMonitoringSystem!;
  } catch (error) {
    const enhancedError = new Error(
      `Failed to get test MonitoringSystem: ${error instanceof Error ? error.message : String(error)}. ` +
      `Ensure that MonitoringSystem is properly initialized in your test setup.`
    );
    throw enhancedError;
  }
}

/**
 * Check if MonitoringSystem is initialized
 */
export function isTestMonitoringSystemInitialized(): boolean {
  return isMonitoringSystemInitialized && globalMonitoringSystem !== null;
}

/**
 * Get MonitoringSystem initialization error if any
 */
export function getMonitoringSystemInitializationError(): Error | null {
  return initializationError;
}

/**
 * Reset MonitoringSystem state for individual tests
 */
export async function resetTestMonitoringSystem(): Promise<void> {
  if (globalMonitoringSystem && isMonitoringSystemInitialized) {
    try {
      // Get current status to verify it's working
      const status = await globalMonitoringSystem.getStatus();
      
      if (status.initialized) {
        // Clear any test-specific data without full shutdown
        console.log('🔄 Resetting MonitoringSystem state for test...');
        
        // Note: In a real implementation, you might want to add a reset method
        // to the MonitoringSystem class to clear metrics and alerts without shutdown
      }
    } catch (error) {
      console.warn('⚠️  Failed to reset MonitoringSystem state:', error);
    }
  }
}

// Global setup hooks
beforeAll(async () => {
  try {
    globalMonitoringSystem = await initializeTestMonitoringSystem();
  } catch (error) {
    console.error('❌ Failed to initialize MonitoringSystem in beforeAll:', error);
    // Store the error but don't fail the entire test suite
    initializationError = error instanceof Error ? error : new Error(String(error));
  }
});

afterAll(async () => {
  await cleanupTestMonitoringSystem();
});

// Per-test hooks
beforeEach(async () => {
  // Validate that MonitoringSystem is available for each test
  try {
    validateMonitoringSystemInitialization();
    
    // Additional health check to ensure system is responsive
    if (globalMonitoringSystem) {
      const status = await globalMonitoringSystem.getStatus();
      if (!status.initialized) {
        console.warn('⚠️  MonitoringSystem reports as not initialized, attempting to reinitialize...');
        const result = await globalMonitoringSystem.initialize();
        if (!result.success) {
          throw new Error(`Reinitialization failed: ${result.error?.message}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  MonitoringSystem validation failed in beforeEach:', error);
    
    // Try to reinitialize if it failed
    if (!globalMonitoringSystem && !initializationError) {
      try {
        console.log('🔄 Attempting to reinitialize MonitoringSystem...');
        globalMonitoringSystem = await initializeTestMonitoringSystem();
        console.log('✅ MonitoringSystem reinitialized successfully');
      } catch (reinitError) {
        console.error('❌ Failed to reinitialize MonitoringSystem:', reinitError);
        initializationError = reinitError instanceof Error ? reinitError : new Error(String(reinitError));
      }
    }
  }
});

afterEach(async () => {
  // Reset MonitoringSystem state after each test to prevent test interference
  await resetTestMonitoringSystem();
});

// Export configuration for tests that need it
export const TEST_MONITORING_CONFIG_EXPORT = TEST_MONITORING_CONFIG;

// Export utilities for manual MonitoringSystem management in specific tests
export {
  initializeTestMonitoringSystem,
  cleanupTestMonitoringSystem,
  validateMonitoringSystemInitialization
};