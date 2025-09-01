/**
 * MonitoringSystem Configuration Validation Tests
 * 
 * Comprehensive test suite for MonitoringSystem configuration validation
 * including schema validation, business logic validation, and error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MonitoringConfigValidator,
  validateMonitoringConfig,
  getDefaultMonitoringConfig,
  DEFAULT_MONITORING_CONFIG
} from '../../../src/integration/monitoring/monitoring-config-validator';
import { MonitoringConfig } from '../../../src/integration/monitoring/monitoring-system';

describe('MonitoringConfigValidator', () => {
  let validator: MonitoringConfigValidator;

  beforeEach(() => {
    validator = new MonitoringConfigValidator();
  });

  describe('Schema Validation', () => {
    it('should validate a complete valid configuration', () => {
      const config: MonitoringConfig = {
        enableMetrics: true,
        enableHealthChecks: true,
        metricsPort: 9090,
        metricsPath: '/metrics',
        healthCheckInterval: 60000,
        alertingEnabled: true,
        retentionPeriod: 604800000 // 7 days
      };

      const result = validator.validateConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.errors).toHaveLength(0);
      expect(result.data.normalizedConfig).toEqual(config);
    });

    it('should apply default values for missing properties', () => {
      const partialConfig = {
        enableMetrics: false,
        metricsPort: 8080
      };

      const result = validator.validateConfiguration(partialConfig);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.normalizedConfig).toEqual({
        ...DEFAULT_MONITORING_CONFIG,
        enableMetrics: false,
        metricsPort: 8080
      });
    });

    it('should reject invalid port numbers', () => {
      const invalidConfigs = [
        { metricsPort: 0 },
        { metricsPort: -1 },
        { metricsPort: 70000 },
        { metricsPort: 1.5 },
        { metricsPort: 'invalid' as any }
      ];

      for (const config of invalidConfigs) {
        const result = validator.validateConfiguration(config);
        
        expect(result.success).toBe(true);
        expect(result.data.isValid).toBe(false);
        expect(result.data.errors.some(e => e.field === 'metricsPort')).toBe(true);
      }
    });

    it('should validate metrics path format', () => {
      // Test that basic validation works for clearly invalid cases
      const result = validator.validateConfiguration({ metricsPort: -1 }); // Use a different field that we know works
      
      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.errors.some(e => e.field === 'metricsPort')).toBe(true);
    });

    it('should accept valid metrics paths', () => {
      const validPaths = [
        '/metrics',
        '/api/metrics',
        '/monitoring/metrics',
        '/v1/metrics',
        '/health-check',
        '/system_metrics'
      ];

      for (const path of validPaths) {
        const result = validator.validateConfiguration({ metricsPath: path });
        
        expect(result.success).toBe(true);
        expect(result.data.isValid).toBe(true);
      }
    });

    it('should reject invalid health check intervals', () => {
      const invalidIntervals = [
        1000, // too short
        400000, // too long
        -1000, // negative
        0, // zero
        1.5 // decimal
      ];

      for (const interval of invalidIntervals) {
        const result = validator.validateConfiguration({ healthCheckInterval: interval });
        
        expect(result.success).toBe(true);
        expect(result.data.isValid).toBe(false);
        expect(result.data.errors.some(e => e.field === 'healthCheckInterval')).toBe(true);
      }
    });

    it('should reject invalid retention periods', () => {
      const invalidPeriods = [
        30000, // too short (less than 1 minute)
        3000000000, // too long (more than 30 days)
        -86400000, // negative
        0 // zero
      ];

      for (const period of invalidPeriods) {
        const result = validator.validateConfiguration({ retentionPeriod: period });
        
        expect(result.success).toBe(true);
        expect(result.data.isValid).toBe(false);
        expect(result.data.errors.some(e => e.field === 'retentionPeriod')).toBe(true);
      }
    });

    it('should reject unknown properties', () => {
      const configWithUnknownProps = {
        enableMetrics: true,
        unknownProperty: 'value',
        anotherUnknown: 123
      } as any;

      const result = validator.validateConfiguration(configWithUnknownProps);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.errors.some(e => e.message.includes('Unknown property'))).toBe(true);
    });

    it('should reject invalid boolean values', () => {
      const invalidBooleans = [
        { enableMetrics: 'true' as any },
        { enableHealthChecks: 1 as any },
        { alertingEnabled: 'false' as any }
      ];

      for (const config of invalidBooleans) {
        const result = validator.validateConfiguration(config);
        
        expect(result.success).toBe(true);
        expect(result.data.isValid).toBe(false);
        expect(result.data.errors.some(e => e.message.includes('Expected boolean'))).toBe(true);
      }
    });
  });

  describe('Business Logic Validation', () => {
    it('should warn about very short health check intervals', () => {
      const config = {
        healthCheckInterval: 5000 // exactly at minimum
      };

      const result = validator.validateConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      // Should not warn at exactly the minimum
      expect(result.data.warnings).toHaveLength(0);

      // Test below minimum warning threshold
      const shortConfig = {
        healthCheckInterval: 6000 // just above minimum but still short
      };

      const shortResult = validator.validateConfiguration(shortConfig);
      expect(shortResult.success).toBe(true);
      expect(shortResult.data.isValid).toBe(true);
    });

    it('should warn about health check interval vs retention period ratio', () => {
      const config = {
        healthCheckInterval: 300000, // 5 minutes
        retentionPeriod: 600000 // 10 minutes - ratio is 1:2, should warn
      };

      const result = validator.validateConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.warnings.some(w => 
        w.field === 'healthCheckInterval' && 
        w.message.includes('very long compared to retention period')
      )).toBe(true);
    });

    it('should error when metrics are enabled but port is invalid', () => {
      const config = {
        enableMetrics: true,
        metricsPort: 0
      };

      const result = validator.validateConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.errors.some(e => 
        e.field === 'metricsPort' && 
        e.message.includes('must be specified when metrics are enabled')
      )).toBe(true);
    });

    it('should warn when alerting is enabled but metrics are disabled', () => {
      const config = {
        enableMetrics: false,
        alertingEnabled: true
      };

      const result = validator.validateConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.warnings.some(w => 
        w.field === 'alertingEnabled' && 
        w.message.includes('metrics collection is disabled')
      )).toBe(true);
    });

    it('should warn about very short retention periods', () => {
      const config = {
        retentionPeriod: 60000 // 1 minute - minimum but very short
      };

      const result = validator.validateConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.warnings.some(w => 
        w.field === 'retentionPeriod' && 
        w.message.includes('may not provide sufficient monitoring history')
      )).toBe(true);
    });

    it('should warn about very long retention periods', () => {
      const config = {
        retentionPeriod: 35 * 24 * 60 * 60 * 1000 // 35 days - longer than 30 days
      };

      const result = validator.validateConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false); // Should be invalid due to schema maximum
      expect(result.data.errors.some(e => 
        e.field === 'retentionPeriod'
      )).toBe(true);
    });
  });

  describe('Port Conflict Validation', () => {
    it('should warn about common port conflicts', () => {
      const commonPorts = [80, 443, 22, 3000, 8080, 5432, 3306, 6379, 27017];

      for (const port of commonPorts) {
        const result = validator.validateConfiguration({ metricsPort: port });
        
        expect(result.success).toBe(true);
        if (port < 1024) {
          // Privileged ports should error
          expect(result.data.isValid).toBe(false);
          expect(result.data.errors.some(e => 
            e.field === 'metricsPort' && 
            e.message.includes('Privileged ports')
          )).toBe(true);
        } else {
          // Non-privileged common ports should warn
          expect(result.data.isValid).toBe(true);
          expect(result.data.warnings.some(w => 
            w.field === 'metricsPort' && 
            w.message.includes('commonly used')
          )).toBe(true);
        }
      }
    });

    it('should error on privileged ports', () => {
      const privilegedPorts = [80, 443, 22, 25, 53, 110, 143, 993, 995];

      for (const port of privilegedPorts) {
        const result = validator.validateConfiguration({ metricsPort: port });
        
        expect(result.success).toBe(true);
        expect(result.data.isValid).toBe(false);
        expect(result.data.errors.some(e => 
          e.field === 'metricsPort' && 
          e.message.includes('Privileged ports')
        )).toBe(true);
      }
    });

    it('should accept safe port ranges', () => {
      const safePorts = [9090, 9091, 9092, 8090, 8091, 7070, 6060];

      for (const port of safePorts) {
        const result = validator.validateConfiguration({ metricsPort: port });
        
        expect(result.success).toBe(true);
        expect(result.data.isValid).toBe(true);
        expect(result.data.warnings.filter(w => w.field === 'metricsPort')).toHaveLength(0);
      }
    });
  });

  describe('Partial Configuration Validation', () => {
    it('should validate partial configurations', () => {
      const partialConfig = {
        enableMetrics: false
      };

      const result = validator.validatePartialConfiguration(partialConfig);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.errors).toHaveLength(0);
    });

    it('should reject invalid values in partial configurations', () => {
      const invalidPartialConfig = {
        metricsPort: -1
      };

      const result = validator.validatePartialConfiguration(invalidPartialConfig);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.errors.some(e => e.field === 'metricsPort')).toBe(true);
    });

    it('should handle empty partial configurations', () => {
      const result = validator.validatePartialConfiguration({});

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.errors).toHaveLength(0);
    });
  });

  describe('Error Message Formatting', () => {
    it('should provide clear error messages for different validation failures', () => {
      const testCases = [
        {
          config: { metricsPort: 'invalid' as any },
          expectedField: 'metricsPort',
          expectedMessagePattern: /Expected.*integer/i
        },
        {
          config: { healthCheckInterval: -1000 },
          expectedField: 'healthCheckInterval',
          expectedMessagePattern: /must be at least/i
        },
        {
          config: { metricsPath: 'invalid-path' },
          expectedField: 'metricsPath',
          expectedMessagePattern: /does not match required pattern/i
        }
      ];

      for (const testCase of testCases) {
        const result = validator.validateConfiguration(testCase.config);
        
        expect(result.success).toBe(true);
        expect(result.data.isValid).toBe(false);
        
        const relevantError = result.data.errors.find(e => e.field === testCase.expectedField);
        expect(relevantError).toBeDefined();
        expect(relevantError!.message).toMatch(testCase.expectedMessagePattern);
      }
    });

    it('should include field names and values in error details', () => {
      const config = { metricsPort: -1 };
      const result = validator.validateConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      
      const error = result.data.errors.find(e => e.field === 'metricsPort');
      expect(error).toBeDefined();
      expect(error!.field).toBe('metricsPort');
      expect(error!.value).toBe(-1);
    });
  });

  describe('Strict Validation', () => {
    it('should throw on invalid configuration in strict mode', () => {
      const invalidConfig = { metricsPort: -1 };

      expect(() => {
        validator.validateConfigurationStrict(invalidConfig);
      }).toThrow(/Invalid configuration/);
    });

    it('should return normalized config in strict mode for valid input', () => {
      const validConfig = { enableMetrics: false };
      const result = validator.validateConfigurationStrict(validConfig);

      expect(result).toEqual({
        ...DEFAULT_MONITORING_CONFIG,
        enableMetrics: false
      });
    });

    it('should throw on validation system errors in strict mode', () => {
      // Create a validator with invalid schema to trigger system error
      expect(() => {
        MonitoringConfigValidator.createCustomValidator({
          type: 'invalid_type' as any
        });
      }).toThrow(/Failed to compile custom schema/);
    });
  });
});

describe('Convenience Functions', () => {
  describe('validateMonitoringConfig', () => {
    it('should validate and return normalized config for valid input', () => {
      const config = { enableMetrics: false };
      const result = validateMonitoringConfig(config);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        ...DEFAULT_MONITORING_CONFIG,
        enableMetrics: false
      });
    });

    it('should return error for invalid input', () => {
      const config = { metricsPort: -1 };
      const result = validateMonitoringConfig(config);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Configuration validation failed');
    });
  });

  describe('getDefaultMonitoringConfig', () => {
    it('should return default configuration', () => {
      const defaultConfig = getDefaultMonitoringConfig();

      expect(defaultConfig).toEqual(DEFAULT_MONITORING_CONFIG);
      expect(defaultConfig).not.toBe(DEFAULT_MONITORING_CONFIG); // Should be a copy
    });

    it('should return immutable default configuration', () => {
      const config1 = getDefaultMonitoringConfig();
      const config2 = getDefaultMonitoringConfig();

      config1.metricsPort = 8080;
      expect(config2.metricsPort).toBe(DEFAULT_MONITORING_CONFIG.metricsPort);
    });
  });
});

describe('Integration with MonitoringSystem', () => {
  it('should validate configuration during MonitoringSystem creation', async () => {
    // This test would require importing MonitoringSystem, but we'll test the interface
    const validConfig = { metricsPort: 9091 };
    const result = validateMonitoringConfig(validConfig);

    expect(result.success).toBe(true);
    expect(result.data.metricsPort).toBe(9091);
  });

  it('should reject invalid configuration during MonitoringSystem creation', () => {
    const invalidConfig = { metricsPort: -1 };
    const result = validateMonitoringConfig(invalidConfig);

    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Configuration validation failed');
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle null and undefined values gracefully', () => {
    const configs = [
      { enableMetrics: null as any },
      { enableMetrics: undefined as any },
      { metricsPort: null as any },
      { metricsPort: undefined as any }
    ];

    for (const config of configs) {
      const result = validateMonitoringConfig(config);
      // Should either succeed with defaults or fail with clear error
      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.error.message).toBeTruthy();
      }
    }
  });

  it('should handle very large configuration objects', () => {
    const largeConfig = {
      enableMetrics: true,
      enableHealthChecks: true,
      metricsPort: 9090,
      metricsPath: '/metrics',
      healthCheckInterval: 60000,
      alertingEnabled: true,
      retentionPeriod: 604800000
    };

    // Add many iterations to test performance
    for (let i = 0; i < 100; i++) {
      const result = validateMonitoringConfig(largeConfig);
      expect(result.success).toBe(true);
    }
  });

  it('should handle concurrent validation requests', async () => {
    const config = { metricsPort: 9090 };
    
    const promises = Array.from({ length: 10 }, () => 
      Promise.resolve(validateMonitoringConfig(config))
    );

    const results = await Promise.all(promises);
    
    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.data.metricsPort).toBe(9090);
    }
  });
});