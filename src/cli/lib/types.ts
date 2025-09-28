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
  command: 'generate' | 'validate' | 'init' | 'export' | 'import' | 'parse' | 'analyze' | 'readme-validate' | 'status' | 'help';
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
  ci?: boolean;
  
  // Export/Import specific options
  output?: string;
  configFile?: string;
  merge?: boolean;
  
  // Init specific options
  template?: 'basic' | 'enterprise' | 'team';
  
  // Batch processing options
  directories?: string[];
  recursive?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
  continueOnError?: boolean;
  projectPattern?: string;
  excludePatterns?: string[];
  
  // README command specific options
  format?: 'json' | 'yaml' | 'text';
  includeMetadata?: boolean;
  includeConfidence?: boolean;
  includeRecommendations?: boolean;
  includeDiagnostics?: boolean;
  
  // Phase 2: Enhanced CLI options for better control
  timeout?: number;          // Custom timeout in seconds
  useFallback?: boolean;     // Skip complex detection, use simple generator
  noProgress?: boolean;      // Disable progress indicators
  debugDetection?: boolean;  // Enable detailed detection logging
  
  // Phase 4: Status command options
  performance?: boolean;
  telemetry?: boolean;
  export?: boolean;
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

// Batch Processing Types
export interface BatchProcessingOptions {
  directories: string[];
  recursive: boolean;
  parallel: boolean;
  maxConcurrency?: number;
  continueOnError: boolean;
  projectDetectionPattern?: string;
  excludePatterns?: string[];
}

export interface ProjectInfo {
  path: string;
  name: string;
  readmePath: string;
  hasPackageJson: boolean;
  hasGitRepo: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface BatchProjectResult {
  project: ProjectInfo;
  success: boolean;
  result?: CLIResult;
  error?: CLIError;
  executionTime: number;
  skipped?: boolean;
  skipReason?: string;
}

export interface BatchProcessingResult {
  success: boolean;
  totalProjects: number;
  processedProjects: number;
  successfulProjects: number;
  failedProjects: number;
  skippedProjects: number;
  projectResults: BatchProjectResult[];
  totalExecutionTime: number;
  summary: BatchExecutionSummary;
  errors: CLIError[];
  warnings: string[];
}

export interface BatchExecutionSummary {
  totalProjectsFound: number;
  totalProjectsProcessed: number;
  totalFilesGenerated: number;
  totalWorkflowsCreated: number;
  frameworksDetected: Record<string, number>;
  averageExecutionTime: number;
  parallelExecutions: number;
  errorsByCategory: Record<string, number>;
}

export interface ProjectDetectionResult {
  projects: ProjectInfo[];
  totalDirectoriesScanned: number;
  excludedDirectories: number;
  detectionTime: number;
}

// CI/CD Environment Integration Types
export interface CIEnvironment {
  isCI(): boolean;
  getCIProvider(): CIProvider;
  getEnvironmentVariables(): Record<string, string>;
  shouldUseNonInteractiveMode(): boolean;
  loadConfigurationFromEnvironment(): Partial<CLIConfig>;
}

export type CIProvider = 'github' | 'gitlab' | 'jenkins' | 'azure' | 'circleci' | 'travis' | 'bitbucket' | 'unknown';

export interface CIEnvironmentInfo {
  provider: CIProvider;
  isCI: boolean;
  buildId?: string;
  branchName?: string;
  commitSha?: string;
  pullRequestNumber?: string;
  environmentVariables: Record<string, string>;
}

export interface MachineReadableOutput {
  format: 'json' | 'xml';
  result: CLIResult;
  metadata: {
    version: string;
    timestamp: string;
    environment: CIEnvironmentInfo;
    executionContext: {
      command: string;
      options: CLIOptions;
      workingDirectory: string;
    };
  };
}

export interface CIExitCodes {
  SUCCESS: 0;
  GENERAL_ERROR: 1;
  CONFIGURATION_ERROR: 2;
  PROCESSING_ERROR: 3;
  FILE_SYSTEM_ERROR: 4;
  GIT_ERROR: 5;
  VALIDATION_ERROR: 6;
  TIMEOUT_ERROR: 7;
}

// Export types from shared - temporarily defined locally
export type WorkflowType = 'ci' | 'cd' | 'release' | 'security' | 'performance' | 'maintenance';
export type DetectedFramework = any; // Placeholder
export type DeploymentTarget = any; // Placeholder
export type ErrorCategory = 'user-input' | 'configuration' | 'processing' | 'file-system' | 'git-integration';