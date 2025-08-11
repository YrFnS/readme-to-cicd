/**
 * Integration tests for cache strategy generation in workflows
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheStrategyGenerator } from '../../../src/generator/utils/cache-utils';
import { DetectionResult, PackageManagerDetection, BuildToolDetection } from '../../../src/generator/interfaces';

describe('Cache Strategy Integration', () => {
  let generator: CacheStrategyGenerator;

  beforeEach(() => {
    generator = new CacheStrategyGenerator();
  });

  describe('Multi-Framework Cache Integration', () => {
    it('should generate appropriate cache strategies for Node.js + Docker project', () => {
      const nodeStrategies = generator.generateNodeJSCaching('npm');
      const dockerStrategies = generator.generateDockerCaching();
      
      const allStrategies = [...nodeStrategies, ...dockerStrategies];
      const optimized = generator.optimizeCacheStrategies(allStrategies);
      
      expect(optimized.length).toBeGreaterThan(0);
      
      // Should have Node.js dependency cache
      const nodeCache = optimized.find(s => s.key.includes('npm'));
      expect(nodeCache).toBeDefined();
      expect(nodeCache?.paths).toEqual(['~/.npm']);
      
      // Should have Docker buildx cache
      const dockerCache = optimized.find(s => s.key.includes('docker-buildx'));
      expect(dockerCache).toBeDefined();
      expect(dockerCache?.paths).toEqual(['/tmp/.buildx-cache']);
    });

    it('should generate appropriate cache strategies for Python + Docker project', () => {
      const pythonStrategies = generator.generatePythonCaching('poetry');
      const dockerStrategies = generator.generateDockerCaching();
      
      const allStrategies = [...pythonStrategies, ...dockerStrategies];
      const optimized = generator.optimizeCacheStrategies(allStrategies);
      
      expect(optimized.length).toBeGreaterThan(0);
      
      // Should have Poetry dependency cache
      const poetryCache = optimized.find(s => s.key.includes('poetry'));
      expect(poetryCache).toBeDefined();
      expect(poetryCache?.paths).toEqual(['~/.cache/pypoetry', '.venv']);
      
      // Should have Docker buildx cache
      const dockerCache = optimized.find(s => s.key.includes('docker-buildx'));
      expect(dockerCache).toBeDefined();
    });

    it('should handle monorepo with multiple package managers', () => {
      const npmStrategies = generator.generateNodeJSCaching('npm');
      const yarnStrategies = generator.generateNodeJSCaching('yarn');
      const pnpmStrategies = generator.generateNodeJSCaching('pnpm');
      
      const allStrategies = [...npmStrategies, ...yarnStrategies, ...pnpmStrategies];
      const optimized = generator.optimizeCacheStrategies(allStrategies);
      
      // Should have unique strategies for each package manager
      const npmCache = optimized.find(s => s.key.includes('npm'));
      const yarnCache = optimized.find(s => s.key.includes('yarn'));
      const pnpmCache = optimized.find(s => s.key.includes('pnpm'));
      
      expect(npmCache).toBeDefined();
      expect(yarnCache).toBeDefined();
      expect(pnpmCache).toBeDefined();
      
      // Each should have different cache paths
      expect(npmCache?.paths).toEqual(['~/.npm']);
      expect(yarnCache?.paths).toEqual(['~/.yarn/cache', '.yarn/cache']);
      expect(pnpmCache?.paths).toEqual(['~/.pnpm-store']);
    });
  });

  describe('Cache Key Uniqueness', () => {
    it('should generate unique cache keys for different frameworks', () => {
      const nodeConfig = generator.generateCacheConfig('nodejs', 'npm');
      const pythonConfig = generator.generateCacheConfig('python', 'pip');
      const rustConfig = generator.generateCacheConfig('rust');
      const goConfig = generator.generateCacheConfig('go');
      const javaConfig = generator.generateCacheConfig('java', undefined, 'maven');
      
      const keys = [
        nodeConfig.strategy.key,
        pythonConfig.strategy.key,
        rustConfig.strategy.key,
        goConfig.strategy.key,
        javaConfig.strategy.key
      ];
      
      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
      
      // Keys should contain framework-specific identifiers
      expect(nodeConfig.strategy.key).toContain('npm');
      expect(pythonConfig.strategy.key).toContain('pip');
      expect(rustConfig.strategy.key).toContain('cargo');
      expect(goConfig.strategy.key).toContain('go-mod');
      expect(javaConfig.strategy.key).toContain('maven');
    });

    it('should generate different cache keys for same framework with different package managers', () => {
      const npmConfig = generator.generateCacheConfig('nodejs', 'npm');
      const yarnConfig = generator.generateCacheConfig('nodejs', 'yarn');
      const pnpmConfig = generator.generateCacheConfig('nodejs', 'pnpm');
      
      const keys = [
        npmConfig.strategy.key,
        yarnConfig.strategy.key,
        pnpmConfig.strategy.key
      ];
      
      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
      
      // Keys should contain package manager specific identifiers
      expect(npmConfig.strategy.key).toContain('npm');
      expect(yarnConfig.strategy.key).toContain('yarn');
      expect(pnpmConfig.strategy.key).toContain('pnpm');
    });
  });

  describe('Cache Path Validation', () => {
    it('should use appropriate cache paths for each framework', () => {
      const frameworks = [
        { name: 'nodejs', packageManager: 'npm', expectedPaths: ['~/.npm'] },
        { name: 'python', packageManager: 'pip', expectedPaths: ['~/.cache/pip'] },
        { name: 'rust', packageManager: undefined, expectedPaths: ['~/.cargo/registry', '~/.cargo/git'] },
        { name: 'go', packageManager: undefined, expectedPaths: ['~/go/pkg/mod'] },
        { name: 'java', buildTool: 'maven', expectedPaths: ['~/.m2/repository'] }
      ];
      
      for (const framework of frameworks) {
        const config = generator.generateCacheConfig(
          framework.name,
          framework.packageManager,
          (framework as any).buildTool
        );
        
        expect(config.enabled).toBe(true);
        expect(config.strategy.paths).toEqual(framework.expectedPaths);
      }
    });

    it('should include build cache paths when available', () => {
      const nodeConfig = generator.generateCacheConfig('nodejs', 'npm');
      const pythonConfig = generator.generateCacheConfig('python', 'pip');
      const rustConfig = generator.generateCacheConfig('rust');
      const goConfig = generator.generateCacheConfig('go');
      const javaConfig = generator.generateCacheConfig('java', undefined, 'maven');
      
      // All should have custom paths for build artifacts
      expect(nodeConfig.customPaths).toBeDefined();
      expect(pythonConfig.customPaths).toBeDefined();
      expect(rustConfig.customPaths).toBeDefined();
      expect(goConfig.customPaths).toBeDefined();
      expect(javaConfig.customPaths).toBeDefined();
      
      // Node.js should include common build directories
      expect(nodeConfig.customPaths).toEqual(['dist', 'build', '.next/cache', '.nuxt']);
      
      // Rust should include target directory
      expect(rustConfig.customPaths).toEqual(['target']);
      
      // Go should include build cache
      expect(goConfig.customPaths).toEqual(['~/.cache/go-build']);
      
      // Java should include build output directories
      expect(javaConfig.customPaths).toEqual(['target', 'build']);
    });
  });

  describe('Cache Strategy Validation in Real Scenarios', () => {
    it('should validate all generated cache strategies', () => {
      const frameworks = ['nodejs', 'python', 'rust', 'go', 'java', 'docker'];
      const packageManagers = ['npm', 'yarn', 'pnpm', 'pip', 'poetry', 'pipenv'];
      const buildTools = ['maven', 'gradle'];
      
      for (const framework of frameworks) {
        let strategies: any[] = [];
        
        switch (framework) {
          case 'nodejs':
            for (const pm of ['npm', 'yarn', 'pnpm']) {
              strategies.push(...generator.generateNodeJSCaching(pm));
            }
            break;
          case 'python':
            for (const pm of ['pip', 'poetry', 'pipenv', 'conda']) {
              strategies.push(...generator.generatePythonCaching(pm));
            }
            break;
          case 'rust':
            strategies.push(...generator.generateRustCaching());
            break;
          case 'go':
            strategies.push(...generator.generateGoCaching());
            break;
          case 'java':
            for (const bt of ['maven', 'gradle']) {
              strategies.push(...generator.generateJavaCaching(bt));
            }
            break;
          case 'docker':
            strategies.push(...generator.generateDockerCaching());
            break;
        }
        
        // All strategies should be valid
        for (const strategy of strategies) {
          expect(generator.validateCacheStrategy(strategy)).toBe(true);
        }
      }
    });

    it('should handle edge cases gracefully', () => {
      // Empty package manager
      const emptyPmConfig = generator.generateCacheConfig('nodejs', '');
      expect(emptyPmConfig.enabled).toBe(true);
      expect(generator.validateCacheStrategy(emptyPmConfig.strategy)).toBe(true);
      
      // Null package manager
      const nullPmConfig = generator.generateCacheConfig('nodejs', undefined);
      expect(nullPmConfig.enabled).toBe(true);
      expect(generator.validateCacheStrategy(nullPmConfig.strategy)).toBe(true);
      
      // Unknown framework
      const unknownConfig = generator.generateCacheConfig('unknown-framework');
      expect(unknownConfig.enabled).toBe(false);
      
      // Case insensitive framework names
      const upperCaseConfig = generator.generateCacheConfig('NODEJS', 'NPM');
      expect(upperCaseConfig.enabled).toBe(true);
      expect(upperCaseConfig.strategy.paths).toEqual(['~/.npm']);
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize cache strategies efficiently', () => {
      // Create a large number of strategies with some duplicates
      const strategies = [];
      
      for (let i = 0; i < 100; i++) {
        strategies.push({
          type: 'dependencies' as const,
          paths: [`~/.cache-${i % 10}`],
          key: `cache-key-${i % 10}`,
          restoreKeys: [`cache-${i % 10}-`]
        });
      }
      
      const startTime = Date.now();
      const optimized = generator.optimizeCacheStrategies(strategies);
      const endTime = Date.now();
      
      // Should complete quickly (under 100ms for 100 strategies)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should reduce to 10 unique strategies
      expect(optimized).toHaveLength(10);
    });

    it('should handle large cache key generation efficiently', () => {
      const components = Array.from({ length: 1000 }, (_, i) => `component-${i}`);
      
      const startTime = Date.now();
      const key = generator.generateCacheKey(components);
      const endTime = Date.now();
      
      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(50);
      
      // Should generate valid key
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
    });
  });
});