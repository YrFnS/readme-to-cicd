/**
 * Core monitoring system implementation
 * Orchestrates metrics collection, logging, tracing, and alerting
 */

import {
  MonitoringSystem,
  ObservabilityStack,
  Metric,
  MetricQuery,
  MetricResult,
  AlertDefinition,
  Notification,
  ReportDefinition,
  Report,
  HealthStatus,
  TimeRange
} from './types.js'
import { PrometheusMetricsCollector } from './metrics/prometheus-collector.js'
import { ELKLogAggregator } from './logging/elk-aggregator.js'
import { JaegerDistributedTracer } from './tracing/jaeger-tracer.js'
import { IntelligentAlertManager } from './alerting/alert-manager.js'
import { GrafanaDashboardManager } from './dashboards/dashboard-manager.js'

export class ComprehensiveMonitoringSystem implements MonitoringSystem {
  private observabilityStack: ObservabilityStack
  private isInitialized = false

  constructor(config: MonitoringConfig) {
    this.observabilityStack = {
      metrics: new PrometheusMetricsCollector(config.prometheus),
      logging: new ELKLogAggregator(config.elk),
      tracing: new JaegerDistributedTracer(config.jaeger),
      alerting: new IntelligentAlertManager(config.alerting),
      dashboards: new GrafanaDashboardManager(config.grafana)
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Initialize all observability components
      await Promise.all([
        this.observabilityStack.metrics.initialize(),
        this.observabilityStack.logging.initialize(),
        this.observabilityStack.tracing.initialize(),
        this.observabilityStack.alerting.initialize(),
        this.observabilityStack.dashboards.initialize()
      ])

      // Set up cross-component integrations
      await this.setupIntegrations()

      this.isInitialized = true
    } catch (error) {
      throw new MonitoringError('Failed to initialize monitoring system', { cause: error })
    }
  }

  async collectMetrics(source: string, metrics: Metric[]): Promise<void> {
    if (!this.isInitialized) {
      throw new MonitoringError('Monitoring system not initialized')
    }

    try {
      // Collect metrics through Prometheus
      await this.observabilityStack.metrics.collectMetrics(source, metrics)

      // Log metric collection event
      await this.observabilityStack.logging.logEvent({
        level: 'info',
        message: `Collected ${metrics.length} metrics from ${source}`,
        component: 'monitoring-system',
        metadata: {
          source,
          metricCount: metrics.length,
          metricNames: metrics.map(m => m.name)
        }
      })
    } catch (error) {
      await this.handleError('collectMetrics', error, { source, metricCount: metrics.length })
      throw error
    }
  }

  async queryMetrics(query: MetricQuery): Promise<MetricResult[]> {
    if (!this.isInitialized) {
      throw new MonitoringError('Monitoring system not initialized')
    }

    try {
      const results = await this.observabilityStack.metrics.queryMetrics(query)

      // Log query execution
      await this.observabilityStack.logging.logEvent({
        level: 'debug',
        message: `Executed metric query for ${query.metric}`,
        component: 'monitoring-system',
        metadata: {
          query,
          resultCount: results.length
        }
      })

      return results
    } catch (error) {
      await this.handleError('queryMetrics', error, { query })
      throw error
    }
  }

  async createAlert(alert: AlertDefinition): Promise<string> {
    if (!this.isInitialized) {
      throw new MonitoringError('Monitoring system not initialized')
    }

    try {
      const alertId = await this.observabilityStack.alerting.createAlert(alert)

      // Log alert creation
      await this.observabilityStack.logging.logEvent({
        level: 'info',
        message: `Created alert: ${alert.name}`,
        component: 'monitoring-system',
        metadata: {
          alertId,
          alertName: alert.name,
          severity: alert.severity
        }
      })

      return alertId
    } catch (error) {
      await this.handleError('createAlert', error, { alertName: alert.name })
      throw error
    }
  }

  async sendNotification(notification: Notification): Promise<void> {
    if (!this.isInitialized) {
      throw new MonitoringError('Monitoring system not initialized')
    }

    try {
      await this.observabilityStack.alerting.sendNotification(notification)

      // Log notification sending
      await this.observabilityStack.logging.logEvent({
        level: 'info',
        message: `Sent notification: ${notification.title}`,
        component: 'monitoring-system',
        metadata: {
          notificationId: notification.id,
          type: notification.type,
          severity: notification.severity,
          channels: notification.channels.map(c => c.type)
        }
      })
    } catch (error) {
      await this.handleError('sendNotification', error, { 
        notificationId: notification.id,
        title: notification.title 
      })
      throw error
    }
  }

