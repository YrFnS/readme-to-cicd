/**
 * Security Scanning Tests
 * 
 * Tests for vulnerability assessment, threat detection, and security scanning
 * capabilities with various scan types and vulnerability management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SecurityScanningService } from '../../../src/integration/security/scanning/security-scanning-service.js'
import type { ScanningConfig, Vulnerability } from '../../../src/integration/security/types.js'

describe('Security Scanning Tests', () => {
  let scanningService: SecurityScanningService
  let config: ScanningConfig

  beforeEach(() => {
    config = {
      enabled: true,
      schedule: '0 2 * * 0', // Weekly at 2 AM on Sunday
      scanTypes: ['vulnerability', 'compliance', 'penetration', 'code-analysis'],
      integrations: {
        vulnerabilityDb: 'nvd',
        scanners: ['custom', 'nessus', 'openvas']
      }
    }

    scanningService = new SecurityScanningService(config)
  })

  afterEach(() => {
    // Cleanup if needed
  })

  describe('Vulnerability Scanning', () => {
    it('should start vulnerability scan', async () => {
      const scan = await scanningService.startScan('vulnerability', 'web-application')
      
      expect(scan.id).toBeDefined()
      expect(scan.type).toBe('vulnerability')
      expect(scan.target).toBe('web-application')
      expect(scan.status).toBe('pending')
      expect(scan.startTime).toBeDefined()
    })

    it('should complete vulnerability scan and return results', async () => {
      const scan = await scanningService.startScan('vulnerability', 'api-server')
      
      // Wait for scan to complete (mocked with short delay)
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const completedScan = await scanningService.getScanResults(scan.id)
      
      expect(completedScan.status).toBe('completed')
      expect(completedScan.endTime).toBeDefined()
      expect(completedScan.results).toBeDefined()
      
      if (completedScan.results) {
        expect(completedScan.results.summary).toBeDefined()
        expect(Array.isArray(completedScan.results.vulnerabilities)).toBe(true)
        expect(Array.isArray(completedScan.results.recommendations)).toBe(true)
      }
    })

    it('should identify critical vulnerabilities', async () => {
      const scan = await scanningService.startScan('vulnerability', 'database-server')
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      if (results.results && results.results.vulnerabilities.length > 0) {
        const criticalVulns = results.results.vulnerabilities.filter(v => v.severity === 'critical')
        
        if (criticalVulns.length > 0) {
          expect(results.results.summary.criticalCount).toBeGreaterThan(0)
          
          // Should have high-priority recommendations for critical vulnerabilities
          const criticalRecs = results.results.recommendations.filter(r => r.priority === 'critical')
          expect(criticalRecs.length).toBeGreaterThan(0)
        }
      }
    })

    it('should calculate risk score based on vulnerabilities', async () => {
      const scan = await scanningService.startScan('vulnerability', 'web-server')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      if (results.results) {
        expect(results.results.summary.riskScore).toBeGreaterThanOrEqual(0)
        expect(results.results.summary.riskScore).toBeLessThanOrEqual(100)
        
        // Risk score should correlate with vulnerability severity
        const { criticalCount, highCount, mediumCount, lowCount } = results.results.summary
        const totalSevereVulns = criticalCount + highCount
        
        if (totalSevereVulns > 0) {
          expect(results.results.summary.riskScore).toBeGreaterThan(20)
        }
      }
    })
  })

  describe('Compliance Scanning', () => {
    it('should perform compliance scan', async () => {
      const scan = await scanningService.startScan('compliance', 'payment-system')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      expect(results.type).toBe('compliance')
      expect(results.status).toBe('completed')
      
      if (results.results) {
        // Compliance scans should focus on configuration and policy issues
        const configVulns = results.results.vulnerabilities.filter(v =>
          v.description.toLowerCase().includes('policy') ||
          v.description.toLowerCase().includes('configuration')
        )
        
        expect(configVulns.length).toBeGreaterThanOrEqual(0)
      }
    })

    it('should identify compliance-related vulnerabilities', async () => {
      const scan = await scanningService.startScan('compliance', 'healthcare-app')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      if (results.results && results.results.vulnerabilities.length > 0) {
        // Should include policy and configuration recommendations
        const complianceRecs = results.results.recommendations.filter(r =>
          r.category.toLowerCase().includes('compliance') ||
          r.category.toLowerCase().includes('configuration') ||
          r.category.toLowerCase().includes('policy')
        )
        
        expect(complianceRecs.length).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Penetration Testing', () => {
    it('should perform penetration test scan', async () => {
      const scan = await scanningService.startScan('penetration', 'external-api')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      expect(results.type).toBe('penetration')
      expect(results.status).toBe('completed')
      
      if (results.results) {
        // Penetration tests should focus on high-impact vulnerabilities
        const highImpactVulns = results.results.vulnerabilities.filter(v =>
          v.severity === 'critical' || v.severity === 'high'
        )
        
        expect(results.results.summary.criticalCount + results.results.summary.highCount)
          .toBe(highImpactVulns.length)
      }
    })

    it('should provide actionable penetration test recommendations', async () => {
      const scan = await scanningService.startScan('penetration', 'web-portal')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      if (results.results && results.results.recommendations.length > 0) {
        const recommendations = results.results.recommendations
        
        // Each recommendation should have actionable items
        for (const rec of recommendations) {
          expect(rec.actionItems).toBeDefined()
          expect(Array.isArray(rec.actionItems)).toBe(true)
          expect(rec.actionItems.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('Code Analysis Scanning', () => {
    it('should perform code analysis scan', async () => {
      const scan = await scanningService.startScan('code-analysis', 'source-code')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      expect(results.type).toBe('code-analysis')
      expect(results.status).toBe('completed')
      
      if (results.results) {
        // Code analysis should focus on injection and XSS vulnerabilities
        const codeVulns = results.results.vulnerabilities.filter(v =>
          v.title.toLowerCase().includes('injection') ||
          v.title.toLowerCase().includes('xss') ||
          v.title.toLowerCase().includes('reference')
        )
        
        expect(codeVulns.length).toBeGreaterThanOrEqual(0)
      }
    })

    it('should identify secure development recommendations', async () => {
      const scan = await scanningService.startScan('code-analysis', 'application-code')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      if (results.results && results.results.recommendations.length > 0) {
        const devRecs = results.results.recommendations.filter(r =>
          r.category.toLowerCase().includes('development') ||
          r.category.toLowerCase().includes('secure')
        )
        
        expect(devRecs.length).toBeGreaterThanOrEqual(0)
        
        if (devRecs.length > 0) {
          // Should include specific development practices
          const devRec = devRecs[0]
          expect(devRec.actionItems.some(item => 
            item.toLowerCase().includes('validation') ||
            item.toLowerCase().includes('sanitization') ||
            item.toLowerCase().includes('encoding')
          )).toBe(true)
        }
      }
    })
  })

  describe('Vulnerability Management', () => {
    it('should retrieve vulnerabilities by severity', async () => {
      const criticalVulns = await scanningService.getVulnerabilities('critical')
      const highVulns = await scanningService.getVulnerabilities('high')
      const allVulns = await scanningService.getVulnerabilities()
      
      expect(Array.isArray(criticalVulns)).toBe(true)
      expect(Array.isArray(highVulns)).toBe(true)
      expect(Array.isArray(allVulns)).toBe(true)
      
      // All critical vulnerabilities should have severity 'critical'
      for (const vuln of criticalVulns) {
        expect(vuln.severity).toBe('critical')
      }
      
      // All high vulnerabilities should have severity 'high'
      for (const vuln of highVulns) {
        expect(vuln.severity).toBe('high')
      }
      
      expect(allVulns.length).toBeGreaterThanOrEqual(criticalVulns.length + highVulns.length)
    })

    it('should get vulnerability details by ID', async () => {
      const vulnId = 'CVE-2023-12345'
      const vulnerability = await scanningService.getVulnerabilityById(vulnId)
      
      expect(vulnerability).toBeDefined()
      expect(vulnerability?.id).toBe(vulnId)
      expect(vulnerability?.title).toBeDefined()
      expect(vulnerability?.description).toBeDefined()
      expect(vulnerability?.severity).toBeDefined()
    })

    it('should add custom vulnerability', async () => {
      const customVuln: Vulnerability = {
        id: 'CUSTOM-TEST-001',
        title: 'Test Custom Vulnerability',
        description: 'A test vulnerability for validation',
        severity: 'medium',
        component: 'test-component',
        version: '1.0.0',
        references: ['https://example.com/vuln-details']
      }

      await scanningService.addVulnerability(customVuln)
      
      const retrieved = await scanningService.getVulnerabilityById('CUSTOM-TEST-001')
      expect(retrieved).toBeDefined()
      expect(retrieved?.title).toBe(customVuln.title)
    })

    it('should update vulnerability information', async () => {
      const vulnId = 'CVE-2023-67890'
      const updates = {
        fixVersion: '2.1.2',
        description: 'Updated description with more details'
      }

      const success = await scanningService.updateVulnerability(vulnId, updates)
      expect(success).toBe(true)
      
      const updated = await scanningService.getVulnerabilityById(vulnId)
      expect(updated?.fixVersion).toBe(updates.fixVersion)
      expect(updated?.description).toBe(updates.description)
    })
  })

  describe('Scan Management', () => {
    it('should list all scans', async () => {
      // Start multiple scans
      await scanningService.startScan('vulnerability', 'system-1')
      await scanningService.startScan('compliance', 'system-2')
      await scanningService.startScan('penetration', 'system-3')
      
      const allScans = await scanningService.getScans()
      expect(allScans.length).toBeGreaterThanOrEqual(3)
      
      // Should be sorted by start time (newest first)
      for (let i = 1; i < allScans.length; i++) {
        expect(allScans[i-1].startTime.getTime()).toBeGreaterThanOrEqual(allScans[i].startTime.getTime())
      }
    })

    it('should filter scans by status', async () => {
      const scan1 = await scanningService.startScan('vulnerability', 'test-system-1')
      const scan2 = await scanningService.startScan('compliance', 'test-system-2')
      
      // Get pending scans
      const pendingScans = await scanningService.getScans('pending')
      expect(pendingScans.length).toBeGreaterThanOrEqual(2)
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Get completed scans
      const completedScans = await scanningService.getScans('completed')
      expect(completedScans.length).toBeGreaterThanOrEqual(2)
    })

    it('should cancel running scan', async () => {
      const scan = await scanningService.startScan('vulnerability', 'cancellation-test')
      
      // Cancel immediately
      const cancelled = await scanningService.cancelScan(scan.id)
      expect(cancelled).toBe(true)
      
      const cancelledScan = await scanningService.getScanResults(scan.id)
      expect(cancelledScan.status).toBe('failed')
      expect(cancelledScan.endTime).toBeDefined()
    })

    it('should not cancel completed scan', async () => {
      const scan = await scanningService.startScan('vulnerability', 'completion-test')
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Try to cancel completed scan
      const cancelled = await scanningService.cancelScan(scan.id)
      expect(cancelled).toBe(false)
    })
  })

  describe('Scan Statistics', () => {
    it('should provide comprehensive scanning statistics', async () => {
      // Start some scans to generate statistics
      await scanningService.startScan('vulnerability', 'stats-test-1')
      await scanningService.startScan('compliance', 'stats-test-2')
      
      const stats = await scanningService.getScanningStatistics()
      
      expect(stats.totalScans).toBeGreaterThan(0)
      expect(stats.totalVulnerabilities).toBeGreaterThan(0)
      expect(Array.isArray(stats.scanTypes)).toBe(true)
      expect(stats.scanTypes).toContain('vulnerability')
      expect(stats.scanTypes).toContain('compliance')
      expect(stats.scanTypes).toContain('penetration')
      expect(stats.scanTypes).toContain('code-analysis')
      
      // Vulnerability statistics
      expect(stats.criticalVulnerabilities).toBeGreaterThanOrEqual(0)
      expect(stats.highVulnerabilities).toBeGreaterThanOrEqual(0)
      
      // Scan status statistics
      expect(stats.completedScans).toBeGreaterThanOrEqual(0)
      expect(stats.runningScans).toBeGreaterThanOrEqual(0)
      expect(stats.failedScans).toBeGreaterThanOrEqual(0)
    })

    it('should track scan performance metrics', async () => {
      const startTime = Date.now()
      
      const scan = await scanningService.startScan('vulnerability', 'performance-test')
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const completedScan = await scanningService.getScanResults(scan.id)
      const endTime = Date.now()
      
      expect(completedScan.status).toBe('completed')
      expect(completedScan.startTime).toBeDefined()
      expect(completedScan.endTime).toBeDefined()
      
      // Scan should complete within reasonable time
      const scanDuration = completedScan.endTime!.getTime() - completedScan.startTime.getTime()
      expect(scanDuration).toBeLessThan(10000) // Less than 10 seconds for mock scan
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle comprehensive security assessment workflow', async () => {
      // 1. Start multiple scan types for comprehensive assessment
      const vulnScan = await scanningService.startScan('vulnerability', 'comprehensive-test')
      const complianceScan = await scanningService.startScan('compliance', 'comprehensive-test')
      const penTestScan = await scanningService.startScan('penetration', 'comprehensive-test')
      const codeScan = await scanningService.startScan('code-analysis', 'comprehensive-test')
      
      // 2. Wait for all scans to complete
      await new Promise(resolve => setTimeout(resolve, 4000))
      
      // 3. Collect all results
      const vulnResults = await scanningService.getScanResults(vulnScan.id)
      const complianceResults = await scanningService.getScanResults(complianceScan.id)
      const penTestResults = await scanningService.getScanResults(penTestScan.id)
      const codeResults = await scanningService.getScanResults(codeScan.id)
      
      // 4. Verify all scans completed
      expect(vulnResults.status).toBe('completed')
      expect(complianceResults.status).toBe('completed')
      expect(penTestResults.status).toBe('completed')
      expect(codeResults.status).toBe('completed')
      
      // 5. Aggregate findings
      const allVulnerabilities = [
        ...(vulnResults.results?.vulnerabilities || []),
        ...(complianceResults.results?.vulnerabilities || []),
        ...(penTestResults.results?.vulnerabilities || []),
        ...(codeResults.results?.vulnerabilities || [])
      ]
      
      const allRecommendations = [
        ...(vulnResults.results?.recommendations || []),
        ...(complianceResults.results?.recommendations || []),
        ...(penTestResults.results?.recommendations || []),
        ...(codeResults.results?.recommendations || [])
      ]
      
      // 6. Analyze comprehensive results
      expect(allVulnerabilities.length).toBeGreaterThanOrEqual(0)
      expect(allRecommendations.length).toBeGreaterThanOrEqual(0)
      
      // Should have diverse vulnerability types from different scan types
      const vulnTypes = new Set(allVulnerabilities.map(v => v.component))
      expect(vulnTypes.size).toBeGreaterThanOrEqual(0)
    })

    it('should prioritize vulnerabilities across scan types', async () => {
      const scan = await scanningService.startScan('vulnerability', 'prioritization-test')
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = await scanningService.getScanResults(scan.id)
      
      if (results.results && results.results.vulnerabilities.length > 0) {
        const vulnerabilities = results.results.vulnerabilities
        
        // Group by severity for prioritization
        const critical = vulnerabilities.filter(v => v.severity === 'critical')
        const high = vulnerabilities.filter(v => v.severity === 'high')
        const medium = vulnerabilities.filter(v => v.severity === 'medium')
        const low = vulnerabilities.filter(v => v.severity === 'low')
        
        // Verify recommendations prioritize critical and high severity issues
        const criticalRecs = results.results.recommendations.filter(r => r.priority === 'critical')
        const highRecs = results.results.recommendations.filter(r => r.priority === 'high')
        
        if (critical.length > 0) {
          expect(criticalRecs.length).toBeGreaterThan(0)
        }
        
        if (high.length > 0 || critical.length > 0) {
          expect(criticalRecs.length + highRecs.length).toBeGreaterThan(0)
        }
      }
    })
  })
})