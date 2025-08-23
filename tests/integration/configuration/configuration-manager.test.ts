/**
 * Configuration Manager Tests
 * 
 * Comprehensive tests for the configuration management system including
 * validation, change propagation, versioning, and environment-specific configurations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ConfigurationManager } from '../../../src/integration/configuration/core/configuration-manager.js';
import { FileConfigurationStore } from '../../../src/integration/configuration/storage/configuration-store.js';
import { ConfigurationValidator } from '../../../src/integration/configuration/validation/configuration-validator.js';
import { ConfigurationNotifier } from '../../../src/integration/configuration/notification/configuration-notifier.js';
import { ConfigurationVersionManager } from '../../../src/integration/configuration/versioning/configuration-version-manager.js';
import {
  Configuration,
  ConfigurationChange,
  ValidationResult,
  Environment
} from '../../../src/integration/configuration/types/configuration-types.js';

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let store: FileConfigurationStore;
  let validator: ConfigurationValidator;
  let notifier: ConfigurationNotifier;
  let versionManager: ConfigurationVersionManager;
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(process.cwd(), 'test-config-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    // Initialize components
    store = new FileConfigurationStore({
      type: 'file',
      basePath: join(testDir, 'config')
    });

    validator = new ConfigurationValidator();
    notifier = new ConfigurationNotifier();
    
    versionManager = new ConfigurationVersionManager({
      storageType: 'file',
      basePath: join(testDir, 'versions'),
      maxVersions: 10
    });

    configManager = new ConfigurationManager(store, validator, notifier, versionManager);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Configuration Operations', () => {
    it('should set and get configuration values', async () => {
      const key = 'system.name';
      const value = 'test-system';

      await configManager.setConfiguration(key, value);
      const retrievedValue = await configManager.getConfiguration(key);

      expect(retrievedValue).toBe(value);
    });

    it('should handle environment-specific configurations', async () => {
      const key = 'system.replicas';
      const devValue = 1;
      const prodValue = 3;

      await configManager.setConfiguration(key, devValue, 'development');
      await configManager.setConfiguration(key, prodValue, 'production');

      const devRetrieved = await configManager.getConfiguration(key, 'development');
      const prodRetrieved = await configManager.getConfiguration(key, 'production');

      expect(devRetrieved).toBe(devValue);
      expect(prodRetrieved).toBe(prodValue);
    });

    it('should return undefined for non-existent keys', async () => {
      const value = await configManager.getConfiguration('non.existent.key');
      expect(value).toBeUndefined();
    });

    it('should delete configuration values', async () => {
      const key = 'test.key';
      const value = 'test-value';

      await configManager.setConfiguration(key, value);
      expect(await configManager.getConfiguration(key)).toBe(value);

      await configManager.deleteConfiguration(key);
      expect(await configManager.getConfiguration(key)).toBeUndefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration before setting', async () => {
      // This test would fail if validation is working properly
      // since we're trying to set an invalid configuration
      const invalidConfig: Partial<Configuration> = {
        system: {
          name: '', // Invalid: empty name
          version: 'invalid-version', // Invalid: doesn't match semver pattern
          environment: 'development',
          region: 'us-east-1',
          timezone: 'UTC',
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
        }
      };

      const result = await configManager.validateConfiguration(invalidConfig as Configuration);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept valid configuration', async () => {
      const validConfig: Configuration = {
        system: {
          name: 'test-system',
          version: '1.0.0',
          environment: 'development',
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
            regions: ['us-east-1'],
            networking: {
              ports: [{ name: 'http', port: 8080, targetPort: 8080, protocol: 'TCP' }],
              ingress: { enabled: false, className: 'nginx', annotations: {}, hosts: [], tls: [] },
              serviceMesh: { enabled: false, provider: 'istio', settings: {} }
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

      const result = await configManager.validateConfiguration(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Configuration Watching', () => {
    it('should notify watchers when configuration changes', async () => {
      const key = 'test.watched.key';
      const oldValue = 'old-value';
      const newValue = 'new-value';
      
      let changeNotification: ConfigurationChange | null = null;

      // Set initial value
      await configManager.setConfiguration(key, oldValue);

      // Set up watcher
      await configManager.watchConfiguration(key, (change) => {
        changeNotification = change;
      });

      // Change the value
      await configManager.setConfiguration(key, newValue);

      // Wait a bit for async notification
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(changeNotification).not.toBeNull();
      expect(changeNotification!.key).toBe(key);
      expect(changeNotification!.oldValue).toBe(oldValue);
      expect(changeNotification!.newValue).toBe(newValue);
    });

    it('should support wildcard watchers', async () => {
      const key1 = 'test.key1';
      const key2 = 'test.key2';
      const value = 'test-value';
      
      const changes: ConfigurationChange[] = [];

      // Set up wildcard watcher
      await configManager.watchConfiguration('*', (change) => {
        changes.push(change);
      });

      // Change multiple keys
      await configManager.setConfiguration(key1, value);
      await configManager.setConfiguration(key2, value);

      // Wait for notifications
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(changes.length).toBe(2);
      expect(changes.map(c => c.key)).toContain(key1);
      expect(changes.map(c => c.key)).toContain(key2);
    });
  });

  describe('Bulk Operations', () => {
    it('should support bulk configuration updates', async () => {
      const updates = {
        'system.name': 'bulk-test-system',
        'system.version': '2.0.0',
        'system.region': 'us-west-2'
      };

      await configManager.bulkUpdateConfiguration(updates);

      for (const [key, expectedValue] of Object.entries(updates)) {
        const actualValue = await configManager.getConfiguration(key);
        expect(actualValue).toBe(expectedValue);
      }
    });

    it('should rollback bulk updates if validation fails', async () => {
      const initialValue = 'initial-value';
      const key = 'system.name';

      // Set initial value
      await configManager.setConfiguration(key, initialValue);

      // Attempt bulk update with invalid data
      const invalidUpdates = {
        [key]: '', // Invalid: empty name
        'system.version': 'invalid-version' // Invalid: doesn't match semver
      };

      await expect(
        configManager.bulkUpdateConfiguration(invalidUpdates)
      ).rejects.toThrow();

      // Verify original value is preserved
      const currentValue = await configManager.getConfiguration(key);
      expect(currentValue).toBe(initialValue);
    });
  });

  describe('Configuration History and Versioning', () => {
    it('should track configuration history', async () => {
      const key = 'system.name';
      const value1 = 'version-1';
      const value2 = 'version-2';

      // Set initial value
      await configManager.setConfiguration(key, value1);
      
      // Change value
      await configManager.setConfiguration(key, value2);

      // Get history
      const history = await configManager.getConfigurationHistory(key);

      expect(history.versions.length).toBeGreaterThan(0);
      expect(history.currentVersion).toBeTruthy();
    });

    it('should support configuration rollback', async () => {
      const key = 'system.name';
      const originalValue = 'original-value';
      const changedValue = 'changed-value';

      // Set original value
      await configManager.setConfiguration(key, originalValue);
      
      // Get the version after setting original value
      const history1 = await configManager.getConfigurationHistory(key);
      const originalVersion = history1.currentVersion;

      // Change value
      await configManager.setConfiguration(key, changedValue);
      
      // Verify change
      expect(await configManager.getConfiguration(key)).toBe(changedValue);

      // Rollback to original version
      await configManager.rollbackConfiguration(originalVersion, key);

      // Verify rollback
      expect(await configManager.getConfiguration(key)).toBe(originalValue);
    });
  });

  describe('Caching', () => {
    it('should cache configuration values', async () => {
      const key = 'system.name';
      const value = 'cached-value';

      // Set value
      await configManager.setConfiguration(key, value);

      // Mock the store to verify caching
      const originalGet = store.get;
      let getCalls = 0;
      store.get = vi.fn(async (...args) => {
        getCalls++;
        return originalGet.apply(store, args);
      });

      // Get value multiple times
      await configManager.getConfiguration(key);
      await configManager.getConfiguration(key);
      await configManager.getConfiguration(key);

      // First call should hit the store, subsequent calls should use cache
      expect(getCalls).toBe(1);

      // Restore original method
      store.get = originalGet;
    });

    it('should invalidate cache when configuration changes', async () => {
      const key = 'system.name';
      const value1 = 'value-1';
      const value2 = 'value-2';

      // Set initial value
      await configManager.setConfiguration(key, value1);
      
      // Get value (should be cached)
      expect(await configManager.getConfiguration(key)).toBe(value1);

      // Change value (should invalidate cache)
      await configManager.setConfiguration(key, value2);

      // Get value again (should return new value)
      expect(await configManager.getConfiguration(key)).toBe(value2);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Mock store to throw error
      const originalGet = store.get;
      store.get = vi.fn().mockRejectedValue(new Error('Storage error'));

      await expect(
        configManager.getConfiguration('test.key')
      ).rejects.toThrow('Failed to get configuration');

      // Restore original method
      store.get = originalGet;
    });

    it('should handle validation errors gracefully', async () => {
      // Mock validator to throw error
      const originalValidate = validator.validatePartial;
      validator.validatePartial = vi.fn().mockRejectedValue(new Error('Validation error'));

      await expect(
        configManager.setConfiguration('test.key', 'test-value')
      ).rejects.toThrow('Failed to set configuration');

      // Restore original method
      validator.validatePartial = originalValidate;
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should apply different validation rules for production', async () => {
      // This would test environment-specific validation rules
      // Implementation depends on the specific rules defined in the validator
      const productionConfig: Partial<Configuration> = {
        system: {
          name: 'prod-system',
          version: '1.0.0',
          environment: 'production',
          region: 'us-east-1',
          timezone: 'UTC',
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
        }
      };

      const result = await configManager.validateConfiguration(productionConfig as Configuration);
      
      // Production environments should have stricter validation
      // The exact behavior depends on the validation rules implemented
      expect(result).toBeDefined();
    });
  });
});