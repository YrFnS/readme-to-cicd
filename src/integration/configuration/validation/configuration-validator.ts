/**
 * Configuration Validator Implementation
 * 
 * Provides schema-based validation for configuration objects with support for
 * custom validation rules and environment-specific validation.
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  Configuration,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Environment
} from '../types/configuration-types.js';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validator: (config: Configuration, path?: string) => ValidationError[];
}

export class ConfigurationValidator {
  private ajv: Ajv;
  private configSchema: JSONSchemaType<Configuration>;
  private validateFunction: ValidateFunction<Configuration>;
  private customRules: Map<string, ValidationRule>;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.customRules = new Map();
    this.initializeSchema();
    this.initializeCustomRules();
  }

  /**
   * Validate complete configuration object
   */
  async validate(config: Configuration): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Schema validation
      const schemaValid = this.validateFunction(config);
      if (!schemaValid && this.validateFunction.errors) {
        for (const error of this.validateFunction.errors) {
          errors.push({
            path: error.instancePath || 'root',
            message: error.message || 'Validation error',
            code: error.keyword || 'SCHEMA_ERROR',
            severity: 'error'
          });
        }
      }

      // Custom rule validation
      for (const rule of this.customRules.values()) {
        const ruleErrors = rule.validator(config);
        errors.push(...ruleErrors);
      }

      // Environment-specific validation
      const envErrors = await this.validateEnvironmentSpecific(config);
      errors.push(...envErrors);

      // Generate warnings for best practices
      const bestPracticeWarnings = this.generateBestPracticeWarnings(config);
      warnings.push(...bestPracticeWarnings);

    } catch (error) {
      errors.push({
        path: 'root',
        message: `Validation failed: ${error.message}`,
        code: 'VALIDATION_EXCEPTION',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate partial configuration (for single key updates)
   */
  async validatePartial(config: Partial<Configuration>, path: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // For partial validation, we only validate the specific path and its value
      const value = this.getValueAtPath(config, path);
      
      if (value !== undefined) {
        // Validate the specific path
        const pathErrors = this.validatePathValue(path, value);
        errors.push(...pathErrors);
      }

    } catch (error) {
      errors.push({
        path,
        message: `Partial validation failed: ${error.message}`,
        code: 'PARTIAL_VALIDATION_ERROR',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Add custom validation rule
   */
  addCustomRule(rule: ValidationRule): void {
    this.customRules.set(rule.id, rule);
  }

  /**
   * Remove custom validation rule
   */
  removeCustomRule(ruleId: string): void {
    this.customRules.delete(ruleId);
  }

  /**
   * Get all custom rules
   */
  getCustomRules(): ValidationRule[] {
    return Array.from(this.customRules.values());
  }

  private initializeSchema(): void {
    this.configSchema = {
      type: 'object',
      properties: {
        system: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
            environment: { type: 'string', enum: ['development', 'staging', 'production'] },
            region: { type: 'string', minLength: 1 },
            timezone: { type: 'string', minLength: 1 },
            logging: {
              type: 'object',
              properties: {
                level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
                format: { type: 'string', enum: ['json', 'text'] },
                destinations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      settings: { type: 'object' }
                    },
                    required: ['type', 'settings'],
                    additionalProperties: false
                  }
                },
                sampling: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    rate: { type: 'number', minimum: 0, maximum: 1 },
                    maxPerSecond: { type: 'number', minimum: 1 }
                  },
                  required: ['enabled', 'rate', 'maxPerSecond'],
                  additionalProperties: false
                }
              },
              required: ['level', 'format', 'destinations', 'sampling'],
              additionalProperties: false
            },
            performance: {
              type: 'object',
              properties: {
                timeouts: {
                  type: 'object',
                  properties: {
                    request: { type: 'number', minimum: 1000 },
                    connection: { type: 'number', minimum: 1000 },
                    idle: { type: 'number', minimum: 1000 },
                    keepAlive: { type: 'number', minimum: 1000 }
                  },
                  required: ['request', 'connection', 'idle', 'keepAlive'],
                  additionalProperties: false
                },
                retries: {
                  type: 'object',
                  properties: {
                    maxAttempts: { type: 'number', minimum: 1, maximum: 10 },
                    backoffStrategy: { type: 'string', enum: ['linear', 'exponential', 'fixed'] },
                    initialDelay: { type: 'number', minimum: 100 },
                    maxDelay: { type: 'number', minimum: 1000 },
                    jitter: { type: 'boolean' }
                  },
                  required: ['maxAttempts', 'backoffStrategy', 'initialDelay', 'maxDelay', 'jitter'],
                  additionalProperties: false
                },
                circuitBreaker: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    failureThreshold: { type: 'number', minimum: 1 },
                    recoveryTimeout: { type: 'number', minimum: 1000 },
                    halfOpenMaxCalls: { type: 'number', minimum: 1 }
                  },
                  required: ['enabled', 'failureThreshold', 'recoveryTimeout', 'halfOpenMaxCalls'],
                  additionalProperties: false
                },
                rateLimit: {
                  type: 'object',
                  properties: {
                    enabled: { type: 'boolean' },
                    requestsPerSecond: { type: 'number', minimum: 1 },
                    burstSize: { type: 'number', minimum: 1 },
                    strategy: { type: 'string', enum: ['token-bucket', 'sliding-window', 'fixed-window'] }
                  },
                  required: ['enabled', 'requestsPerSecond', 'burstSize', 'strategy'],
                  additionalProperties: false
                }
              },
              required: ['timeouts', 'retries', 'circuitBreaker', 'rateLimit'],
              additionalProperties: false
            }
          },
          required: ['name', 'version', 'environment', 'region', 'timezone', 'logging', 'performance'],
          additionalProperties: false
        },
        components: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              version: { type: 'string' },
              resources: {
                type: 'object',
                properties: {
                  cpu: { type: 'string' },
                  memory: { type: 'string' },
                  storage: { type: 'string' },
                  limits: {
                    type: 'object',
                    properties: {
                      cpu: { type: 'string' },
                      memory: { type: 'string' },
                      storage: { type: 'string' }
                    },
                    required: ['cpu', 'memory', 'storage'],
                    additionalProperties: false
                  }
                },
                required: ['cpu', 'memory', 'storage', 'limits'],
                additionalProperties: false
              },
              scaling: {
                type: 'object',
                properties: {
                  minReplicas: { type: 'number', minimum: 1 },
                  maxReplicas: { type: 'number', minimum: 1 },
                  targetCPU: { type: 'number', minimum: 1, maximum: 100 },
                  targetMemory: { type: 'number', minimum: 1, maximum: 100 },
                  scaleUpPolicy: { type: 'object' },
                  scaleDownPolicy: { type: 'object' }
                },
                required: ['minReplicas', 'maxReplicas', 'targetCPU', 'targetMemory', 'scaleUpPolicy', 'scaleDownPolicy'],
                additionalProperties: false
              },
              healthCheck: {
                type: 'object',
                properties: {
                  enabled: { type: 'boolean' },
                  path: { type: 'string' },
                  port: { type: 'number', minimum: 1, maximum: 65535 },
                  initialDelaySeconds: { type: 'number', minimum: 0 },
                  periodSeconds: { type: 'number', minimum: 1 },
                  timeoutSeconds: { type: 'number', minimum: 1 },
                  failureThreshold: { type: 'number', minimum: 1 },
                  successThreshold: { type: 'number', minimum: 1 }
                },
                required: ['enabled', 'path', 'port', 'initialDelaySeconds', 'periodSeconds', 'timeoutSeconds', 'failureThreshold', 'successThreshold'],
                additionalProperties: false
              },
              dependencies: {
                type: 'array',
                items: { type: 'string' }
              },
              customSettings: { type: 'object' }
            },
            required: ['enabled', 'version', 'resources', 'scaling', 'healthCheck', 'dependencies', 'customSettings'],
            additionalProperties: false
          }
        },
        deployment: { type: 'object' }, // Simplified for brevity
        security: { type: 'object' },    // Simplified for brevity
        monitoring: { type: 'object' },  // Simplified for brevity
        integrations: { type: 'object' } // Simplified for brevity
      },
      required: ['system', 'components', 'deployment', 'security', 'monitoring', 'integrations'],
      additionalProperties: false
    };

    this.validateFunction = this.ajv.compile(this.configSchema);
  }

  private initializeCustomRules(): void {
    // Resource consistency rule
    this.addCustomRule({
      id: 'resource-consistency',
      name: 'Resource Consistency',
      description: 'Ensures resource limits are greater than or equal to requests',
      validator: (config: Configuration) => {
        const errors: ValidationError[] = [];
        
        for (const [componentId, component] of Object.entries(config.components)) {
          const { resources } = component;
          
          // Check CPU
          const cpuRequest = this.parseResourceValue(resources.cpu);
          const cpuLimit = this.parseResourceValue(resources.limits.cpu);
          if (cpuLimit < cpuRequest) {
            errors.push({
              path: `components.${componentId}.resources.limits.cpu`,
              message: 'CPU limit must be greater than or equal to CPU request',
              code: 'RESOURCE_LIMIT_TOO_LOW',
              severity: 'error'
            });
          }
          
          // Check Memory
          const memoryRequest = this.parseResourceValue(resources.memory);
          const memoryLimit = this.parseResourceValue(resources.limits.memory);
          if (memoryLimit < memoryRequest) {
            errors.push({
              path: `components.${componentId}.resources.limits.memory`,
              message: 'Memory limit must be greater than or equal to memory request',
              code: 'RESOURCE_LIMIT_TOO_LOW',
              severity: 'error'
            });
          }
        }
        
        return errors;
      }
    });

    // Scaling configuration rule
    this.addCustomRule({
      id: 'scaling-consistency',
      name: 'Scaling Consistency',
      description: 'Ensures scaling configuration is consistent',
      validator: (config: Configuration) => {
        const errors: ValidationError[] = [];
        
        for (const [componentId, component] of Object.entries(config.components)) {
          const { scaling } = component;
          
          if (scaling.maxReplicas < scaling.minReplicas) {
            errors.push({
              path: `components.${componentId}.scaling.maxReplicas`,
              message: 'Maximum replicas must be greater than or equal to minimum replicas',
              code: 'INVALID_SCALING_CONFIG',
              severity: 'error'
            });
          }
        }
        
        return errors;
      }
    });

    // Security configuration rule
    this.addCustomRule({
      id: 'security-requirements',
      name: 'Security Requirements',
      description: 'Ensures security requirements are met for production environments',
      validator: (config: Configuration) => {
        const errors: ValidationError[] = [];
        
        if (config.system.environment === 'production') {
          // Encryption must be enabled
          if (!config.security.encryption.atRest.enabled) {
            errors.push({
              path: 'security.encryption.atRest.enabled',
              message: 'Encryption at rest must be enabled in production',
              code: 'SECURITY_REQUIREMENT_NOT_MET',
              severity: 'error'
            });
          }
          
          if (!config.security.encryption.inTransit.enabled) {
            errors.push({
              path: 'security.encryption.inTransit.enabled',
              message: 'Encryption in transit must be enabled in production',
              code: 'SECURITY_REQUIREMENT_NOT_MET',
              severity: 'error'
            });
          }
          
          // Audit must be enabled
          if (!config.security.audit.enabled) {
            errors.push({
              path: 'security.audit.enabled',
              message: 'Audit logging must be enabled in production',
              code: 'SECURITY_REQUIREMENT_NOT_MET',
              severity: 'error'
            });
          }
        }
        
        return errors;
      }
    });
  }

  private async validateEnvironmentSpecific(config: Configuration): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const environment = config.system.environment;

    switch (environment) {
      case 'production':
        errors.push(...this.validateProductionEnvironment(config));
        break;
      case 'staging':
        errors.push(...this.validateStagingEnvironment(config));
        break;
      case 'development':
        errors.push(...this.validateDevelopmentEnvironment(config));
        break;
    }

    return errors;
  }

  private validateProductionEnvironment(config: Configuration): ValidationError[] {
    const errors: ValidationError[] = [];

    // Production should have multiple replicas for high availability
    for (const [componentId, component] of Object.entries(config.components)) {
      if (component.scaling.minReplicas < 2) {
        errors.push({
          path: `components.${componentId}.scaling.minReplicas`,
          message: 'Production environment should have at least 2 replicas for high availability',
          code: 'PRODUCTION_HA_REQUIREMENT',
          severity: 'error'
        });
      }
    }

    // Production should have monitoring enabled
    if (!config.monitoring.metrics.enabled) {
      errors.push({
        path: 'monitoring.metrics.enabled',
        message: 'Metrics monitoring must be enabled in production',
        code: 'PRODUCTION_MONITORING_REQUIREMENT',
        severity: 'error'
      });
    }

    return errors;
  }

  private validateStagingEnvironment(config: Configuration): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Staging-specific validations can be added here
    
    return errors;
  }

  private validateDevelopmentEnvironment(config: Configuration): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Development-specific validations can be added here
    
    return errors;
  }

  private validatePath(config: Configuration, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Get the value at the path
    const value = this.getValueAtPath(config, path);
    if (value === undefined) {
      return errors; // Path doesn't exist, nothing to validate
    }

    return this.validatePathValue(path, value);
  }

  private validatePathValue(path: string, value: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate based on the path
    if (path.includes('resources')) {
      errors.push(...this.validateResourceValue(path, value));
    } else if (path.includes('scaling')) {
      errors.push(...this.validateScalingValue(path, value));
    } else if (path.includes('security')) {
      errors.push(...this.validateSecurityValue(path, value));
    } else if (path.includes('system.name')) {
      if (typeof value !== 'string' || value.length === 0) {
        errors.push({
          path,
          message: 'System name must be a non-empty string',
          code: 'INVALID_SYSTEM_NAME',
          severity: 'error'
        });
      }
    } else if (path.includes('system.version')) {
      if (typeof value !== 'string' || !/^\d+\.\d+\.\d+/.test(value)) {
        errors.push({
          path,
          message: 'System version must follow semantic versioning (e.g., 1.0.0)',
          code: 'INVALID_VERSION_FORMAT',
          severity: 'error'
        });
      }
    }

    return errors;
  }

  private validateResourceValue(path: string, value: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Resource-specific validation logic
    if (path.endsWith('.cpu') || path.endsWith('.memory')) {
      if (typeof value !== 'string' || !this.isValidResourceValue(value)) {
        errors.push({
          path,
          message: 'Invalid resource value format',
          code: 'INVALID_RESOURCE_FORMAT',
          severity: 'error'
        });
      }
    }
    
    return errors;
  }

  private validateScalingValue(path: string, value: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Scaling-specific validation logic
    if (path.endsWith('.minReplicas') || path.endsWith('.maxReplicas')) {
      if (typeof value !== 'number' || value < 1) {
        errors.push({
          path,
          message: 'Replica count must be a positive number',
          code: 'INVALID_REPLICA_COUNT',
          severity: 'error'
        });
      }
    }
    
    return errors;
  }

  private validateSecurityValue(path: string, value: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Security-specific validation logic - simplified for partial validation
    if (path.includes('encryption') && path.endsWith('.enabled')) {
      if (typeof value !== 'boolean') {
        errors.push({
          path,
          message: 'Encryption enabled flag must be a boolean',
          code: 'INVALID_ENCRYPTION_FLAG',
          severity: 'error'
        });
      }
    }
    
    return errors;
  }

  private generateBestPracticeWarnings(config: Configuration): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for best practices
    if (config.system.environment === 'production') {
      // Warn if log sampling is not enabled in production
      if (!config.system.logging.sampling.enabled) {
        warnings.push({
          path: 'system.logging.sampling.enabled',
          message: 'Consider enabling log sampling in production to reduce log volume',
          code: 'BEST_PRACTICE_LOG_SAMPLING'
        });
      }

      // Warn if rate limiting is not enabled in production
      if (!config.system.performance.rateLimit.enabled) {
        warnings.push({
          path: 'system.performance.rateLimit.enabled',
          message: 'Consider enabling rate limiting in production for better resource protection',
          code: 'BEST_PRACTICE_RATE_LIMITING'
        });
      }
    }

    return warnings;
  }

  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private parseResourceValue(value: string): number {
    // Simple parser for Kubernetes resource values
    const match = value.match(/^(\d+(?:\.\d+)?)(m|Mi|Gi|Ti)?$/);
    if (!match) return 0;
    
    const [, amount, unit] = match;
    const numAmount = parseFloat(amount);
    
    switch (unit) {
      case 'm': return numAmount / 1000; // millicores to cores
      case 'Mi': return numAmount * 1024 * 1024; // MiB to bytes
      case 'Gi': return numAmount * 1024 * 1024 * 1024; // GiB to bytes
      case 'Ti': return numAmount * 1024 * 1024 * 1024 * 1024; // TiB to bytes
      default: return numAmount;
    }
  }

  private isValidResourceValue(value: string): boolean {
    return /^(\d+(?:\.\d+)?)(m|Mi|Gi|Ti)?$/.test(value);
  }
}