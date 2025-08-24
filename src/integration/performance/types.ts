/**
 * Performance optimization and scalability testing types
 */

export interface PerformanceMetrics {
  timestamp: Date;
  component: string;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  metadata: Record<string, any>;
}

export interface LoadTestConfig {
  name: string;
  target: string;
  duration: number;
  concurrency: number;
  rampUpTime: number;
  scenarios: LoadTestScenario[];
  thresholds: PerformanceThresholds;
}

export interface LoadTestScenario {
  name: string;
  weight: number;
  requests: LoadTestRequest[];
}

export interface LoadTestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout: number;
}

export interface PerformanceThresholds {
  responseTime: {
    p95: number;
    p99: number;
    max: number;
  };
  throughput: {
    min: number;
    target: number;
  };
  errorRate: {
    max: number;
  };
  resources: {
    cpu: { max: number };
    memory: { max: number };
    disk: { max: number };
  };
}

export interface LoadTestResult {
  testId: string;
  config: LoadTestConfig;
  startTime: Date;
  endTime: Date;
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  metrics: PerformanceMetrics[];
  passed: boolean;
  violations: ThresholdViolation[];
}

export interface ThresholdViolation {
  metric: string;
  expected: number;
  actual: number;
  severity: 'warning' | 'error' | 'critical';
}

export interface ScalabilityTestConfig {
  name: string;
  component: string;
  stages: ScalabilityStage[];
  breakingPointAnalysis: boolean;
  resourceMonitoring: boolean;
}

export interface ScalabilityStage {
  name: string;
  duration: number;
  load: {
    users: number;
    requestsPerSecond: number;
  };
  expectedPerformance: PerformanceThresholds;
}

export interface ScalabilityTestResult {
  testId: string;
  config: ScalabilityTestConfig;
  stages: StageResult[];
  breakingPoint?: BreakingPointAnalysis;
  recommendations: ScalabilityRecommendation[];
}

export interface StageResult {
  stage: ScalabilityStage;
  metrics: PerformanceMetrics[];
  passed: boolean;
  violations: ThresholdViolation[];
}

export interface BreakingPointAnalysis {
  maxUsers: number;
  maxThroughput: number;
  limitingFactor: 'cpu' | 'memory' | 'disk' | 'network' | 'database';
  resourceUtilization: Record<string, number>;
}

export interface CapacityPlan {
  component: string;
  currentCapacity: ResourceCapacity;
  projectedDemand: DemandForecast[];
  recommendations: CapacityRecommendation[];
  costAnalysis: CostAnalysis;
}

export interface ResourceCapacity {
  cpu: { cores: number; utilization: number };
  memory: { total: number; used: number };
  storage: { total: number; used: number };
  network: { bandwidth: number; utilization: number };
  instances: { current: number; max: number };
}

export interface DemandForecast {
  timeframe: string;
  expectedLoad: {
    users: number;
    requestsPerSecond: number;
    dataVolume: number;
  };
  confidence: number;
}

export interface CapacityRecommendation {
  type: 'scale_up' | 'scale_out' | 'optimize' | 'migrate';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: {
    performance: number;
    cost: number;
    reliability: number;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    dependencies: string[];
  };
}

export interface CostAnalysis {
  current: {
    monthly: number;
    breakdown: Record<string, number>;
  };
  projected: {
    monthly: number;
    breakdown: Record<string, number>;
  };
  optimization: {
    potential: number;
    recommendations: string[];
  };
}

export interface OptimizationRecommendation {
  id: string;
  component: string;
  type: 'configuration' | 'architecture' | 'resource' | 'algorithm';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    performance: number;
    cost: number;
    reliability: number;
  };
  implementation: {
    automated: boolean;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
    steps: string[];
  };
  validation: {
    metrics: string[];
    expectedImprovement: number;
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  metric: string;
  threshold: number;
  actual: number;
  message: string;
  recommendations: string[];
}

export interface PerformanceDashboard {
  id: string;
  name: string;
  components: string[];
  widgets: DashboardWidget[];
  refreshInterval: number;
  alerts: PerformanceAlert[];
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}