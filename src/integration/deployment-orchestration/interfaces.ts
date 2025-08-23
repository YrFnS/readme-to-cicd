/**
 * @fileoverview Interface definitions for deployment orchestration system
 * Defines contracts for deployment strategies, validation, and orchestration
 */

import {
  DeploymentConfig,
  DeploymentExecution,
  DeploymentResult,
  ValidationResult,
  PromotionResult,
  DeploymentStatus,
  BlueGreenStrategyConfig,
  CanaryStrategyConfig,
  RollingStrategyConfig,
  DeploymentEnvironment,
  ApprovalResult,
  DeploymentMetrics,
  HealthCheckStatus,
  ValidationStepResult,
  RollbackInfo
} from './types.js';

/**
 * Main deployment orchestrator interface
 * Coordinates all deployment operations and strategies
 */
export interface IDeploymentOrchestrator {
  /**
   * Create and execute a new deployment
   */
  createDeployment(config: DeploymentConfig): Promise<DeploymentResult>;

  /**
   * Get deployment status and progress
   */
  getDeploymentStatus(deploymentId: string): Promise<DeploymentExecution>;

  /**
   * Validate a deployment configuration
   */
  validateDeployment(deploymentId: string): Promise<ValidationResult>;

  /**
   * Rollback a deployment to previous version
   */
  rollbackDeployment(deploymentId: string, targetVersion?: string): Promise<DeploymentResult>;

  /**
   * Promote deployment between environments
   */
  promoteDeployment(
    deploymentId: string,
    fromEnvironment: DeploymentEnvironment,
    toEnvironment: DeploymentEnvironment
  ): Promise<PromotionResult>;

  /**
   * Pause an ongoing deployment
   */
  pauseDeployment(deploymentId: string): Promise<void>;

  /**
   * Resume a paused deployment
   */
  resumeDeployment(deploymentId: string): Promise<void>;

  /**
   * Cancel a deployment
   */
  cancelDeployment(deploymentId: string): Promise<void>;

  /**
   * Get deployment analytics and metrics
   */
  getDeploymentAnalytics(deploymentId: string): Promise<DeploymentMetrics>;

  /**
   * List all deployments with optional filtering
   */
  listDeployments(filter?: DeploymentFilter): Promise<DeploymentExecution[]>;
}

export interface DeploymentFilter {
  environment?: DeploymentEnvironment;
  status?: DeploymentStatus;
  component?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Base interface for deployment strategies
 */
export interface IDeploymentStrategy {
  /**
   * Strategy type identifier
   */
  readonly type: string;

  /**
   * Execute the deployment strategy
   */
  execute(config: DeploymentConfig): Promise<DeploymentResult>;

  /**
   * Validate strategy-specific configuration
   */
  validateConfig(config: DeploymentConfig): Promise<ValidationResult>;

  /**
   * Get strategy-specific metrics
   */
  getMetrics(deploymentId: string): Promise<DeploymentMetrics>;

  /**
   * Handle rollback for this strategy
   */
  rollback(deploymentId: string, targetVersion?: string): Promise<DeploymentResult>;
}

/**
 * Blue-Green deployment strategy interface
 */
export interface IBlueGreenStrategy extends IDeploymentStrategy {
  /**
   * Switch traffic between blue and green environments
   */
  switchTraffic(deploymentId: string, config: BlueGreenStrategyConfig): Promise<void>;

  /**
   * Validate environment readiness
   */
  validateEnvironment(deploymentId: string, environment: 'blue' | 'green'): Promise<ValidationResult>;

  /**
   * Get current traffic distribution
   */
  getTrafficDistribution(deploymentId: string): Promise<TrafficDistribution>;
}

export interface TrafficDistribution {
  blue: number;
  green: number;
  timestamp: Date;
}

/**
 * Canary deployment strategy interface
 */
export interface ICanaryStrategy extends IDeploymentStrategy {
  /**
   * Progress to next canary stage
   */
  progressStage(deploymentId: string): Promise<void>;

  /**
   * Analyze canary metrics and decide on progression
   */
  analyzeCanary(deploymentId: string): Promise<CanaryAnalysisResult>;

