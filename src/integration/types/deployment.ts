/**
 * Deployment Manager interfaces and types
 */

import { DeploymentConfig, DeploymentResult } from './orchestration.js';

export interface DeploymentManager {
  /**
   * Create a new deployment
   */
  createDeployment(config: DeploymentConfig): Promise<DeploymentResult>;
  
  /**
   * Update an existing deployment
   */
  updateDeployment(deploymentId: string, update: DeploymentUpdate): Promise<void>;
  
  /**
   * Rollback a deployment to a previous version
   */
  rollbackDeployment(deploymentId: string, version: string): Promise<void>;
  
  /**
   * Validate a deployment configuration
   */
  validateDeployment(deploymentId: string): Promise<ValidationResult>;
  
  /**
   * Get the current status of a deployment
   */
  getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus>;
}

export interface DeploymentUpdate {
  version?: string;
  replicas?: number;
  configuration?: Record<string, any>;
  strategy?: DeploymentStrategy;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface DeploymentStatus {
  deploymentId: string;
  phase: 'pending' | 'deploying' | 'validating' | 'completed' | 'failed' | 'rolling-back';
  progress: number;
  message?: string;
  startTime: Date;
  estimatedCompletion?: Date;
  components: ComponentStatus[];
}

export interface ComponentStatus {
  componentId: string;
  status: 'pending' | 'deploying' | 'healthy' | 'unhealthy' | 'failed';
  replicas: ReplicaStatus;
  lastUpdated: Date;
}

export interface ReplicaStatus {
  desired: number;
  current: number;
  ready: number;
  available: number;
}

export interface DeploymentStrategy {
  type: 'blue-green' | 'canary' | 'rolling' | 'recreate';
  parameters: StrategyParameters;
}

export interface StrategyParameters {
  // Blue-Green specific
  switchTraffic?: boolean;
  
  // Canary specific
  canaryPercentage?: number;
  canarySteps?: number[];
  
  // Rolling specific
  maxUnavailable?: number | string;
  maxSurge?: number | string;
  
  // Common parameters
  timeout?: number;
  healthCheckGracePeriod?: number;
}

export interface InfrastructureConfig {
  provider: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'docker' | 'hybrid';
  region: string[];
  networking: NetworkConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export interface NetworkConfig {
  vpc?: string;
  subnets: string[];
  loadBalancer: LoadBalancerConfig;
  ingress: IngressConfig;
}

export interface LoadBalancerConfig {
  type: 'application' | 'network' | 'classic';
  scheme: 'internet-facing' | 'internal';
  ports: PortConfig[];
}

export interface IngressConfig {
  enabled: boolean;
  className?: string;
  annotations?: Record<string, string>;
  rules: IngressRule[];
}

export interface IngressRule {
  host: string;
  paths: IngressPath[];
}

export interface IngressPath {
  path: string;
  pathType: 'Prefix' | 'Exact' | 'ImplementationSpecific';
  service: string;
  port: number;
}

export interface PortConfig {
  port: number;
  targetPort: number;
  protocol: 'TCP' | 'UDP';
}

export interface SecurityConfig {
  encryption: EncryptionConfig;
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  networkPolicies: NetworkPolicy[];
}

export interface EncryptionConfig {
  inTransit: boolean;
  atRest: boolean;
  keyManagement: KeyManagementConfig;
}

export interface KeyManagementConfig {
  provider: 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'vault';
  keyId?: string;
  rotationEnabled: boolean;
}

export interface AuthenticationConfig {
  type: 'oauth' | 'saml' | 'jwt' | 'api-key' | 'mutual-tls';
  provider?: string;
  configuration: Record<string, any>;
}

export interface AuthorizationConfig {
  type: 'rbac' | 'abac' | 'custom';
  policies: AuthorizationPolicy[];
}

export interface AuthorizationPolicy {
  name: string;
  rules: AuthorizationRule[];
}

export interface AuthorizationRule {
  subjects: string[];
  actions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface NetworkPolicy {
  name: string;
  selector: Record<string, string>;
  ingress: NetworkPolicyRule[];
  egress: NetworkPolicyRule[];
}

export interface NetworkPolicyRule {
  from?: NetworkPolicyPeer[];
  to?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export interface NetworkPolicyPeer {
  podSelector?: Record<string, string>;
  namespaceSelector?: Record<string, string>;
  ipBlock?: IPBlock;
}

export interface IPBlock {
  cidr: string;
  except?: string[];
}

export interface NetworkPolicyPort {
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
  scrapeInterval: number;
  retention: string;
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  aggregation: LogAggregationConfig;
}

export interface LogAggregationConfig {
  provider: 'elasticsearch' | 'splunk' | 'datadog' | 'cloudwatch';
  retention: string;
  indexPattern?: string;
}

export interface TracingConfig {
  enabled: boolean;
  provider: 'jaeger' | 'zipkin' | 'datadog' | 'aws-xray';
  samplingRate: number;
}

export interface AlertingConfig {
  enabled: boolean;
  provider: 'prometheus' | 'datadog' | 'pagerduty' | 'custom';
  rules: AlertRule[];
}

export interface AlertRule {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  notifications: NotificationConfig[];
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  target: string;
  template?: string;
}