/**
 * Core types for data management system
 */

export type DatabaseType = 'postgresql' | 'mongodb' | 'redis';

export type TransactionIsolationLevel = 
  | 'READ_UNCOMMITTED'
  | 'READ_COMMITTED'
  | 'REPEATABLE_READ'
  | 'SERIALIZABLE';

export type BackupType = 'full' | 'incremental' | 'differential';

export type ArchivalStatus = 'active' | 'archived' | 'deleted';

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  transaction?: string;
  isolation?: TransactionIsolationLevel;
}

export interface MigrationConfig {
  directory: string;
  tableName: string;
  schemaName?: string;
  validateChecksums: boolean;
  allowOutOfOrder: boolean;
}

export interface BackupConfig {
  type: BackupType;
  destination: string;
  compression: boolean;
  encryption: boolean;
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  schedule?: string; // Cron expression
}

export interface ReplicationConfig {
  enabled: boolean;
  mode: 'sync' | 'async';
  replicas: DatabaseConfig[];
  failoverTimeout: number;
  healthCheckInterval: number;
}

export interface ArchivalPolicy {
  enabled: boolean;
  rules: ArchivalRule[];
  destination: string;
  compression: boolean;
  encryption: boolean;
}

export interface ArchivalRule {
  table: string;
  condition: string;
  ageThreshold: number; // days
  sizeThreshold?: number; // bytes
  priority: number;
}

export interface DataLifecycleConfig {
  retention: RetentionPolicy[];
  archival: ArchivalPolicy;
  cleanup: CleanupPolicy;
}

export interface RetentionPolicy {
  table: string;
  retentionDays: number;
  conditions?: string;
  action: 'delete' | 'archive';
}

export interface CleanupPolicy {
  enabled: boolean;
  schedule: string; // Cron expression
  batchSize: number;
  maxExecutionTime: number; // minutes
}