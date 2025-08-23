/**
 * Reporting System Tests
 * Tests for business intelligence and reporting functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  ReportingSystem, 
  ReportingSystemConfig, 
  ReportGenerator, 
  DashboardEngine, 
  AlertEngine 
} from '../../../src/analytics/reporting-system';
import { 
  Dashboard, 
  Report, 
  ReportType, 
  ReportFormat, 
  AlertRule, 
  AlertSeverity 
} from '../../../src/analytics/types';

describe('ReportingSystem', () => {
  let reportingSystem: ReportingSystem;
  let mockReportGenerator: ReportGenerator;
  let mockDashboardEngine: DashboardEngine;
  let mockAlertEngine: AlertEngine;
  let config: ReportingSystemConfig;

  beforeEach(() => {
    mockReportGenerator = {
      generateReport: vi.fn().mockResolvedValue({
        id: 'report_123',
        name: 'Test Report',
        type: 'usage',
        format: 'json',
        data: { users: 100 },
        generatedAt: new Date(),
        recipients: []
      }),
      exportReport: vi.fn().mockResolvedValue(Buffer.from('exported data'))
    };

    mockDashboardEngine = {
      createDashboard: vi.fn().mockResolvedValue({
        id: 'dash_123',
        name: 'Test Dashboard',
        description: 'Test dashboard',
        widgets: [],
        layout: { columns: 12, rows: 4, responsive: true },
        permissions: { viewers: [], editors: [], owners: [] },
        refreshInterval: 300000
      }),
      updateDashboard: vi.fn(),
      deleteDashboard: vi.fn(),
      getDashboard: vi.fn(),
      listDashboards: vi.fn().mockResolvedValue([]),
      renderDashboard: vi.fn().mockResolvedValue({
        dashboard: {} as Dashboard,
        widgetData: {},
        lastUpdated: new Date()
      })
    };

    mockAlertEngine = {
      createAlert: vi.fn().mockResolvedValue({
        id: 'alert_123',
        name: 'Test Alert',
        condition: { metric: 'test', operator: 'gt', value: 100, duration: 60000 },
        threshold: 100,
        severity: 'warning',
        actions: [],
        enabled: true
      }),
      updateAlert: vi.fn(),
      deleteAlert: vi.fn(),
      evaluateAlerts: vi.fn(),
      triggerAlert: vi.fn()
    };

    config = {
      enableScheduledReports: true,
      enableRealTimeAlerts: true,
      maxDashboards: 50,
      maxWidgetsPerDashboard: 20,
      reportRetentionDays: 90,
      alertCooldownMinutes: 5
    };

    reportingSystem = new ReportingSystem(
      config,
      mockReportGenerator,
      mockDashboardEngine,
      mockAlertEngine
    );
  });

  afterEach(async () => {
    await reportingSystem.stop();
  });

  describe('Dashboard Management', () => {
    it('should create a dashboard', async () => {
      const widgets = [
        {
          type: 'metric' as const,
          title: 'Total Users',
          dataSource: 'users.total',
          configuration: {
            query: 'SELECT COUNT(*) FROM users',
            timeRange: '24h',
            refreshInterval: 300000,
            visualization: { type: 'number' }
          },
          position: { x: 0, y: 0, width: 4, height: 2 }
        }
      ];

      const dashboard = await reportingSystem.createDashboard(
        'User Analytics',
        'User analytics dashboard',
        widgets
      );

      expect(mockDashboardEngine.createDashboard).toHaveBeenCalledWith({
        name: 'User Analytics',
        description: 'User analytics dashboard',
        widgets: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^widget_\d+_[a-z0-9]+$/),
            type: 'metric',
            title: 'Total Users'
          })
        ]),
        layout: { columns: 12, rows: 1, responsive: true },
        permissions: { viewers: [], editors: [], owners: [] },
        refreshInterval: 300000
      });

      expect(dashboard.id).toBe('dash_123');
    });

    it('should reject dashboard with too many widgets', async () => {
      const widgets = Array(25).fill(null).map((_, i) => ({
        type: 'metric' as const,
        title: `Widget ${i}`,
        dataSource: 'test',
        configuration: { query: 'SELECT 1', timeRange: '1h', refreshInterval: 300000, visualization: {} },
        position: { x: 0, y: 0, width: 1, height: 1 }
      }));

      await expect(
        reportingSystem.createDashboard('Test', 'Test dashboard', widgets)
      ).rejects.toThrow('Dashboard cannot have more than 20 widgets');
    });

    it('should create usage analytics dashboard', async () => {
      const dashboard = await reportingSystem.createUsageAnalyticsDashboard();

      expect(mockDashboardEngine.createDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Usage Analytics',
          description: 'Comprehensive user and feature usage analytics',
          widgets: expect.arrayContaining([
            expect.objectContaining({ title: 'Total Users' }),
            expect.objectContaining({ title: 'Active Users' }),
            expect.objectContaining({ title: 'User Activity Over Time' }),
            expect.objectContaining({ title: 'Feature Usage' })
          ])
        })
      );
    });

    it('should create performance analytics dashboard', async () => {
      const dashboard = await reportingSystem.createPerformanceAnalyticsDashboard();

      expect(mockDashboardEngine.createDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Performance Analytics',
          widgets: expect.arrayContaining([
            expect.objectContaining({ title: 'Average Response Time' }),
            expect.objectContaining({ title: 'Throughput (req/sec)' }),
            expect.objectContaining({ title: 'Error Rate' }),
            expect.objectContaining({ title: 'Response Time Trend' })
          ])
        })
      );
    });

    it('should create business analytics dashboard', async () => {
      const dashboard = await reportingSystem.createBusinessAnalyticsDashboard();

      expect(mockDashboardEngine.createDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Business Analytics',
          widgets: expect.arrayContaining([
            expect.objectContaining({ title: 'Conversion Rate' }),
            expect.objectContaining({ title: 'User Satisfaction' }),
            expect.objectContaining({ title: 'Revenue Trend' }),
            expect.objectContaining({ title: 'Top Features by Usage' })
          ])
        })
      );
    });
  });

  describe('Report Generation', () => {
    it('should generate a report', async () => {
      const parameters = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        filters: { userId: 'user123' }
      };

      const report = await reportingSystem.generateReport('usage', parameters, 'json');

      expect(mockReportGenerator.generateReport).toHaveBeenCalledWith('usage', parameters);
      expect(report.id).toBe('report_123');
      expect(report.type).toBe('usage');
    });

    it('should export report in different formats', async () => {
      const parameters = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      const report = await reportingSystem.generateReport('performance', parameters, 'pdf');

      expect(mockReportGenerator.generateReport).toHaveBeenCalledWith('performance', parameters);
      expect(mockReportGenerator.exportReport).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'report_123' }),
        'pdf'
      );
    });

    it('should emit report generated event', async () => {
      const reportSpy = vi.fn();
      reportingSystem.on('reportGenerated', reportSpy);

      const parameters = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      await reportingSystem.generateReport('usage', parameters);

      expect(reportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'report_123' })
      );
    });
  });

  describe('Scheduled Reports', () => {
    it('should schedule a recurring report', async () => {
      const parameters = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      const schedule = {
        frequency: 'daily' as const,
        time: '09:00',
        timezone: 'UTC',
        enabled: true
      };

      const reportId = await reportingSystem.scheduleReport(
        'Daily Usage Report',
        'usage',
        parameters,
        schedule,
        ['admin@example.com'],
        'pdf'
      );

      expect(reportId).toMatch(/^report_\d+_[a-z0-9]+$/);
    });

    it('should reject scheduling when disabled', async () => {
      config.enableScheduledReports = false;
      const system = new ReportingSystem(
        config,
        mockReportGenerator,
        mockDashboardEngine,
        mockAlertEngine
      );

      const parameters = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      const schedule = {
        frequency: 'daily' as const,
        time: '09:00',
        timezone: 'UTC',
        enabled: true
      };

      await expect(
        system.scheduleReport('Test', 'usage', parameters, schedule, [])
      ).rejects.toThrow('Scheduled reports are disabled');

      await system.stop();
    });
  });

  describe('Alert Management', () => {
    it('should create an alert rule', async () => {
      const condition = {
        metric: 'error_rate',
        operator: 'gt' as const,
        value: 5,
        duration: 300000
      };

      const actions = [
        {
          type: 'email' as const,
          configuration: { recipients: ['admin@example.com'] }
        }
      ];

      const alertRule = await reportingSystem.createAlert(
        'High Error Rate',
        condition,
        'critical',
        actions
      );

      expect(mockAlertEngine.createAlert).toHaveBeenCalledWith({
        name: 'High Error Rate',
        condition,
        threshold: 5,
        severity: 'critical',
        actions,
        enabled: true
      });

      expect(alertRule.id).toBe('alert_123');
    });

    it('should emit alert created event', async () => {
      const alertSpy = vi.fn();
      reportingSystem.on('alertCreated', alertSpy);

      const condition = {
        metric: 'response_time',
        operator: 'gt' as const,
        value: 1000,
        duration: 60000
      };

      await reportingSystem.createAlert('Slow Response', condition, 'warning', []);

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'alert_123' })
      );
    });
  });

  describe('Widget Management', () => {
    it('should generate unique widget IDs', async () => {
      const widgets = [
        {
          type: 'metric' as const,
          title: 'Widget 1',
          dataSource: 'test1',
          configuration: { query: 'SELECT 1', timeRange: '1h', refreshInterval: 300000, visualization: {} },
          position: { x: 0, y: 0, width: 1, height: 1 }
        },
        {
          type: 'metric' as const,
          title: 'Widget 2',
          dataSource: 'test2',
          configuration: { query: 'SELECT 2', timeRange: '1h', refreshInterval: 300000, visualization: {} },
          position: { x: 1, y: 0, width: 1, height: 1 }
        }
      ];

      await reportingSystem.createDashboard('Test', 'Test dashboard', widgets);

      const createCall = (mockDashboardEngine.createDashboard as any).mock.calls[0][0];
      const createdWidgets = createCall.widgets;

      expect(createdWidgets).toHaveLength(2);
      expect(createdWidgets[0].id).not.toBe(createdWidgets[1].id);
      expect(createdWidgets[0].id).toMatch(/^widget_\d+_[a-z0-9]+$/);
      expect(createdWidgets[1].id).toMatch(/^widget_\d+_[a-z0-9]+$/);
    });
  });

  describe('Event Handling', () => {
    it('should emit dashboard created event', async () => {
      const dashboardSpy = vi.fn();
      reportingSystem.on('dashboardCreated', dashboardSpy);

      await reportingSystem.createDashboard('Test', 'Test dashboard', []);

      expect(dashboardSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dash_123' })
      );
    });

    it('should emit stopped event on stop', async () => {
      const stoppedSpy = vi.fn();
      reportingSystem.on('stopped', stoppedSpy);

      await reportingSystem.stop();

      expect(stoppedSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle dashboard creation errors', async () => {
      const error = new Error('Dashboard creation failed');
      (mockDashboardEngine.createDashboard as any).mockRejectedValue(error);

      await expect(
        reportingSystem.createDashboard('Test', 'Test dashboard', [])
      ).rejects.toThrow('Dashboard creation failed');
    });

    it('should handle report generation errors', async () => {
      const error = new Error('Report generation failed');
      (mockReportGenerator.generateReport as any).mockRejectedValue(error);

      const parameters = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      await expect(
        reportingSystem.generateReport('usage', parameters)
      ).rejects.toThrow('Report generation failed');
    });
  });
});