/**
 * Monitoring Dashboards Manager
 * 
 * Provides real-time system visibility and alerting through comprehensive
 * dashboards, metrics visualization, and intelligent monitoring.
 */

import { Logger } from '../../cli/lib/logger';
import { Result, success, failure } from '../../shared/types/result';
import { MonitoringSystem } from '../monitoring/monitoring-system';
import { ConfigurationManager } from '../configuration/configuration-manager';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  title: string;
  description: string;
  category: 'system' | 'application' | 'business' | 'security' | 'custom';
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  refreshInterval: number; // in seconds
  permissions: DashboardPermissions;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'custom';
  columns: number;
  rows: number;
  responsive: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'log' | 'status' | 'custom';
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  configuration: WidgetConfiguration;
  dataSource: DataSourceConfig;
  refreshInterval?: number;
  alertThresholds?: AlertThreshold[];
}

export interface WidgetPosition {
  x: number;
  y: number;
  z?: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetConfiguration {
  chartType?: 'line' | 'bar' | 'pie' | 'gauge' | 'heatmap' | 'scatter';
  timeRange?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  groupBy?: string[];
  filters?: Record<string, any>;
  displayOptions?: DisplayOptions;
}

export interface DisplayOptions {
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltips?: boolean;
  colorScheme?: string[];
  fontSize?: number;
  decimals?: number;
  unit?: string;
}

export interface DataSourceConfig {
  type: 'prometheus' | 'elasticsearch' | 'influxdb' | 'custom';
  connection: ConnectionConfig;
  query: string;
  parameters?: Record<string, any>;
}

export interface ConnectionConfig {
  url: string;
  authentication?: {
    type: 'basic' | 'bearer' | 'api-key';
    credentials: Record<string, string>;
  };
  timeout?: number;
  retries?: number;
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  value: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
}

export interface DashboardPermissions {
  view: string[];
  edit: string[];
  admin: string[];
  public: boolean;
}

/**
 * Real-time dashboard data
 */
export interface DashboardData {
  dashboardId: string;
  timestamp: Date;
  widgets: WidgetData[];
  alerts: ActiveAlert[];
  status: 'healthy' | 'warning' | 'error' | 'critical';
}

export interface WidgetData {
  widgetId: string;
  data: any;
  lastUpdated: Date;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

export interface ActiveAlert {
  id: string;
  widgetId: string;
  threshold: AlertThreshold;
  currentValue: number;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Monitoring dashboards manager
 */
export class MonitoringDashboardsManager {
  private logger: Logger;
  private monitoringSystem: MonitoringSystem;
  private configManager: ConfigurationManager;
  private dashboards: Map<string, DashboardConfig> = new Map();
  private dashboardData: Map<string, DashboardData> = new Map();
  private activeAlerts: Map<string, ActiveAlert> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private dashboardsPath: string;

  constructor(
    logger: Logger,
    monitoringSystem: MonitoringSystem,
    configManager: ConfigurationManager,
    dashboardsPath?: string
  ) {
    this.logger = logger;
    this.monitoringSystem = monitoringSystem;
    this.configManager = configManager;
    this.dashboardsPath = dashboardsPath || path.join(process.cwd(), 'dashboards');
  }

