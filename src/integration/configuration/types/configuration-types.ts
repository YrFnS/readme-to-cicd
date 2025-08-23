/**
 * Configuration Management Types
 * 
 * Defines all types and interfaces for the configuration management system
 * supporting environment-specific configurations, validation, versioning, and change propagation.
 */

export type Environment = 'development' | 'staging' | 'production';

export type ConfigValue = string | number | boolean | object | null;

export interface ConfigurationManager {
  getConfiguration(key: string, environment?: string): Promise<ConfigValue>;
  setConfiguration(key: string, value: ConfigValue, environment?: string): Promise<void>;
  validateConfiguration(config: Configuration): Promise<ValidationResult>;
  watchConfiguration(key: string, callback: ConfigChangeCallback): Promise<void>;
  migrateConfiguration(migration: ConfigMigration): Promise<void>;
}

export interface Configuration {
  system: SystemConfig;
  components: ComponentConfigs;
  deployment: DeploymentConfigs;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  integrations: IntegrationConfigs;
}

export interface SystemConfig {
  name: string;
  version: string;
  environment: Environment;
  region: string;
  timezone: string;
  logging: LoggingConfig;
  performance: PerformanceConfig;
}

export interface ComponentConfigs {
  [componentId: string]: ComponentConfig;
}

export interface ComponentConfig {
  enabled: boolean;
  version: string;
  resources: ResourceConfig;
  scaling: ScalingConfig;
  healthCheck: HealthCheckConfig;
  dependencies: string[];
  customSettings: Record<string, ConfigValue>;
}

export interface DeploymentConfigs {
  strategy: 'blue-green' | 'canary' | 'rolling' | 'recreate';
  environments: EnvironmentConfigs;
  infrastructure: InfrastructureConfig;
  validation: ValidationConfig;
  rollback: RollbackConfig;
}

export interface EnvironmentConfigs {
  [environment: string]: EnvironmentConfig;
}

export interface EnvironmentConfig {
  name: string;
  replicas: number;
  resources: ResourceConfig;
  networking: NetworkConfig;
  storage: StorageConfig;
  variables: Record<string, ConfigValue>;
}

export interface SecurityConfig {
  authentication: AuthConfig;
  authorization: AuthzConfig;
  encryption: EncryptionConfig;
  compliance: ComplianceConfig;
  audit: AuditConfig;
}

export interface MonitoringConfig {
  metrics: MetricsConfig;
  logging: LoggingConfig;
  tracing: TracingConfig;
  alerting: AlertingConfig;
  dashboards: DashboardConfig[];
}

export interface IntegrationConfigs {
  [integrationId: string]: IntegrationConfig;
}

export interface IntegrationConfig {
  type: string;
  enabled: boolean;
  endpoint: string;
  authentication: AuthConfig;
  settings: Record<string, ConfigValue>;
}

// Supporting interfaces
export interface ResourceConfig {
  cpu: string;
  memory: string;
  storage: string;
  limits: ResourceLimits;
}

export interface ResourceLimits {
  cpu: string;
  memory: string;
  storage: string;
}

export interface ScalingConfig {
  minReplicas: number;
  maxReplicas: number;
  targetCPU: number;
  targetMemory: number;
  scaleUpPolicy: ScalingPolicy;
  scaleDownPolicy: ScalingPolicy;
}

export interface ScalingPolicy {
  stabilizationWindow: number;
  selectPolicy: 'max' | 'min' | 'disabled';
  policies: ScalingPolicyRule[];
}

export interface ScalingPolicyRule {
  type: 'pods' | 'percent';
  value: number;
  periodSeconds: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  path: string;
  port: number;
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  failureThreshold: number;
  successThreshold: number;
}

export interface NetworkConfig {
  ports: PortConfig[];
  ingress: IngressConfig;
  serviceMesh: ServiceMeshConfig;
}

export interface PortConfig {
  name: string;
  port: number;
  targetPort: number;
  protocol: 'TCP' | 'UDP';
}

export interface IngressConfig {
  enabled: boolean;
  className: string;
  annotations: Record<string, string>;
  hosts: IngressHost[];
  tls: IngressTLS[];
}

export interface IngressHost {
  host: string;
  paths: IngressPath[];
}

