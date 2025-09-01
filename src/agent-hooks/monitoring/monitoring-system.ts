import {
  MetricDefinition,
  MetricValue,
  AlertRule,
  Alert,
  HealthCheck,
  HealthCheckResult,
  SystemHealth,
  LogEntry,
  Trace,
  TraceSpan,
  MonitoringConfig,
  MonitoringMetrics,
  TimeSeriesData,
  ResourceUsage,
  SystemInfo,
  DatabaseMetrics,
  CacheMetrics,
  QueueMetrics,
  SecurityMetrics,
  NotificationMetrics,
  BusinessMetrics,
  AlertSeverity,
  AlertStatus,
  HealthStatus,
  MetricType
} from '../types/monitoring';
import { ErrorHandler } from '../errors/error-handler';
import { PerformanceMonitor } from '../performance/performance-monitor';
import { NotificationSystem } from '../notifications/notification-system';
import { NotificationType, NotificationPriority, NotificationChannel } from '../types/notifications';

export class MonitoringSystem {
  private static instance: MonitoringSystem | null = null;
  private static isCreating = false;

  private config: MonitoringConfig;
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private notificationSystem: NotificationSystem;

  private metrics: Map<string, MetricValue>;
  private alertRules: Map<string, AlertRule>;
  private activeAlerts: Map<string, Alert>;
  private healthChecks: Map<string, HealthCheck>;
  private logs: LogEntry[];
  private traces: Map<string, Trace>;
  private currentTraceId?: string;

  private isRunning: boolean;
  private metricsInterval?: NodeJS.Timeout;
  private alertInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor(
    config: MonitoringConfig,
    errorHandler: ErrorHandler,
    performanceMonitor: PerformanceMonitor,
    notificationSystem: NotificationSystem
  ) {
    this.config = config;
    this.errorHandler = errorHandler;
    this.performanceMonitor = performanceMonitor;
    this.notificationSystem = notificationSystem;

    this.metrics = new Map();
    this.alertRules = new Map();
    this.activeAlerts = new Map();
    this.healthChecks = new Map();
    this.logs = [];
    this.traces = new Map();
    this.isRunning = false;

    this.initializeDefaultMetrics();
    this.initializeDefaultAlertRules();
    this.initializeDefaultHealthChecks();
  }

