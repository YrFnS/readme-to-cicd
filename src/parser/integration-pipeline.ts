/**
 * Integration Pipeline
 * 
 * This module provides the main integration pipeline that connects all enhanced
 * components with proper data flow, error handling, and performance monitoring.
 */

import { ComponentFactory, ComponentConfig, ComponentDependencies } from './component-factory';
import { LanguageDetector, EnhancedDetectionResult } from './analyzers/language-detector';
import { CommandExtractor } from './analyzers/command-extractor';
import { ResultAggregator } from './utils/result-aggregator';
import {
  ParseResult,
  ProjectInfo,
  CommandExtractionResult,
  IntegrationMetadata,
  ValidationStatus,
  ConflictResolution
} from './types';
import { LanguageContext } from '../shared/types/language-context';
import { PerformanceMonitor } from './utils/performance-monitor';
import { Logger, LogLevel, logger } from './utils/logger';

/**
 * Pipeline configuration options
 */
export interface PipelineConfig extends ComponentConfig {
  /** Enable detailed logging */
  enableLogging?: boolean;
  /** Log level for pipeline operations */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /** Timeout for pipeline execution (ms) */
  pipelineTimeout?: number;
  /** Enable pipeline recovery mechanisms */
  enableRecovery?: boolean;
  /** Maximum retry attempts for failed operations */
  maxRetries?: number;
}

/**
 * Pipeline execution context
 */
export interface PipelineContext {
  /** Input content being processed */
  content: string;
  /** AST representation of the content */
  ast?: any;
  /** Language contexts from detection phase */
  languageContexts?: LanguageContext[];
  /** Command extraction results */
  commandResults?: CommandExtractionResult;
  /** Performance monitoring data */
  performanceData?: any;
  /** Pipeline execution metadata */
  metadata: PipelineExecutionMetadata;
}

/**
 * Pipeline execution metadata
 */
export interface PipelineExecutionMetadata {
  /** Pipeline execution start time */
  startTime: Date;
  /** Current pipeline stage */
  currentStage: PipelineStage;
  /** Completed stages */
  completedStages: PipelineStage[];
  /** Failed stages */
  failedStages: PipelineStage[];
  /** Recovery attempts made */
  recoveryAttempts: number;
  /** Total execution time */
  executionTime?: number;
}

/**
 * Pipeline execution stages
 */
export type PipelineStage =
  | 'initialization'
  | 'content-parsing'
  | 'language-detection'
  | 'context-inheritance'
  | 'command-extraction'
  | 'result-aggregation'
  | 'validation'
  | 'finalization';

/**
 * Pipeline execution result
 */
export interface PipelineResult extends ParseResult {
  /** Pipeline execution metadata */
  pipelineMetadata?: PipelineExecutionMetadata;
  /** Performance metrics */
  performanceMetrics?: any;
  /** Integration validation results */
  integrationValidation?: ValidationStatus;
}

/**
 * Main integration pipeline class
 */
export class IntegrationPipeline {
  private factory: ComponentFactory;
  private dependencies: ComponentDependencies;
  private performanceMonitor: PerformanceMonitor;
  private logger: Logger;
  private config: PipelineConfig;

  constructor(config: PipelineConfig = {}) {
    this.config = {
      enableLogging: true,
      logLevel: 'info' as const,
      pipelineTimeout: 30000, // 30 seconds
      enableRecovery: true,
      maxRetries: 3,
      ...config
    };

    this.factory = ComponentFactory.getInstance();
    this.factory.initialize(this.config);
    this.dependencies = this.factory.createDependencies();

    this.performanceMonitor = new PerformanceMonitor({
      enabled: this.config.enablePerformanceMonitoring !== false
    });

    this.logger = logger;
  }

