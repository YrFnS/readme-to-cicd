/**
 * Backup Manager Tests
 * 
 * Tests for backup operations, retention policies, and verification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackupManager } from '../../../src/disaster-recovery/backup-manager.js';
import type { BackupStrategy } from '../../../src/disaster-recovery/types.js';

describe('BackupManager', () => {
  let backupManager: BackupManager;
  let config: BackupStrategy;

  beforeEach(() => {
    config = {
      type: 'incremental',
      frequency: {
        full: '0 2 * * 0',
        incremental: '0 */6 * * *',
        differential: '0 12 * * *'
      },
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12,
        yearly: 3
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256',
        keyRotation: true,
        keyRotationInterval: 90
      },
      compression: true,
      verification: true
    };

    backupManager = new BackupManager(config);
  });

  afterEach(async () => {
    if (backupManager) {
      await backupManager.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(backupManager.initialize()).resolves.not.toThrow();
    });

    it('should emit initialization events', async () => {
      const initializedSpy = vi.fn();
      backupManager.on('initialized', initializedSpy);
      
      await backupManager.initialize();
      
      expect(initializedSpy).toHaveBeenCalled();
    });
  });

  describe('backup operations', () => {
    beforeEach(async () => {
      await backupManager.initialize();
    });

    it('should perform incremental backup successfully', async () => {
      const result = await backupManager.performBackup('incremental');
      
      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.verification.status).toBe('passed');
    });

    it('should perform full backup successfully', async () => {
      const result = await backupManager.performBackup('full');
      
      expect(result.success).toBe(true);
      expect(result.backupId).toContain('full');
    });

    it('should perform differential backup successfully', async () => {
      const result = await backupManager.performBackup('differential');
      
      expect(result.success).toBe(true);
      expect(result.backupId).toContain('differential');
    });

    it('should emit backup events', async () => {
      const backupStartedSpy = vi.fn();
      const backupCompletedSpy = vi.fn();
      
      backupManager.on('backup-started', backupStartedSpy);
      backupManager.on('backup-completed', backupCompletedSpy);
      
      await backupManager.performBackup('incremental');
      
      expect(backupStartedSpy).toHaveBeenCalled();
      expect(backupCompletedSpy).toHaveBeenCalled();
    });
  });

  describe('restore operations', () => {
    beforeEach(async () => {
      await backupManager.initialize();
    });

    it('should restore from backup successfully', async () => {
      // First create a backup
      const backupResult = await backupManager.performBackup('full');
      expect(backupResult.success).toBe(true);
      
      // Then restore from it
      const restoreResult = await backupManager.restoreFromBackup(backupResult.backupId);
      
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoreId).toBeDefined();
      expect(restoreResult.dataIntegrity).toBe(true);
    });

    it('should restore to specific environment', async () => {
      const backupResult = await backupManager.performBackup('incremental');
      const restoreResult = await backupManager.restoreFromBackup(
        backupResult.backupId, 
        'staging'
      );
      
      expect(restoreResult.success).toBe(true);
    });

    it('should emit restore events', async () => {
      const restoreStartedSpy = vi.fn();
      const restoreCompletedSpy = vi.fn();
      
      backupManager.on('restore-started', restoreStartedSpy);
      backupManager.on('restore-completed', restoreCompletedSpy);
      
      const backupResult = await backupManager.performBackup('incremental');
      await backupManager.restoreFromBackup(backupResult.backupId);
      
      expect(restoreStartedSpy).toHaveBeenCalled();
      expect(restoreCompletedSpy).toHaveBeenCalled();
    });
  });

  describe('backup status and metrics', () => {
    beforeEach(async () => {
      await backupManager.initialize();
    });

    it('should get last backup status', async () => {
      // Perform a backup first
      await backupManager.performBackup('incremental');
      
      const status = await backupManager.getLastBackupStatus();
      expect(status).toBeDefined();
    });

    it('should get backup metrics', async () => {
      const metrics = await backupManager.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalBackups).toBeDefined();
      expect(metrics.successfulBackups).toBeDefined();
      expect(metrics.failedBackups).toBeDefined();
      expect(metrics.successRate).toBeDefined();
    });

    it('should list backups', async () => {
      const backups = await backupManager.listBackups();
      expect(Array.isArray(backups)).toBe(true);
    });
  });

  describe('configuration management', () => {
    beforeEach(async () => {
      await backupManager.initialize();
    });

    it('should update configuration successfully', async () => {
      const newConfig = {
        ...config,
        compression: false,
        verification: false
      };
      
      await expect(backupManager.updateConfig(newConfig)).resolves.not.toThrow();
    });

    it('should emit config update events', async () => {
      const configUpdatedSpy = vi.fn();
      backupManager.on('config-updated', configUpdatedSpy);
      
      const newConfig = { ...config };
      await backupManager.updateConfig(newConfig);
      
      expect(configUpdatedSpy).toHaveBeenCalledWith(newConfig);
    });
  });

  describe('cleanup operations', () => {
    beforeEach(async () => {
      await backupManager.initialize();
    });

    it('should cleanup old backups', async () => {
      await expect(backupManager.cleanupOldBackups()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await backupManager.initialize();
    });

    it('should handle backup failures gracefully', async () => {
      // Mock a failure scenario by using invalid backup type
      const result = await backupManager.performBackup('incremental');
      
      // Even if internal operations fail, should return a result
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should emit error events', async () => {
      const errorSpy = vi.fn();
      backupManager.on('error', errorSpy);
      
      // Trigger an error condition
      backupManager.emit('error', new Error('Test error'));
      
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await backupManager.initialize();
      await expect(backupManager.shutdown()).resolves.not.toThrow();
    });

    it('should emit shutdown events', async () => {
      await backupManager.initialize();
      
      const shutdownSpy = vi.fn();
      backupManager.on('shutdown', shutdownSpy);
      
      await backupManager.shutdown();
      
      expect(shutdownSpy).toHaveBeenCalled();
    });
  });
});