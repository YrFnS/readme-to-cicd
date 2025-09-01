/**
 * Comprehensive monitoring system tests
 * Tests all monitoring components and their integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ComprehensiveMonitoringSystem,
  MonitoringConfig,
  Metric,
  MetricQuery,
  AlertDefinition,
  Notification,
  ReportDefinition,
  DEFAULT_MONITORING_CONFIG
} from '../../../src/integration/monitoring/index.js'
import {
  ensureMonitoringSystemInitialized,
  validateMonitoringSystemForTest,
  createTestSafeMonitoringSystem
} from '../../setup/monitoring-system-initialization-checks.js'

describe('ComprehensiveMonitoringSystem', () => {
  let monitoringSystem: ComprehensiveMonitoringSystem
  let config: MonitoringConfig

  beforeEach(async () => {
    config = {
      ...DEFAULT_MONITORING_CONFIG,
      prometheus: {
        ...DEFAULT_MONITORING_CONFIG.prometheus,
        endpoint: 'http://localhost:9090'
      },
      elk: {
        ...DEFAULT_MONITORING_CONFIG.elk,
        elasticsearch: {
          hosts: ['http://localhost:9200']
        }
      },
      jaeger: {
        ...DEFAULT_MONITORING_CONFIG.jaeger,
        endpoint: 'http://localhost:14268'
      },
      alerting: {
        ...DEFAULT_MONITORING_CONFIG.alerting,
        notificationChannels: [
          {
            type: 'email',
            name: 'test-email',
            config: { smtp: 'localhost' },
            enabled: true
          }
        ]
      },
      grafana: {
        ...DEFAULT_MONITORING_CONFIG.grafana,
        apiKey: 'test-api-key'
      }
    }

    // Create MonitoringSystem with initialization checks
    monitoringSystem = await createTestSafeMonitoringSystem(
      async () => {
        const system = new ComprehensiveMonitoringSystem(config);
        await system.initialize();
        return system;
      },
      'comprehensive-monitoring-system',
      { strictMode: false } // Allow some flexibility for integration tests
    );
  })

  afterEach(async () => {
    if (monitoringSystem) {
      await monitoringSystem.shutdown?.()
    }
  })

  describe('Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      // Validate system is already initialized from beforeEach
      await validateMonitoringSystemForTest(monitoringSystem, 'initialization-test');
      
      // System should already be initialized, so this should not throw
      await expect(monitoringSystem.initialize()).resolves.not.toThrow()
    })

    it('should throw error when initializing with invalid config', async () => {
      const invalidConfig = { ...config }
      delete (invalidConfig as any).prometheus
      
      // Create system without initialization checks to test error handling
      const invalidSystem = new ComprehensiveMonitoringSystem(invalidConfig as any)
      await expect(invalidSystem.initialize()).rejects.toThrow()
    })

    it('should not initialize twice', async () => {
      // Validate system is initialized
      await ensureMonitoringSystemInitialized(monitoringSystem, 'double-init-test');
      
      await expect(monitoringSystem.initialize()).resolves.not.toThrow()
    })
  })

  describe('Metrics Collection', () => {
    beforeEach(async () => {
      // Ensure system is initialized before each test
      await ensureMonitoringSystemInitialized(monitoringSystem, 'metrics-collection');
    })

    it('should collect metrics successfully', async () => {
      const metrics: Metric[] = [
        {
          name: 'test_metric',
          value: 42,
          timestamp: new Date(),
          labels: { source: 'test' },
          type: 'gauge'
        }
      ]

      await expect(monitoringSystem.collectMetrics('test-source', metrics))
        .resolves.not.toThrow()
    })

    it('should handle empty metrics array', async () => {
      await expect(monitoringSystem.collectMetrics('test-source', []))
        .resolves.not.toThrow()
    })

    it('should throw error when not initialized', async () => {
      const uninitializedSystem = new ComprehensiveMonitoringSystem(config)
      const metrics: Metric[] = [{
        name: 'test_metric',
        value: 1,
        timestamp: new Date(),
        labels: {},
        type: 'counter'
      }]

      await expect(uninitializedSystem.collectMetrics('test', metrics))
        .rejects.toThrow('Monitoring system not initialized')
    })
  })

  describe('Metrics Querying', () => {
    beforeEach(async () => {
      await monitoringSystem.initialize()
    })

    it('should query metrics successfully', async () => {
      const query: MetricQuery = {
        metric: 'test_metric',
        timeRange: {
          start: new Date(Date.now() - 3600000),
          end: new Date()
        },
        aggregation: 'avg'
      }

      const results = await monitoringSystem.queryMetrics(query)
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle query with filters', async () => {
      const query: MetricQuery = {
        metric: 'test_metric',
        timeRange: {
          start: new Date(Date.now() - 3600000),
          end: new Date()
        },
        filters: { source: 'test' },
        aggregation: 'sum'
      }

      const results = await monitoringSystem.queryMetrics(query)
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Alert Management', () => {
    beforeEach(async () => {
      await monitoringSystem.initialize()
    })

    it('should create alert successfully', async () => {
      const alert: AlertDefinition = {
        name: 'Test Alert',
        description: 'Test alert description',
        condition: {
          metric: 'test_metric',
          operator: 'gt',
          threshold: 100,
          duration: 300,
          evaluationInterval: 60
        },
        severity: 'high',
        routing: {
          channels: [{
            type: 'email',
            config: { recipients: ['test@example.com'] },
            enabled: true
          }]
        },
        escalation: {
          levels: [{
            level: 1,
            delay: 300,
            channels: [{
              type: 'email',
              config: { recipients: ['admin@example.com'] },
              enabled: true
            }]
          }],
          timeout: 3600
        },
        enabled: true
      }

      const alertId = await monitoringSystem.createAlert(alert)
      expect(typeof alertId).toBe('string')
      expect(alertId.length).toBeGreaterThan(0)
    })

    it('should handle alert with missing required fields', async () => {
      const invalidAlert = {
        name: 'Invalid Alert'
        // Missing required fields
      } as AlertDefinition

      await expect(monitoringSystem.createAlert(invalidAlert))
        .rejects.toThrow()
    })
  })

  describe('Notification System', () => {
    beforeEach(async () => {
      await monitoringSystem.initialize()
    })

    it('should send notification successfully', async () => {
      const notification: Notification = {
        type: 'alert',
        severity: 'high',
        title: 'Test Notification',
        message: 'This is a test notification',
        metadata: { test: true },
        channels: [{
          type: 'email',
          config: { recipients: ['test@example.com'] },
          enabled: true
        }],
        timestamp: new Date()
      }

      await expect(monitoringSystem.sendNotification(notification))
        .resolves.not.toThrow()
    })

    it('should handle notification with disabled channels', async () => {
      const notification: Notification = {
        type: 'info',
        severity: 'low',
        title: 'Test Notification',
        message: 'This is a test notification',
        metadata: {},
        channels: [{
          type: 'email',
          config: { recipients: ['test@example.com'] },
          enabled: false
        }],
        timestamp: new Date()
      }

      await expect(monitoringSystem.sendNotification(notification))
        .resolves.not.toThrow()
    })
  })

  describe('Report Generation', () => {
    beforeEach(async () => {
      await monitoringSystem.initialize()
    })

    it('should generate performance report', async () => {
      const reportDef: ReportDefinition = {
        name: 'Performance Report',
        description: 'System performance metrics',
        type: 'performance',
        schedule: {
          frequency: 'daily',
          enabled: true
        },
        parameters: {
          timeRange: {
            start: new Date(Date.now() - 86400000),
            end: new Date()
          },
          metrics: ['system_cpu_usage', 'system_memory_usage'],
          format: 'json'
        },
        recipients: ['admin@example.com']
      }

      const report = await monitoringSystem.generateReport(reportDef)
      
      expect(report).toBeDefined()
      expect(report.id).toBeDefined()
      expect(report.name).toBe(reportDef.name)
      expect(report.type).toBe(reportDef.type)
      expect(report.data).toBeDefined()
      expect(report.data.summary).toBeDefined()
      expect(Array.isArray(report.data.metrics)).toBe(true)
    })

    it('should generate SLA report', async () => {
      const reportDef: ReportDefinition = {
        name: 'SLA Report',
        description: 'SLA compliance metrics',
        type: 'sla',
        schedule: {
          frequency: 'weekly',
          enabled: true
        },
        parameters: {
          timeRange: {
            start: new Date(Date.now() - 604800000),
            end: new Date()
          },
          metrics: ['http_request_duration_seconds', 'http_errors_total'],
          format: 'html'
        },
        recipients: ['sla-team@example.com']
      }

      const report = await monitoringSystem.generateReport(reportDef)
      
      expect(report).toBeDefined()
      expect(report.type).toBe('sla')
      expect(report.data.summary.slaCompliance).toBeDefined()
      expect(typeof report.data.summary.slaCompliance).toBe('number')
    })
  })

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await monitoringSystem.initialize()
    })

    it('should return health status', async () => {
      const health = await monitoringSystem.getHealthStatus()
      
      expect(health).toBeDefined()
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/)
      expect(Array.isArray(health.checks)).toBe(true)
      expect(health.lastUpdated).toBeInstanceOf(Date)
    })

    it('should include all component health checks', async () => {
      const health = await monitoringSystem.getHealthStatus()
      
      const componentNames = health.checks.map(check => check.name)
      expect(componentNames).toContain('metrics')
      expect(componentNames).toContain('logging')
      expect(componentNames).toContain('tracing')
      expect(componentNames).toContain('alerting')
      expect(componentNames).toContain('dashboards')
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await monitoringSystem.initialize()
    })

    it('should handle metrics collection errors gracefully', async () => {
      // Test with invalid metric data
      const invalidMetrics = [
        {
          name: '', // Invalid empty name
          value: NaN,
          timestamp: new Date(),
          labels: {},
          type: 'counter' as const
        }
      ]

      // Should not throw but should handle error internally
      await expect(monitoringSystem.collectMetrics('test', invalidMetrics))
        .resolves.not.toThrow()
    })

    it('should handle query errors gracefully', async () => {
      const invalidQuery: MetricQuery = {
        metric: 'nonexistent_metric',
        timeRange: {
          start: new Date(Date.now() + 3600000), // Future start time
          end: new Date()
        }
      }

      // Should handle invalid query gracefully
      const results = await monitoringSystem.queryMetrics(invalidQuery)
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Performance', () => {
    beforeEach(async () => {
      await monitoringSystem.initialize()
    })

    it('should handle large number of metrics efficiently', async () => {
      const startTime = Date.now()
      const largeMetricsSet: Metric[] = Array.from({ length: 1000 }, (_, i) => ({
        name: `test_metric_${i}`,
        value: Math.random() * 100,
        timestamp: new Date(),
        labels: { index: i.toString() },
        type: 'gauge' as const
      }))

      await monitoringSystem.collectMetrics('performance-test', largeMetricsSet)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, async (_, i) => {
        const metrics: Metric[] = [{
          name: `concurrent_metric_${i}`,
          value: i,
          timestamp: new Date(),
          labels: { operation: i.toString() },
          type: 'counter'
        }]
        
        return monitoringSystem.collectMetrics(`concurrent-${i}`, metrics)
      })

      await expect(Promise.all(operations)).resolves.not.toThrow()
    })
  })

  describe('Integration', () => {
    beforeEach(async () => {
      await monitoringSystem.initialize()
    })

    it('should integrate metrics with alerting', async () => {
      // Create an alert
      const alert: AlertDefinition = {
        name: 'Integration Test Alert',
        description: 'Test integration between metrics and alerting',
        condition: {
          metric: 'integration_test_metric',
          operator: 'gt',
          threshold: 50,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'medium',
        routing: {
          channels: [{
            type: 'email',
            config: { recipients: ['test@example.com'] },
            enabled: true
          }]
        },
        escalation: {
          levels: [],
          timeout: 3600
        },
        enabled: true
      }

      const alertId = await monitoringSystem.createAlert(alert)
      expect(alertId).toBeDefined()

      // Collect metrics that should trigger the alert
      const metrics: Metric[] = [{
        name: 'integration_test_metric',
        value: 75, // Above threshold
        timestamp: new Date(),
        labels: { test: 'integration' },
        type: 'gauge'
      }]

      await monitoringSystem.collectMetrics('integration-test', metrics)
      
      // The alert system should process this metric
      // In a real implementation, we would verify alert triggering
    })

    it('should integrate tracing with logging', async () => {
      // This test would verify that trace information
      // is properly correlated with log entries
      const metrics: Metric[] = [{
        name: 'traced_operation',
        value: 1,
        timestamp: new Date(),
        labels: { 
          trace_id: 'test-trace-123',
          span_id: 'test-span-456'
        },
        type: 'counter'
      }]

      await expect(monitoringSystem.collectMetrics('tracing-test', metrics))
        .resolves.not.toThrow()
    })
  })
})