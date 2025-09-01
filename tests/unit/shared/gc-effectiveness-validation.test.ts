/**
 * Garbage Collection Effectiveness Validation Test Suite
 * 
 * Validates that automatic garbage collection triggers are effective at
 * preventing memory exhaustion and maintaining stable memory usage during
 * test execution, as required for production readiness.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import {
  getAutomaticGCTriggers,
  initializeAutomaticGCTriggers,
  resetAutomaticGCTriggers,
  forceGarbageCollection,
  getGCTriggerStats,
  type GCTriggerConfig
} from '../../../src/shared/automatic-gc-triggers.js';

describe('GC Effectiveness Validation', () => {
  let originalGc: typeof global.gc;
  let gcCallCount = 0;
  let memoryFreedTotal = 0;
  let mockMemoryUsage: NodeJS.MemoryUsage;

  beforeAll(() => {
    // Mock process.memoryUsage for consistent testing
    mockMemoryUsage = {
      rss: 200 * 1024 * 1024,
      heapTotal: 150 * 1024 * 1024,
      heapUsed: 100 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    };
  });

  beforeEach(() => {
    // Reset state
    resetAutomaticGCTriggers();
    gcCallCount = 0;
    memoryFreedTotal = 0;
    
    // Mock global.gc
    originalGc = global.gc;
    global.gc = vi.fn(() => {
      gcCallCount++;
      // Simulate memory being freed
      mockMemoryUsage.heapUsed = Math.max(
        mockMemoryUsage.heapUsed - (10 * 1024 * 1024), // Free 10MB each time
        50 * 1024 * 1024 // Minimum 50MB
      );
      memoryFreedTotal += 10 * 1024 * 1024;
    });
    
    // Mock process.memoryUsage
    process.memoryUsage = vi.fn(() => ({ ...mockMemoryUsage }));
  });

  afterEach(() => {
    // Restore original functions
    if (originalGc) {
      global.gc = originalGc;
    } else {
      delete (global as any).gc;
    }
    
    resetAutomaticGCTriggers();
  });

  describe('Memory Threshold Effectiveness', () => {
    it('should prevent memory exhaustion by triggering GC at thresholds', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        memoryThresholdMB: 80, // 80MB threshold
        triggerAfterTests: 5
      });

      // Simulate memory growth
      mockMemoryUsage.heapUsed = 90 * 1024 * 1024; // Above threshold

      // Trigger tests to check memory
      for (let i = 0; i < 10; i++) {
        gcTriggers.onTestStart(`threshold_test_${i}`);
      }

      // GC should have been triggered due to memory threshold
      expect(gcCallCount).toBeGreaterThan(0);
      
      const stats = gcTriggers.getStats();
      expect(stats.totalTriggers).toBeGreaterThan(0);
      expect(stats.triggersByReason['memory_threshold'] || 0).toBeGreaterThan(0);
    });

    it('should demonstrate measurable memory reduction after GC', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        gcPasses: 3 // Multiple passes for better effectiveness
      });

      // Set high memory usage
      mockMemoryUsage.heapUsed = 200 * 1024 * 1024;

      const result = gcTriggers.forceGC('effectiveness_test');

      expect(result.triggered).toBe(true);
      expect(result.memoryFreed).toBeGreaterThan(0);
      expect(result.gcPasses).toBe(3);
      expect(gcCallCount).toBe(3); // Should call GC 3 times
    });

    it('should maintain effectiveness score based on memory freed', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true
      });

      // Perform multiple GC triggers with varying memory freed
      const memoryAmounts = [150, 180, 120, 160, 140]; // MB
      
      memoryAmounts.forEach((memoryMB, index) => {
        mockMemoryUsage.heapUsed = memoryMB * 1024 * 1024;
        gcTriggers.forceGC(`effectiveness_${index}`);
      });

      const stats = gcTriggers.getStats();
      
      expect(stats.totalTriggers).toBe(5);
      expect(stats.averageMemoryFreed).toBeGreaterThan(0);
      expect(stats.effectivenessScore).toBeGreaterThan(0);
      
      // With consistent memory freeing, effectiveness should be good
      expect(stats.effectivenessScore).toBeGreaterThan(50);
    });
  });

  describe('Test Suite Boundary Effectiveness', () => {
    it('should trigger GC between test suites to prevent accumulation', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerBetweenSuites: true
      });

      // Simulate multiple test suites
      const suites = ['parser-tests', 'detection-tests', 'generator-tests', 'cli-tests'];
      
      suites.forEach((suite, index) => {
        if (index > 0) {
          // Should trigger GC when switching suites
          const beforeGcCount = gcCallCount;
          gcTriggers.onSuiteStart(suite);
          expect(gcCallCount).toBeGreaterThan(beforeGcCount);
        } else {
          gcTriggers.onSuiteStart(suite);
        }
        
        // Run some tests in the suite
        for (let i = 0; i < 5; i++) {
          gcTriggers.onTestStart(`${suite}_test_${i}`, suite);
          gcTriggers.onTestEnd(`${suite}_test_${i}`, 'passed');
        }
        
        // End suite should also trigger GC
        const beforeEndGcCount = gcCallCount;
        gcTriggers.onSuiteEnd(suite);
        expect(gcCallCount).toBeGreaterThan(beforeEndGcCount);
      });

      const stats = gcTriggers.getStats();
      expect(stats.triggersByReason['suite_boundary'] || stats.triggersByReason['suite_start'] || 0).toBeGreaterThan(0);
      expect(stats.triggersByReason['suite_start'] || 0).toBeGreaterThan(0);
      expect(stats.triggersByReason['suite_end'] || 0).toBeGreaterThan(0);
    });

    it('should handle rapid suite transitions effectively', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerBetweenSuites: true,
        gcPassDelay: 1 // Minimal delay for rapid testing
      });

      // Rapidly switch between many suites
      for (let i = 0; i < 20; i++) {
        gcTriggers.onSuiteStart(`rapid_suite_${i}`);
        gcTriggers.onSuiteEnd(`rapid_suite_${i}`);
      }

      const stats = gcTriggers.getStats();
      expect(stats.totalTriggers).toBeGreaterThan(10); // Should have many triggers
      expect(gcCallCount).toBeGreaterThan(10);
    });
  });

  describe('Test Count Trigger Effectiveness', () => {
    it('should trigger GC at regular test intervals', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerAfterTests: 10
      });

      // Run exactly 30 tests
      for (let i = 1; i <= 30; i++) {
        gcTriggers.onTestStart(`interval_test_${i}`);
        gcTriggers.onTestEnd(`interval_test_${i}`, 'passed');
      }

      // Should trigger GC at tests 10, 20, and 30
      const stats = gcTriggers.getStats();
      expect(stats.triggersByReason['test_count']).toBe(3);
      expect(gcCallCount).toBeGreaterThanOrEqual(3);
    });

    it('should adapt trigger frequency based on memory pressure', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerAfterTests: 15,
        memoryThresholdMB: 120
      });

      // Run tests with increasing memory pressure
      for (let i = 1; i <= 20; i++) {
        // Simulate memory growth
        mockMemoryUsage.heapUsed = (100 + i * 5) * 1024 * 1024;
        
        gcTriggers.onTestStart(`pressure_test_${i}`);
        gcTriggers.onTestEnd(`pressure_test_${i}`, 'passed');
      }

      const stats = gcTriggers.getStats();
      
      // Should have triggers from both test count and memory threshold
      expect(stats.triggersByReason['test_count']).toBeGreaterThan(0);
      expect(stats.triggersByReason['memory_threshold']).toBeGreaterThan(0);
      expect(stats.totalTriggers).toBeGreaterThan(2);
    });
  });

  describe('Failed Test Cleanup Effectiveness', () => {
    it('should trigger GC after failed tests to clean up leaked resources', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        memoryThresholdMB: 90
      });

      // Simulate high memory usage (above 80% of threshold)
      mockMemoryUsage.heapUsed = 95 * 1024 * 1024;

      const beforeGcCount = gcCallCount;
      
      // Failed test should trigger GC due to high memory
      gcTriggers.onTestEnd('failed_test', 'failed');
      
      expect(gcCallCount).toBeGreaterThan(beforeGcCount);
      
      const stats = gcTriggers.getStats();
      expect(stats.triggersByReason['test_failure']).toBeGreaterThan(0);
    });

    it('should not trigger GC for failed tests with low memory usage', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        memoryThresholdMB: 200
      });

      // Simulate low memory usage
      mockMemoryUsage.heapUsed = 50 * 1024 * 1024;

      const beforeGcCount = gcCallCount;
      
      // Failed test should NOT trigger GC due to low memory
      gcTriggers.onTestEnd('failed_test_low_memory', 'failed');
      
      expect(gcCallCount).toBe(beforeGcCount);
    });
  });

  describe('GC Performance and Timing', () => {
    it('should complete GC operations within reasonable time', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        gcPasses: 2,
        gcPassDelay: 5
      });

      const startTime = Date.now();
      const result = gcTriggers.forceGC('timing_test');
      const endTime = Date.now();

      expect(result.triggered).toBe(true);
      expect(result.gcTime).toBeGreaterThanOrEqual(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle multiple concurrent GC requests gracefully', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true
      });

      // Trigger multiple GCs rapidly
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(gcTriggers.forceGC(`concurrent_${i}`));
      }

      // All should complete successfully
      results.forEach((result, index) => {
        expect(result.triggered).toBe(true);
        expect(result.reason).toBe(`concurrent_${index}`);
      });

      expect(gcCallCount).toBe(results.length * 2); // 2 passes per trigger
    });
  });

  describe('Memory Leak Prevention Validation', () => {
    it('should prevent memory leaks in long-running test suites', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerAfterTests: 5,
        memoryThresholdMB: 150
      });

      const initialMemory = mockMemoryUsage.heapUsed;
      let peakMemory = initialMemory;

      // Simulate long-running test suite with memory growth
      for (let i = 0; i < 100; i++) {
        // Simulate memory growth
        mockMemoryUsage.heapUsed += 2 * 1024 * 1024; // 2MB per test
        peakMemory = Math.max(peakMemory, mockMemoryUsage.heapUsed);
        
        gcTriggers.onTestStart(`longrunning_test_${i}`);
        gcTriggers.onTestEnd(`longrunning_test_${i}`, 'passed');
      }

      const finalMemory = mockMemoryUsage.heapUsed;
      const stats = gcTriggers.getStats();

      // GC should have been triggered multiple times
      expect(stats.totalTriggers).toBeGreaterThan(10);
      
      // Memory should not have grown excessively due to GC
      const memoryGrowth = finalMemory - initialMemory;
      const peakGrowth = peakMemory - initialMemory;
      
      // Final memory should be less than peak due to GC effectiveness
      expect(finalMemory).toBeLessThan(peakMemory);
      
      // Memory growth should be controlled
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
    });

    it('should maintain stable memory usage across multiple test cycles', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerAfterTests: 8,
        triggerBetweenSuites: true
      });

      const memorySnapshots: number[] = [];
      const cycleCount = 10;
      const testsPerCycle = 20;

      for (let cycle = 0; cycle < cycleCount; cycle++) {
        gcTriggers.onSuiteStart(`cycle_${cycle}`);
        
        for (let test = 0; test < testsPerCycle; test++) {
          // Simulate memory allocation
          mockMemoryUsage.heapUsed += 1 * 1024 * 1024; // 1MB per test
          
          gcTriggers.onTestStart(`cycle_${cycle}_test_${test}`);
          gcTriggers.onTestEnd(`cycle_${cycle}_test_${test}`, 'passed');
        }
        
        gcTriggers.onSuiteEnd(`cycle_${cycle}`);
        memorySnapshots.push(mockMemoryUsage.heapUsed);
      }

      // Analyze memory stability
      const firstHalf = memorySnapshots.slice(0, cycleCount / 2);
      const secondHalf = memorySnapshots.slice(cycleCount / 2);
      
      const firstAvg = firstHalf.reduce((sum, mem) => sum + mem, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, mem) => sum + mem, 0) / secondHalf.length;
      
      const growthRate = (secondAvg - firstAvg) / firstAvg;
      
      // Memory growth rate should be minimal due to effective GC
      expect(Math.abs(growthRate)).toBeLessThan(0.3); // Less than 30% growth
      
      const stats = gcTriggers.getStats();
      expect(stats.effectivenessScore).toBeGreaterThan(60); // Good effectiveness
    });
  });

  describe('Production Readiness Validation', () => {
    it('should meet production readiness memory management requirements', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerAfterTests: 12,
        memoryThresholdMB: 400,
        triggerBetweenSuites: true,
        gcPasses: 2
      });

      // Simulate production-like test execution
      const suites = ['unit-tests', 'integration-tests', 'performance-tests'];
      const testsPerSuite = 50;

      suites.forEach(suite => {
        gcTriggers.onSuiteStart(suite);
        
        for (let i = 0; i < testsPerSuite; i++) {
          // Simulate realistic memory usage patterns
          mockMemoryUsage.heapUsed += Math.random() * 5 * 1024 * 1024; // 0-5MB per test
          
          const status = Math.random() > 0.1 ? 'passed' : 'failed'; // 10% failure rate
          
          gcTriggers.onTestStart(`${suite}_test_${i}`, suite);
          gcTriggers.onTestEnd(`${suite}_test_${i}`, status);
        }
        
        gcTriggers.onSuiteEnd(suite);
      });

      const stats = gcTriggers.getStats();
      
      // Production readiness criteria
      expect(stats.totalTriggers).toBeGreaterThan(0); // GC should be active
      expect(stats.effectivenessScore).toBeGreaterThan(50); // Reasonable effectiveness
      expect(stats.averageMemoryFreed).toBeGreaterThan(5 * 1024 * 1024); // At least 5MB average
      
      // Should have triggers from multiple sources
      expect(Object.keys(stats.triggersByReason).length).toBeGreaterThan(2);
      
      // Memory management should be comprehensive
      expect(stats.triggersByReason['suite_end']).toBeGreaterThan(0);
      expect(stats.triggersByReason['test_count']).toBeGreaterThan(0);
    });

    it('should generate actionable production readiness report', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true
      });

      // Generate some activity
      gcTriggers.forceGC('production_test');
      gcTriggers.onSuiteStart('production-suite');
      gcTriggers.onTestStart('test1', 'production-suite');
      gcTriggers.onTestEnd('test1', 'passed');
      gcTriggers.onSuiteEnd('production-suite');

      const report = gcTriggers.generateReport();

      // Report should contain production-relevant information
      expect(report).toContain('Automatic GC Triggers Report');
      expect(report).toContain('Configuration:');
      expect(report).toContain('Statistics:');
      expect(report).toContain('Effectiveness:');
      expect(report).toContain('Recommendations:');
      
      // Should provide actionable recommendations (when GC is not available)
      if (!global.gc) {
        expect(report).toContain('--expose-gc');
      }
      
      const stats = gcTriggers.getStats();
      if (stats.totalTriggers === 0) {
        expect(report).toContain('Enable GC triggers');
      }
    });
  });
});