export interface IngressPath {
  path: string;
  pathType: 'Exact' | 'Prefix' | 'ImplementationSpecific';
}

export interface IngressTLS {
  secretName: string;
  hosts: string[];
}

export interface ServiceMeshConfig {
  enabled: boolean;
  provider: 'istio' | 'linkerd' | 'consul';
  settings: Record<string, ConfigValue>;
}

export interface StorageConfig {
  volumes: VolumeConfig[];
  persistentVolumes: PersistentVolumeConfig[];
}

export interface VolumeConfig {
  name: string;
  type: 'emptyDir' | 'configMap' | 'secret' | 'persistentVolumeClaim';
  mountPath: string;
  source: string;
}

export interface PersistentVolumeConfig {
  name: string;
  size: string;
  storageClass: string;
  accessModes: string[];
  mountPath: string;
}

export interface AuthConfig {
  type: 'oauth' | 'saml' | 'apikey' | 'basic' | 'jwt';
  provider: string;
  settings: Record<string, ConfigValue>;
}

export interface AuthzConfig {
  type: 'rbac' | 'abac' | 'custom';
  policies: PolicyConfig[];
  roles: RoleConfig[];
}

export interface PolicyConfig {
  id: string;
  name: string;
  rules: PolicyRule[];
  effect: 'allow' | 'deny';
}

export interface PolicyRule {
  resource: string;
  actions: string[];
  conditions: Record<string, ConfigValue>;
}

export interface RoleConfig {
  id: string;
  name: string;
  permissions: string[];
  policies: string[];
}

export interface EncryptionConfig {
  atRest: EncryptionAtRestConfig;
  inTransit: EncryptionInTransitConfig;
  keyManagement: KeyManagementConfig;
}

export interface EncryptionAtRestConfig {
  enabled: boolean;
  algorithm: string;
  keyProvider: string;
  settings: Record<string, ConfigValue>;
}

export interface EncryptionInTransitConfig {
  enabled: boolean;
  tlsVersion: string;
  cipherSuites: string[];
  certificateProvider: string;
}

export interface KeyManagementConfig {
  provider: 'vault' | 'aws-kms' | 'azure-keyvault' | 'gcp-kms';
  rotationPolicy: KeyRotationPolicy;
  settings: Record<string, ConfigValue>;
}

export interface KeyRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  autoRotate: boolean;
}

export interface ComplianceConfig {
  frameworks: ComplianceFramework[];
  policies: CompliancePolicyConfig[];
  reporting: ComplianceReportingConfig;
}

