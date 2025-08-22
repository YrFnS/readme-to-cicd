/**
 * Base types for the Integration & Deployment system
 * Consolidated exports of core structures
 */

// Re-export core types
export * from './index.js';
export * from './orchestration.js';
export * from './components.js';
export * from './deployment.js';

// Additional base types for system configuration
export interface SystemConfiguration {
  orchestration: OrchestrationConfig;
  deployment: DeploymentSystemConfig;
  monitoring: SystemMonitoringConfig;
  security: SystemSecurityConfig;
}

export interface OrchestrationConfig {
  maxConcurrentWorkflows: number;
  workflowTimeout: number;
  retryPolicy: RetryPolicyConfig;
  queueConfig: QueueConfig;
}

export interface RetryPolicyConfig {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffTime: number;
  retryableErrors: string[];
}

export interface QueueConfig {
  provider: 'redis' | 'rabbitmq' | 'sqs' | 'memory';
  connection: string;
  maxSize: number;
  processingTimeout: number;
}

export interface DeploymentSystemConfig {
  defaultStrategy: 'blue-green' | 'canary' | 'rolling';
  environments: EnvironmentConfig[];
  validation: SystemValidationConfig;
}

export interface EnvironmentConfig {
  name: string;
  type: 'development' | 'staging' | 'production';
  infrastructure: InfrastructureSettings;
  approvalRequired: boolean;
}

export interface InfrastructureSettings {
  provider: string;
  region: string;
  resourceLimits: ResourceLimits;
  networking: NetworkSettings;
}

export interface ResourceLimits {
  maxCpu: string;
  maxMemory: string;
  maxStorage: string;
  maxReplicas: number;
}

export interface NetworkSettings {
  vpc: string;
  subnets: string[];
  securityGroups: string[];
}

export interface SystemValidationConfig {
  enableHealthChecks: boolean;
  enableSmokeTests: boolean;
  enablePerformanceTests: boolean;
  validationTimeout: number;
}

export interface SystemMonitoringConfig {
  metrics: MetricsSystemConfig;
  logging: LoggingSystemConfig;
  alerting: AlertingSystemConfig;
}

export interface MetricsSystemConfig {
  provider: 'prometheus' | 'datadog' | 'cloudwatch';
  scrapeInterval: number;
  retention: string;
  customMetrics: CustomMetricConfig[];
}

export interface CustomMetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labels: string[];
}

export interface LoggingSystemConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  outputs: LogOutputConfig[];
}

export interface LogOutputConfig {
  type: 'console' | 'file' | 'elasticsearch' | 'cloudwatch';
  configuration: Record<string, any>;
}

export interface AlertingSystemConfig {
  provider: 'prometheus' | 'datadog' | 'pagerduty';
  defaultSeverity: 'info' | 'warning' | 'critical';
  escalationRules: EscalationRule[];
}

export interface EscalationRule {
  severity: string;
  delay: number;
  channels: string[];
}

export interface SystemSecurityConfig {
  authentication: SystemAuthConfig;
  authorization: SystemAuthzConfig;
  encryption: SystemEncryptionConfig;
  audit: SystemAuditConfig;
}

export interface SystemAuthConfig {
  providers: AuthProviderConfig[];
  sessionTimeout: number;
  tokenExpiry: number;
}

export interface AuthProviderConfig {
  type: 'oauth' | 'saml' | 'ldap' | 'local';
  name: string;
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface SystemAuthzConfig {
  model: 'rbac' | 'abac';
  defaultRole: string;
  roles: RoleDefinition[];
}

export interface RoleDefinition {
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface SystemEncryptionConfig {
  algorithm: string;
  keySize: number;
  keyRotationInterval: number;
  keyManagement: KeyManagementSystemConfig;
}

export interface KeyManagementSystemConfig {
  provider: 'vault' | 'aws-kms' | 'azure-keyvault';
  configuration: Record<string, any>;
}

export interface SystemAuditConfig {
  enabled: boolean;
  events: AuditEventConfig[];
  retention: string;
  storage: AuditStorageConfig;
}

export interface AuditEventConfig {
  type: string;
  level: 'info' | 'warning' | 'critical';
  includePayload: boolean;
}

export interface AuditStorageConfig {
  type: 'database' | 'file' | 'elasticsearch';
  configuration: Record<string, any>;
}