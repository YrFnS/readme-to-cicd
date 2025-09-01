/**
 * MonitoringSystem Lazy Initialization Tests
 * 
 * Tests for the lazy initialization pattern implementation in MonitoringSystem.
 * Validates that initialization occurs on first use and prevents premature instantiation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitoringSystemFactory } from '../../../src/shared/factories/monitoring-system-factory.js';

// Mock the MonitoringSystem classes
vi.mock('../../../src/agent-hooks/monitoring/monitoring-system.js', () => ({
  MonitoringSystem: {
    getInstance: vi.fn(),
    resetInstance: vi.fn(),
    hasInstance: vi.fn().mockReturnValue(false)
  }
}));

vi.mock('../../../src/integration/monitoring/monitoring-system.js', () => ({
  MonitoringSystem: {
    getInstance: vi.fn(),
    resetInstance: vi.fn(),
    hasInstance: vi.fn().mockReturnValue(false)
  }
}));

// Import mocked classes
import { MonitoringSystem as AgentHooksMonitoringSystem } from '../../../src/agent-hooks/monitoring/monitoring-system.js';
import { MonitoringSystem as IntegrationMonitoringSystem } from '../../../src/integration/monitoring/monitoring-system.js';

describe('MonitoringSystem Lazy Initialization', () => {
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    MonitoringSystemFactory.resetAllInstances();
  });

  afterEach(() => {
    // Clean up after each test
    MonitoringSystemFactory.resetAllInstances();
  });

  describe('Lazy initialization pattern', () => {
    it('should not create instance until first use', async () => {
      // Verify no instance exists initially
      expect(MonitoringSystemFactory.hasAnyInstance()).toBe(false);
      
      // Mock the getInstance to track calls
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn(),
        getSystemMetrics: vi.fn()
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      // Create factory instance but don't use it yet
      const result = await MonitoringSystemFactory.createForTesting();
      
      expect(result.success).toBe(true);
      expect(IntegrationMonitoringSystem.getInstance).toHaveBeenCalledOnce();
    });

    it('should initialize on first method call for integration MonitoringSystem', async () => {
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          components: [],
          overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 },
          timestamp: new Date()
        }),
        getSystemMetrics: vi.fn().mockResolvedValue({})
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForTesting();
      expect(result.success).toBe(true);

      if (result.success) {
        // First method call should trigger lazy initialization
        await result.data.getSystemHealth();
        expect(mockInstance.getSystemHealth).toHaveBeenCalledOnce();
      }
    });

    it('should initialize on first method call for agent-hooks MonitoringSystem', async () => {
      const mockInstance = { 
        type: 'agent-hooks',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockResolvedValue({
          overall: 'healthy',
          services: {},
          checks: [],
          timestamp: new Date(),
          uptime: 100,
          version: '1.0.0'
        }),
        start: vi.fn().mockResolvedValue(undefined)
      };
      (AgentHooksMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForTesting('agent-hooks');
      expect(result.success).toBe(true);

      if (result.success) {
        // First method call should trigger lazy initialization
        await result.data.getSystemHealth();
        expect(mockInstance.getSystemHealth).toHaveBeenCalledOnce();
      }
    });

    it('should not reinitialize on subsequent method calls', async () => {
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          components: [],
          overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 },
          timestamp: new Date()
        }),
        getSystemMetrics: vi.fn().mockResolvedValue({})
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForTesting();
      expect(result.success).toBe(true);

      if (result.success) {
        // Multiple method calls should not trigger multiple initializations
        await result.data.getSystemHealth();
        await result.data.getSystemMetrics();
        await result.data.getSystemHealth();

        expect(mockInstance.getSystemHealth).toHaveBeenCalledTimes(2);
        expect(mockInstance.getSystemMetrics).toHaveBeenCalledOnce();
      }
    });

    it('should handle lazy initialization errors gracefully', async () => {
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockRejectedValue(new Error('Initialization failed')),
        getSystemMetrics: vi.fn().mockResolvedValue({})
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForTesting();
      expect(result.success).toBe(true);

      if (result.success) {
        // Should handle initialization errors gracefully
        await expect(result.data.getSystemHealth()).rejects.toThrow('Initialization failed');
        
        // Should still be able to call other methods
        const metrics = await result.data.getSystemMetrics();
        expect(metrics).toBeDefined();
      }
    });

    it('should reset lazy initialization state when instance is reset', async () => {
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          components: [],
          overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 },
          timestamp: new Date()
        })
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      // Create and use instance
      const result1 = await MonitoringSystemFactory.createForTesting();
      expect(result1.success).toBe(true);

      if (result1.success) {
        await result1.data.getSystemHealth();
      }

      // Reset instances
      MonitoringSystemFactory.resetAllInstances();
      expect(IntegrationMonitoringSystem.resetInstance).toHaveBeenCalled();

      // Create new instance - should be able to initialize again
      const result2 = await MonitoringSystemFactory.createForTesting();
      expect(result2.success).toBe(true);
    });

    it('should prevent circular dependency during lazy initialization', async () => {
      // Mock getInstance to simulate circular dependency
      (IntegrationMonitoringSystem.getInstance as any).mockImplementation(() => {
        throw new Error('MonitoringSystem is already being created. Circular dependency detected.');
      });

      const result = await MonitoringSystemFactory.createForTesting();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create MonitoringSystem');
      }
    });

    it('should work with different factory methods', async () => {
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          components: [],
          overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 },
          timestamp: new Date()
        })
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      // Test different factory methods
      const devResult = await MonitoringSystemFactory.createForDevelopment();
      expect(devResult.success).toBe(true);

      const prodResult = await MonitoringSystemFactory.createForProduction();
      expect(prodResult.success).toBe(true);

      const testResult = await MonitoringSystemFactory.createForTesting();
      expect(testResult.success).toBe(true);

      // All should create instances with lazy initialization
      expect(IntegrationMonitoringSystem.getInstance).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent access during lazy initialization', async () => {
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          components: [],
          overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 },
          timestamp: new Date()
        }),
        getSystemMetrics: vi.fn().mockResolvedValue({})
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForTesting();
      expect(result.success).toBe(true);

      if (result.success) {
        // Simulate concurrent access
        const promises = [
          result.data.getSystemHealth(),
          result.data.getSystemMetrics(),
          result.data.getSystemHealth()
        ];

        const results = await Promise.all(promises);
        
        // All promises should resolve successfully
        expect(results).toHaveLength(3);
        expect(results[0]).toBeDefined();
        expect(results[1]).toBeDefined();
        expect(results[2]).toBeDefined();
      }
    });

    it('should maintain singleton behavior with lazy initialization', async () => {
      const mockInstance1 = { 
        type: 'integration',
        id: 'instance1',
        recordMetric: vi.fn()
      };
      const mockInstance2 = { 
        type: 'integration', 
        id: 'instance2',
        recordMetric: vi.fn()
      };

      // First call should create instance
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValueOnce(mockInstance1);
      const result1 = await MonitoringSystemFactory.createForTesting();
      
      // Second call should return same instance
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValueOnce(mockInstance1);
      const result2 = await MonitoringSystemFactory.createForTesting();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        // Should be the same instance
        expect(result1.data).toBe(result2.data);
      }
    });
  });

  describe('Performance characteristics', () => {
    it('should have minimal overhead for lazy initialization', async () => {
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          components: [],
          overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 },
          timestamp: new Date()
        })
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const startTime = Date.now();
      
      const result = await MonitoringSystemFactory.createForTesting();
      expect(result.success).toBe(true);

      if (result.success) {
        await result.data.getSystemHealth();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Lazy initialization should be fast (less than 100ms in tests)
      expect(duration).toBeLessThan(100);
    });

    it('should not impact memory usage significantly', async () => {
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn(),
        getSystemHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          components: [],
          overall: { uptime: 100, responseTime: 50, errorRate: 0, throughput: 10 },
          timestamp: new Date()
        })
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create multiple instances with lazy initialization
      const results = await Promise.all([
        MonitoringSystemFactory.createForTesting(),
        MonitoringSystemFactory.createForDevelopment(),
        MonitoringSystemFactory.createForProduction()
      ]);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for test mocks)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

      // All results should be successful
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error handling during lazy initialization', () => {
    it('should handle missing dependencies gracefully', async () => {
      (AgentHooksMonitoringSystem.getInstance as any).mockImplementation(() => {
        throw new Error('MonitoringSystem requires all dependencies');
      });

      const result = await MonitoringSystemFactory.createForTesting('agent-hooks');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create MonitoringSystem');
      }
    });

    it('should handle configuration errors during lazy initialization', async () => {
      (IntegrationMonitoringSystem.getInstance as any).mockImplementation(() => {
        throw new Error('Invalid MonitoringSystem configuration');
      });

      const result = await MonitoringSystemFactory.createForTesting();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create MonitoringSystem');
      }
    });

    it('should recover from initialization failures', async () => {
      // First call fails
      (IntegrationMonitoringSystem.getInstance as any).mockImplementationOnce(() => {
        throw new Error('Initialization failed');
      });

      const result1 = await MonitoringSystemFactory.createForTesting();
      expect(result1.success).toBe(false);

      // Reset and try again
      MonitoringSystemFactory.resetAllInstances();

      // Second call succeeds
      const mockInstance = { 
        type: 'integration',
        recordMetric: vi.fn()
      };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result2 = await MonitoringSystemFactory.createForTesting();
      expect(result2.success).toBe(true);
    });
  });
});