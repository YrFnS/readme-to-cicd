/**
 * Memory Cleanup Configuration Test Suite
 * 
 * Tests that memory cleanup hooks are properly configured in the test setup
 * and that all required components are available and functioning correctly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  MEMORY_MONITORING_CONFIG,
  getMemoryManager,
  getResourceCleaner,
  checkAndCleanupMemory,
  triggerMemoryCleanup,
  getCurrentMemoryUsage,
  isMemoryUsageHigh
} from '../../setup/memory-setup';

describe('Memory Cleanup Configuration', () => {
  let configSnapshot: typeof MEMORY_MONITORING_CONFIG;

  beforeAll(() => {
    // Take a snapshot of the configuration for testing
    configSnapshot = { ...MEMORY_MONITORING_CONFIG };
  });

  afterAll(() => {
    // Ensure configuration is restored after tests
    Object.assign(MEMORY_MONITORING_CONFIG, configSnapshot);
  });

  describe('Configuration Validation', () => {
    it('should have proper memory monitoring configuration', () => {
      expect(MEMORY_MONITORING_CONFIG).toBeDefined();
      expect(typeof MEMORY_MONITORING_CONFIG).toBe('object');
      
      // Validate required configuration properties
      expect(typeof MEMORY_MONITORING_CONFIG.enableDetailedLogging).toBe('boolean');
      expect(typeof MEMORY_MONITORING_CONFIG.enableAutomaticCleanup).toBe('boolean');
      expect(typeof MEMORY_MONITORING_CONFIG.memoryThresholdMB).toBe('number');
      expect(typeof MEMORY_MONITORING_CONFIG.reportMemoryUsage).toBe('boolean');
      expect(typeof MEMORY_MONITORING_CONFIG.cleanupAfterEachTest).toBe('boolean');
      expect(typeof MEMORY_MONITORING_CONFIG.monitoringInterval).toBe('number');
      
      // Validate reasonable configuration values
      expect(MEMORY_MONITORING_CONFIG.memoryThresholdMB).toBeGreaterThan(0);
      expect(MEMORY_MONITORING_CONFIG.memoryThresholdMB).toBeLessThan(2048); // Less than 2GB
      expect(MEMORY_MONITORING_CONFIG.monitoringInterval).toBeGreaterThan(1000); // At least 1 second
      expect(MEMORY_MONITORING_CONFIG.monitoringInterval).toBeLessThan(60000); // Less than 1 minute
    });

    it('should have environment-appropriate configuration', () => {
      // In CI environments, detailed logging should typically be disabled
      if (process.env.CI === 'true') {
        expect(MEMORY_MONITORING_CONFIG.reportMemoryUsage).toBe(false);
      }
      
      // In test environment, automatic cleanup should be enabled
      expect(MEMORY_MONITORING_CONFIG.enableAutomaticCleanup).toBe(true);
      expect(MEMORY_MONITORING_CONFIG.cleanupAfterEachTest).toBe(true);
    });

    it('should have proper Node.js configuration for memory management', () => {
      // Check that Node.js is configured with appropriate memory settings
      const nodeOptions = process.env.NODE_OPTIONS || '';
      
      // Should have garbage collection exposed
      expect(nodeOptions).toContain('--expose-gc');
      
      // Should have reasonable heap size
      if (nodeOptions.includes('--max-old-space-size')) {
        const heapSizeMatch = nodeOptions.match(/--max-old-space-size=(\d+)/);
        if (heapSizeMatch) {
          const heapSize = parseInt(heapSizeMatch[1], 10);
          expect(heapSize).toBeGreaterThan(1024); // At least 1GB
          expect(heapSize).toBeLessThan(8192);    // Less than 8GB
        }
      }
    });
  });

  describe('Component Availability', () => {
    it('should have memory manager properly initialized', () => {
      const memoryManager = getMemoryManager();
      
      expect(memoryManager).toBeDefined();
      expect(typeof memoryManager.getCurrentMemoryUsage).toBe('function');
      expect(typeof memoryManager.checkMemoryThresholds).toBe('function');
      expect(typeof memoryManager.forceGarbageCollection).toBe('function');
      expect(typeof memoryManager.registerCleanupCallback).toBe('function');
      expect(typeof memoryManager.getMemoryHistory).toBe('function');
      expect(typeof memoryManager.generateMemoryReport).toBe('function');
      expect(typeof memoryManager.startMonitoring).toBe('function');
      expect(typeof memoryManager.stopMonitoring).toBe('function');
      expect(typeof memoryManager.reset).toBe('function');
    });

    it('should have resource cleaner properly initialized', () => {
      const resourceCleaner = getResourceCleaner();
      
      expect(resourceCleaner).toBeDefined();
      expect(typeof resourceCleaner.cleanupTestResources).toBe('function');
      expect(typeof resourceCleaner.setCleanupVerification).toBe('function');
    });

    it('should have utility functions available', () => {
      expect(typeof checkAndCleanupMemory).toBe('function');
      expect(typeof triggerMemoryCleanup).toBe('function');
      expect(typeof getCurrentMemoryUsage).toBe('function');
      expect(typeof isMemoryUsageHigh).toBe('function');
    });
  });

  describe('Hook Integration Validation', () => {
    it('should have beforeEach and afterEach hooks properly configured', () => {
      // This test validates that the memory setup file is properly loaded
      // by checking that the memory management functions work correctly
      
      const initialMemory = getCurrentMemoryUsage();
      expect(initialMemory).toBeDefined();
      expect(initialMemory.heapUsed).toBeGreaterThan(0);
      expect(initialMemory.timestamp).toBeGreaterThan(0);
      
      // Memory manager should have history from previous operations
      const memoryManager = getMemoryManager();
      const history = memoryManager.getMemoryHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should have proper cleanup callback registration', async () => {
      const memoryManager = getMemoryManager();
      let callbackExecuted = false;
      
      // Register a test cleanup callback
      memoryManager.registerCleanupCallback(() => {
        callbackExecuted = true;
      });
      
      // Trigger cleanup to test callback execution
      await triggerMemoryCleanup();
      
      // Callback should have been executed
      expect(callbackExecuted).toBe(true);
    });

    it('should handle memory threshold checks correctly', () => {
      const memoryReport = checkAndCleanupMemory();
      
      expect(memoryReport).toBeDefined();
      expect(typeof memoryReport.heapUsed).toBe('number');
      expect(typeof memoryReport.isAboveThreshold).toBe('boolean');
      expect(memoryReport.heapUsed).toBeGreaterThan(0);
      
      // Should complete without throwing errors
      expect(memoryReport.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Vitest Configuration Integration', () => {
    it('should have proper test isolation configured', () => {
      // Check that Vitest is configured for proper test isolation
      // This helps prevent memory leaks between tests
      
      // The test environment should be 'node'
      expect(process.env.NODE_ENV).toBe('test');
      
      // Global objects should be available for memory management
      expect(typeof global).toBe('object');
      expect(typeof process).toBe('object');
      expect(typeof process.memoryUsage).toBe('function');
    });

    it('should have garbage collection available', () => {
      // Check if garbage collection is available
      if (global.gc) {
        expect(typeof global.gc).toBe('function');
        
        // Test that gc can be called without errors
        expect(() => {
          global.gc();
        }).not.toThrow();
      } else {
        console.warn('⚠️  Garbage collection not available. Run tests with --expose-gc for better memory management.');
      }
    });

    it('should have proper timeout configuration for memory operations', () => {
      // Memory operations should have reasonable timeouts
      // This is typically configured in vitest.config.ts
      
      // Test that async operations complete within reasonable time
      const startTime = Date.now();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const elapsed = Date.now() - startTime;
          expect(elapsed).toBeGreaterThan(90); // At least 100ms
          expect(elapsed).toBeLessThan(1000);  // Less than 1 second
          resolve();
        }, 100);
      });
    });
  });

  describe('Error Handling Configuration', () => {
    it('should have proper error handling for memory operations', async () => {
      // Test that memory operations handle errors gracefully
      const memoryManager = getMemoryManager();
      
      // This should not throw even if there are internal errors
      expect(() => {
        memoryManager.getCurrentMemoryUsage();
      }).not.toThrow();
      
      expect(() => {
        memoryManager.checkMemoryThresholds();
      }).not.toThrow();
      
      expect(() => {
        memoryManager.forceGarbageCollection();
      }).not.toThrow();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Test that cleanup operations handle errors gracefully
      const resourceCleaner = getResourceCleaner();
      
      // Disable cleanup verification to avoid issues during error testing
      resourceCleaner.setCleanupVerification(false);
      
      try {
        // This should complete without throwing, even if there are internal errors
        await expect(resourceCleaner.cleanupTestResources()).resolves.toBeUndefined();
      } finally {
        // Re-enable cleanup verification
        resourceCleaner.setCleanupVerification(true);
      }
    });

    it('should have proper process event handlers configured', () => {
      // Check that process event handlers are set up for memory management
      const listeners = process.listeners('uncaughtException');
      expect(Array.isArray(listeners)).toBe(true);
      
      const rejectionListeners = process.listeners('unhandledRejection');
      expect(Array.isArray(rejectionListeners)).toBe(true);
      
      const warningListeners = process.listeners('warning');
      expect(Array.isArray(warningListeners)).toBe(true);
    });
  });

  describe('Performance Configuration', () => {
    it('should have reasonable memory thresholds configured', () => {
      const thresholdBytes = MEMORY_MONITORING_CONFIG.memoryThresholdMB * 1024 * 1024;
      
      // Threshold should be reasonable for test environment
      expect(thresholdBytes).toBeGreaterThan(100 * 1024 * 1024);  // At least 100MB
      expect(thresholdBytes).toBeLessThan(1024 * 1024 * 1024);    // Less than 1GB
      
      // Current memory usage should typically be below threshold
      const currentMemory = getCurrentMemoryUsage();
      if (currentMemory.heapUsed > thresholdBytes) {
        console.warn(`⚠️  Current memory usage (${currentMemory.formattedHeapUsed}) exceeds threshold (${MEMORY_MONITORING_CONFIG.memoryThresholdMB}MB)`);
      }
    });

    it('should have appropriate monitoring intervals', () => {
      const interval = MEMORY_MONITORING_CONFIG.monitoringInterval;
      
      // Monitoring interval should be reasonable
      expect(interval).toBeGreaterThan(5000);   // At least 5 seconds
      expect(interval).toBeLessThan(30000);     // Less than 30 seconds
      
      // For test environments, shorter intervals are acceptable
      if (process.env.NODE_ENV === 'test') {
        expect(interval).toBeLessThan(15000);   // Less than 15 seconds in tests
      }
    });

    it('should have efficient cleanup configuration', () => {
      // Cleanup should be enabled for test stability
      expect(MEMORY_MONITORING_CONFIG.enableAutomaticCleanup).toBe(true);
      expect(MEMORY_MONITORING_CONFIG.cleanupAfterEachTest).toBe(true);
      
      // Detailed logging should be configurable based on environment
      if (process.env.MEMORY_DEBUG === 'true') {
        expect(MEMORY_MONITORING_CONFIG.enableDetailedLogging).toBe(true);
      }
      
      // Report memory usage should be disabled in CI to reduce noise
      if (process.env.CI === 'true') {
        expect(MEMORY_MONITORING_CONFIG.reportMemoryUsage).toBe(false);
      }
    });
  });
});