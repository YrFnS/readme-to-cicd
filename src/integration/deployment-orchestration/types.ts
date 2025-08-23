/**
 * @fileoverview Type definitions for deployment orchestration system
 * Supports blue-green, canary, and rolling deployment strategies with comprehensive validation
 */

export type DeploymentStrategyType = 'blue-green' | 'canary' | 'rolling' | 'recreate';
export type DeploymentEnvironment = 'development' | 'staging' | 'production';
export type DeploymentStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
export type ValidationStatus = 'pending' | 'running' | 'passed' | 'failed';
export type HealthCheckStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown';

export interface DeploymentConfig {
  id: string;
  name: string;
  version: string;
  strategy: DeploymentStrategyType;
  environment: DeploymentEnvironment;
  components: ComponentDeploymentConfig[];
  infrastructure: InfrastructureConfig;
  validation: ValidationConfig;
  rollback: RollbackConfig;
  analytics: AnalyticsConfig;
  approvals?: ApprovalConfig[];
  metadata?: Record<string, any>;
}

export interface ComponentDeploymentConfig {
  id: string;
  name: string;
  version: string;
  image?: string;
  replicas?: number;
  resources: ResourceRequirements;
  healthCheck: HealthCheckConfig;
  dependencies: string[];
  environment: Record<string, string>;
}

export interface ResourceRequirements {
  cpu: string;
  memory: string;
  storage?: string;
  limits?: {
    cpu: string;
    memory: string;
  };
}

export interface HealthCheckConfig {
  type: 'http' | 'tcp' | 'exec' | 'grpc';
  endpoint?: string;
  port?: number;
  command?: string[];
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  failureThreshold: number;
  successThreshold: number;
}

export interface InfrastructureConfig {
  provider: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'docker';
  region: string[];
  networking: NetworkConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export interface NetworkConfig {
  vpc?: string;
  subnets: string[];
  loadBalancer?: LoadBalancerConfig;
  ingress?: IngressConfig[];
}

export interface LoadBalancerConfig {
  type: 'application' | 'network' | 'classic';
  scheme: 'internet-facing' | 'internal';
  listeners: ListenerConfig[];
}

export interface ListenerConfig {
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'TLS';
  targetGroup: string;
  sslPolicy?: string;
}

export interface IngressConfig {
  host: string;
  path: string;
  service: string;
  port: number;
  tls?: boolean;
}

export interface SecurityConfig {
  authentication: AuthConfig;
  authorization: AuthzConfig;
  encryption: EncryptionConfig;
  networkPolicies: NetworkPolicyConfig[];
}

export interface AuthConfig {
  type: 'oauth' | 'saml' | 'api-key' | 'jwt';
  provider?: string;
  configuration: Record<string, any>;
}

export interface AuthzConfig {
  rbac: RBACConfig;
  policies: PolicyConfig[];
}

export interface RBACConfig {
  enabled: boolean;
  roles: RoleConfig[];
  bindings: RoleBindingConfig[];
}

export interface RoleConfig {
  name: string;
  rules: PolicyRuleConfig[];
}

export interface PolicyRuleConfig {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
}

export interface RoleBindingConfig {
  role: string;
  subjects: SubjectConfig[];
}

export interface SubjectConfig {
  kind: 'User' | 'Group' | 'ServiceAccount';
  name: string;
  namespace?: string;
}

export interface PolicyConfig {
  name: string;
  rules: string[];
  enforcement: 'strict' | 'permissive';
}

export interface EncryptionConfig {
  inTransit: boolean;
  atRest: boolean;
  keyManagement: KeyManagementConfig;
}

export interface KeyManagementConfig {
  provider: 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'vault';
  keyId?: string;
  rotationPolicy?: RotationPolicyConfig;
}

export interface RotationPolicyConfig {
  enabled: boolean;
  intervalDays: number;
  autoRotate: boolean;
}

export interface NetworkPolicyConfig {
  name: string;
  selector: Record<string, string>;
  ingress: NetworkPolicyRuleConfig[];
  egress: NetworkPolicyRuleConfig[];
}

export interface NetworkPolicyRuleConfig {
  from?: NetworkPolicyPeerConfig[];
  to?: NetworkPolicyPeerConfig[];
  ports: NetworkPolicyPortConfig[];
}

export interface NetworkPolicyPeerConfig {
  podSelector?: Record<string, string>;
  namespaceSelector?: Record<string, string>;
  ipBlock?: IPBlockConfig;
}

export interface IPBlockConfig {
  cidr: string;
  except?: string[];
}

export interface NetworkPolicyPortConfig {
  protocol: 'TCP' | 'UDP' | 'SCTP';
  port: number | string;
}

export interface MonitoringConfig {
  metrics: MetricsConfig;
  logging: LoggingConfig;
  tracing: TracingConfig;
  alerting: AlertingConfig;
}

export interface MetricsConfig {
  enabled: boolean;
  provider: 'prometheus' | 'datadog' | 'newrelic' | 'custom';
  endpoint?: string;
  scrapeInterval: string;
  retention: string;
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destination: 'stdout' | 'file' | 'elasticsearch' | 'cloudwatch';
  retention: string;
}

export interface TracingConfig {
  enabled: boolean;
  provider: 'jaeger' | 'zipkin' | 'datadog' | 'aws-xray';
  samplingRate: number;
  endpoint?: string;
}

export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRuleConfig[];
  channels: AlertChannelConfig[];
}

export interface AlertRuleConfig {
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  duration: string;
  annotations: Record<string, string>;
}

export interface AlertChannelConfig {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  configuration: Record<string, any>;
}

