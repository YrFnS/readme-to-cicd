/**
 * Configuration Manager Implementation
 * 
 * Provides centralized configuration management with environment-specific configurations,
 * validation, change propagation, and versioning capabilities.
 */

import { EventEmitter } from 'events';
import {
  ConfigurationManager as IConfigurationManager,
  Configuration,
  ConfigValue,
  ValidationResult,
  ConfigChangeCallback,
  ConfigMigration,
  ConfigurationChange,
  ConfigurationVersion,
  ConfigurationHistory,
  Environment,
  ValidationError,
  ValidationWarning,
  ConfigurationNotification,
  NotificationChannel
} from '../types/configuration-types.js';
import { ConfigurationStore } from '../storage/configuration-store.js';
import { ConfigurationValidator } from '../validation/configuration-validator.js';
import { ConfigurationNotifier } from '../notification/configuration-notifier.js';
import { ConfigurationVersionManager } from '../versioning/configuration-version-manager.js';

export class ConfigurationManager extends EventEmitter implements IConfigurationManager {
  private store: ConfigurationStore;
  private validator: ConfigurationValidator;
  private notifier: ConfigurationNotifier;
  private versionManager: ConfigurationVersionManager;
  private watchers: Map<string, Set<ConfigChangeCallback>>;
  private cache: Map<string, { value: ConfigValue; timestamp: Date; ttl: number }>;
  private readonly cacheTTL = 300000; // 5 minutes

  constructor(
    store: ConfigurationStore,
    validator: ConfigurationValidator,
    notifier: ConfigurationNotifier,
    versionManager: ConfigurationVersionManager
  ) {
    super();
    this.store = store;
    this.validator = validator;
    this.notifier = notifier;
    this.versionManager = versionManager;
    this.watchers = new Map();
    this.cache = new Map();

    // Set up periodic cache cleanup
    setInterval(() => this.cleanupCache(), 60000); // Every minute
  }

  /**
   * Get configuration value by key and optional environment
   */
  async getConfiguration(key: string, environment?: string): Promise<ConfigValue> {
    const cacheKey = this.getCacheKey(key, environment);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < cached.ttl) {
      return cached.value;
    }

