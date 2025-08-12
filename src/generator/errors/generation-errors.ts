/**
 * Custom error classes for YAML generation
 */

/**
 * Base error class for all generation-related errors
 */
export abstract class GenerationError extends Error {
  public readonly code: string;
  public readonly component: string;
  public readonly recoverable: boolean;
  public readonly context: Record<string, any>;
  public readonly stage: GenerationStage;

  constructor(
    message: string,
    code: string,
    component: string,
    stage: GenerationStage,
    recoverable: boolean = false,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.component = component;
    this.stage = stage;
    this.recoverable = recoverable;
    this.context = context;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to structured log format
   */
  toLogFormat(): Record<string, any> {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      component: this.component,
      stage: this.stage,
      recoverable: this.recoverable,
      context: this.context,
      stack: this.stack,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get user-friendly error message with suggestions
   */
  getUserMessage(): string {
    return this.message;
  }

  /**
   * Get suggested recovery actions
   */
  getRecoveryActions(): string[] {
    return [];
  }
}

/**
 * Generation stages for error context
 */
export type GenerationStage = 
  | 'initialization'
  | 'template-loading'
  | 'framework-analysis'
  | 'step-generation'
  | 'optimization'
  | 'validation'
  | 'rendering'
  | 'output';

/**
 * Error thrown when template loading fails
 */
export class TemplateLoadError extends GenerationError {
  constructor(
    templateName: string,
    templatePath: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    const message = `Failed to load template '${templateName}' from ${templatePath}${cause ? `: ${cause.message}` : ''}`;
    super(message, 'TEMPLATE_LOAD_ERROR', 'template-manager', 'template-loading', true, {
      templateName,
      templatePath,
      cause: cause?.message,
      ...context
    });
  }

  getUserMessage(): string {
    return `Template '${this.context.templateName}' could not be loaded. This may be due to a missing template file or invalid template syntax.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Check if the template file exists at the specified path',
      'Verify template syntax is valid',
      'Use a fallback template if available',
      'Check file permissions for template directory'
    ];
  }
}

/**
 * Error thrown when template compilation fails
 */
export class TemplateCompilationError extends GenerationError {
  constructor(
    templateName: string,
    compilationError: string,
    context: Record<string, any> = {}
  ) {
    const message = `Template '${templateName}' compilation failed: ${compilationError}`;
    super(message, 'TEMPLATE_COMPILATION_ERROR', 'template-manager', 'template-loading', true, {
      templateName,
      compilationError,
      ...context
    });
  }

  getUserMessage(): string {
    return `Template '${this.context.templateName}' has syntax errors and cannot be compiled.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Check template syntax for Handlebars errors',
      'Verify all template variables are properly defined',
      'Use a simpler template as fallback',
      'Review template documentation for correct syntax'
    ];
  }
}

/**
 * Error thrown when framework detection data is invalid
 */
export class FrameworkDataError extends GenerationError {
  constructor(
    message: string,
    frameworkName: string,
    validationErrors: string[],
    context: Record<string, any> = {}
  ) {
    super(message, 'FRAMEWORK_DATA_ERROR', 'framework-analyzer', 'framework-analysis', true, {
      frameworkName,
      validationErrors,
      ...context
    });
  }

  getUserMessage(): string {
    return `Framework data for '${this.context.frameworkName}' is invalid or incomplete.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Verify framework detection results are complete',
      'Check if all required framework properties are present',
      'Use generic templates as fallback',
      'Re-run framework detection with verbose logging'
    ];
  }
}

/**
 * Error thrown when step generation fails
 */
export class StepGenerationError extends GenerationError {
  constructor(
    stepType: string,
    frameworkName: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    const message = `Failed to generate ${stepType} steps for ${frameworkName}${cause ? `: ${cause.message}` : ''}`;
    super(message, 'STEP_GENERATION_ERROR', 'step-generator', 'step-generation', true, {
      stepType,
      frameworkName,
      cause: cause?.message,
      ...context
    });
  }

  getUserMessage(): string {
    return `Could not generate ${this.context.stepType} steps for ${this.context.frameworkName} framework.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Use generic steps for this framework',
      'Check if framework-specific templates exist',
      'Verify framework configuration is complete',
      'Try with reduced optimization level'
    ];
  }
}

/**
 * Error thrown when workflow optimization fails
 */
export class OptimizationError extends GenerationError {
  constructor(
    optimizationType: string,
    reason: string,
    context: Record<string, any> = {}
  ) {
    const message = `Optimization '${optimizationType}' failed: ${reason}`;
    super(message, 'OPTIMIZATION_ERROR', 'optimizer', 'optimization', true, {
      optimizationType,
      reason,
      ...context
    });
  }

  getUserMessage(): string {
    return `Workflow optimization '${this.context.optimizationType}' could not be applied.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Continue with basic workflow without this optimization',
      'Check if optimization requirements are met',
      'Try with lower optimization level',
      'Review optimization configuration'
    ];
  }
}

/**
 * Error thrown when YAML rendering fails
 */
export class RenderingError extends GenerationError {
  constructor(
    renderingStage: string,
    cause?: Error,
    context: Record<string, any> = {}
  ) {
    const message = `YAML rendering failed at ${renderingStage}${cause ? `: ${cause.message}` : ''}`;
    super(message, 'RENDERING_ERROR', 'yaml-renderer', 'rendering', false, {
      renderingStage,
      cause: cause?.message,
      ...context
    });
  }

  getUserMessage(): string {
    return `Failed to render workflow YAML at ${this.context.renderingStage} stage.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Check workflow data structure is valid',
      'Verify all required fields are present',
      'Try with simplified workflow structure',
      'Check YAML library compatibility'
    ];
  }
}

