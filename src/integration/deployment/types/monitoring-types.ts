/**
 * Container monitoring types and interfaces
 */

export interface ContainerMonitoringSystem {
  startMonitoring(containerId: string, config: MonitoringConfig): Promise<void>;
  stopMonitoring(containerId: string): Promise<void>;
  getMetrics(containerId: string, timeRange?: TimeRange): Promise<ContainerMetrics>;
  getResourceUsage(containerId: string): Promise<ResourceUsage>;
  getPerformanceMetrics(containerId: string): Promise<PerformanceMetrics>;
  setAlerts(containerId: string, alerts: AlertRule[]): Promise<void>;
  getAlerts(containerId: string): Promise<Alert[]>;
  exportMetrics(format: 'prometheus' | 'json' | 'csv'): Promise<string>;
}

export interface MonitoringConfig {
  interval: number; // seconds
  metrics: MetricType[];
  alerts: AlertRule[];
  retention: RetentionPolicy;
  exporters: ExporterConfig[];
  dashboards?: DashboardConfig[];
}

export type MetricType = 
  | 'cpu'
  | 'memory'
  | 'network'
  | 'disk'
  | 'filesystem'
  | 'process'
  | 'container'
  | 'application'
  | 'custom';

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  duration: number; // seconds
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  actions: AlertAction[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface AlertCondition {
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  window?: number; // seconds
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'pagerduty' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  rule: AlertRule;
  status: 'firing' | 'resolved' | 'pending';
  value: number;
  timestamp: Date;
  startsAt: Date;
  endsAt?: Date;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  generatorURL?: string;
}

export interface RetentionPolicy {
  duration: string; // e.g., "7d", "30d", "1y"
  resolution: string; // e.g., "1s", "1m", "1h"
  downsampling?: DownsamplingRule[];
}

export interface DownsamplingRule {
  resolution: string;
  retention: string;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface ExporterConfig {
  type: 'prometheus' | 'influxdb' | 'elasticsearch' | 'datadog' | 'newrelic';
  endpoint: string;
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
  };
  config?: Record<string, any>;
  enabled: boolean;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  panels: DashboardPanel[];
  timeRange: TimeRange;
  refreshInterval: number; // seconds
  variables?: DashboardVariable[];
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'singlestat' | 'table' | 'heatmap' | 'gauge' | 'bar';
  queries: MetricQuery[];
  visualization: VisualizationConfig;
  position: PanelPosition;
}

export interface MetricQuery {
  metric: string;
  filters?: Record<string, string>;
  aggregation?: string;
  groupBy?: string[];
  timeRange?: TimeRange;
}

export interface VisualizationConfig {
  legend?: boolean;
  tooltip?: boolean;
  yAxis?: AxisConfig;
  xAxis?: AxisConfig;
  colors?: string[];
  thresholds?: ThresholdConfig[];
}

export interface AxisConfig {
  label?: string;
  min?: number;
  max?: number;
  unit?: string;
  scale?: 'linear' | 'log';
}

export interface ThresholdConfig {
  value: number;
  color: string;
  operator: '>' | '<' | '>=' | '<=';
}

export interface PanelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardVariable {
  name: string;
  type: 'query' | 'constant' | 'custom' | 'interval';
  query?: string;
  values?: string[];
  defaultValue?: string;
  multiValue?: boolean;
}

export interface TimeRange {
  from: Date | string;
  to: Date | string;
}

export interface ContainerMetrics {
  containerId: string;
  containerName: string;
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  network: NetworkMetrics;
  disk: DiskMetrics;
  filesystem: FilesystemMetrics;
  process: ProcessMetrics;
  application?: ApplicationMetrics;
  custom?: Record<string, MetricValue>;
}

export interface CPUMetrics {
  usage: MetricValue; // percentage
  usageNanoCores: MetricValue; // nanocores
  throttledTime: MetricValue; // nanoseconds
  systemUsage: MetricValue; // percentage
  userUsage: MetricValue; // percentage
  loadAverage?: {
    load1: number;
    load5: number;
    load15: number;
  };
  coreCount: number;
}

export interface MemoryMetrics {
  usage: MetricValue; // bytes
  workingSet: MetricValue; // bytes
  rss: MetricValue; // bytes
  cache: MetricValue; // bytes
  swap?: MetricValue; // bytes
  limit: number; // bytes
  utilization: MetricValue; // percentage
  pageFaults: MetricValue; // count
  majorPageFaults: MetricValue; // count
}

export interface NetworkMetrics {
  interfaces: Record<string, NetworkInterfaceMetrics>;
  totalRxBytes: MetricValue;
  totalTxBytes: MetricValue;
  totalRxPackets: MetricValue;
  totalTxPackets: MetricValue;
  totalRxErrors: MetricValue;
  totalTxErrors: MetricValue;
  totalRxDropped: MetricValue;
  totalTxDropped: MetricValue;
}

export interface NetworkInterfaceMetrics {
  name: string;
  rxBytes: MetricValue;
  txBytes: MetricValue;
  rxPackets: MetricValue;
  txPackets: MetricValue;
  rxErrors: MetricValue;
  txErrors: MetricValue;
  rxDropped: MetricValue;
  txDropped: MetricValue;
  mtu: number;
  speed?: number; // Mbps
}

export interface DiskMetrics {
  devices: Record<string, DiskDeviceMetrics>;
  totalReadBytes: MetricValue;
  totalWriteBytes: MetricValue;
  totalReadOps: MetricValue;
  totalWriteOps: MetricValue;
  totalReadTime: MetricValue; // milliseconds
  totalWriteTime: MetricValue; // milliseconds
}

export interface DiskDeviceMetrics {
  device: string;
  readBytes: MetricValue;
  writeBytes: MetricValue;
  readOps: MetricValue;
  writeOps: MetricValue;
  readTime: MetricValue; // milliseconds
  writeTime: MetricValue; // milliseconds
  ioTime: MetricValue; // milliseconds
  weightedIOTime: MetricValue; // milliseconds
  queueDepth: MetricValue;
}

export interface FilesystemMetrics {
  filesystems: Record<string, FilesystemDeviceMetrics>;
  totalCapacity: number; // bytes
  totalUsed: number; // bytes
  totalAvailable: number; // bytes
  totalUtilization: number; // percentage
}

export interface FilesystemDeviceMetrics {
  device: string;
  mountpoint: string;
  fstype: string;
  capacity: number; // bytes
  used: number; // bytes
  available: number; // bytes
  utilization: number; // percentage
  inodes: {
    total: number;
    used: number;
    free: number;
    utilization: number; // percentage
  };
}

export interface ProcessMetrics {
  processCount: number;
  threadCount: number;
  fileDescriptorCount: number;
  fileDescriptorLimit: number;
  processes: ProcessInfo[];
}

export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  cmdline: string[];
  status: string;
  cpuUsage: number; // percentage
  memoryUsage: number; // bytes
  memoryPercent: number; // percentage
  createTime: Date;
  numThreads: number;
  numFds: number;
}

