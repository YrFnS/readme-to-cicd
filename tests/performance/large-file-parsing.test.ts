/**
 * Performance tests for large README files and complex parsing scenarios
 * Updated to use streaming data instead of static large fixtures
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { measurePerformance, generatePerformanceReport, PerformanceMetrics } from '../utils/test-helpers';
import { 
  StreamingDataFactory, 
  StreamingDataUtils,
  type StreamingDataConfig 
} from '../../src/shared/streaming-test-data';
import {
  initializeMemoryAssertions,
  assertMemoryWithinThresholds,
  assertMemoryGrowthDuringOperation,
  setMemoryBaseline,
  cleanupMemoryAssertions,
  type MemoryThreshold
} from '../../src/shared/memory-usage-assertions';
import { getTestWorkerMemoryMonitor } from '../../src/shared/test-worker-memory-monitor';

describe('Large File Performance Tests', () => {
  let parser: ReadmeParserImpl;
  const tempFiles: string[] = [];
  let baselineMetrics: PerformanceMetrics;

  beforeAll(async () => {
    parser = new ReadmeParserImpl();
    
    // Initialize memory assertions for critical performance tests
    const memoryMonitor = getTestWorkerMemoryMonitor({
      maxMemoryBytes: 500 * 1024 * 1024, // 500MB limit for performance tests
      warningThreshold: 0.7,
      criticalThreshold: 0.85,
      enableDetailedLogging: true
    });
    initializeMemoryAssertions(memoryMonitor);
    
    // Establish baseline with a small file
    const smallContent = `# Small Test\n\nA simple test file.\n\n\`\`\`javascript\nconsole.log("test");\n\`\`\``;
    const { metrics } = await measurePerformance(
      () => parser.parseContent(smallContent),
      5
    );
    
    baselineMetrics = {
      ...metrics,
      fileSize: Buffer.byteLength(smallContent, 'utf8'),
      linesCount: smallContent.split('\n').length
    };
    
    console.log('📊 Baseline Performance:', baselineMetrics);
  });

  afterAll(async () => {
    // Clean up temporary files
    for (const file of tempFiles) {
      try {
        await unlink(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Cleanup memory assertions
    cleanupMemoryAssertions();
  });

  describe('Streaming Generated Large Files', () => {
    it('should handle small streaming README (1K lines) efficiently', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'small' };
      const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
      
      // Set memory baseline for this test
      setMemoryBaseline('small-streaming-readme');
      
      // Define memory thresholds for small files
      const memoryThresholds: MemoryThreshold = {
        maxMemoryBytes: 30 * 1024 * 1024, // 30MB limit for small files
        maxGrowthBytes: 20 * 1024 * 1024, // 20MB growth limit
        maxUsagePercentage: 80 // 80% usage limit
      };
      
      const { result: parseResult, assertion } = await assertMemoryGrowthDuringOperation(
        () => parser.parseContent(content),
        20 * 1024 * 1024 // 20MB max growth
      );
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      metrics.fileSize = streamingMetrics.bytesGenerated;
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Memory assertions to prevent regression
      expect(assertion.passed).toBe(true);
      const memoryResult = assertMemoryWithinThresholds(memoryThresholds);
      expect(memoryResult.passed).toBe(true);
      
      // Performance expectations for small files
      expect(metrics.parseTime).toBeLessThan(200); // Under 200ms
      expect(metrics.memoryUsage).toBeLessThan(20 * 1024 * 1024); // Under 20MB
      
      // Should detect multiple languages
      expect(result.data!.languages.length).toBeGreaterThan(5);
      
      console.log(generatePerformanceReport('Small Streaming README', metrics, baselineMetrics));
      console.log(`   Streaming generation: ${streamingMetrics.generationTime}ms, ${(streamingMetrics.bytesGenerated / 1024).toFixed(1)}KB`);
      console.log(`   Memory assertion: ${assertion.passed ? '✅' : '❌'} Growth: ${(assertion.memoryGrowth! / 1024 / 1024).toFixed(1)}MB`);
    });

    it('should handle medium streaming README (5K lines) within limits', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'medium' };
      const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
      
      // Set memory baseline for medium files
      setMemoryBaseline('medium-streaming-readme');
      
      // Define stricter memory thresholds for medium files
      const memoryThresholds: MemoryThreshold = {
        maxMemoryBytes: 60 * 1024 * 1024, // 60MB limit for medium files
        maxGrowthBytes: 40 * 1024 * 1024, // 40MB growth limit
        maxUsagePercentage: 75, // 75% usage limit
        minEfficiencyScore: 70 // Require good efficiency
      };
      
      const { result: parseResult, assertion } = await assertMemoryGrowthDuringOperation(
        () => parser.parseContent(content),
        40 * 1024 * 1024 // 40MB max growth
      );
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      metrics.fileSize = streamingMetrics.bytesGenerated;
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Critical memory assertions to prevent heap exhaustion
      expect(assertion.passed).toBe(true);
      const memoryResult = assertMemoryWithinThresholds(memoryThresholds);
      expect(memoryResult.passed).toBe(true);
      
      // Performance expectations for medium files
      expect(metrics.parseTime).toBeLessThan(500); // Under 500ms
      expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Under 50MB
      
      // Should detect many languages and commands
      expect(result.data!.languages.length).toBeGreaterThan(10);
      expect(result.data!.commands.build.length).toBeGreaterThan(20);
      
      console.log(generatePerformanceReport('Medium Streaming README', metrics, baselineMetrics));
      console.log(`   Streaming generation: ${streamingMetrics.generationTime}ms, ${(streamingMetrics.bytesGenerated / 1024).toFixed(1)}KB`);
      console.log(`   Memory assertion: ${assertion.passed ? '✅' : '❌'} Growth: ${(assertion.memoryGrowth! / 1024 / 1024).toFixed(1)}MB`);
    });

    it('should handle large streaming README (10K lines) gracefully', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'large' };
      const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
      
      // Set memory baseline for large files - critical for heap exhaustion prevention
      setMemoryBaseline('large-streaming-readme');
      
      // Define critical memory thresholds for large files to prevent JS heap out of memory
      const criticalMemoryThresholds: MemoryThreshold = {
        maxMemoryBytes: 120 * 1024 * 1024, // 120MB critical limit for large files
        maxGrowthBytes: 80 * 1024 * 1024, // 80MB growth limit
        maxUsagePercentage: 70, // 70% usage limit to prevent heap exhaustion
        minEfficiencyScore: 60 // Lower efficiency acceptable for large files
      };
      
      const { result: parseResult, assertion } = await assertMemoryGrowthDuringOperation(
        () => parser.parseContent(content),
        80 * 1024 * 1024, // 80MB max growth - critical for preventing memory exhaustion
        { forceGC: true } // Force GC to prevent memory buildup
      );
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        2 // Fewer iterations for large files
      );
      
      metrics.fileSize = streamingMetrics.bytesGenerated;
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // CRITICAL: Memory assertions to prevent JS heap out of memory errors
      expect(assertion.passed).toBe(true);
      const memoryResult = assertMemoryWithinThresholds(criticalMemoryThresholds, {
        forceGC: true,
        includeDetails: true
      });
      expect(memoryResult.passed).toBe(true);
      
      // Performance expectations for large files
      expect(metrics.parseTime).toBeLessThan(1000); // Under 1 second
      expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB
      
      // Should still detect content accurately
      expect(result.data!.languages.length).toBeGreaterThan(15);
      expect(result.data!.commands.build.length).toBeGreaterThan(50);
      
      console.log(generatePerformanceReport('Large Streaming README', metrics, baselineMetrics));
      console.log(`   Streaming generation: ${streamingMetrics.generationTime}ms, ${(streamingMetrics.bytesGenerated / 1024).toFixed(1)}KB`);
      console.log(`   🚨 CRITICAL Memory assertion: ${assertion.passed ? '✅' : '❌'} Growth: ${(assertion.memoryGrowth! / 1024 / 1024).toFixed(1)}MB`);
    });

    it('should handle extra large streaming README (20K lines) without crashing', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'xlarge' };
      const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
      
      // Set memory baseline for extra large files - CRITICAL for preventing crashes
      setMemoryBaseline('xlarge-streaming-readme');
      
      // Define CRITICAL memory thresholds for extra large files to prevent system crashes
      const emergencyMemoryThresholds: MemoryThreshold = {
        maxMemoryBytes: 250 * 1024 * 1024, // 250MB emergency limit
        maxGrowthBytes: 150 * 1024 * 1024, // 150MB growth limit
        maxUsagePercentage: 60, // 60% usage limit - very conservative to prevent crashes
        minEfficiencyScore: 50 // Lower efficiency acceptable for very large files
      };
      
      const { result: parseResult, assertion } = await assertMemoryGrowthDuringOperation(
        () => parser.parseContent(content),
        150 * 1024 * 1024, // 150MB max growth - CRITICAL for system stability
        { 
          forceGC: true, // Force GC before and after
          includeDetails: true 
        }
      );
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        1 // Single iteration for very large files
      );
      
      metrics.fileSize = streamingMetrics.bytesGenerated;
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // EMERGENCY: Memory assertions to prevent system crashes and JS heap exhaustion
      expect(assertion.passed).toBe(true);
      const memoryResult = assertMemoryWithinThresholds(emergencyMemoryThresholds, {
        forceGC: true,
        includeDetails: true,
        logOnSuccess: true
      });
      expect(memoryResult.passed).toBe(true);
      
      // Performance expectations for extra large files
      expect(metrics.parseTime).toBeLessThan(2000); // Under 2 seconds
      expect(metrics.memoryUsage).toBeLessThan(200 * 1024 * 1024); // Under 200MB
      
      // Should maintain accuracy even with large files
      expect(result.data!.languages.length).toBeGreaterThan(15);
      expect(result.data!.confidence.overall).toBeGreaterThan(0.5);
      
      console.log(generatePerformanceReport('Extra Large Streaming README', metrics, baselineMetrics));
      console.log(`   Streaming generation: ${streamingMetrics.generationTime}ms, ${(streamingMetrics.bytesGenerated / 1024).toFixed(1)}KB`);
      console.log(`   🚨 EMERGENCY Memory assertion: ${assertion.passed ? '✅' : '❌'} Growth: ${(assertion.memoryGrowth! / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   🛡️  System protection: Memory usage ${(memoryResult.currentUsage.usagePercentage).toFixed(1)}% of limit`);
    });
  });

  describe('Streaming Memory Usage Patterns', () => {
    it('should show linear memory growth with file size using streaming data', async () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const memoryResults: Array<{ size: string; fileSize: number; memoryUsage: number; streamingMetrics: any }> = [];
      
      for (const size of sizes) {
        const config: StreamingDataConfig = { type: 'readme', size };
        const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
        
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content)
        );
        
        memoryResults.push({
          size,
          fileSize: streamingMetrics.bytesGenerated,
          memoryUsage: metrics.memoryUsage,
          streamingMetrics
        });
      }
      
      // Memory usage should increase with file size but not exponentially
      for (let i = 1; i < memoryResults.length; i++) {
        const current = memoryResults[i];
        const previous = memoryResults[i - 1];
        
        const fileSizeRatio = current.fileSize / previous.fileSize;
        const memoryRatio = current.memoryUsage / previous.memoryUsage;
        
        // Memory growth should be reasonable (not more than 3x file size growth)
        expect(memoryRatio).toBeLessThan(fileSizeRatio * 3);
        
        console.log(`${previous.size} → ${current.size}: File ${fileSizeRatio.toFixed(1)}x, Memory ${memoryRatio.toFixed(1)}x`);
        console.log(`   Streaming generation: ${current.streamingMetrics.generationTime}ms`);
      }
    });

    it('should not leak memory across multiple streaming parses', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'medium' };
      const iterations = 5;
      const memoryUsages: number[] = [];
      const generationTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startMemory = process.memoryUsage().heapUsed;
        
        const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
        await parser.parseContent(content);
        
        generationTimes.push(streamingMetrics.generationTime);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const endMemory = process.memoryUsage().heapUsed;
        memoryUsages.push(endMemory - startMemory);
      }
      
      // Memory usage should be relatively stable across iterations
      const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
      const maxDeviation = Math.max(...memoryUsages.map(m => Math.abs(m - avgMemory)));
      const avgGenerationTime = generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length;
      
      // Deviation should not be more than 50% of average
      expect(maxDeviation).toBeLessThan(avgMemory * 0.5);
      
      console.log(`Streaming memory usage across ${iterations} iterations:`);
      console.log(`Average memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Max deviation: ${(maxDeviation / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Average generation time: ${avgGenerationTime.toFixed(1)}ms`);
    });
  });

  describe('Complex Parsing Scenarios', () => {
    it('should handle deeply nested markdown structures', async () => {
      let content = '# Deep Nesting Test\n\n';
      
      // Create deeply nested structure
      for (let depth = 1; depth <= 10; depth++) {
        const header = '#'.repeat(Math.min(depth + 1, 6));
        content += `${header} Level ${depth}\n\n`;
        
        // Add content at each level
        content += `This is content at nesting level ${depth}.\n\n`;
        
        // Add code blocks at various levels
        if (depth % 2 === 0) {
          const lang = ['javascript', 'python', 'go', 'rust'][depth % 4];
          content += `\`\`\`${lang}\n// Code at level ${depth}\nfunction level${depth}() {\n  return ${depth};\n}\n\`\`\`\n\n`;
        }
        
        // Add lists
        for (let item = 1; item <= depth; item++) {
          content += `${'  '.repeat(depth - 1)}- Item ${item} at level ${depth}\n`;
        }
        content += '\n';
      }
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content)
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should handle nested structure without performance degradation
      expect(metrics.parseTime).toBeLessThan(100);
      
      console.log(generatePerformanceReport('Deep Nesting Test', metrics, baselineMetrics));
    });

    it('should handle many code blocks efficiently', async () => {
      let content = '# Many Code Blocks Test\n\n';
      
      const languages = ['javascript', 'python', 'go', 'rust', 'java', 'cpp', 'csharp', 'php'];
      
      // Generate 100 code blocks
      for (let i = 0; i < 100; i++) {
        const lang = languages[i % languages.length];
        content += `## Section ${i + 1}\n\n`;
        content += `Example ${i + 1} using ${lang}:\n\n`;
        content += `\`\`\`${lang}\n`;
        content += `// Example ${i + 1}\n`;
        content += `function example${i + 1}() {\n`;
        content += `  console.log("Example ${i + 1}");\n`;
        content += `  return ${i + 1};\n`;
        content += `}\n`;
        content += `\`\`\`\n\n`;
      }
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content)
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should detect all languages
      expect(result.data!.languages.length).toBe(languages.length);
      
      // Should handle many code blocks efficiently
      expect(metrics.parseTime).toBeLessThan(300);
      
      console.log(generatePerformanceReport('Many Code Blocks Test', metrics, baselineMetrics));
    });

    it('should handle mixed content types efficiently', async () => {
      let content = '# Mixed Content Test\n\n';
      
      // Mix of different content types
      const contentTypes = [
        () => 'Regular paragraph text with some **bold** and *italic* formatting.\n\n',
        () => '| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Data 1   | Data 2   | Data 3   |\n\n',
        () => '```javascript\nfunction test() { return true; }\n```\n\n',
        () => '- List item 1\n- List item 2\n  - Nested item\n- List item 3\n\n',
        () => '> This is a blockquote with some important information.\n\n',
        () => '[Link text](https://example.com) and ![Image](image.png)\n\n',
        () => '`inline code` and some <strong>HTML</strong> content.\n\n'
      ];
      
      // Generate 200 mixed content sections
      for (let i = 0; i < 200; i++) {
        content += `### Section ${i + 1}\n\n`;
        
        // Add 2-4 different content types per section
        const typesToAdd = Math.floor(Math.random() * 3) + 2;
        for (let j = 0; j < typesToAdd; j++) {
          const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
          content += contentType();
        }
      }
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content)
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should handle mixed content without significant performance impact
      expect(metrics.parseTime).toBeLessThan(400);
      
      console.log(generatePerformanceReport('Mixed Content Test', metrics, baselineMetrics));
    });
  });

  describe('Streaming vs Static Fixture Comparison', () => {
    it('should demonstrate memory benefits of streaming data', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'large' };
      
      // Test streaming approach
      const streamingStartMemory = process.memoryUsage().heapUsed;
      const { content: streamingContent, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
      const { metrics: streamingParseMetrics } = await measurePerformance(
        () => parser.parseContent(streamingContent),
        1
      );
      const streamingEndMemory = process.memoryUsage().heapUsed;
      
      // Test static approach (simulate loading large fixture)
      const staticStartMemory = process.memoryUsage().heapUsed;
      const staticContent = Buffer.from(streamingContent); // Simulate static fixture loading
      const { metrics: staticParseMetrics } = await measurePerformance(
        () => parser.parseContent(staticContent.toString()),
        1
      );
      const staticEndMemory = process.memoryUsage().heapUsed;
      
      const streamingMemoryUsage = streamingEndMemory - streamingStartMemory;
      const staticMemoryUsage = staticEndMemory - staticStartMemory;
      const memoryImprovement = ((staticMemoryUsage - streamingMemoryUsage) / staticMemoryUsage) * 100;
      
      console.log('\n💾 Memory Usage Comparison:');
      console.log(`Streaming: ${(streamingMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Static: ${(staticMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Improvement: ${memoryImprovement.toFixed(1)}%`);
      console.log(`Generation time: ${streamingMetrics.generationTime}ms`);
      
      // Streaming should use less or similar memory
      expect(streamingMemoryUsage).toBeLessThanOrEqual(staticMemoryUsage * 1.1); // Allow 10% overhead
    });
  });

  describe('Streaming Throughput Benchmarks', () => {
    it('should maintain consistent throughput across different file sizes', async () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const throughputResults: Array<{ size: string; throughput: number; generationThroughput: number }> = [];
      
      for (const size of sizes) {
        const config: StreamingDataConfig = { type: 'readme', size };
        const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
        
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          3
        );
        
        const fileSize = streamingMetrics.bytesGenerated;
        const parseThroughput = fileSize / 1024 / (metrics.parseTime / 1000); // KB/s
        const generationThroughput = fileSize / 1024 / (streamingMetrics.generationTime / 1000); // KB/s
        
        throughputResults.push({ 
          size, 
          throughput: parseThroughput,
          generationThroughput 
        });
        
        // Minimum throughput expectations
        expect(parseThroughput).toBeGreaterThan(100); // At least 100 KB/s
        expect(generationThroughput).toBeGreaterThan(200); // At least 200 KB/s generation
      }
      
      console.log('\n📈 Streaming Throughput Results:');
      throughputResults.forEach(({ size, throughput, generationThroughput }) => {
        console.log(`${size}: Parse ${throughput.toFixed(2)} KB/s, Generate ${generationThroughput.toFixed(2)} KB/s`);
      });
      
      // Throughput should be relatively consistent
      const throughputs = throughputResults.map(r => r.throughput);
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
      const maxDeviation = Math.max(...throughputs.map(t => Math.abs(t - avgThroughput)));
      
      // Deviation should not be more than 50% of average
      expect(maxDeviation).toBeLessThan(avgThroughput * 0.5);
    });
  });
});