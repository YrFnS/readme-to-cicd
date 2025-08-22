import { RepositoryInfo } from './index';
import { NotificationChannel, NotificationPriority } from './notifications';

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  ACKNOWLEDGED = 'acknowledged',
  SUPPRESSED = 'suppressed'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  labels: string[];
  unit?: string;
  buckets?: number[];
  quantiles?: number[];
}

export interface MetricValue {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
  type: MetricType;
}

export interface TimeSeriesData {
  metric: string;
  labels: Record<string, string>;
  values: Array<{ timestamp: Date; value: number }>;
  interval: string; // e.g., '1m', '5m', '1h'
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string; // PromQL-style expression
  severity: AlertSeverity;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  duration: string; // How long condition must be true
  enabled: boolean;
  channels: NotificationChannel[];
  cooldown?: string; // Minimum time between alerts
  grouping?: string[]; // Labels to group alerts by
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  summary: string;
  description: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  value: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  generatorURL?: string;
  fingerprint: string;
}

export interface HealthCheck {
  id: string;
  name: string;
  description: string;
  type: 'http' | 'tcp' | 'custom' | 'database' | 'redis' | 'filesystem';
  endpoint?: string;
  port?: number;
  timeout: number;
  interval: number;
  enabled: boolean;
  critical: boolean;
  labels: Record<string, string>;
  config: Record<string, any>;
}

export interface HealthCheckResult {
  checkId: string;
  status: HealthStatus;
  message: string;
  responseTime?: number;
  error?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall: HealthStatus;
  services: Record<string, HealthStatus>;
  checks: HealthCheckResult[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  component: string;
  operation?: string;
  repository?: string;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
  tags: string[];
}

export interface TraceSpan {
  id: string;
  traceId: string;
  parentId?: string;
  name: string;
  kind: 'client' | 'server' | 'producer' | 'consumer' | 'internal';
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'ok' | 'error';
  attributes: Record<string, any>;
  events: TraceEvent[];
  links: TraceLink[];
}

export interface TraceEvent {
  name: string;
  timestamp: Date;
  attributes: Record<string, any>;
}

export interface TraceLink {
  traceId: string;
  spanId: string;
  traceState?: string;
  attributes: Record<string, any>;
}

export interface Trace {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  spans: TraceSpan[];
  rootSpan: TraceSpan;
  status: 'ok' | 'error';
  attributes: Record<string, any>;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    collectInterval: number;
    retention: string;
    exporters: MetricExporter[];
  };
  alerts: {
    enabled: boolean;
    rules: AlertRule[];
    evaluationInterval: number;
    resolveTimeout: string;
  };
  healthChecks: {
    enabled: boolean;
    checks: HealthCheck[];
    globalTimeout: number;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    outputs: LogOutput[];
    retention: string;
  };
  tracing: {
    enabled: boolean;
    sampleRate: number;
    exporters: TraceExporter[];
    retention: string;
  };
  dashboards: {
    enabled: boolean;
    refreshInterval: number;
    panels: DashboardPanel[];
  };
}

export interface MetricExporter {
  type: 'prometheus' | 'datadog' | 'newrelic' | 'cloudwatch' | 'custom';
  endpoint?: string;
  apiKey?: string;
  interval: number;
  labels: Record<string, string>;
  config: Record<string, any>;
}

export interface TraceExporter {
  type: 'jaeger' | 'zipkin' | 'datadog' | 'otlp' | 'custom';
  endpoint: string;
  headers?: Record<string, string>;
  config: Record<string, any>;
}

export interface LogOutput {
  type: 'console' | 'file' | 'elasticsearch' | 'loki' | 'datadog' | 'custom';
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destination?: string;
  config: Record<string, any>;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap' | 'gauge';
  query: string;
  width: number;
  height: number;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface MonitoringMetrics {
  metrics_collected: number;
  alerts_active: number;
  alerts_resolved: number;
  health_checks_total: number;
  health_checks_healthy: number;
  health_checks_degraded: number;
  health_checks_unhealthy: number;
  logs_processed: number;
  traces_collected: number;
  errors_logged: number;
  avg_response_time: number;
  uptime_percentage: number;
  collection_timestamp: Date;
}

export interface PerformanceProfile {
  id: string;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  samples: PerformanceSample[];
  flameGraph?: FlameGraphNode;
  bottlenecks: Bottleneck[];
  recommendations: string[];
}

export interface PerformanceSample {
  timestamp: Date;
  metric: string;
  value: number;
  labels: Record<string, string>;
  stackTrace?: string;
}

export interface FlameGraphNode {
  name: string;
  value: number;
  children: FlameGraphNode[];
  percentage: number;
}

export interface Bottleneck {
  type: 'cpu' | 'memory' | 'io' | 'network' | 'lock' | 'gc';
  location: string;
  impact: number;
  description: string;
  recommendation: string;
}

export interface ResourceUsage {
  timestamp: Date;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    available: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    available: number;
    percentage: number;
    readBytes: number;
    writeBytes: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
    errors: number;
    dropped: number;
  };
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  release: string;
  version: string;
  uptime: number;
  loadAverage: number[];
  totalMemory: number;
  freeMemory: number;
  cpus: number;
  nodeVersion: string;
  processId: number;
  processUptime: number;
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  queries: {
    total: number;
    slow: number;
    failed: number;
    avgDuration: number;
  };
  pool: {
    size: number;
    min: number;
    max: number;
    idleTimeout: number;
  };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
  memoryUsage: number;
  connectedClients: number;
  uptime: number;
}

export interface QueueMetrics {
  name: string;
  jobs: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  throughput: {
    jobsPerSecond: number;
    avgProcessingTime: number;
    maxProcessingTime: number;
  };
  workers: number;
}

export interface SecurityMetrics {
  scans: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
  };
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  compliance: Record<string, {
    status: 'passed' | 'failed' | 'unknown';
    score: number;
    lastCheck: Date;
  }>;
}

export interface NotificationMetrics {
  sent: number;
  failed: number;
  pending: number;
  avgDeliveryTime: number;
  successRate: number;
  byChannel: Record<string, {
    sent: number;
    failed: number;
    avgDeliveryTime: number;
  }>;
}

export interface BusinessMetrics {
  repositories_monitored: number;
  automations_created: number;
  automations_successful: number;
  prs_created: number;
  prs_merged: number;
  security_issues_found: number;
  security_issues_resolved: number;
  user_engagement: number;
  avg_processing_time: number;
  customer_satisfaction?: number;
}