/**
 * Error thrown when workflow validation fails
 */
export class WorkflowValidationError extends GenerationError {
  constructor(
    validationErrors: string[],
    yamlContent?: string,
    context: Record<string, any> = {}
  ) {
    const message = `Generated workflow failed validation: ${validationErrors.join(', ')}`;
    super(message, 'WORKFLOW_VALIDATION_ERROR', 'workflow-validator', 'validation', true, {
      validationErrors,
      yamlContent: yamlContent?.substring(0, 500), // Truncate for logging
      ...context
    });
  }

  getUserMessage(): string {
    return `Generated workflow contains validation errors and may not work correctly.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Review validation errors and fix workflow structure',
      'Use a simpler workflow template',
      'Check GitHub Actions documentation for correct syntax',
      'Try generating with different options'
    ];
  }
}

/**
 * Error thrown when output generation fails
 */
export class OutputError extends GenerationError {
  constructor(
    outputType: string,
    reason: string,
    context: Record<string, any> = {}
  ) {
    const message = `Failed to generate ${outputType} output: ${reason}`;
    super(message, 'OUTPUT_ERROR', 'output-manager', 'output', false, {
      outputType,
      reason,
      ...context
    });
  }

  getUserMessage(): string {
    return `Could not generate ${this.context.outputType} output file.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Check file system permissions',
      'Verify output directory exists',
      'Try with different output format',
      'Check available disk space'
    ];
  }
}

/**
 * Error thrown when partial generation is attempted but fails
 */
export class PartialGenerationError extends GenerationError {
  constructor(
    completedStages: GenerationStage[],
    failedStage: GenerationStage,
    cause: Error,
    context: Record<string, any> = {}
  ) {
    const message = `Partial generation failed at ${failedStage} after completing: ${completedStages.join(', ')}`;
    super(message, 'PARTIAL_GENERATION_ERROR', 'generator-engine', failedStage, false, {
      completedStages,
      failedStage,
      cause: cause.message,
      ...context
    });
  }

  getUserMessage(): string {
    return `Workflow generation partially completed but failed at ${this.context.failedStage} stage.`;
  }

  getRecoveryActions(): string[] {
    return [
      'Use the partially generated workflow if it meets basic requirements',
      'Try regenerating with simpler configuration',
      'Check logs for specific failure details',
      'Contact support if issue persists'
    ];
  }
}

/**
 * Generic concrete implementation of GenerationError for unknown/generic errors
 */
export class GenericGenerationError extends GenerationError {
  constructor(
    message: string,
    code: string,
    component: string,
    stage: GenerationStage,
    recoverable: boolean = false,
    context: Record<string, any> = {}
  ) {
    super(message, code, component, stage, recoverable, context);
  }

  getUserMessage(): string {
    return this.message;
  }

  getRecoveryActions(): string[] {
    if (this.recoverable) {
      return [
        'Retry the operation',
        'Check system resources and try again',
        'Review error context for specific issues',
        'Try with simplified configuration'
      ];
    }
    return [
      'Check error details for specific issues',
      'Review system configuration',
      'Contact support if issue persists'
    ];
  }
}

/**
 * Error aggregation for multiple generation errors
 */
export class AggregateGenerationError extends GenerationError {
  public readonly errors: GenerationError[];

  constructor(
    errors: GenerationError[],
    context: Record<string, any> = {}
  ) {
    const message = `Multiple generation errors occurred: ${errors.map(e => e.message).join('; ')}`;
    const stages = [...new Set(errors.map(e => e.stage))];
    const primaryStage = stages[0] || 'initialization';
    
    super(message, 'AGGREGATE_GENERATION_ERROR', 'generator-engine', primaryStage, false, {
      errorCount: errors.length,
      stages,
      ...context
    });
    
    this.errors = errors;
  }

  getUserMessage(): string {
    return `Multiple errors occurred during workflow generation (${this.errors.length} errors).`;
  }

  getRecoveryActions(): string[] {
    const allActions = this.errors.flatMap(error => error.getRecoveryActions());
    return [...new Set(allActions)];
  }

  /**
   * Get errors by stage
   */
  getErrorsByStage(): Record<GenerationStage, GenerationError[]> {
    const errorsByStage: Record<string, GenerationError[]> = {};
    
    this.errors.forEach(error => {
      if (!errorsByStage[error.stage]) {
        errorsByStage[error.stage] = [];
      }
      errorsByStage[error.stage]!.push(error);
    });
    
    return errorsByStage as Record<GenerationStage, GenerationError[]>;
  }

  /**
   * Get recoverable errors
   */
  getRecoverableErrors(): GenerationError[] {
    return this.errors.filter(error => error.recoverable);
  }

  /**
   * Get critical errors (non-recoverable)
   */
  getCriticalErrors(): GenerationError[] {
    return this.errors.filter(error => !error.recoverable);
  }
}