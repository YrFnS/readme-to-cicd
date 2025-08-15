import { CLIOptions, CLIResult } from './types';
import { Logger } from './logger';
import { ErrorHandler } from './error-handler';
import { CommandParser } from './command-parser';
import { ComponentOrchestrator } from './component-orchestrator';

/**
 * Main CLI Application class
 * 
 * Coordinates all CLI components and commands according to the design specification.
 * Implements command routing, execution flow, and application lifecycle management.
 */
export class CLIApplication {
  private commandParser: CommandParser;
  private componentOrchestrator: ComponentOrchestrator;

  constructor(
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandler
  ) {
    this.commandParser = new CommandParser();
    this.componentOrchestrator = new ComponentOrchestrator(
      this.logger,
      this.errorHandler,
      {
        enableRecovery: true,
        maxRetries: 2,
        timeoutMs: 30000,
        validateInputs: true,
        enablePerformanceTracking: true
      }
    );
  }

  /**
   * Run the CLI application with provided arguments
   */
  async run(args: string[]): Promise<CLIResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Starting CLI application', { args });
      
      // Parse arguments using CommandParser
      const options = this.parseArguments(args);
      this.logger.debug('Parsed CLI options', { options });
      
      // Execute the command
      const result = await this.executeCommand(options);
      
      // Add execution time to summary
      result.summary.executionTime = Date.now() - startTime;
      
      return result;
    } catch (error) {
      this.logger.error('CLI execution failed', { error });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }

  /**
   * Parse command-line arguments into CLIOptions
   */
  parseArguments(args: string[]): CLIOptions {
    try {
      return this.commandParser.parseArguments(args);
    } catch (error) {
      this.logger.error('Argument parsing failed', { error });
      throw error;
    }
  }

  /**
   * Execute the parsed command with options
   */
  private async executeCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.debug('Executing command', { command: options.command });

    // Set logging level based on options
    this.configureLogging(options);

    switch (options.command) {
      case 'generate':
        return this.executeGenerateCommand(options);
      case 'validate':
        return this.executeValidateCommand(options);
      case 'init':
        return this.executeInitCommand(options);
      case 'export':
        return this.executeExportCommand(options);
      case 'import':
        return this.executeImportCommand(options);
      default:
        throw new Error(`Unknown command: ${options.command}`);
    }
  }

  /**
   * Configure logging based on CLI options
   */
  private configureLogging(options: CLIOptions): void {
    if (options.quiet) {
      this.logger.setLevel('error');
    } else if (options.debug) {
      this.logger.setLevel('debug');
    } else if (options.verbose) {
      this.logger.setLevel('info');
    } else {
      this.logger.setLevel('warn');
    }
  }

  /**
   * Execute generate command using ComponentOrchestrator
   */
  private async executeGenerateCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing generate command', { options });
    
    try {
      // Use ComponentOrchestrator to execute the complete workflow
      const result = await this.componentOrchestrator.executeWorkflow(options);
      
      this.logger.info('Generate command completed', {
        success: result.success,
        filesGenerated: result.generatedFiles.length,
        errors: result.errors.length,
        warnings: result.warnings.length
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Generate command failed', { error });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }

  /**
   * Execute validate command (placeholder for future implementation)
   */
  private async executeValidateCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing validate command', { options });
    
    // Placeholder implementation - will be expanded in future tasks
    return {
      success: true,
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
    };
  }

  /**
   * Execute init command (placeholder for future implementation)
   */
  private async executeInitCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing init command', { options });
    
    // Placeholder implementation - will be expanded in future tasks
    return {
      success: true,
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
    };
  }

  /**
   * Execute export command (placeholder for future implementation)
   */
  private async executeExportCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing export command', { options });
    
    // Placeholder implementation - will be expanded in future tasks
    return {
      success: true,
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
    };
  }

  /**
   * Execute import command (placeholder for future implementation)
   */
  private async executeImportCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing import command', { options });
    
    // Placeholder implementation - will be expanded in future tasks
    return {
      success: true,
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
    };
  }
}