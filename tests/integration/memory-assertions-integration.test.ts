/**
 * Memory Assertions Integration Tests
 * 
 * Integration tests demonstrating memory usage assertions in real test scenarios.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  assertMemoryWithinLimits,
  assertMemoryWithinStrictLimits,
  assertMemoryWithinRelaxedLimits,
  assertMemoryWithinCustomLimits,
  assertNoMemoryRegressionForTest,
  assertMemoryGrowthDuringOperation,
  setMemoryBaselineForTest,
  getCurrentMemoryInfo,
  getMemoryReport,
  forceGCAndGetMemory,
  measureMemoryUsage,
  withMemoryAssertion,
  withMemoryRegressionCheck,
  DEFAULT_MEMORY_THRESHOLDS,
  STRICT_MEMORY_THRESHOLDS,
  RELAXED_MEMORY_THRESHOLDS
} from '../setup/memory-assertions-setup.js';
import { ReadmeParserImpl } from '../../src/parser/readme-parser.js';
import { type MemoryThreshold } from '../../src/shared/memory-usage-assertions.js';

describe('Memory Assertions Integration', () => {
  let parser: ReadmeParserImpl;

  beforeAll(async () => {
    parser = new ReadmeParserImpl();
  });

  beforeEach(() => {
    // Set baseline for each test
    setMemoryBaselineForTest();
  });

  describe('Basic Memory Assertions', () => {
    it('should pass memory assertions for simple operations', async () => {
      const simpleContent = '# Simple Test\n\nA basic test file.';
      
      // This should pass default memory limits
      const result = await parser.parseContent(simpleContent);
      expect(result.success).toBe(true);
      
      // Assert memory is within default limits
      expect(() => assertMemoryWithinLimits()).not.toThrow();
      
      // Log memory info
      const memoryInfo = getCurrentMemoryInfo();
      console.log(`Memory after simple parse: ${memoryInfo?.formattedHeapUsed}`);
    });

    it('should pass strict memory assertions for minimal operations', async () => {
      const minimalContent = '# Test';
      
      const result = await parser.parseContent(minimalContent);
      expect(result.success).toBe(true);
      
      // This should pass even strict limits for minimal content
      expect(() => assertMemoryWithinStrictLimits()).not.toThrow();
    });

    it('should use relaxed limits for larger operations', async () => {
      // Generate larger content
      let largeContent = '# Large Test\n\n';
      for (let i = 0; i < 100; i++) {
        largeContent += `## Section ${i}\n\nContent for section ${i}.\n\n`;
        largeContent += `\`\`\`javascript\nfunction test${i}() { return ${i}; }\n\`\`\`\n\n`;
      }
      
      const result = await parser.parseContent(largeContent);
      expect(result.success).toBe(true);
      
      // Use relaxed limits for larger operations
      expect(() => assertMemoryWithinRelaxedLimits()).not.toThrow();
      
      console.log(`Memory after large parse: ${getCurrentMemoryInfo()?.formattedHeapUsed}`);
    });

    it('should work with custom memory thresholds', async () => {
      const customThresholds: MemoryThreshold = {
        maxMemoryBytes: 500 * 1024 * 1024, // 500MB - very generous
        maxGrowthBytes: 200 * 1024 * 1024, // 200MB growth allowed
        maxUsagePercentage: 95, // 95% usage allowed
        minEfficiencyScore: 30 // Low efficiency requirement
      };
      
      // Generate content that might use more memory
      let content = '# Custom Threshold Test\n\n';
      for (let i = 0; i < 200; i++) {
        content += `## Section ${i}\n\n`;
        content += `This is a longer section with more content to increase memory usage.\n\n`;
        content += `\`\`\`python\ndef function_${i}():\n    return "test_${i}"\n\`\`\`\n\n`;
      }
      
      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);
      
      expect(() => assertMemoryWithinCustomLimits(customThresholds)).not.toThrow();
    });
  });

  describe('Memory Growth Assertions', () => {
    it('should assert memory growth during parsing operation', async () => {
      const content = '# Growth Test\n\nTesting memory growth during parsing.';
      
      const result = await assertMemoryGrowthDuringOperation(
        () => parser.parseContent(content),
        50 // 50MB max growth
      );
      
      expect(result.success).toBe(true);
    });

    it('should handle operations with expected memory growth', async () => {
      // Create content that will use some memory
      let content = '# Memory Growth Test\n\n';
      for (let i = 0; i < 50; i++) {
        content += `## Section ${i}\n\nContent with code:\n\n`;
        content += `\`\`\`typescript\ninterface Test${i} {\n  id: number;\n  name: string;\n}\n\`\`\`\n\n`;
      }
      
      const result = await assertMemoryGrowthDuringOperation(
        () => parser.parseContent(content),
        100 // 100MB max growth - generous for this operation
      );
      
      expect(result.success).toBe(true);
      console.log(`Memory growth test completed: ${getCurrentMemoryInfo()?.formattedHeapUsed}`);
    });

    it('should measure memory usage of operations', async () => {
      const content = '# Measurement Test\n\nTesting memory measurement.';
      
      const { result, memoryGrowth, duration } = await measureMemoryUsage(
        () => parser.parseContent(content),
        'Parser measurement test'
      );
      
      expect(result.success).toBe(true);
      expect(memoryGrowth).toBeGreaterThanOrEqual(0);
      expect(duration).toBeGreaterThan(0);
      
      console.log(`Measured: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB growth in ${duration}ms`);
    });
  });

  describe('Memory Regression Testing', () => {
    it('should detect no regression for consistent operations', async () => {
      const content = '# Regression Test\n\nConsistent content for regression testing.';
      
      // First run to establish baseline
      const firstResult = await parser.parseContent(content);
      expect(firstResult.success).toBe(true);
      
      const firstMemory = getCurrentMemoryInfo()?.heapUsed || 0;
      
      // Force GC to clean up
      forceGCAndGetMemory();
      
      // Second run should be similar
      const secondResult = await parser.parseContent(content);
      expect(secondResult.success).toBe(true);
      
      // Check for regression with 20% variance allowed
      expect(() => 
        assertNoMemoryRegressionForTest(firstMemory, 0.2)
      ).not.toThrow();
    });

    it('should handle memory regression checks with baselines', async () => {
      const baselineMemory = 50 * 1024 * 1024; // 50MB baseline
      
      // Simple operation that should be well under baseline
      const content = '# Small Test\n\nSmall content.';
      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);
      
      // This should pass as we're likely under 50MB
      expect(() => 
        assertNoMemoryRegressionForTest(baselineMemory, 0.5) // 50% variance
      ).not.toThrow();
    });
  });

  describe('Memory-Aware Test Wrappers', () => {
    it('should use memory assertion wrapper', async () => {
      const wrappedParser = withMemoryAssertion(
        (content: string) => parser.parseContent(content),
        STRICT_MEMORY_THRESHOLDS
      );
      
      const content = '# Wrapped Test\n\nTesting wrapped function.';
      const result = await wrappedParser(content);
      
      expect(result.success).toBe(true);
    });

    it('should use memory regression wrapper', async () => {
      const expectedMemory = 100 * 1024 * 1024; // 100MB expected
      
      const wrappedParser = withMemoryRegressionCheck(
        (content: string) => parser.parseContent(content),
        expectedMemory,
        0.3 // 30% variance allowed
      );
      
      const content = '# Regression Wrapped Test\n\nTesting regression wrapper.';
      const result = await wrappedParser(content);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Memory Reporting', () => {
    it('should generate detailed memory reports', async () => {
      const content = '# Report Test\n\nTesting memory reporting.';
      
      // Parse content
      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);
      
      // Generate report
      const report = getMemoryReport();
      
      expect(report).toContain('Memory Usage Report');
      expect(report).toContain('Current Usage:');
      expect(report).toContain('RSS:');
      expect(report).toContain('Status:');
      
      console.log('Memory Report:', report);
    });

    it('should show memory state after garbage collection', async () => {
      const content = '# GC Test\n\nTesting garbage collection effects.';
      
      // Parse content
      await parser.parseContent(content);
      
      const beforeGC = getCurrentMemoryInfo();
      console.log(`Before GC: ${beforeGC?.formattedHeapUsed}`);
      
      // Force garbage collection
      const afterGC = forceGCAndGetMemory();
      console.log(`After GC: ${afterGC?.formattedHeapUsed}`);
      
      // Memory should be same or less after GC
      if (beforeGC && afterGC) {
        expect(afterGC.heapUsed).toBeLessThanOrEqual(beforeGC.heapUsed);
      }
    });
  });

  describe('Stress Testing with Memory Assertions', () => {
    it('should handle multiple parsing operations with memory tracking', async () => {
      const operations = [];
      
      // Create multiple parsing operations
      for (let i = 0; i < 10; i++) {
        const content = `# Test ${i}\n\nContent for test ${i}.\n\n\`\`\`javascript\nfunction test${i}() { return ${i}; }\n\`\`\``;
        operations.push(() => parser.parseContent(content));
      }
      
      // Execute all operations with memory tracking
      for (let i = 0; i < operations.length; i++) {
        const { result, memoryGrowth } = await measureMemoryUsage(
          operations[i],
          `Operation ${i + 1}`
        );
        
        expect(result.success).toBe(true);
        
        // Each operation should use reasonable memory
        expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB per operation
      }
      
      // Overall memory should still be reasonable
      expect(() => assertMemoryWithinRelaxedLimits()).not.toThrow();
    });

    it('should handle large content with memory assertions', async () => {
      // Generate large content
      let largeContent = '# Large Content Test\n\n';
      
      // Add many sections with code blocks
      for (let i = 0; i < 500; i++) {
        largeContent += `## Section ${i}\n\n`;
        largeContent += `This is section ${i} with some content.\n\n`;
        
        if (i % 5 === 0) {
          largeContent += `\`\`\`javascript\nfunction section${i}() {\n  return "Section ${i}";\n}\n\`\`\`\n\n`;
        }
      }
      
      console.log(`Large content size: ${(largeContent.length / 1024).toFixed(1)}KB`);
      
      // Parse with memory growth assertion
      const result = await assertMemoryGrowthDuringOperation(
        () => parser.parseContent(largeContent),
        150 // 150MB max growth for large content
      );
      
      expect(result.success).toBe(true);
      
      // Should still be within relaxed limits after large operation
      expect(() => assertMemoryWithinRelaxedLimits()).not.toThrow();
    });
  });

  describe('Memory Threshold Validation', () => {
    it('should validate default thresholds are reasonable', () => {
      expect(DEFAULT_MEMORY_THRESHOLDS.maxMemoryBytes).toBe(100 * 1024 * 1024);
      expect(DEFAULT_MEMORY_THRESHOLDS.maxGrowthBytes).toBe(50 * 1024 * 1024);
      expect(DEFAULT_MEMORY_THRESHOLDS.maxUsagePercentage).toBe(80);
      expect(DEFAULT_MEMORY_THRESHOLDS.minEfficiencyScore).toBe(70);
    });

    it('should validate strict thresholds are more restrictive', () => {
      expect(STRICT_MEMORY_THRESHOLDS.maxMemoryBytes).toBeLessThan(DEFAULT_MEMORY_THRESHOLDS.maxMemoryBytes!);
      expect(STRICT_MEMORY_THRESHOLDS.maxGrowthBytes).toBeLessThan(DEFAULT_MEMORY_THRESHOLDS.maxGrowthBytes!);
      expect(STRICT_MEMORY_THRESHOLDS.maxUsagePercentage).toBeLessThan(DEFAULT_MEMORY_THRESHOLDS.maxUsagePercentage!);
      expect(STRICT_MEMORY_THRESHOLDS.minEfficiencyScore).toBeGreaterThan(DEFAULT_MEMORY_THRESHOLDS.minEfficiencyScore!);
    });

    it('should validate relaxed thresholds are more permissive', () => {
      expect(RELAXED_MEMORY_THRESHOLDS.maxMemoryBytes).toBeGreaterThan(DEFAULT_MEMORY_THRESHOLDS.maxMemoryBytes!);
      expect(RELAXED_MEMORY_THRESHOLDS.maxGrowthBytes).toBeGreaterThan(DEFAULT_MEMORY_THRESHOLDS.maxGrowthBytes!);
      expect(RELAXED_MEMORY_THRESHOLDS.maxUsagePercentage).toBeGreaterThan(DEFAULT_MEMORY_THRESHOLDS.maxUsagePercentage!);
      expect(RELAXED_MEMORY_THRESHOLDS.minEfficiencyScore).toBeLessThan(DEFAULT_MEMORY_THRESHOLDS.minEfficiencyScore!);
    });
  });

  afterEach(() => {
    // Log final memory state for each test
    const memoryInfo = getCurrentMemoryInfo();
    if (memoryInfo) {
      console.log(`Test completed - Memory: ${memoryInfo.formattedHeapUsed}, Status: ${memoryInfo.isWarning ? 'WARNING' : memoryInfo.isCritical ? 'CRITICAL' : 'NORMAL'}`);
    }
  });
});