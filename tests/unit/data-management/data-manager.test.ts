/**
 * Tests for DataManager class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataManager } from '../../../src/integration/data-management/data-manager';
import { DatabaseConfig, DatabaseType } from '../../../src/integration/data-management/types';

describe('DataManager', () => {
  let dataManager: DataManager;
  let mockConfig: DatabaseConfig;

  beforeEach(() => {
    dataManager = new DataManager();
    mockConfig = {
      type: 'postgresql' as DatabaseType,
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_pass',
      ssl: false,
      poolSize: 10,
      timeout: 5000
    };
  });

  afterEach(async () => {
    await dataManager.shutdown();
  });

  describe('initialization', () => {
    it('should initialize with valid database configurations', async () => {
      // Mock the adapter connection
      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue(0),
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
      });

      await expect(dataManager.initialize([mockConfig])).resolves.not.toThrow();
    });

    it('should throw error when initializing without configurations', async () => {
      await expect(dataManager.initialize([])).rejects.toThrow('No primary database adapter configured');
    });

    it('should throw error when already initialized', async () => {
      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue({
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true)
      });

      await dataManager.initialize([mockConfig]);
      await expect(dataManager.initialize([mockConfig])).rejects.toThrow('DataManager is already initialized');
    });
  });

  describe('database operations', () => {
    beforeEach(async () => {
      const mockAdapter = {
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

      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([mockConfig]);
    });

    it('should execute queries on primary database', async () => {
      const result = await dataManager.query('SELECT * FROM users');
      expect(result).toEqual([{ id: 1, name: 'test' }]);
    });

    it('should execute commands on primary database', async () => {
      const result = await dataManager.execute('INSERT INTO users (name) VALUES (?)', ['John']);
      expect(result).toBe(1);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedManager = new DataManager();
      await expect(uninitializedManager.query('SELECT 1')).rejects.toThrow('DataManager is not initialized');
    });
  });

  describe('health monitoring', () => {
    beforeEach(async () => {
      const mockAdapter = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue(0),
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

      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([mockConfig]);
    });

    it('should return health status for all databases', async () => {
      const healthStatuses = await dataManager.getHealthStatus();
      expect(healthStatuses.size).toBe(1);
      
      const status = healthStatuses.values().next().value;
      expect(status.status).toBe('healthy');
      expect(status.latency).toBe(10);
    });

    it('should return metrics for all databases', async () => {
      const metrics = await dataManager.getMetrics();
      expect(metrics.size).toBe(1);
      
      const metric = metrics.values().next().value;
      expect(metric.connections.active).toBe(1);
      expect(metric.queries.total).toBe(100);
    });
  });

  describe('system validation', () => {
    it('should validate system integrity', async () => {
      const mockAdapter = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue(0),
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

      // Mock managers
      const mockMigrationManager = {
        getStatus: vi.fn().mockResolvedValue({
          currentVersion: '1.0.0',
          pendingMigrations: [],
          appliedMigrations: [],
          isUpToDate: true
        })
      };

      const mockReplicationManager = {
        getReplicationStatus: vi.fn().mockResolvedValue({
          primary: 'primary',
          replicas: [],
          syncLag: 0,
          lastSync: new Date(),
          status: 'healthy'
        })
      };

      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      vi.spyOn(dataManager, 'getMigrationManager').mockReturnValue(mockMigrationManager as any);
      vi.spyOn(dataManager, 'getReplicationManager').mockReturnValue(mockReplicationManager as any);

      await dataManager.initialize([mockConfig]);
      
      const validation = await dataManager.validateSystem();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect unhealthy databases', async () => {
      const mockAdapter = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue(0),
        beginTransaction: vi.fn().mockResolvedValue('tx_123'),
        commitTransaction: vi.fn().mockResolvedValue(undefined),
        rollbackTransaction: vi.fn().mockResolvedValue(undefined),
        healthCheck: vi.fn().mockResolvedValue({
          status: 'unhealthy',
          latency: -1,
          connections: { active: 0, idle: 0, total: 0 },
          lastCheck: new Date(),
          errors: ['Connection failed']
        }),
        getMetrics: vi.fn().mockResolvedValue({
          connections: { active: 0, idle: 0, waiting: 0 },
          queries: { total: 0, successful: 0, failed: 0, averageLatency: 0 },
          storage: { size: 0, available: 0, used: 0 },
          performance: { cpu: 0, memory: 0, io: 0 }
        })
      };

      // Mock managers
      const mockMigrationManager = {
        getStatus: vi.fn().mockResolvedValue({
          currentVersion: '1.0.0',
          pendingMigrations: [],
          appliedMigrations: [],
          isUpToDate: true
        })
      };

      const mockReplicationManager = {
        getReplicationStatus: vi.fn().mockResolvedValue({
          primary: 'primary',
          replicas: [],
          syncLag: 0,
          lastSync: new Date(),
          status: 'healthy'
        })
      };

      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      vi.spyOn(dataManager, 'getMigrationManager').mockReturnValue(mockMigrationManager as any);
      vi.spyOn(dataManager, 'getReplicationManager').mockReturnValue(mockReplicationManager as any);

      await dataManager.initialize([mockConfig]);
      
      const validation = await dataManager.validateSystem();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('is unhealthy'));
    });
  });

  describe('database management', () => {
    beforeEach(async () => {
      const mockAdapter = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue(0),
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

      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([mockConfig]);
    });

    it('should add new database connection', async () => {
      const newConfig: DatabaseConfig = {
        ...mockConfig,
        host: 'localhost2',
        database: 'test_db2'
      };

      const adapterId = await dataManager.addDatabase(newConfig);
      expect(adapterId).toContain('postgresql-localhost2-test_db2');
    });

    it('should remove database connection', async () => {
      const newConfig: DatabaseConfig = {
        ...mockConfig,
        host: 'localhost2',
        database: 'test_db2'
      };

      const adapterId = await dataManager.addDatabase(newConfig);
      await expect(dataManager.removeDatabase(adapterId)).resolves.not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('should gracefully shutdown all connections', async () => {
      const mockAdapter = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue(0),
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

      vi.spyOn(dataManager as any, 'createAdapter').mockReturnValue(mockAdapter);
      await dataManager.initialize([mockConfig]);
      
      await expect(dataManager.shutdown()).resolves.not.toThrow();
      expect(mockAdapter.disconnect).toHaveBeenCalled();
    });
  });
});