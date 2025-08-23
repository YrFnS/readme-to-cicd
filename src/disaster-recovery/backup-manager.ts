/**
 * Backup Manager
 * 
 * Handles automated backup operations, retention policies, encryption,
 * and backup verification for disaster recovery.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { createHash, createCipher, createDecipher } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import {
  BackupStrategy,
  BackupResult,
  RestoreResult,
  BackupStatus,
  VerificationStatus,
  RetentionPolicy
} from './types.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export class BackupManager extends EventEmitter {
  private config: BackupStrategy;
  private isInitialized = false;
  private backupSchedules: Map<string, NodeJS.Timeout> = new Map();
  private activeBackups: Map<string, BackupOperation> = new Map();

  constructor(config: BackupStrategy) {
    super();
    this.config = config;
  }

  /**
   * Initialize the backup manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure backup directories exist
      await this.ensureBackupDirectories();
      
      // Schedule automated backups
      await this.scheduleBackups();
      
      // Clean up old backups based on retention policy
      await this.cleanupOldBackups();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the backup manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Cancel all scheduled backups
      for (const [name, timeout] of this.backupSchedules) {
        clearTimeout(timeout);
      }
      this.backupSchedules.clear();

      // Wait for active backups to complete
      await this.waitForActiveBackups();

      this.isInitialized = false;
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Perform a backup operation
   */
  async performBackup(type: 'full' | 'incremental' | 'differential' = 'incremental'): Promise<BackupResult> {
    const backupId = this.generateBackupId(type);
    const startTime = new Date();

    try {
      this.emit('backup-started', { backupId, type });

      const operation: BackupOperation = {
        id: backupId,
        type,
        startTime,
        status: 'running',
        size: 0
      };

      this.activeBackups.set(backupId, operation);

      // Determine what to backup based on type
      const backupData = await this.collectBackupData(type);
      
      // Compress data if enabled
      let processedData = backupData;
      if (this.config.compression) {
        processedData = await this.compressData(backupData);
      }

      // Encrypt data if enabled
      if (this.config.encryption.enabled) {
        processedData = await this.encryptData(processedData);
      }

      // Store backup
      const backupPath = await this.storeBackup(backupId, processedData);
      operation.size = processedData.length;
      operation.path = backupPath;

      // Verify backup if enabled
      let verification: VerificationStatus = { status: 'skipped' };
      if (this.config.verification) {
        verification = await this.verifyBackup(backupId, processedData);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      operation.status = 'completed';
      operation.endTime = endTime;
      operation.verification = verification;

      this.activeBackups.delete(backupId);

      const result: BackupResult = {
        success: true,
        backupId,
        size: operation.size,
        duration,
        verification
      };

      this.emit('backup-completed', result);
      return result;

    } catch (error) {
      this.activeBackups.delete(backupId);
      
      const result: BackupResult = {
        success: false,
        backupId,
        size: 0,
        duration: Date.now() - startTime.getTime(),
        verification: { status: 'failed', errors: [error.message] },
        error: error.message
      };

      this.emit('backup-failed', result);
      return result;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string, targetEnvironment?: string): Promise<RestoreResult> {
    const startTime = new Date();

    try {
      this.emit('restore-started', { backupId, targetEnvironment });

      // Load backup metadata
      const backupMetadata = await this.loadBackupMetadata(backupId);
      if (!backupMetadata) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Load backup data
      let backupData = await this.loadBackupData(backupId);

      // Decrypt data if needed
      if (this.config.encryption.enabled) {
        backupData = await this.decryptData(backupData);
      }

      // Decompress data if needed
      if (this.config.compression) {
        backupData = await this.decompressData(backupData);
      }

      // Restore data to target environment
      await this.restoreData(backupData, targetEnvironment);

      // Verify data integrity
      const dataIntegrity = await this.verifyDataIntegrity(backupData);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: RestoreResult = {
        success: true,
        restoreId: this.generateRestoreId(),
        duration,
        dataIntegrity
      };

      this.emit('restore-completed', result);
      return result;

    } catch (error) {
      const result: RestoreResult = {
        success: false,
        restoreId: this.generateRestoreId(),
        duration: Date.now() - startTime.getTime(),
        dataIntegrity: false,
        error: error.message
      };

      this.emit('restore-failed', result);
      return result;
    }
  }

  /**
   * Get last backup status
   */
  async getLastBackupStatus(): Promise<BackupStatus | null> {
    try {
      const backups = await this.listBackups();
      if (backups.length === 0) {
        return null;
      }

      // Sort by start time and get the most recent
      const lastBackup = backups.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
      return lastBackup;
    } catch (error) {
      this.emit('error', error);
      return null;
    }
  }

  /**
   * Update backup configuration
   */
  async updateConfig(newConfig: BackupStrategy): Promise<void> {
    try {
      this.config = newConfig;
      
      // Reschedule backups with new configuration
      await this.scheduleBackups();
      
      this.emit('config-updated', newConfig);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get backup metrics
   */
  async getMetrics(): Promise<Record<string, any>> {
    try {
      const backups = await this.listBackups();
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const successfulBackups = backups.filter(b => b.status === 'completed').length;
      const failedBackups = backups.filter(b => b.status === 'failed').length;

      return {
        totalBackups: backups.length,
        successfulBackups,
        failedBackups,
        successRate: backups.length > 0 ? (successfulBackups / backups.length) * 100 : 0,
        totalSize,
        averageSize: backups.length > 0 ? totalSize / backups.length : 0,
        lastBackupTime: backups.length > 0 ? backups[0].startTime : null,
        activeBackups: this.activeBackups.size
      };
    } catch (error) {
      this.emit('error', error);
      return {};
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupStatus[]> {
    try {
      // This would typically query a backup metadata store
      // For now, return mock data
      return [];
    } catch (error) {
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      const now = new Date();
      const retention = this.config.retention;

      for (const backup of backups) {
        const age = now.getTime() - backup.startTime.getTime();
        const ageInDays = age / (1000 * 60 * 60 * 24);

        let shouldDelete = false;

        // Check retention policy based on backup frequency
        if (this.isDaily(backup) && ageInDays > retention.daily) {
          shouldDelete = true;
        } else if (this.isWeekly(backup) && ageInDays > retention.weekly * 7) {
          shouldDelete = true;
        } else if (this.isMonthly(backup) && ageInDays > retention.monthly * 30) {
          shouldDelete = true;
        } else if (this.isYearly(backup) && ageInDays > retention.yearly * 365) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          await this.deleteBackup(backup.id);
        }
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(type: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup-${type}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique restore ID
   */
  private generateRestoreId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `restore-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensure backup directories exist
   */
  private async ensureBackupDirectories(): Promise<void> {
    const directories = [
      './temp/backups',
      './temp/backups/full',
      './temp/backups/incremental',
      './temp/backups/differential'
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore error
      }
    }
  }

  /**
   * Schedule automated backups
   */
  private async scheduleBackups(): Promise<void> {
    // Clear existing schedules
    for (const [name, timeout] of this.backupSchedules) {
      clearTimeout(timeout);
    }
    this.backupSchedules.clear();

    // Schedule full backups
    if (this.config.frequency.full) {
      this.scheduleBackup('full', this.config.frequency.full);
    }

    // Schedule incremental backups
    if (this.config.frequency.incremental) {
      this.scheduleBackup('incremental', this.config.frequency.incremental);
    }

    // Schedule differential backups
    if (this.config.frequency.differential) {
      this.scheduleBackup('differential', this.config.frequency.differential);
    }
  }

  /**
   * Schedule a specific backup type
   */
  private scheduleBackup(type: 'full' | 'incremental' | 'differential', cronExpression: string): void {
    // For simplicity, using setTimeout instead of full cron implementation
    // In production, would use a proper cron library
    const interval = this.parseCronToInterval(cronExpression);
    
    const scheduleNext = () => {
      const timeout = setTimeout(async () => {
        try {
          await this.performBackup(type);
        } catch (error) {
          this.emit('error', error);
        }
        scheduleNext(); // Schedule next backup
      }, interval);
      
      this.backupSchedules.set(type, timeout);
    };

    scheduleNext();
  }

  /**
   * Parse cron expression to interval (simplified)
   */
  private parseCronToInterval(cronExpression: string): number {
    // Simplified cron parsing - in production would use proper cron library
    if (cronExpression.includes('daily') || cronExpression.includes('0 0 * * *')) {
      return 24 * 60 * 60 * 1000; // 24 hours
    } else if (cronExpression.includes('hourly') || cronExpression.includes('0 * * * *')) {
      return 60 * 60 * 1000; // 1 hour
    } else {
      return 60 * 60 * 1000; // Default to 1 hour
    }
  }

  /**
   * Collect data to backup based on type
   */
  private async collectBackupData(type: 'full' | 'incremental' | 'differential'): Promise<Buffer> {
    // This would collect actual system data
    // For now, return mock data
    const mockData = {
      type,
      timestamp: new Date().toISOString(),
      data: {
        configurations: { version: '1.0.0' },
        databases: { tables: ['users', 'projects'] },
        files: { count: 1000 }
      }
    };

    return Buffer.from(JSON.stringify(mockData));
  }

  /**
   * Compress backup data
   */
  private async compressData(data: Buffer): Promise<Buffer> {
    return await gzipAsync(data);
  }

  /**
   * Decompress backup data
   */
  private async decompressData(data: Buffer): Promise<Buffer> {
    return await gunzipAsync(data);
  }

  /**
   * Encrypt backup data
   */
  private async encryptData(data: Buffer): Promise<Buffer> {
    const cipher = createCipher(this.config.encryption.algorithm.toLowerCase(), 'backup-key');
    return Buffer.concat([cipher.update(data), cipher.final()]);
  }

  /**
   * Decrypt backup data
   */
  private async decryptData(data: Buffer): Promise<Buffer> {
    const decipher = createDecipher(this.config.encryption.algorithm.toLowerCase(), 'backup-key');
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  /**
   * Store backup data
   */
  private async storeBackup(backupId: string, data: Buffer): Promise<string> {
    // Use temp directory for testing
    const backupPath = `./temp/backups/${backupId}.backup`;
    await fs.writeFile(backupPath, data);
    return backupPath;
  }

  /**
   * Load backup data
   */
  private async loadBackupData(backupId: string): Promise<Buffer> {
    const backupPath = `./temp/backups/${backupId}.backup`;
    return await fs.readFile(backupPath);
  }

  /**
   * Load backup metadata
   */
  private async loadBackupMetadata(backupId: string): Promise<any> {
    // This would load metadata from a metadata store
    // For now, return mock metadata
    return {
      id: backupId,
      type: 'incremental',
      timestamp: new Date(),
      size: 1024
    };
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(backupId: string, data: Buffer): Promise<VerificationStatus> {
    try {
      // Calculate checksum
      const checksum = createHash('sha256').update(data).digest('hex');
      
      // Verify data can be read back
      const storedData = await this.loadBackupData(backupId);
      const storedChecksum = createHash('sha256').update(storedData).digest('hex');
      
      if (checksum === storedChecksum) {
        return {
          status: 'passed',
          checksum
        };
      } else {
        return {
          status: 'failed',
          errors: ['Checksum mismatch']
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        errors: [error.message]
      };
    }
  }

  /**
   * Restore data to target environment
   */
  private async restoreData(data: Buffer, targetEnvironment?: string): Promise<void> {
    // This would restore data to the target environment
    // Implementation depends on what's being backed up
    const parsedData = JSON.parse(data.toString());
    
    // Mock restoration process
    console.log(`Restoring data to ${targetEnvironment || 'default'} environment`);
    console.log(`Data type: ${parsedData.type}`);
    console.log(`Data timestamp: ${parsedData.timestamp}`);
  }

  /**
   * Verify data integrity after restore
   */
  private async verifyDataIntegrity(data: Buffer): Promise<boolean> {
    try {
      // Verify data can be parsed
      JSON.parse(data.toString());
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete a backup
   */
  private async deleteBackup(backupId: string): Promise<void> {
    try {
      const backupPath = `./temp/backups/${backupId}.backup`;
      await fs.unlink(backupPath);
      this.emit('backup-deleted', { backupId });
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Wait for all active backups to complete
   */
  private async waitForActiveBackups(): Promise<void> {
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();

    while (this.activeBackups.size > 0 && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.activeBackups.size > 0) {
      console.warn(`${this.activeBackups.size} backups still active after shutdown timeout`);
    }
  }

  /**
   * Check if backup is daily
   */
  private isDaily(backup: BackupStatus): boolean {
    // Logic to determine if backup is daily
    return backup.type === 'incremental';
  }

  /**
   * Check if backup is weekly
   */
  private isWeekly(backup: BackupStatus): boolean {
    // Logic to determine if backup is weekly
    return backup.type === 'differential';
  }

  /**
   * Check if backup is monthly
   */
  private isMonthly(backup: BackupStatus): boolean {
    // Logic to determine if backup is monthly
    return backup.type === 'full';
  }

  /**
   * Check if backup is yearly
   */
  private isYearly(backup: BackupStatus): boolean {
    // Logic to determine if backup is yearly
    return false; // Not implemented in this example
  }
}

interface BackupOperation {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  size: number;
  path?: string;
  verification?: VerificationStatus;
}