  /**
   * Get current canary stage information
   */
  getCurrentStage(deploymentId: string): Promise<CanaryStageInfo>;
}

export interface CanaryAnalysisResult {
  recommendation: 'promote' | 'rollback' | 'continue';
  confidence: number;
  metrics: Record<string, number>;
  reasons: string[];
}

export interface CanaryStageInfo {
  currentStage: number;
  totalStages: number;
  percentage: number;
  duration: number;
  startTime: Date;
  metrics: Record<string, number>;
}

/**
 * Rolling deployment strategy interface
 */
export interface IRollingStrategy extends IDeploymentStrategy {
  /**
   * Get current rolling update progress
   */
  getRollingProgress(deploymentId: string): Promise<RollingProgress>;

  /**
   * Pause rolling update
   */
  pauseRolling(deploymentId: string): Promise<void>;

  /**
   * Resume rolling update
   */
  resumeRolling(deploymentId: string): Promise<void>;
}

export interface RollingProgress {
  totalReplicas: number;
  updatedReplicas: number;
  readyReplicas: number;
  availableReplicas: number;
  unavailableReplicas: number;
  percentage: number;
}

/**
 * Deployment validation interface
 */
export interface IDeploymentValidator {
  /**
   * Validate deployment configuration
   */
  validateConfiguration(config: DeploymentConfig): Promise<ValidationResult>;

  /**
   * Perform pre-deployment validation
   */
  validatePreDeployment(config: DeploymentConfig): Promise<ValidationResult>;

  /**
   * Perform post-deployment validation
   */
  validatePostDeployment(deploymentId: string): Promise<ValidationResult>;

  /**
   * Validate health checks
   */
  validateHealthChecks(deploymentId: string): Promise<ValidationResult>;

  /**
   * Validate performance metrics
   */
  validatePerformance(deploymentId: string): Promise<ValidationResult>;

  /**
   * Validate security compliance
   */
  validateSecurity(deploymentId: string): Promise<ValidationResult>;
}

/**
 * Health check manager interface
 */
export interface IHealthCheckManager {
  /**
   * Register health check for a component
   */
  registerHealthCheck(componentId: string, config: any): Promise<void>;

  /**
   * Execute health check for a component
   */
  executeHealthCheck(componentId: string): Promise<HealthCheckResult>;

  /**
   * Get health status for all components
   */
  getHealthStatus(deploymentId: string): Promise<Record<string, HealthCheckStatus>>;

  /**
   * Monitor health continuously
   */
  startHealthMonitoring(deploymentId: string): Promise<void>;

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(deploymentId: string): Promise<void>;
}

export interface HealthCheckResult {
  componentId: string;
  status: HealthCheckStatus;
  timestamp: Date;
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Rollback manager interface
 */
export interface IRollbackManager {
  /**
   * Create rollback plan
   */
  createRollbackPlan(deploymentId: string): Promise<RollbackPlan>;

  /**
   * Execute rollback
   */
  executeRollback(deploymentId: string, plan?: RollbackPlan): Promise<DeploymentResult>;

  /**
   * Validate rollback feasibility
   */
  validateRollback(deploymentId: string): Promise<ValidationResult>;

  /**
   * Get rollback history
   */
  getRollbackHistory(deploymentId: string): Promise<RollbackInfo[]>;
}

export interface RollbackPlan {
  deploymentId: string;
  targetVersion: string;
  steps: RollbackStep[];
  estimatedDuration: number;
  risks: RollbackRisk[];
}

export interface RollbackStep {
  name: string;
  action: string;
  order: number;
  timeout: number;
  rollbackOnFailure: boolean;
}

export interface RollbackRisk {
  type: 'data-loss' | 'downtime' | 'performance' | 'compatibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

/**
 * Approval manager interface
 */
export interface IApprovalManager {
  /**
   * Request approval for deployment stage
   */
  requestApproval(deploymentId: string, stage: string): Promise<ApprovalRequest>;

  /**
   * Submit approval decision
   */
  submitApproval(requestId: string, decision: ApprovalDecision): Promise<void>;

  /**
   * Get approval status
   */
  getApprovalStatus(deploymentId: string): Promise<ApprovalStatus>;

  /**
   * Cancel approval request
   */
  cancelApprovalRequest(requestId: string): Promise<void>;
}

export interface ApprovalRequest {
  id: string;
  deploymentId: string;
  stage: string;
  requester: string;
  approvers: string[];
  deadline: Date;
  context: Record<string, any>;
}

export interface ApprovalDecision {
  approved: boolean;
  approver: string;
  comments?: string;
  timestamp: Date;
}

export interface ApprovalStatus {
  pending: ApprovalRequest[];
  completed: ApprovalResult[];
  overallStatus: 'pending' | 'approved' | 'rejected' | 'expired';
}

/**
 * Analytics manager interface
 */
export interface IAnalyticsManager {
  /**
   * Track deployment metrics
   */
  trackDeploymentMetrics(deploymentId: string, metrics: DeploymentMetrics): Promise<void>;

