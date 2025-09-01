/**
 * Memory Usage Assertions Tests
 * 
 * Tests for the MemoryUsageAssertions class and related utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryUsageAssertions,
  initializeMemoryAssertions,
  getMemoryAssertions,
  cleanupMemoryAssertions,
  assertMemoryWithinThresholds,
  assertNoMemoryRegression,
  assertMemoryGrowthDuringOperation,
  setMemoryBaseline,
  generateMemoryReport,
  type MemoryThreshold,
  type MemoryAssertionOptions,
  type MemoryRegressionCheck,
  type MemoryAssertionResult
} from '../../../src/shared/memory-usage-assertions.js';
import {
  TestWorkerMemoryMonitor,
  type TestWorkerMemoryUsage
} from '../../../src/shared/test-worker-memory-monitor.js';
import {
  TestMemoryTracker,
  type TestMemorySnapshot
} from '../../../src/shared/test-memory-tracking.js';

describe('MemoryUsageAssertions', () => {
  let mockMonitor: TestWorkerMemoryMonitor;
  let mockTracker: TestMemoryTracker;
  let assertions: MemoryUsageAssertions;
  let mockMemoryUsage: NodeJS.MemoryUsage;

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
      }))
    } as any;

    // Mock TestMemoryTracker
    mockTracker = {
      getTestSnapshot: vi.fn(() => ({
        testName: 'test-1',
        startMemory: mockMonitor.getCurrentMemoryUsage(),
        endMemory: mockMonitor.getCurrentMemoryUsage(),
        memoryGrowth: 10 * 1024 * 1024, // 10MB growth
        duration: 1000,
        status: 'passed'
      } as TestMemorySnapshot))
    } as any;

    assertions = new MemoryUsageAssertions(mockMonitor, mockTracker);
  });

  afterEach(() => {
    assertions.clearAllBaselines();
  });

  describe('constructor', () => {
    it('should create assertions with memory monitor', () => {
      expect(assertions).toBeDefined();
    });

    it('should create assertions with memory monitor and tracker', () => {
      const assertionsWithTracker = new MemoryUsageAssertions(mockMonitor, mockTracker);
      expect(assertionsWithTracker).toBeDefined();
    });
  });

  describe('assertMemoryWithinThresholds', () => {
    it('should pass when memory is within all thresholds', () => {
      const thresholds: MemoryThreshold = {
        maxMemoryBytes: 200 * 1024 * 1024, // 200MB (above current 100MB)
        maxUsagePercentage: 50, // 50% (above current ~20%)
        maxGrowthBytes: 100 * 1024 * 1024, // 100MB
        maxGrowthPercentage: 200, // 200%
        minEfficiencyScore: 50 // 50%
      };

      const result = assertions.assertMemoryWithinThresholds(thresholds);

      expect(result.passed).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      expect(result.currentUsage).toBeDefined();
      expect(result.details).toContain('100.0 MB');
    });

    it('should fail when memory exceeds maximum bytes', () => {
      const thresholds: MemoryThreshold = {
        maxMemoryBytes: 50 * 1024 * 1024 // 50MB (below current 100MB)
      };

      const result = assertions.assertMemoryWithinThresholds(thresholds);

      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('exceeds limit');
      expect(result.errorMessage).toContain('100 MB');
      expect(result.errorMessage).toContain('50 MB');
    });

    it('should fail when usage percentage exceeds limit', () => {
      const thresholds: MemoryThreshold = {
        maxUsagePercentage: 10 // 10% (below current ~20%)
      };

      const result = assertions.assertMemoryWithinThresholds(thresholds);

      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('usage');
      expect(result.errorMessage).toContain('exceeds limit');
    });

    it('should check memory growth when baseline exists', () => {
      // Set baseline
      assertions.setMemoryBaseline('test-growth');
      
      // Simulate memory growth
      mockMemoryUsage.heapUsed = 150 * 1024 * 1024; // Increase to 150MB
      
      const thresholds: MemoryThreshold = {
        maxGrowthBytes: 30 * 1024 * 1024 // 30MB (below actual 50MB growth)
      };

      // Mock getCurrentTestName to return our test
      const originalGetCurrentTestName = assertions['getCurrentTestName'];
      assertions['getCurrentTestName'] = vi.fn(() => 'test-growth');

      const result = assertions.assertMemoryWithinThresholds(thresholds);

      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('growth');
      expect(result.memoryGrowth).toBe(50 * 1024 * 1024);

      // Restore original method
      assertions['getCurrentTestName'] = originalGetCurrentTestName;
    });

    it('should check memory growth percentage when baseline exists', () => {
      // Set baseline at 100MB
      assertions.setMemoryBaseline('test-growth-percent');
      
      // Simulate memory growth to 200MB (100% increase)
      mockMemoryUsage.heapUsed = 200 * 1024 * 1024;
      
      const thresholds: MemoryThreshold = {
        maxGrowthPercentage: 50 // 50% (below actual 100% growth)
      };

      // Mock getCurrentTestName
      assertions['getCurrentTestName'] = vi.fn(() => 'test-growth-percent');

      const result = assertions.assertMemoryWithinThresholds(thresholds);

      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('growth');
      expect(result.errorMessage).toContain('100.0%');
    });

    it('should force garbage collection when requested', () => {
      const originalGC = global.gc;
      global.gc = vi.fn();

      const thresholds: MemoryThreshold = {
        maxMemoryBytes: 200 * 1024 * 1024
      };

      const options: MemoryAssertionOptions = {
        forceGC: true
      };

      assertions.assertMemoryWithinThresholds(thresholds, options);

      expect(global.gc).toHaveBeenCalled();

      global.gc = originalGC;
    });

    it('should log success when requested', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const thresholds: MemoryThreshold = {
        maxMemoryBytes: 200 * 1024 * 1024
      };

      const options: MemoryAssertionOptions = {
        logOnSuccess: true
      };

      assertions.assertMemoryWithinThresholds(thresholds, options);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Memory assertion passed'));

      consoleSpy.mockRestore();
    });
  });

  describe('assertNoMemoryRegression', () => {
    it('should pass when memory is within allowed variance', () => {
      const check: MemoryRegressionCheck = {
        testName: 'regression-test',
        expectedMemoryUsage: 100 * 1024 * 1024, // 100MB (matches current)
        allowedVariance: 0.1 // 10%
      };

      const result = assertions.assertNoMemoryRegression(check);

      expect(result.passed).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      expect(result.memoryGrowth).toBe(0);
    });

    it('should fail when memory exceeds allowed variance', () => {
      const check: MemoryRegressionCheck = {
        testName: 'regression-test',
        expectedMemoryUsage: 80 * 1024 * 1024, // 80MB (below current 100MB)
        allowedVariance: 0.1 // 10% (8MB variance, but actual is 20MB over)
      };

      const result = assertions.assertNoMemoryRegression(check);

      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('regression');
      expect(result.memoryGrowth).toBe(20 * 1024 * 1024);
    });

    it('should update baseline when test passes and requested', () => {
      const check: MemoryRegressionCheck = {
        testName: 'update-baseline-test',
        expectedMemoryUsage: 90 * 1024 * 1024, // 90MB
        allowedVariance: 0.2, // 20% (18MB variance, current 100MB is within)
        updateBaseline: true
      };

      const result = assertions.assertNoMemoryRegression(check);

      expect(result.passed).toBe(true);
      
      // Check that baseline was updated
      const updatedBaseline = assertions.getRegressionBaseline('update-baseline-test');
      expect(updatedBaseline).toBe(100 * 1024 * 1024);
    });

    it('should not update baseline when test fails', () => {
      const check: MemoryRegressionCheck = {
        testName: 'no-update-test',
        expectedMemoryUsage: 50 * 1024 * 1024, // 50MB (too low)
        allowedVariance: 0.1, // 10%
        updateBaseline: true
      };

      const result = assertions.assertNoMemoryRegression(check);

      expect(result.passed).toBe(false);
      
      // Check that baseline was not updated
      const baseline = assertions.getRegressionBaseline('no-update-test');
      expect(baseline).toBeUndefined();
    });
  });

  describe('assertMemoryGrowthDuringOperation', () => {
    it('should pass when operation memory growth is within limits', async () => {
      const operation = async () => {
        // Simulate small memory growth
        mockMemoryUsage.heapUsed = 110 * 1024 * 1024; // +10MB
        return 'success';
      };

      const maxGrowthBytes = 20 * 1024 * 1024; // 20MB limit

      const { result, assertion } = await assertions.assertMemoryGrowthDuringOperation(
        operation,
        maxGrowthBytes
      );

      expect(result).toBe('success');
      expect(assertion.passed).toBe(true);
      expect(assertion.memoryGrowth).toBe(10 * 1024 * 1024);
    });

    it('should fail when operation memory growth exceeds limits', async () => {
      const operation = async () => {
        // Simulate large memory growth
        mockMemoryUsage.heapUsed = 160 * 1024 * 1024; // +60MB
        return 'success';
      };

      const maxGrowthBytes = 30 * 1024 * 1024; // 30MB limit

      const { result, assertion } = await assertions.assertMemoryGrowthDuringOperation(
        operation,
        maxGrowthBytes
      );

      expect(result).toBe('success');
      expect(assertion.passed).toBe(false);
      expect(assertion.errorMessage).toContain('exceeds limit');
      expect(assertion.memoryGrowth).toBe(60 * 1024 * 1024);
    });

    it('should handle operation errors gracefully', async () => {
      const operation = async () => {
        mockMemoryUsage.heapUsed = 120 * 1024 * 1024; // +20MB
        throw new Error('Operation failed');
      };

      const maxGrowthBytes = 50 * 1024 * 1024;

      await expect(
        assertions.assertMemoryGrowthDuringOperation(operation, maxGrowthBytes)
      ).rejects.toThrow('Operation failed');
    });

    it('should force garbage collection when requested', async () => {
      const originalGC = global.gc;
      global.gc = vi.fn();

      const operation = async () => {
        mockMemoryUsage.heapUsed = 105 * 1024 * 1024;
        return 'success';
      };

      const options: MemoryAssertionOptions = {
        forceGC: true
      };

      await assertions.assertMemoryGrowthDuringOperation(operation, 10 * 1024 * 1024, options);

      expect(global.gc).toHaveBeenCalledTimes(2); // Before and after

      global.gc = originalGC;
    });
  });

  describe('baseline management', () => {
    it('should set and get memory baseline', () => {
      assertions.setMemoryBaseline('baseline-test');
      
      const baseline = assertions.getMemoryBaseline('baseline-test');
      expect(baseline).toBe(100 * 1024 * 1024);
    });

    it('should clear memory baseline', () => {
      assertions.setMemoryBaseline('clear-test');
      expect(assertions.getMemoryBaseline('clear-test')).toBeDefined();
      
      assertions.clearMemoryBaseline('clear-test');
      expect(assertions.getMemoryBaseline('clear-test')).toBeUndefined();
    });

    it('should set and get regression baseline', () => {
      const memoryUsage = 150 * 1024 * 1024;
      assertions.setRegressionBaseline('regression-test', memoryUsage);
      
      const baseline = assertions.getRegressionBaseline('regression-test');
      expect(baseline).toBe(memoryUsage);
    });

    it('should clear all baselines', () => {
      assertions.setMemoryBaseline('test-1');
      assertions.setRegressionBaseline('test-2', 100 * 1024 * 1024);
      
      assertions.clearAllBaselines();
      
      expect(assertions.getMemoryBaseline('test-1')).toBeUndefined();
      expect(assertions.getRegressionBaseline('test-2')).toBeUndefined();
    });
  });

  describe('reporting', () => {
    it('should generate comprehensive memory report', () => {
      assertions.setMemoryBaseline('report-test');
      assertions.setRegressionBaseline('report-test', 90 * 1024 * 1024);
      
      // Mock getCurrentTestName to return our test
      assertions['getCurrentTestName'] = vi.fn(() => 'report-test');
      
      const report = assertions.generateMemoryReport();
      
      expect(report).toContain('Memory Usage Report');
      expect(report).toContain('Current Usage: 100.0 MB');
      expect(report).toContain('Current Test: report-test');
      expect(report).toContain('Baseline:');
      expect(report).toContain('Regression Baseline:');
    });

    it('should generate basic report without test context', () => {
      const report = assertions.generateMemoryReport();
      
      expect(report).toContain('Memory Usage Report');
      expect(report).toContain('Current Usage: 100.0 MB');
      expect(report).not.toContain('Current Test:');
    });
  });
});

describe('Global utility functions', () => {
  let mockMonitor: TestWorkerMemoryMonitor;
  let mockTracker: TestMemoryTracker;

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
      }))
    } as any;

    mockTracker = {
      getTestSnapshot: vi.fn()
    } as any;

    cleanupMemoryAssertions();
  });

  afterEach(() => {
    cleanupMemoryAssertions();
  });

  describe('initializeMemoryAssertions', () => {
    it('should initialize global memory assertions', () => {
      const assertions = initializeMemoryAssertions(mockMonitor, mockTracker);
      
      expect(assertions).toBeDefined();
      expect(getMemoryAssertions()).toBe(assertions);
    });
  });

  describe('cleanupMemoryAssertions', () => {
    it('should cleanup global memory assertions', () => {
      initializeMemoryAssertions(mockMonitor, mockTracker);
      expect(getMemoryAssertions()).toBeDefined();
      
      cleanupMemoryAssertions();
      expect(getMemoryAssertions()).toBeNull();
    });
  });

  describe('utility functions', () => {
    beforeEach(() => {
      initializeMemoryAssertions(mockMonitor, mockTracker);
    });

    it('should assert memory within thresholds', () => {
      const thresholds: MemoryThreshold = {
        maxMemoryBytes: 200 * 1024 * 1024
      };

      const result = assertMemoryWithinThresholds(thresholds);
      expect(result.passed).toBe(true);
    });

    it('should assert no memory regression', () => {
      const check: MemoryRegressionCheck = {
        testName: 'util-test',
        expectedMemoryUsage: 100 * 1024 * 1024,
        allowedVariance: 0.1
      };

      const result = assertNoMemoryRegression(check);
      expect(result.passed).toBe(true);
    });

    it('should assert memory growth during operation', async () => {
      const operation = async () => {
        return 'success';
      };

      const { result, assertion } = await assertMemoryGrowthDuringOperation(
        operation,
        50 * 1024 * 1024
      );

      expect(result).toBe('success');
      expect(assertion.passed).toBe(true);
    });

    it('should set memory baseline', () => {
      expect(() => setMemoryBaseline('util-baseline')).not.toThrow();
    });

    it('should generate memory report', () => {
      const report = generateMemoryReport();
      expect(report).toContain('Memory Usage Report');
    });
  });

  describe('utility functions without initialization', () => {
    it('should throw error for assertMemoryWithinThresholds', () => {
      expect(() => assertMemoryWithinThresholds({})).toThrow('not initialized');
    });

    it('should throw error for assertNoMemoryRegression', () => {
      const check: MemoryRegressionCheck = {
        testName: 'test',
        expectedMemoryUsage: 100 * 1024 * 1024,
        allowedVariance: 0.1
      };

      expect(() => assertNoMemoryRegression(check)).toThrow('not initialized');
    });

    it('should throw error for assertMemoryGrowthDuringOperation', async () => {
      const operation = async () => 'test';

      await expect(
        assertMemoryGrowthDuringOperation(operation, 50 * 1024 * 1024)
      ).rejects.toThrow('not initialized');
    });

    it('should handle setMemoryBaseline gracefully', () => {
      expect(() => setMemoryBaseline('test')).not.toThrow();
    });

    it('should handle generateMemoryReport gracefully', () => {
      const report = generateMemoryReport();
      expect(report).toContain('not initialized');
    });
  });
});