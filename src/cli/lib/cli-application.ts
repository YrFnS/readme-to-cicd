import { CLIOptions, CLIResult, BatchProcessingOptions, CLIConfig } from './types';
import { Logger } from './logger';
import { ErrorHandler } from './error-handler';
import { CommandParser } from './command-parser';
import { ComponentOrchestrator } from './component-orchestrator';
import { BatchProcessor } from './batch-processor';
import { ConfigExporter, ImportOptions } from './config-exporter';
import { CIEnvironmentDetector, MachineOutputFormatter, CIExitCodeManager } from './ci-environment';
import { InitCommand, InitCommandOptions } from './init-command';

/**
 * Main CLI Application class
 * 
 * Coordinates all CLI components and commands according to the design specification.
 * Implements command routing, execution flow, and application lifecycle management.
 */
export class CLIApplication {
  private commandParser: CommandParser;
  private componentOrchestrator: ComponentOrchestrator;
  private batchProcessor: BatchProcessor;
  private configExporter: ConfigExporter;
  private initCommand: InitCommand;
  private ciEnvironment: CIEnvironmentDetector;
  private machineOutputFormatter: MachineOutputFormatter;

  constructor(
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandler
  ) {
    this.ciEnvironment = new CIEnvironmentDetector();
    this.machineOutputFormatter = new MachineOutputFormatter(this.ciEnvironment);
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
    this.batchProcessor = new BatchProcessor(
      this.componentOrchestrator,
      this.logger,
      this.errorHandler,
      {
        maxConcurrency: 4,
        projectDetectionTimeout: 30000,
        processingTimeout: 120000,
        enableProgressReporting: true,
        enableDetailedLogging: false
      }
    );
    this.configExporter = new ConfigExporter();
    this.initCommand = new InitCommand(this.logger, this.errorHandler);
  }