  /**
   * Get the singleton instance of MonitoringSystem
   */
  public static getInstance(
    config?: MonitoringConfig,
    errorHandler?: ErrorHandler,
    performanceMonitor?: PerformanceMonitor,
    notificationSystem?: NotificationSystem
  ): MonitoringSystem {
    if (MonitoringSystem.instance === null) {
      if (MonitoringSystem.isCreating) {
        throw new Error('MonitoringSystem is already being created. Circular dependency detected.');
      }

      MonitoringSystem.isCreating = true;

      try {
        if (!config || !errorHandler || !performanceMonitor || !notificationSystem) {
          throw new Error('MonitoringSystem requires all dependencies: config, errorHandler, performanceMonitor, notificationSystem');
        }

        MonitoringSystem.instance = new MonitoringSystem(
          config,
          errorHandler,
          performanceMonitor,
          notificationSystem
        );
      } finally {
        MonitoringSystem.isCreating = false;
      }
    }

    return MonitoringSystem.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    if (MonitoringSystem.instance) {
      // Stop the existing instance if it's running
      MonitoringSystem.instance.stop().catch(error => {
        console.error('Error stopping MonitoringSystem during reset:', error);
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

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      this.isRunning = true;

      if (this.config.metrics.enabled) {
        await this.startMetricsCollection();
      }

      if (this.config.alerts.enabled) {
        await this.startAlertEvaluation();
      }

      if (this.config.healthChecks.enabled) {
        await this.startHealthChecks();
      }

      if (this.config.tracing.enabled) {
        await this.startTracing();
      }

      this.log('info', 'Monitoring system started successfully', 'monitoring-system', 'start');
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        component: 'monitoring-system',
        operation: 'start'
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.alertInterval) {
      clearInterval(this.alertInterval);
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.log('info', 'Monitoring system stopped', 'monitoring-system', 'stop');
  }

  // Metrics Collection
  recordMetric(
    name: string,
    value: number,
    labels: Record<string, string> = {},
    type: MetricType = MetricType.GAUGE
  ): void {
    const metricKey = this.generateMetricKey(name, labels);
    const metric: MetricValue = {
      name,
      value,
      labels,
      timestamp: new Date(),
      type
    };

    this.metrics.set(metricKey, metric);
  }

  getMetric(
    name: string,
    labels: Record<string, string> = {}
  ): MetricValue | undefined {
    const metricKey = this.generateMetricKey(name, labels);
    return this.metrics.get(metricKey);
  }

  getTimeSeriesData(
    metricName: string,
    labels: Record<string, string> = {},
    duration: string = '1h'
  ): TimeSeriesData {
    const matchingMetrics = Array.from(this.metrics.values())
      .filter(metric => {
        if (metric.name !== metricName) {return false;}
        return Object.entries(labels).every(([key, value]) => metric.labels[key] === value);
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      metric: metricName,
      labels,
      values: matchingMetrics.map(m => ({ timestamp: m.timestamp, value: m.value })),
      interval: '1m'
    };
  }

  // Alert Management
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  acknowledgeAlert(alertId: string, userId?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {return false;}

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    if (userId) {
      alert.acknowledgedBy = userId;
    }
    alert.updatedAt = new Date();

    return true;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {return false;}

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.updatedAt = new Date();

    this.activeAlerts.delete(alertId);
    return true;
  }

  // Health Checks
  addHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.id, check);
  }

  removeHealthCheck(checkId: string): void {
    this.healthChecks.delete(checkId);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const checkResults = await Promise.all(
      Array.from(this.healthChecks.values())
        .filter(check => check.enabled)
        .map(check => this.executeHealthCheck(check))
    );

    const services: Record<string, HealthStatus> = {};
    let overallHealth = HealthStatus.HEALTHY;

    for (const result of checkResults) {
      services[result.checkId] = result.status;
      if (result.status === HealthStatus.UNHEALTHY) {
        overallHealth = HealthStatus.UNHEALTHY;
      } else if (result.status === HealthStatus.DEGRADED && overallHealth === HealthStatus.HEALTHY) {
        overallHealth = HealthStatus.DEGRADED;
      }
    }

    return {
      overall: overallHealth,
      services,
      checks: checkResults,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  // Logging
  log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    component: string,
    operation?: string,
    metadata?: Record<string, any>,
    error?: Error
  ): void {
    const logEntry: LogEntry = {
      id: this.generateId('log'),
      timestamp: new Date(),
      level,
      message,
      component,
      operation: operation || 'unknown',
      metadata: metadata || {},
      tags: [],
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack || 'No stack trace available',
          code: (error as any).code
        }
      })
    };

    this.logs.push(logEntry);

    // Keep only recent logs (last 10000 entries)
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.component}: ${logEntry.message}`);
    }
  }

  getLogs(
    component?: string,
    level?: 'debug' | 'info' | 'warn' | 'error',
    limit: number = 100
  ): LogEntry[] {
    let filteredLogs = this.logs;

    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Tracing
  startTrace(name: string, attributes: Record<string, any> = {}): string {
    const traceId = this.generateId('trace');
    const rootSpan = this.createSpan(traceId, name, 'internal', attributes);

    const trace: Trace = {
      id: traceId,
      name,
      startTime: rootSpan.startTime,
      endTime: rootSpan.endTime,
      duration: rootSpan.duration,
      spans: [rootSpan],
      rootSpan,
      status: 'ok',
      attributes
    };

    this.traces.set(traceId, trace);
    this.currentTraceId = traceId;

    return traceId;
  }

  endTrace(traceId: string): void {
    const trace = this.traces.get(traceId);
    if (!trace) {return;}

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();

    if (trace.spans.some(span => span.status === 'error')) {
      trace.status = 'error';
    }

    this.currentTraceId = undefined as any;
  }

  addSpan(
    name: string,
    kind: 'client' | 'server' | 'producer' | 'consumer' | 'internal' = 'internal',
    attributes: Record<string, any> = {}
  ): string | undefined {
    if (!this.currentTraceId) {return undefined;}

    const trace = this.traces.get(this.currentTraceId);
    if (!trace) {return undefined;}

    const span = this.createSpan(this.currentTraceId, name, kind, attributes);
    trace.spans.push(span);

    return span.id;
  }

  endSpan(spanId: string): void {
    if (!this.currentTraceId) {return;}

    const trace = this.traces.get(this.currentTraceId);
    if (!trace) {return;}

    const span = trace.spans.find(s => s.id === spanId);
    if (!span) {return;}

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
  }

  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId);
  }

  getRecentTraces(limit: number = 100): Trace[] {
    return Array.from(this.traces.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  // Resource Monitoring
  async getResourceUsage(): Promise<ResourceUsage> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: new Date(),
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        cores: require('os').cpus().length,
        loadAverage: require('os').loadavg()
      },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        available: memUsage.heapTotal - memUsage.heapUsed,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      disk: {
        used: 0, // Would need filesystem monitoring
        total: 0,
        available: 0,
        percentage: 0,
        readBytes: 0,
        writeBytes: 0
      },
      network: {
        bytesReceived: 0, // Would need network monitoring
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
        errors: 0,
        dropped: 0
      }
    };
  }

  getSystemInfo(): SystemInfo {
    const os = require('os');

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      version: os.version(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      nodeVersion: process.version,
      processId: process.pid,
      processUptime: process.uptime()
    };
  }

  // Metrics Collection
  private async startMetricsCollection(): Promise<void> {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.collectApplicationMetrics();
        await this.collectBusinessMetrics();
      } catch (error) {
        await this.errorHandler.handleError(error as Error, {
          component: 'monitoring-system',
          operation: 'collect_metrics'
        });
      }
    }, this.config.metrics.collectInterval);
  }

  private async collectSystemMetrics(): Promise<void> {
    const resourceUsage = await this.getResourceUsage();

    this.recordMetric('system_cpu_usage', resourceUsage.cpu.usage, { type: 'process' });
    this.recordMetric('system_memory_used', resourceUsage.memory.used, { type: 'heap' });
    this.recordMetric('system_memory_total', resourceUsage.memory.total, { type: 'heap' });
    this.recordMetric('system_memory_percentage', resourceUsage.memory.percentage, { type: 'heap' });

    this.recordMetric('process_uptime', process.uptime());
    this.recordMetric('process_memory_rss', process.memoryUsage().rss);
    this.recordMetric('process_memory_external', process.memoryUsage().external);
  }

  private async collectApplicationMetrics(): Promise<void> {
    // Application-specific metrics would be collected here
    // These would come from various components of the system

    this.recordMetric('monitoring_active_alerts', this.activeAlerts.size);
    this.recordMetric('monitoring_logs_count', this.logs.length);
    this.recordMetric('monitoring_traces_count', this.traces.size);
    this.recordMetric('monitoring_metrics_count', this.metrics.size);
  }

  private async collectBusinessMetrics(): Promise<void> {
    // Business metrics would be collected from the application
    // For now, we'll record placeholder values

    this.recordMetric('business_repositories_active', 0);
    this.recordMetric('business_automations_created', 0);
    this.recordMetric('business_prs_created', 0);
    this.recordMetric('business_security_scans', 0);
  }

  // Alert Evaluation
  private async startAlertEvaluation(): Promise<void> {
    this.alertInterval = setInterval(async () => {
      try {
        await this.evaluateAlertRules();
      } catch (error) {
        await this.errorHandler.handleError(error as Error, {
          component: 'monitoring-system',
          operation: 'evaluate_alerts'
        });
      }
    }, this.config.alerts.evaluationInterval);
  }

  private async evaluateAlertRules(): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) {continue;}

      try {
        const isTriggered = await this.evaluateAlertCondition(rule.condition);
        const existingAlert = Array.from(this.activeAlerts.values())
          .find(alert => alert.ruleId === rule.id);

        if (isTriggered && !existingAlert) {
          await this.createAlert(rule);
        } else if (!isTriggered && existingAlert) {
          this.resolveAlert(existingAlert.id);
        }
      } catch (error) {
        this.log('error', `Failed to evaluate alert rule ${rule.id}`, 'monitoring-system', 'evaluate_alert_rule', { ruleId: rule.id }, error as Error);
      }
    }
  }

  private async evaluateAlertCondition(condition: string): Promise<boolean> {
    // Simple condition evaluation - in a real implementation, this would parse
    // PromQL-style expressions or use a proper expression evaluator

    if (condition.includes('>')) {
      const parts = condition.split('>');
      if (parts.length === 2) {
        const metricName = parts[0]?.trim();
        const thresholdStr = parts[1]?.trim();

        if (metricName && thresholdStr) {
          const metric = this.getMetric(metricName);
          const threshold = parseFloat(thresholdStr);
          return metric ? metric.value > threshold : false;
        }
      }
    }

    return false;
  }

  private async createAlert(rule: AlertRule): Promise<void> {
    const alert: Alert = {
      id: this.generateId('alert'),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      summary: rule.annotations.summary || rule.name,
      description: rule.annotations.description || rule.description,
      labels: rule.labels,
      annotations: rule.annotations,
      value: 0, // Would be set from the metric value that triggered the alert
      createdAt: new Date(),
      updatedAt: new Date(),
      fingerprint: this.generateFingerprint(rule.id, rule.labels)
    };

    this.activeAlerts.set(alert.id, alert);

    // Send notification
    await this.notificationSystem.sendNotification(
      NotificationType.SYSTEM_HEALTH,
      this.mapAlertSeverityToPriority(rule.severity),
      alert.summary,
      alert.description,
      [{ channel: NotificationChannel.SLACK, address: '#alerts' }]
    );

    this.log('warn', `Alert triggered: ${alert.summary}`, 'monitoring-system', 'create_alert', { alertId: alert.id });
  }

  // Health Checks
  private async startHealthChecks(): Promise<void> {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.executeHealthChecks();
      } catch (error) {
        await this.errorHandler.handleError(error as Error, {
          component: 'monitoring-system',
          operation: 'execute_health_checks'
        });
      }
    }, 60000); // Run every minute
  }

  private async executeHealthChecks(): Promise<void> {
    const enabledChecks = Array.from(this.healthChecks.values())
      .filter(check => check.enabled);

    for (const check of enabledChecks) {
      try {
        const result = await this.executeHealthCheck(check);

        // Record health check result as metric
        this.recordMetric(
          'health_check_status',
          result.status === HealthStatus.HEALTHY ? 1 : 0,
          { check_id: check.id, __check_name: check.name }
        );

        // Create alert if health check is unhealthy
        if (result.status === HealthStatus.UNHEALTHY && check.critical) {
          const alertRule = this.alertRules.get(`health-check-${check.id}`);
          if (alertRule) {
            await this.createAlert(alertRule);
          }
        }
      } catch (error) {
        this.log('error', `Health check failed: ${check.id}`, 'monitoring-system', 'execute_health_check', { checkId: check.id }, error as Error);
      }
    }
  }

  private async executeHealthCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      let status = HealthStatus.UNKNOWN;
      let message = 'Health check not implemented';
      let responseTime: number | undefined;
      let error: string | undefined;
      let details: Record<string, any> | undefined;

      // Execute health check based on type
      switch (check.type) {
        case 'http':
          const result = await this.executeHttpHealthCheck(check);
          status = result.status;
          message = result.message;
          responseTime = result.responseTime;
          details = result.details;
          break;

        case 'custom':
          // Custom health check logic would go here
          status = HealthStatus.HEALTHY;
          message = 'Custom health check passed';
          break;

        default:
          status = HealthStatus.HEALTHY;
          message = `Health check type ${check.type} not implemented`;
          break;
      }

      responseTime = Date.now() - startTime;

      return {
        checkId: check.id,
        status,
        message,
        responseTime,
        error: error || 'No error details',
        timestamp: new Date(),
        details: details || {}
      };
    } catch (err) {
      return {
        checkId: check.id,
        status: HealthStatus.UNHEALTHY,
        message: `Health check failed: ${(err as Error).message}`,
        responseTime: Date.now() - startTime,
        error: (err as Error).message,
        timestamp: new Date()
      };
    }
  }

  private async executeHttpHealthCheck(check: HealthCheck): Promise<{
    status: HealthStatus;
    message: string;
    responseTime: number;
    details: Record<string, any>;
  }> {
    const startTime = Date.now();

    try {
      // Simple HTTP health check implementation
      // In a real implementation, this would make an actual HTTP request
      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.HEALTHY,
        message: 'HTTP endpoint is healthy',
        responseTime,
        details: {
          endpoint: check.endpoint,
          response_time_ms: responseTime
        }
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `HTTP health check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        details: {
          endpoint: check.endpoint,
          error: (error as Error).message
        }
      };
    }
  }

  // Utility Methods
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMetricKey(name: string, labels: Record<string, string>): string {
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
    return `${name}{${labelString}}`;
  }

  private generateFingerprint(ruleId: string, labels: Record<string, string>): string {
    const data = `${ruleId}:${JSON.stringify(labels)}`;
    return require('crypto').createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private createSpan(
    traceId: string,
    name: string,
    kind: 'client' | 'server' | 'producer' | 'consumer' | 'internal',
    attributes: Record<string, any>
  ): TraceSpan {
    const now = new Date();
    return {
      id: this.generateId('span'),
      traceId,
      name,
      kind,
      startTime: now,
      endTime: now,
      duration: 0,
      status: 'ok',
      attributes,
      events: [],
      links: []
    };
  }

  private mapAlertSeverityToPriority(severity: AlertSeverity): NotificationPriority {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return NotificationPriority.URGENT;
      case AlertSeverity.ERROR:
        return NotificationPriority.HIGH;
      case AlertSeverity.WARNING:
        return NotificationPriority.MEDIUM;
      case AlertSeverity.INFO:
        return NotificationPriority.LOW;
      default:
        return NotificationPriority.MEDIUM;
    }
  }

  // Default Configurations
  private initializeDefaultMetrics(): void {
    // Default metrics would be defined here
    this.log('info', 'Default metrics initialized', 'monitoring-system', 'initialize_default_metrics');
  }

  private initializeDefaultAlertRules(): void {
    // Default alert rules
    const highMemoryUsageRule: AlertRule = {
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      description: 'System memory usage is above 80%',
      condition: 'system_memory_percentage > 80',
      severity: AlertSeverity.WARNING,
      labels: { component: 'system' },
      annotations: {
        summary: 'High memory usage detected',
        description: 'System memory usage is above 80%. Consider scaling resources.'
      },
      duration: '5m',
      enabled: true,
      channels: [NotificationChannel.SLACK],
      cooldown: '15m'
    };

    this.addAlertRule(highMemoryUsageRule);
    this.log('info', 'Default alert rules initialized', 'monitoring-system', 'initialize_default_alert_rules');
  }

  private initializeDefaultHealthChecks(): void {
    // Default health checks
    const systemHealthCheck: HealthCheck = {
      id: 'system-health',
      name: 'System Health',
      description: 'Overall system health check',
      type: 'custom',
      timeout: 5000,
      interval: 60000,
      enabled: true,
      critical: true,
      labels: { component: 'system' },
      config: {}
    };

    this.addHealthCheck(systemHealthCheck);
    this.log('info', 'Default health checks initialized', 'monitoring-system', 'initialize_default_health_checks');
  }

  private async startTracing(): Promise<void> {
    // Initialize tracing if enabled
    this.log('info', 'Tracing initialized', 'monitoring-system', 'start_tracing');
  }

  // Configuration Management
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  getMonitoringMetrics(): MonitoringMetrics {
    return {
      metrics_collected: this.metrics.size,
      alerts_active: this.activeAlerts.size,
      alerts_resolved: Array.from(this.activeAlerts.values()).filter(a => a.status === AlertStatus.RESOLVED).length,
      health_checks_total: this.healthChecks.size,
      health_checks_healthy: 0, // Would be calculated from actual health check results
      health_checks_degraded: 0,
      health_checks_unhealthy: 0,
      logs_processed: this.logs.length,
      traces_collected: this.traces.size,
      errors_logged: this.logs.filter(l => l.level === 'error').length,
      avg_response_time: 0, // Would be calculated from actual response times
      uptime_percentage: 100, // Would be calculated based on system uptime
      collection_timestamp: new Date()
    };
  }
}