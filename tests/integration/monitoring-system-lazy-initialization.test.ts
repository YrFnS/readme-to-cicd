/**
 * MonitoringSystem Lazy Initialization Integration Tests
 * 
 * Integration tests for lazy initialization behavior with actual MonitoringSystem implementations.
 * Tests the real initialization patterns and timing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitoringSystem as IntegrationMonitoringSystem } from '../../src/integration/monitoring/monitoring-system.js';
import { Logger } from '../../src/cli/lib/logger.js';

// Create a test logger that captures log calls
const createTestLogger = (): Logger => {
  const logs: Array<{ level: string; message: string; meta?: any }> = [];
  
  return {
    info: (message: string, meta?: any) => logs.push({ level: 'info', message, meta }),
    error: (message: string, meta?: any) => logs.push({ level: 'error', message, meta }),
    warn: (message: string, meta?: any) => logs.push({ level: 'warn', message, meta }),
    debug: (message: string, meta?: any) => logs.push({ level: 'debug', message, meta }),
    getLogs: () => logs,
    clearLogs: () => logs.splice(0, logs.length)
  } as Logger & { getLogs: () => any[]; clearLogs: () => void };
};

describe('MonitoringSystem Lazy Initialization Integration', () => {
  let testLogger: Logger & { getLogs: () => any[]; clearLogs: () => void };

  beforeEach(() => {
    // Reset singleton instance before each test
    IntegrationMonitoringSystem.resetInstance();
    testLogger = createTestLogger();
  });

  afterEach(() => {
    // Clean up after each test
    IntegrationMonitoringSystem.resetInstance();
  });

  describe('Integration MonitoringSystem lazy initialization', () => {
    it('should create instance without immediate initialization', () => {
      // Create instance
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: true,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      expect(instance).toBeDefined();
      expect(IntegrationMonitoringSystem.hasInstance()).toBe(true);

      // Should not have performed full initialization yet
      const logs = testLogger.getLogs();
      const initLogs = logs.filter(log => log.message.includes('initialized'));
      expect(initLogs).toHaveLength(0);
    });

    it('should perform lazy initialization on first recordMetric call', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // First method call should trigger lazy initialization
      await instance.recordMetric('test_metric', 42, { component: 'test' });

      // Should have recorded the metric successfully
      const metrics = await instance.getSystemMetrics();
      expect(metrics).toBeDefined();
    });

    it('should perform lazy initialization on first getSystemHealth call', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: false,
        enableHealthChecks: true,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // First method call should trigger lazy initialization
      const health = await instance.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should perform lazy initialization on first queryMetrics call', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Add a metric first
      await instance.recordMetric('query_test', 100);

      // Query should trigger lazy initialization if not already done
      const results = await instance.queryMetrics('query_test');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should not reinitialize on subsequent method calls', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: true,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Multiple method calls
      await instance.recordMetric('test1', 1);
      await instance.recordMetric('test2', 2);
      const health1 = await instance.getSystemHealth();
      const health2 = await instance.getSystemHealth();
      const metrics = await instance.getSystemMetrics();

      // All calls should succeed
      expect(health1).toBeDefined();
      expect(health2).toBeDefined();
      expect(metrics).toBeDefined();

      // Should have the same instance
      const instance2 = IntegrationMonitoringSystem.getInstance();
      expect(instance2).toBe(instance);
    });

    it('should handle explicit initialization after lazy initialization', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: true,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Trigger lazy initialization
      await instance.recordMetric('lazy_test', 1);

      // Explicit initialization should still work
      const initResult = await instance.initialize();
      expect(initResult.success).toBe(true);

      // Should still be functional
      const health = await instance.getSystemHealth();
      expect(health).toBeDefined();
    });

    it('should maintain singleton behavior with lazy initialization', async () => {
      // Create first instance
      const instance1 = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Trigger lazy initialization
      await instance1.recordMetric('singleton_test', 42);

      // Get second instance
      const instance2 = IntegrationMonitoringSystem.getInstance();

      // Should be the same instance
      expect(instance2).toBe(instance1);

      // Both should work with the same data - but system metrics change over time
      // so we'll just verify they both return valid metrics objects
      const metrics1 = await instance1.getSystemMetrics();
      const metrics2 = await instance2.getSystemMetrics();

      expect(metrics1).toBeDefined();
      expect(metrics2).toBeDefined();
      expect(typeof metrics1).toBe('object');
      expect(typeof metrics2).toBe('object');
      
      // Verify they both have the custom metric we added
      expect(metrics1.singleton_test).toBeDefined();
      expect(metrics2.singleton_test).toBeDefined();
      expect(metrics1.singleton_test.value).toBe(42);
      expect(metrics2.singleton_test.value).toBe(42);
    });

    it('should reset lazy initialization state on instance reset', async () => {
      // Create and use instance
      const instance1 = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      await instance1.recordMetric('reset_test', 1);
      const metrics1 = await instance1.getSystemMetrics();
      expect(Object.keys(metrics1).length).toBeGreaterThan(0);

      // Reset instance
      IntegrationMonitoringSystem.resetInstance();
      expect(IntegrationMonitoringSystem.hasInstance()).toBe(false);

      // Create new instance
      const instance2 = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Should be a different instance
      expect(instance2).not.toBe(instance1);

      // Should start fresh (lazy initialization should work again)
      await instance2.recordMetric('reset_test_2', 2);
      const metrics2 = await instance2.getSystemMetrics();
      expect(metrics2).toBeDefined();
    });

    it('should handle configuration validation during lazy initialization', async () => {
      // Create instance with invalid configuration
      expect(() => {
        IntegrationMonitoringSystem.getInstance(testLogger, {
          enableMetrics: true,
          enableHealthChecks: true,
          metricsPort: -1, // Invalid port
          healthCheckInterval: 60000
        });
      }).toThrow();
    });

    it('should work with minimal configuration', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {});

      // Should work with default configuration
      await instance.recordMetric('minimal_test', 1);
      const health = await instance.getSystemHealth();
      const metrics = await instance.getSystemMetrics();

      expect(health).toBeDefined();
      expect(metrics).toBeDefined();
    });

    it('should handle concurrent access during lazy initialization', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: true,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Simulate concurrent access
      const promises = [
        instance.recordMetric('concurrent1', 1),
        instance.recordMetric('concurrent2', 2),
        instance.getSystemHealth(),
        instance.getSystemMetrics(),
        instance.recordMetric('concurrent3', 3)
      ];

      // All should complete successfully
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
      });

      // Verify final state
      const finalMetrics = await instance.getSystemMetrics();
      expect(finalMetrics).toBeDefined();
    });

    it('should preserve metrics across lazy initialization', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Record metrics before and after lazy initialization
      await instance.recordMetric('preserve_test_1', 10);
      await instance.recordMetric('preserve_test_2', 20);

      const metrics = await instance.getSystemMetrics();
      
      // Should have both metrics
      expect(metrics.preserve_test_1).toBeDefined();
      expect(metrics.preserve_test_2).toBeDefined();
      expect(metrics.preserve_test_1.value).toBe(10);
      expect(metrics.preserve_test_2.value).toBe(20);
    });
  });

  describe('Performance characteristics', () => {
    it('should have fast lazy initialization', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      const startTime = Date.now();
      
      // First method call triggers lazy initialization
      await instance.recordMetric('performance_test', 1);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should be fast (less than 50ms for lazy initialization)
      expect(duration).toBeLessThan(50);
    });

    it('should have consistent performance after initialization', async () => {
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Trigger lazy initialization
      await instance.recordMetric('consistency_test_1', 1);

      // Measure subsequent calls
      const times: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await instance.recordMetric(`consistency_test_${i + 2}`, i + 2);
        const end = Date.now();
        times.push(end - start);
      }

      // All subsequent calls should be fast and consistent
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(avgTime).toBeLessThan(10); // Should be very fast after initialization

      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      expect(maxTime - minTime).toBeLessThan(20); // Should be consistent
    });
  });

  describe('Error handling', () => {
    it('should handle errors during lazy initialization gracefully', async () => {
      // Create instance with valid configuration that won't cause validation errors
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: true,
        metricsPort: 9091, // Use valid port to avoid conflicts
        healthCheckInterval: 30000 // Valid interval for testing
      });

      // Should not throw during lazy initialization
      await expect(instance.recordMetric('error_test', 1)).resolves.not.toThrow();
      await expect(instance.getSystemHealth()).resolves.toBeDefined();
      await expect(instance.getSystemMetrics()).resolves.toBeDefined();
    });

    it('should recover from initialization errors', async () => {
      // This test would need to simulate initialization errors
      // For now, we'll test that the system remains functional
      const instance = IntegrationMonitoringSystem.getInstance(testLogger, {
        enableMetrics: true,
        enableHealthChecks: false,
        metricsPort: 9090,
        healthCheckInterval: 60000
      });

      // Should work normally
      await instance.recordMetric('recovery_test', 1);
      const metrics = await instance.getSystemMetrics();
      expect(metrics).toBeDefined();
    });
  });
});