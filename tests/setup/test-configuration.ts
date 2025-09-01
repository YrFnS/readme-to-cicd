/**
 * Test Configuration
 * 
 * Centralized configuration for test environment including MonitoringSystem,
 * memory management, and other test infrastructure components.
 */

import { beforeAll, afterAll } from 'vitest';
import { 
  getTestMonitoringSystem, 
  isTestMonitoringSystemInitialized,
  getMonitoringSystemInitializationError 
} from './monitoring-system-setup.js';
import { getMemoryManager, getResourceCleaner } from './memory-management.js';

// Test environment configuration
export const TEST_CONFIG = {
  monitoring: {
    enabled: true,
    metricsCollection: true,
    healthChecks: true,
    alerting: false, // Disabled in tests
    retentionPeriod: 5 * 60 * 1000, // 5 minutes
  },
  memory: {
    monitoring: true,
    automaticCleanup: true,
    thresholdWarning: 400 * 1024 * 1024, // 400MB
    thresholdCritical: 600 * 1024 * 1024, // 600MB
  },
  performance: {
    timeoutWarning: 5000, // 5 seconds
    timeoutCritical: 30000, // 30 seconds
  },
  logging: {
    level: 'info',
    enableDebug: process.env.TEST_DEBUG === 'true',
    enableVerbose: process.env.TEST_VERBOSE === 'true',
  }
};

// Test infrastructure status
let testInfrastructureReady = false;
let infrastructureErrors: Error[] = [];

/**
 * Initialize test infrastructure
 */
async function initializeTestInfrastructure(): Promise<void> {
  console.log('🔧 Initializing test infrastructure...');
  
  try {
    // Validate MonitoringSystem initialization
    if (!isTestMonitoringSystemInitialized()) {
      const error = getMonitoringSystemInitializationError();
      if (error) {
        throw new Error(`MonitoringSystem initialization failed: ${error.message}`);
      } else {
        throw new Error('MonitoringSystem not initialized');
      }
    }
    
    // Validate memory management
    const memoryManager = getMemoryManager();
    const resourceCleaner = getResourceCleaner();
    
    if (!memoryManager || !resourceCleaner) {
      throw new Error('Memory management components not available');
    }
    
    // Record initial system state
    const monitoringSystem = getTestMonitoringSystem();
    await monitoringSystem.recordMetric('test_infrastructure_initialized', 1, {
      timestamp: new Date().toISOString(),
      environment: 'test'
    });
    
    // Update component health
    await monitoringSystem.updateComponentHealth('test-infrastructure', {
      status: 'healthy',
      responseTime: 0,
      errorRate: 0
    });
    
    testInfrastructureReady = true;
    infrastructureErrors = [];
    
    console.log('✅ Test infrastructure initialized successfully');
    
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    infrastructureErrors.push(errorObj);
    testInfrastructureReady = false;
    
    console.error('❌ Test infrastructure initialization failed:', errorObj.message);
    throw errorObj;
  }
}

/**
 * Cleanup test infrastructure
 */
async function cleanupTestInfrastructure(): Promise<void> {
  console.log('🧹 Cleaning up test infrastructure...');
  
  try {
    if (isTestMonitoringSystemInitialized()) {
      const monitoringSystem = getTestMonitoringSystem();
      
      // Record cleanup metrics
      await monitoringSystem.recordMetric('test_infrastructure_cleanup', 1, {
        timestamp: new Date().toISOString(),
        environment: 'test'
      });
      
      // Update component health
      await monitoringSystem.updateComponentHealth('test-infrastructure', {
        status: 'healthy',
        responseTime: 0,
        errorRate: 0
      });
    }
    
    // Perform memory cleanup
    const resourceCleaner = getResourceCleaner();
    await resourceCleaner.cleanupTestResources();
    
    testInfrastructureReady = false;
    infrastructureErrors = [];
    
    console.log('✅ Test infrastructure cleanup completed');
    
  } catch (error) {
    console.error('❌ Test infrastructure cleanup failed:', error);
    // Don't throw during cleanup to avoid breaking test teardown
  }
}

/**
 * Validate test infrastructure is ready
 */
export function validateTestInfrastructure(): void {
  if (!testInfrastructureReady) {
    if (infrastructureErrors.length > 0) {
      const errorMessages = infrastructureErrors.map(e => e.message).join('; ');
      throw new Error(`Test infrastructure not ready. Errors: ${errorMessages}`);
    } else {
      throw new Error('Test infrastructure not initialized');
    }
  }
}

/**
 * Get test infrastructure status
 */
export function getTestInfrastructureStatus(): {
  ready: boolean;
  errors: Error[];
  monitoringSystem: boolean;
  memoryManagement: boolean;
} {
  return {
    ready: testInfrastructureReady,
    errors: [...infrastructureErrors],
    monitoringSystem: isTestMonitoringSystemInitialized(),
    memoryManagement: true, // Memory management is always available
  };
}

/**
 * Record test execution metrics
 */
export async function recordTestMetrics(testName: string, duration: number, status: 'passed' | 'failed' | 'skipped'): Promise<void> {
  try {
    if (isTestMonitoringSystemInitialized()) {
      const monitoringSystem = getTestMonitoringSystem();
      
      await monitoringSystem.recordMetric('test_execution_duration', duration, {
        test_name: testName,
        status,
        timestamp: new Date().toISOString()
      });
      
      await monitoringSystem.recordMetric(`test_${status}`, 1, {
        test_name: testName,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.warn('Failed to record test metrics:', error);
  }
}

/**
 * Get test environment health
 */
export async function getTestEnvironmentHealth(): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details?: any;
  }>;
}> {
  try {
    const components = [];
    
    // Check MonitoringSystem health
    if (isTestMonitoringSystemInitialized()) {
      const monitoringSystem = getTestMonitoringSystem();
      const health = await monitoringSystem.getSystemHealth();
      
      components.push({
        name: 'monitoring-system',
        status: health.status,
        details: {
          uptime: health.overall.uptime,
          responseTime: health.overall.responseTime,
          errorRate: health.overall.errorRate
        }
      });
    } else {
      components.push({
        name: 'monitoring-system',
        status: 'unhealthy',
        details: { error: 'Not initialized' }
      });
    }
    
    // Check memory management health
    const memoryManager = getMemoryManager();
    const memoryReport = memoryManager.getCurrentMemoryUsage();
    
    components.push({
      name: 'memory-management',
      status: memoryReport.isAboveThreshold ? 'degraded' : 'healthy',
      details: {
        heapUsed: memoryReport.formattedHeapUsed,
        heapTotal: memoryReport.formattedHeapTotal
      }
    });
    
    // Determine overall health
    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }
    
    return { overall, components };
    
  } catch (error) {
    console.error('Failed to get test environment health:', error);
    return {
      overall: 'unhealthy',
      components: [{
        name: 'health-check',
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) }
      }]
    };
  }
}

// Global test infrastructure hooks
beforeAll(async () => {
  await initializeTestInfrastructure();
});

afterAll(async () => {
  await cleanupTestInfrastructure();
});

// Export configuration and utilities
export {
  initializeTestInfrastructure,
  cleanupTestInfrastructure,
  testInfrastructureReady,
  infrastructureErrors
};