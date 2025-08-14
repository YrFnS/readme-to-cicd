/**
 * Workflow Specialization Module
 * Exports all specialized workflow generators and the coordination manager
 */

export { CIWorkflowGenerator } from './ci-workflow-generator';
export { CDWorkflowGenerator } from './cd-workflow-generator';
export { ReleaseWorkflowGenerator } from './release-workflow-generator';
export { MaintenanceWorkflowGenerator } from './maintenance-workflow-generator';
export { MultiEnvironmentGenerator } from './multi-environment-generator';
export { WorkflowSpecializationManager } from './workflow-specialization-manager';
export { AdvancedSecurityGenerator } from './advanced-security-generator';
export { AgentHooksIntegration } from './agent-hooks-integration';
export { AdvancedPatternGenerator } from './advanced-pattern-generator';
export { TestingStrategyGenerator } from './testing-strategy-generator';

// Re-export types for convenience
export type { WorkflowType } from '../interfaces';
export type { 
  AgentHooksConfig, 
  GitHubEvent, 
  PerformanceThresholds, 
  WorkflowAnalysis, 
  SecurityAlert, 
  AgentHooksPerformanceMetrics 
} from './agent-hooks-integration';
export type {
  AdvancedPatternType,
  AdvancedPatternConfig,
  MonorepoConfig,
  MicroservicesConfig,
  FeatureFlagConfig,
  CanaryConfig,
  OrchestrationConfig
} from './advanced-pattern-generator';
export type {
  AdvancedTestingConfig,
  IntegrationTestTool,
  E2ETestTool,
  ContractTestTool,
  ChaosTestTool
} from './testing-strategy-generator';