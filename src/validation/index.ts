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
} from './compilation-validator';

// Export existing validation utilities
export { ComponentInterfaceValidator } from './interface-validator';
export { IntegrationDiagnostics } from './integration-diagnostics';

// Export comprehensive system validation framework
export {
  SystemValidationFramework,
  type SystemValidationConfig,
  type ValidationSuite,
  type ValidationTest,
  type ValidationResult,
  type ValidationMetrics,
  type SystemValidationReport
} from './system-validation';

// Export end-to-end validation framework
export {
  EndToEndValidationSuite,
  type E2EWorkflowConfig,
  type WorkflowScenario,
  type WorkflowExecutionResult
} from './end-to-end-validation';

// Export user acceptance testing framework
export {
  UserAcceptanceTestingFramework,
  type UATConfig,
  type UATScenario,
  type UATExecutionResult,
  type StakeholderFeedback
} from './user-acceptance-testing';

// Export performance validation framework
export {
  PerformanceValidationFramework,
  type PerformanceValidationConfig,
  type PerformanceTestResult,
  type PerformanceMetrics as PerfMetrics
} from './performance-validation';

// Export security validation framework
export {
  SecurityValidationFramework,
  type SecurityValidationConfig,
  type SecurityTestResult,
  type Vulnerability,
  type ComplianceResult
} from './security-validation';

// Export operational validation framework
export {
  OperationalValidationFramework,
  type OperationalValidationConfig,
  type OperationalTestResult,
  type DisasterRecoveryConfig,
  type BusinessContinuityConfig
} from './operational-validation';

// Export documentation generator
export {
  DocumentationGenerator,
  type DocumentationConfig,
  type DocumentGenerationRequest,
  type GenerationResult,
  type DocumentData
} from './documentation-generator';

// Export system health monitor
export {
  SystemHealthMonitor,
  type ComponentHealth,
  type ComponentMetrics,
  type HealthIssue,
  type SystemHealthReport,
  type HealthTrend,
  type HealthMonitorConfig,
  defaultHealthMonitorConfig
} from './system-health-monitor';

// Export comprehensive system validator
export {
  ComprehensiveSystemValidator,
  type ComprehensiveValidationConfig,
  type ComprehensiveValidationResult,
  type PerformanceBenchmarkResult,
  type SystemReadinessAssessment,
  type ValidationRecommendation,
  type ValidationActionItem,
  defaultComprehensiveValidationConfig
} from './comprehensive-system-validator';

// Export performance benchmark validator
export {
  PerformanceBenchmarkValidator,
  type PerformanceBenchmarkConfig,
  type BenchmarkResult,
  type BenchmarkDuration,
  type BenchmarkThroughput,
  type BenchmarkMemory,
  type BenchmarkCpu,
  type BenchmarkIssue,
  defaultPerformanceBenchmarkConfig
} from './performance-benchmark-validator';

// Export integration test suite
export {
  IntegrationTestSuite,
  type IntegrationTestConfig,
  type IntegrationTestResult,
  type IntegrationIssue,
  defaultIntegrationTestConfig
} from './integration-test-suite';

// Export system health scoring
export {
  SystemHealthScoring,
  type HealthScoringConfig,
  type HealthScoreBreakdown,
  type ComponentScore,
  type CategoryScore,
  type HealthRecommendation,
  defaultHealthScoringConfig
} from './system-health-scoring';