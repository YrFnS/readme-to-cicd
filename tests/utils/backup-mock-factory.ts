/**
 * Mock Response Factory for Backup Operations
 * 
 * Provides consistent mock responses for backup operations to ensure
 * reliable test behavior and standardized success/failure patterns.
 * 
 * This factory supports various backup operation types including:
 * - Configuration backups
 * - Data backups
 * - System state backups
 * - Incremental backups
 * - Full backups
 */

import { Result, success, failure } from '../../src/shared/types/result';

/**
 * Backup operation types supported by the mock factory
 */
export type BackupOperationType = 
  | 'configuration'
  | 'data'
  | 'system-state'
  | 'incremental'
  | 'full'
  | 'restore'
  | 'verify'
  | 'cleanup';

/**
 * Backup operation status
 */
export type BackupStatus = 
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'verified';

/**
 * Backup operation metadata
 */
export interface BackupMetadata {
  /** Unique identifier for the backup operation */
  id: string;
  
  /** Type of backup operation */
  type: BackupOperationType;
  
  /** Current status of the backup */
  status: BackupStatus;
  
  /** Timestamp when the backup was started */
  startTime: Date;
  
  /** Timestamp when the backup was completed (if applicable) */
  endTime?: Date;
  
  /** Size of the backup in bytes */
  size?: number;
  
  /** Location where the backup is stored */
  location?: string;
  
  /** Checksum for backup verification */
  checksum?: string;
  
  /** Additional metadata specific to the backup type */
  metadata?: Record<string, any>;
}

/**
 * Backup operation result
 */
export interface BackupResult {
  /** Operation metadata */
  backup: BackupMetadata;
  
  /** Success message or additional details */
  message: string;
  
  /** Duration of the operation in milliseconds */
  duration: number;
  
  /** Any warnings encountered during the operation */
  warnings?: string[];
}

/**
 * Backup operation error details
 */
export interface BackupError {
  /** Error code for programmatic handling */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** The backup operation that failed */
  operation: BackupOperationType;
  
  /** Additional error context */
  context?: Record<string, any>;
  
  /** Suggested recovery actions */
  suggestions?: string[];
}

/**
 * Configuration options for the mock factory
 */
export interface BackupMockConfig {
  /** Default success rate (0-1) for operations */
  successRate: number;
  
  /** Simulated operation duration range in milliseconds */
  durationRange: { min: number; max: number };
  
  /** Whether to include warnings in successful operations */
  includeWarnings: boolean;
  
  /** Custom error scenarios to simulate */
  errorScenarios?: Partial<Record<BackupOperationType, BackupError>>;
}

/**
 * Default configuration for the backup mock factory
 */
const DEFAULT_CONFIG: BackupMockConfig = {
  successRate: 0.95,
  durationRange: { min: 100, max: 2000 },
  includeWarnings: false,
  errorScenarios: {}
};

/**
 * Mock Response Factory for Backup Operations
 * 
 * Provides consistent, configurable mock responses for backup operations
 * to ensure reliable test behavior across the test suite.
 */
export class BackupMockFactory {
  private config: BackupMockConfig;
  private operationCounter = 0;

