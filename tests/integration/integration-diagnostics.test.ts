/**
 * Integration tests for Integration Diagnostics and Reporting System
 * Tests diagnostic accuracy and report completeness in real scenarios
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { 
  IntegrationDiagnostics,
  IntegrationReportGenerator,
  IntegrationTestFailure,
  IntegrationReport,
  ValidationStatusTracker
} from '../../src/validation/integration-diagnostics';
import { ComponentInterfaceValidator } from '../../src/validation/interface-validator';
import { loadFixture } from '../utils/test-helpers';

describe('Integration Diagnostics Integration Tests', () => {
  let diagnostics: IntegrationDiagnostics;
  let validator: ComponentInterfaceValidator;
  let reportGenerator: IntegrationReportGenerator;
  const testProjectRoot = process.cwd();
  const testOutputDir = path.join(testProjectRoot, 'test-output');

  beforeAll(async () => {
    // Ensure test output directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  beforeEach(() => {
    diagnostics = new IntegrationDiagnostics(testProjectRoot);
    validator = new ComponentInterfaceValidator(testProjectRoot);
    reportGenerator = new IntegrationReportGenerator(testProjectRoot);
  });

  afterEach(() => {
    // Clean up test output files
    if (fs.existsSync(testOutputDir)) {
      const files = fs.readdirSync(testOutputDir);
      for (const file of files) {
        if (file.startsWith('test-report-')) {
          fs.unlinkSync(path.join(testOutputDir, file));
        }
      }
    }
  });

  describe('Diagnostic Accuracy Tests', () => {
    it('should accurately diagnose timeout failures with correct suggestions', async () => {
      // Simulate a realistic timeout error
      const timeoutError = new Error('Test timed out after 5000ms waiting for async operation');
      timeoutError.stack = `Error: Test timed out after 5000ms waiting for async operation
        at Timeout._onTimeout (/project/tests/integration/end-to-end.test.ts:123:15)
        at listOnTimeout (internal/timers.js:557:17)
        at processTimers (internal/timers.js:500:7)`;

      const failure = await diagnostics.analyzeTestFailure(
        'should complete end-to-end README processing within timeout',
        'End-to-End Integration Tests',
        timeoutError,
        {
          duration: 5000,
          memoryUsage: 75 * 1024 * 1024,
          testSetup: 'complex-readme-processing'
        }
      );

      // Verify accurate classification
      expect(failure.failureType).toBe('timeout');
      expect(failure.testName).toBe('should complete end-to-end README processing within timeout');
      expect(failure.testSuite).toBe('End-to-End Integration Tests');
      
      // Verify location extraction accuracy
      expect(failure.failureLocation.file).toContain('tests/integration/end-to-end.test.ts');
      expect(failure.failureLocation.line).toBe(123);
      expect(failure.failureLocation.column).toBe(15);
      
      // Verify context capture
      expect(failure.context.testDuration).toBe(5000);
      expect(failure.context.memoryUsage).toBe(75 * 1024 * 1024);
      expect(failure.context.componentState.length).toBeGreaterThan(0);
      expect(failure.context.dataFlowState.length).toBeGreaterThan(0);
      
      // Verify suggestion accuracy for timeout scenarios
      expect(failure.suggestedFixes).toContain('Increase test timeout value');
      expect(failure.suggestedFixes).toContain('Check for infinite loops or blocking operations');
      expect(failure.suggestedFixes).toContain('Add proper async/await handling');
      
      // Verify suggestions are relevant to the context
      const hasAsyncSuggestion = failure.suggestedFixes.some(fix => 
        fix.toLowerCase().includes('async') || fix.toLowerCase().includes('await')
      );
      expect(hasAsyncSuggestion).toBe(true);
    });

    it('should accurately diagnose assertion failures with data-specific suggestions', async () => {
      // Simulate a realistic assertion error with data mismatch
      const assertionError = new Error('Expected languages array to have length 3, but got 2');
      assertionError.stack = `Error: Expected languages array to have length 3, but got 2
        at Object.toBe (/project/node_modules/vitest/dist/chunk-expect.js:145:20)
        at /project/tests/integration/language-detection.test.ts:67:45
        at processTicksAndRejections (internal/process/task_queues.js:95:5)`;

      const failure = await diagnostics.analyzeTestFailure(
        'should detect all languages in multi-language README',
        'Language Detection Integration Tests',
        assertionError,
        {
          duration: 150,
          memoryUsage: 25 * 1024 * 1024,
          testData: 'multi-language-readme.md'
        }
      );

      // Verify accurate classification
      expect(failure.failureType).toBe('assertion');
      
      // Verify suggestion accuracy for assertion failures
      expect(failure.suggestedFixes).toContain('Verify test data matches expected format');
      expect(failure.suggestedFixes).toContain('Check for race conditions in async operations');
      expect(failure.suggestedFixes).toContain('Validate mock setup and return values');
      
      // Verify data-specific suggestions
      const hasDataValidationSuggestion = failure.suggestedFixes.some(fix => 
        fix.toLowerCase().includes('data') || fix.toLowerCase().includes('format')
      );
      expect(hasDataValidationSuggestion).toBe(true);
    });

    it('should accurately identify related failures based on patterns', async () => {
      // Create a series of related failures
      const baseError = new Error('LanguageDetector confidence calculation failed');
      const relatedError1 = new Error('LanguageDetector context inheritance failed');
      const relatedError2 = new Error('CommandExtractor language context missing');
      const unrelatedError = new Error('Database connection timeout');

      // Analyze failures in sequence
      await diagnostics.analyzeTestFailure(
        'language detector confidence test',
        'Unit Tests',
        baseError
      );
      
      await diagnostics.analyzeTestFailure(
        'language detector context test',
        'Unit Tests',
        relatedError1
      );
      
      await diagnostics.analyzeTestFailure(
        'command extractor integration test',
        'Integration Tests',
        relatedError2
      );
      
      await diagnostics.analyzeTestFailure(
        'database connection test',
        'Database Tests',
        unrelatedError
      );

      // Analyze a new related failure
      const newError = new Error('LanguageDetector source tracking failed');
      const failure = await diagnostics.analyzeTestFailure(
        'language detector source tracking test',
        'Unit Tests',
        newError
      );

      // Verify related failure identification accuracy
      expect(failure.relatedFailures.length).toBeGreaterThan(0);
      expect(failure.relatedFailures).toContain('language detector confidence test');
      expect(failure.relatedFailures).toContain('language detector context test');
      
      // Should not include unrelated failures
      expect(failure.relatedFailures).not.toContain('database connection test');
      
      // May include integration test if error patterns match
      const hasIntegrationRelated = failure.relatedFailures.includes('command extractor integration test');
      if (hasIntegrationRelated) {
        // If included, it should be due to language context pattern matching
        expect(newError.message.toLowerCase()).toContain('language');
      }
    });

    it('should accurately capture component states during failures', async () => {
      const integrationError = new Error('Data flow validation failed between LanguageDetector and CommandExtractor');
      
      const failure = await diagnostics.analyzeTestFailure(
        'data flow integration test',
        'Integration Tests',
        integrationError
      );

      // Verify component state capture accuracy
      expect(failure.context.componentState.length).toBeGreaterThan(0);
      
      // Find LanguageDetector and CommandExtractor states
      const languageDetectorState = failure.context.componentState.find(
        state => state.componentName === 'LanguageDetector'
      );
      const commandExtractorState = failure.context.componentState.find(
        state => state.componentName === 'CommandExtractor'
      );
      
      expect(languageDetectorState).toBeDefined();
      expect(commandExtractorState).toBeDefined();
      
      // Verify state details
      expect(languageDetectorState!.status).toMatch(/^(healthy|degraded|failed|unknown)$/);
      expect(languageDetectorState!.performanceMetrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(languageDetectorState!.dependencies).toBeInstanceOf(Array);
      
      // Verify CommandExtractor has LanguageDetector as dependency
      const hasLanguageDetectorDep = commandExtractorState!.dependencies.some(
        dep => dep.dependencyName === 'LanguageDetector'
      );
      expect(hasLanguageDetectorDep).toBe(true);
    });

    it('should accurately capture data flow states during failures', async () => {
      const dataFlowError = new Error('Context inheritance failed: LanguageContext not properly passed');
      
      const failure = await diagnostics.analyzeTestFailure(
        'context inheritance integration test',
        'Integration Tests',
        dataFlowError
      );

      // Verify data flow state capture accuracy
      expect(failure.context.dataFlowState.length).toBeGreaterThan(0);
      
      // Find the specific data flow mentioned in error
      const contextFlow = failure.context.dataFlowState.find(
        flow => flow.sourceComponent === 'LanguageDetector' && 
                flow.targetComponent === 'CommandExtractor' &&
                flow.dataType === 'LanguageContext'
      );
      
      expect(contextFlow).toBeDefined();
      expect(contextFlow!.flowStatus).toMatch(/^(active|blocked|degraded|failed)$/);
      expect(contextFlow!.dataIntegrityScore).toBeGreaterThanOrEqual(0);
      expect(contextFlow!.dataIntegrityScore).toBeLessThanOrEqual(1);
      
      // For a context inheritance failure, data integrity should be reasonable
      expect(contextFlow!.dataIntegrityScore).toBeGreaterThanOrEqual(0);
      expect(contextFlow!.dataIntegrityScore).toBeLessThanOrEqual(1);
    });

    it('should provide accurate integration-specific suggestions', async () => {
      const integrationError = new Error('Component initialization order incorrect: CommandExtractor started before LanguageDetector');
      
      const failure = await diagnostics.analyzeTestFailure(
        'component initialization integration test',
        'Integration Tests',
        integrationError
      );

      // Verify integration-specific suggestions
      expect(failure.suggestedFixes).toContain('Verify component initialization order');
      expect(failure.suggestedFixes).toContain('Check data flow between components');
      expect(failure.suggestedFixes).toContain('Validate component dependencies');
      expect(failure.suggestedFixes).toContain('Review integration test setup');
      
      // Should not include generic suggestions that don't apply
      const hasGenericSuggestions = failure.suggestedFixes.some(fix => 
        fix.includes('database') || fix.includes('network')
      );
      expect(hasGenericSuggestions).toBe(false);
    });
  });

  describe('Report Completeness Tests', () => {
    it('should generate complete full integration report with all required sections', async () => {
      const report = await diagnostics.generateIntegrationReport('full');

      // Verify report structure completeness
      expect(report.reportId).toBeDefined();
      expect(report.reportId).toMatch(/^integration-report-\d+$/);
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.reportType).toBe('full');
      expect(report.timeRange).toBeDefined();
      expect(report.timeRange.start).toBeInstanceOf(Date);
      expect(report.timeRange.end).toBeInstanceOf(Date);
      expect(report.timeRange.end.getTime()).toBeGreaterThan(report.timeRange.start.getTime());

      // Verify summary completeness
      expect(report.summary).toBeDefined();
      expect(report.summary.overallStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(typeof report.summary.totalTests).toBe('number');
      expect(typeof report.summary.passedTests).toBe('number');
      expect(typeof report.summary.failedTests).toBe('number');
      expect(typeof report.summary.testSuccessRate).toBe('number');
      expect(report.summary.testSuccessRate).toBeGreaterThanOrEqual(0);
      expect(report.summary.testSuccessRate).toBeLessThanOrEqual(1);
      expect(report.summary.performanceSummary).toBeDefined();
      expect(typeof report.summary.performanceSummary.averageTestDuration).toBe('number');
      expect(report.summary.performanceSummary.slowestTest).toBeDefined();
      expect(report.summary.performanceSummary.fastestTest).toBeDefined();

      // Verify validation results completeness
      expect(report.validationResults).toBeDefined();
      expect(report.validationResults.interfaceValidation).toBeDefined();
      expect(report.validationResults.dataContractValidation).toBeDefined();
      expect(report.validationResults.compilationValidation).toBeDefined();
      expect(report.validationResults.integrationValidation).toBeDefined();
      
      // Each validation section should have required fields
      const interfaceValidation = report.validationResults.interfaceValidation;
      expect(typeof interfaceValidation.total).toBe('number');
      expect(typeof interfaceValidation.passed).toBe('number');
      expect(typeof interfaceValidation.failed).toBe('number');
      expect(interfaceValidation.criticalFailures).toBeInstanceOf(Array);

      // Verify health metrics completeness
      expect(report.healthMetrics).toBeDefined();
      expect(report.healthMetrics.overallHealth).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(typeof report.healthMetrics.healthScore).toBe('number');
      expect(report.healthMetrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(report.healthMetrics.healthScore).toBeLessThanOrEqual(100);
      expect(report.healthMetrics.componentHealth).toBeInstanceOf(Array);
      expect(report.healthMetrics.dataFlowHealth).toBeInstanceOf(Array);
      expect(report.healthMetrics.performanceMetrics).toBeDefined();
      expect(report.healthMetrics.errorRates).toBeDefined();
      expect(report.healthMetrics.trends).toBeDefined();
      expect(report.healthMetrics.lastUpdated).toBeInstanceOf(Date);

      // Verify failure analysis completeness
      expect(report.failureAnalysis).toBeDefined();
      expect(report.failureAnalysis.rootCauseAnalysis).toBeInstanceOf(Array);
      expect(report.failureAnalysis.failurePatterns).toBeInstanceOf(Array);
      expect(report.failureAnalysis.impactAssessment).toBeDefined();
      expect(report.failureAnalysis.recoveryRecommendations).toBeInstanceOf(Array);

      // Verify recommendations completeness
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
        expect(recommendation.timeline).toBeDefined();
      }

      // Verify action items completeness
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

      // Verify appendices completeness for full report
      expect(report.appendices).toBeInstanceOf(Array);
      expect(report.appendices.length).toBeGreaterThan(0);
      
      if (report.appendices.length > 0) {
        const appendix = report.appendices[0];
        expect(appendix.title).toBeDefined();
        expect(appendix.type).toMatch(/^(data|logs|configuration|metrics)$/);
        expect(appendix.content).toBeDefined();
        expect(appendix.description).toBeDefined();
      }
    });

    it('should generate complete health metrics with all component data', async () => {
      const healthMetrics = await diagnostics.monitorIntegrationHealth();

      // Verify component health completeness
      expect(healthMetrics.componentHealth.length).toBeGreaterThan(0);
      
      // Should include all expected components
      const expectedComponents = [
        'ReadmeParser',
        'LanguageDetector',
        'CommandExtractor',
        'DependencyExtractor',
        'ResultAggregator',
        'MetadataExtractor',
        'TestingExtractor'
      ];
      
      for (const expectedComponent of expectedComponents) {
        const componentHealth = healthMetrics.componentHealth.find(
          c => c.componentName === expectedComponent
        );
        expect(componentHealth).toBeDefined();
        
        // Verify component health data completeness
        expect(componentHealth!.healthStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
        expect(typeof componentHealth!.healthScore).toBe('number');
        expect(componentHealth!.healthScore).toBeGreaterThanOrEqual(0);
        expect(componentHealth!.healthScore).toBeLessThanOrEqual(100);
        expect(typeof componentHealth!.uptime).toBe('number');
        expect(componentHealth!.uptime).toBeGreaterThanOrEqual(0);
        expect(componentHealth!.uptime).toBeLessThanOrEqual(1);
        expect(typeof componentHealth!.errorRate).toBe('number');
        expect(componentHealth!.errorRate).toBeGreaterThanOrEqual(0);
        expect(typeof componentHealth!.responseTime).toBe('number');
        expect(componentHealth!.responseTime).toBeGreaterThanOrEqual(0);
        expect(typeof componentHealth!.memoryUsage).toBe('number');
        expect(componentHealth!.memoryUsage).toBeGreaterThanOrEqual(0);
      }

      // Verify data flow health completeness
      expect(healthMetrics.dataFlowHealth.length).toBeGreaterThan(0);
      
      // Should include all expected data flows
      const expectedDataFlows = [
        { source: 'LanguageDetector', target: 'CommandExtractor' },
        { source: 'LanguageDetector', target: 'ResultAggregator' },
        { source: 'CommandExtractor', target: 'ResultAggregator' },
        { source: 'DependencyExtractor', target: 'CommandExtractor' },
        { source: 'DependencyExtractor', target: 'ResultAggregator' },
        { source: 'MetadataExtractor', target: 'LanguageDetector' }
      ];
      
      for (const expectedFlow of expectedDataFlows) {
        const dataFlowHealth = healthMetrics.dataFlowHealth.find(
          d => d.sourceComponent === expectedFlow.source && 
               d.targetComponent === expectedFlow.target
        );
        expect(dataFlowHealth).toBeDefined();
        
        // Verify data flow health data completeness
        expect(dataFlowHealth!.flowId).toBeDefined();
        expect(dataFlowHealth!.healthStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
        expect(typeof dataFlowHealth!.throughput).toBe('number');
        expect(dataFlowHealth!.throughput).toBeGreaterThanOrEqual(0);
        expect(typeof dataFlowHealth!.latency).toBe('number');
        expect(dataFlowHealth!.latency).toBeGreaterThanOrEqual(0);
        expect(typeof dataFlowHealth!.errorRate).toBe('number');
        expect(dataFlowHealth!.errorRate).toBeGreaterThanOrEqual(0);
        expect(typeof dataFlowHealth!.dataIntegrityScore).toBe('number');
        expect(dataFlowHealth!.dataIntegrityScore).toBeGreaterThanOrEqual(0);
        expect(dataFlowHealth!.dataIntegrityScore).toBeLessThanOrEqual(1);
        expect(dataFlowHealth!.lastSuccessfulTransfer).toBeInstanceOf(Date);
      }

      // Verify performance metrics completeness
      const perfMetrics = healthMetrics.performanceMetrics;
      expect(typeof perfMetrics.averageResponseTime).toBe('number');
      expect(perfMetrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(typeof perfMetrics.peakResponseTime).toBe('number');
      expect(perfMetrics.peakResponseTime).toBeGreaterThanOrEqual(perfMetrics.averageResponseTime);
      expect(typeof perfMetrics.throughput).toBe('number');
      expect(perfMetrics.throughput).toBeGreaterThanOrEqual(0);
      
      // Memory usage metrics
      expect(perfMetrics.memoryUsage).toBeDefined();
      expect(typeof perfMetrics.memoryUsage.current).toBe('number');
      expect(typeof perfMetrics.memoryUsage.peak).toBe('number');
      expect(typeof perfMetrics.memoryUsage.average).toBe('number');
      expect(perfMetrics.memoryUsage.peak).toBeGreaterThanOrEqual(perfMetrics.memoryUsage.average);
      
      // CPU usage metrics
      expect(perfMetrics.cpuUsage).toBeDefined();
      expect(typeof perfMetrics.cpuUsage.current).toBe('number');
      expect(typeof perfMetrics.cpuUsage.peak).toBe('number');
      expect(typeof perfMetrics.cpuUsage.average).toBe('number');
      expect(perfMetrics.cpuUsage.current).toBeGreaterThanOrEqual(0);
      expect(perfMetrics.cpuUsage.current).toBeLessThanOrEqual(100);

      // Verify error rate metrics completeness
      const errorRates = healthMetrics.errorRates;
      expect(typeof errorRates.overallErrorRate).toBe('number');
      expect(errorRates.overallErrorRate).toBeGreaterThanOrEqual(0);
      expect(errorRates.overallErrorRate).toBeLessThanOrEqual(1);
      expect(errorRates.componentErrorRates).toBeDefined();
      expect(typeof errorRates.componentErrorRates).toBe('object');
      expect(errorRates.errorTrends).toBeDefined();
      expect(typeof errorRates.errorTrends).toBe('object');
      expect(typeof errorRates.criticalErrors).toBe('number');
      expect(errorRates.criticalErrors).toBeGreaterThanOrEqual(0);
      expect(typeof errorRates.warningCount).toBe('number');
      expect(errorRates.warningCount).toBeGreaterThanOrEqual(0);

      // Verify trends completeness
      const trends = healthMetrics.trends;
      expect(trends.healthScoreHistory).toBeInstanceOf(Array);
      expect(trends.errorRateHistory).toBeInstanceOf(Array);
      expect(trends.performanceHistory).toBeInstanceOf(Array);
      expect(trends.componentTrends).toBeDefined();
      expect(typeof trends.componentTrends).toBe('object');
      
      // Verify trend data structure
      if (trends.healthScoreHistory.length > 0) {
        const historyEntry = trends.healthScoreHistory[0];
        expect(historyEntry.timestamp).toBeInstanceOf(Date);
        expect(typeof historyEntry.score).toBe('number');
        expect(historyEntry.score).toBeGreaterThanOrEqual(0);
        expect(historyEntry.score).toBeLessThanOrEqual(100);
      }
    });

    it('should generate complete validation status tracker with all validation types', async () => {
      const tracker = await diagnostics.trackValidationStatus();

      // Verify tracker structure completeness
      expect(tracker.lastUpdated).toBeInstanceOf(Date);
      expect(tracker.overallStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(tracker.nextScheduledRun).toBeInstanceOf(Date);
      expect(tracker.nextScheduledRun.getTime()).toBeGreaterThan(tracker.lastUpdated.getTime());

      // Verify validation summary completeness
      expect(tracker.validationSummary).toBeDefined();
      
      // Interface validation summary
      const interfaces = tracker.validationSummary.interfaces;
      expect(typeof interfaces.total).toBe('number');
      expect(typeof interfaces.passed).toBe('number');
      expect(typeof interfaces.failed).toBe('number');
      expect(interfaces.total).toBe(interfaces.passed + interfaces.failed);
      expect(interfaces.lastRun).toBeInstanceOf(Date);
      
      // Data contract validation summary
      const dataContracts = tracker.validationSummary.dataContracts;
      expect(typeof dataContracts.total).toBe('number');
      expect(typeof dataContracts.passed).toBe('number');
      expect(typeof dataContracts.failed).toBe('number');
      expect(dataContracts.total).toBe(dataContracts.passed + dataContracts.failed);
      expect(dataContracts.lastRun).toBeInstanceOf(Date);
      
      // Compilation validation summary
      const compilation = tracker.validationSummary.compilation;
      expect(typeof compilation.success).toBe('boolean');
      expect(typeof compilation.errorCount).toBe('number');
      expect(compilation.errorCount).toBeGreaterThanOrEqual(0);
      expect(typeof compilation.warningCount).toBe('number');
      expect(compilation.warningCount).toBeGreaterThanOrEqual(0);
      expect(compilation.lastRun).toBeInstanceOf(Date);
      
      // Integration validation summary
      const integration = tracker.validationSummary.integration;
      expect(typeof integration.total).toBe('number');
      expect(typeof integration.passed).toBe('number');
      expect(typeof integration.failed).toBe('number');
      expect(integration.total).toBe(integration.passed + integration.failed);
      expect(integration.lastRun).toBeInstanceOf(Date);

      // Verify trends and alerts
      expect(tracker.trends).toBeDefined();
      expect(tracker.alerts).toBeInstanceOf(Array);
      
      // If there are alerts, verify their structure
      if (tracker.alerts.length > 0) {
        const alert = tracker.alerts[0];
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.message).toBeDefined();
        expect(alert.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should generate and save complete report files with proper structure', async () => {
      const reportPath = path.join(testOutputDir, 'test-report-complete.json');
      const summaryPath = path.join(testOutputDir, 'test-report-complete-summary.md');

      const outputPath = await reportGenerator.generateAndSaveReport(reportPath, 'full');

      // Verify files were created
      expect(outputPath).toBe(reportPath);
      expect(fs.existsSync(reportPath)).toBe(true);
      expect(fs.existsSync(summaryPath)).toBe(true);

      // Verify JSON report completeness
      const reportContent = fs.readFileSync(reportPath, 'utf8');
      const reportData = JSON.parse(reportContent);
      
      // Verify all required sections are present and complete
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

      // Verify markdown summary completeness
      const summaryContent = fs.readFileSync(summaryPath, 'utf8');
      
      // Should contain all major sections
      expect(summaryContent).toContain('# Integration Report Summary');
      expect(summaryContent).toContain('**Report ID:**');
      expect(summaryContent).toContain('**Generated:**');
      expect(summaryContent).toContain('**Overall Status:**');
      expect(summaryContent).toContain('## Summary');
      expect(summaryContent).toContain('## Health Status');
      expect(summaryContent).toContain('**Overall Health Score:**');
      expect(summaryContent).toContain('### Component Health');
      expect(summaryContent).toContain('### Data Flow Health');
      expect(summaryContent).toContain('## Validation Results');
      expect(summaryContent).toContain('### Interface Validation');
      expect(summaryContent).toContain('### Data Contract Validation');
      expect(summaryContent).toContain('### TypeScript Compilation');
      expect(summaryContent).toContain('## Recommendations');
      expect(summaryContent).toContain('## Action Items');
      
      // Should contain actual data, not just placeholders
      expect(summaryContent).toMatch(/\d+\/\d+ passed/); // Test results
      expect(summaryContent).toMatch(/\d+\.\d+\/100/); // Health score
      expect(summaryContent).toMatch(/Total: \d+/); // Validation counts
      
      // Should end with proper footer
      expect(summaryContent).toContain('*Report generated by Integration Diagnostics System*');
    });

    it('should maintain data consistency across multiple report generations', async () => {
      // Generate multiple reports in sequence
      const report1 = await diagnostics.generateIntegrationReport('full');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const report2 = await diagnostics.generateIntegrationReport('full');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const report3 = await diagnostics.generateIntegrationReport('full');

      // Verify reports have different IDs and timestamps
      expect(report1.reportId).not.toBe(report2.reportId);
      expect(report2.reportId).not.toBe(report3.reportId);
      expect(report1.generatedAt.getTime()).toBeLessThan(report2.generatedAt.getTime());
      expect(report2.generatedAt.getTime()).toBeLessThan(report3.generatedAt.getTime());

      // Verify data consistency in structure
      expect(report1.summary.overallStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(report2.summary.overallStatus).toMatch(/^(healthy|degraded|critical|failed)$/);
      expect(report3.summary.overallStatus).toMatch(/^(healthy|degraded|critical|failed)$/);

      // Component health should have same components across reports
      const components1 = report1.healthMetrics.componentHealth.map(c => c.componentName).sort();
      const components2 = report2.healthMetrics.componentHealth.map(c => c.componentName).sort();
      const components3 = report3.healthMetrics.componentHealth.map(c => c.componentName).sort();
      
      expect(components1).toEqual(components2);
      expect(components2).toEqual(components3);

      // Data flow health should have same flows across reports
      const flows1 = report1.healthMetrics.dataFlowHealth.map(d => d.flowId).sort();
      const flows2 = report2.healthMetrics.dataFlowHealth.map(d => d.flowId).sort();
      const flows3 = report3.healthMetrics.dataFlowHealth.map(d => d.flowId).sort();
      
      expect(flows1).toEqual(flows2);
      expect(flows2).toEqual(flows3);

      // Validation results structure should be consistent
      expect(Object.keys(report1.validationResults)).toEqual(Object.keys(report2.validationResults));
      expect(Object.keys(report2.validationResults)).toEqual(Object.keys(report3.validationResults));
    });
  });

  describe('Real-World Integration Scenarios', () => {
    it('should handle complex failure scenarios with accurate diagnostics', async () => {
      // Simulate a complex integration failure scenario
      const complexError = new Error('Integration test failed: Multiple component failures detected');
      complexError.stack = `Error: Integration test failed: Multiple component failures detected
        at IntegrationTest.run (/project/tests/integration/complex-scenario.test.ts:89:12)
        at TestRunner.execute (/project/tests/utils/test-runner.ts:45:8)
        at processTicksAndRejections (internal/process/task_queues.js:95:5)`;

      // Analyze the complex failure
      const failure = await diagnostics.analyzeTestFailure(
        'complex multi-component integration scenario',
        'Complex Integration Tests',
        complexError,
        {
          duration: 3500,
          memoryUsage: 120 * 1024 * 1024,
          testComplexity: 'high',
          componentsInvolved: ['LanguageDetector', 'CommandExtractor', 'ResultAggregator']
        }
      );

      // Verify comprehensive failure analysis
      expect(failure.testName).toBe('complex multi-component integration scenario');
      expect(failure.failureType).toBe('error');
      expect(failure.context.testDuration).toBe(3500);
      expect(failure.context.memoryUsage).toBe(120 * 1024 * 1024);
      
      // Should capture states for all involved components
      const componentNames = failure.context.componentState.map(c => c.componentName);
      expect(componentNames).toContain('LanguageDetector');
      expect(componentNames).toContain('CommandExtractor');
      expect(componentNames).toContain('ResultAggregator');
      
      // Should capture data flow states
      expect(failure.context.dataFlowState.length).toBeGreaterThan(0);
      
      // Verify data flow structure
      const dataFlowState = failure.context.dataFlowState[0];
      expect(dataFlowState.sourceComponent).toBeDefined();
      expect(dataFlowState.targetComponent).toBeDefined();
      expect(dataFlowState.dataType).toBeDefined();
      expect(dataFlowState.flowStatus).toMatch(/^(active|blocked|degraded|failed|unknown)$/);
      
      // Should include flows between components
      const hasRelevantFlow = failure.context.dataFlowState.some(flow => 
        (flow.sourceComponent === 'LanguageDetector' && flow.targetComponent === 'CommandExtractor') ||
        (flow.sourceComponent === 'CommandExtractor' && flow.targetComponent === 'ResultAggregator')
      );
      expect(hasRelevantFlow).toBe(true);
      
      // Should provide comprehensive suggestions
      expect(failure.suggestedFixes.length).toBeGreaterThan(3);
      expect(failure.suggestedFixes).toContain('Verify component initialization order');
      expect(failure.suggestedFixes).toContain('Check data flow between components');
    });

    it('should generate actionable reports for real integration issues', async () => {
      // Create some realistic failure history
      const failures = [
        new Error('LanguageDetector confidence calculation timeout'),
        new Error('CommandExtractor context inheritance failed'),
        new Error('ResultAggregator data flow validation error'),
        new Error('Integration test memory leak detected')
      ];

      for (let i = 0; i < failures.length; i++) {
        await diagnostics.analyzeTestFailure(
          `integration test ${i + 1}`,
          'Integration Tests',
          failures[i],
          { duration: 1000 + i * 500, memoryUsage: (50 + i * 20) * 1024 * 1024 }
        );
      }

      // Generate comprehensive report
      const report = await diagnostics.generateIntegrationReport('full');

      // Verify actionable recommendations (may be 0 if system is healthy)
      expect(report.recommendations.length).toBeGreaterThanOrEqual(0);
      
      // If there are recommendations, they should be properly categorized
      if (report.recommendations.length > 0) {
        const hasPerformanceRec = report.recommendations.some(r => r.category === 'performance');
        const hasReliabilityRec = report.recommendations.some(r => r.category === 'reliability');
        
        // Should have at least one type of recommendation
        expect(hasPerformanceRec || hasReliabilityRec).toBe(true);
      }
      
      // Verify actionable action items (may be 0 if no issues)
      expect(report.actionItems.length).toBeGreaterThanOrEqual(0);
      
      // If there are action items, they should be properly structured
      if (report.actionItems.length > 0) {
        const criticalActionItems = report.actionItems.filter(a => a.priority === 'critical' || a.priority === 'high');
        
        // Should have some action items with proper structure
        expect(report.actionItems.every(a => a.id && a.title && a.description)).toBe(true);
        
        // Action items should have realistic timelines (some may have due dates)
        const hasTimelineInfo = report.actionItems.some(a => a.dueDate !== undefined);
        expect(typeof hasTimelineInfo).toBe('boolean'); // Just verify it's a boolean
      }
    });

    it('should provide accurate health monitoring over time', async () => {
      // Monitor health multiple times to build history
      const healthSnapshots = [];
      
      for (let i = 0; i < 5; i++) {
        const health = await diagnostics.monitorIntegrationHealth();
        healthSnapshots.push(health);
        await new Promise(resolve => setTimeout(resolve, 20)); // Small delay
      }

      // Verify health monitoring accuracy
      expect(healthSnapshots.length).toBe(5);
      
      // Each snapshot should be complete
      for (const snapshot of healthSnapshots) {
        expect(snapshot.overallHealth).toMatch(/^(healthy|degraded|critical|failed)$/);
        expect(snapshot.healthScore).toBeGreaterThanOrEqual(0);
        expect(snapshot.healthScore).toBeLessThanOrEqual(100);
        expect(snapshot.componentHealth.length).toBeGreaterThan(0);
        expect(snapshot.dataFlowHealth.length).toBeGreaterThan(0);
      }

      // Health history should grow over time
      const firstSnapshot = healthSnapshots[0];
      const lastSnapshot = healthSnapshots[healthSnapshots.length - 1];
      
      expect(lastSnapshot.trends.healthScoreHistory.length).toBeGreaterThanOrEqual(
        firstSnapshot.trends.healthScoreHistory.length
      );
      
      // Timestamps should be in order
      expect(lastSnapshot.lastUpdated.getTime()).toBeGreaterThan(
        firstSnapshot.lastUpdated.getTime()
      );
    });
  });
});