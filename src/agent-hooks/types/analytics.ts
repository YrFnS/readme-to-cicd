import { RepositoryInfo } from './index';
import { MetricValue, TimeSeriesData } from './monitoring';
import { NotificationChannel } from './notifications';

export enum AnalyticsTimeframe {
  LAST_HOUR = '1h',
  LAST_6_HOURS = '6h',
  LAST_24_HOURS = '24h',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_90_DAYS = '90d',
  CUSTOM = 'custom'
}

export enum AnalyticsGranularity {
  MINUTE = '1m',
  HOUR = '1h',
  DAY = '1d',
  WEEK = '1w'
}

export enum PerformanceMetricType {
  RESPONSE_TIME = 'response_time',
  THROUGHPUT = 'throughput',
  ERROR_RATE = 'error_rate',
  RESOURCE_USAGE = 'resource_usage',
  COST_IMPACT = 'cost_impact',
  SUCCESS_RATE = 'success_rate'
}

export enum ReportType {
  PERFORMANCE_SUMMARY = 'performance_summary',
  COST_ANALYSIS = 'cost_analysis',
  EFFICIENCY_REPORT = 'efficiency_report',
  BOTTLENECK_ANALYSIS = 'bottleneck_analysis',
  TREND_ANALYSIS = 'trend_analysis',
  CUSTOM_REPORT = 'custom_report'
}

export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  JSON = 'json',
  CSV = 'csv',
  MARKDOWN = 'markdown'
}

export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ON_DEMAND = 'on_demand'
}

export interface PerformanceAnalysis {
  id: string;
  name: string;
  description?: string;
  repository: RepositoryInfo;
  timeframe: AnalyticsTimeframe;
  granularity: AnalyticsGranularity;
  startDate: Date;
  endDate: Date;
  metrics: PerformanceMetric[];
  insights: PerformanceInsight[];
  recommendations: PerformanceRecommendation[];
  benchmarks: PerformanceBenchmark[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  type: PerformanceMetricType;
  value: number;
  unit: string;
  trend: 'improving' | 'degrading' | 'stable';
  trendPercentage: number;
  baseline?: number;
  target?: number;
  data: TimeSeriesData;
  metadata?: Record<string, any>;
}

export interface PerformanceInsight {
  id: string;
  type: 'optimization' | 'anomaly' | 'trend' | 'correlation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  data: Record<string, any>;
  createdAt: Date;
}

export interface PerformanceRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'infrastructure' | 'code' | 'configuration' | 'process';
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: number; // Expected improvement percentage
  implementation: string[];
  risks?: string[];
  prerequisites?: string[];
  createdAt: Date;
}

export interface PerformanceBenchmark {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  benchmarkSource: string;
  percentile?: number;
  comparison: 'above' | 'below' | 'equal';
  difference: number;
  differencePercentage: number;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: ReportType;
  description?: string;
  repository?: RepositoryInfo;
  timeframe: AnalyticsTimeframe;
  customStartDate?: Date;
  customEndDate?: Date;
  format: ReportFormat;
  sections: ReportSection[];
  generatedAt: Date;
  generatedBy?: string;
  metadata?: Record<string, any>;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'metrics' | 'charts' | 'table' | 'text' | 'insights';
  content: any;
  order: number;
  config?: Record<string, any>;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  sections: ReportSectionTemplate[];
  defaultFormat: ReportFormat;
  schedule?: ReportSchedule;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSectionTemplate {
  id: string;
  title: string;
  type: 'metrics' | 'charts' | 'table' | 'text' | 'insights';
  description?: string;
  config: Record<string, any>;
  required: boolean;
  order: number;
}

export interface ReportSchedule {
  frequency: ReportFrequency;
  time: string; // HH:MM format
  timezone: string;
  recipients: string[];
  channels: NotificationChannel[];
  conditions?: ReportCondition[];
}

export interface ReportCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'regex';
  value: any;
  negate?: boolean;
}

