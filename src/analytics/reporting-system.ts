/**
 * Reporting System
 * Business intelligence with custom dashboards and reporting capabilities
 */

import { EventEmitter } from 'events';
import {
  Dashboard,
  DashboardWidget,
  Report,
  ReportType,
  ReportFormat,
  ReportSchedule,
  WidgetType,
  AlertRule,
  AlertSeverity,
  AlertCondition,
  AlertAction
} from './types';

export interface ReportingSystemConfig {
  enableScheduledReports: boolean;
  enableRealTimeAlerts: boolean;
  maxDashboards: number;
  maxWidgetsPerDashboard: number;
  reportRetentionDays: number;
  alertCooldownMinutes: number;
}

export interface ReportGenerator {
  generateReport(type: ReportType, parameters: ReportParameters): Promise<Report>;
  exportReport(report: Report, format: ReportFormat): Promise<Buffer>;
}

export interface ReportParameters {
  timeRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  groupBy?: string[];
  metrics?: string[];
  includeCharts?: boolean;
  includeRawData?: boolean;
}

export interface DashboardEngine {
  createDashboard(dashboard: Omit<Dashboard, 'id'>): Promise<Dashboard>;
  updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard>;
  deleteDashboard(id: string): Promise<void>;
  getDashboard(id: string): Promise<Dashboard | null>;
  listDashboards(userId?: string): Promise<Dashboard[]>;
  renderDashboard(id: string): Promise<DashboardRenderResult>;
}

export interface DashboardRenderResult {
  dashboard: Dashboard;
  widgetData: Record<string, any>;
  lastUpdated: Date;
  errors?: string[];
}

export interface AlertEngine {
  createAlert(rule: Omit<AlertRule, 'id'>): Promise<AlertRule>;
  updateAlert(id: string, updates: Partial<AlertRule>): Promise<AlertRule>;
  deleteAlert(id: string): Promise<void>;
  evaluateAlerts(): Promise<void>;
  triggerAlert(ruleId: string, value: number, context?: Record<string, any>): Promise<void>;
}

export class ReportingSystem extends EventEmitter {
  private config: ReportingSystemConfig;
  private reportGenerator: ReportGenerator;
  private dashboardEngine: DashboardEngine;
  private alertEngine: AlertEngine;
  private scheduledReports: Map<string, NodeJS.Timeout> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();

