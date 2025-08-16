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
      this.readmeParser = new ReadmeParserClass({
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

      const result = this.createSuccessResult(context);
      this.performanceMonitor.endTimer(workflowTimerId, { 
        success: true, 
        filesGenerated: result.generatedFiles.length 
      });

      return result;

    } catch (error) {
      context.currentStep = 'error';
      context.totalExecutionTime = Date.now() - context.startTime.getTime();
      
      this.logger.error('Workflow execution failed', {
        executionId: context.executionId,
        error: error instanceof Error ? error.message : String(error),
        currentStep: context.currentStep
      });

      this.performanceMonitor.endTimer(workflowTimerId, { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      });

      return this.createErrorResult(context, error);
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

      // Simulate generation to determine what would be created
      const dryRunResult = await this.simulateGeneration(context);

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
      
      this.logger.info('Parsing step completed successfully', {
        executionId: context.executionId,
        languages: context.parseResult.data?.languages.length || 0,
        dependencies: context.parseResult.data?.dependencies.packages.length || 0,
        executionTime: context.stepTimes.parsing
      });

    } catch (error) {
      context.stepTimes.parsing = Date.now() - stepStartTime;
      this.addError(context, 'PARSING_FAILED', `README parsing failed: ${error instanceof Error ? error.message : String(error)}`, 'processing');
      throw error;
    }
  }

  /**
   * Execute the framework detection step
   */
  private async executeDetectionStep(context: ExecutionContext): Promise<void> {
    context.currentStep = 'detection';
    const stepStartTime = Date.now();

    this.logger.debug('Starting detection step', { executionId: context.executionId });

    if (!context.parseResult?.success || !context.parseResult.data) {
      throw new Error('Cannot execute detection step: parsing step failed or no parse data available');
    }

    try {
      // Convert parse result to project info format expected by detector
      const projectInfo = this.convertToProjectInfo(context.parseResult.data);

      // Execute detection with retry logic
      if (!this.frameworkDetector) {
        throw new Error('Framework detector not initialized');
      }
      
      context.detectionResult = await this.executeWithRetry(
        () => this.frameworkDetector!.detectFrameworks(projectInfo, context.workingDirectory),
        'Framework detection',
        context
      );

      context.stepTimes.detection = Date.now() - stepStartTime;

      this.logger.info('Detection step completed successfully', {
        executionId: context.executionId,
        frameworksDetected: context.detectionResult.frameworks.length,
        buildToolsDetected: context.detectionResult.buildTools.length,
        confidence: context.detectionResult.confidence.score,
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
        
        context.generationResults = await this.executeWithRetry(
          () => this.yamlGenerator!.generateMultipleWorkflows(generatorDetectionResult, context.options.workflowType!),
          'YAML generation (multiple workflows)',
          context
        );
      } else {
        // Generate recommended workflows
        if (!this.yamlGenerator) {
          throw new Error('YAML generator not initialized');
        }
        
        context.generationResults = await this.executeWithRetry(
          () => this.yamlGenerator!.generateRecommendedWorkflows(generatorDetectionResult, generationOptions),
          'YAML generation (recommended workflows)',
          context
        );
      }

      context.stepTimes.generation = Date.now() - stepStartTime;

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

    // Determine what workflows would be generated
    const generationOptions = this.createGenerationOptions(context.options);
    
    // Convert detection result to generator-expected format
    const generatorDetectionResult = this.convertDetectionResultForGenerator(context.detectionResult);
    
    // For dry-run, we'll use the recommended workflows logic to determine what would be generated
    if (!this.yamlGenerator) {
      throw new Error('YAML generator not initialized');
    }
    
    const simulatedWorkflows = await this.yamlGenerator.generateRecommendedWorkflows(
      generatorDetectionResult,
      generationOptions
    );

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
      detectedFrameworks: context.detectionResult.frameworks.map(f => f.name),
      estimatedExecutionTime: 2000, // Estimated 2 seconds
      warnings: []
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

        // Execute with timeout
        const result = await this.executeWithTimeout(operation, this.options.timeoutMs || 30000);
        
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
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
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
  private convertToProjectInfo(parseData: any): any {
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
    // Convert the detection component's DetectionResult to the generator's expected format
    return {
      frameworks: detectionResult.frameworks.map(f => ({
        name: f.name,
        version: f.version,
        confidence: f.confidence,
        evidence: f.evidence?.map(e => e.value || e.source || e.type || 'Evidence found') || [],
        category: this.mapFrameworkTypeToCategory(f.type)
      })),
      languages: detectionResult.frameworks
        .filter(f => f.ecosystem)
        .map(f => ({
          name: this.mapEcosystemToLanguage(f.ecosystem),
          version: f.version,
          confidence: f.confidence,
          primary: f.confidence > 0.7
        })),
      buildTools: detectionResult.buildTools.map(bt => ({
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
   * Clear component caches
   */
  clearCaches(): void {
    this.readmeParser?.clearPerformanceData();
    this.frameworkDetector?.clearCaches();
    this.logger.info('Component caches cleared');
  }
}