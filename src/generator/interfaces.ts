/**
 * Core interfaces for the YAML Generator component
 */

import { WorkflowTemplate, JobTemplate, StepTemplate } from './types';

/**
 * Main YAML Generator interface
 */
export interface YAMLGenerator {
  /**
   * Generate a single workflow from detection results
   */
  generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput>;
  
  /**
   * Generate multiple workflows for different types
   */
  generateMultipleWorkflows(detectionResult: DetectionResult, workflowTypes: WorkflowType[]): Promise<WorkflowOutput[]>;
  
  /**
   * Validate generated YAML workflow
   */
  validateWorkflow(yamlContent: string): ValidationResult;
}

/**
 * Output from workflow generation
 */
export interface WorkflowOutput {
  filename: string;
  content: string;
  type: WorkflowType;
  metadata: WorkflowMetadata;
}

/**
 * Options for workflow generation
 */
export interface GenerationOptions {
  workflowType: WorkflowType;
  customTemplates?: TemplateOverrides;
  organizationPolicies?: PolicyConfig;
  optimizationLevel: 'basic' | 'standard' | 'aggressive';
  includeComments: boolean;
  environments?: EnvironmentConfig[];
  monitoringConfig?: MonitoringConfig;
  securityLevel: 'basic' | 'standard' | 'enterprise';
  testingStrategy?: TestingStrategyConfig;
  agentHooksEnabled?: boolean;
}

/**
 * Detection result input from framework detection component
 */
export interface DetectionResult {
  frameworks: FrameworkDetection[];
  languages: LanguageDetection[];
  buildTools: BuildToolDetection[];
  packageManagers: PackageManagerDetection[];
  testingFrameworks: TestingFrameworkDetection[];
  deploymentTargets: DeploymentTargetDetection[];
  projectMetadata: ProjectMetadata;
}

/**
 * Framework detection information
 */
export interface FrameworkDetection {
  name: string;
  version?: string;
  confidence: number;
  evidence: string[];
  category: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop';
}

/**
 * Language detection information
 */
export interface LanguageDetection {
  name: string;
  version?: string;
  confidence: number;
  primary: boolean;
}

/**
 * Build tool detection information
 */
export interface BuildToolDetection {
  name: string;
  configFile?: string;
  confidence: number;
}

/**
 * Package manager detection information
 */
export interface PackageManagerDetection {
  name: string;
  lockFile?: string;
  confidence: number;
}

/**
 * Testing framework detection information
 */
export interface TestingFrameworkDetection {
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  confidence: number;
}

/**
 * Deployment target detection information
 */
export interface DeploymentTargetDetection {
  platform: string;
  type: 'static' | 'container' | 'serverless' | 'traditional';
  confidence: number;
}

/**
 * Project metadata from README parsing
 */
export interface ProjectMetadata {
  name: string;
  description?: string;
  version?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  author?: string;
  keywords?: string[];
}

/**
 * Workflow types supported by the generator
 */
export type WorkflowType = 'ci' | 'cd' | 'release' | 'maintenance' | 'security' | 'performance';

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  generatedAt: Date;
  generatorVersion: string;
  detectionSummary: string;
  optimizations: string[];
  warnings: string[];
}

/**
 * Template override configuration
 */
export interface TemplateOverrides {
  [templateName: string]: WorkflowTemplate | JobTemplate | StepTemplate;
}

/**
 * Organization policy configuration
 */
export interface PolicyConfig {
  requiredSecurityScans: string[];
  approvalRequired: boolean;
  allowedActions: string[];
  blockedActions: string[];
  environmentRestrictions: Record<string, string[]>;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  name: string;
  type: 'development' | 'staging' | 'production';
  approvalRequired: boolean;
  secrets: string[];
  variables: Record<string, string>;
  deploymentStrategy: 'rolling' | 'blue-green' | 'canary';
  rollbackEnabled: boolean;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  performanceTracking: boolean;
  alerting: AlertConfig;
  dashboards: DashboardConfig[];
  slaTracking: SLAConfig;
  logAggregation: LogConfig;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  enabled: boolean;
  channels: string[];
  thresholds: Record<string, number>;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  name: string;
  type: string;
  metrics: string[];
}

/**
 * SLA configuration
 */
export interface SLAConfig {
  enabled: boolean;
  targets: Record<string, number>;
}

/**
 * Log configuration
 */
export interface LogConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
}

/**
 * Testing strategy configuration
 */
export interface TestingStrategyConfig {
  unitTests: boolean;
  integrationTests: boolean;
  e2eTests: boolean;
  performanceTests: boolean;
  securityTests: boolean;
  contractTests: boolean;
  chaosEngineering: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

/**
 * Validation error
 */
export interface ValidationError {
  type: 'syntax' | 'schema' | 'action' | 'security';
  message: string;
  line?: number | undefined;
  column?: number | undefined;
  severity: 'error' | 'warning';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  type: 'optimization' | 'best-practice' | 'compatibility';
  message: string;
  line?: number | undefined;
  column?: number | undefined;
}