/**
 * Monitoring System
 * 
 * Comprehensive monitoring and observability system that provides
 * unified dashboards, alerting, metrics collection, and system health tracking.
 */

import { Logger } from '../../cli/lib/logger';
import { Result, success, failure, isFailure } from '../../shared/types/result';
import { 
  MonitoringConfigValidator, 
  validateMonitoringConfig,
  getDefaultMonitoringConfig 
} from './monitoring-config-validator';

/**
 * Metric data structure
 */
export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit?: string;
  description?: string;
}

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  notifications: NotificationChannel[];
  metadata?: Record<string, any>;
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  configuration: Record<string, any>;
  enabled: boolean;
}

/**
 * Dashboard configuration
 */
export interface Dashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  refresh: string;
  timeRange: TimeRange;
}

/**
 * Dashboard panel
 */
export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'table' | 'stat' | 'gauge' | 'heatmap';
  query: string;
  visualization: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

/**
 * Time range for queries
 */
export interface TimeRange {
  from: string;
  to: string;
}

/**
 * System health status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentHealth[];
  overall: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
  timestamp: Date;
}

/**
 * Component health information
 */
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  details?: Record<string, any>;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  metricsPort: number;
  metricsPath: string;
  healthCheckInterval: number;
  alertingEnabled: boolean;
  retentionPeriod: number;
}

/**
 * Comprehensive monitoring and observability system
 */
export class MonitoringSystem {
  private static instance: MonitoringSystem | null = null;
  private static isCreating = false;

  private logger: Logger;
  private config: MonitoringConfig;
  private metrics: Map<string, Metric[]> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private healthChecks: Map<string, ComponentHealth> = new Map();
  private isInitialized = false;
  private isLazyInitialized = false;
  private metricsServer?: any;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor(logger: Logger, config: Partial<MonitoringConfig> = {}) {
    this.logger = logger;
    
    // Validate and normalize configuration
    const configValidationResult = validateMonitoringConfig(config);
    if (isFailure(configValidationResult)) {
      throw new Error(`Invalid MonitoringSystem configuration: ${configValidationResult.error.message}`);
    }
    
    this.config = configValidationResult.data;
  }

  /**
   * Get the singleton instance of MonitoringSystem with lazy initialization
   * Implements initialization on first use pattern to prevent premature instantiation
   */
  public static getInstance(logger?: Logger, config?: Partial<MonitoringConfig>): MonitoringSystem {
    // Lazy initialization - only create instance when first requested
    if (MonitoringSystem.instance === null) {
      if (MonitoringSystem.isCreating) {
        throw new Error('MonitoringSystem is already being created. Circular dependency detected.');
      }

      MonitoringSystem.isCreating = true;

      try {
        if (!logger) {
          // Create a default logger if none provided
          logger = {
            info: (message: string, meta?: any) => {
              if (process.env.NODE_ENV !== 'test') {
                console.log(`[INFO] ${message}`, meta || '');
              }
            },
            error: (message: string, meta?: any) => {
              if (process.env.NODE_ENV !== 'test') {
                console.error(`[ERROR] ${message}`, meta || '');
              }
            },
            warn: (message: string, meta?: any) => {
              if (process.env.NODE_ENV !== 'test') {
                console.warn(`[WARN] ${message}`, meta || '');
              }
            },
            debug: (message: string, meta?: any) => {
              if (process.env.NODE_ENV === 'development') {
                console.debug(`[DEBUG] ${message}`, meta || '');
              }
            }
          } as Logger;
        }

        // Create instance but don't initialize it yet - lazy initialization
        MonitoringSystem.instance = new MonitoringSystem(logger, config);
        
        // Log lazy initialization (only in development)
        if (process.env.NODE_ENV === 'development') {
          logger.debug('MonitoringSystem instance created with lazy initialization');
        }
      } finally {
        MonitoringSystem.isCreating = false;
      }
    }

    return MonitoringSystem.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   * Properly handles lazy initialization state
   */
  public static resetInstance(): void {
    if (MonitoringSystem.instance) {
      // Reset lazy initialization flag
      MonitoringSystem.instance.isLazyInitialized = false;
      
      // Shutdown the existing instance if it's initialized
      MonitoringSystem.instance.shutdown().catch(error => {
        console.error('Error shutting down MonitoringSystem during reset:', error);
      });
    }
    MonitoringSystem.instance = null;
    MonitoringSystem.isCreating = false;
  }

  /**
   * Check if the singleton instance exists
   */
  public static hasInstance(): boolean {
    return MonitoringSystem.instance !== null;
  }

  /**
   * Ensure lazy initialization is performed before first use
   * This method is called automatically by other methods that need initialization
   */
  private async ensureLazyInitialization(): Promise<void> {
    if (!this.isLazyInitialized) {
      this.isLazyInitialized = true;
      
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug('Performing lazy initialization of MonitoringSystem');
      }

      // Initialize default dashboards
      this.initializeDefaultDashboards();

      // Initialize default alerts
      this.initializeDefaultAlerts();
    }
  }

