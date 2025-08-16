/**
 * VS Code Extension Type Definitions
 * 
 * Core types and interfaces for the VS Code extension component.
 * Defines CLI integration, configuration, and workflow management types.
 */

import * as vscode from 'vscode';

// CLI Integration Types
export interface CLIIntegrationOptions {
  cliPath?: string;
  timeout?: number;
  enableLogging?: boolean;
  workingDirectory?: string;
}

export interface CLIExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  command: string;
}

export interface CLIProgressReport {
  stage: 'parsing' | 'detection' | 'generation' | 'output' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  details?: string;
  timestamp: Date;
}

export interface CLIGenerationRequest {
  readmePath: string;
  outputDirectory: string;
  workflowTypes?: WorkflowType[];
  frameworks?: string[];
  dryRun?: boolean;
  interactive?: boolean;
  configuration?: ExtensionConfiguration;
}

export interface CLIGenerationResult {
  success: boolean;
  generatedFiles: string[];
  errors: CLIError[];
  warnings: string[];
  summary: ExecutionSummary;
  detectedFrameworks: DetectedFramework[];
}

// Extension Configuration Types
export interface ExtensionConfiguration {
  defaultOutputDirectory: string;
  enableAutoGeneration: boolean;
  preferredWorkflowTypes: WorkflowType[];
  customTemplates: string[];
  gitIntegration: GitIntegrationSettings;
  showPreviewByDefault: boolean;
  enableInlineValidation: boolean;
  notificationLevel: 'all' | 'errors' | 'none';
}

export interface GitIntegrationSettings {
  autoCommit: boolean;
  commitMessage: string;
  createPR: boolean;
  branchName?: string;
}

// Workflow Management Types
export interface WorkflowConfiguration {
  workflowTypes: WorkflowType[];
  frameworks: FrameworkSelection[];
  deploymentTargets: DeploymentTarget[];
  securityLevel: 'basic' | 'standard' | 'strict';
  optimizationLevel: 'basic' | 'standard' | 'aggressive';
  includeComments: boolean;
  customSteps: CustomStep[];
}

export interface FrameworkSelection {
  name: string;
  version?: string;
  enabled: boolean;
  confidence: number;
  customConfig?: Record<string, any>;
}

export interface DeploymentTarget {
  platform: string;
  environment: string;
  configuration: Record<string, any>;
  secrets: string[];
}

export interface CustomStep {
  name: string;
  command: string;
  stage: 'before-build' | 'after-build' | 'before-test' | 'after-test' | 'before-deploy' | 'after-deploy';
  condition?: string;
}

// Webview Communication Types
export interface WebviewMessage {
  type: MessageType;
  payload: any;
  requestId?: string;
}

export enum MessageType {
  CONFIGURATION_UPDATE = 'configurationUpdate',
  GENERATE_REQUEST = 'generateRequest',
  PREVIEW_UPDATE = 'previewUpdate',
  VALIDATION_RESULT = 'validationResult',
  ERROR_NOTIFICATION = 'errorNotification',
  PROGRESS_UPDATE = 'progressUpdate',
  REQUEST_INITIAL_PREVIEW = 'requestInitialPreview',
  REQUEST_PREVIEW_UPDATE = 'requestPreviewUpdate',
  SAVE_WORKFLOW_CHANGES = 'saveWorkflowChanges',
  GENERATE_WORKFLOWS = 'generateWorkflows',
  CANCEL_PREVIEW = 'cancelPreview',
  EDIT_CONFIGURATION = 'editConfiguration'
}

export interface GenerationRequest {
  readmePath: string;
  configuration: WorkflowConfiguration;
  outputDirectory: string;
  previewOnly: boolean;
}

export interface PreviewData {
  workflows: WorkflowPreview[];
  configuration: WorkflowConfiguration;
  detectedFrameworks: DetectedFramework[];
  estimatedFiles: string[];
}

export interface WorkflowPreview {
  filename: string;
  content: string;
  type: WorkflowType;
  description: string;
  estimatedSize: number;
}

// Tree View Types
export interface WorkflowItem {
  label: string;
  type: 'workflow' | 'job' | 'step' | 'framework' | 'folder';
  resourceUri?: vscode.Uri;
  command?: vscode.Command;
  contextValue: string;
  children?: WorkflowItem[];
  tooltip?: string;
  iconPath?: vscode.ThemeIcon | string;
}

// File System Types
export interface WorkflowFile {
  filename: string;
  content: string;
  type: WorkflowType;
  relativePath: string;
  metadata?: WorkflowMetadata;
}

export interface WorkflowMetadata {
  description: string;
  version: string;
  generated: Date;
  frameworks: string[];
  optimizations: string[];
}

// Error Handling Types
export interface ExtensionError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: 'error' | 'warning' | 'info';
  actions: ErrorAction[];
  context?: any;
}

export interface ErrorAction {
  title: string;
  command: string;
  arguments?: any[];
}

// CLI Types (imported from CLI component)
export type WorkflowType = 'ci' | 'cd' | 'release' | 'security' | 'performance' | 'maintenance';
export type ErrorCategory = 'user-input' | 'configuration' | 'processing' | 'file-system' | 'git-integration';

export interface DetectedFramework {
  name: string;
  version?: string;
  confidence: number;
  type: string;
  ecosystem: string;
  evidence: Evidence[];
}

export interface Evidence {
  type: string;
  source: string;
  value: string;
  confidence: number;
}

export interface CLIError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: 'error' | 'warning' | 'info';
  suggestions: string[];
  context?: any;
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

// Process Execution Types
export interface ProcessExecutionOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean;
}

export interface ProcessExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
  executionTime: number;
  timedOut: boolean;
}

// Data Transformation Types
export interface DataTransformationContext {
  sourceFormat: 'extension' | 'cli';
  targetFormat: 'extension' | 'cli';
  operation: 'configuration' | 'result' | 'error' | 'progress';
}

export interface TransformationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}