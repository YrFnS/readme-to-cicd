/**
 * Base types for workflow template structures
 */

/**
 * GitHub Actions workflow template structure
 */
export interface WorkflowTemplate {
  name: string;
  type: WorkflowType;
  triggers: TriggerConfig;
  jobs: JobTemplate[];
  environment?: EnvironmentConfig;
  permissions?: PermissionConfig;
  concurrency?: ConcurrencyConfig;
  defaults?: DefaultsConfig;
}

/**
 * GitHub Actions job template structure
 */
export interface JobTemplate {
  name: string;
  runsOn: string | RunsOnConfig;
  strategy?: MatrixStrategy;
  steps: StepTemplate[];
  needs?: string[];
  if?: string;
  environment?: string | JobEnvironmentConfig;
  permissions?: PermissionConfig;
  timeout?: number;
  continueOnError?: boolean;
  outputs?: Record<string, string>;
}

/**
 * GitHub Actions step template structure
 */
export interface StepTemplate {
  name: string;
  id?: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string>;
  if?: string;
  continueOnError?: boolean;
  timeout?: number;
  shell?: string;
  workingDirectory?: string;
}

/**
 * Workflow trigger configuration
 */
export interface TriggerConfig {
  push?: PushTrigger;
  pullRequest?: PullRequestTrigger;
  schedule?: ScheduleTrigger[];
  workflowDispatch?: WorkflowDispatchTrigger;
  release?: ReleaseTrigger;
  issues?: IssuesTrigger;
  pullRequestTarget?: PullRequestTargetTrigger;
  repositoryDispatch?: RepositoryDispatchTrigger;
}

/**
 * Push trigger configuration
 */
export interface PushTrigger {
  branches?: string[];
  branchesIgnore?: string[];
  tags?: string[];
  tagsIgnore?: string[];
  paths?: string[];
  pathsIgnore?: string[];
}

/**
 * Pull request trigger configuration
 */
export interface PullRequestTrigger {
  branches?: string[];
  branchesIgnore?: string[];
  paths?: string[];
  pathsIgnore?: string[];
  types?: string[];
}

/**
 * Schedule trigger configuration
 */
export interface ScheduleTrigger {
  cron: string;
}

/**
 * Workflow dispatch trigger configuration
 */
export interface WorkflowDispatchTrigger {
  inputs?: Record<string, WorkflowInput>;
}

/**
 * Workflow input configuration
 */
export interface WorkflowInput {
  description: string;
  required?: boolean;
  default?: string;
  type?: 'string' | 'number' | 'boolean' | 'choice' | 'environment';
  options?: string[];
}

/**
 * Release trigger configuration
 */
export interface ReleaseTrigger {
  types?: string[];
}

/**
 * Issues trigger configuration
 */
export interface IssuesTrigger {
  types?: string[];
}

/**
 * Pull request target trigger configuration
 */
export interface PullRequestTargetTrigger {
  branches?: string[];
  branchesIgnore?: string[];
  paths?: string[];
  pathsIgnore?: string[];
  types?: string[];
}

/**
 * Repository dispatch trigger configuration
 */
export interface RepositoryDispatchTrigger {
  types?: string[];
}

/**
 * Matrix strategy configuration
 */
export interface MatrixStrategy {
  matrix: Record<string, any[]>;
  failFast?: boolean;
  maxParallel?: number;
  include?: Record<string, any>[];
  exclude?: Record<string, any>[];
}

/**
 * Runs-on configuration
 */
export interface RunsOnConfig {
  group?: string;
  labels?: string[];
}

/**
 * Job environment configuration
 */
export interface JobEnvironmentConfig {
  name: string;
  url?: string;
}

/**
 * Permission configuration
 */
export interface PermissionConfig {
  actions?: 'read' | 'write' | 'none';
  checks?: 'read' | 'write' | 'none';
  contents?: 'read' | 'write' | 'none';
  deployments?: 'read' | 'write' | 'none';
  idToken?: 'read' | 'write' | 'none';
  issues?: 'read' | 'write' | 'none';
  discussions?: 'read' | 'write' | 'none';
  packages?: 'read' | 'write' | 'none';
  pages?: 'read' | 'write' | 'none';
  pullRequests?: 'read' | 'write' | 'none';
  repositoryProjects?: 'read' | 'write' | 'none';
  securityEvents?: 'read' | 'write' | 'none';
  statuses?: 'read' | 'write' | 'none';
}

/**
 * Concurrency configuration
 */
export interface ConcurrencyConfig {
  group: string;
  cancelInProgress?: boolean;
}

/**
 * Defaults configuration
 */
export interface DefaultsConfig {
  run?: {
    shell?: string;
    workingDirectory?: string;
  };
}

/**
 * Cache strategy configuration
 */
export interface CacheStrategy {
  type: 'dependencies' | 'build' | 'docker' | 'custom';
  paths: string[];
  key: string;
  restoreKeys: string[];
  conditions?: string[];
}

/**
 * Cache configuration for different package managers
 */
export interface CacheConfig {
  enabled: boolean;
  strategy: CacheStrategy;
  customPaths?: string[];
}

/**
 * Security scan template configuration
 */
export interface SecurityScanTemplate {
  sast: StepTemplate[];
  dast: StepTemplate[];
  dependencyScanning: StepTemplate[];
  containerScanning: StepTemplate[];
  complianceChecks: StepTemplate[];
  licenseScanning: StepTemplate[];
}

/**
 * Performance test template configuration
 */
export interface PerformanceTestTemplate {
  benchmarks: StepTemplate[];
  loadTests: StepTemplate[];
  metricsCollection: StepTemplate[];
  regressionDetection: StepTemplate[];
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  strategy: 'rolling' | 'blue-green' | 'canary';
  environments: string[];
  approvalRequired: boolean;
  rollbackEnabled: boolean;
  healthChecks: HealthCheckConfig[];
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  expectedStatus: number;
  timeout: number;
  retries: number;
}

/**
 * Workflow types (imported from interfaces)
 */
import type { WorkflowType, EnvironmentConfig, PolicyConfig } from './interfaces';

/**
 * Template hierarchy levels
 */
export interface TemplateHierarchy {
  base: BaseWorkflowTemplate;
  language: LanguageTemplate;
  framework: FrameworkTemplate;
  organization: OrganizationTemplate;
  project: ProjectTemplate;
}

/**
 * Base workflow template
 */
export interface BaseWorkflowTemplate {
  structure: WorkflowTemplate;
  commonSteps: StepTemplate[];
  defaultPermissions: PermissionConfig;
}

/**
 * Language-specific template
 */
export interface LanguageTemplate {
  language: string;
  setupSteps: StepTemplate[];
  buildSteps: StepTemplate[];
  testSteps: StepTemplate[];
  cacheStrategy: CacheConfig;
}

/**
 * Framework-specific template
 */
export interface FrameworkTemplate {
  framework: string;
  language: string;
  customSteps: StepTemplate[];
  dependencies: string[];
  buildCommands: string[];
  testCommands: string[];
}

/**
 * Organization-specific template
 */
export interface OrganizationTemplate {
  policies: PolicyConfig;
  requiredSteps: StepTemplate[];
  approvalWorkflows: WorkflowTemplate[];
  securityRequirements: SecurityScanTemplate;
}

/**
 * Project-specific template
 */
export interface ProjectTemplate {
  overrides: Record<string, any>;
  customSteps: StepTemplate[];
  environmentSpecific: Record<string, StepTemplate[]>;
}

// Export the imported types for convenience
export type { WorkflowType, EnvironmentConfig, PolicyConfig };