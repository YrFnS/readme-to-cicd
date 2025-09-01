/**
 * Integration tests for streaming test data with parser components
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import {
  StreamingDataFactory,
  StreamingDataUtils,
  type StreamingDataConfig,
  type StreamingDataMetrics
} from '../../src/shared/streaming-test-data';
import { measurePerformance, generatePerformanceReport } from '../utils/test-helpers';
import {
  initializeMemoryAssertions,
  assertMemoryWithinThresholds,
  assertMemoryGrowthDuringOperation,
  setMemoryBaseline,
  cleanupMemoryAssertions,
  type MemoryThreshold
} from '../../src/shared/memory-usage-assertions';
import { getTestWorkerMemoryMonitor } from '../../src/shared/test-worker-memory-monitor';

// Import streaming project generator
const {
  generateProjectReadme,
  generateProjectFiles,
  PROJECT_TEMPLATES
} = require('../fixtures/real-world-projects/streaming-project-generator.js');

describe('Streaming Data Integration Tests', () => {
  let parser: ReadmeParserImpl;
  let baselineMetrics: any;

  beforeAll(async () => {
    parser = new ReadmeParserImpl();
    
    // Initialize memory assertions for integration tests
    const memoryMonitor = getTestWorkerMemoryMonitor({
      maxMemoryBytes: 300 * 1024 * 1024, // 300MB limit for integration tests
      warningThreshold: 0.7,
      criticalThreshold: 0.85,
      enableDetailedLogging: true
    });
    initializeMemoryAssertions(memoryMonitor);
    
    // Establish baseline with small static content
    const smallContent = `# Test\n\nA simple test.\n\n\`\`\`javascript\nconsole.log("test");\n\`\`\``;
    const { metrics } = await measurePerformance(
      () => parser.parseContent(smallContent),
      3
    );
    
    baselineMetrics = {
      ...metrics,
      fileSize: Buffer.byteLength(smallContent, 'utf8'),
      linesCount: smallContent.split('\n').length
    };
  });

  afterAll(() => {
    // Cleanup memory assertions
    cleanupMemoryAssertions();
  });

  describe('Parser Integration', () => {
    it('should successfully parse streaming README content', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'small',
        languages: ['javascript', 'python', 'go'],
        frameworks: ['React', 'Express', 'Django']
      };

      const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
      
      // Parse the streaming content
      const { result, metrics: parseMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Should detect the specified languages
      const detectedLanguages = result.data!.languages;
      expect(detectedLanguages.length).toBeGreaterThan(0);
      expect(detectedLanguages.some(lang => ['javascript', 'python', 'go'].includes(lang))).toBe(true);

      // Should detect commands
      expect(result.data!.commands.build.length).toBeGreaterThan(0);
      expect(result.data!.commands.test.length).toBeGreaterThan(0);

      // Performance should be reasonable
      expect(parseMetrics.parseTime).toBeLessThan(500); // Under 500ms
      expect(streamingMetrics.generationTime).toBeLessThan(200); // Under 200ms

      console.log('📊 Streaming README Integration:');
      console.log(`  Generation: ${streamingMetrics.generationTime}ms, ${streamingMetrics.bytesGenerated} bytes`);
      console.log(`  Parsing: ${parseMetrics.parseTime}ms, ${detectedLanguages.length} languages detected`);
    });

    it('should handle medium-sized streaming content efficiently', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'medium'
      };

      const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
      
      const { result, metrics: parseMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        2
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Should detect multiple languages and frameworks
      expect(result.data!.languages.length).toBeGreaterThan(5);
      expect(result.data!.commands.build.length).toBeGreaterThan(10);

      // Performance expectations for medium content
      expect(parseMetrics.parseTime).toBeLessThan(1000); // Under 1 second
      expect(streamingMetrics.generationTime).toBeLessThan(500); // Under 500ms

      // Memory usage should be reasonable
      expect(parseMetrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Under 50MB

      console.log(generatePerformanceReport('Medium Streaming README', {
        ...parseMetrics,
        fileSize: streamingMetrics.bytesGenerated,
        linesCount: content.split('\n').length
      }, baselineMetrics));
    });

    it('should handle large streaming content without memory issues', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'large',
        maxMemoryUsage: 100 * 1024 * 1024 // 100MB limit
      };

      const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
      
      // Set memory baseline for large content integration test
      setMemoryBaseline('large-streaming-integration');
      
      // Define critical memory thresholds for integration test
      const integrationMemoryThresholds: MemoryThreshold = {
        maxMemoryBytes: 120 * 1024 * 1024, // 120MB limit for integration
        maxGrowthBytes: 80 * 1024 * 1024, // 80MB growth limit
        maxUsagePercentage: 75, // 75% usage limit
        minEfficiencyScore: 65 // Good efficiency required for integration
      };
      
      const { result: parseResult, assertion } = await assertMemoryGrowthDuringOperation(
        () => parser.parseContent(content),
        80 * 1024 * 1024, // 80MB max growth for integration test
        { forceGC: true }
      );
      
      const { result, metrics: parseMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        1 // Single iteration for large content
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // CRITICAL: Memory assertions for integration test stability
      expect(assertion.passed).toBe(true);
      const memoryResult = assertMemoryWithinThresholds(integrationMemoryThresholds);
      expect(memoryResult.passed).toBe(true);

      // Should maintain accuracy with large content
      expect(result.data!.languages.length).toBeGreaterThan(10);
      expect(result.data!.confidence.overall).toBeGreaterThan(0.5);

      // Should respect memory limits
      expect(streamingMetrics.peakMemoryUsage).toBeLessThan(config.maxMemoryUsage!);
      expect(parseMetrics.memoryUsage).toBeLessThan(config.maxMemoryUsage!);

      // Performance should still be acceptable
      expect(parseMetrics.parseTime).toBeLessThan(2000); // Under 2 seconds
      expect(streamingMetrics.generationTime).toBeLessThan(1000); // Under 1 second

      console.log('📊 Large Streaming Content Performance:');
      console.log(`  Content: ${(streamingMetrics.bytesGenerated / 1024).toFixed(1)}KB`);
      console.log(`  Generation: ${streamingMetrics.generationTime}ms`);
      console.log(`  Parsing: ${parseMetrics.parseTime}ms`);
      console.log(`  Memory: ${(parseMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
      console.log(`  🛡️  Memory assertion: ${assertion.passed ? '✅' : '❌'} Growth: ${(assertion.memoryGrowth! / 1024 / 1024).toFixed(1)}MB`);
    });

    it('should produce consistent parsing results across multiple generations', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'small',
        languages: ['javascript', 'python'],
        frameworks: ['React', 'Express']
      };

      const results = [];
      
      for (let i = 0; i < 3; i++) {
        const { content } = await StreamingDataFactory.generateString(config);
        const parseResult = await parser.parseContent(content);
        
        expect(parseResult.success).toBe(true);
        results.push(parseResult.data!);
      }

      // All results should detect similar patterns
      results.forEach(result => {
        expect(result.languages.length).toBeGreaterThan(0);
        expect(result.commands.build.length).toBeGreaterThan(0);
        expect(result.confidence.overall).toBeGreaterThan(0.3);
      });

      // Results should be reasonably consistent
      const languageCounts = results.map(r => r.languages.length);
      const avgLanguages = languageCounts.reduce((a, b) => a + b, 0) / languageCounts.length;
      const maxDeviation = Math.max(...languageCounts.map(c => Math.abs(c - avgLanguages)));
      
      expect(maxDeviation).toBeLessThan(avgLanguages * 0.5); // Within 50% of average
    });
  });

  describe('Memory Comparison with Static Fixtures', () => {
    it('should use less memory than equivalent static fixtures', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'medium'
      };

      // Generate equivalent static content
      const { content: streamingContent } = await StreamingDataFactory.generateString(config);
      
      // Compare memory usage
      const comparison = await StreamingDataUtils.compareMemoryUsage(config, streamingContent);

      expect(comparison.improvement.memoryReduction).toBeGreaterThan(0);
      
      console.log('💾 Memory Usage Comparison:');
      console.log(`  Static fixture: ${(comparison.static.memoryUsage / 1024).toFixed(1)}KB`);
      console.log(`  Streaming data: ${(comparison.streaming.peakMemoryUsage / 1024).toFixed(1)}KB`);
      console.log(`  Memory reduction: ${comparison.improvement.memoryReduction.toFixed(1)}%`);
      console.log(`  Time comparison: ${comparison.improvement.timeComparison.toFixed(2)}x`);
    });

    it('should demonstrate memory efficiency with multiple parsings', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'medium'
      };

      const iterations = 5;
      const streamingMemoryUsages: number[] = [];
      const staticMemoryUsages: number[] = [];

      // Test streaming approach
      for (let i = 0; i < iterations; i++) {
        const startMemory = process.memoryUsage().heapUsed;
        
        const { content } = await StreamingDataFactory.generateString(config);
        await parser.parseContent(content);
        
        if (global.gc) global.gc();
        
        const endMemory = process.memoryUsage().heapUsed;
        streamingMemoryUsages.push(endMemory - startMemory);
      }

      // Test static approach (simulate loading large fixtures)
      const { content: staticContent } = await StreamingDataFactory.generateString(config);
      
      for (let i = 0; i < iterations; i++) {
        const startMemory = process.memoryUsage().heapUsed;
        
        // Simulate loading static fixture
        const buffer = Buffer.from(staticContent);
        await parser.parseContent(buffer.toString());
        
        if (global.gc) global.gc();
        
        const endMemory = process.memoryUsage().heapUsed;
        staticMemoryUsages.push(endMemory - startMemory);
      }

      const avgStreamingMemory = streamingMemoryUsages.reduce((a, b) => a + b, 0) / streamingMemoryUsages.length;
      const avgStaticMemory = staticMemoryUsages.reduce((a, b) => a + b, 0) / staticMemoryUsages.length;

      // Streaming should use less memory on average
      expect(avgStreamingMemory).toBeLessThan(avgStaticMemory * 1.2); // Allow 20% overhead

      console.log('📈 Multiple Parsing Memory Comparison:');
      console.log(`  Streaming average: ${(avgStreamingMemory / 1024).toFixed(1)}KB`);
      console.log(`  Static average: ${(avgStaticMemory / 1024).toFixed(1)}KB`);
      console.log(`  Improvement: ${(((avgStaticMemory - avgStreamingMemory) / avgStaticMemory) * 100).toFixed(1)}%`);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should maintain good throughput with streaming data', async () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const throughputResults: Array<{ size: string; throughput: number; generationThroughput: number }> = [];

      for (const size of sizes) {
        const config: StreamingDataConfig = { type: 'readme', size };
        
        const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
        const { metrics: parseMetrics } = await measurePerformance(
          () => parser.parseContent(content),
          size === 'large' ? 1 : 2
        );

        const contentSize = streamingMetrics.bytesGenerated;
        const parseThroughput = contentSize / 1024 / (parseMetrics.parseTime / 1000); // KB/s
        const generationThroughput = contentSize / 1024 / (streamingMetrics.generationTime / 1000); // KB/s

        throughputResults.push({
          size,
          throughput: parseThroughput,
          generationThroughput
        });

        // Minimum throughput expectations
        expect(parseThroughput).toBeGreaterThan(50); // At least 50 KB/s parsing
        expect(generationThroughput).toBeGreaterThan(100); // At least 100 KB/s generation
      }

      console.log('\n🚀 Throughput Results:');
      throughputResults.forEach(({ size, throughput, generationThroughput }) => {
        console.log(`  ${size}: Parse ${throughput.toFixed(1)} KB/s, Generate ${generationThroughput.toFixed(1)} KB/s`);
      });

      // Throughput should be relatively consistent across sizes
      const parseThroughputs = throughputResults.map(r => r.throughput);
      const avgThroughput = parseThroughputs.reduce((a, b) => a + b, 0) / parseThroughputs.length;
      const maxDeviation = Math.max(...parseThroughputs.map(t => Math.abs(t - avgThroughput)));

      expect(maxDeviation).toBeLessThan(avgThroughput * 0.7); // Within 70% of average
    });

    it('should scale efficiently with content complexity', async () => {
      const complexityLevels = [
        { size: 'small' as const, languages: ['javascript'], frameworks: ['React'] },
        { size: 'medium' as const, languages: ['javascript', 'python'], frameworks: ['React', 'Django'] },
        { size: 'large' as const, languages: ['javascript', 'python', 'go', 'rust'], frameworks: ['React', 'Django', 'Express', 'Gin'] }
      ];

      const complexityResults = [];

      for (const config of complexityLevels) {
        const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
        const { result, metrics: parseMetrics } = await measurePerformance(
          () => parser.parseContent(content),
          1
        );

        expect(result.success).toBe(true);

        complexityResults.push({
          config,
          contentSize: streamingMetrics.bytesGenerated,
          generationTime: streamingMetrics.generationTime,
          parseTime: parseMetrics.parseTime,
          detectedLanguages: result.data!.languages.length,
          detectedCommands: result.data!.commands.build.length
        });
      }

      // Performance should scale reasonably with complexity
      for (let i = 1; i < complexityResults.length; i++) {
        const current = complexityResults[i];
        const previous = complexityResults[i - 1];

        const sizeRatio = current.contentSize / previous.contentSize;
        const parseTimeRatio = current.parseTime / previous.parseTime;

        // Parse time should not grow faster than content size squared
        expect(parseTimeRatio).toBeLessThan(sizeRatio * sizeRatio);

        console.log(`Complexity scaling ${previous.config.size} → ${current.config.size}:`);
        console.log(`  Size: ${sizeRatio.toFixed(1)}x, Parse time: ${parseTimeRatio.toFixed(1)}x`);
        console.log(`  Languages: ${previous.detectedLanguages} → ${current.detectedLanguages}`);
        console.log(`  Commands: ${previous.detectedCommands} → ${current.detectedCommands}`);
      }
    });
  });

  describe('Real-world Simulation', () => {
    it('should handle realistic project README patterns', async () => {
      const projectTypes = [
        {
          name: 'Frontend React App',
          config: {
            type: 'readme' as const,
            size: 'medium' as const,
            languages: ['javascript', 'typescript'],
            frameworks: ['React']
          }
        },
        {
          name: 'Backend API Service',
          config: {
            type: 'readme' as const,
            size: 'medium' as const,
            languages: ['python', 'go'],
            frameworks: ['Django', 'Gin']
          }
        },
        {
          name: 'Full-stack Application',
          config: {
            type: 'readme' as const,
            size: 'large' as const,
            languages: ['javascript', 'typescript', 'python'],
            frameworks: ['React', 'Express', 'Django']
          }
        }
      ];

      for (const projectType of projectTypes) {
        const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(projectType.config);
        const { result, metrics: parseMetrics } = await measurePerformance(
          () => parser.parseContent(content),
          1
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        // Should detect expected languages
        const detectedLanguages = result.data!.languages;
        const expectedLanguages = projectType.config.languages || [];
        const detectedExpected = expectedLanguages.filter(lang => detectedLanguages.includes(lang));
        
        expect(detectedExpected.length).toBeGreaterThan(0);

        // Should have reasonable confidence
        expect(result.data!.confidence.overall).toBeGreaterThan(0.4);

        console.log(`📋 ${projectType.name}:`);
        console.log(`  Content: ${(streamingMetrics.bytesGenerated / 1024).toFixed(1)}KB`);
        console.log(`  Languages detected: ${detectedLanguages.join(', ')}`);
        console.log(`  Commands found: ${result.data!.commands.build.length} build, ${result.data!.commands.test.length} test`);
        console.log(`  Confidence: ${(result.data!.confidence.overall * 100).toFixed(1)}%`);
        console.log(`  Performance: ${streamingMetrics.generationTime}ms gen, ${parseMetrics.parseTime}ms parse`);
      }
    });

    it('should replace performance test fixtures effectively', async () => {
      // Simulate the old large-file-parsing.test.ts scenarios with streaming data
      const testScenarios = [
        { name: 'Small Generated README', size: 'small' as const, expectedTime: 200 },
        { name: 'Medium Generated README', size: 'medium' as const, expectedTime: 500 },
        { name: 'Large Generated README', size: 'large' as const, expectedTime: 1000 }
      ];

      for (const scenario of testScenarios) {
        const config: StreamingDataConfig = {
          type: 'readme',
          size: scenario.size
        };

        const { content, metrics: streamingMetrics } = await StreamingDataFactory.generateString(config);
        const { result, metrics: parseMetrics } = await measurePerformance(
          () => parser.parseContent(content),
          scenario.size === 'large' ? 1 : 2
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        // Performance should meet expectations
        expect(parseMetrics.parseTime).toBeLessThan(scenario.expectedTime);
        expect(streamingMetrics.generationTime).toBeLessThan(scenario.expectedTime / 2);

        // Should detect comprehensive content
        expect(result.data!.languages.length).toBeGreaterThan(scenario.size === 'small' ? 3 : 8);
        expect(result.data!.commands.build.length).toBeGreaterThan(scenario.size === 'small' ? 5 : 15);

        console.log(`✅ ${scenario.name} (streaming replacement):`);
        console.log(`  Expected: <${scenario.expectedTime}ms, Actual: ${parseMetrics.parseTime}ms`);
        console.log(`  Content: ${(streamingMetrics.bytesGenerated / 1024).toFixed(1)}KB`);
        console.log(`  Detection: ${result.data!.languages.length} languages, ${result.data!.commands.build.length} commands`);
      }
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle streaming errors gracefully during parsing', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'small'
      };

      // Generate valid content first
      const { content } = await StreamingDataFactory.generateString(config);
      
      // Corrupt part of the content to test error handling
      const corruptedContent = content.replace(/```javascript/g, '```invalid-lang');
      
      const result = await parser.parseContent(corruptedContent);
      
      // Should still succeed but with lower confidence
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Confidence might be lower due to invalid language
    });

    it('should handle memory pressure during streaming', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'large',
        maxMemoryUsage: 10 * 1024 * 1024 // Very tight 10MB limit
      };

      // Should still work but might generate smaller content
      const { content, metrics } = await StreamingDataFactory.generateString(config);
      
      expect(content.length).toBeGreaterThan(0);
      expect(metrics.peakMemoryUsage).toBeLessThanOrEqual(config.maxMemoryUsage!);
      
      // Should still be parseable
      const result = await parser.parseContent(content);
      expect(result.success).toBe(true);
    });
  });
});
  d
escribe('Streaming Project Generator Integration', () => {
    it('should generate realistic project READMEs', async () => {
      const projectTypes = Object.keys(PROJECT_TEMPLATES);
      
      for (const projectType of projectTypes.slice(0, 3)) { // Test first 3 project types
        const { content, metadata } = await generateProjectReadme(projectType, 'small');
        
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(500);
        expect(metadata.projectType).toBe(projectType);
        expect(metadata.template).toBeDefined();
        
        // Parse the generated project README
        const result = await parser.parseContent(content);
        expect(result.success).toBe(true);
        
        console.log(`📋 Generated ${projectType} README: ${(content.length / 1024).toFixed(1)}KB`);
      }
    });

    it('should generate complete project structures', async () => {
      const projectType = 'react-typescript-app';
      const { files, metadata } = await generateProjectFiles(projectType, 'medium');
      
      expect(files).toBeDefined();
      expect(files['README.md']).toBeDefined();
      expect(files['package.json']).toBeDefined();
      expect(files['tsconfig.json']).toBeDefined();
      expect(files['.github/workflows/ci.yml']).toBeDefined();
      
      expect(metadata.projectType).toBe(projectType);
      expect(metadata.fileCount).toBeGreaterThan(3);
      
      // Parse the generated README
      const result = await parser.parseContent(files['README.md']);
      expect(result.success).toBe(true);
      
      console.log(`📁 Generated ${projectType} project: ${metadata.fileCount} files`);
    });

    it('should replace real-world fixtures effectively', async () => {
      // Test that streaming project generator can replace static fixtures
      const projectTypes = ['react-typescript-app', 'django-rest-api', 'go-gin-microservice'];
      
      for (const projectType of projectTypes) {
        const { content } = await generateProjectReadme(projectType, 'medium');
        
        // Should be parseable and detect appropriate technologies
        const result = await parser.parseContent(content);
        expect(result.success).toBe(true);
        
        const template = PROJECT_TEMPLATES[projectType];
        
        // Should contain project-specific content
        expect(content.toLowerCase()).toContain(template.framework.toLowerCase());
        expect(content.toLowerCase()).toContain(template.language.toLowerCase());
        
        console.log(`✅ ${projectType} streaming replacement: ${template.framework} + ${template.language}`);
      }
    });
  });