/**
 * Performance Benchmarks - Tests for measuring parser performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { createPerformanceMonitor } from '../../src/parser/utils/performance-monitor';
import { createASTCache } from '../../src/parser/utils/ast-cache';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Performance Benchmarks', () => {
  let parser: ReadmeParserImpl;
  let performanceMonitor: any;

  beforeEach(() => {
    performanceMonitor = createPerformanceMonitor();
    parser = new ReadmeParserImpl({
      enableCaching: true,
      enablePerformanceMonitoring: true,
      performanceOptions: performanceMonitor.getConfig()
    });
  });

  afterEach(() => {
    parser.clearPerformanceData();
  });

  describe('Parsing Performance', () => {
    it('should parse small README files quickly', async () => {
      const smallReadme = `
# Test Project

A simple Node.js project.

## Installation
\`\`\`bash
npm install
\`\`\`

## Testing
\`\`\`bash
npm test
\`\`\`
      `.trim();

      const startTime = Date.now();
      const result = await parser.parseContent(smallReadme);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle medium-sized README files efficiently', async () => {
      // Generate a medium-sized README (around 10KB)
      const sections = [
        '# Large Project',
        'This is a comprehensive project with many features.',
        '',
        '## Installation',
        '```bash',
        'npm install',
        'pip install -r requirements.txt',
        'cargo build',
        '```',
        '',
        '## Usage',
        '```javascript',
        'const app = require("./app");',
        'app.start();',
        '```',
        '',
        '```python',
        'import app',
        'app.run()',
        '```',
        '',
        '## Testing',
        '```bash',
        'npm test',
        'pytest',
        'cargo test',
        '```'
      ];

      // Repeat sections to create a larger file
      const mediumReadme = Array(50).fill(sections.join('\n')).join('\n\n');

      const startTime = Date.now();
      const result = await parser.parseContent(mediumReadme);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // Should complete in under 500ms
      expect(mediumReadme.length).toBeGreaterThan(10000); // Ensure it's actually medium-sized
    });

    it('should demonstrate caching performance benefits', async () => {
      const readme = `
# Cached Project

This README will be parsed multiple times to test caching.

## Languages
- JavaScript
- Python
- Rust

## Commands
\`\`\`bash
npm install
npm test
npm run build
\`\`\`
      `.trim();

      // First parse (no cache)
      const firstStartTime = Date.now();
      const firstResult = await parser.parseContent(readme);
      const firstEndTime = Date.now();
      const firstDuration = firstEndTime - firstStartTime;

      expect(firstResult.success).toBe(true);

      // Second parse (should use cache)
      const secondStartTime = Date.now();
      const secondResult = await parser.parseContent(readme);
      const secondEndTime = Date.now();
      const secondDuration = secondEndTime - secondStartTime;

      expect(secondResult.success).toBe(true);
      
      // Cache should make second parse faster
      expect(secondDuration).toBeLessThan(firstDuration);
      
      // Verify cache statistics
      const cacheStats = parser.getCacheStats();
      expect(cacheStats.totalHits).toBeGreaterThan(0);
      expect(cacheStats.hitRate).toBeGreaterThan(0);
    });

    it('should handle concurrent parsing efficiently', async () => {
      const readme = `
# Concurrent Test

Testing concurrent parsing performance.

## Features
- Feature 1
- Feature 2
- Feature 3

\`\`\`bash
npm install
npm test
\`\`\`
      `.trim();

      const concurrentCount = 10;
      const startTime = Date.now();

      // Parse the same content concurrently
      const promises = Array(concurrentCount).fill(null).map(() => 
        parser.parseContent(readme)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should complete all concurrent operations reasonably quickly
      expect(totalDuration).toBeLessThan(2000); // Under 2 seconds for 10 concurrent operations

      // Check performance stats
      const perfStats = parser.getPerformanceStats();
      expect(perfStats.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated parsing', async () => {
      const readme = `
# Memory Test

Testing memory usage during repeated parsing.

\`\`\`javascript
console.log("Hello World");
\`\`\`

\`\`\`python
print("Hello World")
\`\`\`
      `.trim();

      const initialMemory = process.memoryUsage();
      
      // Parse the same content many times
      for (let i = 0; i < 100; i++) {
        const result = await parser.parseContent(readme);
        expect(result.success).toBe(true);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should track memory usage in performance metrics', async () => {
      const readme = `
# Memory Tracking Test

This test verifies memory tracking in performance metrics.

\`\`\`bash
npm install
npm test
\`\`\`
      `.trim();

      await parser.parseContent(readme);
      
      const perfStats = parser.getPerformanceStats();
      const parseContentStats = perfStats.find(stat => stat.operationName === 'parseContent');
      
      expect(parseContentStats).toBeDefined();
      expect(parseContentStats?.averageMemoryDelta).toBeDefined();
    });
  });

  describe('Cache Performance', () => {
    it('should maintain cache hit rate above 50% with repeated content', async () => {
      const readmes = [
        '# Project A\n```bash\nnpm install\n```',
        '# Project B\n```python\npip install\n```',
        '# Project C\n```bash\ncargo build\n```'
      ];

      // Parse each README multiple times
      for (let round = 0; round < 5; round++) {
        for (const readme of readmes) {
          const result = await parser.parseContent(readme);
          expect(result.success).toBe(true);
        }
      }

      const cacheStats = parser.getCacheStats();
      expect(cacheStats.hitRate).toBeGreaterThan(0.5); // At least 50% hit rate
      expect(cacheStats.totalHits).toBeGreaterThan(0);
    });

    it('should evict old entries when cache is full', async () => {
      // Create a parser with a small cache
      const smallCacheParser = new ReadmeParserImpl({
        enableCaching: true,
        cacheOptions: { maxEntries: 3 }
      });

      // Generate unique README content
      const readmes = Array(10).fill(null).map((_, i) => 
        `# Project ${i}\n\`\`\`bash\necho "project ${i}"\n\`\`\``
      );

      // Parse all READMEs
      for (const readme of readmes) {
        const result = await smallCacheParser.parseContent(readme);
        expect(result.success).toBe(true);
      }

      const cacheStats = smallCacheParser.getCacheStats();
      expect(cacheStats.totalEntries).toBeLessThanOrEqual(3); // Should not exceed max entries
    });
  });

  describe('Baseline Metrics', () => {
    it('should establish baseline performance metrics', async () => {
      const testCases = [
        {
          name: 'minimal',
          content: '# Test\n```bash\nnpm test\n```',
          expectedMaxTime: 50
        },
        {
          name: 'typical',
          content: `
# Typical Project

A typical Node.js project with standard sections.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`javascript
const app = require('./app');
app.start();
\`\`\`

## Testing
\`\`\`bash
npm test
npm run coverage
\`\`\`

## Dependencies
- express
- lodash
- moment
          `.trim(),
          expectedMaxTime: 200
        }
      ];

      const results: any[] = [];

      for (const testCase of testCases) {
        const startTime = Date.now();
        const result = await parser.parseContent(testCase.content);
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(testCase.expectedMaxTime);

        results.push({
          name: testCase.name,
          duration,
          contentLength: testCase.content.length,
          success: result.success
        });
      }

      // Log baseline metrics for reference
      console.log('Baseline Performance Metrics:', results);
      
      // Verify all test cases passed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});