/**
 * Regression testing framework implementation
 */

import { RegressionTestSuite } from './interfaces.js';
import { TestResult, TestCase, TestSuite } from './types.js';

export class RegressionTestSuiteImpl implements RegressionTestSuite {
  public readonly name: string;
  
  private testRegistry: Map<string, TestCase> = new Map();
  private baselineRegistry: Map<string, TestResult> = new Map();
  private suiteRegistry: Map<string, TestSuite> = new Map();
  private scheduler: TestScheduler;
  private changeDetector: ChangeDetector;
  private baselineManager: BaselineManager;

  constructor(name: string) {
    this.name = name;
    this.scheduler = new TestScheduler();
    this.changeDetector = new ChangeDetector();
    this.baselineManager = new BaselineManager();
  }

  /**
   * Execute full regression test suite
   */
  async executeRegressionSuite(): Promise<TestResult[]> {
    const startTime = new Date();
    const results: TestResult[] = [];
    
    try {
      // Get all regression tests
      const regressionTests = Array.from(this.testRegistry.values())
        .filter(test => test.tags?.includes('regression'));
      
      // Execute tests in parallel batches
      const batches = this.createTestBatches(regressionTests);
      
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(test => this.executeRegressionTest(test))
        );
        results.push(...batchResults);
      }
      
      // Generate regression report
      await this.generateRegressionReport(results);
      
