/**
 * Multi-Cloud Infrastructure Management Types
 * 
 * Defines types for managing infrastructure across AWS, Azure, GCP, and hybrid deployments
 * with Terraform integration and cross-cloud orchestration capabilities.
 */

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'hybrid';
export type DeploymentEnvironment = 'development' | 'staging' | 'production' | 'edge';
export type InfrastructureStatus = 'creating' | 'active' | 'updating' | 'deleting' | 'failed' | 'unknown';
export type FailoverStatus = 'healthy' | 'degraded' | 'failed' | 'failing-over' | 'recovered';

export interface ResourceRequirements {
  cpu: string;
  memory: string;
  storage: string;
  network: NetworkRequirements;
}

export interface NetworkRequirements {
  bandwidth: string;
  latency: number;
  availability: number;
}

export interface CredentialConfig {
  type: 'service-account' | 'access-key' | 'managed-identity' | 'iam-role';
  keyId?: string;
  secretKey?: string;
  region?: string;
  subscriptionId?: string;
  tenantId?: string;
  projectId?: string;
  serviceAccountPath?: string;
}

export interface NetworkConfig {
  vpc?: string;
  subnets: string[];
  securityGroups: string[];
  loadBalancer?: LoadBalancerConfig;
  dns?: DNSConfig;
  firewall?: FirewallConfig;
}

export interface LoadBalancerConfig {
  type: 'application' | 'network' | 'classic';
  scheme: 'internet-facing' | 'internal';
  listeners: ListenerConfig[];
  healthCheck: HealthCheckConfig;
}

export interface ListenerConfig {
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'UDP';
  certificateArn?: string;
  targetGroup: string;
}

