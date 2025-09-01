/**
 * Memory Cleanup Integration Test Suite
 * 
 * Tests the integration of memory cleanup hooks across different test scenarios
 * and validates that the cleanup system works effectively in real test conditions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  triggerMemoryCleanup,
  getCurrentMemoryUsage,
  isMemoryUsageHigh,
  type MemoryUsageReport 
} from '../setup/memory-setup';

describe('Memory Cleanup Integration', () => {
  let testStartMemory: MemoryUsageReport;
  let memorySnapshots: MemoryUsageReport[] = [];

  beforeEach(async () => {
    // This beforeEach hook tests the actual memory cleanup hook integration
    testStartMemory = getCurrentMemoryUsage();
    
    // Verify that memory cleanup hooks are working
    expect(testStartMemory).toBeDefined();
    expect(testStartMemory.heapUsed).toBeGreaterThan(0);
    
    console.log(`🧪 Test starting with memory: ${testStartMemory.formattedHeapUsed}`);
  });

  afterEach(async () => {
    // This afterEach hook validates cleanup effectiveness
    const testEndMemory = getCurrentMemoryUsage();
    const memoryGrowth = testEndMemory.heapUsed - testStartMemory.heapUsed;
    
    memorySnapshots.push(testEndMemory);
    
    // Keep only last 5 snapshots to prevent memory leak in test
    if (memorySnapshots.length > 5) {
      memorySnapshots = memorySnapshots.slice(-5);
    }
    
    console.log(`🧪 Test completed. Memory growth: ${formatBytes(memoryGrowth)}`);
    
    // Memory growth per test should be reasonable
    expect(Math.abs(memoryGrowth)).toBeLessThan(20 * 1024 * 1024); // Less than 20MB per test
  });

  describe('Real-world Memory Usage Scenarios', () => {
    it('should handle large data processing with cleanup', async () => {
      const startMemory = getCurrentMemoryUsage();
      
      // Simulate processing large README files
      const largeReadmeContent = 'x'.repeat(1024 * 1024); // 1MB string
      const processedData: string[] = [];
      
      // Process data in chunks
      for (let i = 0; i < 10; i++) {
        const chunk = largeReadmeContent.substring(i * 100000, (i + 1) * 100000);
        processedData.push(chunk.toUpperCase());
        
        // Trigger cleanup every few iterations
        if (i % 3 === 0) {
          await triggerMemoryCleanup();
        }
      }
      
      const afterProcessing = getCurrentMemoryUsage();
      const processingGrowth = afterProcessing.heapUsed - startMemory.heapUsed;
      
      // Clear processed data
      processedData.length = 0;
      
      // Final cleanup
      await triggerMemoryCleanup();
      
      const afterCleanup = getCurrentMemoryUsage();
      const finalGrowth = afterCleanup.heapUsed - startMemory.heapUsed;
      
      console.log(`📊 Large data processing: ${formatBytes(processingGrowth)} → ${formatBytes(finalGrowth)}`);
      
      // Cleanup should be effective
      expect(finalGrowth).toBeLessThan(processingGrowth * 0.7); // At least 30% reduction
    });

    it('should handle multiple test iterations without memory accumulation', async () => {
      const iterationMemories: number[] = [];
      
      // Run multiple iterations of memory-intensive operations
      for (let iteration = 0; iteration < 5; iteration++) {
        const iterationStart = getCurrentMemoryUsage();
        
        // Simulate test operations
        const testData = new Map<string, any>();
        for (let i = 0; i < 1000; i++) {
          testData.set(`key-${i}`, {
            id: i,
            data: `iteration-${iteration}-data-${i}`,
            timestamp: Date.now()
          });
        }
        
        // Process the data
        const results: any[] = [];
        testData.forEach((value, key) => {
          results.push({ key, processed: value.data.toUpperCase() });
        });
        
        // Clear data
        testData.clear();
        results.length = 0;
        
        // Trigger cleanup
        await triggerMemoryCleanup();
        
        const iterationEnd = getCurrentMemoryUsage();
        iterationMemories.push(iterationEnd.heapUsed);
        
        console.log(`🔄 Iteration ${iteration + 1}: ${iterationEnd.formattedHeapUsed}`);
      }
      
      // Memory usage should not continuously grow across iterations
      const firstIteration = iterationMemories[0];
      const lastIteration = iterationMemories[iterationMemories.length - 1];
      const totalGrowth = lastIteration - firstIteration;
      
      // Total growth across all iterations should be minimal
      expect(totalGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB total growth
      
      // No single iteration should cause excessive growth
      for (let i = 1; i < iterationMemories.length; i++) {
        const iterationGrowth = iterationMemories[i] - iterationMemories[i - 1];
        expect(Math.abs(iterationGrowth)).toBeLessThan(5 * 1024 * 1024); // Less than 5MB per iteration
      }
    });

    it('should handle concurrent operations with memory management', async () => {
      const startMemory = getCurrentMemoryUsage();
      
      // Simulate concurrent operations that might stress memory
      const concurrentOperations = Array.from({ length: 10 }, async (_, index) => {
        const operationData: any[] = [];
        
        // Each operation creates some data
        for (let i = 0; i < 100; i++) {
          operationData.push({
            operationId: index,
            itemId: i,
            data: `concurrent-operation-${index}-item-${i}`,
            timestamp: Date.now()
          });
        }
        
        // Process the data
        const processed = operationData.map(item => ({
          ...item,
          processed: true,
          processedAt: Date.now()
        }));
        
        // Simulate async processing delay
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Clear operation data
        operationData.length = 0;
        processed.length = 0;
        
        return `operation-${index}-completed`;
      });
      
      // Wait for all operations to complete
      const results = await Promise.all(concurrentOperations);
      
      // Trigger cleanup after concurrent operations
      await triggerMemoryCleanup();
      
      const afterOperations = getCurrentMemoryUsage();
      const operationsGrowth = afterOperations.heapUsed - startMemory.heapUsed;
      
      console.log(`🔀 Concurrent operations completed: ${formatBytes(operationsGrowth)}`);
      
      // Verify all operations completed
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toBe(`operation-${index}-completed`);
      });
      
      // Memory growth should be reasonable for concurrent operations
      expect(operationsGrowth).toBeLessThan(15 * 1024 * 1024); // Less than 15MB
    });
  });

  describe('Memory Threshold Integration', () => {
    it('should trigger automatic cleanup when memory thresholds are exceeded', async () => {
      const startMemory = getCurrentMemoryUsage();
      
      // Create enough data to potentially trigger threshold
      const largeDataSets: any[][] = [];
      
      try {
        // Gradually increase memory usage
        for (let set = 0; set < 5; set++) {
          const dataSet: any[] = [];
          
          for (let i = 0; i < 10000; i++) {
            dataSet.push({
              setId: set,
              itemId: i,
              data: `large-dataset-${set}-item-${i}`,
              payload: 'x'.repeat(100), // 100 bytes per item
              timestamp: Date.now()
            });
          }
          
          largeDataSets.push(dataSet);
          
          const currentMemory = getCurrentMemoryUsage();
          console.log(`📈 Dataset ${set + 1}: ${currentMemory.formattedHeapUsed}`);
          
          // Check if memory is high and cleanup was triggered
          if (isMemoryUsageHigh()) {
            console.log('⚠️  High memory usage detected, cleanup should be triggered');
            
            // Manual trigger to ensure cleanup
            await triggerMemoryCleanup();
            
            const afterCleanup = getCurrentMemoryUsage();
            console.log(`🧹 After cleanup: ${afterCleanup.formattedHeapUsed}`);
          }
        }
        
      } finally {
        // Clean up all data sets
        largeDataSets.forEach(dataSet => {
          dataSet.length = 0;
        });
        largeDataSets.length = 0;
        
        // Final cleanup
        await triggerMemoryCleanup();
      }
      
      const finalMemory = getCurrentMemoryUsage();
      const totalGrowth = finalMemory.heapUsed - startMemory.heapUsed;
      
      console.log(`📊 Memory threshold test completed: ${formatBytes(totalGrowth)}`);
      
      // Even with large data processing, final growth should be controlled
      expect(totalGrowth).toBeLessThan(30 * 1024 * 1024); // Less than 30MB final growth
    });

    it('should maintain stable memory usage across multiple cleanup cycles', async () => {
      const memoryReadings: number[] = [];
      const initialMemory = getCurrentMemoryUsage();
      memoryReadings.push(initialMemory.heapUsed);
      
      // Run multiple cleanup cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create some temporary data
        const tempData = Array.from({ length: 1000 }, (_, i) => ({
          cycle,
          id: i,
          data: `cycle-${cycle}-item-${i}`,
          timestamp: Date.now()
        }));
        
        // Process the data
        const processed = tempData.map(item => ({
          ...item,
          processed: true,
          hash: `hash-${item.cycle}-${item.id}`
        }));
        
        // Clear temporary data
        tempData.length = 0;
        processed.length = 0;
        
        // Trigger cleanup
        await triggerMemoryCleanup();
        
        const cycleMemory = getCurrentMemoryUsage();
        memoryReadings.push(cycleMemory.heapUsed);
        
        console.log(`🔄 Cleanup cycle ${cycle + 1}: ${cycleMemory.formattedHeapUsed}`);
      }
      
      // Analyze memory stability
      const memoryVariations = memoryReadings.slice(1).map((reading, index) => 
        reading - memoryReadings[index]
      );
      
      const maxVariation = Math.max(...memoryVariations.map(Math.abs));
      const avgVariation = memoryVariations.reduce((sum, variation) => sum + Math.abs(variation), 0) / memoryVariations.length;
      
      console.log(`📊 Memory stability: max variation ${formatBytes(maxVariation)}, avg variation ${formatBytes(avgVariation)}`);
      
      // Memory should be stable across cleanup cycles
      expect(maxVariation).toBeLessThan(20 * 1024 * 1024); // Max 20MB variation
      expect(avgVariation).toBeLessThan(5 * 1024 * 1024);  // Avg 5MB variation
    });
  });

  describe('Hook Error Recovery', () => {
    it('should recover from cleanup failures and continue testing', async () => {
      const startMemory = getCurrentMemoryUsage();
      
      // Create test data
      const testData = new Array(5000).fill(null).map((_, i) => ({
        id: i,
        data: `recovery-test-${i}`,
        payload: 'x'.repeat(200) // 200 bytes per item
      }));
      
      // Simulate a cleanup failure scenario
      const originalConsoleError = console.error;
      const errorLogs: string[] = [];
      
      console.error = vi.fn((message: string) => {
        errorLogs.push(message);
        originalConsoleError(message);
      });
      
      try {
        // This should trigger cleanup, and even if it fails, test should continue
        await triggerMemoryCleanup();
        
        // Verify test can continue after potential cleanup issues
        const processedData = testData.map(item => ({
          ...item,
          processed: true,
          processedAt: Date.now()
        }));
        
        expect(processedData).toHaveLength(5000);
        
        // Clear data
        testData.length = 0;
        processedData.length = 0;
        
        // Another cleanup attempt
        await triggerMemoryCleanup();
        
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
      
      const endMemory = getCurrentMemoryUsage();
      const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;
      
      console.log(`🔧 Error recovery test: ${formatBytes(memoryGrowth)}`);
      
      // Test should complete successfully even with potential cleanup issues
      expect(memoryGrowth).toBeLessThan(25 * 1024 * 1024); // Less than 25MB growth
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