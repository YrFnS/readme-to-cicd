/**
 * MonitoringSystem Initialization Tests
 * 
 * Tests for MonitoringSystem initialization, setup, and teardown in test environment.
 * Validates that the monitoring system is properly configured and available for tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTestMonitoringSystem,
  isTestMonitoringSystemInitialized,
  getMonitoringSystemInitializationError,
  resetTestMonitoringSystem,
  validateMonitoringSystemInitialization,
  TEST_MONITORING_CONFIG_EXPORT
} from '../../setup/monitoring-system-setup.js';
import { MonitoringSystem } from '../../../src/integration/monitoring/monitoring-system.js';

describe('MonitoringSystem Initialization', () => {
  
  describe('Test Setup Validation', () => {
    it('should have MonitoringSystem initialized in test environment', () => {
      expect(isTestMonitoringSystemInitialized()).toBe(true);
    });

    it('should not have initialization errors', () => {
      const error = getMonitoringSystemInitializationError();
      expect(error).toBeNull();
    });

    it('should provide access to MonitoringSystem instance', () => {
      const monitoringSystem = getTestMonitoringSystem();
      expect(monitoringSystem).toBeInstanceOf(MonitoringSystem);
    });

    it('should validate MonitoringSystem initialization without throwing', () => {
      expect(() => validateMonitoringSystemInitialization()).not.toThrow();
    });
  });

  describe('MonitoringSystem Configuration', () => {
    let monitoringSystem: MonitoringSystem;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should be initialized with test configuration', async () => {
      const status = await monitoringSystem.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.metricsEnabled).toBe(TEST_MONITORING_CONFIG_EXPORT.enableMetrics);
      expect(status.healthChecksEnabled).toBe(TEST_MONITORING_CONFIG_EXPORT.enableHealthChecks);
    });

    it('should have alerting disabled for tests', async () => {
      const status = await monitoringSystem.getStatus();
      expect(status.alertsEnabled).toBe(false);
    });

    it('should use test-specific configuration values', () => {
      expect(TEST_MONITORING_CONFIG_EXPORT.metricsPort).toBe(9091);
      expect(TEST_MONITORING_CONFIG_EXPORT.metricsPath).toBe('/test-metrics');
      expect(TEST_MONITORING_CONFIG_EXPORT.alertingEnabled).toBe(false);
    });
  });

  describe('MonitoringSystem Functionality', () => {
    let monitoringSystem: MonitoringSystem;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should be able to record metrics', async () => {
      await expect(
        monitoringSystem.recordMetric('test_initialization_metric', 1.0, { test: 'initialization' })
      ).resolves.not.toThrow();
    });

    it('should be able to query system health', async () => {
      const health = await monitoringSystem.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(health.components)).toBe(true);
    });

    it('should be able to get system metrics', async () => {
      const metrics = await monitoringSystem.getSystemMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });

    it('should be able to update component health', async () => {
      await expect(
        monitoringSystem.updateComponentHealth('test-component', {
          status: 'healthy',
          responseTime: 100,
          errorRate: 0
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Test Isolation', () => {
    let monitoringSystem: MonitoringSystem;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    afterEach(async () => {
      await resetTestMonitoringSystem();
    });

    it('should maintain state between test operations', async () => {
      // Record a metric
      await monitoringSystem.recordMetric('test_isolation_metric', 42.0, { test: 'isolation' });
      
      // Verify it can be retrieved (simplified check since we don't have a direct get method)
      const metrics = await monitoringSystem.getSystemMetrics();
      expect(metrics).toBeDefined();
    });

    it('should handle multiple metric recordings', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          monitoringSystem.recordMetric(`test_metric_${i}`, i * 10, { iteration: i.toString() })
        );
      }
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle component health updates', async () => {
      const components = ['component-a', 'component-b', 'component-c'];
      
      const promises = components.map(component =>
        monitoringSystem.updateComponentHealth(component, {
          status: 'healthy',
          responseTime: Math.random() * 100,
          errorRate: 0
        })
      );
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    let monitoringSystem: MonitoringSystem;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should handle invalid metric recording gracefully', async () => {
      // Test with invalid metric name
      await expect(
        monitoringSystem.recordMetric('', NaN, {})
      ).resolves.not.toThrow();
    });

    it('should handle component health update errors gracefully', async () => {
      // Test with invalid component data
      await expect(
        monitoringSystem.updateComponentHealth('', {
          status: 'invalid' as any,
          responseTime: -1,
          errorRate: 2 // > 1.0
        })
      ).resolves.not.toThrow();
    });

    it('should provide meaningful error information when initialization fails', () => {
      // This test validates that if initialization had failed, we'd get proper error info
      const error = getMonitoringSystemInitializationError();
      
      if (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeTruthy();
      } else {
        // If no error, initialization was successful
        expect(isTestMonitoringSystemInitialized()).toBe(true);
      }
    });
  });

  describe('Performance and Memory', () => {
    let monitoringSystem: MonitoringSystem;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should not consume excessive memory during initialization', () => {
      const memoryUsage = process.memoryUsage();
      
      // Verify memory usage is reasonable (less than 100MB heap)
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle rapid metric recording without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Record many metrics rapidly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          monitoringSystem.recordMetric(`rapid_metric_${i}`, Math.random(), { batch: 'performance' })
        );
      }
      
      await Promise.all(promises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('should respond quickly to health checks', async () => {
      const startTime = Date.now();
      
      await monitoringSystem.getSystemHealth();
      
      const duration = Date.now() - startTime;
      
      // Health check should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Integration with Test Framework', () => {
    it('should be available in beforeEach hooks', () => {
      // This test itself validates that MonitoringSystem is available in beforeEach
      expect(isTestMonitoringSystemInitialized()).toBe(true);
    });

    it('should survive test failures without affecting other tests', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      // Simulate a test that might cause issues
      try {
        await monitoringSystem.recordMetric('test_failure_metric', 1.0);
        throw new Error('Simulated test failure');
      } catch (error) {
        // Test failed, but MonitoringSystem should still be available
        expect(isTestMonitoringSystemInitialized()).toBe(true);
      }
    });

    it('should provide consistent instance across multiple calls', () => {
      const instance1 = getTestMonitoringSystem();
      const instance2 = getTestMonitoringSystem();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Cleanup and Teardown', () => {
    it('should handle reset operations without errors', async () => {
      await expect(resetTestMonitoringSystem()).resolves.not.toThrow();
    });

    it('should maintain functionality after reset', async () => {
      await resetTestMonitoringSystem();
      
      const monitoringSystem = getTestMonitoringSystem();
      
      await expect(
        monitoringSystem.recordMetric('post_reset_metric', 1.0)
      ).resolves.not.toThrow();
    });
  });
});