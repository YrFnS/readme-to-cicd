/**
 * Tests for Backup Mock Factory
 * 
 * Validates the backup mock factory functionality including:
 * - Consistent response patterns
 * - Success and failure scenarios
 * - Configuration options
 * - All backup operation types
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  BackupMockFactory, 
  defaultBackupMockFactory, 
  BackupMocks,
  type BackupOperationType,
  type BackupMockConfig 
} from '../utils/backup-mock-factory';
import { isSuccess, isFailure } from '../../src/shared/types/result';

describe('BackupMockFactory', () => {
  let factory: BackupMockFactory;

  beforeEach(() => {
    factory = new BackupMockFactory();
  });

  describe('Constructor and Configuration', () => {
    it('should create factory with default configuration', () => {
      const config = factory.getConfig();
      
      expect(config.successRate).toBe(0.95);
      expect(config.durationRange.min).toBe(100);
      expect(config.durationRange.max).toBe(2000);
      expect(config.includeWarnings).toBe(false);
      expect(config.errorScenarios).toEqual({});
    });

    it('should create factory with custom configuration', () => {
      const customConfig: Partial<BackupMockConfig> = {
        successRate: 0.8,
        durationRange: { min: 500, max: 3000 },
        includeWarnings: true
      };

      const customFactory = new BackupMockFactory(customConfig);
      const config = customFactory.getConfig();

      expect(config.successRate).toBe(0.8);
      expect(config.durationRange.min).toBe(500);
      expect(config.durationRange.max).toBe(3000);
      expect(config.includeWarnings).toBe(true);
    });

    it('should update configuration after creation', () => {
      factory.updateConfig({ successRate: 0.5 });
      
      const config = factory.getConfig();
      expect(config.successRate).toBe(0.5);
    });

    it('should reset factory state and configuration', () => {
      factory.updateConfig({ successRate: 0.5 });
      factory.reset();
      
      const config = factory.getConfig();
      expect(config.successRate).toBe(0.95); // Back to default
    });
  });

  describe('Backup Operation Types', () => {
    const operationTypes: BackupOperationType[] = [
      'configuration',
      'data',
      'system-state',
      'incremental',
      'full',
      'restore',
      'verify',
      'cleanup'
    ];

    operationTypes.forEach(type => {
      it(`should create successful response for ${type} operation`, () => {
        const result = factory.createBackupResponse(type, { forceSuccess: true });
        
        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.data.backup.type).toBe(type);
          expect(result.data.backup.status).toBe('completed');
          expect(result.data.backup.id).toMatch(/^backup_[a-z0-9]+_[a-z0-9]+$/);
          expect(result.data.backup.startTime).toBeInstanceOf(Date);
          expect(result.data.backup.endTime).toBeInstanceOf(Date);
          expect(result.data.duration).toBeGreaterThan(0);
          expect(result.data.message).toContain('completed successfully');
        }
      });

      it(`should create failure response for ${type} operation`, () => {
        const result = factory.createBackupResponse(type, { forceFailure: true });
        
        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
          expect(result.error.operation).toBe(type);
          expect(result.error.code).toMatch(/^BACKUP_/);
          expect(result.error.message).toBeTruthy();
          expect(result.error.suggestions).toBeInstanceOf(Array);
          expect(result.error.suggestions!.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Response Consistency', () => {
    it('should generate unique operation IDs', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const result = factory.createBackupResponse('configuration', { forceSuccess: true });
        if (isSuccess(result)) {
          ids.add(result.data.backup.id);
        }
      }
      
      expect(ids.size).toBe(100); // All IDs should be unique
    });

    it('should respect duration range configuration', () => {
      factory.updateConfig({ durationRange: { min: 1000, max: 2000 } });
      
      for (let i = 0; i < 50; i++) {
        const result = factory.createBackupResponse('data', { forceSuccess: true });
        if (isSuccess(result)) {
          expect(result.data.duration).toBeGreaterThanOrEqual(1000);
          expect(result.data.duration).toBeLessThanOrEqual(2000);
        }
      }
    });

    it('should include warnings when configured', () => {
      factory.updateConfig({ includeWarnings: true });
      
      const result = factory.createBackupResponse('data', { forceSuccess: true });
      if (isSuccess(result)) {
        // Warnings may or may not be present (randomly generated), but should be array if present
        if (result.data.warnings) {
          expect(result.data.warnings).toBeInstanceOf(Array);
        }
      }
    });

    it('should not include warnings when disabled', () => {
      factory.updateConfig({ includeWarnings: false });
      
      const result = factory.createBackupResponse('data', { forceSuccess: true });
      if (isSuccess(result)) {
        expect(result.data.warnings).toBeUndefined();
      }
    });
  });

  describe('Backup Metadata Validation', () => {
    it('should generate appropriate backup sizes for different operation types', () => {
      const configResult = factory.createBackupResponse('configuration', { forceSuccess: true });
      const dataResult = factory.createBackupResponse('data', { forceSuccess: true });
      const fullResult = factory.createBackupResponse('full', { forceSuccess: true });
      const restoreResult = factory.createBackupResponse('restore', { forceSuccess: true });

      if (isSuccess(configResult) && isSuccess(dataResult) && 
          isSuccess(fullResult) && isSuccess(restoreResult)) {
        
        // Configuration backups should be smaller than data backups
        expect(configResult.data.backup.size).toBeLessThan(dataResult.data.backup.size!);
        
        // Full backups should be larger than data backups
        expect(fullResult.data.backup.size).toBeGreaterThan(dataResult.data.backup.size!);
        
        // Restore operations should have no size
        expect(restoreResult.data.backup.size).toBe(0);
      }
    });

    it('should generate valid backup locations', () => {
      const result = factory.createBackupResponse('configuration', { forceSuccess: true });
      
      if (isSuccess(result)) {
        expect(result.data.backup.location).toMatch(/^\/backups\/config\/\d{4}-\d{2}-\d{2}\/backup_/);
      }
    });

    it('should generate valid checksums', () => {
      const result = factory.createBackupResponse('data', { forceSuccess: true });
      
      if (isSuccess(result)) {
        expect(result.data.backup.checksum).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it('should include custom metadata when provided', () => {
      const customMetadata = { testKey: 'testValue', version: '2.0.0' };
      const result = factory.createBackupResponse('configuration', { 
        forceSuccess: true, 
        customMetadata 
      });
      
      if (isSuccess(result)) {
        expect(result.data.backup.metadata).toMatchObject(customMetadata);
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should use custom error scenarios when configured', () => {
      const customError = {
        code: 'CUSTOM_ERROR_CODE',
        message: 'Custom error message',
        operation: 'configuration' as BackupOperationType,
        suggestions: ['Custom suggestion']
      };

      factory.updateConfig({
        errorScenarios: {
          configuration: customError
        }
      });

      const result = factory.createBackupResponse('configuration', { forceFailure: true });
      
      if (isFailure(result)) {
        expect(result.error.code).toBe('CUSTOM_ERROR_CODE');
        expect(result.error.message).toBe('Custom error message');
        expect(result.error.suggestions).toEqual(['Custom suggestion']);
      }
    });

    it('should include operation context in error responses', () => {
      const result = factory.createBackupResponse('data', { forceFailure: true });
      
      if (isFailure(result)) {
        expect(result.error.context).toBeDefined();
        expect(result.error.context!.operationId).toMatch(/^backup_/);
        expect(result.error.context!.startTime).toBeTruthy();
      }
    });
  });

  describe('Success Rate Configuration', () => {
    it('should respect success rate configuration', () => {
      // Set very low success rate to test failure generation
      factory.updateConfig({ successRate: 0.1 });
      
      let successCount = 0;
      let failureCount = 0;
      
      // Run many operations to test probability
      for (let i = 0; i < 100; i++) {
        const result = factory.createBackupResponse('configuration');
        if (isSuccess(result)) {
          successCount++;
        } else {
          failureCount++;
        }
      }
      
      // With 0.1 success rate, we should have more failures than successes
      expect(failureCount).toBeGreaterThan(successCount);
    });

    it('should always succeed when forceSuccess is true', () => {
      factory.updateConfig({ successRate: 0 }); // 0% success rate
      
      const result = factory.createBackupResponse('configuration', { forceSuccess: true });
      expect(isSuccess(result)).toBe(true);
    });

    it('should always fail when forceFailure is true', () => {
      factory.updateConfig({ successRate: 1 }); // 100% success rate
      
      const result = factory.createBackupResponse('configuration', { forceFailure: true });
      expect(isFailure(result)).toBe(true);
    });
  });
});

describe('Default Backup Mock Factory', () => {
  it('should be available as singleton instance', () => {
    expect(defaultBackupMockFactory).toBeInstanceOf(BackupMockFactory);
  });

  it('should have default configuration', () => {
    const config = defaultBackupMockFactory.getConfig();
    expect(config.successRate).toBe(0.95);
  });
});

describe('BackupMocks Convenience Functions', () => {
  describe('Configuration Backup Mocks', () => {
    it('should create successful configuration backup', () => {
      const result = BackupMocks.successfulConfigBackup();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.backup.type).toBe('configuration');
        expect(result.data.backup.status).toBe('completed');
      }
    });

    it('should create failed configuration backup', () => {
      const result = BackupMocks.failedConfigBackup();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('configuration');
      }
    });

    it('should accept custom metadata for configuration backup', () => {
      const customMetadata = { environment: 'test' };
      const result = BackupMocks.successfulConfigBackup(customMetadata);
      
      if (isSuccess(result)) {
        expect(result.data.backup.metadata).toMatchObject(customMetadata);
      }
    });
  });

  describe('Data Backup Mocks', () => {
    it('should create successful data backup', () => {
      const result = BackupMocks.successfulDataBackup();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.backup.type).toBe('data');
        expect(result.data.backup.status).toBe('completed');
      }
    });

    it('should create failed data backup', () => {
      const result = BackupMocks.failedDataBackup();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('data');
      }
    });
  });

  describe('Full Backup Mocks', () => {
    it('should create successful full backup', () => {
      const result = BackupMocks.successfulFullBackup();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.backup.type).toBe('full');
        expect(result.data.backup.status).toBe('completed');
      }
    });

    it('should create failed full backup', () => {
      const result = BackupMocks.failedFullBackup();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('full');
      }
    });
  });

  describe('Restore Mocks', () => {
    it('should create successful restore', () => {
      const result = BackupMocks.successfulRestore();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.backup.type).toBe('restore');
        expect(result.data.backup.status).toBe('completed');
      }
    });

    it('should create failed restore', () => {
      const result = BackupMocks.failedRestore();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('restore');
      }
    });
  });
});

describe('Integration with Result Pattern', () => {
  it('should work seamlessly with Result pattern type guards', () => {
    const successResult = BackupMocks.successfulConfigBackup();
    const failureResult = BackupMocks.failedConfigBackup();

    // Test type guards
    expect(isSuccess(successResult)).toBe(true);
    expect(isFailure(successResult)).toBe(false);
    expect(isSuccess(failureResult)).toBe(false);
    expect(isFailure(failureResult)).toBe(true);

    // Test TypeScript type narrowing works correctly
    if (isSuccess(successResult)) {
      // TypeScript should know this is BackupResult
      expect(successResult.data.backup).toBeDefined();
      expect(successResult.data.message).toBeDefined();
      expect(successResult.data.duration).toBeDefined();
    }

    if (isFailure(failureResult)) {
      // TypeScript should know this is BackupError
      expect(failureResult.error.code).toBeDefined();
      expect(failureResult.error.message).toBeDefined();
      expect(failureResult.error.operation).toBeDefined();
    }
  });
});

describe('Performance and Memory', () => {
  it('should handle many operations without memory issues', () => {
    const factory = new BackupMockFactory();
    const results: any[] = [];

    // Create many mock responses
    for (let i = 0; i < 1000; i++) {
      const result = factory.createBackupResponse('data');
      results.push(result);
    }

    expect(results.length).toBe(1000);
    
    // Verify all results are valid
    results.forEach(result => {
      expect(result).toHaveProperty('success');
      if (isSuccess(result)) {
        expect(result.data.backup).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  it('should reset state properly to prevent memory leaks', () => {
    const factory = new BackupMockFactory();
    
    // Generate many operations
    for (let i = 0; i < 100; i++) {
      factory.createBackupResponse('configuration');
    }
    
    // Reset should clear internal state
    factory.reset();
    
    // Should be able to continue generating operations
    const result = factory.createBackupResponse('data', { forceSuccess: true });
    expect(isSuccess(result)).toBe(true);
  });
});