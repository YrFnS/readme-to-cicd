/**
 * MongoDB database adapter implementation
 */

import { MongoClient, Db, ClientSession, MongoClientOptions } from 'mongodb';
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

export class MongoDBAdapter implements DatabaseAdapter {
  private client?: MongoClient;
  private db?: Db;
  private config?: DatabaseConfig;
  private sessions: Map<string, ClientSession> = new Map();
  private connected = false;

  async connect(config: DatabaseConfig): Promise<void> {
    try {
      this.config = config;
      
      const uri = this.buildConnectionUri(config);
      const options: MongoClientOptions = {
        maxPoolSize: config.poolSize || 20,
        serverSelectionTimeoutMS: config.timeout || 5000,
        socketTimeoutMS: config.timeout || 5000,
        connectTimeoutMS: config.timeout || 5000,
        ssl: config.ssl,
        retryWrites: true,
        retryReads: true
      };

      this.client = new MongoClient(uri, options);
      await this.client.connect();
      
      this.db = this.client.db(config.database);
      
      // Test connection
      await this.db.admin().ping();
      
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      // End all active sessions
      for (const [sessionId, session] of this.sessions) {
        try {
          await session.abortTransaction();
          await session.endSession();
        } catch (error) {
          console.error(`Failed to end session ${sessionId}:`, error);
        }
      }
      this.sessions.clear();
      
      await this.client.close();
      this.client = undefined;
      this.db = undefined;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.client && !!this.db;
  }

  async query<T = any>(sql: string, params?: any[], options?: QueryOptions): Promise<T[]> {
    if (!this.db) {
      throw new Error('MongoDB adapter is not connected');
    }

    try {
      // Parse MongoDB operation from SQL-like syntax
      const operation = this.parseOperation(sql, params);
      
      let session: ClientSession | undefined;
      if (options?.transaction) {
        session = this.sessions.get(options.transaction);
        if (!session) {
          throw new Error(`Transaction not found: ${options.transaction}`);
        }
      }

      const sessionOptions = session ? { session } : {};

      switch (operation.type) {
        case 'find':
          const collection = this.db.collection(operation.collection);
          const cursor = collection.find(operation.filter || {}, sessionOptions);
          
          if (operation.sort) {
            cursor.sort(operation.sort);
          }
          if (operation.limit) {
            cursor.limit(operation.limit);
          }
          if (operation.skip) {
            cursor.skip(operation.skip);
          }
          
          return await cursor.toArray() as T[];

        case 'aggregate':
          return await this.db.collection(operation.collection)
            .aggregate(operation.pipeline || [], sessionOptions)
            .toArray() as T[];

        default:
          throw new Error(`Unsupported query operation: ${operation.type}`);
      }
    } catch (error) {
      throw new Error(`MongoDB query failed: ${error.message}`);
    }
  }

  async execute(sql: string, params?: any[], options?: QueryOptions): Promise<number> {
    if (!this.db) {
      throw new Error('MongoDB adapter is not connected');
    }

    try {
      // Parse MongoDB operation from SQL-like syntax
      const operation = this.parseOperation(sql, params);
      
      let session: ClientSession | undefined;
      if (options?.transaction) {
        session = this.sessions.get(options.transaction);
        if (!session) {
          throw new Error(`Transaction not found: ${options.transaction}`);
        }
      }

      const sessionOptions = session ? { session } : {};

      switch (operation.type) {
        case 'insertOne':
          const insertResult = await this.db.collection(operation.collection)
            .insertOne(operation.document, sessionOptions);
          return insertResult.acknowledged ? 1 : 0;

        case 'insertMany':
          const insertManyResult = await this.db.collection(operation.collection)
            .insertMany(operation.documents, sessionOptions);
          return insertManyResult.insertedCount;

        case 'updateOne':
          const updateResult = await this.db.collection(operation.collection)
            .updateOne(operation.filter, operation.update, sessionOptions);
          return updateResult.modifiedCount;

        case 'updateMany':
          const updateManyResult = await this.db.collection(operation.collection)
            .updateMany(operation.filter, operation.update, sessionOptions);
          return updateManyResult.modifiedCount;

        case 'deleteOne':
          const deleteResult = await this.db.collection(operation.collection)
            .deleteOne(operation.filter, sessionOptions);
          return deleteResult.deletedCount;

        case 'deleteMany':
          const deleteManyResult = await this.db.collection(operation.collection)
            .deleteMany(operation.filter, sessionOptions);
          return deleteManyResult.deletedCount;

        default:
          throw new Error(`Unsupported execute operation: ${operation.type}`);
      }
    } catch (error) {
      throw new Error(`MongoDB execute failed: ${error.message}`);
    }
  }

  async beginTransaction(isolation?: TransactionIsolationLevel): Promise<string> {
    if (!this.client) {
      throw new Error('MongoDB adapter is not connected');
    }

    try {
      const session = this.client.startSession();
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // MongoDB doesn't support isolation levels like SQL databases
      // All transactions use snapshot isolation
      session.startTransaction({
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' }
      });
      
      this.sessions.set(transactionId, session);
      
      return transactionId;
    } catch (error) {
      throw new Error(`Failed to begin MongoDB transaction: ${error.message}`);
    }
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const session = this.sessions.get(transactionId);
    if (!session) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    try {
      await session.commitTransaction();
    } finally {
      await session.endSession();
      this.sessions.delete(transactionId);
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const session = this.sessions.get(transactionId);
    if (!session) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    try {
      await session.abortTransaction();
    } finally {
      await session.endSession();
      this.sessions.delete(transactionId);
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.db) {
        return {
          status: 'unhealthy',
          latency: -1,
          connections: { active: 0, idle: 0, total: 0 },
          lastCheck: new Date(),
          errors: ['Not connected']
        };
      }

      // Test ping
      await this.db.admin().ping();
      const latency = Date.now() - startTime;

      // Get server status for connection info
      const serverStatus = await this.db.admin().serverStatus();
      const connections = serverStatus.connections || {};

      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
        connections: {
          active: connections.current || 0,
          idle: (connections.available || 0) - (connections.current || 0),
          total: connections.available || 0
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
    if (!this.db) {
      throw new Error('MongoDB adapter is not connected');
    }

    try {
      const serverStatus = await this.db.admin().serverStatus();
      const dbStats = await this.db.stats();
      
      const connections = serverStatus.connections || {};
      const opcounters = serverStatus.opcounters || {};
      const mem = serverStatus.mem || {};

      return {
        connections: {
          active: connections.current || 0,
          idle: (connections.available || 0) - (connections.current || 0),
          waiting: 0 // MongoDB doesn't expose waiting connections
        },
        queries: {
          total: (opcounters.query || 0) + (opcounters.insert || 0) + (opcounters.update || 0) + (opcounters.delete || 0),
          successful: opcounters.query || 0,
          failed: 0, // Would need to track this separately
          averageLatency: 0 // Would need query timing for this
        },
        storage: {
          size: dbStats.dataSize || 0,
          available: dbStats.fsTotalSize || 0,
          used: dbStats.storageSize || 0
        },
        performance: {
          cpu: 0, // Would need system stats
          memory: (mem.resident || 0) * 1024 * 1024, // Convert MB to bytes
          io: 0 // Would need system stats
        }
      };
    } catch (error) {
      throw new Error(`Failed to get MongoDB metrics: ${error.message}`);
    }
  }

  private buildConnectionUri(config: DatabaseConfig): string {
    const protocol = config.ssl ? 'mongodb+srv' : 'mongodb';
    const auth = `${config.username}:${config.password}`;
    const host = `${config.host}:${config.port}`;
    
    return `${protocol}://${auth}@${host}/${config.database}`;
  }

  private parseOperation(sql: string, params?: any[]): any {
    // This is a simplified parser for demonstration
    // In a real implementation, you'd want a more robust SQL-to-MongoDB translator
    
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('select')) {
      return {
        type: 'find',
        collection: this.extractCollectionName(sql),
        filter: params?.[0] || {},
        sort: params?.[1],
        limit: params?.[2],
        skip: params?.[3]
      };
    } else if (sqlLower.startsWith('insert')) {
      return {
        type: 'insertOne',
        collection: this.extractCollectionName(sql),
        document: params?.[0] || {}
      };
    } else if (sqlLower.startsWith('update')) {
      return {
        type: 'updateOne',
        collection: this.extractCollectionName(sql),
        filter: params?.[0] || {},
        update: params?.[1] || {}
      };
    } else if (sqlLower.startsWith('delete')) {
      return {
        type: 'deleteOne',
        collection: this.extractCollectionName(sql),
        filter: params?.[0] || {}
      };
    }
    
    throw new Error(`Unsupported SQL operation: ${sql}`);
  }

  private extractCollectionName(sql: string): string {
    // Simple regex to extract table/collection name
    const match = sql.match(/(?:from|into|update)\s+(\w+)/i);
    return match?.[1] || 'default_collection';
  }
}