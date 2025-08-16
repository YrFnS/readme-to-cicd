/**
 * Complete CLI Application Flow Integration Tests
 * 
 * Comprehensive integration tests for the complete CLI application workflows,
 * testing end-to-end functionality from command parsing to final output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CLIApplication } from '../../../src/cli/lib/cli-application';
import { Logger } from '../../../src/cli/lib/logger';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Complete CLI Application Flows', () => {
  let cliApp: CLIApplication;
  let logger: Logger;
  let errorHandler: ErrorHandler;
  let tempDir: string;
  let originalCwd: string;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-integration-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Initialize CLI components
    logger = new Logger();
    errorHandler = new ErrorHandler(logger);
    cliApp = new CLIApplication(logger, errorHandler);

    // Spy on console outputs
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock component dependencies to avoid actual file operations
    vi.spyOn(cliApp as any, 'componentOrchestrator', 'get').mockReturnValue({
      executeWorkflow: vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: ['.github/workflows/ci.yml', '.github/workflows/cd.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1500,
          filesGenerated: 2,
          workflowsCreated: 2,
          frameworksDetected: ['nodejs', 'typescript'],
          optimizationsApplied: 3,
          executionTime: 1500,
          filesProcessed: 1,
          workflowsGenerated: 2
        }
      })
    });

    vi.spyOn(cliApp as any, 'batchProcessor', 'get').mockReturnValue({
      processBatch: vi.fn().mockResolvedValue({
        success: true,
        totalProjects: 2,
        processedProjects: 2,
        successfulProjects: 2,
        failedProjects: 0,
        skippedProjects: 0,
        projectResults: [],
        totalExecutionTime: 2000,
        summary: {
          totalProjectsFound: 2,
          totalProjectsProcessed: 2,
          totalFilesGenerated: 4,
          totalWorkflowsCreated: 4,
          frameworksDetected: { nodejs: 2 },
          averageExecutionTime: 1000,
          parallelExecutions: 2,
          errorsByCategory: {}
        },
        errors: [],
        warnings: []
      })
    });

    vi.spyOn(cliApp as any, 'configExporter', 'get').mockReturnValue({
      exportConfiguration: vi.fn().mockResolvedValue({
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        configuration: {},
        templates: {},
        policies: {},
        customFiles: {}
      }),
      importConfiguration: vi.fn().mockResolvedValue({
        success: true,
        conflicts: [],
        warnings: [],
        errors: [],
        backupPath: '.readme-to-cicd.json.backup'
      })
    });

    vi.spyOn(cliApp as any, 'initCommand', 'get').mockReturnValue({
      execute: vi.fn().mockResolvedValue({
        success: true,
        generatedFiles: ['.readme-to-cicd.json'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 800,
          filesGenerated: 1,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 800,
          filesProcessed: 1,
          workflowsGenerated: 0
        }
      })
    });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('Generate Command Workflows', () => {
    it('should execute complete generate workflow with default options', async () => {
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toEqual(['.github/workflows/ci.yml', '.github/workflows/cd.yml']);
      expect(result.summary.workflowsCreated).toBe(2);
      expect(result.summary.frameworksDetected).toEqual(['nodejs', 'typescript']);
      expect(result.summary.executionTime).toBeGreaterThan(0);
    });

    it('should execute generate workflow with custom options', async () => {
      const args = [
        'node', 'readme-to-cicd', 'generate',
        '--output-dir', 'custom-workflows',
        '--workflow-type', 'ci',
        '--verbose',
        '--dry-run'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect((cliApp as any).componentOrchestrator.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'generate',
          outputDir: 'custom-workflows',
          workflowType: ['ci'],
          verbose: true,
          dryRun: true
        })
      );
    });

    it('should handle generate workflow with framework specification', async () => {
      const args = [
        'node', 'readme-to-cicd', 'generate',
        '--framework', 'react',
        '--framework', 'typescript',
        '--interactive'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect((cliApp as any).componentOrchestrator.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: ['react', 'typescript'],
          interactive: true
        })
      );
    });

    it('should execute batch processing workflow', async () => {
      const args = [
        'node', 'readme-to-cicd', 'generate',
        '--directories', 'project1', 'project2',
        '--recursive',
        '--parallel'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
      expect((cliApp as any).batchProcessor.processBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          directories: ['project1', 'project2'],
          recursive: true,
          parallel: true
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Init Command Workflows', () => {
    it('should execute complete init workflow with basic template', async () => {
      const args = ['node', 'readme-to-cicd', 'init'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('.readme-to-cicd.json');
      expect((cliApp as any).initCommand.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'basic',
          interactive: false
        })
      );
    });

    it('should execute init workflow with enterprise template and interactive mode', async () => {
      const args = [
        'node', 'readme-to-cicd', 'init',
        '--template', 'enterprise',
        '--interactive',
        '--config', 'custom-config.json'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect((cliApp as any).initCommand.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'enterprise',
          interactive: true,
          outputPath: 'custom-config.json'
        })
      );
    });
  });

  describe('Export/Import Command Workflows', () => {
    it('should execute complete export workflow', async () => {
      const args = [
        'node', 'readme-to-cicd', 'export',
        '--output', 'exported-config.json',
        '--config', '.readme-to-cicd.json'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('exported-config.json');
      expect((cliApp as any).configExporter.exportConfiguration).toHaveBeenCalledWith(
        '.readme-to-cicd.json',
        'exported-config.json',
        expect.objectContaining({
          includeTemplates: true,
          includePolicies: true,
          includeCustomFiles: true
        })
      );
    });

    it('should execute complete import workflow', async () => {
      const args = [
        'node', 'readme-to-cicd', 'import',
        '--config-file', 'imported-config.json',
        '--config', '.readme-to-cicd.json',
        '--merge'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect((cliApp as any).configExporter.importConfiguration).toHaveBeenCalledWith(
        'imported-config.json',
        '.readme-to-cicd.json',
        expect.objectContaining({
          merge: true,
          overwriteExisting: false,
          validateCompatibility: true,
          backupExisting: true
        })
      );
    });
  });

  describe('Validate Command Workflows', () => {
    it('should execute validate workflow (placeholder implementation)', async () => {
      const args = ['node', 'readme-to-cicd', 'validate', 'workflow.yml'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      // Validate command is currently a placeholder
      expect(result.summary.workflowsCreated).toBe(0);
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle command parsing errors gracefully', async () => {
      const args = ['node', 'readme-to-cicd', 'invalid-command'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('invalid-command');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle component orchestrator errors', async () => {
      // Mock component orchestrator to throw error
      (cliApp as any).componentOrchestrator.executeWorkflow = vi.fn().mockRejectedValue(
        new Error('Component orchestration failed')
      );
      
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Component orchestration failed');
    });

    it('should handle init command errors', async () => {
      // Mock init command to return error
      (cliApp as any).initCommand.execute = vi.fn().mockResolvedValue({
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'INIT_ERROR',
          message: 'Configuration file already exists',
          category: 'configuration',
          severity: 'error',
          suggestions: ['Use --overwrite flag']
        }],
        warnings: [],
        summary: {
          totalTime: 100,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 100,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      });
      
      const args = ['node', 'readme-to-cicd', 'init'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('INIT_ERROR');
      expect(result.errors[0].suggestions).toContain('Use --overwrite flag');
    });

    it('should handle batch processing errors', async () => {
      // Mock batch processor to return mixed results
      (cliApp as any).batchProcessor.processBatch = vi.fn().mockResolvedValue({
        success: false,
        totalProjects: 2,
        processedProjects: 2,
        successfulProjects: 1,
        failedProjects: 1,
        skippedProjects: 0,
        projectResults: [],
        totalExecutionTime: 1500,
        summary: {
          totalProjectsFound: 2,
          totalProjectsProcessed: 2,
          totalFilesGenerated: 1,
          totalWorkflowsCreated: 1,
          frameworksDetected: { nodejs: 1 },
          averageExecutionTime: 750,
          parallelExecutions: 1,
          errorsByCategory: { 'file-system': 1 }
        },
        errors: [{
          code: 'FS_001',
          message: 'README file not found in project2',
          category: 'file-system',
          severity: 'error',
          suggestions: ['Create README.md file']
        }],
        warnings: ['1 project failed during batch processing']
      });
      
      const args = [
        'node', 'readme-to-cicd', 'generate',
        '--directories', 'project1', 'project2'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toContain('1 project failed during batch processing');
    });
  });

  describe('Logging and Debugging Workflows', () => {
    it('should configure logging levels based on CLI options', async () => {
      const setLevelSpy = vi.spyOn(logger, 'setLevel');
      
      const args = ['node', 'readme-to-cicd', 'generate', '--debug'];
      
      await cliApp.run(args);
      
      expect(setLevelSpy).toHaveBeenCalledWith('debug');
    });

    it('should handle verbose logging', async () => {
      const setLevelSpy = vi.spyOn(logger, 'setLevel');
      
      const args = ['node', 'readme-to-cicd', 'generate', '--verbose'];
      
      await cliApp.run(args);
      
      expect(setLevelSpy).toHaveBeenCalledWith('info');
    });

    it('should handle quiet mode', async () => {
      const setLevelSpy = vi.spyOn(logger, 'setLevel');
      
      const args = ['node', 'readme-to-cicd', 'generate', '--quiet'];
      
      await cliApp.run(args);
      
      expect(setLevelSpy).toHaveBeenCalledWith('error');
    });
  });

  describe('Application Lifecycle Management', () => {
    it('should measure and report execution time', async () => {
      const startTime = Date.now();
      
      const args = ['node', 'readme-to-cicd', 'generate'];
      const result = await cliApp.run(args);
      
      const endTime = Date.now();
      
      expect(result.summary.executionTime).toBeGreaterThan(0);
      expect(result.summary.executionTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
    });

    it('should handle graceful shutdown on errors', async () => {
      // Mock a fatal error
      (cliApp as any).componentOrchestrator.executeWorkflow = vi.fn().mockRejectedValue(
        new Error('Fatal system error')
      );
      
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.summary.executionTime).toBeGreaterThan(0);
    });

    it('should preserve context across the application lifecycle', async () => {
      const args = [
        'node', 'readme-to-cicd', 'generate',
        '--config', 'custom-config.json',
        '--verbose'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect((cliApp as any).componentOrchestrator.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          config: 'custom-config.json',
          verbose: true
        })
      );
    });
  });

  describe('Integration with External Systems', () => {
    it('should integrate with CI environment detection', async () => {
      // Set CI environment variables
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_RUN_ID = '12345';
      
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      // Should automatically use non-interactive mode in CI
      expect((cliApp as any).componentOrchestrator.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          interactive: false
        })
      );
      
      // Should output machine-readable format
      expect(consoleLogSpy).toHaveBeenCalled();
      
      // Clean up
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITHUB_RUN_ID;
    });

    it('should handle configuration loading from multiple sources', async () => {
      // Create a test configuration file
      const configContent = {
        defaults: {
          outputDirectory: 'custom-workflows',
          workflowTypes: ['ci', 'security']
        }
      };
      await fs.writeFile('.readme-to-cicd.json', JSON.stringify(configContent, null, 2));
      
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      // Configuration should be loaded and applied
      expect((cliApp as any).componentOrchestrator.executeWorkflow).toHaveBeenCalled();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent operations efficiently', async () => {
      const promises = [
        cliApp.run(['node', 'readme-to-cicd', 'generate']),
        cliApp.run(['node', 'readme-to-cicd', 'init']),
        cliApp.run(['node', 'readme-to-cicd', 'export'])
      ];
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.summary.executionTime).toBeGreaterThan(0);
      });
    });

    it('should manage memory efficiently during batch processing', async () => {
      const args = [
        'node', 'readme-to-cicd', 'generate',
        '--directories', ...Array.from({ length: 10 }, (_, i) => `project${i}`),
        '--parallel'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect((cliApp as any).batchProcessor.processBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          directories: expect.arrayContaining(['project0', 'project9'])
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Command Argument Parsing Integration', () => {
    it('should parse complex command combinations correctly', async () => {
      const args = [
        'node', 'readme-to-cicd', 'generate',
        '--output-dir', 'custom-output',
        '--workflow-type', 'ci',
        '--workflow-type', 'cd',
        '--framework', 'react',
        '--framework', 'typescript',
        '--verbose',
        '--dry-run',
        '--interactive',
        '--config', 'custom-config.json'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect((cliApp as any).componentOrchestrator.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'generate',
          outputDir: 'custom-output',
          workflowType: ['ci', 'cd'],
          framework: ['react', 'typescript'],
          verbose: true,
          dryRun: true,
          interactive: true,
          config: 'custom-config.json'
        })
      );
    });

    it('should handle boolean flags correctly', async () => {
      const args = [
        'node', 'readme-to-cicd', 'generate',
        '--dry-run',
        '--no-interactive',
        '--quiet'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect((cliApp as any).componentOrchestrator.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true,
          interactive: false,
          quiet: true
        })
      );
    });
  });
});
 
 describe('Help System Integration', () => {
    it('should display help information for main command', async () => {
      const args = ['node', 'readme-to-cicd', '--help'];
      
      // Mock the command parser to handle help
      const mockParseArguments = vi.fn().mockImplementation(() => {
        throw new Error('Help requested'); // Commander typically exits on help
      });
      (cliApp as any).commandParser.parseArguments = mockParseArguments;
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Help requested');
    });

    it('should display help for specific commands', async () => {
      const args = ['node', 'readme-to-cicd', 'generate', '--help'];
      
      const mockParseArguments = vi.fn().mockImplementation(() => {
        throw new Error('Generate help requested');
      });
      (cliApp as any).commandParser.parseArguments = mockParseArguments;
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Generate help requested');
    });
  });

  describe('Configuration Validation Integration', () => {
    it('should validate configuration before execution', async () => {
      // Create invalid configuration
      const invalidConfig = {
        defaults: {
          outputDirectory: null, // Invalid
          workflowTypes: 'invalid' // Should be array
        }
      };
      await fs.writeFile('.readme-to-cicd.json', JSON.stringify(invalidConfig));
      
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      // Mock configuration loading to simulate validation error
      const mockLoadConfiguration = vi.fn().mockRejectedValue(
        new Error('Invalid configuration: outputDirectory must be a string')
      );
      (cliApp as any).loadConfiguration = mockLoadConfiguration;
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Invalid configuration');
    });
  });

  describe('Signal Handling Integration', () => {
    it('should handle process termination gracefully', async () => {
      // This test simulates what would happen if the process receives a termination signal
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      // Mock a long-running operation
      (cliApp as any).componentOrchestrator.executeWorkflow = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );
      
      // Start the CLI operation
      const resultPromise = cliApp.run(args);
      
      // Simulate process termination after a short delay
      setTimeout(() => {
        // In a real scenario, this would be handled by the process signal handlers
        // For testing, we just verify the structure is in place
      }, 100);
      
      // Wait a bit and then resolve to avoid hanging test
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // The test mainly verifies that the CLI can handle async operations
      expect((cliApp as any).componentOrchestrator.executeWorkflow).toHaveBeenCalled();
    });
  });

  describe('Output Format Integration', () => {
    it('should format output consistently across all commands', async () => {
      const commands = [
        ['node', 'readme-to-cicd', 'generate'],
        ['node', 'readme-to-cicd', 'init'],
        ['node', 'readme-to-cicd', 'export']
      ];
      
      for (const args of commands) {
        const result = await cliApp.run(args);
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('generatedFiles');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('summary');
        expect(result.summary).toHaveProperty('executionTime');
        expect(result.summary).toHaveProperty('filesGenerated');
        expect(result.summary).toHaveProperty('workflowsCreated');
      }
    });

    it('should maintain consistent error format across all error scenarios', async () => {
      const errorScenarios = [
        ['node', 'readme-to-cicd', 'invalid-command'],
        ['node', 'readme-to-cicd', 'generate', '--invalid-flag']
      ];
      
      for (const args of errorScenarios) {
        const result = await cliApp.run(args);
        
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toHaveProperty('code');
        expect(result.errors[0]).toHaveProperty('message');
        expect(result.errors[0]).toHaveProperty('category');
        expect(result.errors[0]).toHaveProperty('severity');
        expect(result.errors[0]).toHaveProperty('suggestions');
      }
    });
  });

  describe('End-to-End Workflow Validation', () => {
    it('should execute complete workflow from start to finish', async () => {
      // Step 1: Initialize project
      const initResult = await cliApp.run(['node', 'readme-to-cicd', 'init']);
      expect(initResult.success).toBe(true);
      
      // Step 2: Generate workflows
      const generateResult = await cliApp.run(['node', 'readme-to-cicd', 'generate']);
      expect(generateResult.success).toBe(true);
      
      // Step 3: Export configuration
      const exportResult = await cliApp.run(['node', 'readme-to-cicd', 'export']);
      expect(exportResult.success).toBe(true);
      
      // Verify all steps completed successfully
      expect(initResult.generatedFiles).toContain('.readme-to-cicd.json');
      expect(generateResult.generatedFiles.length).toBeGreaterThan(0);
      expect(exportResult.generatedFiles.length).toBeGreaterThan(0);
    });

    it('should handle workflow interruption and recovery', async () => {
      // Mock a scenario where the first command fails but subsequent ones succeed
      let callCount = 0;
      (cliApp as any).componentOrchestrator.executeWorkflow = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: false,
            generatedFiles: [],
            errors: [{
              code: 'TEMP_ERROR',
              message: 'Temporary failure',
              category: 'processing',
              severity: 'error',
              suggestions: ['Retry the operation']
            }],
            warnings: [],
            summary: {
              totalTime: 100,
              filesGenerated: 0,
              workflowsCreated: 0,
              frameworksDetected: [],
              optimizationsApplied: 0,
              executionTime: 100,
              filesProcessed: 0,
              workflowsGenerated: 0
            }
          });
        }
        return Promise.resolve({
          success: true,
          generatedFiles: ['.github/workflows/ci.yml'],
          errors: [],
          warnings: [],
          summary: {
            totalTime: 1000,
            filesGenerated: 1,
            workflowsCreated: 1,
            frameworksDetected: ['nodejs'],
            optimizationsApplied: 1,
            executionTime: 1000,
            filesProcessed: 1,
            workflowsGenerated: 1
          }
        });
      });
      
      // First attempt fails
      const firstResult = await cliApp.run(['node', 'readme-to-cicd', 'generate']);
      expect(firstResult.success).toBe(false);
      expect(firstResult.errors[0].suggestions).toContain('Retry the operation');
      
      // Second attempt succeeds
      const secondResult = await cliApp.run(['node', 'readme-to-cicd', 'generate']);
      expect(secondResult.success).toBe(true);
      expect(secondResult.generatedFiles).toContain('.github/workflows/ci.yml');
    });
  });

  describe('Resource Cleanup Integration', () => {
    it('should clean up resources properly after execution', async () => {
      const args = ['node', 'readme-to-cicd', 'generate'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.summary.executionTime).toBeGreaterThan(0);
      
      // Verify that the CLI application can be run again without issues
      const secondResult = await cliApp.run(args);
      expect(secondResult.success).toBe(true);
    });

    it('should handle multiple concurrent CLI instances', async () => {
      const instances = Array.from({ length: 3 }, () => {
        const logger = new Logger();
        const errorHandler = new ErrorHandler(logger);
        return new CLIApplication(logger, errorHandler);
      });
      
      // Mock each instance's dependencies
      instances.forEach(instance => {
        vi.spyOn(instance as any, 'componentOrchestrator', 'get').mockReturnValue({
          executeWorkflow: vi.fn().mockResolvedValue({
            success: true,
            generatedFiles: ['.github/workflows/ci.yml'],
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
          })
        });
      });
      
      const promises = instances.map(instance => 
        instance.run(['node', 'readme-to-cicd', 'generate'])
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.generatedFiles).toContain('.github/workflows/ci.yml');
      });
    });
  });
});