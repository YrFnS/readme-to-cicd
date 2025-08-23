/**
 * Core DataManager class that orchestrates all data management operations
 */

import { 
  DatabaseAdapter, 
  MigrationManager, 
  BackupManager, 
  TransactionManager, 
  LifecycleManager,
  ReplicationManager,
  HealthStatus,
  DatabaseMetrics,
  ValidationResult
} from './interfaces';
import { 
  DatabaseConfig, 
  DatabaseType, 
  QueryOptions,
  MigrationConfig,
  BackupConfig,
  DataLifecycleConfig,
  ReplicationConfig
} from './types';
import { PostgreSQLAdapter } from './adapters/postgresql-adapter';
import { MongoDBAdapter } from './adapters/mongodb-adapter';
import { RedisAdapter } from './adapters/redis-adapter';
import { MigrationManagerImpl } from './migration-manager';
import { BackupManagerImpl } from './backup-manager';
import { TransactionManagerImpl } from './transaction-manager';
import { LifecycleManagerImpl } from './lifecycle-manager';
import { ReplicationManagerImpl } from './replication-manager';

export class DataManager {
  private adapters: Map<string, DatabaseAdapter> = new Map();
  private migrationManager: MigrationManager;
  private backupManager: BackupManager;
  private transactionManager: TransactionManager;
  private lifecycleManager: LifecycleManager;
  private replicationManager: ReplicationManager;
  private primaryAdapter?: DatabaseAdapter;
  private isInitialized = false;

  constructor() {
    this.migrationManager = new MigrationManagerImpl();
    this.backupManager = new BackupManagerImpl();
    this.transactionManager = new TransactionManagerImpl();
    this.lifecycleManager = new LifecycleManagerImpl();
    this.replicationManager = new ReplicationManagerImpl();
  }

