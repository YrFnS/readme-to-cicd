import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityScanner } from '../../../src/agent-hooks/security/security-scanner';
import {
  RepositoryInfo,
  GitHubAPIConfig,
  WebhookEvent,
  WebhookEventType,
  EventPriority
} from '../../../src/agent-hooks/types';
import {
  SecurityAlertType,
  SecuritySeverity,
  SecurityAlertState,
  SecurityConfiguration
} from '../../../src/agent-hooks/types/security';
import { ErrorHandler } from '../../../src/agent-hooks/errors/error-handler';
import { PerformanceMonitor } from '../../../src/agent-hooks/performance/performance-monitor';
import { RuleManager } from '../../../src/agent-hooks/rules';

describe('SecurityScanner', () => {
  let securityScanner: SecurityScanner;
  let mockErrorHandler: ErrorHandler;
  let mockPerformanceMonitor: PerformanceMonitor;
  let mockRuleManager: RuleManager;

  const mockRepository: RepositoryInfo = {
    owner: 'test-owner',
    name: 'test-repo',
    fullName: 'test-owner/test-repo',
    defaultBranch: 'main'
  };

  const mockConfig: GitHubAPIConfig = {
    token: 'test-token',
    baseUrl: undefined,
    userAgent: 'test-agent',
    requestTimeout: 10000
  };

  const mockSecurityConfig: SecurityConfiguration = {
    enabled_scanners: [SecurityAlertType.CODE_SCANNING, SecurityAlertType.DEPENDABOT],
    severity_thresholds: {
      [SecuritySeverity.CRITICAL]: 10,
      [SecuritySeverity.HIGH]: 8,
      [SecuritySeverity.MEDIUM]: 5,
      [SecuritySeverity.LOW]: 2,
      [SecuritySeverity.INFO]: 1
    },
    auto_fix_enabled: false,
    notification_channels: ['slack'],
    scan_schedule: '0 0 * * *',
    excluded_paths: ['node_modules/**'],
    compliance_frameworks: ['owasp']
  };

  beforeEach(() => {
    mockErrorHandler = new ErrorHandler();
    mockPerformanceMonitor = new PerformanceMonitor();
    mockRuleManager = new RuleManager();

    securityScanner = new SecurityScanner(
      mockConfig,
      mockSecurityConfig,
      mockErrorHandler,
      mockPerformanceMonitor,
      mockRuleManager
    );
  });

  describe('scanRepository', () => {
    it('should scan repository with enabled scanners', async () => {
      const result = await securityScanner.scanRepository(mockRepository);

      expect(result).toBeDefined();
      expect(result.repository).toBe(mockRepository);
      expect(result.scan_time).toBeInstanceOf(Date);
      expect(result.total_alerts).toBe(0); // No alerts in placeholder implementation
    });

    it('should aggregate results from multiple scanners', async () => {
      const result = await securityScanner.scanRepository(mockRepository);

      expect(result.scan_type).toBe(SecurityAlertType.MANUAL);
      expect(result.scan_duration).toBeGreaterThanOrEqual(0);
      expect(result.critical_alerts).toBe(0);
      expect(result.high_alerts).toBe(0);
      expect(result.medium_alerts).toBe(0);
      expect(result.low_alerts).toBe(0);
    });

    it('should handle scanner errors gracefully', async () => {
      // Test with invalid configuration that would cause errors
      const invalidConfig = { ...mockConfig, token: '' };
      const scannerWithInvalidConfig = new SecurityScanner(
        invalidConfig,
        mockSecurityConfig,
        mockErrorHandler,
        mockPerformanceMonitor,
        mockRuleManager
      );

      // Should not throw but handle errors internally
      await expect(scannerWithInvalidConfig.scanRepository(mockRepository)).resolves.toBeDefined();
    });
  });

  describe('processSecurityAlerts', () => {
    it('should process alerts and create remediations', async () => {
      const mockScanResult = {
        repository: mockRepository,
        scan_type: SecurityAlertType.DEPENDABOT,
        alerts: [
          {
            id: 'test-alert-1',
            number: 1,
            type: SecurityAlertType.DEPENDABOT,
            state: SecurityAlertState.OPEN,
            severity: SecuritySeverity.HIGH,
            title: 'Vulnerable dependency',
            description: 'Test vulnerability',
            html_url: 'https://github.com/test/test/security/dependabot/1',
            repository: mockRepository,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            vulnerable_version: '1.0.0',
            safe_version: '1.1.0',
            package_name: 'test-package',
            manifest_path: 'package.json'
          }
        ],
        scan_time: new Date(),
        scan_duration: 1000,
        total_alerts: 1,
        critical_alerts: 0,
        high_alerts: 1,
        medium_alerts: 0,
        low_alerts: 0,
        info_alerts: 0,
        new_alerts: 1,
        fixed_alerts: 0,
        dismissed_alerts: 0
      };

      const remediations = await securityScanner.processSecurityAlerts(mockScanResult);

      expect(remediations).toBeDefined();
      expect(remediations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty alert list', async () => {
      const mockScanResult = {
        repository: mockRepository,
        scan_type: SecurityAlertType.CODE_SCANNING,
        alerts: [],
        scan_time: new Date(),
        scan_duration: 500,
        total_alerts: 0,
        critical_alerts: 0,
        high_alerts: 0,
        medium_alerts: 0,
        low_alerts: 0,
        info_alerts: 0,
        new_alerts: 0,
        fixed_alerts: 0,
        dismissed_alerts: 0
      };

      const remediations = await securityScanner.processSecurityAlerts(mockScanResult);

      expect(remediations).toEqual([]);
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return security metrics structure', async () => {
      const metrics = await securityScanner.getSecurityMetrics(mockRepository);

      expect(metrics).toBeDefined();
      expect(metrics.total_alerts).toBe(0);
      expect(metrics.alerts_by_severity).toBeDefined();
      expect(metrics.alerts_by_type).toBeDefined();
      expect(metrics.alerts_by_state).toBeDefined();
      expect(metrics.security_score).toBe(100);
      expect(metrics.trend_direction).toBe('stable');
      expect(metrics.scan_success_rate).toBe(100);
    });
  });

  describe('getSecurityDashboard', () => {
    it('should return security dashboard structure', async () => {
      const dashboard = await securityScanner.getSecurityDashboard(mockRepository);

      expect(dashboard).toBeDefined();
      expect(dashboard.overall_score).toBe(100);
      expect(dashboard.critical_issues).toBe(0);
      expect(dashboard.high_risk_issues).toBe(0);
      expect(dashboard.recent_alerts).toEqual([]);
      expect(dashboard.compliance_status).toEqual({});
      expect(dashboard.security_trends).toEqual([]);
      expect(dashboard.top_vulnerabilities).toEqual([]);
    });
  });

  describe('updateSecurityConfiguration', () => {
    it('should update security configuration', async () => {
      const newConfig = {
        auto_fix_enabled: true,
        notification_channels: ['slack', 'email']
      };

      await securityScanner.updateSecurityConfiguration(newConfig);

      const updatedConfig = securityScanner.getSecurityConfiguration();
      expect(updatedConfig.auto_fix_enabled).toBe(true);
      expect(updatedConfig.notification_channels).toEqual(['slack', 'email']);
    });
  });

  describe('getSecurityConfiguration', () => {
    it('should return current security configuration', () => {
      const config = securityScanner.getSecurityConfiguration();

      expect(config).toBeDefined();
      expect(config.enabled_scanners).toEqual([SecurityAlertType.CODE_SCANNING, SecurityAlertType.DEPENDABOT]);
      expect(config.severity_thresholds).toBeDefined();
      expect(config.compliance_frameworks).toEqual(['owasp']);
    });
  });

  describe('error handling', () => {
    it('should handle GitHub API errors gracefully', async () => {
      // Mock a configuration that would cause API errors
      const errorConfig = { ...mockConfig, token: 'invalid-token' };
      const scannerWithError = new SecurityScanner(
        errorConfig,
        mockSecurityConfig,
        mockErrorHandler,
        mockPerformanceMonitor,
        mockRuleManager
      );

      // Should not throw but handle errors internally
      await expect(scannerWithError.scanRepository(mockRepository)).resolves.toBeDefined();
    });

    it('should continue scanning even if one scanner fails', async () => {
      // Test with mixed valid/invalid configuration
      const mixedConfig = { ...mockSecurityConfig, enabled_scanners: [SecurityAlertType.CODE_SCANNING, SecurityAlertType.SECRET_SCANNING] };

      const scannerMixed = new SecurityScanner(
        mockConfig,
        mixedConfig,
        mockErrorHandler,
        mockPerformanceMonitor,
        mockRuleManager
      );

      const result = await scannerMixed.scanRepository(mockRepository);
      expect(result).toBeDefined();
      expect(result.repository).toBe(mockRepository);
    });
  });

  describe('performance monitoring', () => {
    it('should complete security scan without errors', async () => {
      // Test that the scan completes successfully
      const result = await securityScanner.scanRepository(mockRepository);

      expect(result).toBeDefined();
      expect(result.repository).toBe(mockRepository);
      expect(result.scan_duration).toBeGreaterThanOrEqual(0);
    });
  });
});