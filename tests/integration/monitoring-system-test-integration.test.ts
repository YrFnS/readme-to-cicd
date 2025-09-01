/**
 * MonitoringSystem Test Integration Tests
 * 
 * Integration tests to validate MonitoringSystem works properly with test setup,
 * teardown hooks, and provides expected functionality during test execution.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTestMonitoringSystem,
  isTestMonitoringSystemInitialized,
  resetTestMonitoringSystem
} from '../setup/monitoring-system-setup.js';
import {
  validateTestInfrastructure,
  getTestInfrastructureStatus,
  recordTestMetrics,
  getTestEnvironmentHealth,
  TEST_CONFIG
} from '../setup/test-configuration.js';

describe('MonitoringSystem Test Integration', () => {
  
  beforeEach(() => {
    // Validate test infrastructure is ready before each test
    validateTestInfrastructure();
  });

  afterEach(async () => {
    // Reset MonitoringSystem state after each test
    await resetTestMonitoringSystem();
  });

  describe('Test Infrastructure Validation', () => {
    it('should have test infrastructure ready', () => {
      const status = getTestInfrastructureStatus();
      
      expect(status.ready).toBe(true);
      expect(status.errors).toHaveLength(0);
      expect(status.monitoringSystem).toBe(true);
      expect(status.memoryManagement).toBe(true);
    });

    it('should validate test infrastructure without throwing', () => {
      expect(() => validateTestInfrastructure()).not.toThrow();
    });

    it('should have MonitoringSystem available', () => {
      expect(isTestMonitoringSystemInitialized()).toBe(true);
      
      const monitoringSystem = getTestMonitoringSystem();
      expect(monitoringSystem).toBeDefined();
    });
  });

  describe('Test Environment Health Monitoring', () => {
    it('should provide test environment health status', async () => {
      const health = await getTestEnvironmentHealth();
      
      expect(health).toBeDefined();
      expect(health.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(Array.isArray(health.components)).toBe(true);
      expect(health.components.length).toBeGreaterThan(0);
    });

    it('should include monitoring system in health check', async () => {
      const health = await getTestEnvironmentHealth();
      
      const monitoringComponent = health.components.find(c => c.name === 'monitoring-system');
      expect(monitoringComponent).toBeDefined();
      expect(monitoringComponent?.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });

    it('should include memory management in health check', async () => {
      const health = await getTestEnvironmentHealth();
      
      const memoryComponent = health.components.find(c => c.name === 'memory-management');
      expect(memoryComponent).toBeDefined();
      expect(memoryComponent?.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });
  });

  describe('Test Metrics Recording', () => {
    it('should record test execution metrics', async () => {
      const testName = 'sample-test';
      const duration = 150;
      const status = 'passed';
      
      await expect(
        recordTestMetrics(testName, duration, status)
      ).resolves.not.toThrow();
    });

    it('should handle different test statuses', async () => {
      const testCases = [
        { name: 'test-passed', duration: 100, status: 'passed' as const },
        { name: 'test-failed', duration: 200, status: 'failed' as const },
        { name: 'test-skipped', duration: 0, status: 'skipped' as const }
      ];
      
      for (const testCase of testCases) {
        await expect(
          recordTestMetrics(testCase.name, testCase.duration, testCase.status)
        ).resolves.not.toThrow();
      }
    });

    it('should record custom metrics during tests', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      await expect(
        monitoringSystem.recordMetric('test_integration_metric', 42.5, {
          test_type: 'integration',
          component: 'monitoring-system'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('MonitoringSystem Functionality in Tests', () => {
    let monitoringSystem: ReturnType<typeof getTestMonitoringSystem>;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should provide system health information', async () => {
      const health = await monitoringSystem.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(health.components)).toBe(true);
      expect(typeof health.overall.uptime).toBe('number');
    });

    it('should provide system metrics', async () => {
      const metrics = await monitoringSystem.getSystemMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });

    it('should allow component health updates', async () => {
      await expect(
        monitoringSystem.updateComponentHealth('test-integration-component', {
          status: 'healthy',
          responseTime: 50,
          errorRate: 0.01
        })
      ).resolves.not.toThrow();
    });

    it('should provide monitoring system status', async () => {
      const status = await monitoringSystem.getStatus();
      
      expect(status).toBeDefined();
      expect(status.initialized).toBe(true);
      expect(typeof status.metricsEnabled).toBe('boolean');
      expect(typeof status.healthChecksEnabled).toBe('boolean');
      expect(typeof status.alertsEnabled).toBe('boolean');
    });
  });

  describe('Test Configuration Integration', () => {
    it('should use test-specific configuration', () => {
      expect(TEST_CONFIG).toBeDefined();
      expect(TEST_CONFIG.monitoring.enabled).toBe(true);
      expect(TEST_CONFIG.monitoring.alerting).toBe(false); // Disabled in tests
      expect(TEST_CONFIG.memory.monitoring).toBe(true);
    });

    it('should have appropriate test timeouts configured', () => {
      expect(TEST_CONFIG.performance.timeoutWarning).toBe(5000);
      expect(TEST_CONFIG.performance.timeoutCritical).toBe(30000);
    });

    it('should have memory thresholds configured for tests', () => {
      expect(TEST_CONFIG.memory.thresholdWarning).toBe(400 * 1024 * 1024);
      expect(TEST_CONFIG.memory.thresholdCritical).toBe(600 * 1024 * 1024);
    });
  });

  describe('Test Isolation and Cleanup', () => {
    it('should maintain MonitoringSystem state during test execution', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      // Record a metric
      await monitoringSystem.recordMetric('isolation_test_metric', 100, { test: 'isolation' });
      
      // Verify system is still functional
      const health = await monitoringSystem.getSystemHealth();
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });

    it('should handle reset operations properly', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      // Record some metrics
      await monitoringSystem.recordMetric('pre_reset_metric', 1);
      
      // Reset should not throw
      await expect(resetTestMonitoringSystem()).resolves.not.toThrow();
      
      // System should still be functional after reset
      expect(isTestMonitoringSystemInitialized()).toBe(true);
      
      const postResetSystem = getTestMonitoringSystem();
      await expect(
        postResetSystem.recordMetric('post_reset_metric', 2)
      ).resolves.not.toThrow();
    });

    it('should not interfere between different test cases', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      // This test should not be affected by previous tests
      const initialHealth = await monitoringSystem.getSystemHealth();
      expect(initialHealth).toBeDefined();
      
      // Record test-specific metrics
      await monitoringSystem.recordMetric('test_isolation_check', 1, {
        test_id: 'isolation-test',
        timestamp: new Date().toISOString()
      });
      
      // System should remain healthy
      const finalHealth = await monitoringSystem.getSystemHealth();
      expect(finalHealth.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle MonitoringSystem errors gracefully', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      // Test with potentially problematic inputs
      await expect(
        monitoringSystem.recordMetric('', 0, {})
      ).resolves.not.toThrow();
      
      await expect(
        monitoringSystem.updateComponentHealth('invalid-component', {
          status: 'unknown' as any,
          responseTime: -1,
          errorRate: 10
        })
      ).resolves.not.toThrow();
    });

    it('should maintain functionality after error conditions', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      // Cause some potential errors
      try {
        await monitoringSystem.recordMetric('error-test', NaN);
      } catch (error) {
        // Ignore errors for this test
      }
      
      // System should still be functional
      const health = await monitoringSystem.getSystemHealth();
      expect(health).toBeDefined();
      
      await expect(
        monitoringSystem.recordMetric('recovery-test', 1)
      ).resolves.not.toThrow();
    });
  });

  describe('Performance in Test Environment', () => {
    it('should respond quickly to health checks', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      const startTime = Date.now();
      await monitoringSystem.getSystemHealth();
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time for tests
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('should handle multiple concurrent operations', async () => {
      const monitoringSystem = getTestMonitoringSystem();
      
      const operations = [];
      
      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          monitoringSystem.recordMetric(`concurrent_metric_${i}`, i, { batch: 'concurrent' })
        );
      }
      
      operations.push(monitoringSystem.getSystemHealth());
      operations.push(monitoringSystem.getSystemMetrics());
      
      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should not consume excessive memory during test operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const monitoringSystem = getTestMonitoringSystem();
      
      // Perform many operations
      for (let i = 0; i < 50; i++) {
        await monitoringSystem.recordMetric(`memory_test_${i}`, Math.random());
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 20MB)
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
    });
  });
});