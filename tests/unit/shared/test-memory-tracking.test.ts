/**
 * Test Memory Tracking Tests
 * 
 * Tests for the TestMemoryTracker class and related utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TestMemoryTracker,
  getTestMemoryTracker,
  initializeTestMemoryTracking,
  cleanupTestMemoryTracking,
  startTestMemoryTracking,
  endTestMemoryTracking,
  generateTestMemoryReport,
  type TestMemorySnapshot,
  type TestSuiteMemoryReport,
  type MemoryLeakDetectionResult
} from '../../../src/shared/test-memory-tracking.js';
import {
  TestWorkerMemoryMonitor,
  type TestWorkerMemoryUsage,
  type TestWorkerMemoryEvent
} from '../../../src/shared/test-worker-memory-monitor.js';

describe('TestMemoryTracker', () => {
  let mockMonitor: TestWorkerMemoryMonitor;
  let tracker: TestMemoryTracker;
  let mockMemoryUsage: NodeJS.MemoryUsage;
  let memoryEventHandlers: Array<(event: TestWorkerMemoryEvent) => void> = [];

  beforeEach(() => {
    // Mock memory usage
    mockMemoryUsage = {
      heapUsed: 100 * 1024 * 1024, // 100MB
      heapTotal: 150 * 1024 * 1024, // 150MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 200 * 1024 * 1024, // 200MB
      arrayBuffers: 5 * 1024 * 1024 // 5MB
    };

    // Mock TestWorkerMemoryMonitor
    mockMonitor = {
      getCurrentMemoryUsage: vi.fn(() => ({
        heapUsed: mockMemoryUsage.heapUsed,
        heapTotal: mockMemoryUsage.heapTotal,
        rss: mockMemoryUsage.rss,
        external: mockMemoryUsage.external,
        timestamp: Date.now(),
        formattedHeapUsed: `${(mockMemoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
        formattedHeapTotal: `${(mockMemoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
        usagePercentage: (mockMemoryUsage.heapUsed / (512 * 1024 * 1024)) * 100,
        isWarning: false,
        isCritical: false,
        isOverLimit: false
      })),
      onMemoryEvent: vi.fn((handler) => {
        memoryEventHandlers.push(handler);
      }),
      setCurrentTest: vi.fn(),
      clearCurrentTest: vi.fn()
    } as any;

    tracker = new TestMemoryTracker(mockMonitor);
    memoryEventHandlers = [];
  });

  afterEach(() => {
    tracker.clear();
  });

  describe('constructor', () => {
    it('should create tracker with memory monitor', () => {
      expect(tracker).toBeDefined();
      expect(mockMonitor.onMemoryEvent).toHaveBeenCalled();
    });
  });

  describe('suite tracking', () => {
    it('should start and end suite tracking', async () => {
      const suiteName = 'test-suite';
      
      tracker.startSuite(suiteName);
      
      // Verify suite started
      expect(tracker['currentSuite']).toBe(suiteName);
      expect(tracker['suiteStartMemory']).toBeDefined();
      expect(tracker['suiteStartTime']).toBeDefined();
      
      // Add small delay to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const report = tracker.endSuite(suiteName);
      
      expect(report).toBeDefined();
      expect(report.suiteName).toBe(suiteName);
      expect(report.startMemory).toBeDefined();
      expect(report.endMemory).toBeDefined();
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when ending non-started suite', () => {
      expect(() => tracker.endSuite('non-existent-suite')).toThrow();
    });

    it('should throw error when ending different suite', () => {
      tracker.startSuite('suite-1');
      expect(() => tracker.endSuite('suite-2')).toThrow();
    });

    it('should calculate suite statistics correctly', () => {
      const suiteName = 'stats-suite';
      
      tracker.startSuite(suiteName);
      
      // Add some test snapshots
      tracker.startTest('test-1', 'stats-suite.test.ts');
      mockMemoryUsage.heapUsed = 120 * 1024 * 1024; // Increase memory
      tracker.endTest('test-1', 'passed');
      
      tracker.startTest('test-2', 'stats-suite.test.ts');
      mockMemoryUsage.heapUsed = 110 * 1024 * 1024; // Decrease memory
      tracker.endTest('test-2', 'failed');
      
      tracker.startTest('test-3', 'stats-suite.test.ts');
      tracker.endTest('test-3', 'skipped');
      
      const report = tracker.endSuite(suiteName);
      
      expect(report.totalTests).toBe(3);
      expect(report.passedTests).toBe(1);
      expect(report.failedTests).toBe(1);
      expect(report.skippedTests).toBe(1);
      expect(report.testSnapshots).toHaveLength(3);
    });

    it('should calculate memory efficiency score', () => {
      const suiteName = 'efficiency-suite';
      
      tracker.startSuite(suiteName);
      
      // Add test with minimal memory growth
      tracker.startTest('efficient-test', 'efficiency-suite.test.ts');
      mockMemoryUsage.heapUsed = 105 * 1024 * 1024; // Small increase
      tracker.endTest('efficient-test', 'passed');
      
      const report = tracker.endSuite(suiteName);
      
      expect(report.memoryEfficiencyScore).toBeGreaterThan(80); // Should be high for minimal growth
    });
  });

  describe('test tracking', () => {
    it('should start and end test tracking', async () => {
      const testName = 'sample-test';
      const testFile = 'sample.test.ts';
      
      tracker.startTest(testName, testFile);
      
      expect(mockMonitor.setCurrentTest).toHaveBeenCalledWith(testName);
      
      const snapshot = tracker.getTestSnapshot(testName);
      expect(snapshot).toBeDefined();
      expect(snapshot!.testName).toBe(testName);
      expect(snapshot!.testFile).toBe(testFile);
      expect(snapshot!.status).toBe('running');
      expect(snapshot!.startMemory).toBeDefined();
      
      // Add small delay to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // Change memory usage
      mockMemoryUsage.heapUsed = 150 * 1024 * 1024;
      
      const endSnapshot = tracker.endTest(testName, 'passed');
      
      expect(mockMonitor.clearCurrentTest).toHaveBeenCalled();
      expect(endSnapshot.status).toBe('passed');
      expect(endSnapshot.endMemory).toBeDefined();
      expect(endSnapshot.memoryGrowth).toBe(50 * 1024 * 1024); // 150MB - 100MB
      expect(endSnapshot.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when ending non-started test', () => {
      expect(() => tracker.endTest('non-existent-test', 'passed')).toThrow();
    });

    it('should track memory events for tests', async () => {
      const testName = 'event-test';
      
      tracker.startTest(testName);
      
      // Simulate memory event
      const memoryEvent: TestWorkerMemoryEvent = {
        type: 'warning',
        timestamp: Date.now(),
        usage: mockMonitor.getCurrentMemoryUsage(),
        message: 'Test warning',
        testName
      };
      
      // Trigger event handler
      for (const handler of memoryEventHandlers) {
        await handler(memoryEvent);
      }
      
      const snapshot = tracker.getTestSnapshot(testName);
      expect(snapshot!.memoryEvents).toHaveLength(1);
      expect(snapshot!.memoryEvents[0].type).toBe('warning');
    });
  });

  describe('memory leak detection', () => {
    it('should detect no leaks with minimal data', () => {
      // Add only 2 tests (less than minimum 3)
      tracker.startTest('test-1');
      tracker.endTest('test-1', 'passed');
      
      tracker.startTest('test-2');
      tracker.endTest('test-2', 'passed');
      
      const result = tracker.detectMemoryLeaks();
      
      expect(result.leakDetected).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.recommendations).toContain('Need more test data to detect memory leaks');
    });

    it('should detect memory leaks with high growth', async () => {
      // Add tests with significant memory growth
      tracker.startTest('test-1');
      await new Promise(resolve => setTimeout(resolve, 1));
      mockMemoryUsage.heapUsed = 120 * 1024 * 1024; // +20MB
      tracker.endTest('test-1', 'passed');
      
      tracker.startTest('test-2');
      await new Promise(resolve => setTimeout(resolve, 1));
      mockMemoryUsage.heapUsed = 140 * 1024 * 1024; // +20MB
      tracker.endTest('test-2', 'passed');
      
      tracker.startTest('test-3');
      await new Promise(resolve => setTimeout(resolve, 1));
      mockMemoryUsage.heapUsed = 160 * 1024 * 1024; // +20MB
      tracker.endTest('test-3', 'passed');
      
      const result = tracker.detectMemoryLeaks();
      
      expect(result.leakDetected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.growthRate).toBeGreaterThan(0);
    });

    it('should identify suspicious tests', () => {
      // Add tests with varying memory growth
      tracker.startTest('normal-test');
      mockMemoryUsage.heapUsed = 105 * 1024 * 1024; // +5MB (normal)
      tracker.endTest('normal-test', 'passed');
      
      tracker.startTest('suspicious-test');
      mockMemoryUsage.heapUsed = 155 * 1024 * 1024; // +50MB (high)
      tracker.endTest('suspicious-test', 'passed');
      
      tracker.startTest('another-normal-test');
      mockMemoryUsage.heapUsed = 160 * 1024 * 1024; // +5MB (normal)
      tracker.endTest('another-normal-test', 'passed');
      
      const result = tracker.detectMemoryLeaks();
      
      expect(result.suspiciousTests).toHaveLength(1);
      expect(result.suspiciousTests[0].testName).toBe('suspicious-test');
      expect(result.suspiciousTests[0].memoryGrowth).toBe(50 * 1024 * 1024);
    });

    it('should provide recommendations', () => {
      // Add tests with high memory growth
      tracker.startTest('test-1');
      mockMemoryUsage.heapUsed = 130 * 1024 * 1024; // +30MB
      tracker.endTest('test-1', 'passed');
      
      tracker.startTest('test-2');
      mockMemoryUsage.heapUsed = 160 * 1024 * 1024; // +30MB
      tracker.endTest('test-2', 'passed');
      
      tracker.startTest('test-3');
      mockMemoryUsage.heapUsed = 190 * 1024 * 1024; // +30MB
      tracker.endTest('test-3', 'passed');
      
      const result = tracker.detectMemoryLeaks();
      
      expect(result.recommendations).toContain('Consider adding memory cleanup in test teardown');
      expect(result.recommendations).toContain('Enable garbage collection with --expose-gc flag');
    });
  });

  describe('reporting', () => {
    it('should generate comprehensive memory report', () => {
      // Add suite and tests
      tracker.startSuite('report-suite');
      
      tracker.startTest('test-1', 'report-suite.test.ts');
      mockMemoryUsage.heapUsed = 120 * 1024 * 1024;
      tracker.endTest('test-1', 'passed');
      
      tracker.startTest('test-2', 'report-suite.test.ts');
      mockMemoryUsage.heapUsed = 140 * 1024 * 1024;
      tracker.endTest('test-2', 'failed');
      
      tracker.endSuite('report-suite');
      
      const report = tracker.generateMemoryReport();
      
      expect(report).toContain('Comprehensive Test Memory Report');
      expect(report).toContain('Overall Statistics:');
      expect(report).toContain('Memory Leak Detection:');
      expect(report).toContain('Suite Reports:');
      expect(report).toContain('Top Memory Consuming Tests:');
      expect(report).toContain('report-suite');
    });

    it('should handle empty report', () => {
      const report = tracker.generateMemoryReport();
      
      expect(report).toContain('Comprehensive Test Memory Report');
      expect(report).toContain('Total Tests: 0');
      expect(report).toContain('Total Suites: 0');
    });
  });

  describe('data management', () => {
    it('should get all test snapshots', () => {
      tracker.startTest('test-1');
      tracker.endTest('test-1', 'passed');
      
      tracker.startTest('test-2');
      tracker.endTest('test-2', 'failed');
      
      const snapshots = tracker.getAllTestSnapshots();
      
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].testName).toBe('test-1');
      expect(snapshots[1].testName).toBe('test-2');
    });

    it('should get all suite reports', () => {
      tracker.startSuite('suite-1');
      tracker.endSuite('suite-1');
      
      tracker.startSuite('suite-2');
      tracker.endSuite('suite-2');
      
      const reports = tracker.getAllSuiteReports();
      
      expect(reports).toHaveLength(2);
      expect(reports[0].suiteName).toBe('suite-1');
      expect(reports[1].suiteName).toBe('suite-2');
    });

    it('should clear all data', () => {
      tracker.startTest('test-1');
      tracker.endTest('test-1', 'passed');
      
      tracker.startSuite('suite-1');
      tracker.endSuite('suite-1');
      
      tracker.clear();
      
      expect(tracker.getAllTestSnapshots()).toHaveLength(0);
      expect(tracker.getAllSuiteReports()).toHaveLength(0);
      expect(tracker['memoryEvents']).toHaveLength(0);
    });
  });
});

describe('Global utility functions', () => {
  let mockMonitor: TestWorkerMemoryMonitor;

  beforeEach(() => {
    mockMonitor = {
      getCurrentMemoryUsage: vi.fn(() => ({
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 150 * 1024 * 1024,
        rss: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        timestamp: Date.now(),
        formattedHeapUsed: '100.0 MB',
        formattedHeapTotal: '150.0 MB',
        usagePercentage: 20,
        isWarning: false,
        isCritical: false,
        isOverLimit: false
      })),
      onMemoryEvent: vi.fn(),
      setCurrentTest: vi.fn(),
      clearCurrentTest: vi.fn()
    } as any;

    cleanupTestMemoryTracking();
  });

  afterEach(() => {
    cleanupTestMemoryTracking();
  });

  describe('getTestMemoryTracker', () => {
    it('should throw error without monitor', () => {
      expect(() => getTestMemoryTracker()).toThrow('TestMemoryTracker requires a TestWorkerMemoryMonitor instance');
    });

    it('should return tracker with monitor', () => {
      const tracker = getTestMemoryTracker(mockMonitor);
      expect(tracker).toBeDefined();
    });

    it('should return same instance on subsequent calls', () => {
      const tracker1 = getTestMemoryTracker(mockMonitor);
      const tracker2 = getTestMemoryTracker();
      
      expect(tracker1).toBe(tracker2);
    });
  });

  describe('initializeTestMemoryTracking', () => {
    it('should initialize tracker', () => {
      const tracker = initializeTestMemoryTracking(mockMonitor);
      
      expect(tracker).toBeDefined();
      expect(mockMonitor.onMemoryEvent).toHaveBeenCalled();
    });
  });

  describe('cleanupTestMemoryTracking', () => {
    it('should cleanup global tracker', () => {
      const tracker = initializeTestMemoryTracking(mockMonitor);
      expect(tracker).toBeDefined();
      
      cleanupTestMemoryTracking();
      
      // Should create new instance after cleanup
      expect(() => getTestMemoryTracker()).toThrow();
    });
  });

  describe('utility functions', () => {
    beforeEach(() => {
      initializeTestMemoryTracking(mockMonitor);
    });

    it('should start test memory tracking', () => {
      startTestMemoryTracking('util-test', 'util.test.ts');
      
      expect(mockMonitor.setCurrentTest).toHaveBeenCalledWith('util-test');
    });

    it('should end test memory tracking', () => {
      startTestMemoryTracking('util-test');
      const snapshot = endTestMemoryTracking('util-test', 'passed');
      
      expect(snapshot).toBeDefined();
      expect(snapshot!.testName).toBe('util-test');
      expect(snapshot!.status).toBe('passed');
      expect(mockMonitor.clearCurrentTest).toHaveBeenCalled();
    });

    it('should generate memory report', () => {
      const report = generateTestMemoryReport();
      
      expect(report).toContain('Comprehensive Test Memory Report');
    });
  });

  describe('utility functions without initialization', () => {
    it('should handle startTestMemoryTracking without tracker', () => {
      expect(() => startTestMemoryTracking('test')).not.toThrow();
    });

    it('should handle endTestMemoryTracking without tracker', () => {
      const result = endTestMemoryTracking('test', 'passed');
      expect(result).toBeUndefined();
    });

    it('should handle generateTestMemoryReport without tracker', () => {
      const report = generateTestMemoryReport();
      expect(report).toContain('not initialized');
    });
  });
});