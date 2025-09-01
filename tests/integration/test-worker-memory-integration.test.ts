/**
 * Test Worker Memory Integration Tests
 * 
 * Integration tests for test worker memory monitoring and tracking
 * in a real test environment.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  getCurrentTestMemoryUsage,
  forceTestMemoryCleanup,
  getTestMemoryReport,
  isMemoryWithinLimits,
  getCurrentTestSnapshot,
  monitorMemoryDuringOperation
} from '../../tests/setup/test-worker-memory-setup.js';

describe('Test Worker Memory Integration', () => {
  describe('memory monitoring utilities', () => {
    it('should get current memory usage', () => {
      const usage = getCurrentTestMemoryUsage();
      
      expect(usage).toBeDefined();
      expect(usage.heapUsed).toBeTypeOf('number');
      expect(usage.heapTotal).toBeTypeOf('number');
      expect(usage.rss).toBeTypeOf('number');
      expect(usage.external).toBeTypeOf('number');
      expect(usage.timestamp).toBeTypeOf('number');
      expect(usage.formattedHeapUsed).toContain('MB');
      expect(usage.formattedHeapTotal).toContain('MB');
      expect(usage.usagePercentage).toBeTypeOf('number');
      expect(typeof usage.isWarning).toBe('boolean');
      expect(typeof usage.isCritical).toBe('boolean');
      expect(typeof usage.isOverLimit).toBe('boolean');
    });

    it('should check if memory is within limits', () => {
      const withinLimits = isMemoryWithinLimits();
      expect(typeof withinLimits).toBe('boolean');
    });

    it('should force memory cleanup', async () => {
      const beforeCleanup = getCurrentTestMemoryUsage();
      
      await forceTestMemoryCleanup();
      
      const afterCleanup = getCurrentTestMemoryUsage();
      
      // Memory usage should be measured (exact values may vary)
      expect(beforeCleanup).toBeDefined();
      expect(afterCleanup).toBeDefined();
    });

    it('should get memory report', () => {
      const report = getTestMemoryReport();
      
      expect(typeof report).toBe('string');
      expect(report).toContain('Memory Report');
      expect(report).toContain('Current Usage:');
    });

    it('should get current test snapshot', () => {
      const snapshot = getCurrentTestSnapshot();
      
      // Snapshot may or may not exist depending on test setup
      if (snapshot) {
        expect(snapshot.testName).toBeDefined();
        expect(snapshot.startMemory).toBeDefined();
        expect(snapshot.status).toBeDefined();
        expect(snapshot.startTime).toBeTypeOf('number');
      }
    });
  });

  describe('memory monitoring during operations', () => {
    it('should monitor memory during synchronous operation', async () => {
      const result = await monitorMemoryDuringOperation('sync-operation', () => {
        // Simulate some work
        const data = new Array(1000).fill('test-data');
        return data.length;
      });
      
      expect(result).toBe(1000);
    });

    it('should monitor memory during asynchronous operation', async () => {
      const result = await monitorMemoryDuringOperation('async-operation', async () => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        const data = new Array(500).fill('async-test-data');
        return data.length;
      });
      
      expect(result).toBe(500);
    });

    it('should handle operation errors', async () => {
      await expect(
        monitorMemoryDuringOperation('error-operation', () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should monitor memory during memory-intensive operation', async () => {
      const result = await monitorMemoryDuringOperation('memory-intensive', () => {
        // Create larger data structures
        const largeArray = new Array(10000).fill(0).map((_, i) => ({
          id: i,
          data: `test-data-${i}`,
          timestamp: Date.now(),
          metadata: {
            index: i,
            processed: false,
            tags: [`tag-${i}`, `category-${i % 10}`]
          }
        }));
        
        // Process the data
        const processed = largeArray.map(item => ({
          ...item,
          metadata: { ...item.metadata, processed: true }
        }));
        
        return processed.length;
      });
      
      expect(result).toBe(10000);
    });
  });

  describe('memory behavior during test execution', () => {
    it('should track memory usage throughout test lifecycle', () => {
      const initialUsage = getCurrentTestMemoryUsage();
      
      // Simulate test work that uses memory
      const testData = new Array(1000).fill(0).map((_, i) => ({
        id: i,
        content: `test-content-${i}`,
        timestamp: Date.now()
      }));
      
      const midTestUsage = getCurrentTestMemoryUsage();
      
      // Clear test data
      testData.length = 0;
      
      const finalUsage = getCurrentTestMemoryUsage();
      
      expect(initialUsage.heapUsed).toBeTypeOf('number');
      expect(midTestUsage.heapUsed).toBeTypeOf('number');
      expect(finalUsage.heapUsed).toBeTypeOf('number');
      
      // Memory usage should have changed during the test
      expect(midTestUsage.heapUsed).toBeGreaterThanOrEqual(initialUsage.heapUsed);
    });

    it('should handle memory cleanup during test', async () => {
      // Create some memory usage
      const largeData = new Array(5000).fill(0).map((_, i) => `large-test-data-item-${i}`);
      
      const beforeCleanup = getCurrentTestMemoryUsage();
      
      // Force cleanup
      await forceTestMemoryCleanup();
      
      const afterCleanup = getCurrentTestMemoryUsage();
      
      // Clear our test data
      largeData.length = 0;
      
      expect(beforeCleanup).toBeDefined();
      expect(afterCleanup).toBeDefined();
    });

    it('should maintain memory monitoring state across operations', () => {
      const usage1 = getCurrentTestMemoryUsage();
      const withinLimits1 = isMemoryWithinLimits();
      
      // Perform some operations
      const tempData = new Array(2000).fill('temp-data');
      
      const usage2 = getCurrentTestMemoryUsage();
      const withinLimits2 = isMemoryWithinLimits();
      
      // Clear temp data
      tempData.length = 0;
      
      const usage3 = getCurrentTestMemoryUsage();
      const withinLimits3 = isMemoryWithinLimits();
      
      // All measurements should be valid
      expect(usage1).toBeDefined();
      expect(usage2).toBeDefined();
      expect(usage3).toBeDefined();
      expect(typeof withinLimits1).toBe('boolean');
      expect(typeof withinLimits2).toBe('boolean');
      expect(typeof withinLimits3).toBe('boolean');
    });
  });

  describe('memory reporting and analysis', () => {
    it('should generate detailed memory report', () => {
      // Perform some memory operations
      const testData1 = new Array(1000).fill('data-1');
      const report1 = getTestMemoryReport();
      
      const testData2 = new Array(2000).fill('data-2');
      const report2 = getTestMemoryReport();
      
      // Clear test data
      testData1.length = 0;
      testData2.length = 0;
      
      expect(report1).toContain('Memory Report');
      expect(report2).toContain('Memory Report');
      
      // Reports should contain memory usage information
      expect(report1).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB)/);
      expect(report2).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB)/);
    });

    it('should track memory history', () => {
      const initialReport = getTestMemoryReport();
      
      // Create and clear some data multiple times
      for (let i = 0; i < 3; i++) {
        const tempData = new Array(500).fill(`iteration-${i}`);
        getCurrentTestMemoryUsage(); // Force measurement
        tempData.length = 0; // Clear data
      }
      
      const finalReport = getTestMemoryReport();
      
      expect(initialReport).toBeDefined();
      expect(finalReport).toBeDefined();
      
      // Reports should show memory tracking
      expect(finalReport).toContain('Memory Report');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle memory monitoring with no active test', () => {
      // These should work even without active test context
      const usage = getCurrentTestMemoryUsage();
      const withinLimits = isMemoryWithinLimits();
      const report = getTestMemoryReport();
      
      expect(usage).toBeDefined();
      expect(typeof withinLimits).toBe('boolean');
      expect(typeof report).toBe('string');
    });

    it('should handle cleanup errors gracefully', async () => {
      // Force cleanup should not throw even if there are issues
      await expect(forceTestMemoryCleanup()).resolves.toBeUndefined();
    });

    it('should handle concurrent memory operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) =>
        monitorMemoryDuringOperation(`concurrent-op-${i}`, async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          return new Array(100).fill(`data-${i}`).length;
        })
      );
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe(100);
      });
    });
  });

  describe('performance and scalability', () => {
    it('should handle frequent memory measurements efficiently', () => {
      const startTime = Date.now();
      
      // Take many memory measurements
      for (let i = 0; i < 100; i++) {
        getCurrentTestMemoryUsage();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 1 second for 100 measurements)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle large memory operations', async () => {
      await monitorMemoryDuringOperation('large-operation', () => {
        // Create larger data structure
        const largeData = new Array(20000).fill(0).map((_, i) => ({
          id: i,
          data: new Array(10).fill(`item-${i}`),
          metadata: {
            created: Date.now(),
            index: i,
            category: `cat-${i % 100}`
          }
        }));
        
        // Process the data
        const processed = largeData.filter(item => item.id % 2 === 0);
        
        // Clear data
        largeData.length = 0;
        
        return processed.length;
      });
    });

    it('should maintain performance with memory tracking enabled', () => {
      const iterations = 1000;
      const startTime = Date.now();
      
      // Perform operations with memory tracking
      for (let i = 0; i < iterations; i++) {
        const data = new Array(10).fill(`item-${i}`);
        getCurrentTestMemoryUsage();
        data.length = 0;
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTimePerIteration = duration / iterations;
      
      // Should maintain reasonable performance (less than 1ms per iteration)
      expect(avgTimePerIteration).toBeLessThan(1);
    });
  });
});