export interface ComplianceFramework {
  name: string;
  version: string;
  controls: ComplianceControl[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  requirements: string[];
}

export interface CompliancePolicyConfig {
  id: string;
  name: string;
  framework: string;
  controls: string[];
  enforcement: 'warn' | 'block';
}

export interface ComplianceReportingConfig {
  enabled: boolean;
  schedule: string;
  recipients: string[];
  format: 'json' | 'pdf' | 'html';
}

export interface AuditConfig {
  enabled: boolean;
  level: 'minimal' | 'standard' | 'comprehensive';
  retention: AuditRetentionConfig;
  destinations: AuditDestination[];
}

export interface AuditRetentionConfig {
  days: number;
  archiveAfterDays: number;
  deleteAfterDays: number;
}

export interface AuditDestination {
  type: 'file' | 'database' | 'siem' | 'webhook';
  settings: Record<string, ConfigValue>;
}

export interface MetricsConfig {
  enabled: boolean;
  provider: 'prometheus' | 'datadog' | 'newrelic' | 'custom';
  scrapeInterval: number;
  retention: string;
  exporters: MetricsExporter[];
}

export interface MetricsExporter {
  type: string;
  endpoint: string;
  settings: Record<string, ConfigValue>;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destinations: LogDestination[];
  sampling: LogSamplingConfig;
}

export interface LogDestination {
  type: 'console' | 'file' | 'elasticsearch' | 'splunk' | 'webhook';
  settings: Record<string, ConfigValue>;
}

export interface LogSamplingConfig {
  enabled: boolean;
  rate: number;
  maxPerSecond: number;
}

export interface TracingConfig {
  enabled: boolean;
  provider: 'jaeger' | 'zipkin' | 'datadog' | 'custom';
  samplingRate: number;
  exporters: TracingExporter[];
}

export interface TracingExporter {
  type: string;
  endpoint: string;
  settings: Record<string, ConfigValue>;
}

export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRule[];
  channels: AlertChannel[];
  escalation: EscalationPolicy[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  settings: Record<string, ConfigValue>;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  steps: EscalationStep[];
}

export interface EscalationStep {
  delay: number;
  channels: string[];
  condition: string;
}

export interface DashboardConfig {
  id: string;
  name: string;
  panels: DashboardPanel[];
  refresh: string;
}

export interface DashboardPanel {
  id: string;
  type: 'graph' | 'table' | 'stat' | 'gauge';
  title: string;
  query: string;
  settings: Record<string, ConfigValue>;
}

export interface PerformanceConfig {
  timeouts: TimeoutConfig;
  retries: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  rateLimit: RateLimitConfig;
}

export interface TimeoutConfig {
  request: number;
  connection: number;
  idle: number;
  keepAlive: number;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  jitter: boolean;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond: number;
  burstSize: number;
  strategy: 'token-bucket' | 'sliding-window' | 'fixed-window';
}

export interface InfrastructureConfig {
  provider: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'docker' | 'hybrid';
  regions: string[];
  networking: NetworkConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
}

export interface ValidationConfig {
  enabled: boolean;
  rules: ValidationRule[];
  onFailure: 'warn' | 'block' | 'rollback';
}

export interface ValidationRule {
  id: string;
  name: string;
  type: 'schema' | 'custom' | 'policy';
  condition: string;
  message: string;
}

export interface RollbackConfig {
  enabled: boolean;
  strategy: 'automatic' | 'manual';
  triggers: RollbackTrigger[];
  maxVersions: number;
}

export interface RollbackTrigger {
  type: 'health-check' | 'metric' | 'error-rate' | 'manual';
  condition: string;
  delay: number;
}

// Configuration Management specific types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

export type ConfigChangeCallback = (change: ConfigurationChange) => void;

export interface ConfigurationChange {
  key: string;
  oldValue: ConfigValue;
  newValue: ConfigValue;
  environment: string;
  timestamp: Date;
  source: string;
}

export interface ConfigMigration {
  version: string;
  description: string;
  up: (config: Configuration) => Configuration;
  down: (config: Configuration) => Configuration;
}

// Secret Management types
export interface SecretManager {
  storeSecret(key: string, value: string, metadata?: SecretMetadata): Promise<void>;
  retrieveSecret(key: string): Promise<string>;
  rotateSecret(key: string): Promise<void>;
  auditSecrets(): Promise<SecretAuditReport>;
}

export interface SecretMetadata {
  description?: string;
  tags?: Record<string, string>;
  expiresAt?: Date;
  rotationPolicy?: SecretRotationPolicy;
}

export interface SecretRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  autoRotate: boolean;
  notifyBefore: number;
}

export interface SecretAuditReport {
  totalSecrets: number;
  expiringSoon: SecretInfo[];
  expired: SecretInfo[];
  recentAccess: SecretAccessInfo[];
}

export interface SecretInfo {
  key: string;
  createdAt: Date;
  expiresAt?: Date;
  lastRotated?: Date;
  tags: Record<string, string>;
}

export interface SecretAccessInfo {
  key: string;
  accessedAt: Date;
  accessedBy: string;
  operation: 'read' | 'write' | 'rotate' | 'delete';
}

// Configuration versioning types
export interface ConfigurationVersion {
  version: string;
  timestamp: Date;
  author: string;
  description: string;
  configuration: Configuration;
  checksum: string;
}

export interface ConfigurationHistory {
  versions: ConfigurationVersion[];
  currentVersion: string;
}

// Configuration change propagation types
export interface ConfigurationNotification {
  type: 'change' | 'validation-error' | 'rollback';
  key: string;
  environment: string;
  message: string;
  timestamp: Date;
  metadata: Record<string, ConfigValue>;
}

export interface NotificationChannel {
  id: string;
  type: 'webhook' | 'email' | 'slack' | 'teams';
  settings: Record<string, ConfigValue>;
  filters: NotificationFilter[];
}

export interface NotificationFilter {
  type: 'key-pattern' | 'environment' | 'severity';
  pattern: string;
  include: boolean;
}