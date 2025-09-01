/**
 * Test Memory Tracking Utilities
 * 
 * Provides utilities for tracking memory usage during test execution,
 * including per-test memory tracking, memory leak detection, and
 * memory usage reporting.
 */

import { TestWorkerMemoryMonitor, TestWorkerMemoryUsage, TestWorkerMemoryEvent } from './test-worker-memory-monitor.js';

export interface TestMemorySnapshot {
  /** Test name */
  testName: string;
  /** Test file path */
  testFile?: string;
  /** Memory usage at test start */
  startMemory: TestWorkerMemoryUsage;
  /** Memory usage at test end */
  endMemory?: TestWorkerMemoryUsage;
  /** Memory growth during test */
  memoryGrowth?: number;
  /** Test duration in milliseconds */
  duration?: number;
  /** Test status */
  status: 'running' | 'passed' | 'failed' | 'skipped';
  /** Memory events during test */
  memoryEvents: TestWorkerMemoryEvent[];
  /** Timestamp when test started */
  startTime: number;
  /** Timestamp when test ended */
  endTime?: number;
}

export interface TestSuiteMemoryReport {
  /** Suite name */
  suiteName: string;
  /** Total tests in suite */
  totalTests: number;
  /** Tests that passed */
  passedTests: number;
  /** Tests that failed */
  failedTests: number;
  /** Tests that were skipped */
  skippedTests: number;
  /** Memory usage at suite start */
  startMemory: TestWorkerMemoryUsage;
  /** Memory usage at suite end */
  endMemory: TestWorkerMemoryUsage;
  /** Total memory growth during suite */
  totalMemoryGrowth: number;
  /** Peak memory usage during suite */
  peakMemoryUsage: number;
  /** Average memory usage during suite */
  averageMemoryUsage: number;
  /** Individual test snapshots */
  testSnapshots: TestMemorySnapshot[];
  /** Memory events during suite */
  memoryEvents: TestWorkerMemoryEvent[];
  /** Suite duration in milliseconds */
  duration: number;
  /** Memory efficiency score (0-100) */
  memoryEfficiencyScore: number;
}

export interface MemoryLeakDetectionResult {
  /** Whether a potential memory leak was detected */
  leakDetected: boolean;
  /** Confidence level of leak detection (0-1) */
  confidence: number;
  /** Memory growth rate in bytes per test */
  growthRate: number;
  /** Tests that contributed most to memory growth */
  suspiciousTests: Array<{
    testName: string;
    memoryGrowth: number;
    growthPercentage: number;
  }>;
  /** Recommendations for fixing memory leaks */
  recommendations: string[];
}

/**
 * Test Memory Tracker
 * 
 * Tracks memory usage during test execution and provides detailed
 * memory analysis and leak detection capabilities.
 */
export class TestMemoryTracker {
  private readonly memoryMonitor: TestWorkerMemoryMonitor;
  private readonly testSnapshots = new Map<string, TestMemorySnapshot>();
  private readonly suiteReports = new Map<string, TestSuiteMemoryReport>();
  private currentSuite?: string;
  private suiteStartMemory?: TestWorkerMemoryUsage;
  private suiteStartTime?: number;
  private memoryEvents: TestWorkerMemoryEvent[] = [];

  constructor(memoryMonitor: TestWorkerMemoryMonitor) {
    this.memoryMonitor = memoryMonitor;
    
    // Register for memory events
    this.memoryMonitor.onMemoryEvent((event) => {
      this.handleMemoryEvent(event);
    });
  }

  /**
   * Start tracking a test suite
   */
  startSuite(suiteName: string): void {
    this.currentSuite = suiteName;
    this.suiteStartMemory = this.memoryMonitor.getCurrentMemoryUsage();
    this.suiteStartTime = Date.now();
    this.memoryEvents = [];
    
    console.log(`📊 Started memory tracking for suite: ${suiteName}`);
    console.log(`📊 Suite start memory: ${this.suiteStartMemory.formattedHeapUsed}`);
  }

