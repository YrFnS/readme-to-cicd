/**
 * Core types for performance optimization and scalability testing system
 */

export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  concurrentUsers: number;
}

export interface LoadTestConfig {
  targetUrl: string;
  duration: number; // seconds
  rampUpTime: number; // seconds
  maxUsers: number;
  requestsPerSecond: number;
  testScenarios: TestScenario[];
}

export interface TestScenario {
  name: string;
  weight: number; // percentage of total load
  requests: RequestDefinition[];
}

export interface RequestDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatusCode?: number;
}

export interface BenchmarkResult {
  testId: string;
  startTime: Date;
  endTime: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  throughput: number;
  errorRate: number;
  metrics: PerformanceMetrics[];
}

export interface ScalabilityTestResult {
  testId: string;
  configuration: ScalabilityTestConfig;
  results: BenchmarkResult[];
  breakingPoint?: {
    maxUsers: number;
    maxThroughput: number;
    degradationPoint: number;
  };
  recommendations: OptimizationRecommendation[];
}

export interface ScalabilityTestConfig {
  name: string;
  baselineUsers: number;
  maxUsers: number;
  userIncrement: number;
  testDuration: number;
  acceptableResponseTime: number;
  acceptableErrorRate: number;
}

export interface OptimizationRecommendation {
  type: 'scaling' | 'caching' | 'database' | 'network' | 'code';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  estimatedCostSavings?: number;
  estimatedPerformanceGain?: number;
}

export interface CapacityPlan {
  currentCapacity: ResourceCapacity;
  projectedCapacity: ResourceCapacity;
  timeframe: string;
  growthRate: number;
  recommendations: CapacityRecommendation[];
  costAnalysis: CostAnalysis;
}

export interface ResourceCapacity {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  storage: ResourceMetric;
  network: ResourceMetric;
  instances: number;
}

export interface ResourceMetric {
  current: number;
  maximum: number;
  utilization: number; // percentage
  unit: string;
}

export interface CapacityRecommendation {
  resource: 'cpu' | 'memory' | 'storage' | 'network' | 'instances';
  action: 'increase' | 'decrease' | 'optimize';
  currentValue: number;
  recommendedValue: number;
  reasoning: string;
  timeline: string;
  cost: number;
}

export interface CostAnalysis {
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  optimizedMonthlyCost: number;
  potentialSavings: number;
  costBreakdown: CostBreakdownItem[];
}

export interface CostBreakdownItem {
  category: string;
  current: number;
  projected: number;
  optimized: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  duration: number; // seconds
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  notifications: NotificationConfig[];
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  target: string;
  template?: string;
}

export interface PerformanceReport {
  id: string;
  title: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: PerformanceSummary;
  metrics: PerformanceMetrics[];
  benchmarks: BenchmarkResult[];
  recommendations: OptimizationRecommendation[];
  trends: TrendAnalysis[];
}

export interface PerformanceSummary {
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
  availability: number;
  throughput: number;
  performanceScore: number; // 0-100
}

export interface TrendAnalysis {
  metric: string;
  trend: 'improving' | 'degrading' | 'stable';
  changePercentage: number;
  timeframe: string;
}

export interface AutoTuningConfig {
  enabled: boolean;
  rules: TuningRule[];
  safetyLimits: SafetyLimits;
  rollbackPolicy: RollbackPolicy;
}

export interface TuningRule {
  id: string;
  name: string;
  condition: string; // expression to evaluate
  action: TuningAction;
  cooldownPeriod: number; // seconds
  enabled: boolean;
}

export interface TuningAction {
  type: 'scale_up' | 'scale_down' | 'adjust_cache' | 'optimize_query' | 'restart_service';
  parameters: Record<string, any>;
  maxAdjustment: number;
}

export interface SafetyLimits {
  maxInstances: number;
  minInstances: number;
  maxCpuUsage: number;
  maxMemoryUsage: number;
  maxCostIncrease: number; // percentage
}

export interface RollbackPolicy {
  enabled: boolean;
  triggerConditions: string[];
  rollbackTimeout: number; // seconds
  maxRollbacks: number;
}