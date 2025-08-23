/**
 * Simple Secret Manager Tests
 * 
 * Basic tests for the secret management system functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SecretManager } from '../../../src/integration/configuration/secrets/secret-manager.js';

describe('SecretManager - Basic Functionality', () => {
  let secretManager: SecretManager;
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(process.cwd(), 'test-secrets-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    // Initialize secret manager with file backend
    secretManager = new SecretManager({
      backend: 'file',
      basePath: testDir,
      encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Operations', () => {
    it('should store and retrieve secrets', async () => {
      const key = 'test-secret';
      const value = 'super-secret-value';

      await secretManager.storeSecret(key, value);
      const retrievedValue = await secretManager.retrieveSecret(key);

      expect(retrievedValue).toBe(value);
    });

    it('should list stored secrets', async () => {
      await secretManager.storeSecret('secret1', 'value1');
      await secretManager.storeSecret('secret2', 'value2');
      
      const secrets = await secretManager.listSecrets();
      
      expect(secrets).toContain('secret1');
      expect(secrets).toContain('secret2');
      expect(secrets.length).toBe(2);
    });

    it('should delete secrets', async () => {
      const key = 'secret-to-delete';
      const value = 'delete-me';

      await secretManager.storeSecret(key, value);
      await secretManager.deleteSecret(key);
      
      await expect(secretManager.retrieveSecret(key)).rejects.toThrow();
    });

    it('should handle non-existent secrets', async () => {
      await expect(secretManager.retrieveSecret('non-existent')).rejects.toThrow();
    });
  });

  describe('Validation', () => {
    it('should validate secret keys', async () => {
      await expect(secretManager.storeSecret('', 'value')).rejects.toThrow();
      await expect(secretManager.storeSecret('invalid/key', 'value')).rejects.toThrow();
    });

    it('should validate secret values', async () => {
      await expect(secretManager.storeSecret('key', '')).rejects.toThrow();
    });
  });

  describe('Metadata', () => {
    it('should store and retrieve secret metadata', async () => {
      const key = 'metadata-secret';
      const value = 'metadata-value';
      const metadata = {
        description: 'Test secret',
        tags: { environment: 'test' }
      };

      await secretManager.storeSecret(key, value, metadata);
      const info = await secretManager.getSecretInfo(key);

      expect(info).not.toBeNull();
      expect(info!.tags.environment).toBe('test');
    });
  });

  describe('Caching', () => {
    it('should provide cache statistics', async () => {
      const stats = secretManager.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
    });

    it('should clear cache', async () => {
      secretManager.clearCache();
      const stats = secretManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Auditing', () => {
    it('should generate audit reports', async () => {
      await secretManager.storeSecret('audit-test', 'audit-value');
      
      const report = await secretManager.auditSecrets();
      
      expect(report).toHaveProperty('totalSecrets');
      expect(report).toHaveProperty('expiringSoon');
      expect(report).toHaveProperty('expired');
      expect(report).toHaveProperty('recentAccess');
    });
  });

  describe('Compliance', () => {
    it('should generate compliance reports', async () => {
      await secretManager.storeSecret('compliance-test', 'compliance-value');
      
      const report = await secretManager.getComplianceReport();
      
      expect(report).toHaveProperty('totalSecrets');
      expect(report).toHaveProperty('encrypted');
      expect(report).toHaveProperty('withRotationPolicy');
      expect(report).toHaveProperty('accessViolations');
    });
  });

  describe('Export', () => {
    it('should export secrets metadata', async () => {
      await secretManager.storeSecret('export-test', 'export-value');
      
      const exportData = await secretManager.exportSecrets();
      const parsed = JSON.parse(exportData);
      
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('secrets');
    });
  });
});

describe('SecretManager - Cloud Backend Configuration', () => {
  it('should validate Vault configuration', () => {
    expect(() => {
      new SecretManager({
        backend: 'vault',
        vaultConfig: {
          endpoint: 'https://vault.example.com',
          token: 'test-token',
          mountPath: 'secret'
        }
      });
    }).not.toThrow();
  });

  it('should validate AWS configuration', () => {
    expect(() => {
      new SecretManager({
        backend: 'aws-secrets',
        awsConfig: {
          region: 'us-east-1',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      });
    }).not.toThrow();
  });

  it('should validate Azure configuration', () => {
    expect(() => {
      new SecretManager({
        backend: 'azure-keyvault',
        azureConfig: {
          vaultUrl: 'https://test.vault.azure.net',
          clientId: 'test-client',
          clientSecret: 'test-secret',
          tenantId: 'test-tenant'
        }
      });
    }).not.toThrow();
  });

  it('should validate GCP configuration', () => {
    expect(() => {
      new SecretManager({
        backend: 'gcp-secret',
        gcpConfig: {
          projectId: 'test-project'
        }
      });
    }).not.toThrow();
  });
});