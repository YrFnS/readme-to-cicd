/**
 * MonitoringSystemFactory Tests
 * 
 * Comprehensive tests for the MonitoringSystemFactory class.
 * Validates factory pattern implementation, configuration management,
 * and proper instantiation of different MonitoringSystem types.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MonitoringSystemFactory, MonitoringSystemFactoryConfig } from '../../../src/shared/factories/monitoring-system-factory.js';
import { Logger } from '../../../src/cli/lib/logger.js';

// Mock the MonitoringSystem classes to avoid actual instantiation
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

// Mock dependencies
vi.mock('../../../src/agent-hooks/errors/error-handler.js', () => ({
  ErrorHandler: vi.fn()
}));

vi.mock('../../../src/agent-hooks/performance/performance-monitor.js', () => ({
  PerformanceMonitor: vi.fn()
}));

vi.mock('../../../src/agent-hooks/notifications/notification-system.js', () => ({
  NotificationSystem: vi.fn()
}));

// Import mocked classes
import { MonitoringSystem as AgentHooksMonitoringSystem } from '../../../src/agent-hooks/monitoring/monitoring-system.js';
import { MonitoringSystem as IntegrationMonitoringSystem } from '../../../src/integration/monitoring/monitoring-system.js';

// Create mock logger
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
});

describe('MonitoringSystemFactory', () => {
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    MonitoringSystemFactory.resetAllInstances();
  });

  afterEach(() => {
    // Clean up after each test
    MonitoringSystemFactory.resetAllInstances();
  });

  describe('create() method', () => {
    it('should create agent-hooks MonitoringSystem with valid configuration', async () => {
      const mockInstance = { type: 'agent-hooks' };
      (AgentHooksMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const config: MonitoringSystemFactoryConfig = {
        type: 'agent-hooks',
        logger: createMockLogger(),
        config: {
          metrics: { enabled: true, collectInterval: 60000 },
          alerts: { enabled: true, evaluationInterval: 30000 }
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockInstance);
      }
      expect(AgentHooksMonitoringSystem.getInstance).toHaveBeenCalledOnce();
    });

    it('should create integration MonitoringSystem with valid configuration', async () => {
      const mockInstance = { type: 'integration' };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const config: MonitoringSystemFactoryConfig = {
        type: 'integration',
        logger: createMockLogger(),
        config: {
          enableMetrics: true,
          metricsPort: 9090,
          healthCheckInterval: 60000
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockInstance);
      }
      expect(IntegrationMonitoringSystem.getInstance).toHaveBeenCalledOnce();
    });

    it('should fail with invalid MonitoringSystem type', async () => {
      const config: MonitoringSystemFactoryConfig = {
        type: 'invalid' as any,
        logger: createMockLogger()
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid MonitoringSystem type');
      }
    });

    it('should fail when type is missing', async () => {
      const config = {
        logger: createMockLogger()
      } as MonitoringSystemFactoryConfig;

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('MonitoringSystem type is required');
      }
    });

    it('should handle creation errors gracefully', async () => {
      (IntegrationMonitoringSystem.getInstance as any).mockImplementation(() => {
        throw new Error('Creation failed');
      });

      const config: MonitoringSystemFactoryConfig = {
        type: 'integration',
        logger: createMockLogger()
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create MonitoringSystem');
      }
    });
  });

  describe('createForDevelopment() method', () => {
    it('should create development-optimized integration MonitoringSystem by default', async () => {
      const mockInstance = { type: 'integration-dev' };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForDevelopment();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockInstance);
      }
      expect(IntegrationMonitoringSystem.getInstance).toHaveBeenCalledWith(
        expect.any(Object), // logger
        expect.objectContaining({
          healthCheckInterval: 30000, // More frequent for development
          metricsPort: 9091 // Different port
        })
      );
    });

    it('should create development-optimized agent-hooks MonitoringSystem when specified', async () => {
      const mockInstance = { type: 'agent-hooks-dev' };
      (AgentHooksMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForDevelopment('agent-hooks');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockInstance);
      }
      expect(AgentHooksMonitoringSystem.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: expect.objectContaining({
            collectInterval: 30000 // More frequent for development
          }),
          logging: expect.objectContaining({
            level: 'debug' // Debug logging for development
          })
        }),
        expect.any(Object), // errorHandler
        expect.any(Object), // performanceMonitor
        expect.any(Object)  // notificationSystem
      );
    });
  });

  describe('createForProduction() method', () => {
    it('should create production-optimized integration MonitoringSystem by default', async () => {
      const mockInstance = { type: 'integration-prod' };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForProduction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockInstance);
      }
      expect(IntegrationMonitoringSystem.getInstance).toHaveBeenCalledWith(
        expect.any(Object), // logger
        expect.objectContaining({
          alertingEnabled: true, // Ensure alerting is enabled
          retentionPeriod: 30 * 24 * 60 * 60 * 1000 // 30 days retention
        })
      );
    });

    it('should create production-optimized agent-hooks MonitoringSystem when specified', async () => {
      const mockInstance = { type: 'agent-hooks-prod' };
      (AgentHooksMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForProduction('agent-hooks');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockInstance);
      }
      expect(AgentHooksMonitoringSystem.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          alerts: expect.objectContaining({
            enabled: true // Ensure alerts are enabled
          }),
          logging: expect.objectContaining({
            level: 'info' // Info logging for production
          })
        }),
        expect.any(Object), // errorHandler
        expect.any(Object), // performanceMonitor
        expect.any(Object)  // notificationSystem
      );
    });
  });

  describe('createForTesting() method', () => {
    it('should create test-optimized integration MonitoringSystem by default', async () => {
      const mockInstance = { type: 'integration-test' };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForTesting();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockInstance);
      }
      expect(IntegrationMonitoringSystem.getInstance).toHaveBeenCalledWith(
        expect.any(Object), // logger (should be test logger)
        expect.objectContaining({
          metricsPort: 0, // Random port for testing
          healthCheckInterval: 5000, // Frequent health checks
          alertingEnabled: false, // Disable alerting in tests
          retentionPeriod: 60 * 1000 // 1 minute retention
        })
      );
    });

    it('should create test-optimized agent-hooks MonitoringSystem when specified', async () => {
      const mockInstance = { type: 'agent-hooks-test' };
      (AgentHooksMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const result = await MonitoringSystemFactory.createForTesting('agent-hooks');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockInstance);
      }
      expect(AgentHooksMonitoringSystem.getInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: expect.objectContaining({
            collectInterval: 1000, // Very frequent for testing
            retentionPeriod: '1h' // Short retention
          }),
          tracing: expect.objectContaining({
            enabled: false // Disable tracing in tests
          }),
          logging: expect.objectContaining({
            level: 'error' // Minimal logging in tests
          })
        }),
        expect.any(Object), // errorHandler
        expect.any(Object), // performanceMonitor
        expect.any(Object)  // notificationSystem
      );
    });
  });

  describe('Configuration validation', () => {
    it('should validate agent-hooks metrics collection interval', async () => {
      const config: MonitoringSystemFactoryConfig = {
        type: 'agent-hooks',
        config: {
          metrics: { collectInterval: 500 } // Too low
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Metrics collection interval must be at least 1000ms');
      }
    });

    it('should validate agent-hooks alert evaluation interval', async () => {
      const config: MonitoringSystemFactoryConfig = {
        type: 'agent-hooks',
        config: {
          alerts: { evaluationInterval: 500 } // Too low
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Alert evaluation interval must be at least 1000ms');
      }
    });

    it('should validate integration metrics port range', async () => {
      const config: MonitoringSystemFactoryConfig = {
        type: 'integration',
        config: {
          metricsPort: 70000 // Too high
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Metrics port must be between 0 and 65535');
      }
    });

    it('should validate integration health check interval', async () => {
      const config: MonitoringSystemFactoryConfig = {
        type: 'integration',
        config: {
          healthCheckInterval: 500 // Too low
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Health check interval must be at least 1000ms');
      }
    });

    it('should accept valid configurations', async () => {
      const mockInstance = { type: 'integration' };
      (IntegrationMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const config: MonitoringSystemFactoryConfig = {
        type: 'integration',
        config: {
          metricsPort: 9090,
          healthCheckInterval: 60000
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(true);
    });
  });

  describe('Instance management', () => {
    it('should reset all instances', () => {
      // Clear previous calls from beforeEach
      vi.clearAllMocks();
      
      MonitoringSystemFactory.resetAllInstances();

      expect(AgentHooksMonitoringSystem.resetInstance).toHaveBeenCalledOnce();
      expect(IntegrationMonitoringSystem.resetInstance).toHaveBeenCalledOnce();
    });

    it('should check if any instance exists', () => {
      (AgentHooksMonitoringSystem.hasInstance as any).mockReturnValue(false);
      (IntegrationMonitoringSystem.hasInstance as any).mockReturnValue(false);

      expect(MonitoringSystemFactory.hasAnyInstance()).toBe(false);

      (IntegrationMonitoringSystem.hasInstance as any).mockReturnValue(true);

      expect(MonitoringSystemFactory.hasAnyInstance()).toBe(true);
    });

    it('should handle errors when checking instances', () => {
      (AgentHooksMonitoringSystem.hasInstance as any).mockImplementation(() => {
        throw new Error('Check failed');
      });
      (IntegrationMonitoringSystem.hasInstance as any).mockReturnValue(false);

      expect(MonitoringSystemFactory.hasAnyInstance()).toBe(false);
    });
  });

  describe('Configuration templates', () => {
    it('should provide agent-hooks configuration template', () => {
      const template = MonitoringSystemFactory.getConfigTemplate('agent-hooks');

      expect(template).toHaveProperty('metrics');
      expect(template).toHaveProperty('alerts');
      expect(template).toHaveProperty('healthChecks');
      expect(template).toHaveProperty('tracing');
      expect(template).toHaveProperty('logging');
    });

    it('should provide integration configuration template', () => {
      const template = MonitoringSystemFactory.getConfigTemplate('integration');

      expect(template).toHaveProperty('enableMetrics');
      expect(template).toHaveProperty('enableHealthChecks');
      expect(template).toHaveProperty('metricsPort');
      expect(template).toHaveProperty('metricsPath');
      expect(template).toHaveProperty('healthCheckInterval');
      expect(template).toHaveProperty('alertingEnabled');
      expect(template).toHaveProperty('retentionPeriod');
    });

    it('should throw error for unknown configuration template type', () => {
      expect(() => {
        MonitoringSystemFactory.getConfigTemplate('unknown' as any);
      }).toThrow('Unknown MonitoringSystem type: unknown');
    });
  });

  describe('Default logger creation', () => {
    it('should create logger that respects NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Test development environment
      process.env.NODE_ENV = 'development';
      const devResult = MonitoringSystemFactory.createForDevelopment();
      expect(devResult).resolves.toBeDefined();
      
      // Test production environment
      process.env.NODE_ENV = 'production';
      const prodResult = MonitoringSystemFactory.createForProduction();
      expect(prodResult).resolves.toBeDefined();
      
      // Test test environment
      process.env.NODE_ENV = 'test';
      const testResult = MonitoringSystemFactory.createForTesting();
      expect(testResult).resolves.toBeDefined();
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Dependency injection', () => {
    it('should use provided dependencies for agent-hooks MonitoringSystem', async () => {
      const mockInstance = { type: 'agent-hooks' };
      (AgentHooksMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const mockErrorHandler = { handleError: vi.fn() };
      const mockPerformanceMonitor = { startTimer: vi.fn() };
      const mockNotificationSystem = { sendNotification: vi.fn() };

      const config: MonitoringSystemFactoryConfig = {
        type: 'agent-hooks',
        dependencies: {
          errorHandler: mockErrorHandler as any,
          performanceMonitor: mockPerformanceMonitor as any,
          notificationSystem: mockNotificationSystem as any
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(true);
      expect(AgentHooksMonitoringSystem.getInstance).toHaveBeenCalledWith(
        expect.any(Object), // config
        mockErrorHandler,
        mockPerformanceMonitor,
        mockNotificationSystem
      );
    });

    it('should create default dependencies when not provided', async () => {
      const mockInstance = { type: 'agent-hooks' };
      (AgentHooksMonitoringSystem.getInstance as any).mockReturnValue(mockInstance);

      const config: MonitoringSystemFactoryConfig = {
        type: 'agent-hooks'
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(true);
      expect(AgentHooksMonitoringSystem.getInstance).toHaveBeenCalledWith(
        expect.any(Object), // config
        expect.any(Object), // default errorHandler
        expect.any(Object), // default performanceMonitor
        expect.any(Object)  // default notificationSystem
      );
    });
  });

  describe('Error handling', () => {
    it('should handle missing dependencies gracefully', async () => {
      (AgentHooksMonitoringSystem.getInstance as any).mockImplementation(() => {
        throw new Error('Missing dependencies');
      });

      const config: MonitoringSystemFactoryConfig = {
        type: 'agent-hooks'
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to create MonitoringSystem');
      }
    });

    it('should handle configuration errors gracefully', async () => {
      const config: MonitoringSystemFactoryConfig = {
        type: 'integration',
        config: {
          metricsPort: -1 // Invalid port
        }
      };

      const result = await MonitoringSystemFactory.create(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Metrics port must be between 0 and 65535');
      }
    });
  });
});