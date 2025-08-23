/**
 * Compliance Reporter Tests
 * Tests for compliance reporting and audit trail functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  ComplianceReporter, 
  ComplianceReporterConfig, 
  ComplianceEngine, 
  AuditTrailStorage 
} from '../../../src/analytics/compliance-reporter';
import { 
  ComplianceFramework, 
  ComplianceReport, 
  AuditEvent, 
  ComplianceViolation 
} from '../../../src/analytics/types';

describe('ComplianceReporter', () => {
  let complianceReporter: ComplianceReporter;
  let mockComplianceEngine: ComplianceEngine;
  let mockAuditStorage: AuditTrailStorage;
  let config: ComplianceReporterConfig;

  beforeEach(() => {
    mockComplianceEngine = {
      assessCompliance: vi.fn().mockResolvedValue({
        framework: {
          name: 'SOC2',
          version: '2017',
          requirements: [],
          controls: []
        },
        score: 85,
        status: {
          compliant: true,
          score: 85,
          lastAssessment: new Date(),
          nextAssessment: new Date()
        },
        violations: [],
        recommendations: [],
        assessmentDate: new Date()
      }),
      validateControls: vi.fn().mockResolvedValue([]),
      generateEvidence: vi.fn().mockResolvedValue({
        requirementId: 'REQ1',
        evidenceType: 'document',
        description: 'Test evidence',
        location: '/path/to/evidence',
        timestamp: new Date(),
        verified: true
      })
    };

    mockAuditStorage = {
      storeAuditEvent: vi.fn().mockResolvedValue(undefined),
      getAuditTrail: vi.fn().mockResolvedValue([]),
      searchAuditEvents: vi.fn().mockResolvedValue([])
    };

    config = {
      enableContinuousMonitoring: true,
      enableAuditTrail: true,
      frameworks: ['SOC2', 'HIPAA'],
      assessmentInterval: 3600000, // 1 hour
      retentionDays: 365,
      alertOnViolations: true
    };

    complianceReporter = new ComplianceReporter(
      config,
      mockComplianceEngine,
      mockAuditStorage
    );
  });

  afterEach(async () => {
    await complianceReporter.stop();
  });

  describe('Compliance Report Generation', () => {
    it('should generate SOC2 compliance report', async () => {
      const report = await complianceReporter.generateSOC2Report();

      expect(mockComplianceEngine.assessCompliance).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'SOC 2',
          version: '2017'
        })
      );

      expect(report).toMatchObject({
        framework: expect.objectContaining({
          name: 'SOC 2'
        }),
        status: expect.objectContaining({
          compliant: expect.any(Boolean),
          score: expect.any(Number)
        }),
        score: expect.any(Number),
        violations: expect.any(Array),
        recommendations: expect.any(Array),
        auditTrail: expect.any(Array)
      });
    });

    it('should generate HIPAA compliance report', async () => {
      const report = await complianceReporter.generateHIPAAReport();

      expect(mockComplianceEngine.assessCompliance).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'HIPAA',
          version: '2013'
        })
      );

      expect(report.framework.name).toBe('HIPAA');
    });

    it('should generate PCI-DSS compliance report', async () => {
      const report = await complianceReporter.generatePCIDSSReport();

      expect(report.framework.name).toBe('PCI DSS');
      expect(report.framework.version).toBe('4.0');
    });

    it('should generate GDPR compliance report', async () => {
      const report = await complianceReporter.generateGDPRReport();

      expect(report.framework.name).toBe('GDPR');
      expect(report.framework.version).toBe('2018');
    });

    it('should emit compliance report generated event', async () => {
      const reportSpy = vi.fn();
      complianceReporter.on('complianceReportGenerated', reportSpy);

      await complianceReporter.generateSOC2Report();

      expect(reportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: expect.objectContaining({ name: 'SOC 2' })
        })
      );
    });

    it('should throw error for unknown framework', async () => {
      await expect(
        complianceReporter.generateComplianceReport('UNKNOWN')
      ).rejects.toThrow('Framework not found: UNKNOWN');
    });
  });

  describe('Audit Trail Management', () => {
    it('should log audit events', async () => {
      await complianceReporter.logAuditEvent(
        'user123',
        'login',
        'system',
        'success',
        { ip: '192.168.1.1' }
      );

      expect(mockAuditStorage.storeAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^audit_\d+_[a-z0-9]+$/),
          timestamp: expect.any(Date),
          user: 'user123',
          action: 'login',
          resource: 'system',
          outcome: 'success',
          details: { ip: '192.168.1.1' }
        })
      );
    });

    it('should not log audit events when disabled', async () => {
      config.enableAuditTrail = false;
      const reporter = new ComplianceReporter(
        config,
        mockComplianceEngine,
        mockAuditStorage
      );

      await reporter.logAuditEvent('user123', 'login', 'system', 'success');

      expect(mockAuditStorage.storeAuditEvent).not.toHaveBeenCalled();
      await reporter.stop();
    });

    it('should emit audit event logged', async () => {
      const auditSpy = vi.fn();
      complianceReporter.on('auditEventLogged', auditSpy);

      await complianceReporter.logAuditEvent('user123', 'login', 'system', 'success');

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'user123',
          action: 'login'
        })
      );
    });

    it('should get audit trail for time range', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const filters = {
        users: ['user123'],
        actions: ['login', 'logout']
      };

      await complianceReporter.getAuditTrail(timeRange, filters);

      expect(mockAuditStorage.getAuditTrail).toHaveBeenCalledWith(timeRange, filters);
    });

    it('should search audit events', async () => {
      const query = {
        searchTerm: 'login',
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        limit: 100
      };

      await complianceReporter.searchAuditEvents(query);

      expect(mockAuditStorage.searchAuditEvents).toHaveBeenCalledWith(query);
    });
  });

  describe('Control Validation', () => {
    it('should validate compliance controls', async () => {
      const mockValidationResults = [
        {
          controlId: 'CC1.1.1',
          implemented: true,
          effectiveness: 0.9,
          evidence: ['policy.pdf', 'training.log'],
          gaps: []
        }
      ];

      (mockComplianceEngine.validateControls as any).mockResolvedValue(mockValidationResults);

      const results = await complianceReporter.validateControls('SOC2');

      expect(mockComplianceEngine.validateControls).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'CC1.1.1' })
        ])
      );

      expect(results).toEqual(mockValidationResults);
    });
  });

  describe('Compliance Dashboard', () => {
    it('should get compliance dashboard data', async () => {
      const dashboardData = await complianceReporter.getComplianceDashboardData();

      expect(dashboardData).toMatchObject({
        frameworkStatuses: expect.any(Object),
        overallScores: expect.any(Object),
        criticalViolations: expect.any(Array),
        lastAssessment: expect.any(Date),
        trendsData: expect.any(Array)
      });
    });

    it('should get compliance trends', async () => {
      const trends = await complianceReporter.getComplianceTrends();

      expect(trends).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            framework: expect.any(String),
            timeline: expect.arrayContaining([
              expect.objectContaining({
                date: expect.any(Date),
                score: expect.any(Number)
              })
            ])
          })
        ])
      );
    });
  });

  describe('Assessment Management', () => {
    it('should assess all configured frameworks', async () => {
      const reports = await complianceReporter.assessAllFrameworks();

      expect(reports.size).toBe(2); // SOC2 and HIPAA
      expect(reports.has('SOC2')).toBe(true);
      expect(reports.has('HIPAA')).toBe(true);
    });

    it('should handle assessment errors gracefully', async () => {
      const error = new Error('Assessment failed');
      (mockComplianceEngine.assessCompliance as any).mockRejectedValue(error);

      const errorSpy = vi.fn();
      complianceReporter.on('assessmentError', errorSpy);

      await complianceReporter.assessAllFrameworks();

      expect(errorSpy).toHaveBeenCalledWith({
        framework: expect.any(String),
        error
      });
    });
  });

  describe('Framework Definitions', () => {
    it('should create SOC2 framework with correct structure', async () => {
      const report = await complianceReporter.generateSOC2Report();
      const framework = report.framework;

      expect(framework.name).toBe('SOC 2');
      expect(framework.version).toBe('2017');
      expect(framework.requirements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'CC1.1',
            name: 'Control Environment',
            mandatory: true
          })
        ])
      );
    });

    it('should create HIPAA framework with correct structure', async () => {
      const report = await complianceReporter.generateHIPAAReport();
      const framework = report.framework;

      expect(framework.name).toBe('HIPAA');
      expect(framework.requirements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: '164.308',
            name: 'Administrative Safeguards'
          })
        ])
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle compliance engine errors', async () => {
      const error = new Error('Compliance engine error');
      (mockComplianceEngine.assessCompliance as any).mockRejectedValue(error);

      await expect(
        complianceReporter.generateSOC2Report()
      ).rejects.toThrow('Compliance engine error');
    });

    it('should handle audit storage errors', async () => {
      const error = new Error('Storage error');
      (mockAuditStorage.storeAuditEvent as any).mockRejectedValue(error);

      await expect(
        complianceReporter.logAuditEvent('user123', 'login', 'system', 'success')
      ).rejects.toThrow('Storage error');
    });
  });

  describe('Lifecycle', () => {
    it('should stop gracefully', async () => {
      const stoppedSpy = vi.fn();
      complianceReporter.on('stopped', stoppedSpy);

      await complianceReporter.stop();

      expect(stoppedSpy).toHaveBeenCalled();
    });
  });
});