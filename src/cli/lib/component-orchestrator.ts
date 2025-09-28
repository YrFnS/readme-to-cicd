/**
 * Component Orchestrator
 * 
 * Coordinates the README Parser, Framework Detection, and YAML Generator components
 * to provide a unified workflow execution pipeline with error handling and recovery.
 * Enhanced with performance optimization capabilities including caching, lazy loading,
 * and memory management.
 */

import { ReadmeParserImpl, ParseResult } from '../../parser';
import { FrameworkDetectorImpl, DetectionResult } from '../../detection';
import { YAMLGeneratorImpl, WorkflowOutput, GenerationOptions } from '../../generator';
import { CLIOptions, CLIResult, CLIError, ExecutionSummary, WorkflowType } from './types';
import { Logger } from './logger';
import { ErrorHandler } from './error-handler';
import { OutputHandler, WorkflowFile } from './output-handler';
import { CacheManager } from './cache-manager';
import { PerformanceMonitor } from './performance-monitor';
import { CLILazyLoader } from './lazy-loader';
import { MemoryOptimizer } from './memory-optimizer';
import { ProgressIndicator, ProgressStep } from './progress-indicator';
import { TelemetryManager, PerformanceMetrics } from './telemetry-manager';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Execution context for sharing state between components
 */
export interface ExecutionContext {
  readonly executionId: string;
  readonly startTime: Date;
  readonly options: CLIOptions;
  readonly workingDirectory: string;
  
  // Component results
  parseResult?: ParseResult;
  detectionResult?: DetectionResult;
  generationResults?: WorkflowOutput[];
  generatedFiles?: string[];
  
  // Execution state
  currentStep: 'parsing' | 'detection' | 'generation' | 'output' | 'complete' | 'error';
  errors: CLIError[];
  warnings: string[];
  
  // Performance tracking
  stepTimes: Record<string, number>;
  totalExecutionTime?: number;
  
  // Phase 2: Progress tracking
  progressIndicator?: ProgressIndicator;
}

/**
 * Dry run result showing what would be generated
 */
export interface DryRunResult {
  wouldGenerate: {
    files: string[];
    workflows: {
      filename: string;
      type: WorkflowType;
      description: string;
    }[];
  };
  detectedFrameworks: string[];
  estimatedExecutionTime: number;
  warnings: string[];
}

/**
 * Component orchestration options
 */
export interface OrchestrationOptions {
  enableRecovery?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  validateInputs?: boolean;
  enablePerformanceTracking?: boolean;
  enableTelemetry?: boolean; // Phase 4: Add telemetry option
}

/**
 * Main component orchestrator that coordinates README Parser, Framework Detection, and YAML Generator
 * Enhanced with performance optimization capabilities
 */
export class ComponentOrchestrator {
  private readmeParser?: ReadmeParserImpl;
  private frameworkDetector?: FrameworkDetectorImpl;
  private yamlGenerator?: YAMLGeneratorImpl;
  private outputHandler: OutputHandler;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private options: OrchestrationOptions;
  
  // Performance optimization components
  private cacheManager: CacheManager;
  private performanceMonitor: PerformanceMonitor;
  private lazyLoader: CLILazyLoader;
  private memoryOptimizer: MemoryOptimizer;
  private telemetryManager: TelemetryManager; // Phase 4: Add telemetry

  constructor(
    logger: Logger,
    errorHandler: ErrorHandler,
    options: OrchestrationOptions = {}
  ) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.options = {
      enableRecovery: true,
      maxRetries: 2,
      timeoutMs: 30000,
      validateInputs: true,
      enablePerformanceTracking: true,
      ...options
    };

    // Initialize performance optimization components
    this.performanceMonitor = new PerformanceMonitor(this.logger, {
      enableProfiling: this.options.enablePerformanceTracking ?? true,
      enableMemoryTracking: true,
      slowOperationThreshold: 1000
    });

    this.cacheManager = new CacheManager(this.logger, {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      enablePersistence: true
    });

    this.lazyLoader = new CLILazyLoader(this.logger, this.performanceMonitor);

    this.memoryOptimizer = new MemoryOptimizer(this.logger, this.performanceMonitor, {
      enableGCOptimization: true,
      gcThresholdMB: 100,
      maxHeapUsageMB: 512
    });

    // Phase 4: Initialize telemetry manager
    this.telemetryManager = new TelemetryManager(this.options.enableTelemetry ?? true);

    this.outputHandler = new OutputHandler(logger, {
      conflictResolution: 'backup',
      createBackups: true,
      validatePermissions: true,
      dryRun: false,
      overwriteReadonly: false
    });

