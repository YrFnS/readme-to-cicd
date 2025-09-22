// Core types for Agent Hooks automation system

export interface RepositoryInfo {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  language?: string;
  topics?: string[];
}

export interface RepositoryChanges {
  modifiedFiles: FileChange[];
  addedFiles: FileChange[];
  deletedFiles: FileChange[];
  configurationChanges: ConfigChange[];
  dependencyChanges: DependencyChange[];
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  content?: string;
  previousContent?: string;
  significance: 'low' | 'medium' | 'high';
}

export interface ConfigChange {
  type: 'package.json' | 'requirements.txt' | 'Cargo.toml' | 'go.mod' | 'dockerfile';
  changes: string[];
  impact: FrameworkImpact[];
}

export interface DependencyChange {
  framework: string;
  version?: string;
  type: 'added' | 'updated' | 'removed';
  breaking: boolean;
}

export interface FrameworkImpact {
  framework: string;
  confidence: number;
  evidence: string[];
}

export interface AutomationDecision {
  shouldCreatePR: boolean;
  changes: WorkflowChange[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  rationale: string;
  performanceImpact: PerformanceImpact;
  batchId?: string;
}

export interface WorkflowChange {
  type: 'create' | 'update' | 'delete';
  file: string;
  content: string;
  description: string;
  category: 'ci' | 'cd' | 'security' | 'performance' | 'monitoring';
}

export interface PerformanceImpact {
  estimatedTimeSavings: number; // in minutes
  costReduction: number; // in USD per month
  confidence: number; // 0-1
  rationale: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggers: RuleTrigger[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface RuleTrigger {
  type: 'file_change' | 'dependency_update' | 'security_alert' | 'performance_degradation';
  patterns: string[];
  threshold?: number;
  debounceMs?: number;
}

export interface RuleCondition {
  type: 'file_exists' | 'dependency_version' | 'framework_detected' | 'performance_threshold';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches';
  value: any;
}

export interface RuleAction {
  type: 'create_pr' | 'create_issue' | 'send_notification' | 'run_analysis';
  parameters: Record<string, any>;
  approvalRequired: boolean;
  notificationChannels?: string[];
}

export interface PullRequestResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  error?: string;
  warnings?: string[];
}

export interface AnalysisResult {
  repository: RepositoryInfo;
  changes: RepositoryChanges;
  decisions: AutomationDecision[];
  rules: AutomationRule[];
  timestamp: Date;
  processingTime: number;
}

export enum EventPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4
}

export interface WebhookEvent {
  type: WebhookEventType;
  payload: any;
  repository: RepositoryInfo;
  timestamp: Date;
  signature: string;
  priority: EventPriority;
}

export enum WebhookEventType {
  PUSH = 'push',
  PULL_REQUEST = 'pull_request',
  RELEASE = 'release',
  WORKFLOW_RUN = 'workflow_run',
  REPOSITORY = 'repository',
  WORKFLOW_JOB = 'workflow_job',
  DEPLOYMENT = 'deployment',
  DEPLOYMENT_STATUS = 'deployment_status',
  SECURITY_ADVISORY = 'security_advisory',
  ISSUES = 'issues',
  ISSUE_COMMENT = 'issue_comment'
}

export interface PerformanceMetrics {
  workflowId: string;
  runId: string;
  duration: number;
  queueTime: number;
  jobMetrics: JobMetrics[];
  resourceUsage: ResourceUsage;
  timestamp: Date;
}

export interface JobMetrics {
  jobName: string;
  duration: number;
  status: 'success' | 'failure' | 'cancelled';
  steps: StepMetrics[];
}

export interface StepMetrics {
  stepName: string;
  duration: number;
  status: 'success' | 'failure' | 'cancelled';
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  storage: number;
}

export interface PerformanceAnalysis {
  averageDuration: number;
  trends: PerformanceTrend[];
  bottlenecks: Bottleneck[];
  optimizationOpportunities: OptimizationSuggestion[];
  performanceScore: number;
  baseline?: PerformanceMetrics;
}

export interface PerformanceTrend {
  metric: 'duration' | 'queue_time' | 'success_rate' | 'resource_usage';
  direction: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  timeframe: string;
}

export interface Bottleneck {
  type: 'job' | 'step' | 'dependency' | 'resource';
  location: string;
  impact: number;
  frequency: number;
  suggestions: string[];
}

export interface OptimizationSuggestion {
  type: 'caching' | 'parallelization' | 'resource_optimization' | 'dependency_update';
  description: string;
  estimatedImprovement: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  priority: number;
  category: 'performance' | 'cost' | 'reliability';
}

export interface AutomationConfig {
  enabledFeatures: string[];
  defaultRules: AutomationRule[];
  approvalWorkflows: ApprovalWorkflow[];
  batchingConfig: BatchingConfig;
  priorityThresholds: PriorityThresholds;
  notificationSettings: NotificationSettings;
}

export interface ApprovalWorkflow {
  name: string;
  conditions: RuleCondition[];
  approvers: string[];
  timeoutHours: number;
  autoApprove: boolean;
}

export interface BatchingConfig {
  enabled: boolean;
  maxBatchSize: number;
  maxWaitTimeMs: number;
  similarityThreshold: number;
}

export interface PriorityThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface NotificationSettings {
  channels: string[];
  templates: Record<string, string>;
  frequencyLimits: Record<string, number>;
}

export interface GitHubAPIConfig {
  token: string;
  baseUrl: string | undefined;
  userAgent: string | undefined;
  requestTimeout: number | undefined;
}

export interface PullRequestData {
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  maintainer_can_modify?: boolean;
}

export interface WorkflowRunInfo {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'requested' | 'waiting';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | undefined;
  created_at: string;
  updated_at: string;
  duration: number | undefined;
}

export interface SecurityAlert {
  number: number;
  state: 'open' | 'dismissed' | 'fixed' | 'closed' | null | undefined;
  severity: 'low' | 'medium' | 'high' | 'critical' | undefined;
  description: string;
  html_url: string;
  created_at: string;
}

export interface DependabotAlert {
  number: number;
  state: 'open' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  package_name: string;
  vulnerable_version: string;
  safe_version: string;
  html_url: string;
}

export interface ReadmeAnalysis {
  hasTests: boolean;
  hasLinting: boolean;
  hasBuild: boolean;
  hasDeploy: boolean;
  frameworks: string[];
  languages: string[];
  packageManager: 'npm' | 'yarn' | 'pnpm';
  nodeVersion: string;
  testCommand: string;
  buildCommand: string;
  deployTarget: string | null;
}

export interface WebhookHandlerConfig {
  webhookSecret: string;
  trustedIPs?: string[];
  maxBodySize?: number;
  signatureTolerance?: number; // milliseconds
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  eventType?: string;
  repository?: RepositoryInfo;
  action?: string;
}

export interface WebhookSignatureVerification {
  isValid: boolean;
  error: string | undefined;
  signature: string | undefined;
  timestamp: number | undefined;
}

export interface PRContent {
  title: string;
  body: string;
  branchName: string;
  files: WorkflowChange[];
  performanceImpact: PerformanceImpact;
  rationale: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface PRTemplate {
  name: string;
  titleTemplate: string;
  bodyTemplate: string;
  includePerformanceMetrics: boolean;
  includeRationale: boolean;
  reviewers: string[];
  labels: string[];
}

export interface PRCreationResult {
  success: boolean;
  prNumber: number | undefined;
  prUrl: string | undefined;
  branchName: string | undefined;
  error: string | undefined;
  warnings: string[] | undefined;
}

export interface PRStatus {
  number: number;
  state: 'open' | 'closed' | 'merged';
  merged: boolean;
  mergeable: boolean | null;
  mergeableState: string;
  reviews: ReviewStatus[];
  checks: CheckStatus[];
}

export interface ReviewStatus {
  state: 'approved' | 'changes_requested' | 'commented' | 'pending';
  reviewer: string;
  submittedAt: string;
}

export interface CheckStatus {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
}