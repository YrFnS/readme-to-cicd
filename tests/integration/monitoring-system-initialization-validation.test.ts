/**
 * MonitoringSystem Initialization Validation Integration Test
 * 
 * Integration test to validate that MonitoringSystem initialization checks
 * work correctly across different test scenarios and system types.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTestMonitoringSystem,
  isTestMonitoringSystemInitialized,
  getMonitoringSystemInitializationError,
  validateMonitoringSystemInitialization
} from '../setup/monitoring-system-setup.js';
import {
  ensureMonitoringSystemInitialized,
  validateMonitoringSystemForTest,
  checkMonitoringSystemInitialization,
  MonitoringSystemInitializationChecks
} from '../setup/monitoring-system-initialization-checks.js';

describe('MonitoringSystem Initialization Validation Integration', () => {
  
  describe('Global Test MonitoringSystem Integration', () => {
    it('should have MonitoringSystem properly initialized from global setup', () => {
      expect(isTestMonitoringSystemInitialized()).toBe(true);
      expect(getMonitoringSystemInitializationError()).toBeNull();
    });

    it('should provide access to initialized MonitoringSystem instance', () => {
      const system = getTestMonitoringSystem();
      expect(system).toBeDefined();
      expect(typeof system.recordMetric).toBe('function');
      expect(typeof system.getStatus).toBe('function');
      expect(typeof system.getSystemHealth).toBe('function');
    });

    it('should validate MonitoringSystem without throwing', () => {
      expect(() => validateMonitoringSystemInitialization()).not.toThrow();
    });
  });

  describe('Initialization Check Integration', () => {
    let monitoringSystem: any;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should pass initialization checks for global test system', async () => {
      const result = await checkMonitoringSystemInitialization(
        monitoringSystem, 
        'global-system-test'
      );
      
      expect(result.isInitialized).toBe(true);
      expect(result.systemType).toBe('integration');
      expect(result.error).toBeUndefined();
    });

    it('should ensure system is initialized without throwing', async () => {
      await expect(
        ensureMonitoringSystemInitialized(monitoringSystem, 'ensure-test')
      ).resolves.not.toThrow();
    });

    it('should validate system for test execution', async () => {
      const result = await validateMonitoringSystemForTest(
        monitoringSystem, 
        'integration-validation-test'
      );
      
      expect(result.isInitialized).toBe(true);
      expect(result.systemType).toBe('integration');
    });
  });

  describe('System Functionality After Initialization Checks', () => {
    let monitoringSystem: any;

    beforeEach(async () => {
      monitoringSystem = getTestMonitoringSystem();
      
      // Ensure system is initialized before each test
      await ensureMonitoringSystemInitialized(monitoringSystem, 'functionality-test');
    });

    it('should be able to record metrics after initialization check', async () => {
      await expect(
        monitoringSystem.recordMetric('integration_test_metric', 1.0, { 
          test: 'initialization-validation',
          timestamp: new Date().toISOString()
        })
      ).resolves.not.toThrow();
    });

    it('should be able to get system status after initialization check', async () => {
      const status = await monitoringSystem.getStatus();
      
      expect(status).toBeDefined();
      expect(status.initialized).toBe(true);
      expect(typeof status.metricsEnabled).toBe('boolean');
      expect(typeof status.healthChecksEnabled).toBe('boolean');
    });

    it('should be able to get system health after initialization check', async () => {
      const health = await monitoringSystem.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(health.components)).toBe(true);
    });

    it('should be able to update component health after initialization check', async () => {
      await expect(
        monitoringSystem.updateComponentHealth('integration-test-component', {
          status: 'healthy',
          responseTime: 25,
          errorRate: 0
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    let monitoringSystem: any;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should handle initialization check errors gracefully', async () => {
      // Create a mock system that will fail initialization checks
      const brokenSystem = {
        getStatus: () => {
          throw new Error('System is broken');
        }
      };

      const result = await checkMonitoringSystemInitialization(
        brokenSystem, 
        'broken-system-test'
      );
      
      expect(result.isInitialized).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('System is broken');
    });

    it('should provide helpful error messages for uninitialized systems', async () => {
      const uninitializedSystem = {
        getStatus: () => ({ initialized: false }),
        recordMetric: () => {},
        getSystemHealth: () => ({ status: 'unhealthy' }),
        initialize: () => {}
      };

      await expect(
        ensureMonitoringSystemInitialized(uninitializedSystem, 'uninitialized-test')
      ).rejects.toThrow('not initialized');
    });

    it('should handle missing methods gracefully in strict mode', async () => {
      const incompleteSystem = {
        recordMetric: () => {}
        // Missing other required methods
      };

      const result = await checkMonitoringSystemInitialization(
        incompleteSystem, 
        'incomplete-test',
        { strictMode: true }
      );
      
      expect(result.isInitialized).toBe(false);
      expect(result.error?.message).toContain('missing required methods');
    });
  });

  describe('Performance Integration', () => {
    let monitoringSystem: any;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should perform initialization checks quickly', async () => {
      const startTime = Date.now();
      
      await checkMonitoringSystemInitialization(monitoringSystem, 'performance-test');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle multiple concurrent initialization checks', async () => {
      const checks = Array.from({ length: 10 }, (_, i) =>
        checkMonitoringSystemInitialization(monitoringSystem, `concurrent-test-${i}`)
      );

      const results = await Promise.all(checks);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.isInitialized).toBe(true);
      });
    });

    it('should not consume excessive memory during checks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many initialization checks
      for (let i = 0; i < 50; i++) {
        await checkMonitoringSystemInitialization(monitoringSystem, `memory-test-${i}`);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 5MB)
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Utility Object Integration', () => {
    let monitoringSystem: any;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should work through MonitoringSystemInitializationChecks utility', async () => {
      const result = await MonitoringSystemInitializationChecks.check(
        monitoringSystem, 
        'utility-integration-test'
      );
      
      expect(result.isInitialized).toBe(true);
    });

    it('should provide consistent results across different access methods', async () => {
      const directResult = await checkMonitoringSystemInitialization(
        monitoringSystem, 
        'direct-test'
      );
      
      const utilityResult = await MonitoringSystemInitializationChecks.check(
        monitoringSystem, 
        'utility-test'
      );
      
      expect(directResult.isInitialized).toBe(utilityResult.isInitialized);
      expect(directResult.systemType).toBe(utilityResult.systemType);
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('should work in typical test beforeEach scenario', async () => {
      // Simulate a typical test setup
      let testMonitoringSystem: any;
      
      // Setup (like beforeEach)
      testMonitoringSystem = getTestMonitoringSystem();
      await validateMonitoringSystemForTest(testMonitoringSystem, 'real-world-test');
      
      // Test execution
      await testMonitoringSystem.recordMetric('real_world_metric', 42);
      const status = await testMonitoringSystem.getStatus();
      
      expect(status.initialized).toBe(true);
    });

    it('should handle test isolation correctly', async () => {
      // First test
      const system1 = getTestMonitoringSystem();
      await ensureMonitoringSystemInitialized(system1, 'isolation-test-1');
      await system1.recordMetric('isolation_metric_1', 1);
      
      // Second test (should get same system but it should still work)
      const system2 = getTestMonitoringSystem();
      await ensureMonitoringSystemInitialized(system2, 'isolation-test-2');
      await system2.recordMetric('isolation_metric_2', 2);
      
      expect(system1).toBe(system2); // Should be same instance
    });

    it('should provide clear error messages for debugging', async () => {
      const nullSystem = null;
      
      try {
        await ensureMonitoringSystemInitialized(nullSystem as any, 'debug-test');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('debug-test');
        expect((error as Error).message).toContain('not initialized');
      }
    });
  });

  describe('Configuration and Customization', () => {
    let monitoringSystem: any;

    beforeEach(() => {
      monitoringSystem = getTestMonitoringSystem();
    });

    it('should respect custom configuration for initialization checks', async () => {
      const result = await checkMonitoringSystemInitialization(
        monitoringSystem, 
        'custom-config-test',
        {
          maxRetries: 1,
          retryDelay: 50,
          timeoutMs: 2000,
          strictMode: false
        }
      );
      
      expect(result.isInitialized).toBe(true);
    });

    it('should work with different strictMode settings', async () => {
      // Test with strict mode
      const strictResult = await checkMonitoringSystemInitialization(
        monitoringSystem, 
        'strict-test',
        { strictMode: true }
      );
      
      // Test with non-strict mode
      const nonStrictResult = await checkMonitoringSystemInitialization(
        monitoringSystem, 
        'non-strict-test',
        { strictMode: false }
      );
      
      expect(strictResult.isInitialized).toBe(true);
      expect(nonStrictResult.isInitialized).toBe(true);
    });
  });
});