export interface ApplicationMetrics {
  httpRequests?: HTTPMetrics;
  database?: DatabaseMetrics;
  cache?: CacheMetrics;
  queue?: QueueMetrics;
  custom?: Record<string, MetricValue>;
}

export interface HTTPMetrics {
  requestsTotal: MetricValue;
  requestsPerSecond: MetricValue;
  requestDuration: LatencyMetrics;
  requestSize: MetricValue;
  responseSize: MetricValue;
  statusCodes: Record<string, MetricValue>;
  errorRate: MetricValue;
  activeConnections: MetricValue;
}

export interface DatabaseMetrics {
  connections: {
    active: MetricValue;
    idle: MetricValue;
    total: MetricValue;
    maxConnections: number;
  };
  queries: {
    total: MetricValue;
    perSecond: MetricValue;
    duration: LatencyMetrics;
    slowQueries: MetricValue;
  };
  transactions: {
    total: MetricValue;
    perSecond: MetricValue;
    duration: LatencyMetrics;
    rollbacks: MetricValue;
  };
  locks: {
    waiting: MetricValue;
    acquired: MetricValue;
    deadlocks: MetricValue;
  };
}

export interface CacheMetrics {
  hits: MetricValue;
  misses: MetricValue;
  hitRate: MetricValue;
  evictions: MetricValue;
  size: MetricValue;
  maxSize: number;
  utilization: MetricValue;
  operations: {
    gets: MetricValue;
    sets: MetricValue;
    deletes: MetricValue;
    duration: LatencyMetrics;
  };
}