  /**
   * Run the CLI application with provided arguments
   */
  async run(args: string[]): Promise<CLIResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Starting CLI application', { 
        args,
        ciEnvironment: this.ciEnvironment.getEnvironmentInfo()
      });
      
      // Parse arguments using CommandParser
      const options = this.parseArguments(args);
      
      // Apply CI environment configuration
      const enhancedOptions = await this.applyCIEnvironmentConfiguration(options);
      
      this.logger.debug('Parsed CLI options with CI configuration', { options: enhancedOptions });
      
      // Execute the command
      const result = await this.executeCommand(enhancedOptions);
      
      // Add execution time to summary
      result.summary.executionTime = Date.now() - startTime;
      
      // Handle CI-specific output formatting and exit codes
      await this.handleCIOutput(result, enhancedOptions);
      
      return result;
    } catch (error) {
      this.logger.error('CLI execution failed', { error });
      const errorResult = this.errorHandler.handleCLIError(error as Error);
      
      // Handle CI exit codes for errors
      if (this.ciEnvironment.isCI()) {
        CIExitCodeManager.exit(errorResult);
      }
      
      return errorResult;
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
   * Apply CI environment configuration to CLI options
   */
  private async applyCIEnvironmentConfiguration(options: CLIOptions): Promise<CLIOptions> {
    // Load configuration from CI environment variables
    const ciConfig = this.ciEnvironment.loadConfigurationFromEnvironment();
    
    // Apply CI-specific option overrides
    const enhancedOptions: CLIOptions = { ...options };
    
    // Force non-interactive mode in CI environments
    if (this.ciEnvironment.shouldUseNonInteractiveMode()) {
      enhancedOptions.interactive = false;
      enhancedOptions.quiet = enhancedOptions.quiet || this.ciEnvironment.isCI();
      
      this.logger.info('CI environment detected, using non-interactive mode', {
        provider: this.ciEnvironment.getCIProvider(),
        isCI: this.ciEnvironment.isCI()
      });
    }
    
    // Apply CI configuration defaults
    if (ciConfig.defaults) {
      enhancedOptions.outputDir = enhancedOptions.outputDir || ciConfig.defaults.outputDirectory;
      enhancedOptions.workflowType = enhancedOptions.workflowType || ciConfig.defaults.workflowTypes;
    }
    
    // Apply Git configuration from CI environment
    if (ciConfig.git && !enhancedOptions.config) {
      // CI environment Git settings would be applied through configuration loading
      this.logger.debug('CI Git configuration available', { gitConfig: ciConfig.git });
    }
    
    return enhancedOptions;
  }

  /**
   * Handle CI-specific output formatting and exit codes
   */
  private async handleCIOutput(result: CLIResult, options: CLIOptions): Promise<void> {
    // Check if machine-readable output is requested or if running in CI
    const shouldOutputMachineReadable = this.ciEnvironment.isCI() || options.ci;
    
    this.logger.debug('Checking CI output requirements', {
      isCI: this.ciEnvironment.isCI(),
      ciFlag: options.ci,
      shouldOutput: shouldOutputMachineReadable
    });
    
    if (shouldOutputMachineReadable) {
      // Determine output format (default to JSON for CI)
      const format = process.env.README_TO_CICD_OUTPUT_FORMAT === 'xml' ? 'xml' : 'json';
      
      // Generate machine-readable output
      const machineOutput = this.machineOutputFormatter.formatOutput(result, options, format);
      const outputString = this.machineOutputFormatter.stringify(machineOutput);
      
      // Output to stdout for CI consumption
      console.log(outputString);
      
      this.logger.debug('Machine-readable output generated', {
        format,
        success: result.success,
        filesGenerated: result.generatedFiles.length
      });
    }
    
    // Handle exit codes in CI environments or when --ci flag is used
    if (this.ciEnvironment.isCI() || options.ci) {
      const exitCode = CIExitCodeManager.getExitCode(result);
      
      this.logger.info('CI execution completed', {
        success: result.success,
        exitCode,
        exitCodeDescription: CIExitCodeManager.getExitCodeDescription(exitCode),
        provider: this.ciEnvironment.getCIProvider(),
        explicitCIMode: options.ci
      });
      
      // Note: We don't call process.exit here to allow the caller to handle it
      // The exit code is available through CIExitCodeManager.getExitCode(result)
    }
  }

  /**
   * Configure logging based on CLI options
   */
  private configureLogging(options: CLIOptions): void {
    // In CI environments, adjust logging levels for better CI output
    if (this.ciEnvironment.isCI()) {
      if (options.debug) {
        this.logger.setLevel('debug');
      } else if (options.verbose) {
        this.logger.setLevel('info');
      } else {
        // In CI, default to warn level to reduce noise
        this.logger.setLevel('warn');
      }
    } else {
      // Standard logging configuration for interactive use
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
  }

  /**
   * Execute generate command using ComponentOrchestrator or BatchProcessor
   */
  private async executeGenerateCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing generate command', { options });
    
    try {
      // Check if this is a batch processing request
      if (this.isBatchProcessingRequest(options)) {
        return await this.executeBatchGeneration(options);
      } else {
        return await this.executeSingleGeneration(options);
      }
      
    } catch (error) {
      this.logger.error('Generate command failed', { error });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }

  /**
   * Check if the request is for batch processing
   */
  private isBatchProcessingRequest(options: CLIOptions): boolean {
    return !!(options.directories && options.directories.length > 0);
  }

  /**
   * Execute single project generation using ComponentOrchestrator
   */
  private async executeSingleGeneration(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing single project generation');
    
    // Use ComponentOrchestrator to execute the complete workflow
    const result = await this.componentOrchestrator.executeWorkflow(options);
    
    this.logger.info('Single project generation completed', {
      success: result.success,
      filesGenerated: result.generatedFiles.length,
      errors: result.errors.length,
      warnings: result.warnings.length
    });
    
    return result;
  }

  /**
   * Execute batch processing using BatchProcessor
   */
  private async executeBatchGeneration(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing batch processing generation');
    
    // Create batch processing options from CLI options
    const batchOptions: BatchProcessingOptions = {
      directories: options.directories || [],
      recursive: options.recursive || false,
      parallel: options.parallel || false,
      ...(options.maxConcurrency !== undefined && { maxConcurrency: options.maxConcurrency }),
      continueOnError: options.continueOnError !== false, // Default to true
      ...(options.projectPattern !== undefined && { projectDetectionPattern: options.projectPattern }),
      ...(options.excludePatterns !== undefined && { excludePatterns: options.excludePatterns })
    };

    // Create progress callback if verbose logging is enabled
    const progressCallback = options.verbose || options.debug ? (progress: any) => {
      this.logger.info('Batch processing progress', progress);
    } : undefined;

    // Execute batch processing
    const batchResult = await this.batchProcessor.processBatch(
      batchOptions,
      options,
      progressCallback
    );

    // Convert batch result to CLI result format
    const cliResult: CLIResult = {
      success: batchResult.success,
      generatedFiles: batchResult.projectResults
        .filter(r => r.success && r.result)
        .flatMap(r => r.result!.generatedFiles),
      errors: batchResult.errors,
      warnings: batchResult.warnings,
      summary: {
        totalTime: batchResult.totalExecutionTime,
        filesGenerated: batchResult.summary.totalFilesGenerated,
        workflowsCreated: batchResult.summary.totalWorkflowsCreated,
        frameworksDetected: Object.keys(batchResult.summary.frameworksDetected),
        optimizationsApplied: 0, // Would need to aggregate from individual results
        executionTime: batchResult.totalExecutionTime,
        filesProcessed: batchResult.summary.totalProjectsProcessed,
        workflowsGenerated: batchResult.summary.totalWorkflowsCreated
      }
    };

    // Add batch-specific information to warnings
    if (batchResult.totalProjects > 0) {
      cliResult.warnings.unshift(
        `Batch processing completed: ${batchResult.successfulProjects}/${batchResult.totalProjects} projects successful`
      );
      
      if (batchResult.failedProjects > 0) {
        cliResult.warnings.push(
          `${batchResult.failedProjects} projects failed during batch processing`
        );
      }
      
      if (batchResult.skippedProjects > 0) {
        cliResult.warnings.push(
          `${batchResult.skippedProjects} projects were skipped during batch processing`
        );
      }
    }

    this.logger.info('Batch processing generation completed', {
      success: cliResult.success,
      totalProjects: batchResult.totalProjects,
      successfulProjects: batchResult.successfulProjects,
      failedProjects: batchResult.failedProjects,
      filesGenerated: cliResult.generatedFiles.length,
      totalExecutionTime: batchResult.totalExecutionTime
    });
    
    return cliResult;
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
   * Execute init command using InitCommand
   */
  private async executeInitCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing init command', { options });
    
    try {
      // Extract init-specific options from CLI options
      const initOptions: any = {
        template: this.getTemplateFromOptions(options) || 'basic',
        interactive: options.interactive || false,
        overwrite: false // Could be added as CLI option in the future
      };
      
      if (options.config) {
        initOptions.outputPath = options.config;
      }

      // Execute the init command
      return await this.initCommand.execute(initOptions);
      
    } catch (error) {
      this.logger.error('Init command failed', { error });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }

  /**
   * Extract template type from CLI options
   */
  private getTemplateFromOptions(options: CLIOptions): 'basic' | 'enterprise' | 'team' | undefined {
    // The template option would be parsed from the init command
    // For now, we'll check if it's available in the options
    const template = (options as any).template;
    
    if (template && ['basic', 'enterprise', 'team'].includes(template)) {
      return template as 'basic' | 'enterprise' | 'team';
    }
    
    return undefined;
  }

  /**
   * Execute export command using ConfigExporter
   */
  private async executeExportCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing export command', { options });
    
    try {
      const startTime = Date.now();
      
      // Determine configuration file path
      const configPath = options.config || '.readme-to-cicd.json';
      
      // Determine output path from options
      const outputPath = options.output || 'readme-to-cicd-config.json';
      
      // Export configuration with all components
      const exportedConfig = await this.configExporter.exportConfiguration(
        configPath,
        outputPath,
        {
          includeTemplates: true,
          includePolicies: true,
          includeCustomFiles: true,
          description: 'Exported configuration package',
          tags: ['cli-export']
        }
      );
      
      const executionTime = Date.now() - startTime;
      
      this.logger.info('Configuration exported successfully', {
        outputPath,
        includesTemplates: !!exportedConfig.templates,
        includesPolicies: !!exportedConfig.policies,
        includesCustomFiles: !!exportedConfig.customFiles,
        executionTime
      });
      
      return {
        success: true,
        generatedFiles: [outputPath],
        errors: [],
        warnings: [],
        summary: {
          totalTime: executionTime,
          filesGenerated: 1,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime,
          filesProcessed: 1,
          workflowsGenerated: 0
        }
      };
      
    } catch (error) {
      this.logger.error('Export command failed', { error });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }

  /**
   * Execute import command using ConfigExporter
   */
  private async executeImportCommand(options: CLIOptions): Promise<CLIResult> {
    this.logger.info('Executing import command', { options });
    
    try {
      const startTime = Date.now();
      
      // Get import file path from options
      const importPath = options.configFile;
      if (!importPath) {
        throw new Error('Import file path is required');
      }
      
      // Determine target configuration file path
      const targetConfigPath = options.config || '.readme-to-cicd.json';
      
      // Determine import options
      const importOptions: ImportOptions = {
        merge: options.merge || false,
        overwriteExisting: !options.merge,
        validateCompatibility: true,
        backupExisting: true,
        conflictResolution: options.interactive ? 'prompt' : 'merge-smart'
      };
      
      // Import configuration
      const importResult = await this.configExporter.importConfiguration(
        importPath,
        targetConfigPath,
        importOptions
      );
      
      const executionTime = Date.now() - startTime;
      
      if (importResult.success) {
        this.logger.info('Configuration imported successfully', {
          importPath,
          targetConfigPath,
          conflicts: importResult.conflicts.length,
          backupCreated: !!importResult.backupPath,
          warnings: importResult.warnings.length,
          executionTime
        });
        
        const generatedFiles = [targetConfigPath];
        if (importResult.backupPath) {
          generatedFiles.push(importResult.backupPath);
        }
        
        return {
          success: true,
          generatedFiles,
          errors: importResult.errors,
          warnings: importResult.warnings,
          summary: {
            totalTime: executionTime,
            filesGenerated: generatedFiles.length,
            workflowsCreated: 0,
            frameworksDetected: [],
            optimizationsApplied: 0,
            executionTime,
            filesProcessed: 1,
            workflowsGenerated: 0
          }
        };
      } else {
        this.logger.error('Configuration import failed', {
          importPath,
          errors: importResult.errors,
          warnings: importResult.warnings
        });
        
        return {
          success: false,
          generatedFiles: [],
          errors: importResult.errors,
          warnings: importResult.warnings,
          summary: {
            totalTime: executionTime,
            filesGenerated: 0,
            workflowsCreated: 0,
            frameworksDetected: [],
            optimizationsApplied: 0,
            executionTime,
            filesProcessed: 0,
            workflowsGenerated: 0
          }
        };
      }
      
    } catch (error) {
      this.logger.error('Import command failed', { error });
      return this.errorHandler.handleCLIError(error as Error);
    }
  }
}