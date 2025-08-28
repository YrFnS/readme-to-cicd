/**
 * Performance benchmarking with load testing and scalability validation
 */

import { EventEmitter } from 'events';
import {
  IPerformanceBenchmark,
  LoadTestConfig,
  LoadTestResult,
  ScalabilityTestConfig,
  ScalabilityTestResult,
  PerformanceMetrics,
  ThresholdViolation,
  LoadTestRequest,
  ScalabilityStage,
  StageResult,
  BreakingPointAnalysis
} from './interfaces';

export class PerformanceBenchmark extends EventEmitter implements IPerformanceBenchmark {
  private activeTests: Map<string, any> = new Map();
  private testResults: Map<string, LoadTestResult | ScalabilityTestResult> = new Map();

  async executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const testId = this.generateTestId();
    const startTime = new Date();

    this.emit('test:started', { testId, type: 'load', config });

    try {
      // Initialize test execution
      const testExecution = {
        id: testId,
        config,
        startTime,
        metrics: [] as PerformanceMetrics[],
        requestCount: 0,
        successCount: 0,
        errorCount: 0
      };

      this.activeTests.set(testId, testExecution);

      // Execute load test scenarios
      const results = await this.runLoadTestScenarios(testExecution);

      // Analyze results and check thresholds
      const violations = this.checkThresholds(results, config.thresholds);
      const passed = violations.length === 0;

      const result: LoadTestResult = {
        testId,
        config,
        startTime,
        endTime: new Date(),
        summary: {
          totalRequests: results.totalRequests,
          successfulRequests: results.successfulRequests,
          failedRequests: results.failedRequests,
          averageResponseTime: results.averageResponseTime,
          p95ResponseTime: results.p95ResponseTime,
          p99ResponseTime: results.p99ResponseTime,
          maxResponseTime: results.maxResponseTime,
          throughput: results.throughput,
          errorRate: results.errorRate
        },
        metrics: results.metrics,
        passed,
        violations
      };

      this.testResults.set(testId, result);
      this.activeTests.delete(testId);

      this.emit('test:completed', { testId, result });

      return result;
    } catch (error) {
      this.activeTests.delete(testId);
      this.emit('test:failed', { testId, error });
      throw error;
    }
  }

  async executeScalabilityTest(config: ScalabilityTestConfig): Promise<ScalabilityTestResult> {
    const testId = this.generateTestId();

    this.emit('scalability:started', { testId, config });

    try {
      const stageResults: StageResult[] = [];
      let breakingPoint: BreakingPointAnalysis | undefined;

      // Execute each scalability stage
      for (const stage of config.stages) {
        const stageResult = await this.executeScalabilityStage(stage, config.component);
        stageResults.push(stageResult);

        // Check if we've hit a breaking point
        if (!stageResult.passed && config.breakingPointAnalysis) {
          breakingPoint = await this.analyzeBreakingPoint(stage, stageResult);
          break;
        }
      }

      // Generate scalability recommendations
      const recommendations = await this.generateScalabilityRecommendations(
        config.component,
        stageResults,
        breakingPoint
      );

      const result: ScalabilityTestResult = {
        testId,
        config,
        stages: stageResults,
        breakingPoint,
        recommendations
      };

      this.testResults.set(testId, result);

      this.emit('scalability:completed', { testId, result });

      return result;
    } catch (error) {
      this.emit('scalability:failed', { testId, error });
      throw error;
    }
  }

  async generateBenchmarkReport(testIds: string[]): Promise<string> {
    const results = testIds.map(id => this.testResults.get(id)).filter(Boolean);

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        passedTests: results.filter(r => 'passed' in r && r.passed).length,
        failedTests: results.filter(r => 'passed' in r && !r.passed).length
      },
      results: results.map(result => this.summarizeTestResult(result))
    };

    return JSON.stringify(report, null, 2);
  }

  async comparePerformance(baselineId: string, currentId: string): Promise<any> {
    const baseline = this.testResults.get(baselineId);
    const current = this.testResults.get(currentId);

    if (!baseline || !current) {
      throw new Error('Test results not found for comparison');
    }

    // Compare load test results
    if ('summary' in baseline && 'summary' in current) {
      return this.compareLoadTestResults(baseline, current);
    }

    // Compare scalability test results
    return this.compareScalabilityResults(baseline, current);
  }

  private async runLoadTestScenarios(testExecution: any): Promise<any> {
    const { config } = testExecution;
    const metrics: PerformanceMetrics[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    const responseTimes: number[] = [];

    // Simulate concurrent load testing
    const promises: Promise<void>[] = [];

    for (let i = 0; i < config.concurrency; i++) {
      promises.push(this.executeWorker(config, metrics, responseTimes));
    }

    await Promise.all(promises);

    // Calculate summary statistics
    totalRequests = responseTimes.length;
    successfulRequests = responseTimes.filter(rt => rt > 0).length;
    failedRequests = totalRequests - successfulRequests;

    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const averageResponseTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
    const p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    const maxResponseTime = Math.max(...sortedTimes);
    const throughput = totalRequests / (config.duration / 1000);
    const errorRate = failedRequests / totalRequests;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      maxResponseTime,
      throughput,
      errorRate,
      metrics
    };
  }

  private async executeWorker(
    config: LoadTestConfig,
    metrics: PerformanceMetrics[],
    responseTimes: number[]
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + config.duration;

    while (Date.now() < endTime) {
      for (const scenario of config.scenarios) {
        for (const request of scenario.requests) {
          const requestStart = Date.now();
          
          try {
            await this.executeRequest(request);
            const responseTime = Date.now() - requestStart;
            responseTimes.push(responseTime);

            // Collect metrics
            metrics.push({
              timestamp: new Date(),
              component: config.target,
              metrics: {
                responseTime,
                throughput: 1,
                errorRate: 0,
                cpuUsage: Math.random() * 100,
                memoryUsage: Math.random() * 100,
                diskUsage: Math.random() * 100,
                networkLatency: Math.random() * 50
              },
              metadata: { scenario: scenario.name, request: request.url }
            });
          } catch (error) {
            responseTimes.push(-1); // Mark as failed
            
            metrics.push({
              timestamp: new Date(),
              component: config.target,
              metrics: {
                responseTime: Date.now() - requestStart,
                throughput: 0,
                errorRate: 1,
                cpuUsage: Math.random() * 100,
                memoryUsage: Math.random() * 100,
                diskUsage: Math.random() * 100,
                networkLatency: Math.random() * 50
              },
              metadata: { scenario: scenario.name, request: request.url, error: error.message }
            });
          }

          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }
  }

  private async executeRequest(_request: LoadTestRequest): Promise<void> {
    // Simulate HTTP request execution
    const delay = Math.random() * 1000 + 100; // 100-1100ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% error rate
      throw new Error('Simulated request failure');
    }
  }

  private checkThresholds(results: any, thresholds: any): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    // Check response time thresholds
    if (results.p95ResponseTime > thresholds.responseTime.p95) {
      violations.push({
        metric: 'p95_response_time',
        expected: thresholds.responseTime.p95,
        actual: results.p95ResponseTime,
        severity: 'warning'
      });
    }

    if (results.p99ResponseTime > thresholds.responseTime.p99) {
      violations.push({
        metric: 'p99_response_time',
        expected: thresholds.responseTime.p99,
        actual: results.p99ResponseTime,
        severity: 'error'
      });
    }

    // Check throughput thresholds
    if (results.throughput < thresholds.throughput.min) {
      violations.push({
        metric: 'throughput',
        expected: thresholds.throughput.min,
        actual: results.throughput,
        severity: 'error'
      });
    }

    // Check error rate thresholds
    if (results.errorRate > thresholds.errorRate.max) {
      violations.push({
        metric: 'error_rate',
        expected: thresholds.errorRate.max,
        actual: results.errorRate,
        severity: 'critical'
      });
    }

    return violations;
  }

  private async executeScalabilityStage(stage: ScalabilityStage, component: string): Promise<StageResult> {
    const metrics: PerformanceMetrics[] = [];
    
    // Simulate scalability testing for the stage
    const stageStart = Date.now();
    const stageEnd = stageStart + stage.duration;

    while (Date.now() < stageEnd) {
      // Simulate load at specified level
      const metric: PerformanceMetrics = {
        timestamp: new Date(),
        component,
        metrics: {
          responseTime: Math.random() * 500 + 100,
          throughput: stage.load.requestsPerSecond * (0.8 + Math.random() * 0.4),
          errorRate: Math.random() * 0.1,
          cpuUsage: Math.min(100, stage.load.users * 2 + Math.random() * 20),
          memoryUsage: Math.min(100, stage.load.users * 1.5 + Math.random() * 15),
          diskUsage: Math.random() * 50,
          networkLatency: Math.random() * 100
        },
        metadata: { stage: stage.name, users: stage.load.users }
      };

      metrics.push(metric);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check if stage passed thresholds
    const violations = this.checkStageThresholds(metrics, stage.expectedPerformance);
    const passed = violations.length === 0;

    return {
      stage,
      metrics,
      passed,
      violations
    };
  }

  private checkStageThresholds(metrics: PerformanceMetrics[], thresholds: any): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];
    
    // Calculate average metrics for the stage
    const avgMetrics = this.calculateAverageMetrics(metrics);

    // Check thresholds similar to load test
    if (avgMetrics.responseTime > thresholds.responseTime?.p95) {
      violations.push({
        metric: 'avg_response_time',
        expected: thresholds.responseTime.p95,
        actual: avgMetrics.responseTime,
        severity: 'warning'
      });
    }

    return violations;
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): any {
    const totals = metrics.reduce((acc, metric) => ({
      responseTime: acc.responseTime + metric.metrics.responseTime,
      throughput: acc.throughput + metric.metrics.throughput,
      errorRate: acc.errorRate + metric.metrics.errorRate,
      cpuUsage: acc.cpuUsage + metric.metrics.cpuUsage,
      memoryUsage: acc.memoryUsage + metric.metrics.memoryUsage
    }), { responseTime: 0, throughput: 0, errorRate: 0, cpuUsage: 0, memoryUsage: 0 });

    const count = metrics.length;
    return {
      responseTime: totals.responseTime / count,
      throughput: totals.throughput / count,
      errorRate: totals.errorRate / count,
      cpuUsage: totals.cpuUsage / count,
      memoryUsage: totals.memoryUsage / count
    };
  }

  private async analyzeBreakingPoint(stage: ScalabilityStage, result: StageResult): Promise<BreakingPointAnalysis> {
    const avgMetrics = this.calculateAverageMetrics(result.metrics);

    return {
      maxUsers: stage.load.users,
      maxThroughput: avgMetrics.throughput,
      limitingFactor: avgMetrics.cpuUsage > 90 ? 'cpu' : 
                     avgMetrics.memoryUsage > 90 ? 'memory' : 'network',
      resourceUtilization: {
        cpu: avgMetrics.cpuUsage,
        memory: avgMetrics.memoryUsage,
        network: 75 // Simulated
      }
    };
  }

  private async generateScalabilityRecommendations(
    component: string,
    stageResults: StageResult[],
    breakingPoint?: BreakingPointAnalysis
  ): Promise<any[]> {
    const recommendations = [];

    if (breakingPoint) {
      recommendations.push({
        type: 'scale_out',
        priority: 'high',
        description: `Component ${component} reached breaking point at ${breakingPoint.maxUsers} users`,
        recommendation: `Consider horizontal scaling to handle increased load`
      });
    }

    // Analyze performance trends across stages
    const performanceTrend = this.analyzePerformanceTrend(stageResults);
    if (performanceTrend.degrading) {
      recommendations.push({
        type: 'optimize',
        priority: 'medium',
        description: 'Performance degradation detected across scaling stages',
        recommendation: 'Review resource allocation and optimize bottlenecks'
      });
    }

    return recommendations;
  }

  private analyzePerformanceTrend(stageResults: StageResult[]): { degrading: boolean } {
    // Simple trend analysis - check if response times are increasing
    const responseTimes = stageResults.map(result => 
      this.calculateAverageMetrics(result.metrics).responseTime
    );

    const increasing = responseTimes.every((time, index) => 
      index === 0 || time >= responseTimes[index - 1]
    );

    return { degrading: increasing };
  }

  private summarizeTestResult(result: any): any {
    if ('summary' in result) {
      // Load test result
      return {
        testId: result.testId,
        type: 'load',
        passed: result.passed,
        summary: result.summary,
        violations: result.violations.length
      };
    } else {
      // Scalability test result
      return {
        testId: result.testId,
        type: 'scalability',
        stages: result.stages.length,
        passed: result.stages.every((s: StageResult) => s.passed),
        breakingPoint: result.breakingPoint
      };
    }
  }

  private compareLoadTestResults(baseline: LoadTestResult, current: LoadTestResult): any {
    return {
      responseTime: {
        baseline: baseline.summary.averageResponseTime,
        current: current.summary.averageResponseTime,
        change: ((current.summary.averageResponseTime - baseline.summary.averageResponseTime) / baseline.summary.averageResponseTime) * 100
      },
      throughput: {
        baseline: baseline.summary.throughput,
        current: current.summary.throughput,
        change: ((current.summary.throughput - baseline.summary.throughput) / baseline.summary.throughput) * 100
      },
      errorRate: {
        baseline: baseline.summary.errorRate,
        current: current.summary.errorRate,
        change: ((current.summary.errorRate - baseline.summary.errorRate) / baseline.summary.errorRate) * 100
      }
    };
  }

  private compareScalabilityResults(baseline: any, current: any): any {
    return {
      maxUsers: {
        baseline: baseline.breakingPoint?.maxUsers || 0,
        current: current.breakingPoint?.maxUsers || 0
      },
      maxThroughput: {
        baseline: baseline.breakingPoint?.maxThroughput || 0,
        current: current.breakingPoint?.maxThroughput || 0
      }
    };
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}