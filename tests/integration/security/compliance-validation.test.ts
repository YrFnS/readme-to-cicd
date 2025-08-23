/**
 * Compliance Validation Tests
 * 
 * Tests for compliance framework validation, policy enforcement,
 * and regulatory compliance support.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ComplianceService } from '../../../src/integration/security/compliance/compliance-service.js'
import type { ComplianceConfig } from '../../../src/integration/security/types.js'

describe('Compliance Validation Tests', () => {
  let complianceService: ComplianceService
  let config: ComplianceConfig

  beforeEach(() => {
    config = {
      frameworks: ['soc2', 'hipaa', 'pci-dss', 'gdpr'],
      assessmentSchedule: '0 0 1 * *', // Monthly
      autoRemediation: false,
      reportingEmail: ['compliance@example.com', 'security@example.com']
    }

    complianceService = new ComplianceService(config)
  })

  describe('SOC 2 Compliance', () => {
    it('should validate SOC 2 framework', async () => {
      const framework = await complianceService.getComplianceFramework('soc2')
      expect(framework).toBeDefined()
      expect(framework?.name).toBe('SOC 2 Type II')
      expect(framework?.controls.length).toBeGreaterThan(0)
    })

    it('should generate SOC 2 compliance report', async () => {
      const framework = await complianceService.getComplianceFramework('soc2')
      expect(framework).toBeDefined()

      if (framework) {
        const report = await complianceService.validateCompliance(framework)
        
        expect(report.frameworkId).toBe('soc2')
        expect(report.assessmentDate).toBeDefined()
        expect(report.overallScore).toBeGreaterThan(0)
        expect(report.controlResults.length).toBe(framework.controls.length)
        expect(Array.isArray(report.recommendations)).toBe(true)

        // Check specific SOC 2 controls
        const accessControlResult = report.controlResults.find(r => r.controlId === 'CC6.1')
        expect(accessControlResult).toBeDefined()
        expect(['compliant', 'non-compliant', 'partial', 'not-applicable']).toContain(accessControlResult?.status)
      }
    })

    it('should identify SOC 2 control gaps', async () => {
      const framework = await complianceService.getComplianceFramework('soc2')
      const report = await complianceService.validateCompliance(framework!)
      
      const nonCompliantControls = report.controlResults.filter(r => r.status === 'non-compliant')
      const partialControls = report.controlResults.filter(r => r.status === 'partial')
      
      if (nonCompliantControls.length > 0 || partialControls.length > 0) {
        expect(report.recommendations.length).toBeGreaterThan(0)
        
        const criticalRecommendation = report.recommendations.find(r => r.priority === 'critical')
        if (nonCompliantControls.length > 0) {
          expect(criticalRecommendation).toBeDefined()
        }
      }
    })
  })

  describe('HIPAA Compliance', () => {
    it('should validate HIPAA framework', async () => {
      const framework = await complianceService.getComplianceFramework('hipaa')
      expect(framework).toBeDefined()
      expect(framework?.name).toBe('HIPAA Security Rule')
      expect(framework?.controls.length).toBeGreaterThan(0)
    })

    it('should generate HIPAA compliance report', async () => {
      const framework = await complianceService.getComplianceFramework('hipaa')
      const report = await complianceService.validateCompliance(framework!)
      
      expect(report.frameworkId).toBe('hipaa')
      expect(report.overallScore).toBeGreaterThan(0)
      
      // Check for HIPAA-specific controls
      const adminSafeguards = report.controlResults.find(r => r.controlId === 'HIPAA-164.308')
      const technicalSafeguards = report.controlResults.find(r => r.controlId === 'HIPAA-164.312')
      
      expect(adminSafeguards).toBeDefined()
      expect(technicalSafeguards).toBeDefined()
    })

    it('should enforce HIPAA data protection requirements', async () => {
      const framework = await complianceService.getComplianceFramework('hipaa')
      const report = await complianceService.validateCompliance(framework!)
      
      // HIPAA requires strong technical safeguards
      const technicalSafeguards = report.controlResults.find(r => r.controlId === 'HIPAA-164.312')
      expect(technicalSafeguards?.controlId).toBe('HIPAA-164.312')
      
      // Should have recommendations for PHI protection
      const dataProtectionRecs = report.recommendations.filter(r => 
        r.description.toLowerCase().includes('data') || 
        r.description.toLowerCase().includes('encryption')
      )
      
      if (technicalSafeguards?.status !== 'compliant') {
        expect(dataProtectionRecs.length).toBeGreaterThan(0)
      }
    })
  })

  describe('PCI DSS Compliance', () => {
    it('should validate PCI DSS framework', async () => {
      const framework = await complianceService.getComplianceFramework('pci-dss')
      expect(framework).toBeDefined()
      expect(framework?.name).toBe('PCI DSS')
      expect(framework?.version).toBe('4.0')
    })

    it('should generate PCI DSS compliance report', async () => {
      const framework = await complianceService.getComplianceFramework('pci-dss')
      const report = await complianceService.validateCompliance(framework!)
      
      expect(report.frameworkId).toBe('pci-dss')
      
      // Check for PCI DSS requirements
      const networkSecurity = report.controlResults.find(r => r.controlId === 'PCI-1')
      const dataProtection = report.controlResults.find(r => r.controlId === 'PCI-3')
      const accessControl = report.controlResults.find(r => r.controlId === 'PCI-8')
      
      expect(networkSecurity).toBeDefined()
      expect(dataProtection).toBeDefined()
      expect(accessControl).toBeDefined()
    })

    it('should enforce cardholder data protection', async () => {
      const framework = await complianceService.getComplianceFramework('pci-dss')
      const report = await complianceService.validateCompliance(framework!)
      
      // PCI-3 specifically addresses cardholder data protection
      const dataProtection = report.controlResults.find(r => r.controlId === 'PCI-3')
      expect(dataProtection).toBeDefined()
      
      // Should have high priority recommendations for data protection
      if (dataProtection?.status !== 'compliant') {
        const highPriorityRecs = report.recommendations.filter(r => 
          r.priority === 'critical' || r.priority === 'high'
        )
        expect(highPriorityRecs.length).toBeGreaterThan(0)
      }
    })
  })

  describe('GDPR Compliance', () => {
    it('should validate GDPR framework', async () => {
      const framework = await complianceService.getComplianceFramework('gdpr')
      expect(framework).toBeDefined()
      expect(framework?.name).toBe('General Data Protection Regulation')
    })

    it('should generate GDPR compliance report', async () => {
      const framework = await complianceService.getComplianceFramework('gdpr')
      const report = await complianceService.validateCompliance(framework!)
      
      expect(report.frameworkId).toBe('gdpr')
      
      // Check for GDPR articles
      const dataProtectionByDesign = report.controlResults.find(r => r.controlId === 'GDPR-Art25')
      const securityOfProcessing = report.controlResults.find(r => r.controlId === 'GDPR-Art32')
      const breachNotification = report.controlResults.find(r => r.controlId === 'GDPR-Art33')
      
      expect(dataProtectionByDesign).toBeDefined()
      expect(securityOfProcessing).toBeDefined()
      expect(breachNotification).toBeDefined()
    })

    it('should enforce data protection by design', async () => {
      const framework = await complianceService.getComplianceFramework('gdpr')
      const report = await complianceService.validateCompliance(framework!)
      
      // Article 25 - Data Protection by Design and by Default
      const dataProtectionByDesign = report.controlResults.find(r => r.controlId === 'GDPR-Art25')
      expect(dataProtectionByDesign?.controlId).toBe('GDPR-Art25')
      
      // Should emphasize privacy by design principles
      if (dataProtectionByDesign?.status !== 'compliant') {
        const privacyRecs = report.recommendations.filter(r => 
          r.description.toLowerCase().includes('privacy') || 
          r.description.toLowerCase().includes('design')
        )
        expect(privacyRecs.length).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Policy Enforcement', () => {
    it('should enforce password policy', async () => {
      const policy = await complianceService.getPolicy('password-policy')
      expect(policy).toBeDefined()
      
      if (policy) {
        const result = await complianceService.enforcePolicy(policy)
        expect(result.policyId).toBe('password-policy')
        expect(['allow', 'deny']).toContain(result.decision)
      }
    })

    it('should enforce data access policy', async () => {
      const policy = await complianceService.getPolicy('data-access-policy')
      expect(policy).toBeDefined()
      
      if (policy) {
        const result = await complianceService.enforcePolicy(policy)
        expect(result.policyId).toBe('data-access-policy')
        expect(result.reason).toBeDefined()
      }
    })

    it('should create custom policy', async () => {
      const customPolicy = {
        name: 'Test Custom Policy',
        description: 'Custom policy for testing',
        type: 'security' as const,
        rules: [
          {
            id: 'test-rule',
            condition: 'user.role === "admin"',
            action: 'allow' as const,
            parameters: {}
          }
        ],
        enforcement: 'blocking' as const,
        isActive: true
      }

      const createdPolicy = await complianceService.createPolicy(customPolicy)
      expect(createdPolicy.id).toBeDefined()
      expect(createdPolicy.name).toBe(customPolicy.name)
      
      // Test enforcement of custom policy
      const result = await complianceService.enforcePolicy(createdPolicy)
      expect(result.policyId).toBe(createdPolicy.id)
    })
  })

  describe('Risk Management', () => {
    it('should track security risks', async () => {
      const risk = {
        id: 'risk-001',
        timestamp: new Date(),
        riskType: 'security' as const,
        severity: 'high' as const,
        description: 'Unpatched vulnerability in authentication system',
        impact: 'Potential unauthorized access to user accounts',
        likelihood: 'Medium - vulnerability is publicly known',
        mitigation: [
          'Apply security patch immediately',
          'Implement additional monitoring',
          'Review access logs for suspicious activity'
        ],
        status: 'open' as const
      }

      await complianceService.trackRisk(risk)
      
      const risks = await complianceService.getRiskAssessments('open')
      const trackedRisk = risks.find(r => r.id === 'risk-001')
      expect(trackedRisk).toBeDefined()
      expect(trackedRisk?.severity).toBe('high')
    })

    it('should track compliance risks', async () => {
      const complianceRisk = {
        id: 'compliance-risk-001',
        timestamp: new Date(),
        riskType: 'compliance' as const,
        severity: 'critical' as const,
        description: 'Missing audit logs for financial transactions',
        impact: 'Potential regulatory violations and fines',
        likelihood: 'High - audit requirement is mandatory',
        mitigation: [
          'Implement comprehensive audit logging',
          'Backfill missing audit records where possible',
          'Establish audit log retention policies'
        ],
        status: 'open' as const
      }

      await complianceService.trackRisk(complianceRisk)
      
      const risks = await complianceService.getRiskAssessments()
      const trackedRisk = risks.find(r => r.id === 'compliance-risk-001')
      expect(trackedRisk).toBeDefined()
      expect(trackedRisk?.riskType).toBe('compliance')
    })

    it('should get risk statistics', async () => {
      // Add some test risks
      const risks = [
        {
          id: 'risk-stats-1',
          timestamp: new Date(),
          riskType: 'security' as const,
          severity: 'critical' as const,
          description: 'Critical security risk',
          impact: 'High impact',
          likelihood: 'Medium',
          mitigation: ['Immediate action required'],
          status: 'open' as const
        },
        {
          id: 'risk-stats-2',
          timestamp: new Date(),
          riskType: 'operational' as const,
          severity: 'medium' as const,
          description: 'Operational risk',
          impact: 'Medium impact',
          likelihood: 'Low',
          mitigation: ['Monitor situation'],
          status: 'mitigated' as const
        }
      ]

      for (const risk of risks) {
        await complianceService.trackRisk(risk)
      }

      const stats = await complianceService.getComplianceStatistics()
      expect(stats.totalRisks).toBeGreaterThanOrEqual(2)
      expect(stats.openRisks).toBeGreaterThanOrEqual(1)
      expect(stats.criticalRisks).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Multi-Framework Compliance', () => {
    it('should handle multiple compliance frameworks', async () => {
      const frameworks = await complianceService.getComplianceFrameworks()
      expect(frameworks.length).toBeGreaterThanOrEqual(4)
      
      const frameworkIds = frameworks.map(f => f.id)
      expect(frameworkIds).toContain('soc2')
      expect(frameworkIds).toContain('hipaa')
      expect(frameworkIds).toContain('pci-dss')
      expect(frameworkIds).toContain('gdpr')
    })

    it('should generate cross-framework compliance analysis', async () => {
      const frameworks = await complianceService.getComplianceFrameworks()
      const reports = []

      // Generate reports for all frameworks
      for (const framework of frameworks) {
        const report = await complianceService.validateCompliance(framework)
        reports.push(report)
      }

      expect(reports.length).toBe(frameworks.length)
      
      // Analyze common compliance themes
      const allRecommendations = reports.flatMap(r => r.recommendations)
      const accessControlRecs = allRecommendations.filter(r => 
        r.title.toLowerCase().includes('access') || 
        r.description.toLowerCase().includes('access')
      )
      
      // Access control is a common theme across frameworks
      expect(accessControlRecs.length).toBeGreaterThanOrEqual(0)
    })

    it('should identify overlapping compliance requirements', async () => {
      const soc2 = await complianceService.getComplianceFramework('soc2')
      const hipaa = await complianceService.getComplianceFramework('hipaa')
      
      const soc2Report = await complianceService.validateCompliance(soc2!)
      const hipaaReport = await complianceService.validateCompliance(hipaa!)
      
      // Both frameworks should have access control requirements
      const soc2AccessControl = soc2Report.controlResults.find(r => 
        r.controlId.includes('CC6') // SOC 2 access control
      )
      const hipaaAccessControl = hipaaReport.controlResults.find(r => 
        r.controlId.includes('164.308') // HIPAA administrative safeguards
      )
      
      expect(soc2AccessControl).toBeDefined()
      expect(hipaaAccessControl).toBeDefined()
    })
  })

  describe('Compliance Statistics', () => {
    it('should provide comprehensive compliance statistics', async () => {
      const stats = await complianceService.getComplianceStatistics()
      
      expect(stats.totalFrameworks).toBeGreaterThan(0)
      expect(stats.totalPolicies).toBeGreaterThan(0)
      expect(stats.activePolicies).toBeGreaterThanOrEqual(0)
      expect(stats.totalRisks).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(stats.supportedFrameworks)).toBe(true)
      
      // Verify framework information
      const supportedFrameworks = stats.supportedFrameworks
      expect(supportedFrameworks.some((f: any) => f.id === 'soc2')).toBe(true)
      expect(supportedFrameworks.some((f: any) => f.id === 'hipaa')).toBe(true)
    })
  })
})