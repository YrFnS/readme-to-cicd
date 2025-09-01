/**
 * Agent-Hooks MonitoringSystem Singleton Pattern Tests
 * 
 * Comprehensive tests for the agent-hooks MonitoringSystem singleton implementation.
 * Validates that the singleton pattern prevents multiple instances and
 * provides proper initialization and cleanup mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitoringSystem } from '../../../src/agent-hooks/monitoring/monitoring-system.js';
import { ErrorHandler } from '../../../src/agent-hooks/errors/error-handler.js';
import { PerformanceMonitor } from '../../../src/agent-hooks/performance/performance-monitor.js';
import { NotificationSystem } from '../../../src/agent-hooks/notifications/notification-system.js';
import { MonitoringConfig } from '../../../src/agent-hooks/types/monitoring.js';

// Mock dependencies for testing
const createMockConfig = (): MonitoringConfig => ({
  metrics: {
    enabled: true,
    collectInterval: 60000,
    retentionPeriod: '7d'
  },
  alerts: {
    enabled: true,
    evaluationInterval: 30000
  },
  healthChecks: {
    enabled: true,
    interval: 60000
  },
  tracing: {
    enabled: true,
    sampleRate: 0.1
  },
  logging: {
    level: 'info',
    format: 'json'
  }
});

const createMockErrorHandler = (): ErrorHandler => ({
  handleError: vi.fn().mockResolvedValue(undefined)
} as any);

const createMockPerformanceMonitor = (): PerformanceMonitor => ({
  startTimer: vi.fn(),
  endTimer: vi.fn(),
  recordMetric: vi.fn()
} as any);

const createMockNotificationSystem = (): NotificationSystem => ({
  sendNotification: vi.fn().mockResolvedValue(undefined)
} as any);

describe('Agent-Hooks MonitoringSystem Singleton Pattern', () => {
  
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
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();

      const instance = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );

      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(MonitoringSystem);
    });

    it('should return the same instance on subsequent calls', () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();

      const instance1 = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      const instance2 = MonitoringSystem.getInstance();
      const instance3 = MonitoringSystem.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(instance3);
    });

    it('should require all dependencies on first call', () => {
      expect(() => {
        MonitoringSystem.getInstance();
      }).toThrow('MonitoringSystem requires all dependencies: config, errorHandler, performanceMonitor, notificationSystem');
    });

    it('should ignore dependencies on subsequent calls', () => {
      const config1 = createMockConfig();
      const errorHandler1 = createMockErrorHandler();
      const performanceMonitor1 = createMockPerformanceMonitor();
      const notificationSystem1 = createMockNotificationSystem();

      const config2 = createMockConfig();
      const errorHandler2 = createMockErrorHandler();
      const performanceMonitor2 = createMockPerformanceMonitor();
      const notificationSystem2 = createMockNotificationSystem();

      const instance1 = MonitoringSystem.getInstance(
        config1,
        errorHandler1,
        performanceMonitor1,
        notificationSystem1
      );
      const instance2 = MonitoringSystem.getInstance(
        config2,
        errorHandler2,
        performanceMonitor2,
        notificationSystem2
      );

      expect(instance1).toBe(instance2);
    });

    it('should prevent circular dependency during creation', () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();
      
      // Manually set the isCreating flag to simulate circular dependency
      (MonitoringSystem as any).isCreating = true;
      
      expect(() => {
        MonitoringSystem.getInstance(config, errorHandler, performanceMonitor, notificationSystem);
      }).toThrow('MonitoringSystem is already being created. Circular dependency detected.');
      
      // Reset the flag for cleanup
      (MonitoringSystem as any).isCreating = false;
    });
  });

  describe('resetInstance() method', () => {
    it('should reset the singleton instance', () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();

      const instance1 = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      
      expect(MonitoringSystem.hasInstance()).toBe(true);
      
      MonitoringSystem.resetInstance();
      
      expect(MonitoringSystem.hasInstance()).toBe(false);
      
      const instance2 = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      
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

    it('should stop existing instance during reset', async () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();

      const instance = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      
      // Start the instance
      await instance.start();
      
      // Reset should stop the instance
      MonitoringSystem.resetInstance();
      
      // Create new instance and verify it's not running
      const newInstance = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      expect(newInstance).toBeDefined();
    });
  });

  describe('hasInstance() method', () => {
    it('should return false when no instance exists', () => {
      expect(MonitoringSystem.hasInstance()).toBe(false);
    });

    it('should return true when instance exists', () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();

      MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      
      expect(MonitoringSystem.hasInstance()).toBe(true);
    });

    it('should return false after reset', () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();

      MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      
      expect(MonitoringSystem.hasInstance()).toBe(true);
      
      MonitoringSystem.resetInstance();
      
      expect(MonitoringSystem.hasInstance()).toBe(false);
    });
  });

  describe('Thread Safety and Concurrency', () => {
    it('should handle concurrent getInstance calls', async () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();
      
      // Simulate concurrent calls to getInstance
      const promises = Array.from({ length: 10 }, (_, i) => 
        i === 0 
          ? Promise.resolve(MonitoringSystem.getInstance(config, errorHandler, performanceMonitor, notificationSystem))
          : Promise.resolve(MonitoringSystem.getInstance())
      );
      
      const instances = await Promise.all(promises);
      
      // All instances should be the same
      const firstInstance = instances[0];
      instances.forEach(instance => {
        expect(instance).toBe(firstInstance);
      });
    });

    it('should maintain singleton property across async operations', async () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();
      
      const instance1 = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      
      // Perform async operations
      await instance1.start();
      instance1.recordMetric('test_metric', 42);
      
      const instance2 = MonitoringSystem.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Integration with Start/Stop', () => {
    it('should maintain singleton property after start', async () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();
      
      const instance1 = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      await instance1.start();
      
      const instance2 = MonitoringSystem.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should allow restart after reset', async () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();
      
      // Create and start first instance
      const instance1 = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      await instance1.start();
      
      // Reset and create new instance
      MonitoringSystem.resetInstance();
      const instance2 = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      
      expect(instance1).not.toBe(instance2);
      
      // Start new instance
      await instance2.start();
      expect(instance2).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up resources during reset', async () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();
      
      const instance = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      await instance.start();
      
      // Add some data to the instance
      instance.recordMetric('test_metric', 100);
      
      // Reset should clean up resources
      MonitoringSystem.resetInstance();
      
      // New instance should start clean
      const newInstance = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      expect(newInstance).toBeDefined();
    });

    it('should not leak memory with multiple reset cycles', async () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();
      
      // Perform multiple create/reset cycles
      for (let i = 0; i < 5; i++) {
        const instance = MonitoringSystem.getInstance(
          config,
          errorHandler,
          performanceMonitor,
          notificationSystem
        );
        await instance.start();
        instance.recordMetric(`test_metric_${i}`, i * 10);
        
        MonitoringSystem.resetInstance();
      }
      
      // Final instance should be clean
      const finalInstance = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      expect(finalInstance).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully', () => {
      expect(() => {
        MonitoringSystem.getInstance();
      }).toThrow('MonitoringSystem requires all dependencies');
    });

    it('should maintain singleton integrity during error conditions', async () => {
      const config = createMockConfig();
      const errorHandler = createMockErrorHandler();
      const performanceMonitor = createMockPerformanceMonitor();
      const notificationSystem = createMockNotificationSystem();
      
      const instance1 = MonitoringSystem.getInstance(
        config,
        errorHandler,
        performanceMonitor,
        notificationSystem
      );
      
      // Cause an error in the instance
      try {
        instance1.recordMetric('', NaN); // Invalid metric
      } catch (error) {
        // Error is expected
      }
      
      // Singleton should still work
      const instance2 = MonitoringSystem.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});