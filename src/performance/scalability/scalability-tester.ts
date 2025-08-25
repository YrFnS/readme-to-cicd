/**
 * Scalability testing and stress testing implementation
 */

import { EventEmitter } from 'events';
import { LoadTester } from '../benchmarking/load-tester.js';
import {
  ScalabilityTestConfig,
  ScalabilityTestResult,
  BenchmarkResult,
  LoadTestConfig,
  OptimizationRecommendation
} from '../types/performance-types.js';

export class ScalabilityTester extends EventEmitter {
  private loadTester: LoadTester;
  private activeTests = new Map<string, ScalabilityTestExecution>();

  constructor() {
    super();
    this.loadTester = new LoadTester();
  }

  /**
   * Execute a scalability test to find breaking points
   */
  async executeScalabilityTest(config: ScalabilityTestConfig): Promise<ScalabilityTestResult> {
    const testId = this.generateTestId();
    const execution = new ScalabilityTestExecution(testId, config, this.loadTester);
    
    this.activeTests.set(testId, execution);
    
    try {
      const result = await execution.run();
      this.emit('scalabilityTestCompleted', { testId, result });
      return result;
    } catch (error) {
      this.emit('scalabilityTestFailed', { testId, error });
      throw error;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  /**
   * Execute a stress test to find absolute limits
   */
  async executeStressTest(baseConfig: LoadTestConfig, maxUsers: number): Promise<ScalabilityTestResult> {
    const stressConfig: ScalabilityTestConfig = {
      name: `Stress Test - ${baseConfig.targetUrl}`,
      baselineUsers: baseConfig.maxUsers,
      maxUsers: maxUsers,
      userIncrement: Math.max(1, Math.floor(maxUsers / 20)), // 20 steps
      testDuration: 300, // 5 minutes per step
      acceptableResponseTime: 5000, // 5 seconds
      acceptableErrorRate: 0.1 // 10%
    };

    return this.executeScalabilityTest(stressConfig);
  }

  /**
   * Execute a breaking point analysis
   */
  async findBreakingPoint(baseConfig: LoadTestConfig): Promise<ScalabilityTestResult> {
    const breakingPointConfig: ScalabilityTestConfig = {
      name: `Breaking Point Analysis - ${baseConfig.targetUrl}`,
      baselineUsers: 1,
      maxUsers: baseConfig.maxUsers * 10, // Test up to 10x the original load
      userIncrement: Math.max(1, Math.floor(baseConfig.maxUsers / 5)),
      testDuration: 180, // 3 minutes per step
      acceptableResponseTime: 2000, // 2 seconds
      acceptableErrorRate: 0.05 // 5%
    };

    return this.executeScalabilityTest(breakingPointConfig);
  }

  /**
   * Stop a running scalability test
   */
  async stopTest(testId: string): Promise<void> {
    const execution = this.activeTests.get(testId);
    if (execution) {
      await execution.stop();
    }
  }

  /**
   * Get active scalability tests
   */
  getActiveTests(): string[] {
    return Array.from(this.activeTests.keys());
  }

  private generateTestId(): string {
    return `scalability-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

class ScalabilityTestExecution {
  private stopped = false;
  private results: BenchmarkResult[] = [];

  constructor(
    private testId: string,
    private config: ScalabilityTestConfig,
    private loadTester: LoadTester
  ) {}

  async run(): Promise<ScalabilityTestResult> {
    const userLevels = this.generateUserLevels();
    
    for (const userCount of userLevels) {
      if (this.stopped) break;
      
      console.log(`Testing with ${userCount} users...`);
      
      const loadConfig: LoadTestConfig = {
        targetUrl: 'http://localhost:3000', // This should be configurable
        duration: this.config.testDuration,
        rampUpTime: Math.min(60, this.config.testDuration / 4), // 25% of test duration or 1 minute
        maxUsers: userCount,
        requestsPerSecond: userCount * 2, // 2 requests per user per second
        testScenarios: [
          {
            name: 'default-scenario',
            weight: 100,
            requests: [
              {
                method: 'GET',
                path: '/',
                expectedStatusCode: 200
              }
            ]
          }
        ]
      };

      try {
        const result = await this.loadTester.executeLoadTest(loadConfig);
        this.results.push(result);
        
        // Check if we've hit the breaking point
        if (this.hasReachedBreakingPoint(result)) {
          console.log(`Breaking point reached at ${userCount} users`);
          break;
        }
        
        // Add delay between tests to allow system recovery
        await this.sleep(30000); // 30 seconds
        
      } catch (error) {
        console.error(`Test failed at ${userCount} users:`, error);
        break;
      }
    }

    return this.generateResult();
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }

  private generateUserLevels(): number[] {
    const levels: number[] = [];
    
    for (let users = this.config.baselineUsers; 
         users <= this.config.maxUsers; 
         users += this.config.userIncrement) {
      levels.push(users);
    }
    
    return levels;
  }

  private hasReachedBreakingPoint(result: BenchmarkResult): boolean {
    return (
      result.averageResponseTime > this.config.acceptableResponseTime ||
      result.errorRate > this.config.acceptableErrorRate ||
      result.errorRate > 0.5 // Hard limit: 50% error rate
    );
  }

  private generateResult(): ScalabilityTestResult {
    const breakingPoint = this.findBreakingPoint();
    const recommendations = this.generateRecommendations();

    return {
      testId: this.testId,
      configuration: this.config,
      results: this.results,
      breakingPoint,
      recommendations
    };
  }

  private findBreakingPoint(): { maxUsers: number; maxThroughput: number; degradationPoint: number } | undefined {
    if (this.results.length === 0) return undefined;

    let maxThroughput = 0;
    let maxUsers = 0;
    let degradationPoint = 0;

    for (let i = 0; i < this.results.length; i++) {
      const result = this.results[i];
      const users = result.metrics[result.metrics.length - 1]?.concurrentUsers || 0;

      if (result.throughput > maxThroughput) {
        maxThroughput = result.throughput;
        maxUsers = users;
      }

      // Find degradation point (where performance starts to decline significantly)
      if (i > 0) {
        const previousResult = this.results[i - 1];
        const responseTimeIncrease = (result.averageResponseTime - previousResult.averageResponseTime) / previousResult.averageResponseTime;
        
        if (responseTimeIncrease > 0.5 && degradationPoint === 0) { // 50% increase
          degradationPoint = users;
        }
      }

      // Check if this is the breaking point
      if (this.hasReachedBreakingPoint(result)) {
        break;
      }
    }

    return {
      maxUsers,
      maxThroughput,
      degradationPoint: degradationPoint || maxUsers
    };
  }

  private generateRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    if (this.results.length === 0) return recommendations;

    const lastResult = this.results[this.results.length - 1];
    const breakingPoint = this.findBreakingPoint();

    // Analyze response time trends
    if (lastResult.averageResponseTime > this.config.acceptableResponseTime) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        title: 'Scale Up Infrastructure',
        description: `Average response time (${lastResult.averageResponseTime.toFixed(2)}ms) exceeds acceptable threshold (${this.config.acceptableResponseTime}ms)`,
        expectedImpact: 'Reduce response time by 30-50%',
        implementationEffort: 'medium',
        estimatedPerformanceGain: 40
      });
    }

    // Analyze error rate
    if (lastResult.errorRate > this.config.acceptableErrorRate) {
      recommendations.push({
        type: 'scaling',
        priority: 'critical',
        title: 'Address Error Rate Issues',
        description: `Error rate (${(lastResult.errorRate * 100).toFixed(2)}%) exceeds acceptable threshold (${(this.config.acceptableErrorRate * 100).toFixed(2)}%)`,
        expectedImpact: 'Improve system reliability and user experience',
        implementationEffort: 'high',
        estimatedPerformanceGain: 60
      });
    }

    // Analyze throughput patterns
    if (breakingPoint && breakingPoint.degradationPoint < breakingPoint.maxUsers) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Implement Caching Strategy',
        description: `Performance degradation detected at ${breakingPoint.degradationPoint} users, before maximum capacity`,
        expectedImpact: 'Increase effective capacity by 25-40%',
        implementationEffort: 'medium',
        estimatedPerformanceGain: 30
      });
    }

    // Memory usage analysis
    const avgMemoryUsage = this.calculateAverageMetric('memoryUsage');
    if (avgMemoryUsage > 80) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        title: 'Increase Memory Allocation',
        description: `High memory usage detected (${avgMemoryUsage.toFixed(1)}%)`,
        expectedImpact: 'Prevent memory-related performance issues',
        implementationEffort: 'low',
        estimatedCostSavings: 15
      });
    }

    // CPU usage analysis
    const avgCpuUsage = this.calculateAverageMetric('cpuUsage');
    if (avgCpuUsage > 70) {
      recommendations.push({
        type: 'scaling',
        priority: 'medium',
        title: 'Optimize CPU Usage',
        description: `High CPU usage detected (${avgCpuUsage.toFixed(1)}%)`,
        expectedImpact: 'Improve response times and system stability',
        implementationEffort: 'medium',
        estimatedPerformanceGain: 25
      });
    }

    // Database optimization
    if (lastResult.averageResponseTime > 1000) { // > 1 second
      recommendations.push({
        type: 'database',
        priority: 'medium',
        title: 'Database Query Optimization',
        description: 'Slow response times may indicate database bottlenecks',
        expectedImpact: 'Reduce response time by 20-40%',
        implementationEffort: 'high',
        estimatedPerformanceGain: 35
      });
    }

    return recommendations;
  }

  private calculateAverageMetric(metricName: keyof typeof this.results[0]['metrics'][0]): number {
    let sum = 0;
    let count = 0;

    for (const result of this.results) {
      for (const metric of result.metrics) {
        sum += metric[metricName] as number;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}