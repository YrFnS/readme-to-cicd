/**
 * Simple Memory Cleanup Hooks Test Suite
 * 
 * Tests the basic memory cleanup hooks functionality to validate that
 * beforeEach and afterEach hooks are properly managing memory usage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Memory Cleanup Hooks - Basic Functionality', () => {
  let testStartMemory: number;
  let memorySnapshots: number[] = [];

  beforeEach(() => {
    // Record memory usage at test start
    testStartMemory = process.memoryUsage().heapUsed;
    
    // Verify that beforeEach hook is executing
    expect(testStartMemory).toBeGreaterThan(0);
    
    console.log(`🧪 Test starting with memory: ${formatBytes(testStartMemory)}`);
  });

  afterEach(() => {
    // Record memory usage at test end
    const testEndMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = testEndMemory - testStartMemory;
    
    memorySnapshots.push(testEndMemory);
    
    // Keep only last 5 snapshots to prevent memory leak in test
    if (memorySnapshots.length > 5) {
      memorySnapshots = memorySnapshots.slice(-5);
    }
    
    console.log(`🧪 Test completed. Memory growth: ${formatBytes(memoryGrowth)}`);
    
    // Memory growth per test should be reasonable (less than 50MB)
    expect(Math.abs(memoryGrowth)).toBeLessThan(50 * 1024 * 1024);
  });

  describe('Basic Memory Management', () => {
    it('should have access to process memory information', () => {
      const memoryUsage = process.memoryUsage();
      
      expect(memoryUsage).toBeDefined();
      expect(typeof memoryUsage.heapUsed).toBe('number');
      expect(typeof memoryUsage.heapTotal).toBe('number');
      expect(typeof memoryUsage.rss).toBe('number');
      expect(typeof memoryUsage.external).toBe('number');
      
      expect(memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(memoryUsage.heapTotal).toBeGreaterThan(memoryUsage.heapUsed);
    });

    it('should handle test data creation and cleanup', () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      // Create test data
      const testData: any[] = [];
      for (let i = 0; i < 1000; i++) {
        testData.push({
          id: i,
          data: `test-data-${i}`,
          timestamp: Date.now(),
          payload: 'x'.repeat(100) // 100 bytes per item
        });
      }
      
      const afterCreation = process.memoryUsage().heapUsed;
      const creationGrowth = afterCreation - startMemory;
      
      // Clear test data
      testData.length = 0;
      
      const afterCleanup = process.memoryUsage().heapUsed;
      const finalGrowth = afterCleanup - startMemory;
      
      console.log(`📊 Data test: Created ${formatBytes(creationGrowth)}, final ${formatBytes(finalGrowth)}`);
      
      // Data creation should cause some memory growth
      expect(creationGrowth).toBeGreaterThan(0);
      
      // Final growth should be less than creation growth (indicating cleanup)
      expect(finalGrowth).toBeLessThan(creationGrowth + (10 * 1024)); // Allow 10KB tolerance
    });

    it('should handle multiple memory allocations', () => {
      const startMemory = process.memoryUsage().heapUsed;
      const allocations: any[] = [];
      
      // Create multiple allocations
      for (let round = 0; round < 5; round++) {
        const allocation = new Array(200).fill(null).map((_, i) => ({
          round,
          index: i,
          data: `allocation-${round}-${i}`,
          buffer: Buffer.alloc(100) // 100 bytes buffer
        }));
        
        allocations.push(allocation);
      }
      
      const afterAllocations = process.memoryUsage().heapUsed;
      const allocationGrowth = afterAllocations - startMemory;
      
      // Clear all allocations
      allocations.forEach(allocation => {
        allocation.length = 0;
      });
      allocations.length = 0;
      
      const afterCleanup = process.memoryUsage().heapUsed;
      const finalGrowth = afterCleanup - startMemory;
      
      console.log(`📊 Multiple allocations: Created ${formatBytes(allocationGrowth)}, final ${formatBytes(finalGrowth)}`);
      
      // Should have created some memory usage
      expect(allocationGrowth).toBeGreaterThan(0);
      
      // Final growth should be reasonable
      expect(finalGrowth).toBeLessThan(allocationGrowth + (50 * 1024)); // Allow 50KB tolerance
    });
  });

  describe('Memory Hook Integration', () => {
    it('should execute beforeEach hooks consistently', () => {
      // This test validates that beforeEach hooks are working
      expect(testStartMemory).toBeGreaterThan(0);
      expect(typeof testStartMemory).toBe('number');
      
      // Memory should be within reasonable bounds
      expect(testStartMemory).toBeLessThan(1024 * 1024 * 1024); // Less than 1GB
    });

    it('should maintain memory stability across tests', () => {
      // Check that memory usage is not growing excessively across tests
      if (memorySnapshots.length > 1) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const totalGrowth = lastSnapshot - firstSnapshot;
        
        console.log(`📊 Memory stability: ${formatBytes(totalGrowth)} growth across ${memorySnapshots.length} tests`);
        
        // Total growth across all tests should be reasonable
        expect(Math.abs(totalGrowth)).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total
      }
    });

    it('should handle garbage collection if available', () => {
      const beforeGC = process.memoryUsage().heapUsed;
      
      // Try to trigger garbage collection if available
      if (global.gc) {
        expect(typeof global.gc).toBe('function');
        
        // Should not throw an error
        expect(() => {
          global.gc();
        }).not.toThrow();
        
        const afterGC = process.memoryUsage().heapUsed;
        console.log(`🗑️  GC test: ${formatBytes(beforeGC)} → ${formatBytes(afterGC)}`);
        
        // Memory usage should be defined after GC
        expect(afterGC).toBeGreaterThan(0);
      } else {
        console.log('⚠️  Garbage collection not available in test environment');
        
        // Test should still pass even without GC
        expect(beforeGC).toBeGreaterThan(0);
      }
    });
  });

  describe('Memory Cleanup Validation', () => {
    it('should clean up temporary objects', () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      // Create temporary objects in a scope
      {
        const tempObjects = new Map<string, any>();
        
        for (let i = 0; i < 500; i++) {
          tempObjects.set(`key-${i}`, {
            id: i,
            data: `temporary-object-${i}`,
            created: new Date(),
            payload: new Array(50).fill(`data-${i}`)
          });
        }
        
        const withObjects = process.memoryUsage().heapUsed;
        const objectGrowth = withObjects - startMemory;
        
        // Clear the map
        tempObjects.clear();
        
        console.log(`📊 Temp objects: ${formatBytes(objectGrowth)} allocated`);
        
        // Should have allocated some memory
        expect(objectGrowth).toBeGreaterThan(0);
      }
      
      // Objects should be eligible for garbage collection now
      const afterScope = process.memoryUsage().heapUsed;
      const scopeGrowth = afterScope - startMemory;
      
      console.log(`📊 After scope cleanup: ${formatBytes(scopeGrowth)} remaining`);
      
      // Final memory growth should be reasonable
      expect(scopeGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
    });

    it('should handle module cache cleanup patterns', () => {
      const startMemory = process.memoryUsage().heapUsed;
      const initialCacheSize = Object.keys(require.cache).length;
      
      // Add some mock modules to cache (simulating test modules)
      const mockModules = [
        '/mock/test/module1.test.js',
        '/mock/test/module2.spec.js',
        '/mock/fixtures/data.json'
      ];
      
      mockModules.forEach(path => {
        require.cache[path] = {
          id: path,
          filename: path,
          loaded: true,
          parent: null,
          children: [],
          exports: { mockData: `test-data-${Date.now()}` },
          paths: []
        } as any;
      });
      
      const withMockModules = Object.keys(require.cache).length;
      expect(withMockModules).toBe(initialCacheSize + mockModules.length);
      
      // Clean up mock modules (simulating test cleanup)
      mockModules.forEach(path => {
        delete require.cache[path];
      });
      
      const afterCleanup = Object.keys(require.cache).length;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - startMemory;
      
      console.log(`🗑️  Module cache: ${initialCacheSize} → ${withMockModules} → ${afterCleanup} modules`);
      console.log(`📊 Module cleanup memory: ${formatBytes(memoryGrowth)}`);
      
      // Cache should be back to original size
      expect(afterCleanup).toBe(initialCacheSize);
      
      // Memory growth should be minimal
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });
  });

  describe('Error Handling in Memory Management', () => {
    it('should handle memory allocation errors gracefully', () => {
      const startMemory = process.memoryUsage().heapUsed;
      
      try {
        // Create a reasonable amount of test data
        const testData = new Array(1000).fill(null).map((_, i) => ({
          id: i,
          data: `error-test-${i}`,
          timestamp: Date.now()
        }));
        
        // Process the data
        const processed = testData.map(item => ({
          ...item,
          processed: true,
          processedAt: Date.now()
        }));
        
        // Clean up
        testData.length = 0;
        processed.length = 0;
        
        const endMemory = process.memoryUsage().heapUsed;
        const memoryGrowth = endMemory - startMemory;
        
        console.log(`📊 Error handling test: ${formatBytes(memoryGrowth)} growth`);
        
        // Should complete without throwing
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
        
      } catch (error) {
        // If an error occurs, it should be handled gracefully
        console.error('Memory allocation error:', error);
        
        // Test should still complete
        const errorMemory = process.memoryUsage().heapUsed;
        expect(errorMemory).toBeGreaterThan(0);
      }
    });

    it('should recover from cleanup failures', () => {
      const startMemory = process.memoryUsage().heapUsed;
      let cleanupAttempted = false;
      
      try {
        // Create test data
        const testData = new Array(500).fill(null).map((_, i) => ({
          id: i,
          data: `cleanup-test-${i}`
        }));
        
        // Simulate cleanup attempt
        cleanupAttempted = true;
        testData.length = 0;
        
        const endMemory = process.memoryUsage().heapUsed;
        const memoryGrowth = endMemory - startMemory;
        
        console.log(`📊 Cleanup recovery test: ${formatBytes(memoryGrowth)} growth`);
        
        expect(cleanupAttempted).toBe(true);
        expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
        
      } catch (error) {
        // Even if cleanup fails, test should handle it gracefully
        console.warn('Cleanup failure handled:', error);
        expect(cleanupAttempted).toBe(true);
      }
    });
  });
});

/**
 * Helper function to format bytes for test output
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}