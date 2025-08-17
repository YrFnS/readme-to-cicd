/**
 * CLI Integration Service
 * 
 * Main service for interfacing with the README to CI/CD CLI components.
 * Orchestrates process execution, data transformation, and progress reporting.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ProcessExecutor, ProcessExecutorOptions } from './ProcessExecutor';
import { DataTransformer } from './DataTransformer';
import { ProgressReporter, ProgressReporterOptions } from './ProgressReporter';
import {
  CLIIntegrationOptions,
  CLIExecutionResult,
  CLIGenerationRequest,
  CLIGenerationResult,
  WorkflowConfiguration,
  ExtensionConfiguration,
  CLIProgressReport,
  DetectedFramework,
  WorkflowPreview,
  PreviewData
} from './types';

export class CLIIntegration {
  private readonly processExecutor: ProcessExecutor;
  private readonly dataTransformer: DataTransformer;
  private readonly progressReporter: ProgressReporter;
  private readonly logger: vscode.LogOutputChannel;
  private readonly options: CLIIntegrationOptions;

  constructor(options: CLIIntegrationOptions = {}) {
    this.options = {
      timeout: 60000, // 60 seconds default
      enableLogging: true,
      ...options
    };

    this.logger = vscode.window.createOutputChannel('README to CI/CD - CLI Integration', { log: true });

    // Initialize components
    const processOptions: ProcessExecutorOptions = {
      defaultTimeout: this.options.timeout,
      enableLogging: this.options.enableLogging,
      workingDirectory: this.options.workingDirectory
    };

    const progressOptions: ProgressReporterOptions = {
      showInStatusBar: true,
      showNotifications: true,
      enableDetailedLogging: this.options.enableLogging,
      progressLocation: vscode.ProgressLocation.Notification
    };

    this.processExecutor = new ProcessExecutor(processOptions);
    this.dataTransformer = new DataTransformer();
    this.progressReporter = new ProgressReporter(progressOptions);

    this.logger.info('CLI Integration initialized', {
      timeout: this.options.timeout,
      enableLogging: this.options.enableLogging,
      workingDirectory: this.options.workingDirectory
    });
  }

  /**
   * Generate workflows using the CLI
   */
  async generateWorkflows(
    readmePath: string,
    configuration: WorkflowConfiguration,
    outputDirectory?: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<CLIGenerationResult> {
    this.logger.info('Starting workflow generation', {
      readmePath,
      outputDirectory,
      workflowTypes: configuration.workflowTypes
    });

    try {
      // Get extension configuration
      const extensionConfigResult = this.dataTransformer.transformVSCodeSettingsToConfig();
      if (!extensionConfigResult.success || !extensionConfigResult.data) {
        throw new Error('Failed to load extension configuration');
      }

      const extensionConfig = extensionConfigResult.data;

      // Determine output directory
      const targetOutputDir = outputDirectory || 
        path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(), extensionConfig.defaultOutputDirectory);

      // Transform configuration to CLI arguments
      const argsResult = this.dataTransformer.transformConfigurationToCLIArgs(
        configuration,
        readmePath,
        targetOutputDir,
        false // Not a dry run
      );

      if (!argsResult.success || !argsResult.data) {
        throw new Error(`Configuration transformation failed: ${argsResult.errors.join(', ')}`);
      }

      // Start progress reporting
      const progressCallback = await this.progressReporter.startProgress(
        'Generating CI/CD Workflows',
        true
      );

      // Execute CLI command
      const executionResult = await this.processExecutor.executeCLICommand(
        'generate',
        argsResult.data.slice(1), // Remove 'generate' command
        path.dirname(readmePath),
        progressCallback,
        cancellationToken
      );

      // Transform CLI result
      const resultTransformation = this.dataTransformer.transformCLIResultToExtension(
        executionResult.stdout,
        executionResult.stderr,
        executionResult.exitCode
      );

      if (!resultTransformation.success || !resultTransformation.data) {
        throw new Error(`Result transformation failed: ${resultTransformation.errors.join(', ')}`);
      }

      const result = resultTransformation.data;

      // Log completion
      this.logger.info('Workflow generation completed', {
        success: result.success,
        filesGenerated: result.generatedFiles.length,
        executionTime: executionResult.executionTime
      });

      // Show completion notification
      if (result.success) {
        this.progressReporter.showSuccess(
          `Generated ${result.generatedFiles.length} workflow file(s)`,
          ['Open Workflows', 'View Files']
        );
      } else {
        this.progressReporter.showError(
          'Workflow generation failed',
          ['View Details', 'Retry']
        );
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Workflow generation failed', { error: errorMessage });

      this.progressReporter.showError(
        `Workflow generation failed: ${errorMessage}`,
        ['View Logs', 'Retry']
      );

      // Return error result
      return {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'GENERATION_FAILED',
          message: errorMessage,
          category: 'processing',
          severity: 'error',
          suggestions: ['Check the README file format', 'Verify CLI installation', 'Check file permissions']
        }],
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
        },
        detectedFrameworks: []
      };
    }
  }

  /**
   * Preview workflows without generating files
   */
  async previewWorkflows(
    readmePath: string,
    configuration: WorkflowConfiguration,
    cancellationToken?: vscode.CancellationToken
  ): Promise<PreviewData> {
    this.logger.info('Starting workflow preview', {
      readmePath,
      workflowTypes: configuration.workflowTypes
    });

    try {
      // Get extension configuration
      const extensionConfigResult = this.dataTransformer.transformVSCodeSettingsToConfig();
      if (!extensionConfigResult.success || !extensionConfigResult.data) {
        throw new Error('Failed to load extension configuration');
      }

      const extensionConfig = extensionConfigResult.data;

      // Use temporary directory for preview
      const tempOutputDir = path.join(require('os').tmpdir(), 'readme-to-cicd-preview');

      // Transform configuration to CLI arguments with dry-run
      const argsResult = this.dataTransformer.transformConfigurationToCLIArgs(
        configuration,
        readmePath,
        tempOutputDir,
        true // Dry run
      );

      if (!argsResult.success || !argsResult.data) {
        throw new Error(`Configuration transformation failed: ${argsResult.errors.join(', ')}`);
      }

      // Create simple progress callback
      const progressCallback = this.progressReporter.createProgressCallback();

      // Execute CLI command in dry-run mode
      const executionResult = await this.processExecutor.executeCLICommand(
        'generate',
        argsResult.data.slice(1), // Remove 'generate' command
        path.dirname(readmePath),
        progressCallback,
        cancellationToken
      );

      // Parse preview data from CLI output
      const previewData = await this.parsePreviewData(
        executionResult.stdout,
        executionResult.stderr,
        configuration
      );

      this.logger.info('Workflow preview completed', {
        workflowCount: previewData.workflows.length,
        frameworkCount: previewData.detectedFrameworks.length
      });

      return previewData;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Workflow preview failed', { error: errorMessage });

      this.progressReporter.showError(
        `Workflow preview failed: ${errorMessage}`,
        ['View Logs']
      );

      // Return empty preview data
      return {
        workflows: [],
        configuration,
        detectedFrameworks: [],
        estimatedFiles: []
      };
    }
  }

  /**
   * Execute framework detection only
   */
  async executeFrameworkDetection(
    request: CLIGenerationRequest,
    cancellationToken?: vscode.CancellationToken
  ): Promise<CLIGenerationResult> {
    this.logger.info('Starting framework detection', {
      readmePath: request.readmePath
    });

    try {
      // Create default configuration for detection
      const defaultConfig: WorkflowConfiguration = {
        workflowTypes: ['ci'],
        frameworks: [],
        deploymentTargets: [],
        securityLevel: 'standard',
        optimizationLevel: 'standard',
        includeComments: true,
        customSteps: []
      };

      // Transform configuration to CLI arguments with detection-only mode
      const argsResult = this.dataTransformer.transformConfigurationToCLIArgs(
        request.configuration || defaultConfig,
        request.readmePath,
        request.outputDirectory || '.github/workflows',
        true // Dry run for detection only
      );

      if (!argsResult.success || !argsResult.data) {
        throw new Error(`Configuration transformation failed: ${argsResult.errors.join(', ')}`);
      }

      // Create simple progress callback
      const progressCallback = this.progressReporter.createProgressCallback();

      // Execute CLI command for detection
      const executionResult = await this.processExecutor.executeCLICommand(
        'detect',
        ['--readme', request.readmePath, '--dry-run'],
        path.dirname(request.readmePath),
        progressCallback,
        cancellationToken
      );

      // Parse detection results
      const detectedFrameworks = this.parseDetectedFrameworks(executionResult.stdout);

      this.logger.info('Framework detection completed', {
        frameworkCount: detectedFrameworks.length
      });

      return {
        success: executionResult.success,
        generatedFiles: [],
        errors: executionResult.success ? [] : [{
          code: 'DETECTION_FAILED',
          message: executionResult.stderr,
          category: 'processing',
          severity: 'error',
          suggestions: ['Check README file format', 'Verify project structure']
        }],
        warnings: [],
        summary: {
          totalTime: executionResult.executionTime,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: detectedFrameworks.map(f => f.name),
          optimizationsApplied: 0,
          executionTime: executionResult.executionTime,
          filesProcessed: 1,
          workflowsGenerated: 0
        },
        detectedFrameworks
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Framework detection failed', { error: errorMessage });

      return {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'DETECTION_ERROR',
          message: errorMessage,
          category: 'processing',
          severity: 'error',
          suggestions: ['Check README file exists', 'Verify file permissions']
        }],
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
        },
        detectedFrameworks: []
      };
    }
  }

  /**
   * Validate existing workflows
   */
  async validateWorkflows(
    workflowDirectory: string,
    cancellationToken?: vscode.CancellationToken
  ): Promise<CLIExecutionResult> {
    this.logger.info('Starting workflow validation', { workflowDirectory });

    try {
      const progressCallback = this.progressReporter.createProgressCallback();

      const executionResult = await this.processExecutor.executeCLICommand(
        'validate',
        ['--directory', workflowDirectory],
        workflowDirectory,
        progressCallback,
        cancellationToken
      );

      this.logger.info('Workflow validation completed', {
        success: executionResult.success,
        exitCode: executionResult.exitCode
      });

      if (executionResult.success) {
        this.progressReporter.showSuccess('Workflow validation passed');
      } else {
        this.progressReporter.showError(
          'Workflow validation failed',
          ['View Details']
        );
      }

      return {
        success: executionResult.success,
        stdout: executionResult.stdout,
        stderr: executionResult.stderr,
        exitCode: executionResult.exitCode,
        executionTime: executionResult.executionTime,
        command: 'validate'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Workflow validation failed', { error: errorMessage });

      this.progressReporter.showError(
        `Workflow validation failed: ${errorMessage}`,
        ['View Logs']
      );

      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        executionTime: 0,
        command: 'validate'
      };
    }
  }

  /**
   * Initialize project with README to CI/CD configuration
   */
  async initializeProject(
    projectPath: string,
    template: 'basic' | 'enterprise' | 'team' = 'basic',
    cancellationToken?: vscode.CancellationToken
  ): Promise<CLIExecutionResult> {
    this.logger.info('Starting project initialization', { projectPath, template });

    try {
      const progressCallback = this.progressReporter.createProgressCallback();

      const executionResult = await this.processExecutor.executeCLICommand(
        'init',
        ['--template', template, '--path', projectPath],
        projectPath,
        progressCallback,
        cancellationToken
      );

      this.logger.info('Project initialization completed', {
        success: executionResult.success,
        exitCode: executionResult.exitCode
      });

      if (executionResult.success) {
        this.progressReporter.showSuccess(
          'Project initialized successfully',
          ['Open Configuration']
        );
      } else {
        this.progressReporter.showError(
          'Project initialization failed',
          ['View Details']
        );
      }

      return {
        success: executionResult.success,
        stdout: executionResult.stdout,
        stderr: executionResult.stderr,
        exitCode: executionResult.exitCode,
        executionTime: executionResult.executionTime,
        command: 'init'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Project initialization failed', { error: errorMessage });

      this.progressReporter.showError(
        `Project initialization failed: ${errorMessage}`,
        ['View Logs']
      );

      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        executionTime: 0,
        command: 'init'
      };
    }
  }

  /**
   * Parse detected frameworks from CLI output
   */
  private parseDetectedFrameworks(stdout: string): DetectedFramework[] {
    const frameworks: DetectedFramework[] = [];
    
    try {
      // Try to parse JSON output first
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('framework')) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.name) {
              frameworks.push({
                name: parsed.name,
                version: parsed.version,
                confidence: parsed.confidence || 0.8,
                type: parsed.type || 'unknown',
                ecosystem: parsed.ecosystem || 'unknown',
                evidence: parsed.evidence || []
              });
            }
          } catch {
            // Not JSON, continue
          }
        }
      }

      // Fallback to regex parsing
      if (frameworks.length === 0) {
        const frameworkMatches = stdout.match(/Detected framework: (.+)/g);
        if (frameworkMatches) {
          for (const match of frameworkMatches) {
            const frameworkName = match.replace('Detected framework: ', '').trim();
            frameworks.push({
              name: frameworkName,
              confidence: 0.8,
              type: 'unknown',
              ecosystem: 'unknown',
              evidence: [{
                type: 'pattern',
                source: 'README',
                value: frameworkName,
                confidence: 0.8
              }]
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to parse detected frameworks', { error });
    }

    return frameworks;
  }

  /**
   * Parse preview data from CLI output
   */
  private async parsePreviewData(
    stdout: string,
    stderr: string,
    configuration: WorkflowConfiguration
  ): Promise<PreviewData> {
    // Try to extract preview information from CLI output
    const workflows: WorkflowPreview[] = [];
    const detectedFrameworks: DetectedFramework[] = [];
    const estimatedFiles: string[] = [];

    // Parse detected frameworks from output
    const frameworkMatches = stdout.match(/Detected framework: (.+)/g);
    if (frameworkMatches) {
      for (const match of frameworkMatches) {
        const frameworkName = match.replace('Detected framework: ', '');
        detectedFrameworks.push({
          name: frameworkName,
          confidence: 0.8, // Default confidence
          type: 'unknown',
          ecosystem: 'unknown',
          evidence: []
        });
      }
    }

    // Parse estimated files from output
    const fileMatches = stdout.match(/Would generate: (.+\.ya?ml)/g);
    if (fileMatches) {
      estimatedFiles.push(...fileMatches.map(match => match.replace('Would generate: ', '')));
    }

    // Create workflow previews based on configuration
    for (const workflowType of configuration.workflowTypes) {
      workflows.push({
        filename: `${workflowType}.yml`,
        content: `# ${workflowType.toUpperCase()} Workflow Preview\n# This is a preview - actual content will be generated`,
        type: workflowType,
        description: `${workflowType.toUpperCase()} workflow for detected frameworks`,
        estimatedSize: 1024 // Estimated size in bytes
      });
    }

    return {
      workflows,
      configuration,
      detectedFrameworks,
      estimatedFiles
    };
  }

  /**
   * Get CLI version and status
   */
  async getCLIStatus(): Promise<{ available: boolean; version?: string; error?: string }> {
    try {
      const result = await this.processExecutor.executeCommand({
        command: 'readme-to-cicd',
        args: ['--version'],
        timeout: 5000
      });

      if (result.success) {
        const version = result.stdout.trim();
        return { available: true, version };
      } else {
        return { available: false, error: result.stderr };
      }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Kill all active CLI processes
   */
  async killAllProcesses(): Promise<void> {
    await this.processExecutor.killAllProcesses();
  }

  /**
   * Get active process count
   */
  getActiveProcessCount(): number {
    return this.processExecutor.getActiveProcessCount();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.processExecutor.dispose();
    this.dataTransformer.dispose();
    this.progressReporter.dispose();
    this.logger.dispose();
  }
}