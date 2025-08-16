/**
 * Batch Processing Integration Tests
 * 
 * End-to-end tests for batch processing functionality including
 * CLI integration, project detection, and workflow generation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIApplication } from '../../../src/cli/lib/cli-application';
import { Logger } from '../../../src/cli/lib/logger';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';

// Mock file system operations
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

// Mock path operations for consistent testing
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

describe('Batch Processing Integration', () => {
  let cliApp: CLIApplication;
  let mockLogger: Logger;
  let mockErrorHandler: ErrorHandler;

  beforeEach(() => {
    // Create mock dependencies
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn()
    } as any;

    mockErrorHandler = {
      handleCLIError: vi.fn().mockReturnValue({
        success: false,
        generatedFiles: [],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      })
    } as any;

    // Create CLI application
    cliApp = new CLIApplication(mockLogger, mockErrorHandler);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Line Integration', () => {
    it('should parse batch processing arguments correctly', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './project1',
        './project2',
        '--recursive',
        '--parallel',
        '--max-concurrency',
        '8',
        '--continue-on-error',
        '--project-pattern',
        'api-.*',
        '--exclude-patterns',
        'node_modules',
        'test*'
      ];

      // Mock successful file system operations
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      mockFs.readdir.mockResolvedValue([] as any); // No projects found

      // Act
      const result = await cliApp.run(args);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('No projects found in specified directories');
    });

    it('should handle invalid batch processing arguments', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './project1',
        '--max-concurrency',
        'invalid'
      ];

      // Act & Assert
      await expect(cliApp.run(args)).rejects.toThrow('Max concurrency must be a number between 1 and 32');
    });

    it('should reject interactive mode with parallel processing', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './project1',
        '--interactive',
        '--parallel'
      ];

      // Act & Assert
      await expect(cliApp.run(args)).rejects.toThrow('Interactive mode cannot be used with parallel processing');
    });
  });

  describe('Single vs Batch Mode Detection', () => {
    it('should use single mode when no directories specified', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        './README.md'
      ];

      // Mock README file exists
      mockFs.stat.mockResolvedValue({ isFile: () => true } as any);
      mockFs.readFile.mockResolvedValue('# Test Project\n\nA test project.');

      // Act
      const result = await cliApp.run(args);

      // Assert - Should attempt single project processing
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Executing single project generation'
      );
    });

    it('should use batch mode when directories specified', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './projects'
      ];

      // Mock directory exists but no projects found
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      mockFs.readdir.mockResolvedValue([] as any);

      // Act
      const result = await cliApp.run(args);

      // Assert - Should attempt batch processing
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Executing batch processing generation'
      );
    });
  });

  describe('End-to-End Batch Processing', () => {
    it('should process multiple projects successfully', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './projects',
        '--verbose'
      ];

      // Mock project structure
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          // Main directory contains two project subdirectories
          return [
            { name: 'project1', isDirectory: () => true },
            { name: 'project2', isDirectory: () => true }
          ] as any;
        } else {
          // Project directories contain README files
          return ['README.md', 'package.json'] as any;
        }
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({ name: 'test-project', scripts: { test: 'jest' } });
        }
        return '# Test Project\n\nA Node.js project with testing.';
      });

      // Act
      const result = await cliApp.run(args);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Batch processing completed: 2/2 projects successful');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Batch processing progress'),
        expect.any(Object)
      );
    });

    it('should handle recursive directory scanning', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './root',
        '--recursive'
      ];

      // Mock nested directory structure
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          // Root directory
          return [
            { name: 'level1', isDirectory: () => true },
            { name: 'other-file.txt', isDirectory: () => false }
          ] as any;
        } else if (callCount === 2) {
          // Level 1 directory
          return [
            { name: 'project1', isDirectory: () => true },
            { name: 'project2', isDirectory: () => true }
          ] as any;
        } else {
          // Project directories
          return ['README.md'] as any;
        }
      });

      mockFs.readFile.mockResolvedValue('# Test Project\n\nA test project.');

      // Act
      const result = await cliApp.run(args);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Batch processing completed: 2/2 projects successful');
    });

    it('should handle parallel processing', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './projects',
        '--parallel',
        '--max-concurrency',
        '2'
      ];

      // Mock multiple projects
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

      mockFs.readFile.mockResolvedValue('# Test Project\n\nA test project.');

      // Act
      const startTime = Date.now();
      const result = await cliApp.run(args);
      const endTime = Date.now();

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Batch processing completed: 4/4 projects successful');
      
      // Parallel processing should be faster than sequential
      // (This is a rough check - in real scenarios the difference would be more significant)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should continue processing on errors when configured', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './projects',
        '--continue-on-error'
      ];

      // Mock projects where some will fail
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'good-project', isDirectory: () => true },
            { name: 'bad-project', isDirectory: () => true }
          ] as any;
        } else if (path.includes('good-project')) {
          return ['README.md'] as any;
        } else {
          // bad-project has no README
          return ['package.json'] as any;
        }
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('good-project')) {
          return '# Good Project\n\nA working project.';
        }
        return JSON.stringify({ name: 'bad-project' });
      });

      // Act
      const result = await cliApp.run(args);

      // Assert
      expect(result.warnings).toContain('Batch processing completed: 1/2 projects successful');
      expect(result.warnings).toContain('1 projects failed during batch processing');
    });

    it('should apply project filtering patterns', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './projects',
        '--project-pattern',
        'api-.*'
      ];

      // Mock projects with different names
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'api-service', isDirectory: () => true },
            { name: 'web-frontend', isDirectory: () => true },
            { name: 'api-gateway', isDirectory: () => true }
          ] as any;
        } else {
          return ['README.md', 'package.json'] as any;
        }
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath.includes('package.json')) {
          const projectName = filePath.includes('api-service') ? 'api-service' :
                             filePath.includes('api-gateway') ? 'api-gateway' : 'web-frontend';
          return JSON.stringify({ name: projectName });
        }
        return '# Test Project\n\nA test project.';
      });

      // Act
      const result = await cliApp.run(args);

      // Assert
      expect(result.success).toBe(true);
      // Should only process projects matching the pattern (api-service, api-gateway)
      expect(result.warnings).toContain('Batch processing completed: 2/2 projects successful');
    });

    it('should exclude directories based on patterns', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './projects',
        '--recursive',
        '--exclude-patterns',
        'node_modules',
        'test*'
      ];

      // Mock directory structure with excluded directories
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [
            { name: 'good-project', isDirectory: () => true },
            { name: 'node_modules', isDirectory: () => true },
            { name: 'test-fixtures', isDirectory: () => true }
          ] as any;
        } else if (path.includes('good-project')) {
          return ['README.md'] as any;
        } else {
          // Excluded directories shouldn't be scanned
          throw new Error('Should not scan excluded directories');
        }
      });

      mockFs.readFile.mockResolvedValue('# Good Project\n\nA working project.');

      // Act
      const result = await cliApp.run(args);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Batch processing completed: 1/1 projects successful');
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './nonexistent'
      ];

      mockFs.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // Act
      const result = await cliApp.run(args);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('No projects found in specified directories');
    });

    it('should handle processing timeouts', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './projects'
      ];

      // Mock a project that will timeout
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [{ name: 'slow-project', isDirectory: () => true }] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      // Mock very slow file read to trigger timeout
      mockFs.readFile.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150000)); // 150 seconds
        return '# Slow Project\n\nThis takes too long.';
      });

      // Act
      const result = await cliApp.run(args);

      // Assert
      expect(result.warnings).toContain('1 projects failed during batch processing');
    });
  });

  describe('Progress Reporting', () => {
    it('should report progress when verbose mode is enabled', async () => {
      // Arrange
      const args = [
        'node',
        'readme-to-cicd',
        'generate',
        '--directories',
        './projects',
        '--verbose'
      ];

      // Mock single project
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);
      mockFs.realpath.mockImplementation(async (path: string) => path);
      
      let callCount = 0;
      mockFs.readdir.mockImplementation(async (path: string) => {
        callCount++;
        if (callCount === 1) {
          return [{ name: 'test-project', isDirectory: () => true }] as any;
        } else {
          return ['README.md'] as any;
        }
      });

      mockFs.readFile.mockResolvedValue('# Test Project\n\nA test project.');

      // Act
      await cliApp.run(args);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Batch processing progress',
        expect.objectContaining({
          phase: expect.any(String),
          totalProjects: expect.any(Number),
          processedProjects: expect.any(Number)
        })
      );
    });
  });
});