    try {
      const value = await this.store.get(key, environment);
      
      // Cache the result
      this.cache.set(cacheKey, {
        value,
        timestamp: new Date(),
        ttl: this.cacheTTL
      });

      return value;
    } catch (error) {
      throw new Error(`Failed to get configuration for key '${key}': ${error.message}`);
    }
  }

  /**
   * Set configuration value with validation and change propagation
   */
  async setConfiguration(key: string, value: ConfigValue, environment?: string): Promise<void> {
    try {
      // Get current value for change detection (handle case where config doesn't exist yet)
      let oldValue: ConfigValue = null;
      try {
        oldValue = await this.store.get(key, environment);
      } catch (error) {
        // Configuration doesn't exist yet, that's fine
        oldValue = null;
      }

      // Validate the new value
      const validationResult = await this.validateConfigurationValue(key, value, environment);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map(e => e.message).join(', ');
        throw new Error(`Configuration validation failed: ${errorMessages}`);
      }

      // Create version snapshot before change
      if (oldValue !== null) {
        await this.versionManager.createSnapshot(key, oldValue, environment, 'Configuration update');
      }

      // Store the new value
      try {
        await this.store.set(key, value, environment);
      } catch (error) {
        // If this is the first time setting a value, the config file might not exist
        // Try to create a default configuration first
        if (error.message.includes('ENOENT') || error.message.includes('Failed to load configuration')) {
          // Initialize with a minimal configuration and try again
          await this.store.setAll(await this.createMinimalConfiguration(environment), environment);
          await this.store.set(key, value, environment);
        } else {
          throw error;
        }
      }

      // Clear cache
      const cacheKey = this.getCacheKey(key, environment);
      this.cache.delete(cacheKey);

      // Create change event
      const change: ConfigurationChange = {
        key,
        oldValue,
        newValue: value,
        environment: environment || 'default',
        timestamp: new Date(),
        source: 'configuration-manager'
      };

      // Notify watchers
      await this.notifyWatchers(key, change);

      // Send notifications
      await this.notifier.notifyChange(change);

      // Emit event
      this.emit('configurationChanged', change);

    } catch (error) {
      throw new Error(`Failed to set configuration for key '${key}': ${error.message}`);
    }
  }

  /**
   * Validate entire configuration object
   */
  async validateConfiguration(config: Configuration): Promise<ValidationResult> {
    try {
      return await this.validator.validate(config);
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: `Validation error: ${error.message}`,
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Watch for configuration changes
   */
  async watchConfiguration(key: string, callback: ConfigChangeCallback): Promise<void> {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    
    this.watchers.get(key)!.add(callback);
  }

  /**
   * Stop watching configuration changes
   */
  unwatchConfiguration(key: string, callback: ConfigChangeCallback): void {
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      keyWatchers.delete(callback);
      if (keyWatchers.size === 0) {
        this.watchers.delete(key);
      }
    }
  }

  /**
   * Migrate configuration using migration script
   */
  async migrateConfiguration(migration: ConfigMigration): Promise<void> {
    try {
      // Get current configuration
      const currentConfig = await this.store.getAll();

      // Create backup version
      await this.versionManager.createFullSnapshot(
        currentConfig,
        `Pre-migration backup for ${migration.version}`
      );

      // Apply migration
      const migratedConfig = migration.up(currentConfig);

      // Validate migrated configuration
      const validationResult = await this.validateConfiguration(migratedConfig);
      if (!validationResult.valid) {
        throw new Error(`Migration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Store migrated configuration
      await this.store.setAll(migratedConfig);

      // Clear cache
      this.cache.clear();

      // Create post-migration version
      await this.versionManager.createFullSnapshot(
        migratedConfig,
        `Post-migration snapshot for ${migration.version}`
      );

      // Notify about migration
      const notification: ConfigurationNotification = {
        type: 'change',
        key: '*',
        environment: 'all',
        message: `Configuration migrated to version ${migration.version}`,
        timestamp: new Date(),
        metadata: { migrationVersion: migration.version }
      };

      await this.notifier.notify(notification);

    } catch (error) {
      throw new Error(`Configuration migration failed: ${error.message}`);
    }
  }

  /**
   * Get configuration history
   */
  async getConfigurationHistory(key?: string): Promise<ConfigurationHistory> {
    return await this.versionManager.getHistory(key);
  }

  /**
   * Rollback configuration to a specific version
   */
  async rollbackConfiguration(version: string, key?: string): Promise<void> {
    try {
      const configVersion = await this.versionManager.getVersion(version);
      if (!configVersion) {
        throw new Error(`Configuration version '${version}' not found`);
      }

      if (key) {
        // Rollback specific key
        const keyValue = this.getValueFromConfiguration(configVersion.configuration, key);
        if (keyValue !== undefined) {
          await this.setConfiguration(key, keyValue);
        }
      } else {
        // Rollback entire configuration
        await this.store.setAll(configVersion.configuration);
        this.cache.clear();

        // Notify about rollback
        const notification: ConfigurationNotification = {
          type: 'rollback',
          key: key || '*',
          environment: 'all',
          message: `Configuration rolled back to version ${version}`,
          timestamp: new Date(),
          metadata: { rollbackVersion: version }
        };

        await this.notifier.notify(notification);
      }

    } catch (error) {
      throw new Error(`Configuration rollback failed: ${error.message}`);
    }
  }

  /**
   * Get all configuration keys for an environment
   */
  async getConfigurationKeys(environment?: string): Promise<string[]> {
    return await this.store.getKeys(environment);
  }

  /**
   * Delete configuration key
   */
  async deleteConfiguration(key: string, environment?: string): Promise<void> {
    try {
      // Get current value for versioning
      let currentValue: ConfigValue = null;
      try {
        currentValue = await this.store.get(key, environment);
      } catch (error) {
        // Configuration doesn't exist yet, that's fine
        currentValue = null;
      }
      
      if (currentValue !== null) {
        // Create version snapshot before deletion
        await this.versionManager.createSnapshot(key, currentValue, environment, 'Configuration deletion');
      }

      // Delete from store
      await this.store.delete(key, environment);

      // Clear cache
      const cacheKey = this.getCacheKey(key, environment);
      this.cache.delete(cacheKey);

      // Create change event
      const change: ConfigurationChange = {
        key,
        oldValue: currentValue,
        newValue: null,
        environment: environment || 'default',
        timestamp: new Date(),
        source: 'configuration-manager'
      };

      // Notify watchers
      await this.notifyWatchers(key, change);

      // Send notifications
      await this.notifier.notifyChange(change);

    } catch (error) {
      throw new Error(`Failed to delete configuration for key '${key}': ${error.message}`);
    }
  }

  /**
   * Bulk update configurations
   */
  async bulkUpdateConfiguration(updates: Record<string, ConfigValue>, environment?: string): Promise<void> {
    const changes: ConfigurationChange[] = [];

    try {
      // Process all updates
      for (const [key, value] of Object.entries(updates)) {
        let oldValue: ConfigValue = null;
        try {
          oldValue = await this.store.get(key, environment);
        } catch (error) {
          // Configuration doesn't exist yet, that's fine
          oldValue = null;
        }
        
        // Validate each value
        const validationResult = await this.validateConfigurationValue(key, value, environment);
        if (!validationResult.valid) {
          throw new Error(`Validation failed for key '${key}': ${validationResult.errors.map(e => e.message).join(', ')}`);
        }

        // Create version snapshot
        if (oldValue !== null) {
          await this.versionManager.createSnapshot(key, oldValue, environment, 'Bulk update');
        }

        // Store the value
        await this.store.set(key, value, environment);

        // Track change
        changes.push({
          key,
          oldValue,
          newValue: value,
          environment: environment || 'default',
          timestamp: new Date(),
          source: 'configuration-manager'
        });
      }

      // Clear cache for all updated keys
      for (const key of Object.keys(updates)) {
        const cacheKey = this.getCacheKey(key, environment);
        this.cache.delete(cacheKey);
      }

      // Notify all changes
      for (const change of changes) {
        await this.notifyWatchers(change.key, change);
        await this.notifier.notifyChange(change);
        this.emit('configurationChanged', change);
      }

    } catch (error) {
      throw new Error(`Bulk configuration update failed: ${error.message}`);
    }
  }

  /**
   * Add notification channel
   */
  async addNotificationChannel(channel: NotificationChannel): Promise<void> {
    await this.notifier.addChannel(channel);
  }

  /**
   * Remove notification channel
   */
  async removeNotificationChannel(channelId: string): Promise<void> {
    await this.notifier.removeChannel(channelId);
  }

  // Private helper methods

  private getCacheKey(key: string, environment?: string): string {
    return `${key}:${environment || 'default'}`;
  }

  private async validateConfigurationValue(key: string, value: ConfigValue, environment?: string): Promise<ValidationResult> {
    // Create a minimal configuration object for validation
    const testConfig: Partial<Configuration> = {};
    this.setValueInConfiguration(testConfig, key, value);
    
    return await this.validator.validatePartial(testConfig, key);
  }

  private async notifyWatchers(key: string, change: ConfigurationChange): Promise<void> {
    const keyWatchers = this.watchers.get(key);
    if (keyWatchers) {
      for (const callback of keyWatchers) {
        try {
          callback(change);
        } catch (error) {
          console.error(`Error in configuration watcher for key '${key}':`, error);
        }
      }
    }

    // Also notify wildcard watchers
    const wildcardWatchers = this.watchers.get('*');
    if (wildcardWatchers) {
      for (const callback of wildcardWatchers) {
        try {
          callback(change);
        } catch (error) {
          console.error(`Error in wildcard configuration watcher:`, error);
        }
      }
    }
  }

  private getValueFromConfiguration(config: Configuration, key: string): ConfigValue {
    const parts = key.split('.');
    let current: any = config;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private setValueInConfiguration(config: any, key: string, value: ConfigValue): void {
    const parts = key.split('.');
    let current = config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp.getTime() >= cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private async createMinimalConfiguration(environment?: string): Promise<Configuration> {
    const env = (environment as any) || 'development';
    
    return {
      system: {
        name: 'readme-to-cicd',
        version: '1.0.0',
        environment: env,
        region: 'us-east-1',
        timezone: 'UTC',
        logging: {
          level: 'info',
          format: 'json',
          destinations: [{ type: 'console', settings: {} }],
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
          destinations: [{ type: 'console', settings: {} }],
          sampling: { enabled: false, rate: 1, maxPerSecond: 1000 }
        },
        tracing: { enabled: true, provider: 'jaeger', samplingRate: 0.1, exporters: [] },
        alerting: { enabled: true, rules: [], channels: [], escalation: [] },
        dashboards: []
      },
      integrations: {}
    };
  }
}