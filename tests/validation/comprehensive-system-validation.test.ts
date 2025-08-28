/**
 * Comprehensive System Validation Tests
 * 
 * Tests for the comprehensive system validation framework
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ComprehensiveSystemValidator, 
  defaultComprehensiveValidationConfig 
} from '../../src/validation/comprehensive-system-validator';
import { SystemHealthScoring, defaultHealthScoringConfig } from '../../src/validation/system-health-scoring';
import { IntegrationTestSuite, defaultIntegrationTestConfig } from '../../src/validation/integration-test-suite';

describe('Comprehensive System Validation', () => {
  let validator: ComprehensiveSystemValidator;
  let healthScoring: SystemHealthScoring;
  let integrationSuite: IntegrationTestSuite;

  beforeEach(() => {
    validator = new ComprehensiveSystemValidator(defaultComprehensiveValidationConfig);
    healthScoring = new SystemHealthScoring(defaultHealthScoringConfig);
    integrationSuite = new IntegrationTestSuite(defaultIntegrationTestConfig);
  });

  afterEach(() => {
    validator.stopMonitoring();
  });

  describe('ComprehensiveSystemValidator', () => {
    it('should initialize with default configuration', () => {
      expect(validator).toBeDefined();
    });

    it('should execute comprehensive validation', async () => {
      const result = await validator.executeComprehensiveValidation();
      
      expect(result).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.readinessLevel).toMatch(/not-ready|partially-ready|ready|production-ready/);
      expect(result.healthReport).toBeDefined();
      expect(result.healthScoreBreakdown).toBeDefined();
      expect(Array.isArray(result.endToEndResults)).toBe(true);
      expect(Array.isArray(result.performanceBenchmarks)).toBe(true);
      expect(result.systemReadiness).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.actionItems)).toBe(true);
    }, 60000); // 60 second timeout

    it('should get system health status', async () => {
      const healthStatus = await validator.getSystemHealthStatus();
      
      expect(healthStatus).toBeDefined();
      expect(typeof healthStatus.healthy).toBe('boolean');
      expect(typeof healthStatus.score).toBe('number');
      expect(healthStatus.score).toBeGreaterThanOrEqual(0);
      expect(healthStatus.score).toBeLessThanOrEqual(100);
    });
  });

  describe('SystemHealthScoring', () => {
    it('should calculate health score breakdown', () => {
      const mockHealthReport = {
        overallScore: 85,
        status: 'healthy' as const,
        timestamp: new Date(),
        components: [
          {
            name: 'readme-parser',
            status: 'healthy' as const,
            score: 90,
            lastCheck: new Date(),
            metrics: {
              responseTime: 100,
              errorRate: 0.5,
              throughput: 50,
              availability: 99.9,
              resourceUsage: { cpu: 20, memory: 100, disk: 10 }
            },
            issues: [],
            dependencies: []
          }
        ],
        criticalIssues: [],
        recommendations: [],
        trends: []
      };

      const mockValidationResults = [
        {
          testId: 'test-1',
          passed: true,
          score: 95,
          duration: 1000,
          metrics: {
            performance: {
              responseTime: 100,
              throughput: 50,
              resourceUsage: { cpu: 20, memory: 100, disk: 10, network: 5 },
              scalability: { horizontalScaling: 80, verticalScaling: 70, elasticity: 75, degradationPoint: 90 },
              loadCapacity: { maxConcurrentUsers: 100, maxRequestsPerSecond: 50, breakingPoint: 200, recoveryTime: 30 }
            },
            security: {
              vulnerabilityScore: 95,
              complianceScore: 90,
              authenticationStrength: 85,
              dataProtectionLevel: 90,
              auditCoverage: 80
            },
            reliability: {
              availability: 99.9,
              mtbf: 1000,
              mttr: 5,
              errorRate: 0.1,
              resilience: 95
            },
            usability: {
              userSatisfaction: 90,
              taskCompletionRate: 95,
              errorRecovery: 80,
              learnability: 85,
              accessibility: 90
            },
            compliance: {
              regulatoryCompliance: 95,
              policyCompliance: 90,
              auditReadiness: 85,
              documentationCoverage: 80
            }
          },
          errors: [],
          warnings: [],
          evidence: [],
          recommendations: []
        }
      ];

      const scoreBreakdown = healthScoring.calculateHealthScore(
        mockHealthReport,
        mockValidationResults
      );

      expect(scoreBreakdown).toBeDefined();
      expect(typeof scoreBreakdown.overallScore).toBe('number');
      expect(scoreBreakdown.overallScore).toBeGreaterThanOrEqual(0);
      expect(scoreBreakdown.overallScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(scoreBreakdown.componentScores)).toBe(true);
      expect(Array.isArray(scoreBreakdown.categoryScores)).toBe(true);
      expect(Array.isArray(scoreBreakdown.penalties)).toBe(true);
      expect(Array.isArray(scoreBreakdown.bonuses)).toBe(true);
      expect(Array.isArray(scoreBreakdown.trends)).toBe(true);
      expect(Array.isArray(scoreBreakdown.recommendations)).toBe(true);
    });

    it('should handle empty inputs gracefully', () => {
      const emptyHealthReport = {
        overallScore: 0,
        status: 'unhealthy' as const,
        timestamp: new Date(),
        components: [],
        criticalIssues: [],
        recommendations: [],
        trends: []
      };

      const scoreBreakdown = healthScoring.calculateHealthScore(
        emptyHealthReport,
        []
      );

      expect(scoreBreakdown).toBeDefined();
      expect(scoreBreakdown.overallScore).toBeGreaterThanOrEqual(0);
      expect(scoreBreakdown.componentScores).toHaveLength(0);
    });
  });

  describe('IntegrationTestSuite', () => {
    it('should execute all integration tests', async () => {
      const results = await integrationSuite.executeAllTests();
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      for (const result of results) {
        expect(result).toBeDefined();
        expect(typeof result.testId).toBe('string');
        expect(typeof result.passed).toBe('boolean');
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(typeof result.duration).toBe('number');
        expect(result.metrics).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.evidence)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      }
    }, 30000); // 30 second timeout
  });

  describe('System Readiness Assessment', () => {
    it('should assess system readiness correctly', async () => {
      const result = await validator.executeComprehensiveValidation();
      
      expect(result.systemReadiness).toBeDefined();
      expect(typeof result.systemReadiness.ready).toBe('boolean');
      expect(typeof result.systemReadiness.score).toBe('number');
      expect(result.systemReadiness.score).toBeGreaterThanOrEqual(0);
      expect(result.systemReadiness.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.systemReadiness.componentReadiness)).toBe(true);
      expect(Array.isArray(result.systemReadiness.missingRequirements)).toBe(true);
      expect(Array.isArray(result.systemReadiness.blockers)).toBe(true);
    }, 60000);
  });

  describe('Performance Benchmarks', () => {
    it('should execute performance benchmarks', async () => {
      const result = await validator.executeComprehensiveValidation();
      
      expect(Array.isArray(result.performanceBenchmarks)).toBe(true);
      
      for (const benchmark of result.performanceBenchmarks) {
        expect(benchmark).toBeDefined();
        expect(typeof benchmark.component).toBe('string');
        expect(typeof benchmark.metric).toBe('string');
        expect(typeof benchmark.value).toBe('number');
        expect(typeof benchmark.threshold).toBe('number');
        expect(typeof benchmark.passed).toBe('boolean');
        expect(typeof benchmark.percentile95).toBe('number');
        expect(typeof benchmark.percentile99).toBe('number');
      }
    }, 60000);
  });

  describe('Recommendations and Action Items', () => {
    it('should generate recommendations and action items', async () => {
      const result = await validator.executeComprehensiveValidation();
      
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.actionItems)).toBe(true);
      
      for (const recommendation of result.recommendations) {
        expect(recommendation).toBeDefined();
        expect(typeof recommendation.id).toBe('string');
        expect(recommendation.category).toMatch(/performance|reliability|security|maintainability/);
        expect(recommendation.priority).toMatch(/critical|high|medium|low/);
        expect(typeof recommendation.title).toBe('string');
        expect(typeof recommendation.description).toBe('string');
        expect(typeof recommendation.impact).toBe('string');
        expect(recommendation.effort).toMatch(/low|medium|high/);
        expect(typeof recommendation.timeline).toBe('string');
      }
      
      for (const actionItem of result.actionItems) {
        expect(actionItem).toBeDefined();
        expect(typeof actionItem.id).toBe('string');
        expect(typeof actionItem.title).toBe('string');
        expect(typeof actionItem.description).toBe('string');
        expect(actionItem.priority).toMatch(/critical|high|medium|low/);
        expect(typeof actionItem.category).toBe('string');
        expect(typeof actionItem.estimatedEffort).toBe('string');
      }
    }, 60000);
  });
});