  async generateReport(report: ReportDefinition): Promise<Report> {
    if (!this.isInitialized) {
      throw new MonitoringError('Monitoring system not initialized')
    }

    try {
      // Generate report using metrics and logging data
      const reportData = await this.collectReportData(report)
      const generatedReport = await this.formatReport(report, reportData)

      // Log report generation
      await this.observabilityStack.logging.logEvent({
        level: 'info',
        message: `Generated report: ${report.name}`,
        component: 'monitoring-system',
        metadata: {
          reportId: generatedReport.id,
          reportType: report.type,
          timeRange: report.parameters.timeRange
        }
      })

      return generatedReport
    } catch (error) {
      await this.handleError('generateReport', error, { reportName: report.name })
      throw error
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkComponentHealth('metrics', () => this.observabilityStack.metrics.healthCheck()),
      this.checkComponentHealth('logging', () => this.observabilityStack.logging.healthCheck()),
      this.checkComponentHealth('tracing', () => this.observabilityStack.tracing.healthCheck()),
      this.checkComponentHealth('alerting', () => this.observabilityStack.alerting.healthCheck()),
      this.checkComponentHealth('dashboards', () => this.observabilityStack.dashboards.healthCheck())
    ])

    const healthChecks = checks.map((result, index) => {
      const componentNames = ['metrics', 'logging', 'tracing', 'alerting', 'dashboards']
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          name: componentNames[index],
          status: 'fail' as const,
          message: result.reason?.message || 'Health check failed',
          duration: 0
        }
      }
    })

    const overallStatus = healthChecks.every(check => check.status === 'pass') 
      ? 'healthy' 
      : healthChecks.some(check => check.status === 'pass')
        ? 'degraded'
        : 'unhealthy'

    return {
      status: overallStatus,
      checks: healthChecks,
      lastUpdated: new Date()
    }
  }

  private async setupIntegrations(): Promise<void> {
    // Configure tracing integration with logging
    this.observabilityStack.tracing.onSpanFinished((span) => {
      this.observabilityStack.logging.logEvent({
        level: 'debug',
        message: `Span completed: ${span.operationName}`,
        component: 'distributed-tracing',
        traceId: span.traceId,
        spanId: span.spanId,
        metadata: {
          duration: span.duration,
          tags: span.tags
        }
      })
    })

    // Configure alerting integration with metrics
    this.observabilityStack.alerting.onAlertTriggered(async (alert, context) => {
      await this.observabilityStack.metrics.incrementCounter('alerts_triggered_total', {
        severity: alert.severity,
        alert_name: alert.name
      })
    })

    // Configure dashboard integration with metrics
    this.observabilityStack.dashboards.setMetricsProvider(this.observabilityStack.metrics)
  }

  private async checkComponentHealth(name: string, healthCheck: () => Promise<any>): Promise<any> {
    const startTime = Date.now()
    try {
      await healthCheck()
      return {
        name,
        status: 'pass' as const,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        name,
        status: 'fail' as const,
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      }
    }
  }

  private async collectReportData(report: ReportDefinition): Promise<any> {
    const { timeRange, metrics: metricNames } = report.parameters

    // Collect metrics data
    const metricsData = await Promise.all(
      metricNames.map(async (metricName) => {
        const query: MetricQuery = {
          metric: metricName,
          timeRange,
          aggregation: 'avg'
        }
        return this.queryMetrics(query)
      })
    )

    // Collect log data if needed
    const logData = report.type === 'security' || report.type === 'custom'
      ? await this.observabilityStack.logging.queryLogs({
          timeRange,
          level: 'error'
        })
      : []

    return {
      metrics: metricsData.flat(),
      logs: logData,
      timeRange
    }
  }

  private async formatReport(definition: ReportDefinition, data: any): Promise<Report> {
    // Calculate summary statistics
    const summary = {
      totalRequests: this.calculateTotalRequests(data.metrics),
      averageResponseTime: this.calculateAverageResponseTime(data.metrics),
      errorRate: this.calculateErrorRate(data.metrics, data.logs),
      uptime: this.calculateUptime(data.metrics),
      slaCompliance: this.calculateSLACompliance(data.metrics)
    }

    return {
      id: `report_${Date.now()}`,
      name: definition.name,
      type: definition.type,
      generatedAt: new Date(),
      timeRange: definition.parameters.timeRange,
      format: definition.parameters.format,
      data: {
        summary,
        metrics: data.metrics,
        charts: this.generateCharts(data.metrics),
        tables: this.generateTables(data.metrics, data.logs)
      }
    }
  }

  private calculateTotalRequests(metrics: MetricResult[]): number {
    const requestMetrics = metrics.filter(m => m.metric.includes('requests_total'))
    return requestMetrics.reduce((sum, metric) => {
      return sum + metric.values.reduce((valueSum, value) => valueSum + value.value, 0)
    }, 0)
  }

  private calculateAverageResponseTime(metrics: MetricResult[]): number {
    const responseTimeMetrics = metrics.filter(m => m.metric.includes('response_time'))
    if (responseTimeMetrics.length === 0) return 0

    const totalTime = responseTimeMetrics.reduce((sum, metric) => {
      return sum + metric.values.reduce((valueSum, value) => valueSum + value.value, 0)
    }, 0)

    const totalCount = responseTimeMetrics.reduce((sum, metric) => sum + metric.values.length, 0)
    return totalCount > 0 ? totalTime / totalCount : 0
  }

  private calculateErrorRate(metrics: MetricResult[], logs: any[]): number {
    const errorMetrics = metrics.filter(m => m.metric.includes('errors_total'))
    const totalErrors = errorMetrics.reduce((sum, metric) => {
      return sum + metric.values.reduce((valueSum, value) => valueSum + value.value, 0)
    }, 0)

    const totalRequests = this.calculateTotalRequests(metrics)
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
  }

  private calculateUptime(metrics: MetricResult[]): number {
    // Simplified uptime calculation based on health check metrics
    const uptimeMetrics = metrics.filter(m => m.metric.includes('uptime'))
    if (uptimeMetrics.length === 0) return 99.9 // Default assumption

    const latestUptime = uptimeMetrics[0]?.values[uptimeMetrics[0].values.length - 1]?.value
    return latestUptime || 99.9
  }

  private calculateSLACompliance(metrics: MetricResult[]): number {
    // Simplified SLA compliance calculation
    const responseTimeMetrics = metrics.filter(m => m.metric.includes('response_time'))
    if (responseTimeMetrics.length === 0) return 100

    const slaThreshold = 2000 // 2 seconds
    const compliantRequests = responseTimeMetrics.reduce((sum, metric) => {
      return sum + metric.values.filter(value => value.value <= slaThreshold).length
    }, 0)

    const totalRequests = responseTimeMetrics.reduce((sum, metric) => sum + metric.values.length, 0)
    return totalRequests > 0 ? (compliantRequests / totalRequests) * 100 : 100
  }

  private generateCharts(metrics: MetricResult[]): any[] {
    return [
      {
        title: 'Response Time Trend',
        type: 'line',
        data: metrics.filter(m => m.metric.includes('response_time')),
        config: { yAxis: 'Response Time (ms)', xAxis: 'Time' }
      },
      {
        title: 'Request Volume',
        type: 'bar',
        data: metrics.filter(m => m.metric.includes('requests_total')),
        config: { yAxis: 'Requests', xAxis: 'Time' }
      }
    ]
  }

  private generateTables(metrics: MetricResult[], logs: any[]): any[] {
    return [
      {
        title: 'Top Metrics',
        headers: ['Metric', 'Current Value', 'Average', 'Peak'],
        rows: metrics.slice(0, 10).map(metric => [
          metric.metric,
          metric.values[metric.values.length - 1]?.value || 0,
          metric.values.reduce((sum, v) => sum + v.value, 0) / metric.values.length,
          Math.max(...metric.values.map(v => v.value))
        ])
      }
    ]
  }

  private async handleError(operation: string, error: any, context: any): Promise<void> {
    try {
      await this.observabilityStack.logging.logEvent({
        level: 'error',
        message: `Monitoring system error in ${operation}`,
        component: 'monitoring-system',
        metadata: {
          operation,
          error: error.message,
          context
        }
      })

      // Increment error counter
      await this.observabilityStack.metrics.incrementCounter('monitoring_errors_total', {
        operation,
        error_type: error.constructor.name
      })
    } catch (loggingError) {
      // If logging fails, at least log to console
      console.error('Failed to log monitoring error:', loggingError)
      console.error('Original error:', error)
    }
  }
}

