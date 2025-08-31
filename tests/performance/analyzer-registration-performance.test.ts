/**
 * Analyzer Registration Performance Tests
 * 
 * These tests specifically measure the performance impact of analyzer registration
 * to ensure the registration system doesn't negatively affect system speed.
 * Addresses requirement 3.4 performance aspects.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ComponentFactory, 
  ParserConfig
} from '../../src/parser/component-factory';
import { createMockAnalyzers } from '../utils/mock-analyzer';
import { AnalyzerConfig } from '../../src/parser/analyzers/enhanced-analyzer-registry';

interface PerformanceBenchmark {
  analyzerCount: number;
  registrationTime: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryIncrease: number;
  timePerAnalyzer: number;
}

describe('Analyzer Registration Performance Tests', () => {
  let factory: ComponentFactory;
  let benchmarks: PerformanceBenchmark[] = [];

  beforeEach(() => {
    factory = ComponentFactory.getInstance();
    factory.reset();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    factory.reset();
    
    // Force garbage collection after each test
    if (global.gc) {
      global.gc();
    }
  });

  describe('Registration Time Performance', () => {
    it('should register single analyzer within 50ms threshold', () => {
      const mockAnalyzers = createMockAnalyzers(1);
      const analyzerConfig: AnalyzerConfig = {
        name: 'SinglePerfTestAnalyzer',
        analyzer: mockAnalyzers[0],
        dependencies: [],
        priority: 1
      };

      factory.initialize();
      
      const startTime = performance.now();
      const registrationResults = factory.registerCustomAnalyzers([analyzerConfig]);
      const endTime = performance.now();
      
      const registrationTime = endTime - startTime;
      
      // Verify registration succeeded
      expect(registrationResults[0].success).toBe(true);
      
      // Verify performance threshold
      expect(registrationTime).toBeLessThan(50); // 50ms threshold for single analyzer
      
      console.log(`Single analyzer registration time: ${registrationTime.toFixed(2)}ms`);
    });

    it('should maintain linear time complexity for multiple analyzers', () => {
      const testCases = [1, 5, 10, 25, 50];
      const results: PerformanceBenchmark[] = [];
      
      testCases.forEach(count => {
        factory.reset();
        factory.initialize();
        
        const mockAnalyzers = createMockAnalyzers(count);
        const analyzerConfigs: AnalyzerConfig[] = mockAnalyzers.map((analyzer, index) => ({
          name: `PerfTestAnalyzer${index}`,
          analyzer: analyzer,
          dependencies: [],
          priority: 1
        }));
        
        const memoryBefore = process.memoryUsage().heapUsed;
        const startTime = performance.now();
        
        const registrationResults = factory.registerCustomAnalyzers(analyzerConfigs);
        
        const endTime = performance.now();
        const memoryAfter = process.memoryUsage().heapUsed;
        
        const registrationTime = endTime - startTime;
        const memoryIncrease = memoryAfter - memoryBefore;
        const timePerAnalyzer = registrationTime / count;
        
        // Verify all registrations succeeded
        expect(registrationResults).toHaveLength(count);
        registrationResults.forEach(result => {
          expect(result.success).toBe(true);
        });
        
        const benchmark: PerformanceBenchmark = {
          analyzerCount: count,
          registrationTime,
          memoryBefore,
          memoryAfter,
          memoryIncrease,
          timePerAnalyzer
        };
        
        results.push(benchmark);
        
        console.log(`${count} analyzers: ${registrationTime.toFixed(2)}ms total, ${timePerAnalyzer.toFixed(2)}ms per analyzer`);
      });
      
      // Verify linear time complexity
      // Time per analyzer should remain relatively constant
      const timesPerAnalyzer = results.map(r => r.timePerAnalyzer);
      const avgTimePerAnalyzer = timesPerAnalyzer.reduce((a, b) => a + b) / timesPerAnalyzer.length;
      const maxTimePerAnalyzer = Math.max(...timesPerAnalyzer);
      
      // Verify average time per analyzer is reasonable
      expect(avgTimePerAnalyzer).toBeLessThan(5); // 5ms per analyzer on average
      
      // Verify maximum time per analyzer doesn't exceed threshold
      expect(maxTimePerAnalyzer).toBeLessThan(10); // 10ms per analyzer maximum
      
      // Verify time complexity is roughly linear (not exponential)
      // The largest case shouldn't be more than 2x the average
      const largestCaseTime = results[results.length - 1].timePerAnalyzer;
      expect(largestCaseTime).toBeLessThan(avgTimePerAnalyzer * 2);
      
      benchmarks.push(...results);
    });

    it('should handle concurrent registrations efficiently', async () => {
      factory.initialize();
      
      const concurrentCount = 10;
      const analyzersPerRegistration = 5;
      
      const startTime = performance.now();
      
      const concurrentRegistrations = Array.from({ length: concurrentCount }, async (_, batchIndex) => {
        const mockAnalyzers = createMockAnalyzers(analyzersPerRegistration);
        const analyzerConfigs: AnalyzerConfig[] = mockAnalyzers.map((analyzer, index) => ({
          name: `ConcurrentAnalyzer_${batchIndex}_${index}`,
          analyzer: analyzer,
          dependencies: [],
          priority: 1
        }));
        
        return factory.registerCustomAnalyzers(analyzerConfigs);
      });
      
      const results = await Promise.all(concurrentRegistrations);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalAnalyzers = concurrentCount * analyzersPerRegistration;
      
      // Verify all registrations succeeded
      results.forEach(registrationResults => {
        expect(registrationResults).toHaveLength(analyzersPerRegistration);
        registrationResults.forEach(result => {
          expect(result.success).toBe(true);
        });
      });
      
      // Verify concurrent performance is reasonable
      const timePerAnalyzer = totalTime / totalAnalyzers;
      expect(timePerAnalyzer).toBeLessThan(10); // 10ms per analyzer in concurrent scenario
      
      console.log(`Concurrent registration: ${totalAnalyzers} analyzers in ${totalTime.toFixed(2)}ms (${timePerAnalyzer.toFixed(2)}ms per analyzer)`);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks during registration', () => {
      const iterations = 10;
      const analyzersPerIteration = 20;
      const memoryMeasurements: number[] = [];
      
      // Baseline memory measurement
      if (global.gc) global.gc();
      const baselineMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < iterations; i++) {
        factory.reset();
        factory.initialize();
        
        const mockAnalyzers = createMockAnalyzers(analyzersPerIteration);
        const analyzerConfigs: AnalyzerConfig[] = mockAnalyzers.map((analyzer, index) => ({
          name: `MemoryTestAnalyzer_${i}_${index}`,
          analyzer: analyzer,
          dependencies: [],
          priority: 1
        }));
        
        const registrationResults = factory.registerCustomAnalyzers(analyzerConfigs);
        
        // Verify registrations succeeded
        expect(registrationResults).toHaveLength(analyzersPerIteration);
        registrationResults.forEach(result => {
          expect(result.success).toBe(true);
        });
        
        // Measure memory after registration
        if (global.gc) global.gc();
        const currentMemory = process.memoryUsage().heapUsed;
        memoryMeasurements.push(currentMemory);
      }
      
      // Verify memory doesn't continuously increase (indicating leaks)
      const memoryIncreases = memoryMeasurements.map(memory => memory - baselineMemory);
      const avgMemoryIncrease = memoryIncreases.reduce((a, b) => a + b) / memoryIncreases.length;
      const maxMemoryIncrease = Math.max(...memoryIncreases);
      
      // Memory increase should be reasonable and not continuously growing
      const avgIncreaseInMB = avgMemoryIncrease / (1024 * 1024);
      const maxIncreaseInMB = maxMemoryIncrease / (1024 * 1024);
      
      expect(avgIncreaseInMB).toBeLessThan(50); // Average increase < 50MB
      expect(maxIncreaseInMB).toBeLessThan(100); // Maximum increase < 100MB
      
      console.log(`Memory usage - Average increase: ${avgIncreaseInMB.toFixed(2)}MB, Max increase: ${maxIncreaseInMB.toFixed(2)}MB`);
    });

    it('should efficiently manage memory for large numbers of analyzers', () => {
      const largeAnalyzerCount = 100;
      
      factory.initialize();
      
      const memoryBefore = process.memoryUsage().heapUsed;
      
      const mockAnalyzers = createMockAnalyzers(largeAnalyzerCount);
      const analyzerConfigs: AnalyzerConfig[] = mockAnalyzers.map((analyzer, index) => ({
        name: `LargeScaleAnalyzer${index}`,
        analyzer: analyzer,
        dependencies: [],
        priority: 1
      }));
      
      const registrationResults = factory.registerCustomAnalyzers(analyzerConfigs);
      
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;
      const memoryPerAnalyzer = memoryIncrease / largeAnalyzerCount;
      
      // Verify all registrations succeeded
      expect(registrationResults).toHaveLength(largeAnalyzerCount);
      registrationResults.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Verify memory efficiency
      const memoryIncreaseInMB = memoryIncrease / (1024 * 1024);
      const memoryPerAnalyzerInKB = memoryPerAnalyzer / 1024;
      
      expect(memoryIncreaseInMB).toBeLessThan(100); // Total increase < 100MB for 100 analyzers
      expect(memoryPerAnalyzerInKB).toBeLessThan(1024); // < 1MB per analyzer
      
      console.log(`Large scale memory usage: ${memoryIncreaseInMB.toFixed(2)}MB total, ${memoryPerAnalyzerInKB.toFixed(2)}KB per analyzer`);
    });
  });

  describe('System Impact Performance', () => {
    it('should not significantly impact parser creation time', () => {
      const baselineIterations = 10;
      const customAnalyzerCount = 20;
      
      // Measure baseline parser creation time (no custom analyzers)
      const baselineTimes: number[] = [];
      for (let i = 0; i < baselineIterations; i++) {
        factory.reset();
        factory.initialize();
        
        const startTime = performance.now();
        const parser = factory.createReadmeParser({});
        const endTime = performance.now();
        
        baselineTimes.push(endTime - startTime);
        expect(parser).toBeDefined();
      }
      
      const avgBaselineTime = baselineTimes.reduce((a, b) => a + b) / baselineTimes.length;
      
      // Measure parser creation time with custom analyzers
      const customAnalyzerTimes: number[] = [];
      for (let i = 0; i < baselineIterations; i++) {
        factory.reset();
        factory.initialize();
        
        const mockAnalyzers = createMockAnalyzers(customAnalyzerCount);
        const analyzerConfigs: AnalyzerConfig[] = mockAnalyzers.map((analyzer, index) => ({
          name: `ImpactTestAnalyzer${index}`,
          analyzer: analyzer,
          dependencies: [],
          priority: 1
        }));
        
        const parserConfig: ParserConfig = {
          customAnalyzers: analyzerConfigs
        };
        
        const startTime = performance.now();
        const parser = factory.createReadmeParser(parserConfig);
        const endTime = performance.now();
        
        customAnalyzerTimes.push(endTime - startTime);
        expect(parser).toBeDefined();
      }
      
      const avgCustomAnalyzerTime = customAnalyzerTimes.reduce((a, b) => a + b) / customAnalyzerTimes.length;
      
      // Verify impact is minimal
      const impactRatio = avgCustomAnalyzerTime / avgBaselineTime;
      const impactIncrease = avgCustomAnalyzerTime - avgBaselineTime;
      
      // Custom analyzer registration shouldn't increase parser creation time by more than 3x
      expect(impactRatio).toBeLessThan(3);
      
      // Absolute increase should be reasonable
      expect(impactIncrease).toBeLessThan(100); // < 100ms increase
      
      console.log(`Parser creation impact - Baseline: ${avgBaselineTime.toFixed(2)}ms, With ${customAnalyzerCount} analyzers: ${avgCustomAnalyzerTime.toFixed(2)}ms, Ratio: ${impactRatio.toFixed(2)}x`);
    });

    it('should not impact parsing performance significantly', async () => {
      const testContent = `# Performance Test README

This is a test README file for measuring parsing performance impact.

## Installation

\`\`\`bash
npm install
npm test
\`\`\`

## Usage

\`\`\`javascript
const parser = require('./parser');
parser.parse('README.md');
\`\`\`

## Features

- Fast parsing
- Multiple analyzers
- Performance monitoring
`;

      // Baseline parsing performance (no custom analyzers)
      factory.reset();
      factory.initialize();
      const baselineParser = factory.createReadmeParser({});
      
      const baselineStartTime = performance.now();
      const baselineResult = await baselineParser.parseContent(testContent);
      const baselineEndTime = performance.now();
      const baselineTime = baselineEndTime - baselineStartTime;
      
      expect(baselineResult).toBeDefined();
      
      // Parsing performance with custom analyzers
      factory.reset();
      factory.initialize();
      
      const mockAnalyzers = createMockAnalyzers(15);
      const analyzerConfigs: AnalyzerConfig[] = mockAnalyzers.map((analyzer, index) => ({
        name: `ParsingPerfAnalyzer${index}`,
        analyzer: analyzer,
        dependencies: [],
        priority: 1
      }));
      
      const parserConfig: ParserConfig = {
        customAnalyzers: analyzerConfigs
      };
      
      const customParser = factory.createReadmeParser(parserConfig);
      
      const customStartTime = performance.now();
      const customResult = await customParser.parseContent(testContent);
      const customEndTime = performance.now();
      const customTime = customEndTime - customStartTime;
      
      expect(customResult).toBeDefined();
      
      // Verify parsing performance impact is acceptable
      const performanceRatio = customTime / baselineTime;
      const performanceIncrease = customTime - baselineTime;
      
      // Custom analyzers shouldn't increase parsing time by more than 5x
      expect(performanceRatio).toBeLessThan(5);
      
      // Absolute increase should be reasonable for 15 additional analyzers
      expect(performanceIncrease).toBeLessThan(500); // < 500ms increase
      
      console.log(`Parsing performance impact - Baseline: ${baselineTime.toFixed(2)}ms, With 15 analyzers: ${customTime.toFixed(2)}ms, Ratio: ${performanceRatio.toFixed(2)}x`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in registration time', () => {
      const analyzerCounts = [10, 20, 30, 40, 50];
      const registrationTimes: number[] = [];
      
      analyzerCounts.forEach(count => {
        factory.reset();
        factory.initialize();
        
        const mockAnalyzers = createMockAnalyzers(count);
        const analyzerConfigs: AnalyzerConfig[] = mockAnalyzers.map((analyzer, index) => ({
          name: `RegressionTestAnalyzer_${count}_${index}`,
          analyzer: analyzer,
          dependencies: [],
          priority: 1
        }));
        
        const startTime = performance.now();
        const registrationResults = factory.registerCustomAnalyzers(analyzerConfigs);
        const endTime = performance.now();
        
        const registrationTime = endTime - startTime;
        registrationTimes.push(registrationTime);
        
        // Verify registrations succeeded
        expect(registrationResults).toHaveLength(count);
        registrationResults.forEach(result => {
          expect(result.success).toBe(true);
        });
      });
      
      // Analyze performance trend
      const timePerAnalyzerTrend = registrationTimes.map((time, index) => 
        time / analyzerCounts[index]
      );
      
      // Verify no significant performance regression
      // Time per analyzer shouldn't increase dramatically across test cases
      const minTimePerAnalyzer = Math.min(...timePerAnalyzerTrend);
      const maxTimePerAnalyzer = Math.max(...timePerAnalyzerTrend);
      const regressionRatio = maxTimePerAnalyzer / minTimePerAnalyzer;
      
      // Performance shouldn't degrade by more than 3x across different scales
      expect(regressionRatio).toBeLessThan(3);
      
      console.log('Performance trend analysis:');
      analyzerCounts.forEach((count, index) => {
        console.log(`  ${count} analyzers: ${registrationTimes[index].toFixed(2)}ms (${timePerAnalyzerTrend[index].toFixed(2)}ms per analyzer)`);
      });
      console.log(`  Regression ratio: ${regressionRatio.toFixed(2)}x`);
    });
  });
});