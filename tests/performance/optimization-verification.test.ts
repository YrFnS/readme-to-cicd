/**
 * Optimization Verification - Tests to verify performance optimizations are working
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';

describe('Performance Optimization Verification', () => {
  let parser: ReadmeParserImpl;

  beforeEach(() => {
    parser = new ReadmeParserImpl({
      enableCaching: true,
      enablePerformanceMonitoring: true
    });
  });

  it('should demonstrate AST caching is working', async () => {
    const readme = `
# Test Project

A Node.js project with TypeScript.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`javascript
const app = require('./app');
app.start();
\`\`\`
    `.trim();

    // First parse - should cache the AST
    await parser.parseContent(readme);
    
    // Second parse - should use cached AST
    await parser.parseContent(readme);
    
    const cacheStats = parser.getCacheStats();
    expect(cacheStats.totalHits).toBeGreaterThan(0);
    expect(cacheStats.hitRate).toBeGreaterThan(0);
  });

  it('should track performance metrics', async () => {
    const readme = `
# Performance Test

Testing performance monitoring.

\`\`\`python
print("Hello World")
\`\`\`
    `.trim();

    await parser.parseContent(readme);
    
    const perfStats = parser.getPerformanceStats();
    expect(perfStats.length).toBeGreaterThan(0);
    
    // Should have parseContent operation
    const parseContentStats = perfStats.find(stat => stat.operationName === 'parseContent');
    expect(parseContentStats).toBeDefined();
    expect(parseContentStats?.totalCalls).toBeGreaterThan(0);
    expect(parseContentStats?.averageDuration).toBeGreaterThan(0);
  });

  it('should provide enhanced parser info with performance data', async () => {
    const readme = '# Test\n```bash\nnpm test\n```';
    
    await parser.parseContent(readme);
    
    const parserInfo = parser.getParserInfo();
    
    // Should include new capabilities
    expect(parserInfo.capabilities).toContain('ast-caching');
    expect(parserInfo.capabilities).toContain('performance-monitoring');
    expect(parserInfo.capabilities).toContain('streaming-support');
    
    // Should include performance and cache data
    expect(parserInfo.performance).toBeDefined();
    expect(parserInfo.cache).toBeDefined();
  });

  it('should handle streaming for large files', async () => {
    // Create a large README content
    const sections = Array(100).fill(`
## Section

This is a section with some content.

\`\`\`javascript
console.log("Hello World");
\`\`\`

Some more text here.
    `).join('\n');
    
    const largeReadme = `# Large Project\n\n${sections}`;
    
    const result = await parser.parseContent(largeReadme);
    expect(result.success).toBe(true);
    expect(result.data?.languages).toBeDefined();
    
    // Should have detected JavaScript
    const jsLang = result.data?.languages.find(lang => lang.name === 'JavaScript');
    expect(jsLang).toBeDefined();
  });

  it('should show memory usage information', () => {
    const memoryUsage = parser.getMemoryUsage();
    expect(typeof memoryUsage).toBe('string');
    expect(memoryUsage).toContain('MB');
  });

  it('should allow clearing performance data', async () => {
    const readme = '# Test\n```python\nprint("test")\n```';
    
    await parser.parseContent(readme);
    
    // Should have some data
    let perfStats = parser.getPerformanceStats();
    let cacheStats = parser.getCacheStats();
    expect(perfStats.length).toBeGreaterThan(0);
    expect(cacheStats.totalEntries).toBeGreaterThan(0);
    
    // Clear data
    parser.clearPerformanceData();
    
    // Should be cleared
    perfStats = parser.getPerformanceStats();
    cacheStats = parser.getCacheStats();
    expect(perfStats.length).toBe(0);
    expect(cacheStats.totalEntries).toBe(0);
  });
});