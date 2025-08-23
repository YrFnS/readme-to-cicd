/**
 * Configuration Store Implementation
 * 
 * Provides persistent storage for configuration data with environment-specific support.
 * Supports multiple storage backends including file system, database, and cloud storage.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import {
  Configuration,
  ConfigValue,
  Environment
} from '../types/configuration-types.js';

export interface ConfigurationStoreOptions {
  type: 'file' | 'database' | 'redis' | 'cloud';
  basePath?: string;
  connectionString?: string;
  encryption?: boolean;
  backup?: boolean;
}

export abstract class ConfigurationStore {
  protected options: ConfigurationStoreOptions;

  constructor(options: ConfigurationStoreOptions) {
    this.options = options;
  }

  abstract get(key: string, environment?: string): Promise<ConfigValue>;
  abstract set(key: string, value: ConfigValue, environment?: string): Promise<void>;
  abstract delete(key: string, environment?: string): Promise<void>;
  abstract getAll(environment?: string): Promise<Configuration>;
  abstract setAll(config: Configuration, environment?: string): Promise<void>;
  abstract getKeys(environment?: string): Promise<string[]>;
  abstract exists(key: string, environment?: string): Promise<boolean>;
  abstract clear(environment?: string): Promise<void>;
}

/**
 * File-based configuration store
 */
export class FileConfigurationStore extends ConfigurationStore {
  private readonly basePath: string;
  private readonly configCache: Map<string, { config: Configuration; timestamp: number }>;
  private readonly cacheTimeout = 30000; // 30 seconds

  constructor(options: ConfigurationStoreOptions) {
    super(options);
    this.basePath = options.basePath || './config';
    this.configCache = new Map();
  }

  async get(key: string, environment?: string): Promise<ConfigValue> {
    const config = await this.loadConfiguration(environment);
    return this.getValueFromPath(config, key);
  }

  async set(key: string, value: ConfigValue, environment?: string): Promise<void> {
    const config = await this.loadConfiguration(environment);
    this.setValueAtPath(config, key, value);
    await this.saveConfiguration(config, environment);
    this.invalidateCache(environment);
  }

  async delete(key: string, environment?: string): Promise<void> {
    const config = await this.loadConfiguration(environment);
    this.deleteValueAtPath(config, key);
    await this.saveConfiguration(config, environment);
    this.invalidateCache(environment);
  }

  async getAll(environment?: string): Promise<Configuration> {
    return await this.loadConfiguration(environment);
  }

  async setAll(config: Configuration, environment?: string): Promise<void> {
    await this.saveConfiguration(config, environment);
    this.invalidateCache(environment);
  }

  async getKeys(environment?: string): Promise<string[]> {
    const config = await this.loadConfiguration(environment);
    return this.extractKeys(config);
  }

  async exists(key: string, environment?: string): Promise<boolean> {
    const config = await this.loadConfiguration(environment);
    return this.getValueFromPath(config, key) !== undefined;
  }

