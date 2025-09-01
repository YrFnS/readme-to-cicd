/**
 * MonitoringSystem Singleton Pattern Tests
 * 
 * Comprehensive tests for the MonitoringSystem singleton implementation.
 * Validates that the singleton pattern prevents multiple instances and
 * provides proper initialization and cleanup mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitoringSystem } from '../../../src/integration/monitoring/monitoring-system.js';
import { Logger } from '../../../src/cli/lib/logger.js';

// Mock logger for testing
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
});

describe('MonitoringSystem Singleton Pattern', () => {
  
  beforeEach(() => {
    // Reset the singleton instance before each test
    MonitoringSystem.resetInstance();
  });

  afterEach(() => {
    // Clean up after each test
    MonitoringSystem.resetInstance();
  });

  describe('getInstance() method', () => {
    it('should create a single instance when called for the first time', () => {
      const logger = createMockLogger();
      const instance = MonitoringSystem.getInstance(logger);

      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(MonitoringSystem);
    });

    it('should return the same instance on subsequent calls', () => {
      const logger = createMockLogger();
      const instance1 = MonitoringSystem.getInstance(logger);
      const instance2 = MonitoringSystem.getInstance();
      const instance3 = MonitoringSystem.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(instance3);
    });

    it('should create instance with default logger when no logger provided', () => {
      const instance = MonitoringSystem.getInstance();

      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(MonitoringSystem);
    });

    it('should use provided configuration on first call', async () => {
      const logger = createMockLogger();
      const config = {
        enableMetrics: false,
        metricsPort: 8080,
        healthCheckInterval: 30000
      };

      const instance = MonitoringSystem.getInstance(logger, config);
      
      expect(instance).toBeDefined();
      
      // Verify configuration is applied by checking the status
      const status = await instance.getStatus();
      expect(status.metricsEnabled).toBe(false);
    });

    it('should ignore logger and config parameters on subsequent calls', async () => {
      const logger1 = createMockLogger();
      const logger2 = createMockLogger();
      const config1 = { enableMetrics: true, metricsPort: 9090 };
      const config2 = { enableMetrics: false, metricsPort: 8080 };

      const instance1 = MonitoringSystem.getInstance(logger1, config1);
      const instance2 = MonitoringSystem.getInstance(logger2, config2);

      expect(instance1).toBe(instance2);
      
      // Should still use the first configuration
      const status = await instance2.getStatus();
      expect(status.metricsEnabled).toBe(true);
    });

    it('should prevent circular dependency during creation', () => {
      const logger = createMockLogger();
      
      // Manually set the isCreating flag to simulate circular dependency
      (MonitoringSystem as any).isCreating = true;
      
      expect(() => {
        MonitoringSystem.getInstance(logger);
      }).toThrow('MonitoringSystem is already being created. Circular dependency detected.');
      
      // Reset the flag for cleanup
      (MonitoringSystem as any).isCreating = false;
    });
  });

  describe('resetInstance() method', () => {
    it('should reset the singleton instance', () => {
      const logger = createMockLogger();
      const instance1 = MonitoringSystem.getInstance(logger);
      
      expect(MonitoringSystem.hasInstance()).toBe(true);
      
      MonitoringSystem.resetInstance();
      
      expect(MonitoringSystem.hasInstance()).toBe(false);
      
      const instance2 = MonitoringSystem.getInstance(logger);
      
      expect(instance1).not.toBe(instance2);
      expect(instance2).toBeInstanceOf(MonitoringSystem);
    });

    it('should handle reset when no instance exists', () => {
      expect(MonitoringSystem.hasInstance()).toBe(false);
      
      expect(() => {
        MonitoringSystem.resetInstance();
      }).not.toThrow();
      
      expect(MonitoringSystem.hasInstance()).toBe(false);
    });

    it('should shutdown existing instance during reset', async () => {
      const logger = createMockLogger();
      const instance = MonitoringSystem.getInstance(logger);
      
      // Initialize the instance
      await instance.initialize();
      expect((await instance.getStatus()).initialized).toBe(true);
      
      // Reset should shutdown the instance
      MonitoringSystem.resetInstance();
      
      // Create new instance and verify it's not initialized
      const newInstance = MonitoringSystem.getInstance(logger);
      expect((await newInstance.getStatus()).initialized).toBe(false);
    });
  });

  describe('hasInstance() method', () => {
    it('should return false when no instance exists', () => {
      expect(MonitoringSystem.hasInstance()).toBe(false);
    });

    it('should return true when instance exists', () => {
      const logger = createMockLogger();
      MonitoringSystem.getInstance(logger);
      
      expect(MonitoringSystem.hasInstance()).toBe(true);
    });

    it('should return false after reset', () => {
      const logger = createMockLogger();
      MonitoringSystem.getInstance(logger);
      
      expect(MonitoringSystem.hasInstance()).toBe(true);
      
      MonitoringSystem.resetInstance();
      
      expect(MonitoringSystem.hasInstance()).toBe(false);
    });
  });

  describe('Thread Safety and Concurrency', () => {
    it('should handle concurrent getInstance calls', async () => {
      const logger = createMockLogger();
      
      // Simulate concurrent calls to getInstance
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(MonitoringSystem.getInstance(logger))
      );
      
      const instances = await Promise.all(promises);
      
      // All instances should be the same
      const firstInstance = instances[0];
      instances.forEach(instance => {
        expect(instance).toBe(firstInstance);
      });
    });

    it('should maintain singleton property across async operations', async () => {
      const logger = createMockLogger();
      
      const instance1 = MonitoringSystem.getInstance(logger);
      
      // Perform async operations
      await instance1.initialize();
      await instance1.recordMetric('test_metric', 42);
      
      const instance2 = MonitoringSystem.getInstance();
      
      expect(instance1).toBe(instance2);
      expect((await instance2.getStatus()).initialized).toBe(true);
    });
  });

  describe('Integration with Initialization', () => {
    it('should maintain singleton property after initialization', async () => {
      const logger = createMockLogger();
      
      const instance1 = MonitoringSystem.getInstance(logger);
      await instance1.initialize();
      
      const instance2 = MonitoringSystem.getInstance();
      
      expect(instance1).toBe(instance2);
      expect((await instance2.getStatus()).initialized).toBe(true);
    });

    it('should allow reinitialization after reset', async () => {
      const logger = createMockLogger();
      
      // Create and initialize first instance
      const instance1 = MonitoringSystem.getInstance(logger);
      await instance1.initialize();
      expect((await instance1.getStatus()).initialized).toBe(true);
      
      // Reset and create new instance
      MonitoringSystem.resetInstance();
      const instance2 = MonitoringSystem.getInstance(logger);
      
      expect(instance1).not.toBe(instance2);
      expect((await instance2.getStatus()).initialized).toBe(false);
      
      // Initialize new instance
      await instance2.initialize();
      expect((await instance2.getStatus()).initialized).toBe(true);
    });

    it('should handle initialization errors without breaking singleton', async () => {
      const logger = createMockLogger();
      
      const instance1 = MonitoringSystem.getInstance(logger);
      
      // Mock initialization to fail
      const originalInitialize = instance1.initialize;
      instance1.initialize = vi.fn().mockRejectedValue(new Error('Initialization failed'));
      
      // Initialization should fail but singleton should remain intact
      await expect(instance1.initialize()).rejects.toThrow('Initialization failed');
      
      const instance2 = MonitoringSystem.getInstance();
      expect(instance1).toBe(instance2);
      
      // Restore original method and verify it can still be initialized
      instance1.initialize = originalInitialize;
      const result = await instance1.initialize();
      expect(result.success).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up resources during reset', async () => {
      const logger = createMockLogger();
      
      const instance = MonitoringSystem.getInstance(logger);
      await instance.initialize();
      
      // Add some data to the instance
      await instance.recordMetric('test_metric', 100);
      await instance.updateComponentHealth('test_component', { status: 'healthy', responseTime: 50, errorRate: 0 });
      
      const statusBefore = await instance.getStatus();
      expect(statusBefore.metricsCount).toBeGreaterThan(0);
      
      // Reset should clean up resources
      MonitoringSystem.resetInstance();
      
      // New instance should start clean
      const newInstance = MonitoringSystem.getInstance(logger);
      const statusAfter = await newInstance.getStatus();
      expect(statusAfter.metricsCount).toBe(0);
    });

    it('should not leak memory with multiple reset cycles', async () => {
      const logger = createMockLogger();
      
      // Perform multiple create/reset cycles
      for (let i = 0; i < 5; i++) {
        const instance = MonitoringSystem.getInstance(logger);
        await instance.initialize();
        await instance.recordMetric(`test_metric_${i}`, i * 10);
        
        MonitoringSystem.resetInstance();
      }
      
      // Final instance should be clean
      const finalInstance = MonitoringSystem.getInstance(logger);
      const status = await finalInstance.getStatus();
      expect(status.metricsCount).toBe(0);
      expect(status.initialized).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle logger creation errors gracefully', () => {
      // Test with no logger provided (should create default)
      const instance = MonitoringSystem.getInstance();
      
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(MonitoringSystem);
    });

    it('should handle configuration errors gracefully', () => {
      const logger = createMockLogger();
      const invalidConfig = {
        enableMetrics: true,
        metricsPort: -1, // Invalid port
        healthCheckInterval: -1000 // Invalid interval
      };
      
      // Should still create instance despite invalid config
      const instance = MonitoringSystem.getInstance(logger, invalidConfig);
      
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(MonitoringSystem);
    });

    it('should maintain singleton integrity during error conditions', async () => {
      const logger = createMockLogger();
      
      const instance1 = MonitoringSystem.getInstance(logger);
      
      // Cause an error in the instance
      try {
        await instance1.recordMetric('', NaN); // Invalid metric
      } catch (error) {
        // Error is expected
      }
      
      // Singleton should still work
      const instance2 = MonitoringSystem.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});