  /**
   * End tracking a test suite and generate report
   */
  endSuite(suiteName: string): TestSuiteMemoryReport {
    if (!this.currentSuite || this.currentSuite !== suiteName) {
      throw new Error(`Suite ${suiteName} was not started or does not match current suite ${this.currentSuite}`);
    }

    if (!this.suiteStartMemory || !this.suiteStartTime) {
      throw new Error(`Suite ${suiteName} start memory or time not recorded`);
    }

    const endMemory = this.memoryMonitor.getCurrentMemoryUsage();
    const endTime = Date.now();
    const duration = endTime - this.suiteStartTime;

    // Get all test snapshots for this suite
    const testSnapshots = Array.from(this.testSnapshots.values())
      .filter(snapshot => snapshot.testFile?.includes(suiteName) || snapshot.testName.includes(suiteName));

    // Calculate suite statistics
    const totalTests = testSnapshots.length;
    const passedTests = testSnapshots.filter(s => s.status === 'passed').length;
    const failedTests = testSnapshots.filter(s => s.status === 'failed').length;
    const skippedTests = testSnapshots.filter(s => s.status === 'skipped').length;

    const totalMemoryGrowth = endMemory.heapUsed - this.suiteStartMemory.heapUsed;
    const memoryUsages = [this.suiteStartMemory.heapUsed, endMemory.heapUsed, ...testSnapshots.map(s => s.startMemory.heapUsed)];
    const peakMemoryUsage = Math.max(...memoryUsages);
    const averageMemoryUsage = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;

    // Calculate memory efficiency score
    const memoryEfficiencyScore = this.calculateMemoryEfficiencyScore(
      this.suiteStartMemory.heapUsed,
      endMemory.heapUsed,
      peakMemoryUsage,
      totalTests
    );

    const report: TestSuiteMemoryReport = {
      suiteName,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      startMemory: this.suiteStartMemory,
      endMemory,
      totalMemoryGrowth,
      peakMemoryUsage,
      averageMemoryUsage,
      testSnapshots,
      memoryEvents: [...this.memoryEvents],
      duration,
      memoryEfficiencyScore
    };

    this.suiteReports.set(suiteName, report);
    this.currentSuite = undefined;
    this.suiteStartMemory = undefined;
    this.suiteStartTime = undefined;

    console.log(`📊 Completed memory tracking for suite: ${suiteName}`);
    console.log(`📊 Suite end memory: ${endMemory.formattedHeapUsed}`);
    console.log(`📊 Total memory growth: ${this.formatBytes(totalMemoryGrowth)}`);
    console.log(`📊 Memory efficiency score: ${memoryEfficiencyScore.toFixed(1)}/100`);

    return report;
  }

  /**
   * Start tracking a test
   */
  startTest(testName: string, testFile?: string): void {
    const startMemory = this.memoryMonitor.getCurrentMemoryUsage();
    const startTime = Date.now();

    const snapshot: TestMemorySnapshot = {
      testName,
      testFile,
      startMemory,
      status: 'running',
      memoryEvents: [],
      startTime
    };

    this.testSnapshots.set(testName, snapshot);
    this.memoryMonitor.setCurrentTest(testName);

    console.log(`🧪 Started memory tracking for test: ${testName}`);
    console.log(`📊 Test start memory: ${startMemory.formattedHeapUsed}`);
  }

  /**
   * End tracking a test
   */
  endTest(testName: string, status: 'passed' | 'failed' | 'skipped'): TestMemorySnapshot {
    const snapshot = this.testSnapshots.get(testName);
    if (!snapshot) {
      throw new Error(`Test ${testName} was not started`);
    }

    const endMemory = this.memoryMonitor.getCurrentMemoryUsage();
    const endTime = Date.now();
    const duration = endTime - snapshot.startTime;
    const memoryGrowth = endMemory.heapUsed - snapshot.startMemory.heapUsed;

    snapshot.endMemory = endMemory;
    snapshot.duration = duration;
    snapshot.memoryGrowth = memoryGrowth;
    snapshot.status = status;
    snapshot.endTime = endTime;

    this.memoryMonitor.clearCurrentTest();

    console.log(`🧪 Completed memory tracking for test: ${testName}`);
    console.log(`📊 Test end memory: ${endMemory.formattedHeapUsed}`);
    console.log(`📊 Memory growth: ${this.formatBytes(memoryGrowth)}`);

    // Check for significant memory growth
    if (memoryGrowth > 50 * 1024 * 1024) { // More than 50MB
      console.warn(`⚠️  Test ${testName} caused significant memory growth: ${this.formatBytes(memoryGrowth)}`);
    }

    return snapshot;
  }

  /**
   * Get test snapshot
   */
  getTestSnapshot(testName: string): TestMemorySnapshot | undefined {
    return this.testSnapshots.get(testName);
  }

  /**
   * Get all test snapshots
   */
  getAllTestSnapshots(): TestMemorySnapshot[] {
    return Array.from(this.testSnapshots.values());
  }

  /**
   * Get suite report
   */
  getSuiteReport(suiteName: string): TestSuiteMemoryReport | undefined {
    return this.suiteReports.get(suiteName);
  }

