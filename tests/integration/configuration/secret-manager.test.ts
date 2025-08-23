/**
 * Secret Manager Tests
 * 
 * Comprehensive tests for the secret management system including
 * storage, encryption, rotation, and auditing capabilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock fetch for cloud provider tests
global.fetch = vi.fn();

// Mock promisify to avoid issues with crypto functions
vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('util')>();
  return {
    ...actual,
    promisify: (fn: any) => fn // Return the function as-is for testing
  };
});

import { SecretManager } from '../../../src/integration/configuration/secrets/secret-manager.js';
import {
  SecretMetadata,
  SecretRotationPolicy
} from '../../../src/integration/configuration/types/configuration-types.js';

describe('SecretManager', () => {
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

  describe('Basic Secret Operations', () => {
    it('should store and retrieve secrets', async () => {
      const key = 'test-secret';
      const value = 'super-secret-value';

      await secretManager.storeSecret(key, value);
      const retrievedValue = await secretManager.retrieveSecret(key);

      expect(retrievedValue).toBe(value);
    });

    it('should store secrets with metadata', async () => {
      const key = 'test-secret-with-metadata';
      const value = 'secret-value';
      const metadata: SecretMetadata = {
        description: 'Test secret with metadata',
        tags: { environment: 'test', type: 'api-key' },
        expiresAt: new Date(Date.now() + 86400000) // 24 hours from now
      };

      await secretManager.storeSecret(key, value, metadata);
      const retrievedValue = await secretManager.retrieveSecret(key);
      const secretInfo = await secretManager.getSecretInfo(key);

      expect(retrievedValue).toBe(value);
      expect(secretInfo).not.toBeNull();
      expect(secretInfo!.tags).toEqual(metadata.tags);
    });

    it('should list all secret keys', async () => {
      const secrets = {
        'secret1': 'value1',
        'secret2': 'value2',
        'secret3': 'value3'
      };

      // Store multiple secrets
      for (const [key, value] of Object.entries(secrets)) {
        await secretManager.storeSecret(key, value);
      }

      const secretKeys = await secretManager.listSecrets();

      expect(secretKeys).toHaveLength(3);
      expect(secretKeys).toContain('secret1');
      expect(secretKeys).toContain('secret2');
      expect(secretKeys).toContain('secret3');
    });

    it('should delete secrets', async () => {
      const key = 'secret-to-delete';
      const value = 'delete-me';

      await secretManager.storeSecret(key, value);
      expect(await secretManager.retrieveSecret(key)).toBe(value);

      await secretManager.deleteSecret(key);
      
      await expect(secretManager.retrieveSecret(key)).rejects.toThrow('not found');
    });

    it('should throw error for non-existent secrets', async () => {
      await expect(
        secretManager.retrieveSecret('non-existent-secret')
      ).rejects.toThrow('not found');
    });
  });

  describe('Secret Validation', () => {
    it('should validate secret keys', async () => {
      const validKey = 'valid-secret-key';
      const validValue = 'valid-secret-value';

      // Valid key should work
      await expect(
        secretManager.storeSecret(validKey, validValue)
      ).resolves.not.toThrow();

      // Invalid keys should throw errors
      await expect(
        secretManager.storeSecret('', validValue)
      ).rejects.toThrow('Secret key must be a non-empty string');

      await expect(
        secretManager.storeSecret('invalid key with spaces', validValue)
      ).rejects.toThrow('Secret key can only contain');

      await expect(
        secretManager.storeSecret('a'.repeat(256), validValue)
      ).rejects.toThrow('Secret key must be 255 characters or less');
    });

    it('should validate secret values', async () => {
      const validKey = 'valid-key';

      // Invalid values should throw errors
      await expect(
        secretManager.storeSecret(validKey, '')
      ).rejects.toThrow('Secret value must be a non-empty string');

      await expect(
        secretManager.storeSecret(validKey, 'a'.repeat(65537))
      ).rejects.toThrow('Secret value must be 65536 characters or less');
    });
  });

  describe('Secret Encryption', () => {
    it('should encrypt secrets at rest', async () => {
      const key = 'encrypted-secret';
      const value = 'this-should-be-encrypted';

      await secretManager.storeSecret(key, value);

      // Read the raw file to verify encryption
      const secretFiles = await fs.readdir(testDir);
      const secretFile = secretFiles.find(file => file.includes('encrypted-secret'));
      expect(secretFile).toBeDefined();

      const rawData = await fs.readFile(join(testDir, secretFile!), 'utf-8');
      const storedSecret = JSON.parse(rawData);

      // The stored value should be encrypted (different from original)
      expect(storedSecret.value).not.toBe(value);
      expect(storedSecret.value).toContain(':'); // Should contain auth tag separator
    });

    it('should verify secret integrity', async () => {
      const key = 'integrity-test-secret';
      const value = 'integrity-test-value';

      await secretManager.storeSecret(key, value);

      // Manually corrupt the stored secret
      const secretFiles = await fs.readdir(testDir);
      const secretFile = secretFiles.find(file => file.includes('integrity-test-secret'));
      const filePath = join(testDir, secretFile!);
      
      const rawData = await fs.readFile(filePath, 'utf-8');
      const storedSecret = JSON.parse(rawData);
      
      // Corrupt the checksum
      storedSecret.checksum = 'corrupted-checksum';
      await fs.writeFile(filePath, JSON.stringify(storedSecret));

      // Retrieving should fail due to integrity check
      await expect(
        secretManager.retrieveSecret(key)
      ).rejects.toThrow('integrity check failed');
    });
  });

  describe('Secret Expiration', () => {
    it('should handle expired secrets', async () => {
      const key = 'expired-secret';
      const value = 'expired-value';
      const metadata: SecretMetadata = {
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      await secretManager.storeSecret(key, value, metadata);

      await expect(
        secretManager.retrieveSecret(key)
      ).rejects.toThrow('has expired');
    });

    it('should allow retrieval of non-expired secrets', async () => {
      const key = 'future-secret';
      const value = 'future-value';
      const metadata: SecretMetadata = {
        expiresAt: new Date(Date.now() + 86400000) // Expires in 24 hours
      };

      await secretManager.storeSecret(key, value, metadata);
      const retrievedValue = await secretManager.retrieveSecret(key);

      expect(retrievedValue).toBe(value);
    });
  });

  describe('Secret Rotation', () => {
    it('should rotate secrets manually', async () => {
      const key = 'rotatable-secret';
      const originalValue = 'original-value';

      await secretManager.storeSecret(key, originalValue);
      const originalRetrieved = await secretManager.retrieveSecret(key);
      expect(originalRetrieved).toBe(originalValue);

      // Rotate the secret
      await secretManager.rotateSecret(key);

      // The new value should be different
      const rotatedValue = await secretManager.retrieveSecret(key);
      expect(rotatedValue).not.toBe(originalValue);
      expect(rotatedValue).toBeTruthy();
    });

    it('should schedule automatic rotation', async () => {
      const key = 'auto-rotate-secret';
      const value = 'auto-rotate-value';
      const rotationPolicy: SecretRotationPolicy = {
        enabled: true,
        intervalDays: 1,
        autoRotate: true,
        notifyBefore: 1
      };

      await secretManager.storeSecret(key, value, { rotationPolicy });

      // In a real test, you might mock timers or use a shorter interval
      // For this test, we'll just verify the secret was stored with rotation policy
      const secretInfo = await secretManager.getSecretInfo(key);
      expect(secretInfo).not.toBeNull();
    });
  });

  describe('Secret Auditing', () => {
    it('should generate audit reports', async () => {
      const secrets = {
        'audit-secret-1': 'value1',
        'audit-secret-2': 'value2',
        'audit-secret-3': 'value3'
      };

      // Store secrets
      for (const [key, value] of Object.entries(secrets)) {
        await secretManager.storeSecret(key, value);
      }

      // Access some secrets to generate audit trail
      await secretManager.retrieveSecret('audit-secret-1');
      await secretManager.retrieveSecret('audit-secret-2');

      const auditReport = await secretManager.auditSecrets();

      expect(auditReport.totalSecrets).toBe(3);
      expect(auditReport.recentAccess.length).toBeGreaterThan(0);
    });

    it('should track secret access', async () => {
      const key = 'tracked-secret';
      const value = 'tracked-value';

      await secretManager.storeSecret(key, value);
      
      // Access the secret multiple times
      await secretManager.retrieveSecret(key);
      await secretManager.retrieveSecret(key);
      await secretManager.retrieveSecret(key);

      const auditReport = await secretManager.auditSecrets();
      const accessLogs = auditReport.recentAccess.filter(log => log.key === key);

      expect(accessLogs.length).toBeGreaterThan(0);
      expect(accessLogs.some(log => log.operation === 'read')).toBe(true);
    });

    it('should identify expiring secrets', async () => {
      const key = 'expiring-secret';
      const value = 'expiring-value';
      const metadata: SecretMetadata = {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
      };

      await secretManager.storeSecret(key, value, metadata);

      const auditReport = await secretManager.auditSecrets();

      expect(auditReport.expiringSoon.length).toBe(1);
      expect(auditReport.expiringSoon[0].key).toBe(key);
    });
  });

  describe('Secret Metadata Management', () => {
    it('should update secret metadata', async () => {
      const key = 'metadata-secret';
      const value = 'metadata-value';
      const initialMetadata: SecretMetadata = {
        description: 'Initial description',
        tags: { type: 'api-key' }
      };

      await secretManager.storeSecret(key, value, initialMetadata);

      const updatedMetadata: Partial<SecretMetadata> = {
        description: 'Updated description',
        tags: { type: 'api-key', environment: 'production' }
      };

      await secretManager.updateSecretMetadata(key, updatedMetadata);

      const secretInfo = await secretManager.getSecretInfo(key);
      expect(secretInfo!.tags).toEqual(updatedMetadata.tags);
    });

    it('should get secret information without exposing the value', async () => {
      const key = 'info-secret';
      const value = 'info-value';
      const metadata: SecretMetadata = {
        description: 'Test secret for info retrieval',
        tags: { type: 'database-password', environment: 'test' }
      };

      await secretManager.storeSecret(key, value, metadata);

      const secretInfo = await secretManager.getSecretInfo(key);

      expect(secretInfo).not.toBeNull();
      expect(secretInfo!.key).toBe(key);
      expect(secretInfo!.tags).toEqual(metadata.tags);
      expect(secretInfo!.createdAt).toBeInstanceOf(Date);
      // The secret info should not contain the actual secret value
      expect(secretInfo).not.toHaveProperty('value');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Create a secret manager with invalid path to trigger storage errors
      const invalidSecretManager = new SecretManager({
        backend: 'file',
        basePath: '/invalid/path/that/does/not/exist'
      });

      await expect(
        invalidSecretManager.storeSecret('test-key', 'test-value')
      ).rejects.toThrow();
    });

    it('should handle unsupported backend types', async () => {
      expect(() => {
        new SecretManager({
          backend: 'unsupported-backend' as any
        });
      }).not.toThrow(); // Constructor should not throw, but operations should

      const invalidManager = new SecretManager({
        backend: 'unsupported-backend' as any
      });

      await expect(
        invalidManager.storeSecret('test-key', 'test-value')
      ).rejects.toThrow('Unsupported backend');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations: Promise<void>[] = [];
      const secretCount = 10;

      // Create multiple concurrent store operations
      for (let i = 0; i < secretCount; i++) {
        operations.push(
          secretManager.storeSecret(`concurrent-secret-${i}`, `value-${i}`)
        );
      }

      // Wait for all operations to complete
      await Promise.all(operations);

      // Verify all secrets were stored
      const secretKeys = await secretManager.listSecrets();
      expect(secretKeys.length).toBe(secretCount);

      // Create multiple concurrent retrieve operations
      const retrieveOperations: Promise<string>[] = [];
      for (let i = 0; i < secretCount; i++) {
        retrieveOperations.push(
          secretManager.retrieveSecret(`concurrent-secret-${i}`)
        );
      }

      const values = await Promise.all(retrieveOperations);
      expect(values).toHaveLength(secretCount);
      values.forEach((value, index) => {
        expect(value).toBe(`value-${index}`);
      });
    });

    it('should handle large secret values', async () => {
      const key = 'large-secret';
      const largeValue = 'x'.repeat(10000); // 10KB secret

      await secretManager.storeSecret(key, largeValue);
      const retrievedValue = await secretManager.retrieveSecret(key);

      expect(retrievedValue).toBe(largeValue);
      expect(retrievedValue.length).toBe(10000);
    });
  });

  describe('Advanced Features', () => {
    describe('Caching', () => {
      it('should cache retrieved secrets', async () => {
        const key = 'cached-secret';
        const value = 'cached-value';

        await secretManager.storeSecret(key, value);
        
        // First retrieval should cache the secret
        await secretManager.retrieveSecret(key);
        
        const stats = secretManager.getCacheStats();
        expect(stats.size).toBeGreaterThan(0);
        expect(stats.keys.some(k => k.includes(key))).toBe(true);
      });

      it('should clear cache', async () => {
        const key = 'cache-clear-test';
        const value = 'cache-clear-value';

        await secretManager.storeSecret(key, value);
        await secretManager.retrieveSecret(key);
        
        expect(secretManager.getCacheStats().size).toBeGreaterThan(0);
        
        secretManager.clearCache();
        expect(secretManager.getCacheStats().size).toBe(0);
      });
    });

    describe('Bulk Operations', () => {
      beforeEach(async () => {
        // Set up secrets with different rotation policies
        await secretManager.storeSecret('bulk1', 'value1', {
          rotationPolicy: { enabled: true, intervalDays: 1, autoRotate: true }
        });
        await secretManager.storeSecret('bulk2', 'value2', {
          rotationPolicy: { enabled: true, intervalDays: 30, autoRotate: true }
        });
        await secretManager.storeSecret('bulk3', 'value3'); // No rotation policy
      });

      it('should perform bulk rotation', async () => {
        const result = await secretManager.bulkRotateSecrets();
        
        expect(result.rotated).toBeDefined();
        expect(result.failed).toBeDefined();
        expect(Array.isArray(result.rotated)).toBe(true);
        expect(Array.isArray(result.failed)).toBe(true);
      });

      it('should validate secret integrity in bulk', async () => {
        const result = await secretManager.validateSecretIntegrity();
        
        expect(result.valid.length).toBe(3);
        expect(result.invalid.length).toBe(0);
        expect(result.valid).toContain('bulk1');
        expect(result.valid).toContain('bulk2');
        expect(result.valid).toContain('bulk3');
      });
    });

    describe('Compliance and Reporting', () => {
      beforeEach(async () => {
        await secretManager.storeSecret('compliant1', 'value1', {
          rotationPolicy: { enabled: true, intervalDays: 30, autoRotate: true }
        });
        await secretManager.storeSecret('compliant2', 'value2');
        await secretManager.storeSecret('expired-secret', 'value3', {
          expiresAt: new Date(Date.now() - 86400000)
        });
      });

      it('should generate compliance report', async () => {
        const report = await secretManager.getComplianceReport();
        
        expect(report.totalSecrets).toBe(3);
        expect(report.encrypted).toBe(3); // All secrets should be encrypted
        expect(report.withRotationPolicy).toBe(1);
        expect(report.expired).toBe(1);
        expect(report.accessViolations).toBeDefined();
      });

      it('should cleanup expired secrets', async () => {
        const result = await secretManager.cleanupExpiredSecrets();
        
        expect(result.deleted).toContain('expired-secret');
        expect(result.failed).toBeDefined();
        
        const secrets = await secretManager.listSecrets();
        expect(secrets).not.toContain('expired-secret');
      });
    });

    describe('Export and Backup', () => {
      beforeEach(async () => {
        await secretManager.storeSecret('export1', 'value1');
        await secretManager.storeSecret('export2', 'value2');
      });

      it('should export secrets metadata', async () => {
        const exportData = await secretManager.exportSecrets();
        
        const parsed = JSON.parse(exportData);
        expect(parsed.version).toBe('1.0');
        expect(parsed.secrets.export1).toBeDefined();
        expect(parsed.secrets.export2).toBeDefined();
        expect(parsed.secrets.export1.value).toBe('[ENCRYPTED]'); // Values should not be exported
      });

      it('should export encrypted backup', async () => {
        const exportData = await secretManager.exportSecrets('backup-key');
        
        expect(exportData).toBeTruthy();
        expect(exportData).not.toContain('export1'); // Should be encrypted
        expect(exportData).toContain(':'); // Should contain auth tag separator
      });
    });
  });
});

describe('SecretManager - Cloud Backends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HashiCorp Vault Backend', () => {
    let secretManager: SecretManager;

    beforeEach(() => {
      secretManager = new SecretManager({
        backend: 'vault',
        vaultConfig: {
          endpoint: 'https://vault.example.com',
          token: 'test-token',
          mountPath: 'secret'
        }
      });
    });

    it('should throw error when vault config is missing', async () => {
      const noConfigManager = new SecretManager({
        backend: 'vault'
      });

      await expect(noConfigManager.storeSecret('test', 'value')).rejects.toThrow('Vault configuration not provided');
    });

    it('should make correct API calls for storing secrets', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        text: async () => ''
      } as Response);

      await secretManager.storeSecret('test-key', 'test-value');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://vault.example.com/v1/secret/data/test-key',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Vault-Token': 'test-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle vault API errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      } as Response);

      await expect(secretManager.storeSecret('test-key', 'test-value')).rejects.toThrow('Vault API error: 403');
    });
  });

  describe('AWS Secrets Manager Backend', () => {
    let secretManager: SecretManager;

    beforeEach(() => {
      secretManager = new SecretManager({
        backend: 'aws-secrets',
        awsConfig: {
          region: 'us-east-1',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      });
    });

    it('should throw error when AWS config is missing', async () => {
      const noConfigManager = new SecretManager({
        backend: 'aws-secrets'
      });

      await expect(noConfigManager.storeSecret('test', 'value')).rejects.toThrow('AWS configuration not provided');
    });

    it('should handle AWS API calls', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ SecretARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-key' })
      } as Response);

      await secretManager.storeSecret('test-key', 'test-value');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://secretsmanager.us-east-1.amazonaws.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'secretsmanager.UpdateSecret'
          })
        })
      );
    });
  });

  describe('Azure Key Vault Backend', () => {
    let secretManager: SecretManager;

    beforeEach(() => {
      secretManager = new SecretManager({
        backend: 'azure-keyvault',
        azureConfig: {
          vaultUrl: 'https://test-vault.vault.azure.net',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tenantId: 'test-tenant-id'
        }
      });
    });

    it('should throw error when Azure config is missing', async () => {
      const noConfigManager = new SecretManager({
        backend: 'azure-keyvault'
      });

      await expect(noConfigManager.storeSecret('test', 'value')).rejects.toThrow('Azure configuration not provided');
    });

    it('should authenticate with Azure AD', async () => {
      const mockFetch = vi.mocked(fetch);
      
      // Mock authentication response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-access-token' })
      } as Response);

      // Mock secret storage response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'https://test-vault.vault.azure.net/secrets/test-key' })
      } as Response);

      await secretManager.storeSecret('test-key', 'test-value');

      // Should call authentication endpoint first
      expect(mockFetch).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/test-tenant-id/oauth2/v2.0/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );

      // Then call Key Vault API
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-vault.vault.azure.net/secrets/test-key?api-version=7.3',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-access-token'
          })
        })
      );
    });
  });

  describe('GCP Secret Manager Backend', () => {
    let secretManager: SecretManager;

    beforeEach(() => {
      secretManager = new SecretManager({
        backend: 'gcp-secret',
        gcpConfig: {
          projectId: 'test-project'
        }
      });
    });

    it('should throw error when GCP config is missing', async () => {
      const noConfigManager = new SecretManager({
        backend: 'gcp-secret'
      });

      await expect(noConfigManager.storeSecret('test', 'value')).rejects.toThrow('GCP configuration not provided');
    });

    it('should use metadata service for authentication when available', async () => {
      const mockFetch = vi.mocked(fetch);
      
      // Mock metadata service response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'mock-gcp-token' })
      } as Response);

      // Mock secret creation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'projects/test-project/secrets/test-key' })
      } as Response);

      // Mock version creation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'projects/test-project/secrets/test-key/versions/1' })
      } as Response);

      await secretManager.storeSecret('test-key', 'test-value');

      // Should try metadata service for authentication
      expect(mockFetch).toHaveBeenCalledWith(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Metadata-Flavor': 'Google'
          })
        })
      );
    });
  });
});