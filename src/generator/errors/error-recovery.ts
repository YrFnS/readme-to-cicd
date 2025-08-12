/**
 * Error recovery utilities for YAML generation
 */

import { GenerationError, GenericGenerationError, GenerationStage, AggregateGenerationError } from './generation-errors';
import { WorkflowTemplate, JobTemplate, StepTemplate } from '../types';
import { ValidationResult } from '../interfaces';

/**
 * Result type for generation operations that can fail
 */
export type GenerationResult<T, E = GenerationError> = 
  | { success: true; data: T; warnings?: string[] }
  | { success: false; error: E; partialData?: T };

/**
 * Retry configuration for generation operations
 */
export interface GenerationRetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStages: GenerationStage[];
  retryableErrorCodes: string[];
}

/**
 * Default retry configuration for generation
 */
export const DEFAULT_GENERATION_RETRY_CONFIG: GenerationRetryConfig = {
  maxAttempts: 3,
  baseDelay: 200,
  maxDelay: 2000,
  backoffMultiplier: 2,
  retryableStages: ['template-loading', 'framework-analysis', 'step-generation', 'optimization'],
  retryableErrorCodes: [
    'TEMPLATE_LOAD_ERROR',
    'TEMPLATE_COMPILATION_ERROR',
    'STEP_GENERATION_ERROR',
    'OPTIMIZATION_ERROR'
  ]
};

/**
 * Fallback configuration for template recovery
 */
export interface FallbackConfig {
  enableTemplateFallback: boolean;
  enableGenericTemplates: boolean;
  enablePartialGeneration: boolean;
  minimumRequiredSteps: string[];
  fallbackTemplateHierarchy: string[];
}

/**
 * Default fallback configuration
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enableTemplateFallback: true,
  enableGenericTemplates: true,
  enablePartialGeneration: true,
  minimumRequiredSteps: ['checkout', 'setup', 'build', 'test'],
  fallbackTemplateHierarchy: [
    'project-specific',
    'framework-specific',
    'language-specific',
    'generic'
  ]
};

/**
 * Partial generation result
 */
export interface PartialGenerationResult {
  completedStages: GenerationStage[];
  failedStage: GenerationStage;
  partialWorkflow: Partial<WorkflowTemplate>;
  errors: GenerationError[];
  warnings: string[];
  isUsable: boolean;
}

/**
 * Error recovery utilities for YAML generation
 */
export class GenerationErrorRecovery {
  private retryConfig: GenerationRetryConfig;
  private fallbackConfig: FallbackConfig;

  constructor(
    retryConfig: Partial<GenerationRetryConfig> = {},
    fallbackConfig: Partial<FallbackConfig> = {}
  ) {
    this.retryConfig = { ...DEFAULT_GENERATION_RETRY_CONFIG, ...retryConfig };
    this.fallbackConfig = { ...DEFAULT_FALLBACK_CONFIG, ...fallbackConfig };
  }

