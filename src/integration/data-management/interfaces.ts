/**
 * Core interfaces for data management system
 */

import { 
  DatabaseConfig, 
  QueryOptions, 
  MigrationConfig, 
  BackupConfig, 
  ReplicationConfig,
  DataLifecycleConfig,
  TransactionIsolationLevel,
  BackupType,
  ArchivalStatus
} from './types';

export interface DatabaseAdapter {
  connect(config: DatabaseConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Basic operations
  query<T = any>(sql: string, params?: any[], options?: QueryOptions): Promise<T[]>;
  execute(sql: string, params?: any[], options?: QueryOptions): Promise<number>;
  
  // Transaction support
  beginTransaction(isolation?: TransactionIsolationLevel): Promise<string>;
  commitTransaction(transactionId: string): Promise<void>;
  rollbackTransaction(transactionId: string): Promise<void>;
  
  // Health and monitoring
  healthCheck(): Promise<HealthStatus>;
  getMetrics(): Promise<DatabaseMetrics>;
}

export interface MigrationManager {
  initialize(config: MigrationConfig): Promise<void>;
  migrate(targetVersion?: string): Promise<MigrationResult>;
  rollback(targetVersion: string): Promise<MigrationResult>;
  getStatus(): Promise<MigrationStatus>;
  validateMigrations(): Promise<ValidationResult>;
  createMigration(name: string, type: 'up' | 'down'): Promise<string>;
}

export interface BackupManager {
  createBackup(config: BackupConfig): Promise<BackupResult>;
  restoreBackup(backupId: string, targetConfig?: DatabaseConfig): Promise<RestoreResult>;
  listBackups(): Promise<BackupInfo[]>;
  deleteBackup(backupId: string): Promise<void>;
  validateBackup(backupId: string): Promise<ValidationResult>;
  scheduleBackup(config: BackupConfig): Promise<string>;
}

export interface TransactionManager {
  begin(isolation?: TransactionIsolationLevel): Promise<Transaction>;
  commit(transaction: Transaction): Promise<void>;
  rollback(transaction: Transaction): Promise<void>;
  savepoint(transaction: Transaction, name: string): Promise<void>;
  rollbackToSavepoint(transaction: Transaction, name: string): Promise<void>;
  getActiveTransactions(): Promise<TransactionInfo[]>;
}

export interface LifecycleManager {
  initialize(config: DataLifecycleConfig): Promise<void>;
  executeRetentionPolicies(): Promise<RetentionResult>;
  executeArchivalPolicies(): Promise<ArchivalResult>;
  executeCleanupPolicies(): Promise<CleanupResult>;
  scheduleLifecycleTasks(): Promise<void>;
  getLifecycleStatus(): Promise<LifecycleStatus>;
}

export interface ReplicationManager {
  setupReplication(config: ReplicationConfig): Promise<void>;
  failover(targetReplica: string): Promise<void>;
  syncReplicas(): Promise<SyncResult>;
  getReplicationStatus(): Promise<ReplicationStatus>;
  addReplica(config: DatabaseConfig): Promise<void>;
  removeReplica(replicaId: string): Promise<void>;
}

// Result and status interfaces
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  lastCheck: Date;
  errors?: string[];
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    waiting: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageLatency: number;
  };
  storage: {
    size: number;
    available: number;
    used: number;
  };
  performance: {
    cpu: number;
    memory: number;
    io: number;
  };
}

export interface MigrationResult {
  success: boolean;
  migrationsExecuted: string[];
  errors: string[];
  duration: number;
  targetVersion: string;
}

export interface MigrationStatus {
  currentVersion: string;
  pendingMigrations: string[];
  appliedMigrations: MigrationInfo[];
  isUpToDate: boolean;
}

export interface MigrationInfo {
  version: string;
  name: string;
  appliedAt: Date;
  checksum: string;
  executionTime: number;
}

export interface BackupResult {
  backupId: string;
  success: boolean;
  size: number;
  duration: number;
  location: string;
  checksum: string;
  error?: string;
}

export interface BackupInfo {
  id: string;
  type: BackupType;
  size: number;
  createdAt: Date;
  location: string;
  checksum: string;
  status: 'completed' | 'failed' | 'in_progress';
}

export interface RestoreResult {
  success: boolean;
  duration: number;
  restoredSize: number;
  error?: string;
}

export interface Transaction {
  id: string;
  isolation: TransactionIsolationLevel;
  startTime: Date;
  savepoints: string[];
  status: 'active' | 'committed' | 'rolled_back';
}

export interface TransactionInfo {
  id: string;
  startTime: Date;
  isolation: TransactionIsolationLevel;
  queries: number;
  status: 'active' | 'committed' | 'rolled_back';
}

export interface RetentionResult {
  success: boolean;
  recordsProcessed: number;
  recordsDeleted: number;
  recordsArchived: number;
  duration: number;
  errors: string[];
}

export interface ArchivalResult {
  success: boolean;
  recordsArchived: number;
  archivedSize: number;
  duration: number;
  location: string;
  errors: string[];
}

export interface CleanupResult {
  success: boolean;
  recordsDeleted: number;
  spaceReclaimed: number;
  duration: number;
  errors: string[];
}

export interface LifecycleStatus {
  lastRetentionRun: Date;
  lastArchivalRun: Date;
  lastCleanupRun: Date;
  nextScheduledRun: Date;
  activeJobs: string[];
  errors: string[];
}

export interface SyncResult {
  success: boolean;
  replicasSynced: string[];
  syncLag: number;
  errors: string[];
}

export interface ReplicationStatus {
  primary: string;
  replicas: ReplicaStatus[];
  syncLag: number;
  lastSync: Date;
  status: 'healthy' | 'degraded' | 'failed';
}

export interface ReplicaStatus {
  id: string;
  status: 'online' | 'offline' | 'syncing';
  lag: number;
  lastSync: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}