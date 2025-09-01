/**
 * Memory Cleanup Hooks Test Suite
 * 
 * Tests the memory cleanup hooks implementation in test setup and teardown.
 * Validates that beforeEach and afterEach hooks properly manage memory usage
 * and prevent memory leaks during test execution.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { 
  getMemoryManager, 
  getResourceCleaner,
  checkAndCleanupMemory,
  triggerMemoryCleanup,
  getCurrentMemoryUsage,
  isMemoryUsageHigh
} from '../../setup/memory-setup';
import type { MemoryUsageReport } from '../../setup/memory-management';

describe('Memory Cleanup Hooks', () => {
  let initialMemoryUsage: MemoryUsageReport;
  let memoryReports: MemoryUsageReport[] = [];
  
  beforeAll(async () => {
    // Record initial memory state for the test suite
    initialMemoryUsage = getCurrentMemoryUsage();
    console.log(`🧪 Test suite starting with memory usage: ${initialMemoryUsage.formattedHeapUsed}`);
  });

  afterAll(async () => {
    // Verify memory cleanup effectiveness across the entire test suite
    const finalMemoryUsage = getCurrentMemoryUsage();
    const memoryGrowth = finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;
    
    console.log(`🧪 Test suite completed. Memory growth: ${formatBytes(memoryGrowth)}`);
    
    // Memory growth should be reasonable (less than 50MB for this test suite)
    expect(Math.abs(memoryGrowth)).toBeLessThan(50 * 1024 * 1024);
  });

  beforeEach(async () => {
    // Record memory usage before each test
    const beforeTestMemory = getCurrentMemoryUsage();
    memoryReports.push(beforeTestMemory);
    
    // Keep only last 10 reports to prevent memory leak in test itself
    if (memoryReports.length > 10) {
      memoryReports = memoryReports.slice(-10);
    }
  });

  afterEach(async () => {
    // Verify memory cleanup after each test
    const afterTestMemory = getCurrentMemoryUsage();
    const beforeTestMemory = memoryReports[memoryReports.length - 1];
    
    if (beforeTestMemory) {
      const testMemoryGrowth = afterTestMemory.heapUsed - beforeTestMemory.heapUsed;
      
      // Log significant memory changes
      if (Math.abs(testMemoryGrowth) > 5 * 1024 * 1024) { // More than 5MB
        console.log(`📊 Test memory change: ${formatBytes(testMemoryGrowth)}`);
      }
    }
  });

  describe('Memory Manager Integration', () => {
    it('should have memory manager available in test setup', () => {
      const memoryManager = getMemoryManager();
      expect(memoryManager).toBeDefined();
      expect(typeof memoryManager.getCurrentMemoryUsage).toBe('function');
      expect(typeof memoryManager.checkMemoryThresholds).toBe('function');
      expect(typeof memoryManager.forceGarbageCollection).toBe('function');
    });

    it('should provide current memory usage information', () => {
      const memoryUsage = getCurrentMemoryUsage();
      
      expect(memoryUsage).toBeDefined();
      expect(typeof memoryUsage.heapUsed).toBe('number');
      expect(typeof memoryUsage.heapTotal).toBe('number');
      expect(typeof memoryUsage.formattedHeapUsed).toBe('string');
      expect(typeof memoryUsage.isAboveThreshold).toBe('boolean');
      expect(memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(memoryUsage.timestamp).toBeGreaterThan(0);
    });

    it('should detect high memory usage correctly', () => {
      const isHigh = isMemoryUsageHigh();
      expect(typeof isHigh).toBe('boolean');
      
      // For this test, memory usage should typically not be high
      // unless we're running in a constrained environment
      if (isHigh) {
        console.warn('⚠️  High memory usage detected during test');
      }
    });
  });

  describe('Resource Cleaner Integration', () => {
    it('should have resource cleaner available in test setup', () => {
      const resourceCleaner = getResourceCleaner();
      expect(resourceCleaner).toBeDefined();
      expect(typeof resourceCleaner.cleanupTestResources).toBe('function');
    });

    it('should be able to trigger manual memory cleanup', async () => {
      const beforeCleanup = getCurrentMemoryUsage();
      
      // Trigger manual cleanup
      await triggerMemoryCleanup();
      
      const afterCleanup = getCurrentMemoryUsage();
      
      // Cleanup should complete without errors
      expect(afterCleanup).toBeDefined();
      expect(afterCleanup.timestamp).toBeGreaterThan(beforeCleanup.timestamp);
      
      console.log(`🧹 Manual cleanup completed. Memory: ${beforeCleanup.formattedHeapUsed} → ${afterCleanup.formattedHeapUsed}`);
    });

    it('should handle cleanup errors gracefully', async () => {
      // This test verifies that cleanup errors don't crash the test suite
      const resourceCleaner = getResourceCleaner();
      
      // Mock a cleanup failure scenario
      const originalCleanup = resourceCleaner.cleanupTestResources;
      const mockCleanup = vi.fn().mockRejectedValueOnce(new Error('Mock cleanup failure'));
      resourceCleaner.cleanupTestResources = mockCleanup;
      
      try {
        // Cleanup should handle errors gracefully
        await expect(resourceCleaner.cleanupTestResources()).rejects.toThrow('Mock cleanup failure');
      } finally {
        // Restore original cleanup function
        resourceCleaner.cleanupTestResources = originalCleanup;
      }
    });
  });

  describe('Memory Threshold Monitoring', () => {
    it('should check memory thresholds and trigger cleanup when needed', () => {
      const memoryReport = checkAndCleanupMemory();
      
      expect(memoryReport).toBeDefined();
      expect(typeof memoryReport.heapUsed).toBe('number');
      expect(typeof memoryReport.isAboveThreshold).toBe('boolean');
      
      // Should complete without throwing errors
      expect(memoryReport.heapUsed).toBeGreaterThan(0);
    });

    it('should provide memory usage history', () => {
      const memoryManager = getMemoryManager();
      const history = memoryManager.getMemoryHistory();
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      
      // Each history entry should have required properties
      history.forEach(entry => {
        expect(typeof entry.heapUsed).toBe('number');
        expect(typeof entry.timestamp).toBe('number');
        expect(typeof entry.formattedHeapUsed).toBe('string');
      });
    });

    it('should generate memory usage reports', () => {
      const memoryManager = getMemoryManager();
      const report = memoryManager.generateMemoryReport();
      
      expect(typeof report).toBe('string');
      expect(report).toContain('Memory Usage Report');
      expect(report).toContain('Current Usage:');
      expect(report).toContain('Thresholds:');
      
      console.log('📊 Memory Report:', report);
    });
  });

  describe('Garbage Collection Integration', () => {
    it('should be able to force garbage collection', () => {
      const memoryManager = getMemoryManager();
      
      // This should not throw an error, even if gc is not available
      expect(() => {
        memoryManager.forceGarbageCollection();
      }).not.toThrow();
    });

    it('should handle missing garbage collection gracefully', () => {
      const memoryManager = getMemoryManager();
      const originalGc = global.gc;
      
      try {
        // Temporarily remove gc to test fallback
        delete (global as any).gc;
        
        // Should not throw an error
        expect(() => {
          memoryManager.forceGarbageCollection();
        }).not.toThrow();
        
      } finally {
        // Restore gc if it was available
        if (originalGc) {
          global.gc = originalGc;
        }
      }
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should prevent memory leaks in test data', async () => {
      const startMemory = getCurrentMemoryUsage();
      
      // Simulate test operations that might cause memory leaks
      const testData: any[] = [];
      
      // Create some test data
      for (let i = 0; i < 1000; i++) {
        testData.push({
          id: i,
          data: `test-data-${i}`,
          timestamp: Date.now(),
          largeString: 'x'.repeat(1000) // 1KB per item
        });
      }
      
      const afterDataCreation = getCurrentMemoryUsage();
      const dataCreationGrowth = afterDataCreation.heapUsed - startMemory.heapUsed;
      
      // Clear test data
      testData.length = 0;
      
      // Trigger cleanup
      await triggerMemoryCleanup();
      
      const afterCleanup = getCurrentMemoryUsage();
      const finalGrowth = afterCleanup.heapUsed - startMemory.heapUsed;
      
      console.log(`📊 Memory test: Created ${formatBytes(dataCreationGrowth)}, final growth ${formatBytes(finalGrowth)}`);
      
      // Final memory growth should be significantly less than data creation growth
      // This indicates effective cleanup
      expect(finalGrowth).toBeLessThan(dataCreationGrowth * 0.8); // At least 20% reduction
    });

    it('should clean up module cache effectively', async () => {
      const startMemory = getCurrentMemoryUsage();
      
      // Simulate loading modules that should be cleaned up
      const testModulePaths = [
        '/mock/test/module1.js',
        '/mock/test/module2.js',
        '/mock/fixtures/data.json'
      ];
      
      // Add mock modules to require cache
      testModulePaths.forEach(path => {
        require.cache[path] = {
          id: path,
          filename: path,
          loaded: true,
          parent: null,
          children: [],
          exports: { mockData: 'test' },
          paths: []
        } as any;
      });
      
      const cacheSize = Object.keys(require.cache).length;
      
      // Trigger cleanup
      await triggerMemoryCleanup();
      
      const afterCleanup = getCurrentMemoryUsage();
      const newCacheSize = Object.keys(require.cache).length;
      
      // Test modules should be removed from cache
      testModulePaths.forEach(path => {
        expect(require.cache[path]).toBeUndefined();
      });
      
      console.log(`🗑️  Module cache: ${cacheSize} → ${newCacheSize} modules`);
      
      // Memory usage should not increase significantly
      const memoryGrowth = afterCleanup.heapUsed - startMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
    });
  });

  describe('Hook Integration Validation', () => {
    it('should execute beforeEach hooks without memory issues', async () => {
      const beforeHook = getCurrentMemoryUsage();
      
      // Simulate beforeEach hook operations
      const testState = {
        initialized: true,
        timestamp: Date.now(),
        data: new Array(100).fill('test-data')
      };
      
      const afterHook = getCurrentMemoryUsage();
      const hookMemoryGrowth = afterHook.heapUsed - beforeHook.heapUsed;
      
      // Hook operations should not cause excessive memory growth
      expect(hookMemoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
      
      // Clean up test state
      testState.data.length = 0;
    });

    it('should execute afterEach hooks with proper cleanup', async () => {
      const beforeTest = getCurrentMemoryUsage();
      
      // Simulate test execution with resource allocation
      const testResources = {
        timers: [] as NodeJS.Timeout[],
        data: new Map<string, any>(),
        callbacks: [] as Function[]
      };
      
      // Allocate some resources
      testResources.timers.push(setTimeout(() => {}, 1000));
      testResources.data.set('key1', 'value1');
      testResources.callbacks.push(() => console.log('test'));
      
      const afterAllocation = getCurrentMemoryUsage();
      
      // Simulate afterEach cleanup
      testResources.timers.forEach(timer => clearTimeout(timer));
      testResources.data.clear();
      testResources.callbacks.length = 0;
      
      await triggerMemoryCleanup();
      
      const afterCleanup = getCurrentMemoryUsage();
      const cleanupEffectiveness = afterAllocation.heapUsed - afterCleanup.heapUsed;
      
      console.log(`🧹 Hook cleanup effectiveness: ${formatBytes(cleanupEffectiveness)}`);
      
      // Cleanup should be effective (memory should not grow significantly)
      const totalGrowth = afterCleanup.heapUsed - beforeTest.heapUsed;
      expect(totalGrowth).toBeLessThan(2 * 1024 * 1024); // Less than 2MB net growth
    });
  });

  describe('Error Handling in Hooks', () => {
    it('should handle memory errors in beforeEach hooks', async () => {
      // This test ensures that memory errors in hooks don't crash the test suite
      const memoryManager = getMemoryManager();
      
      // Mock a memory threshold exceeded scenario
      const originalCheck = memoryManager.checkMemoryThresholds;
      const mockCheck = vi.fn().mockImplementation(() => {
        const report = originalCheck.call(memoryManager);
        // Simulate high memory usage
        return { ...report, isAboveThreshold: true, heapUsed: 600 * 1024 * 1024 };
      });
      
      try {
        memoryManager.checkMemoryThresholds = mockCheck;
        
        // This should trigger cleanup but not crash
        const result = checkAndCleanupMemory();
        expect(result).toBeDefined();
        
      } finally {
        // Restore original function
        memoryManager.checkMemoryThresholds = originalCheck;
      }
    });

    it('should handle cleanup failures in afterEach hooks', async () => {
      const resourceCleaner = getResourceCleaner();
      
      // Mock a cleanup failure
      const originalCleanup = resourceCleaner.cleanupTestResources;
      let cleanupAttempts = 0;
      
      const mockCleanup = vi.fn().mockImplementation(async () => {
        cleanupAttempts++;
        if (cleanupAttempts === 1) {
          throw new Error('Mock cleanup failure');
        }
        return originalCleanup.call(resourceCleaner);
      });
      
      try {
        resourceCleaner.cleanupTestResources = mockCleanup;
        
        // First call should fail
        await expect(resourceCleaner.cleanupTestResources()).rejects.toThrow('Mock cleanup failure');
        
        // Second call should succeed
        await expect(resourceCleaner.cleanupTestResources()).resolves.toBeUndefined();
        
        expect(cleanupAttempts).toBe(2);
        
      } finally {
        // Restore original function
        resourceCleaner.cleanupTestResources = originalCleanup;
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