/**
 * CLI CI Integration Tests
 * 
 * Integration tests for CLI application with CI/CD environment support.
 * Tests the complete workflow from command parsing to CI-specific output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CLIApplication } from '../../src/cli/lib/cli-application';
import { Logger } from '../../src/cli/lib/logger';
import { ErrorHandler } from '../../src/cli/lib/error-handler';

describe('CLI CI Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let cliApp: CLIApplication;
  let logger: Logger;
  let errorHandler: ErrorHandler;
  let consoleLogSpy: any;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Clear CI environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('CI') || key.startsWith('GITHUB_') || key.startsWith('GITLAB_')) {
        delete process.env[key];
      }
    });

    logger = new Logger();
    errorHandler = new ErrorHandler();
    cliApp = new CLIApplication(logger, errorHandler);
    
    // Spy on console.log to capture machine-readable output
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
  });

  describe('GitHub Actions Environment', () => {
    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_RUN_ID = '12345';
      process.env.GITHUB_REF_NAME = 'main';
      process.env.GITHUB_SHA = 'abc123def456';
    });

    it('should automatically detect CI environment and use non-interactive mode', async () => {
      const args = ['node', 'readme-to-cicd', 'generate', '--verbose'];
      
      // Mock the component orchestrator to avoid actual file operations
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: ['ci.yml', 'cd.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1500,
          filesGenerated: 2,
          workflowsCreated: 2,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 1,
          executionTime: 1500,
          filesProcessed: 1,
          workflowsGenerated: 2
        }
      });

      // Access private property for testing
      (cliApp as any).componentOrchestrator.executeWorkflow = mockExecuteWorkflow;

      const result = await cliApp.run(args);

      expect(result.success).toBe(true);
      expect(mockExecuteWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          interactive: false, // Should be forced to false in CI
          verbose: true
        })
      );

      // Should output machine-readable format
      expect(consoleLogSpy).toHaveBeenCalled();
      const outputCall = consoleLogSpy.mock.calls.find(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('"provider":"github"')
      );
      expect(outputCall).toBeDefined();
    });

    it('should load configuration from CI environment variables', async () => {
      process.env.README_TO_CICD_OUTPUT_DIR = '.github/workflows';
      process.env.README_TO_CICD_WORKFLOW_TYPES = 'ci,cd';
      process.env.README_TO_CICD_AUTO_COMMIT = 'true';

      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1000,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 1000,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      });

      (cliApp as any).componentOrchestrator.executeWorkflow = mockExecuteWorkflow;

      const result = await cliApp.run(args);

      expect(result.success).toBe(true);
      expect(mockExecuteWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          outputDir: '.github/workflows',
          workflowType: ['ci', 'cd']
        })
      );
    });

    it('should output JSON format by default in CI', async () => {
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 800,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 0,
          executionTime: 800,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      });

      (cliApp as any).componentOrchestrator.executeWorkflow = mockExecuteWorkflow;

      await cliApp.run(args);

      expect(consoleLogSpy).toHaveBeenCalled();
      const jsonOutput = consoleLogSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.format === 'json' && parsed.metadata.environment.provider === 'github';
        } catch {
          return false;
        }
      });
      expect(jsonOutput).toBeDefined();
    });

    it('should output XML format when requested', async () => {
      process.env.README_TO_CICD_OUTPUT_FORMAT = 'xml';
      
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 600,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 600,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      });

      (cliApp as any).componentOrchestrator.executeWorkflow = mockExecuteWorkflow;

      await cliApp.run(args);

      expect(consoleLogSpy).toHaveBeenCalled();
      const xmlOutput = consoleLogSpy.mock.calls.find(call => 
        call[0] && call[0].includes('<?xml version="1.0"') && call[0].includes('<format>xml</format>')
      );
      expect(xmlOutput).toBeDefined();
    });
  });

  describe('Explicit CI Mode with --ci Flag', () => {
    it('should enable CI mode with --ci flag even in non-CI environment', async () => {
      const args = ['node', 'readme-to-cicd', 'generate', '--ci'];
      
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1200,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['python'],
          optimizationsApplied: 2,
          executionTime: 1200,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      });

      (cliApp as any).componentOrchestrator.executeWorkflow = mockExecuteWorkflow;

      const result = await cliApp.run(args);

      expect(result.success).toBe(true);
      
      // Should output machine-readable format even in non-CI environment
      expect(consoleLogSpy).toHaveBeenCalled();
      const jsonOutput = consoleLogSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.format === 'json';
        } catch {
          return false;
        }
      });
      expect(jsonOutput).toBeDefined();
    });

    it('should combine --ci flag with other options', async () => {
      const args = ['node', 'readme-to-cicd', 'generate', '--ci', '--verbose', '--dry-run'];
      
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: ['Dry run mode - no files were created'],
        summary: {
          totalTime: 500,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 0,
          executionTime: 500,
          filesProcessed: 1,
          workflowsGenerated: 0
        }
      });

      (cliApp as any).componentOrchestrator.executeWorkflow = mockExecuteWorkflow;

      const result = await cliApp.run(args);

      expect(result.success).toBe(true);
      expect(mockExecuteWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          ci: true,
          verbose: true,
          dryRun: true
        })
      );
    });
  });

  describe('GitLab CI Environment', () => {
    beforeEach(() => {
      process.env.GITLAB_CI = 'true';
      process.env.CI_PIPELINE_ID = '67890';
      process.env.CI_COMMIT_REF_NAME = 'feature-branch';
      process.env.CI_COMMIT_SHA = 'def456ghi789';
    });

    it('should detect GitLab CI and include environment info in output', async () => {
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: ['gitlab-ci.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 900,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['docker'],
          optimizationsApplied: 1,
          executionTime: 900,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      });

      (cliApp as any).componentOrchestrator.executeWorkflow = mockExecuteWorkflow;

      await cliApp.run(args);

      expect(consoleLogSpy).toHaveBeenCalled();
      const gitlabOutput = consoleLogSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.metadata.environment.provider === 'gitlab' &&
                 parsed.metadata.environment.buildId === '67890';
        } catch {
          return false;
        }
      });
      expect(gitlabOutput).toBeDefined();
    });
  });

  describe('Error Handling in CI Environment', () => {
    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
    });

    it('should handle errors gracefully and provide appropriate exit codes', async () => {
      const args = ['node', 'readme-to-cicd', 'generate', 'nonexistent-readme.md'];
      
      const mockExecuteWorkflow = vi.fn().mockResolvedValue({
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'FS_001',
          message: 'README file not found',
          category: 'file-system' as const,
          severity: 'error' as const,
          suggestions: ['Check if the README file exists', 'Use a different path']
        }],
        warnings: [],
        summary: {
          totalTime: 200,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 200,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      });

      (cliApp as any).componentOrchestrator.executeWorkflow = mockExecuteWorkflow;

      const result = await cliApp.run(args);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].category).toBe('file-system');

      // Should still output machine-readable format for errors
      expect(consoleLogSpy).toHaveBeenCalled();
      const errorOutput = consoleLogSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.result.success === false && parsed.result.errors.length > 0;
        } catch {
          return false;
        }
      });
      expect(errorOutput).toBeDefined();
    });

    it('should handle CLI parsing errors in CI environment', async () => {
      const args = ['node', 'readme-to-cicd', 'invalid-command'];
      
      const result = await cliApp.run(args);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('invalid-command');
    });
  });

  describe('Batch Processing in CI Environment', () => {
    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
    });

    it('should handle batch processing with CI optimizations', async () => {
      const args = ['node', 'readme-to-cicd', 'generate', '--directories', 'project1', 'project2', '--parallel'];
      
      const mockProcessBatch = vi.fn().mockResolvedValue({
        success: true,
        totalProjects: 2,
        processedProjects: 2,
        successfulProjects: 2,
        failedProjects: 0,
        skippedProjects: 0,
        projectResults: [
          {
            project: { path: 'project1', name: 'project1', readmePath: 'project1/README.md', hasPackageJson: true, hasGitRepo: true, estimatedComplexity: 'medium' as const },
            success: true,
            result: {
              success: true,
              generatedFiles: ['project1/.github/workflows/ci.yml'],
              errors: [],
              warnings: [],
              summary: {
                totalTime: 800,
                filesGenerated: 1,
                workflowsCreated: 1,
                frameworksDetected: ['nodejs'],
                optimizationsApplied: 1,
                executionTime: 800,
                filesProcessed: 1,
                workflowsGenerated: 1
              }
            },
            executionTime: 800
          },
          {
            project: { path: 'project2', name: 'project2', readmePath: 'project2/README.md', hasPackageJson: true, hasGitRepo: true, estimatedComplexity: 'low' as const },
            success: true,
            result: {
              success: true,
              generatedFiles: ['project2/.github/workflows/ci.yml'],
              errors: [],
              warnings: [],
              summary: {
                totalTime: 600,
                filesGenerated: 1,
                workflowsCreated: 1,
                frameworksDetected: ['python'],
                optimizationsApplied: 0,
                executionTime: 600,
                filesProcessed: 1,
                workflowsGenerated: 1
              }
            },
            executionTime: 600
          }
        ],
        totalExecutionTime: 1400,
        summary: {
          totalProjectsFound: 2,
          totalProjectsProcessed: 2,
          totalFilesGenerated: 2,
          totalWorkflowsCreated: 2,
          frameworksDetected: { nodejs: 1, python: 1 },
          averageExecutionTime: 700,
          parallelExecutions: 2,
          errorsByCategory: {}
        },
        errors: [],
        warnings: []
      });

      (cliApp as any).batchProcessor.processBatch = mockProcessBatch;

      const result = await cliApp.run(args);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(2);
      expect(mockProcessBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          directories: ['project1', 'project2'],
          parallel: true
        }),
        expect.objectContaining({
          interactive: false, // Should be false in CI
          parallel: true
        }),
        expect.any(Function) // progress callback
      );

      // Should output batch processing results in machine-readable format
      expect(consoleLogSpy).toHaveBeenCalled();
      const batchOutput = consoleLogSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.result.generatedFiles.length === 2;
        } catch {
          return false;
        }
      });
      expect(batchOutput).toBeDefined();
    });
  });

  describe('Configuration Export/Import in CI', () => {
    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
    });

    it('should handle configuration export with CI metadata', async () => {
      const args = ['node', 'readme-to-cicd', 'export', '--output', 'ci-config.json'];
      
      const mockExportConfiguration = vi.fn().mockResolvedValue({
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        configuration: {},
        templates: {},
        policies: {},
        customFiles: {}
      });

      (cliApp as any).configExporter.exportConfiguration = mockExportConfiguration;

      const result = await cliApp.run(args);

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('ci-config.json');

      // Should include CI environment info in machine-readable output
      expect(consoleLogSpy).toHaveBeenCalled();
      const exportOutput = consoleLogSpy.mock.calls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.metadata.environment.provider === 'github' &&
                 parsed.result.generatedFiles.includes('ci-config.json');
        } catch {
          return false;
        }
      });
      expect(exportOutput).toBeDefined();
    });
  });
});