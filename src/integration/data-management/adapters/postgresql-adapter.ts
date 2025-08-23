/**
 * PostgreSQL database adapter implementation
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { 
  DatabaseAdapter, 
  HealthStatus, 
  DatabaseMetrics 
} from '../interfaces';
import { 
  DatabaseConfig, 
  QueryOptions, 
  TransactionIsolationLevel 
} from '../types';

export class PostgreSQLAdapter implements DatabaseAdapter {
  private pool?: Pool;
  private config?: DatabaseConfig;
  private transactions: Map<string, PoolClient> = new Map();
  private connected = false;

  async connect(config: DatabaseConfig): Promise<void> {
    try {
      this.config = config;
      
      const poolConfig: PoolConfig = {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl,
        max: config.poolSize || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: config.timeout || 5000,
      };

      this.pool = new Pool(poolConfig);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      // Close all active transactions
      for (const [transactionId, client] of this.transactions) {
        try {
          await client.query('ROLLBACK');
          client.release();
        } catch (error) {
          console.error(`Failed to rollback transaction ${transactionId}:`, error);
        }
      }
      this.transactions.clear();
      
      await this.pool.end();
      this.pool = undefined;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.pool;
  }

  async query<T = any>(sql: string, params?: any[], options?: QueryOptions): Promise<T[]> {
    if (!this.pool) {
      throw new Error('PostgreSQL adapter is not connected');
    }

    try {
      let client: PoolClient;
      let shouldRelease = true;

      // Use existing transaction client if specified
      if (options?.transaction) {
        const transactionClient = this.transactions.get(options.transaction);
        if (!transactionClient) {
          throw new Error(`Transaction not found: ${options.transaction}`);
        }
        client = transactionClient;
        shouldRelease = false;
      } else {
        client = await this.pool.connect();
      }

      try {
        // Set transaction isolation level if specified
        if (options?.isolation && !options?.transaction) {
          await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolation}`);
        }

        const result = await client.query(sql, params);
        return result.rows as T[];
      } finally {
        if (shouldRelease) {
          client.release();
        }
      }
    } catch (error) {
      throw new Error(`PostgreSQL query failed: ${error.message}`);
    }
  }

  async execute(sql: string, params?: any[], options?: QueryOptions): Promise<number> {
    if (!this.pool) {
      throw new Error('PostgreSQL adapter is not connected');
    }

    try {
      let client: PoolClient;
      let shouldRelease = true;

      // Use existing transaction client if specified
      if (options?.transaction) {
        const transactionClient = this.transactions.get(options.transaction);
        if (!transactionClient) {
          throw new Error(`Transaction not found: ${options.transaction}`);
        }
        client = transactionClient;
        shouldRelease = false;
      } else {
        client = await this.pool.connect();
      }

      try {
        // Set transaction isolation level if specified
        if (options?.isolation && !options?.transaction) {
          await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolation}`);
        }

        const result = await client.query(sql, params);
        return result.rowCount || 0;
      } finally {
        if (shouldRelease) {
          client.release();
        }
      }
    } catch (error) {
      throw new Error(`PostgreSQL execute failed: ${error.message}`);
    }
  }

  async beginTransaction(isolation?: TransactionIsolationLevel): Promise<string> {
    if (!this.pool) {
      throw new Error('PostgreSQL adapter is not connected');
    }

    try {
      const client = await this.pool.connect();
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let beginSql = 'BEGIN';
      if (isolation) {
        beginSql += ` ISOLATION LEVEL ${isolation}`;
      }
      
      await client.query(beginSql);
      this.transactions.set(transactionId, client);
      
      return transactionId;
    } catch (error) {
      throw new Error(`Failed to begin PostgreSQL transaction: ${error.message}`);
    }
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const client = this.transactions.get(transactionId);
    if (!client) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    try {
      await client.query('COMMIT');
    } finally {
      client.release();
      this.transactions.delete(transactionId);
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const client = this.transactions.get(transactionId);
    if (!client) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
      this.transactions.delete(transactionId);
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.pool) {
        return {
          status: 'unhealthy',
          latency: -1,
          connections: { active: 0, idle: 0, total: 0 },
          lastCheck: new Date(),
          errors: ['Not connected']
        };
      }

      // Test query
      await this.query('SELECT 1');
      const latency = Date.now() - startTime;

      // Get connection pool stats
      const totalCount = this.pool.totalCount;
      const idleCount = this.pool.idleCount;
      const waitingCount = this.pool.waitingCount;

      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
        connections: {
          active: totalCount - idleCount,
          idle: idleCount,
          total: totalCount
        },
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        connections: { active: 0, idle: 0, total: 0 },
        lastCheck: new Date(),
        errors: [error.message]
      };
    }
  }

  async getMetrics(): Promise<DatabaseMetrics> {
    if (!this.pool) {
      throw new Error('PostgreSQL adapter is not connected');
    }

    try {
      // Get database size and statistics
      const sizeResult = await this.query(`
        SELECT 
          pg_database_size(current_database()) as size,
          (SELECT setting::bigint FROM pg_settings WHERE name = 'shared_buffers') * 8192 as buffer_size
      `);

      const statsResult = await this.query(`
        SELECT 
          numbackends as active_connections,
          xact_commit as committed_transactions,
          xact_rollback as rolled_back_transactions,
          blks_read,
          blks_hit,
          tup_returned,
          tup_fetched,
          tup_inserted,
          tup_updated,
          tup_deleted
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);

      const connectionStats = statsResult[0] || {};
      const sizeStats = sizeResult[0] || {};

      return {
        connections: {
          active: this.pool.totalCount - this.pool.idleCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        },
        queries: {
          total: (connectionStats.committed_transactions || 0) + (connectionStats.rolled_back_transactions || 0),
          successful: connectionStats.committed_transactions || 0,
          failed: connectionStats.rolled_back_transactions || 0,
          averageLatency: 0 // Would need query timing for this
        },
        storage: {
          size: sizeStats.size || 0,
          available: 0, // Would need filesystem stats
          used: sizeStats.size || 0
        },
        performance: {
          cpu: 0, // Would need system stats
          memory: sizeStats.buffer_size || 0,
          io: (connectionStats.blks_read || 0) + (connectionStats.blks_hit || 0)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get PostgreSQL metrics: ${error.message}`);
    }
  }
}