/**
 * Data Management and Persistence System
 * 
 * Provides comprehensive data management capabilities including:
 * - Multi-database support (PostgreSQL, MongoDB, Redis)
 * - Database migration and schema evolution
 * - Automated backup and recovery
 * - Transaction management with ACID compliance
 * - Data lifecycle management and archival
 */

export { DataManager } from './data-manager';
export { MigrationManager } from './migration-manager';
export { BackupManager } from './backup-manager';
export { TransactionManager } from './transaction-manager';
export { LifecycleManager } from './lifecycle-manager';

// Database implementations
export { PostgreSQLAdapter } from './adapters/postgresql-adapter';
export { MongoDBAdapter } from './adapters/mongodb-adapter';
export { RedisAdapter } from './adapters/redis-adapter';

// Types and interfaces
export * from './types';
export * from './interfaces';