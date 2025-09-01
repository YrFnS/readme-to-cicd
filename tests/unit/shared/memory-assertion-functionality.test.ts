/**
 * Memory Assertion Functionality Tests
 * 
 * Tests for memory assertion functionality to prevent regression and ensure
 * memory threshold checks work correctly in critical tests.
 * 
 * Requirements: 1.2, 2.2 - Prevent memory exhaustion and JS heap out of memory errors
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
  TestMemoryTracker
} from '../../../src/shared/test-memory-tracking.js';

describe('Memory Assertion Functionality', () => {
  let mockMonitor: TestWorkerMemoryMonitor;
  let mockTracker: TestMemoryTracker;
  let assertions: MemoryUsageAssertions;
  let currentMemoryUsage: NodeJS.MemoryUsage;

  beforeEach(() => {
    // Initialize with realistic memory usage
    currentMemoryUsage = {
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      external: 5 * 1024 * 1024, // 5MB
      rss: 150 * 1024 * 1024, // 150MB
      arrayBuffers: 2 * 1024 * 1024 // 2MB
    };

    // Mock memory monitor with dynamic memory usage
    mockMonitor = {
      getCurrentMemoryUsage: vi.fn(() => ({
        heapUsed: currentMemoryUsage.heapUsed,
        heapTotal: currentMemoryUsage.heapTotal,
        rss: currentMemoryUsage.rss,
        external: currentMemoryUsage.external,
        timestamp: Date.now(),
        formattedHeapUsed: `${(currentMemoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
        formattedHeapTotal: `${(currentMemoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
        usagePercentage: (currentMemoryUsage.heapUsed / (512 * 1024 * 1024)) * 100,
        isWarning: currentMemoryUsage.heapUsed > 200 * 1024 * 1024,
        isCritical: currentMemoryUsage.heapUsed > 400 * 1024 * 1024,
        isOverLimit: currentMemoryUsage.heapUsed > 500 * 1024 * 1024
      }))
    } as any;

    mockTracker = {
      getTestSnapshot: vi.fn()
    } as any;

    assertions = new MemoryUsageAssertions(mockMonitor, mockTracker);
  });

  afterEach(() => {
    assertions.clearAllBaselines();
  });

  describe('Memory Regression Prevention', () => {
    it('should prevent memory regression by detecting increased usage', () => {
      // Set initial baseline at 50MB
      const baselineMemory = 50 * 1024 * 1024;
      
      // Simulate memory increase to 80MB (60% increase)
      currentMemoryUsage.heapUsed = 80 * 1024 * 1024;
      
      const regressionCheck: MemoryRegressionCheck = {
        testName: 'regression-prevention-test',
        expectedMemoryUsage: baselineMemory,
        allowedVariance: 0.2 // Only 20% variance allowed
      };

      // This should fail and prevent regression
      const result = assertions.assertNoMemoryRegression(regressionCheck);
      
      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('regression');
      expect(result.memoryGrowth).toBe(30 * 1024 * 1024); // 30MB growth
      
      console.log('✅ Memory regression correctly detected and prevented');
    });

    it('should allow acceptable memory variance within limits', () => {
      const baselineMemory = 50 * 1024 * 1024;
      
      // Simulate small memory increase to 55MB (10% increase)
      currentMemoryUsage.heapUsed = 55 * 1024 * 1024;
      
      const regressionCheck: MemoryRegressionCheck = {
        testName: 'acceptable-variance-test',
        expectedMemoryUsage: baselineMemory,
        allowedVariance: 0.2 // 20% variance allowed
      };

      const result = assertions.assertNoMemoryRegression(regressionCheck);
      
      expect(result.passed).toBe(true);
      expect(result.memoryGrowth).toBe(5 * 1024 * 1024); // 5MB growth
      
      console.log('✅ Acceptable memory variance allowed');
    });

    it('should update baseline when regression check passes and requested', () => {
      const initialBaseline = 50 * 1024 * 1024;
      
      // Simulate acceptable memory increase
      currentMemoryUsage.heapUsed = 60 * 1024 * 1024;
      
      const regressionCheck: MemoryRegressionCheck = {
        testName: 'baseline-update-test',
        expectedMemoryUsage: initialBaseline,
        allowedVariance: 0.3, // 30% variance
        updateBaseline: true
      };

      const result = assertions.assertNoMemoryRegression(regressionCheck);
      
      expect(result.passed).toBe(true);
      
      // Verify baseline was updated
      const updatedBaseline = assertions.getRegressionBaseline('baseline-update-test');
      expect(updatedBaseline).toBe(60 * 1024 * 1024);
      
      console.log('✅ Baseline updated after successful regression check');
    });
  });

  describe('Memory Threshold Checks in Critical Tests', () => {
    it('should enforce strict memory limits for critical operations', () => {
      // Simulate critical operation with high memory usage
      currentMemoryUsage.heapUsed = 200 * 1024 * 1024; // 200MB
      
      const criticalThresholds: MemoryThreshold = {
        maxMemoryBytes: 150 * 1024 * 1024, // 150MB limit
        maxUsagePercentage: 70, // 70% usage limit
        minEfficiencyScore: 80 // High efficiency required
      };

      const result = assertions.assertMemoryWithinThresholds(criticalThresholds);
      
      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('exceeds limit');
      
      console.log('✅ Critical memory thresholds enforced');
    });

    it('should allow operations within critical thresholds', () => {
      // Keep memory usage low for critical operation
      currentMemoryUsage.heapUsed = 80 * 1024 * 1024; // 80MB
      
      const criticalThresholds: MemoryThreshold = {
        maxMemoryBytes: 150 * 1024 * 1024, // 150MB limit
        maxUsagePercentage: 70, // 70% usage limit
        maxGrowthBytes: 50 * 1024 * 1024, // 50MB growth limit
        minEfficiencyScore: 60 // Reasonable efficiency
      };

      const result = assertions.assertMemoryWithinThresholds(criticalThresholds);
      
      expect(result.passed).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      
      console.log('✅ Critical operation within memory thresholds');
    });

    it('should detect memory growth exceeding critical limits', () => {
      // Set baseline
      assertions.setMemoryBaseline('critical-growth-test');
      
      // Simulate significant memory growth
      currentMemoryUsage.heapUsed = 150 * 1024 * 1024; // Grew from 50MB to 150MB
      
      const criticalThresholds: MemoryThreshold = {
        maxGrowthBytes: 50 * 1024 * 1024, // Only 50MB growth allowed
        maxGrowthPercentage: 80 // Only 80% growth allowed
      };

      // Mock getCurrentTestName to return our test
      assertions['getCurrentTestName'] = vi.fn(() => 'critical-growth-test');

      const result = assertions.assertMemoryWithinThresholds(criticalThresholds);
      
      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('growth');
      expect(result.memoryGrowth).toBe(100 * 1024 * 1024); // 100MB growth
      
      console.log('✅ Critical memory growth limits enforced');
    });
  });

  describe('Memory Assertion Functionality for Heap Exhaustion Prevention', () => {
    it('should prevent heap exhaustion by catching high memory usage early', () => {
      // Simulate approaching heap limit
      currentMemoryUsage.heapUsed = 450 * 1024 * 1024; // 450MB - getting close to typical limits
      
      const preventionThresholds: MemoryThreshold = {
        maxMemoryBytes: 400 * 1024 * 1024, // 400MB safety limit
        maxUsagePercentage: 85 // 85% usage limit
      };

      const result = assertions.assertMemoryWithinThresholds(preventionThresholds);
      
      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('exceeds limit');
      
      // This assertion would prevent heap exhaustion by catching high usage early
      console.log('✅ Heap exhaustion prevention: High memory usage detected early');
    });

    it('should allow safe memory usage levels', () => {
      // Keep memory at safe levels
      currentMemoryUsage.heapUsed = 100 * 1024 * 1024; // 100MB - safe level
      
      const safeThresholds: MemoryThreshold = {
        maxMemoryBytes: 300 * 1024 * 1024, // 300MB safety limit
        maxUsagePercentage: 80 // 80% usage limit
      };

      const result = assertions.assertMemoryWithinThresholds(safeThresholds);
      
      expect(result.passed).toBe(true);
      
      console.log('✅ Safe memory usage levels maintained');
    });

    it('should detect rapid memory growth that could lead to exhaustion', async () => {
      const rapidGrowthOperation = async () => {
        // Simulate rapid memory growth during operation
        currentMemoryUsage.heapUsed = 300 * 1024 * 1024; // Rapid growth to 300MB
        return 'operation-complete';
      };

      const maxSafeGrowth = 100 * 1024 * 1024; // 100MB max safe growth

      const { result, assertion } = await assertions.assertMemoryGrowthDuringOperation(
        rapidGrowthOperation,
        maxSafeGrowth
      );

      expect(result).toBe('operation-complete');
      expect(assertion.passed).toBe(false); // Should fail due to excessive growth
      expect(assertion.memoryGrowth).toBe(250 * 1024 * 1024); // 250MB growth
      
      console.log('✅ Rapid memory growth detected before exhaustion');
    });

    it('should allow controlled memory growth within safe limits', async () => {
      const controlledGrowthOperation = async () => {
        // Simulate controlled memory growth
        currentMemoryUsage.heapUsed = 80 * 1024 * 1024; // Controlled growth to 80MB
        return 'controlled-operation';
      };

      const maxSafeGrowth = 50 * 1024 * 1024; // 50MB max safe growth

      const { result, assertion } = await assertions.assertMemoryGrowthDuringOperation(
        controlledGrowthOperation,
        maxSafeGrowth
      );

      expect(result).toBe('controlled-operation');
      expect(assertion.passed).toBe(true); // Should pass with controlled growth
      expect(assertion.memoryGrowth).toBe(30 * 1024 * 1024); // 30MB growth
      
      console.log('✅ Controlled memory growth within safe limits');
    });
  });

  describe('Memory Assertion Functionality in Critical Test Scenarios', () => {
    it('should provide memory assertions for large file processing tests', async () => {
      // Simulate large file processing scenario
      const largeFileProcessing = async () => {
        // Simulate memory usage during large file processing
        currentMemoryUsage.heapUsed = 180 * 1024 * 1024; // 180MB for large file
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return { processed: true, size: '10MB' };
      };

      // Set appropriate thresholds for large file processing
      const largeFileThresholds: MemoryThreshold = {
        maxMemoryBytes: 200 * 1024 * 1024, // 200MB limit for large files
        maxGrowthBytes: 150 * 1024 * 1024, // 150MB growth allowed
        maxUsagePercentage: 85, // 85% usage allowed
        minEfficiencyScore: 60 // Lower efficiency acceptable for large files
      };

      // Test memory growth during operation
      const { result, assertion } = await assertions.assertMemoryGrowthDuringOperation(
        largeFileProcessing,
        150 * 1024 * 1024 // 150MB max growth
      );

      expect(result.processed).toBe(true);
      expect(assertion.passed).toBe(true);
      expect(assertion.memoryGrowth).toBe(130 * 1024 * 1024); // 130MB growth
      
      // Also test final memory state
      const finalResult = assertions.assertMemoryWithinThresholds(largeFileThresholds);
      expect(finalResult.passed).toBe(true);
      
      console.log('✅ Large file processing memory assertions passed');
    });

    it('should provide memory assertions for batch processing tests', async () => {
      // Simulate batch processing with multiple operations
      const batchOperations = [];
      
      for (let i = 0; i < 5; i++) {
        batchOperations.push(async () => {
          // Each operation adds some memory usage
          currentMemoryUsage.heapUsed += 20 * 1024 * 1024; // +20MB per operation
          return `batch-item-${i}`;
        });
      }

      const batchThresholds: MemoryThreshold = {
        maxMemoryBytes: 200 * 1024 * 1024, // 200MB total limit
        maxGrowthBytes: 120 * 1024 * 1024, // 120MB growth limit
        maxUsagePercentage: 80 // 80% usage limit
      };

      // Execute batch operations with memory monitoring
      const results = [];
      for (const operation of batchOperations) {
        const { result } = await assertions.assertMemoryGrowthDuringOperation(
          operation,
          30 * 1024 * 1024 // 30MB per operation
        );
        results.push(result);
      }

      expect(results).toHaveLength(5);
      
      // Check final memory state after batch processing
      const finalResult = assertions.assertMemoryWithinThresholds(batchThresholds);
      expect(finalResult.passed).toBe(true);
      
      console.log('✅ Batch processing memory assertions passed');
    });

    it('should provide memory assertions for concurrent operation tests', async () => {
      // Simulate concurrent operations that might compete for memory
      const concurrentOperations = [
        async () => {
          // Reset to baseline before each operation to simulate independent operations
          const startMemory = currentMemoryUsage.heapUsed;
          currentMemoryUsage.heapUsed = startMemory + 30 * 1024 * 1024; // +30MB
          return 'concurrent-1';
        },
        async () => {
          const startMemory = 50 * 1024 * 1024; // Reset baseline
          currentMemoryUsage.heapUsed = startMemory + 25 * 1024 * 1024; // +25MB
          return 'concurrent-2';
        },
        async () => {
          const startMemory = 50 * 1024 * 1024; // Reset baseline
          currentMemoryUsage.heapUsed = startMemory + 35 * 1024 * 1024; // +35MB
          return 'concurrent-3';
        }
      ];

      const concurrentThresholds: MemoryThreshold = {
        maxMemoryBytes: 250 * 1024 * 1024, // 250MB limit for concurrent ops
        maxGrowthBytes: 100 * 1024 * 1024, // 100MB total growth
        maxUsagePercentage: 90 // Higher usage allowed for concurrent tests
      };

      // Execute operations with generous memory growth limits
      const results = [];
      for (const op of concurrentOperations) {
        // Reset memory to baseline before each operation
        currentMemoryUsage.heapUsed = 50 * 1024 * 1024;
        
        const result = await assertions.assertMemoryGrowthDuringOperation(op, 50 * 1024 * 1024);
        results.push(result);
      }

      expect(results).toHaveLength(3);
      results.forEach(({ assertion }) => {
        expect(assertion.passed).toBe(true);
      });

      // Check final memory state
      const finalResult = assertions.assertMemoryWithinThresholds(concurrentThresholds);
      expect(finalResult.passed).toBe(true);
      
      console.log('✅ Concurrent operations memory assertions passed');
    });
  });

  describe('Memory Assertion Error Prevention', () => {
    it('should prevent JS heap out of memory errors by early detection', () => {
      // Simulate memory usage approaching heap limit
      currentMemoryUsage.heapUsed = 480 * 1024 * 1024; // 480MB - very high
      
      const heapProtectionThresholds: MemoryThreshold = {
        maxMemoryBytes: 400 * 1024 * 1024, // 400MB safety threshold
        maxUsagePercentage: 75 // 75% usage threshold
      };

      const result = assertions.assertMemoryWithinThresholds(heapProtectionThresholds);
      
      expect(result.passed).toBe(false);
      expect(result.errorMessage).toContain('exceeds limit');
      
      // This would prevent heap exhaustion by failing the test early
      console.log('✅ JS heap out of memory error prevented by early detection');
    });

    it('should provide actionable memory information for debugging', () => {
      // Set up a scenario with memory issues
      currentMemoryUsage.heapUsed = 300 * 1024 * 1024; // 300MB
      assertions.setMemoryBaseline('debug-test');
      
      // Simulate memory growth
      currentMemoryUsage.heapUsed = 400 * 1024 * 1024; // 400MB
      
      const debugThresholds: MemoryThreshold = {
        maxMemoryBytes: 350 * 1024 * 1024,
        maxGrowthBytes: 80 * 1024 * 1024
      };

      assertions['getCurrentTestName'] = vi.fn(() => 'debug-test');
      const result = assertions.assertMemoryWithinThresholds(debugThresholds, {
        includeDetails: true
      });

      expect(result.passed).toBe(false);
      expect(result.details).toContain('400.0 MB'); // Current usage
      expect(result.details).toContain('Growth:'); // Growth information
      expect(result.memoryGrowth).toBe(100 * 1024 * 1024); // 100MB growth
      
      // Generate comprehensive report
      const report = assertions.generateMemoryReport();
      expect(report).toContain('Memory Usage Report');
      expect(report).toContain('Current Usage: 400.0 MB');
      expect(report).toContain('Growth: +100 MB'); // Without decimal point
      
      console.log('✅ Actionable memory debugging information provided');
    });
  });
});

describe('Global Memory Assertion Functionality', () => {
  beforeEach(() => {
    cleanupMemoryAssertions();
  });

  afterEach(() => {
    cleanupMemoryAssertions();
  });

  it('should provide global memory assertion utilities for critical tests', () => {
    // Mock memory monitor for global utilities
    const mockMonitor = {
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

    // Initialize global assertions
    initializeMemoryAssertions(mockMonitor);

    // Test global utility functions
    expect(() => {
      const thresholds: MemoryThreshold = {
        maxMemoryBytes: 200 * 1024 * 1024
      };
      assertMemoryWithinThresholds(thresholds);
    }).not.toThrow();

    expect(() => {
      const check: MemoryRegressionCheck = {
        testName: 'global-test',
        expectedMemoryUsage: 100 * 1024 * 1024,
        allowedVariance: 0.2
      };
      assertNoMemoryRegression(check);
    }).not.toThrow();

    expect(() => {
      setMemoryBaseline('global-baseline');
    }).not.toThrow();

    const report = generateMemoryReport();
    expect(report).toContain('Memory Usage Report');

    console.log('✅ Global memory assertion utilities working correctly');
  });

  it('should handle memory assertion errors gracefully in critical tests', () => {
    // Test without initialization
    expect(() => {
      assertMemoryWithinThresholds({});
    }).toThrow('not initialized');

    expect(() => {
      assertNoMemoryRegression({
        testName: 'test',
        expectedMemoryUsage: 100 * 1024 * 1024,
        allowedVariance: 0.1
      });
    }).toThrow('not initialized');

    expect(async () => {
      await assertMemoryGrowthDuringOperation(
        async () => 'test',
        50 * 1024 * 1024
      );
    }).rejects.toThrow('not initialized');

    console.log('✅ Memory assertion errors handled gracefully');
  });
});