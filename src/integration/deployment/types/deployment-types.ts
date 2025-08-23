/**
 * Core deployment types and interfaces
 */

export interface DeploymentManager {
  deploy(config: DeploymentConfig): Promise<DeploymentResult>;
  update(deploymentId: string, config: DeploymentUpdateConfig): Promise<DeploymentResult>;
  rollback(deploymentId: string, version?: string): Promise<DeploymentResult>;
  scale(deploymentId: string, replicas: number): Promise<DeploymentResult>;
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  getLogs(deploymentId: string, options?: LogOptions): Promise<string[]>;
  delete(deploymentId: string): Promise<void>;
}

export interface DeploymentConfig {
  id: string;
  name: string;
  image: string;
  version: string;
  environment: DeploymentEnvironment;
  strategy: DeploymentStrategy;
  resources: ResourceRequirements;
  networking: NetworkingConfig;
  volumes?: VolumeConfig[];
  secrets?: SecretConfig[];
  configMaps?: ConfigMapConfig[];
  healthCheck: HealthCheckConfig;
  scaling: ScalingConfig;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface DeploymentUpdateConfig {
  image?: string;
  version?: string;
  resources?: ResourceRequirements;
  scaling?: ScalingConfig;
  healthCheck?: HealthCheckConfig;
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
  rollbackInfo?: RollbackInfo;
}

export interface DeploymentStatus {
  phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Terminating' | 'Unknown';
  replicas: ReplicaStatus;
  conditions: DeploymentCondition[];
  lastUpdated: Date;
  readyReplicas: number;
  availableReplicas: number;
}

export interface ReplicaStatus {
  desired: number;
  current: number;
  ready: number;
  available: number;
  unavailable: number;
}

export interface DeploymentCondition {
  type: 'Available' | 'Progressing' | 'ReplicaFailure';
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime: Date;
  lastUpdateTime: Date;
}

export interface RollbackInfo {
  previousVersion: string;
  rollbackReason: string;
  rollbackTimestamp: Date;
  rollbackStrategy: 'immediate' | 'gradual';
}

export type DeploymentEnvironment = 'development' | 'staging' | 'production' | 'testing';

export type DeploymentStrategy = 
  | 'RollingUpdate' 
  | 'Recreate' 
  | 'BlueGreen' 
  | 'Canary' 
  | 'A/B';

export interface ResourceRequirements {
  requests: ResourceSpec;
  limits: ResourceSpec;
}

export interface ResourceSpec {
  cpu: string;
  memory: string;
  storage?: string;
  ephemeralStorage?: string;
}

export interface NetworkingConfig {
  ports: PortConfig[];
  ingress?: IngressConfig;
  service?: ServiceConfig;
  networkPolicy?: NetworkPolicyConfig;
}

export interface PortConfig {
  name: string;
  containerPort: number;
  protocol: 'TCP' | 'UDP' | 'SCTP';
  hostPort?: number;
}

export interface IngressConfig {
  enabled: boolean;
  className?: string;
  hosts: IngressHost[];
  tls?: IngressTLS[];
  annotations?: Record<string, string>;
}

export interface IngressHost {
  host: string;
  paths: IngressPath[];
}

export interface IngressPath {
  path: string;
  pathType: 'Exact' | 'Prefix' | 'ImplementationSpecific';
  backend: IngressBackend;
}

export interface IngressBackend {
  service: {
    name: string;
    port: {
      number: number;
    };
  };
}

export interface IngressTLS {
  hosts: string[];
  secretName: string;
}

export interface ServiceConfig {
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
  ports: ServicePort[];
  selector?: Record<string, string>;
  sessionAffinity?: 'None' | 'ClientIP';
}

export interface ServicePort {
  name: string;
  port: number;
  targetPort: number | string;
  protocol: 'TCP' | 'UDP' | 'SCTP';
  nodePort?: number;
}

export interface NetworkPolicyConfig {
  podSelector: Record<string, string>;
  policyTypes: ('Ingress' | 'Egress')[];
  ingress?: NetworkPolicyIngressRule[];
  egress?: NetworkPolicyEgressRule[];
}

export interface NetworkPolicyIngressRule {
  from?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export interface NetworkPolicyEgressRule {
  to?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export interface NetworkPolicyPeer {
  podSelector?: Record<string, string>;
  namespaceSelector?: Record<string, string>;
  ipBlock?: {
    cidr: string;
    except?: string[];
  };
}

export interface NetworkPolicyPort {
  protocol?: 'TCP' | 'UDP' | 'SCTP';
  port?: number | string;
  endPort?: number;
}

export interface VolumeConfig {
  name: string;
  type: 'emptyDir' | 'hostPath' | 'persistentVolumeClaim' | 'configMap' | 'secret' | 'nfs';
  mountPath: string;
  readOnly?: boolean;
  subPath?: string;
  config?: Record<string, any>;
}

export interface SecretConfig {
  name: string;
  type: 'Opaque' | 'kubernetes.io/dockerconfigjson' | 'kubernetes.io/tls';
  data: Record<string, string>;
  stringData?: Record<string, string>;
}

export interface ConfigMapConfig {
  name: string;
  data: Record<string, string>;
  binaryData?: Record<string, string>;
}

export interface HealthCheckConfig {
  livenessProbe?: ProbeConfig;
  readinessProbe?: ProbeConfig;
  startupProbe?: ProbeConfig;
}

export interface ProbeConfig {
  type: 'http' | 'tcp' | 'exec' | 'grpc';
  httpGet?: {
    path: string;
    port: number | string;
    scheme?: 'HTTP' | 'HTTPS';
    httpHeaders?: { name: string; value: string }[];
  };
  tcpSocket?: {
    port: number | string;
  };
  exec?: {
    command: string[];
  };
  grpc?: {
    port: number;
    service?: string;
  };
  initialDelaySeconds: number;
  periodSeconds: number;
  timeoutSeconds: number;
  failureThreshold: number;
  successThreshold: number;
}

export interface ScalingConfig {
  minReplicas: number;
  maxReplicas: number;
  targetCPUUtilization?: number;
  targetMemoryUtilization?: number;
  customMetrics?: CustomMetricConfig[];
  behavior?: ScalingBehavior;
}

export interface CustomMetricConfig {
  name: string;
  type: 'Resource' | 'Pods' | 'Object' | 'External';
  target: {
    type: 'Utilization' | 'AverageValue' | 'Value';
    value?: string;
    averageValue?: string;
    averageUtilization?: number;
  };
}

export interface ScalingBehavior {
  scaleUp?: ScalingRules;
  scaleDown?: ScalingRules;
}

export interface ScalingRules {
  stabilizationWindowSeconds?: number;
  selectPolicy?: 'Max' | 'Min' | 'Disabled';
  policies?: ScalingPolicy[];
}

export interface ScalingPolicy {
  type: 'Percent' | 'Pods';
  value: number;
  periodSeconds: number;
}

export interface LogOptions {
  follow?: boolean;
  previous?: boolean;
  since?: Date;
  sinceSeconds?: number;
  timestamps?: boolean;
  tailLines?: number;
  limitBytes?: number;
  container?: string;
}

export interface DeploymentMetrics {
  cpu: MetricData;
  memory: MetricData;
  network: NetworkMetrics;
  storage: StorageMetrics;
  replicas: ReplicaMetrics;
  requests: RequestMetrics;
}

export interface MetricData {
  current: number;
  average: number;
  peak: number;
  unit: string;
  timestamp: Date;
  history?: MetricPoint[];
}

export interface MetricPoint {
  value: number;
  timestamp: Date;
}

export interface NetworkMetrics {
  bytesIn: MetricData;
  bytesOut: MetricData;
  packetsIn: MetricData;
  packetsOut: MetricData;
  connections: MetricData;
}

export interface StorageMetrics {
  used: MetricData;
  available: MetricData;
  iops: MetricData;
  throughput: MetricData;
}

export interface ReplicaMetrics {
  desired: number;
  current: number;
  ready: number;
  available: number;
  unavailable: number;
  restarts: number;
  age: number;
}

export interface RequestMetrics {
  total: number;
  rate: number;
  errors: number;
  errorRate: number;
  latency: LatencyMetrics;
  statusCodes: Record<string, number>;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  max: number;
  unit: string;
}