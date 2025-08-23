/**
 * Integration tests for data management system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataManager } from '../../../src/integration/data-management/data-manager';
import { 
  DatabaseConfig, 
  MigrationConfig, 
  BackupConfig, 
  DataLifecycleConfig,
  ReplicationConfig 
} from '../../../src/integration/data-management/types';

describe('Data Management Integration', () => {
  let dataManager: DataManager;
  let postgresConfig: DatabaseConfig;
  let mongoConfig: DatabaseConfig;
  let redisConfig: DatabaseConfig;

  beforeEach(() => {
    dataManager = new DataManager();
    
    postgresConfig = {
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_pass',
      ssl: false,
      poolSize: 10,
      timeout: 5000
    };

    mongoConfig = {
      type: 'mongodb',
      host: 'localhost',
      port: 27017,
      database: 'test_db',
      username: 'test_user',
      password: 'test_pass',
      ssl: false,
      poolSize: 10,
      timeout: 5000
    };

    redisConfig = {
      type: 'redis',
      host: 'localhost',
      port: 6379,
      database: '0',
      username: '',
      password: '',
      ssl: false,
      poolSize: 10,
      timeout: 5000
    };
  });

  afterEach(async () => {
    await dataManager.shutdown();
  });

  describe('multi-database initialization', () => {
    it('should initialize with multiple database types', async () => {
      // Mock all adapters
      const mockPostgresAdapter = createMockAdapter();
      const mockMongoAdapter = createMockAdapter();
      const mockRedisAdapter = createMockAdapter();

      vi.spyOn(dataManager as any, 'createAdapter')
        .mockReturnValueOnce(mockPostgresAdapter)
        .mockReturnValueOnce(mockMongoAdapter)
        .mockReturnValueOnce(mockRedisAdapter);

      await expect(dataManager.initialize([
        postgresConfig,
        mongoConfig,
        redisConfig
      ])).resolves.not.toThrow();

      // Verify all adapters were connected
      expect(mockPostgresAdapter.connect).toHaveBeenCalledWith(postgresConfig);
      expect(mockMongoAdapter.connect).toHaveBeenCalledWith(mongoConfig);
      expect(mockRedisAdapter.connect).toHaveBeenCalledWith(redisConfig);
    });

    it('should handle partial initialization failures gracefully', async () => {
      const mockPostgresAdapter = createMockAdapter();
      const mockMongoAdapter = {
        ...createMockAdapter(),
        connect: vi.fn().mockRejectedValue(new Error('MongoDB connection failed'))
      };

      vi.spyOn(dataManager as any, 'createAdapter')
        .mockReturnValueOnce(mockPostgresAdapter)
        .mockReturnValueOnce(mockMongoAdapter);

      await expect(dataManager.initialize([
        postgresConfig,
        mongoConfig
      ])).rejects.toThrow('Failed to initialize DataManager');
    });
  });

  describe('cross-database operations', () => {
    beforeEach(async () => {
      const mockPostgresAdapter = createMockAdapter();
      const mockRedisAdapter = createMockAdapter();

      vi.spyOn(dataManager as any, 'createAdapter')
        .mockReturnValueOnce(mockPostgresAdapter)
        .mockReturnValueOnce(mockRedisAdapter);

      await dataManager.initialize([postgresConfig, redisConfig]);
    });

    it('should execute queries on different databases', async () => {
      const postgresResult = await dataManager.queryDatabase(
        'postgresql-localhost-test_db',
        'SELECT * FROM users'
      );
      
      const redisResult = await dataManager.queryDatabase(
        'redis-localhost-0',
        'GET user:123'
      );

      expect(postgresResult).toBeDefined();
      expect(redisResult).toBeDefined();
    });

    it('should handle database-specific errors', async () => {
      await expect(dataManager.queryDatabase(
        'nonexistent-database',
        'SELECT 1'
      )).rejects.toThrow('Database adapter not found');
    });
  });

  describe('migration system integration', () => {
    beforeEach(async () => {
      const mockAdapter = createMockAdapter();
      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([postgresConfig]);
    });

    it('should initialize and run migrations', async () => {
      const migrationConfig: MigrationConfig = {
        directory: './test-migrations',
        tableName: 'schema_migrations',
        validateChecksums: true,
        allowOutOfOrder: false
      };

      await expect(dataManager.initializeMigrations(migrationConfig)).resolves.not.toThrow();
      
      const migrationResult = await dataManager.migrate();
      expect(migrationResult.success).toBe(true);
    });

    it('should handle migration rollbacks', async () => {
      const migrationConfig: MigrationConfig = {
        directory: './test-migrations',
        tableName: 'schema_migrations',
        validateChecksums: true,
        allowOutOfOrder: false
      };

      await dataManager.initializeMigrations(migrationConfig);
      
      const rollbackResult = await dataManager.rollback('1.0.0');
      expect(rollbackResult.success).toBe(true);
    });
  });

  describe('backup and recovery integration', () => {
    beforeEach(async () => {
      const mockAdapter = createMockAdapter();
      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([postgresConfig]);
    });

    it('should create and restore backups', async () => {
      const backupConfig: BackupConfig = {
        type: 'full',
        destination: './test-backups',
        compression: true,
        encryption: false,
        retention: {
          daily: 7,
          weekly: 4,
          monthly: 12,
          yearly: 5
        }
      };

      const backupResult = await dataManager.createBackup(backupConfig);
      expect(backupResult.success).toBe(true);
      expect(backupResult.backupId).toBeDefined();

      const restoreResult = await dataManager.restoreBackup(backupResult.backupId);
      expect(restoreResult.success).toBe(true);
    });

    it('should schedule automated backups', async () => {
      const backupConfig: BackupConfig = {
        type: 'incremental',
        destination: './test-backups',
        compression: true,
        encryption: true,
        retention: {
          daily: 7,
          weekly: 4,
          monthly: 12,
          yearly: 5
        },
        schedule: '0 2 * * *' // Daily at 2 AM
      };

      const scheduleId = await dataManager.setupBackups(backupConfig);
      expect(scheduleId).toBeDefined();
    });
  });

  describe('lifecycle management integration', () => {
    beforeEach(async () => {
      const mockAdapter = createMockAdapter();
      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([postgresConfig]);
    });

    it('should setup and execute lifecycle policies', async () => {
      const lifecycleConfig: DataLifecycleConfig = {
        retention: [
          {
            table: 'audit_logs',
            retentionDays: 90,
            action: 'delete'
          },
          {
            table: 'user_sessions',
            retentionDays: 30,
            action: 'delete'
          }
        ],
        archival: {
          enabled: true,
          destination: './test-archives',
          compression: true,
          encryption: false,
          rules: [
            {
              table: 'old_transactions',
              condition: 'created_at < NOW() - INTERVAL 1 YEAR',
              ageThreshold: 365,
              priority: 1
            }
          ]
        },
        cleanup: {
          enabled: true,
          schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
          batchSize: 1000,
          maxExecutionTime: 60
        }
      };

      await expect(dataManager.setupLifecycleManagement(lifecycleConfig)).resolves.not.toThrow();
      
      const lifecycleManager = dataManager.getLifecycleManager();
      const retentionResult = await lifecycleManager.executeRetentionPolicies();
      expect(retentionResult.success).toBe(true);
    });
  });

  describe('replication integration', () => {
    beforeEach(async () => {
      const mockAdapter = createMockAdapter();
      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([postgresConfig]);
    });

    it('should setup replication with multiple replicas', async () => {
      const replicationConfig: ReplicationConfig = {
        enabled: true,
        mode: 'async',
        replicas: [
          {
            ...postgresConfig,
            host: 'replica1.example.com'
          },
          {
            ...postgresConfig,
            host: 'replica2.example.com'
          }
        ],
        failoverTimeout: 30000,
        healthCheckInterval: 10000
      };

      await expect(dataManager.setupReplication(replicationConfig)).resolves.not.toThrow();
      
      const replicationManager = dataManager.getReplicationManager();
      const status = await replicationManager.getReplicationStatus();
      expect(status.replicas).toHaveLength(2);
    });

    it('should handle failover scenarios', async () => {
      const replicationConfig: ReplicationConfig = {
        enabled: true,
        mode: 'sync',
        replicas: [
          {
            ...postgresConfig,
            host: 'replica1.example.com'
          }
        ],
        failoverTimeout: 30000,
        healthCheckInterval: 10000
      };

      await dataManager.setupReplication(replicationConfig);
      
      const replicationManager = dataManager.getReplicationManager();
      await expect(dataManager.failover('replica1.example.com:5432')).resolves.not.toThrow();
    });
  });

  describe('system health and monitoring', () => {
    beforeEach(async () => {
      const mockAdapter = createMockAdapter();
      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([postgresConfig]);
    });

    it('should provide comprehensive system health status', async () => {
      const healthStatuses = await dataManager.getHealthStatus();
      expect(healthStatuses.size).toBeGreaterThan(0);
      
      for (const [adapterId, status] of healthStatuses) {
        expect(status.status).toMatch(/healthy|degraded|unhealthy/);
        expect(status.latency).toBeGreaterThanOrEqual(0);
        expect(status.connections).toBeDefined();
        expect(status.lastCheck).toBeInstanceOf(Date);
      }
    });

    it('should collect performance metrics', async () => {
      const metrics = await dataManager.getMetrics();
      expect(metrics.size).toBeGreaterThan(0);
      
      for (const [adapterId, metric] of metrics) {
        expect(metric.connections).toBeDefined();
        expect(metric.queries).toBeDefined();
        expect(metric.storage).toBeDefined();
        expect(metric.performance).toBeDefined();
      }
    });

    it('should validate overall system integrity', async () => {
      const validation = await dataManager.validateSystem();
      expect(validation.valid).toBeDefined();
      expect(validation.errors).toBeInstanceOf(Array);
      expect(validation.warnings).toBeInstanceOf(Array);
    });
  });

  describe('transaction management integration', () => {
    beforeEach(async () => {
      const mockAdapter = createMockAdapter();
      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([postgresConfig]);
    });

    it('should handle distributed transactions', async () => {
      const transactionManager = dataManager.getTransactionManager();
      
      const transaction = await transactionManager.begin('READ_COMMITTED');
      expect(transaction.id).toBeDefined();
      expect(transaction.status).toBe('active');
      
      await transactionManager.savepoint(transaction, 'checkpoint1');
      expect(transaction.savepoints).toContain('checkpoint1');
      
      await transactionManager.commit(transaction);
      expect(transaction.status).toBe('committed');
    });

    it('should handle transaction rollbacks', async () => {
      const transactionManager = dataManager.getTransactionManager();
      
      const transaction = await transactionManager.begin();
      await transactionManager.savepoint(transaction, 'checkpoint1');
      
      await transactionManager.rollbackToSavepoint(transaction, 'checkpoint1');
      expect(transaction.status).toBe('active');
      
      await transactionManager.rollback(transaction);
      expect(transaction.status).toBe('rolled_back');
    });
  });

  describe('error handling and recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      const failingAdapter = {
        ...createMockAdapter(),
        connect: vi.fn().mockRejectedValue(new Error('Connection refused'))
      };

      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(failingAdapter);

      await expect(dataManager.initialize([postgresConfig])).rejects.toThrow();
    });

    it('should recover from temporary database failures', async () => {
      const mockAdapter = createMockAdapter();
      
      // Simulate temporary failure then recovery
      mockAdapter.healthCheck
        .mockResolvedValueOnce({
          status: 'unhealthy',
          latency: -1,
          connections: { active: 0, idle: 0, total: 0 },
          lastCheck: new Date(),
          errors: ['Connection lost']
        })
        .mockResolvedValueOnce({
          status: 'healthy',
          latency: 10,
          connections: { active: 1, idle: 9, total: 10 },
          lastCheck: new Date()
        });

      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([postgresConfig]);

      const firstCheck = await dataManager.getHealthStatus();
      const firstStatus = firstCheck.values().next().value;
      expect(firstStatus.status).toBe('unhealthy');

      const secondCheck = await dataManager.getHealthStatus();
      const secondStatus = secondCheck.values().next().value;
      expect(secondStatus.status).toBe('healthy');
    });
  });
});

// Helper function to create mock database adapter
function createMockAdapter() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    query: vi.fn().mockResolvedValue([{ id: 1, name: 'test' }]),
    execute: vi.fn().mockResolvedValue(1),
    beginTransaction: vi.fn().mockResolvedValue('tx_123'),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi.fn().mockResolvedValue({
      status: 'healthy',
      latency: 10,
      connections: { active: 1, idle: 9, total: 10 },
      lastCheck: new Date()
    }),
    getMetrics: vi.fn().mockResolvedValue({
      connections: { active: 1, idle: 9, waiting: 0 },
      queries: { total: 100, successful: 95, failed: 5, averageLatency: 50 },
      storage: { size: 1000000, available: 5000000, used: 1000000 },
      performance: { cpu: 25, memory: 512000000, io: 1000 }
    })
  };
}