  constructor(config: Partial<BackupMockConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a mock backup operation result
   * 
   * @param type The type of backup operation
   * @param options Additional options for the mock
   * @returns A Result containing either success or failure response
   */
  createBackupResponse(
    type: BackupOperationType,
    options: {
      forceSuccess?: boolean;
      forceFailure?: boolean;
      customMetadata?: Record<string, any>;
    } = {}
  ): Result<BackupResult, BackupError> {
    const operationId = this.generateOperationId();
    const startTime = new Date();
    const duration = this.generateDuration();
    const endTime = new Date(startTime.getTime() + duration);

    // Determine if operation should succeed or fail
    const shouldSucceed = options.forceSuccess || 
      (!options.forceFailure && Math.random() < this.config.successRate);

    if (shouldSucceed) {
      return this.createSuccessResponse(type, operationId, startTime, endTime, duration, options.customMetadata);
    } else {
      return this.createFailureResponse(type, operationId, startTime, options.customMetadata);
    }
  }

  /**
   * Create a successful backup operation response
   */
  private createSuccessResponse(
    type: BackupOperationType,
    operationId: string,
    startTime: Date,
    endTime: Date,
    duration: number,
    customMetadata?: Record<string, any>
  ): Result<BackupResult, BackupError> {
    const backup: BackupMetadata = {
      id: operationId,
      type,
      status: 'completed',
      startTime,
      endTime,
      size: this.generateBackupSize(type),
      location: this.generateBackupLocation(type, operationId),
      checksum: this.generateChecksum(),
      metadata: {
        ...this.getDefaultMetadata(type),
        ...customMetadata
      }
    };

    const result: BackupResult = {
      backup,
      message: this.getSuccessMessage(type),
      duration,
      warnings: this.config.includeWarnings ? this.generateWarnings(type) : undefined
    };

    return success(result);
  }

  /**
   * Create a failed backup operation response
   */
  private createFailureResponse(
    type: BackupOperationType,
    operationId: string,
    startTime: Date,
    customMetadata?: Record<string, any>
  ): Result<BackupResult, BackupError> {
    const customError = this.config.errorScenarios?.[type];
    
    const error: BackupError = customError || {
      code: this.generateErrorCode(type),
      message: this.getFailureMessage(type),
      operation: type,
      context: {
        operationId,
        startTime: startTime.toISOString(),
        ...customMetadata
      },
      suggestions: this.getRecoverySuggestions(type)
    };

    return failure(error);
  }

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    this.operationCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.operationCounter.toString(36);
    return `backup_${timestamp}_${counter}`;
  }