export interface ValidationConfig {
  preDeployment: ValidationStepConfig[];
  postDeployment: ValidationStepConfig[];
  healthChecks: HealthCheckValidationConfig[];
  performance: PerformanceValidationConfig[];
  security: SecurityValidationConfig[];
}

export interface ValidationStepConfig {
  name: string;
  type: 'script' | 'http' | 'database' | 'custom';
  configuration: Record<string, any>;
  timeout: number;
  retries: number;
  required: boolean;
}

export interface HealthCheckValidationConfig {
  component: string;
  checks: HealthCheckConfig[];
  timeout: number;
  required: boolean;
}

export interface PerformanceValidationConfig {
  name: string;
  metrics: MetricThresholdConfig[];
  duration: number;
  required: boolean;
}

export interface MetricThresholdConfig {
  name: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  unit: string;
}

export interface SecurityValidationConfig {
  name: string;
  scans: SecurityScanConfig[];
  required: boolean;
}

export interface SecurityScanConfig {
  type: 'vulnerability' | 'compliance' | 'secrets' | 'policy';
  tool: string;
  configuration: Record<string, any>;
}

export interface RollbackConfig {
  enabled: boolean;
  automatic: boolean;
  triggers: RollbackTriggerConfig[];
  strategy: RollbackStrategyConfig;
  timeout: number;
}

export interface RollbackTriggerConfig {
  type: 'health-check' | 'metric' | 'manual' | 'timeout';
  condition: string;
  threshold?: number;
  duration?: number;
}

export interface RollbackStrategyConfig {
  type: 'immediate' | 'gradual';
  steps?: RollbackStepConfig[];
}

export interface RollbackStepConfig {
  name: string;
  action: string;
  timeout: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  metrics: DeploymentMetricConfig[];
  reporting: ReportingConfig;
  retention: string;
}

export interface DeploymentMetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels: string[];
  description: string;
}

export interface ReportingConfig {
  dashboards: DashboardConfig[];
  alerts: ReportAlertConfig[];
  exports: ExportConfig[];
}

export interface DashboardConfig {
  name: string;
  panels: PanelConfig[];
  refresh: string;
}

export interface PanelConfig {
  title: string;
  type: 'graph' | 'table' | 'stat' | 'gauge';
  query: string;
  timeRange: string;
}

export interface ReportAlertConfig {
  name: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  channels: string[];
}

export interface ExportConfig {
  format: 'json' | 'csv' | 'pdf';
  schedule: string;
  destination: string;
}

export interface ApprovalConfig {
  stage: string;
  type: 'manual' | 'automatic';
  approvers: ApproverConfig[];
  timeout: number;
  required: boolean;
}

export interface ApproverConfig {
  type: 'user' | 'group' | 'role';
  identifier: string;
  weight?: number;
}

// Strategy-specific configurations
export interface BlueGreenStrategyConfig {
  switchTraffic: TrafficSwitchConfig;
  environmentValidation: ValidationConfig;
  rollbackTriggers: RollbackTriggerConfig[];
  warmupDuration: number;
}

export interface TrafficSwitchConfig {
  type: 'immediate' | 'gradual';
  steps?: TrafficSwitchStepConfig[];
  validation: ValidationConfig;
}

export interface TrafficSwitchStepConfig {
  percentage: number;
  duration: number;
  validation: ValidationConfig;
}

export interface CanaryStrategyConfig {
  stages: CanaryStageConfig[];
  metrics: MetricThresholdConfig[];
  progressionRules: ProgressionRuleConfig[];
  analysisInterval: number;
}

export interface CanaryStageConfig {
  name: string;
  percentage: number;
  duration: number;
  validation: ValidationConfig;
  autoPromote: boolean;
}

export interface ProgressionRuleConfig {
  name: string;
  condition: string;
  action: 'promote' | 'rollback' | 'pause';
  threshold?: number;
}

export interface RollingStrategyConfig {
  batchSize: number | string;
  maxUnavailable: number | string;
  maxSurge: number | string;
  progressDeadline: number;
  pauseBetweenBatches: number;
}

// Deployment execution types
export interface DeploymentExecution {
  id: string;
  deploymentId: string;
  status: DeploymentStatus;
  startTime: Date;
  endTime?: Date;
  currentStage?: string;
  progress: DeploymentProgress;
  logs: DeploymentLog[];
  metrics: DeploymentMetrics;
  errors: DeploymentError[];
}

export interface DeploymentProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface DeploymentMetrics {
  duration: number;
  resourceUsage: ResourceUsageMetrics;
  performance: PerformanceMetrics;
  success: boolean;
  rollbackCount: number;
}

export interface ResourceUsageMetrics {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
}

export interface DeploymentError {
  timestamp: Date;
  component: string;
  type: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

// Result types
export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  executionId: string;
  status: DeploymentStatus;
  message: string;
  metrics?: DeploymentMetrics;
  rollbackInfo?: RollbackInfo;
}

export interface RollbackInfo {
  triggered: boolean;
  reason: string;
  previousVersion: string;
  rollbackTime: Date;
  success: boolean;
}

export interface ValidationResult {
  success: boolean;
  results: ValidationStepResult[];
  overallScore: number;
  recommendations: string[];
}

export interface ValidationStepResult {
  name: string;
  success: boolean;
  message: string;
  duration: number;
  metadata?: Record<string, any>;
}

export interface PromotionResult {
  success: boolean;
  fromEnvironment: DeploymentEnvironment;
  toEnvironment: DeploymentEnvironment;
  deploymentId: string;
  approvals: ApprovalResult[];
}

export interface ApprovalResult {
  stage: string;
  approved: boolean;
  approver: string;
  timestamp: Date;
  comments?: string;
}