  /**
   * Execute the complete integration pipeline
   */
  public async execute(content: string): Promise<PipelineResult> {
    const context: PipelineContext = {
      content,
      metadata: {
        startTime: new Date(),
        currentStage: 'initialization',
        completedStages: [],
        failedStages: [],
        recoveryAttempts: 0
      }
    };

    try {
      return await this.performanceMonitor.timeOperation('pipeline-execution', async () => {
        // Set up pipeline timeout
        const timeoutPromise = new Promise<PipelineResult>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Pipeline execution timeout after ${this.config.pipelineTimeout}ms`));
          }, this.config.pipelineTimeout);
        });

        const executionPromise = this.executeStages(context);

        return await Promise.race([executionPromise, timeoutPromise]);
      });
    } catch (error) {
      this.logger.error('IntegrationPipeline', 'Pipeline execution failed', error as Error, { error: (error as Error).message });

      return {
        success: false,
        errors: [{
          code: 'PIPELINE_EXECUTION_ERROR',
          message: `Pipeline execution failed: ${(error as Error).message}`,
          component: 'IntegrationPipeline',
          severity: 'error'
        }],
        pipelineMetadata: context.metadata,
        performanceMetrics: this.performanceMonitor.getAllStats()
      };
    }
  }

  /**
   * Execute all pipeline stages in sequence
   */
  private async executeStages(context: PipelineContext): Promise<PipelineResult> {
    const stages: PipelineStage[] = [
      'initialization',
      'content-parsing',
      'language-detection',
      'context-inheritance',
      'command-extraction',
      'result-aggregation',
      'validation',
      'finalization'
    ];

    let result: PipelineResult | null = null;
    let aggregatedData: any = null; // Store the aggregated data

    for (const stage of stages) {
      try {
        context.metadata.currentStage = stage;
        this.logger.info('IntegrationPipeline', `Executing pipeline stage: ${stage}`);

        result = await this.executeStage(stage, context);

        // Store aggregated data from result-aggregation stage
        if (stage === 'result-aggregation' && result.success && result.data) {
          aggregatedData = result.data;
        }

        if (!result.success && !this.config.enableRecovery) {
          // Early exit if recovery is disabled
          break;
        }

        context.metadata.completedStages.push(stage);
        this.logger.debug('IntegrationPipeline', `Completed pipeline stage: ${stage}`);

      } catch (error) {
        this.logger.error('IntegrationPipeline', `Pipeline stage failed: ${stage}`, error as Error, { error: (error as Error).message });
        context.metadata.failedStages.push(stage);

        if (this.config.enableRecovery && context.metadata.recoveryAttempts < this.config.maxRetries!) {
          // Attempt recovery
          const recoveryResult = await this.attemptRecovery(stage, context, error as Error);
          if (recoveryResult.success) {
            context.metadata.completedStages.push(stage);
            result = recoveryResult;
            // Store aggregated data from recovery if it's result-aggregation stage
            if (stage === 'result-aggregation' && recoveryResult.data) {
              aggregatedData = recoveryResult.data;
            }
            continue;
          }
        }

        // Recovery failed or disabled, return error result
        result = {
          success: false,
          errors: [{
            code: 'PIPELINE_STAGE_ERROR',
            message: `Pipeline stage '${stage}' failed: ${(error as Error).message}`,
            component: 'IntegrationPipeline',
            severity: 'error'
          }],
          pipelineMetadata: context.metadata,
          performanceMetrics: this.performanceMonitor.getAllStats()
        };
        break;
      }
    }

    // Finalize pipeline execution
    context.metadata.executionTime = Date.now() - context.metadata.startTime.getTime();

    // Use aggregated data if available, otherwise return the last result
    if (aggregatedData && result?.success) {
      return {
        ...result,
        data: aggregatedData,
        pipelineMetadata: context.metadata,
        performanceMetrics: this.performanceMonitor.getAllStats()
      };
    }

    return result || {
      success: false,
      errors: [{
        code: 'PIPELINE_INCOMPLETE',
        message: 'Pipeline execution incomplete',
        component: 'IntegrationPipeline',
        severity: 'error'
      }],
      pipelineMetadata: context.metadata,
      performanceMetrics: this.performanceMonitor.getAllStats()
    };
  }

  /**
   * Execute a specific pipeline stage
   */
  private async executeStage(stage: PipelineStage, context: PipelineContext): Promise<PipelineResult> {
    switch (stage) {
      case 'initialization':
        return await this.initializationStage(context);

      case 'content-parsing':
        return await this.contentParsingStage(context);

      case 'language-detection':
        return await this.languageDetectionStage(context);

      case 'context-inheritance':
        return await this.contextInheritanceStage(context);

      case 'command-extraction':
        return await this.commandExtractionStage(context);

      case 'result-aggregation':
        return await this.resultAggregationStage(context);

      case 'validation':
        return await this.validationStage(context);

      case 'finalization':
        return await this.finalizationStage(context);

      default:
        throw new Error(`Unknown pipeline stage: ${stage}`);
    }
  }

  /**
   * Initialization stage - prepare pipeline components
   */
  private async initializationStage(context: PipelineContext): Promise<PipelineResult> {
    this.logger.debug('IntegrationPipeline', 'Initializing pipeline components');

    // Validate input content
    if (!context.content || typeof context.content !== 'string') {
      throw new Error('Invalid input content');
    }

    if (context.content.trim().length === 0) {
      throw new Error('Empty input content');
    }

    // Initialize performance monitoring for this execution
    this.performanceMonitor.startOperation('pipeline-initialization');

    return { success: true };
  }

  /**
   * Content parsing stage - parse markdown content to AST
   */
  private async contentParsingStage(context: PipelineContext): Promise<PipelineResult> {
    this.logger.debug('IntegrationPipeline', 'Parsing content to AST');

    const { MarkdownParser } = await import('./utils/markdown-parser');
    const parser = new MarkdownParser();

    const parseResult = await parser.parseContent(context.content);

    if (!parseResult.success || !parseResult.data) {
      throw new Error('Failed to parse markdown content');
    }

    context.ast = parseResult.data.ast;

    return { success: true };
  }

  /**
   * Language detection stage - detect languages with context generation
   */
  private async languageDetectionStage(context: PipelineContext): Promise<PipelineResult> {
    this.logger.debug('IntegrationPipeline', 'Detecting languages with context generation');

    if (!context.ast) {
      throw new Error('AST not available for language detection');
    }

    const languageDetector = this.dependencies.languageDetector;
    const detectionResult = languageDetector.detectWithContext(context.ast!, context.content);

    // Store language contexts for next stages
    context.languageContexts = detectionResult.contexts;

    this.logger.info('IntegrationPipeline', `Detected ${detectionResult.contexts.length} language contexts`);

    return { success: true };
  }

  /**
   * Context inheritance stage - setup context inheritance for command extractor
   */
  private async contextInheritanceStage(context: PipelineContext): Promise<PipelineResult> {
    this.logger.debug('IntegrationPipeline', 'Setting up context inheritance');

    if (!context.languageContexts || context.languageContexts.length === 0) {
      this.logger.warn('IntegrationPipeline', 'No language contexts available for inheritance');
      // Continue with empty contexts - command extractor will use defaults
      context.languageContexts = [];
    }

    const commandExtractor = this.dependencies.commandExtractor;
    commandExtractor.setLanguageContexts(context.languageContexts);

    this.logger.info('IntegrationPipeline', `Set up context inheritance with ${context.languageContexts.length} contexts`);

    return { success: true };
  }

  /**
   * Command extraction stage - extract commands with context awareness
   */
  private async commandExtractionStage(context: PipelineContext): Promise<PipelineResult> {
    this.logger.debug('IntegrationPipeline', 'Extracting commands with context awareness');

    if (!context.ast) {
      throw new Error('AST not available for command extraction');
    }

    const commandExtractor = this.dependencies.commandExtractor;

    // Use context-aware extraction if contexts are available
    if (context.languageContexts && context.languageContexts.length > 0) {
      // Context should already be set from contextInheritanceStage, but ensure it's set
      commandExtractor.setLanguageContexts(context.languageContexts);

      // Use the context-aware extraction method
      context.commandResults = commandExtractor.extractWithContext(
        context.ast,
        context.content
      );

      this.logger.info('IntegrationPipeline', `Context-aware extraction: ${context.commandResults.commands.length} commands with ${context.languageContexts.length} contexts`);
    } else {
      // Fallback to regular extraction
      this.logger.warn('IntegrationPipeline', 'No language contexts available, using fallback extraction');

      const result = await commandExtractor.analyze(context.ast, context.content);
      if (result.success && result.data) {
        // Convert to CommandExtractionResult format
        const flattenedCommands = this.flattenCommands(result.data);
        context.commandResults = {
          commands: commandExtractor.assignDefaultContext(flattenedCommands, []),
          contextMappings: [],
          extractionMetadata: {
            totalCommands: flattenedCommands.length,
            languagesDetected: 0,
            contextBoundaries: 0,
            extractionTimestamp: new Date()
          }
        };
      }
    }

    if (!context.commandResults) {
      throw new Error('Command extraction failed');
    }

    this.logger.info('IntegrationPipeline', `Extracted ${context.commandResults.commands.length} commands`);

    return { success: true };
  }

  /**
   * Result aggregation stage - aggregate all analyzer results with enhanced error handling
   */
  private async resultAggregationStage(context: PipelineContext): Promise<PipelineResult> {
    this.logger.debug('IntegrationPipeline', 'Aggregating analyzer results');

    if (!context.ast) {
      throw new Error('AST not available for result aggregation');
    }

    // Run all analyzers and collect results with error isolation
    const analyzerResults = new Map<string, any>();
    const analyzerErrors: any[] = [];
    const analyzerWarnings: string[] = [];

    try {
      // Language detection results
      if (context.languageContexts) {
        const avgConfidence = context.languageContexts.length > 0
          ? context.languageContexts.reduce((sum, ctx) => sum + ctx.confidence, 0) / context.languageContexts.length
          : 0;

        analyzerResults.set('LanguageDetector', {
          data: context.languageContexts.map(ctx => ({
            name: ctx.language,
            confidence: ctx.confidence,
            sources: ['context-detection'],
            frameworks: ctx.metadata?.framework ? [ctx.metadata.framework] : undefined
          })),
          confidence: avgConfidence,
          sources: ['enhanced-detection']
        });

        this.logger.info('IntegrationPipeline', `Language detection: ${context.languageContexts.length} contexts, avg confidence: ${avgConfidence.toFixed(2)}`);
      } else {
        analyzerWarnings.push('No language contexts available from detection stage');
      }

      // Command extraction results
      if (context.commandResults) {
        const commandInfo = this.convertAssociatedCommandsToCommandInfo(context.commandResults.commands);
        const commandConfidence = this.calculateCommandConfidence(context.commandResults.commands);

        analyzerResults.set('CommandExtractor', {
          data: commandInfo,
          confidence: commandConfidence,
          sources: ['context-aware-extraction']
        });

        this.logger.info('IntegrationPipeline', `Command extraction: ${context.commandResults.commands.length} commands, confidence: ${commandConfidence.toFixed(2)}`);
      } else {
        analyzerWarnings.push('No command results available from extraction stage');
      }

      // Run other analyzers with error isolation
      await this.runAnalyzerWithErrorHandling(
        'DependencyExtractor',
        () => this.dependencies.dependencyExtractor.analyze(context.ast, context.content),
        analyzerResults,
        analyzerErrors
      );

      await this.runAnalyzerWithErrorHandling(
        'TestingDetector',
        () => this.dependencies.testingDetector.analyze(context.ast, context.content),
        analyzerResults,
        analyzerErrors
      );

      await this.runAnalyzerWithErrorHandling(
        'MetadataExtractor',
        () => this.dependencies.metadataExtractor.analyze(context.ast, context.content),
        analyzerResults,
        analyzerErrors
      );

      // Validate we have at least some results
      if (analyzerResults.size === 0) {
        throw new Error('No analyzer results available for aggregation');
      }

      // Aggregate results with conflict resolution
      const resultAggregator = this.dependencies.resultAggregator;
      const projectInfo = await this.performanceMonitor.timeOperation('result-aggregation', async () => {
        return await resultAggregator.aggregate(analyzerResults);
      });

      // Add integration metadata
      const integrationMetadata: IntegrationMetadata = {
        analyzersUsed: Array.from(analyzerResults.keys()),
        processingTime: Date.now() - context.metadata.startTime.getTime(),
        dataQuality: this.calculateAggregatedDataQuality(analyzerResults),
        completeness: this.calculateAggregatedCompleteness(analyzerResults),
        conflictsResolved: this.getConflictResolutions(resultAggregator),
        dataFlowValidation: {
          sequenceExecuted: context.metadata.completedStages,
          dependenciesResolved: context.languageContexts?.length || 0,
          validationsPassed: analyzerResults.size,
          totalValidations: analyzerResults.size + analyzerErrors.length,
          averageDataIntegrity: this.calculateDataIntegrity(context)
        }
      };

      const result: PipelineResult = {
        success: true,
        data: {
          ...projectInfo,
          // Add integration metadata to the project info
          confidence: {
            ...projectInfo.confidence,
            // Adjust overall confidence based on analyzer success rate
            overall: projectInfo.confidence.overall * (analyzerResults.size / (analyzerResults.size + analyzerErrors.length))
          }
        }
      };

      // Add warnings if any
      if (analyzerWarnings.length > 0) {
        result.warnings = analyzerWarnings;
      }

      // Add non-critical errors as warnings
      if (analyzerErrors.length > 0) {
        const errorWarnings = analyzerErrors.map(error =>
          `Analyzer ${error.analyzer} failed: ${error.message}`
        );
        result.warnings = [...(result.warnings || []), ...errorWarnings];
      }

      this.logger.info('IntegrationPipeline', `Result aggregation completed: ${analyzerResults.size} successful analyzers, ${analyzerErrors.length} failed`);

      return result;

    } catch (error) {
      this.logger.error('IntegrationPipeline', 'Result aggregation failed', error as Error, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Run an analyzer with error handling and isolation
   */
  private async runAnalyzerWithErrorHandling(
    analyzerName: string,
    analyzerFunction: () => Promise<any>,
    results: Map<string, any>,
    errors: any[]
  ): Promise<void> {
    try {
      this.logger.debug('IntegrationPipeline', `Running analyzer: ${analyzerName}`);

      const result = await this.performanceMonitor.timeOperation(`analyzer-${analyzerName}`, analyzerFunction);

      if (result.success) {
        results.set(analyzerName, result);
        this.logger.debug('IntegrationPipeline', `Analyzer ${analyzerName} completed successfully`);
      } else {
        errors.push({
          analyzer: analyzerName,
          message: result.errors?.[0]?.message || 'Unknown error',
          recoverable: true
        });
        this.logger.warn('IntegrationPipeline', `Analyzer ${analyzerName} failed but is recoverable`);
      }
    } catch (error) {
      errors.push({
        analyzer: analyzerName,
        message: (error as Error).message,
        recoverable: false
      });
      this.logger.error('IntegrationPipeline', `Analyzer ${analyzerName} failed with exception`, error as Error, { error: (error as Error).message });
    }
  }

  /**
   * Calculate aggregated data quality from analyzer results
   */
  private calculateAggregatedDataQuality(results: Map<string, any>): number {
    if (results.size === 0) return 0;

    let totalQuality = 0;
    let qualityCount = 0;

    for (const [analyzerName, result] of results) {
      if (typeof result.confidence === 'number') {
        totalQuality += result.confidence;
        qualityCount++;
      }
    }

    return qualityCount > 0 ? totalQuality / qualityCount : 0;
  }

  /**
   * Calculate aggregated completeness from analyzer results
   */
  private calculateAggregatedCompleteness(results: Map<string, any>): number {
    const expectedAnalyzers = ['LanguageDetector', 'CommandExtractor', 'DependencyExtractor', 'TestingDetector', 'MetadataExtractor'];
    const completedAnalyzers = Array.from(results.keys());

    return completedAnalyzers.length / expectedAnalyzers.length;
  }

  /**
   * Get conflict resolutions from result aggregator
   */
  private getConflictResolutions(resultAggregator: any): ConflictResolution[] {
    // This would be implemented based on the ResultAggregator's conflict resolution capabilities
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Validation stage - validate integration results
   */
  private async validationStage(context: PipelineContext): Promise<PipelineResult> {
    this.logger.debug('IntegrationPipeline', 'Validating integration results');

    // Basic validation - ensure we have some results
    const hasLanguageContexts = context.languageContexts && context.languageContexts.length > 0;
    const hasCommandResults = context.commandResults && context.commandResults.commands.length > 0;

    const validationStatus: ValidationStatus = {
      isValid: Boolean(hasLanguageContexts || hasCommandResults),
      completeness: this.calculateCompleteness(context),
      issues: []
    };

    if (!hasLanguageContexts) {
      validationStatus.issues.push({
        type: 'missing_data',
        severity: 'warning',
        message: 'No language contexts detected',
        component: 'LanguageDetector'
      });
    }

    if (!hasCommandResults) {
      validationStatus.issues.push({
        type: 'missing_data',
        severity: 'warning',
        message: 'No commands extracted',
        component: 'CommandExtractor'
      });
    }

    return {
      success: true,
      integrationValidation: validationStatus
    };
  }

  /**
   * Finalization stage - prepare final results
   */
  private async finalizationStage(context: PipelineContext): Promise<PipelineResult> {
    this.logger.debug('IntegrationPipeline', 'Finalizing pipeline results');

    // Create integration metadata
    const integrationMetadata: IntegrationMetadata = {
      analyzersUsed: ['LanguageDetector', 'CommandExtractor', 'DependencyExtractor', 'TestingDetector', 'MetadataExtractor'],
      processingTime: Date.now() - context.metadata.startTime.getTime(),
      dataQuality: this.calculateDataQuality(context),
      completeness: this.calculateCompleteness(context),
      conflictsResolved: [],
      dataFlowValidation: {
        sequenceExecuted: context.metadata.completedStages,
        dependenciesResolved: context.languageContexts?.length || 0,
        validationsPassed: context.metadata.completedStages.length,
        totalValidations: context.metadata.completedStages.length + context.metadata.failedStages.length,
        averageDataIntegrity: this.calculateDataIntegrity(context)
      }
    };

    return {
      success: true,
      pipelineMetadata: context.metadata,
      performanceMetrics: this.performanceMonitor.getAllStats(),
      data: {
        // This will be populated by the result aggregation stage
        metadata: { name: '', description: '', structure: [], environment: [] },
        languages: [],
        dependencies: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
        commands: { install: [], build: [], test: [], run: [], other: [] },
        testing: { frameworks: [], tools: [], configFiles: [], confidence: 0, testFiles: [], commands: [], coverage: { enabled: false, tools: [] } },
        confidence: { overall: 0, languages: 0, dependencies: 0, commands: 0, testing: 0, metadata: 0 }
      } as ProjectInfo
    };
  }

  /**
   * Attempt recovery from a failed pipeline stage with enhanced strategies
   */
  private async attemptRecovery(
    failedStage: PipelineStage,
    context: PipelineContext,
    error: Error
  ): Promise<PipelineResult> {
    context.metadata.recoveryAttempts++;
    this.logger.warn('IntegrationPipeline', `Attempting recovery for failed stage: ${failedStage}`, {
      attempt: context.metadata.recoveryAttempts,
      error: error.message,
      maxRetries: this.config.maxRetries
    });

    // Check if we've exceeded maximum retry attempts
    if (context.metadata.recoveryAttempts > this.config.maxRetries!) {
      this.logger.error('IntegrationPipeline', `Maximum recovery attempts exceeded for stage: ${failedStage}`);
      return {
        success: false,
        errors: [{
          code: 'MAX_RECOVERY_ATTEMPTS_EXCEEDED',
          message: `Maximum recovery attempts (${this.config.maxRetries}) exceeded for stage: ${failedStage}`,
          component: 'IntegrationPipeline',
          severity: 'error'
        }]
      };
    }

    // Implement stage-specific recovery strategies
    try {
      switch (failedStage) {
        case 'initialization':
          return await this.recoverInitialization(context, error);

        case 'content-parsing':
          return await this.recoverContentParsing(context, error);

        case 'language-detection':
          return await this.recoverLanguageDetection(context, error);

        case 'context-inheritance':
          return await this.recoverContextInheritance(context, error);

        case 'command-extraction':
          return await this.recoverCommandExtraction(context, error);

        case 'result-aggregation':
          return await this.recoverResultAggregation(context, error);

        case 'validation':
          return await this.recoverValidation(context, error);

        case 'finalization':
          return await this.recoverFinalization(context, error);

        default:
          return await this.genericRecovery(failedStage, context, error);
      }
    } catch (recoveryError) {
      this.logger.error('IntegrationPipeline', `Recovery attempt failed for stage: ${failedStage}`, recoveryError as Error, {
        originalError: error.message,
        recoveryError: (recoveryError as Error).message
      });

      return {
        success: false,
        errors: [{
          code: 'RECOVERY_ATTEMPT_FAILED',
          message: `Recovery attempt failed for stage: ${failedStage}: ${(recoveryError as Error).message}`,
          component: 'IntegrationPipeline',
          severity: 'error'
        }]
      };
    }
  }

  /**
   * Recovery strategy for initialization stage
   */
  private async recoverInitialization(context: PipelineContext, error: Error): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', 'Attempting initialization recovery');

    // Try to reinitialize with minimal configuration
    try {
      if (!context.content) {
        context.content = '# Default Content\n\nRecovery content for failed initialization.';
      }

      // Validate content length
      if (context.content.length > 1024 * 1024) {
        context.content = context.content.substring(0, 1024 * 1024);
        this.logger.warn('IntegrationPipeline', 'Content truncated during initialization recovery');
      }

      return { success: true };
    } catch (recoveryError) {
      throw new Error(`Initialization recovery failed: ${(recoveryError as Error).message}`);
    }
  }

  /**
   * Recovery strategy for content parsing stage
   */
  private async recoverContentParsing(context: PipelineContext, error: Error): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', 'Attempting content parsing recovery');

    try {
      // Try to clean the content and parse again
      const cleanedContent = this.cleanContentForParsing(context.content);

      const { MarkdownParser } = await import('./utils/markdown-parser');
      const parser = new MarkdownParser();

      const parseResult = await parser.parseContent(cleanedContent);

      if (parseResult.success && parseResult.data) {
        context.ast = parseResult.data.ast;
        context.content = cleanedContent; // Use cleaned content
        this.logger.info('IntegrationPipeline', 'Content parsing recovery successful');
        return { success: true };
      } else {
        // Create minimal AST as last resort
        context.ast = this.createMinimalAST(context.content);
        this.logger.warn('IntegrationPipeline', 'Using minimal AST for content parsing recovery');
        return { success: true };
      }
    } catch (recoveryError) {
      throw new Error(`Content parsing recovery failed: ${(recoveryError as Error).message}`);
    }
  }

  /**
   * Recovery strategy for language detection stage
   */
  private async recoverLanguageDetection(context: PipelineContext, error: Error): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', 'Attempting language detection recovery');

    try {
      // Create default language contexts based on content analysis
      const defaultContexts = this.createDefaultLanguageContexts(context.content);
      context.languageContexts = defaultContexts;

      this.logger.info('IntegrationPipeline', `Language detection recovery: created ${defaultContexts.length} default contexts`);
      return { success: true };
    } catch (recoveryError) {
      throw new Error(`Language detection recovery failed: ${(recoveryError as Error).message}`);
    }
  }

  /**
   * Recovery strategy for context inheritance stage
   */
  private async recoverContextInheritance(context: PipelineContext, error: Error): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', 'Attempting context inheritance recovery');

    try {
      // Ensure we have at least empty contexts
      if (!context.languageContexts) {
        context.languageContexts = [];
      }

      // Set up command extractor with available contexts
      const commandExtractor = this.dependencies.commandExtractor;
      commandExtractor.setLanguageContexts(context.languageContexts);

      this.logger.info('IntegrationPipeline', 'Context inheritance recovery successful');
      return { success: true };
    } catch (recoveryError) {
      throw new Error(`Context inheritance recovery failed: ${(recoveryError as Error).message}`);
    }
  }

  /**
   * Recovery strategy for command extraction stage
   */
  private async recoverCommandExtraction(context: PipelineContext, error: Error): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', 'Attempting command extraction recovery');

    try {
      if (!context.ast) {
        throw new Error('AST not available for command extraction recovery');
      }

      // Try basic command extraction without context
      const commandExtractor = this.dependencies.commandExtractor;
      const result = await commandExtractor.analyze(context.ast, context.content);

      if (result.success && result.data) {
        // Convert to CommandExtractionResult format
        const flatCommands = this.flattenCommands(result.data);
        context.commandResults = {
          commands: commandExtractor.assignDefaultContext(flatCommands, context.languageContexts || []),
          contextMappings: [],
          extractionMetadata: {
            totalCommands: flatCommands.length,
            languagesDetected: context.languageContexts?.length || 0,
            contextBoundaries: 0,
            extractionTimestamp: new Date()
          }
        };

        this.logger.info('IntegrationPipeline', `Command extraction recovery: extracted ${flatCommands.length} commands`);
        return { success: true };
      } else {
        // Create empty command results as last resort
        context.commandResults = {
          commands: [],
          contextMappings: [],
          extractionMetadata: {
            totalCommands: 0,
            languagesDetected: 0,
            contextBoundaries: 0,
            extractionTimestamp: new Date()
          }
        };

        this.logger.warn('IntegrationPipeline', 'Command extraction recovery: using empty results');
        return { success: true };
      }
    } catch (recoveryError) {
      throw new Error(`Command extraction recovery failed: ${(recoveryError as Error).message}`);
    }
  }

  /**
   * Recovery strategy for result aggregation stage
   */
  private async recoverResultAggregation(context: PipelineContext, error: Error): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', 'Attempting result aggregation recovery');

    try {
      // Create minimal project info from available data
      const projectInfo = this.createMinimalProjectInfo(context);

      return {
        success: true,
        data: projectInfo,
        warnings: ['Result aggregation recovered with minimal data']
      };
    } catch (recoveryError) {
      throw new Error(`Result aggregation recovery failed: ${(recoveryError as Error).message}`);
    }
  }

  /**
   * Recovery strategy for validation stage
   */
  private async recoverValidation(context: PipelineContext, error: Error): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', 'Attempting validation recovery');

    try {
      // Create minimal validation status
      const validationStatus: ValidationStatus = {
        isValid: true, // Allow recovery to proceed
        completeness: 0.5, // Partial completeness
        issues: [{
          type: 'incomplete',
          severity: 'warning',
          message: 'Validation recovered with reduced completeness',
          component: 'IntegrationPipeline'
        }]
      };

      return {
        success: true,
        integrationValidation: validationStatus
      };
    } catch (recoveryError) {
      throw new Error(`Validation recovery failed: ${(recoveryError as Error).message}`);
    }
  }

  /**
   * Recovery strategy for finalization stage
   */
  private async recoverFinalization(context: PipelineContext, error: Error): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', 'Attempting finalization recovery');

    try {
      // Create minimal finalization result
      return {
        success: true,
        pipelineMetadata: context.metadata,
        performanceMetrics: this.performanceMonitor.getAllStats(),
        warnings: ['Pipeline finalized with recovery mode']
      };
    } catch (recoveryError) {
      throw new Error(`Finalization recovery failed: ${(recoveryError as Error).message}`);
    }
  }

  /**
   * Generic recovery strategy for unknown stages
   */
  private async genericRecovery(
    stage: PipelineStage,
    context: PipelineContext,
    error: Error
  ): Promise<PipelineResult> {
    this.logger.info('IntegrationPipeline', `Applying generic recovery for stage: ${stage}`);

    // Generic recovery: log the error and continue
    this.logger.warn('IntegrationPipeline', `Generic recovery applied for stage: ${stage}`, { error: error.message });

    return {
      success: true,
      warnings: [`Stage ${stage} recovered with generic strategy`]
    };
  }

  // Recovery utility methods

  /**
   * Clean content for parsing by removing problematic characters
   */
  private cleanContentForParsing(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Handle old Mac line endings
      .replace(/\0/g, '')     // Remove null characters
      .trim();
  }

  /**
   * Create minimal AST for recovery
   */
  private createMinimalAST(content: string): any[] {
    return [{
      type: 'paragraph',
      children: [{
        type: 'text',
        value: content.substring(0, 100) + (content.length > 100 ? '...' : '')
      }]
    }];
  }

  /**
   * Create default language contexts based on simple content analysis
   */
  private createDefaultLanguageContexts(content: string): LanguageContext[] {
    const contexts: LanguageContext[] = [];
    const lowerContent = content.toLowerCase();

    // Simple heuristics for common languages
    const languageHeuristics = [
      { language: 'JavaScript', keywords: ['javascript', 'js', 'npm', 'node'] },
      { language: 'Python', keywords: ['python', 'py', 'pip'] },
      { language: 'Java', keywords: ['java', 'maven', 'gradle'] },
      { language: 'TypeScript', keywords: ['typescript', 'ts'] }
    ];

    for (const heuristic of languageHeuristics) {
      const matches = heuristic.keywords.filter(keyword => lowerContent.includes(keyword));
      if (matches.length > 0) {
        contexts.push({
          language: heuristic.language,
          confidence: Math.min(0.6, matches.length * 0.2),
          sourceRange: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
          evidence: matches.map(keyword => ({
            type: 'keyword',
            value: keyword,
            confidence: 0.5,
            location: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 }
          })),
          metadata: {
            createdAt: new Date(),
            source: 'recovery-heuristic'
          }
        });
      }
    }

    // Always include an unknown context as fallback
    if (contexts.length === 0) {
      contexts.push({
        language: 'unknown',
        confidence: 0.1,
        sourceRange: { startLine: 0, endLine: 0, startColumn: 0, endColumn: 0 },
        evidence: [],
        metadata: {
          createdAt: new Date(),
          source: 'recovery-fallback'
        }
      });
    }

    return contexts;
  }

  /**
   * Create minimal project info for recovery
   */
  private createMinimalProjectInfo(context: PipelineContext): any {
    return {
      metadata: {
        name: 'Unknown Project',
        description: 'Project information recovered from partial data',
        structure: [],
        environment: []
      },
      languages: context.languageContexts?.map(ctx => ({
        name: ctx.language,
        confidence: ctx.confidence,
        sources: ['recovery']
      })) || [],
      dependencies: {
        packageFiles: [],
        installCommands: [],
        packages: [],
        dependencies: [],
        devDependencies: []
      },
      commands: context.commandResults ?
        this.convertAssociatedCommandsToCommandInfo(context.commandResults.commands) :
        { install: [], build: [], test: [], run: [], other: [] },
      testing: {
        frameworks: [],
        tools: [],
        configFiles: [],
        confidence: 0,
        testFiles: [],
        commands: [],
        coverage: { enabled: false, tools: [] }
      },
      confidence: {
        overall: 0.3, // Low confidence for recovery
        languages: context.languageContexts ? 0.4 : 0.1,
        dependencies: 0.1,
        commands: context.commandResults ? 0.3 : 0.1,
        testing: 0.1,
        metadata: 0.2
      }
    };
  }

  // Utility methods

  private flattenCommands(commandInfo: any): any[] {
    const commands: any[] = [];
    if (commandInfo.install) commands.push(...commandInfo.install);
    if (commandInfo.build) commands.push(...commandInfo.build);
    if (commandInfo.test) commands.push(...commandInfo.test);
    if (commandInfo.run) commands.push(...commandInfo.run);
    if (commandInfo.other) commands.push(...commandInfo.other);
    if (commandInfo.deploy) commands.push(...commandInfo.deploy);
    return commands;
  }

  private countCommands(commandInfo: any): number {
    return this.flattenCommands(commandInfo).length;
  }

  private convertAssociatedCommandsToCommandInfo(associatedCommands: any[]): any {
    const commandInfo = {
      install: [],
      build: [],
      test: [],
      run: [],
      other: [],
      deploy: []
    };

    // Use proper command categorization logic
    associatedCommands.forEach(cmd => {
      const command = cmd.command || cmd;
      const category = this.categorizeCommand(command);

      if (category in commandInfo) {
        (commandInfo as any)[category].push(cmd);
      } else {
        (commandInfo.other as any[]).push(cmd);
      }
    });

    return commandInfo;
  }

  /**
   * Categorize a single command using proper logic from CommandExtractor
   */
  private categorizeCommand(commandText: string): string {
    const cmd = commandText.toLowerCase();

    // Build commands
    if (/\b(build|compile|assemble|package|dist)\b/.test(cmd) ||
        /^make(\s|$)/.test(cmd) ||
        /^make\s+(all|build)/.test(cmd) ||
        /^cmake\s+--build/.test(cmd) ||
        /^cmake\s+.*-dcmake_build_type/.test(cmd) ||
        /^python\s+setup\.py\s+build/.test(cmd) ||
        /^python\s+-m\s+build/.test(cmd) ||
        /^docker-compose\s+build/.test(cmd)) {
      return 'build';
    }

    // Test commands
    if (/\b(test|spec|check|verify|junit|pytest|rspec)\b/.test(cmd)) {
      return 'test';
    }

    // Install commands
    if ((/\b(install|add|get|restore|dependencies)\b/.test(cmd) &&
         !/\bgo\s+install\b/.test(cmd)) || // go install is a build command
        /^npm\s+(install|i)(\s|$)/.test(cmd) ||
        /^pip\s+install/.test(cmd)) {
      return 'install';
    }

    // Deploy commands
    if (/\b(deploy|publish|release|kubectl|helm)\b/.test(cmd)) {
      return 'deploy';
    }

    // Run commands
    if (/\b(start|run|serve|server|dev|development)\b/.test(cmd) ||
        /^(python|node|java|ruby|php)\s+\w+/.test(cmd) ||
        /^cargo\s+run/.test(cmd) ||
        /^java\s+-jar/.test(cmd) ||
        /^java\s+\w+/.test(cmd) ||
        /^\.\//.test(cmd)) {
      return 'run';
    }

    // Docker commands (other category)
    if (/^docker\s+(build|run|exec|ps|images)/.test(cmd) ||
        /^docker-compose\s+(up|down|logs|ps)/.test(cmd)) {
      return 'other';
    }

    return 'other';
  }

  private calculateCommandConfidence(commands: any[]): number {
    if (commands.length === 0) return 0;

    const totalConfidence = commands.reduce((sum, cmd) => {
      return sum + (cmd.contextConfidence || cmd.confidence || 0);
    }, 0);

    return totalConfidence / commands.length;
  }

  private calculateCompleteness(context: PipelineContext): number {
    let completeness = 0;

    if (context.languageContexts && context.languageContexts.length > 0) {
      completeness += 0.3;
    }

    if (context.commandResults && context.commandResults.commands.length > 0) {
      completeness += 0.3;
    }

    if (context.ast) {
      completeness += 0.2;
    }

    if (context.metadata.completedStages.length > 0) {
      completeness += 0.2;
    }

    return Math.min(completeness, 1.0);
  }

  private calculateDataQuality(context: PipelineContext): number {
    let quality = 0;
    let factors = 0;

    if (context.languageContexts) {
      const avgConfidence = context.languageContexts.reduce((sum, ctx) => sum + ctx.confidence, 0) / context.languageContexts.length;
      quality += avgConfidence;
      factors++;
    }

    if (context.commandResults) {
      const avgConfidence = this.calculateCommandConfidence(context.commandResults.commands);
      quality += avgConfidence;
      factors++;
    }

    return factors > 0 ? quality / factors : 0;
  }

  private calculateDataIntegrity(context: PipelineContext): number {
    const totalStages = context.metadata.completedStages.length + context.metadata.failedStages.length;
    if (totalStages === 0) return 0;

    return context.metadata.completedStages.length / totalStages;
  }

  /**
   * Get pipeline performance metrics
   */
  public getPerformanceMetrics(): any {
    return this.performanceMonitor.getAllStats();
  }

  /**
   * Get pipeline health status
   */
  public getHealthStatus(): PipelineHealthStatus {
    const stats = this.performanceMonitor.getAllStats();
    const memoryUsage = process.memoryUsage();

    return {
      status: 'healthy', // This could be determined by various factors
      uptime: Date.now() - (this.performanceMonitor as any).startTime || 0,
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      performanceStats: stats,
      lastExecutionTime: 0,
      averageExecutionTime: 0,
      totalExecutions: 0
    };
  }

  /**
   * Clear performance data and reset monitoring
   */
  public clearPerformanceData(): void {
    this.performanceMonitor.clear();
    this.logger.info('IntegrationPipeline', 'Pipeline performance data cleared');
  }

  /**
   * Enable or disable detailed logging
   */
  public setLoggingLevel(level: LogLevel): void {
    this.logger.updateConfig({ level });
    this.logger.info('IntegrationPipeline', `Pipeline logging level set to: ${level}`);
  }

  /**
   * Get current pipeline configuration
   */
  public getConfiguration(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Update pipeline configuration
   */
  public updateConfiguration(newConfig: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('IntegrationPipeline', 'Pipeline configuration updated', { newConfig });
  }
}

/**
 * Pipeline health status interface
 */
export interface PipelineHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  performanceStats: any;
  lastExecutionTime: number;
  averageExecutionTime: number;
  totalExecutions: number;
}

/**
 * Factory function to create and execute integration pipeline
 */
export async function executeIntegrationPipeline(
  content: string,
  config?: PipelineConfig
): Promise<PipelineResult> {
  const pipeline = new IntegrationPipeline(config);
  return await pipeline.execute(content);
}

/**
 * Factory function to create integration pipeline instance
 */
export function createIntegrationPipeline(config?: PipelineConfig): IntegrationPipeline {
  return new IntegrationPipeline(config);
}

/**
 * Utility function to validate pipeline configuration
 */
export function validatePipelineConfig(config: PipelineConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.pipelineTimeout !== undefined && config.pipelineTimeout <= 0) {
    errors.push('Pipeline timeout must be positive');
  }

  if (config.maxRetries !== undefined && config.maxRetries < 0) {
    errors.push('Max retries must be non-negative');
  }

  if (config.confidenceThreshold !== undefined &&
    (config.confidenceThreshold < 0 || config.confidenceThreshold > 1)) {
    errors.push('Confidence threshold must be between 0 and 1');
  }

  if (config.maxContexts !== undefined && config.maxContexts < 0) {
    errors.push('Max contexts must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}