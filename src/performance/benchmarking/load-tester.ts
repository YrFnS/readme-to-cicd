/**
 * Load testing and performance benchmarking implementation
 */

import { EventEmitter } from 'events';
import {
  LoadTestConfig,
  BenchmarkResult,
  PerformanceMetrics,
  TestScenario,
  RequestDefinition
} from '../types/performance-types.js';

export class LoadTester extends EventEmitter {
  private activeTests = new Map<string, LoadTestExecution>();
  private results = new Map<string, BenchmarkResult>();

  /**
   * Execute a load test with the given configuration
   */
  async executeLoadTest(config: LoadTestConfig): Promise<BenchmarkResult> {
    const testId = this.generateTestId();
    const execution = new LoadTestExecution(testId, config);
    
    this.activeTests.set(testId, execution);
    
    try {
      const result = await execution.run();
      this.results.set(testId, result);
      this.emit('testCompleted', { testId, result });
      return result;
    } catch (error) {
      this.emit('testFailed', { testId, error });
      throw error;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  /**
   * Get results for a specific test
   */
  getTestResult(testId: string): BenchmarkResult | undefined {
    return this.results.get(testId);
  }

  /**
   * Get all test results
   */
  getAllResults(): BenchmarkResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Stop a running test
   */
  async stopTest(testId: string): Promise<void> {
    const execution = this.activeTests.get(testId);
    if (execution) {
      await execution.stop();
    }
  }

  /**
   * Get status of all active tests
   */
  getActiveTests(): string[] {
    return Array.from(this.activeTests.keys());
  }

  private generateTestId(): string {
    return `load-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

class LoadTestExecution {
  private startTime?: Date;
  private endTime?: Date;
  private metrics: PerformanceMetrics[] = [];
  private requestResults: RequestResult[] = [];
  private stopped = false;
  private workers: Worker[] = [];

  constructor(
    private testId: string,
    private config: LoadTestConfig
  ) {}

  async run(): Promise<BenchmarkResult> {
    this.startTime = new Date();
    
    try {
      await this.rampUp();
      await this.sustainedLoad();
      await this.rampDown();
    } finally {
      this.endTime = new Date();
      await this.cleanup();
    }

    return this.generateResult();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    await this.cleanup();
  }

  private async rampUp(): Promise<void> {
    const rampUpSteps = 10;
    const stepDuration = this.config.rampUpTime / rampUpSteps;
    const usersPerStep = this.config.maxUsers / rampUpSteps;

    for (let step = 1; step <= rampUpSteps && !this.stopped; step++) {
      const currentUsers = Math.floor(usersPerStep * step);
      await this.adjustWorkerCount(currentUsers);
      await this.sleep(stepDuration * 1000);
      await this.collectMetrics();
    }
  }

  private async sustainedLoad(): Promise<void> {
    const sustainedDuration = this.config.duration - this.config.rampUpTime;
    const metricsInterval = 5000; // 5 seconds
    const iterations = Math.floor(sustainedDuration * 1000 / metricsInterval);

    for (let i = 0; i < iterations && !this.stopped; i++) {
      await this.sleep(metricsInterval);
      await this.collectMetrics();
    }
  }

  private async rampDown(): Promise<void> {
    await this.adjustWorkerCount(0);
  }

  private async adjustWorkerCount(targetCount: number): Promise<void> {
    const currentCount = this.workers.length;
    
    if (targetCount > currentCount) {
      // Add workers
      for (let i = currentCount; i < targetCount; i++) {
        const worker = new Worker(this.config, this.onRequestComplete.bind(this));
        this.workers.push(worker);
        worker.start();
      }
    } else if (targetCount < currentCount) {
      // Remove workers
      const workersToRemove = this.workers.splice(targetCount);
      await Promise.all(workersToRemove.map(worker => worker.stop()));
    }
  }

  private async collectMetrics(): Promise<void> {
    const now = new Date();
    const recentResults = this.getRecentResults(5000); // Last 5 seconds
    
    const metrics: PerformanceMetrics = {
      timestamp: now,
      responseTime: this.calculateAverageResponseTime(recentResults),
      throughput: this.calculateThroughput(recentResults),
      errorRate: this.calculateErrorRate(recentResults),
      cpuUsage: await this.getCpuUsage(),
      memoryUsage: await this.getMemoryUsage(),
      diskUsage: await this.getDiskUsage(),
      networkLatency: this.calculateAverageLatency(recentResults),
      concurrentUsers: this.workers.length
    };

    this.metrics.push(metrics);
  }

  private onRequestComplete(result: RequestResult): void {
    this.requestResults.push(result);
  }

  private getRecentResults(timeWindowMs: number): RequestResult[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.requestResults.filter(result => result.timestamp.getTime() > cutoff);
  }

  private calculateAverageResponseTime(results: RequestResult[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, result) => acc + result.responseTime, 0);
    return sum / results.length;
  }

  private calculateThroughput(results: RequestResult[]): number {
    return results.length / 5; // requests per second (5-second window)
  }

  private calculateErrorRate(results: RequestResult[]): number {
    if (results.length === 0) return 0;
    const errors = results.filter(result => result.error || result.statusCode >= 400);
    return errors.length / results.length;
  }

  private calculateAverageLatency(results: RequestResult[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, result) => acc + (result.networkLatency || 0), 0);
    return sum / results.length;
  }

  private async getCpuUsage(): Promise<number> {
    // Simulate CPU usage monitoring
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    // Simulate memory usage monitoring
    const used = process.memoryUsage();
    return (used.heapUsed / used.heapTotal) * 100;
  }

  private async getDiskUsage(): Promise<number> {
    // Simulate disk usage monitoring
    return Math.random() * 100;
  }

  private generateResult(): BenchmarkResult {
    const successfulRequests = this.requestResults.filter(r => !r.error && r.statusCode < 400);
    const failedRequests = this.requestResults.filter(r => r.error || r.statusCode >= 400);
    const responseTimes = successfulRequests.map(r => r.responseTime);

    return {
      testId: this.testId,
      startTime: this.startTime!,
      endTime: this.endTime!,
      totalRequests: this.requestResults.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      averageResponseTime: this.calculateAverageResponseTime(this.requestResults),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      maxResponseTime: Math.max(...responseTimes, 0),
      minResponseTime: Math.min(...responseTimes, 0),
      throughput: this.requestResults.length / ((this.endTime!.getTime() - this.startTime!.getTime()) / 1000),
      errorRate: this.calculateErrorRate(this.requestResults),
      metrics: this.metrics
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private async cleanup(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.stop()));
    this.workers = [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class Worker {
  private running = false;
  private interval?: NodeJS.Timeout;

  constructor(
    private config: LoadTestConfig,
    private onComplete: (result: RequestResult) => void
  ) {}

  start(): void {
    this.running = true;
    this.scheduleNextRequest();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.interval) {
      clearTimeout(this.interval);
    }
  }

  private scheduleNextRequest(): void {
    if (!this.running) return;

    const delay = this.calculateDelay();
    this.interval = setTimeout(() => {
      this.executeRequest();
      this.scheduleNextRequest();
    }, delay);
  }

  private calculateDelay(): number {
    // Calculate delay based on requests per second
    const baseDelay = 1000 / this.config.requestsPerSecond;
    // Add some jitter to avoid thundering herd
    const jitter = Math.random() * 200 - 100; // ±100ms
    return Math.max(0, baseDelay + jitter);
  }

  private async executeRequest(): Promise<void> {
    const scenario = this.selectScenario();
    const request = this.selectRequest(scenario);
    
    const startTime = Date.now();
    let result: RequestResult;

    try {
      const response = await this.makeHttpRequest(request);
      const endTime = Date.now();
      
      result = {
        timestamp: new Date(),
        responseTime: endTime - startTime,
        statusCode: response.status,
        error: null,
        networkLatency: response.networkLatency,
        scenario: scenario.name,
        request: request.path
      };
    } catch (error) {
      const endTime = Date.now();
      
      result = {
        timestamp: new Date(),
        responseTime: endTime - startTime,
        statusCode: 0,
        error: error instanceof Error ? error.message : String(error),
        networkLatency: 0,
        scenario: scenario.name,
        request: request.path
      };
    }

    this.onComplete(result);
  }

  private selectScenario(): TestScenario {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const scenario of this.config.testScenarios) {
      cumulative += scenario.weight;
      if (random <= cumulative) {
        return scenario;
      }
    }
    
    return this.config.testScenarios[0];
  }

  private selectRequest(scenario: TestScenario): RequestDefinition {
    const randomIndex = Math.floor(Math.random() * scenario.requests.length);
    return scenario.requests[randomIndex];
  }

  private async makeHttpRequest(request: RequestDefinition): Promise<HttpResponse> {
    // Simulate HTTP request - in real implementation, use fetch or axios
    const delay = Math.random() * 200 + 50; // 50-250ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional errors
    if (Math.random() < 0.05) { // 5% error rate
      throw new Error('Simulated network error');
    }
    
    return {
      status: request.expectedStatusCode || 200,
      networkLatency: delay
    };
  }
}

interface RequestResult {
  timestamp: Date;
  responseTime: number;
  statusCode: number;
  error: string | null;
  networkLatency: number;
  scenario: string;
  request: string;
}

interface HttpResponse {
  status: number;
  networkLatency: number;
}