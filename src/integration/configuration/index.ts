/**
 * Configuration Management System
 * 
 * Provides centralized configuration management with environment-specific configurations,
 * validation, change propagation, versioning, and secrets management.
 */

export * from './types/configuration-types.js';
export * from './core/configuration-manager.js';
export * from './storage/configuration-store.js';
export * from './validation/configuration-validator.js';
export * from './notification/configuration-notifier.js';
export * from './versioning/configuration-version-manager.js';
export * from './secrets/secret-manager.js';

// Factory function to create a complete configuration management system
import { ConfigurationManager } from './core/configuration-manager.js';
import { FileConfigurationStore, ConfigurationStoreOptions } from './storage/configuration-store.js';
import { ConfigurationValidator } from './validation/configuration-validator.js';
import { ConfigurationNotifier } from './notification/configuration-notifier.js';
import { ConfigurationVersionManager, VersionManagerOptions } from './versioning/configuration-version-manager.js';
import { SecretManager, SecretManagerOptions } from './secrets/secret-manager.js';

export interface ConfigurationSystemOptions {
  storage: ConfigurationStoreOptions;
  versioning: VersionManagerOptions;
  secrets: SecretManagerOptions;
}

/**
 * Create a complete configuration management system with all components
 */
export async function createConfigurationSystem(options: ConfigurationSystemOptions): Promise<{
  configManager: ConfigurationManager;
  secretManager: SecretManager;
}> {
  // Create storage layer
  const store = new FileConfigurationStore(options.storage);
  
  // Create validator
  const validator = new ConfigurationValidator();
  
  // Create notifier
  const notifier = new ConfigurationNotifier();
  
  // Create version manager
  const versionManager = new ConfigurationVersionManager(options.versioning);
  
  // Create configuration manager
  const configManager = new ConfigurationManager(store, validator, notifier, versionManager);
  
  // Create secret manager
  const secretManager = new SecretManager(options.secrets);
  
  return {
    configManager,
    secretManager
  };
}

/**
 * Create a configuration system with default options for development
 */
export async function createDevelopmentConfigurationSystem(): Promise<{
  configManager: ConfigurationManager;
  secretManager: SecretManager;
}> {
  return createConfigurationSystem({
    storage: {
      type: 'file',
      basePath: './config',
      backup: true
    },
    versioning: {
      storageType: 'file',
      basePath: './config/versions',
      maxVersions: 20
    },
    secrets: {
      backend: 'file',
      basePath: './secrets'
    }
  });
}

/**
 * Create a configuration system with production-ready options
 */
export async function createProductionConfigurationSystem(): Promise<{
  configManager: ConfigurationManager;
  secretManager: SecretManager;
}> {
  return createConfigurationSystem({
    storage: {
      type: 'file',
      basePath: process.env.CONFIG_PATH || '/etc/readme-to-cicd/config',
      backup: true,
      encryption: true
    },
    versioning: {
      storageType: 'file',
      basePath: process.env.CONFIG_VERSIONS_PATH || '/var/lib/readme-to-cicd/versions',
      maxVersions: 100,
      compressionEnabled: true,
      encryptionEnabled: true
    },
    secrets: {
      backend: process.env.SECRET_BACKEND as any || 'vault',
      basePath: process.env.SECRETS_PATH || '/var/lib/readme-to-cicd/secrets',
      encryptionKey: process.env.SECRET_ENCRYPTION_KEY,
      vaultConfig: process.env.VAULT_ENDPOINT ? {
        endpoint: process.env.VAULT_ENDPOINT,
        token: process.env.VAULT_TOKEN!,
        mountPath: process.env.VAULT_MOUNT_PATH || 'secret'
      } : undefined
    }
  });
}