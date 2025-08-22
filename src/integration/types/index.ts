/**
 * Core types and interfaces for the Integration & Deployment system
 */

// Base system types
export interface RequestContext {
  requestId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  duration: number;
  memoryUsage: number;
  cpuUsage?: number;
  networkLatency?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  lastUpdated: Date;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration?: number;
}

// Workflow and orchestration types
export interface WorkflowRequest {
  type: 'readme-to-cicd' | 'component-update' | 'system-maintenance';
  payload: any;
  context: RequestContext;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface WorkflowResult {
  success: boolean;
  data: any;
  metrics: PerformanceMetrics;
  traceId: string;
}

export interface ComponentOperation {
  type: 'deploy' | 'scale' | 'update' | 'restart' | 'stop';
  componentId: string;
  parameters: Record<string, any>;
}

export interface OperationResult {
  success: boolean;
  message: string;
  data?: any;
  timestamp: Date;
}

export interface SystemEvent {
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Component Management interfaces
export interface ComponentManager {
  registerComponent(component: ComponentDefinition): Promise<void>;
  deployComponent(componentId: string, config: DeploymentConfig): Promise<DeploymentResult>;
  scaleComponent(componentId: string, scaling: ScalingConfig): Promise<void>;
  healthCheck(componentId: string): Promise<HealthStatus>;
  updateComponent(componentId: string, update: ComponentUpdate): Promise<void>;
  removeComponent(componentId: string): Promise<void>;
  getComponentStatus(componentId: string): Promise<ComponentStatus>;
  listComponents(): Promise<ComponentDefinition[]>;
  getComponentCommunication(componentId: string): Promise<ComponentCommunication | null>;
  setupCommunication(communication: ComponentCommunication): Promise<void>;
}

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
  cpu: string;
  memory: string;
  storage?: string;
  limits?: ResourceLimits;
}

export interface ResourceLimits {
  cpu?: string;
  memory?: string;
  storage?: string;
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

export interface ComponentStatus {
  component: ComponentDefinition | null;
  deployment: DeploymentResult | null;
  health: HealthStatus;
  metrics: ComponentMetrics | null;
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
}

export interface RouteConfig {
  path: string;
  method: string;
  upstream: string;
}

export interface MiddlewareConfig {
  name: string;
  config: Record<string, any>;
}