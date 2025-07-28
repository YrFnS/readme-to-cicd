/**
 * Performance validation tests for integration overhead
 * Tests system performance under various load conditions and integration scenarios
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { ResultAggregator } from '../../src/parser/utils/result-aggregator';
import { 
  loadFixtureCategory,
  measurePerformance,
  generatePerformanceReport
} from '../utils/test-helpers';
import { EnhancedAnalyzerResult } from '../../src/parser/types';

describe('Performance Integration Tests', () => {
  let parser: ReadmeParserImpl;
  let aggregator: ResultAggregator;
  let realWorldSamples: Map<string, string>;
  let performanceBaseline: Map<string, any>;

  beforeAll(async () => {
    parser = new ReadmeParserImpl({
      enableCaching: true,
      enablePerformanceMonitoring: true
    });
    aggregator = new ResultAggregator();
    realWorldSamples = await loadFixtureCategory('real-world-samples');
    performanceBaseline = new Map();
  });

  beforeEach(() => {
    // Clear performance data for clean measurements
    parser.clearPerformanceData();
  });

  afterEach(() => {
    // Force garbage collection if available (for more accurate memory measurements)
    if (global.gc) {
      global.gc();
    }
  });

  describe('Integration Overhead Analysis', () => {
    it('should measure baseline performance with minimal analyzers', async () => {
      const content = realWorldSamples.get('react-app.md')!;
      
      // Measure with minimal analyzer set
      const { result, metrics } = await measurePerformance(
        () => parser.parseContentWithAnalyzers(content, ['MetadataExtractor']),
        5
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      
      // Store baseline for comparison
      performanceBaseline.set('minimal', metrics);
      
      console.log(generatePerformanceReport('Baseline (Minimal Analyzers)', metrics));
      
      // Baseline should be fast
      expect(metrics.parseTime).toBeLessThan(100); // Under 100ms
      expect(metrics.memoryUsage).toBeLessThan(10 * 1024 * 1024); // Under 10MB
    });

    it('should measure performance with full analyzer integration', async () => {
      const content = realWorldSamples.get('react-app.md')!;
      
      // Measure with all analyzers
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        5
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      
      const baseline = performanceBaseline.get('minimal');
      if (baseline) {
        const timeOverhead = metrics.parseTime / baseline.parseTime;
        const memoryOverhead = metrics.memoryUsage / Math.max(baseline.memoryUsage, 1);
        
        console.log(generatePerformanceReport('Full Integration', metrics, baseline));
        console.log(`Integration Overhead - Time: ${timeOverhead.toFixed(2)}x, Memory: ${memoryOverhead.toFixed(2)}x`);
        
        // Integration overhead should be reasonable
        expect(timeOverhead).toBeLessThan(4); // No more than 4x slower
        expect(memoryOverhead).toBeLessThan(6); // No more than 6x memory
      }
      
      // Full integration should still meet performance requirements
      expect(metrics.parseTime).toBeLessThan(300); // Under 300ms
      expect(metrics.memoryUsage).toBeLessThan(40 * 1024 * 1024); // Under 40MB
    });

    it('should measure incremental analyzer addition overhead', async () => {
      const content = realWorldSamples.get('python-ml-project.md')!;
      const analyzerSets = [
        ['MetadataExtractor'],
        ['MetadataExtractor', 'LanguageDetector'],
        ['MetadataExtractor', 'LanguageDetector', 'DependencyExtractor'],
        ['MetadataExtractor', 'LanguageDetector', 'DependencyExtractor', 'CommandExtractor'],
        ['MetadataExtractor', 'LanguageDetector', 'DependencyExtractor', 'CommandExtractor', 'TestingDetector']
      ];
      
      const incrementalResults = [];
      
      for (const analyzers of analyzerSets) {
        const { result, metrics } = await measurePerformance(
          () => parser.parseContentWithAnalyzers(content, analyzers),
          3
        );
        
        expect(result.success).toBe(true);
        
        incrementalResults.push({
          analyzerCount: analyzers.length,
          analyzers: analyzers.join(', '),
          parseTime: metrics.parseTime,
          memoryUsage: metrics.memoryUsage
        });
      }
      
      // Verify incremental overhead is reasonable
      for (let i = 1; i < incrementalResults.length; i++) {
        const current = incrementalResults[i];
        const previous = incrementalResults[i - 1];
        
        const timeIncrease = current.parseTime / previous.parseTime;
        const memoryIncrease = current.memoryUsage / Math.max(previous.memoryUsage, 1);
        
        // Each additional analyzer shouldn't more than double the time/memory
        expect(timeIncrease).toBeLessThan(2);
        expect(memoryIncrease).toBeLessThan(2.5);
        
        console.log(`${current.analyzerCount} analyzers: ${current.parseTime.toFixed(1)}ms, ${(current.memoryUsage/1024/1024).toFixed(1)}MB`);
      }
    });

    it('should validate parallel analyzer execution efficiency', async () => {
      const content = realWorldSamples.get('go-microservice.md')!;
      
      // Measure sequential execution (simulated)
      const sequentialStart = Date.now();
      const analyzers = ['MetadataExtractor', 'LanguageDetector', 'DependencyExtractor', 'CommandExtractor'];
      
      for (const analyzer of analyzers) {
        await parser.parseContentWithAnalyzers(content, [analyzer]);
      }
      const sequentialTime = Date.now() - sequentialStart;
      
      // Measure parallel execution (actual implementation)
      const { metrics: parallelMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      // Parallel execution should be significantly faster than sequential
      const parallelizationEfficiency = sequentialTime / parallelMetrics.parseTime;
      
      console.log(`Sequential (simulated): ${sequentialTime}ms`);
      console.log(`Parallel (actual): ${parallelMetrics.parseTime.toFixed(1)}ms`);
      console.log(`Parallelization efficiency: ${parallelizationEfficiency.toFixed(2)}x`);
      
      // Should see some parallelization benefit
      expect(parallelizationEfficiency).toBeGreaterThan(1.5);
    });
  });

  describe('Caching Performance Impact', () => {
    it('should validate AST caching improves performance', async () => {
      const content = realWorldSamples.get('rust-cli-tool.md')!;
      
      // First parse (cold cache)
      const { metrics: coldMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        1
      );
      
      // Second parse (warm cache)
      const { metrics: warmMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        1
      );
      
      // Third parse (should still be cached)
      const { metrics: cachedMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        1
      );
      
      const cacheSpeedup = coldMetrics.parseTime / warmMetrics.parseTime;
      const cacheConsistency = Math.abs(warmMetrics.parseTime - cachedMetrics.parseTime) / warmMetrics.parseTime;
      
      console.log(`Cold cache: ${coldMetrics.parseTime.toFixed(1)}ms`);
      console.log(`Warm cache: ${warmMetrics.parseTime.toFixed(1)}ms`);
      console.log(`Cache speedup: ${cacheSpeedup.toFixed(2)}x`);
      console.log(`Cache consistency: ${(cacheConsistency * 100).toFixed(1)}% variation`);
      
      // Cache should provide meaningful speedup
      expect(cacheSpeedup).toBeGreaterThan(1.2); // At least 20% improvement
      
      // Cached results should be consistent
      expect(cacheConsistency).toBeLessThan(0.1); // Less than 10% variation
    });

    it('should validate cache memory efficiency', async () => {
      const samples = Array.from(realWorldSamples.values()).slice(0, 3);
      const memoryUsages = [];
      
      // Parse multiple files to populate cache
      for (const content of samples) {
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          1
        );
        memoryUsages.push(metrics.memoryUsage);
      }
      
      // Re-parse same files (should use cache)
      const cachedMemoryUsages = [];
      for (const content of samples) {
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          1
        );
        cachedMemoryUsages.push(metrics.memoryUsage);
      }
      
      // Cache shouldn't significantly increase memory usage
      const avgInitialMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
      const avgCachedMemory = cachedMemoryUsages.reduce((a, b) => a + b, 0) / cachedMemoryUsages.length;
      const memoryIncrease = avgCachedMemory / avgInitialMemory;
      
      console.log(`Average initial memory: ${(avgInitialMemory/1024/1024).toFixed(1)}MB`);
      console.log(`Average cached memory: ${(avgCachedMemory/1024/1024).toFixed(1)}MB`);
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}x`);
      
      // Cache shouldn't more than double memory usage
      expect(memoryIncrease).toBeLessThan(2);
    });
  });

  describe('Stress Testing and Load Validation', () => {
    it('should handle rapid successive parsing requests', async () => {
      const content = realWorldSamples.get('react-app.md')!;
      const requestCount = 10;
      const concurrentRequests = [];
      
      // Create concurrent parsing requests
      for (let i = 0; i < requestCount; i++) {
        concurrentRequests.push(parser.parseContent(content));
      }
      
      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Average time per request should be reasonable
      const avgTimePerRequest = totalTime / requestCount;
      expect(avgTimePerRequest).toBeLessThan(200); // Under 200ms average
      
      console.log(`${requestCount} concurrent requests completed in ${totalTime}ms`);
      console.log(`Average time per request: ${avgTimePerRequest.toFixed(1)}ms`);
    });

    it('should maintain performance with large file processing', async () => {
      // Generate large README content
      const largeContent = `
# Large Project Documentation

${Array(100).fill(0).map((_, i) => `
## Section ${i + 1}

This is a large section with multiple code blocks and dependencies.

### Installation
\`\`\`bash
npm install package-${i}
pip install python-package-${i}
go get github.com/example/package-${i}
\`\`\`

### Usage
\`\`\`javascript
const package${i} = require('package-${i}');
package${i}.initialize();
\`\`\`

\`\`\`python
import python_package_${i}
python_package_${i}.run()
\`\`\`

### Testing
\`\`\`bash
npm test package-${i}
pytest tests/test_package_${i}.py
go test ./package-${i}/...
\`\`\`
`).join('\n')}
      `.trim();
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(largeContent),
        2
      );
      
      metrics.fileSize = Buffer.byteLength(largeContent, 'utf8');
      metrics.linesCount = largeContent.split('\n').length;
      
      expect(result.success).toBe(true);
      
      // Should handle large files within reasonable time/memory limits
      expect(metrics.parseTime).toBeLessThan(2000); // Under 2 seconds
      expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB
      
      const throughput = metrics.fileSize / 1024 / (metrics.parseTime / 1000);
      expect(throughput).toBeGreaterThan(5); // At least 5 KB/s
      
      console.log(generatePerformanceReport('Large File Processing', metrics));
      console.log(`File size: ${(metrics.fileSize/1024).toFixed(1)}KB, Lines: ${metrics.linesCount}`);
    });

    it('should validate memory stability under repeated parsing', async () => {
      const content = realWorldSamples.get('python-ml-project.md')!;
      const iterations = 20;
      const memoryUsages = [];
      
      // Perform repeated parsing
      for (let i = 0; i < iterations; i++) {
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          1
        );
        memoryUsages.push(metrics.memoryUsage);
        
        // Force garbage collection periodically
        if (i % 5 === 0 && global.gc) {
          global.gc();
        }
      }
      
      // Analyze memory usage trend
      const firstHalf = memoryUsages.slice(0, iterations / 2);
      const secondHalf = memoryUsages.slice(iterations / 2);
      
      const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const memoryGrowth = (avgSecondHalf - avgFirstHalf) / avgFirstHalf;
      
      console.log(`Memory usage over ${iterations} iterations:`);
      console.log(`First half average: ${(avgFirstHalf/1024/1024).toFixed(1)}MB`);
      console.log(`Second half average: ${(avgSecondHalf/1024/1024).toFixed(1)}MB`);
      console.log(`Memory growth: ${(memoryGrowth * 100).toFixed(1)}%`);
      
      // Memory shouldn't grow significantly over time (indicating memory leaks)
      expect(memoryGrowth).toBeLessThan(0.2); // Less than 20% growth
    });
  });

  describe('ResultAggregator Performance', () => {
    it('should validate aggregation performance with multiple analyzers', async () => {
      const mockResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'MetadataExtractor',
          data: { name: 'Test Project', description: 'A test project' },
          confidence: 0.9,
          sources: ['text-mention'],
          metadata: { processingTime: 50, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'LanguageDetector',
          data: Array(10).fill(0).map((_, i) => ({
            name: `Language${i}`,
            confidence: 0.8 - (i * 0.05),
            sources: ['code-block'],
            frameworks: [`Framework${i}`]
          })),
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.8, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: Array(20).fill(0).map((_, i) => ({
              name: `package${i}.json`,
              type: 'npm',
              mentioned: true,
              confidence: 0.8
            })),
            installCommands: Array(15).fill(0).map((_, i) => ({
              command: `npm install package${i}`,
              confidence: 0.8
            })),
            packages: Array(50).fill(0).map((_, i) => ({
              name: `dep${i}`,
              version: '1.0.0',
              manager: 'npm',
              confidence: 0.7
            })),
            dependencies: [],
            devDependencies: []
          },
          confidence: 0.7,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.7, completeness: 0.8 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: Array(10).fill(0).map((_, i) => ({
              command: `build command ${i}`,
              confidence: 0.8
            })),
            test: Array(8).fill(0).map((_, i) => ({
              command: `test command ${i}`,
              confidence: 0.8
            })),
            run: Array(5).fill(0).map((_, i) => ({
              command: `run command ${i}`,
              confidence: 0.8
            })),
            install: Array(3).fill(0).map((_, i) => ({
              command: `install command ${i}`,
              confidence: 0.8
            })),
            other: []
          },
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.8, completeness: 0.8 }
        }
      ];
      
      const { result, metrics } = await measurePerformance(
        () => aggregator.aggregateEnhanced(mockResults),
        5
      );
      
      expect(result).toBeDefined();
      expect(result.validationStatus.isValid).toBe(true);
      
      // Aggregation should be fast even with large datasets
      expect(metrics.parseTime).toBeLessThan(100); // Under 100ms
      expect(metrics.memoryUsage).toBeLessThan(20 * 1024 * 1024); // Under 20MB
      
      console.log(`Aggregation performance: ${metrics.parseTime.toFixed(1)}ms, ${(metrics.memoryUsage/1024/1024).toFixed(1)}MB`);
      console.log(`Data processed: ${mockResults.length} analyzers, ~100 total items`);
    });

    it('should validate data flow validation performance', async () => {
      // Create complex analyzer results to stress test data flow validation
      const complexResults: EnhancedAnalyzerResult[] = Array(8).fill(0).map((_, i) => ({
        analyzerName: `Analyzer${i}`,
        data: Array(20).fill(0).map((_, j) => ({ item: `data${j}`, value: Math.random() })),
        confidence: 0.8,
        sources: ['code-block', 'text-mention'],
        metadata: { processingTime: 50 + i * 10, dataQuality: 0.8, completeness: 0.8 }
      }));
      
      const { result, metrics } = await measurePerformance(
        () => aggregator.aggregateEnhanced(complexResults),
        3
      );
      
      expect(result).toBeDefined();
      
      const validations = aggregator.getDataFlowValidations();
      expect(validations.length).toBeGreaterThan(0);
      
      // Data flow validation should complete quickly
      expect(metrics.parseTime).toBeLessThan(200); // Under 200ms
      
      console.log(`Data flow validation: ${validations.length} validations in ${metrics.parseTime.toFixed(1)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish performance benchmarks', async () => {
      const benchmarks = new Map();
      
      for (const [filename, content] of realWorldSamples) {
        if (!filename.endsWith('.md') || filename === 'README.md') continue;
        
        const { result, metrics } = await measurePerformance(
          () => parser.parseContent(content),
          5
        );
        
        expect(result.success).toBe(true);
        
        metrics.fileSize = Buffer.byteLength(content, 'utf8');
        metrics.linesCount = content.split('\n').length;
        
        const benchmark = {
          parseTime: metrics.parseTime,
          memoryUsage: metrics.memoryUsage,
          throughput: metrics.fileSize / 1024 / (metrics.parseTime / 1000),
          fileSize: metrics.fileSize,
          linesCount: metrics.linesCount
        };
        
        benchmarks.set(filename, benchmark);
      }
      
      // Log benchmarks for future regression testing
      console.log('\n📊 Performance Benchmarks:');
      for (const [filename, benchmark] of benchmarks) {
        console.log(`${filename}:`);
        console.log(`  Parse Time: ${benchmark.parseTime.toFixed(1)}ms`);
        console.log(`  Memory: ${(benchmark.memoryUsage/1024/1024).toFixed(1)}MB`);
        console.log(`  Throughput: ${benchmark.throughput.toFixed(1)} KB/s`);
        console.log(`  Size: ${(benchmark.fileSize/1024).toFixed(1)}KB (${benchmark.linesCount} lines)`);
      }
      
      // Store benchmarks for potential future use
      expect(benchmarks.size).toBeGreaterThan(0);
    });

    it('should validate performance consistency across test runs', async () => {
      const content = realWorldSamples.get('go-microservice.md')!;
      const runs = 10;
      const parseTimes = [];
      
      // Perform multiple runs
      for (let i = 0; i < runs; i++) {
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          1
        );
        parseTimes.push(metrics.parseTime);
      }
      
      // Calculate statistics
      const avgTime = parseTimes.reduce((a, b) => a + b, 0) / runs;
      const minTime = Math.min(...parseTimes);
      const maxTime = Math.max(...parseTimes);
      const stdDev = Math.sqrt(
        parseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / runs
      );
      
      const coefficientOfVariation = stdDev / avgTime;
      
      console.log(`Performance consistency over ${runs} runs:`);
      console.log(`Average: ${avgTime.toFixed(1)}ms`);
      console.log(`Range: ${minTime.toFixed(1)}ms - ${maxTime.toFixed(1)}ms`);
      console.log(`Standard Deviation: ${stdDev.toFixed(1)}ms`);
      console.log(`Coefficient of Variation: ${(coefficientOfVariation * 100).toFixed(1)}%`);
      
      // Performance should be reasonably consistent
      expect(coefficientOfVariation).toBeLessThan(0.3); // Less than 30% variation
      expect(maxTime / minTime).toBeLessThan(2); // Max shouldn't be more than 2x min
    });
  });
});