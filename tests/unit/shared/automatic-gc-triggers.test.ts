/**
 * Automatic Garbage Collection Triggers Test Suite
 * 
 * Tests the automatic garbage collection trigger system to ensure it properly
 * manages memory during test execution and triggers GC at appropriate boundaries.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AutomaticGCTriggers,
  initializeAutomaticGCTriggers,
  resetAutomaticGCTriggers,
  getAutomaticGCTriggers,
  forceGarbageCollection,
  getGCTriggerStats,
  generateGCTriggerReport,
  type GCTriggerConfig,
  type GCTriggerResult
} from '../../../src/shared/automatic-gc-triggers.js';

describe('Automatic GC Triggers', () => {
  let originalGc: typeof global.gc;
  let gcCallCount = 0;
  let mockGc: typeof global.gc;

  beforeEach(() => {
    // Reset GC triggers before each test
    resetAutomaticGCTriggers();
    
    // Mock global.gc
    originalGc = global.gc;
    gcCallCount = 0;
    mockGc = vi.fn(() => {
      gcCallCount++;
    });
    global.gc = mockGc;
  });

  afterEach(() => {
    // Restore original gc
    if (originalGc) {
      global.gc = originalGc;
    } else {
      delete (global as any).gc;
    }
    
    // Reset GC triggers after each test
    resetAutomaticGCTriggers();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const gcTriggers = initializeAutomaticGCTriggers();
      
      expect(gcTriggers).toBeDefined();
      expect(gcTriggers).toBeInstanceOf(AutomaticGCTriggers);
      
      const stats = gcTriggers.getStats();
      expect(stats.totalTriggers).toBe(0);
      expect(stats.effectivenessScore).toBe(0);
    });

    it('should initialize with custom configuration', () => {
      const config: Partial<GCTriggerConfig> = {
        enabled: true,
        triggerAfterTests: 5,
        memoryThresholdMB: 200,
        triggerBetweenSuites: true,
        gcPasses: 3,
        enableLogging: true
      };

      const gcTriggers = initializeAutomaticGCTriggers(config);
      
      expect(gcTriggers).toBeDefined();
      
      // Test that configuration is applied by triggering GC
      const result = gcTriggers.forceGC('test');
      expect(result.triggered).toBe(true);
      expect(result.gcPasses).toBe(3);
    });

    it('should return singleton instance', () => {
      const gcTriggers1 = getAutomaticGCTriggers();
      const gcTriggers2 = getAutomaticGCTriggers();
      
      expect(gcTriggers1).toBe(gcTriggers2);
    });

    it('should update configuration dynamically', () => {
      const gcTriggers = getAutomaticGCTriggers();
      
      gcTriggers.updateConfig({
        triggerAfterTests: 3,
        gcPasses: 1
      });
      
      // Trigger multiple tests to verify new configuration
      gcTriggers.onTestStart('test1');
      gcTriggers.onTestStart('test2');
      gcTriggers.onTestStart('test3'); // Should trigger GC
      
      expect(gcCallCount).toBeGreaterThan(0);
    });
  });

  describe('Test Boundary Triggers', () => {
    it('should trigger GC after specified number of tests', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerAfterTests: 3
      });

      // First two tests should not trigger GC
      gcTriggers.onTestStart('test1');
      gcTriggers.onTestStart('test2');
      expect(gcCallCount).toBe(0);

      // Third test should trigger GC
      gcTriggers.onTestStart('test3');
      expect(gcCallCount).toBeGreaterThan(0);
    });

    it('should trigger GC between test suites', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerBetweenSuites: true
      });

      // Start first suite
      gcTriggers.onSuiteStart('suite1');
      const initialGcCount = gcCallCount;

      // Start second suite (should trigger GC)
      gcTriggers.onSuiteStart('suite2');
      expect(gcCallCount).toBeGreaterThan(initialGcCount);
    });

    it('should trigger GC at suite end', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerBetweenSuites: true
      });

      gcTriggers.onSuiteStart('suite1');
      const initialGcCount = gcCallCount;

      gcTriggers.onSuiteEnd('suite1');
      expect(gcCallCount).toBeGreaterThan(initialGcCount);
    });

    it('should trigger GC after failed tests when memory is high', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        memoryThresholdMB: 1 // Very low threshold to trigger GC
      });

      gcTriggers.onTestEnd('failedTest', 'failed');
      expect(gcCallCount).toBeGreaterThan(0);
    });
  });

  describe('Memory Threshold Triggers', () => {
    it('should trigger GC when memory threshold is exceeded', () => {
      // Mock process.memoryUsage to return high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn(() => ({
        rss: 500 * 1024 * 1024,
        heapTotal: 400 * 1024 * 1024,
        heapUsed: 350 * 1024 * 1024, // 350MB
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }));

      try {
        const gcTriggers = initializeAutomaticGCTriggers({
          enabled: true,
          memoryThresholdMB: 300 // 300MB threshold
        });

        // Trigger memory check by starting tests
        gcTriggers.onTestStart('test1');
        gcTriggers.onTestStart('test2');
        gcTriggers.onTestStart('test3');
        gcTriggers.onTestStart('test4');
        gcTriggers.onTestStart('test5'); // Should trigger memory check and GC

        expect(gcCallCount).toBeGreaterThan(0);
      } finally {
        process.memoryUsage = originalMemoryUsage;
      }
    });
  });

  describe('Manual GC Triggers', () => {
    it('should allow manual GC triggering', () => {
      const gcTriggers = getAutomaticGCTriggers();
      
      const result = gcTriggers.forceGC('manual_test');
      
      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('manual_test');
      expect(result.gcPasses).toBeGreaterThan(0);
      expect(gcCallCount).toBeGreaterThan(0);
    });

    it('should provide convenience function for manual GC', () => {
      const result = forceGarbageCollection('convenience_test');
      
      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('convenience_test');
      expect(gcCallCount).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Reporting', () => {
    it('should track GC trigger statistics', () => {
      const gcTriggers = getAutomaticGCTriggers();
      
      // Trigger GC multiple times
      gcTriggers.forceGC('test1');
      gcTriggers.forceGC('test2');
      gcTriggers.forceGC('test1'); // Same reason again
      
      const stats = gcTriggers.getStats();
      
      expect(stats.totalTriggers).toBe(3);
      expect(stats.triggersByReason['test1']).toBe(2);
      expect(stats.triggersByReason['test2']).toBe(1);
      expect(stats.lastTriggerTime).toBeGreaterThan(0);
    });

    it('should provide convenience function for statistics', () => {
      const gcTriggers = getAutomaticGCTriggers();
      gcTriggers.forceGC('stats_test');
      
      const stats = getGCTriggerStats();
      
      expect(stats.totalTriggers).toBe(1);
      expect(stats.triggersByReason['stats_test']).toBe(1);
    });

    it('should generate comprehensive report', () => {
      const gcTriggers = getAutomaticGCTriggers();
      
      // Generate some activity
      gcTriggers.onSuiteStart('test-suite');
      gcTriggers.onTestStart('test1', 'test-suite');
      gcTriggers.onTestEnd('test1', 'passed');
      gcTriggers.forceGC('manual');
      gcTriggers.onSuiteEnd('test-suite');
      
      const report = gcTriggers.generateReport();
      
      expect(typeof report).toBe('string');
      expect(report).toContain('Automatic GC Triggers Report');
      expect(report).toContain('Configuration:');
      expect(report).toContain('Statistics:');
      expect(report).toContain('Total triggers:');
    });

    it('should provide convenience function for report generation', () => {
      const gcTriggers = getAutomaticGCTriggers();
      gcTriggers.forceGC('report_test');
      
      const report = generateGCTriggerReport();
      
      expect(typeof report).toBe('string');
      expect(report).toContain('Automatic GC Triggers Report');
    });
  });

  describe('GC Effectiveness Measurement', () => {
    it('should measure memory freed by GC', () => {
      // Mock process.memoryUsage to simulate memory being freed
      let memoryUsage = 100 * 1024 * 1024; // Start with 100MB
      process.memoryUsage = vi.fn(() => ({
        rss: memoryUsage,
        heapTotal: memoryUsage,
        heapUsed: memoryUsage,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }));

      // Mock gc to simulate memory being freed
      global.gc = vi.fn(() => {
        memoryUsage -= 20 * 1024 * 1024; // Free 20MB
        gcCallCount++;
      });

      const gcTriggers = getAutomaticGCTriggers();
      const result = gcTriggers.forceGC('effectiveness_test');

      expect(result.triggered).toBe(true);
      expect(result.memoryFreed).toBeGreaterThan(0);
      expect(result.gcTime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate effectiveness score', () => {
      const gcTriggers = getAutomaticGCTriggers();
      
      // Simulate multiple GC triggers with memory freed
      const originalMemoryUsage = process.memoryUsage;
      let currentMemory = 200 * 1024 * 1024;
      
      process.memoryUsage = vi.fn(() => ({
        rss: currentMemory,
        heapTotal: currentMemory,
        heapUsed: currentMemory,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      }));

      global.gc = vi.fn(() => {
        currentMemory -= 10 * 1024 * 1024; // Free 10MB each time
        gcCallCount++;
      });

      try {
        // Trigger multiple GCs
        for (let i = 0; i < 5; i++) {
          gcTriggers.forceGC(`effectiveness_${i}`);
        }

        const stats = gcTriggers.getStats();
        expect(stats.effectivenessScore).toBeGreaterThan(0);
        expect(stats.averageMemoryFreed).toBeGreaterThan(0);
      } finally {
        process.memoryUsage = originalMemoryUsage;
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing global.gc gracefully', () => {
      delete (global as any).gc;
      
      const gcTriggers = getAutomaticGCTriggers();
      const result = gcTriggers.forceGC('no_gc_test');
      
      expect(result.triggered).toBe(false);
      expect(result.reason).toBe('no_gc_test');
      expect(result.gcPasses).toBe(0);
    });

    it('should handle GC errors gracefully', () => {
      global.gc = vi.fn(() => {
        throw new Error('GC failed');
      });
      
      const gcTriggers = getAutomaticGCTriggers();
      
      // Should not throw an error
      expect(() => {
        gcTriggers.forceGC('error_test');
      }).not.toThrow();
    });

    it('should work when disabled', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: false
      });
      
      const result = gcTriggers.forceGC('disabled_test');
      
      expect(result.triggered).toBe(false);
      expect(result.reason).toBe('disabled');
      expect(gcCallCount).toBe(0);
    });

    it('should handle rapid test execution', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerAfterTests: 2
      });

      // Rapidly execute many tests
      for (let i = 0; i < 20; i++) {
        gcTriggers.onTestStart(`rapid_test_${i}`);
        gcTriggers.onTestEnd(`rapid_test_${i}`, 'passed');
      }

      const stats = gcTriggers.getStats();
      expect(stats.totalTriggers).toBeGreaterThan(0);
      expect(gcCallCount).toBeGreaterThan(0);
    });
  });

  describe('Integration with Test Lifecycle', () => {
    it('should integrate properly with test lifecycle events', () => {
      const gcTriggers = initializeAutomaticGCTriggers({
        enabled: true,
        triggerAfterTests: 3,
        triggerBetweenSuites: true
      });

      // Simulate complete test lifecycle
      gcTriggers.onSuiteStart('integration-suite');
      
      gcTriggers.onTestStart('test1', 'integration-suite');
      gcTriggers.onTestEnd('test1', 'passed');
      
      gcTriggers.onTestStart('test2', 'integration-suite');
      gcTriggers.onTestEnd('test2', 'failed');
      
      gcTriggers.onTestStart('test3', 'integration-suite');
      gcTriggers.onTestEnd('test3', 'passed');
      
      gcTriggers.onSuiteEnd('integration-suite');
      
      const stats = gcTriggers.getStats();
      expect(stats.totalTriggers).toBeGreaterThan(0);
      
      // Should have triggers for various reasons
      const reasons = Object.keys(stats.triggersByReason);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it('should reset statistics properly', () => {
      const gcTriggers = getAutomaticGCTriggers();
      
      // Generate some activity
      gcTriggers.forceGC('reset_test');
      gcTriggers.onTestStart('test1');
      
      let stats = gcTriggers.getStats();
      expect(stats.totalTriggers).toBeGreaterThan(0);
      
      // Reset
      gcTriggers.reset();
      
      stats = gcTriggers.getStats();
      expect(stats.totalTriggers).toBe(0);
      expect(Object.keys(stats.triggersByReason)).toHaveLength(0);
    });
  });

  describe('Performance and Memory Impact', () => {
    it('should have minimal performance impact', () => {
      const gcTriggers = getAutomaticGCTriggers();
      
      const startTime = Date.now();
      
      // Simulate many test events
      for (let i = 0; i < 100; i++) {
        gcTriggers.onTestStart(`perf_test_${i}`);
        gcTriggers.onTestEnd(`perf_test_${i}`, 'passed');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 150ms for 100 tests)
      expect(duration).toBeLessThan(150);
    });

    it('should not cause memory leaks in trigger system itself', () => {
      const gcTriggers = getAutomaticGCTriggers();
      const startMemory = process.memoryUsage().heapUsed;
      
      // Generate lots of activity
      for (let i = 0; i < 1000; i++) {
        gcTriggers.onTestStart(`leak_test_${i}`);
        gcTriggers.onTestEnd(`leak_test_${i}`, 'passed');
        
        if (i % 100 === 0) {
          gcTriggers.forceGC(`batch_${i}`);
        }
      }
      
      // Force cleanup
      gcTriggers.reset();
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;
      
      // Memory growth should be reasonable (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });
});