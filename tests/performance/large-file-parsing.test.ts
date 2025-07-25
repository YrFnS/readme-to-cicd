/**
 * Performance tests for large README files and complex parsing scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { measurePerformance, generatePerformanceReport, PerformanceMetrics } from '../utils/test-helpers';

// Import the generator function
const { generateLargeReadme, SIZES } = require('../fixtures/performance/large-readme-generator.js');

describe('Large File Performance Tests', () => {
  let parser: ReadmeParserImpl;
  const tempFiles: string[] = [];
  let baselineMetrics: PerformanceMetrics;

  beforeAll(async () => {
    parser = new ReadmeParserImpl();
    
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
  });

  describe('Generated Large Files', () => {
    it('should handle small generated README (1K lines) efficiently', async () => {
      const content = generateLargeReadme('small');
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Performance expectations for small files
      expect(metrics.parseTime).toBeLessThan(200); // Under 200ms
      expect(metrics.memoryUsage).toBeLessThan(20 * 1024 * 1024); // Under 20MB
      
      // Should detect multiple languages
      expect(result.data!.languages.length).toBeGreaterThan(5);
      
      console.log(generatePerformanceReport('Small Generated README', metrics, baselineMetrics));
    });

    it('should handle medium generated README (5K lines) within limits', async () => {
      const content = generateLargeReadme('medium');
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Performance expectations for medium files
      expect(metrics.parseTime).toBeLessThan(500); // Under 500ms
      expect(metrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Under 50MB
      
      // Should detect many languages and commands
      expect(result.data!.languages.length).toBeGreaterThan(10);
      expect(result.data!.commands.build.length).toBeGreaterThan(20);
      
      console.log(generatePerformanceReport('Medium Generated README', metrics, baselineMetrics));
    });

    it('should handle large generated README (10K lines) gracefully', async () => {
      const content = generateLargeReadme('large');
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        2 // Fewer iterations for large files
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Performance expectations for large files
      expect(metrics.parseTime).toBeLessThan(1000); // Under 1 second
      expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB
      
      // Should still detect content accurately
      expect(result.data!.languages.length).toBeGreaterThan(15);
      expect(result.data!.commands.build.length).toBeGreaterThan(50);
      
      console.log(generatePerformanceReport('Large Generated README', metrics, baselineMetrics));
    });

    it('should handle extra large generated README (20K lines) without crashing', async () => {
      const content = generateLargeReadme('xlarge');
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        1 // Single iteration for very large files
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Performance expectations for extra large files
      expect(metrics.parseTime).toBeLessThan(2000); // Under 2 seconds
      expect(metrics.memoryUsage).toBeLessThan(200 * 1024 * 1024); // Under 200MB
      
      // Should maintain accuracy even with large files
      expect(result.data!.languages.length).toBeGreaterThan(15);
      expect(result.data!.confidence.overall).toBeGreaterThan(0.5);
      
      console.log(generatePerformanceReport('Extra Large Generated README', metrics, baselineMetrics));
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should show linear memory growth with file size', async () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const memoryResults: Array<{ size: string; fileSize: number; memoryUsage: number }> = [];
      
      for (const size of sizes) {
        const content = generateLargeReadme(size);
        
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content)
        );
        
        memoryResults.push({
          size,
          fileSize: Buffer.byteLength(content, 'utf8'),
          memoryUsage: metrics.memoryUsage
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
      }
    });

    it('should not leak memory across multiple parses', async () => {
      const content = generateLargeReadme('medium');
      const iterations = 5;
      const memoryUsages: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startMemory = process.memoryUsage().heapUsed;
        
        await parser.parseContent(content);
        
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
      
      // Deviation should not be more than 50% of average
      expect(maxDeviation).toBeLessThan(avgMemory * 0.5);
      
      console.log(`Memory usage across ${iterations} iterations:`);
      console.log(`Average: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Max deviation: ${(maxDeviation / 1024 / 1024).toFixed(2)}MB`);
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

  describe('Throughput Benchmarks', () => {
    it('should maintain consistent throughput across different file sizes', async () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const throughputResults: Array<{ size: string; throughput: number }> = [];
      
      for (const size of sizes) {
        const content = generateLargeReadme(size);
        
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          3
        );
        
        const fileSize = Buffer.byteLength(content, 'utf8');
        const throughput = fileSize / 1024 / (metrics.parseTime / 1000); // KB/s
        
        throughputResults.push({ size, throughput });
        
        // Minimum throughput expectations
        expect(throughput).toBeGreaterThan(100); // At least 100 KB/s
      }
      
      console.log('\n📈 Throughput Results:');
      throughputResults.forEach(({ size, throughput }) => {
        console.log(`${size}: ${throughput.toFixed(2)} KB/s`);
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