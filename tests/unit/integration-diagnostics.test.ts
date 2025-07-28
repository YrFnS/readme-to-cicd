/**
 * Unit tests for Integration Diagnostics and Reporting System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { 
  IntegrationDiagnostics,
  IntegrationReportGenerator,
  IntegrationTestFailure,
  IntegrationHealthMetrics,
  IntegrationReport,
  ValidationStatusTracker
} from '../../src/validation/integration-diagnostics';

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('IntegrationDiagnostics', () => {
  let diagnostics: IntegrationDiagnostics;
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    diagnostics = new IntegrationDiagnostics(mockProjectRoot);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeTestFailure', () => {
    it('should analyze timeout failure correctly', async () => {
      const error = new Error('Test timed out after 5000ms');
      error.stack = `Error: Test timed out after 5000ms
        at /test/project/tests/integration/test.spec.ts:45:12
        at TestRunner.run (/test/project/node_modules/vitest/runner.js:123:5)`;

      const failure = await diagnostics.analyzeTestFailure(
        'should process README correctly',
        'Integration Tests',
        error,
        { duration: 5000, memoryUsage: 50 * 1024 * 1024 }
      );

      expect(failure.testName).toBe('should process README correctly');
      expect(failure.testSuite).toBe('Integration Tests');
      expect(failure.failureType).toBe('timeout');
      expect(failure.errorMessage).toBe('Test timed out after 5000ms');
      expect(failure.failureLocation.file).toContain('tests/integration/test.spec.ts');
      expect(failure.failureLocation.line).toBe(45);
      expect(failure.failureLocation.column).toBe(12);
      expect(failure.context.testDuration).toBe(5000);
      expect(failure.context.memoryUsage).toBe(50 * 1024 * 1024);
      expect(failure.suggestedFixes).toContain('Increase test timeout value');
      expect(failure.suggestedFixes).toContain('Check for infinite loops or blocking operations');
    });

    it('should analyze assertion failure correctly', async () => {
      const error = new Error('Expected 3 but received 2');
      error.stack = `Error: Expected 3 but received 2
        at expect (/test/project/tests/unit/parser.test.ts:67:23)
        at /test/project/tests/unit/parser.test.ts:65:5`;

      const failure = await diagnostics.analyzeTestFailure(
        'should extract correct number of languages',
        'Parser Tests',
        error
      );

      expect(failure.failureType).toBe('assertion');
      expect(failure.suggestedFixes).toContain('Verify test data matches expected format');
      expect(failure.suggestedFixes).toContain('Check for race conditions in async operations');
    });

    it('should analyze setup failure correctly', async () => {
      const error = new Error('Setup failed: Cannot connect to database');
      error.stack = `Error: Setup failed: Cannot connect to database
        at beforeAll (/test/project/tests/integration/setup.test.ts:12:8)`;

      const failure = await diagnostics.analyzeTestFailure(
        'database connection test',
        'Setup Tests',
        error
      );

      expect(failure.failureType).toBe('setup');
      expect(failure.suggestedFixes).toContain('Verify external dependencies are available');
    });

    it('should classify error failure correctly', async () => {
      const error = new Error('Network connection failed');
      error.stack = `Error: Network connection failed
        at NetworkClient.connect (/test/project/src/network.ts:123:45)
        at processData (/test/project/src/utils.ts:67:12)`;

      const failure = await diagnostics.analyzeTestFailure(
        'network connection test',
        'Network Tests',
        error
      );

      expect(failure.failureType).toBe('error');
      expect(failure.suggestedFixes.length).toBeGreaterThan(0);
    });

    it('should find related failures based on test name patterns', async () => {
      // First, create some failure history
      const relatedError1 = new Error('Language detection failed');
      const relatedError2 = new Error('Command extraction timeout');
      const unrelatedError = new Error('Database connection failed');

      await diagnostics.analyzeTestFailure('language detection basic test', 'Unit Tests', relatedError1);
      await diagnostics.analyzeTestFailure('command extraction integration test', 'Integration Tests', relatedError2);
      await diagnostics.analyzeTestFailure('database setup test', 'Setup Tests', unrelatedError);

      // Now analyze a new failure that should find related ones
      const newError = new Error('Language detection timeout');
      const failure = await diagnostics.analyzeTestFailure(
        'language detection advanced test',
        'Unit Tests',
        newError
      );

      expect(failure.relatedFailures).toContain('language detection basic test');
      expect(failure.relatedFailures).not.toContain('database setup test');
    });

    it('should find related failures based on error message patterns', async () => {
      // Create failure history with similar error patterns
      const timeoutError1 = new Error('Operation timed out after 3000ms');
      const timeoutError2 = new Error('Request timeout occurred');
      const parseError = new Error('Parse error in line 45');

      await diagnostics.analyzeTestFailure('api call test', 'API Tests', timeoutError1);
      await diagnostics.analyzeTestFailure('network request test', 'Network Tests', timeoutError2);
      await diagnostics.analyzeTestFailure('parser test', 'Parser Tests', parseError);

      // Analyze new timeout error
      const newTimeoutError = new Error('Connection timed out');
      const failure = await diagnostics.analyzeTestFailure(
        'database timeout test',
        'Database Tests',
        newTimeoutError
      );

      // Should find at least one related timeout failure
      expect(failure.relatedFailures.length).toBeGreaterThan(0);
      
      // Should include timeout-related failures
      const hasTimeoutRelated = failure.relatedFailures.some(f => 
        f === 'api call test' || f === 'network request test'
      );
      expect(hasTimeoutRelated).toBe(true);
      
      // Should not include unrelated failures
      expect(failure.relatedFailures).not.toContain('parser test');
    });

    it('should capture component states at time of failure', async () => {
      const error = new Error('Integration test failed');
      
      const failure = await diagnostics.analyzeTestFailure(
        'end-to-end integration test',
        'Integration Tests',
        error
      );

      expect(failure.context.componentState).toBeDefined();
      expect(failure.context.componentState.length).toBeGreaterThan(0);
      
      const componentState = failure.context.componentState[0];
      expect(componentState.componentName).toBeDefined();
      expect(componentState.status).toMatch(/^(healthy|degraded|failed|unknown)$/);
      expect(componentState.performanceMetrics).toBeDefined();
      expect(componentState.dependencies).toBeDefined();
    });

    it('should capture data flow states at time of failure', async () => {
      const error = new Error('Data flow validation failed');
      
      const failure = await diagnostics.analyzeTestFailure(
        'data flow integration test',
        'Integration Tests',
        error
      );

      expect(failure.context.dataFlowState).toBeDefined();
      expect(failure.context.dataFlowState.length).toBeGreaterThan(0);
      
      const dataFlowState = failure.context.dataFlowState[0];
      expect(dataFlowState.sourceComponent).toBeDefined();
      expect(dataFlowState.targetComponent).toBeDefined();
      expect(dataFlowState.dataType).toBeDefined();
      expect(dataFlowState.flowStatus).toMatch(/^(active|blocked|degraded|failed)$/);
      expect(dataFlowState.dataIntegrityScore).toBeGreaterThanOrEqual(0);
      expect(dataFlowState.dataIntegrityScore).toBeLessThanOrEqual(1);
    });

    it('should provide integration-specific suggestions for integration tests', async () => {
      const error = new Error('Component initialization failed');
      
      const failure = await diagnostics.analyzeTestFailure(
        'component integration test',
        'Integration Tests',
        error
      );

      expect(failure.suggestedFixes).toContain('Verify component initialization order');
      expect(failure.suggestedFixes).toContain('Check data flow between components');
      expect(failure.suggestedFixes).toContain('Validate component dependencies');
    });
  });

  describe('generateIntegrationReport', () => {
    it('should generate full integration report', async () => {
      const report = await diagnostics.generateIntegrationReport('full');

      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.reportType).toBe('full');
      expect(report.timeRange).toBeDefined();
      expect(report.timeRange.start).toBeInstanceOf(Date);
      expect(report.timeRange.end).toBeInstanceOf(Date);
      
      // Verify summary
      expect(report.summary).toBeDefined();
      expect(report.summary.overallStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(report.summary.totalTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.passedTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.failedTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.testSuccessRate).toBeGreaterThanOrEqual(0);
      expect(report.summary.testSuccessRate).toBeLessThanOrEqual(1);
      
      // Verify validation results
      expect(report.validationResults).toBeDefined();
      expect(report.validationResults.interfaceValidation).toBeDefined();
      expect(report.validationResults.dataContractValidation).toBeDefined();
      expect(report.validationResults.compilationValidation).toBeDefined();
      expect(report.validationResults.integrationValidation).toBeDefined();
      
      // Verify health metrics
      expect(report.healthMetrics).toBeDefined();
      expect(report.healthMetrics.overallHealth).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(report.healthMetrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(report.healthMetrics.healthScore).toBeLessThanOrEqual(100);
      expect(report.healthMetrics.componentHealth).toBeInstanceOf(Array);
      expect(report.healthMetrics.dataFlowHealth).toBeInstanceOf(Array);
      
      // Verify failure analysis
      expect(report.failureAnalysis).toBeDefined();
      expect(report.failureAnalysis.rootCauseAnalysis).toBeInstanceOf(Array);
      expect(report.failureAnalysis.failurePatterns).toBeInstanceOf(Array);
      expect(report.failureAnalysis.impactAssessment).toBeDefined();
      expect(report.failureAnalysis.recoveryRecommendations).toBeInstanceOf(Array);
      
      // Verify recommendations and action items
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.actionItems).toBeInstanceOf(Array);
      expect(report.appendices).toBeInstanceOf(Array);
    });

    it('should generate summary report with reduced content', async () => {
      const report = await diagnostics.generateIntegrationReport('summary');

      expect(report.reportType).toBe('summary');
      expect(report.summary).toBeDefined();
      expect(report.healthMetrics).toBeDefined();
      
      // Summary reports should have fewer appendices
      expect(report.appendices.length).toBeLessThanOrEqual(2);
    });

    it('should generate failure analysis report', async () => {
      const report = await diagnostics.generateIntegrationReport('failure-analysis');

      expect(report.reportType).toBe('failure-analysis');
      expect(report.failureAnalysis).toBeDefined();
      expect(report.failureAnalysis.rootCauseAnalysis).toBeDefined();
      expect(report.failureAnalysis.failurePatterns).toBeDefined();
      expect(report.failureAnalysis.impactAssessment).toBeDefined();
    });

    it('should generate health check report', async () => {
      const report = await diagnostics.generateIntegrationReport('health-check');

      expect(report.reportType).toBe('health-check');
      expect(report.healthMetrics).toBeDefined();
      expect(report.healthMetrics.componentHealth).toBeInstanceOf(Array);
      expect(report.healthMetrics.dataFlowHealth).toBeInstanceOf(Array);
      expect(report.healthMetrics.performanceMetrics).toBeDefined();
    });

    it('should respect custom time range', async () => {
      const customStart = new Date('2024-01-01');
      const customEnd = new Date('2024-01-02');
      
      const report = await diagnostics.generateIntegrationReport('full', {
        start: customStart,
        end: customEnd
      });

      expect(report.timeRange.start).toEqual(customStart);
      expect(report.timeRange.end).toEqual(customEnd);
    });

    it('should include performance summary in report', async () => {
      const report = await diagnostics.generateIntegrationReport('full');

      expect(report.summary.performanceSummary).toBeDefined();
      expect(report.summary.performanceSummary.averageTestDuration).toBeGreaterThanOrEqual(0);
      expect(report.summary.performanceSummary.slowestTest).toBeDefined();
      expect(report.summary.performanceSummary.fastestTest).toBeDefined();
      expect(report.summary.performanceSummary.memoryUsagePeak).toBeGreaterThanOrEqual(0);
    });

    it('should generate appropriate recommendations based on health metrics', async () => {
      const report = await diagnostics.generateIntegrationReport('full');

      expect(report.recommendations).toBeInstanceOf(Array);
      
      if (report.recommendations.length > 0) {
        const recommendation = report.recommendations[0];
        expect(recommendation.id).toBeDefined();
        expect(recommendation.category).toMatch(/^(performance|reliability|maintainability|security)$/);
        expect(recommendation.priority).toMatch(/^(low|medium|high|critical)$/);
        expect(recommendation.title).toBeDefined();
        expect(recommendation.description).toBeDefined();
        expect(recommendation.implementation).toBeInstanceOf(Array);
        expect(recommendation.expectedBenefit).toBeDefined();
        expect(recommendation.effort).toMatch(/^(low|medium|high)$/);
      }
    });

    it('should generate action items from recommendations', async () => {
      const report = await diagnostics.generateIntegrationReport('full');

      expect(report.actionItems).toBeInstanceOf(Array);
      
      if (report.actionItems.length > 0) {
        const actionItem = report.actionItems[0];
        expect(actionItem.id).toBeDefined();
        expect(actionItem.title).toBeDefined();
        expect(actionItem.description).toBeDefined();
        expect(actionItem.priority).toMatch(/^(low|medium|high|critical)$/);
        expect(actionItem.status).toMatch(/^(open|in-progress|completed|blocked)$/);
        expect(actionItem.dependencies).toBeInstanceOf(Array);
        expect(actionItem.tags).toBeInstanceOf(Array);
        expect(actionItem.createdAt).toBeInstanceOf(Date);
        expect(actionItem.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('monitorIntegrationHealth', () => {
    it('should generate comprehensive health metrics', async () => {
      const healthMetrics = await diagnostics.monitorIntegrationHealth();

      expect(healthMetrics.overallHealth).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(healthMetrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(healthMetrics.healthScore).toBeLessThanOrEqual(100);
      expect(healthMetrics.lastUpdated).toBeInstanceOf(Date);
      
      // Component health
      expect(healthMetrics.componentHealth).toBeInstanceOf(Array);
      expect(healthMetrics.componentHealth.length).toBeGreaterThan(0);
      
      const componentHealth = healthMetrics.componentHealth[0];
      expect(componentHealth.componentName).toBeDefined();
      expect(componentHealth.healthStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(componentHealth.healthScore).toBeGreaterThanOrEqual(0);
      expect(componentHealth.healthScore).toBeLessThanOrEqual(100);
      expect(componentHealth.uptime).toBeGreaterThanOrEqual(0);
      expect(componentHealth.uptime).toBeLessThanOrEqual(1);
      expect(componentHealth.errorRate).toBeGreaterThanOrEqual(0);
      expect(componentHealth.responseTime).toBeGreaterThanOrEqual(0);
      expect(componentHealth.memoryUsage).toBeGreaterThanOrEqual(0);
      
      // Data flow health
      expect(healthMetrics.dataFlowHealth).toBeInstanceOf(Array);
      expect(healthMetrics.dataFlowHealth.length).toBeGreaterThan(0);
      
      const dataFlowHealth = healthMetrics.dataFlowHealth[0];
      expect(dataFlowHealth.flowId).toBeDefined();
      expect(dataFlowHealth.sourceComponent).toBeDefined();
      expect(dataFlowHealth.targetComponent).toBeDefined();
      expect(dataFlowHealth.healthStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(dataFlowHealth.throughput).toBeGreaterThanOrEqual(0);
      expect(dataFlowHealth.latency).toBeGreaterThanOrEqual(0);
      expect(dataFlowHealth.errorRate).toBeGreaterThanOrEqual(0);
      expect(dataFlowHealth.dataIntegrityScore).toBeGreaterThanOrEqual(0);
      expect(dataFlowHealth.dataIntegrityScore).toBeLessThanOrEqual(1);
      expect(dataFlowHealth.lastSuccessfulTransfer).toBeInstanceOf(Date);
      
      // Performance metrics
      expect(healthMetrics.performanceMetrics).toBeDefined();
      expect(healthMetrics.performanceMetrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(healthMetrics.performanceMetrics.peakResponseTime).toBeGreaterThanOrEqual(0);
      expect(healthMetrics.performanceMetrics.throughput).toBeGreaterThanOrEqual(0);
      expect(healthMetrics.performanceMetrics.memoryUsage).toBeDefined();
      expect(healthMetrics.performanceMetrics.cpuUsage).toBeDefined();
      
      // Error rates
      expect(healthMetrics.errorRates).toBeDefined();
      expect(healthMetrics.errorRates.overallErrorRate).toBeGreaterThanOrEqual(0);
      expect(healthMetrics.errorRates.componentErrorRates).toBeDefined();
      expect(healthMetrics.errorRates.errorTrends).toBeDefined();
      expect(healthMetrics.errorRates.criticalErrors).toBeGreaterThanOrEqual(0);
      expect(healthMetrics.errorRates.warningCount).toBeGreaterThanOrEqual(0);
      
      // Trends
      expect(healthMetrics.trends).toBeDefined();
      expect(healthMetrics.trends.healthScoreHistory).toBeInstanceOf(Array);
      expect(healthMetrics.trends.errorRateHistory).toBeInstanceOf(Array);
      expect(healthMetrics.trends.performanceHistory).toBeInstanceOf(Array);
    });

    it('should update health history over time', async () => {
      // First monitoring call
      const firstMetrics = await diagnostics.monitorIntegrationHealth();
      
      // Wait a bit and call again
      await new Promise(resolve => setTimeout(resolve, 10));
      const secondMetrics = await diagnostics.monitorIntegrationHealth();

      // History should be updated
      expect(secondMetrics.trends.healthScoreHistory.length).toBeGreaterThanOrEqual(
        firstMetrics.trends.healthScoreHistory.length
      );
      expect(secondMetrics.lastUpdated.getTime()).toBeGreaterThan(
        firstMetrics.lastUpdated.getTime()
      );
    });

    it('should maintain health history size limits', async () => {
      // Simulate many monitoring calls
      for (let i = 0; i < 105; i++) {
        await diagnostics.monitorIntegrationHealth();
      }

      const metrics = await diagnostics.monitorIntegrationHealth();
      
      // History should be limited to 100 entries
      expect(metrics.trends.healthScoreHistory.length).toBeLessThanOrEqual(100);
      expect(metrics.trends.errorRateHistory.length).toBeLessThanOrEqual(100);
      expect(metrics.trends.performanceHistory.length).toBeLessThanOrEqual(100);
    });
  });

  describe('trackValidationStatus', () => {
    it('should track validation status across all components', async () => {
      const tracker = await diagnostics.trackValidationStatus();

      expect(tracker.lastUpdated).toBeInstanceOf(Date);
      expect(tracker.overallStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(tracker.nextScheduledRun).toBeInstanceOf(Date);
      expect(tracker.nextScheduledRun.getTime()).toBeGreaterThan(tracker.lastUpdated.getTime());
      
      // Validation summary
      expect(tracker.validationSummary).toBeDefined();
      expect(tracker.validationSummary.interfaces).toBeDefined();
      expect(tracker.validationSummary.dataContracts).toBeDefined();
      expect(tracker.validationSummary.compilation).toBeDefined();
      expect(tracker.validationSummary.integration).toBeDefined();
      
      // Interface validation summary
      const interfaces = tracker.validationSummary.interfaces;
      expect(interfaces.total).toBeGreaterThanOrEqual(0);
      expect(interfaces.passed).toBeGreaterThanOrEqual(0);
      expect(interfaces.failed).toBeGreaterThanOrEqual(0);
      expect(interfaces.total).toBe(interfaces.passed + interfaces.failed);
      expect(interfaces.lastRun).toBeInstanceOf(Date);
      
      // Data contract validation summary
      const dataContracts = tracker.validationSummary.dataContracts;
      expect(dataContracts.total).toBeGreaterThanOrEqual(0);
      expect(dataContracts.passed).toBeGreaterThanOrEqual(0);
      expect(dataContracts.failed).toBeGreaterThanOrEqual(0);
      expect(dataContracts.total).toBe(dataContracts.passed + dataContracts.failed);
      expect(dataContracts.lastRun).toBeInstanceOf(Date);
      
      // Compilation validation summary
      const compilation = tracker.validationSummary.compilation;
      expect(typeof compilation.success).toBe('boolean');
      expect(compilation.errorCount).toBeGreaterThanOrEqual(0);
      expect(compilation.warningCount).toBeGreaterThanOrEqual(0);
      expect(compilation.lastRun).toBeInstanceOf(Date);
      
      // Integration validation summary
      const integration = tracker.validationSummary.integration;
      expect(integration.total).toBeGreaterThanOrEqual(0);
      expect(integration.passed).toBeGreaterThanOrEqual(0);
      expect(integration.failed).toBeGreaterThanOrEqual(0);
      expect(integration.total).toBe(integration.passed + integration.failed);
      expect(integration.lastRun).toBeInstanceOf(Date);
      
      // Trends and alerts
      expect(tracker.trends).toBeDefined();
      expect(tracker.alerts).toBeInstanceOf(Array);
    });

    it('should calculate overall status correctly', async () => {
      const tracker = await diagnostics.trackValidationStatus();

      // Overall status should be based on validation results
      const hasFailures = tracker.validationSummary.interfaces.failed > 0 ||
                         tracker.validationSummary.dataContracts.failed > 0 ||
                         !tracker.validationSummary.compilation.success ||
                         tracker.validationSummary.integration.failed > 0;

      if (!hasFailures) {
        expect(tracker.overallStatus).toBe('healthy');
      } else {
        expect(tracker.overallStatus).toMatch(/^(degraded|critical|failed)$/);
      }
    });

    it('should generate validation alerts for critical issues', async () => {
      const tracker = await diagnostics.trackValidationStatus();

      expect(tracker.alerts).toBeInstanceOf(Array);
      
      // If there are alerts, they should have proper structure
      if (tracker.alerts.length > 0) {
        const alert = tracker.alerts[0];
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.message).toBeDefined();
        expect(alert.timestamp).toBeInstanceOf(Date);
      }
    });
  });
});

describe('IntegrationReportGenerator', () => {
  let generator: IntegrationReportGenerator;
  const mockProjectRoot = '/test/project';
  const mockOutputPath = '/test/output/report.json';

  beforeEach(() => {
    generator = new IntegrationReportGenerator(mockProjectRoot);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateAndSaveReport', () => {
    it('should generate and save full report to file', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      const outputPath = await generator.generateAndSaveReport(mockOutputPath, 'full');

      expect(outputPath).toBe(mockOutputPath);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/output', { recursive: true });
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // JSON + Markdown summary
      
      // Verify JSON report was written
      const jsonCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0] === mockOutputPath
      );
      expect(jsonCall).toBeDefined();
      expect(typeof jsonCall![1]).toBe('string');
      
      // Verify it's valid JSON
      expect(() => JSON.parse(jsonCall![1] as string)).not.toThrow();
      
      // Verify markdown summary was written
      const markdownCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0] === '/test/output/report-summary.md'
      );
      expect(markdownCall).toBeDefined();
      expect(typeof markdownCall![1]).toBe('string');
      expect(markdownCall![1]).toContain('# Integration Report Summary');
    });

    it('should create output directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      await generator.generateAndSaveReport('/new/path/report.json', 'summary');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/new/path', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      await generator.generateAndSaveReport(mockOutputPath, 'summary');

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should generate different report types correctly', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      const reportTypes: Array<'full' | 'summary' | 'failure-analysis' | 'health-check'> = [
        'full', 'summary', 'failure-analysis', 'health-check'
      ];

      for (const reportType of reportTypes) {
        await generator.generateAndSaveReport(`/test/${reportType}-report.json`, reportType);
        
        const jsonCall = mockFs.writeFileSync.mock.calls.find(call => 
          call[0] === `/test/${reportType}-report.json`
        );
        expect(jsonCall).toBeDefined();
        
        const reportData = JSON.parse(jsonCall![1] as string);
        expect(reportData.reportType).toBe(reportType);
      }
    });

    it('should generate comprehensive markdown summary', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      await generator.generateAndSaveReport(mockOutputPath, 'full');

      const markdownCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0] === '/test/output/report-summary.md'
      );
      expect(markdownCall).toBeDefined();
      
      const markdownContent = markdownCall![1] as string;
      
      // Verify markdown structure
      expect(markdownContent).toContain('# Integration Report Summary');
      expect(markdownContent).toContain('**Report ID:**');
      expect(markdownContent).toContain('**Generated:**');
      expect(markdownContent).toContain('**Overall Status:**');
      expect(markdownContent).toContain('## Summary');
      expect(markdownContent).toContain('## Health Status');
      expect(markdownContent).toContain('## Validation Results');
      expect(markdownContent).toContain('## Recommendations');
      expect(markdownContent).toContain('## Action Items');
      
      // Verify content includes metrics
      expect(markdownContent).toContain('Tests:');
      expect(markdownContent).toContain('Validations:');
      expect(markdownContent).toContain('Overall Health Score:');
      expect(markdownContent).toContain('Component Health');
      expect(markdownContent).toContain('Data Flow Health');
      expect(markdownContent).toContain('Interface Validation');
      expect(markdownContent).toContain('TypeScript Compilation');
    });

    it('should handle file system errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(generator.generateAndSaveReport(mockOutputPath, 'full'))
        .rejects.toThrow('Permission denied');
    });

    it('should generate valid JSON structure', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});

      await generator.generateAndSaveReport(mockOutputPath, 'full');

      const jsonCall = mockFs.writeFileSync.mock.calls.find(call => 
        call[0] === mockOutputPath
      );
      expect(jsonCall).toBeDefined();
      
      const reportData = JSON.parse(jsonCall![1] as string);
      
      // Verify required fields
      expect(reportData.reportId).toBeDefined();
      expect(reportData.generatedAt).toBeDefined();
      expect(reportData.reportType).toBe('full');
      expect(reportData.timeRange).toBeDefined();
      expect(reportData.summary).toBeDefined();
      expect(reportData.validationResults).toBeDefined();
      expect(reportData.healthMetrics).toBeDefined();
      expect(reportData.failureAnalysis).toBeDefined();
      expect(reportData.recommendations).toBeDefined();
      expect(reportData.actionItems).toBeDefined();
      expect(reportData.appendices).toBeDefined();
      
      // Verify data types
      expect(typeof reportData.reportId).toBe('string');
      expect(typeof reportData.generatedAt).toBe('string');
      expect(Array.isArray(reportData.recommendations)).toBe(true);
      expect(Array.isArray(reportData.actionItems)).toBe(true);
      expect(Array.isArray(reportData.appendices)).toBe(true);
    });
  });
});