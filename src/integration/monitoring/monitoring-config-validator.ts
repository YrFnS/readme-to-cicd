/**
 * MonitoringSystem Configuration Validator
 * 
 * Provides comprehensive validation for MonitoringSystem configuration parameters
 * using JSON Schema validation with AJV.
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { MonitoringConfig } from './monitoring-system';
import { Result, success, failure } from '../../shared/types/result';

/**
 * Configuration validation error details
 */
export interface ConfigValidationError {
  field: string;
  message: string;
  value?: any;
  allowedValues?: any[];
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationError[];
  normalizedConfig?: MonitoringConfig;
}

/**
 * MonitoringSystem configuration schema
 */
const monitoringConfigSchema = {
  type: 'object',
  properties: {
    enableMetrics: {
      type: 'boolean',
      description: 'Enable metrics collection and exposure'
    },
    enableHealthChecks: {
      type: 'boolean',
      description: 'Enable periodic health checks for system components'
    },
    metricsPort: {
      type: 'integer',
      minimum: 1024,
      maximum: 65535,
      description: 'Port number for metrics server (must be between 1024-65535)'
    },
    metricsPath: {
      type: 'string',
      pattern: '^/[a-zA-Z0-9/_-]+$',
      minLength: 2,
      maxLength: 100,
      description: 'HTTP path for metrics endpoint (must start with / and contain valid characters)'
    },
    healthCheckInterval: {
      type: 'integer',
      minimum: 5000,
      maximum: 300000,
      description: 'Health check interval in milliseconds (5 seconds to 5 minutes)'
    },
    alertingEnabled: {
      type: 'boolean',
      description: 'Enable alerting system for monitoring events'
    },
    retentionPeriod: {
      type: 'integer',
      minimum: 60000,
      maximum: 2592000000,
      description: 'Data retention period in milliseconds (1 minute to 30 days)'
    }
  },
  required: [
    'enableMetrics',
    'enableHealthChecks', 
    'metricsPort',
    'metricsPath',
    'healthCheckInterval',
    'alertingEnabled',
    'retentionPeriod'
  ],
  additionalProperties: false
};

/**
 * Default configuration values
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableMetrics: true,
  enableHealthChecks: true,
  metricsPort: 9090,
  metricsPath: '/metrics',
  healthCheckInterval: 60000, // 1 minute
  alertingEnabled: true,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * MonitoringSystem Configuration Validator
 */
