/**
 * Types and interfaces for auto-scaling and load management system
 */

export interface ScalingMetrics {
  cpu: number;
  memory: number;
  requestRate: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  queueLength: number;
  timestamp: Date;
}

export interface ScalingPolicy {
  id: string;
  name: string;
  targetMetric: keyof ScalingMetrics;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  minInstances: number;
  maxInstances: number;
  cooldownPeriod: number; // seconds
  scaleUpStep: number;
  scaleDownStep: number;
  enabled: boolean;
}

export interface AutoScalerConfig {
  policies: ScalingPolicy[];
  metricsWindow: number; // seconds
  evaluationInterval: number; // seconds
  resourceOptimization: ResourceOptimizationConfig;
}

export interface ResourceOptimizationConfig {
  enabled: boolean;
  costOptimization: boolean;
  performanceTuning: boolean;
  resourceLimits: ResourceLimits;
}

export interface ResourceLimits {
  maxCpu: number;
  maxMemory: number;
  maxInstances: number;
  maxCostPerHour: number;
}

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash';
  healthCheck: HealthCheckConfig;
  stickySession: boolean;
  timeout: number;
  retries: number;
}

export interface HealthCheckConfig {
  enabled: boolean;
  path: string;
  interval: number; // seconds
  timeout: number; // seconds
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface ServiceInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
  lastHealthCheck: Date;
  metrics: ScalingMetrics;
  metadata: Record<string, any>;
}

export interface LoadBalancerState {
  instances: ServiceInstance[];
  totalRequests: number;
  activeConnections: number;
  algorithm: string;
  lastUpdate: Date;
}

export interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'network' | 'disk' | 'database' | 'queue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedComponents: string[];
  recommendations: string[];
  detectedAt: Date;
  resolved: boolean;
}

export interface CostOptimization {
  currentCost: number;
  projectedCost: number;
  savings: number;
  recommendations: CostRecommendation[];
}

export interface CostRecommendation {
  type: 'downsize' | 'schedule' | 'reserved' | 'spot';
  description: string;
  estimatedSavings: number;
  impact: 'low' | 'medium' | 'high';
}

export interface DeploymentStrategy {
  type: 'blue-green' | 'canary' | 'rolling';
  config: BlueGreenConfig | CanaryConfig | RollingConfig;
}

export interface BlueGreenConfig {
  switchTraffic: boolean;
  validateBeforeSwitch: boolean;
  rollbackOnFailure: boolean;
  validationTimeout: number;
}

export interface CanaryConfig {
  stages: CanaryStage[];
  metrics: string[];
  successThreshold: number;
  failureThreshold: number;
  autoPromote: boolean;
}

export interface CanaryStage {
  name: string;
  trafficPercentage: number;
  duration: number; // seconds
  successCriteria: SuccessCriteria[];
}

export interface RollingConfig {
  batchSize: number;
  maxUnavailable: number;
  progressDeadline: number;
  rollbackOnFailure: boolean;
}

export interface SuccessCriteria {
  metric: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
}

export interface ScalingEvent {
  id: string;
  type: 'scale-up' | 'scale-down' | 'optimization' | 'bottleneck';
  componentId: string;
  trigger: string;
  action: string;
  result: 'success' | 'failure' | 'partial';
  metrics: ScalingMetrics;
  timestamp: Date;
  duration: number;
}

export interface ScalingResult {
  success: boolean;
  previousInstances: number;
  newInstances: number;
  reason: string;
  metrics: ScalingMetrics;
  cost: number;
  event: ScalingEvent;
}