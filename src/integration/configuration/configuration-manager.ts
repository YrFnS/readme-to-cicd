/**
 * Configuration Manager
 * 
 * Centralized configuration management system that handles system-wide
 * configuration, environment-specific settings, and cross-component
 * configuration propagation.
 */

import { Logger } from '../../cli/lib/logger';
import { Result, success, failure } from '../../shared/types/result';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Configuration value types
 */
export type ConfigValue = string | number | boolean | object | null;

/**
 * Configuration change callback
 */
export type ConfigChangeCallback = (key: string, oldValue: ConfigValue, newValue: ConfigValue) => void;

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration migration definition
 */
export interface ConfigMigration {
  version: string;
  description: string;
  migrate: (config: Configuration) => Promise<Configuration>;
}

/**
 * System configuration structure
 */
export interface Configuration {
  version: string;
  system: SystemConfig;
  components: ComponentConfigs;
  deployment: DeploymentConfigs;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  integrations: IntegrationConfigs;
}

export interface SystemConfig {
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConcurrentWorkflows: number;
  defaultTimeout: number;
  retryAttempts: number;
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
}

export interface ComponentConfigs {
  readmeParser: {
    enableCaching: boolean;
    cacheSize: number;
    cacheTtl: number;
    enablePerformanceMonitoring: boolean;
  };
  frameworkDetector: {
    confidenceThreshold: number;
    enableCustomRules: boolean;
    customRulesPath?: string;
  };
  yamlGenerator: {
    templatePath: string;
    enableAdvancedPatterns: boolean;
    defaultWorkflowTypes: string[];
    optimizationLevel: 'basic' | 'standard' | 'advanced';
  };
  cliTool: {
    enableInteractiveMode: boolean;
    defaultOutputDir: string;
    enableColorOutput: boolean;
  };
}

export interface DeploymentConfigs {
  strategies: {
    default: 'blue-green' | 'canary' | 'rolling' | 'recreate';
    blueGreen: {
      switchTrafficDelay: number;
      rollbackTimeout: number;
    };
    canary: {
      stages: number[];
      progressionDelay: number;
      rollbackThreshold: number;
    };
    rolling: {
      batchSize: number;
      maxUnavailable: number;
    };
  };
  environments: {
    development: EnvironmentConfig;
    staging: EnvironmentConfig;
    production: EnvironmentConfig;
  };
}

export interface EnvironmentConfig {
  replicas: number;
  resources: {
    cpu: string;
    memory: string;
  };
  secrets: string[];
  configMaps: string[];
  ingress: {
    enabled: boolean;
    host?: string;
    tls?: boolean;
  };
}

export interface SecurityConfig {
  authentication: {
    enabled: boolean;
    type: 'oauth' | 'jwt' | 'api-key';
    configuration: Record<string, any>;
  };
  authorization: {
    enabled: boolean;
    rbac: {
      enabled: boolean;
      roles: string[];
    };
  };
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm: string;
  };
  secrets: {
    provider: 'local' | 'vault' | 'k8s' | 'aws-secrets-manager';
    configuration: Record<string, any>;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    port: number;
    path: string;
    interval: number;
  };
  logging: {
    level: string;
    format: 'json' | 'text';
    output: 'console' | 'file' | 'both';
    filePath?: string;
  };
  tracing: {
    enabled: boolean;
    sampler: number;
    endpoint?: string;
  };
  alerts: {
    enabled: boolean;
    channels: string[];
    thresholds: Record<string, number>;
  };
}

export interface IntegrationConfigs {
  webhooks: {
    enabled: boolean;
    endpoints: WebhookEndpoint[];
  };
  apis: {
    enabled: boolean;
    port: number;
    cors: boolean;
    rateLimit: {
      enabled: boolean;
      requests: number;
      window: number;
    };
  };
  databases: {
    primary: DatabaseConfig;
    cache?: DatabaseConfig;
  };
}

