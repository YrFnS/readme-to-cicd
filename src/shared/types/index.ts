/**
 * Shared types and interfaces for README-to-CICD system
 * These interfaces define the contracts between all components
 */

// Re-export parser types for backward compatibility
export * from '../../parser/types';

// Framework Detection Types
export interface FrameworkDetector {
  detect(projectInfo: ProjectInfo): Promise<Result<DetectionResult>>;
  getSupportedFrameworks(): string[];
  getConfidenceThreshold(): number;
}

export interface DetectionResult {
  frameworks: DetectedFramework[];
  buildTools: BuildTool[];
  ciSteps: CIStep[];
  deploymentTargets: DeploymentTarget[];
  confidence: number;
  metadata: DetectionMetadata;
}

export interface DetectedFramework {
  name: string;
  version?: string;
  language: string;
  confidence: number;
  buildRequirements: BuildRequirement[];
  testingRequirements: TestingRequirement[];
  deploymentRequirements: DeploymentRequirement[];
  configFiles: string[];
  dependencies: string[];
}

export interface BuildTool {
  name: string;
  type: BuildToolType;
  commands: BuildCommand[];
  configFile?: string;
  confidence: number;
}

export type BuildToolType = 
  | 'package-manager' 
  | 'build-system' 
  | 'bundler' 
  | 'compiler' 
  | 'task-runner';

export interface BuildCommand {
  name: string;
  command: string;
  description: string;
  stage: BuildStage;
  required: boolean;
  parallel?: boolean;
}

export type BuildStage = 
  | 'setup' 
  | 'install' 
  | 'build' 
  | 'test' 
  | 'package' 
  | 'deploy';

export interface CIStep {
  name: string;
  stage: BuildStage;
  commands: string[];
  dependencies: string[];
  environment?: Record<string, string>;
  conditions?: StepCondition[];
  caching?: CacheConfig;
}

export interface StepCondition {
  type: 'branch' | 'path' | 'event' | 'env';
  pattern: string;
  negate?: boolean;
}

export interface CacheConfig {
  key: string;
  paths: string[];
  restoreKeys?: string[];
}

export interface DeploymentTarget {
  name: string;
  type: DeploymentType;
  environment: string;
  configuration: Record<string, any>;
  requirements: DeploymentRequirement[];
}

export type DeploymentType = 
  | 'static-site' 
  | 'container' 
  | 'serverless' 
  | 'vm' 
  | 'kubernetes';

export interface BuildRequirement {
  type: 'runtime' | 'tool' | 'service' | 'environment';
  name: string;
  version?: string;
  optional: boolean;
  alternatives?: string[];
}

export interface TestingRequirement {
  framework: string;
  commands: string[];
  configFiles: string[];
  environment?: Record<string, string>;
  coverage?: boolean;
}

export interface DeploymentRequirement {
  type: 'secret' | 'config' | 'service' | 'permission';
  name: string;
  description: string;
  required: boolean;
}

export interface DetectionMetadata {
  analysisTime: number;
  sources: string[];
  warnings: string[];
  suggestions: string[];
}

// YAML Generator Types
export interface YAMLGenerator {
  generate(detectionResult: DetectionResult, options: GenerationOptions): Promise<Result<WorkflowResult>>;
  validateTemplate(template: WorkflowTemplate): Promise<ValidationResult>;
  getAvailableTemplates(): WorkflowTemplate[];
}

export interface GenerationOptions {
  outputFormat: 'yaml' | 'json';
  includeComments: boolean;
  optimizeForPerformance: boolean;
  securityScanning: boolean;
  multiEnvironment: boolean;
  customTemplates?: WorkflowTemplate[];
  organizationPolicies?: PolicyConfig[];
}

export interface WorkflowResult {
  workflows: GeneratedWorkflow[];
  metadata: WorkflowMetadata;
  validation: ValidationResult;
  recommendations: WorkflowRecommendation[];
}

export interface GeneratedWorkflow {
  name: string;
  filename: string;
  content: string;
  type: WorkflowType;
  triggers: WorkflowTrigger[];
  jobs: WorkflowJob[];
  environment?: string;
}

export type WorkflowType = 
  | 'ci' 
  | 'cd' 
  | 'release' 
  | 'security' 
  | 'performance' 
  | 'maintenance';

export interface WorkflowTrigger {
  event: string;
  conditions?: Record<string, any>;
  schedule?: string;
}

export interface WorkflowJob {
  name: string;
  runsOn: string;
  steps: WorkflowStep[];
  needs?: string[];
  if?: string;
  environment?: string;
}

export interface WorkflowStep {
  name: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string>;
  if?: string;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  frameworks: string[];
  languages: string[];
  template: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'array';
  required: boolean;
  default?: any;
  description: string;
}

