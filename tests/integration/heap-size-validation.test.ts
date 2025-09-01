/**
 * Integration Tests for Heap Size Configuration Validation
 * 
 * These tests validate that heap size limits are properly applied
 * and effective in preventing memory exhaustion during test execution.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getCurrentMemoryUsage,
  isHeapUsageExcessive,
  detectTestEnvironment,
  getHeapConfig,
  generateNodeOptions
} from '../../src/shared/heap-size-config';

describe('Heap Size Configuration Integration', () => {
  let initialMemory: NodeJS.MemoryUsage;
  let testEnvironment: string;

  beforeAll(() => {
    initialMemory = getCurrentMemoryUsage();
    testEnvironment = detectTestEnvironment();
  });

  afterAll(() => {
    // Force garbage collection if available
    if (typeof global.gc === 'function') {
      global.gc();
    }
  });

  describe('Environment Detection', () => {
    it('should correctly detect current test environment', () => {
      expect(testEnvironment).toBeDefined();
      expect(['unit', 'integration', 'performance', 'comprehensive', 'default']).toContain(testEnvironment);
    });

    it('should have appropriate heap configuration for detected environment', () => {
      const config = getHeapConfig(testEnvironment as any);
      expect(config).toBeDefined();
      expect(config.maxOldSpaceSize).toBeGreaterThan(0);
      expect(typeof config.exposeGC).toBe('boolean');
    });
  });

  describe('NODE_OPTIONS Validation', () => {
    it('should have NODE_OPTIONS set with heap size limits', () => {
      const nodeOptions = process.env.NODE_OPTIONS || '';
      expect(nodeOptions).toContain('--max-old-space-size');
    });

    it('should have garbage collection exposed when configured', () => {
      const nodeOptions = process.env.NODE_OPTIONS || '';
      const config = getHeapConfig(testEnvironment as any);
      
      if (config.exposeGC) {
        expect(nodeOptions).toContain('--expose-gc');
        expect(typeof global.gc).toBe('function');
      }
    });

    it('should match expected configuration for current environment', () => {
      const nodeOptions = process.env.NODE_OPTIONS || '';
      const config = getHeapConfig(testEnvironment as any);
      const expectedOptions = generateNodeOptions(config);
      
      // Check that key options are present
      expect(nodeOptions).toContain(`--max-old-space-size=${config.maxOldSpaceSize}`);
      
      if (config.exposeGC) {
        expect(nodeOptions).toContain('--expose-gc');
      }
    });
  });

  describe('Memory Usage Monitoring', () => {
    it('should track memory usage during test execution', () => {
      const currentMemory = getCurrentMemoryUsage();
      
      expect(currentMemory.rss).toBeGreaterThan(0);
      expect(currentMemory.heapTotal).toBeGreaterThan(0);
      expect(currentMemory.heapUsed).toBeGreaterThan(0);
      expect(currentMemory.heapUsed).toBeLessThanOrEqual(currentMemory.heapTotal);
    });

    it('should not exceed reasonable memory usage for integration tests', () => {
      const currentMemory = getCurrentMemoryUsage();
      const heapUsedMB = currentMemory.heapUsed / 1024 / 1024;
      
      // Integration tests should not use more than 1GB of heap
      expect(heapUsedMB).toBeLessThan(1024);
    });

    it('should detect excessive heap usage correctly', () => {
      const isExcessive = isHeapUsageExcessive(95); // Very high threshold
      expect(typeof isExcessive).toBe('boolean');
      
      // At 95% threshold, we should not be excessive during normal test execution
      expect(isExcessive).toBe(false);
    });
  });

  describe('Garbage Collection Availability', () => {
    it('should have garbage collection available when expose-gc is set', () => {
      const nodeOptions = process.env.NODE_OPTIONS || '';
      
      if (nodeOptions.includes('--expose-gc')) {
        expect(typeof global.gc).toBe('function');
      }
    });

    it('should be able to trigger garbage collection', () => {
      if (typeof global.gc === 'function') {
        const beforeGC = getCurrentMemoryUsage();
        
        // Create some garbage
        const garbage = new Array(1000).fill(0).map(() => ({ data: new Array(1000).fill('test') }));
        const afterAllocation = getCurrentMemoryUsage();
        
        // Clear references
        garbage.length = 0;
        
        // Force garbage collection
        global.gc();
        
        const afterGC = getCurrentMemoryUsage();
        
        // Memory usage should have increased after allocation
        expect(afterAllocation.heapUsed).toBeGreaterThan(beforeGC.heapUsed);
        
        // Memory usage should decrease after GC (though not necessarily below initial)
        expect(afterGC.heapUsed).toBeLessThanOrEqual(afterAllocation.heapUsed);
      } else {
        console.warn('Garbage collection not available - skipping GC test');
      }
    });
  });

  describe('Memory Stress Testing', () => {
    it('should handle moderate memory allocation without exceeding limits', () => {
      const initialMemory = getCurrentMemoryUsage();
      const allocations: any[] = [];
      
      try {
        // Allocate memory in chunks
        for (let i = 0; i < 100; i++) {
          allocations.push(new Array(10000).fill(`test-data-${i}`));
        }
        
        const peakMemory = getCurrentMemoryUsage();
        const heapUsedMB = peakMemory.heapUsed / 1024 / 1024;
        
        // Should not exceed reasonable limits for integration tests
        expect(heapUsedMB).toBeLessThan(500); // 500MB limit for this test
        
      } finally {
        // Clean up allocations
        allocations.length = 0;
        
        if (typeof global.gc === 'function') {
          global.gc();
        }
      }
    });

    it('should maintain stable memory usage across multiple operations', () => {
      const measurements: number[] = [];
      
      // Perform multiple operations and measure memory
      for (let i = 0; i < 10; i++) {
        // Simulate test operations
        const data = new Array(1000).fill(0).map((_, idx) => ({
          id: idx,
          content: `test-content-${i}-${idx}`,
          timestamp: Date.now()
        }));
        
        // Process data
        const processed = data.filter(item => item.id % 2 === 0);
        processed.forEach(item => item.content = item.content.toUpperCase());
        
        // Measure memory
        const memory = getCurrentMemoryUsage();
        measurements.push(memory.heapUsed / 1024 / 1024);
        
        // Clean up
        data.length = 0;
        processed.length = 0;
      }
      
      // Memory usage should be relatively stable
      const maxMemory = Math.max(...measurements);
      const minMemory = Math.min(...measurements);
      const memoryVariation = maxMemory - minMemory;
      
      // Memory variation should be reasonable (less than 100MB)
      expect(memoryVariation).toBeLessThan(100);
    });
  });

  describe('Configuration Effectiveness', () => {
    it('should prevent memory exhaustion with configured limits', () => {
      const config = getHeapConfig(testEnvironment as any);
      const currentMemory = getCurrentMemoryUsage();
      const heapUsedMB = currentMemory.heapUsed / 1024 / 1024;
      
      // Current usage should be well below configured limit
      expect(heapUsedMB).toBeLessThan(config.maxOldSpaceSize * 0.8);
    });

    it('should have appropriate limits for test environment type', () => {
      const config = getHeapConfig(testEnvironment as any);
      
      switch (testEnvironment) {
        case 'unit':
          expect(config.maxOldSpaceSize).toBeLessThanOrEqual(1024);
          break;
        case 'integration':
          expect(config.maxOldSpaceSize).toBeLessThanOrEqual(2048);
          break;
        case 'performance':
          expect(config.maxOldSpaceSize).toBeLessThanOrEqual(4096);
          break;
        case 'comprehensive':
          expect(config.maxOldSpaceSize).toBeLessThanOrEqual(3072);
          break;
        default:
          expect(config.maxOldSpaceSize).toBeLessThanOrEqual(1536);
      }
    });
  });
});