  /**
   * Execute generation operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    stage: GenerationStage,
    context: Record<string, any> = {}
  ): Promise<GenerationResult<T, GenerationError>> {
    let lastError: GenerationError | null = null;
    const warnings: string[] = [];

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Add warning if we had to retry
        if (attempt > 1) {
          warnings.push(`Operation succeeded after ${attempt} attempts`);
        }
        
        return { success: true, data: result, warnings };
      } catch (error) {
        const generationError = error instanceof GenerationError 
          ? error 
          : new GenericGenerationError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR',
              'unknown',
              stage,
              true,
              context
            );

        lastError = generationError;

        // Don't retry if error is not recoverable or not in retryable list
        if (!generationError.recoverable || 
            !this.retryConfig.retryableStages.includes(stage) ||
            !this.retryConfig.retryableErrorCodes.includes(generationError.code)) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );

        warnings.push(`Attempt ${attempt} failed, retrying in ${delay}ms: ${generationError.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { 
      success: false, 
      error: lastError || new GenericGenerationError('Operation failed', 'UNKNOWN_ERROR', 'unknown', stage)
    };
  }

  /**
   * Execute operation with template fallback
   */
  async withTemplateFallback<T>(
    primaryOperation: (templateName: string) => Promise<T>,
    templateHierarchy: string[],
    stage: GenerationStage,
    context: Record<string, any> = {}
  ): Promise<GenerationResult<T, GenerationError>> {
    const warnings: string[] = [];
    let lastError: GenerationError | null = null;

    if (!this.fallbackConfig.enableTemplateFallback) {
      if (templateHierarchy.length === 0) {
        return {
          success: false,
          error: new GenericGenerationError('No templates provided', 'NO_TEMPLATES', 'template-manager', stage)
        };
      }
      try {
        const result = await primaryOperation(templateHierarchy[0]!);
        return { success: true, data: result };
      } catch (error) {
        const generationError = error instanceof GenerationError 
          ? error 
          : new GenericGenerationError(
              error instanceof Error ? error.message : 'Unknown error',
              'TEMPLATE_ERROR',
              'template-manager',
              stage,
              false,
              context
            );
        return { success: false, error: generationError };
      }
    }

    // Try each template in the hierarchy
    for (const templateName of templateHierarchy) {
      try {
        const result = await primaryOperation(templateName);
        
        // Add warning if we had to use fallback
        if (templateName !== templateHierarchy[0]) {
          warnings.push(`Used fallback template '${templateName}' instead of '${templateHierarchy[0]!}'`);
        }
        
        return { success: true, data: result, warnings };
      } catch (error) {
        const generationError = error instanceof GenerationError 
          ? error 
          : new GenericGenerationError(
              error instanceof Error ? error.message : 'Unknown error',
              'TEMPLATE_ERROR',
              'template-manager',
              stage,
              true,
              { templateName, ...context }
            );

        lastError = generationError;
        warnings.push(`Template '${templateName}' failed: ${generationError.message}`);
      }
    }

    return { 
      success: false, 
      error: lastError || new GenericGenerationError('All template fallbacks failed', 'TEMPLATE_FALLBACK_ERROR', 'template-manager', stage)
    };
  }