export interface MonitoringConfig {
  prometheus: PrometheusConfig
  elk: ELKConfig
  jaeger: JaegerConfig
  alerting: AlertingConfig
  grafana: GrafanaConfig
}

export interface PrometheusConfig {
  endpoint: string
  pushGateway?: string
  scrapeInterval: number
  retentionTime: string
  authentication?: {
    username: string
    password: string
  }
}

export interface ELKConfig {
  elasticsearch: {
    hosts: string[]
    username?: string
    password?: string
    apiKey?: string
  }
  logstash?: {
    host: string
    port: number
  }
  kibana?: {
    host: string
    port: number
  }
  indexPattern: string
}

export interface JaegerConfig {
  endpoint: string
  serviceName: string
  sampler: {
    type: 'const' | 'probabilistic' | 'ratelimiting'
    param: number
  }
  reporter: {
    logSpans: boolean
    flushInterval: number
  }
}

export interface AlertingConfig {
  evaluationInterval: number
  notificationChannels: NotificationChannelConfig[]
  escalationPolicies: EscalationPolicyConfig[]
}

export interface NotificationChannelConfig {
  type: string
  name: string
  config: Record<string, any>
  enabled: boolean
}

export interface EscalationPolicyConfig {
  name: string
  levels: {
    delay: number
    channels: string[]
  }[]
}

export interface GrafanaConfig {
  host: string
  port: number
  apiKey: string
  datasources: {
    prometheus: string
    elasticsearch: string
    jaeger: string
  }
}

export class MonitoringError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message)
    this.name = 'MonitoringError'
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}