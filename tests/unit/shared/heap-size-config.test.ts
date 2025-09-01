/**
 * Tests for Node.js Heap Size Configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  HeapSizeConfig,
  TestEnvironmentConfig,
  DEFAULT_HEAP_CONFIGS,
  getHeapConfig,
  generateNodeOptions,
  getCurrentMemoryUsage,
  isHeapUsageExcessive,
  validateHeapConfig,
  getRecommendedHeapSize,
  detectTestEnvironment,
  applyHeapConfig
} from '../../../src/shared/heap-size-config';

describe('HeapSizeConfig', () => {
  let originalNodeOptions: string | undefined;
  let originalArgv: string[];
  let originalEnv: any;

  beforeEach(() => {
    originalNodeOptions = process.env.NODE_OPTIONS;
    originalArgv = [...process.argv];
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env.NODE_OPTIONS = originalNodeOptions;
    process.argv = originalArgv;
    Object.assign(process.env, originalEnv);
  });

  describe('DEFAULT_HEAP_CONFIGS', () => {
    it('should have configurations for all test environments', () => {
      expect(DEFAULT_HEAP_CONFIGS).toHaveProperty('unit');
      expect(DEFAULT_HEAP_CONFIGS).toHaveProperty('integration');
      expect(DEFAULT_HEAP_CONFIGS).toHaveProperty('performance');
      expect(DEFAULT_HEAP_CONFIGS).toHaveProperty('comprehensive');
      expect(DEFAULT_HEAP_CONFIGS).toHaveProperty('default');
    });

    it('should have reasonable heap sizes for each environment', () => {
      expect(DEFAULT_HEAP_CONFIGS.unit.maxOldSpaceSize).toBe(1024);
      expect(DEFAULT_HEAP_CONFIGS.integration.maxOldSpaceSize).toBe(2048);
      expect(DEFAULT_HEAP_CONFIGS.performance.maxOldSpaceSize).toBe(4096);
      expect(DEFAULT_HEAP_CONFIGS.comprehensive.maxOldSpaceSize).toBe(3072);
      expect(DEFAULT_HEAP_CONFIGS.default.maxOldSpaceSize).toBe(1536);
    });

    it('should enable garbage collection for all environments', () => {
      Object.values(DEFAULT_HEAP_CONFIGS).forEach(config => {
        expect(config.exposeGC).toBe(true);
      });
    });
  });

  describe('getHeapConfig', () => {
    it('should return correct config for each environment', () => {
      expect(getHeapConfig('unit')).toEqual(DEFAULT_HEAP_CONFIGS.unit);
      expect(getHeapConfig('integration')).toEqual(DEFAULT_HEAP_CONFIGS.integration);
      expect(getHeapConfig('performance')).toEqual(DEFAULT_HEAP_CONFIGS.performance);
      expect(getHeapConfig('comprehensive')).toEqual(DEFAULT_HEAP_CONFIGS.comprehensive);
    });

    it('should return default config for unknown environment', () => {
      // @ts-ignore - testing invalid input
      expect(getHeapConfig('unknown')).toEqual(DEFAULT_HEAP_CONFIGS.default);
    });
  });

  describe('generateNodeOptions', () => {
    it('should generate correct NODE_OPTIONS string', () => {
      const config: HeapSizeConfig = {
        maxOldSpaceSize: 2048,
        maxSemiSpaceSize: 128,
        exposeGC: true,
        additionalOptions: ['--optimize-for-size']
      };

      const options = generateNodeOptions(config);
      
      expect(options).toContain('--max-old-space-size=2048');
      expect(options).toContain('--max-semi-space-size=128');
      expect(options).toContain('--expose-gc');
      expect(options).toContain('--optimize-for-size');
    });

    it('should handle minimal config', () => {
      const config: HeapSizeConfig = {
        maxOldSpaceSize: 1024,
        exposeGC: false
      };

      const options = generateNodeOptions(config);
      
      expect(options).toContain('--max-old-space-size=1024');
      expect(options).not.toContain('--expose-gc');
      expect(options).not.toContain('--max-semi-space-size');
    });
  });

  describe('getCurrentMemoryUsage', () => {
    it('should return memory usage object', () => {
      const usage = getCurrentMemoryUsage();
      
      expect(usage).toHaveProperty('rss');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('external');
      expect(usage).toHaveProperty('arrayBuffers');
      
      expect(typeof usage.rss).toBe('number');
      expect(typeof usage.heapTotal).toBe('number');
      expect(typeof usage.heapUsed).toBe('number');
      expect(usage.rss).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
      expect(usage.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('isHeapUsageExcessive', () => {
    it('should return boolean indicating heap usage status', () => {
      const result = isHeapUsageExcessive(80);
      expect(typeof result).toBe('boolean');
    });

    it('should use default threshold of 80%', () => {
      const result1 = isHeapUsageExcessive();
      const result2 = isHeapUsageExcessive(80);
      expect(result1).toBe(result2);
    });
  });

  describe('validateHeapConfig', () => {
    it('should validate correct configuration', () => {
      const config: HeapSizeConfig = {
        maxOldSpaceSize: 2048,
        maxSemiSpaceSize: 128,
        exposeGC: true
      };

      const result = validateHeapConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject too small heap size', () => {
      const config: HeapSizeConfig = {
        maxOldSpaceSize: 256,
        exposeGC: true
      };

      const result = validateHeapConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxOldSpaceSize must be at least 512MB');
    });

    it('should reject too large heap size', () => {
      const config: HeapSizeConfig = {
        maxOldSpaceSize: 20480, // 20GB
        exposeGC: true
      };

      const result = validateHeapConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxOldSpaceSize should not exceed 16GB (16384MB)');
    });

    it('should reject invalid semi space size ratio', () => {
      const config: HeapSizeConfig = {
        maxOldSpaceSize: 1024,
        maxSemiSpaceSize: 256, // More than 1/8 of old space
        exposeGC: true
      };

      const result = validateHeapConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxSemiSpaceSize should not exceed 1/8 of maxOldSpaceSize');
    });
  });

  describe('getRecommendedHeapSize', () => {
    it('should return reasonable heap size', () => {
      const recommended = getRecommendedHeapSize();
      
      expect(typeof recommended).toBe('number');
      expect(recommended).toBeGreaterThanOrEqual(1024); // At least 1GB
      expect(recommended).toBeLessThanOrEqual(8192);    // At most 8GB
    });
  });

  describe('detectTestEnvironment', () => {
    it('should detect unit test environment', () => {
      process.env.VITEST_POOL_ID = 'unit/test.ts';
      expect(detectTestEnvironment()).toBe('unit');
    });

    it('should detect integration test environment', () => {
      process.env.VITEST_POOL_ID = 'integration/test.ts';
      expect(detectTestEnvironment()).toBe('integration');
    });

    it('should detect performance test environment', () => {
      process.env.VITEST_POOL_ID = 'performance/test.ts';
      expect(detectTestEnvironment()).toBe('performance');
    });

    it('should detect comprehensive test environment from command', () => {
      process.argv = ['node', 'vitest', 'test:comprehensive'];
      expect(detectTestEnvironment()).toBe('comprehensive');
    });

    it('should return default for unknown environment', () => {
      process.env.VITEST_POOL_ID = '';
      process.argv = ['node', 'vitest'];
      expect(detectTestEnvironment()).toBe('default');
    });
  });

  describe('applyHeapConfig', () => {
    it('should set NODE_OPTIONS when not already set', () => {
      delete process.env.NODE_OPTIONS;
      
      applyHeapConfig('unit');
      
      expect(process.env.NODE_OPTIONS).toContain('--max-old-space-size=1024');
      expect(process.env.NODE_OPTIONS).toContain('--expose-gc');
    });

    it('should merge with existing NODE_OPTIONS', () => {
      process.env.NODE_OPTIONS = '--existing-option';
      
      applyHeapConfig('integration');
      
      expect(process.env.NODE_OPTIONS).toContain('--existing-option');
      expect(process.env.NODE_OPTIONS).toContain('--max-old-space-size=2048');
    });

    it('should auto-detect environment when not specified', () => {
      delete process.env.NODE_OPTIONS;
      process.env.VITEST_POOL_ID = 'performance/test.ts';
      
      applyHeapConfig();
      
      expect(process.env.NODE_OPTIONS).toContain('--max-old-space-size=4096');
    });
  });
});