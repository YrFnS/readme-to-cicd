/**
 * Redis database adapter implementation
 */

import { createClient, RedisClientType, RedisModules, RedisFunctions, RedisScripts } from 'redis';
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

type RedisClient = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

export class RedisAdapter implements DatabaseAdapter {
  private client?: RedisClient;
  private config?: DatabaseConfig;
  private transactions: Map<string, RedisClient> = new Map();
  private connected = false;

  async connect(config: DatabaseConfig): Promise<void> {
    try {
      this.config = config;
      
      const redisUrl = `redis://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: config.timeout || 5000,
          commandTimeout: config.timeout || 5000,
          tls: config.ssl
        },
        database: parseInt(config.database) || 0
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      // Close all transaction clients
      for (const [transactionId, transactionClient] of this.transactions) {
        try {
          await transactionClient.discard();
          await transactionClient.disconnect();
        } catch (error) {
          console.error(`Failed to close transaction ${transactionId}:`, error);
        }
      }
      this.transactions.clear();
      
      await this.client.disconnect();
      this.client = undefined;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.client && this.client.isOpen;
  }

  async query<T = any>(sql: string, params?: any[], options?: QueryOptions): Promise<T[]> {
    if (!this.client) {
      throw new Error('Redis adapter is not connected');
    }

    try {
      // Parse Redis operation from SQL-like syntax
      const operation = this.parseOperation(sql, params);
      
      let client: RedisClient = this.client;
      if (options?.transaction) {
        const transactionClient = this.transactions.get(options.transaction);
        if (!transactionClient) {
          throw new Error(`Transaction not found: ${options.transaction}`);
        }
        client = transactionClient;
      }

      let result: any;

      switch (operation.type) {
        case 'get':
          result = await client.get(operation.key);
          return result ? [JSON.parse(result)] : [];

        case 'mget':
          const values = await client.mGet(operation.keys);
          return values.filter(v => v !== null).map(v => JSON.parse(v!)) as T[];

        case 'hget':
          result = await client.hGet(operation.key, operation.field);
          return result ? [JSON.parse(result)] : [];

        case 'hgetall':
          const hash = await client.hGetAll(operation.key);
          const parsedHash: any = {};
          for (const [field, value] of Object.entries(hash)) {
            try {
              parsedHash[field] = JSON.parse(value);
            } catch {
              parsedHash[field] = value;
            }
          }
          return [parsedHash];

        case 'lrange':
          const listItems = await client.lRange(operation.key, operation.start || 0, operation.stop || -1);
          return listItems.map(item => {
            try {
              return JSON.parse(item);
            } catch {
              return item;
            }
          }) as T[];

        case 'smembers':
          const setMembers = await client.sMembers(operation.key);
          return setMembers.map(member => {
            try {
              return JSON.parse(member);
            } catch {
              return member;
            }
          }) as T[];

        case 'zrange':
          const sortedSetMembers = await client.zRange(operation.key, operation.start || 0, operation.stop || -1);
          return sortedSetMembers.map(member => {
            try {
              return JSON.parse(member);
            } catch {
              return member;
            }
          }) as T[];

        case 'keys':
          const keys = await client.keys(operation.pattern || '*');
          return keys as T[];

        case 'scan':
          const scanResult = await client.scan(operation.cursor || 0, {
            MATCH: operation.pattern,
            COUNT: operation.count
          });
          return [{ cursor: scanResult.cursor, keys: scanResult.keys }] as T[];

        default:
          throw new Error(`Unsupported query operation: ${operation.type}`);
      }
    } catch (error) {
      throw new Error(`Redis query failed: ${error.message}`);
    }
  }

  async execute(sql: string, params?: any[], options?: QueryOptions): Promise<number> {
    if (!this.client) {
      throw new Error('Redis adapter is not connected');
    }

    try {
      // Parse Redis operation from SQL-like syntax
      const operation = this.parseOperation(sql, params);
      
      let client: RedisClient = this.client;
      if (options?.transaction) {
        const transactionClient = this.transactions.get(options.transaction);
        if (!transactionClient) {
          throw new Error(`Transaction not found: ${options.transaction}`);
        }
        client = transactionClient;
      }

      switch (operation.type) {
        case 'set':
          const setOptions: any = {};
          if (operation.ttl) {
            setOptions.EX = operation.ttl;
          }
          await client.set(operation.key, JSON.stringify(operation.value), setOptions);
          return 1;

        case 'mset':
          await client.mSet(operation.keyValues);
          return operation.keyValues.length / 2;

        case 'hset':
          const hsetResult = await client.hSet(operation.key, operation.field, JSON.stringify(operation.value));
          return hsetResult;

        case 'hmset':
          await client.hSet(operation.key, operation.hash);
          return Object.keys(operation.hash).length;

        case 'lpush':
          const lpushResult = await client.lPush(operation.key, operation.values.map(v => JSON.stringify(v)));
          return lpushResult;

        case 'rpush':
          const rpushResult = await client.rPush(operation.key, operation.values.map(v => JSON.stringify(v)));
          return rpushResult;

        case 'sadd':
          const saddResult = await client.sAdd(operation.key, operation.members.map(m => JSON.stringify(m)));
          return saddResult;

        case 'zadd':
          const zaddArgs: Array<{ score: number; value: string }> = operation.members.map((member: any) => ({
            score: member.score,
            value: JSON.stringify(member.value)
          }));
          const zaddResult = await client.zAdd(operation.key, zaddArgs);
          return zaddResult;

        case 'del':
          const delResult = await client.del(operation.keys);
          return delResult;

        case 'expire':
          const expireResult = await client.expire(operation.key, operation.seconds);
          return expireResult ? 1 : 0;

        case 'incr':
          const incrResult = await client.incr(operation.key);
          return incrResult;

        case 'decr':
          const decrResult = await client.decr(operation.key);
          return decrResult;

        default:
          throw new Error(`Unsupported execute operation: ${operation.type}`);
      }
    } catch (error) {
      throw new Error(`Redis execute failed: ${error.message}`);
    }
  }

  async beginTransaction(isolation?: TransactionIsolationLevel): Promise<string> {
    if (!this.client) {
      throw new Error('Redis adapter is not connected');
    }

    try {
      // Redis doesn't support traditional ACID transactions with isolation levels
      // Instead, it uses MULTI/EXEC for atomic operations
      const transactionClient = this.client.duplicate();
      await transactionClient.connect();
      
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await transactionClient.multi();
      this.transactions.set(transactionId, transactionClient);
      
      return transactionId;
    } catch (error) {
      throw new Error(`Failed to begin Redis transaction: ${error.message}`);
    }
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const transactionClient = this.transactions.get(transactionId);
    if (!transactionClient) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    try {
      await transactionClient.exec();
    } finally {
      await transactionClient.disconnect();
      this.transactions.delete(transactionId);
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const transactionClient = this.transactions.get(transactionId);
    if (!transactionClient) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    try {
      await transactionClient.discard();
    } finally {
      await transactionClient.disconnect();
      this.transactions.delete(transactionId);
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.client || !this.client.isOpen) {
        return {
          status: 'unhealthy',
          latency: -1,
          connections: { active: 0, idle: 0, total: 0 },
          lastCheck: new Date(),
          errors: ['Not connected']
        };
      }

      // Test ping
      await this.client.ping();
      const latency = Date.now() - startTime;

      // Get Redis info
      const info = await this.client.info('clients');
      const clientsInfo = this.parseRedisInfo(info);

      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
        connections: {
          active: parseInt(clientsInfo.connected_clients || '0'),
          idle: parseInt(clientsInfo.blocked_clients || '0'),
          total: parseInt(clientsInfo.connected_clients || '0')
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
    if (!this.client) {
      throw new Error('Redis adapter is not connected');
    }

    try {
      const [clientsInfo, memoryInfo, statsInfo] = await Promise.all([
        this.client.info('clients'),
        this.client.info('memory'),
        this.client.info('stats')
      ]);

      const clients = this.parseRedisInfo(clientsInfo);
      const memory = this.parseRedisInfo(memoryInfo);
      const stats = this.parseRedisInfo(statsInfo);

      return {
        connections: {
          active: parseInt(clients.connected_clients || '0'),
          idle: parseInt(clients.blocked_clients || '0'),
          waiting: 0
        },
        queries: {
          total: parseInt(stats.total_commands_processed || '0'),
          successful: parseInt(stats.total_commands_processed || '0'),
          failed: parseInt(stats.rejected_connections || '0'),
          averageLatency: 0 // Redis doesn't provide this directly
        },
        storage: {
          size: parseInt(memory.used_memory || '0'),
          available: parseInt(memory.maxmemory || '0') || Number.MAX_SAFE_INTEGER,
          used: parseInt(memory.used_memory || '0')
        },
        performance: {
          cpu: parseFloat(stats.used_cpu_sys || '0') + parseFloat(stats.used_cpu_user || '0'),
          memory: parseInt(memory.used_memory || '0'),
          io: parseInt(stats.total_net_input_bytes || '0') + parseInt(stats.total_net_output_bytes || '0')
        }
      };
    } catch (error) {
      throw new Error(`Failed to get Redis metrics: ${error.message}`);
    }
  }

  private parseOperation(sql: string, params?: any[]): any {
    // This is a simplified parser for demonstration
    // In a real implementation, you'd want a more robust SQL-to-Redis translator
    
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('get ')) {
      return {
        type: 'get',
        key: params?.[0] || sql.split(' ')[1]
      };
    } else if (sqlLower.startsWith('set ')) {
      return {
        type: 'set',
        key: params?.[0] || sql.split(' ')[1],
        value: params?.[1],
        ttl: params?.[2]
      };
    } else if (sqlLower.startsWith('hget ')) {
      return {
        type: 'hget',
        key: params?.[0] || sql.split(' ')[1],
        field: params?.[1] || sql.split(' ')[2]
      };
    } else if (sqlLower.startsWith('hset ')) {
      return {
        type: 'hset',
        key: params?.[0] || sql.split(' ')[1],
        field: params?.[1] || sql.split(' ')[2],
        value: params?.[2]
      };
    } else if (sqlLower.startsWith('del ')) {
      return {
        type: 'del',
        keys: params || [sql.split(' ')[1]]
      };
    } else if (sqlLower.startsWith('keys ')) {
      return {
        type: 'keys',
        pattern: params?.[0] || sql.split(' ')[1] || '*'
      };
    }
    
    throw new Error(`Unsupported Redis operation: ${sql}`);
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }
    
    return result;
  }
}