  /**
   * Get all suite reports
   */
  getAllSuiteReports(): TestSuiteMemoryReport[] {
    return Array.from(this.suiteReports.values());
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks(): MemoryLeakDetectionResult {
    const snapshots = this.getAllTestSnapshots().filter(s => s.memoryGrowth !== undefined);
    
    if (snapshots.length < 3) {
      return {
        leakDetected: false,
        confidence: 0,
        growthRate: 0,
        suspiciousTests: [],
        recommendations: ['Need more test data to detect memory leaks']
      };
    }

    // Calculate memory growth statistics
    const memoryGrowths = snapshots.map(s => s.memoryGrowth!);
    const totalGrowth = memoryGrowths.reduce((sum, growth) => sum + growth, 0);
    const averageGrowth = totalGrowth / memoryGrowths.length;
    const growthRate = averageGrowth;

    // Find tests with excessive memory growth
    const suspiciousTests = snapshots
      .filter(s => s.memoryGrowth! > averageGrowth * 2) // More than 2x average
      .sort((a, b) => b.memoryGrowth! - a.memoryGrowth!)
      .slice(0, 5) // Top 5 suspicious tests
      .map(s => ({
        testName: s.testName,
        memoryGrowth: s.memoryGrowth!,
        growthPercentage: (s.memoryGrowth! / s.startMemory.heapUsed) * 100
      }));

    // Determine if leak is detected
    const leakDetected = averageGrowth > 10 * 1024 * 1024 || // Average growth > 10MB
                        suspiciousTests.length > 0 ||
                        totalGrowth > 100 * 1024 * 1024; // Total growth > 100MB

    // Calculate confidence based on various factors
    let confidence = 0;
    if (averageGrowth > 20 * 1024 * 1024) confidence += 0.4; // High average growth
    if (suspiciousTests.length > 2) confidence += 0.3; // Multiple suspicious tests
    if (totalGrowth > 200 * 1024 * 1024) confidence += 0.3; // Very high total growth
    confidence = Math.min(confidence, 1.0);

    // Generate recommendations
    const recommendations: string[] = [];
    if (suspiciousTests.length > 0) {
      recommendations.push(`Investigate tests with high memory growth: ${suspiciousTests.slice(0, 3).map(t => t.testName).join(', ')}`);
    }
    if (averageGrowth > 5 * 1024 * 1024) {
      recommendations.push('Consider adding memory cleanup in test teardown');
    }
    if (totalGrowth > 50 * 1024 * 1024) {
      recommendations.push('Review test data size and consider using smaller fixtures');
    }
    recommendations.push('Enable garbage collection with --expose-gc flag');
    recommendations.push('Use memory profiling tools to identify specific leak sources');

    return {
      leakDetected,
      confidence,
      growthRate,
      suspiciousTests,
      recommendations
    };
  }

  /**
   * Generate comprehensive memory report
   */
  generateMemoryReport(): string {
    const allSnapshots = this.getAllTestSnapshots();
    const allSuites = this.getAllSuiteReports();
    const leakDetection = this.detectMemoryLeaks();

    let report = '\n📊 Comprehensive Test Memory Report\n';
    report += '='.repeat(50) + '\n\n';

    // Overall statistics
    report += '📈 Overall Statistics:\n';
    report += `Total Tests: ${allSnapshots.length}\n`;
    report += `Total Suites: ${allSuites.length}\n`;
    
    if (allSnapshots.length > 0) {
      const totalGrowth = allSnapshots.reduce((sum, s) => sum + (s.memoryGrowth || 0), 0);
      const averageGrowth = totalGrowth / allSnapshots.length;
      report += `Total Memory Growth: ${this.formatBytes(totalGrowth)}\n`;
      report += `Average Growth per Test: ${this.formatBytes(averageGrowth)}\n`;
    }

    // Memory leak detection
    report += '\n🔍 Memory Leak Detection:\n';
    report += `Leak Detected: ${leakDetection.leakDetected ? '🚨 YES' : '✅ NO'}\n`;
    report += `Confidence: ${(leakDetection.confidence * 100).toFixed(1)}%\n`;
    report += `Growth Rate: ${this.formatBytes(leakDetection.growthRate)} per test\n`;

    if (leakDetection.suspiciousTests.length > 0) {
      report += '\n🚨 Suspicious Tests:\n';
      leakDetection.suspiciousTests.forEach(test => {
        report += `  - ${test.testName}: ${this.formatBytes(test.memoryGrowth)} (${test.growthPercentage.toFixed(1)}%)\n`;
      });
    }

    if (leakDetection.recommendations.length > 0) {
      report += '\n💡 Recommendations:\n';
      leakDetection.recommendations.forEach(rec => {
        report += `  - ${rec}\n`;
      });
    }

    // Suite reports
    if (allSuites.length > 0) {
      report += '\n📊 Suite Reports:\n';
      allSuites.forEach(suite => {
        report += `\n${suite.suiteName}:\n`;
        report += `  Tests: ${suite.totalTests} (${suite.passedTests} passed, ${suite.failedTests} failed, ${suite.skippedTests} skipped)\n`;
        report += `  Memory Growth: ${this.formatBytes(suite.totalMemoryGrowth)}\n`;
        report += `  Peak Usage: ${this.formatBytes(suite.peakMemoryUsage)}\n`;
        report += `  Efficiency Score: ${suite.memoryEfficiencyScore.toFixed(1)}/100\n`;
        report += `  Duration: ${(suite.duration / 1000).toFixed(2)}s\n`;
      });
    }

    // Top memory consuming tests
    const topMemoryTests = allSnapshots
      .filter(s => s.memoryGrowth !== undefined)
      .sort((a, b) => b.memoryGrowth! - a.memoryGrowth!)
      .slice(0, 10);

    if (topMemoryTests.length > 0) {
      report += '\n🔝 Top Memory Consuming Tests:\n';
      topMemoryTests.forEach((test, index) => {
        report += `  ${index + 1}. ${test.testName}: ${this.formatBytes(test.memoryGrowth!)}\n`;
      });
    }

    return report;
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.testSnapshots.clear();
    this.suiteReports.clear();
    this.memoryEvents = [];
    this.currentSuite = undefined;
    this.suiteStartMemory = undefined;
    this.suiteStartTime = undefined;
  }

  /**
   * Handle memory events from the monitor
   */
  private handleMemoryEvent(event: TestWorkerMemoryEvent): void {
    this.memoryEvents.push(event);

    // Add event to current test snapshot if available
    if (event.testName) {
      const snapshot = this.testSnapshots.get(event.testName);
      if (snapshot) {
        snapshot.memoryEvents.push(event);
      }
    }
  }

  /**
   * Calculate memory efficiency score (0-100)
   */
  private calculateMemoryEfficiencyScore(
    startMemory: number,
    endMemory: number,
    peakMemory: number,
    testCount: number
  ): number {
    // Base score starts at 100
    let score = 100;

    // Penalize memory growth
    const memoryGrowth = endMemory - startMemory;
    const growthPenalty = Math.min((memoryGrowth / (50 * 1024 * 1024)) * 20, 40); // Up to 40 points for >50MB growth
    score -= growthPenalty;

    // Penalize high peak usage
    const peakPenalty = Math.min((peakMemory / (500 * 1024 * 1024)) * 20, 30); // Up to 30 points for >500MB peak
    score -= peakPenalty;

    // Penalize high growth per test
    if (testCount > 0) {
      const growthPerTest = memoryGrowth / testCount;
      const perTestPenalty = Math.min((growthPerTest / (10 * 1024 * 1024)) * 15, 20); // Up to 20 points for >10MB per test
      score -= perTestPenalty;
    }

    return Math.max(score, 0);
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

/**
 * Global test memory tracker instance
 */
let globalTestMemoryTracker: TestMemoryTracker | null = null;

/**
 * Get or create global test memory tracker
 */
export function getTestMemoryTracker(memoryMonitor?: TestWorkerMemoryMonitor): TestMemoryTracker {
  if (!globalTestMemoryTracker) {
    if (!memoryMonitor) {
      throw new Error('TestMemoryTracker requires a TestWorkerMemoryMonitor instance');
    }
    globalTestMemoryTracker = new TestMemoryTracker(memoryMonitor);
  }
  return globalTestMemoryTracker;
}

/**
 * Initialize test memory tracking
 */
export function initializeTestMemoryTracking(memoryMonitor: TestWorkerMemoryMonitor): TestMemoryTracker {
  globalTestMemoryTracker = new TestMemoryTracker(memoryMonitor);
  return globalTestMemoryTracker;
}

/**
 * Cleanup test memory tracking
 */
export function cleanupTestMemoryTracking(): void {
  if (globalTestMemoryTracker) {
    globalTestMemoryTracker.clear();
    globalTestMemoryTracker = null;
  }
}

/**
 * Utility function to start tracking a test
 */
export function startTestMemoryTracking(testName: string, testFile?: string): void {
  if (globalTestMemoryTracker) {
    globalTestMemoryTracker.startTest(testName, testFile);
  }
}

/**
 * Utility function to end tracking a test
 */
export function endTestMemoryTracking(testName: string, status: 'passed' | 'failed' | 'skipped'): TestMemorySnapshot | undefined {
  if (globalTestMemoryTracker) {
    return globalTestMemoryTracker.endTest(testName, status);
  }
  return undefined;
}

/**
 * Utility function to generate memory report
 */
export function generateTestMemoryReport(): string {
  if (!globalTestMemoryTracker) {
    return 'Test memory tracking not initialized';
  }
  return globalTestMemoryTracker.generateMemoryReport();
}