  /**
   * Generate a realistic operation duration
   */
  private generateDuration(): number {
    const { min, max } = this.config.durationRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a realistic backup size based on operation type
   */
  private generateBackupSize(type: BackupOperationType): number {
    const baseSizes: Record<BackupOperationType, number> = {
      'configuration': 1024 * 50,      // 50KB
      'data': 1024 * 1024 * 10,        // 10MB
      'system-state': 1024 * 1024 * 5, // 5MB
      'incremental': 1024 * 1024 * 2,  // 2MB
      'full': 1024 * 1024 * 50,        // 50MB
      'restore': 0,                     // No size for restore
      'verify': 0,                      // No size for verify
      'cleanup': 0                      // No size for cleanup
    };

    const baseSize = baseSizes[type];
    if (baseSize === 0) return 0;

    // Add some randomness (±20%)
    const variance = baseSize * 0.2;
    return Math.floor(baseSize + (Math.random() - 0.5) * variance);
  }

  /**
   * Generate a backup location path
   */
  private generateBackupLocation(type: BackupOperationType, operationId: string): string {
    const basePaths: Record<BackupOperationType, string> = {
      'configuration': '/backups/config',
      'data': '/backups/data',
      'system-state': '/backups/system',
      'incremental': '/backups/incremental',
      'full': '/backups/full',
      'restore': '/tmp/restore',
      'verify': '/tmp/verify',
      'cleanup': '/tmp/cleanup'
    };

    const basePath = basePaths[type];
    const timestamp = new Date().toISOString().split('T')[0];
    return `${basePath}/${timestamp}/${operationId}`;
  }

  /**
   * Generate a mock checksum
   */
  private generateChecksum(): string {
    const chars = '0123456789abcdef';
    let checksum = '';
    for (let i = 0; i < 64; i++) {
      checksum += chars[Math.floor(Math.random() * chars.length)];
    }
    return checksum;
  }

  /**
   * Get default metadata for operation type
   */
  private getDefaultMetadata(type: BackupOperationType): Record<string, any> {
    const metadata: Record<BackupOperationType, Record<string, any>> = {
      'configuration': {
        configFiles: ['app.config.json', 'database.config.json'],
        version: '1.0.0'
      },
      'data': {
        tables: ['users', 'projects', 'workflows'],
        recordCount: Math.floor(Math.random() * 10000) + 1000
      },
      'system-state': {
        services: ['parser', 'detector', 'generator'],
        uptime: Math.floor(Math.random() * 86400) + 3600
      },
      'incremental': {
        baseBackupId: 'backup_' + Date.now().toString(36),
        changedFiles: Math.floor(Math.random() * 100) + 10
      },
      'full': {
        totalFiles: Math.floor(Math.random() * 1000) + 500,
        compression: 'gzip'
      },
      'restore': {
        sourceBackupId: 'backup_' + Date.now().toString(36),
        targetLocation: '/app/restored'
      },
      'verify': {
        checksumVerified: true,
        integrityScore: 1.0
      },
      'cleanup': {
        removedBackups: Math.floor(Math.random() * 5) + 1,
        freedSpace: Math.floor(Math.random() * 1024 * 1024 * 100)
      }
    };

    return metadata[type] || {};
  }

  /**
   * Get success message for operation type
   */
  private getSuccessMessage(type: BackupOperationType): string {
    const messages: Record<BackupOperationType, string> = {
      'configuration': 'Configuration backup completed successfully',
      'data': 'Data backup completed successfully',
      'system-state': 'System state backup completed successfully',
      'incremental': 'Incremental backup completed successfully',
      'full': 'Full backup completed successfully',
      'restore': 'Backup restore completed successfully',
      'verify': 'Backup verification completed successfully',
      'cleanup': 'Backup cleanup completed successfully'
    };

    return messages[type];
  }

  /**
   * Get failure message for operation type
   */
  private getFailureMessage(type: BackupOperationType): string {
    const messages: Record<BackupOperationType, string> = {
      'configuration': 'Configuration backup failed due to access permissions',
      'data': 'Data backup failed due to database connection timeout',
      'system-state': 'System state backup failed due to insufficient disk space',
      'incremental': 'Incremental backup failed due to missing base backup',
      'full': 'Full backup failed due to I/O error',
      'restore': 'Backup restore failed due to corrupted backup file',
      'verify': 'Backup verification failed due to checksum mismatch',
      'cleanup': 'Backup cleanup failed due to file system permissions'
    };

    return messages[type];
  }

  /**
   * Generate error code for operation type
   */
  private generateErrorCode(type: BackupOperationType): string {
    const codes: Record<BackupOperationType, string> = {
      'configuration': 'BACKUP_CONFIG_ACCESS_DENIED',
      'data': 'BACKUP_DATA_CONNECTION_TIMEOUT',
      'system-state': 'BACKUP_SYSTEM_DISK_FULL',
      'incremental': 'BACKUP_INCREMENTAL_BASE_MISSING',
      'full': 'BACKUP_FULL_IO_ERROR',
      'restore': 'BACKUP_RESTORE_CORRUPTED',
      'verify': 'BACKUP_VERIFY_CHECKSUM_MISMATCH',
      'cleanup': 'BACKUP_CLEANUP_PERMISSION_DENIED'
    };

    return codes[type];
  }

  /**
   * Get recovery suggestions for operation type
   */
  private getRecoverySuggestions(type: BackupOperationType): string[] {
    const suggestions: Record<BackupOperationType, string[]> = {
      'configuration': [
        'Check file permissions for configuration directory',
        'Ensure backup service has read access to config files'
      ],
      'data': [
        'Verify database connection settings',
        'Check network connectivity to database server',
        'Increase connection timeout settings'
      ],
      'system-state': [
        'Free up disk space in backup directory',
        'Check disk quota limits',
        'Consider using compression to reduce backup size'
      ],
      'incremental': [
        'Ensure base backup exists and is accessible',
        'Run a full backup first before incremental backups'
      ],
      'full': [
        'Check disk health and available space',
        'Verify file system permissions',
        'Retry the operation after system maintenance'
      ],
      'restore': [
        'Verify backup file integrity',
        'Check backup file permissions',
        'Try restoring from a different backup'
      ],
      'verify': [
        'Re-download or recreate the backup',
        'Check for data corruption during transfer',
        'Verify backup creation process'
      ],
      'cleanup': [
        'Check file system permissions',
        'Ensure cleanup service has delete permissions',
        'Manually remove old backup files if necessary'
      ]
    };

    return suggestions[type] || ['Contact system administrator for assistance'];
  }

  /**
   * Generate warnings for successful operations
   */
  private generateWarnings(type: BackupOperationType): string[] {
    const warningPool: Record<BackupOperationType, string[]> = {
      'configuration': [
        'Some configuration files were skipped due to size limits',
        'Backup contains sensitive data - ensure secure storage'
      ],
      'data': [
        'Large tables may have impacted backup performance',
        'Some temporary data was excluded from backup'
      ],
      'system-state': [
        'System was under load during backup',
        'Some services were temporarily unavailable'
      ],
      'incremental': [
        'More changes than expected since last backup',
        'Consider running full backup soon'
      ],
      'full': [
        'Backup size exceeded expected threshold',
        'Consider implementing data archival strategy'
      ],
      'restore': [
        'Some files were overwritten during restore',
        'Service restart may be required'
      ],
      'verify': [
        'Verification took longer than expected',
        'Consider optimizing backup format'
      ],
      'cleanup': [
        'Some backup files could not be removed',
        'Manual cleanup may be required'
      ]
    };

    const warnings = warningPool[type] || [];
    
    // Randomly select 0-2 warnings
    const warningCount = Math.floor(Math.random() * 3);
    const selectedWarnings: string[] = [];
    
    for (let i = 0; i < warningCount && i < warnings.length; i++) {
      const randomIndex = Math.floor(Math.random() * warnings.length);
      if (!selectedWarnings.includes(warnings[randomIndex])) {
        selectedWarnings.push(warnings[randomIndex]);
      }
    }
    
    return selectedWarnings;
  }

  /**
   * Update factory configuration
   */
  updateConfig(newConfig: Partial<BackupMockConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset factory state (useful for testing)
   */
  reset(): void {
    this.operationCounter = 0;
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get current factory configuration
   */
  getConfig(): BackupMockConfig {
    return { ...this.config };
  }
}

/**
 * Default instance of the backup mock factory
 * Can be used directly for simple test scenarios
 */
export const defaultBackupMockFactory = new BackupMockFactory();

/**
 * Convenience functions for common backup operation mocks
 */
export const BackupMocks = {
  /**
   * Create a successful configuration backup response
   */
  successfulConfigBackup: (customMetadata?: Record<string, any>) =>
    defaultBackupMockFactory.createBackupResponse('configuration', { 
      forceSuccess: true, 
      customMetadata 
    }),

  /**
   * Create a failed configuration backup response
   */
  failedConfigBackup: (customMetadata?: Record<string, any>) =>
    defaultBackupMockFactory.createBackupResponse('configuration', { 
      forceFailure: true, 
      customMetadata 
    }),

  /**
   * Create a successful data backup response
   */
  successfulDataBackup: (customMetadata?: Record<string, any>) =>
    defaultBackupMockFactory.createBackupResponse('data', { 
      forceSuccess: true, 
      customMetadata 
    }),

  /**
   * Create a failed data backup response
   */
  failedDataBackup: (customMetadata?: Record<string, any>) =>
    defaultBackupMockFactory.createBackupResponse('data', { 
      forceFailure: true, 
      customMetadata 
    }),

  /**
   * Create a successful full backup response
   */
  successfulFullBackup: (customMetadata?: Record<string, any>) =>
    defaultBackupMockFactory.createBackupResponse('full', { 
      forceSuccess: true, 
      customMetadata 
    }),

  /**
   * Create a failed full backup response
   */
  failedFullBackup: (customMetadata?: Record<string, any>) =>
    defaultBackupMockFactory.createBackupResponse('full', { 
      forceFailure: true, 
      customMetadata 
    }),

  /**
   * Create a successful restore response
   */
  successfulRestore: (customMetadata?: Record<string, any>) =>
    defaultBackupMockFactory.createBackupResponse('restore', { 
      forceSuccess: true, 
      customMetadata 
    }),

  /**
   * Create a failed restore response
   */
  failedRestore: (customMetadata?: Record<string, any>) =>
    defaultBackupMockFactory.createBackupResponse('restore', { 
      forceFailure: true, 
      customMetadata 
    })
};