  /**
   * Initialize the dashboards manager
   */
  async initialize(): Promise<Result<void>> {
    try {
      this.logger.info('Initializing MonitoringDashboardsManager...');

      // Ensure dashboards directory exists
      await fs.mkdir(this.dashboardsPath, { recursive: true });

      // Load existing dashboards
      await this.loadDashboards();

      // Initialize default dashboards if none exist
      if (this.dashboards.size === 0) {
        await this.initializeDefaultDashboards();
      }

      // Start dashboard refresh cycles
      await this.startDashboardRefresh();

      this.logger.info('MonitoringDashboardsManager initialized successfully', {
        dashboardsCount: this.dashboards.size
      });

      return success(undefined);

    } catch (error) {
      const errorMessage = `Failed to initialize MonitoringDashboardsManager: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { error });
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(config: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const dashboardId = `dashboard-${Date.now()}`;
    const dashboard: DashboardConfig = {
      ...config,
      id: dashboardId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dashboards.set(dashboardId, dashboard);
    await this.saveDashboard(dashboard);

    // Start refresh cycle for this dashboard
    await this.startDashboardRefreshCycle(dashboard);

    this.logger.info('Dashboard created', {
      dashboardId,
      title: dashboard.title,
      category: dashboard.category
    });

    return dashboardId;
  }

  /**
   * Get dashboard configuration
   */
  async getDashboard(dashboardId: string): Promise<DashboardConfig | null> {
    return this.dashboards.get(dashboardId) || null;
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(dashboardId: string): Promise<DashboardData | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return null;
    }

    // Get or create dashboard data
    let data = this.dashboardData.get(dashboardId);
    if (!data) {
      data = await this.refreshDashboardData(dashboard);
    }

    return data;
  }

  /**
   * List all dashboards
   */
  async listDashboards(category?: string, userId?: string): Promise<DashboardConfig[]> {
    let dashboards = Array.from(this.dashboards.values());

    // Filter by category
    if (category) {
      dashboards = dashboards.filter(d => d.category === category);
    }

    // Filter by permissions
    if (userId) {
      dashboards = dashboards.filter(d => 
        d.isPublic || 
        d.permissions.view.includes(userId) ||
        d.permissions.edit.includes(userId) ||
        d.permissions.admin.includes(userId)
      );
    }

    return dashboards;
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboard(dashboardId: string, updates: Partial<DashboardConfig>): Promise<Result<void>> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return failure(new Error(`Dashboard not found: ${dashboardId}`));
    }

    try {
      const updatedDashboard: DashboardConfig = {
        ...dashboard,
        ...updates,
        id: dashboardId, // Ensure ID doesn't change
        updatedAt: new Date()
      };

      this.dashboards.set(dashboardId, updatedDashboard);
      await this.saveDashboard(updatedDashboard);

      // Restart refresh cycle if refresh interval changed
      if (updates.refreshInterval && updates.refreshInterval !== dashboard.refreshInterval) {
        await this.stopDashboardRefreshCycle(dashboardId);
        await this.startDashboardRefreshCycle(updatedDashboard);
      }

      this.logger.info('Dashboard updated', { dashboardId });
      return success(undefined);

    } catch (error) {
      const errorMessage = `Failed to update dashboard: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { dashboardId });
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId: string): Promise<Result<void>> {
    try {
      // Stop refresh cycle
      await this.stopDashboardRefreshCycle(dashboardId);

      // Remove from memory
      this.dashboards.delete(dashboardId);
      this.dashboardData.delete(dashboardId);

      // Remove alerts for this dashboard
      for (const [alertId, alert] of this.activeAlerts.entries()) {
        const dashboard = this.dashboards.get(alert.widgetId.split('-')[0]);
        if (!dashboard || dashboard.id === dashboardId) {
          this.activeAlerts.delete(alertId);
        }
      }

      // Delete file
      const filePath = path.join(this.dashboardsPath, `${dashboardId}.json`);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist, ignore error
      }

      this.logger.info('Dashboard deleted', { dashboardId });
      return success(undefined);

    } catch (error) {
      const errorMessage = `Failed to delete dashboard: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { dashboardId });
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(dashboardId?: string): Promise<ActiveAlert[]> {
    let alerts = Array.from(this.activeAlerts.values());

    if (dashboardId) {
      alerts = alerts.filter(alert => {
        const dashboard = this.dashboards.get(alert.widgetId.split('-')[0]);
        return dashboard && dashboard.id === dashboardId;
      });
    }

    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<Result<void>> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return failure(new Error(`Alert not found: ${alertId}`));
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.logger.info('Alert acknowledged', {
      alertId,
      acknowledgedBy,
      widgetId: alert.widgetId
    });

    return success(undefined);
  }

  /**
   * Export dashboard configuration
   */
  async exportDashboard(dashboardId: string): Promise<Result<string>> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return failure(new Error(`Dashboard not found: ${dashboardId}`));
    }

    try {
      const exportData = {
        dashboard,
        exportedAt: new Date(),
        version: '1.0.0'
      };

      return success(JSON.stringify(exportData, null, 2));

    } catch (error) {
      const errorMessage = `Failed to export dashboard: ${error instanceof Error ? error.message : String(error)}`;
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Import dashboard configuration
   */
  async importDashboard(configJson: string, importedBy: string): Promise<Result<string>> {
    try {
      const importData = JSON.parse(configJson);
      const dashboard = importData.dashboard as DashboardConfig;

      // Generate new ID and update metadata
      const newId = `dashboard-${Date.now()}`;
      const importedDashboard: DashboardConfig = {
        ...dashboard,
        id: newId,
        createdBy: importedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.dashboards.set(newId, importedDashboard);
      await this.saveDashboard(importedDashboard);
      await this.startDashboardRefreshCycle(importedDashboard);

      this.logger.info('Dashboard imported', {
        dashboardId: newId,
        title: importedDashboard.title,
        importedBy
      });

      return success(newId);

    } catch (error) {
      const errorMessage = `Failed to import dashboard: ${error instanceof Error ? error.message : String(error)}`;
      return failure(new Error(errorMessage));
    }
  }

  // Private helper methods

  private async loadDashboards(): Promise<void> {
    try {
      const files = await fs.readdir(this.dashboardsPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.dashboardsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const dashboard = JSON.parse(content) as DashboardConfig;
          
          // Convert date strings back to Date objects
          dashboard.createdAt = new Date(dashboard.createdAt);
          dashboard.updatedAt = new Date(dashboard.updatedAt);
          
          this.dashboards.set(dashboard.id, dashboard);
          
        } catch (error) {
          this.logger.warn('Failed to load dashboard file', {
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.logger.info('Loaded dashboards', { count: this.dashboards.size });

    } catch (error) {
      this.logger.warn('Failed to load dashboards directory', {
        path: this.dashboardsPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async initializeDefaultDashboards(): Promise<void> {
    const defaultDashboards: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'System Overview',
        description: 'High-level system health and performance metrics',
        category: 'system',
        layout: {
          type: 'grid',
          columns: 4,
          rows: 3,
          responsive: true,
          theme: 'dark'
        },
        widgets: [
          {
            id: 'cpu-usage',
            type: 'metric',
            title: 'CPU Usage',
            position: { x: 0, y: 0 },
            size: { width: 1, height: 1 },
            configuration: {
              chartType: 'gauge',
              timeRange: '5m',
              displayOptions: {
                unit: '%',
                decimals: 1,
                colorScheme: ['#00ff00', '#ffff00', '#ff0000']
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: 'avg(100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))'
            },
            alertThresholds: [
              {
                metric: 'cpu_usage',
                operator: 'gt',
                value: 80,
                severity: 'warning',
                message: 'High CPU usage detected'
              },
              {
                metric: 'cpu_usage',
                operator: 'gt',
                value: 95,
                severity: 'critical',
                message: 'Critical CPU usage detected'
              }
            ]
          },
          {
            id: 'memory-usage',
            type: 'metric',
            title: 'Memory Usage',
            position: { x: 1, y: 0 },
            size: { width: 1, height: 1 },
            configuration: {
              chartType: 'gauge',
              timeRange: '5m',
              displayOptions: {
                unit: '%',
                decimals: 1,
                colorScheme: ['#00ff00', '#ffff00', '#ff0000']
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
            },
            alertThresholds: [
              {
                metric: 'memory_usage',
                operator: 'gt',
                value: 85,
                severity: 'warning',
                message: 'High memory usage detected'
              }
            ]
          },
          {
            id: 'disk-usage',
            type: 'metric',
            title: 'Disk Usage',
            position: { x: 2, y: 0 },
            size: { width: 1, height: 1 },
            configuration: {
              chartType: 'gauge',
              timeRange: '5m',
              displayOptions: {
                unit: '%',
                decimals: 1,
                colorScheme: ['#00ff00', '#ffff00', '#ff0000']
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: '(1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"})) * 100'
            },
            alertThresholds: [
              {
                metric: 'disk_usage',
                operator: 'gt',
                value: 90,
                severity: 'critical',
                message: 'Critical disk usage detected'
              }
            ]
          },
          {
            id: 'network-io',
            type: 'chart',
            title: 'Network I/O',
            position: { x: 3, y: 0 },
            size: { width: 1, height: 1 },
            configuration: {
              chartType: 'line',
              timeRange: '1h',
              displayOptions: {
                unit: 'bytes/s',
                showLegend: true,
                showGrid: true
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: 'rate(node_network_receive_bytes_total[5m])'
            }
          },
          {
            id: 'service-status',
            type: 'status',
            title: 'Service Status',
            position: { x: 0, y: 1 },
            size: { width: 2, height: 1 },
            configuration: {
              displayOptions: {
                showTooltips: true
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: 'up{job="readme-to-cicd"}'
            }
          },
          {
            id: 'response-time',
            type: 'chart',
            title: 'Response Time',
            position: { x: 2, y: 1 },
            size: { width: 2, height: 1 },
            configuration: {
              chartType: 'line',
              timeRange: '1h',
              aggregation: 'avg',
              displayOptions: {
                unit: 'ms',
                decimals: 2,
                showLegend: true
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000'
            },
            alertThresholds: [
              {
                metric: 'response_time',
                operator: 'gt',
                value: 1000,
                severity: 'warning',
                message: 'High response time detected'
              }
            ]
          }
        ],
        refreshInterval: 30,
        permissions: {
          view: ['*'],
          edit: ['admin', 'operator'],
          admin: ['admin'],
          public: true
        },
        tags: ['system', 'overview', 'health'],
        isPublic: true,
        createdBy: 'system'
      },
      {
        title: 'Application Performance',
        description: 'Application-specific performance metrics and health indicators',
        category: 'application',
        layout: {
          type: 'grid',
          columns: 3,
          rows: 4,
          responsive: true,
          theme: 'light'
        },
        widgets: [
          {
            id: 'request-rate',
            type: 'chart',
            title: 'Request Rate',
            position: { x: 0, y: 0 },
            size: { width: 1, height: 1 },
            configuration: {
              chartType: 'line',
              timeRange: '1h',
              displayOptions: {
                unit: 'req/s',
                showLegend: true
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: 'rate(http_requests_total[5m])'
            }
          },
          {
            id: 'error-rate',
            type: 'metric',
            title: 'Error Rate',
            position: { x: 1, y: 0 },
            size: { width: 1, height: 1 },
            configuration: {
              chartType: 'gauge',
              timeRange: '5m',
              displayOptions: {
                unit: '%',
                decimals: 2,
                colorScheme: ['#00ff00', '#ffff00', '#ff0000']
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: 'rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100'
            },
            alertThresholds: [
              {
                metric: 'error_rate',
                operator: 'gt',
                value: 5,
                severity: 'warning',
                message: 'High error rate detected'
              },
              {
                metric: 'error_rate',
                operator: 'gt',
                value: 10,
                severity: 'critical',
                message: 'Critical error rate detected'
              }
            ]
          },
          {
            id: 'active-connections',
            type: 'metric',
            title: 'Active Connections',
            position: { x: 2, y: 0 },
            size: { width: 1, height: 1 },
            configuration: {
              chartType: 'gauge',
              timeRange: '5m',
              displayOptions: {
                unit: 'connections',
                decimals: 0
              }
            },
            dataSource: {
              type: 'prometheus',
              connection: { url: 'http://prometheus:9090' },
              query: 'sum(http_connections_active)'
            }
          }
        ],
        refreshInterval: 15,
        permissions: {
          view: ['*'],
          edit: ['admin', 'developer'],
          admin: ['admin'],
          public: true
        },
        tags: ['application', 'performance', 'monitoring'],
        isPublic: true,
        createdBy: 'system'
      }
    ];

    // Create default dashboards
    for (const dashboardConfig of defaultDashboards) {
      await this.createDashboard(dashboardConfig);
    }

    this.logger.info('Initialized default dashboards', { count: defaultDashboards.length });
  }

  private async saveDashboard(dashboard: DashboardConfig): Promise<void> {
    const filePath = path.join(this.dashboardsPath, `${dashboard.id}.json`);
    const content = JSON.stringify(dashboard, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async startDashboardRefresh(): Promise<void> {
    for (const dashboard of this.dashboards.values()) {
      await this.startDashboardRefreshCycle(dashboard);
    }
  }

  private async startDashboardRefreshCycle(dashboard: DashboardConfig): Promise<void> {
    // Stop existing refresh cycle if any
    await this.stopDashboardRefreshCycle(dashboard.id);

    // Start new refresh cycle
    const interval = setInterval(async () => {
      try {
        await this.refreshDashboardData(dashboard);
      } catch (error) {
        this.logger.error('Dashboard refresh failed', {
          dashboardId: dashboard.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, dashboard.refreshInterval * 1000);

    this.refreshIntervals.set(dashboard.id, interval);

    // Initial refresh
    await this.refreshDashboardData(dashboard);
  }

  private async stopDashboardRefreshCycle(dashboardId: string): Promise<void> {
    const interval = this.refreshIntervals.get(dashboardId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(dashboardId);
    }
  }

  private async refreshDashboardData(dashboard: DashboardConfig): Promise<DashboardData> {
    const timestamp = new Date();
    const widgets: WidgetData[] = [];
    const alerts: ActiveAlert[] = [];
    let overallStatus: 'healthy' | 'warning' | 'error' | 'critical' = 'healthy';

    // Refresh each widget
    for (const widget of dashboard.widgets) {
      try {
        const widgetData = await this.refreshWidgetData(widget);
        widgets.push(widgetData);

        // Check alert thresholds
        if (widget.alertThresholds && widgetData.status === 'success') {
          const widgetAlerts = await this.checkWidgetAlerts(widget, widgetData.data);
          alerts.push(...widgetAlerts);

          // Update overall status based on alerts
          for (const alert of widgetAlerts) {
            if (alert.threshold.severity === 'critical') {
              overallStatus = 'critical';
            } else if (alert.threshold.severity === 'error' && overallStatus !== 'critical') {
              overallStatus = 'error';
            } else if (alert.threshold.severity === 'warning' && overallStatus === 'healthy') {
              overallStatus = 'warning';
            }
          }
        }

      } catch (error) {
        widgets.push({
          widgetId: widget.id,
          data: null,
          lastUpdated: timestamp,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });

        if (overallStatus === 'healthy') {
          overallStatus = 'error';
        }
      }
    }

    const dashboardData: DashboardData = {
      dashboardId: dashboard.id,
      timestamp,
      widgets,
      alerts,
      status: overallStatus
    };

    this.dashboardData.set(dashboard.id, dashboardData);
    return dashboardData;
  }

  private async refreshWidgetData(widget: DashboardWidget): Promise<WidgetData> {
    const startTime = Date.now();

    try {
      let data: any;

      switch (widget.dataSource.type) {
        case 'prometheus':
          data = await this.queryPrometheus(widget.dataSource);
          break;
        case 'elasticsearch':
          data = await this.queryElasticsearch(widget.dataSource);
          break;
        case 'influxdb':
          data = await this.queryInfluxDB(widget.dataSource);
          break;
        case 'custom':
          data = await this.queryCustomDataSource(widget.dataSource);
          break;
        default:
          throw new Error(`Unsupported data source type: ${widget.dataSource.type}`);
      }

      return {
        widgetId: widget.id,
        data,
        lastUpdated: new Date(),
        status: 'success'
      };

    } catch (error) {
      return {
        widgetId: widget.id,
        data: null,
        lastUpdated: new Date(),
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkWidgetAlerts(widget: DashboardWidget, data: any): Promise<ActiveAlert[]> {
    const alerts: ActiveAlert[] = [];

    if (!widget.alertThresholds || !data) {
      return alerts;
    }

    for (const threshold of widget.alertThresholds) {
      const currentValue = this.extractMetricValue(data, threshold.metric);
      if (currentValue === null) continue;

      const shouldAlert = this.evaluateThreshold(currentValue, threshold);
      
      if (shouldAlert) {
        const alertId = `${widget.id}-${threshold.metric}-${Date.now()}`;
        const alert: ActiveAlert = {
          id: alertId,
          widgetId: widget.id,
          threshold,
          currentValue,
          triggeredAt: new Date(),
          acknowledged: false
        };

        alerts.push(alert);
        this.activeAlerts.set(alertId, alert);

        // Send alert notification
        await this.monitoringSystem.sendNotification({
          title: `Alert: ${threshold.message}`,
          message: `Widget: ${widget.title}, Current value: ${currentValue}, Threshold: ${threshold.value}`,
          severity: threshold.severity,
          channels: [{
            type: 'webhook',
            configuration: { url: 'http://alertmanager:9093/api/v1/alerts' },
            enabled: true
          }]
        });
      }
    }

    return alerts;
  }

  private extractMetricValue(data: any, metric: string): number | null {
    // Simple metric extraction - in a real implementation, this would be more sophisticated
    if (typeof data === 'number') {
      return data;
    }

    if (data && typeof data === 'object') {
      if (data.value !== undefined) {
        return typeof data.value === 'number' ? data.value : null;
      }
      
      if (data[metric] !== undefined) {
        return typeof data[metric] === 'number' ? data[metric] : null;
      }
    }

    return null;
  }

  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'lt': return value < threshold.value;
      case 'eq': return value === threshold.value;
      case 'ne': return value !== threshold.value;
      case 'gte': return value >= threshold.value;
      case 'lte': return value <= threshold.value;
      default: return false;
    }
  }

  // Data source query methods (simplified implementations)

  private async queryPrometheus(dataSource: DataSourceConfig): Promise<any> {
    // Simulate Prometheus query
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return mock data based on query
    if (dataSource.query.includes('cpu')) {
      return { value: Math.random() * 100 };
    } else if (dataSource.query.includes('memory')) {
      return { value: Math.random() * 100 };
    } else if (dataSource.query.includes('disk')) {
      return { value: Math.random() * 100 };
    } else {
      return { value: Math.random() * 1000 };
    }
  }

  private async queryElasticsearch(dataSource: DataSourceConfig): Promise<any> {
    // Simulate Elasticsearch query
    await new Promise(resolve => setTimeout(resolve, 150));
    return { hits: { total: Math.floor(Math.random() * 10000) } };
  }

  private async queryInfluxDB(dataSource: DataSourceConfig): Promise<any> {
    // Simulate InfluxDB query
    await new Promise(resolve => setTimeout(resolve, 120));
    return { series: [{ values: [[Date.now(), Math.random() * 100]] }] };
  }

  private async queryCustomDataSource(dataSource: DataSourceConfig): Promise<any> {
    // Simulate custom data source query
    await new Promise(resolve => setTimeout(resolve, 200));
    return { data: Math.random() * 1000, timestamp: Date.now() };
  }
}