  /**
   * Initialize the DataManager with database configurations
   */
  async initialize(configs: DatabaseConfig[]): Promise<void> {
    if (this.isInitialized) {
      throw new Error('DataManager is already initialized');
    }

    try {
      // Initialize database adapters
      for (const config of configs) {
        const adapter = this.createAdapter(config.type);
        await adapter.connect(config);
        
        const adapterId = `${config.type}-${config.host}-${config.database}`;
        this.adapters.set(adapterId, adapter);
        
        // Set the first adapter as primary
        if (!this.primaryAdapter) {
          this.primaryAdapter = adapter;
        }
      }

      if (!this.primaryAdapter) {
        throw new Error('No primary database adapter configured');
      }

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize DataManager: ${error.message}`);
    }
  }

  /**
   * Add a new database connection
   */
  async addDatabase(config: DatabaseConfig): Promise<string> {
    const adapter = this.createAdapter(config.type);
    await adapter.connect(config);
    
    const adapterId = `${config.type}-${config.host}-${config.database}`;
    this.adapters.set(adapterId, adapter);
    
    return adapterId;
  }

  /**
   * Remove a database connection
   */
  async removeDatabase(adapterId: string): Promise<void> {
    const adapter = this.adapters.get(adapterId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(adapterId);
    }
  }

  /**
   * Execute a query on the primary database
   */
  async query<T = any>(sql: string, params?: any[], options?: QueryOptions): Promise<T[]> {
    this.ensureInitialized();
    return this.primaryAdapter!.query<T>(sql, params, options);
  }

  /**
   * Execute a command on the primary database
   */
  async execute(sql: string, params?: any[], options?: QueryOptions): Promise<number> {
    this.ensureInitialized();
    return this.primaryAdapter!.execute(sql, params, options);
  }

  /**
   * Execute a query on a specific database
   */
  async queryDatabase<T = any>(
    adapterId: string, 
    sql: string, 
    params?: any[], 
    options?: QueryOptions
  ): Promise<T[]> {
    const adapter = this.getAdapter(adapterId);
    return adapter.query<T>(sql, params, options);
  }

  /**
   * Execute a command on a specific database
   */
  async executeDatabase(
    adapterId: string, 
    sql: string, 
    params?: any[], 
    options?: QueryOptions
  ): Promise<number> {
    const adapter = this.getAdapter(adapterId);
    return adapter.execute(sql, params, options);
  }

  /**
   * Get health status of all databases
   */
  async getHealthStatus(): Promise<Map<string, HealthStatus>> {
    const healthStatuses = new Map<string, HealthStatus>();
    
    for (const [adapterId, adapter] of this.adapters) {
      try {
        const health = await adapter.healthCheck();
        healthStatuses.set(adapterId, health);
      } catch (error) {
        healthStatuses.set(adapterId, {
          status: 'unhealthy',
          latency: -1,
          connections: { active: 0, idle: 0, total: 0 },
          lastCheck: new Date(),
          errors: [error.message]
        });
      }
    }
    
    return healthStatuses;
  }

  /**
   * Get metrics from all databases
   */
  async getMetrics(): Promise<Map<string, DatabaseMetrics>> {
    const metrics = new Map<string, DatabaseMetrics>();
    
    for (const [adapterId, adapter] of this.adapters) {
      try {
        const adapterMetrics = await adapter.getMetrics();
        metrics.set(adapterId, adapterMetrics);
      } catch (error) {
        // Log error but continue with other adapters
        console.error(`Failed to get metrics for ${adapterId}:`, error);
      }
    }
    
    return metrics;
  }

  /**
   * Initialize migration system
   */
  async initializeMigrations(config: MigrationConfig): Promise<void> {
    await this.migrationManager.initialize(config);
  }

  /**
   * Run database migrations
   */
  async migrate(targetVersion?: string) {
    return this.migrationManager.migrate(targetVersion);
  }

  /**
   * Rollback migrations
   */
  async rollback(targetVersion: string) {
    return this.migrationManager.rollback(targetVersion);
  }

  /**
   * Setup automated backups
   */
  async setupBackups(config: BackupConfig): Promise<string> {
    return this.backupManager.scheduleBackup(config);
  }

  /**
   * Create a manual backup
   */
  async createBackup(config: BackupConfig) {
    return this.backupManager.createBackup(config);
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string, targetConfig?: DatabaseConfig) {
    return this.backupManager.restoreBackup(backupId, targetConfig);
  }

  /**
   * Setup data lifecycle management
   */
  async setupLifecycleManagement(config: DataLifecycleConfig): Promise<void> {
    await this.lifecycleManager.initialize(config);
    await this.lifecycleManager.scheduleLifecycleTasks();
  }

  /**
   * Setup replication
   */
  async setupReplication(config: ReplicationConfig): Promise<void> {
    await this.replicationManager.setupReplication(config);
  }

  /**
   * Perform failover to a replica
   */
  async failover(targetReplica: string): Promise<void> {
    await this.replicationManager.failover(targetReplica);
  }

  /**
   * Validate system integrity
   */
  async validateSystem(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check database connections
      const healthStatuses = await this.getHealthStatus();
      for (const [adapterId, health] of healthStatuses) {
        if (health.status === 'unhealthy') {
          errors.push(`Database ${adapterId} is unhealthy: ${health.errors?.join(', ')}`);
        } else if (health.status === 'degraded') {
          warnings.push(`Database ${adapterId} is degraded`);
        }
      }

      // Validate migrations
      const migrationStatus = await this.migrationManager.getStatus();
      if (!migrationStatus.isUpToDate) {
        warnings.push(`Pending migrations: ${migrationStatus.pendingMigrations.join(', ')}`);
      }

      // Check replication status
      const replicationStatus = await this.replicationManager.getReplicationStatus();
      if (replicationStatus.status === 'failed') {
        errors.push('Replication is in failed state');
      } else if (replicationStatus.status === 'degraded') {
        warnings.push('Replication is degraded');
      }

    } catch (error) {
      errors.push(`System validation failed: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Gracefully shutdown all connections
   */
  async shutdown(): Promise<void> {
    for (const [adapterId, adapter] of this.adapters) {
      try {
        await adapter.disconnect();
      } catch (error) {
        console.error(`Failed to disconnect ${adapterId}:`, error);
      }
    }
    
    this.adapters.clear();
    this.primaryAdapter = undefined;
    this.isInitialized = false;
  }

  // Getter methods for managers
  getMigrationManager(): MigrationManager {
    return this.migrationManager;
  }

  getBackupManager(): BackupManager {
    return this.backupManager;
  }

  getTransactionManager(): TransactionManager {
    return this.transactionManager;
  }

  getLifecycleManager(): LifecycleManager {
    return this.lifecycleManager;
  }

  getReplicationManager(): ReplicationManager {
    return this.replicationManager;
  }

  // Private helper methods
  private createAdapter(type: DatabaseType): DatabaseAdapter {
    switch (type) {
      case 'postgresql':
        return new PostgreSQLAdapter();
      case 'mongodb':
        return new MongoDBAdapter();
      case 'redis':
        return new RedisAdapter();
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  private getAdapter(adapterId: string): DatabaseAdapter {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Database adapter not found: ${adapterId}`);
    }
    return adapter;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.primaryAdapter) {
      throw new Error('DataManager is not initialized');
    }
  }
}