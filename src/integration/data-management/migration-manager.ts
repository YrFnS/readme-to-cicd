/**
 * Database migration manager with schema evolution and rollback capabilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { 
  MigrationManager, 
  MigrationResult, 
  MigrationStatus, 
  MigrationInfo, 
  ValidationResult 
} from './interfaces';
import { MigrationConfig } from './types';

interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
  checksum: string;
}

export class MigrationManagerImpl implements MigrationManager {
  private config?: MigrationConfig;
  private migrations: Map<string, Migration> = new Map();
  private isInitialized = false;

  async initialize(config: MigrationConfig): Promise<void> {
    this.config = config;
    
    try {
      // Ensure migration directory exists
      await fs.mkdir(config.directory, { recursive: true });
      
      // Load all migrations from directory
      await this.loadMigrations();
      
      // Create migration tracking table if it doesn't exist
      await this.createMigrationTable();
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize migration manager: ${error.message}`);
    }
  }

  async migrate(targetVersion?: string): Promise<MigrationResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const migrationsExecuted: string[] = [];
    const errors: string[] = [];

    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const pendingMigrations = this.getPendingMigrations(appliedMigrations, targetVersion);

      if (pendingMigrations.length === 0) {
        return {
          success: true,
          migrationsExecuted: [],
          errors: [],
          duration: Date.now() - startTime,
          targetVersion: targetVersion || 'latest'
        };
      }

      // Sort migrations by version
      pendingMigrations.sort((a, b) => this.compareVersions(a.version, b.version));

      for (const migration of pendingMigrations) {
        try {
          await this.executeMigration(migration, 'up');
          await this.recordMigration(migration);
          migrationsExecuted.push(migration.version);
        } catch (error) {
          errors.push(`Migration ${migration.version} failed: ${error.message}`);
          break; // Stop on first error
        }
      }

      return {
        success: errors.length === 0,
        migrationsExecuted,
        errors,
        duration: Date.now() - startTime,
        targetVersion: targetVersion || 'latest'
      };
    } catch (error) {
      return {
        success: false,
        migrationsExecuted,
        errors: [error.message],
        duration: Date.now() - startTime,
        targetVersion: targetVersion || 'latest'
      };
    }
  }

  async rollback(targetVersion: string): Promise<MigrationResult> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const migrationsExecuted: string[] = [];
    const errors: string[] = [];

    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const migrationsToRollback = appliedMigrations
        .filter(m => this.compareVersions(m.version, targetVersion) > 0)
        .sort((a, b) => this.compareVersions(b.version, a.version)); // Reverse order for rollback

      for (const migrationInfo of migrationsToRollback) {
        const migration = this.migrations.get(migrationInfo.version);
        if (!migration) {
          errors.push(`Migration ${migrationInfo.version} not found for rollback`);
          continue;
        }

        try {
          await this.executeMigration(migration, 'down');
          await this.removeMigrationRecord(migration.version);
          migrationsExecuted.push(migration.version);
        } catch (error) {
          errors.push(`Rollback of ${migration.version} failed: ${error.message}`);
          break; // Stop on first error
        }
      }

      return {
        success: errors.length === 0,
        migrationsExecuted,
        errors,
        duration: Date.now() - startTime,
        targetVersion
      };
    } catch (error) {
      return {
        success: false,
        migrationsExecuted,
        errors: [error.message],
        duration: Date.now() - startTime,
        targetVersion
      };
    }
  }

  async getStatus(): Promise<MigrationStatus> {
    this.ensureInitialized();
    
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const allMigrations = Array.from(this.migrations.values());
      
      const currentVersion = appliedMigrations.length > 0 
        ? appliedMigrations[appliedMigrations.length - 1].version 
        : '0.0.0';
      
      const pendingMigrations = this.getPendingMigrations(appliedMigrations);
      
      return {
        currentVersion,
        pendingMigrations: pendingMigrations.map(m => m.version),
        appliedMigrations,
        isUpToDate: pendingMigrations.length === 0
      };
    } catch (error) {
      throw new Error(`Failed to get migration status: ${error.message}`);
    }
  }

  async validateMigrations(): Promise<ValidationResult> {
    this.ensureInitialized();
    
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate migration files exist and are readable
      for (const [version, migration] of this.migrations) {
        if (!migration.up) {
          errors.push(`Migration ${version} missing up script`);
        }
        if (!migration.down) {
          warnings.push(`Migration ${version} missing down script`);
        }
      }

      // Validate applied migrations match files
      if (this.config?.validateChecksums) {
        const appliedMigrations = await this.getAppliedMigrations();
        
        for (const applied of appliedMigrations) {
          const migration = this.migrations.get(applied.version);
          if (!migration) {
            errors.push(`Applied migration ${applied.version} not found in files`);
            continue;
          }
          
          if (migration.checksum !== applied.checksum) {
            errors.push(`Migration ${applied.version} checksum mismatch`);
          }
        }
      }

      // Check for version conflicts
      const versions = Array.from(this.migrations.keys());
      const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
      if (duplicates.length > 0) {
        errors.push(`Duplicate migration versions: ${duplicates.join(', ')}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
        warnings
      };
    }
  }

  async createMigration(name: string, type: 'up' | 'down'): Promise<string> {
    this.ensureInitialized();
    
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const version = `${timestamp}`;
    const filename = `${version}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filepath = path.join(this.config!.directory, filename);

    const template = type === 'up' 
      ? `-- Migration: ${name}\n-- Version: ${version}\n-- Type: UP\n\n-- Add your migration SQL here\n`
      : `-- Migration: ${name}\n-- Version: ${version}\n-- Type: DOWN\n\n-- Add your rollback SQL here\n`;

    try {
      await fs.writeFile(filepath, template, 'utf8');
      return filepath;
    } catch (error) {
      throw new Error(`Failed to create migration file: ${error.message}`);
    }
  }

  private async loadMigrations(): Promise<void> {
    if (!this.config) {
      throw new Error('Migration manager not initialized');
    }

    try {
      const files = await fs.readdir(this.config.directory);
      const migrationFiles = files.filter(f => f.endsWith('.sql'));

      for (const file of migrationFiles) {
        const filepath = path.join(this.config.directory, file);
        const content = await fs.readFile(filepath, 'utf8');
        
        const migration = this.parseMigrationFile(file, content);
        this.migrations.set(migration.version, migration);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist yet, that's okay
    }
  }

  private parseMigrationFile(filename: string, content: string): Migration {
    // Extract version from filename (assuming format: YYYYMMDDHHMMSS_name.sql)
    const versionMatch = filename.match(/^(\d{14})/);
    if (!versionMatch) {
      throw new Error(`Invalid migration filename format: ${filename}`);
    }

    const version = versionMatch[1];
    const name = filename.replace(/^\d{14}_/, '').replace(/\.sql$/, '');

    // Split content into up and down sections
    const sections = content.split(/-- ?(?:DOWN|ROLLBACK)/i);
    const up = sections[0].replace(/-- ?UP/i, '').trim();
    const down = sections[1]?.trim() || '';

    const checksum = crypto.createHash('md5').update(content).digest('hex');

    return {
      version,
      name,
      up,
      down,
      checksum
    };
  }

  private async createMigrationTable(): Promise<void> {
    // This would need to be implemented per database type
    // For now, we'll assume a generic SQL implementation
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config!.schemaName ? this.config!.schemaName + '.' : ''}${this.config!.tableName} (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(32) NOT NULL,
        execution_time INTEGER NOT NULL
      )
    `;

    // This would need access to a database adapter
    // For now, we'll just log what we would do
    console.log('Would create migration table with SQL:', createTableSQL);
  }

  private async getAppliedMigrations(): Promise<MigrationInfo[]> {
    // This would query the migration table
    // For now, return empty array
    return [];
  }

  private getPendingMigrations(appliedMigrations: MigrationInfo[], targetVersion?: string): Migration[] {
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    const allMigrations = Array.from(this.migrations.values());
    
    let pendingMigrations = allMigrations.filter(m => !appliedVersions.has(m.version));
    
    if (targetVersion) {
      pendingMigrations = pendingMigrations.filter(m => 
        this.compareVersions(m.version, targetVersion) <= 0
      );
    }
    
    return pendingMigrations;
  }

  private async executeMigration(migration: Migration, direction: 'up' | 'down'): Promise<void> {
    const sql = direction === 'up' ? migration.up : migration.down;
    
    if (!sql.trim()) {
      throw new Error(`No ${direction} script found for migration ${migration.version}`);
    }

    // This would execute the SQL using a database adapter
    // For now, we'll just log what we would do
    console.log(`Would execute ${direction} migration ${migration.version}:`, sql);
  }

  private async recordMigration(migration: Migration): Promise<void> {
    // This would insert a record into the migration table
    console.log(`Would record migration ${migration.version} as applied`);
  }

  private async removeMigrationRecord(version: string): Promise<void> {
    // This would delete the record from the migration table
    console.log(`Would remove migration record for version ${version}`);
  }

  private compareVersions(a: string, b: string): number {
    // Simple numeric comparison for timestamp-based versions
    return parseInt(a) - parseInt(b);
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error('Migration manager is not initialized');
    }
  }
}