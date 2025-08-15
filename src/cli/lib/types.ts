/**
 * CLI Tool Type Definitions
 * 
 * Core types and interfaces for the CLI tool component.
 * Defines command structures, options, results, and error handling.
 */

// Import from shared types - commented out temporarily to fix test issues
// import { DetectedFramework, WorkflowType, DeploymentTarget } from '../../shared/types';

export interface CLITool {
  run(args: string[]): Promise<CLIResult>;
  parseArguments(args: string[]): CLIOptions;
  loadConfiguration(configPath?: string): Promise<CLIConfig>;
}

export interface CLIResult {
  success: boolean;
  generatedFiles: string[];
  errors: CLIError[];
  warnings: string[];
  summary: ExecutionSummary;
}

export interface CLIOptions {
  command: 'generate' | 'validate' | 'init' | 'export' | 'import';
  readmePath?: string;
  outputDir?: string;
  workflowType?: WorkflowType[];
  framework?: string[];
  dryRun: boolean;
  interactive: boolean;
  verbose: boolean;
  debug: boolean;
  quiet: boolean;
  config?: string;
}

export interface CLIConfig {
  defaults: DefaultSettings;
  templates: TemplateConfig;
  organization: OrganizationPolicies;
  output: OutputConfig;
  git: GitConfig;
  ui: UIConfig;
}

export interface DefaultSettings {
  outputDirectory: string;
  workflowTypes: WorkflowType[];
  includeComments: boolean;
  optimizationLevel: 'basic' | 'standard' | 'aggressive';
}

export interface TemplateConfig {
  customTemplates?: string;
  templateOverrides?: Record<string, any>;
  organizationTemplates?: string;
}

export interface OrganizationPolicies {
  requiredSecurityScans?: boolean;
  mandatorySteps?: string[];
  allowedActions?: string[];
  enforceBranchProtection?: boolean;
  requireCodeReview?: boolean;
}

export interface OutputConfig {
  format: 'yaml' | 'json';
  indentation: number;
  includeMetadata: boolean;
  backupExisting: boolean;
}

export interface GitConfig {
  autoCommit: boolean;
  commitMessage: string;
  createPR: boolean;
  branchName?: string;
}

export interface UIConfig {
  colorOutput: boolean;
  progressIndicators: boolean;
  verboseLogging: boolean;
  interactivePrompts: boolean;
}

export interface ExecutionSummary {
  totalTime: number;
  filesGenerated: number;
  workflowsCreated: number;
  frameworksDetected: string[];
  optimizationsApplied: number;
  executionTime: number;
  filesProcessed: number;
  workflowsGenerated: number;
}

export interface CLIError {
  code: string;
  message: string;
  category: 'user-input' | 'configuration' | 'processing' | 'file-system' | 'git-integration';
  severity: 'error' | 'warning' | 'info';
  suggestions: string[];
  context?: any;
}

// Framework Information for prompts
export interface FrameworkInfo {
  name: string;
  version?: string;
  language?: string;
  confidence: number;
  description: string;
  selected?: boolean;
}

// Framework conflict resolution
export interface FrameworkConflict {
  id: string;
  type: 'multiple-frameworks' | 'version-mismatch' | 'incompatible-tools' | 'compatibility';
  frameworks: FrameworkInfo[];
  message: string;
  suggestions: string[];
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'keep-all' | 'select-primary' | 'merge' | 'skip';
  selectedFrameworks?: FrameworkInfo[];
  primaryFramework?: FrameworkInfo;
}

// Workflow type information
export interface WorkflowTypeInfo {
  type: WorkflowType;
  name: string;
  description: string;
  recommended: boolean;
  dependencies?: WorkflowType[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

// Deployment configuration
export interface DeploymentConfig {
  platform: string;
  environment: string;
  configuration: Record<string, any>;
  secrets: string[];
}

export interface DeploymentOption {
  platform: string;
  name: string;
  description: string;
  requirements: string[];
  supported: boolean;
  configuration?: Record<string, any>;
}

// Export types from shared - temporarily defined locally
export type WorkflowType = 'ci' | 'cd' | 'release' | 'security' | 'performance' | 'maintenance';
export type DetectedFramework = any; // Placeholder
export type DeploymentTarget = any; // Placeholder
export type ErrorCategory = 'user-input' | 'configuration' | 'processing' | 'file-system' | 'git-integration';