export class MonitoringConfigValidator {
  private ajv: Ajv;
  private validateConfig: ValidateFunction<MonitoringConfig>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: true,
      removeAdditional: false
    });

    // Add format validators
    addFormats(this.ajv);

    // Compile the schema
    this.validateConfig = this.ajv.compile(monitoringConfigSchema as any);
  }

  /**
   * Validate MonitoringSystem configuration
   */
  validateConfiguration(config: Partial<MonitoringConfig>): Result<ConfigValidationResult> {
    try {
      // First validate the provided config against schema (without normalization)
      // This catches invalid values before they get replaced by defaults
      const errors: ConfigValidationError[] = [];
      const warnings: ConfigValidationError[] = [];

      // Validate individual fields that are provided
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
          const fieldConfig = { [key]: value };
          const tempNormalized = { ...DEFAULT_MONITORING_CONFIG, ...fieldConfig };
          const fieldValid = this.validateConfig(tempNormalized);
          
          if (!fieldValid && this.validateConfig.errors) {
            for (const error of this.validateConfig.errors) {
              const field = error.instancePath.replace(/^\//, '') || error.params?.missingProperty || key;
              if (field === key || error.instancePath === `/${key}`) {
                errors.push({
                  field,
                  message: this.formatErrorMessage(error),
                  value: error.data,
                  allowedValues: this.extractAllowedValues(error)
                });
              }
            }
          }
        }
      }

      // Now normalize configuration with defaults
      const normalizedConfig = this.normalizeConfiguration(config);

      // Perform full schema validation on normalized config
      const isValid = this.validateConfig(normalizedConfig);

      // Process any additional validation errors from full config
      if (!isValid && this.validateConfig.errors) {
        for (const error of this.validateConfig.errors) {
          const field = error.instancePath.replace(/^\//, '') || error.params?.missingProperty || 'root';
          
          // Only add if we haven't already caught this error
          if (!errors.some(e => e.field === field)) {
            errors.push({
              field,
              message: this.formatErrorMessage(error),
              value: error.data,
              allowedValues: this.extractAllowedValues(error)
            });
          }
        }
      }

      // Perform additional business logic validation
      const businessValidationResult = this.performBusinessValidation(normalizedConfig);
      errors.push(...businessValidationResult.errors);
      warnings.push(...businessValidationResult.warnings);

      // Check for port conflicts
      const portValidationResult = this.validatePortConfiguration(normalizedConfig);
      errors.push(...portValidationResult.errors);
      warnings.push(...portValidationResult.warnings);

      const finalIsValid = isValid && errors.length === 0;

      const result: ConfigValidationResult = {
        isValid: finalIsValid,
        errors,
        warnings,
        normalizedConfig: finalIsValid ? normalizedConfig : undefined
      };

      return success(result);

    } catch (error) {
      return failure(new Error(
        `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
      ));
    }
  }

  /**
   * Validate configuration and throw on errors
   */
  validateConfigurationStrict(config: Partial<MonitoringConfig>): MonitoringConfig {
    const result = this.validateConfiguration(config);
    
    if (!result.success) {
      throw new Error(`Configuration validation failed: ${result.error.message}`);
    }

    if (!result.data.isValid) {
      const errorMessages = result.data.errors.map(e => `${e.field}: ${e.message}`);
      throw new Error(`Invalid configuration:\n${errorMessages.join('\n')}`);
    }

    return result.data.normalizedConfig!;
  }

  /**
   * Get default configuration
   */
  getDefaultConfiguration(): MonitoringConfig {
    return { ...DEFAULT_MONITORING_CONFIG };
  }

  /**
   * Normalize configuration by applying defaults
   */
  private normalizeConfiguration(config: Partial<MonitoringConfig>): MonitoringConfig {
    return {
      ...DEFAULT_MONITORING_CONFIG,
      ...config
    };
  }

  /**
   * Perform business logic validation
   */
  private performBusinessValidation(config: MonitoringConfig): {
    errors: ConfigValidationError[];
    warnings: ConfigValidationError[];
  } {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationError[] = [];

    // Validate health check interval vs retention period
    if (config.healthCheckInterval > config.retentionPeriod / 10) {
      warnings.push({
        field: 'healthCheckInterval',
        message: 'Health check interval is very long compared to retention period. Consider reducing it for better monitoring granularity.',
        value: config.healthCheckInterval
      });
    }

    // Validate metrics configuration consistency
    if (config.enableMetrics && config.metricsPort === 0) {
      errors.push({
        field: 'metricsPort',
        message: 'Metrics port must be specified when metrics are enabled',
        value: config.metricsPort
      });
    }

    if (config.enableMetrics && !config.metricsPath) {
      errors.push({
        field: 'metricsPath',
        message: 'Metrics path must be specified when metrics are enabled',
        value: config.metricsPath
      });
    }

    // Validate health checks configuration
    if (config.enableHealthChecks && config.healthCheckInterval < 5000) {
      warnings.push({
        field: 'healthCheckInterval',
        message: 'Very short health check interval may impact performance. Consider using at least 5 seconds.',
        value: config.healthCheckInterval
      });
    }

    // Validate retention period
    if (config.retentionPeriod <= 60000) {
      warnings.push({
        field: 'retentionPeriod',
        message: 'Very short retention period may not provide sufficient monitoring history.',
        value: config.retentionPeriod
      });
    }

    if (config.retentionPeriod > 30 * 24 * 60 * 60 * 1000) {
      warnings.push({
        field: 'retentionPeriod',
        message: 'Very long retention period may consume significant memory. Consider reducing it.',
        value: config.retentionPeriod
      });
    }

    // Validate alerting configuration
    if (config.alertingEnabled && !config.enableMetrics) {
      warnings.push({
        field: 'alertingEnabled',
        message: 'Alerting is enabled but metrics collection is disabled. Alerts may not work properly without metrics.',
        value: config.alertingEnabled
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate port configuration for conflicts
   */
  private validatePortConfiguration(config: MonitoringConfig): {
    errors: ConfigValidationError[];
    warnings: ConfigValidationError[];
  } {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationError[] = [];

    // Check for common port conflicts
    const commonPorts = [
      { port: 80, service: 'HTTP' },
      { port: 443, service: 'HTTPS' },
      { port: 22, service: 'SSH' },
      { port: 3000, service: 'Node.js development' },
      { port: 8080, service: 'HTTP alternative' },
      { port: 5432, service: 'PostgreSQL' },
      { port: 3306, service: 'MySQL' },
      { port: 6379, service: 'Redis' },
      { port: 27017, service: 'MongoDB' }
    ];

    const conflictingPort = commonPorts.find(p => p.port === config.metricsPort);
    if (conflictingPort) {
      warnings.push({
        field: 'metricsPort',
        message: `Port ${config.metricsPort} is commonly used by ${conflictingPort.service}. Consider using a different port to avoid conflicts.`,
        value: config.metricsPort
      });
    }

    // Check for privileged ports (< 1024) - already handled by schema but add business context
    if (config.metricsPort < 1024) {
      errors.push({
        field: 'metricsPort',
        message: 'Privileged ports (< 1024) require root access and are not recommended for monitoring services.',
        value: config.metricsPort
      });
    }

    return { errors, warnings };
  }

  /**
   * Format AJV error message for better readability
   */
  private formatErrorMessage(error: any): string {
    switch (error.keyword) {
      case 'required':
        return `Missing required property: ${error.params.missingProperty}`;
      case 'type':
        return `Expected ${error.params.type}, got ${typeof error.data}`;
      case 'minimum':
        return `Value must be at least ${error.params.limit}, got ${error.data}`;
      case 'maximum':
        return `Value must be at most ${error.params.limit}, got ${error.data}`;
      case 'pattern':
        return `Value does not match required pattern: ${error.params.pattern}`;
      case 'minLength':
        return `Value must be at least ${error.params.limit} characters long`;
      case 'maxLength':
        return `Value must be at most ${error.params.limit} characters long`;
      case 'additionalProperties':
        return `Unknown property: ${error.params.additionalProperty}`;
      default:
        return error.message || 'Invalid value';
    }
  }

  /**
   * Extract allowed values from error parameters
   */
  private extractAllowedValues(error: any): any[] | undefined {
    if (error.keyword === 'enum') {
      return error.params.allowedValues;
    }
    if (error.keyword === 'minimum' || error.keyword === 'maximum') {
      return [error.params.limit];
    }
    return undefined;
  }

  /**
   * Create a configuration validator with custom schema
   */
  static createCustomValidator(customSchema: JSONSchemaType<any>): MonitoringConfigValidator {
    const validator = new MonitoringConfigValidator();
    try {
      validator.validateConfig = validator.ajv.compile(customSchema);
    } catch (error) {
      throw new Error(`Failed to compile custom schema: ${error instanceof Error ? error.message : String(error)}`);
    }
    return validator;
  }

  /**
   * Validate partial configuration (for updates)
   */
  validatePartialConfiguration(config: Partial<MonitoringConfig>): Result<ConfigValidationResult> {
    try {
      // Create a schema that doesn't require all fields for partial validation
      const partialSchema = {
        ...(monitoringConfigSchema as any),
        required: [] // No required fields for partial validation
      };

      const partialValidator = this.ajv.compile(partialSchema);
      const isValid = partialValidator(config);
      const errors: ConfigValidationError[] = [];

      if (!isValid && partialValidator.errors) {
        for (const error of partialValidator.errors) {
          const field = error.instancePath.replace(/^\//, '') || 'root';
          errors.push({
            field,
            message: this.formatErrorMessage(error),
            value: error.data
          });
        }
      }

      const result: ConfigValidationResult = {
        isValid: isValid && errors.length === 0,
        errors,
        warnings: [],
        normalizedConfig: isValid ? config as MonitoringConfig : undefined
      };

      return success(result);

    } catch (error) {
      return failure(new Error(
        `Partial configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
      ));
    }
  }
}

/**
 * Convenience function to validate MonitoringSystem configuration
 */
export function validateMonitoringConfig(config: Partial<MonitoringConfig>): Result<MonitoringConfig> {
  const validator = new MonitoringConfigValidator();
  const result = validator.validateConfiguration(config);

  if (!result.success) {
    return failure(result.error);
  }

  if (!result.data.isValid) {
    const errorMessages = result.data.errors.map(e => `${e.field}: ${e.message}`);
    return failure(new Error(`Configuration validation failed:\n${errorMessages.join('\n')}`));
  }

  return success(result.data.normalizedConfig!);
}

/**
 * Convenience function to get default configuration
 */
export function getDefaultMonitoringConfig(): MonitoringConfig {
  return { ...DEFAULT_MONITORING_CONFIG };
}