export interface HealthCheckConfig {
  path: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'TCP';
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface DNSConfig {
  domain: string;
  hostedZoneId?: string;
  records: DNSRecord[];
}

export interface DNSRecord {
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  value: string;
  ttl: number;
}

export interface FirewallConfig {
  rules: FirewallRule[];
  defaultAction: 'allow' | 'deny';
}

export interface FirewallRule {
  name: string;
  action: 'allow' | 'deny';
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'ALL';
  sourceIp?: string;
  destinationIp?: string;
  port?: number | string;
  priority: number;
}

export interface SecurityConfig {
  encryption: EncryptionConfig;
  authentication: AuthConfig;
  authorization: AuthzConfig;
  compliance: ComplianceConfig;
  audit: AuditConfig;
}

export interface EncryptionConfig {
  atRest: boolean;
  inTransit: boolean;
  keyManagement: KeyManagementConfig;
}

export interface KeyManagementConfig {
  provider: 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault';
  keyId?: string;
  rotationEnabled: boolean;
  rotationInterval: number;
}

export interface AuthConfig {
  provider: 'oauth2' | 'saml' | 'oidc' | 'api-key';
  endpoint?: string;
  clientId?: string;
  issuer?: string;
}

export interface AuthzConfig {
  rbac: boolean;
  policies: PolicyConfig[];
}

export interface PolicyConfig {
  name: string;
  effect: 'allow' | 'deny';
  actions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface ComplianceConfig {
  frameworks: string[];
  scanning: boolean;
  reporting: boolean;
  remediation: boolean;
}

export interface AuditConfig {
  enabled: boolean;
  retention: number;
  storage: string;
  encryption: boolean;
}

export interface MonitoringConfig {
  metrics: MetricsConfig;
  logging: LoggingConfig;
  alerting: AlertingConfig;
  tracing: TracingConfig;
}

export interface MetricsConfig {
  provider: 'prometheus' | 'cloudwatch' | 'azure-monitor' | 'stackdriver';
  retention: number;
  scrapeInterval: number;
}

export interface LoggingConfig {
  provider: 'elasticsearch' | 'cloudwatch' | 'azure-logs' | 'stackdriver';
  retention: number;
  structured: boolean;
}

export interface AlertingConfig {
  provider: 'alertmanager' | 'sns' | 'azure-alerts' | 'stackdriver-alerts';
  channels: AlertChannel[];
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  endpoint: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TracingConfig {
  provider: 'jaeger' | 'zipkin' | 'x-ray' | 'azure-insights' | 'stackdriver-trace';
  samplingRate: number;
  retention: number;
}

export interface TerraformConfig {
  version: string;
  backend: TerraformBackend;
  providers: TerraformProvider[];
  modules: TerraformModule[];
}

export interface TerraformBackend {
  type: 's3' | 'azurerm' | 'gcs' | 'local';
  bucket?: string;
  key?: string;
  region?: string;
  storageAccount?: string;
  containerName?: string;
  resourceGroup?: string;
}

export interface TerraformProvider {
  name: string;
  version: string;
  configuration: Record<string, any>;
}

export interface TerraformModule {
  name: string;
  source: string;
  version?: string;
  variables: Record<string, any>;
}

export interface ReplicationConfig {
  enabled: boolean;
  strategy: 'sync' | 'async' | 'eventual';
  regions: string[];
  consistency: 'strong' | 'eventual' | 'session';
  conflictResolution: 'last-write-wins' | 'custom';
}

export interface FailoverConfig {
  enabled: boolean;
  strategy: 'automatic' | 'manual' | 'hybrid';
  healthCheck: HealthCheckConfig;
  thresholds: FailoverThresholds;
  recovery: RecoveryConfig;
}

export interface FailoverThresholds {
  errorRate: number;
  responseTime: number;
  availability: number;
  consecutiveFailures: number;
}

export interface RecoveryConfig {
  automatic: boolean;
  timeout: number;
  retries: number;
  backoff: 'linear' | 'exponential';
}

export interface HybridNetworkConfig {
  vpn: VPNConfig[];
  directConnect: DirectConnectConfig[];
  peering: PeeringConfig[];
}

export interface VPNConfig {
  type: 'site-to-site' | 'point-to-site';
  gateway: string;
  tunnels: VPNTunnel[];
}

export interface VPNTunnel {
  localNetwork: string;
  remoteNetwork: string;
  presharedKey: string;
  encryption: string;
}

export interface DirectConnectConfig {
  provider: string;
  bandwidth: string;
  vlan: number;
  bgpAsn: number;
}

export interface PeeringConfig {
  type: 'vpc' | 'vnet' | 'vpc-network';
  localId: string;
  remoteId: string;
  region: string;
}

export interface DataSyncConfig {
  enabled: boolean;
  strategy: 'real-time' | 'batch' | 'event-driven';
  sources: DataSource[];
  destinations: DataDestination[];
  transformation: TransformationConfig[];
}

export interface DataSource {
  type: 'database' | 'storage' | 'stream';
  provider: CloudProvider;
  endpoint: string;
  credentials: CredentialConfig;
}

export interface DataDestination {
  type: 'database' | 'storage' | 'stream';
  provider: CloudProvider;
  endpoint: string;
  credentials: CredentialConfig;
}

export interface TransformationConfig {
  type: 'filter' | 'map' | 'aggregate' | 'join';
  configuration: Record<string, any>;
}

export interface InfrastructureMetrics {
  resourceUtilization: ResourceUtilization;
  performance: PerformanceMetrics;
  cost: CostMetrics;
  availability: AvailabilityMetrics;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  latency: number;
}

export interface CostMetrics {
  total: number;
  compute: number;
  storage: number;
  network: number;
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  service: string;
  cost: number;
  percentage: number;
}

export interface AvailabilityMetrics {
  uptime: number;
  sla: number;
  incidents: IncidentMetrics[];
}

export interface IncidentMetrics {
  timestamp: Date;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  recommendation?: string;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  resources: DeployedResource[];
  outputs: Record<string, any>;
  duration: number;
  errors?: string[];
}

export interface DeployedResource {
  id: string;
  type: string;
  provider: CloudProvider;
  region: string;
  status: InfrastructureStatus;
  properties: Record<string, any>;
}

export interface InfrastructureEvent {
  id: string;
  timestamp: Date;
  type: 'created' | 'updated' | 'deleted' | 'failed' | 'scaled';
  resource: string;
  provider: CloudProvider;
  region: string;
  details: Record<string, any>;
}