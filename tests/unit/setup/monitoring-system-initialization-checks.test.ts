/**
 * MonitoringSystem Initialization Checks Tests
 * 
 * Comprehensive tests for the MonitoringSystem initialization check utilities.
 * Validates that initialization checks work correctly across different system types
 * and error conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkMonitoringSystemInitialization,
  ensureMonitoringSystemInitialized,
  validateMonitoringSystemForTest,
  createInitializationGuard,
  createTestSafeMonitoringSystem,
  configureInitializationChecks,
  getInitializationCheckConfig,
  getLastCheckResult,
  clearCheckResults,
  MonitoringSystemInitializationChecks,
  type InitializationCheckResult,
  type InitializationCheckConfig
} from '../../setup/monitoring-system-initialization-checks.js';

// Mock MonitoringSystem implementations for testing
class MockIntegrationMonitoringSystem {
  private initialized = false;
  
  constructor(shouldInitialize = true) {
    this.initialized = shouldInitialize;
  }
  
  async initialize() {
    this.initialized = true;
    return { success: true };
  }
  
  async getStatus() {
    return {
      initialized: this.initialized,
      metricsEnabled: true,
      healthChecksEnabled: true,
      alertsEnabled: false
    };
  }
  
  async recordMetric(name: string, value: number, labels: Record<string, string> = {}) {
    if (!this.initialized) {
      throw new Error('MonitoringSystem not initialized');
    }
  }
  
  async getSystemHealth() {
    if (!this.initialized) {
      throw new Error('MonitoringSystem not initialized');
    }
    
    return {
      status: 'healthy',
      components: [],
      overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 },
      timestamp: new Date()
    };
  }
}

class MockAgentHooksMonitoringSystem {
  private started = false;
  
  constructor(shouldStart = true) {
    this.started = shouldStart;
  }
  
  async start() {
    this.started = true;
  }
  
  async stop() {
    this.started = false;
  }
  
  recordMetric(name: string, value: number, labels: Record<string, string> = {}) {
    if (!this.started) {
      throw new Error('MonitoringSystem not started');
    }
  }
  
  async getSystemHealth() {
    if (!this.started) {
      throw new Error('MonitoringSystem not started');
    }
    
    return {
      overall: 'healthy',
      services: [],
      checks: [],
      timestamp: new Date(),
      uptime: 100,
      version: '1.0.0'
    };
  }
}

class MockComprehensiveMonitoringSystem {
  private initialized = false;
  
  constructor(shouldInitialize = true) {
    this.initialized = shouldInitialize;
  }
  
  async initialize() {
    this.initialized = true;
  }
  
  async collectMetrics(source: string, metrics: any[]) {
    if (!this.initialized) {
      throw new Error('MonitoringSystem not initialized');
    }
  }
  
  async queryMetrics(query: any) {
    if (!this.initialized) {
      throw new Error('MonitoringSystem not initialized');
    }
    return [];
  }
  
  async getHealthStatus() {
    if (!this.initialized) {
      throw new Error('MonitoringSystem not initialized');
    }
    
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      checks: [],
      lastUpdated: new Date()
    };
  }
}

class MockBrokenMonitoringSystem {
  async getStatus() {
    throw new Error('System is broken');
  }
  
  recordMetric() {
    throw new Error('Cannot record metrics');
  }
}

describe('MonitoringSystem Initialization Checks', () => {
  
  beforeEach(() => {
    // Reset configuration to defaults before each test
    configureInitializationChecks({
      maxRetries: 3,
      retryDelay: 10, // Reduced for faster tests
      timeoutMs: 1000,
      strictMode: true,
      allowPartialInitialization: false
    });
    
    clearCheckResults();
  });

  afterEach(() => {
    clearCheckResults();
  });

  describe('Configuration Management', () => {
    it('should allow configuration updates', () => {
      const newConfig: Partial<InitializationCheckConfig> = {
        maxRetries: 5,
        retryDelay: 200,
        strictMode: false
      };
      
      configureInitializationChecks(newConfig);
      
      const currentConfig = getInitializationCheckConfig();
      expect(currentConfig.maxRetries).toBe(5);
      expect(currentConfig.retryDelay).toBe(200);
      expect(currentConfig.strictMode).toBe(false);
    });

    it('should preserve unmodified configuration values', () => {
      const originalConfig = getInitializationCheckConfig();
      
      configureInitializationChecks({ maxRetries: 10 });
      
      const updatedConfig = getInitializationCheckConfig();
      expect(updatedConfig.maxRetries).toBe(10);
      expect(updatedConfig.timeoutMs).toBe(originalConfig.timeoutMs);
      expect(updatedConfig.strictMode).toBe(originalConfig.strictMode);
    });
  });

  describe('Integration MonitoringSystem Checks', () => {
    it('should successfully check initialized integration system', async () => {
      const system = new MockIntegrationMonitoringSystem(true);
      
      const result = await checkMonitoringSystemInitialization(system, 'integration-test');
      
      expect(result.isInitialized).toBe(true);
      expect(result.systemType).toBe('integration');
      expect(result.error).toBeUndefined();
    });

    it('should detect uninitialized integration system', async () => {
      const system = new MockIntegrationMonitoringSystem(false);
      
      const result = await checkMonitoringSystemInitialization(system, 'integration-test');
      
      expect(result.isInitialized).toBe(false);
      expect(result.systemType).toBe('integration');
    });

    it('should handle integration system initialization errors', async () => {
      const system = new MockBrokenMonitoringSystem();
      
      const result = await checkMonitoringSystemInitialization(system, 'broken-test');
      
      expect(result.isInitialized).toBe(false);
      expect(result.error).toBeDefined();
      // The error could be either from getStatus or recordMetric
      expect(result.error?.message).toMatch(/System is broken|Cannot record metrics/);
    });
  });

  describe('Agent-Hooks MonitoringSystem Checks', () => {
    it('should successfully check started agent-hooks system', async () => {
      const system = new MockAgentHooksMonitoringSystem(true);
      
      const result = await checkMonitoringSystemInitialization(system, 'agent-hooks-test');
      
      expect(result.isInitialized).toBe(true);
      expect(result.systemType).toBe('agent-hooks');
      expect(result.error).toBeUndefined();
    });

    it('should detect unstarted agent-hooks system', async () => {
      const system = new MockAgentHooksMonitoringSystem(false);
      
      const result = await checkMonitoringSystemInitialization(system, 'agent-hooks-test');
      
      expect(result.isInitialized).toBe(false);
      expect(result.systemType).toBe('agent-hooks');
      expect(result.error).toBeDefined();
    });
  });

  describe('Comprehensive MonitoringSystem Checks', () => {
    it('should successfully check initialized comprehensive system', async () => {
      const system = new MockComprehensiveMonitoringSystem(true);
      
      const result = await checkMonitoringSystemInitialization(system, 'comprehensive-test');
      
      expect(result.isInitialized).toBe(true);
      expect(result.systemType).toBe('comprehensive');
      expect(result.error).toBeUndefined();
    });

    it('should detect uninitialized comprehensive system', async () => {
      const system = new MockComprehensiveMonitoringSystem(false);
      
      const result = await checkMonitoringSystemInitialization(system, 'comprehensive-test');
      
      expect(result.isInitialized).toBe(false);
      expect(result.systemType).toBe('comprehensive');
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle null/undefined systems', async () => {
      const result = await checkMonitoringSystemInitialization(null as any, 'null-test');
      
      expect(result.isInitialized).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('null or undefined');
    });

    it('should handle systems with missing methods in strict mode', async () => {
      // Create a system that looks like integration type but is missing methods
      const incompleteSystem = {
        getStatus: () => ({ initialized: true }),
        recordMetric: () => {}
        // Missing getSystemHealth and initialize methods
      };
      
      const result = await checkMonitoringSystemInitialization(
        incompleteSystem, 
        'incomplete-test',
        { strictMode: true, allowPartialInitialization: false }
      );
      
      expect(result.isInitialized).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('missing required methods');
    });

    it('should allow partial initialization when configured', async () => {
      const incompleteSystem = {
        recordMetric: () => {}
      };
      
      configureInitializationChecks({ 
        strictMode: false, 
        allowPartialInitialization: true 
      });
      
      const result = await checkMonitoringSystemInitialization(
        incompleteSystem, 
        'partial-test'
      );
      
      expect(result.isInitialized).toBe(true);
      expect(result.systemType).toBe('unknown');
    });

    it('should implement retry logic for transient failures', async () => {
      let attemptCount = 0;
      const flakySystem = {
        async getStatus() {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Transient failure');
          }
          return { initialized: true };
        },
        recordMetric: () => {},
        async getSystemHealth() { 
          return { status: 'healthy', components: [], overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 }, timestamp: new Date() };
        },
        async initialize() { return { success: true }; }
      };
      
      const result = await checkMonitoringSystemInitialization(
        flakySystem, 
        'flaky-test',
        { maxRetries: 2, retryDelay: 10 } // maxRetries: 2 means 3 total attempts (initial + 2 retries)
      );
      
      expect(result.isInitialized).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should respect timeout configuration', async () => {
      const slowSystem = {
        async getStatus() {
          await new Promise(resolve => setTimeout(resolve, 200));
          return { initialized: true };
        },
        recordMetric: () => {},
        getSystemHealth: () => ({ status: 'healthy' }),
        initialize: () => {}
      };
      
      const result = await checkMonitoringSystemInitialization(
        slowSystem, 
        'slow-test',
        { timeoutMs: 100 }
      );
      
      expect(result.isInitialized).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });
  });

  describe('ensureMonitoringSystemInitialized', () => {
    it('should not throw for initialized system', async () => {
      const system = new MockIntegrationMonitoringSystem(true);
      
      await expect(
        ensureMonitoringSystemInitialized(system, 'ensure-test')
      ).resolves.not.toThrow();
    });

    it('should throw for uninitialized system', async () => {
      const system = new MockIntegrationMonitoringSystem(false);
      
      await expect(
        ensureMonitoringSystemInitialized(system, 'ensure-test')
      ).rejects.toThrow('not initialized');
    });

    it('should provide detailed error messages', async () => {
      const system = new MockBrokenMonitoringSystem();
      
      await expect(
        ensureMonitoringSystemInitialized(system, 'broken-ensure-test')
      ).rejects.toThrow('broken-ensure-test');
    });
  });

  describe('validateMonitoringSystemForTest', () => {
    it('should validate system for test execution', async () => {
      const system = new MockIntegrationMonitoringSystem(true);
      
      const result = await validateMonitoringSystemForTest(
        system, 
        'sample-test'
      );
      
      expect(result.isInitialized).toBe(true);
      expect(result.systemType).toBe('integration');
    });

    it('should throw with test-specific error message', async () => {
      const system = new MockIntegrationMonitoringSystem(false);
      
      await expect(
        validateMonitoringSystemForTest(system, 'failing-test')
      ).rejects.toThrow("Test 'failing-test' cannot proceed");
    });

    it('should always use strict mode for test validation', async () => {
      // Create a system that looks like integration type but is missing methods
      const incompleteSystem = { 
        getStatus: () => ({ initialized: true }),
        recordMetric: () => {}
        // Missing getSystemHealth and initialize methods
      };
      
      // Even with global non-strict mode
      configureInitializationChecks({ strictMode: false, allowPartialInitialization: true });
      
      await expect(
        validateMonitoringSystemForTest(incompleteSystem, 'strict-test')
      ).rejects.toThrow('cannot proceed');
    });
  });

  describe('createInitializationGuard', () => {
    it('should create a guarded system that checks initialization', async () => {
      const system = new MockIntegrationMonitoringSystem(true);
      const guardedSystem = createInitializationGuard(system, 'guarded-test');
      
      // Should work for initialized system
      await expect(
        guardedSystem.recordMetric('test_metric', 1)
      ).resolves.not.toThrow();
    });

    it('should prevent method calls on uninitialized system', async () => {
      const system = new MockIntegrationMonitoringSystem(false);
      const guardedSystem = createInitializationGuard(system, 'guarded-test');
      
      // Should throw for uninitialized system
      await expect(
        guardedSystem.recordMetric('test_metric', 1)
      ).rejects.toThrow('not initialized');
    });

    it('should preserve non-function properties', () => {
      const system = {
        recordMetric: () => {},
        getStatus: () => ({ initialized: true }),
        config: { enabled: true },
        name: 'test-system'
      };
      
      const guardedSystem = createInitializationGuard(system, 'property-test');
      
      expect(guardedSystem.config).toEqual({ enabled: true });
      expect(guardedSystem.name).toBe('test-system');
    });
  });

  describe('createTestSafeMonitoringSystem', () => {
    it('should create a test-safe system from factory', async () => {
      const factory = () => new MockIntegrationMonitoringSystem(true);
      
      const safeSystem = await createTestSafeMonitoringSystem(
        factory,
        'factory-test'
      );
      
      expect(safeSystem).toBeDefined();
      await expect(
        safeSystem.recordMetric('test_metric', 1)
      ).resolves.not.toThrow();
    });

    it('should reject factory that creates uninitialized system', async () => {
      const factory = () => new MockIntegrationMonitoringSystem(false);
      
      await expect(
        createTestSafeMonitoringSystem(factory, 'factory-fail-test')
      ).rejects.toThrow('Failed to create test-safe MonitoringSystem');
    });

    it('should handle async factories', async () => {
      const asyncFactory = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return new MockIntegrationMonitoringSystem(true);
      };
      
      const safeSystem = await createTestSafeMonitoringSystem(
        asyncFactory,
        'async-factory-test'
      );
      
      expect(safeSystem).toBeDefined();
    });
  });

  describe('Result Caching and Retrieval', () => {
    it('should cache check results', async () => {
      const system = new MockIntegrationMonitoringSystem(true);
      
      await checkMonitoringSystemInitialization(system, 'cache-test');
      
      const cachedResult = getLastCheckResult('cache-test');
      expect(cachedResult).toBeDefined();
      expect(cachedResult?.isInitialized).toBe(true);
      expect(cachedResult?.systemType).toBe('integration');
    });

    it('should return undefined for non-existent cached results', () => {
      const result = getLastCheckResult('non-existent');
      expect(result).toBeUndefined();
    });

    it('should clear cached results', async () => {
      const system = new MockIntegrationMonitoringSystem(true);
      
      await checkMonitoringSystemInitialization(system, 'clear-test');
      expect(getLastCheckResult('clear-test')).toBeDefined();
      
      clearCheckResults();
      expect(getLastCheckResult('clear-test')).toBeUndefined();
    });
  });

  describe('MonitoringSystemInitializationChecks Utility Object', () => {
    it('should provide all utility functions', () => {
      expect(typeof MonitoringSystemInitializationChecks.check).toBe('function');
      expect(typeof MonitoringSystemInitializationChecks.ensure).toBe('function');
      expect(typeof MonitoringSystemInitializationChecks.validate).toBe('function');
      expect(typeof MonitoringSystemInitializationChecks.guard).toBe('function');
      expect(typeof MonitoringSystemInitializationChecks.createTestSafe).toBe('function');
      expect(typeof MonitoringSystemInitializationChecks.configure).toBe('function');
      expect(typeof MonitoringSystemInitializationChecks.getConfig).toBe('function');
      expect(typeof MonitoringSystemInitializationChecks.getLastResult).toBe('function');
      expect(typeof MonitoringSystemInitializationChecks.clearResults).toBe('function');
    });

    it('should work through utility object', async () => {
      const system = new MockIntegrationMonitoringSystem(true);
      
      const result = await MonitoringSystemInitializationChecks.check(
        system, 
        'utility-test'
      );
      
      expect(result.isInitialized).toBe(true);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle systems that throw during method detection', async () => {
      const problematicSystem = new Proxy({}, {
        get() {
          throw new Error('Property access failed');
        }
      });
      
      const result = await checkMonitoringSystemInitialization(
        problematicSystem, 
        'problematic-test'
      );
      
      expect(result.isInitialized).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle systems with circular references', async () => {
      const circularSystem: any = {
        recordMetric: () => {},
        getStatus: () => ({ initialized: true })
      };
      circularSystem.self = circularSystem;
      
      const result = await checkMonitoringSystemInitialization(
        circularSystem, 
        'circular-test'
      );
      
      expect(result.isInitialized).toBe(true);
    });

    it('should handle very slow initialization checks', async () => {
      const verySlowSystem = {
        async getStatus() {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { initialized: true };
        },
        recordMetric: () => {},
        getSystemHealth: () => ({ status: 'healthy' }),
        initialize: () => {}
      };
      
      const result = await checkMonitoringSystemInitialization(
        verySlowSystem, 
        'very-slow-test',
        { timeoutMs: 500 }
      );
      
      expect(result.isInitialized).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with many check operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many initialization checks
      for (let i = 0; i < 100; i++) {
        const system = new MockIntegrationMonitoringSystem(true);
        await checkMonitoringSystemInitialization(system, `perf-test-${i}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it('should complete checks quickly for healthy systems', async () => {
      const system = new MockIntegrationMonitoringSystem(true);
      
      const startTime = Date.now();
      await checkMonitoringSystemInitialization(system, 'performance-test');
      const duration = Date.now() - startTime;
      
      // Should complete within 100ms for healthy system
      expect(duration).toBeLessThan(100);
    });
  });
});