      return results;
    } catch (error) {
      // Create error result for the entire suite
      const errorResult: TestResult = {
        id: `regression-suite-error-${Date.now()}`,
        name: 'Regression Suite Execution',
        type: 'regression',
        status: 'failed',
        duration: Date.now() - startTime.getTime(),
        startTime,
        endTime: new Date(),
        error: error as Error,
        artifacts: []
      };
      
      return [errorResult];
    }
  }

  /**
   * Execute smoke test suite (critical path tests)
   */
  async executeSmokeSuite(): Promise<TestResult[]> {
    const startTime = new Date();
    const results: TestResult[] = [];
    
    try {
      // Get smoke tests (high priority, critical functionality)
      const smokeTests = Array.from(this.testRegistry.values())
        .filter(test => test.tags?.includes('smoke') || test.severity === 'critical');
      
      // Execute smoke tests sequentially for faster feedback
      for (const test of smokeTests) {
        const result = await this.executeRegressionTest(test);
        results.push(result);
        
        // Stop on first failure for smoke tests
        if (result.status === 'failed') {
          break;
        }
      }
      
      // Generate smoke test report
      await this.generateSmokeReport(results);
      
      return results;
    } catch (error) {
      const errorResult: TestResult = {
        id: `smoke-suite-error-${Date.now()}`,
        name: 'Smoke Suite Execution',
        type: 'regression',
        status: 'failed',
        duration: Date.now() - startTime.getTime(),
        startTime,
        endTime: new Date(),
        error: error as Error,
        artifacts: []
      };
      
      return [errorResult];
    }
  }

  /**
   * Execute critical path test suite
   */
  async executeCriticalPathSuite(): Promise<TestResult[]> {
    const startTime = new Date();
    const results: TestResult[] = [];
    
    try {
      // Get critical path tests
      const criticalPathTests = Array.from(this.testRegistry.values())
        .filter(test => test.tags?.includes('critical-path'));
      
      // Sort by dependencies to ensure proper execution order
      const sortedTests = this.sortTestsByDependencies(criticalPathTests);
      
      // Execute tests in dependency order
      for (const test of sortedTests) {
        const result = await this.executeRegressionTest(test);
        results.push(result);
        
        // Continue even on failure to get complete picture
      }
      
      // Generate critical path report
      await this.generateCriticalPathReport(results);
      
      return results;
    } catch (error) {
      const errorResult: TestResult = {
        id: `critical-path-suite-error-${Date.now()}`,
        name: 'Critical Path Suite Execution',
        type: 'regression',
        status: 'failed',
        duration: Date.now() - startTime.getTime(),
        startTime,
        endTime: new Date(),
        error: error as Error,
        artifacts: []
      };
      
      return [errorResult];
    }
  }

  /**
   * Update baseline for a specific test
   */
  async updateBaseline(testId: string, result: TestResult): Promise<void> {
    try {
      // Validate the result is suitable as baseline
      if (result.status !== 'passed') {
        throw new Error('Cannot set baseline from failed test result');
      }
      
      // Store baseline
      this.baselineRegistry.set(testId, result);
      
      // Persist baseline to storage
      await this.baselineManager.saveBaseline(testId, result);
      
    } catch (error) {
      throw new Error(`Failed to update baseline for test ${testId}: ${error}`);
    }
  }

  /**
   * Compare test result with baseline
   */
  async compareWithBaseline(testId: string, result: TestResult): Promise<boolean> {
    try {
      // Get baseline result
      const baseline = this.baselineRegistry.get(testId) || 
                     await this.baselineManager.loadBaseline(testId);
      
      if (!baseline) {
        // No baseline exists, consider this a new test
        return true;
      }
      
      // Compare results
      return this.compareTestResults(baseline, result);
      
    } catch (error) {
      // If comparison fails, assume regression
      return false;
    }
  }

  /**
   * Schedule automated test execution
   */
  async scheduleExecution(schedule: string): Promise<void> {
    try {
      await this.scheduler.scheduleRegressionSuite(schedule, async () => {
        const results = await this.executeRegressionSuite();
        await this.handleScheduledResults(results);
      });
    } catch (error) {
      throw new Error(`Failed to schedule regression tests: ${error}`);
    }
  }

  /**
   * Trigger tests on code changes
   */
  async triggerOnChange(changeType: string): Promise<void> {
    try {
      // Detect what tests should run based on change type
      const testsToRun = await this.changeDetector.getAffectedTests(changeType);
      
      // Execute affected tests
      const results: TestResult[] = [];
      for (const testId of testsToRun) {
        const test = this.testRegistry.get(testId);
        if (test) {
          const result = await this.executeRegressionTest(test);
          results.push(result);
        }
      }
      
      // Handle change-triggered results
      await this.handleChangeTriggeredResults(results, changeType);
      
    } catch (error) {
      throw new Error(`Failed to trigger tests on change: ${error}`);
    }
  }

  /**
   * Register a test for regression testing
   */
  registerTest(test: TestCase): void {
    this.testRegistry.set(test.id, test);
  }

  /**
   * Register a test suite for regression testing
   */
  registerSuite(suite: TestSuite): void {
    this.suiteRegistry.set(suite.id, suite);
    
    // Register individual tests from the suite
    suite.tests.forEach(test => this.registerTest(test));
  }

  // Private helper methods

  private async executeRegressionTest(test: TestCase): Promise<TestResult> {
    const startTime = new Date();
    
    try {
      // Execute the test
      const result = await test.execute();
      
      // Compare with baseline if available
      const baselineComparison = await this.compareWithBaseline(test.id, result);
      
      // Update result status based on baseline comparison
      if (result.status === 'passed' && !baselineComparison) {
        result.status = 'failed';
        result.error = new Error('Test result differs from baseline (potential regression)');
      }
      
      return result;
    } catch (error) {
      const endTime = new Date();
      
      return {
        id: `${test.id}-${Date.now()}`,
        name: test.name,
        type: 'regression',
        status: 'failed',
        duration: endTime.getTime() - startTime.getTime(),
        startTime,
        endTime,
        error: error as Error,
        artifacts: []
      };
    }
  }

  private createTestBatches(tests: TestCase[]): TestCase[][] {
    const batchSize = 10; // Configurable batch size
    const batches: TestCase[][] = [];
    
    for (let i = 0; i < tests.length; i += batchSize) {
      batches.push(tests.slice(i, i + batchSize));
    }
    
    return batches;
  }

  private sortTestsByDependencies(tests: TestCase[]): TestCase[] {
    // Simple topological sort based on dependencies
    const sorted: TestCase[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (test: TestCase) => {
      if (visiting.has(test.id)) {
        throw new Error(`Circular dependency detected involving test ${test.id}`);
      }
      
      if (visited.has(test.id)) {
        return;
      }
      
      visiting.add(test.id);
      
      // Visit dependencies first
      if (test.dependencies) {
        for (const depId of test.dependencies) {
          const depTest = tests.find(t => t.id === depId);
          if (depTest) {
            visit(depTest);
          }
        }
      }
      
      visiting.delete(test.id);
      visited.add(test.id);
      sorted.push(test);
    };
    
    tests.forEach(test => visit(test));
    
    return sorted;
  }

  private compareTestResults(baseline: TestResult, current: TestResult): boolean {
    // Compare key aspects of test results
    
    // Status must match
    if (baseline.status !== current.status) {
      return false;
    }
    
    // Performance regression check (if performance metrics available)
    if (baseline.metrics?.performance && current.metrics?.performance) {
      const baselinePerf = baseline.metrics.performance;
      const currentPerf = current.metrics.performance;
      
      // Allow 10% performance degradation
      const performanceThreshold = 1.1;
      
      if (currentPerf.responseTime > baselinePerf.responseTime * performanceThreshold) {
        return false;
      }
      
      if (currentPerf.errorRate > baselinePerf.errorRate * performanceThreshold) {
        return false;
      }
    }
    
    // Assertion count should be similar
    if (baseline.metrics && current.metrics) {
      if (baseline.metrics.assertions !== current.metrics.assertions) {
        return false;
      }
      
      if (baseline.metrics.passed !== current.metrics.passed) {
        return false;
      }
    }
    
    return true;
  }

  private async generateRegressionReport(results: TestResult[]): Promise<void> {
    // Generate comprehensive regression test report
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.calculateSummary(results),
      results: results.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        duration: r.duration,
        error: r.error?.message
      })),
      regressions: results.filter(r => r.error?.message?.includes('baseline')),
      performance: this.analyzePerformance(results)
    };
    
    // Save report (implementation would write to file system)
  }

  private async generateSmokeReport(results: TestResult[]): Promise<void> {
    // Generate smoke test report
    const report = {
      timestamp: new Date().toISOString(),
      type: 'smoke',
      summary: this.calculateSummary(results),
      criticalFailures: results.filter(r => r.status === 'failed'),
      recommendation: results.every(r => r.status === 'passed') ? 'PROCEED' : 'STOP'
    };
    
    // Save report
  }

  private async generateCriticalPathReport(results: TestResult[]): Promise<void> {
    // Generate critical path test report
    const report = {
      timestamp: new Date().toISOString(),
      type: 'critical-path',
      summary: this.calculateSummary(results),
      pathIntegrity: this.analyzeCriticalPath(results),
      blockers: results.filter(r => r.status === 'failed' && r.severity === 'critical')
    };
    
    // Save report
  }

  private calculateSummary(results: TestResult[]) {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    return {
      total,
      passed,
      failed,
      skipped,
      successRate: total > 0 ? (passed / total) * 100 : 0,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    };
  }

  private analyzePerformance(results: TestResult[]) {
    const performanceResults = results.filter(r => r.metrics?.performance);
    
    if (performanceResults.length === 0) {
      return null;
    }
    
    const avgResponseTime = performanceResults.reduce(
      (sum, r) => sum + (r.metrics?.performance?.responseTime || 0), 0
    ) / performanceResults.length;
    
    const avgThroughput = performanceResults.reduce(
      (sum, r) => sum + (r.metrics?.performance?.throughput || 0), 0
    ) / performanceResults.length;
    
    return {
      averageResponseTime: avgResponseTime,
      averageThroughput: avgThroughput,
      performanceRegressions: performanceResults.filter(r => 
        r.error?.message?.includes('baseline')
      ).length
    };
  }

  private analyzeCriticalPath(results: TestResult[]) {
    const criticalTests = results.filter(r => r.severity === 'critical');
    const criticalFailures = criticalTests.filter(r => r.status === 'failed');
    
    return {
      totalCriticalTests: criticalTests.length,
      criticalFailures: criticalFailures.length,
      pathIntact: criticalFailures.length === 0,
      brokenComponents: criticalFailures.map(r => r.name)
    };
  }

  private async handleScheduledResults(results: TestResult[]): Promise<void> {
    // Handle results from scheduled execution
    const failures = results.filter(r => r.status === 'failed');
    
    if (failures.length > 0) {
      // Send notifications, create issues, etc.
    }
  }

  private async handleChangeTriggeredResults(results: TestResult[], changeType: string): Promise<void> {
    // Handle results from change-triggered execution
    const regressions = results.filter(r => 
      r.error?.message?.includes('baseline')
    );
    
    if (regressions.length > 0) {
      // Block deployment, notify developers, etc.
    }
  }
}

// Supporting classes

class TestScheduler {
  async scheduleRegressionSuite(schedule: string, callback: () => Promise<void>): Promise<void> {
    // Implement test scheduling (cron-like functionality)
  }
}

class ChangeDetector {
  async getAffectedTests(changeType: string): Promise<string[]> {
    // Determine which tests are affected by a specific type of change
    return [];
  }
}

class BaselineManager {
  async saveBaseline(testId: string, result: TestResult): Promise<void> {
    // Save baseline to persistent storage
  }
  
  async loadBaseline(testId: string): Promise<TestResult | null> {
    // Load baseline from persistent storage
    return null;
  }
}