  constructor(
    config: ReportingSystemConfig,
    reportGenerator: ReportGenerator,
    dashboardEngine: DashboardEngine,
    alertEngine: AlertEngine
  ) {
    super();
    this.config = config;
    this.reportGenerator = reportGenerator;
    this.dashboardEngine = dashboardEngine;
    this.alertEngine = alertEngine;
    
    if (this.config.enableScheduledReports) {
      this.startScheduledReports();
    }
    
    if (this.config.enableRealTimeAlerts) {
      this.startAlertEvaluation();
    }
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(
    name: string,
    description: string,
    widgets: Omit<DashboardWidget, 'id'>[],
    permissions?: { viewers: string[]; editors: string[]; owners: string[] }
  ): Promise<Dashboard> {
    if (widgets.length > this.config.maxWidgetsPerDashboard) {
      throw new Error(`Dashboard cannot have more than ${this.config.maxWidgetsPerDashboard} widgets`);
    }

    const dashboard = await this.dashboardEngine.createDashboard({
      name,
      description,
      widgets: widgets.map(widget => ({
        ...widget,
        id: this.generateWidgetId()
      })),
      layout: {
        columns: 12,
        rows: Math.ceil(widgets.length / 3),
        responsive: true
      },
      permissions: permissions || { viewers: [], editors: [], owners: [] },
      refreshInterval: 300000 // 5 minutes
    });

    this.emit('dashboardCreated', dashboard);
    return dashboard;
  }

  /**
   * Generate a report
   */
  async generateReport(
    type: ReportType,
    parameters: ReportParameters,
    format: ReportFormat = 'json'
  ): Promise<Report> {
    const report = await this.reportGenerator.generateReport(type, parameters);
    
    if (format !== 'json') {
      const exportedData = await this.reportGenerator.exportReport(report, format);
      report.data = exportedData;
    }

    this.emit('reportGenerated', report);
    return report;
  }

  /**
   * Schedule a recurring report
   */
  async scheduleReport(
    name: string,
    type: ReportType,
    parameters: ReportParameters,
    schedule: ReportSchedule,
    recipients: string[],
    format: ReportFormat = 'pdf'
  ): Promise<string> {
    if (!this.config.enableScheduledReports) {
      throw new Error('Scheduled reports are disabled');
    }

    const reportId = this.generateReportId();
    const cronExpression = this.scheduleToCron(schedule);
    
    // For simplicity, using setTimeout for demonstration
    // In production, would use a proper cron scheduler
    const interval = this.scheduleToInterval(schedule);
    const timer = setInterval(async () => {
      try {
        const report = await this.generateReport(type, parameters, format);
        report.recipients = recipients;
        await this.deliverReport(report);
        this.emit('scheduledReportDelivered', report);
      } catch (error) {
        this.emit('scheduledReportError', { reportId, error });
      }
    }, interval);

    this.scheduledReports.set(reportId, timer);
    this.emit('reportScheduled', { reportId, name, schedule });
    
    return reportId;
  }

  /**
   * Create an alert rule
   */
  async createAlert(
    name: string,
    condition: AlertCondition,
    severity: AlertSeverity,
    actions: AlertAction[]
  ): Promise<AlertRule> {
    const alertRule = await this.alertEngine.createAlert({
      name,
      condition,
      threshold: condition.value,
      severity,
      actions,
      enabled: true
    });

    this.emit('alertCreated', alertRule);
    return alertRule;
  }

  /**
   * Create usage analytics dashboard
   */
  async createUsageAnalyticsDashboard(): Promise<Dashboard> {
    const widgets: Omit<DashboardWidget, 'id'>[] = [
      {
        type: 'metric',
        title: 'Total Users',
        dataSource: 'analytics.users.total',
        configuration: {
          query: 'SELECT COUNT(DISTINCT user_id) FROM analytics_events',
          timeRange: '24h',
          refreshInterval: 300000,
          visualization: { type: 'number', color: 'blue' }
        },
        position: { x: 0, y: 0, width: 3, height: 2 }
      },
      {
        type: 'metric',
        title: 'Active Users',
        dataSource: 'analytics.users.active',
        configuration: {
          query: 'SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE timestamp > NOW() - INTERVAL 24 HOUR',
          timeRange: '24h',
          refreshInterval: 300000,
          visualization: { type: 'number', color: 'green' }
        },
        position: { x: 3, y: 0, width: 3, height: 2 }
      },
      {
        type: 'chart',
        title: 'User Activity Over Time',
        dataSource: 'analytics.users.activity',
        configuration: {
          query: 'SELECT DATE(timestamp) as date, COUNT(*) as events FROM analytics_events GROUP BY DATE(timestamp)',
          timeRange: '7d',
          refreshInterval: 600000,
          visualization: { type: 'line', xAxis: 'date', yAxis: 'events' }
        },
        position: { x: 0, y: 2, width: 6, height: 4 }
      },
      {
        type: 'chart',
        title: 'Feature Usage',
        dataSource: 'analytics.features.usage',
        configuration: {
          query: 'SELECT data->>"$.feature" as feature, COUNT(*) as usage FROM analytics_events WHERE type = "user_action" GROUP BY feature',
          timeRange: '24h',
          refreshInterval: 300000,
          visualization: { type: 'bar', xAxis: 'feature', yAxis: 'usage' }
        },
        position: { x: 6, y: 0, width: 6, height: 6 }
      }
    ];

    return this.createDashboard(
      'Usage Analytics',
      'Comprehensive user and feature usage analytics',
      widgets
    );
  }

  /**
   * Create performance analytics dashboard
   */
  async createPerformanceAnalyticsDashboard(): Promise<Dashboard> {
    const widgets: Omit<DashboardWidget, 'id'>[] = [
      {
        type: 'gauge',
        title: 'Average Response Time',
        dataSource: 'analytics.performance.response_time',
        configuration: {
          query: 'SELECT AVG(data->>"$.value") as avg_response_time FROM analytics_events WHERE type = "performance_metric" AND data->>"$.metric" = "response_time"',
          timeRange: '1h',
          refreshInterval: 60000,
          visualization: { 
            type: 'gauge', 
            min: 0, 
            max: 2000, 
            thresholds: [
              { value: 500, color: 'green' },
              { value: 1000, color: 'yellow' },
              { value: 2000, color: 'red' }
            ]
          }
        },
        position: { x: 0, y: 0, width: 4, height: 3 }
      },
      {
        type: 'metric',
        title: 'Throughput (req/sec)',
        dataSource: 'analytics.performance.throughput',
        configuration: {
          query: 'SELECT AVG(data->>"$.value") as throughput FROM analytics_events WHERE type = "performance_metric" AND data->>"$.metric" = "throughput"',
          timeRange: '1h',
          refreshInterval: 60000,
          visualization: { type: 'number', color: 'blue', suffix: ' req/s' }
        },
        position: { x: 4, y: 0, width: 4, height: 3 }
      },
      {
        type: 'metric',
        title: 'Error Rate',
        dataSource: 'analytics.performance.error_rate',
        configuration: {
          query: 'SELECT (COUNT(CASE WHEN type = "error_event" THEN 1 END) * 100.0 / COUNT(*)) as error_rate FROM analytics_events',
          timeRange: '1h',
          refreshInterval: 60000,
          visualization: { type: 'number', color: 'red', suffix: '%' }
        },
        position: { x: 8, y: 0, width: 4, height: 3 }
      },
      {
        type: 'chart',
        title: 'Response Time Trend',
        dataSource: 'analytics.performance.response_time_trend',
        configuration: {
          query: 'SELECT DATE_FORMAT(timestamp, "%H:%i") as time, AVG(data->>"$.value") as avg_response_time FROM analytics_events WHERE type = "performance_metric" AND data->>"$.metric" = "response_time" GROUP BY DATE_FORMAT(timestamp, "%H:%i")',
          timeRange: '24h',
          refreshInterval: 300000,
          visualization: { type: 'line', xAxis: 'time', yAxis: 'avg_response_time' }
        },
        position: { x: 0, y: 3, width: 12, height: 4 }
      }
    ];

    return this.createDashboard(
      'Performance Analytics',
      'System performance metrics and trends',
      widgets
    );
  }

  /**
   * Create business analytics dashboard
   */
  async createBusinessAnalyticsDashboard(): Promise<Dashboard> {
    const widgets: Omit<DashboardWidget, 'id'>[] = [
      {
        type: 'metric',
        title: 'Conversion Rate',
        dataSource: 'analytics.business.conversion_rate',
        configuration: {
          query: 'SELECT (COUNT(CASE WHEN data->>"$.action" = "conversion" THEN 1 END) * 100.0 / COUNT(*)) as conversion_rate FROM analytics_events WHERE type = "business_metric"',
          timeRange: '24h',
          refreshInterval: 300000,
          visualization: { type: 'number', color: 'green', suffix: '%' }
        },
        position: { x: 0, y: 0, width: 3, height: 2 }
      },
      {
        type: 'metric',
        title: 'User Satisfaction',
        dataSource: 'analytics.business.satisfaction',
        configuration: {
          query: 'SELECT AVG(data->>"$.rating") as satisfaction FROM analytics_events WHERE type = "business_metric" AND data->>"$.metric" = "satisfaction"',
          timeRange: '7d',
          refreshInterval: 600000,
          visualization: { type: 'number', color: 'blue', suffix: '/5' }
        },
        position: { x: 3, y: 0, width: 3, height: 2 }
      },
      {
        type: 'chart',
        title: 'Revenue Trend',
        dataSource: 'analytics.business.revenue',
        configuration: {
          query: 'SELECT DATE(timestamp) as date, SUM(data->>"$.value") as revenue FROM analytics_events WHERE type = "business_metric" AND data->>"$.metric" = "revenue" GROUP BY DATE(timestamp)',
          timeRange: '30d',
          refreshInterval: 3600000,
          visualization: { type: 'line', xAxis: 'date', yAxis: 'revenue' }
        },
        position: { x: 6, y: 0, width: 6, height: 4 }
      },
      {
        type: 'table',
        title: 'Top Features by Usage',
        dataSource: 'analytics.business.top_features',
        configuration: {
          query: 'SELECT data->>"$.feature" as feature, COUNT(*) as usage, AVG(data->>"$.satisfaction") as satisfaction FROM analytics_events WHERE type = "user_action" GROUP BY feature ORDER BY usage DESC LIMIT 10',
          timeRange: '7d',
          refreshInterval: 600000,
          visualization: { 
            type: 'table',
            columns: [
              { key: 'feature', title: 'Feature' },
              { key: 'usage', title: 'Usage Count' },
              { key: 'satisfaction', title: 'Satisfaction' }
            ]
          }
        },
        position: { x: 0, y: 4, width: 12, height: 4 }
      }
    ];

    return this.createDashboard(
      'Business Analytics',
      'Business metrics and KPIs',
      widgets
    );
  }

  /**
   * Stop the reporting system
   */
  async stop(): Promise<void> {
    // Clear all scheduled reports
    for (const [reportId, timer] of this.scheduledReports) {
      clearInterval(timer);
    }
    this.scheduledReports.clear();
    
    this.emit('stopped');
  }

  private startScheduledReports(): void {
    // Implementation would load existing scheduled reports and start them
    this.emit('scheduledReportsStarted');
  }

  private startAlertEvaluation(): void {
    // Start periodic alert evaluation
    setInterval(async () => {
      try {
        await this.alertEngine.evaluateAlerts();
      } catch (error) {
        this.emit('alertEvaluationError', error);
      }
    }, 60000); // Evaluate every minute
  }

  private async deliverReport(report: Report): Promise<void> {
    // Implementation would deliver report via email, webhook, etc.
    this.emit('reportDelivered', report);
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private scheduleToCron(schedule: ReportSchedule): string {
    // Convert schedule to cron expression
    const [hour, minute] = schedule.time.split(':').map(Number);
    
    switch (schedule.frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * 0`;
      case 'monthly':
        return `${minute} ${hour} 1 * *`;
      case 'quarterly':
        return `${minute} ${hour} 1 */3 *`;
      default:
        throw new Error(`Unsupported frequency: ${schedule.frequency}`);
    }
  }

  private scheduleToInterval(schedule: ReportSchedule): number {
    // Convert schedule to milliseconds for setInterval
    switch (schedule.frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000;
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000;
      case 'quarterly':
        return 90 * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unsupported frequency: ${schedule.frequency}`);
    }
  }
}