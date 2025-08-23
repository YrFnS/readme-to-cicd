/**
 * Grafana dashboard manager implementation
 * Handles dashboard creation, management, and rendering
 */

import {
  DashboardManager,
  Dashboard,
  DashboardPanel,
  RenderedDashboard,
  RenderedPanel,
  TimeRange,
  MetricsCollector,
  HealthStatus
} from '../types.js'
import { GrafanaConfig } from '../monitoring-system.js'

export class GrafanaDashboardManager implements DashboardManager {
  private config: GrafanaConfig
  private isInitialized = false
  private dashboards = new Map<string, Dashboard>()
  private metricsProvider: MetricsCollector | null = null

  constructor(config: GrafanaConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Validate Grafana connection
      await this.validateGrafanaConnection()
      
      // Create default dashboards
      await this.createDefaultDashboards()
      
      this.isInitialized = true
    } catch (error) {
      throw new DashboardManagerError('Failed to initialize dashboard manager', { cause: error })
    }
  }

  async createDashboard(dashboard: Dashboard): Promise<string> {
    if (!this.isInitialized) {
      throw new DashboardManagerError('Dashboard manager not initialized')
    }

    try {
      // Validate dashboard configuration
      this.validateDashboard(dashboard)
      
      // Store dashboard locally
      this.dashboards.set(dashboard.id, dashboard)
      
      // Create dashboard in Grafana
      await this.createGrafanaDashboard(dashboard)
      
      return dashboard.id
    } catch (error) {
      throw new DashboardManagerError(`Failed to create dashboard ${dashboard.name}`, { cause: error })
    }
  }

  async updateDashboard(id: string, dashboard: Partial<Dashboard>): Promise<void> {
    if (!this.isInitialized) {
      throw new DashboardManagerError('Dashboard manager not initialized')
    }

    const existingDashboard = this.dashboards.get(id)
    if (!existingDashboard) {
      throw new DashboardManagerError(`Dashboard not found: ${id}`)
    }

    try {
      // Merge updates with existing dashboard
      const updatedDashboard = { ...existingDashboard, ...dashboard, id }
      
      // Validate updated dashboard
      this.validateDashboard(updatedDashboard)
      
      // Update local storage
      this.dashboards.set(id, updatedDashboard)
      
      // Update dashboard in Grafana
      await this.updateGrafanaDashboard(updatedDashboard)
    } catch (error) {
      throw new DashboardManagerError(`Failed to update dashboard ${id}`, { cause: error })
    }
  }

  async deleteDashboard(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new DashboardManagerError('Dashboard manager not initialized')
    }

    const dashboard = this.dashboards.get(id)
    if (!dashboard) {
      throw new DashboardManagerError(`Dashboard not found: ${id}`)
    }

    try {
      // Delete from Grafana
      await this.deleteGrafanaDashboard(id)
      
      // Remove from local storage
      this.dashboards.delete(id)
    } catch (error) {
      throw new DashboardManagerError(`Failed to delete dashboard ${id}`, { cause: error })
    }
  }

  async getDashboard(id: string): Promise<Dashboard> {
    const dashboard = this.dashboards.get(id)
    if (!dashboard) {
      throw new DashboardManagerError(`Dashboard not found: ${id}`)
    }
    return dashboard
  }

  async listDashboards(): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values())
  }

  async renderDashboard(id: string, timeRange?: TimeRange): Promise<RenderedDashboard> {
    if (!this.isInitialized) {
      throw new DashboardManagerError('Dashboard manager not initialized')
    }

    const dashboard = await this.getDashboard(id)
    
    try {
      const effectiveTimeRange = timeRange || dashboard.timeRange
      const renderedPanels = await Promise.all(
        dashboard.panels.map(panel => this.renderPanel(panel, effectiveTimeRange))
      )

      return {
        dashboard,
        panels: renderedPanels,
        generatedAt: new Date()
      }
    } catch (error) {
      throw new DashboardManagerError(`Failed to render dashboard ${id}`, { cause: error })
    }
  }

  setMetricsProvider(metricsProvider: MetricsCollector): void {
    this.metricsProvider = metricsProvider
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/health`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`Grafana health check failed: ${response.status}`)
      }

      return {
        status: 'healthy',
        checks: [{
          name: 'grafana-connection',
          status: 'pass',
          duration: 0
        }],
        lastUpdated: new Date()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: [{
          name: 'grafana-connection',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: 0
        }],
        lastUpdated: new Date()
      }
    }
  }

  private async validateGrafanaConnection(): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/org`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`Failed to connect to Grafana: ${response.status}`)
      }
    } catch (error) {
      throw new DashboardManagerError('Cannot connect to Grafana', { cause: error })
    }
  }

  private async createDefaultDashboards(): Promise<void> {
    const defaultDashboards = [
      this.createSystemOverviewDashboard(),
      this.createApplicationMetricsDashboard(),
      this.createAlertsDashboard()
    ]

    for (const dashboard of defaultDashboards) {
      try {
        await this.createDashboard(dashboard)
      } catch (error) {
        console.warn(`Failed to create default dashboard ${dashboard.name}:`, error)
      }
    }
  }

  private createSystemOverviewDashboard(): Dashboard {
    return {
      id: 'system-overview',
      name: 'System Overview',
      description: 'Overview of system metrics and health',
      panels: [
        {
          id: 'cpu-usage',
          title: 'CPU Usage',
          type: 'graph',
          query: {
            metric: 'system_cpu_usage',
            timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
            aggregation: 'avg'
          },
          visualization: {
            type: 'line',
            yAxis: { unit: 'percent', min: 0, max: 100 }
          },
          position: { x: 0, y: 0, width: 12, height: 8 }
        },
        {
          id: 'memory-usage',
          title: 'Memory Usage',
          type: 'graph',
          query: {
            metric: 'system_memory_usage',
            timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
            aggregation: 'avg'
          },
          visualization: {
            type: 'line',
            yAxis: { unit: 'percent', min: 0, max: 100 }
          },
          position: { x: 12, y: 0, width: 12, height: 8 }
        },
        {
          id: 'request-rate',
          title: 'Request Rate',
          type: 'stat',
          query: {
            metric: 'http_requests_total',
            timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
            aggregation: 'rate'
          },
          visualization: {
            type: 'stat',
            unit: 'reqps'
          },
          position: { x: 0, y: 8, width: 6, height: 4 }
        },
        {
          id: 'error-rate',
          title: 'Error Rate',
          type: 'stat',
          query: {
            metric: 'http_errors_total',
            timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
            aggregation: 'rate'
          },
          visualization: {
            type: 'stat',
            unit: 'percent',
            thresholds: [
              { value: 0, color: 'green' },
              { value: 1, color: 'yellow' },
              { value: 5, color: 'red' }
            ]
          },
          position: { x: 6, y: 8, width: 6, height: 4 }
        }
      ],
      timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
      refreshInterval: 30
    }
  }

  private createApplicationMetricsDashboard(): Dashboard {
    return {
      id: 'application-metrics',
      name: 'Application Metrics',
      description: 'Application-specific metrics and performance indicators',
      panels: [
        {
          id: 'response-time',
          title: 'Response Time',
          type: 'graph',
          query: {
            metric: 'http_request_duration_seconds',
            timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
            aggregation: 'avg'
          },
          visualization: {
            type: 'line',
            yAxis: { unit: 'seconds' }
          },
          position: { x: 0, y: 0, width: 24, height: 8 }
        },
        {
          id: 'throughput',
          title: 'Throughput by Endpoint',
          type: 'table',
          query: {
            metric: 'http_requests_total',
            timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
            aggregation: 'sum'
          },
          visualization: {
            type: 'table',
            columns: ['endpoint', 'method', 'requests', 'rate']
          },
          position: { x: 0, y: 8, width: 24, height: 8 }
        }
      ],
      timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
      refreshInterval: 30
    }
  }

  private createAlertsDashboard(): Dashboard {
    return {
      id: 'alerts-overview',
      name: 'Alerts Overview',
      description: 'Current alerts and alert history',
      panels: [
        {
          id: 'active-alerts',
          title: 'Active Alerts',
          type: 'table',
          query: {
            metric: 'alerts_active',
            timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
            aggregation: 'sum'
          },
          visualization: {
            type: 'table',
            columns: ['alert', 'severity', 'duration', 'status']
          },
          position: { x: 0, y: 0, width: 24, height: 8 }
        },
        {
          id: 'alert-history',
          title: 'Alert History',
          type: 'graph',
          query: {
            metric: 'alerts_triggered_total',
            timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
            aggregation: 'sum'
          },
          visualization: {
            type: 'bar',
            yAxis: { unit: 'count' }
          },
          position: { x: 0, y: 8, width: 24, height: 8 }
        }
      ],
      timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
      refreshInterval: 60
    }
  }

  private validateDashboard(dashboard: Dashboard): void {
    if (!dashboard.id) {
      throw new DashboardManagerError('Dashboard must have an ID')
    }
    if (!dashboard.name) {
      throw new DashboardManagerError('Dashboard must have a name')
    }
    if (!dashboard.panels || dashboard.panels.length === 0) {
      throw new DashboardManagerError('Dashboard must have at least one panel')
    }

    // Validate panels
    for (const panel of dashboard.panels) {
      this.validatePanel(panel)
    }
  }

  private validatePanel(panel: DashboardPanel): void {
    if (!panel.id) {
      throw new DashboardManagerError('Panel must have an ID')
    }
    if (!panel.title) {
      throw new DashboardManagerError('Panel must have a title')
    }
    if (!panel.query || !panel.query.metric) {
      throw new DashboardManagerError('Panel must have a valid query')
    }
  }

  private async renderPanel(panel: DashboardPanel, timeRange: TimeRange): Promise<RenderedPanel> {
    try {
      // Query metrics data
      const query = { ...panel.query, timeRange }
      const data = this.metricsProvider 
        ? await this.metricsProvider.queryMetrics(query)
        : []

      // Apply visualization configuration
      const visualization = this.applyVisualization(data, panel.visualization)

      return {
        panel,
        data,
        visualization
      }
    } catch (error) {
      throw new DashboardManagerError(`Failed to render panel ${panel.id}`, { cause: error })
    }
  }

  private applyVisualization(data: any[], config: any): any {
    // Apply visualization transformations based on panel type and config
    switch (config.type) {
      case 'line':
        return this.createLineVisualization(data, config)
      case 'bar':
        return this.createBarVisualization(data, config)
      case 'stat':
        return this.createStatVisualization(data, config)
      case 'table':
        return this.createTableVisualization(data, config)
      default:
        return data
    }
  }

  private createLineVisualization(data: any[], config: any): any {
    return {
      type: 'line',
      series: data.map(metric => ({
        name: metric.metric,
        data: metric.values.map((value: any) => ({
          x: value.timestamp,
          y: value.value
        }))
      })),
      options: {
        yAxis: config.yAxis || {},
        xAxis: { type: 'datetime' }
      }
    }
  }

  private createBarVisualization(data: any[], config: any): any {
    return {
      type: 'bar',
      series: data.map(metric => ({
        name: metric.metric,
        data: metric.values.map((value: any) => value.value)
      })),
      categories: data[0]?.values.map((value: any) => value.timestamp) || [],
      options: {
        yAxis: config.yAxis || {}
      }
    }
  }

  private createStatVisualization(data: any[], config: any): any {
    const latestValue = data[0]?.values[data[0].values.length - 1]?.value || 0
    
    return {
      type: 'stat',
      value: latestValue,
      unit: config.unit || '',
      thresholds: config.thresholds || []
    }
  }

  private createTableVisualization(data: any[], config: any): any {
    return {
      type: 'table',
      columns: config.columns || ['metric', 'value'],
      rows: data.map(metric => [
        metric.metric,
        metric.values[metric.values.length - 1]?.value || 0
      ])
    }
  }

  private async createGrafanaDashboard(dashboard: Dashboard): Promise<void> {
    const grafanaDashboard = this.convertToGrafanaFormat(dashboard)
    
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/dashboards/db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({ dashboard: grafanaDashboard })
      })

      if (!response.ok) {
        throw new Error(`Failed to create Grafana dashboard: ${response.status}`)
      }
    } catch (error) {
      throw new DashboardManagerError('Failed to create dashboard in Grafana', { cause: error })
    }
  }

  private async updateGrafanaDashboard(dashboard: Dashboard): Promise<void> {
    const grafanaDashboard = this.convertToGrafanaFormat(dashboard)
    
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/dashboards/db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({ 
          dashboard: grafanaDashboard,
          overwrite: true 
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update Grafana dashboard: ${response.status}`)
      }
    } catch (error) {
      throw new DashboardManagerError('Failed to update dashboard in Grafana', { cause: error })
    }
  }

  private async deleteGrafanaDashboard(id: string): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/dashboards/uid/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      })

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete Grafana dashboard: ${response.status}`)
      }
    } catch (error) {
      throw new DashboardManagerError('Failed to delete dashboard from Grafana', { cause: error })
    }
  }

  private convertToGrafanaFormat(dashboard: Dashboard): any {
    return {
      uid: dashboard.id,
      title: dashboard.name,
      description: dashboard.description,
      tags: ['monitoring', 'readme-to-cicd'],
      timezone: 'browser',
      refresh: `${dashboard.refreshInterval}s`,
      time: {
        from: dashboard.timeRange.start.toISOString(),
        to: dashboard.timeRange.end.toISOString()
      },
      panels: dashboard.panels.map(panel => ({
        id: parseInt(panel.id.replace(/\D/g, '')) || Math.floor(Math.random() * 1000),
        title: panel.title,
        type: this.mapPanelType(panel.type),
        gridPos: {
          x: panel.position.x,
          y: panel.position.y,
          w: panel.position.width,
          h: panel.position.height
        },
        targets: [{
          expr: panel.query.metric,
          refId: 'A'
        }],
        options: panel.visualization
      }))
    }
  }

  private mapPanelType(type: string): string {
    const typeMap: Record<string, string> = {
      'graph': 'timeseries',
      'stat': 'stat',
      'table': 'table',
      'gauge': 'gauge',
      'heatmap': 'heatmap',
      'logs': 'logs'
    }
    return typeMap[type] || 'timeseries'
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`
    }
  }
}

export class DashboardManagerError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message)
    this.name = 'DashboardManagerError'
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}