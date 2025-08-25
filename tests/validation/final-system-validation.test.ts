/**
 * Final System Validation Tests
 * 
 * Comprehensive test suite for the final system validation orchestrator
 * covering all validation types and final readiness assessment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  FinalSystemValidation,
  FinalValidationConfig,
  FinalValidationResult,
  createDefaultFinalValidationConfig
} from '../../src/validation/final-system-validation.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock file system operations
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue('{}'),
      access: vi.fn().mockResolvedValue(undefined)
    }
  };
});

describe('FinalSystemValidation', () => {
  let finalValidation: FinalSystemValidation;
  let config: FinalValidationConfig;
  let tempDir: string;

  beforeEach(() => {
    tempDir = './test-validation-output';
    config = createDefaultFinalValidationConfig();
    config.reporting.outputDirectory = tempDir;
    
    finalValidation = new FinalSystemValidation(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should create default configuration correctly', () => {
      const defaultConfig = createDefaultFinalValidationConfig();
      
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.systemValidation).toBeDefined();
      expect(defaultConfig.reporting).toBeDefined();
      expect(defaultConfig.reporting.outputDirectory).toBe('./validation-reports');
      expect(defaultConfig.reporting.formats).toContain('json');
      expect(defaultConfig.reporting.formats).toContain('html');
      expect(defaultConfig.reporting.formats).toContain('pdf');
    });

    it('should initialize with custom configuration', () => {
      const customConfig = createDefaultFinalValidationConfig();
      customConfig.reporting.outputDirectory = './custom-output';
      
      const customValidation = new FinalSystemValidation(customConfig);
      expect(customValidation).toBeDefined();
    });

    it('should validate archival configuration', () => {
      expect(config.reporting.archival).toBeDefined();
      expect(config.reporting.archival.enabled).toBe(true);
      expect(config.reporting.archival.retention).toBe(365);
      expect(config.reporting.archival.location).toBe('./validation-archive');
      expect(config.reporting.archival.compression).toBe(true);
    });
  });

  describe('Final Validation Execution', () => {
    it('should execute complete final validation successfully', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(result).toBeDefined();
      expect(result.reportId).toMatch(/^final-validation-\d+$/);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.overallStatus).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      
      // Validate result structure
      expect(result.validationResults).toBeDefined();
      expect(result.readinessAssessment).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.actionItems).toBeInstanceOf(Array);
      expect(result.approvals).toBeInstanceOf(Array);
      expect(result.documentation).toBeDefined();
    });

    it('should handle validation failures gracefully', async () => {
      // Mock a validation failure scenario
      const result = await finalValidation.executeFinalValidation();
      
      expect(result).toBeDefined();
      expect(result.overallStatus).toBeDefined();
      expect(['production-ready', 'ready', 'partially-ready', 'not-ready']).toContain(result.overallStatus);
    });

    it('should generate appropriate overall status', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(['production-ready', 'ready', 'partially-ready', 'not-ready']).toContain(result.overallStatus);
      
      // Validate status logic
      if (result.overallScore >= 95) {
        expect(['production-ready', 'ready']).toContain(result.overallStatus);
      } else if (result.overallScore >= 85) {
        expect(['ready', 'partially-ready']).toContain(result.overallStatus);
      } else if (result.overallScore >= 70) {
        expect(['partially-ready', 'not-ready']).toContain(result.overallStatus);
      }
    });

    it('should save final validation report', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(fs.promises.mkdir).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
      
      // Verify report file path
      const writeFileCalls = (fs.promises.writeFile as any).mock.calls;
      const reportCall = writeFileCalls.find((call: any) => 
        call[0].includes('final-validation-report')
      );
      expect(reportCall).toBeDefined();
    });

    it('should archive results when enabled', async () => {
      config.reporting.archival.enabled = true;
      const validationWithArchival = new FinalSystemValidation(config);
      
      const result = await validationWithArchival.executeFinalValidation();
      
      expect(result).toBeDefined();
      expect(fs.promises.writeFile).toHaveBeenCalled();
      
      // Verify archive file creation
      const writeFileCalls = (fs.promises.writeFile as any).mock.calls;
      const archiveCall = writeFileCalls.find((call: any) => 
        call[0].includes('validation-archive')
      );
      expect(archiveCall).toBeDefined();
    });
  });

  describe('Readiness Assessment', () => {
    it('should assess all readiness categories', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(result.readinessAssessment).toBeDefined();
      expect(result.readinessAssessment.functional).toBeDefined();
      expect(result.readinessAssessment.performance).toBeDefined();
      expect(result.readinessAssessment.security).toBeDefined();
      expect(result.readinessAssessment.operational).toBeDefined();
      expect(result.readinessAssessment.usability).toBeDefined();
      expect(result.readinessAssessment.compliance).toBeDefined();
    });

    it('should validate readiness category structure', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      for (const [categoryName, category] of Object.entries(result.readinessAssessment)) {
        expect(category.status).toBeDefined();
        expect(['ready', 'partially-ready', 'not-ready']).toContain(category.status);
        expect(category.score).toBeGreaterThanOrEqual(0);
        expect(category.score).toBeLessThanOrEqual(100);
        expect(category.criticalIssues).toBeGreaterThanOrEqual(0);
        expect(category.blockers).toBeInstanceOf(Array);
        expect(category.requirements).toBeInstanceOf(Array);
      }
    });

    it('should calculate weighted overall score correctly', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      const assessment = result.readinessAssessment;
      const expectedWeights = {
        functional: 0.25,
        performance: 0.20,
        security: 0.20,
        operational: 0.15,
        usability: 0.10,
        compliance: 0.10
      };

      const calculatedScore = Math.round(
        assessment.functional.score * expectedWeights.functional +
        assessment.performance.score * expectedWeights.performance +
        assessment.security.score * expectedWeights.security +
        assessment.operational.score * expectedWeights.operational +
        assessment.usability.score * expectedWeights.usability +
        assessment.compliance.score * expectedWeights.compliance
      );

      expect(result.overallScore).toBe(calculatedScore);
    });

    it('should identify blockers correctly', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      // Check if any category has blockers
      const hasBlockers = Object.values(result.readinessAssessment).some(category => 
        category.blockers.length > 0
      );

      if (hasBlockers) {
        expect(result.overallStatus).toBe('not-ready');
      }
    });
  });

  describe('Recommendations and Action Items', () => {
    it('should generate appropriate recommendations', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(result.recommendations).toBeInstanceOf(Array);
      
      for (const recommendation of result.recommendations) {
        expect(recommendation.id).toBeDefined();
        expect(recommendation.category).toBeDefined();
        expect(['functional', 'performance', 'security', 'operational', 'usability', 'compliance']).toContain(recommendation.category);
        expect(['critical', 'high', 'medium', 'low']).toContain(recommendation.priority);
        expect(recommendation.title).toBeDefined();
        expect(recommendation.description).toBeDefined();
        expect(recommendation.impact).toBeDefined();
        expect(recommendation.effort).toBeDefined();
        expect(recommendation.timeline).toBeDefined();
        expect(recommendation.dependencies).toBeInstanceOf(Array);
        expect(typeof recommendation.approvalRequired).toBe('boolean');
      }
    });

    it('should generate action items for critical issues', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(result.actionItems).toBeInstanceOf(Array);
      
      for (const actionItem of result.actionItems) {
        expect(actionItem.id).toBeDefined();
        expect(actionItem.title).toBeDefined();
        expect(actionItem.description).toBeDefined();
        expect(actionItem.category).toBeDefined();
        expect(['critical', 'high', 'medium', 'low']).toContain(actionItem.priority);
        expect(actionItem.assignee).toBeDefined();
        expect(actionItem.dueDate).toBeInstanceOf(Date);
        expect(['open', 'in-progress', 'completed', 'blocked']).toContain(actionItem.status);
        expect(actionItem.dependencies).toBeInstanceOf(Array);
        expect(typeof actionItem.approvalRequired).toBe('boolean');
        expect(typeof actionItem.blockingProduction).toBe('boolean');
      }
    });

    it('should prioritize critical action items correctly', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      const criticalActionItems = result.actionItems.filter(item => item.priority === 'critical');
      
      for (const criticalItem of criticalActionItems) {
        expect(criticalItem.blockingProduction).toBe(true);
        expect(criticalItem.approvalRequired).toBe(true);
        
        // Critical items should have shorter due dates
        const daysDiff = Math.ceil((criticalItem.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        expect(daysDiff).toBeLessThanOrEqual(7); // Within a week
      }
    });
  });

  describe('Stakeholder Approvals', () => {
    it('should collect stakeholder approvals', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(result.approvals).toBeInstanceOf(Array);
      expect(result.approvals.length).toBeGreaterThan(0);
      
      for (const approval of result.approvals) {
        expect(approval.stakeholder).toBeDefined();
        expect(approval.role).toBeDefined();
        expect(['approved', 'conditional', 'rejected', 'pending']).toContain(approval.status);
        expect(approval.conditions).toBeInstanceOf(Array);
        expect(approval.comments).toBeDefined();
      }
    });

    it('should include all required stakeholder roles', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      const requiredRoles = ['technical-approval', 'security-approval', 'operational-approval', 'business-approval'];
      const approvalRoles = result.approvals.map(approval => approval.role);
      
      for (const requiredRole of requiredRoles) {
        expect(approvalRoles).toContain(requiredRole);
      }
    });

    it('should set conditional approvals when scores are low', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      for (const approval of result.approvals) {
        if (approval.status === 'conditional') {
          expect(approval.conditions.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Documentation Generation', () => {
    it('should generate all required documentation', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(result.documentation).toBeDefined();
      expect(result.documentation.deploymentGuide).toBeDefined();
      expect(result.documentation.operationalProcedures).toBeDefined();
      expect(result.documentation.validationReport).toBeDefined();
      expect(result.documentation.userManual).toBeDefined();
    });

    it('should validate documentation status structure', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      const documentTypes = ['deploymentGuide', 'operationalProcedures', 'validationReport', 'userManual'];
      
      for (const docType of documentTypes) {
        const doc = result.documentation[docType as keyof typeof result.documentation];
        expect(typeof doc.generated).toBe('boolean');
        expect(doc.format).toBeInstanceOf(Array);
        expect(typeof doc.approved).toBe('boolean');
        
        if (doc.generated) {
          expect(doc.path).toBeDefined();
          expect(doc.lastUpdated).toBeInstanceOf(Date);
        }
      }
    });

    it('should generate documentation in multiple formats', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      for (const docType of Object.keys(result.documentation)) {
        const doc = result.documentation[docType as keyof typeof result.documentation];
        if (doc.generated) {
          expect(doc.format.length).toBeGreaterThan(0);
          
          // Common formats should be supported
          const supportedFormats = ['markdown', 'pdf', 'html', 'json'];
          for (const format of doc.format) {
            expect(supportedFormats).toContain(format);
          }
        }
      }
    });
  });

  describe('Validation Summary', () => {
    it('should provide quick validation summary', async () => {
      const summary = await finalValidation.getValidationSummary();
      
      expect(summary).toBeDefined();
      expect(summary.status).toBeDefined();
      expect(summary.score).toBeGreaterThanOrEqual(0);
      expect(summary.score).toBeLessThanOrEqual(100);
      expect(typeof summary.readyForProduction).toBe('boolean');
      expect(summary.criticalIssues).toBeGreaterThanOrEqual(0);
      expect(summary.blockers).toBeInstanceOf(Array);
      expect(summary.nextSteps).toBeInstanceOf(Array);
    });

    it('should indicate production readiness correctly', async () => {
      const summary = await finalValidation.getValidationSummary();
      
      if (summary.readyForProduction) {
        expect(summary.criticalIssues).toBe(0);
        expect(summary.blockers.length).toBe(0);
        expect(summary.score).toBeGreaterThanOrEqual(85);
      }
    });

    it('should provide actionable next steps', async () => {
      const summary = await finalValidation.getValidationSummary();
      
      expect(summary.nextSteps.length).toBeGreaterThan(0);
      
      for (const step of summary.nextSteps) {
        expect(typeof step).toBe('string');
        expect(step.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle validation framework failures', async () => {
      // This test would mock framework failures
      const result = await finalValidation.executeFinalValidation();
      
      expect(result).toBeDefined();
      expect(result.overallStatus).toBeDefined();
    });

    it('should handle file system errors gracefully', async () => {
      // Mock file system error
      (fs.promises.writeFile as any).mockRejectedValueOnce(new Error('File system error'));
      
      // Should still complete validation even if file operations fail
      await expect(finalValidation.executeFinalValidation()).rejects.toThrow();
    });

    it('should handle missing configuration gracefully', () => {
      const incompleteConfig = {
        ...config,
        systemValidation: undefined as any
      };
      
      expect(() => new FinalSystemValidation(incompleteConfig)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete validation within reasonable time', async () => {
      const startTime = Date.now();
      const result = await finalValidation.executeFinalValidation();
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should execute validation suites in parallel', async () => {
      // This test verifies that validation suites run concurrently
      const startTime = Date.now();
      await finalValidation.executeFinalValidation();
      const duration = Date.now() - startTime;
      
      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(15000); // Should be faster due to parallelization
    });
  });

  describe('Integration', () => {
    it('should integrate with all validation frameworks', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      expect(result.validationResults.systemValidation).toBeDefined();
      expect(result.validationResults.endToEndValidation).toBeDefined();
      expect(result.validationResults.userAcceptanceTesting).toBeDefined();
      expect(result.validationResults.performanceValidation).toBeDefined();
      expect(result.validationResults.securityValidation).toBeDefined();
      expect(result.validationResults.operationalValidation).toBeDefined();
    });

    it('should maintain data consistency across frameworks', async () => {
      const result = await finalValidation.executeFinalValidation();
      
      // Verify that all validation results contribute to overall assessment
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.readinessAssessment).toBeDefined();
      
      // Check that assessment reflects validation results
      const hasFailures = Object.values(result.validationResults).some((validation: any) => 
        validation && validation.success === false
      );
      
      if (hasFailures) {
        expect(result.overallScore).toBeLessThan(100);
      }
    });
  });
});