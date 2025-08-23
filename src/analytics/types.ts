/**
 * Analytics and Reporting System Types
 * Comprehensive type definitions for analytics, reporting, and business intelligence
 */

export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  type: AnalyticsEventType;
  source: string;
  userId?: string;
  sessionId?: string;
  data: Record<string, any>;
  metadata?: EventMetadata;
}

export type AnalyticsEventType = 
  | 'user_action'
  | 'system_event' 
  | 'performance_metric'
  | 'error_event'
  | 'business_metric'
  | 'compliance_event'
  | 'cost_event';

export interface EventMetadata {
  environment: 'development' | 'staging' | 'production';
  version: string;
  component: string;
  traceId?: string;
  correlationId?: string;
}

export interface UsageAnalytics {
  userInteractions: UserInteractionMetrics;
  featureUsage: FeatureUsageMetrics;
  systemAdoption: SystemAdoptionMetrics;
  sessionAnalytics: SessionAnalytics;
}

export interface UserInteractionMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  userRetention: RetentionMetrics;
  userEngagement: EngagementMetrics;
}

export interface FeatureUsageMetrics {
  featureAdoption: Record<string, number>;
  featureUsageFrequency: Record<string, number>;
  featurePerformance: Record<string, PerformanceMetrics>;
  featureErrors: Record<string, ErrorMetrics>;
}

export interface SystemAdoptionMetrics {
  totalInstallations: number;
  activeInstallations: number;
  adoptionRate: number;
  churnRate: number;
  growthRate: number;
}

export interface SessionAnalytics {
  averageSessionDuration: number;
  sessionCount: number;
  bounceRate: number;
  pagesPerSession: number;
  conversionRate: number;
}

export interface PerformanceAnalytics {
  responseTime: ResponseTimeMetrics;
  throughput: ThroughputMetrics;
  resourceUsage: ResourceUsageMetrics;
  errorRates: ErrorRateMetrics;
  availability: AvailabilityMetrics;
}

export interface ResponseTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  peakThroughput: number;
}

export interface ResourceUsageMetrics {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  disk: ResourceMetric;
  network: NetworkMetrics;
}

export interface ResourceMetric {
  current: number;
  average: number;
  peak: number;
  utilization: number;
}

export interface NetworkMetrics {
  inbound: number;
  outbound: number;
  latency: number;
  packetLoss: number;
}

export interface BusinessAnalytics {
  conversionRates: ConversionMetrics;
  userSatisfaction: SatisfactionMetrics;
  systemROI: ROIMetrics;
  businessImpact: ImpactMetrics;
}

export interface ConversionMetrics {
  signupConversion: number;
  activationConversion: number;
  retentionConversion: number;
  revenueConversion: number;
}

export interface SatisfactionMetrics {
  npsScore: number;
  csatScore: number;
  userFeedback: FeedbackMetrics;
  supportTickets: SupportMetrics;
}

export interface ROIMetrics {
  costSavings: number;
  timeReduction: number;
  productivityGain: number;
  errorReduction: number;
}

export interface CostAnalytics {
  resourceCosts: ResourceCostMetrics;
  operationalCosts: OperationalCostMetrics;
  optimizationRecommendations: OptimizationRecommendation[];
  costTrends: CostTrendMetrics;
}

export interface ResourceCostMetrics {
  compute: CostMetric;
  storage: CostMetric;
  network: CostMetric;
  services: Record<string, CostMetric>;
}

export interface CostMetric {
  current: number;
  projected: number;
  budget: number;
  variance: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface OptimizationRecommendation {
  id: string;
  type: 'cost' | 'performance' | 'resource';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  potentialSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  impact: string;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  status: ComplianceStatus;
  score: number;
  violations: ComplianceViolation[];
  recommendations: ComplianceRecommendation[];
  auditTrail: AuditEvent[];
}

export interface ComplianceFramework {
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
  controls: ComplianceControl[];
}

export interface ComplianceViolation {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requirement: string;
  description: string;
  remediation: string;
  dueDate?: Date;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  details: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  permissions: DashboardPermissions;
  refreshInterval: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: string;
  configuration: WidgetConfiguration;
  position: WidgetPosition;
}

export type WidgetType = 
  | 'chart'
  | 'table'
  | 'metric'
  | 'gauge'
  | 'heatmap'
  | 'timeline'
  | 'alert';

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  schedule?: ReportSchedule;
  recipients: string[];
  data: any;
  generatedAt: Date;
}

export type ReportType = 
  | 'usage'
  | 'performance'
  | 'cost'
  | 'compliance'
  | 'business'
  | 'custom';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html';

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string;
  timezone: string;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  actions: AlertAction[];
  enabled: boolean;
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration: number;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  configuration: Record<string, any>;
}

// Additional supporting types
export interface RetentionMetrics {
  day1: number;
  day7: number;
  day30: number;
  day90: number;
}

export interface EngagementMetrics {
  averageSessionsPerUser: number;
  averageActionsPerSession: number;
  timeSpentPerFeature: Record<string, number>;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
}

export interface ErrorMetrics {
  count: number;
  rate: number;
  types: Record<string, number>;
}

export interface ErrorRateMetrics {
  overall: number;
  byComponent: Record<string, number>;
  byEndpoint: Record<string, number>;
}

export interface AvailabilityMetrics {
  uptime: number;
  downtime: number;
  sla: number;
  incidents: number;
}

export interface FeedbackMetrics {
  averageRating: number;
  totalFeedback: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface SupportMetrics {
  totalTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
  satisfaction: number;
}

export interface ImpactMetrics {
  timeToValue: number;
  productivityIncrease: number;
  errorReduction: number;
  costReduction: number;
}

export interface OperationalCostMetrics {
  personnel: CostMetric;
  infrastructure: CostMetric;
  licensing: CostMetric;
  maintenance: CostMetric;
}

export interface CostTrendMetrics {
  daily: number[];
  weekly: number[];
  monthly: number[];
  yearly: number[];
}

export interface ComplianceStatus {
  compliant: boolean;
  score: number;
  lastAssessment: Date;
  nextAssessment: Date;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  mandatory: boolean;
  controls: string[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  evidence: string[];
}

export interface ComplianceRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: string;
  timeline: string;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  responsive: boolean;
}

export interface DashboardPermissions {
  viewers: string[];
  editors: string[];
  owners: string[];
}

export interface WidgetConfiguration {
  query: string;
  timeRange: string;
  refreshInterval: number;
  visualization: Record<string, any>;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}