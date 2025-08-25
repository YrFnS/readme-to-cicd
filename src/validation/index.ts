/**
 * Validation module exports
 * 
 * This module provides comprehensive validation utilities for the Integration & Deployment system,
 * including system validation, user acceptance testing, performance validation, security validation,
 * operational validation, and documentation generation.
 */

// Export CompilationValidator and related types
export {
  CompilationValidator,
  type TypeScriptError,
  type CompilationResult,
  type CompilationReport,
  type ResolutionAction,
  type ErrorResolutionStatus
} from './compilation-validator.js';

// Export existing validation utilities
export { ComponentInterfaceValidator } from './interface-validator.js';
export { IntegrationDiagnostics } from './integration-diagnostics.js';

// Export comprehensive system validation framework
export {
  SystemValidationFramework,
  type SystemValidationConfig,
  type ValidationSuite,
  type ValidationTest,
  type ValidationResult,
  type ValidationMetrics,
  type SystemValidationReport
} from './system-validation.js';

// Export end-to-end validation framework
export {
  EndToEndValidationSuite,
  type E2EWorkflowConfig,
  type WorkflowScenario,
  type WorkflowExecutionResult
} from './end-to-end-validation.js';

// Export user acceptance testing framework
export {
  UserAcceptanceTestingFramework,
  type UATConfig,
  type UATScenario,
  type UATExecutionResult,
  type StakeholderFeedback
} from './user-acceptance-testing.js';

// Export performance validation framework
export {
  PerformanceValidationFramework,
  type PerformanceValidationConfig,
  type PerformanceTestResult,
  type PerformanceMetrics as PerfMetrics
} from './performance-validation.js';

// Export security validation framework
export {
  SecurityValidationFramework,
  type SecurityValidationConfig,
  type SecurityTestResult,
  type Vulnerability,
  type ComplianceResult
} from './security-validation.js';

// Export operational validation framework
export {
  OperationalValidationFramework,
  type OperationalValidationConfig,
  type OperationalTestResult,
  type DisasterRecoveryConfig,
  type BusinessContinuityConfig
} from './operational-validation.js';

// Export documentation generator
export {
  DocumentationGenerator,
  type DocumentationConfig,
  type DocumentGenerationRequest,
  type GenerationResult,
  type DocumentData
} from './documentation-generator.js';