/**
 * Core monitoring system types and interfaces
 * Supports Prometheus, ELK stack, Jaeger, and intelligent alerting
 */

export interface MonitoringSystem {
  collectMetrics(source: string, metrics: Metric[]): Promise<void>
  queryMetrics(query: MetricQuery): Promise<MetricResult[]>
  createAlert(alert: AlertDefinition): Promise<string>
  sendNotification(notification: Notification): Promise<void>
  generateReport(report: ReportDefinition): Promise<Report>
}

export interface ObservabilityStack {
  metrics: MetricsCollector
  logging: LogAggregator
  tracing: DistributedTracer
  alerting: AlertManager
  dashboards: DashboardManager
}

// Metrics Types
export interface Metric {
  name: string
  value: number
  timestamp: Date
  labels: Record<string, string>
  type: MetricType
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'

export interface MetricQuery {
  metric: string
  timeRange: TimeRange
  filters?: Record<string, string>
  aggregation?: AggregationType
}

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'rate'

export interface MetricResult {
  metric: string
  values: MetricValue[]
  labels: Record<string, string>
}

export interface MetricValue {
  timestamp: Date
  value: number
}

// Logging Types
export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  component: string
  traceId?: string
  spanId?: string
  metadata: Record<string, any>
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'

export interface LogQuery {
  timeRange: TimeRange
  level?: LogLevel
  component?: string
  traceId?: string
  query?: string
}

// Tracing Types
export interface Trace {
  traceId: string
  spans: Span[]
  duration: number
  startTime: Date
  endTime: Date
}

export interface Span {
  spanId: string
  parentSpanId?: string
  operationName: string
  startTime: Date
  endTime: Date
  duration: number
  tags: Record<string, any>
  logs: SpanLog[]
}

export interface SpanLog {
  timestamp: Date
  fields: Record<string, any>
}

// Alerting Types
export interface AlertDefinition {
  id?: string
  name: string
  description: string
  condition: AlertCondition
  severity: AlertSeverity
  routing: AlertRouting
  escalation: EscalationPolicy
  enabled: boolean
}

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface AlertCondition {
  metric: string
  operator: ComparisonOperator
  threshold: number
  duration: number
  evaluationInterval: number
}

export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne'

export interface AlertRouting {
  channels: NotificationChannel[]
  conditions?: RoutingCondition[]
}

export interface RoutingCondition {
  field: string
  operator: ComparisonOperator
  value: any
  channels: NotificationChannel[]
}

export interface EscalationPolicy {
  levels: EscalationLevel[]
  timeout: number
}

export interface EscalationLevel {
  level: number
  delay: number
  channels: NotificationChannel[]
  conditions?: EscalationCondition[]
}

export interface EscalationCondition {
  field: string
  operator: ComparisonOperator
  value: any
}

// Notification Types
export interface Notification {
  id?: string
  type: NotificationType
  severity: AlertSeverity
  title: string
  message: string
  metadata: Record<string, any>
  channels: NotificationChannel[]
  timestamp: Date
}

export type NotificationType = 'alert' | 'warning' | 'info' | 'recovery'

export interface NotificationChannel {
  type: ChannelType
  config: ChannelConfig
  enabled: boolean
}

export type ChannelType = 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty'

export interface ChannelConfig {
  [key: string]: any
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  responseTime: number
  throughput: number
  errorRate: number
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkUsage: number
}

export interface SLADefinition {
  name: string
  description: string
  targets: SLATarget[]
  measurement: SLAMeasurement
  reporting: SLAReporting
}

export interface SLATarget {
  metric: string
  threshold: number
  operator: ComparisonOperator
  timeWindow: number
}

export interface SLAMeasurement {
  interval: number
  aggregation: AggregationType
  excludeDowntime: boolean
}

export interface SLAReporting {
  frequency: ReportFrequency
  recipients: string[]
  format: ReportFormat
}

export type ReportFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly'
export type ReportFormat = 'json' | 'html' | 'pdf' | 'csv'

// Dashboard Types
export interface Dashboard {
  id: string
  name: string
  description: string
  panels: DashboardPanel[]
  timeRange: TimeRange
  refreshInterval: number
}

export interface DashboardPanel {
  id: string
  title: string
  type: PanelType
  query: MetricQuery
  visualization: VisualizationConfig
  position: PanelPosition
}

export type PanelType = 'graph' | 'table' | 'stat' | 'gauge' | 'heatmap' | 'logs'

export interface VisualizationConfig {
  [key: string]: any
}

export interface PanelPosition {
  x: number
  y: number
  width: number
  height: number
}

// Report Types
export interface ReportDefinition {
  id?: string
  name: string
  description: string
  type: ReportType
  schedule: ReportSchedule
  parameters: ReportParameters
  recipients: string[]
}

export type ReportType = 'performance' | 'sla' | 'usage' | 'security' | 'custom'

export interface ReportSchedule {
  frequency: ReportFrequency
  time?: string
  timezone?: string
  enabled: boolean
}

export interface ReportParameters {
  timeRange: TimeRange
  metrics: string[]
  filters?: Record<string, any>
  format: ReportFormat
}

export interface Report {
  id: string
  name: string
  type: ReportType
  generatedAt: Date
  timeRange: TimeRange
  data: ReportData
  format: ReportFormat
}

export interface ReportData {
  summary: ReportSummary
  metrics: MetricResult[]
  charts: ChartData[]
  tables: TableData[]
}

export interface ReportSummary {
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  uptime: number
  slaCompliance: number
}

export interface ChartData {
  title: string
  type: ChartType
  data: any[]
  config: ChartConfig
}

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter'

export interface ChartConfig {
  [key: string]: any
}

export interface TableData {
  title: string
  headers: string[]
  rows: any[][]
}

// Common Types
export interface TimeRange {
  start: Date
  end: Date
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheck[]
  lastUpdated: Date
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message?: string
  duration: number
}

// Component Interfaces
export interface MetricsCollector {
  systemMetrics: SystemMetrics
  applicationMetrics: ApplicationMetrics
  businessMetrics: BusinessMetrics
  customMetrics: CustomMetrics
}

export interface SystemMetrics {
  collectCPUUsage(): Promise<Metric>
  collectMemoryUsage(): Promise<Metric>
  collectDiskUsage(): Promise<Metric>
  collectNetworkUsage(): Promise<Metric>
}

export interface ApplicationMetrics {
  collectRequestMetrics(): Promise<Metric[]>
  collectErrorMetrics(): Promise<Metric[]>
  collectPerformanceMetrics(): Promise<Metric[]>
}

export interface BusinessMetrics {
  collectUsageMetrics(): Promise<Metric[]>
  collectConversionMetrics(): Promise<Metric[]>
  collectRevenueMetrics(): Promise<Metric[]>
}

export interface CustomMetrics {
  collectCustomMetric(name: string, config: any): Promise<Metric>
  registerCustomMetric(definition: CustomMetricDefinition): Promise<void>
}

export interface CustomMetricDefinition {
  name: string
  type: MetricType
  description: string
  labels: string[]
  collector: (config: any) => Promise<Metric>
}

export interface LogAggregator {
  collectLogs(source: string): Promise<LogEntry[]>
  queryLogs(query: LogQuery): Promise<LogEntry[]>
  indexLogs(logs: LogEntry[]): Promise<void>
  searchLogs(searchQuery: string, options?: SearchOptions): Promise<LogEntry[]>
}

export interface SearchOptions {
  timeRange?: TimeRange
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DistributedTracer {
  startTrace(operationName: string, parentContext?: any): Trace
  finishTrace(trace: Trace): Promise<void>
  createSpan(trace: Trace, operationName: string, parentSpan?: Span): Span
  finishSpan(span: Span): void
  injectContext(span: Span): any
  extractContext(carrier: any): any
}

export interface AlertManager {
  evaluateAlerts(): Promise<void>
  triggerAlert(alert: AlertDefinition, context: AlertContext): Promise<void>
  resolveAlert(alertId: string): Promise<void>
  escalateAlert(alertId: string): Promise<void>
  getActiveAlerts(): Promise<ActiveAlert[]>
}

export interface AlertContext {
  metric: string
  value: number
  threshold: number
  timestamp: Date
  metadata: Record<string, any>
}

export interface ActiveAlert {
  id: string
  definition: AlertDefinition
  context: AlertContext
  status: AlertStatus
  createdAt: Date
  updatedAt: Date
  escalationLevel: number
}

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'escalated'

export interface DashboardManager {
  createDashboard(dashboard: Dashboard): Promise<string>
  updateDashboard(id: string, dashboard: Partial<Dashboard>): Promise<void>
  deleteDashboard(id: string): Promise<void>
  getDashboard(id: string): Promise<Dashboard>
  listDashboards(): Promise<Dashboard[]>
  renderDashboard(id: string, timeRange?: TimeRange): Promise<RenderedDashboard>
}

export interface RenderedDashboard {
  dashboard: Dashboard
  panels: RenderedPanel[]
  generatedAt: Date
}

export interface RenderedPanel {
  panel: DashboardPanel
  data: any
  visualization: any
}