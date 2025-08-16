/**
 * Batch Processor Tests
 * 
 * Comprehensive test suite for batch processing functionality including
 * project detection, parallel processing, error handling, and reporting.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BatchProcessor } from '../../../src/cli/lib/batch-processor';
import { ComponentOrchestrator } from '../../../src/cli/lib/component-orchestrator';
import { Logger } from '../../../src/cli/lib/logger';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';
import {
  CLIOptions,
  CLIResult,
  BatchProcessingOptions,
  ProjectInfo,
  BatchProjectResult
} from '../../../src/cli/lib/types';

// Mock file system operations
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

// Mock path operations
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    resolve: vi.fn((p: string) => `/resolved/${p}`),
    join: vi.fn((...parts: string[]) => parts.join('/')),
    basename: vi.fn((p: string) => p.split('/').pop() || ''),
    relative: vi.fn((from: string, to: string) => `relative/${to}`)
  };
});

describe('BatchProcessor', () => {
  let batchProcessor: BatchProcessor;
  let mockOrchestrator: ComponentOrchestrator;
  let mockLogger: Logger;
  let mockErrorHandler: ErrorHandler;

  const mockCLIOptions: CLIOptions = {
    command: 'generate',
    dryRun: false,
    interactive: false,
    verbose: false,
    debug: false,
    quiet: false
  };

  beforeEach(() => {
    // Create mock dependencies
    mockOrchestrator = {
      executeWorkflow: vi.fn(),
      getExecutionStats: vi.fn(() => ({ parser: {}, detector: {}, generator: {} }))
    } as any;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    mockErrorHandler = {} as any;

    // Create batch processor instance
    batchProcessor = new BatchProcessor(
      mockOrchestrator,
      mockLogger,
      mockErrorHandler,
      {
        maxConcurrency: 2,
        projectDetectionTimeout: 5000,
        processingTimeout: 10000
      }
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Project Detection', () => {
    it('should detect projects in specified directories', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir1', '/test/dir2'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      // Mock file system responses
      mockFs.stat.mockImplementation(async (path: string) => ({
        isDirectory: () => true,
        isFile: () => false
      } as any));

      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      mockFs.readdir.mockImplementation(async (path: string) => {
        if (path.includes('dir1')) {
          return ['README.md', 'package.json', 'src'] as any;
        }
        if (path.includes('dir2')) {
          return ['README.txt', '.git'] as any;
        }
        return [] as any;
      });

      mockFs.readFile.mockResolvedValue('{"name": "test-project"}');

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.totalProjects).toBe(2);
      expect(mockFs.stat).toHaveBeenCalledWith('/resolved//test/dir1');
      expect(mockFs.stat).toHaveBeenCalledWith('/resolved//test/dir2');
      expect(mockFs.readdir).toHaveBeenCalledTimes(2);
    });

    it('should handle recursive directory scanning', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/root'],
        recursive: true,
        parallel: false,
        continueOnError: true
      };

      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false
      } as any);

      mockFs.realpath.mockImplementation(async (path: string) => path);

      // Mock directory structure: root -> subdir1, subdir2
      mockFs.readdir.mockImplementation(async (path: string) => {
        if (path.includes('root') && !path.includes('subdir')) {
          return [
            { name: 'subdir1', isDirectory: () => true },
            { name: 'subdir2', isDirectory: () => true },
            { name: 'file.txt', isDirectory: () => false }
          ] as any;
        }
        if (path.includes('subdir1')) {
          return ['README.md', 'package.json'] as any;
        }
        if (path.includes('subdir2')) {
          return ['README.txt'] as any;
        }
        return [] as any;
      });

      mockFs.readFile.mockResolvedValue('{"name": "test-project"}');

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.totalProjects).toBe(2);
      expect(mockFs.readdir).toHaveBeenCalledTimes(3); // root + 2 subdirs
    });

    it('should exclude directories based on patterns', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/root'],
        recursive: true,
        parallel: false,
        continueOnError: true,
        excludePatterns: ['node_modules', '.*']
      };

      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false
      } as any);

      mockFs.realpath.mockImplementation(async (path: string) => path);

      mockFs.readdir.mockImplementation(async (path: string) => {
        if (path.includes('root')) {
          return [
            { name: 'project', isDirectory: () => true },
            { name: 'node_modules', isDirectory: () => true },
            { name: '.git', isDirectory: () => true }
          ] as any;
        }
        if (path.includes('project')) {
          return ['README.md'] as any;
        }
        return [] as any;
      });

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.totalProjects).toBe(1);
      // Should only scan root and project directories, not excluded ones
      expect(mockFs.readdir).toHaveBeenCalledTimes(2);
    });

    it('should handle project detection patterns', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/root'],
        recursive: false,
        parallel: false,
        continueOnError: true,
        projectDetectionPattern: 'my-.*'
      };

      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false
      } as any);

      mockFs.realpath.mockImplementation(async (path: string) => path);
      mockFs.readdir.mockResolvedValue(['README.md', 'package.json'] as any);
      mockFs.readFile.mockResolvedValue('{"name": "my-project"}');

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.totalProjects).toBe(1);
    });

    it('should estimate project complexity correctly', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/complex'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false
      } as any);

      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      // Mock complex project structure
      mockFs.readdir.mockResolvedValue([
        'README.md',
        'package.json',
        'yarn.lock',
        'Dockerfile',
        'docker-compose.yml',
        'tsconfig.json',
        'webpack.config.js',
        'src',
        'test',
        '.github'
      ] as any);

      mockFs.readFile.mockResolvedValue('{"name": "complex-project"}');

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.totalProjects).toBe(1);
      expect(result.projectResults[0].project.estimatedComplexity).toBe('high');
    });
  });

  describe('Sequential Processing', () => {
    it('should process projects sequentially', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      const mockSuccessResult: CLIResult = {
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1000,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 0,
          executionTime: 1000,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      };

      mockOrchestrator.executeWorkflow = vi.fn().mockResolvedValue(mockSuccessResult);

      // Mock two projects
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      mockFs.readdir.mockImplementation(async (path: string) => {
        return [
          { name: 'project1', isDirectory: () => true },
          { name: 'project2', isDirectory: () => true }
        ] as any;
      });

      // Mock project detection
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          // First call for main directory
          return [
            { name: 'project1', isDirectory: () => true },
            { name: 'project2', isDirectory: () => true }
          ] as any;
        } else {
          // Subsequent calls for project directories
          return ['README.md'] as any;
        }
      });

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalProjects).toBe(2);
      expect(result.successfulProjects).toBe(2);
      expect(result.failedProjects).toBe(0);
      expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledTimes(2);
    });

    it('should stop on error when continueOnError is false', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir'],
        recursive: false,
        parallel: false,
        continueOnError: false
      };

      const mockErrorResult: CLIResult = {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'PROCESSING_ERROR',
          message: 'Processing failed',
          category: 'processing',
          severity: 'error',
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 500,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 500,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      };

      mockOrchestrator.executeWorkflow = vi.fn().mockResolvedValue(mockErrorResult);

      // Mock two projects
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'project1', isDirectory: () => true },
            { name: 'project2', isDirectory: () => true }
          ] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.success).toBe(false);
      expect(result.processedProjects).toBe(1); // Should stop after first failure
      expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledTimes(1);
    });

    it('should continue on error when continueOnError is true', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      const mockSuccessResult: CLIResult = {
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1000,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 0,
          executionTime: 1000,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      };

      const mockErrorResult: CLIResult = {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'PROCESSING_ERROR',
          message: 'Processing failed',
          category: 'processing',
          severity: 'error',
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 500,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 500,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      };

      // First project fails, second succeeds
      mockOrchestrator.executeWorkflow = vi.fn()
        .mockResolvedValueOnce(mockErrorResult)
        .mockResolvedValueOnce(mockSuccessResult);

      // Mock two projects
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'project1', isDirectory: () => true },
            { name: 'project2', isDirectory: () => true }
          ] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.processedProjects).toBe(2); // Should process both projects
      expect(result.successfulProjects).toBe(1);
      expect(result.failedProjects).toBe(1);
      expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledTimes(2);
    });
  });

  describe('Parallel Processing', () => {
    it('should process projects in parallel with concurrency control', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir'],
        recursive: false,
        parallel: true,
        maxConcurrency: 2,
        continueOnError: true
      };

      const mockSuccessResult: CLIResult = {
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1000,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 0,
          executionTime: 1000,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      };

      // Add delay to simulate processing time
      mockOrchestrator.executeWorkflow = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockSuccessResult;
      });

      // Mock four projects to test concurrency
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'project1', isDirectory: () => true },
            { name: 'project2', isDirectory: () => true },
            { name: 'project3', isDirectory: () => true },
            { name: 'project4', isDirectory: () => true }
          ] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      // Act
      const startTime = Date.now();
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalProjects).toBe(4);
      expect(result.successfulProjects).toBe(4);
      expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledTimes(4);
      
      // With concurrency of 2, should take roughly half the time of sequential
      // (4 projects * 100ms each = 400ms sequential, ~200ms parallel)
      expect(endTime - startTime).toBeLessThan(350);
    });

    it('should handle parallel processing errors gracefully', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir'],
        recursive: false,
        parallel: true,
        maxConcurrency: 2,
        continueOnError: true
      };

      const mockSuccessResult: CLIResult = {
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1000,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 0,
          executionTime: 1000,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      };

      // Mock some projects succeeding and some failing
      mockOrchestrator.executeWorkflow = vi.fn()
        .mockResolvedValueOnce(mockSuccessResult)
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce(mockSuccessResult);

      // Mock three projects
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'project1', isDirectory: () => true },
            { name: 'project2', isDirectory: () => true },
            { name: 'project3', isDirectory: () => true }
          ] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.totalProjects).toBe(3);
      expect(result.successfulProjects).toBe(2);
      expect(result.failedProjects).toBe(1);
      expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledTimes(3);
    });
  });

  describe('Progress Reporting', () => {
    it('should call progress callback during processing', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      const mockSuccessResult: CLIResult = {
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1000,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 0,
          executionTime: 1000,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      };

      mockOrchestrator.executeWorkflow = vi.fn().mockResolvedValue(mockSuccessResult);

      // Mock one project
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [{ name: 'project1', isDirectory: () => true }] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      const progressCallback = vi.fn();

      // Act
      await batchProcessor.processBatch(batchOptions, mockCLIOptions, progressCallback);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith({
        totalProjects: 0,
        processedProjects: 0,
        phase: 'detection'
      });

      expect(progressCallback).toHaveBeenCalledWith({
        totalProjects: 1,
        processedProjects: 0,
        phase: 'processing'
      });

      expect(progressCallback).toHaveBeenCalledWith({
        totalProjects: 1,
        processedProjects: 1,
        currentProject: 'project1',
        phase: 'processing'
      });

      expect(progressCallback).toHaveBeenCalledWith({
        totalProjects: 1,
        processedProjects: 1,
        phase: 'complete'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/nonexistent/dir'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      mockFs.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.totalProjects).toBe(0);
      expect(result.warnings).toContain('No projects found in specified directories');
    });

    it('should handle processing timeouts', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      // Mock long-running operation that exceeds timeout
      mockOrchestrator.executeWorkflow = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 15000)); // Longer than 10s timeout
        return { success: true } as CLIResult;
      });

      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [{ name: 'project1', isDirectory: () => true }] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.failedProjects).toBe(1);
      expect(result.projectResults[0].error?.message).toContain('timed out');
    });
  });

  describe('Result Compilation', () => {
    it('should compile comprehensive batch results', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/dir'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      const mockSuccessResult: CLIResult = {
        success: true,
        generatedFiles: ['ci.yml', 'cd.yml'],
        errors: [],
        warnings: ['Minor warning'],
        summary: {
          totalTime: 2000,
          filesGenerated: 2,
          workflowsCreated: 2,
          frameworksDetected: ['nodejs', 'react'],
          optimizationsApplied: 3,
          executionTime: 2000,
          filesProcessed: 1,
          workflowsGenerated: 2
        }
      };

      mockOrchestrator.executeWorkflow = vi.fn().mockResolvedValue(mockSuccessResult);

      // Mock two projects
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'project1', isDirectory: () => true },
            { name: 'project2', isDirectory: () => true }
          ] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalProjects).toBe(2);
      expect(result.successfulProjects).toBe(2);
      expect(result.failedProjects).toBe(0);
      
      // Check summary aggregation
      expect(result.summary.totalFilesGenerated).toBe(4); // 2 files * 2 projects
      expect(result.summary.totalWorkflowsCreated).toBe(4); // 2 workflows * 2 projects
      expect(result.summary.frameworksDetected).toEqual({
        'nodejs': 2,
        'react': 2
      });
      
      expect(result.warnings).toContain('Minor warning');
    });

    it('should handle empty project detection', async () => {
      // Arrange
      const batchOptions: BatchProcessingOptions = {
        directories: ['/test/empty'],
        recursive: false,
        parallel: false,
        continueOnError: true
      };

      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      mockFs.readdir.mockResolvedValue([] as any); // Empty directory

      // Act
      const result = await batchProcessor.processBatch(batchOptions, mockCLIOptions);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalProjects).toBe(0);
      expect(result.warnings).toContain('No projects found in specified directories');
    });
  });

  describe('Configuration Management', () => {
    it('should use custom configuration', async () => {
      // Arrange
      const customConfig = {
        maxConcurrency: 8,
        projectDetectionTimeout: 60000,
        processingTimeout: 300000,
        enableProgressReporting: false,
        enableDetailedLogging: true
      };

      const customBatchProcessor = new BatchProcessor(
        mockOrchestrator,
        mockLogger,
        mockErrorHandler,
        customConfig
      );

      // Act
      const stats = customBatchProcessor.getProcessingStats();

      // Assert
      expect(stats.config.maxConcurrency).toBe(8);
      expect(stats.config.projectDetectionTimeout).toBe(60000);
      expect(stats.config.processingTimeout).toBe(300000);
    });

    it('should update configuration dynamically', async () => {
      // Arrange
      const newConfig = {
        maxConcurrency: 16,
        enableDetailedLogging: true
      };

      // Act
      batchProcessor.updateConfig(newConfig);
      const stats = batchProcessor.getProcessingStats();

      // Assert
      expect(stats.config.maxConcurrency).toBe(16);
      expect(stats.config.enableDetailedLogging).toBe(true);
    });
  });
});