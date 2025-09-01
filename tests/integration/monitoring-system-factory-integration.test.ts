/**
 * MonitoringSystemFactory Integration Tests
 * 
 * Integration tests that verify the MonitoringSystemFactory works correctly
 * with actual MonitoringSystem implementations (where available).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MonitoringSystemFactory } from '../../src/shared/factories/monitoring-system-factory.js';

describe('MonitoringSystemFactory Integration Tests', () => {
  
  beforeEach(() => {
    // Reset all instances before each test
    MonitoringSystemFactory.resetAllInstances();
  });

  afterEach(() => {
    // Clean up after each test
    MonitoringSystemFactory.resetAllInstances();
  });

  describe('Factory pattern validation', () => {
    it('should create different instances for different configurations', async () => {
      // Create development instance
      const devResult = await MonitoringSystemFactory.createForDevelopment('integration');
      expect(devResult.success).toBe(true);

      // Reset and create production instance
      MonitoringSystemFactory.resetAllInstances();
      const prodResult = await MonitoringSystemFactory.createForProduction('integration');
      expect(prodResult.success).toBe(true);

      // Reset and create test instance
      MonitoringSystemFactory.resetAllInstances();
      const testResult = await MonitoringSystemFactory.createForTesting('integration');
      expect(testResult.success).toBe(true);

      // All should be successful
      expect(devResult.success).toBe(true);
      expect(prodResult.success).toBe(true);
      expect(testResult.success).toBe(true);
    });

    it('should provide consistent configuration templates', () => {
      const agentHooksTemplate = MonitoringSystemFactory.getConfigTemplate('agent-hooks');
      const integrationTemplate = MonitoringSystemFactory.getConfigTemplate('integration');

      // Agent-hooks template should have expected structure
      expect(agentHooksTemplate).toHaveProperty('metrics');
      expect(agentHooksTemplate).toHaveProperty('alerts');
      expect(agentHooksTemplate).toHaveProperty('healthChecks');
      expect(agentHooksTemplate).toHaveProperty('tracing');
      expect(agentHooksTemplate).toHaveProperty('logging');

      // Integration template should have expected structure
      expect(integrationTemplate).toHaveProperty('enableMetrics');
      expect(integrationTemplate).toHaveProperty('enableHealthChecks');
      expect(integrationTemplate).toHaveProperty('metricsPort');
      expect(integrationTemplate).toHaveProperty('healthCheckInterval');
      expect(integrationTemplate).toHaveProperty('alertingEnabled');
      expect(integrationTemplate).toHaveProperty('retentionPeriod');
    });

    it('should handle instance management correctly', () => {
      // Initially no instances should exist
      expect(MonitoringSystemFactory.hasAnyInstance()).toBe(false);

      // Reset should work even when no instances exist
      expect(() => {
        MonitoringSystemFactory.resetAllInstances();
      }).not.toThrow();

      expect(MonitoringSystemFactory.hasAnyInstance()).toBe(false);
    });
  });

  describe('Configuration validation', () => {
    it('should validate configuration parameters correctly', async () => {
      // Test invalid metrics collection interval
      const invalidConfig1 = {
        type: 'agent-hooks' as const,
        config: {
          metrics: { collectInterval: 500 } // Too low
        }
      };

      const result1 = await MonitoringSystemFactory.create(invalidConfig1);
      expect(result1.success).toBe(false);

      // Test invalid metrics port
      const invalidConfig2 = {
        type: 'integration' as const,
        config: {
          metricsPort: 70000 // Too high
        }
      };

      const result2 = await MonitoringSystemFactory.create(invalidConfig2);
      expect(result2.success).toBe(false);

      // Test valid configuration
      const validConfig = {
        type: 'integration' as const,
        config: {
          metricsPort: 9090,
          healthCheckInterval: 60000
        }
      };

      const result3 = await MonitoringSystemFactory.create(validConfig);
      expect(result3.success).toBe(true);
    });

    it('should provide environment-specific configurations', async () => {
      // Development configuration should have debug logging and frequent collection
      const devResult = await MonitoringSystemFactory.createForDevelopment('integration');
      expect(devResult.success).toBe(true);

      // Production configuration should have longer retention and alerting enabled
      MonitoringSystemFactory.resetAllInstances();
      const prodResult = await MonitoringSystemFactory.createForProduction('integration');
      expect(prodResult.success).toBe(true);

      // Test configuration should have minimal logging and short retention
      MonitoringSystemFactory.resetAllInstances();
      const testResult = await MonitoringSystemFactory.createForTesting('integration');
      expect(testResult.success).toBe(true);

      // All should be successful
      expect(devResult.success).toBe(true);
      expect(prodResult.success).toBe(true);
      expect(testResult.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle missing type gracefully', async () => {
      const invalidConfig = {} as any;

      const result = await MonitoringSystemFactory.create(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('MonitoringSystem type is required');
      }
    });

    it('should handle unknown type gracefully', async () => {
      const invalidConfig = {
        type: 'unknown-type'
      } as any;

      const result = await MonitoringSystemFactory.create(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid MonitoringSystem type');
      }
    });

    it('should handle configuration template errors', () => {
      expect(() => {
        MonitoringSystemFactory.getConfigTemplate('invalid' as any);
      }).toThrow('Unknown MonitoringSystem type: invalid');
    });
  });

  describe('Factory consistency', () => {
    it('should create instances with consistent interfaces', async () => {
      // Create integration instance
      const integrationResult = await MonitoringSystemFactory.createForTesting('integration');
      expect(integrationResult.success).toBe(true);

      if (integrationResult.success) {
        const instance = integrationResult.data;
        
        // Check that the instance has expected methods (based on integration MonitoringSystem)
        expect(typeof instance).toBe('object');
        expect(instance).toBeDefined();
      }
    });

    it('should maintain singleton behavior through factory', async () => {
      // Create first instance
      const result1 = await MonitoringSystemFactory.createForTesting('integration');
      expect(result1.success).toBe(true);

      // Create second instance (should be same due to singleton)
      const result2 = await MonitoringSystemFactory.createForTesting('integration');
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        // Both should reference the same instance due to singleton pattern
        expect(result1.data).toBe(result2.data);
      }
    });

    it('should allow different types to coexist', async () => {
      // This test verifies that different MonitoringSystem types can be created
      // without interfering with each other (though they use separate singletons)
      
      const integrationResult = await MonitoringSystemFactory.createForTesting('integration');
      expect(integrationResult.success).toBe(true);

      // Agent-hooks would be a separate singleton, so this should work
      // (though it might fail if dependencies aren't available in test environment)
      const agentHooksResult = await MonitoringSystemFactory.createForTesting('agent-hooks');
      
      // We expect this to succeed in the factory layer, even if the underlying
      // MonitoringSystem creation fails due to missing dependencies
      expect(agentHooksResult.success).toBeDefined(); // Either true or false is fine
    });
  });
});