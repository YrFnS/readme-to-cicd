/**
 * Output Handler Tests
 * 
 * Comprehensive test suite for the OutputHandler class covering file system operations,
 * conflict resolution, backup functionality, and error handling scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OutputHandler, WorkflowFile, ConflictResolution } from '../../../src/cli/lib/output-handler';
import { Logger } from '../../../src/cli/lib/logger';

// Mock fs module
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as unknown as Logger;

describe('OutputHandler', () => {
  let outputHandler: OutputHandler;
  let testWorkflowFiles: WorkflowFile[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    outputHandler = new OutputHandler(mockLogger, {
      conflictResolution: 'backup',
      createBackups: true,
      validatePermissions: true,
      dryRun: false,
      overwriteReadonly: false
    });

    testWorkflowFiles = [
      {
        filename: 'ci.yml',
        content: 'name: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest',
        type: 'ci',
        metadata: {
          description: 'CI workflow',
          version: '1.0.0',
          generated: new Date()
        }
      },
      {
        filename: 'cd.yml',
        content: 'name: CD\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest',
        type: 'cd'
      }
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('writeWorkflowFiles', () => {
    it('should successfully write new workflow files', async () => {
      const outputDir = '/test/output';
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission checks for directory
      mockFs.access.mockResolvedValueOnce(undefined); // Directory write permission
      
      // Mock file existence checks (files don't exist)
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // ci.yml doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // cd.yml doesn't exist
      
      // Mock file writes
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, outputDir);

      expect(result.success).toBe(true);
      expect(result.filesCreated).toBe(2);
      expect(result.filesUpdated).toBe(0);
      expect(result.filesSkipped).toBe(0);
      expect(result.generatedFiles).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.resolve(outputDir, 'ci.yml'),
        expect.stringContaining('name: CI'),
        'utf8'
      );
    });

    it('should handle file conflicts with backup strategy', async () => {
      const outputDir = '/test/output';
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission checks for directory
      mockFs.access.mockResolvedValueOnce(undefined); // Directory write permission
      
      // Mock all fs.stat calls to return existing writable files
      mockFs.stat.mockResolvedValue({
        mtime: new Date(),
        size: 100,
        mode: 0o644, // writable file (owner has read+write)
        isDirectory: () => false
      } as any);
      
      // Mock reading existing file content for conflict analysis
      mockFs.readFile.mockResolvedValue('existing content');
      
      // Mock backup creation
      mockFs.copyFile.mockResolvedValue(undefined);
      
      // Mock file writes
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, outputDir);

      expect(result.success).toBe(true);
      expect(result.filesCreated).toBe(0);
      expect(result.filesUpdated).toBe(2);
      expect(result.backupsCreated).toBe(2);
      expect(result.backupFiles).toHaveLength(2);
      
      expect(mockFs.copyFile).toHaveBeenCalledTimes(2);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
    });

    it('should create output directory if it does not exist', async () => {
      const outputDir = '/test/nonexistent';
      
      // Mock directory doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      // Mock directory creation
      mockFs.mkdir.mockResolvedValue(undefined);
      
      // Mock permission checks for created directory
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file existence checks (files don't exist)
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // First file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // Second file doesn't exist
      
      // Mock file writes
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, outputDir);

      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith(path.resolve(outputDir), { recursive: true });
    });

    it('should handle permission errors gracefully', async () => {
      const outputDir = '/test/readonly';
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check failure
      mockFs.access.mockRejectedValueOnce(new Error('EACCES'));

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, outputDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].category).toBe('file-system');
      expect(result.errors[0].code).toBe('OUTPUT_DIRECTORY_ERROR');
    });

    it('should work in dry-run mode without writing files', async () => {
      outputHandler.updateOptions({ dryRun: true });
      
      const outputDir = '/test/output';
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock file existence checks (files don't exist)
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // First file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // Second file doesn't exist

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, outputDir);

      expect(result.success).toBe(true);
      expect(result.filesCreated).toBe(2);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('conflict resolution strategies', () => {
    beforeEach(() => {
      // Reset all mocks for conflict scenarios
      vi.clearAllMocks();
    });

    it('should overwrite files when using overwrite strategy', async () => {
      outputHandler.updateOptions({ conflictResolution: 'overwrite' });
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check for directory
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file exists
      mockFs.stat.mockResolvedValueOnce({
        mtime: new Date(),
        size: 100
      } as any);
      
      // Mock readonly file check in handleReadonlyFile
      mockFs.stat.mockResolvedValueOnce({
        mode: 0o644 // writable file
      } as any);
      
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFiles[0]], '/test/output');

      expect(result.success).toBe(true);
      expect(result.filesUpdated).toBe(1);
      expect(result.backupsCreated).toBe(0);
      expect(mockFs.copyFile).not.toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should skip files when using skip strategy', async () => {
      outputHandler.updateOptions({ conflictResolution: 'skip' });
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check for directory
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file exists
      mockFs.stat.mockResolvedValueOnce({
        mtime: new Date(),
        size: 100
      } as any);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFiles[0]], '/test/output');

      expect(result.success).toBe(true);
      expect(result.filesSkipped).toBe(1);
      expect(result.filesUpdated).toBe(0);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should merge files when using merge strategy and files are compatible', async () => {
      outputHandler.updateOptions({ conflictResolution: 'merge' });
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check for directory
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file exists
      mockFs.stat.mockResolvedValueOnce({
        mtime: new Date(),
        size: 100
      } as any);
      
      // Mock existing file with different workflow name
      mockFs.readFile.mockResolvedValueOnce('name: Different Workflow\non: push');
      
      // Mock readonly file check in handleReadonlyFile
      mockFs.stat.mockResolvedValueOnce({
        mode: 0o644 // writable file
      } as any);
      
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFiles[0]], '/test/output');

      expect(result.success).toBe(true);
      expect(result.filesUpdated).toBe(1);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('--- Merged workflow content ---'),
        'utf8'
      );
    });

    it('should fall back to backup strategy when merge is not possible', async () => {
      outputHandler.updateOptions({ conflictResolution: 'merge' });
      
      // Mock directory validation - first call returns directory
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check for directory
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock all subsequent fs.stat calls to return existing writable files
      mockFs.stat.mockResolvedValue({
        mtime: new Date(),
        size: 100,
        mode: 0o644, // writable file (owner has read+write)
        isDirectory: () => false
      } as any);
      
      // Mock existing file with same workflow name (cannot merge)
      mockFs.readFile.mockResolvedValueOnce('name: CI\non: push');
      
      mockFs.copyFile.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFiles[0]], '/test/output');

      expect(result.success).toBe(true);
      expect(result.filesUpdated).toBe(1);
      expect(result.backupsCreated).toBe(1);
      expect(mockFs.copyFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('path validation', () => {
    it('should reject unsafe paths with directory traversal', async () => {
      const unsafePath = '../../../etc/passwd';

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, unsafePath);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      // The error message might vary based on the actual path resolution
      expect(result.errors[0].message).toContain('Failed to prepare output directory');
    });

    it('should accept absolute paths', async () => {
      const absolutePath = '/home/user/project/.github/workflows';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file existence checks (files don't exist)
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // First file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // Second file doesn't exist
      
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, absolutePath);

      expect(result.success).toBe(true);
    });

    it('should accept relative paths within current directory', async () => {
      const relativePath = '.github/workflows';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file existence checks (files don't exist)
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // First file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // Second file doesn't exist
      
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, relativePath);

      expect(result.success).toBe(true);
    });
  });

  describe('readonly file handling', () => {
    it('should handle readonly files when overwriteReadonly is enabled', async () => {
      outputHandler.updateOptions({ 
        conflictResolution: 'overwrite',
        overwriteReadonly: true 
      });
      
      const outputDir = '/test/output';
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check for directory
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file exists
      mockFs.stat.mockResolvedValueOnce({
        mtime: new Date(),
        size: 100
      } as any);
      
      // Mock readonly file stats in handleReadonlyFile
      mockFs.stat.mockResolvedValueOnce({
        mode: 0o444 // readonly
      } as any);
      
      // Mock chmod and write operations
      mockFs.chmod.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFiles[0]], outputDir);

      expect(result.success).toBe(true);
      expect(mockFs.chmod).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should fail on readonly files when overwriteReadonly is disabled', async () => {
      outputHandler.updateOptions({ 
        conflictResolution: 'overwrite',
        overwriteReadonly: false 
      });
      
      const outputDir = '/test/output';
      
      // Mock directory validation
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check for directory
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file exists
      mockFs.stat.mockResolvedValueOnce({
        mtime: new Date(),
        size: 100
      } as any);
      
      // Mock readonly file stats in handleReadonlyFile
      mockFs.stat.mockResolvedValueOnce({
        mode: 0o444 // readonly
      } as any);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFiles[0]], outputDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('readonly');
    });
  });

  describe('content formatting', () => {
    it('should add metadata comments when includeMetadata is true', async () => {
      const outputDir = '/test/output';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      mockFs.writeFile.mockResolvedValue(undefined);

      await outputHandler.writeWorkflowFiles(
        [testWorkflowFiles[0]], 
        outputDir,
        {
          format: 'yaml',
          indentation: 2,
          includeMetadata: true,
          backupExisting: true
        }
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('# Generated by readme-to-cicd'),
        'utf8'
      );
    });

    it('should adjust indentation when specified', async () => {
      const outputDir = '/test/output';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      mockFs.writeFile.mockResolvedValue(undefined);

      await outputHandler.writeWorkflowFiles(
        [testWorkflowFiles[0]], 
        outputDir,
        {
          format: 'yaml',
          indentation: 4,
          includeMetadata: false,
          backupExisting: true
        }
      );

      // Verify that writeFile was called with content that has 4-space indentation
      expect(mockFs.writeFile).toHaveBeenCalled();
      const writeCall = mockFs.writeFile.mock.calls[0];
      const content = writeCall[1] as string;
      
      // Check that indented lines use 4 spaces instead of 2
      const lines = content.split('\n');
      const indentedLine = lines.find(line => line.startsWith('    '));
      expect(indentedLine).toBeDefined();
    });
  });

  describe('validateOutputDirectory', () => {
    it('should validate existing writable directory', async () => {
      const outputDir = '/test/output';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      mockFs.access.mockResolvedValueOnce(undefined); // Write permission

      const result = await outputHandler.validateOutputDirectory(outputDir);

      expect(result.valid).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.writable).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate non-existing directory with writable parent', async () => {
      const outputDir = '/test/nonexistent';
      
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' }); // Directory doesn't exist
      mockFs.access.mockResolvedValueOnce(undefined); // Parent directory is writable

      const result = await outputHandler.validateOutputDirectory(outputDir);

      expect(result.valid).toBe(true);
      expect(result.exists).toBe(false);
      expect(result.writable).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject path that is not a directory', async () => {
      const outputDir = '/test/file.txt';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => false
      } as any);

      const result = await outputHandler.validateOutputDirectory(outputDir);

      expect(result.valid).toBe(false);
      expect(result.exists).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not a directory');
    });

    it('should reject directory without write permissions', async () => {
      const outputDir = '/test/readonly';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      mockFs.access.mockRejectedValueOnce(new Error('EACCES')); // No write permission

      const result = await outputHandler.validateOutputDirectory(outputDir);

      expect(result.valid).toBe(true); // Path is valid, just not writable
      expect(result.exists).toBe(true);
      expect(result.writable).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No write permission');
    });
  });

  describe('error handling and suggestions', () => {
    it('should provide helpful error suggestions for common issues', async () => {
      const outputDir = '/test/readonly';
      
      // Mock permission error
      mockFs.stat.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await outputHandler.writeWorkflowFiles(testWorkflowFiles, outputDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      
      const error = result.errors[0];
      expect(error.suggestions).toContain('Check if the output directory path is valid');
      expect(error.suggestions).toContain('Ensure you have write permissions to the parent directory');
    });

    it('should handle file write errors with context', async () => {
      const outputDir = '/test/output';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check for directory
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      // Mock file write failure
      mockFs.writeFile.mockRejectedValueOnce(new Error('ENOSPC: no space left on device'));

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFiles[0]], outputDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      
      const error = result.errors[0];
      expect(error.code).toBe('FILE_WRITE_ERROR');
      expect(error.context).toBeDefined();
      expect(error.context.filePath).toContain('ci.yml');
    });
  });

  describe('options management', () => {
    it('should update options correctly', () => {
      const newOptions = {
        conflictResolution: 'overwrite' as ConflictResolution,
        createBackups: false
      };

      outputHandler.updateOptions(newOptions);
      const currentOptions = outputHandler.getOptions();

      expect(currentOptions.conflictResolution).toBe('overwrite');
      expect(currentOptions.createBackups).toBe(false);
      expect(currentOptions.validatePermissions).toBe(true); // Should preserve existing options
    });

    it('should return current options', () => {
      const options = outputHandler.getOptions();

      expect(options).toEqual({
        conflictResolution: 'backup',
        createBackups: true,
        validatePermissions: true,
        dryRun: false,
        overwriteReadonly: false
      });
    });
  });
});