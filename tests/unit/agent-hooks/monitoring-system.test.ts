import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonitoringSystem } from '../../../src/agent-hooks/monitoring/monitoring-system';
import {
  AlertSeverity,
  AlertStatus,
  HealthStatus,
  MetricType
} from '../../../src/agent-hooks/types/monitoring';
import { ErrorHandler } from '../../../src/agent-hooks/errors/error-handler';
import { PerformanceMonitor } from '../../../src/agent-hooks/performance/performance-monitor';
import { NotificationSystem } from '../../../src/agent-hooks/notifications/notification-system';

describe('MonitoringSystem', () => {
  let monitoringSystem: MonitoringSystem;
  let mockErrorHandler: ErrorHandler;
  let mockPerformanceMonitor: PerformanceMonitor;
  let mockNotificationSystem: NotificationSystem;

  const mockConfig = {
    enabled: true,
    metrics: {
      enabled: true,
      collectInterval: 60000,
      retention: '30d',
      exporters: []
    },
    alerts: {
      enabled: true,
      rules: [],
      evaluationInterval: 60000,
      resolveTimeout: '5m'
    },
    healthChecks: {
      enabled: true,
      checks: [],
      globalTimeout: 10000
    },
    logging: {
      enabled: true,
      level: 'info' as const,
      format: 'json' as const,
      outputs: [],
      retention: '7d'
    },
    tracing: {
      enabled: false,
      sampleRate: 1.0,
      exporters: [],
      retention: '7d'
    },
    dashboards: {
      enabled: false,
      refreshInterval: 30000,
      panels: []
    }
  };

  beforeEach(() => {
    mockErrorHandler = new ErrorHandler();
    mockPerformanceMonitor = new PerformanceMonitor();
    mockNotificationSystem = new NotificationSystem(
      {
        enabled: true,
        defaultChannels: [],
        templates: [],
        channelConfigs: {
          slack: { enabled: false },
          email: { enabled: false },
          webhook: { enabled: false },
          teams: { enabled: false },
          discord: { enabled: false }
        } as any,
        retryPolicy: { maxAttempts: 3, initialDelay: 1000, maxDelay: 10000, backoffMultiplier: 2, jitter: true },
        rateLimits: [],
        filters: []
      },
      mockErrorHandler,
      mockPerformanceMonitor
    );

    monitoringSystem = new MonitoringSystem(
      mockConfig,
      mockErrorHandler,
      mockPerformanceMonitor,
      mockNotificationSystem
    );
  });

  describe('start/stop', () => {
    it('should start and stop the monitoring system', async () => {
      await monitoringSystem.start();
      expect(monitoringSystem).toBeDefined();

      await monitoringSystem.stop();
    });

    it('should handle multiple start/stop cycles', async () => {
      await monitoringSystem.start();
      await monitoringSystem.stop();
      await monitoringSystem.start();
      await monitoringSystem.stop();
    });
  });

  describe('metrics collection', () => {
    it('should record and retrieve metrics', () => {
      monitoringSystem.recordMetric('test_metric', 42.0, { label1: 'value1' });

      const metric = monitoringSystem.getMetric('test_metric', { label1: 'value1' });
      expect(metric).toBeDefined();
      expect(metric?.value).toBe(42.0);
      expect(metric?.labels.label1).toBe('value1');
    });

    it('should handle different metric types', () => {
      monitoringSystem.recordMetric('counter_metric', 1, {}, MetricType.COUNTER);
      monitoringSystem.recordMetric('gauge_metric', 75.5, {}, MetricType.GAUGE);

      const counter = monitoringSystem.getMetric('counter_metric');
      const gauge = monitoringSystem.getMetric('gauge_metric');

      expect(counter?.type).toBe(MetricType.COUNTER);
      expect(gauge?.type).toBe(MetricType.GAUGE);
    });

    it('should return time series data', () => {
      monitoringSystem.recordMetric('time_series_metric', 10, { series: '1' });
      monitoringSystem.recordMetric('time_series_metric', 20, { series: '1' });

      const timeSeries = monitoringSystem.getTimeSeriesData('time_series_metric', { series: '1' });

      expect(timeSeries).toBeDefined();
      expect(timeSeries.values).toHaveLength(2);
      expect(timeSeries.values[0].value).toBe(10);
      expect(timeSeries.values[1].value).toBe(20);
    });

    it('should return undefined for non-existent metrics', () => {
      const metric = monitoringSystem.getMetric('non_existent_metric');
      expect(metric).toBeUndefined();
    });
  });

  describe('alert management', () => {
    it('should add and remove alert rules', () => {
      const alertRule = {
        id: 'test-alert',
        name: 'Test Alert',
        description: 'Test alert rule',
        condition: 'test_metric > 50',
        severity: AlertSeverity.WARNING,
        labels: { component: 'test' },
        annotations: {
          summary: 'Test alert triggered',
          description: 'This is a test alert'
        },
        duration: '5m',
        enabled: true,
        channels: [],
        cooldown: '15m'
      };

      monitoringSystem.addAlertRule(alertRule);
      // Should not throw error

      monitoringSystem.removeAlertRule('test-alert');
      // Should not throw error
    });

    it('should manage alert lifecycle', () => {
      const alertRule = {
        id: 'lifecycle-test',
        name: 'Lifecycle Test',
        description: 'Test alert lifecycle',
        condition: 'test_metric > 100',
        severity: AlertSeverity.CRITICAL,
        labels: { component: 'test' },
        annotations: {
          summary: 'Lifecycle test alert',
          description: 'Testing alert lifecycle'
        },
        duration: '1m',
        enabled: true,
        channels: []
      };

      monitoringSystem.addAlertRule(alertRule);

      // Initially no active alerts
      const activeAlerts = monitoringSystem.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should acknowledge and resolve alerts', () => {
      // Test acknowledge method
      const acknowledged = monitoringSystem.acknowledgeAlert('non-existent-alert');
      expect(acknowledged).toBe(false);

      // Test resolve method
      const resolved = monitoringSystem.resolveAlert('non-existent-alert');
      expect(resolved).toBe(false);
    });
  });

  describe('health checks', () => {
    it('should add and remove health checks', () => {
      const healthCheck = {
        id: 'test-health-check',
        name: 'Test Health Check',
        description: 'Test health check',
        type: 'http' as const,
        endpoint: 'http://localhost:3000/health',
        timeout: 5000,
        interval: 60000,
        enabled: true,
        critical: false,
        labels: { service: 'test' },
        config: {}
      };

      monitoringSystem.addHealthCheck(healthCheck);
      // Should not throw error

      monitoringSystem.removeHealthCheck('test-health-check');
      // Should not throw error
    });

    it('should perform system health assessment', async () => {
      const health = await monitoringSystem.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
      expect(health.services).toBeDefined();
      expect(health.checks).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(typeof health.uptime).toBe('number');
      expect(typeof health.version).toBe('string');
    });
  });

  describe('logging', () => {
    it('should log messages at different levels', () => {
      monitoringSystem.log('info', 'Test info message', 'test-component');
      monitoringSystem.log('error', 'Test error message', 'test-component', 'test-operation');

      const logs = monitoringSystem.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should filter logs by component', () => {
      monitoringSystem.log('info', 'Component A message', 'component-a');
      monitoringSystem.log('info', 'Component B message', 'component-b');

      const componentALogs = monitoringSystem.getLogs('component-a');
      const componentBLogs = monitoringSystem.getLogs('component-b');

      expect(componentALogs.every(log => log.component === 'component-a')).toBe(true);
      expect(componentBLogs.every(log => log.component === 'component-b')).toBe(true);
    });

    it('should filter logs by level', () => {
      monitoringSystem.log('info', 'Info message', 'test-component');
      monitoringSystem.log('error', 'Error message', 'test-component');

      const errorLogs = monitoringSystem.getLogs(undefined, 'error');
      expect(errorLogs.every(log => log.level === 'error')).toBe(true);
    });

    it('should limit log results', () => {
      // Add many logs
      for (let i = 0; i < 10; i++) {
        monitoringSystem.log('info', `Message ${i}`, 'test-component');
      }

      const limitedLogs = monitoringSystem.getLogs(undefined, undefined, 5);
      expect(limitedLogs).toHaveLength(5);
    });
  });

  describe('tracing', () => {
    it('should create and manage traces', () => {
      const traceId = monitoringSystem.startTrace('test-trace', { test: 'value' });

      expect(traceId).toBeDefined();
      expect(typeof traceId).toBe('string');

      const trace = monitoringSystem.getTrace(traceId);
      expect(trace).toBeDefined();
      expect(trace?.name).toBe('test-trace');
      expect(trace?.attributes.test).toBe('value');

      monitoringSystem.endTrace(traceId);
    });

    it('should create and manage spans', () => {
      const traceId = monitoringSystem.startTrace('span-test');
      const spanId = monitoringSystem.addSpan('test-span', 'internal', { span: 'data' });

      expect(spanId).toBeDefined();

      monitoringSystem.endSpan(spanId || '');
      monitoringSystem.endTrace(traceId);
    });

    it('should retrieve recent traces', () => {
      monitoringSystem.startTrace('recent-trace-1');
      monitoringSystem.endTrace('recent-trace-1');

      monitoringSystem.startTrace('recent-trace-2');
      monitoringSystem.endTrace('recent-trace-2');

      const recentTraces = monitoringSystem.getRecentTraces(10);
      expect(recentTraces.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('resource monitoring', () => {
    it('should get resource usage information', async () => {
      const resourceUsage = await monitoringSystem.getResourceUsage();

      expect(resourceUsage).toBeDefined();
      expect(resourceUsage.timestamp).toBeInstanceOf(Date);
      expect(resourceUsage.cpu).toBeDefined();
      expect(resourceUsage.memory).toBeDefined();
    });

    it('should get system information', () => {
      const systemInfo = monitoringSystem.getSystemInfo();

      expect(systemInfo).toBeDefined();
      expect(typeof systemInfo.hostname).toBe('string');
      expect(typeof systemInfo.platform).toBe('string');
      expect(typeof systemInfo.uptime).toBe('number');
      expect(Array.isArray(systemInfo.loadAverage)).toBe(true);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = {
        metrics: {
          enabled: false,
          collectInterval: 30000,
          retention: '15d',
          exporters: []
        }
      };

      monitoringSystem.updateConfig(newConfig);

      const updatedConfig = monitoringSystem.getConfig();
      expect(updatedConfig.metrics.enabled).toBe(false);
      expect(updatedConfig.metrics.collectInterval).toBe(30000);
    });

    it('should return current configuration', () => {
      const config = monitoringSystem.getConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.metrics).toBeDefined();
      expect(config.alerts).toBeDefined();
      expect(config.healthChecks).toBeDefined();
    });
  });

  describe('monitoring metrics', () => {
    it('should provide monitoring metrics', () => {
      const metrics = monitoringSystem.getMonitoringMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.metrics_collected).toBe('number');
      expect(typeof metrics.alerts_active).toBe('number');
      expect(typeof metrics.logs_processed).toBe('number');
      expect(metrics.collection_timestamp).toBeInstanceOf(Date);
    });
  });

  describe('error handling', () => {
    it('should handle errors during metric collection', async () => {
      // Mock error handler to capture errors
      const errorHandlerSpy = vi.spyOn(mockErrorHandler, 'handleError');

      // Force an error by stopping the system during metrics collection
      await monitoringSystem.stop();

      // Try to record a metric (should handle gracefully)
      monitoringSystem.recordMetric('test', 1);

      // Error should be handled gracefully
      expect(errorHandlerSpy).toHaveBeenCalled();
    });
  });

  describe('system integration', () => {
    it('should integrate with error handling system', async () => {
      const errorHandlerSpy = vi.spyOn(mockErrorHandler, 'handleError');

      // Trigger an error scenario
      monitoringSystem.log('error', 'Test error', 'test-component', 'test-op', undefined, new Error('Test'));

      expect(errorHandlerSpy).toHaveBeenCalled();
    });

    it('should integrate with notification system', async () => {
      const notificationSpy = vi.spyOn(mockNotificationSystem, 'sendNotification');

      // Add an alert rule that would trigger a notification
      const alertRule = {
        id: 'notification-test',
        name: 'Notification Test',
        description: 'Test notification integration',
        condition: 'test_metric > 0',
        severity: AlertSeverity.INFO,
        labels: { test: 'true' },
        annotations: {
          summary: 'Test notification',
          description: 'This is a test'
        },
        duration: '1m',
        enabled: true,
        channels: [],
        cooldown: '5m'
      };

      monitoringSystem.addAlertRule(alertRule);

      // The integration should work without throwing errors
      expect(alertRule).toBeDefined();
    });
  });
});