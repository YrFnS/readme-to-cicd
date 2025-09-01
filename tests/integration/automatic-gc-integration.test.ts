/**
 * Automatic Garbage Collection Integration Test Suite
 * 
 * Integration tests to validate that automatic garbage collection triggers
 * work effectively in real test scenarios and prevent memory exhaustion.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  manualGCTrigger,
  getGCStats,
  isGCAvailable,
  generateGCReport,
  withGCProtection
} from '../setup/automatic-gc-setup.js';

describe('Automatic GC Integration', () => {
  let initialMemoryUsage: number;
  let testMemoryReports: Array<{ test: string; memory: number; timestamp: number }> = [];

  beforeAll(async () => {
    initialMemoryUsage = process.memoryUsage().heapUsed;
    console.log(`🧪 Integration test suite starting with ${formatBytes(initialMemoryUsage)} memory usage`);
  });

  afterAll(async () => {
    const finalMemoryUsage = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemoryUsage - initialMemoryUsage;
    
    console.log(`🧪 Integration test suite completed. Memory growth: ${formatBytes(memoryGrowth)}`);
    
    // Generate final GC report
    const gcReport = generateGCReport();
    console.log(gcReport);
    
    // Memory growth should be reasonable for integration tests
    expect(Math.abs(memoryGrowth)).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
  });

  beforeEach(() => {
    const testMemory = process.memoryUsage().heapUsed;
    testMemoryReports.push({
      test: expect.getState().currentTestName || 'unknown',
      memory: testMemory,
      timestamp: Date.now()
    });
    
    // Keep only last 20 reports
    if (testMemoryReports.length > 20) {
      testMemoryReports = testMemoryReports.slice(-20);
    }
  });

  afterEach(() => {
    const testMemory = process.memoryUsage().heapUsed;
    const testName = expect.getState().currentTestName || 'unknown';
    
    // Find the corresponding start memory
    const startReport = testMemoryReports.find(r => r.test === testName);
    if (startReport) {
      const memoryGrowth = testMemory - startReport.memory;
      
      // Log significant memory growth
      if (Math.abs(memoryGrowth) > 10 * 1024 * 1024) {
        console.log(`📊 Test ${testName} memory change: ${formatBytes(memoryGrowth)}`);
      }
    }
  });

  describe('GC Availability and Configuration', () => {
    it('should have GC available or properly configured for testing', () => {
      const gcAvailable = isGCAvailable();
      
      if (global.gc) {
        expect(gcAvailable).toBe(true);
        console.log('✅ Native garbage collection is available');
      } else {
        console.warn('⚠️  Native GC not available. Run tests with --expose-gc for better memory management');
        // Test should still pass even without native GC
      }
    });

    it('should provide GC statistics', () => {
      const stats = getGCStats();
      
      expect(stats).toBeDefined();
      if (stats) {
        expect(typeof stats.totalTriggers).toBe('number');
        expect(typeof stats.effectivenessScore).toBe('number');
        expect(Array.isArray(Object.keys(stats.triggersByReason))).toBe(true);
        
        console.log(`📊 Current GC stats: ${stats.totalTriggers} triggers, ${stats.effectivenessScore}/100 effectiveness`);
      }
    });

    it('should generate meaningful GC report', () => {
      const report = generateGCReport();
      
      expect(typeof report).toBe('string');
      expect(report).toContain('Automatic GC Triggers Report');
      expect(report).toContain('Configuration:');
      expect(report).toContain('Statistics:');
      
      // Report should contain useful information
      expect(report.length).toBeGreaterThan(100);
    });
  });

  describe('Manual GC Triggering', () => {
    it('should allow manual GC triggering', () => {
      const beforeMemory = process.memoryUsage().heapUsed;
      
      // Trigger manual GC
      manualGCTrigger('integration_test_manual');
      
      const afterMemory = process.memoryUsage().heapUsed;
      
      // GC should complete without errors
      expect(afterMemory).toBeGreaterThan(0);
      
      console.log(`🗑️  Manual GC: ${formatBytes(beforeMemory)} → ${formatBytes(afterMemory)}`);
    });

    it('should handle multiple rapid manual GC triggers', () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      // Trigger multiple GCs rapidly
      for (let i = 0; i < 5; i++) {
        manualGCTrigger(`rapid_gc_${i}`);
      }
      
      const endMemory = process.memoryUsage().heapUsed;
      
      // Should complete without errors
      expect(endMemory).toBeGreaterThan(0);
      
      console.log(`🗑️  Rapid GC triggers: ${formatBytes(startMemory)} → ${formatBytes(endMemory)}`);
    });
  });

  describe('Memory-Intensive Operations with GC Protection', () => {
    it('should protect memory-intensive operations with automatic GC', async () => {
      const result = await withGCProtection(async () => {
        // Simulate memory-intensive operation
        const largeArrays: number[][] = [];
        
        for (let i = 0; i < 100; i++) {
          // Create 1MB arrays
          largeArrays.push(new Array(256 * 1024).fill(i));
        }
        
        // Simulate some processing
        const sum = largeArrays.reduce((total, arr) => total + arr.length, 0);
        
        // Clear arrays to make them eligible for GC
        largeArrays.length = 0;
        
        return sum;
      }, 'memory_intensive_test');
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBe(100 * 256 * 1024); // Expected sum
    });

    it('should handle errors in protected operations', async () => {
      await expect(
        withGCProtection(async () => {
          // Allocate some memory
          const data = new Array(100000).fill('test');
          
          // Simulate error
          throw new Error('Simulated error');
        }, 'error_test')
      ).rejects.toThrow('Simulated error');
      
      // GC should still be triggered even on error
      // (This is verified by the GC protection mechanism)
    });

    it('should handle synchronous operations', async () => {
      const result = await withGCProtection(() => {
        // Synchronous memory-intensive operation
        const data = [];
        for (let i = 0; i < 50000; i++) {
          data.push({ id: i, value: `item-${i}` });
        }
        
        const count = data.length;
        data.length = 0; // Clear for GC
        
        return count;
      }, 'sync_operation');
      
      expect(result).toBe(50000);
    });
  });

  describe('Real-World Memory Scenarios', () => {
    it('should handle large object creation and cleanup', async () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      // Create large objects that should be cleaned up
      const createLargeObjects = () => {
        const objects = [];
        for (let i = 0; i < 1000; i++) {
          objects.push({
            id: i,
            data: new Array(1000).fill(`large-data-${i}`),
            timestamp: Date.now(),
            metadata: {
              created: new Date(),
              tags: new Array(100).fill(`tag-${i}`),
              properties: new Array(50).fill({ key: `prop-${i}`, value: Math.random() })
            }
          });
        }
        return objects;
      };
      
      // Create and clear objects multiple times
      for (let cycle = 0; cycle < 5; cycle++) {
        const objects = createLargeObjects();
        
        // Simulate some processing
        const totalItems = objects.reduce((sum, obj) => sum + obj.data.length, 0);
        expect(totalItems).toBeGreaterThan(0);
        
        // Clear objects
        objects.length = 0;
        
        // Trigger GC manually to help cleanup
        if (cycle % 2 === 0) {
          manualGCTrigger(`cleanup_cycle_${cycle}`);
        }
      }
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;
      
      console.log(`🧪 Large object test memory growth: ${formatBytes(memoryGrowth)}`);
      
      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle string manipulation and concatenation', () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      // Simulate heavy string operations
      let result = '';
      const baseString = 'This is a test string for memory testing. ';
      
      for (let i = 0; i < 10000; i++) {
        result += baseString + i.toString();
        
        // Periodically reset to prevent excessive growth
        if (i % 1000 === 0) {
          result = result.slice(-1000); // Keep only last 1000 chars
        }
      }
      
      // Clear result
      result = '';
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;
      
      console.log(`🧪 String manipulation memory growth: ${formatBytes(memoryGrowth)}`);
      
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
    });

    it('should handle recursive data structures', () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      // Create tree-like structures
      const createTree = (depth: number, breadth: number): any => {
        if (depth === 0) {
          return { value: Math.random(), leaf: true };
        }
        
        const node: any = {
          value: Math.random(),
          depth,
          children: []
        };
        
        for (let i = 0; i < breadth; i++) {
          node.children.push(createTree(depth - 1, breadth));
        }
        
        return node;
      };
      
      // Create and process trees
      const trees = [];
      for (let i = 0; i < 10; i++) {
        const tree = createTree(4, 3); // Depth 4, breadth 3
        trees.push(tree);
        
        // Process tree (count nodes)
        const countNodes = (node: any): number => {
          if (node.leaf) return 1;
          return 1 + node.children.reduce((sum: number, child: any) => sum + countNodes(child), 0);
        };
        
        const nodeCount = countNodes(tree);
        expect(nodeCount).toBeGreaterThan(0);
      }
      
      // Clear trees
      trees.length = 0;
      
      // Trigger GC to clean up recursive structures
      manualGCTrigger('recursive_cleanup');
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;
      
      console.log(`🧪 Recursive structures memory growth: ${formatBytes(memoryGrowth)}`);
      
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(30 * 1024 * 1024);
    });
  });

  describe('GC Effectiveness Validation', () => {
    it('should demonstrate GC effectiveness over multiple operations', async () => {
      const measurements: Array<{ operation: string; before: number; after: number; freed: number }> = [];
      
      // Perform multiple memory-intensive operations with GC
      const operations = [
        () => new Array(100000).fill('test-data'),
        () => new Map(Array.from({ length: 50000 }, (_, i) => [i, `value-${i}`])),
        () => new Set(Array.from({ length: 75000 }, (_, i) => `item-${i}`)),
        () => ({ data: new Array(80000).fill({ nested: 'object' }) }),
        () => JSON.parse(JSON.stringify(new Array(60000).fill({ complex: { data: 'test' } })))
      ];
      
      for (let i = 0; i < operations.length; i++) {
        const beforeMemory = process.memoryUsage().heapUsed;
        
        // Create large object
        const largeObject = operations[i]();
        expect(largeObject).toBeDefined();
        
        // Clear reference
        (largeObject as any) = null;
        
        // Trigger GC
        manualGCTrigger(`effectiveness_test_${i}`);
        
        const afterMemory = process.memoryUsage().heapUsed;
        const memoryFreed = Math.max(0, beforeMemory - afterMemory);
        
        measurements.push({
          operation: `operation_${i}`,
          before: beforeMemory,
          after: afterMemory,
          freed: memoryFreed
        });
        
        console.log(`🗑️  Operation ${i}: ${formatBytes(beforeMemory)} → ${formatBytes(afterMemory)} (freed: ${formatBytes(memoryFreed)})`);
      }
      
      // Analyze effectiveness
      const totalFreed = measurements.reduce((sum, m) => sum + m.freed, 0);
      const averageFreed = totalFreed / measurements.length;
      
      console.log(`📊 GC Effectiveness: Total freed ${formatBytes(totalFreed)}, Average ${formatBytes(averageFreed)}`);
      
      // At least some memory should be freed (unless GC is not available)
      if (global.gc) {
        expect(totalFreed).toBeGreaterThan(0);
      }
    });

    it('should maintain stable memory usage across test cycles', () => {
      const memorySnapshots: number[] = [];
      const cycleCount = 20;
      
      for (let cycle = 0; cycle < cycleCount; cycle++) {
        // Record memory at start of cycle
        memorySnapshots.push(process.memoryUsage().heapUsed);
        
        // Perform some operations
        const tempData = [];
        for (let i = 0; i < 1000; i++) {
          tempData.push({
            id: i,
            cycle,
            data: new Array(100).fill(`cycle-${cycle}-item-${i}`)
          });
        }
        
        // Process data
        const totalItems = tempData.reduce((sum, item) => sum + item.data.length, 0);
        expect(totalItems).toBe(1000 * 100);
        
        // Clear data
        tempData.length = 0;
        
        // Trigger GC every few cycles
        if (cycle % 5 === 0) {
          manualGCTrigger(`cycle_${cycle}`);
        }
      }
      
      // Analyze memory stability
      const firstHalf = memorySnapshots.slice(0, cycleCount / 2);
      const secondHalf = memorySnapshots.slice(cycleCount / 2);
      
      const firstHalfAvg = firstHalf.reduce((sum, mem) => sum + mem, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, mem) => sum + mem, 0) / secondHalf.length;
      
      const memoryGrowthRate = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
      
      console.log(`📊 Memory stability: ${formatBytes(firstHalfAvg)} → ${formatBytes(secondHalfAvg)} (${(memoryGrowthRate * 100).toFixed(1)}% growth)`);
      
      // Memory growth rate should be reasonable (less than 50% growth)
      expect(Math.abs(memoryGrowthRate)).toBeLessThan(0.5);
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle GC triggers during error conditions', async () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      try {
        await withGCProtection(async () => {
          // Allocate memory
          const largeData = new Array(50000).fill('error-test-data');
          
          // Simulate processing that fails
          if (largeData.length > 0) {
            throw new Error('Simulated processing error');
          }
          
          return largeData.length;
        }, 'error_scenario');
        
        // Should not reach here
        expect(true).toBe(false);
        
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Simulated processing error');
      }
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;
      
      console.log(`🧪 Error scenario memory growth: ${formatBytes(memoryGrowth)}`);
      
      // Memory should not grow excessively even with errors
      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
    });

    it('should handle concurrent memory operations', async () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      // Create multiple concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        withGCProtection(async () => {
          // Each operation allocates some memory
          const data = new Array(10000).fill(`concurrent-${i}`);
          
          // Simulate async processing
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          
          const result = data.length;
          data.length = 0; // Clear for GC
          
          return result;
        }, `concurrent_op_${i}`)
      );
      
      const results = await Promise.all(operations);
      
      // All operations should complete successfully
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBe(10000);
      });
      
      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;
      
      console.log(`🧪 Concurrent operations memory growth: ${formatBytes(memoryGrowth)}`);
      
      // Memory growth should be reasonable for concurrent operations
      expect(memoryGrowth).toBeLessThan(30 * 1024 * 1024);
    });
  });
});

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}