export interface WorkflowMetadata {
  generatedAt: Date;
  generator: string;
  version: string;
  frameworks: string[];
  optimizations: string[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface WorkflowRecommendation {
  type: 'optimization' | 'security' | 'best-practice';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  implementation?: string;
}

export interface PolicyConfig {
  name: string;
  rules: PolicyRule[];
  enforcement: 'warn' | 'error' | 'block';
}

export interface PolicyRule {
  type: string;
  pattern: string;
  message: string;
  severity: 'info' | 'warn' | 'error';
}

// CLI Tool Types
export interface CLITool {
  execute(command: CLICommand, options: CLIOptions): Promise<Result<CLIResult>>;
  getAvailableCommands(): CLICommandInfo[];
  validateCommand(command: CLICommand): ValidationResult;
}

export interface CLICommand {
  action: CLIAction;
  input: string;
  output?: string;
  options: Record<string, any>;
  flags: string[];
}

export type CLIAction = 
  | 'parse' 
  | 'detect' 
  | 'generate' 
  | 'validate' 
  | 'init' 
  | 'update' 
  | 'deploy';

export interface CLIOptions {
  verbose: boolean;
  dryRun: boolean;
  configFile?: string;
  outputDir?: string;
  format: 'yaml' | 'json' | 'text';
  interactive: boolean;
}

export interface CLIResult {
  success: boolean;
  data?: any;
  message: string;
  warnings?: string[];
  executionTime: number;
  outputFiles?: string[];
}

export interface CLICommandInfo {
  name: string;
  description: string;
  usage: string;
  options: CLIOptionInfo[];
  examples: string[];
}

export interface CLIOptionInfo {
  name: string;
  alias?: string;
  type: 'string' | 'boolean' | 'number';
  required: boolean;
  description: string;
  default?: any;
}

// VSCode Extension Types
export interface VSCodeExtension {
  activate(context: any): Promise<void>;
  deactivate(): Promise<void>;
  executeCommand(command: string, args?: any[]): Promise<any>;
}

export interface ExtensionCommand {
  command: string;
  title: string;
  category: string;
  handler: (...args: any[]) => Promise<any>;
}

export interface ExtensionProvider {
  provideCompletionItems?(document: any, position: any): Promise<any[]>;
  provideHover?(document: any, position: any): Promise<any>;
  provideDiagnostics?(document: any): Promise<any[]>;
}

// Agent Hooks Types
export interface AgentHook {
  name: string;
  description: string;
  triggers: HookTrigger[];
  execute(context: HookContext): Promise<Result<HookResult>>;
}

export interface HookTrigger {
  event: string;
  conditions?: Record<string, any>;
  filters?: HookFilter[];
}

export interface HookFilter {
  type: 'path' | 'branch' | 'author' | 'file-type';
  pattern: string;
  negate?: boolean;
}

export interface HookContext {
  event: string;
  repository: RepositoryInfo;
  changes: FileChange[];
  metadata: Record<string, any>;
}

export interface RepositoryInfo {
  name: string;
  owner: string;
  branch: string;
  commit: string;
  url: string;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  content?: string;
}

export interface HookResult {
  actions: HookAction[];
  notifications: HookNotification[];
  metrics: Record<string, number>;
}

export interface HookAction {
  type: 'create-pr' | 'update-file' | 'run-workflow' | 'send-notification';
  data: Record<string, any>;
}

export interface HookNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
}

// Integration & Deployment Types
export interface DeploymentManager {
  deploy(config: DeploymentConfig): Promise<Result<DeploymentResult>>;
  validate(config: DeploymentConfig): Promise<ValidationResult>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
}

export interface DeploymentConfig {
  environment: string;
  target: DeploymentTarget;
  artifacts: DeploymentArtifact[];
  configuration: Record<string, any>;
  secrets: SecretReference[];
}

export interface DeploymentArtifact {
  name: string;
  type: 'container' | 'archive' | 'binary' | 'static';
  source: string;
  destination: string;
}

export interface SecretReference {
  name: string;
  source: 'env' | 'vault' | 'k8s-secret';
  key: string;
}

export interface DeploymentResult {
  deploymentId: string;
  status: 'success' | 'failed' | 'partial';
  url?: string;
  logs: string[];
  metrics: DeploymentMetrics;
}

export interface DeploymentStatus {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  startTime: Date;
  endTime?: Date;
}

export interface DeploymentMetrics {
  deploymentTime: number;
  resourceUsage: Record<string, number>;
  performance: Record<string, number>;
}

// System Configuration Types
export interface SystemConfig {
  components: ComponentConfig[];
  integrations: IntegrationConfig[];
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export interface ComponentConfig {
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  dependencies: string[];
}

export interface IntegrationConfig {
  name: string;
  type: 'webhook' | 'api' | 'queue' | 'database';
  configuration: Record<string, any>;
  authentication?: AuthConfig;
}

export interface AuthConfig {
  type: 'api-key' | 'oauth' | 'jwt' | 'basic';
  configuration: Record<string, any>;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: MetricConfig[];
  alerts: AlertConfig[];
  dashboards: DashboardConfig[];
}

export interface MetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels: string[];
  description: string;
}

export interface AlertConfig {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  notifications: string[];
}

export interface DashboardConfig {
  name: string;
  panels: PanelConfig[];
  refresh: string;
}

export interface PanelConfig {
  title: string;
  type: 'graph' | 'table' | 'stat';
  query: string;
  visualization: Record<string, any>;
}

export interface SecurityConfig {
  authentication: AuthConfig;
  authorization: AuthzConfig;
  encryption: EncryptionConfig;
  scanning: ScanningConfig;
}

export interface AuthzConfig {
  enabled: boolean;
  policies: PolicyConfig[];
  roles: RoleConfig[];
}

export interface RoleConfig {
  name: string;
  permissions: string[];
  description: string;
}

export interface EncryptionConfig {
  atRest: boolean;
  inTransit: boolean;
  keyManagement: KeyManagementConfig;
}

export interface KeyManagementConfig {
  provider: 'local' | 'vault' | 'kms';
  configuration: Record<string, any>;
}

export interface ScanningConfig {
  enabled: boolean;
  types: ScanType[];
  schedule: string;
  thresholds: Record<string, number>;
}

export type ScanType = 
  | 'dependency-vulnerability' 
  | 'secret-detection' 
  | 'license-compliance' 
  | 'code-quality' 
  | 'container-security';

// Import parser types for compatibility
import { 
  ProjectInfo, 
  ParseResult, 
  ParseError, 
  Result 
} from '../../parser/types';