/**
 * Prometheus metrics collector implementation
 * Handles metrics collection, storage, and querying via Prometheus
 */

import {
  MetricsCollector,
  Metric,
  MetricQuery,
  MetricResult,
  MetricType,
  SystemMetrics,
  ApplicationMetrics,
  BusinessMetrics,
  CustomMetrics,
  CustomMetricDefinition,
  HealthStatus
} from '../types.js'
import { PrometheusConfig } from '../monitoring-system.js'

export class PrometheusMetricsCollector implements MetricsCollector {
  private config: PrometheusConfig
  private isInitialized = false
  private metricsRegistry = new Map<string, PrometheusMetric>()
  private customMetrics = new Map<string, CustomMetricDefinition>()

  public systemMetrics: SystemMetrics
  public applicationMetrics: ApplicationMetrics
  public businessMetrics: BusinessMetrics
  public customMetrics: CustomMetrics

  constructor(config: PrometheusConfig) {
    this.config = config
    this.systemMetrics = new PrometheusSystemMetrics(this)
    this.applicationMetrics = new PrometheusApplicationMetrics(this)
    this.businessMetrics = new PrometheusBussinessMetrics(this)
    this.customMetrics = new PrometheusCustomMetrics(this)
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Initialize connection to Prometheus
      await this.validateConnection()
      
      // Register default metrics
      await this.registerDefaultMetrics()
      
      this.isInitialized = true
    } catch (error) {
      throw new PrometheusError('Failed to initialize Prometheus collector', { cause: error })
    }
  }

  async collectMetrics(source: string, metrics: Metric[]): Promise<void> {
    if (!this.isInitialized) {
      throw new PrometheusError('Prometheus collector not initialized')
    }

    try {
      for (const metric of metrics) {
        await this.recordMetric(source, metric)
      }

      // Push metrics to Prometheus if push gateway is configured
      if (this.config.pushGateway) {
        await this.pushMetrics(source, metrics)
      }
    } catch (error) {
      throw new PrometheusError(`Failed to collect metrics from ${source}`, { cause: error })
    }
  }

  async queryMetrics(query: MetricQuery): Promise<MetricResult[]> {
    if (!this.isInitialized) {
      throw new PrometheusError('Prometheus collector not initialized')
    }

    try {
      const promQuery = this.buildPrometheusQuery(query)
      const response = await this.executeQuery(promQuery, query.timeRange)
      return this.parseQueryResponse(response, query)
    } catch (error) {
      throw new PrometheusError(`Failed to query metrics: ${query.metric}`, { cause: error })
    }
  }

  async incrementCounter(name: string, labels: Record<string, string> = {}): Promise<void> {
    const metric: Metric = {
      name,
      value: 1,
      timestamp: new Date(),
      labels,
      type: 'counter'
    }
    await this.recordMetric('system', metric)
  }

  async setGauge(name: string, value: number, labels: Record<string, string> = {}): Promise<void> {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      labels,
      type: 'gauge'
    }
    await this.recordMetric('system', metric)
  }

  async recordHistogram(name: string, value: number, labels: Record<string, string> = {}): Promise<void> {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      labels,
      type: 'histogram'
    }
    await this.recordMetric('system', metric)
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.config.endpoint}/-/healthy`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`Prometheus health check failed: ${response.status}`)
      }

      return {
        status: 'healthy',
        checks: [{
          name: 'prometheus-connection',
          status: 'pass',
          duration: 0
        }],
        lastUpdated: new Date()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: [{
          name: 'prometheus-connection',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: 0
        }],
        lastUpdated: new Date()
      }
    }
  }

  private async validateConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/v1/status/config`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`Failed to connect to Prometheus: ${response.status}`)
      }
    } catch (error) {
      throw new PrometheusError('Cannot connect to Prometheus', { cause: error })
    }
  }

  private async registerDefaultMetrics(): Promise<void> {
    const defaultMetrics = [
      { name: 'system_cpu_usage', type: 'gauge' as MetricType },
      { name: 'system_memory_usage', type: 'gauge' as MetricType },
      { name: 'system_disk_usage', type: 'gauge' as MetricType },
      { name: 'system_network_usage', type: 'gauge' as MetricType },
      { name: 'http_requests_total', type: 'counter' as MetricType },
      { name: 'http_request_duration_seconds', type: 'histogram' as MetricType },
      { name: 'http_errors_total', type: 'counter' as MetricType },
      { name: 'application_uptime_seconds', type: 'gauge' as MetricType }
    ]

    for (const metric of defaultMetrics) {
      this.metricsRegistry.set(metric.name, {
        name: metric.name,
        type: metric.type,
        help: `Default ${metric.name} metric`,
        labels: []
      })
    }
  }

  private async recordMetric(source: string, metric: Metric): Promise<void> {
    // Store metric in local registry
    const prometheusMetric = this.metricsRegistry.get(metric.name)
    if (!prometheusMetric) {
      // Auto-register new metrics
      this.metricsRegistry.set(metric.name, {
        name: metric.name,
        type: metric.type,
        help: `Auto-registered metric from ${source}`,
        labels: Object.keys(metric.labels)
      })
    }

    // In a real implementation, this would update the Prometheus metric
    // For now, we'll simulate the recording
    console.debug(`Recording metric: ${metric.name} = ${metric.value} (${source})`)
  }

  private async pushMetrics(source: string, metrics: Metric[]): Promise<void> {
    if (!this.config.pushGateway) {
      return
    }

    try {
      const prometheusFormat = this.formatMetricsForPush(metrics)
      const response = await fetch(`${this.config.pushGateway}/metrics/job/${source}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          ...this.getAuthHeaders()
        },
        body: prometheusFormat
      })

      if (!response.ok) {
        throw new Error(`Failed to push metrics: ${response.status}`)
      }
    } catch (error) {
      throw new PrometheusError('Failed to push metrics to gateway', { cause: error })
    }
  }

  private formatMetricsForPush(metrics: Metric[]): string {
    return metrics.map(metric => {
      const labels = Object.entries(metric.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
      
      const labelString = labels ? `{${labels}}` : ''
      return `${metric.name}${labelString} ${metric.value} ${metric.timestamp.getTime()}`
    }).join('\n')
  }

  private buildPrometheusQuery(query: MetricQuery): string {
    let promQuery = query.metric

    // Add filters
    if (query.filters && Object.keys(query.filters).length > 0) {
      const filters = Object.entries(query.filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
      promQuery = `${query.metric}{${filters}}`
    }

    // Add aggregation
    if (query.aggregation) {
      switch (query.aggregation) {
        case 'sum':
          promQuery = `sum(${promQuery})`
          break
        case 'avg':
          promQuery = `avg(${promQuery})`
          break
        case 'min':
          promQuery = `min(${promQuery})`
          break
        case 'max':
          promQuery = `max(${promQuery})`
          break
        case 'count':
          promQuery = `count(${promQuery})`
          break
        case 'rate':
          promQuery = `rate(${promQuery}[5m])`
          break
      }
    }

    return promQuery
  }

  private async executeQuery(query: string, timeRange: any): Promise<any> {
    const params = new URLSearchParams({
      query,
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString(),
      step: '60s'
    })

    const response = await fetch(`${this.config.endpoint}/api/v1/query_range?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.status}`)
    }

    return response.json()
  }

  private parseQueryResponse(response: any, query: MetricQuery): MetricResult[] {
    if (response.status !== 'success') {
      throw new Error(`Query failed: ${response.error}`)
    }

    return response.data.result.map((result: any) => ({
      metric: query.metric,
      labels: result.metric || {},
      values: result.values.map(([timestamp, value]: [number, string]) => ({
        timestamp: new Date(timestamp * 1000),
        value: parseFloat(value)
      }))
    }))
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    
    if (this.config.authentication) {
      const auth = btoa(`${this.config.authentication.username}:${this.config.authentication.password}`)
      headers['Authorization'] = `Basic ${auth}`
    }

    return headers
  }
}

// System metrics implementation
class PrometheusSystemMetrics implements SystemMetrics {
  constructor(private collector: PrometheusMetricsCollector) {}

  async collectCPUUsage(): Promise<Metric> {
    // In a real implementation, this would collect actual CPU usage
    const cpuUsage = Math.random() * 100 // Simulated
    return {
      name: 'system_cpu_usage',
      value: cpuUsage,
      timestamp: new Date(),
      labels: { instance: 'localhost' },
      type: 'gauge'
    }
  }

  async collectMemoryUsage(): Promise<Metric> {
    // In a real implementation, this would collect actual memory usage
    const memoryUsage = Math.random() * 100 // Simulated
    return {
      name: 'system_memory_usage',
      value: memoryUsage,
      timestamp: new Date(),
      labels: { instance: 'localhost' },
      type: 'gauge'
    }
  }

  async collectDiskUsage(): Promise<Metric> {
    // In a real implementation, this would collect actual disk usage
    const diskUsage = Math.random() * 100 // Simulated
    return {
      name: 'system_disk_usage',
      value: diskUsage,
      timestamp: new Date(),
      labels: { instance: 'localhost', device: '/dev/sda1' },
      type: 'gauge'
    }
  }

  async collectNetworkUsage(): Promise<Metric> {
    // In a real implementation, this would collect actual network usage
    const networkUsage = Math.random() * 1000000 // Simulated bytes
    return {
      name: 'system_network_usage',
      value: networkUsage,
      timestamp: new Date(),
      labels: { instance: 'localhost', interface: 'eth0' },
      type: 'gauge'
    }
  }
}

// Application metrics implementation
class PrometheusApplicationMetrics implements ApplicationMetrics {
  constructor(private collector: PrometheusMetricsCollector) {}

  async collectRequestMetrics(): Promise<Metric[]> {
    return [
      {
        name: 'http_requests_total',
        value: Math.floor(Math.random() * 1000),
        timestamp: new Date(),
        labels: { method: 'GET', status: '200' },
        type: 'counter'
      },
      {
        name: 'http_requests_total',
        value: Math.floor(Math.random() * 100),
        timestamp: new Date(),
        labels: { method: 'POST', status: '201' },
        type: 'counter'
      }
    ]
  }

  async collectErrorMetrics(): Promise<Metric[]> {
    return [
      {
        name: 'http_errors_total',
        value: Math.floor(Math.random() * 10),
        timestamp: new Date(),
        labels: { method: 'GET', status: '500' },
        type: 'counter'
      }
    ]
  }

  async collectPerformanceMetrics(): Promise<Metric[]> {
    return [
      {
        name: 'http_request_duration_seconds',
        value: Math.random() * 2,
        timestamp: new Date(),
        labels: { method: 'GET', endpoint: '/api/health' },
        type: 'histogram'
      }
    ]
  }
}

// Business metrics implementation
class PrometheusBussinessMetrics implements BusinessMetrics {
  constructor(private collector: PrometheusMetricsCollector) {}

  async collectUsageMetrics(): Promise<Metric[]> {
    return [
      {
        name: 'active_users_total',
        value: Math.floor(Math.random() * 1000),
        timestamp: new Date(),
        labels: { type: 'daily' },
        type: 'gauge'
      }
    ]
  }

  async collectConversionMetrics(): Promise<Metric[]> {
    return [
      {
        name: 'conversion_rate',
        value: Math.random() * 100,
        timestamp: new Date(),
        labels: { funnel: 'signup' },
        type: 'gauge'
      }
    ]
  }

  async collectRevenueMetrics(): Promise<Metric[]> {
    return [
      {
        name: 'revenue_total',
        value: Math.random() * 10000,
        timestamp: new Date(),
        labels: { currency: 'USD' },
        type: 'counter'
      }
    ]
  }
}

// Custom metrics implementation
class PrometheusCustomMetrics implements CustomMetrics {
  constructor(private collector: PrometheusMetricsCollector) {}

  async collectCustomMetric(name: string, config: any): Promise<Metric> {
    const definition = this.collector.customMetrics.get(name)
    if (!definition) {
      throw new Error(`Custom metric not registered: ${name}`)
    }

    return definition.collector(config)
  }

  async registerCustomMetric(definition: CustomMetricDefinition): Promise<void> {
    this.collector.customMetrics.set(definition.name, definition)
  }
}

interface PrometheusMetric {
  name: string
  type: MetricType
  help: string
  labels: string[]
}

export class PrometheusError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message)
    this.name = 'PrometheusError'
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}