/**
 * Data Transformer
 * 
 * Handles data transformation between VS Code extension and CLI component formats.
 * Provides bidirectional conversion for configurations, results, and error handling.
 */

import * as vscode from 'vscode';
import {
  WorkflowConfiguration,
  ExtensionConfiguration,
  CLIGenerationRequest,
  CLIGenerationResult,
  DetectedFramework,
  CLIError,
  ExecutionSummary,
  DataTransformationContext,
  TransformationResult,
  WorkflowType,
  FrameworkSelection,
  DeploymentTarget
} from './types';

export class DataTransformer {
  private readonly logger: vscode.LogOutputChannel;

  constructor() {
    this.logger = vscode.window.createOutputChannel('README to CI/CD - Data Transformer', { log: true });
  }

  /**
   * Transform extension configuration to CLI options
   */
  transformConfigurationToCLI(
    config: WorkflowConfiguration,
    extensionConfig: ExtensionConfiguration,
    readmePath: string,
    outputDirectory: string
  ): TransformationResult<CLIGenerationRequest> {
    try {
      this.logger.info('Transforming configuration to CLI format');

      const cliRequest: CLIGenerationRequest = {
        readmePath,
        outputDirectory,
        workflowTypes: config.workflowTypes,
        frameworks: config.frameworks
          .filter(f => f.enabled)
          .map(f => f.name),
        dryRun: false, // Will be set by caller
        interactive: false, // Extension handles interactivity
        configuration: extensionConfig
      };

      this.logger.debug('Configuration transformation completed', {
        workflowTypes: cliRequest.workflowTypes,
        frameworks: cliRequest.frameworks,
        outputDirectory: cliRequest.outputDirectory
      });

      return {
        success: true,
        data: cliRequest,
        errors: [],
        warnings: []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Configuration transformation failed', { error: errorMessage });

      return {
        success: false,
        errors: [`Configuration transformation failed: ${errorMessage}`],
        warnings: []
      };
    }
  }

  /**
   * Transform CLI result to extension format
   */
  transformCLIResultToExtension(
    cliOutput: string,
    stderr: string,
    exitCode: number
  ): TransformationResult<CLIGenerationResult> {
    try {
      this.logger.info('Transforming CLI result to extension format');

      // Parse CLI output
      const result = this.parseCLIOutput(cliOutput, stderr, exitCode);

      this.logger.debug('CLI result transformation completed', {
        success: result.success,
        filesGenerated: result.generatedFiles.length,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length
      });

      return {
        success: true,
        data: result,
        errors: [],
        warnings: []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('CLI result transformation failed', { error: errorMessage });

      return {
        success: false,
        errors: [`CLI result transformation failed: ${errorMessage}`],
        warnings: []
      };
    }
  }

  /**
   * Transform detected frameworks from CLI to extension format
   */
  transformDetectedFrameworks(
    cliFrameworks: any[]
  ): TransformationResult<DetectedFramework[]> {
    try {
      this.logger.info('Transforming detected frameworks');

      const frameworks: DetectedFramework[] = cliFrameworks.map(framework => ({
        name: framework.name || 'Unknown Framework',
        version: framework.version,
        confidence: framework.confidence || 0.5,
        type: framework.type || 'unknown',
        ecosystem: framework.ecosystem || 'unknown',
        evidence: framework.evidence || []
      }));

      return {
        success: true,
        data: frameworks,
        errors: [],
        warnings: []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Framework transformation failed', { error: errorMessage });

      return {
        success: false,
        errors: [`Framework transformation failed: ${errorMessage}`],
        warnings: []
      };
    }
  }

  /**
   * Transform extension workflow configuration to CLI command arguments
   */
  transformConfigurationToCLIArgs(
    config: WorkflowConfiguration,
    readmePath: string,
    outputDirectory: string,
    dryRun: boolean = false
  ): TransformationResult<string[]> {
    try {
      this.logger.info('Transforming configuration to CLI arguments');

      const args: string[] = ['generate'];

      // Add README path
      args.push('--readme', readmePath);

      // Add output directory
      args.push('--output', outputDirectory);

      // Add workflow types
      if (config.workflowTypes.length > 0) {
        args.push('--workflow-type', ...config.workflowTypes);
      }

      // Add enabled frameworks
      const enabledFrameworks = config.frameworks
        .filter(f => f.enabled)
        .map(f => f.name);
      
      if (enabledFrameworks.length > 0) {
        args.push('--framework', ...enabledFrameworks);
      }

      // Add optimization level
      if (config.optimizationLevel !== 'standard') {
        args.push('--optimization', config.optimizationLevel);
      }

      // Add security level
      if (config.securityLevel !== 'standard') {
        args.push('--security', config.securityLevel);
      }

      // Add comments flag
      if (config.includeComments) {
        args.push('--include-comments');
      }

      // Add dry run flag
      if (dryRun) {
        args.push('--dry-run');
      }

      // Add non-interactive flag (extension handles interactivity)
      args.push('--non-interactive');

      // Add JSON output for easier parsing
      args.push('--output-format', 'json');

      this.logger.debug('CLI arguments generated', { args });

      return {
        success: true,
        data: args,
        errors: [],
        warnings: []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('CLI arguments transformation failed', { error: errorMessage });

      return {
        success: false,
        errors: [`CLI arguments transformation failed: ${errorMessage}`],
        warnings: []
      };
    }
  }

  /**
   * Transform VS Code settings to extension configuration
   */
  transformVSCodeSettingsToConfig(): TransformationResult<ExtensionConfiguration> {
    try {
      this.logger.info('Transforming VS Code settings to extension configuration');

      const config = vscode.workspace.getConfiguration('readme-to-cicd');

      const extensionConfig: ExtensionConfiguration = {
        defaultOutputDirectory: config.get('defaultOutputDirectory', '.github/workflows'),
        enableAutoGeneration: config.get('enableAutoGeneration', false),
        preferredWorkflowTypes: config.get('preferredWorkflowTypes', ['ci']),
        customTemplates: config.get('customTemplates', []),
        gitIntegration: {
          autoCommit: config.get('gitIntegration.autoCommit', false),
          commitMessage: config.get('gitIntegration.commitMessage', 'Add generated CI/CD workflows'),
          createPR: config.get('gitIntegration.createPR', false),
          branchName: config.get('gitIntegration.branchName')
        },
        showPreviewByDefault: config.get('showPreviewByDefault', true),
        enableInlineValidation: config.get('enableInlineValidation', true),
        notificationLevel: config.get('notificationLevel', 'all')
      };

      return {
        success: true,
        data: extensionConfig,
        errors: [],
        warnings: []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('VS Code settings transformation failed', { error: errorMessage });

      return {
        success: false,
        errors: [`VS Code settings transformation failed: ${errorMessage}`],
        warnings: []
      };
    }
  }

  /**
   * Parse CLI output into structured result
   */
  private parseCLIOutput(
    stdout: string,
    stderr: string,
    exitCode: number
  ): CLIGenerationResult {
    // Try to parse JSON output first
    try {
      const jsonOutput = this.extractJSONFromOutput(stdout);
      if (jsonOutput) {
        return this.parseCLIJSONOutput(jsonOutput);
      }
    } catch (error) {
      this.logger.warn('Failed to parse JSON output, falling back to text parsing', { error });
    }

    // Fallback to text parsing
    return this.parseCLITextOutput(stdout, stderr, exitCode);
  }

  /**
   * Extract JSON from CLI output
   */
  private extractJSONFromOutput(output: string): any | null {
    // Look for JSON output in the CLI output
    const lines = output.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        try {
          return JSON.parse(trimmedLine);
        } catch {
          // Continue looking for valid JSON
        }
      }
    }

    return null;
  }

  /**
   * Parse CLI JSON output
   */
  private parseCLIJSONOutput(jsonOutput: any): CLIGenerationResult {
    return {
      success: jsonOutput.success || false,
      generatedFiles: jsonOutput.generatedFiles || [],
      errors: jsonOutput.errors || [],
      warnings: jsonOutput.warnings || [],
      summary: jsonOutput.summary || this.createDefaultSummary(),
      detectedFrameworks: jsonOutput.detectedFrameworks || []
    };
  }

  /**
   * Parse CLI text output (fallback)
   */
  private parseCLITextOutput(
    stdout: string,
    stderr: string,
    exitCode: number
  ): CLIGenerationResult {
    const success = exitCode === 0;
    const generatedFiles: string[] = [];
    const errors: CLIError[] = [];
    const warnings: string[] = [];

    // Extract generated files from output
    const fileMatches = stdout.match(/Generated: (.+\.ya?ml)/g);
    if (fileMatches) {
      generatedFiles.push(...fileMatches.map(match => match.replace('Generated: ', '')));
    }

    // Extract errors from stderr
    if (stderr) {
      errors.push({
        code: 'CLI_ERROR',
        message: stderr,
        category: 'processing',
        severity: 'error',
        suggestions: []
      });
    }

    // Extract warnings from stdout
    const warningMatches = stdout.match(/Warning: (.+)/g);
    if (warningMatches) {
      warnings.push(...warningMatches.map(match => match.replace('Warning: ', '')));
    }

    return {
      success,
      generatedFiles,
      errors,
      warnings,
      summary: this.createDefaultSummary(),
      detectedFrameworks: []
    };
  }

  /**
   * Create default execution summary
   */
  private createDefaultSummary(): ExecutionSummary {
    return {
      totalTime: 0,
      filesGenerated: 0,
      workflowsCreated: 0,
      frameworksDetected: [],
      optimizationsApplied: 0,
      executionTime: 0,
      filesProcessed: 1,
      workflowsGenerated: 0
    };
  }

  /**
   * Validate transformation context
   */
  validateTransformationContext(context: DataTransformationContext): boolean {
    return (
      context.sourceFormat !== context.targetFormat &&
      ['extension', 'cli'].includes(context.sourceFormat) &&
      ['extension', 'cli'].includes(context.targetFormat) &&
      ['configuration', 'result', 'error', 'progress'].includes(context.operation)
    );
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.logger.dispose();
  }
}