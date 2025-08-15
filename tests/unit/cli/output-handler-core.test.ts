/**
 * Core Output Handler Tests
 * 
 * Focused tests for the core OutputHandler functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { OutputHandler, WorkflowFile } from '../../../src/cli/lib/output-handler';
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

describe('OutputHandler - Core Functionality', () => {
  let outputHandler: OutputHandler;
  let testWorkflowFile: WorkflowFile;

  beforeEach(() => {
    vi.clearAllMocks();
    
    outputHandler = new OutputHandler(mockLogger, {
      conflictResolution: 'backup',
      createBackups: true,
      validatePermissions: true,
      dryRun: false,
      overwriteReadonly: false
    });

    testWorkflowFile = {
      filename: 'ci.yml',
      content: 'name: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest',
      type: 'ci'
    };
  });

  describe('basic file operations', () => {
    it('should write a new file successfully', async () => {
      const outputDir = '/test/output';
      
      // Mock directory exists
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      // Mock file write
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFile], outputDir);

      expect(result.success).toBe(true);
      expect(result.filesCreated).toBe(1);
      expect(result.filesUpdated).toBe(0);
      expect(result.filesSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should handle dry run mode correctly', async () => {
      outputHandler.updateOptions({ dryRun: true });
      
      const outputDir = '/test/output';
      
      // Mock directory exists
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFile], outputDir);

      expect(result.success).toBe(true);
      expect(result.filesCreated).toBe(1);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should skip existing files when using skip strategy', async () => {
      outputHandler.updateOptions({ conflictResolution: 'skip' });
      
      const outputDir = '/test/output';
      
      // Mock directory exists
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file exists
      mockFs.stat.mockResolvedValueOnce({
        mtime: new Date(),
        size: 100
      } as any);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFile], outputDir);



      expect(result.success).toBe(true);
      expect(result.filesSkipped).toBe(1);
      expect(result.filesCreated).toBe(0);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should create backup when file exists and using backup strategy', async () => {
      const outputDir = '/test/output';
      
      // Mock directory exists
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file exists
      mockFs.stat.mockResolvedValueOnce({
        mtime: new Date(),
        size: 100
      } as any);
      
      // Mock reading existing file
      mockFs.readFile.mockResolvedValueOnce('existing content');
      
      // Mock backup creation
      mockFs.copyFile.mockResolvedValue(undefined);
      
      // Mock readonly file check in handleReadonlyFile
      mockFs.stat.mockResolvedValueOnce({
        mode: 0o644 // writable file
      } as any);
      
      // Mock file write
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFile], outputDir);

      expect(result.success).toBe(true);
      expect(result.filesUpdated).toBe(1);
      expect(result.backupsCreated).toBe(1);
      expect(result.backupFiles).toHaveLength(1);
      expect(mockFs.copyFile).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('directory operations', () => {
    it('should create directory if it does not exist', async () => {
      const outputDir = '/test/nonexistent';
      
      // Mock directory doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      // Mock directory creation
      mockFs.mkdir.mockResolvedValue(undefined);
      
      // Mock permission check for parent
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      // Mock file write
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFile], outputDir);

      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('nonexistent'),
        { recursive: true }
      );
    });

    it('should handle permission errors gracefully', async () => {
      const outputDir = '/test/readonly';
      
      // Mock directory exists but no write permission
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check failure
      mockFs.access.mockRejectedValueOnce(new Error('EACCES'));

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFile], outputDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].category).toBe('file-system');
    });
  });

  describe('content formatting', () => {
    it('should add metadata when includeMetadata is true', async () => {
      const outputDir = '/test/output';
      
      // Mock directory exists
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      // Mock file write
      mockFs.writeFile.mockResolvedValue(undefined);

      await outputHandler.writeWorkflowFiles(
        [testWorkflowFile],
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

    it('should not add metadata when includeMetadata is false', async () => {
      const outputDir = '/test/output';
      
      // Mock directory exists
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      // Mock file write
      mockFs.writeFile.mockResolvedValue(undefined);

      await outputHandler.writeWorkflowFiles(
        [testWorkflowFile],
        outputDir,
        {
          format: 'yaml',
          indentation: 2,
          includeMetadata: false,
          backupExisting: true
        }
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.stringContaining('# Generated by readme-to-cicd'),
        'utf8'
      );
    });
  });

  describe('error handling', () => {
    it('should provide helpful error suggestions', async () => {
      const outputDir = '/test/error';
      
      // Mock directory validation failure
      mockFs.stat.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFile], outputDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      
      const error = result.errors[0];
      expect(error.suggestions).toContain('Check if the output directory path is valid');
      expect(error.category).toBe('file-system');
    });

    it('should handle file write errors', async () => {
      const outputDir = '/test/output';
      
      // Mock directory exists
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      // Mock permission check
      mockFs.access.mockResolvedValueOnce(undefined);
      
      // Mock file doesn't exist
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      
      // Mock file write failure
      mockFs.writeFile.mockRejectedValueOnce(new Error('ENOSPC: no space left on device'));

      const result = await outputHandler.writeWorkflowFiles([testWorkflowFile], outputDir);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FILE_WRITE_ERROR');
    });
  });

  describe('options management', () => {
    it('should update options correctly', () => {
      const newOptions = {
        conflictResolution: 'overwrite' as const,
        createBackups: false
      };

      outputHandler.updateOptions(newOptions);
      const currentOptions = outputHandler.getOptions();

      expect(currentOptions.conflictResolution).toBe('overwrite');
      expect(currentOptions.createBackups).toBe(false);
      expect(currentOptions.validatePermissions).toBe(true); // Should preserve existing
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

  describe('validateOutputDirectory', () => {
    it('should validate existing writable directory', async () => {
      const outputDir = '/test/output';
      
      mockFs.stat.mockResolvedValueOnce({
        isDirectory: () => true
      } as any);
      
      mockFs.access.mockResolvedValueOnce(undefined);

      const result = await outputHandler.validateOutputDirectory(outputDir);

      expect(result.valid).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.writable).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle non-existing directory with writable parent', async () => {
      const outputDir = '/test/nonexistent';
      
      mockFs.stat.mockRejectedValueOnce({ code: 'ENOENT' });
      mockFs.access.mockResolvedValueOnce(undefined); // Parent is writable

      const result = await outputHandler.validateOutputDirectory(outputDir);

      expect(result.valid).toBe(true);
      expect(result.exists).toBe(false);
      expect(result.writable).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});