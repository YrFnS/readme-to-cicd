/**
 * Tests for ComplianceManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceManager } from '../../../src/compliance/compliance-manager';
import { PolicyEngine } from '../../../src/compliance/policy-engine';
import { RiskManager } from '../../../src/compliance/risk-manager';
import { AuditTrailManager } from '../../../src/compliance/audit-trail-manager';
import { FrameworkRegistry } from '../../../src/compliance/frameworks/framework-registry';
import { SOC2Framework } from '../../../src/compliance/frameworks/soc2-framework';

describe('ComplianceManager', () => {
  let complianceManager: ComplianceManager;
  let mockPolicyEngine: PolicyEngine;
  let mockRiskManager: RiskManager;
  let mockAuditManager: AuditTrailManager;
  let mockFrameworkRegistry: FrameworkRegistry;

  beforeEach(() => {
    // Create mocks
    mockPolicyEngine = {
      enforcePolicy: vi.fn()
    } as any;

    mockRiskManager = {
      assessRisk: vi.fn()
    } as any;

    mockAuditManager = {
      logEvent: vi.fn(),
      generateReport: vi.fn()
    } as any;

    mockFrameworkRegistry = {
      getFramework: vi.fn()
    } as any;

    const monitoringConfig = {
      frameworks: ['SOC2'],
      frequency: 'DAILY',
      automated: true,
      notifications: [],
      thresholds: []
    };

    complianceManager = new ComplianceManager(
      mockPolicyEngine,
      mockRiskManager,
      mockAuditManager,
      mockFrameworkRegistry,
      monitoringConfig
    );
  });

  describe('validateCompliance', () => {
    it('should validate compliance against a framework', async () => {
      // Arrange
      const framework = new SOC2Framework().getFramework();

      // Act
      const report = await complianceManager.validateCompliance(framework);

      // Assert
      expect(report).toBeDefined();
      expect(report.framework).toBe(framework.id);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.findings).toBeInstanceOf(Array);
      expect(mockAuditManager.logEvent).toHaveBeenCalled();
    });

    it('should calculate compliance score correctly', async () => {
      // Arrange
      const framework = new SOC2Framework().getFramework();

      // Act
      const report = await complianceManager.validateCompliance(framework);

      // Assert
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(['COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT']).toContain(report.status);
    });

    it('should handle validation errors gracefully', async () => {
      // Arrange
      const invalidFramework = {
        id: 'INVALID',
        name: 'Invalid Framework',
        version: '1.0',
        type: 'CUSTOM' as const,
        requirements: [],
        controls: [],
        assessmentCriteria: []
      };

      // Act & Assert
      await expect(complianceManager.validateCompliance(invalidFramework))
        .resolves.toBeDefined();
    });
  });

  describe('enforcePolicy', () => {
    it('should enforce policy through policy engine', async () => {
      // Arrange
      const policy = {
        id: 'test-policy',
        name: 'Test Policy',
        version: '1.0',
        description: 'Test policy description',
        type: 'SECURITY' as const,
        scope: {
          components: [],
          environments: [],
          users: [],
          resources: []
        },
        rules: [],
        enforcement: {
          mode: 'ENFORCING' as const,
          automated: true,
          notifications: [],
          escalation: {
            levels: [],
            timeout: 3600,
            autoEscalate: false
          }
        },
        exceptions: [],
        approvals: []
      };

      const expectedResult = {
        policyId: policy.id,
        decision: 'ALLOW' as const,
        reason: 'Policy allows action',
        evidence: [],
        recommendations: []
      };

      mockPolicyEngine.enforcePolicy = vi.fn().mockResolvedValue(expectedResult);

      // Act
      const result = await complianceManager.enforcePolicy(policy);

      // Assert
      expect(mockPolicyEngine.enforcePolicy).toHaveBeenCalledWith(policy);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report through audit manager', async () => {
      // Arrange
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const expectedReport = {
        id: 'audit-report-123',
        title: 'Test Audit Report',
        period: timeRange,
        scope: ['all'],
        events: [],
        summary: {
          totalEvents: 0,
          successfulEvents: 0,
          failedEvents: 0,
          errorEvents: 0,
          uniqueUsers: 0,
          topActions: [],
          riskEvents: []
        },
        findings: [],
        recommendations: []
      };

      mockAuditManager.generateReport = vi.fn().mockResolvedValue(expectedReport);

      // Act
      const result = await complianceManager.generateAuditReport(timeRange);

      // Assert
      expect(mockAuditManager.generateReport).toHaveBeenCalledWith(timeRange);
      expect(result).toEqual(expectedReport);
    });
  });

  describe('trackRisk', () => {
    it('should track risk through risk manager', async () => {
      // Arrange
      const risk = {
        id: 'risk-001',
        title: 'Test Risk',
        description: 'Test risk description',
        category: 'SECURITY' as const,
        likelihood: {
          level: 'MEDIUM' as const,
          score: 3,
          justification: 'Medium likelihood'
        },
        impact: {
          level: 'HIGH' as const,
          score: 4,
          justification: 'High impact'
        },
        riskScore: 12,
        mitigation: [],
        owner: 'test-owner',
        status: 'IDENTIFIED' as const,
        lastReview: new Date(),
        nextReview: new Date()
      };

      // Act
      await complianceManager.trackRisk(risk);

      // Assert
      expect(mockRiskManager.assessRisk).toHaveBeenCalledWith(risk);
    });
  });

  describe('continuous monitoring', () => {
    it('should start continuous monitoring', async () => {
      // Arrange
      const framework = new SOC2Framework().getFramework();
      mockFrameworkRegistry.getFramework = vi.fn().mockResolvedValue(framework);

      // Act
      await complianceManager.startContinuousMonitoring();

      // Assert
      expect(mockFrameworkRegistry.getFramework).toHaveBeenCalledWith('SOC2');
    });

    it('should stop continuous monitoring', async () => {
      // Act
      await complianceManager.stopContinuousMonitoring();

      // Assert - No errors should be thrown
      expect(true).toBe(true);
    });

    it('should get compliance status for all frameworks', async () => {
      // Arrange
      const framework = new SOC2Framework().getFramework();
      mockFrameworkRegistry.getFramework = vi.fn().mockResolvedValue(framework);

      // Act
      const statusMap = await complianceManager.getComplianceStatus();

      // Assert
      expect(statusMap).toBeInstanceOf(Map);
      expect(mockFrameworkRegistry.getFramework).toHaveBeenCalledWith('SOC2');
    });
  });

  describe('monitoring configuration', () => {
    it('should update monitoring configuration', async () => {
      // Arrange
      const newConfig = {
        frameworks: ['SOC2', 'HIPAA'],
        frequency: 'WEEKLY',
        automated: false,
        notifications: [],
        thresholds: []
      };

      // Act
      await complianceManager.updateMonitoringConfig(newConfig);

      // Assert - No errors should be thrown
      expect(true).toBe(true);
    });
  });
});