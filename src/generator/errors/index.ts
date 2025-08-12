/**
 * Error handling exports for YAML generator
 */

// Error classes
export {
  GenerationError,
  GenerationStage,
  TemplateLoadError,
  TemplateCompilationError,
  FrameworkDataError,
  StepGenerationError,
  OptimizationError,
  RenderingError,
  WorkflowValidationError,
  OutputError,
  PartialGenerationError,
  AggregateGenerationError
} from './generation-errors';

// Error recovery utilities
export {
  GenerationResult,
  GenerationRetryConfig,
  FallbackConfig,
  PartialGenerationResult,
  GenerationErrorRecovery,
  DEFAULT_GENERATION_RETRY_CONFIG,
  DEFAULT_FALLBACK_CONFIG
} from './error-recovery';