export interface DashboardDefinition {
  id: string;
  name: string;
  description?: string;
  repository?: RepositoryInfo;
  panels: DashboardPanel[];
  layout: DashboardLayout;
  refreshInterval: number;
  timeRange: AnalyticsTimeframe;
  filters: DashboardFilter[];
  permissions: DashboardPermission[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap' | 'table' | 'stat';
  query: AnalyticsQuery;
  width: number;
  height: number;
  position: { x: number; y: number };
  config: Record<string, any>;
  refreshInterval?: number;
}

export interface DashboardLayout {
  type: 'grid' | 'masonry' | 'flex';
  columns: number;
  gap: number;
  responsive: boolean;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'range' | 'date';
  field: string;
  defaultValue?: any;
  options?: any[];
  required: boolean;
}

export interface DashboardPermission {
  userId?: string;
  teamId?: string;
  role?: string;
  permission: 'view' | 'edit' | 'admin';
}

export interface AnalyticsQuery {
  metrics: string[];
  dimensions: string[];
  filters: QueryFilter[];
  aggregations: QueryAggregation[];
  timeRange: {
    from: string;
    to: string;
  };
  granularity: AnalyticsGranularity;
  limit?: number;
  orderBy?: QueryOrder[];
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

export interface QueryAggregation {
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct' | 'percentile';
  field: string;
  alias?: string;
  percentile?: number;
}

export interface QueryOrder {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PerformanceProfile {
  id: string;
  name: string;
  description?: string;
  repository: RepositoryInfo;
  startTime: Date;
  endTime: Date;
  duration: number;
  samples: PerformanceSample[];
  flameGraph?: FlameGraphNode;
  hotspots: PerformanceHotspot[];
  bottlenecks: PerformanceBottleneck[];
  recommendations: PerformanceRecommendation[];
  metadata?: Record<string, any>;
}

export interface PerformanceSample {
  timestamp: Date;
  operation: string;
  duration: number;
  cpuTime?: number;
  memoryUsage?: number;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export interface FlameGraphNode {
  name: string;
  value: number;
  children: FlameGraphNode[];
  percentage: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceHotspot {
  operation: string;
  totalTime: number;
  averageTime: number;
  callCount: number;
  percentage: number;
  stackTrace?: string;
}

export interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'io' | 'network' | 'lock' | 'gc';
  location: string;
  impact: number;
  description: string;
  evidence: string[];
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AnalyticsConfig {
  enabled: boolean;
  dataRetention: {
    raw: string; // e.g., '30d'
    aggregated: string; // e.g., '1y'
    reports: string; // e.g., '2y'
  };
  processing: {
    batchSize: number;
    interval: number;
    workers: number;
  };
  reporting: {
    maxReportSize: number;
    defaultFormat: ReportFormat;
    emailConfig?: EmailConfig;
  };
  dashboards: {
    maxPanels: number;
    defaultRefreshInterval: number;
  };
}

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  templates: Record<string, string>;
}

export interface AnalyticsMetrics {
  reports_generated: number;
  reports_sent: number;
  reports_failed: number;
  dashboards_created: number;
  dashboards_viewed: number;
  queries_executed: number;
  avg_query_time: number;
  data_points_processed: number;
  storage_used: number;
  alerts_generated: number;
  insights_discovered: number;
  recommendations_applied: number;
  collection_timestamp: Date;
}

export interface ComparativeAnalysis {
  id: string;
  name: string;
  description?: string;
  baseline: {
    period: string;
    metrics: Record<string, number>;
  };
  comparison: {
    period: string;
    metrics: Record<string, number>;
  };
  differences: ComparativeDifference[];
  insights: string[];
  recommendations: PerformanceRecommendation[];
  createdAt: Date;
}

export interface ComparativeDifference {
  metric: string;
  baselineValue: number;
  comparisonValue: number;
  difference: number;
  differencePercentage: number;
  significance: 'low' | 'medium' | 'high';
  trend: 'improving' | 'degrading' | 'stable';
}

export interface PredictiveAnalytics {
  id: string;
  name: string;
  description?: string;
  targetMetric: string;
  algorithm: 'linear' | 'exponential' | 'polynomial' | 'arima';
  forecastHorizon: number; // days
  confidenceInterval: number; // 0-1
  predictions: PredictionPoint[];
  accuracy: number; // 0-1
  createdAt: Date;
}

export interface PredictionPoint {
  date: Date;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface AnomalyDetection {
  id: string;
  name: string;
  description?: string;
  metric: string;
  algorithm: 'zscore' | 'iqr' | 'isolation_forest' | 'autoencoder';
  threshold: number;
  window: string; // e.g., '1h', '24h'
  anomalies: Anomaly[];
  sensitivity: 'low' | 'medium' | 'high';
  enabled: boolean;
  createdAt: Date;
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  context: Record<string, any>;
}

export interface CostAnalysis {
  id: string;
  name: string;
  description?: string;
  repository: RepositoryInfo;
  timeframe: AnalyticsTimeframe;
  breakdown: CostBreakdown[];
  totalCost: number;
  costPerDeployment: number;
  costPerPR: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  costTrendPercentage: number;
  optimizationOpportunities: CostOptimization[];
  createdAt: Date;
}

export interface CostBreakdown {
  category: 'compute' | 'storage' | 'network' | 'security' | 'monitoring' | 'other';
  cost: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  details: Record<string, any>;
}

export interface CostOptimization {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  prerequisites: string[];
  risks: string[];
}