  /**
   * Initialize the monitoring system
   * Now supports both explicit initialization and lazy initialization
   */
  async initialize(): Promise<Result<void>> {
    try {
      this.logger.info('Initializing MonitoringSystem...');

      // Ensure lazy initialization is done first
      await this.ensureLazyInitialization();

      // Start metrics server if enabled
      if (this.config.enableMetrics) {
        await this.startMetricsServer();
      }

      // Start health checks if enabled
      if (this.config.enableHealthChecks) {
        this.startHealthChecks();
      }

      // Start metrics cleanup
      this.startMetricsCleanup();

      this.isInitialized = true;
      this.logger.info('MonitoringSystem initialized successfully');

      return success(undefined);

    } catch (error) {
      const errorMessage = `Failed to initialize MonitoringSystem: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { error });
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Record a metric
   * Automatically performs lazy initialization on first use
   */
  async recordMetric(name: string, value: number, labels: Record<string, string> = {}): Promise<void> {
    // Ensure lazy initialization before first use
    await this.ensureLazyInitialization();

    if (!this.isInitialized) {
      // Allow recording metrics even if not fully initialized (lazy initialization pattern)
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug('Recording metric before full initialization (lazy pattern)');
      }
    }

    try {
      const metric: Metric = {
        name,
        value,
        timestamp: new Date(),
        labels,
        type: 'gauge' // Default type, can be overridden
      };

      // Store metric
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      this.metrics.get(name)!.push(metric);

      // Check alerts for this metric (only if fully initialized)
      if (this.isInitialized) {
        await this.checkAlerts(metric);
      }

      this.logger.debug('Metric recorded', { name, value, labels });

    } catch (error) {
      this.logger.error('Failed to record metric', {
        name,
        value,
        labels,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Query metrics
   * Automatically performs lazy initialization on first use
   */
  async queryMetrics(query: string, timeRange?: TimeRange): Promise<Metric[]> {
    // Ensure lazy initialization before first use
    await this.ensureLazyInitialization();

    try {
      // Simple query implementation - in production, this would use a proper query engine
      const results: Metric[] = [];
      
      // Parse query (simplified)
      const metricName = this.parseMetricName(query);
      const metrics = this.metrics.get(metricName) || [];

      // Apply time range filter
      let filteredMetrics = metrics;
      if (timeRange) {
        const fromTime = new Date(timeRange.from);
        const toTime = new Date(timeRange.to);
        filteredMetrics = metrics.filter(m => 
          m.timestamp >= fromTime && m.timestamp <= toTime
        );
      }

      results.push(...filteredMetrics);

      this.logger.debug('Metrics queried', { query, resultCount: results.length });

      return results;

    } catch (error) {
      this.logger.error('Failed to query metrics', {
        query,
        timeRange,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Create or update an alert
   */
  async createAlert(alert: Alert): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('MonitoringSystem not initialized');
    }

    try {
      this.alerts.set(alert.id, alert);

      this.logger.info('Alert created/updated', {
        alertId: alert.id,
        name: alert.name,
        severity: alert.severity
      });

      return alert.id;

    } catch (error) {
      this.logger.error('Failed to create alert', {
        alert,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Send notification
   */
  async sendNotification(notification: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    channels: NotificationChannel[];
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MonitoringSystem not initialized');
    }

    try {
      for (const channel of notification.channels) {
        if (!channel.enabled) {
          continue;
        }

        await this.sendToChannel(channel, notification);
      }

      this.logger.info('Notification sent', {
        title: notification.title,
        severity: notification.severity,
        channels: notification.channels.length
      });

    } catch (error) {
      this.logger.error('Failed to send notification', {
        notification,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Generate system report
   */
  async generateReport(reportType: 'health' | 'performance' | 'alerts' | 'usage'): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('MonitoringSystem not initialized');
    }

    try {
      let report: any;

      switch (reportType) {
        case 'health':
          report = await this.generateHealthReport();
          break;
        case 'performance':
          report = await this.generatePerformanceReport();
          break;
        case 'alerts':
          report = await this.generateAlertsReport();
          break;
        case 'usage':
          report = await this.generateUsageReport();
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      this.logger.info('Report generated', { type: reportType });

      return report;

    } catch (error) {
      this.logger.error('Failed to generate report', {
        reportType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get system health status
   * Automatically performs lazy initialization on first use
   */
  async getSystemHealth(): Promise<HealthStatus> {
    // Ensure lazy initialization before first use
    await this.ensureLazyInitialization();

    try {
      const components = Array.from(this.healthChecks.values());
      
      // Calculate overall status
      const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
      const degradedCount = components.filter(c => c.status === 'degraded').length;
      
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (unhealthyCount > 0) {
        overallStatus = 'unhealthy';
      } else if (degradedCount > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      // Calculate overall metrics
      const avgResponseTime = components.length > 0 
        ? components.reduce((sum, c) => sum + c.responseTime, 0) / components.length 
        : 0;
      
      const avgErrorRate = components.length > 0
        ? components.reduce((sum, c) => sum + c.errorRate, 0) / components.length
        : 0;

      return {
        status: overallStatus,
        components,
        overall: {
          uptime: process.uptime(),
          responseTime: avgResponseTime,
          errorRate: avgErrorRate,
          throughput: await this.calculateThroughput()
        },
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get system health', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        status: 'unhealthy',
        components: [],
        overall: {
          uptime: 0,
          responseTime: 0,
          errorRate: 1,
          throughput: 0
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get system metrics
   * Automatically performs lazy initialization on first use
   */
  async getSystemMetrics(): Promise<Record<string, any>> {
    // Ensure lazy initialization before first use
    await this.ensureLazyInitialization();

    try {
      const metrics: Record<string, any> = {};

      // Get latest metrics for each metric name
      for (const [name, metricList] of this.metrics.entries()) {
        if (metricList.length > 0) {
          const latest = metricList[metricList.length - 1];
          metrics[name] = {
            value: latest.value,
            timestamp: latest.timestamp,
            labels: latest.labels
          };
        }
      }

      // Add system metrics
      const memUsage = process.memoryUsage();
      metrics.system_memory_used = {
        value: memUsage.heapUsed,
        timestamp: new Date(),
        labels: { type: 'heap' }
      };

      metrics.system_uptime = {
        value: process.uptime(),
        timestamp: new Date(),
        labels: {}
      };

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get system metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {};
    }
  }

  /**
   * Update component health
   */
  async updateComponentHealth(name: string, health: Partial<ComponentHealth>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MonitoringSystem not initialized');
    }

    try {
      const existing = this.healthChecks.get(name) || {
        name,
        status: 'healthy',
        responseTime: 0,
        errorRate: 0,
        lastCheck: new Date()
      };

      const updated: ComponentHealth = {
        ...existing,
        ...health,
        name,
        lastCheck: new Date()
      };

      this.healthChecks.set(name, updated);

      this.logger.debug('Component health updated', { name, health: updated });

    } catch (error) {
      this.logger.error('Failed to update component health', {
        name,
        health,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get monitoring system status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    metricsEnabled: boolean;
    healthChecksEnabled: boolean;
    alertsEnabled: boolean;
    metricsCount: number;
    alertsCount: number;
    dashboardsCount: number;
  }> {
    return {
      initialized: this.isInitialized,
      metricsEnabled: this.config.enableMetrics,
      healthChecksEnabled: this.config.enableHealthChecks,
      alertsEnabled: this.config.alertingEnabled,
      metricsCount: this.metrics.size,
      alertsCount: this.alerts.size,
      dashboardsCount: this.dashboards.size
    };
  }

  /**
   * Validate configuration without applying it
   */
  static validateConfiguration(config: Partial<MonitoringConfig>): Result<MonitoringConfig> {
    return validateMonitoringConfig(config);
  }

  /**
   * Update configuration with validation
   */
  async updateConfiguration(newConfig: Partial<MonitoringConfig>): Promise<Result<void>> {
    try {
      if (!this.isInitialized) {
        return failure(new Error('MonitoringSystem must be initialized before updating configuration'));
      }

      // Validate the new configuration
      const mergedConfig = { ...this.config, ...newConfig };
      const validationResult = validateMonitoringConfig(mergedConfig);
      
      if (isFailure(validationResult)) {
        return failure(new Error(`Configuration validation failed: ${validationResult.error.message}`));
      }

      // Store old configuration for rollback
      const oldConfig = { ...this.config };

      try {
        // Apply new configuration
        this.config = validationResult.data;

        // Restart components if necessary
        if (newConfig.enableMetrics !== undefined && newConfig.enableMetrics !== oldConfig.enableMetrics) {
          if (newConfig.enableMetrics) {
            await this.startMetricsServer();
          } else if (this.metricsServer) {
            this.metricsServer.close();
            this.metricsServer = undefined;
          }
        }

        if (newConfig.enableHealthChecks !== undefined && newConfig.enableHealthChecks !== oldConfig.enableHealthChecks) {
          if (newConfig.enableHealthChecks) {
            this.startHealthChecks();
          } else if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
          }
        }

        // Update health check interval if changed
        if (newConfig.healthCheckInterval !== undefined && 
            newConfig.healthCheckInterval !== oldConfig.healthCheckInterval &&
            this.config.enableHealthChecks) {
          if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
          }
          this.startHealthChecks();
        }

        this.logger.info('MonitoringSystem configuration updated successfully', {
          oldConfig: oldConfig,
          newConfig: this.config
        });

        return success(undefined);

      } catch (error) {
        // Rollback configuration on error
        this.config = oldConfig;
        this.logger.error('Failed to apply configuration update, rolled back to previous configuration', {
          error: error instanceof Error ? error.message : String(error)
        });
        return failure(new Error(`Failed to apply configuration update: ${error instanceof Error ? error.message : String(error)}`));
      }

    } catch (error) {
      return failure(new Error(`Configuration update failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Get default configuration
   */
  static getDefaultConfiguration(): MonitoringConfig {
    return getDefaultMonitoringConfig();
  }

  /**
   * Shutdown monitoring system
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down MonitoringSystem...');

      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Stop metrics server
      if (this.metricsServer) {
        this.metricsServer.close();
      }

      // Clear data
      this.metrics.clear();
      this.alerts.clear();
      this.dashboards.clear();
      this.healthChecks.clear();

      this.isInitialized = false;
      this.logger.info('MonitoringSystem shutdown completed');

    } catch (error) {
      this.logger.error('Error during MonitoringSystem shutdown', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Private helper methods

  private async startMetricsServer(): Promise<void> {
    // In a real implementation, this would start an HTTP server for metrics
    // For now, we'll just log that it would be started
    this.logger.info('Metrics server would be started', {
      port: this.config.metricsPort,
      path: this.config.metricsPath
    });
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Health check failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.healthCheckInterval);
  }

  private startMetricsCleanup(): void {
    // Clean up old metrics periodically
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
      
      for (const [name, metricList] of this.metrics.entries()) {
        const filtered = metricList.filter(m => m.timestamp > cutoffTime);
        this.metrics.set(name, filtered);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  private async performHealthChecks(): Promise<void> {
    // Perform health checks on system components
    const components = ['readme-parser', 'framework-detector', 'yaml-generator', 'cli-tool'];
    
    for (const component of components) {
      try {
        const startTime = Date.now();
        
        // Simulate health check (in real implementation, this would check actual component health)
        const isHealthy = Math.random() > 0.1; // 90% healthy
        const responseTime = Date.now() - startTime;
        
        await this.updateComponentHealth(component, {
          status: isHealthy ? 'healthy' : 'degraded',
          responseTime,
          errorRate: isHealthy ? 0 : 0.05
        });

      } catch (error) {
        await this.updateComponentHealth(component, {
          status: 'unhealthy',
          responseTime: 0,
          errorRate: 1
        });
      }
    }
  }

  private async checkAlerts(metric: Metric): Promise<void> {
    if (!this.config.alertingEnabled) {
      return;
    }

    for (const alert of this.alerts.values()) {
      if (!alert.enabled) {
        continue;
      }

      try {
        // Simple alert condition checking (in production, use a proper expression evaluator)
        if (this.evaluateAlertCondition(alert, metric)) {
          await this.triggerAlert(alert, metric);
        }
      } catch (error) {
        this.logger.error('Alert evaluation failed', {
          alertId: alert.id,
          metric: metric.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private evaluateAlertCondition(alert: Alert, metric: Metric): boolean {
    // Simple condition evaluation - in production, use a proper expression parser
    if (alert.condition.includes(metric.name)) {
      if (alert.condition.includes('>')) {
        return metric.value > alert.threshold;
      } else if (alert.condition.includes('<')) {
        return metric.value < alert.threshold;
      }
    }
    return false;
  }

  private async triggerAlert(alert: Alert, metric: Metric): Promise<void> {
    const notification = {
      title: `Alert: ${alert.name}`,
      message: `Alert condition met: ${alert.condition}. Current value: ${metric.value}`,
      severity: alert.severity,
      channels: alert.notifications,
      metadata: {
        alertId: alert.id,
        metric: metric.name,
        value: metric.value,
        threshold: alert.threshold
      }
    };

    await this.sendNotification(notification);
  }

  private async sendToChannel(channel: NotificationChannel, notification: any): Promise<void> {
    // In a real implementation, this would send to actual notification channels
    this.logger.info('Notification would be sent', {
      channel: channel.type,
      title: notification.title,
      severity: notification.severity
    });
  }

  private parseMetricName(query: string): string {
    // Simple query parsing - extract metric name
    const match = query.match(/(\w+)/);
    return match ? match[1] : '';
  }

  private async calculateThroughput(): Promise<number> {
    // Calculate requests per second based on workflow metrics
    const workflowMetrics = this.metrics.get('workflow_completed') || [];
    const recentMetrics = workflowMetrics.filter(m => 
      m.timestamp > new Date(Date.now() - 60000) // Last minute
    );
    
    return recentMetrics.length; // Workflows per minute
  }

  private initializeDefaultDashboards(): void {
    const systemDashboard: Dashboard = {
      id: 'system-overview',
      name: 'System Overview',
      description: 'Overall system health and performance metrics',
      refresh: '30s',
      timeRange: { from: 'now-1h', to: 'now' },
      panels: [
        {
          id: 'system-health',
          title: 'System Health',
          type: 'stat',
          query: 'system_health',
          visualization: { colorMode: 'background' },
          position: { x: 0, y: 0, width: 6, height: 4 }
        },
        {
          id: 'workflow-throughput',
          title: 'Workflow Throughput',
          type: 'graph',
          query: 'workflow_completed',
          visualization: { lineWidth: 2 },
          position: { x: 6, y: 0, width: 6, height: 4 }
        }
      ]
    };

    this.dashboards.set(systemDashboard.id, systemDashboard);
  }

  private initializeDefaultAlerts(): void {
    const highErrorRateAlert: Alert = {
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: 'error_rate > threshold',
      threshold: 0.05, // 5%
      severity: 'warning',
      enabled: true,
      notifications: []
    };

    const systemDownAlert: Alert = {
      id: 'system-down',
      name: 'System Down',
      condition: 'system_health < threshold',
      threshold: 1,
      severity: 'critical',
      enabled: true,
      notifications: []
    };

    this.alerts.set(highErrorRateAlert.id, highErrorRateAlert);
    this.alerts.set(systemDownAlert.id, systemDownAlert);
  }

  private async generateHealthReport(): Promise<any> {
    const health = await this.getSystemHealth();
    return {
      type: 'health',
      timestamp: new Date(),
      data: health
    };
  }

  private async generatePerformanceReport(): Promise<any> {
    const metrics = await this.getSystemMetrics();
    return {
      type: 'performance',
      timestamp: new Date(),
      data: {
        metrics,
        summary: {
          avgResponseTime: 0, // Calculate from metrics
          throughput: await this.calculateThroughput(),
          errorRate: 0 // Calculate from metrics
        }
      }
    };
  }

  private async generateAlertsReport(): Promise<any> {
    return {
      type: 'alerts',
      timestamp: new Date(),
      data: {
        total: this.alerts.size,
        active: Array.from(this.alerts.values()).filter(a => a.enabled).length,
        alerts: Array.from(this.alerts.values())
      }
    };
  }

  private async generateUsageReport(): Promise<any> {
    return {
      type: 'usage',
      timestamp: new Date(),
      data: {
        totalWorkflows: this.metrics.get('workflow_completed')?.length || 0,
        totalErrors: this.metrics.get('workflow_failed')?.length || 0,
        systemUptime: process.uptime()
      }
    };
  }
}