export interface WebhookEndpoint {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mongodb' | 'redis';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
}

/**
 * Centralized configuration management system
 */
export class ConfigurationManager {
  private logger: Logger;
  private config: Configuration;
  private configPath: string;
  private watchers: Map<string, ConfigChangeCallback[]> = new Map();
  private isInitialized = false;

  constructor(logger: Logger, configPath?: string) {
    this.logger = logger;
    this.configPath = configPath || path.join(process.cwd(), 'config', 'system.json');
    this.config = this.getDefaultConfiguration();
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<Result<void>> {
    try {
      this.logger.info('Initializing ConfigurationManager...');

      // Load configuration from file if it exists
      const loadResult = await this.loadConfiguration();
      if (!loadResult.success) {
        this.logger.warn('Failed to load configuration, using defaults', {
          error: loadResult.error
        });
      }

      // Validate configuration
      const validationResult = await this.validateConfiguration(this.config);
      if (!validationResult.valid) {
        this.logger.error('Configuration validation failed', {
          errors: validationResult.errors
        });
        return failure(new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`));
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        this.logger.warn('Configuration warnings', {
          warnings: validationResult.warnings
        });
      }

      this.isInitialized = true;
      this.logger.info('ConfigurationManager initialized successfully');

      return success(undefined);

    } catch (error) {
      const errorMessage = `Failed to initialize ConfigurationManager: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { error });
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Get configuration value by key
   */
  async getConfiguration(key: string, environment?: string): Promise<ConfigValue> {
    if (!this.isInitialized) {
      throw new Error('ConfigurationManager not initialized');
    }

    try {
      // Handle environment-specific configuration
      if (environment) {
        const envKey = `${key}.${environment}`;
        const envValue = this.getNestedValue(this.config, envKey);
        if (envValue !== undefined) {
          return envValue;
        }
      }

      // Get regular configuration value
      return this.getNestedValue(this.config, key);

    } catch (error) {
      this.logger.error('Failed to get configuration', {
        key,
        environment,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Set configuration value by key
   */
  async setConfiguration(key: string, value: ConfigValue, environment?: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ConfigurationManager not initialized');
    }

    try {
      const oldValue = await this.getConfiguration(key, environment);

      // Handle environment-specific configuration
      if (environment) {
        const envKey = `${key}.${environment}`;
        this.setNestedValue(this.config, envKey, value);
      } else {
        this.setNestedValue(this.config, key, value);
      }

      // Persist configuration
      await this.saveConfiguration();

      // Notify watchers
      this.notifyWatchers(key, oldValue, value);

      this.logger.info('Configuration updated', {
        key,
        environment,
        oldValue,
        newValue: value
      });

    } catch (error) {
      this.logger.error('Failed to set configuration', {
        key,
        value,
        environment,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate configuration against schema
   */
  async validateConfiguration(config: Configuration): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate required fields
      if (!config.version) {
        errors.push('Configuration version is required');
      }

      if (!config.system) {
        errors.push('System configuration is required');
      } else {
        // Validate system config
        if (!['development', 'staging', 'production'].includes(config.system.environment)) {
          errors.push('Invalid system environment');
        }

        if (config.system.maxConcurrentWorkflows <= 0) {
          errors.push('maxConcurrentWorkflows must be greater than 0');
        }

        if (config.system.defaultTimeout <= 0) {
          errors.push('defaultTimeout must be greater than 0');
        }
      }

      // Validate component configurations
      if (config.components) {
        if (config.components.frameworkDetector?.confidenceThreshold < 0 || 
            config.components.frameworkDetector?.confidenceThreshold > 1) {
          errors.push('Framework detector confidence threshold must be between 0 and 1');
        }
      }

      // Validate deployment configurations
      if (config.deployment) {
        const validStrategies = ['blue-green', 'canary', 'rolling', 'recreate'];
        if (!validStrategies.includes(config.deployment.strategies.default)) {
          errors.push('Invalid default deployment strategy');
        }
      }

      // Validate security configurations
      if (config.security) {
        if (config.security.authentication.enabled && !config.security.authentication.type) {
          errors.push('Authentication type is required when authentication is enabled');
        }
      }

      // Add warnings for potentially problematic configurations
      if (config.system?.maxConcurrentWorkflows > 50) {
        warnings.push('High maxConcurrentWorkflows may impact performance');
      }

      if (config.system?.defaultTimeout > 600000) { // 10 minutes
        warnings.push('Very high default timeout may cause resource issues');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Configuration validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings
      };
    }
  }

  /**
   * Watch for configuration changes
   */
  async watchConfiguration(key: string, callback: ConfigChangeCallback): Promise<void> {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }
    this.watchers.get(key)!.push(callback);

    this.logger.debug('Added configuration watcher', { key });
  }

  /**
   * Migrate configuration to new version
   */
  async migrateConfiguration(migration: ConfigMigration): Promise<void> {
    try {
      this.logger.info('Migrating configuration', {
        version: migration.version,
        description: migration.description
      });

      const migratedConfig = await migration.migrate(this.config);
      
      // Validate migrated configuration
      const validationResult = await this.validateConfiguration(migratedConfig);
      if (!validationResult.valid) {
        throw new Error(`Migration validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Update configuration
      this.config = migratedConfig;
      this.config.version = migration.version;

      // Save migrated configuration
      await this.saveConfiguration();

      this.logger.info('Configuration migration completed', {
        version: migration.version
      });

    } catch (error) {
      this.logger.error('Configuration migration failed', {
        version: migration.version,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update component configuration and propagate changes
   */
  async updateComponentConfiguration(component: string, configuration: Record<string, any>): Promise<void> {
    try {
      const key = `components.${component}`;
      const oldConfig = await this.getConfiguration(key);

      // Merge with existing configuration
      const newConfig = {
        ...(typeof oldConfig === 'object' && oldConfig !== null ? oldConfig : {}),
        ...configuration
      };

      await this.setConfiguration(key, newConfig);

      this.logger.info('Component configuration updated', {
        component,
        configuration: newConfig
      });

    } catch (error) {
      this.logger.error('Failed to update component configuration', {
        component,
        configuration,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get current configuration status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    version: string;
    environment: string;
    configPath: string;
    lastModified?: Date;
  }> {
    try {
      let lastModified: Date | undefined;
      
      try {
        const stats = await fs.stat(this.configPath);
        lastModified = stats.mtime;
      } catch {
        // File doesn't exist or can't be accessed
      }

      return {
        initialized: this.isInitialized,
        version: this.config.version,
        environment: this.config.system.environment,
        configPath: this.configPath,
        lastModified
      };

    } catch (error) {
      this.logger.error('Failed to get configuration status', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        initialized: this.isInitialized,
        version: 'unknown',
        environment: 'unknown',
        configPath: this.configPath
      };
    }
  }

  /**
   * Shutdown configuration manager
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down ConfigurationManager...');

      // Save current configuration
      await this.saveConfiguration();

      // Clear watchers
      this.watchers.clear();

      this.isInitialized = false;
      this.logger.info('ConfigurationManager shutdown completed');

    } catch (error) {
      this.logger.error('Error during ConfigurationManager shutdown', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Private helper methods

  private async loadConfiguration(): Promise<Result<Configuration>> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as Configuration;
      
      // Merge with defaults to ensure all required fields exist
      this.config = this.mergeWithDefaults(config);
      
      return success(this.config);

    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // Config file doesn't exist, use defaults
        return failure(new Error('Configuration file not found'));
      }
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Write configuration to file
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');

    } catch (error) {
      this.logger.error('Failed to save configuration', {
        configPath: this.configPath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private getNestedValue(obj: any, key: string): ConfigValue {
    const keys = key.split('.');
    let current = obj;

    for (const k of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[k];
    }

    return current;
  }

  private setNestedValue(obj: any, key: string, value: ConfigValue): void {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (current[k] === null || current[k] === undefined || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  private notifyWatchers(key: string, oldValue: ConfigValue, newValue: ConfigValue): void {
    const watchers = this.watchers.get(key);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(key, oldValue, newValue);
        } catch (error) {
          this.logger.error('Configuration watcher callback failed', {
            key,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
    }
  }

  private getDefaultConfiguration(): Configuration {
    return {
      version: '1.0.0',
      system: {
        environment: 'development',
        logLevel: 'info',
        maxConcurrentWorkflows: 10,
        defaultTimeout: 300000,
        retryAttempts: 3,
        enableMetrics: true,
        enableHealthChecks: true,
        healthCheckInterval: 60000
      },
      components: {
        readmeParser: {
          enableCaching: true,
          cacheSize: 100,
          cacheTtl: 3600000,
          enablePerformanceMonitoring: true
        },
        frameworkDetector: {
          confidenceThreshold: 0.7,
          enableCustomRules: false
        },
        yamlGenerator: {
          templatePath: './templates',
          enableAdvancedPatterns: true,
          defaultWorkflowTypes: ['ci', 'cd'],
          optimizationLevel: 'standard'
        },
        cliTool: {
          enableInteractiveMode: true,
          defaultOutputDir: './.github/workflows',
          enableColorOutput: true
        }
      },
      deployment: {
        strategies: {
          default: 'rolling',
          blueGreen: {
            switchTrafficDelay: 30000,
            rollbackTimeout: 300000
          },
          canary: {
            stages: [10, 25, 50, 100],
            progressionDelay: 60000,
            rollbackThreshold: 0.05
          },
          rolling: {
            batchSize: 25,
            maxUnavailable: 1
          }
        },
        environments: {
          development: {
            replicas: 1,
            resources: { cpu: '100m', memory: '128Mi' },
            secrets: [],
            configMaps: [],
            ingress: { enabled: false }
          },
          staging: {
            replicas: 2,
            resources: { cpu: '200m', memory: '256Mi' },
            secrets: [],
            configMaps: [],
            ingress: { enabled: true }
          },
          production: {
            replicas: 3,
            resources: { cpu: '500m', memory: '512Mi' },
            secrets: [],
            configMaps: [],
            ingress: { enabled: true, tls: true }
          }
        }
      },
      security: {
        authentication: {
          enabled: false,
          type: 'jwt',
          configuration: {}
        },
        authorization: {
          enabled: false,
          rbac: {
            enabled: false,
            roles: []
          }
        },
        encryption: {
          atRest: true,
          inTransit: true,
          algorithm: 'AES-256-GCM'
        },
        secrets: {
          provider: 'local',
          configuration: {}
        }
      },
      monitoring: {
        enabled: true,
        metrics: {
          enabled: true,
          port: 9090,
          path: '/metrics',
          interval: 15000
        },
        logging: {
          level: 'info',
          format: 'json',
          output: 'console'
        },
        tracing: {
          enabled: false,
          sampler: 0.1
        },
        alerts: {
          enabled: false,
          channels: [],
          thresholds: {}
        }
      },
      integrations: {
        webhooks: {
          enabled: false,
          endpoints: []
        },
        apis: {
          enabled: true,
          port: 3000,
          cors: true,
          rateLimit: {
            enabled: true,
            requests: 100,
            window: 60000
          }
        },
        databases: {
          primary: {
            type: 'postgresql',
            host: 'localhost',
            port: 5432,
            database: 'readme_to_cicd',
            username: 'postgres',
            password: 'password',
            ssl: false,
            poolSize: 10
          }
        }
      }
    };
  }

  private mergeWithDefaults(config: Partial<Configuration>): Configuration {
    const defaults = this.getDefaultConfiguration();
    
    // Deep merge configuration with defaults
    return this.deepMerge(defaults, config);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}