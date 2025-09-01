/**
 * MonitoringSystem Configuration Validation Integration Tests
 * 
 * Integration tests for MonitoringSystem configuration validation
 * including initialization, updates, and error handling scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MonitoringSystem } from '../../src/integration/monitoring/monitoring-system';
import { Logger } from '../../src/cli/lib/logger';

describe('MonitoringSystem Configuration Validation Integration', () => {
  let logger: Logger;

  beforeEach(() => {
    // Reset singleton before each test
    MonitoringSystem.resetInstance();
    
    // Create test logger
    logger = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {}
    } as Logger;
  });

  afterEach(async () => {
    // Clean up singleton after each test
    if (MonitoringSystem.hasInstance()) {
      const instance = MonitoringSystem.getInstance();
      await instance.shutdown();
    }
    MonitoringSystem.resetInstance();
  });

  describe('Initialization with Configuration Validation', () => {
    it('should initialize successfully with valid configuration', async () => {
      const validConfig = {
        enableMetrics: true,
        enableHealthChecks: true,
        metricsPort: 9091,
        metricsPath: '/test-metrics',
        healthCheckInterval: 30000,
        alertingEnabled: false,
        retentionPeriod: 300000 // 5 minutes
      };

      const monitoringSystem = MonitoringSystem.getInstance(logger, validConfig);
      const result = await monitoringSystem.initialize();

      expect(result.success).toBe(true);
      
      const status = await monitoringSystem.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.metricsEnabled).toBe(true);
      expect(status.healthChecksEnabled).toBe(true);
      expect(status.alertsEnabled).toBe(false);
    });

    it('should throw error during initialization with invalid configuration', () => {
      const invalidConfig = {
        metricsPort: -1,
        healthCheckInterval: 1000, // too short
        retentionPeriod: 30000 // too short
      };

      expect(() => {
        MonitoringSystem.getInstance(logger, invalidConfig);
      }).toThrow(/Invalid MonitoringSystem configuration/);
    });

    it('should apply default configuration when no config provided', async () => {
      const monitoringSystem = MonitoringSystem.getInstance(logger);
      const result = await monitoringSystem.initialize();

      expect(result.success).toBe(true);
      
      const config = monitoringSystem.getConfiguration();
      expect(config.enableMetrics).toBe(true);
      expect(config.enableHealthChecks).toBe(true);
      expect(config.metricsPort).toBe(9090);
      expect(config.metricsPath).toBe('/metrics');
      expect(config.healthCheckInterval).toBe(60000);
      expect(config.alertingEnabled).toBe(true);
      expect(config.retentionPeriod).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should merge partial configuration with defaults', async () => {
      const partialConfig = {
        metricsPort: 8080,
        alertingEnabled: false
      };

      const monitoringSystem = MonitoringSystem.getInstance(logger, partialConfig);
      const result = await monitoringSystem.initialize();

      expect(result.success).toBe(true);
      
      const config = monitoringSystem.getConfiguration();
      expect(config.metricsPort).toBe(8080);
      expect(config.alertingEnabled).toBe(false);
      expect(config.enableMetrics).toBe(true); // default
      expect(config.healthCheckInterval).toBe(60000); // default
    });
  });

  describe('Static Configuration Validation', () => {
    it('should validate configuration without creating instance', () => {
      const validConfig = {
        enableMetrics: true,
        metricsPort: 9090
      };

      const result = MonitoringSystem.validateConfiguration(validConfig);

      expect(result.success).toBe(true);
      expect(result.data.enableMetrics).toBe(true);
      expect(result.data.metricsPort).toBe(9090);
    });

    it('should reject invalid configuration in static validation', () => {
      const invalidConfig = {
        metricsPort: 'invalid' as any,
        healthCheckInterval: -1000
      };

      const result = MonitoringSystem.validateConfiguration(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Configuration validation failed');
    });

    it('should return default configuration', () => {
      const defaultConfig = MonitoringSystem.getDefaultConfiguration();

      expect(defaultConfig.enableMetrics).toBe(true);
      expect(defaultConfig.enableHealthChecks).toBe(true);
      expect(defaultConfig.metricsPort).toBe(9090);
      expect(defaultConfig.metricsPath).toBe('/metrics');
      expect(defaultConfig.healthCheckInterval).toBe(60000);
      expect(defaultConfig.alertingEnabled).toBe(true);
      expect(defaultConfig.retentionPeriod).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('Runtime Configuration Updates', () => {
    let monitoringSystem: MonitoringSystem;

    beforeEach(async () => {
      monitoringSystem = MonitoringSystem.getInstance(logger);
      await monitoringSystem.initialize();
    });

    it('should update configuration successfully with valid changes', async () => {
      const newConfig = {
        metricsPort: 8080,
        healthCheckInterval: 45000,
        alertingEnabled: false
      };

      const result = await monitoringSystem.updateConfiguration(newConfig);

      expect(result.success).toBe(true);
      
      const updatedConfig = monitoringSystem.getConfiguration();
      expect(updatedConfig.metricsPort).toBe(8080);
      expect(updatedConfig.healthCheckInterval).toBe(45000);
      expect(updatedConfig.alertingEnabled).toBe(false);
      expect(updatedConfig.enableMetrics).toBe(true); // unchanged
    });

    it('should reject invalid configuration updates', async () => {
      const invalidConfig = {
        metricsPort: -1,
        healthCheckInterval: 1000
      };

      const result = await monitoringSystem.updateConfiguration(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Configuration validation failed');
      
      // Original configuration should remain unchanged
      const config = monitoringSystem.getConfiguration();
      expect(config.metricsPort).toBe(9090); // original value
    });

    it('should handle partial configuration updates', async () => {
      const partialUpdate = {
        alertingEnabled: false
      };

      const result = await monitoringSystem.updateConfiguration(partialUpdate);

      expect(result.success).toBe(true);
      
      const config = monitoringSystem.getConfiguration();
      expect(config.alertingEnabled).toBe(false);
      expect(config.metricsPort).toBe(9090); // unchanged
      expect(config.enableMetrics).toBe(true); // unchanged
    });

    it('should fail to update configuration when not initialized', async () => {
      // Reset and create a fresh uninitialized instance
      MonitoringSystem.resetInstance();
      const uninitializedSystem = MonitoringSystem.getInstance(logger, { enableMetrics: false });
      // Don't initialize

      const result = await uninitializedSystem.updateConfiguration({ metricsPort: 8080 });

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('must be initialized before updating');
      
      // Restore the initialized system for other tests
      MonitoringSystem.resetInstance();
      monitoringSystem = MonitoringSystem.getInstance(logger);
      await monitoringSystem.initialize();
    });

    it('should rollback configuration on update failure', async () => {
      const originalConfig = monitoringSystem.getConfiguration();
      
      // Try to update with invalid configuration
      const invalidUpdate = {
        metricsPort: -1
      };

      const result = await monitoringSystem.updateConfiguration(invalidUpdate);

      expect(result.success).toBe(false);
      
      // Configuration should be rolled back to original
      const currentConfig = monitoringSystem.getConfiguration();
      expect(currentConfig).toEqual(originalConfig);
    });
  });

  describe('Configuration Validation Error Scenarios', () => {
    it('should handle configuration validation system errors gracefully', () => {
      // Test with malformed configuration that might cause system errors
      const malformedConfig = {
        enableMetrics: true,
        metricsPort: Number.MAX_SAFE_INTEGER + 1 // Beyond safe integer range
      };

      expect(() => {
        MonitoringSystem.getInstance(logger, malformedConfig);
      }).toThrow();
    });

    it('should provide detailed error messages for validation failures', () => {
      const invalidConfig = {
        metricsPort: 'not-a-number' as any,
        healthCheckInterval: 'invalid' as any,
        metricsPath: 'no-leading-slash'
      };

      expect(() => {
        MonitoringSystem.getInstance(logger, invalidConfig);
      }).toThrow(/Invalid MonitoringSystem configuration/);
    });

    it('should handle concurrent configuration updates safely', async () => {
      const monitoringSystem = MonitoringSystem.getInstance(logger);
      await monitoringSystem.initialize();

      // Attempt multiple concurrent updates
      const updates = [
        { metricsPort: 8080 },
        { healthCheckInterval: 45000 },
        { alertingEnabled: false }
      ];

      const promises = updates.map(update => 
        monitoringSystem.updateConfiguration(update)
      );

      const results = await Promise.all(promises);

      // At least one should succeed, others might fail due to concurrency
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Configuration Persistence and Retrieval', () => {
    it('should persist configuration changes across operations', async () => {
      const monitoringSystem = MonitoringSystem.getInstance(logger);
      await monitoringSystem.initialize();

      const newConfig = {
        metricsPort: 7070,
        alertingEnabled: false
      };

      await monitoringSystem.updateConfiguration(newConfig);

      // Perform some operations
      await monitoringSystem.recordMetric('test_metric', 100);
      const health = await monitoringSystem.getSystemHealth();

      // Configuration should still be updated
      const config = monitoringSystem.getConfiguration();
      expect(config.metricsPort).toBe(7070);
      expect(config.alertingEnabled).toBe(false);
    });

    it('should return immutable configuration copies', async () => {
      const monitoringSystem = MonitoringSystem.getInstance(logger);
      await monitoringSystem.initialize();

      const config1 = monitoringSystem.getConfiguration();
      const config2 = monitoringSystem.getConfiguration();

      // Modify one copy
      config1.metricsPort = 8888;

      // Other copy should be unchanged
      expect(config2.metricsPort).toBe(9090);
      
      // Original configuration should be unchanged
      const config3 = monitoringSystem.getConfiguration();
      expect(config3.metricsPort).toBe(9090);
    });
  });

  describe('Integration with MonitoringSystem Features', () => {
    it('should respect configuration when starting metrics server', async () => {
      const configWithMetricsDisabled = {
        enableMetrics: false,
        enableHealthChecks: true
      };

      const monitoringSystem = MonitoringSystem.getInstance(logger, configWithMetricsDisabled);
      const result = await monitoringSystem.initialize();

      expect(result.success).toBe(true);
      
      const status = await monitoringSystem.getStatus();
      expect(status.metricsEnabled).toBe(false);
      expect(status.healthChecksEnabled).toBe(true);
    });

    it('should respect configuration when starting health checks', async () => {
      const configWithHealthChecksDisabled = {
        enableMetrics: true,
        enableHealthChecks: false
      };

      const monitoringSystem = MonitoringSystem.getInstance(logger, configWithHealthChecksDisabled);
      const result = await monitoringSystem.initialize();

      expect(result.success).toBe(true);
      
      const status = await monitoringSystem.getStatus();
      expect(status.metricsEnabled).toBe(true);
      expect(status.healthChecksEnabled).toBe(false);
    });

    it('should update running services when configuration changes', async () => {
      const monitoringSystem = MonitoringSystem.getInstance(logger, {
        enableMetrics: false,
        enableHealthChecks: false
      });
      await monitoringSystem.initialize();

      // Enable services through configuration update
      const result = await monitoringSystem.updateConfiguration({
        enableMetrics: true,
        enableHealthChecks: true
      });

      expect(result.success).toBe(true);
      
      const status = await monitoringSystem.getStatus();
      expect(status.metricsEnabled).toBe(true);
      expect(status.healthChecksEnabled).toBe(true);
    });
  });
});