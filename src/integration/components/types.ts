/**
 * Component Management Types and Interfaces
 */

export interface ComponentDefinition {
  id: string;
  name: string;
  version: string;
  type: 'service' | 'function' | 'worker' | 'extension';
  dependencies: string[];
  resources: ResourceRequirements;
  healthCheck: HealthCheckConfig;
  scaling: ScalingPolicy;
  metadata?: Record<string, any>;
}

export interface ResourceRequirements {
  cpu: string; // e.g., "100m", "1"
  memory: string; // e.g., "128Mi", "1Gi"
  storage?: string; // e.g., "1Gi", "10Gi"
  network?: NetworkRequirements;
  limits?: ResourceLimits;
}

export interface ResourceLimits {
  cpu?: string;
  memory?: string;
  storage?: string;
}

export interface NetworkRequirements {
  ports: PortConfig[];
  protocols: string[];
  bandwidth?: string;
}

export interface PortConfig {
  port: number;
  protocol: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS';
  name?: string;
  targetPort?: number;
}

export interface HealthCheckConfig {
  type: 'http' | 'tcp' | 'exec' | 'grpc';
  endpoint?: string; // for http/grpc
  port?: number; // for tcp
  command?: string[]; // for exec
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  failureThreshold: number;
  successThreshold: number;
}

export interface ScalingPolicy {
  minReplicas: number;
  maxReplicas: number;
  targetCPUUtilization?: number;
  targetMemoryUtilization?: number;
  customMetrics?: CustomMetric[];
  scaleUpPolicy?: ScalePolicy;
  scaleDownPolicy?: ScalePolicy;
}

export interface CustomMetric {
  name: string;
  targetValue: number;
  type: 'Resource' | 'Pods' | 'Object' | 'External';
}

export interface ScalePolicy {
  stabilizationWindowSeconds: number;
  policies: ScalePolicyRule[];
}

export interface ScalePolicyRule {
  type: 'Percent' | 'Pods';
  value: number;
  periodSeconds: number;
}

export interface DeploymentConfig {
  strategy: 'RollingUpdate' | 'Recreate' | 'BlueGreen' | 'Canary';
  environment: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  configMaps?: ConfigMapRef[];
  secrets?: SecretRef[];
  volumes?: VolumeMount[];
  rollingUpdate?: RollingUpdateConfig;
  canary?: CanaryConfig;
}

export interface RollingUpdateConfig {
  maxUnavailable?: string | number;
  maxSurge?: string | number;
}

export interface CanaryConfig {
  steps: CanaryStep[];
  analysis?: CanaryAnalysis;
}

export interface CanaryStep {
  weight: number;
  pause?: {
    duration?: string;
  };
}

export interface CanaryAnalysis {
  metrics: AnalysisMetric[];
  threshold: AnalysisThreshold;
}

export interface AnalysisMetric {
  name: string;
  provider: string;
  query: string;
}

export interface AnalysisThreshold {
  min?: number;
  max?: number;
}

export interface ConfigMapRef {
  name: string;
  key?: string;
  mountPath?: string;
}

export interface SecretRef {
  name: string;
  key?: string;
  mountPath?: string;
}

export interface VolumeMount {
  name: string;
  mountPath: string;
  readOnly?: boolean;
  subPath?: string;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  status: DeploymentStatus;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DeploymentStatus {
  phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
  replicas: {
    desired: number;
    current: number;
    ready: number;
    available: number;
  };
  conditions: DeploymentCondition[];
}

export interface DeploymentCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime: Date;
}

export interface ComponentUpdate {
  version?: string;
  image?: string;
  config?: Record<string, any>;
  resources?: ResourceRequirements;
  scaling?: ScalingPolicy;
  healthCheck?: HealthCheckConfig;
}

export interface ScalingConfig {
  replicas?: number;
  autoScaling?: boolean;
  policy?: ScalingPolicy;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  lastUpdated: Date;
  uptime?: number;
  version?: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration?: number;
  timestamp: Date;
}

export interface ComponentCommunication {
  messageQueue: MessageQueueConfig;
  eventBus: EventBusConfig;
  apiGateway: APIGatewayConfig;
  serviceDiscovery: ServiceDiscoveryConfig;
}

export interface MessageQueueConfig {
  type: 'redis' | 'rabbitmq' | 'kafka' | 'sqs';
  connection: ConnectionConfig;
  topics: TopicConfig[];
  deadLetterQueue?: DeadLetterQueueConfig;
}

export interface EventBusConfig {
  type: 'nats' | 'redis' | 'kafka' | 'eventbridge';
  connection: ConnectionConfig;
  subjects: string[];
}

export interface APIGatewayConfig {
  type: 'kong' | 'nginx' | 'envoy' | 'aws-api-gateway';
  routes: RouteConfig[];
  middleware: MiddlewareConfig[];
}

export interface ServiceDiscoveryConfig {
  type: 'consul' | 'etcd' | 'kubernetes' | 'dns';
  connection: ConnectionConfig;
  healthCheckInterval: number;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  ssl?: boolean;
  timeout?: number;
}

export interface TopicConfig {
  name: string;
  partitions?: number;
  replicationFactor?: number;
  retentionMs?: number;
}

export interface DeadLetterQueueConfig {
  name: string;
  maxRetries: number;
  retryDelay: number;
}

export interface RouteConfig {
  path: string;
  method: string;
  upstream: string;
  middleware?: string[];
}

export interface MiddlewareConfig {
  name: string;
  config: Record<string, any>;
}

export interface ComponentRegistry {
  register(component: ComponentDefinition): Promise<void>;
  unregister(componentId: string): Promise<void>;
  get(componentId: string): Promise<ComponentDefinition | null>;
  list(): Promise<ComponentDefinition[]>;
  update(componentId: string, update: Partial<ComponentDefinition>): Promise<void>;
}

export interface DependencyResolver {
  resolve(componentId: string): Promise<string[]>;
  validate(dependencies: string[]): Promise<ValidationResult>;
  getInstallOrder(components: ComponentDefinition[]): Promise<string[]>;
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
  value?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface ComponentMetrics {
  cpu: MetricValue;
  memory: MetricValue;
  network: NetworkMetrics;
  requests: RequestMetrics;
  errors: ErrorMetrics;
  custom?: Record<string, MetricValue>;
}

export interface MetricValue {
  current: number;
  average: number;
  peak: number;
  unit: string;
  timestamp: Date;
}

export interface NetworkMetrics {
  bytesIn: MetricValue;
  bytesOut: MetricValue;
  packetsIn: MetricValue;
  packetsOut: MetricValue;
}

export interface RequestMetrics {
  total: number;
  rate: number;
  latency: LatencyMetrics;
  statusCodes: Record<string, number>;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  unit: string;
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  types: Record<string, number>;
}