  async clear(environment?: string): Promise<void> {
    const emptyConfig: Configuration = {
      system: {
        name: '',
        version: '',
        environment: environment as Environment || 'development',
        region: '',
        timezone: '',
        logging: {
          level: 'info',
          format: 'json',
          destinations: [],
          sampling: { enabled: false, rate: 1, maxPerSecond: 1000 }
        },
        performance: {
          timeouts: { request: 30000, connection: 5000, idle: 60000, keepAlive: 30000 },
          retries: { maxAttempts: 3, backoffStrategy: 'exponential', initialDelay: 1000, maxDelay: 10000, jitter: true },
          circuitBreaker: { enabled: true, failureThreshold: 5, recoveryTimeout: 30000, halfOpenMaxCalls: 3 },
          rateLimit: { enabled: false, requestsPerSecond: 100, burstSize: 200, strategy: 'token-bucket' }
        }
      },
      components: {},
      deployment: {
        strategy: 'rolling',
        environments: {},
        infrastructure: {
          provider: 'kubernetes',
          regions: [],
          networking: { ports: [], ingress: { enabled: false, className: '', annotations: {}, hosts: [], tls: [] }, serviceMesh: { enabled: false, provider: 'istio', settings: {} } },
          security: {
            authentication: { type: 'oauth', provider: '', settings: {} },
            authorization: { type: 'rbac', policies: [], roles: [] },
            encryption: {
              atRest: { enabled: true, algorithm: 'AES-256', keyProvider: 'vault', settings: {} },
              inTransit: { enabled: true, tlsVersion: '1.3', cipherSuites: [], certificateProvider: 'cert-manager' },
              keyManagement: { provider: 'vault', rotationPolicy: { enabled: true, intervalDays: 90, autoRotate: true }, settings: {} }
            },
            compliance: { frameworks: [], policies: [], reporting: { enabled: false, schedule: '', recipients: [], format: 'json' } },
            audit: { enabled: true, level: 'standard', retention: { days: 365, archiveAfterDays: 90, deleteAfterDays: 2555 }, destinations: [] }
          },
          monitoring: {
            metrics: { enabled: true, provider: 'prometheus', scrapeInterval: 30, retention: '30d', exporters: [] },
            logging: {
              level: 'info',
              format: 'json',
              destinations: [],
              sampling: { enabled: false, rate: 1, maxPerSecond: 1000 }
            },
            tracing: { enabled: true, provider: 'jaeger', samplingRate: 0.1, exporters: [] },
            alerting: { enabled: true, rules: [], channels: [], escalation: [] },
            dashboards: []
          }
        },
        validation: { enabled: true, rules: [], onFailure: 'warn' },
        rollback: { enabled: true, strategy: 'automatic', triggers: [], maxVersions: 10 }
      },
      security: {
        authentication: { type: 'oauth', provider: '', settings: {} },
        authorization: { type: 'rbac', policies: [], roles: [] },
        encryption: {
          atRest: { enabled: true, algorithm: 'AES-256', keyProvider: 'vault', settings: {} },
          inTransit: { enabled: true, tlsVersion: '1.3', cipherSuites: [], certificateProvider: 'cert-manager' },
          keyManagement: { provider: 'vault', rotationPolicy: { enabled: true, intervalDays: 90, autoRotate: true }, settings: {} }
        },
        compliance: { frameworks: [], policies: [], reporting: { enabled: false, schedule: '', recipients: [], format: 'json' } },
        audit: { enabled: true, level: 'standard', retention: { days: 365, archiveAfterDays: 90, deleteAfterDays: 2555 }, destinations: [] }
      },
      monitoring: {
        metrics: { enabled: true, provider: 'prometheus', scrapeInterval: 30, retention: '30d', exporters: [] },
        logging: {
          level: 'info',
          format: 'json',
          destinations: [],
          sampling: { enabled: false, rate: 1, maxPerSecond: 1000 }
        },
        tracing: { enabled: true, provider: 'jaeger', samplingRate: 0.1, exporters: [] },
        alerting: { enabled: true, rules: [], channels: [], escalation: [] },
        dashboards: []
      },
      integrations: {}
    };

    await this.saveConfiguration(emptyConfig, environment);
    this.invalidateCache(environment);
  }

  private async loadConfiguration(environment?: string): Promise<Configuration> {
    const cacheKey = environment || 'default';
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.config;
    }

    try {
      const filePath = this.getConfigFilePath(environment);
      const data = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(data) as Configuration;
      
      // Cache the configuration
      this.configCache.set(cacheKey, {
        config,
        timestamp: Date.now()
      });
      
      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return default configuration
        const defaultConfig = await this.createDefaultConfiguration(environment);
        await this.saveConfiguration(defaultConfig, environment);
        return defaultConfig;
      }
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  private async saveConfiguration(config: Configuration, environment?: string): Promise<void> {
    try {
      const filePath = this.getConfigFilePath(environment);
      const dirPath = dirname(filePath);
      
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });
      
      // Write configuration with pretty formatting
      const data = JSON.stringify(config, null, 2);
      await fs.writeFile(filePath, data, 'utf-8');
      
