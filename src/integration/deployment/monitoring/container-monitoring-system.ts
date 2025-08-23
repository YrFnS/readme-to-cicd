/**
 * Container Monitoring System
 * Provides comprehensive container monitoring with resource usage tracking and performance metrics
 */

import { EventEmitter } from 'events';
import {
  ContainerMonitoringSystem as IContainerMonitoringSystem,
  MonitoringConfig,
  TimeRange,
  ContainerMetrics,
  ResourceUsage,
  PerformanceMetrics,
  AlertRule,
  Alert,
  MonitoringDashboard,
  MonitoringReport
} from '../types/monitoring-types';

export class ContainerMonitoringSystem extends EventEmitter implements IContainerMonitoringSystem {
  private monitoredContainers: Map<string, MonitoringConfig> = new Map();
  private metricsCache: Map<string, ContainerMetrics[]> = new Map();
  private alerts: Map<string, Alert[]> = new Map();
  private dashboards: Map<string, MonitoringDashboard> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
  }

  async startMonitoring(containerId: string, config: MonitoringConfig): Promise<void> {
    try {
      // Validate monitoring configuration
      this.validateMonitoringConfig(config);

      // Store monitoring configuration
      this.monitoredContainers.set(containerId, config);

      // Initialize metrics cache
      this.metricsCache.set(containerId, []);

      // Initialize alerts
      this.alerts.set(containerId, []);

      // Start metrics collection
      await this.startMetricsCollection(containerId, config);

      // Setup alerts
      await this.setupAlerts(containerId, config.alerts);

      // Create default dashboard if none exists
      if (!this.dashboards.has(containerId)) {
        await this.createDefaultDashboard(containerId);
      }

      this.emit('monitoringStarted', { containerId, config });

    } catch (error) {
      throw new Error(`Failed to start monitoring for container ${containerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stopMonitoring(containerId: string): Promise<void> {
    try {
      // Stop metrics collection
      const interval = this.monitoringIntervals.get(containerId);
      if (interval) {
        clearInterval(interval);
        this.monitoringIntervals.delete(containerId);
      }

      // Clean up data
      this.monitoredContainers.delete(containerId);
      this.metricsCache.delete(containerId);
      this.alerts.delete(containerId);
      this.dashboards.delete(containerId);

      this.emit('monitoringStopped', { containerId });

    } catch (error) {
      throw new Error(`Failed to stop monitoring for container ${containerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMetrics(containerId: string, timeRange?: TimeRange): Promise<ContainerMetrics> {
    try {
      const cachedMetrics = this.metricsCache.get(containerId) || [];
      
      if (!timeRange) {
        // Return latest metrics
        return cachedMetrics[cachedMetrics.length - 1] || this.createEmptyMetrics(containerId);
      }

      // Filter metrics by time range
      const filteredMetrics = cachedMetrics.filter(metric => {
        const timestamp = metric.timestamp.getTime();
        const from = typeof timeRange.from === 'string' ? new Date(timeRange.from).getTime() : timeRange.from.getTime();
        const to = typeof timeRange.to === 'string' ? new Date(timeRange.to).getTime() : timeRange.to.getTime();
        return timestamp >= from && timestamp <= to;
      });

      // Aggregate metrics over time range
      return this.aggregateMetrics(containerId, filteredMetrics);

    } catch (error) {
      throw new Error(`Failed to get metrics for container ${containerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getResourceUsage(containerId: string): Promise<ResourceUsage> {
    try {
      // Get current container stats
      const stats = await this.getContainerStats(containerId);

      return {
        containerId,
        timestamp: new Date(),
        cpu: {
          usage: stats.cpu.usage,
          limit: 100, // percentage
          request: 50, // percentage
          throttled: stats.cpu.throttledTime > 0
        },
        memory: {
          usage: stats.memory.usage,
          limit: stats.memory.limit,
          request: stats.memory.limit * 0.5,
          utilization: (stats.memory.usage / stats.memory.limit) * 100,
          oomKilled: false // Would be determined from container events
        },
        network: {
          rxBytesPerSecond: this.calculateRate(stats.network.totalRxBytes),
          txBytesPerSecond: this.calculateRate(stats.network.totalTxBytes),
          rxPacketsPerSecond: this.calculateRate(stats.network.totalRxPackets),
          txPacketsPerSecond: this.calculateRate(stats.network.totalTxPackets),
          errors: stats.network.totalRxErrors.current + stats.network.totalTxErrors.current
        },
        disk: {
          readBytesPerSecond: this.calculateRate(stats.disk.totalReadBytes),
          writeBytesPerSecond: this.calculateRate(stats.disk.totalWriteBytes),
          readOpsPerSecond: this.calculateRate(stats.disk.totalReadOps),
          writeOpsPerSecond: this.calculateRate(stats.disk.totalWriteOps),
          utilization: 50 // Would be calculated from disk stats
        },
        filesystem: {
          usage: stats.filesystem.totalUsed,
          capacity: stats.filesystem.totalCapacity,
          utilization: stats.filesystem.totalUtilization,
          inodeUtilization: 10 // Would be calculated from filesystem stats
        }
      };

    } catch (error) {
      throw new Error(`Failed to get resource usage for container ${containerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPerformanceMetrics(containerId: string): Promise<PerformanceMetrics> {
    try {
      const metrics = await this.getMetrics(containerId);
      const resourceUsage = await this.getResourceUsage(containerId);

      return {
        containerId,
        timestamp: new Date(),
        availability: {
          uptime: this.calculateUptime(containerId),
          downtime: 0,
          uptimePercentage: 99.9
        },
        reliability: {
          restarts: 0, // Would be tracked from container events
          crashes: 0,
          oomKills: 0,
          healthCheckFailures: 0,
          mtbf: 86400, // 24 hours in seconds
          mttr: 300 // 5 minutes in seconds
        },
        performance: {
          responseTime: {
            p50: 100,
            p90: 200,
            p95: 300,
            p99: 500,
            p999: 1000,
            mean: 150,
            max: 2000,
            min: 50,
            unit: 'ms'
          },
          throughput: metrics.application?.httpRequests?.requestsPerSecond.current || 0,
          errorRate: metrics.application?.httpRequests?.errorRate.current || 0,
          saturation: {
            cpu: resourceUsage.cpu.usage,
            memory: resourceUsage.memory.utilization,
            disk: resourceUsage.disk.utilization,
            network: 20 // Would be calculated from network utilization
          }
        },
        scalability: {
          currentReplicas: 1,
          desiredReplicas: 1,
          maxReplicas: 10,
          scalingEvents: 0,
          scalingLatency: 30
        },
        efficiency: {
          resourceUtilization: {
            cpu: resourceUsage.cpu.usage,
            memory: resourceUsage.memory.utilization,
            disk: resourceUsage.disk.utilization,
            network: 20
          },
          costPerRequest: 0.001,
          energyEfficiency: 1000 // requests per watt
        }
      };

    } catch (error) {
      throw new Error(`Failed to get performance metrics for container ${containerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setAlerts(containerId: string, alertRules: AlertRule[]): Promise<void> {
    try {
      const config = this.monitoredContainers.get(containerId);
      if (!config) {
        throw new Error(`Container ${containerId} is not being monitored`);
      }

      // Update monitoring configuration with new alert rules
      config.alerts = alertRules;
      this.monitoredContainers.set(containerId, config);

      // Setup new alerts
      await this.setupAlerts(containerId, alertRules);

      this.emit('alertsUpdated', { containerId, alertRules });

    } catch (error) {
      throw new Error(`Failed to set alerts for container ${containerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAlerts(containerId: string): Promise<Alert[]> {
    try {
      return this.alerts.get(containerId) || [];

    } catch (error) {
      throw new Error(`Failed to get alerts for container ${containerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exportMetrics(format: 'prometheus' | 'json' | 'csv'): Promise<string> {
    try {
      const allMetrics: Record<string, ContainerMetrics[]> = {};
      
      for (const [containerId, metrics] of this.metricsCache.entries()) {
        allMetrics[containerId] = metrics;
      }

      switch (format) {
        case 'prometheus':
          return this.exportPrometheusMetrics(allMetrics);
        case 'json':
          return JSON.stringify(allMetrics, null, 2);
        case 'csv':
          return this.exportCSVMetrics(allMetrics);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      throw new Error(`Failed to export metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Dashboard management methods

  async createDashboard(dashboard: MonitoringDashboard): Promise<void> {
    try {
      this.dashboards.set(dashboard.id, dashboard);
      this.emit('dashboardCreated', { dashboardId: dashboard.id });

    } catch (error) {
      throw new Error(`Failed to create dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDashboard(dashboardId: string): Promise<MonitoringDashboard | undefined> {
    return this.dashboards.get(dashboardId);
  }

  async listDashboards(): Promise<MonitoringDashboard[]> {
    return Array.from(this.dashboards.values());
  }

  async deleteDashboard(dashboardId: string): Promise<void> {
    this.dashboards.delete(dashboardId);
    this.emit('dashboardDeleted', { dashboardId });
  }

  // Report generation methods

  async generateReport(containerId: string, timeRange: TimeRange): Promise<MonitoringReport> {
    try {
      const metrics = await this.getMetrics(containerId, timeRange);
      const alerts = await this.getAlerts(containerId);
      const performanceMetrics = await this.getPerformanceMetrics(containerId);

      const report: MonitoringReport = {
        id: `report-${containerId}-${Date.now()}`,
        name: `Container Monitoring Report - ${containerId}`,
        containerId,
        timeRange,
        generatedAt: new Date(),
        sections: [
          {
            id: 'overview',
            title: 'Overview',
            type: 'metrics',
            content: {
              cpu: metrics.cpu,
              memory: metrics.memory,
              network: metrics.network,
              disk: metrics.disk
            }
          },
          {
            id: 'performance',
            title: 'Performance Metrics',
            type: 'analysis',
            content: performanceMetrics
          },
          {
            id: 'alerts',
            title: 'Alerts',
            type: 'alerts',
            content: alerts
          }
        ],
        summary: {
          totalContainers: 1,
          healthyContainers: alerts.filter(a => a.status === 'resolved').length > 0 ? 0 : 1,
          unhealthyContainers: alerts.filter(a => a.status === 'firing').length > 0 ? 1 : 0,
          totalAlerts: alerts.length,
          criticalAlerts: alerts.filter(a => a.rule.severity === 'critical').length,
          averageResourceUtilization: {
            cpu: metrics.cpu.usage.current,
            memory: (metrics.memory.usage.current / 1024 / 1024 / 1024), // Convert to GB
            disk: metrics.disk.totalReadBytes.current + metrics.disk.totalWriteBytes.current,
            network: metrics.network.totalRxBytes.current + metrics.network.totalTxBytes.current
          },
          topResourceConsumers: [
            {
              containerId,
              containerName: metrics.containerName,
              resourceType: 'cpu',
              usage: metrics.cpu.usage.current,
              unit: '%',
              percentage: metrics.cpu.usage.current
            }
          ],
          performanceScore: this.calculatePerformanceScore(performanceMetrics)
        }
      };

      return report;

    } catch (error) {
      throw new Error(`Failed to generate report for container ${containerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private validateMonitoringConfig(config: MonitoringConfig): void {
    if (!config.interval || config.interval < 1) {
      throw new Error('Monitoring interval must be at least 1 second');
    }
    if (!config.metrics || config.metrics.length === 0) {
      throw new Error('At least one metric type must be specified');
    }
  }

  private async startMetricsCollection(containerId: string, config: MonitoringConfig): Promise<void> {
    const interval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics(containerId, config);
        
        // Store metrics in cache
        const cachedMetrics = this.metricsCache.get(containerId) || [];
        cachedMetrics.push(metrics);
        
        // Keep only recent metrics (based on retention policy)
        const retentionMs = this.parseRetentionDuration(config.retention.duration);
        const cutoffTime = Date.now() - retentionMs;
        const filteredMetrics = cachedMetrics.filter(m => m.timestamp.getTime() > cutoffTime);
        
        this.metricsCache.set(containerId, filteredMetrics);

        // Check alerts
        await this.checkAlerts(containerId, metrics);

        this.emit('metricsCollected', { containerId, metrics });

      } catch (error) {
        console.error(`Failed to collect metrics for container ${containerId}:`, error);
      }
    }, config.interval * 1000);

    this.monitoringIntervals.set(containerId, interval);
  }

  private async collectMetrics(containerId: string, config: MonitoringConfig): Promise<ContainerMetrics> {
    const timestamp = new Date();
    const metrics: ContainerMetrics = {
      containerId,
      containerName: `container-${containerId}`,
      timestamp,
      cpu: {
        usage: { current: 0, average: 0, peak: 0, unit: '%', timestamp },
        usageNanoCores: { current: 0, average: 0, peak: 0, unit: 'nanocores', timestamp },
        throttledTime: { current: 0, average: 0, peak: 0, unit: 'ns', timestamp },
        systemUsage: { current: 0, average: 0, peak: 0, unit: '%', timestamp },
        userUsage: { current: 0, average: 0, peak: 0, unit: '%', timestamp },
        coreCount: 1
      },
      memory: {
        usage: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        workingSet: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        rss: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        cache: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        limit: 0,
        utilization: { current: 0, average: 0, peak: 0, unit: '%', timestamp },
        pageFaults: { current: 0, average: 0, peak: 0, unit: 'count', timestamp },
        majorPageFaults: { current: 0, average: 0, peak: 0, unit: 'count', timestamp }
      },
      network: {
        interfaces: {},
        totalRxBytes: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        totalTxBytes: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        totalRxPackets: { current: 0, average: 0, peak: 0, unit: 'packets', timestamp },
        totalTxPackets: { current: 0, average: 0, peak: 0, unit: 'packets', timestamp },
        totalRxErrors: { current: 0, average: 0, peak: 0, unit: 'errors', timestamp },
        totalTxErrors: { current: 0, average: 0, peak: 0, unit: 'errors', timestamp },
        totalRxDropped: { current: 0, average: 0, peak: 0, unit: 'packets', timestamp },
        totalTxDropped: { current: 0, average: 0, peak: 0, unit: 'packets', timestamp }
      },
      disk: {
        devices: {},
        totalReadBytes: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        totalWriteBytes: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        totalReadOps: { current: 0, average: 0, peak: 0, unit: 'ops', timestamp },
        totalWriteOps: { current: 0, average: 0, peak: 0, unit: 'ops', timestamp },
        totalReadTime: { current: 0, average: 0, peak: 0, unit: 'ms', timestamp },
        totalWriteTime: { current: 0, average: 0, peak: 0, unit: 'ms', timestamp }
      },
      filesystem: {
        filesystems: {},
        totalCapacity: 0,
        totalUsed: 0,
        totalAvailable: 0,
        totalUtilization: 0
      },
      process: {
        processCount: 0,
        threadCount: 0,
        fileDescriptorCount: 0,
        fileDescriptorLimit: 0,
        processes: []
      }
    };

    // Collect metrics based on configuration
    for (const metricType of config.metrics) {
      switch (metricType) {
        case 'cpu':
          await this.collectCPUMetrics(containerId, metrics);
          break;
        case 'memory':
          await this.collectMemoryMetrics(containerId, metrics);
          break;
        case 'network':
          await this.collectNetworkMetrics(containerId, metrics);
          break;
        case 'disk':
          await this.collectDiskMetrics(containerId, metrics);
          break;
        case 'filesystem':
          await this.collectFilesystemMetrics(containerId, metrics);
          break;
        case 'process':
          await this.collectProcessMetrics(containerId, metrics);
          break;
        case 'application':
          await this.collectApplicationMetrics(containerId, metrics);
          break;
        case 'custom':
          await this.collectCustomMetrics(containerId, metrics, config);
          break;
      }
    }

    return metrics;
  }

  private async setupAlerts(containerId: string, alertRules: AlertRule[]): Promise<void> {
    // Setup alert rules for the container
    for (const rule of alertRules) {
      if (rule.enabled) {
        // Initialize alert state
        const alert: Alert = {
          id: `${containerId}-${rule.id}`,
          rule,
          status: 'resolved',
          value: 0,
          timestamp: new Date(),
          startsAt: new Date(),
          labels: { containerId, ...rule.labels },
          annotations: rule.annotations || {}
        };

        const containerAlerts = this.alerts.get(containerId) || [];
        containerAlerts.push(alert);
        this.alerts.set(containerId, containerAlerts);
      }
    }
  }

  private async checkAlerts(containerId: string, metrics: ContainerMetrics): Promise<void> {
    const containerAlerts = this.alerts.get(containerId) || [];

    for (const alert of containerAlerts) {
      const metricValue = this.getMetricValue(metrics, alert.rule.metric);
      const threshold = alert.rule.threshold;
      const condition = alert.rule.condition;

      let shouldFire = false;

      switch (condition.operator) {
        case '>':
          shouldFire = metricValue > threshold;
          break;
        case '<':
          shouldFire = metricValue < threshold;
          break;
        case '>=':
          shouldFire = metricValue >= threshold;
          break;
        case '<=':
          shouldFire = metricValue <= threshold;
          break;
        case '==':
          shouldFire = metricValue === threshold;
          break;
        case '!=':
          shouldFire = metricValue !== threshold;
          break;
      }

      if (shouldFire && alert.status === 'resolved') {
        // Fire alert
        alert.status = 'firing';
        alert.startsAt = new Date();
        alert.value = metricValue;
        alert.timestamp = new Date();

        // Execute alert actions
        await this.executeAlertActions(alert);

        this.emit('alertFired', { containerId, alert });

      } else if (!shouldFire && alert.status === 'firing') {
        // Resolve alert
        alert.status = 'resolved';
        alert.endsAt = new Date();
        alert.timestamp = new Date();

        this.emit('alertResolved', { containerId, alert });
      }
    }
  }

  private async executeAlertActions(alert: Alert): Promise<void> {
    for (const action of alert.rule.actions) {
      if (!action.enabled) continue;

      try {
        switch (action.type) {
          case 'webhook':
            await this.executeWebhookAction(alert, action);
            break;
          case 'email':
            await this.executeEmailAction(alert, action);
            break;
          case 'slack':
            await this.executeSlackAction(alert, action);
            break;
          case 'pagerduty':
            await this.executePagerDutyAction(alert, action);
            break;
          case 'custom':
            await this.executeCustomAction(alert, action);
            break;
        }
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }
  }

  private async createDefaultDashboard(containerId: string): Promise<void> {
    const dashboard: MonitoringDashboard = {
      id: `dashboard-${containerId}`,
      name: `Container Dashboard - ${containerId}`,
      containerId,
      panels: [
        {
          id: 'cpu-panel',
          title: 'CPU Usage',
          type: 'timeseries',
          queries: [
            {
              id: 'cpu-query',
              metric: 'cpu.usage',
              labels: { containerId }
            }
          ],
          visualization: {
            unit: '%',
            min: 0,
            max: 100
          },
          position: { x: 0, y: 0, width: 6, height: 4 }
        },
        {
          id: 'memory-panel',
          title: 'Memory Usage',
          type: 'timeseries',
          queries: [
            {
              id: 'memory-query',
              metric: 'memory.usage',
              labels: { containerId }
            }
          ],
          visualization: {
            unit: 'bytes'
          },
          position: { x: 6, y: 0, width: 6, height: 4 }
        }
      ],
      layout: { type: 'grid' },
      timeRange: { from: new Date(Date.now() - 3600000), to: new Date() }, // Last hour
      refreshInterval: 30,
      variables: [],
      alerts: []
    };

    this.dashboards.set(dashboard.id, dashboard);
  }

  private createEmptyMetrics(containerId: string): ContainerMetrics {
    const timestamp = new Date();
    return {
      containerId,
      containerName: `container-${containerId}`,
      timestamp,
      cpu: {
        usage: { current: 0, average: 0, peak: 0, unit: '%', timestamp },
        usageNanoCores: { current: 0, average: 0, peak: 0, unit: 'nanocores', timestamp },
        throttledTime: { current: 0, average: 0, peak: 0, unit: 'ns', timestamp },
        systemUsage: { current: 0, average: 0, peak: 0, unit: '%', timestamp },
        userUsage: { current: 0, average: 0, peak: 0, unit: '%', timestamp },
        coreCount: 1
      },
      memory: {
        usage: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        workingSet: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        rss: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        cache: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        limit: 0,
        utilization: { current: 0, average: 0, peak: 0, unit: '%', timestamp },
        pageFaults: { current: 0, average: 0, peak: 0, unit: 'count', timestamp },
        majorPageFaults: { current: 0, average: 0, peak: 0, unit: 'count', timestamp }
      },
      network: {
        interfaces: {},
        totalRxBytes: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        totalTxBytes: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        totalRxPackets: { current: 0, average: 0, peak: 0, unit: 'packets', timestamp },
        totalTxPackets: { current: 0, average: 0, peak: 0, unit: 'packets', timestamp },
        totalRxErrors: { current: 0, average: 0, peak: 0, unit: 'errors', timestamp },
        totalTxErrors: { current: 0, average: 0, peak: 0, unit: 'errors', timestamp },
        totalRxDropped: { current: 0, average: 0, peak: 0, unit: 'packets', timestamp },
        totalTxDropped: { current: 0, average: 0, peak: 0, unit: 'packets', timestamp }
      },
      disk: {
        devices: {},
        totalReadBytes: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        totalWriteBytes: { current: 0, average: 0, peak: 0, unit: 'bytes', timestamp },
        totalReadOps: { current: 0, average: 0, peak: 0, unit: 'ops', timestamp },
        totalWriteOps: { current: 0, average: 0, peak: 0, unit: 'ops', timestamp },
        totalReadTime: { current: 0, average: 0, peak: 0, unit: 'ms', timestamp },
        totalWriteTime: { current: 0, average: 0, peak: 0, unit: 'ms', timestamp }
      },
      filesystem: {
        filesystems: {},
        totalCapacity: 0,
        totalUsed: 0,
        totalAvailable: 0,
        totalUtilization: 0
      },
      process: {
        processCount: 0,
        threadCount: 0,
        fileDescriptorCount: 0,
        fileDescriptorLimit: 0,
        processes: []
      }
    };
  }

  private aggregateMetrics(containerId: string, metrics: ContainerMetrics[]): ContainerMetrics {
    if (metrics.length === 0) {
      return this.createEmptyMetrics(containerId);
    }

    // Return the latest metrics for now
    // In a real implementation, this would aggregate metrics over the time range
    return metrics[metrics.length - 1];
  }

  private async getContainerStats(containerId: string): Promise<any> {
    // Mock container stats - in real implementation, this would call Docker/Kubernetes API
    return {
      cpu: { usage: Math.random() * 100, throttledTime: 0 },
      memory: { usage: Math.random() * 1024 * 1024 * 1024, limit: 2 * 1024 * 1024 * 1024 },
      network: {
        totalRxBytes: { current: Math.random() * 1000000 },
        totalTxBytes: { current: Math.random() * 1000000 },
        totalRxPackets: { current: Math.random() * 10000 },
        totalTxPackets: { current: Math.random() * 10000 },
        totalRxErrors: { current: 0 },
        totalTxErrors: { current: 0 }
      },
      disk: {
        totalReadBytes: { current: Math.random() * 1000000 },
        totalWriteBytes: { current: Math.random() * 1000000 },
        totalReadOps: { current: Math.random() * 1000 },
        totalWriteOps: { current: Math.random() * 1000 }
      },
      filesystem: {
        totalCapacity: 10 * 1024 * 1024 * 1024,
        totalUsed: Math.random() * 5 * 1024 * 1024 * 1024,
        totalUtilization: Math.random() * 50
      }
    };
  }

  private calculateRate(metricValue: any): number {
    // Calculate rate per second - simplified implementation
    return metricValue.current || 0;
  }

  private calculateUptime(containerId: string): number {
    // Calculate container uptime in seconds - simplified implementation
    return 86400; // 24 hours
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    // Calculate overall performance score (0-100)
    let score = 100;
    
    // Deduct points for high resource utilization
    score -= metrics.performance.saturation.cpu * 0.2;
    score -= metrics.performance.saturation.memory * 0.2;
    score -= metrics.performance.saturation.disk * 0.1;
    score -= metrics.performance.saturation.network * 0.1;
    
    // Deduct points for high error rate
    score -= metrics.performance.errorRate * 0.5;
    
    // Deduct points for reliability issues
    score -= metrics.reliability.crashes * 10;
    score -= metrics.reliability.oomKills * 15;
    
    return Math.max(0, Math.min(100, score));
  }

  private parseRetentionDuration(duration: string): number {
    // Parse duration string like "7d", "24h", "30m" to milliseconds
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default to 24 hours
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };
    
    return value * (multipliers[unit as keyof typeof multipliers] || 1000);
  }

  private getMetricValue(metrics: ContainerMetrics, metricPath: string): number {
    // Extract metric value from metrics object using dot notation
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return 0;
      }
    }
    
    // If the value has a 'current' property, use that
    if (value && typeof value === 'object' && 'current' in value) {
      return value.current;
    }
    
    return typeof value === 'number' ? value : 0;
  }

  // Mock metric collection methods
  private async collectCPUMetrics(containerId: string, metrics: ContainerMetrics): Promise<void> {
    const usage = Math.random() * 100;
    metrics.cpu.usage.current = usage;
    metrics.cpu.usageNanoCores.current = usage * 10000000; // Convert to nanocores
  }

  private async collectMemoryMetrics(containerId: string, metrics: ContainerMetrics): Promise<void> {
    const usage = Math.random() * 1024 * 1024 * 1024; // Random GB
    metrics.memory.usage.current = usage;
    metrics.memory.limit = 2 * 1024 * 1024 * 1024; // 2GB limit
    metrics.memory.utilization.current = (usage / metrics.memory.limit) * 100;
  }

  private async collectNetworkMetrics(containerId: string, metrics: ContainerMetrics): Promise<void> {
    metrics.network.totalRxBytes.current = Math.random() * 1000000;
    metrics.network.totalTxBytes.current = Math.random() * 1000000;
  }

  private async collectDiskMetrics(containerId: string, metrics: ContainerMetrics): Promise<void> {
    metrics.disk.totalReadBytes.current = Math.random() * 1000000;
    metrics.disk.totalWriteBytes.current = Math.random() * 1000000;
  }

  private async collectFilesystemMetrics(containerId: string, metrics: ContainerMetrics): Promise<void> {
    metrics.filesystem.totalCapacity = 10 * 1024 * 1024 * 1024; // 10GB
    metrics.filesystem.totalUsed = Math.random() * 5 * 1024 * 1024 * 1024; // Random 0-5GB
    metrics.filesystem.totalAvailable = metrics.filesystem.totalCapacity - metrics.filesystem.totalUsed;
    metrics.filesystem.totalUtilization = (metrics.filesystem.totalUsed / metrics.filesystem.totalCapacity) * 100;
  }

  private async collectProcessMetrics(containerId: string, metrics: ContainerMetrics): Promise<void> {
    metrics.process.processCount = Math.floor(Math.random() * 50) + 1;
    metrics.process.threadCount = metrics.process.processCount * 2;
  }

  private async collectApplicationMetrics(containerId: string, metrics: ContainerMetrics): Promise<void> {
    // Mock application metrics
    metrics.application = {
      httpRequests: {
        requestsTotal: { current: Math.random() * 10000, average: 0, peak: 0, unit: 'requests', timestamp: new Date() },
        requestsPerSecond: { current: Math.random() * 100, average: 0, peak: 0, unit: 'rps', timestamp: new Date() },
        requestDuration: {
          p50: 100,
          p90: 200,
          p95: 300,
          p99: 500,
          mean: 150,
          max: 1000,
          unit: 'ms'
        },
        requestSize: { current: 1024, average: 0, peak: 0, unit: 'bytes', timestamp: new Date() },
        responseSize: { current: 2048, average: 0, peak: 0, unit: 'bytes', timestamp: new Date() },
        statusCodes: {
          '200': { current: Math.random() * 1000, average: 0, peak: 0, unit: 'count', timestamp: new Date() },
          '404': { current: Math.random() * 10, average: 0, peak: 0, unit: 'count', timestamp: new Date() },
          '500': { current: Math.random() * 5, average: 0, peak: 0, unit: 'count', timestamp: new Date() }
        },
        errorRate: { current: Math.random() * 5, average: 0, peak: 0, unit: '%', timestamp: new Date() },
        activeConnections: { current: Math.random() * 100, average: 0, peak: 0, unit: 'connections', timestamp: new Date() }
      }
    };
  }

  private async collectCustomMetrics(containerId: string, metrics: ContainerMetrics, config: MonitoringConfig): Promise<void> {
    // Collect custom metrics based on configuration
    if (config.metrics.customMetrics) {
      metrics.custom = {};
      for (const customMetric of config.metrics.customMetrics) {
        metrics.custom[customMetric.name] = {
          current: Math.random() * 100,
          average: 0,
          peak: 0,
          unit: 'custom',
          timestamp: new Date()
        };
      }
    }
  }

  // Mock alert action methods
  private async executeWebhookAction(alert: Alert, action: any): Promise<void> {
    console.log(`Executing webhook action for alert ${alert.id}`);
  }

  private async executeEmailAction(alert: Alert, action: any): Promise<void> {
    console.log(`Executing email action for alert ${alert.id}`);
  }

  private async executeSlackAction(alert: Alert, action: any): Promise<void> {
    console.log(`Executing Slack action for alert ${alert.id}`);
  }

  private async executePagerDutyAction(alert: Alert, action: any): Promise<void> {
    console.log(`Executing PagerDuty action for alert ${alert.id}`);
  }

  private async executeCustomAction(alert: Alert, action: any): Promise<void> {
    console.log(`Executing custom action for alert ${alert.id}`);
  }

  // Export methods
  private exportPrometheusMetrics(allMetrics: Record<string, ContainerMetrics[]>): string {
    let output = '';
    
    for (const [containerId, metricsList] of Object.entries(allMetrics)) {
      const latestMetrics = metricsList[metricsList.length - 1];
      if (!latestMetrics) continue;
      
      output += `# HELP container_cpu_usage_percent CPU usage percentage\n`;
      output += `# TYPE container_cpu_usage_percent gauge\n`;
      output += `container_cpu_usage_percent{container_id="${containerId}"} ${latestMetrics.cpu.usage.current}\n\n`;
      
      output += `# HELP container_memory_usage_bytes Memory usage in bytes\n`;
      output += `# TYPE container_memory_usage_bytes gauge\n`;
      output += `container_memory_usage_bytes{container_id="${containerId}"} ${latestMetrics.memory.usage.current}\n\n`;
    }
    
    return output;
  }

  private exportCSVMetrics(allMetrics: Record<string, ContainerMetrics[]>): string {
    let csv = 'timestamp,container_id,cpu_usage,memory_usage,network_rx_bytes,network_tx_bytes\n';
    
    for (const [containerId, metricsList] of Object.entries(allMetrics)) {
      for (const metrics of metricsList) {
        csv += `${metrics.timestamp.toISOString()},${containerId},${metrics.cpu.usage.current},${metrics.memory.usage.current},${metrics.network.totalRxBytes.current},${metrics.network.totalTxBytes.current}\n`;
      }
    }
    
    return csv;
  }
}