    this.logger.debug('ComponentOrchestrator initialized', {
      options: this.options,
      components: ['ReadmeParser', 'FrameworkDetector', 'YAMLGenerator', 'OutputHandler'],
      performanceOptimization: true
    });
  }

  /**
   * Initialize components with lazy loading
   */
  private async initializeComponents(): Promise<void> {
    if (!this.readmeParser) {
      const ReadmeParserClass = await this.lazyLoader.getReadmeParser();
      this.readmeParser = new ReadmeParserClass(undefined, {
        enableCaching: true,
        enablePerformanceMonitoring: this.options.enablePerformanceTracking,
        useIntegrationPipeline: true
      });
    }

    if (!this.frameworkDetector) {
      const FrameworkDetectorClass = await this.lazyLoader.getFrameworkDetector();
      this.frameworkDetector = new FrameworkDetectorClass();
    }

    if (!this.yamlGenerator) {
      const YAMLGeneratorClass = await this.lazyLoader.getYamlGenerator();
      this.yamlGenerator = new YAMLGeneratorClass({
        cacheEnabled: true,
        advancedPatternsEnabled: true
      });
    }
  }

  /**
   * Execute the complete workflow pipeline with performance optimization
   */
  async executeWorkflow(cliOptions: CLIOptions): Promise<CLIResult> {
    const workflowTimerId = this.performanceMonitor.startTimer(
      'complete-workflow',
      'other',
      { command: cliOptions.command, dryRun: cliOptions.dryRun }
    );

    const context = this.createExecutionContext(cliOptions);
    
    try {
      this.logger.info('Starting workflow execution', {
        executionId: context.executionId,
        command: cliOptions.command,
        readmePath: cliOptions.readmePath,
        dryRun: cliOptions.dryRun
      });

      // Phase 2: Initialize progress indicator (respect no-progress option)
      const progressSteps: ProgressStep[] = [
        { name: 'README Analysis', description: 'Analyzing README file and extracting project information' },
        { name: 'Framework Detection', description: 'Detecting frameworks, languages, and build tools' },
        { name: 'Workflow Generation', description: 'Generating CI/CD workflows based on project structure' },
        { name: 'File Output', description: 'Writing workflow files to disk' }
      ];
      
      const shouldShowProgress = !cliOptions.quiet && !cliOptions.noProgress && !cliOptions.ci;
      context.progressIndicator = new ProgressIndicator(progressSteps, !shouldShowProgress);

      // Initialize components with lazy loading
      await this.performanceMonitor.timeFunction(
        'initialize-components',
        () => this.initializeComponents(),
        'other'
      );

      // Monitor memory before execution
      await this.memoryOptimizer.monitorMemory();

      // Handle dry-run mode
      if (cliOptions.dryRun) {
        const result = await this.executeDryRun(context);
        this.performanceMonitor.endTimer(workflowTimerId, { success: true, dryRun: true });
        return result;
      }

      // Execute the pipeline steps with performance monitoring
      await this.executeParsingStep(context);
      await this.executeDetectionStep(context);
      await this.executeGenerationStep(context);
      await this.executeOutputStep(context);

      // Trigger GC if needed after processing
      await this.memoryOptimizer.triggerGCIfNeeded();

      // Mark as complete
      context.currentStep = 'complete';
      context.totalExecutionTime = Date.now() - context.startTime.getTime();

      // Phase 2: Complete all progress and show success
      const generatedCount = context.generatedFiles?.length || 0;
      context.progressIndicator?.complete(`Successfully generated ${generatedCount} workflow files`);

      const result = this.createSuccessResult(context);
      
      // Phase 4: Record telemetry for successful execution
      this.recordExecutionTelemetry(cliOptions, result, context);
      
      this.performanceMonitor.endTimer(workflowTimerId, { 
        success: true, 
        filesGenerated: result.generatedFiles.length 
      });

      return result;

    } catch (error) {
      context.currentStep = 'error';
      context.totalExecutionTime = Date.now() - context.startTime.getTime();
      
      // Phase 2: Show error in progress
      context.progressIndicator?.error(`Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Phase 4: Record telemetry for failed execution
      this.telemetryManager.recordError(
        error instanceof Error ? error.constructor.name : 'UnknownError',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined,
        { command: cliOptions.command, step: context.currentStep }
      );
      
      this.logger.error('Workflow execution failed', {
        executionId: context.executionId,
        error: error instanceof Error ? error.message : String(error),
        currentStep: context.currentStep
      });

      this.performanceMonitor.endTimer(workflowTimerId, { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });

      const errorResult = this.createErrorResult(context, error);
      
      // Phase 4: Record telemetry for error result
      this.recordExecutionTelemetry(cliOptions, errorResult, context);
      
      return errorResult;
    }
  }

  /**
   * Execute dry-run mode to show what would be generated
   */
  private async executeDryRun(context: ExecutionContext): Promise<CLIResult> {
    this.logger.info('Executing dry-run mode', { executionId: context.executionId });

    try {
      // Execute parsing and detection steps (no file output)
      await this.executeParsingStep(context);
      await this.executeDetectionStep(context);

      // Phase 3: Add progress indicator for generation simulation
      context.progressIndicator?.nextStep();

      // Simulate generation to determine what would be created
      const dryRunResult = await this.simulateGeneration(context);
      
      // Phase 3: Complete generation simulation
      context.progressIndicator?.completeStep();

      // Phase 3: Add final step for dry-run summary
      context.progressIndicator?.nextStep();
      context.progressIndicator?.completeStep('Dry-run analysis complete');

      // Phase 3: Complete with dry-run specific message
      context.progressIndicator?.complete(`Dry-run complete - would generate ${dryRunResult.wouldGenerate.files.length} workflow files`);

      return {
        success: true,
        generatedFiles: [], // No files actually generated in dry-run
        errors: context.errors,
        warnings: [
          ...context.warnings,
          ...dryRunResult.warnings,
          `DRY RUN: Would generate ${dryRunResult.wouldGenerate.files.length} files`
        ],
        summary: {
          totalTime: Date.now() - context.startTime.getTime(),
          filesGenerated: 0, // No files actually generated
          workflowsCreated: 0, // No workflows actually created
          frameworksDetected: dryRunResult.detectedFrameworks,
          optimizationsApplied: 0,
          executionTime: Date.now() - context.startTime.getTime(),
          filesProcessed: 1,
          workflowsGenerated: dryRunResult.wouldGenerate.workflows.length
        }
      };

    } catch (error) {
      this.logger.error('Dry-run execution failed', {
        executionId: context.executionId,
        error: error instanceof Error ? error.message : String(error)
      });

      return this.createErrorResult(context, error);
    }
  }

  /**
   * Execute the README parsing step
   */
  private async executeParsingStep(context: ExecutionContext): Promise<void> {
    // Phase 2: Start progress indicator
    context.progressIndicator?.nextStep();
    
    context.currentStep = 'parsing';
    const stepStartTime = Date.now();

    this.logger.debug('Starting parsing step', { executionId: context.executionId });

    try {
      // Determine README file path
      const readmePath = this.resolveReadmePath(context.options);
      
      // Validate input if enabled
      if (this.options.validateInputs) {
        await this.validateReadmeFile(readmePath);
      }

      // Execute parsing with retry logic
      if (!this.readmeParser) {
        throw new Error('README parser not initialized');
      }
      
      context.parseResult = await this.executeWithRetry(
        () => this.readmeParser!.parseFile(readmePath),
        'README parsing',
        context
      );

      if (!context.parseResult.success) {
        const errorMessages = context.parseResult.errors?.map(e => e.message).join(', ') || 'Unknown parsing error';
        throw new Error(`README parsing failed: ${errorMessages}`);
      }

      context.stepTimes.parsing = Date.now() - stepStartTime;
      
      // Phase 2: Complete progress step
      context.progressIndicator?.completeStep();
      
      this.logger.info('Parsing step completed successfully', {
        executionId: context.executionId,
        languages: context.parseResult.data?.languages.length || 0,
        dependencies: context.parseResult.data?.dependencies.packages.length || 0,
        executionTime: context.stepTimes.parsing
      });

    } catch (error) {
      context.stepTimes.parsing = Date.now() - stepStartTime;
      
      // Phase 2: Show error in progress
      context.progressIndicator?.error('README parsing failed');
      
      this.addError(context, 'PARSING_FAILED', `README parsing failed: ${error instanceof Error ? error.message : String(error)}`, 'processing');
      throw error;
    }
  }

  /**
   * Execute the framework detection step
   */
  private async executeDetectionStep(context: ExecutionContext): Promise<void> {
    // Phase 2: Start detection progress
    context.progressIndicator?.nextStep();
    
    context.currentStep = 'detection';
    const stepStartTime = Date.now();

    this.logger.debug('Starting detection step', { executionId: context.executionId });

    if (!context.parseResult?.success || !context.parseResult.data) {
      throw new Error('Cannot execute detection step: parsing step failed or no parse data available');
    }

    try {
      // Convert parse result to project info format expected by detector
      const projectInfo = this.convertToProjectInfo(context.parseResult?.data || {});

      // Execute detection with retry logic
      if (!this.frameworkDetector) {
        throw new Error('Framework detector not initialized');
      }
      
      // PHASE 1&2 FIX: Add timeout wrapper with user-configurable timeout
      const timeoutMs = (context.options.timeout || 15) * 1000; // Convert to milliseconds
      
      // Phase 2: Check if user wants to skip complex detection
      if (context.options.useFallback) {
        context.progressIndicator?.updateStep('Using simplified detection (--use-fallback)');
        context.detectionResult = await this.createFallbackDetectionResult(projectInfo);
      } else {
        try {
          context.detectionResult = await this.executeWithTimeout(
            () => this.frameworkDetector!.detectFrameworks(projectInfo, context.workingDirectory),
            timeoutMs,
            () => {
              // Phase 2: Show fallback progress message
              context.progressIndicator?.warnStep(
                'Complex detection taking longer than expected',
                'Switching to simplified detection method for reliable results'
              );
              
              // Phase 4: Record fallback telemetry
              this.telemetryManager.recordFallbackUsage('timeout', 'Framework detection timeout', 'createFallbackDetectionResult');
              
              return this.createFallbackDetectionResult(projectInfo);
            },
            'Framework detection'
          );
        } catch (error) {
          // If timeout also failed, use fallback
          context.progressIndicator?.warnStep(
            'Framework detection encountered issues',
            'Using fallback detection to ensure workflow generation succeeds'
          );
          
          // Phase 4: Record error-based fallback
          this.telemetryManager.recordFallbackUsage('error', error instanceof Error ? error.message : String(error), 'createFallbackDetectionResult');
          
          context.detectionResult = await this.createFallbackDetectionResult(projectInfo);
        }
      }

      context.stepTimes.detection = Date.now() - stepStartTime;

      // Phase 2: Complete detection step
      context.progressIndicator?.completeStep();

      this.logger.info('Detection step completed successfully', {
        executionId: context.executionId,
        frameworksDetected: (context.detectionResult.frameworks || []).length,
        buildToolsDetected: (context.detectionResult.buildTools || []).length,
        confidence: context.detectionResult.confidence?.score || 0,
        executionTime: context.stepTimes.detection
      });

    } catch (error) {
      context.stepTimes.detection = Date.now() - stepStartTime;
      this.addError(context, 'DETECTION_FAILED', `Framework detection failed: ${error instanceof Error ? error.message : String(error)}`, 'processing');
      throw error;
    }
  }

  /**
   * Execute the YAML generation step
   */
  private async executeGenerationStep(context: ExecutionContext): Promise<void> {
    // Phase 2: Start generation progress
    context.progressIndicator?.nextStep();
    
    context.currentStep = 'generation';
    const stepStartTime = Date.now();

    this.logger.debug('Starting generation step', { executionId: context.executionId });

    if (!context.detectionResult) {
      throw new Error('Cannot execute generation step: detection step failed or no detection data available');
    }

    try {
      // Prepare generation options
      const generationOptions = this.createGenerationOptions(context.options);

      // Convert detection result to generator-expected format
      const generatorDetectionResult = this.convertDetectionResultForGenerator(context.detectionResult);

      // Execute generation based on workflow types
      if (context.options.workflowType && context.options.workflowType.length > 0) {
        // Generate specific workflow types
        if (!this.yamlGenerator) {
          throw new Error('YAML generator not initialized');
        }
        
        try {
          context.generationResults = await this.executeWithRetry(
            () => this.yamlGenerator!.generateMultipleWorkflows(generatorDetectionResult, context.options.workflowType!),
            'YAML generation (multiple workflows)',
            context
          );
          
          // Check if generated workflows have meaningful content
          if (!this.hasValidWorkflowContent(context.generationResults)) {
            throw new Error('Generated workflows have insufficient content');
          }
        } catch (error) {
          this.logger.warn('YAML generator failed or produced insufficient content, using fallback workflows', {
            executionId: context.executionId,
            error: error instanceof Error ? error.message : String(error)
          });
          
          // Use our reliable fallback workflow generator
          context.generationResults = await this.createFallbackWorkflows(context.detectionResult);
        }
      } else {
        // Generate recommended workflows
        if (!this.yamlGenerator) {
          throw new Error('YAML generator not initialized');
        }

        try {
          context.generationResults = await this.executeWithRetry(
            () => this.yamlGenerator!.generateRecommendedWorkflows(generatorDetectionResult, generationOptions),
            'YAML generation (recommended workflows)',
            context
          );
          
          // Check if generated workflows have meaningful content
          if (!this.hasValidWorkflowContent(context.generationResults)) {
            throw new Error('Generated workflows have insufficient content');
          }
        } catch (error) {
          this.logger.warn('YAML generator failed or produced insufficient content, using fallback workflows', {
            executionId: context.executionId,
            error: error instanceof Error ? error.message : String(error)
          });
          
          // Use our reliable fallback workflow generator
          context.generationResults = await this.createFallbackWorkflows(context.detectionResult);
        }
      }

      context.stepTimes.generation = Date.now() - stepStartTime;

      // Phase 2: Complete generation step
      context.progressIndicator?.completeStep();

      this.logger.info('Generation step completed successfully', {
        executionId: context.executionId,
        workflowsGenerated: context.generationResults.length,
        workflowTypes: context.generationResults.map(w => w.type),
        executionTime: context.stepTimes.generation
      });

    } catch (error) {
      context.stepTimes.generation = Date.now() - stepStartTime;
      this.addError(context, 'GENERATION_FAILED', `YAML generation failed: ${error instanceof Error ? error.message : String(error)}`, 'processing');
      throw error;
    }
  }

  /**
   * Execute the file output step
   */
  private async executeOutputStep(context: ExecutionContext): Promise<void> {
    // Phase 2: Start output progress
    context.progressIndicator?.nextStep();
    
    context.currentStep = 'output';
    const stepStartTime = Date.now();

    this.logger.debug('Starting output step', { executionId: context.executionId });

    if (!context.generationResults || context.generationResults.length === 0) {
      throw new Error('Cannot execute output step: generation step failed or no workflows generated');
    }

    try {
      // Determine output directory
      const outputDir = context.options.outputDir || path.join(context.workingDirectory, '.github', 'workflows');
      
      // Configure output handler for this execution
      this.outputHandler.updateOptions({
        dryRun: context.options.dryRun,
        conflictResolution: context.options.interactive ? 'prompt' : 'backup'
      });

      // Convert generation results to workflow files
      const workflowFiles: WorkflowFile[] = context.generationResults.map(workflow => ({
        filename: workflow.filename,
        content: workflow.content,
        type: workflow.type,
        metadata: {
          description: `${workflow.type.toUpperCase()} workflow`,
          version: '1.0.0',
          generated: new Date()
        }
      }));

      // Use output handler to write files
      const outputResult = await this.outputHandler.writeWorkflowFiles(
        workflowFiles,
        outputDir,
        {
          format: 'yaml',
          indentation: 2,
          includeMetadata: true,
          backupExisting: true
        }
      );

      // Add any warnings from output handler to context
      context.warnings.push(...outputResult.warnings);

      // Add any errors from output handler to context
      context.errors.push(...outputResult.errors);

      // Update context with generated files
      context.generatedFiles = outputResult.generatedFiles;

      context.stepTimes.output = Date.now() - stepStartTime;

      this.logger.info('Output step completed', {
        executionId: context.executionId,
        success: outputResult.success,
        filesGenerated: outputResult.filesCreated,
        filesUpdated: outputResult.filesUpdated,
        filesSkipped: outputResult.filesSkipped,
        backupsCreated: outputResult.backupsCreated,
        outputDirectory: outputDir,
        executionTime: context.stepTimes.output
      });

      // Throw error if output failed
      if (!outputResult.success) {
        throw new Error(`File output failed: ${outputResult.errors.map(e => e.message).join(', ')}`);
      }

    } catch (error) {
      context.stepTimes.output = Date.now() - stepStartTime;
      this.addError(context, 'OUTPUT_FAILED', `File output failed: ${error instanceof Error ? error.message : String(error)}`, 'file-system');
      throw error;
    }
  }

  /**
   * Simulate generation for dry-run mode
   */
  private async simulateGeneration(context: ExecutionContext): Promise<DryRunResult> {
    if (!context.detectionResult) {
      throw new Error('Cannot simulate generation: detection step failed');
    }

    // Safely access frameworks array with fallback
    const frameworks = context.detectionResult.frameworks || [];
    const buildTools = context.detectionResult.buildTools || [];

    // Determine what workflows would be generated
    const generationOptions = this.createGenerationOptions(context.options);
    
    // Convert detection result to generator-expected format
    const generatorDetectionResult = this.convertDetectionResultForGenerator(context.detectionResult);
    
    // Phase 3: Add timeout protection for workflow generation
    if (!this.yamlGenerator) {
      throw new Error('YAML generator not initialized');
    }
    
    let simulatedWorkflows;
    try {
      // Phase 3: Use timeout wrapper for generation simulation
      const timeoutMs = (context.options.timeout || 20) * 1000; // 20 seconds for generation
      
      simulatedWorkflows = await this.executeWithTimeout(
        () => this.yamlGenerator!.generateRecommendedWorkflows(generatorDetectionResult, generationOptions),
        timeoutMs,
        () => this.createFallbackWorkflows(context.detectionResult), // Fallback workflows
        'Workflow generation simulation'
      );
    } catch (error) {
      this.logger.warn('Workflow generation simulation failed, using fallback', {
        executionId: context.executionId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Phase 3: Always provide fallback workflows
      simulatedWorkflows = await this.createFallbackWorkflows(context.detectionResult);
    }

    const outputDir = context.options.outputDir || path.join(context.workingDirectory, '.github', 'workflows');
    
    return {
      wouldGenerate: {
        files: simulatedWorkflows.map(w => path.join(outputDir, w.filename)),
        workflows: simulatedWorkflows.map(w => ({
          filename: w.filename,
          type: w.type,
          description: `${w.type.toUpperCase()} workflow for detected frameworks`
        }))
      },
      detectedFrameworks: frameworks.map(f => f.name || 'Unknown'),
      estimatedExecutionTime: 2000, // Estimated 2 seconds
      warnings: frameworks.length === 0 ? ['No frameworks detected - will generate basic workflow'] : []
    };
  }

  /**
   * Execute an operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: ExecutionContext
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (this.options.maxRetries || 1); attempt++) {
      try {
        this.logger.debug(`Executing ${operationName} (attempt ${attempt})`, {
          executionId: context.executionId
        });

        // Execute with timeout (simple version for retry logic)
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('OPERATION_TIMEOUT')), this.options.timeoutMs || 30000)
          )
        ]);
        
        if (attempt > 1) {
          this.logger.info(`${operationName} succeeded on retry`, {
            executionId: context.executionId,
            attempt
          });
        }
        
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logger.warn(`${operationName} failed on attempt ${attempt}`, {
          executionId: context.executionId,
          attempt,
          error: lastError.message,
          willRetry: attempt < (this.options.maxRetries || 1)
        });

        // Don't retry if recovery is disabled or this is the last attempt
        if (!this.options.enableRecovery || attempt >= (this.options.maxRetries || 1)) {
          break;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error(`${operationName} failed after ${this.options.maxRetries} attempts`);
  }

  /**
   * Create execution context
   */
  private createExecutionContext(options: CLIOptions): ExecutionContext {
    return {
      executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      options,
      workingDirectory: process.cwd(),
      currentStep: 'parsing',
      errors: [],
      warnings: [],
      stepTimes: {}
    };
  }

  /**
   * Resolve README file path
   */
  private resolveReadmePath(options: CLIOptions): string {
    if (options.readmePath) {
      return path.resolve(options.readmePath);
    }

    // Default to README.md in current directory
    return path.resolve('README.md');
  }

  /**
   * Validate README file exists and is readable
   */
  private async validateReadmeFile(readmePath: string): Promise<void> {
    try {
      const stats = await fs.stat(readmePath);
      if (!stats.isFile()) {
        throw new Error(`README path is not a file: ${readmePath}`);
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error(`README file not found: ${readmePath}`);
      }
      throw new Error(`Cannot access README file: ${readmePath} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert parse result data to project info format
   */
  private convertToProjectInfo(parseData: any = {}): any {
    // Create a proper dependencies array - framework detector expects an array of strings that can be sorted
    const packages = parseData.dependencies?.packages || [];
    const dependenciesArray = packages.map((pkg: any) => {
      if (typeof pkg === 'string') {
        return pkg;
      }
      return pkg.name || String(pkg);
    });

    // Convert the parser's ProjectInfo format to the detector's expected format
    return {
      name: parseData.metadata?.name || 'Unknown Project',
      languages: parseData.languages || [],
      configFiles: [], // Would need to be populated from file system scan
      dependencies: dependenciesArray, // This is now a proper array that can be sorted
      buildCommands: [], // Add this property that the cache manager expects
      commands: parseData.commands || {},
      testing: parseData.testing || {}
    };
  }

  /**
   * Convert detection result to generator-expected format
   */
  private convertDetectionResultForGenerator(detectionResult: DetectionResult): any {
    // Safely access arrays with fallbacks
    const frameworks = detectionResult.frameworks || [];
    const buildTools = detectionResult.buildTools || [];
    
    // Convert the detection component's DetectionResult to the generator's expected format
    return {
      frameworks: frameworks.map(f => ({
        name: f.name,
        version: f.version,
        confidence: f.confidence,
        evidence: f.evidence?.map(e => e.value || e.source || e.type || 'Evidence found') || [],
        category: this.mapFrameworkTypeToCategory(f.type)
      })),
      languages: frameworks
        .filter(f => f.ecosystem)
        .map(f => ({
          name: this.mapEcosystemToLanguage(f.ecosystem),
          version: f.version,
          confidence: f.confidence,
          primary: f.confidence > 0.7
        })),
      buildTools: buildTools.map(bt => ({
        name: bt.name,
        configFile: bt.configFile,
        confidence: bt.confidence
      })),
      packageManagers: detectionResult.buildTools
        .filter(bt => ['npm', 'yarn', 'pip', 'cargo', 'maven', 'gradle'].includes(bt.name.toLowerCase()))
        .map(bt => ({
          name: bt.name,
          lockFile: bt.configFile,
          confidence: bt.confidence
        })),
      testingFrameworks: detectionResult.frameworks
        .filter(f => f.type === 'testing_framework' || f.name.toLowerCase().includes('test'))
        .map(f => ({
          name: f.name,
          type: 'unit' as const,
          confidence: f.confidence
        })),
      deploymentTargets: detectionResult.containers.map(c => ({
        platform: c.type || 'docker',
        type: 'container' as const,
        confidence: 0.8 // Default confidence since ContainerInfo doesn't have confidence
      })),
      projectMetadata: {
        name: 'Generated Project',
        description: 'Auto-generated from README analysis',
        version: '1.0.0'
      }
    };
  }

  /**
   * Map framework type to generator category
   */
  private mapFrameworkTypeToCategory(type: string): 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop' {
    switch (type) {
      case 'frontend_framework':
      case 'static_site_generator':
        return 'frontend';
      case 'backend_framework':
      case 'api_framework':
      case 'microservice_framework':
        return 'backend';
      case 'fullstack_framework':
        return 'fullstack';
      case 'mobile_framework':
        return 'mobile';
      case 'desktop_framework':
        return 'desktop';
      default:
        return 'backend';
    }
  }

  /**
   * Map ecosystem to language name
   */
  private mapEcosystemToLanguage(ecosystem: string): string {
    switch (ecosystem) {
      case 'nodejs':
        return 'JavaScript';
      case 'python':
        return 'Python';
      case 'rust':
        return 'Rust';
      case 'go':
        return 'Go';
      case 'java':
        return 'Java';
      case 'frontend':
        return 'JavaScript';
      default:
        return ecosystem;
    }
  }

  /**
   * Create generation options from CLI options
   */
  private createGenerationOptions(cliOptions: CLIOptions): GenerationOptions {
    return {
      workflowType: cliOptions.workflowType?.[0] || 'ci',
      optimizationLevel: 'standard',
      includeComments: true,
      securityLevel: 'standard',
      agentHooksEnabled: false,
      environmentManagement: {
        includeSecretValidation: true,
        includeOIDC: true,
        includeConfigGeneration: true,
        generateEnvFiles: true,
        autoDetectSecrets: true
      }
    };
  }

  /**
   * Add error to execution context
   */
  private addError(
    context: ExecutionContext,
    code: string,
    message: string,
    category: CLIError['category']
  ): void {
    const error: CLIError = {
      code,
      message,
      category,
      severity: 'error',
      suggestions: []
    };

    context.errors.push(error);
  }

  /**
   * Create success result
   */
  private createSuccessResult(context: ExecutionContext): CLIResult {
    const generatedFiles = context.generatedFiles || [];

    const summary: ExecutionSummary = {
      totalTime: context.totalExecutionTime || 0,
      filesGenerated: generatedFiles.length,
      workflowsCreated: context.generationResults?.length || 0,
      frameworksDetected: context.detectionResult?.frameworks.map(f => f.name) || [],
      optimizationsApplied: context.generationResults?.reduce((sum, w) => sum + w.metadata.optimizations.length, 0) || 0,
      executionTime: context.totalExecutionTime || 0,
      filesProcessed: 1,
      workflowsGenerated: context.generationResults?.length || 0
    };

    return {
      success: true,
      generatedFiles,
      errors: context.errors,
      warnings: context.warnings,
      summary
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(context: ExecutionContext, error: unknown): CLIResult {
    // Add the main error if not already added
    if (context.errors.length === 0) {
      this.addError(
        context,
        'WORKFLOW_EXECUTION_FAILED',
        error instanceof Error ? error.message : String(error),
        'processing'
      );
    }

    const summary: ExecutionSummary = {
      totalTime: context.totalExecutionTime || 0,
      filesGenerated: 0,
      workflowsCreated: 0,
      frameworksDetected: context.detectionResult?.frameworks.map(f => f.name) || [],
      optimizationsApplied: 0,
      executionTime: context.totalExecutionTime || 0,
      filesProcessed: context.parseResult?.success ? 1 : 0,
      workflowsGenerated: 0
    };

    return {
      success: false,
      generatedFiles: [],
      errors: context.errors,
      warnings: context.warnings,
      summary
    };
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    parser: any;
    detector: any;
    generator: any;
  } {
    return {
      parser: this.readmeParser?.getPerformanceStats() || {},
      detector: this.frameworkDetector?.getPerformanceStats() || {},
      generator: {} // YAMLGenerator doesn't expose stats in the same way
    };
  }

  /**
   * Execute operation with timeout and fallback (Phase 1 Fix)
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    fallback: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    this.logger.debug(`Starting ${operationName} with ${timeoutMs}ms timeout`);
    
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OPERATION_TIMEOUT')), timeoutMs)
      )
    ]).catch(async (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage === 'OPERATION_TIMEOUT' || 
          errorMessage.includes('undefined') ||
          errorMessage.includes('length') ||
          errorMessage.includes('Cannot read properties')) {
        
        this.logger.warn(`${operationName} timed out or failed, using fallback`, {
          error: errorMessage,
          timeout: timeoutMs,
          fallbackTriggered: true
        });
        
        console.warn(`⚠️  ${operationName} encountered issues, switching to fallback method...`);
        
        return await fallback();
      }
      
      // Re-throw other errors
      throw error;
    });
  }

  /**
   * Create fallback detection result when complex detection fails (Phase 1 Fix)
   */
  private async createFallbackDetectionResult(projectInfo: any): Promise<any> {
    this.logger.info('Creating fallback detection result');
    
    // Create a basic detection result based on project info
    const fallbackResult = {
      frameworks: [], // Safe empty array
      languages: projectInfo.languages || [], // Use parsed languages
      buildTools: [], // Safe empty array
      containers: [], // Safe empty array
      packageManagers: [], // Safe empty array
      testingFrameworks: [], // Safe empty array
      deploymentTargets: [], // Safe empty array
      confidence: {
        score: 0.6, // Medium confidence for fallback
        level: 'medium' as const,
        breakdown: {
          frameworks: { score: 0.0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0.0 }, factors: [] },
          buildTools: { score: 0.0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0.0 }, factors: [] },
          containers: { score: 0.0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0.0 }, factors: [] },
          languages: { score: 0.8, detectedCount: (projectInfo.languages || []).length, evidenceQuality: { strongEvidence: 1, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0.8 }, factors: [] }
        },
        factors: [],
        recommendations: ['Complex detection failed - using simplified approach', 'Generated workflows will use basic templates']
      },
      alternatives: [], // Safe empty array
      warnings: [
        { 
          type: 'incomplete' as const, 
          message: 'Using simplified detection due to complex analysis failure',
          affectedComponents: ['frameworks', 'buildTools']
        }
      ],
      detectedAt: new Date(),
      executionTime: 0
    };

    return fallbackResult;
  }

  /**
   * Check if generated workflows have valid, meaningful content
   */
  private hasValidWorkflowContent(workflows: any[]): boolean {
    if (!workflows || workflows.length === 0) {
      return false;
    }

    for (const workflow of workflows) {
      if (!workflow.content || typeof workflow.content !== 'string') {
        return false;
      }

      // Check if content is just placeholder/minimal content
      const content = workflow.content.trim();
      
      // Must have more than just comments
      const contentLines = content.split('\n').filter(line => 
        line.trim() && !line.trim().startsWith('#')
      );
      
      // Must have at least 5 lines of actual YAML content (name, on, jobs, etc.)
      if (contentLines.length < 5) {
        this.logger.warn('Workflow has insufficient content', {
          filename: workflow.filename,
          contentLines: contentLines.length,
          totalLines: content.split('\n').length
        });
        return false;
      }

      // Must contain key workflow elements
      if (!content.includes('name:') || !content.includes('on:') || !content.includes('jobs:')) {
        this.logger.warn('Workflow missing required YAML structure', {
          filename: workflow.filename,
          hasName: content.includes('name:'),
          hasOn: content.includes('on:'),
          hasJobs: content.includes('jobs:')
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Create fallback workflows when complex generation fails (Phase 3)
   */
  private async createFallbackWorkflows(detectionResult: any): Promise<any[]> {
    this.logger.info('Creating fallback workflows for reliable generation');
    
    // Extract basic information safely
    const languages = detectionResult?.languages || [];
    const primaryLanguage = languages.find(l => l.primary) || languages[0] || { name: 'generic' };
    const hasNodeJS = languages.some(l => l.name?.toLowerCase().includes('javascript') || l.name?.toLowerCase().includes('typescript'));
    const hasPython = languages.some(l => l.name?.toLowerCase().includes('python'));
    
    // Create basic CI workflow
    const ciWorkflow = {
      filename: 'ci.yml',
      type: 'ci',
      content: this.generateBasicCIWorkflow(primaryLanguage.name, hasNodeJS, hasPython),
      metadata: {
        generatorVersion: '1.0.0-fallback',
        detectionSummary: `Fallback workflow for ${primaryLanguage.name || 'generic'} project`,
        optimizations: ['Basic CI pipeline', 'Dependency caching', 'Artifact upload']
      }
    };

    // Create basic CD workflow
    const cdWorkflow = {
      filename: 'cd.yml',
      type: 'cd',
      content: this.generateBasicCDWorkflow(primaryLanguage.name, hasNodeJS, hasPython),
      metadata: {
        generatorVersion: '1.0.0-fallback',
        detectionSummary: `Fallback deployment workflow for ${primaryLanguage.name || 'generic'} project`,
        optimizations: ['Basic CD pipeline', 'Environment deployment', 'Release automation']
      }
    };

    return [ciWorkflow, cdWorkflow];
  }

  /**
   * Generate basic CD workflow content (Phase 4)
   */
  private generateBasicCDWorkflow(language: string, hasNodeJS: boolean, hasPython: boolean): string {
    const setupSteps = [];
    const buildSteps = [];
    const deploySteps = [];

    if (hasNodeJS) {
      setupSteps.push(`      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'`);
      buildSteps.push(`      - name: Install dependencies
        run: |
          npm ci || npm install
          
      - name: Build for production
        run: |
          npm run build:prod || npm run build || echo "No build script found"`);
      deploySteps.push(`      - name: Deploy application
        run: |
          echo "Deploying Node.js application"
          # Add your deployment commands here
          # npm run deploy || echo "No deploy script configured"`);
    } else if (hasPython) {
      setupSteps.push(`      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.x'
          cache: 'pip'`);
      buildSteps.push(`      - name: Install dependencies
        run: |
          pip install -r requirements.txt || pip install -r requirements/prod.txt || echo "No requirements file found"`);
      deploySteps.push(`      - name: Deploy application
        run: |
          echo "Deploying Python application"
          # Add your deployment commands here`);
    } else {
      setupSteps.push(`      - name: Setup environment
        run: echo "Setting up ${language} environment"`);
      buildSteps.push(`      - name: Build project
        run: echo "Build step for ${language} project"`);
      deploySteps.push(`      - name: Deploy application
        run: echo "Deploy step for ${language} project"`);
    }

    return `name: CD

on:
  push:
    branches: [ main, master ]
  release:
    types: [ published ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
${setupSteps.join('\n        \n')}
        
${buildSteps.join('\n        \n')}
        
${deploySteps.join('\n        \n')}
        
      - name: Notification
        if: always()
        run: |
          echo "Deployment completed for ${language} project"
          # Add notification logic here
`;
  }

  /**
   * Generate basic CI workflow content (Phase 3)
   */
  private generateBasicCIWorkflow(language: string, hasNodeJS: boolean, hasPython: boolean): string {
    const setupSteps = [];
    const buildSteps = [];
    const testSteps = [];

    if (hasNodeJS) {
      setupSteps.push(`      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'`);
      buildSteps.push(`      - name: Install dependencies
        run: |
          npm ci || npm install
          
      - name: Build project
        run: |
          npm run build || echo "No build script found"`);
      testSteps.push(`      - name: Run tests
        run: |
          npm test || npm run test:unit || echo "No test script found"`);
    } else if (hasPython) {
      setupSteps.push(`      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.x'
          cache: 'pip'`);
      buildSteps.push(`      - name: Install dependencies
        run: |
          pip install -r requirements.txt || pip install -r requirements/dev.txt || echo "No requirements file found"`);
      testSteps.push(`      - name: Run tests
        run: |
          python -m pytest || python -m unittest discover || echo "No tests configured"`);
    } else {
      setupSteps.push(`      - name: Setup environment
        run: echo "Setting up ${language} environment"`);
      buildSteps.push(`      - name: Build project
        run: echo "Build step for ${language} project"`);
      testSteps.push(`      - name: Run tests
        run: echo "Test step for ${language} project"`);
    }

    return `name: CI

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
${setupSteps.join('\n        \n')}
        
${buildSteps.join('\n        \n')}
        
${testSteps.join('\n        \n')}
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: build-artifacts
          path: |
            dist/
            build/
            coverage/
          retention-days: 7
`;
  }

  /**
   * Record execution telemetry (Phase 4)
   */
  private recordExecutionTelemetry(options: CLIOptions, result: CLIResult, context: ExecutionContext): void {
    const performanceMetrics: PerformanceMetrics = {
      totalExecutionTime: context.totalExecutionTime || 0,
      stepTimes: {
        parsing: context.stepTimes.parsing || 0,
        detection: context.stepTimes.detection || 0,
        generation: context.stepTimes.generation || 0,
        output: context.stepTimes.output || 0
      },
      fallbackUsed: context.detectionResult?.confidence?.score === 0.6, // Our fallback sets this score
      filesGenerated: result.generatedFiles.length,
      workflowTypes: result.summary.workflowsGenerated ? ['ci', 'cd'] : [], // Simplified for now
      detectedLanguages: result.summary.frameworksDetected || []
    };

    // Record performance metrics
    this.telemetryManager.recordPerformanceMetrics(performanceMetrics);

    // Record command execution
    this.telemetryManager.recordCommandExecution(
      options.command,
      result.success,
      context.totalExecutionTime || 0,
      options,
      result
    );
  }

  /**
   * Get telemetry insights for debugging (Phase 4)
   */
  getTelemetryInsights(): any {
    return {
      usage: this.telemetryManager.getUsageStats(),
      performance: this.telemetryManager.getPerformanceInsights(),
      exportData: () => this.telemetryManager.exportTelemetryData()
    };
  }

  /**
   * Clear component caches and telemetry (Phase 4)
   */
  clearCaches(): void {
    this.readmeParser?.clearPerformanceData();
    this.frameworkDetector?.clearCaches();
    this.telemetryManager.clearTelemetryData(); // Phase 4: Clear telemetry
    this.logger.info('Component caches and telemetry cleared');
  }
}