  /**
   * Execute operation with graceful degradation
   */
  async withGracefulDegradation<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    stage: GenerationStage,
    degradationCondition?: (error: GenerationError) => boolean
  ): Promise<GenerationResult<T, GenerationError>> {
    try {
      const result = await primaryOperation();
      return { success: true, data: result };
    } catch (error) {
      const generationError = error instanceof GenerationError 
        ? error 
        : new GenericGenerationError(
            error instanceof Error ? error.message : 'Unknown error',
            'OPERATION_ERROR',
            'unknown',
            stage,
            true
          );

      // Use fallback if condition is met or no condition provided
      if (!degradationCondition || degradationCondition(generationError)) {
        try {
          const fallbackResult = await fallbackOperation();
          const warnings = [`Used fallback operation due to: ${generationError.message}`];
          return { success: true, data: fallbackResult, warnings };
        } catch (fallbackError) {
          const fallbackGenerationError = fallbackError instanceof GenerationError 
            ? fallbackError 
            : new GenericGenerationError(
                fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error',
                'FALLBACK_ERROR',
                'unknown',
                stage,
                false
              );
          
          return { success: false, error: fallbackGenerationError };
        }
      }

      return { success: false, error: generationError };
    }
  }

  /**
   * Attempt partial generation when full generation fails
   */
  async attemptPartialGeneration(
    generationStages: Array<{
      name: GenerationStage;
      operation: () => Promise<any>;
      required: boolean;
    }>,
    context: Record<string, any> = {}
  ): Promise<GenerationResult<PartialGenerationResult, AggregateGenerationError>> {
    if (!this.fallbackConfig.enablePartialGeneration) {
      return {
        success: false,
        error: new AggregateGenerationError([], { reason: 'Partial generation disabled' })
      };
    }

    const completedStages: GenerationStage[] = [];
    const errors: GenerationError[] = [];
    const warnings: string[] = [];
    const results: Record<string, any> = {};
    let failedStage: GenerationStage = 'initialization';

    for (const stage of generationStages) {
      try {
        const result = await stage.operation();
        results[stage.name] = result;
        completedStages.push(stage.name);
      } catch (error) {
        let generationError = error instanceof GenerationError 
          ? error 
          : new GenericGenerationError(
              error instanceof Error ? error.message : 'Unknown error',
              'STAGE_ERROR',
              'generator',
              stage.name,
              !stage.required // recoverable only if not required
            );

        // Override recoverability for required stages
        if (stage.required && generationError.recoverable) {
          generationError = new GenericGenerationError(
            generationError.message,
            generationError.code,
            generationError.component,
            generationError.stage,
            false, // not recoverable for required stages
            generationError.context
          );
        }

        errors.push(generationError);
        failedStage = stage.name;

        // If this is a required stage, stop partial generation
        if (stage.required) {
          warnings.push(`Required stage '${stage.name}' failed, stopping partial generation`);
          break;
        }

        warnings.push(`Optional stage '${stage.name}' failed, continuing with partial generation`);
      }
    }

    // Check if we have minimum required components
    const hasMinimumRequirements = completedStages.length > 0;

    const partialResult: PartialGenerationResult = {
      completedStages,
      failedStage,
      partialWorkflow: this.buildPartialWorkflow(results),
      errors,
      warnings,
      isUsable: hasMinimumRequirements && completedStages.length > 0
    };

    if (errors.length === 0) {
      return { success: true, data: partialResult };
    }

    // If we have critical errors (required stage failures), return failure
    const hasCriticalErrors = errors.some(error => !error.recoverable);
    
    // Return partial result even with errors if it's usable and no critical errors
    if (partialResult.isUsable && !hasCriticalErrors) {
      return { 
        success: true, 
        data: partialResult, 
        warnings: [`Partial generation completed with ${errors.length} non-critical errors`]
      };
    }

    return {
      success: false,
      error: new AggregateGenerationError(errors, context),
      partialData: partialResult
    };
  }

  /**
   * Safely execute operation with error containment
   */
  async safely<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    stage: GenerationStage,
    onError?: (error: GenerationError) => void
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const generationError = error instanceof GenerationError 
        ? error 
        : new GenericGenerationError(
            error instanceof Error ? error.message : 'Unknown error',
            'SAFE_OPERATION_ERROR',
            'unknown',
            stage,
            true
          );

      if (onError) {
        onError(generationError);
      }

      return defaultValue;
    }
  }

  /**
   * Validate generation input and return result
   */
  validateInput<T>(
    value: T,
    validator: (value: T) => boolean,
    errorMessage: string,
    stage: GenerationStage,
    errorCode: string = 'INPUT_VALIDATION_ERROR'
  ): GenerationResult<T, GenerationError> {
    if (validator(value)) {
      return { success: true, data: value };
    }

    return {
      success: false,
      error: new GenericGenerationError(errorMessage, errorCode, 'input-validator', stage, false)
    };
  }

  /**
   * Build partial workflow from completed results
   */
  private buildPartialWorkflow(results: Record<string, any>): Partial<WorkflowTemplate> {
    const partialWorkflow: Partial<WorkflowTemplate> = {};

    if (results.name) {
      partialWorkflow.name = results.name;
    }

    if (results.triggers) {
      partialWorkflow.triggers = results.triggers;
    }

    if (results.jobs) {
      partialWorkflow.jobs = results.jobs;
    } else if (results.steps) {
      // Create a basic job from steps
      partialWorkflow.jobs = [{
        name: 'build',
        runsOn: 'ubuntu-latest',
        steps: results.steps
      }];
    }

    if (results.permissions) {
      partialWorkflow.permissions = results.permissions;
    }

    if (results.environment) {
      partialWorkflow.environment = results.environment;
    }

    return partialWorkflow;
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(newConfig: Partial<GenerationRetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...newConfig };
  }

  /**
   * Update fallback configuration
   */
  updateFallbackConfig(newConfig: Partial<FallbackConfig>): void {
    this.fallbackConfig = { ...this.fallbackConfig, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): { retry: GenerationRetryConfig; fallback: FallbackConfig } {
    return {
      retry: { ...this.retryConfig },
      fallback: { ...this.fallbackConfig }
    };
  }
}