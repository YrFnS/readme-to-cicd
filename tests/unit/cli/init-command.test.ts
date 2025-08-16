/**
 * InitCommand Unit Tests
 * 
 * Tests for project initialization and setup functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InitCommand, InitCommandOptions, ProjectAnalysis } from '../../../src/cli/lib/init-command';
import { Logger } from '../../../src/cli/lib/logger';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';

// Mock fs module
vi.mock('fs/promises');

describe('InitCommand', () => {
  let initCommand: InitCommand;
  let mockLogger: Logger;
  let mockErrorHandler: ErrorHandler;
  let mockFs: typeof fs;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      setLevel: vi.fn()
    } as any;

    // Create mock error handler
    mockErrorHandler = {
      handleCLIError: vi.fn().mockReturnValue({
        success: false,
        generatedFiles: [],
        errors: [{ code: 'TEST_ERROR', message: 'Test error', category: 'processing', severity: 'error', suggestions: [] }],
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

    // Create InitCommand instance
    initCommand = new InitCommand(mockLogger, mockErrorHandler);

    // Setup fs mocks
    mockFs = fs as any;
    vi.mocked(mockFs.access).mockImplementation(() => Promise.reject(new Error('File not found')));
    vi.mocked(mockFs.readFile).mockResolvedValue('{}');
    vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
    vi.mocked(mockFs.readdir).mockResolvedValue([]);
    vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully initialize basic template', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('.readme-to-cicd.json');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '.readme-to-cicd.json',
        expect.stringContaining('"outputDirectory": ".github/workflows"'),
        'utf-8'
      );
    });

    it('should successfully initialize team template', async () => {
      const options: InitCommandOptions = {
        template: 'team',
        interactive: false
      };

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('.readme-to-cicd.json');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '.readme-to-cicd.json',
        expect.stringContaining('"requiredSecurityScans": true'),
        'utf-8'
      );
    });

    it('should successfully initialize enterprise template', async () => {
      const options: InitCommandOptions = {
        template: 'enterprise',
        interactive: false
      };

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('.readme-to-cicd.json');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '.readme-to-cicd.json',
        expect.stringContaining('"enforceBranchProtection": true'),
        'utf-8'
      );
    });

    it('should fail when config file exists and overwrite is false', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false,
        overwrite: false
      };

      // Mock existing config file - first call to access should succeed
      vi.mocked(mockFs.access).mockImplementation((filePath: any) => {
        if (filePath.includes('.readme-to-cicd.json')) {
          return Promise.resolve(undefined); // File exists
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await initCommand.execute(options);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Configuration file already exists');
    });

    it('should use custom output path when provided', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false,
        outputPath: './custom-config.json'
      };

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('./custom-config.json');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        './custom-config.json',
        expect.any(String),
        'utf-8'
      );
    });

    it('should handle unknown template gracefully', async () => {
      const options: InitCommandOptions = {
        template: 'unknown' as any,
        interactive: false
      };

      const result = await initCommand.execute(options);

      expect(result.success).toBe(false);
      expect(mockErrorHandler.handleCLIError).toHaveBeenCalled();
    });

    it('should create template directories for team template', async () => {
      const options: InitCommandOptions = {
        template: 'team',
        interactive: false
      };

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('ci-templates'),
        { recursive: true }
      );
    });

    it('should create template directories for enterprise template', async () => {
      const options: InitCommandOptions = {
        template: 'enterprise',
        interactive: false
      };

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('security-policies'),
        { recursive: true }
      );
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('compliance-templates'),
        { recursive: true }
      );
    });
  });

  describe('project analysis', () => {
    it('should detect Node.js project with package.json', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      // Mock package.json exists
      vi.mocked(mockFs.access).mockImplementation((filePath: any) => {
        if (filePath.includes('package.json')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('File not found'));
      });

      // Mock package.json content
      vi.mocked(mockFs.readFile).mockImplementation((filePath: any) => {
        if (filePath.includes('package.json')) {
          return Promise.resolve(JSON.stringify({
            name: 'test-project',
            dependencies: {
              'react': '^18.0.0',
              'express': '^4.18.0'
            }
          }));
        }
        return Promise.resolve('{}');
      });

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Project analysis completed',
        expect.objectContaining({
          projectAnalysis: expect.objectContaining({
            hasPackageJson: true,
            detectedLanguages: expect.arrayContaining(['javascript']),
            detectedFrameworks: expect.arrayContaining(['react', 'express'])
          })
        })
      );
    });

    it('should detect Git repository', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      // Mock .git directory exists
      vi.mocked(mockFs.access).mockImplementation((filePath: any) => {
        if (filePath.includes('.git')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('File not found'));
      });

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Project analysis completed',
        expect.objectContaining({
          projectAnalysis: expect.objectContaining({
            hasGitRepo: true
          })
        })
      );
    });

    it('should detect existing workflows', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      // Mock workflows directory with files
      vi.mocked(mockFs.access).mockImplementation((filePath: any) => {
        if (filePath.includes('.github/workflows')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('File not found'));
      });

      vi.mocked(mockFs.readdir).mockImplementation((dirPath: any) => {
        if (dirPath.includes('.github/workflows')) {
          return Promise.resolve(['ci.yml', 'cd.yml'] as any);
        }
        return Promise.resolve([]);
      });

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Project analysis completed',
        expect.objectContaining({
          projectAnalysis: expect.objectContaining({
            hasExistingWorkflows: true
          })
        })
      );
    });

    it('should detect multiple programming languages', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      // Mock directory with multiple language files
      vi.mocked(mockFs.readdir).mockResolvedValue([
        'index.ts',
        'main.py',
        'app.go',
        'README.md'
      ] as any);

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Project analysis completed',
        expect.objectContaining({
          projectAnalysis: expect.objectContaining({
            detectedLanguages: expect.arrayContaining(['typescript', 'python', 'go'])
          })
        })
      );
    });
  });

  describe('configuration generation', () => {
    it('should customize config based on project type', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      // Mock library project (no main field)
      vi.mocked(mockFs.access).mockImplementation((filePath: any) => {
        if (filePath.includes('package.json')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('File not found'));
      });

      vi.mocked(mockFs.readFile).mockImplementation((filePath: any) => {
        if (filePath.includes('package.json')) {
          return Promise.resolve(JSON.stringify({
            name: 'test-library',
            // No main field = library project
          }));
        }
        return Promise.resolve('{}');
      });

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      
      // Verify that CD workflow is not included for library projects
      const configCall = vi.mocked(mockFs.writeFile).mock.calls.find(call => 
        call[0] === '.readme-to-cicd.json'
      );
      expect(configCall).toBeDefined();
      
      const configContent = JSON.parse(configCall![1] as string);
      expect(configContent.defaults.workflowTypes).not.toContain('cd');
    });

    it('should enable backup for projects with existing workflows', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      // Mock existing workflows
      vi.mocked(mockFs.access).mockImplementation((filePath: any) => {
        if (filePath.includes('.github/workflows')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('File not found'));
      });

      vi.mocked(mockFs.readdir).mockImplementation((dirPath: any) => {
        if (dirPath.includes('.github/workflows')) {
          return Promise.resolve(['existing.yml'] as any);
        }
        return Promise.resolve([]);
      });

      const result = await initCommand.execute(options);

      expect(result.success).toBe(true);
      
      const configCall = vi.mocked(mockFs.writeFile).mock.calls.find(call => 
        call[0] === '.readme-to-cicd.json'
      );
      expect(configCall).toBeDefined();
      
      const configContent = JSON.parse(configCall![1] as string);
      expect(configContent.output.backupExisting).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      // Mock file write error
      vi.mocked(mockFs.writeFile).mockRejectedValueOnce(new Error('Permission denied'));

      const result = await initCommand.execute(options);

      expect(result.success).toBe(false);
      expect(mockErrorHandler.handleCLIError).toHaveBeenCalled();
    });

    it('should handle project analysis errors gracefully', async () => {
      const options: InitCommandOptions = {
        template: 'basic',
        interactive: false
      };

      // Mock readdir error
      vi.mocked(mockFs.readdir).mockRejectedValueOnce(new Error('Access denied'));

      const result = await initCommand.execute(options);

      // Should still succeed even if analysis partially fails
      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Project analysis partially failed',
        expect.any(Object)
      );
    });
  });
});