export interface QueueMetrics {
  messages: {
    enqueued: MetricValue;
    dequeued: MetricValue;
    pending: MetricValue;
    failed: MetricValue;
    retries: MetricValue;
  };
  consumers: {
    active: MetricValue;
    idle: MetricValue;
    total: MetricValue;
  };
  processing: {
    duration: LatencyMetrics;
    throughput: MetricValue;
  };
  size: MetricValue;
  maxSize?: number;
}

export interface MetricValue {
  current: number;
  average?: number;
  min?: number;
  max?: number;
  sum?: number;
  count?: number;
  rate?: number; // per second
  unit: string;
  timestamp: Date;
}

export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  p999?: number;
  mean: number;
  max: number;
  min: number;
  stddev?: number;
  unit: string;
}

export interface ResourceUsage {
  containerId: string;
  timestamp: Date;
  cpu: {
    usage: number; // percentage
    limit: number; // percentage
    request: number; // percentage
    throttled: boolean;
  };
  memory: {
    usage: number; // bytes
    limit: number; // bytes
    request: number; // bytes
    utilization: number; // percentage
    oomKilled: boolean;
  };
  network: {
    rxBytesPerSecond: number;
    txBytesPerSecond: number;
    rxPacketsPerSecond: number;
    txPacketsPerSecond: number;
    errors: number;
  };
  disk: {
    readBytesPerSecond: number;
    writeBytesPerSecond: number;
    readOpsPerSecond: number;
    writeOpsPerSecond: number;
    utilization: number; // percentage
  };
  filesystem: {
    usage: number; // bytes
    capacity: number; // bytes
    utilization: number; // percentage
    inodeUtilization: number; // percentage
  };
}

export interface PerformanceMetrics {
  containerId: string;
  timestamp: Date;
  availability: {
    uptime: number; // seconds
    downtime: number; // seconds
    uptimePercentage: number;
  };
  reliability: {
    restarts: number;
    crashes: number;
    oomKills: number;
    healthCheckFailures: number;
    mtbf: number; // mean time between failures (seconds)
    mttr: number; // mean time to recovery (seconds)
  };
  performance: {
    responseTime: LatencyMetrics;
    throughput: number; // requests per second
    errorRate: number; // percentage
    saturation: {
      cpu: number; // percentage
      memory: number; // percentage
      disk: number; // percentage
      network: number; // percentage
    };
  };
  scalability: {
    currentReplicas: number;
    desiredReplicas: number;
    maxReplicas: number;
    scalingEvents: number;
    scalingLatency: number; // seconds
  };
  efficiency: {
    resourceUtilization: {
      cpu: number; // percentage
      memory: number; // percentage
      disk: number; // percentage
      network: number; // percentage
    };
    costPerRequest?: number;
    energyEfficiency?: number; // requests per watt
  };
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description?: string;
  containerId?: string;
  namespace?: string;
  labels?: Record<string, string>;
  panels: MonitoringPanel[];
  layout: DashboardLayout;
  timeRange: TimeRange;
  refreshInterval: number; // seconds
  variables: DashboardVariable[];
  alerts: AlertRule[];
}