  /**
   * Generate deployment report
   */
  generateDeploymentReport(deploymentId: string): Promise<DeploymentReport>;

  /**
   * Get deployment analytics dashboard
   */
  getAnalyticsDashboard(filter?: AnalyticsFilter): Promise<AnalyticsDashboard>;

  /**
   * Track deployment success rate
   */
  getSuccessRate(filter?: AnalyticsFilter): Promise<SuccessRateMetrics>;

  /**
   * Get performance trends
   */
  getPerformanceTrends(filter?: AnalyticsFilter): Promise<PerformanceTrends>;
}

export interface DeploymentReport {
  deploymentId: string;
  summary: DeploymentSummary;
  timeline: DeploymentTimelineEvent[];
  metrics: DeploymentMetrics;
  issues: DeploymentIssue[];
  recommendations: string[];
}

export interface DeploymentSummary {
  status: DeploymentStatus;
  duration: number;
  componentsDeployed: number;
  rollbacksTriggered: number;
  successRate: number;
}

export interface DeploymentTimelineEvent {
  timestamp: Date;
  event: string;
  component?: string;
  status: 'success' | 'warning' | 'error';
  details?: Record<string, any>;
}

export interface DeploymentIssue {
  type: 'error' | 'warning' | 'performance' | 'security';
  component: string;
  message: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  resolution?: string;
}

export interface AnalyticsFilter {
  environment?: DeploymentEnvironment;
  component?: string;
  startDate?: Date;
  endDate?: Date;
  strategy?: string;
}

export interface AnalyticsDashboard {
  overview: DashboardOverview;
  charts: DashboardChart[];
  alerts: DashboardAlert[];
  trends: DashboardTrend[];
}

export interface DashboardOverview {
  totalDeployments: number;
  successRate: number;
  averageDuration: number;
  activeDeployments: number;
  failedDeployments: number;
}

export interface DashboardChart {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'gauge';
  data: ChartDataPoint[];
  timeRange: string;
}

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface DashboardAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  deploymentId?: string;
}

export interface DashboardTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  period: string;
}

export interface SuccessRateMetrics {
  overall: number;
  byEnvironment: Record<DeploymentEnvironment, number>;
  byStrategy: Record<string, number>;
  byComponent: Record<string, number>;
  trend: TrendData[];
}

export interface TrendData {
  timestamp: Date;
  value: number;
}

export interface PerformanceTrends {
  deploymentDuration: TrendData[];
  rollbackRate: TrendData[];
  errorRate: TrendData[];
  throughput: TrendData[];
}

/**
 * Multi-environment promotion interface
 */
export interface IPromotionManager {
  /**
   * Create promotion pipeline
   */
  createPromotionPipeline(config: PromotionPipelineConfig): Promise<PromotionPipeline>;

  /**
   * Execute promotion between environments
   */
  executePromotion(pipelineId: string, stage: string): Promise<PromotionResult>;

  /**
   * Get promotion status
   */
  getPromotionStatus(pipelineId: string): Promise<PromotionStatus>;

  /**
   * Validate promotion readiness
   */
  validatePromotion(pipelineId: string, stage: string): Promise<ValidationResult>;
}

export interface PromotionPipelineConfig {
  name: string;
  stages: PromotionStageConfig[];
  approvals: ApprovalConfig[];
  validation: ValidationConfig;
}

export interface PromotionStageConfig {
  name: string;
  environment: DeploymentEnvironment;
  deploymentConfig: DeploymentConfig;
  prerequisites: string[];
  autoPromote: boolean;
}

export interface PromotionPipeline {
  id: string;
  name: string;
  stages: PromotionStage[];
  currentStage: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
}

export interface PromotionStage {
  name: string;
  environment: DeploymentEnvironment;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  deploymentId?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface PromotionStatus {
  pipelineId: string;
  currentStage: string;
  progress: number;
  stages: PromotionStageStatus[];
  blockers: PromotionBlocker[];
}

export interface PromotionStageStatus {
  name: string;
  status: string;
  progress: number;
  issues: string[];
  approvals: ApprovalStatus;
}

export interface PromotionBlocker {
  stage: string;
  type: 'approval' | 'validation' | 'dependency' | 'error';
  message: string;
  resolvable: boolean;
}