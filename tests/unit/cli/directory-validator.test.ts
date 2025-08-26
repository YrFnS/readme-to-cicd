/**
 * Directory Validator Unit Tests
 * 
 * Comprehensive tests for directory validation functionality.
 * Tests directory access, permission validation, and warning detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs, constants as fsConstants } from 'fs';
import * as path from 'path';
import { DirectoryValidator, ValidationResult, validateOutputDirectory } from '../../../src/cli/directory-validator';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn()
  },
  constants: {
    W_OK: 2
  }
}));

// Mock path module
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    resolve: vi.fn((dir: string) => `/resolved${dir}`)
  };
});

describe('DirectoryValidator', () => {
  let validator: DirectoryValidator;
  const mockFs = fs as any;
  const mockPath = path as any;

  beforeEach(() => {
    validator = new DirectoryValidator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('validateOutputDirectory', () => {
    it('should return valid result for accessible, writable, empty directory', async () => {
      // Arrange
      const testDir = '/test/directory';
      mockPath.resolve.mockReturnValue('/resolved/test/directory');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const result = await validator.validateOutputDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: []
      });
      expect(mockFs.access).toHaveBeenCalledWith('/resolved/test/directory');
      expect(mockFs.access).toHaveBeenCalledWith('/resolved/test/directory', fsConstants.W_OK);
      expect(mockFs.readdir).toHaveBeenCalledWith('/resolved/test/directory');
    });

    it('should return warning for non-empty directory', async () => {
      // Arrange
      const testDir = '/test/directory';
      mockPath.resolve.mockReturnValue('/resolved/test/directory');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['file1.txt', 'file2.txt']);

      // Act
      const result = await validator.validateOutputDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: ['Directory /resolved/test/directory is not empty']
      });
    });

    it('should return error for non-existent directory', async () => {
      // Arrange
      const testDir = '/nonexistent/directory';
      const error = new Error('ENOENT: no such file or directory');
      (error as any).code = 'ENOENT';
      mockFs.access.mockRejectedValue(error);

      // Act
      const result = await validator.validateOutputDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errors: ['Directory /nonexistent/directory does not exist'],
        warnings: []
      });
    });

    it('should return error for non-writable directory', async () => {
      // Arrange
      const testDir = '/readonly/directory';
      mockPath.resolve.mockReturnValue('/resolved/readonly/directory');
      mockFs.access.mockImplementation((path: string, mode?: number) => {
        if (mode === fsConstants.W_OK) {
          const error = new Error('EACCES: permission denied');
          (error as any).code = 'EACCES';
          throw error;
        }
        return Promise.resolve();
      });

      // Act
      const result = await validator.validateOutputDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errors: ['Directory /readonly/directory is not writable'],
        warnings: []
      });
    });

    it('should return generic error for other access issues', async () => {
      // Arrange
      const testDir = '/problem/directory';
      const error = new Error('Some other error');
      mockFs.access.mockRejectedValue(error);

      // Act
      const result = await validator.validateOutputDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errors: ['Cannot access directory /problem/directory: Some other error'],
        warnings: []
      });
    });

    it('should normalize directory paths', async () => {
      // Arrange
      const testDir = './relative/path';
      mockPath.resolve.mockReturnValue('/absolute/resolved/path');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      // Act
      await validator.validateOutputDirectory(testDir);

      // Assert
      expect(mockPath.resolve).toHaveBeenCalledWith('./relative/path');
      expect(mockFs.access).toHaveBeenCalledWith('/absolute/resolved/path');
    });
  });

  describe('validateMultipleDirectories', () => {
    it('should validate multiple directories and return results map', async () => {
      // Arrange
      const directories = ['/dir1', '/dir2', '/dir3'];
      mockPath.resolve.mockImplementation((dir: string) => `/resolved${dir}`);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockImplementation((dir: string) => {
        if (dir === '/resolved/dir2') {
          return Promise.resolve(['file.txt']);
        }
        return Promise.resolve([]);
      });

      // Act
      const results = await validator.validateMultipleDirectories(directories);

      // Assert
      expect(Object.keys(results)).toHaveLength(3);
      expect(results['/dir1']).toEqual({
        isValid: true,
        errors: [],
        warnings: []
      });
      expect(results['/dir2']).toEqual({
        isValid: true,
        errors: [],
        warnings: ['Directory /resolved/dir2 is not empty']
      });
      expect(results['/dir3']).toEqual({
        isValid: true,
        errors: [],
        warnings: []
      });
    });

    it('should handle mixed validation results', async () => {
      // Arrange
      const directories = ['/valid', '/invalid'];
      mockPath.resolve.mockImplementation((dir: string) => `/resolved${dir}`);
      mockFs.access.mockImplementation((path: string) => {
        if (path === '/resolved/invalid') {
          const error = new Error('ENOENT: no such file or directory');
          (error as any).code = 'ENOENT';
          throw error;
        }
        return Promise.resolve();
      });
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const results = await validator.validateMultipleDirectories(directories);

      // Assert
      expect(results['/valid'].isValid).toBe(true);
      expect(results['/invalid'].isValid).toBe(false);
      expect(results['/invalid'].errors).toContain('Directory /invalid does not exist');
    });
  });

  describe('createAndValidateDirectory', () => {
    it('should create directory and return valid result', async () => {
      // Arrange
      const testDir = '/new/directory';
      mockPath.resolve.mockReturnValue('/resolved/new/directory');
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const result = await validator.createAndValidateDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: []
      });
      expect(mockFs.mkdir).toHaveBeenCalledWith('/resolved/new/directory', { recursive: true });
    });

    it('should return error if directory creation fails', async () => {
      // Arrange
      const testDir = '/failed/directory';
      const error = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValue(error);

      // Act
      const result = await validator.createAndValidateDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: false,
        errors: ['Failed to create directory /failed/directory: Permission denied'],
        warnings: []
      });
    });

    it('should validate directory after successful creation', async () => {
      // Arrange
      const testDir = '/created/directory';
      mockPath.resolve.mockReturnValue('/resolved/created/directory');
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['existing-file.txt']);

      // Act
      const result = await validator.createAndValidateDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: ['Directory /resolved/created/directory is not empty']
      });
    });
  });

  describe('exported function validateOutputDirectory', () => {
    it('should work as a standalone function', async () => {
      // Arrange
      const testDir = '/test/standalone';
      mockPath.resolve.mockReturnValue('/resolved/test/standalone');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const result = await validateOutputDirectory(testDir);

      // Assert
      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: []
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty directory path', async () => {
      // Arrange
      const testDir = '';
      mockPath.resolve.mockReturnValue('/resolved');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const result = await validator.validateOutputDirectory(testDir);

      // Assert
      expect(result.isValid).toBe(true);
      expect(mockPath.resolve).toHaveBeenCalledWith('');
    });

    it('should handle directory with special characters', async () => {
      // Arrange
      const testDir = '/test/dir with spaces & symbols!';
      mockPath.resolve.mockReturnValue('/resolved/test/dir with spaces & symbols!');
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const result = await validator.validateOutputDirectory(testDir);

      // Assert
      expect(result.isValid).toBe(true);
      expect(mockPath.resolve).toHaveBeenCalledWith('/test/dir with spaces & symbols!');
    });

    it('should handle very long directory paths', async () => {
      // Arrange
      const longPath = '/very/long/path/that/goes/on/and/on/and/on/and/on/and/on/and/on/and/on';
      mockPath.resolve.mockReturnValue(`/resolved${longPath}`);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      // Act
      const result = await validator.validateOutputDirectory(longPath);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });
});