export interface MonitoringPanel {
  id: string;
  title: string;
  description?: string;
  type: PanelType;
  queries: PanelQuery[];
  visualization: PanelVisualization;
  alerts?: PanelAlert[];
  position: PanelPosition;
}

export type PanelType = 
  | 'timeseries'
  | 'gauge'
  | 'stat'
  | 'table'
  | 'heatmap'
  | 'histogram'
  | 'pie'
  | 'bar'
  | 'text'
  | 'logs';

export interface PanelQuery {
  id: string;
  metric: string;
  labels?: Record<string, string>;
  aggregation?: string;
  functions?: QueryFunction[];
  timeRange?: TimeRange;
  step?: string; // e.g., "1m", "5m"
}

export interface QueryFunction {
  name: string;
  parameters?: any[];
}

export interface PanelVisualization {
  displayMode?: 'single' | 'list' | 'table';
  colorMode?: 'palette' | 'value' | 'auto';
  colors?: string[];
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;
  thresholds?: VisualizationThreshold[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  axes?: AxesConfig;
}

export interface VisualizationThreshold {
  value: number;
  color: string;
  state?: 'normal' | 'warning' | 'critical';
}

export interface LegendConfig {
  show: boolean;
  position: 'bottom' | 'right' | 'top' | 'left';
  values?: string[];
  sortBy?: string;
  sortDesc?: boolean;
}

export interface TooltipConfig {
  mode: 'single' | 'multi' | 'none';
  sort: 'none' | 'asc' | 'desc';
}

export interface AxesConfig {
  left?: AxisConfig;
  right?: AxisConfig;
  bottom?: AxisConfig;
}

export interface PanelAlert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  evaluateEvery: string; // e.g., "1m"
  for: string; // e.g., "5m"
  noDataState: 'no_data' | 'alerting' | 'ok';
  executionErrorState: 'alerting' | 'ok';
  notifications?: string[];
}

export interface DashboardLayout {
  type: 'grid' | 'flow';
  gridSize?: {
    width: number;
    height: number;
  };
}

export interface MonitoringReport {
  id: string;
  name: string;
  description?: string;
  containerId?: string;
  namespace?: string;
  timeRange: TimeRange;
  generatedAt: Date;
  sections: ReportSection[];
  summary: ReportSummary;
  recommendations?: Recommendation[];
}

export interface ReportSection {
  id: string;
  title: string;
  description?: string;
  type: 'metrics' | 'alerts' | 'events' | 'analysis' | 'custom';
  content: any;
  charts?: ChartConfig[];
}

export interface ReportSummary {
  totalContainers: number;
  healthyContainers: number;
  unhealthyContainers: number;
  totalAlerts: number;
  criticalAlerts: number;
  averageResourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  topResourceConsumers: ResourceConsumer[];
  performanceScore: number; // 0-100
}

export interface ResourceConsumer {
  containerId: string;
  containerName: string;
  resourceType: 'cpu' | 'memory' | 'disk' | 'network';
  usage: number;
  unit: string;
  percentage: number;
}

export interface Recommendation {
  id: string;
  type: 'performance' | 'cost' | 'security' | 'reliability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  actions: RecommendationAction[];
  metrics?: Record<string, number>;
}

export interface RecommendationAction {
  id: string;
  description: string;
  type: 'manual' | 'automated';
  command?: string;
  parameters?: Record<string, any>;
  estimatedImpact?: string;
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: ChartData;
  options?: ChartOptions;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  scales?: {
    x?: AxisOptions;
    y?: AxisOptions;
  };
  plugins?: {
    legend?: LegendOptions;
    tooltip?: TooltipOptions;
  };
}

export interface AxisOptions {
  display?: boolean;
  title?: {
    display: boolean;
    text: string;
  };
  min?: number;
  max?: number;
  type?: 'linear' | 'logarithmic' | 'category' | 'time';
}

export interface LegendOptions {
  display?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TooltipOptions {
  enabled?: boolean;
  mode?: 'point' | 'nearest' | 'index' | 'dataset';
  intersect?: boolean;
}