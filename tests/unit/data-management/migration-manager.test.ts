/**
 * Tests for MigrationManager class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { MigrationManagerImpl } from '../../../src/integration/data-management/migration-manager';
import { MigrationConfig } from '../../../src/integration/data-management/types';

// Mock fs module
vi.mock('fs/promises');

describe('MigrationManagerImpl', () => {
  let migrationManager: MigrationManagerImpl;
  let mockConfig: MigrationConfig;

  beforeEach(() => {
    migrationManager = new MigrationManagerImpl();
    mockConfig = {
      directory: './migrations',
      tableName: 'schema_migrations',
      schemaName: 'public',
      validateChecksums: true,
      allowOutOfOrder: false
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with valid configuration', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      await expect(migrationManager.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should create migration directory if it does not exist', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      await migrationManager.initialize(mockConfig);

      expect(fs.mkdir).toHaveBeenCalledWith('./migrations', { recursive: true });
    });

    it('should load existing migrations from directory', async () => {
      const migrationFiles = [
        '20240101120000_create_users.sql',
        '20240102120000_add_email_index.sql'
      ];

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue(migrationFiles);
      vi.mocked(fs.readFile).mockImplementation((filepath) => {
        if (filepath.toString().includes('create_users')) {
          return Promise.resolve(`-- Migration: Create Users
-- Version: 20240101120000
-- Type: UP

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- DOWN
DROP TABLE users;`);
        }
        return Promise.resolve('-- Empty migration');
      });

      await migrationManager.initialize(mockConfig);

      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('migration execution', () => {
    beforeEach(async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);
      await migrationManager.initialize(mockConfig);
    });

    it('should return success when no pending migrations', async () => {
      // Mock getAppliedMigrations to return empty array
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue([]);

      const result = await migrationManager.migrate();

      expect(result.success).toBe(true);
      expect(result.migrationsExecuted).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should execute pending migrations in order', async () => {
      // Mock migrations
      const migrations = new Map([
        ['20240101120000', {
          version: '20240101120000',
          name: 'create_users',
          up: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          down: 'DROP TABLE users;',
          checksum: 'abc123'
        }],
        ['20240102120000', {
          version: '20240102120000',
          name: 'add_email_index',
          up: 'CREATE INDEX idx_email ON users(email);',
          down: 'DROP INDEX idx_email;',
          checksum: 'def456'
        }]
      ]);

      (migrationManager as any).migrations = migrations;

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue([]);
      vi.spyOn(migrationManager as any, 'executeMigration').mockResolvedValue(undefined);
      vi.spyOn(migrationManager as any, 'recordMigration').mockResolvedValue(undefined);

      const result = await migrationManager.migrate();

      expect(result.success).toBe(true);
      expect(result.migrationsExecuted).toEqual(['20240101120000', '20240102120000']);
      expect(result.errors).toHaveLength(0);
    });

    it('should stop on first migration error', async () => {
      const migrations = new Map([
        ['20240101120000', {
          version: '20240101120000',
          name: 'create_users',
          up: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          down: 'DROP TABLE users;',
          checksum: 'abc123'
        }],
        ['20240102120000', {
          version: '20240102120000',
          name: 'add_email_index',
          up: 'CREATE INDEX idx_email ON users(email);',
          down: 'DROP INDEX idx_email;',
          checksum: 'def456'
        }]
      ]);

      (migrationManager as any).migrations = migrations;

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue([]);
      vi.spyOn(migrationManager as any, 'executeMigration')
        .mockResolvedValueOnce(undefined) // First migration succeeds
        .mockRejectedValueOnce(new Error('SQL syntax error')); // Second migration fails
      vi.spyOn(migrationManager as any, 'recordMigration').mockResolvedValue(undefined);

      const result = await migrationManager.migrate();

      expect(result.success).toBe(false);
      expect(result.migrationsExecuted).toEqual(['20240101120000']);
      expect(result.errors).toContain('Migration 20240102120000 failed: SQL syntax error');
    });
  });

  describe('rollback', () => {
    beforeEach(async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);
      await migrationManager.initialize(mockConfig);
    });

    it('should rollback migrations to target version', async () => {
      const appliedMigrations = [
        {
          version: '20240101120000',
          name: 'create_users',
          appliedAt: new Date(),
          checksum: 'abc123',
          executionTime: 100
        },
        {
          version: '20240102120000',
          name: 'add_email_index',
          appliedAt: new Date(),
          checksum: 'def456',
          executionTime: 50
        }
      ];

      const migrations = new Map([
        ['20240101120000', {
          version: '20240101120000',
          name: 'create_users',
          up: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          down: 'DROP TABLE users;',
          checksum: 'abc123'
        }],
        ['20240102120000', {
          version: '20240102120000',
          name: 'add_email_index',
          up: 'CREATE INDEX idx_email ON users(email);',
          down: 'DROP INDEX idx_email;',
          checksum: 'def456'
        }]
      ]);

      (migrationManager as any).migrations = migrations;

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue(appliedMigrations);
      vi.spyOn(migrationManager as any, 'executeMigration').mockResolvedValue(undefined);
      vi.spyOn(migrationManager as any, 'removeMigrationRecord').mockResolvedValue(undefined);

      const result = await migrationManager.rollback('20240101120000');

      expect(result.success).toBe(true);
      expect(result.migrationsExecuted).toEqual(['20240102120000']);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing migration for rollback', async () => {
      const appliedMigrations = [
        {
          version: '20240101120000',
          name: 'create_users',
          appliedAt: new Date(),
          checksum: 'abc123',
          executionTime: 100
        }
      ];

      // Empty migrations map - migration file not found
      (migrationManager as any).migrations = new Map();

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue(appliedMigrations);

      const result = await migrationManager.rollback('20240100000000');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Migration 20240101120000 not found for rollback');
    });
  });

  describe('status', () => {
    beforeEach(async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);
      await migrationManager.initialize(mockConfig);
    });

    it('should return current migration status', async () => {
      const appliedMigrations = [
        {
          version: '20240101120000',
          name: 'create_users',
          appliedAt: new Date(),
          checksum: 'abc123',
          executionTime: 100
        }
      ];

      const migrations = new Map([
        ['20240101120000', {
          version: '20240101120000',
          name: 'create_users',
          up: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          down: 'DROP TABLE users;',
          checksum: 'abc123'
        }],
        ['20240102120000', {
          version: '20240102120000',
          name: 'add_email_index',
          up: 'CREATE INDEX idx_email ON users(email);',
          down: 'DROP INDEX idx_email;',
          checksum: 'def456'
        }]
      ]);

      (migrationManager as any).migrations = migrations;

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue(appliedMigrations);

      const status = await migrationManager.getStatus();

      expect(status.currentVersion).toBe('20240101120000');
      expect(status.pendingMigrations).toEqual(['20240102120000']);
      expect(status.appliedMigrations).toEqual(appliedMigrations);
      expect(status.isUpToDate).toBe(false);
    });

    it('should indicate up-to-date when no pending migrations', async () => {
      const appliedMigrations = [
        {
          version: '20240101120000',
          name: 'create_users',
          appliedAt: new Date(),
          checksum: 'abc123',
          executionTime: 100
        }
      ];

      const migrations = new Map([
        ['20240101120000', {
          version: '20240101120000',
          name: 'create_users',
          up: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          down: 'DROP TABLE users;',
          checksum: 'abc123'
        }]
      ]);

      (migrationManager as any).migrations = migrations;

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue(appliedMigrations);

      const status = await migrationManager.getStatus();

      expect(status.isUpToDate).toBe(true);
      expect(status.pendingMigrations).toHaveLength(0);
    });
  });

  describe('validation', () => {
    beforeEach(async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);
      await migrationManager.initialize(mockConfig);
    });

    it('should validate migration files', async () => {
      const migrations = new Map([
        ['20240101120000', {
          version: '20240101120000',
          name: 'create_users',
          up: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          down: 'DROP TABLE users;',
          checksum: 'abc123'
        }]
      ]);

      (migrationManager as any).migrations = migrations;

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue([]);

      const validation = await migrationManager.validateMigrations();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing up scripts', async () => {
      const migrations = new Map([
        ['20240101120000', {
          version: '20240101120000',
          name: 'create_users',
          up: '', // Missing up script
          down: 'DROP TABLE users;',
          checksum: 'abc123'
        }]
      ]);

      (migrationManager as any).migrations = migrations;

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue([]);

      const validation = await migrationManager.validateMigrations();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Migration 20240101120000 missing up script');
    });

    it('should detect checksum mismatches when validation enabled', async () => {
      const appliedMigrations = [
        {
          version: '20240101120000',
          name: 'create_users',
          appliedAt: new Date(),
          checksum: 'different_checksum',
          executionTime: 100
        }
      ];

      const migrations = new Map([
        ['20240101120000', {
          version: '20240101120000',
          name: 'create_users',
          up: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          down: 'DROP TABLE users;',
          checksum: 'abc123'
        }]
      ]);

      (migrationManager as any).migrations = migrations;

      // Mock methods
      vi.spyOn(migrationManager as any, 'getAppliedMigrations').mockResolvedValue(appliedMigrations);

      const validation = await migrationManager.validateMigrations();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Migration 20240101120000 checksum mismatch');
    });
  });

  describe('migration creation', () => {
    beforeEach(async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);
      await migrationManager.initialize(mockConfig);
    });

    it('should create new migration file', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const filepath = await migrationManager.createMigration('create users table', 'up');

      expect(filepath).toMatch(/migrations\/\d{14}_create_users_table\.sql$/);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.sql$/),
        expect.stringContaining('-- Migration: create users table'),
        'utf8'
      );
    });

    it('should create down migration template', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await migrationManager.createMigration('drop users table', 'down');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('-- Type: DOWN'),
        'utf8'
      );
    });
  });
});