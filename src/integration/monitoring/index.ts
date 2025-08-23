/**
 * Comprehensive monitoring system exports
 * Provides unified access to all monitoring components
 */

// Core monitoring system
export { ComprehensiveMonitoringSystem } from './monitoring-system.js'
export type { 
  MonitoringConfig,
  PrometheusConfig,
  ELKConfig,
  JaegerConfig,
  AlertingConfig,
  GrafanaConfig
} from './monitoring-system.js'

// Types and interfaces
export type {
  MonitoringSystem,
  ObservabilityStack,
  Metric,
  MetricQuery,
  MetricResult,
  MetricType,
  LogEntry,
  LogLevel,
  LogQuery,
  Trace,
  Span,
  SpanLog,
  AlertDefinition,
  AlertSeverity,
  AlertCondition,
  AlertContext,
  ActiveAlert,
  AlertStatus,
  Notification,
  NotificationChannel,
  NotificationType,
  ChannelType,
  EscalationPolicy,
  EscalationLevel,
  PerformanceMetrics,
  SLADefinition,
  SLATarget,
  Dashboard,
  DashboardPanel,
  RenderedDashboard,
  RenderedPanel,
  ReportDefinition,
  Report,
  ReportType,
  ReportFrequency,
  ReportFormat,
  HealthStatus,
  HealthCheck,
  TimeRange,
  MetricsCollector,
  SystemMetrics,
  ApplicationMetrics,
  BusinessMetrics,
  CustomMetrics,
  LogAggregator,
  DistributedTracer,
  AlertManager,
  DashboardManager
} from './types.js'

// Component implementations
export { PrometheusMetricsCollector } from './metrics/prometheus-collector.js'
export { ELKLogAggregator } from './logging/elk-aggregator.js'
export { JaegerDistributedTracer, instrumentFunction, instrumentAsyncFunction } from './tracing/jaeger-tracer.js'
export { IntelligentAlertManager } from './alerting/alert-manager.js'
export { GrafanaDashboardManager } from './dashboards/dashboard-manager.js'

// Error classes
export { MonitoringError } from './monitoring-system.js'
export { PrometheusError } from './metrics/prometheus-collector.js'
export { ELKError } from './logging/elk-aggregator.js'
export { JaegerError } from './tracing/jaeger-tracer.js'
export { AlertManagerError } from './alerting/alert-manager.js'
export { DashboardManagerError } from './dashboards/dashboard-manager.js'

// Utility functions and constants
export const DEFAULT_MONITORING_CONFIG = {
  prometheus: {
    endpoint: 'http://localhost:9090',
    scrapeInterval: 15000,
    retentionTime: '15d'
  },
  elk: {
    elasticsearch: {
      hosts: ['http://localhost:9200']
    },
    indexPattern: 'logs-*'
  },
  jaeger: {
    endpoint: 'http://localhost:14268',
    serviceName: 'readme-to-cicd',
    sampler: {
      type: 'const',
      param: 1
    },
    reporter: {
      logSpans: false,
      flushInterval: 5000
    }
  },
  alerting: {
    evaluationInterval: 30000,
    notificationChannels: [],
    escalationPolicies: []
  },
  grafana: {
    host: 'localhost',
    port: 3000,
    apiKey: '',
    datasources: {
      prometheus: 'prometheus',
      elasticsearch: 'elasticsearch',
      jaeger: 'jaeger'
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private monitoringSystem: ComprehensiveMonitoringSystem | null = null

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  setMonitoringSystem(system: ComprehensiveMonitoringSystem): void {
    this.monitoringSystem = system
  }

  async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now()
    const labels = {
      operation: operationName,
      ...metadata
    }

    try {
      const result = await operation()
      
      // Record success metrics
      await this.recordMetrics(operationName, startTime, 'success', labels)
      
      return result
    } catch (error) {
      // Record error metrics
      await this.recordMetrics(operationName, startTime, 'error', {
        ...labels,
        error_type: error instanceof Error ? error.constructor.name : 'unknown'
      })
      
      throw error
    }
  }

  private async recordMetrics(
    operation: string,
    startTime: number,
    status: 'success' | 'error',
    labels: Record<string, any>
  ): Promise<void> {
    if (!this.monitoringSystem) {
      return
    }

    const duration = Date.now() - startTime
    const timestamp = new Date()

    const metrics: Metric[] = [
      {
        name: 'operation_duration_ms',
        value: duration,
        timestamp,
        labels: { ...labels, status },
        type: 'histogram'
      },
      {
        name: 'operation_total',
        value: 1,
        timestamp,
        labels: { ...labels, status },
        type: 'counter'
      }
    ]

    await this.monitoringSystem.collectMetrics('performance-monitor', metrics)
  }
}

// SLA monitoring utilities
export class SLAMonitor {
  private slaDefinitions = new Map<string, SLADefinition>()
  private monitoringSystem: ComprehensiveMonitoringSystem | null = null

  setMonitoringSystem(system: ComprehensiveMonitoringSystem): void {
    this.monitoringSystem = system
  }

  registerSLA(sla: SLADefinition): void {
    this.slaDefinitions.set(sla.name, sla)
  }

  async checkSLACompliance(slaName: string): Promise<number> {
    const sla = this.slaDefinitions.get(slaName)
    if (!sla || !this.monitoringSystem) {
      return 100 // Default to 100% if SLA not found
    }

    let totalCompliance = 0
    let targetCount = 0

    for (const target of sla.targets) {
      const compliance = await this.checkTargetCompliance(target, sla.measurement)
      totalCompliance += compliance
      targetCount++
    }

    return targetCount > 0 ? totalCompliance / targetCount : 100
  }

  private async checkTargetCompliance(
    target: SLATarget,
    measurement: any
  ): Promise<number> {
    // In a real implementation, this would query actual metrics
    // For now, return a simulated compliance percentage
    return Math.random() * 100
  }
}

// Health check utilities
export async function createHealthCheckEndpoint(
  monitoringSystem: ComprehensiveMonitoringSystem
): Promise<(req: any, res: any) => Promise<void>> {
  return async (req: any, res: any) => {
    try {
      const health = await monitoringSystem.getHealthStatus()
      
      const statusCode = health.status === 'healthy' ? 200 
        : health.status === 'degraded' ? 200 
        : 503

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.lastUpdated,
        checks: health.checks,
        version: process.env.npm_package_version || '1.0.0'
      })
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// Monitoring middleware for Express.js
export function createMonitoringMiddleware(
  monitoringSystem: ComprehensiveMonitoringSystem
) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()
    const originalSend = res.send

    res.send = function(body: any) {
      const duration = Date.now() - startTime
      const statusCode = res.statusCode

      // Record request metrics
      monitoringSystem.collectMetrics('http-middleware', [
        {
          name: 'http_request_duration_ms',
          value: duration,
          timestamp: new Date(),
          labels: {
            method: req.method,
            route: req.route?.path || req.path,
            status_code: statusCode.toString(),
            status_class: `${Math.floor(statusCode / 100)}xx`
          },
          type: 'histogram'
        },
        {
          name: 'http_requests_total',
          value: 1,
          timestamp: new Date(),
          labels: {
            method: req.method,
            route: req.route?.path || req.path,
            status_code: statusCode.toString()
          },
          type: 'counter'
        }
      ]).catch(error => {
        console.error('Failed to record HTTP metrics:', error)
      })

      return originalSend.call(this, body)
    }

    next()
  }
}