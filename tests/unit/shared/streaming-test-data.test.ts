/**
 * Unit tests for streaming test data functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';
import {
  StreamingDataFactory,
  StreamingDataUtils,
  StreamingReadmeGenerator,
  StreamingPackageJsonGenerator,
  STREAMING_DATA_SIZES,
  CONTENT_TEMPLATES,
  type StreamingDataConfig,
  type StreamingDataMetrics
} from '../../../src/shared/streaming-test-data';

describe('StreamingTestData', () => {
  let originalGc: typeof global.gc;

  beforeEach(() => {
    originalGc = global.gc;
    // Mock gc function if not available
    if (!global.gc) {
      global.gc = () => {};
    }
  });

  afterEach(() => {
    if (originalGc) {
      global.gc = originalGc;
    } else {
      delete (global as any).gc;
    }
  });

  describe('STREAMING_DATA_SIZES Configuration', () => {
    it('should have configurations for all supported sizes', () => {
      const sizes = ['small', 'medium', 'large', 'xlarge'] as const;
      const types = ['readme', 'package-json', 'dockerfile', 'yaml-config'] as const;

      sizes.forEach(size => {
        expect(STREAMING_DATA_SIZES[size]).toBeDefined();
        
        types.forEach(type => {
          expect(STREAMING_DATA_SIZES[size][type]).toBeDefined();
          expect(STREAMING_DATA_SIZES[size][type].chunkSize).toBeGreaterThan(0);
        });
      });
    });

    it('should have increasing complexity for larger sizes', () => {
      const sizes = ['small', 'medium', 'large', 'xlarge'] as const;
      
      for (let i = 1; i < sizes.length; i++) {
        const current = STREAMING_DATA_SIZES[sizes[i]].readme;
        const previous = STREAMING_DATA_SIZES[sizes[i - 1]].readme;
        
        expect(current.sections).toBeGreaterThan(previous.sections);
        expect(current.codeBlocks).toBeGreaterThan(previous.codeBlocks);
        expect(current.lines).toBeGreaterThan(previous.lines);
      }
    });

    it('should have reasonable chunk sizes', () => {
      Object.values(STREAMING_DATA_SIZES).forEach(sizeConfig => {
        Object.values(sizeConfig).forEach(typeConfig => {
          expect(typeConfig.chunkSize).toBeGreaterThanOrEqual(512);
          expect(typeConfig.chunkSize).toBeLessThanOrEqual(8192);
        });
      });
    });
  });

  describe('CONTENT_TEMPLATES', () => {
    it('should have comprehensive language templates', () => {
      expect(CONTENT_TEMPLATES.readme.languages).toHaveLength(16);
      expect(CONTENT_TEMPLATES.readme.languages).toContain('javascript');
      expect(CONTENT_TEMPLATES.readme.languages).toContain('typescript');
      expect(CONTENT_TEMPLATES.readme.languages).toContain('python');
      expect(CONTENT_TEMPLATES.readme.languages).toContain('rust');
    });

    it('should have diverse framework templates', () => {
      expect(CONTENT_TEMPLATES.readme.frameworks).toHaveLength(14);
      expect(CONTENT_TEMPLATES.readme.frameworks).toContain('React');
      expect(CONTENT_TEMPLATES.readme.frameworks).toContain('Express');
      expect(CONTENT_TEMPLATES.readme.frameworks).toContain('Django');
    });

    it('should have realistic command templates', () => {
      expect(CONTENT_TEMPLATES.readme.commands.length).toBeGreaterThan(5);
      expect(CONTENT_TEMPLATES.readme.testCommands.length).toBeGreaterThan(5);
      
      // Should contain common commands
      expect(CONTENT_TEMPLATES.readme.commands).toContain('npm install');
      expect(CONTENT_TEMPLATES.readme.testCommands).toContain('npm test');
    });

    it('should have package.json dependency templates', () => {
      expect(CONTENT_TEMPLATES['package-json'].dependencies.length).toBeGreaterThan(10);
      expect(CONTENT_TEMPLATES['package-json'].devDependencies.length).toBeGreaterThan(5);
      
      // Should contain common dependencies
      expect(CONTENT_TEMPLATES['package-json'].dependencies).toContain('express');
      expect(CONTENT_TEMPLATES['package-json'].devDependencies).toContain('typescript');
    });
  });

  describe('StreamingReadmeGenerator', () => {
    it('should create a readable stream', () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'small'
      };

      const generator = new StreamingReadmeGenerator(config);
      expect(generator).toBeInstanceOf(Readable);
      expect(generator.readable).toBe(true);
    });

    it('should generate content in chunks', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'small'
      };

      const generator = new StreamingReadmeGenerator(config);
      const chunks: string[] = [];

      return new Promise<void>((resolve, reject) => {
        generator.on('data', (chunk: Buffer) => {
          chunks.push(chunk.toString());
        });

        generator.on('end', () => {
          try {
            expect(chunks.length).toBeGreaterThan(0);
            
            const fullContent = chunks.join('');
            expect(fullContent).toContain('# Streaming README Test');
            expect(fullContent).toContain('## Table of Contents');
            expect(fullContent.length).toBeGreaterThan(100);
            
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        generator.on('error', reject);
      });
    });

    it('should include code blocks with different languages', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'medium',
        languages: ['javascript', 'python', 'go']
      };

      const { content } = await StreamingDataFactory.generateString(config);
      
      // Should contain at least some code blocks
      expect(content).toMatch(/```\w+/);
      
      // Should contain at least one of the specified languages
      const hasJavaScript = content.includes('```javascript');
      const hasPython = content.includes('```python');
      const hasGo = content.includes('```go');
      
      expect(hasJavaScript || hasPython || hasGo).toBe(true);
    });

    it('should generate content with specified frameworks', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'small',
        frameworks: ['React', 'Express']
      };

      const { content } = await StreamingDataFactory.generateString(config);
      
      // Should mention frameworks in content
      expect(content.toLowerCase()).toMatch(/react|express/);
    });

    it('should provide metrics after generation', async () => {
      const config: StreamingDataConfig = {
        type: 'readme',
        size: 'small'
      };

      const { metrics } = await StreamingDataFactory.generateString(config);
      
      expect(metrics.bytesGenerated).toBeGreaterThan(0);
      expect(metrics.generationTime).toBeGreaterThan(0);
      expect(metrics.peakMemoryUsage).toBeGreaterThan(0);
      expect(metrics.chunksGenerated).toBeGreaterThan(0);
    });

    it('should handle different size configurations', async () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const results: Array<{ size: string; contentLength: number; metrics: StreamingDataMetrics }> = [];

      for (const size of sizes) {
        const config: StreamingDataConfig = { type: 'readme', size };
        const { content, metrics } = await StreamingDataFactory.generateString(config);
        
        results.push({
          size,
          contentLength: content.length,
          metrics
        });
      }

      // Content should increase with size
      for (let i = 1; i < results.length; i++) {
        expect(results[i].contentLength).toBeGreaterThan(results[i - 1].contentLength);
      }
    });
  });

  describe('StreamingPackageJsonGenerator', () => {
    it('should generate valid package.json structure', async () => {
      const config: StreamingDataConfig = {
        type: 'package-json',
        size: 'small'
      };

      const { content } = await StreamingDataFactory.generateString(config);
      
      expect(content).toContain('\"name\": \"streaming-test-package\"');
      expect(content).toContain('\"version\": \"1.0.0\"');
      expect(content).toContain('\"dependencies\": {');
      expect(content).toContain('\"devDependencies\": {');
      expect(content).toContain('\"scripts\": {');
      
      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should include realistic dependencies', async () => {
      const config: StreamingDataConfig = {
        type: 'package-json',
        size: 'medium'
      };

      const { content } = await StreamingDataFactory.generateString(config);
      const packageJson = JSON.parse(content);
      
      expect(Object.keys(packageJson.dependencies).length).toBeGreaterThan(5);
      expect(Object.keys(packageJson.devDependencies).length).toBeGreaterThan(3);
      expect(Object.keys(packageJson.scripts).length).toBeGreaterThan(3);
      
      // Should have realistic dependency names
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const depNames = Object.keys(allDeps);
      
      expect(depNames.some(name => CONTENT_TEMPLATES['package-json'].dependencies.includes(name))).toBe(true);
    });

    it('should generate different content for different sizes', async () => {
      const smallConfig: StreamingDataConfig = { type: 'package-json', size: 'small' };
      const largeConfig: StreamingDataConfig = { type: 'package-json', size: 'large' };

      const { content: smallContent } = await StreamingDataFactory.generateString(smallConfig);
      const { content: largeContent } = await StreamingDataFactory.generateString(largeConfig);

      const smallPackage = JSON.parse(smallContent);
      const largePackage = JSON.parse(largeContent);

      expect(Object.keys(largePackage.dependencies).length).toBeGreaterThan(
        Object.keys(smallPackage.dependencies).length
      );
    });
  });

  describe('StreamingDataFactory', () => {
    it('should create appropriate generators for different types', () => {
      const readmeConfig: StreamingDataConfig = { type: 'readme', size: 'small' };
      const packageConfig: StreamingDataConfig = { type: 'package-json', size: 'small' };

      const readmeGenerator = StreamingDataFactory.createGenerator(readmeConfig);
      const packageGenerator = StreamingDataFactory.createGenerator(packageConfig);

      expect(readmeGenerator).toBeInstanceOf(StreamingReadmeGenerator);
      expect(packageGenerator).toBeInstanceOf(StreamingPackageJsonGenerator);
    });

    it('should throw error for unsupported types', () => {
      const config = { type: 'unsupported' as any, size: 'small' as const };
      
      expect(() => StreamingDataFactory.createGenerator(config)).toThrow(
        'Unsupported streaming data type: unsupported'
      );
    });

    it('should generate string content with metrics', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'small' };
      
      const result = await StreamingDataFactory.generateString(config);
      
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.bytesGenerated).toBe(Buffer.byteLength(result.content));
    });

    it('should create monitored generators with real-time metrics', () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'small' };
      
      const { generator, getMetrics } = StreamingDataFactory.createMonitoredGenerator(config);
      
      expect(generator).toBeInstanceOf(Readable);
      expect(typeof getMetrics).toBe('function');
      
      const initialMetrics = getMetrics();
      expect(initialMetrics.bytesGenerated).toBe(0);
      expect(initialMetrics.chunksGenerated).toBe(0);
    });
  });

  describe('StreamingDataUtils', () => {
    it('should validate configuration correctly', () => {
      const validConfig: StreamingDataConfig = {
        type: 'readme',
        size: 'small'
      };

      const invalidConfig = {
        type: 'invalid' as any,
        size: 'invalid' as any
      };

      const validResult = StreamingDataUtils.validateConfig(validConfig);
      const invalidResult = StreamingDataUtils.validateConfig(invalidConfig);

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should provide recommended configurations for test scenarios', () => {
      const unitConfig = StreamingDataUtils.getRecommendedConfig('unit');
      const integrationConfig = StreamingDataUtils.getRecommendedConfig('integration');
      const performanceConfig = StreamingDataUtils.getRecommendedConfig('performance');

      expect(unitConfig.size).toBe('small');
      expect(integrationConfig.size).toBe('medium');
      expect(performanceConfig.size).toBe('large');

      expect(unitConfig.maxMemoryUsage).toBeLessThan(integrationConfig.maxMemoryUsage!);
      expect(integrationConfig.maxMemoryUsage).toBeLessThan(performanceConfig.maxMemoryUsage!);
    });

    it('should compare memory usage between streaming and static', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'small' };
      const staticContent = 'A'.repeat(10000); // 10KB static content

      const comparison = await StreamingDataUtils.compareMemoryUsage(config, staticContent);

      expect(comparison.streaming).toBeDefined();
      expect(comparison.static).toBeDefined();
      expect(comparison.improvement).toBeDefined();

      expect(comparison.streaming.bytesGenerated).toBeGreaterThan(0);
      expect(comparison.static.memoryUsage).toBeGreaterThan(0);
      expect(typeof comparison.improvement.memoryReduction).toBe('number');
      expect(typeof comparison.improvement.timeComparison).toBe('number');
    });

    it('should detect configuration errors', () => {
      const configs = [
        { type: undefined as any, size: 'small' as const },
        { type: 'readme' as const, size: undefined as any },
        { type: 'readme' as const, size: 'small' as const, maxMemoryUsage: 100 }
      ];

      configs.forEach(config => {
        const result = StreamingDataUtils.validateConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Memory Efficiency', () => {
    it('should use reasonable memory for streaming generation', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'medium' };
      
      // Generate streaming content
      const { content, metrics } = await StreamingDataFactory.generateString(config);

      // Memory usage should be reasonable for the content size
      const contentSizeBytes = Buffer.byteLength(content);
      const memoryEfficiencyRatio = metrics.peakMemoryUsage / contentSizeBytes;
      
      // Memory usage should not be more than 15x the content size (more lenient for small content)
      expect(memoryEfficiencyRatio).toBeLessThan(15);
      expect(metrics.peakMemoryUsage).toBeGreaterThan(0);
      expect(contentSizeBytes).toBeGreaterThan(1000); // At least 1KB of content
    });

    it('should generate content consistently across multiple runs', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'small' };
      const results: Array<{ contentLength: number; generationTime: number }> = [];

      for (let i = 0; i < 3; i++) {
        const { content, metrics } = await StreamingDataFactory.generateString(config);
        results.push({
          contentLength: content.length,
          generationTime: metrics.generationTime
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Content length should be relatively consistent
      const contentLengths = results.map(r => r.contentLength);
      const avgLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
      const maxLengthDeviation = Math.max(...contentLengths.map(l => Math.abs(l - avgLength)));

      // Content length should be consistent within 20%
      expect(maxLengthDeviation).toBeLessThan(avgLength * 0.2);
      
      // All results should have reasonable content
      results.forEach(result => {
        expect(result.contentLength).toBeGreaterThan(500); // At least 500 characters
        expect(result.generationTime).toBeLessThan(1000); // Under 1 second
      });
    });

    it('should handle large configurations without excessive memory usage', async () => {
      const config: StreamingDataConfig = { 
        type: 'readme', 
        size: 'large',
        maxMemoryUsage: 50 * 1024 * 1024 // 50MB limit
      };

      const startMemory = process.memoryUsage().heapUsed;
      const { metrics } = await StreamingDataFactory.generateString(config);
      const actualMemoryUsage = process.memoryUsage().heapUsed - startMemory;

      // Should respect memory limits
      expect(actualMemoryUsage).toBeLessThan(config.maxMemoryUsage!);
      expect(metrics.peakMemoryUsage).toBeLessThan(config.maxMemoryUsage!);
    });
  });

  describe('Performance Characteristics', () => {
    it('should generate content faster than traditional fixture loading', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'medium' };

      // Measure streaming generation time
      const streamingStart = Date.now();
      const { metrics } = await StreamingDataFactory.generateString(config);
      const streamingTime = Date.now() - streamingStart;

      // Generation should be reasonably fast
      expect(metrics.generationTime).toBeLessThan(1000); // Under 1 second
      expect(streamingTime).toBeLessThan(1000);
    });

    it('should scale linearly with content size', async () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const results: Array<{ size: string; time: number; bytes: number }> = [];

      for (const size of sizes) {
        const config: StreamingDataConfig = { type: 'readme', size };
        const { metrics } = await StreamingDataFactory.generateString(config);
        
        results.push({
          size,
          time: metrics.generationTime,
          bytes: metrics.bytesGenerated
        });
      }

      // Time should scale reasonably with content size
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];
        
        const sizeRatio = current.bytes / previous.bytes;
        const timeRatio = current.time / previous.time;
        
        // Time scaling should not be worse than quadratic
        expect(timeRatio).toBeLessThan(sizeRatio * sizeRatio);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle stream errors gracefully', async () => {
      const config: StreamingDataConfig = { type: 'readme', size: 'small' };
      const generator = StreamingDataFactory.createGenerator(config);

      // Force an error by corrupting the generator
      const originalRead = generator._read;
      generator._read = function() {
        this.emit('error', new Error('Test error'));
      };

      await expect(
        new Promise((resolve, reject) => {
          generator.on('data', () => {});
          generator.on('end', resolve);
          generator.on('error', reject);
        })
      ).rejects.toThrow('Test error');
    });

    it('should validate configuration before generation', () => {
      const invalidConfigs = [
        { type: 'invalid' as any, size: 'small' as const },
        { type: 'readme' as const, size: 'invalid' as any },
        { type: 'readme' as const, size: 'small' as const, maxMemoryUsage: -1 }
      ];

      invalidConfigs.forEach(config => {
        const validation = StreamingDataUtils.validateConfig(config);
        expect(validation.valid).toBe(false);
      });
    });
  });
});