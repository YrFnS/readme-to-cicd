/**
 * Core types and interfaces for the comprehensive testing framework
 */

export type TestType = 'unit' | 'integration' | 'e2e' | 'performance' | 'chaos' | 'contract' | 'regression' | 'security';
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'timeout';
export type TestSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface TestResult {
  id: string;
  name: string;
  type: TestType;
  status: TestStatus;
  duration: number;
  startTime: Date;
  endTime?: Date;
  error?: Error;
  metrics?: TestMetrics;
  artifacts?: TestArtifact[];
}

export interface TestMetrics {
  assertions: number;
  passed: number;
  failed: number;
  coverage?: number;
  performance?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency?: number;
}

export interface TestArtifact {
  type: 'log' | 'screenshot' | 'video' | 'report' | 'trace';
  path: string;
  size: number;
  metadata?: Record<string, any>;
}

export interface TestSuite {
  id: string;
  name: string;
  type: TestType;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  severity: TestSeverity;
  timeout?: number;
  retries?: number;
  dependencies?: string[];
  execute: () => Promise<TestResult>;
}

export interface TestEnvironment {
  id: string;
  name: string;
  type: 'local' | 'docker' | 'kubernetes' | 'cloud';
  configuration: EnvironmentConfig;
  isolation: IsolationConfig;
  cleanup: CleanupConfig;
}

export interface EnvironmentConfig {
  services: ServiceConfig[];
  databases: DatabaseConfig[];
  networking: NetworkConfig;
  resources: ResourceConfig;
}

export interface ServiceConfig {
  name: string;
  image: string;
  ports: number[];
  environment: Record<string, string>;
  healthCheck: HealthCheckConfig;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mongodb' | 'redis';
  host: string;
  port: number;
  database: string;
  credentials: CredentialConfig;
}

export interface NetworkConfig {
  subnet: string;
  isolation: boolean;
  loadBalancer?: LoadBalancerConfig;
}

export interface ResourceConfig {
  cpu: string;
  memory: string;
  storage: string;
}

export interface IsolationConfig {
  namespace: string;
  networkPolicy: boolean;
  resourceQuota: boolean;
}

export interface CleanupConfig {
  automatic: boolean;
  timeout: number;
  preserveArtifacts: boolean;
}

export interface HealthCheckConfig {
  path: string;
  interval: number;
  timeout: number;
  retries: number;
}

export interface LoadBalancerConfig {
  type: 'round-robin' | 'least-connections' | 'ip-hash';
  healthCheck: HealthCheckConfig;
}

export interface CredentialConfig {
  username: string;
  password: string;
  ssl?: boolean;
}

export interface TestReport {
  id: string;
  name: string;
  timestamp: Date;
  summary: TestSummary;
  results: TestResult[];
  coverage?: CoverageReport;
  performance?: PerformanceReport;
  artifacts: TestArtifact[];
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  successRate: number;
}

export interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  threshold: number;
  details: CoverageDetail[];
}

export interface CoverageDetail {
  file: string;
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface PerformanceReport {
  benchmarks: PerformanceBenchmark[];
  trends: PerformanceTrend[];
  thresholds: PerformanceThreshold[];
}

export interface PerformanceBenchmark {
  name: string;
  metric: string;
  value: number;
  unit: string;
  baseline?: number;
  threshold?: number;
}

export interface PerformanceTrend {
  metric: string;
  values: number[];
  timestamps: Date[];
  trend: 'improving' | 'degrading' | 'stable';
}

export interface PerformanceThreshold {
  metric: string;
  operator: '<' | '>' | '<=' | '>=' | '=';
  value: number;
  severity: TestSeverity;
}