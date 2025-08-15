/**
 * Configuration Type Definitions
 * 
 * Comprehensive configuration interfaces for the CLI tool configuration management system.
 * Supports multiple configuration levels and formats as specified in the design document.
 */

import { WorkflowType } from '../lib/types';

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

export interface ConfigurationSource {
  path: string;
  type: 'user' | 'project' | 'organization';
  format: 'json' | 'yaml' | 'js' | 'package.json';
  priority: number;
  config?: any;
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: any;
  suggestion?: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationError[];
}