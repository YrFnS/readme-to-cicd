/**
 * Tests for CacheStrategyGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheStrategyGenerator } from '../../../src/generator/utils/cache-utils';
import { CacheStrategy, CacheConfig } from '../../../src/generator/types';

describe('CacheStrategyGenerator', () => {
  let generator: CacheStrategyGenerator;

  beforeEach(() => {
    generator = new CacheStrategyGenerator();
  });

  describe('Node.js Caching', () => {
    it('should generate npm cache strategy', () => {
      const strategies = generator.generateNodeJSCaching('npm');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.npm']);
      expect(dependencyCache.key).toContain('npm-${{ runner.os }}-${{ hashFiles(\'**/package-lock.json\') }}');
      expect(dependencyCache.restoreKeys).toEqual([
        'npm-${{ runner.os }}-',
        'npm-'
      ]);

      const buildCache = strategies[1];
      expect(buildCache.type).toBe('build');
      expect(buildCache.paths).toEqual(['dist', 'build', '.next/cache', '.nuxt']);
    });

    it('should generate yarn cache strategy', () => {
      const strategies = generator.generateNodeJSCaching('yarn');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.yarn/cache', '.yarn/cache']);
      expect(dependencyCache.key).toContain('yarn-${{ runner.os }}-${{ hashFiles(\'**/yarn.lock\') }}');
      expect(dependencyCache.restoreKeys).toEqual([
        'yarn-${{ runner.os }}-',
        'yarn-'
      ]);
    });

    it('should generate pnpm cache strategy', () => {
      const strategies = generator.generateNodeJSCaching('pnpm');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.pnpm-store']);
      expect(dependencyCache.key).toContain('pnpm-${{ runner.os }}-${{ hashFiles(\'**/pnpm-lock.yaml\') }}');
      expect(dependencyCache.restoreKeys).toEqual([
        'pnpm-${{ runner.os }}-',
        'pnpm-'
      ]);
    });

    it('should generate generic cache strategy for unknown package managers', () => {
      const strategies = generator.generateNodeJSCaching('unknown');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['node_modules']);
      expect(dependencyCache.key).toContain('node-modules-${{ runner.os }}-${{ hashFiles(\'**/package.json\') }}');
    });
  });

  describe('Python Caching', () => {
    it('should generate pip cache strategy', () => {
      const strategies = generator.generatePythonCaching('pip');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.cache/pip']);
      expect(dependencyCache.key).toContain('pip-${{ runner.os }}-${{ hashFiles(\'**/requirements*.txt\', \'**/setup.py\', \'**/pyproject.toml\') }}');
      expect(dependencyCache.restoreKeys).toEqual([
        'pip-${{ runner.os }}-',
        'pip-'
      ]);
    });

    it('should generate poetry cache strategy', () => {
      const strategies = generator.generatePythonCaching('poetry');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.cache/pypoetry', '.venv']);
      expect(dependencyCache.key).toContain('poetry-${{ runner.os }}-${{ hashFiles(\'**/poetry.lock\') }}');
      expect(dependencyCache.restoreKeys).toEqual([
        'poetry-${{ runner.os }}-',
        'poetry-'
      ]);
    });

    it('should generate pipenv cache strategy', () => {
      const strategies = generator.generatePythonCaching('pipenv');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.cache/pipenv']);
      expect(dependencyCache.key).toContain('pipenv-${{ runner.os }}-${{ hashFiles(\'**/Pipfile.lock\') }}');
    });

    it('should generate conda cache strategy', () => {
      const strategies = generator.generatePythonCaching('conda');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/conda_pkgs_dir', '~/.conda/pkgs']);
      expect(dependencyCache.key).toContain('conda-${{ runner.os }}-${{ hashFiles(\'**/environment.yml\', \'**/environment.yaml\') }}');
    });

    it('should generate generic Python cache strategy for unknown package managers', () => {
      const strategies = generator.generatePythonCaching('unknown');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.cache/pip']);
      expect(dependencyCache.key).toContain('python-deps-${{ runner.os }}-${{ hashFiles(\'**/requirements.txt\') }}');
    });
  });

  describe('Rust Caching', () => {
    it('should generate Rust cache strategies with target directory optimization', () => {
      const strategies = generator.generateRustCaching();
      
      expect(strategies).toHaveLength(2);
      
      const registryCache = strategies[0];
      expect(registryCache.type).toBe('dependencies');
      expect(registryCache.paths).toEqual(['~/.cargo/registry', '~/.cargo/git']);
      expect(registryCache.key).toContain('cargo-registry-${{ runner.os }}-${{ hashFiles(\'**/Cargo.lock\') }}');
      expect(registryCache.restoreKeys).toEqual([
        'cargo-registry-${{ runner.os }}-',
        'cargo-registry-'
      ]);

      const targetCache = strategies[1];
      expect(targetCache.type).toBe('build');
      expect(targetCache.paths).toEqual(['target']);
      expect(targetCache.key).toContain('cargo-target-${{ runner.os }}-${{ hashFiles(\'**/Cargo.lock\') }}-${{ hashFiles(\'**/*.rs\') }}');
      expect(targetCache.restoreKeys).toEqual([
        'cargo-target-${{ runner.os }}-${{ hashFiles(\'**/Cargo.lock\') }}-',
        'cargo-target-${{ runner.os }}-',
        'cargo-target-'
      ]);
    });
  });

  describe('Go Caching', () => {
    it('should generate Go cache strategies for modules and build cache', () => {
      const strategies = generator.generateGoCaching();
      
      expect(strategies).toHaveLength(2);
      
      const moduleCache = strategies[0];
      expect(moduleCache.type).toBe('dependencies');
      expect(moduleCache.paths).toEqual(['~/go/pkg/mod']);
      expect(moduleCache.key).toContain('go-mod-${{ runner.os }}-${{ hashFiles(\'**/go.sum\') }}');
      expect(moduleCache.restoreKeys).toEqual([
        'go-mod-${{ runner.os }}-',
        'go-mod-'
      ]);

      const buildCache = strategies[1];
      expect(buildCache.type).toBe('build');
      expect(buildCache.paths).toEqual(['~/.cache/go-build']);
      expect(buildCache.key).toContain('go-build-${{ runner.os }}-${{ hashFiles(\'**/*.go\') }}');
      expect(buildCache.restoreKeys).toEqual([
        'go-build-${{ runner.os }}-',
        'go-build-'
      ]);
    });
  });

  describe('Java Caching', () => {
    it('should generate Maven cache strategy', () => {
      const strategies = generator.generateJavaCaching('maven');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.m2/repository']);
      expect(dependencyCache.key).toContain('maven-${{ runner.os }}-${{ hashFiles(\'**/pom.xml\') }}');
      expect(dependencyCache.restoreKeys).toEqual([
        'maven-${{ runner.os }}-',
        'maven-'
      ]);

      const buildCache = strategies[1];
      expect(buildCache.type).toBe('build');
      expect(buildCache.paths).toEqual(['target', 'build']);
    });

    it('should generate Gradle cache strategy', () => {
      const strategies = generator.generateJavaCaching('gradle');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.gradle/caches', '~/.gradle/wrapper']);
      expect(dependencyCache.key).toContain('gradle-${{ runner.os }}-${{ hashFiles(\'**/*.gradle*\', \'**/gradle-wrapper.properties\') }}');
      expect(dependencyCache.restoreKeys).toEqual([
        'gradle-${{ runner.os }}-',
        'gradle-'
      ]);
    });

    it('should generate generic Java cache strategy for unknown build tools', () => {
      const strategies = generator.generateJavaCaching('unknown');
      
      expect(strategies).toHaveLength(2);
      
      const dependencyCache = strategies[0];
      expect(dependencyCache.type).toBe('dependencies');
      expect(dependencyCache.paths).toEqual(['~/.m2/repository', '~/.gradle/caches']);
      expect(dependencyCache.key).toContain('java-deps-${{ runner.os }}-${{ hashFiles(\'**/pom.xml\', \'**/*.gradle*\') }}');
    });
  });

  describe('Docker Caching', () => {
    it('should generate Docker cache strategies with buildx integration', () => {
      const strategies = generator.generateDockerCaching();
      
      expect(strategies).toHaveLength(2);
      
      const buildxCache = strategies[0];
      expect(buildxCache.type).toBe('docker');
      expect(buildxCache.paths).toEqual(['/tmp/.buildx-cache']);
      expect(buildxCache.key).toContain('docker-buildx-${{ runner.os }}-${{ github.sha }}');
      expect(buildxCache.restoreKeys).toEqual([
        'docker-buildx-${{ runner.os }}-',
        'docker-buildx-'
      ]);

      const stateCache = strategies[1];
      expect(stateCache.type).toBe('docker');
      expect(stateCache.paths).toEqual(['~/.docker/buildx']);
      expect(stateCache.key).toContain('docker-buildx-state-${{ runner.os }}');
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate valid cache keys from components', () => {
      const components = ['npm', 'linux', 'package-lock.json'];
      const key = generator.generateCacheKey(components);
      
      expect(key).toBe('npm-linux-package-lock.json');
    });

    it('should handle special characters in cache key components', () => {
      const components = ['npm@8.0.0', 'ubuntu-20.04', 'package-lock.json'];
      const key = generator.generateCacheKey(components);
      
      expect(key).toBe('npm-8.0.0-ubuntu-20.04-package-lock.json');
    });

    it('should filter out empty components', () => {
      const components = ['npm', '', 'linux', null as any, 'package-lock.json'];
      const key = generator.generateCacheKey(components);
      
      expect(key).toBe('npm-linux-package-lock.json');
    });
  });

  describe('Cache Configuration Generation', () => {
    it('should generate cache config for Node.js framework', () => {
      const config = generator.generateCacheConfig('nodejs', 'npm');
      
      expect(config.enabled).toBe(true);
      expect(config.strategy.type).toBe('dependencies');
      expect(config.strategy.paths).toEqual(['~/.npm']);
      expect(config.customPaths).toBeDefined();
      expect(config.customPaths).toEqual(['dist', 'build', '.next/cache', '.nuxt']);
    });

    it('should generate cache config for Python framework', () => {
      const config = generator.generateCacheConfig('python', 'poetry');
      
      expect(config.enabled).toBe(true);
      expect(config.strategy.type).toBe('dependencies');
      expect(config.strategy.paths).toEqual(['~/.cache/pypoetry', '.venv']);
      expect(config.customPaths).toBeDefined();
    });

    it('should generate cache config for Rust framework', () => {
      const config = generator.generateCacheConfig('rust');
      
      expect(config.enabled).toBe(true);
      expect(config.strategy.type).toBe('dependencies');
      expect(config.strategy.paths).toEqual(['~/.cargo/registry', '~/.cargo/git']);
      expect(config.customPaths).toEqual(['target']);
    });

    it('should generate cache config for Go framework', () => {
      const config = generator.generateCacheConfig('go');
      
      expect(config.enabled).toBe(true);
      expect(config.strategy.type).toBe('dependencies');
      expect(config.strategy.paths).toEqual(['~/go/pkg/mod']);
      expect(config.customPaths).toEqual(['~/.cache/go-build']);
    });

    it('should generate cache config for Java framework with Maven', () => {
      const config = generator.generateCacheConfig('java', undefined, 'maven');
      
      expect(config.enabled).toBe(true);
      expect(config.strategy.type).toBe('dependencies');
      expect(config.strategy.paths).toEqual(['~/.m2/repository']);
      expect(config.customPaths).toEqual(['target', 'build']);
    });

    it('should generate cache config for Docker', () => {
      const config = generator.generateCacheConfig('docker');
      
      expect(config.enabled).toBe(true);
      expect(config.strategy.type).toBe('docker');
      expect(config.strategy.paths).toEqual(['/tmp/.buildx-cache']);
      expect(config.customPaths).toEqual(['~/.docker/buildx']);
    });

    it('should return disabled config for unknown frameworks', () => {
      const config = generator.generateCacheConfig('unknown');
      
      expect(config.enabled).toBe(false);
      expect(config.strategy.type).toBe('custom');
      expect(config.strategy.paths).toEqual([]);
    });
  });

  describe('Cache Strategy Optimization', () => {
    it('should remove duplicate cache strategies', () => {
      const strategies: CacheStrategy[] = [
        {
          type: 'dependencies',
          paths: ['~/.npm'],
          key: 'npm-cache',
          restoreKeys: ['npm-']
        },
        {
          type: 'dependencies',
          paths: ['~/.npm'],
          key: 'npm-cache',
          restoreKeys: ['npm-']
        },
        {
          type: 'build',
          paths: ['dist'],
          key: 'build-cache',
          restoreKeys: ['build-']
        }
      ];

      const optimized = generator.optimizeCacheStrategies(strategies);
      
      expect(optimized).toHaveLength(2);
      expect(optimized[0].key).toBe('npm-cache');
      expect(optimized[1].key).toBe('build-cache');
    });

    it('should preserve unique cache strategies', () => {
      const strategies: CacheStrategy[] = [
        {
          type: 'dependencies',
          paths: ['~/.npm'],
          key: 'npm-cache-1',
          restoreKeys: ['npm-']
        },
        {
          type: 'dependencies',
          paths: ['~/.yarn'],
          key: 'npm-cache-2',
          restoreKeys: ['yarn-']
        }
      ];

      const optimized = generator.optimizeCacheStrategies(strategies);
      
      expect(optimized).toHaveLength(2);
    });
  });

  describe('Cache Strategy Validation', () => {
    it('should validate valid cache strategy', () => {
      const strategy: CacheStrategy = {
        type: 'dependencies',
        paths: ['~/.npm'],
        key: 'npm-cache',
        restoreKeys: ['npm-']
      };

      const isValid = generator.validateCacheStrategy(strategy);
      
      expect(isValid).toBe(true);
    });

    it('should reject cache strategy without key', () => {
      const strategy: CacheStrategy = {
        type: 'dependencies',
        paths: ['~/.npm'],
        key: '',
        restoreKeys: ['npm-']
      };

      const isValid = generator.validateCacheStrategy(strategy);
      
      expect(isValid).toBe(false);
    });

    it('should reject cache strategy without paths', () => {
      const strategy: CacheStrategy = {
        type: 'dependencies',
        paths: [],
        key: 'npm-cache',
        restoreKeys: ['npm-']
      };

      const isValid = generator.validateCacheStrategy(strategy);
      
      expect(isValid).toBe(false);
    });

    it('should reject cache strategy without restore keys', () => {
      const strategy: CacheStrategy = {
        type: 'dependencies',
        paths: ['~/.npm'],
        key: 'npm-cache',
        restoreKeys: []
      };

      const isValid = generator.validateCacheStrategy(strategy);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Framework Aliases', () => {
    it('should handle Node.js framework aliases', () => {
      const nodeConfig = generator.generateCacheConfig('node', 'npm');
      const jsConfig = generator.generateCacheConfig('javascript', 'npm');
      const tsConfig = generator.generateCacheConfig('typescript', 'npm');

      expect(nodeConfig.enabled).toBe(true);
      expect(jsConfig.enabled).toBe(true);
      expect(tsConfig.enabled).toBe(true);
      
      expect(nodeConfig.strategy.paths).toEqual(jsConfig.strategy.paths);
      expect(jsConfig.strategy.paths).toEqual(tsConfig.strategy.paths);
    });

    it('should handle Go framework aliases', () => {
      const goConfig = generator.generateCacheConfig('go');
      const golangConfig = generator.generateCacheConfig('golang');

      expect(goConfig.enabled).toBe(true);
      expect(golangConfig.enabled).toBe(true);
      expect(goConfig.strategy.paths).toEqual(golangConfig.strategy.paths);
    });

    it('should handle Java framework aliases', () => {
      const javaConfig = generator.generateCacheConfig('java', undefined, 'maven');
      const kotlinConfig = generator.generateCacheConfig('kotlin', undefined, 'maven');
      const scalaConfig = generator.generateCacheConfig('scala', undefined, 'maven');

      expect(javaConfig.enabled).toBe(true);
      expect(kotlinConfig.enabled).toBe(true);
      expect(scalaConfig.enabled).toBe(true);
      
      expect(javaConfig.strategy.paths).toEqual(kotlinConfig.strategy.paths);
      expect(kotlinConfig.strategy.paths).toEqual(scalaConfig.strategy.paths);
    });
  });
});