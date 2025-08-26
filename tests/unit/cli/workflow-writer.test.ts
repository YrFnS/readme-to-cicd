/**
 * Unit Tests for WorkflowWriter
 * 
 * Tests the workflow file writing functionality including directory validation,
 * file writing logic, and error handling for file system operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkflowWriter, WorkflowWriterError, writeWorkflowFiles, type WorkflowFile } from '../../../src/cli/workflow-writer';

// Mock fs module
vi.mock('fs/promises');

describe('WorkflowWriter', () => {
  let workflowWriter: WorkflowWriter;
  let mockFs: any;

  beforeEach(() => {
    workflowWriter = new WorkflowWriter();
    mockFs = vi.mocked(fs);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('writeWorkflowFiles', () => {
    const validWorkflows: WorkflowFile[] = [
      {
        name: 'ci.yml',
        content: 'name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest',
        path: '.github/workflows'
      },
      {
        name: 'deploy.yml',
        content: 'name: Deploy\non: [push]\njobs:\n  deploy:\n    runs-on: ubuntu-latest',
        path: '.github/workflows'
      }
    ];

    const outputDir = '/test/output';

    it('should write workflow files successfully', async () => {
      // Mock fs operations
      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await workflowWriter.writeWorkflowFiles(validWorkflows, outputDir);

      // Verify directory access was checked
      expect(mockFs.access).toHaveBeenCalledWith(outputDir);
      expect(mockFs.access).toHaveBeenCalledWith(path.join(outputDir, '.github/workflows'));

      // Verify files were written
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, '.github/workflows', 'ci.yml'),
        validWorkflows[0].content,
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, '.github/workflows', 'deploy.yml'),
        validWorkflows[1].content,
        'utf8'
      );
    });

    it('should create directories when they do not exist', async () => {
      // Mock directory doesn't exist initially
      mockFs.access
        .mockRejectedValueOnce(new Error('Directory not found'))
        .mockRejectedValueOnce(new Error('Directory not found'))
        .mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await workflowWriter.writeWorkflowFiles(validWorkflows, outputDir);

      // Verify directories were created
      expect(mockFs.mkdir).toHaveBeenCalledWith(outputDir, { recursive: true });
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(outputDir, '.github/workflows'),
        { recursive: true }
      );
    });

    it('should throw error when no workflows provided', async () => {
      await expect(workflowWriter.writeWorkflowFiles([], outputDir))
        .rejects.toThrow(WorkflowWriterError);
      
      await expect(workflowWriter.writeWorkflowFiles(null as any, outputDir))
        .rejects.toThrow('No workflows provided');
    });

    it('should throw error when invalid output directory provided', async () => {
      await expect(workflowWriter.writeWorkflowFiles(validWorkflows, ''))
        .rejects.toThrow(WorkflowWriterError);
      
      await expect(workflowWriter.writeWorkflowFiles(validWorkflows, null as any))
        .rejects.toThrow('Invalid output directory');
    });

    it('should handle file write errors gracefully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(workflowWriter.writeWorkflowFiles(validWorkflows, outputDir))
        .rejects.toThrow(WorkflowWriterError);
    });

    it('should handle directory creation errors gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory not found'));
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(workflowWriter.writeWorkflowFiles(validWorkflows, outputDir))
        .rejects.toThrow(WorkflowWriterError);
    });
  });

  describe('workflow file validation', () => {
    const outputDir = '/test/output';

    it('should reject workflow with missing name', async () => {
      const invalidWorkflow: WorkflowFile[] = [{
        name: '',
        content: 'test content',
        path: '.github/workflows'
      }];

      await expect(workflowWriter.writeWorkflowFiles(invalidWorkflow, outputDir))
        .rejects.toThrow('Workflow file name is required');
    });

    it('should reject workflow with missing content', async () => {
      const invalidWorkflow: WorkflowFile[] = [{
        name: 'test.yml',
        content: '',
        path: '.github/workflows'
      }];

      await expect(workflowWriter.writeWorkflowFiles(invalidWorkflow, outputDir))
        .rejects.toThrow('Workflow file content is required');
    });

    it('should reject workflow with missing path', async () => {
      const invalidWorkflow: WorkflowFile[] = [{
        name: 'test.yml',
        content: 'test content',
        path: ''
      }];

      await expect(workflowWriter.writeWorkflowFiles(invalidWorkflow, outputDir))
        .rejects.toThrow('Workflow file path is required');
    });

    it('should reject workflow with invalid characters in name', async () => {
      const invalidWorkflow: WorkflowFile[] = [{
        name: 'test<>file.yml',
        content: 'test content',
        path: '.github/workflows'
      }];

      await expect(workflowWriter.writeWorkflowFiles(invalidWorkflow, outputDir))
        .rejects.toThrow('contains invalid characters');
    });

    it('should reject workflow with directory traversal in path', async () => {
      const invalidWorkflow: WorkflowFile[] = [{
        name: 'test.yml',
        content: 'test content',
        path: '../../../etc'
      }];

      await expect(workflowWriter.writeWorkflowFiles(invalidWorkflow, outputDir))
        .rejects.toThrow('contains invalid directory traversal');
    });

    it('should reject workflow with absolute path', async () => {
      const invalidWorkflow: WorkflowFile[] = [{
        name: 'test.yml',
        content: 'test content',
        path: '/absolute/path'
      }];

      await expect(workflowWriter.writeWorkflowFiles(invalidWorkflow, outputDir))
        .rejects.toThrow('contains invalid directory traversal');
    });

    it('should reject null workflow object', async () => {
      const invalidWorkflow: WorkflowFile[] = [null as any];

      await expect(workflowWriter.writeWorkflowFiles(invalidWorkflow, outputDir))
        .rejects.toThrow('Workflow file is null or undefined');
    });
  });

  describe('error handling', () => {
    it('should create WorkflowWriterError with proper properties', () => {
      const originalError = new Error('Original error');
      const writerError = new WorkflowWriterError('Test message', 'test-operation', originalError);

      expect(writerError.name).toBe('WorkflowWriterError');
      expect(writerError.message).toBe('WorkflowWriter test-operation failed: Test message');
      expect(writerError.operation).toBe('test-operation');
      expect(writerError.cause).toBe(originalError);
    });

    it('should create WorkflowWriterError without cause', () => {
      const writerError = new WorkflowWriterError('Test message', 'test-operation');

      expect(writerError.name).toBe('WorkflowWriterError');
      expect(writerError.message).toBe('WorkflowWriter test-operation failed: Test message');
      expect(writerError.operation).toBe('test-operation');
      expect(writerError.cause).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    const outputDir = '/test/output';

    it('should handle workflows with nested directory paths', async () => {
      const nestedWorkflows: WorkflowFile[] = [{
        name: 'test.yml',
        content: 'test content',
        path: 'deep/nested/directory/structure'
      }];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await workflowWriter.writeWorkflowFiles(nestedWorkflows, outputDir);

      expect(mockFs.access).toHaveBeenCalledWith(
        path.join(outputDir, 'deep/nested/directory/structure')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'deep/nested/directory/structure', 'test.yml'),
        'test content',
        'utf8'
      );
    });

    it('should handle workflows with different file extensions', async () => {
      const workflows: WorkflowFile[] = [
        {
          name: 'workflow.yaml',
          content: 'yaml content',
          path: '.github/workflows'
        },
        {
          name: 'config.json',
          content: '{"test": true}',
          path: 'config'
        }
      ];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await workflowWriter.writeWorkflowFiles(workflows, outputDir);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, '.github/workflows', 'workflow.yaml'),
        'yaml content',
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(outputDir, 'config', 'config.json'),
        '{"test": true}',
        'utf8'
      );
    });
  });
});

describe('writeWorkflowFiles convenience function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call WorkflowWriter.writeWorkflowFiles', async () => {
    const workflows: WorkflowFile[] = [{
      name: 'test.yml',
      content: 'test content',
      path: '.github/workflows'
    }];
    const outputDir = '/test/output';

    // Mock fs operations
    const mockFs = vi.mocked(fs);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    await writeWorkflowFiles(workflows, outputDir);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      path.join(outputDir, '.github/workflows', 'test.yml'),
      'test content',
      'utf8'
    );
  });
});