      // Create backup if enabled
      if (this.options.backup) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, data, 'utf-8');
      }
      
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  private getConfigFilePath(environment?: string): string {
    const filename = environment ? `config.${environment}.json` : 'config.json';
    return join(this.basePath, filename);
  }

  private getValueFromPath(obj: any, path: string): ConfigValue {
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

  private setValueAtPath(obj: any, path: string, value: ConfigValue): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private deleteValueAtPath(obj: any, path: string): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        return; // Path doesn't exist
      }
      current = current[part];
    }
    
    delete current[parts[parts.length - 1]];
  }

  private extractKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.extractKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  private invalidateCache(environment?: string): void {
    const cacheKey = environment || 'default';
    this.configCache.delete(cacheKey);
  }

  private async createDefaultConfiguration(environment?: string): Promise<Configuration> {
    const env = environment as Environment || 'development';
    
    return {
      system: {
        name: 'readme-to-cicd',
        version: '1.0.0',
        environment: env,
        region: 'us-east-1',
        timezone: 'UTC',
        logging: {
          level: env === 'production' ? 'info' : 'debug',
          format: 'json',
          destinations: [
            { type: 'console', settings: {} }
          ],
          sampling: {
            enabled: env === 'production',
            rate: 0.1,
            maxPerSecond: 1000
          }
        },
        performance: {
          timeouts: {
            request: 30000,
            connection: 5000,
            idle: 60000,
            keepAlive: 30000
          },
          retries: {
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            initialDelay: 1000,
            maxDelay: 10000,
            jitter: true
          },
          circuitBreaker: {
            enabled: true,
            failureThreshold: 5,
            recoveryTimeout: 30000,
            halfOpenMaxCalls: 3
          },
          rateLimit: {
            enabled: env === 'production',
            requestsPerSecond: 100,
            burstSize: 200,
            strategy: 'token-bucket'
          }
        }
      },
      components: {},
      deployment: {
        strategy: 'rolling',
        environments: {
          [env]: {
            name: env,
            replicas: env === 'production' ? 3 : 1,
            resources: {
              cpu: env === 'production' ? '1000m' : '500m',
              memory: env === 'production' ? '2Gi' : '1Gi',
              storage: '10Gi',
              limits: {
                cpu: env === 'production' ? '2000m' : '1000m',
                memory: env === 'production' ? '4Gi' : '2Gi',
                storage: '20Gi'
              }
            },
            networking: {
              ports: [
                { name: 'http', port: 8080, targetPort: 8080, protocol: 'TCP' }
              ],
              ingress: {
                enabled: env === 'production',
                className: 'nginx',
                annotations: {},
                hosts: [],
                tls: []
              },
              serviceMesh: {
                enabled: env === 'production',
                provider: 'istio',
                settings: {}
              }
            },
            storage: {
              volumes: [],
              persistentVolumes: []
            },
            variables: {}
          }
        },
        infrastructure: {
          provider: 'kubernetes',
          regions: ['us-east-1'],
          networking: {
            ports: [
              { name: 'http', port: 8080, targetPort: 8080, protocol: 'TCP' }
            ],
            ingress: {
              enabled: false,
              className: 'nginx',
              annotations: {},
              hosts: [],
              tls: []
            },
            serviceMesh: {
              enabled: false,
              provider: 'istio',
              settings: {}
            }
          },
          security: {
            authentication: { type: 'oauth', provider: '', settings: {} },
            authorization: { type: 'rbac', policies: [], roles: [] },
            encryption: {
              atRest: { enabled: true, algorithm: 'AES-256', keyProvider: 'vault', settings: {} },
              inTransit: { enabled: true, tlsVersion: '1.3', cipherSuites: [], certificateProvider: 'cert-manager' },
              keyManagement: { provider: 'vault', rotationPolicy: { enabled: true, intervalDays: 90, autoRotate: true }, settings: {} }
            },
            compliance: { frameworks: [], policies: [], reporting: { enabled: false, schedule: '', recipients: [], format: 'json' } },
            audit: { enabled: true, level: 'standard', retention: { days: 365, archiveAfterDays: 90, deleteAfterDays: 2555 }, destinations: [] }
          },
          monitoring: {
            metrics: { enabled: true, provider: 'prometheus', scrapeInterval: 30, retention: '30d', exporters: [] },
            logging: {
              level: 'info',
              format: 'json',
              destinations: [],
              sampling: { enabled: false, rate: 1, maxPerSecond: 1000 }
            },
            tracing: { enabled: true, provider: 'jaeger', samplingRate: 0.1, exporters: [] },
            alerting: { enabled: true, rules: [], channels: [], escalation: [] },
            dashboards: []
          }
        },
        validation: {
          enabled: true,
          rules: [],
          onFailure: 'warn'
        },
        rollback: {
          enabled: true,
          strategy: 'automatic',
          triggers: [],
          maxVersions: 10
        }
      },
      security: {
        authentication: { type: 'oauth', provider: '', settings: {} },
        authorization: { type: 'rbac', policies: [], roles: [] },
        encryption: {
          atRest: { enabled: true, algorithm: 'AES-256', keyProvider: 'vault', settings: {} },
          inTransit: { enabled: true, tlsVersion: '1.3', cipherSuites: [], certificateProvider: 'cert-manager' },
          keyManagement: { provider: 'vault', rotationPolicy: { enabled: true, intervalDays: 90, autoRotate: true }, settings: {} }
        },
        compliance: { frameworks: [], policies: [], reporting: { enabled: false, schedule: '', recipients: [], format: 'json' } },
        audit: { enabled: true, level: 'standard', retention: { days: 365, archiveAfterDays: 90, deleteAfterDays: 2555 }, destinations: [] }
      },
      monitoring: {
        metrics: { enabled: true, provider: 'prometheus', scrapeInterval: 30, retention: '30d', exporters: [] },
        logging: {
          level: env === 'production' ? 'info' : 'debug',
          format: 'json',
          destinations: [
            { type: 'console', settings: {} }
          ],
          sampling: {
            enabled: env === 'production',
            rate: 0.1,
            maxPerSecond: 1000
          }
        },
        tracing: { enabled: true, provider: 'jaeger', samplingRate: 0.1, exporters: [] },
        alerting: { enabled: true, rules: [], channels: [], escalation: [] },
        dashboards: []
      },
      integrations: {}
    };
  }
}