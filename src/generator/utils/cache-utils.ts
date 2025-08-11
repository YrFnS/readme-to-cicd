/**
 * Cache utilities for workflow generation optimization
 */

import { CacheStrategy, CacheConfig } from '../types';

/**
 * Cache strategy generator for different package managers and build tools
 */
export class CacheStrategyGenerator {
  /**
   * Generate Node.js cache strategies based on package manager
   */
  generateNodeJSCaching(packageManager: string): CacheStrategy[] {
    const strategies: CacheStrategy[] = [];

    switch (packageManager.toLowerCase()) {
      case 'npm':
        strategies.push({
          type: 'dependencies',
          paths: ['~/.npm'],
          key: 'npm-${{ runner.os }}-${{ hashFiles(\'**/package-lock.json\') }}',
          restoreKeys: [
            'npm-${{ runner.os }}-',
            'npm-'
          ]
        });
        break;

      case 'yarn':
        strategies.push({
          type: 'dependencies',
          paths: ['~/.yarn/cache', '.yarn/cache'],
          key: 'yarn-${{ runner.os }}-${{ hashFiles(\'**/yarn.lock\') }}',
          restoreKeys: [
            'yarn-${{ runner.os }}-',
            'yarn-'
          ]
        });
        break;

      case 'pnpm':
        strategies.push({
          type: 'dependencies',
          paths: ['~/.pnpm-store'],
          key: 'pnpm-${{ runner.os }}-${{ hashFiles(\'**/pnpm-lock.yaml\') }}',
          restoreKeys: [
            'pnpm-${{ runner.os }}-',
            'pnpm-'
          ]
        });
        break;

      default:
        // Generic Node.js caching for unknown package managers
        strategies.push({
          type: 'dependencies',
          paths: ['node_modules'],
          key: 'node-modules-${{ runner.os }}-${{ hashFiles(\'**/package.json\') }}',
          restoreKeys: [
            'node-modules-${{ runner.os }}-',
            'node-modules-'
          ]
        });
    }

    // Add build cache for compiled assets
    strategies.push({
      type: 'build',
      paths: ['dist', 'build', '.next/cache', '.nuxt'],
      key: 'build-${{ runner.os }}-${{ github.sha }}',
      restoreKeys: [
        'build-${{ runner.os }}-',
        'build-'
      ],
      conditions: ['if: steps.build.conclusion == \'success\'']
    });

    return strategies;
  }

  /**
   * Generate Python cache strategies based on package manager
   */
  generatePythonCaching(packageManager: string): CacheStrategy[] {
    const strategies: CacheStrategy[] = [];

    switch (packageManager.toLowerCase()) {
      case 'pip':
        strategies.push({
          type: 'dependencies',
          paths: ['~/.cache/pip'],
          key: 'pip-${{ runner.os }}-${{ hashFiles(\'**/requirements*.txt\', \'**/setup.py\', \'**/pyproject.toml\') }}',
          restoreKeys: [
            'pip-${{ runner.os }}-',
            'pip-'
          ]
        });
        break;

      case 'poetry':
        strategies.push({
          type: 'dependencies',
          paths: ['~/.cache/pypoetry', '.venv'],
          key: 'poetry-${{ runner.os }}-${{ hashFiles(\'**/poetry.lock\') }}',
          restoreKeys: [
            'poetry-${{ runner.os }}-',
            'poetry-'
          ]
        });
        break;

      case 'pipenv':
        strategies.push({
          type: 'dependencies',
          paths: ['~/.cache/pipenv'],
          key: 'pipenv-${{ runner.os }}-${{ hashFiles(\'**/Pipfile.lock\') }}',
          restoreKeys: [
            'pipenv-${{ runner.os }}-',
            'pipenv-'
          ]
        });
        break;

      case 'conda':
        strategies.push({
          type: 'dependencies',
          paths: ['~/conda_pkgs_dir', '~/.conda/pkgs'],
          key: 'conda-${{ runner.os }}-${{ hashFiles(\'**/environment.yml\', \'**/environment.yaml\') }}',
          restoreKeys: [
            'conda-${{ runner.os }}-',
            'conda-'
          ]
        });
        break;

      default:
        // Generic Python caching
        strategies.push({
          type: 'dependencies',
          paths: ['~/.cache/pip'],
          key: 'python-deps-${{ runner.os }}-${{ hashFiles(\'**/requirements.txt\') }}',
          restoreKeys: [
            'python-deps-${{ runner.os }}-',
            'python-deps-'
          ]
        });
    }

    // Add Python bytecode cache
    strategies.push({
      type: 'build',
      paths: ['**/__pycache__', '**/*.pyc'],
      key: 'python-cache-${{ runner.os }}-${{ github.sha }}',
      restoreKeys: [
        'python-cache-${{ runner.os }}-',
        'python-cache-'
      ]
    });

    return strategies;
  }

  /**
   * Generate Rust cache strategies with target directory optimization
   */
  generateRustCaching(): CacheStrategy[] {
    return [
      {
        type: 'dependencies',
        paths: ['~/.cargo/registry', '~/.cargo/git'],
        key: 'cargo-registry-${{ runner.os }}-${{ hashFiles(\'**/Cargo.lock\') }}',
        restoreKeys: [
          'cargo-registry-${{ runner.os }}-',
          'cargo-registry-'
        ]
      },
      {
        type: 'build',
        paths: ['target'],
        key: 'cargo-target-${{ runner.os }}-${{ hashFiles(\'**/Cargo.lock\') }}-${{ hashFiles(\'**/*.rs\') }}',
        restoreKeys: [
          'cargo-target-${{ runner.os }}-${{ hashFiles(\'**/Cargo.lock\') }}-',
          'cargo-target-${{ runner.os }}-',
          'cargo-target-'
        ]
      }
    ];
  }

  /**
   * Generate Go cache strategies for modules and build cache
   */
  generateGoCaching(): CacheStrategy[] {
    return [
      {
        type: 'dependencies',
        paths: ['~/go/pkg/mod'],
        key: 'go-mod-${{ runner.os }}-${{ hashFiles(\'**/go.sum\') }}',
        restoreKeys: [
          'go-mod-${{ runner.os }}-',
          'go-mod-'
        ]
      },
      {
        type: 'build',
        paths: ['~/.cache/go-build'],
        key: 'go-build-${{ runner.os }}-${{ hashFiles(\'**/*.go\') }}',
        restoreKeys: [
          'go-build-${{ runner.os }}-',
          'go-build-'
        ]
      }
    ];
  }

  /**
   * Generate Java cache strategies for Maven/Gradle
   */
  generateJavaCaching(buildTool: string): CacheStrategy[] {
    const strategies: CacheStrategy[] = [];

    switch (buildTool.toLowerCase()) {
      case 'maven':
        strategies.push({
          type: 'dependencies',
          paths: ['~/.m2/repository'],
          key: 'maven-${{ runner.os }}-${{ hashFiles(\'**/pom.xml\') }}',
          restoreKeys: [
            'maven-${{ runner.os }}-',
            'maven-'
          ]
        });
        break;

      case 'gradle':
        strategies.push({
          type: 'dependencies',
          paths: ['~/.gradle/caches', '~/.gradle/wrapper'],
          key: 'gradle-${{ runner.os }}-${{ hashFiles(\'**/*.gradle*\', \'**/gradle-wrapper.properties\') }}',
          restoreKeys: [
            'gradle-${{ runner.os }}-',
            'gradle-'
          ]
        });
        break;

      default:
        // Generic Java caching
        strategies.push({
          type: 'dependencies',
          paths: ['~/.m2/repository', '~/.gradle/caches'],
          key: 'java-deps-${{ runner.os }}-${{ hashFiles(\'**/pom.xml\', \'**/*.gradle*\') }}',
          restoreKeys: [
            'java-deps-${{ runner.os }}-',
            'java-deps-'
          ]
        });
    }

    // Add build output cache
    strategies.push({
      type: 'build',
      paths: ['target', 'build'],
      key: 'java-build-${{ runner.os }}-${{ github.sha }}',
      restoreKeys: [
        'java-build-${{ runner.os }}-',
        'java-build-'
      ]
    });

    return strategies;
  }

  /**
   * Generate Docker cache strategies with buildx integration
   */
  generateDockerCaching(): CacheStrategy[] {
    return [
      {
        type: 'docker',
        paths: ['/tmp/.buildx-cache'],
        key: 'docker-buildx-${{ runner.os }}-${{ github.sha }}',
        restoreKeys: [
          'docker-buildx-${{ runner.os }}-',
          'docker-buildx-'
        ]
      },
      {
        type: 'docker',
        paths: ['~/.docker/buildx'],
        key: 'docker-buildx-state-${{ runner.os }}',
        restoreKeys: [
          'docker-buildx-state-${{ runner.os }}-',
          'docker-buildx-state-'
        ]
      }
    ];
  }

  /**
   * Generate cache key from components with proper escaping
   */
  generateCacheKey(components: string[]): string {
    return components
      .filter(component => component && component.trim())
      .map(component => component.replace(/[^a-zA-Z0-9\-_.]/g, '-'))
      .join('-');
  }

  /**
   * Generate cache configuration for a specific framework and package manager
   */
  generateCacheConfig(framework: string, packageManager?: string, buildTool?: string): CacheConfig {
    let strategies: CacheStrategy[] = [];

    switch (framework.toLowerCase()) {
      case 'nodejs':
      case 'node':
      case 'javascript':
      case 'typescript':
        strategies = this.generateNodeJSCaching(packageManager || 'npm');
        break;

      case 'python':
        strategies = this.generatePythonCaching(packageManager || 'pip');
        break;

      case 'rust':
        strategies = this.generateRustCaching();
        break;

      case 'go':
      case 'golang':
        strategies = this.generateGoCaching();
        break;

      case 'java':
      case 'kotlin':
      case 'scala':
        strategies = this.generateJavaCaching(buildTool || 'maven');
        break;

      case 'docker':
        strategies = this.generateDockerCaching();
        break;

      default:
        // Return empty strategies for unknown frameworks
        strategies = [];
    }

    const config: CacheConfig = {
      enabled: strategies.length > 0,
      strategy: strategies[0] || {
        type: 'custom',
        paths: [],
        key: 'default-cache-key',
        restoreKeys: []
      }
    };

    if (strategies.length > 1) {
      config.customPaths = strategies.slice(1).flatMap(s => s.paths);
    }

    return config;
  }

  /**
   * Optimize cache strategies by removing duplicates and merging similar paths
   */
  optimizeCacheStrategies(strategies: CacheStrategy[]): CacheStrategy[] {
    const optimized: CacheStrategy[] = [];
    const seenKeys = new Set<string>();

    for (const strategy of strategies) {
      if (!seenKeys.has(strategy.key)) {
        seenKeys.add(strategy.key);
        optimized.push(strategy);
      }
    }

    return optimized;
  }

  /**
   * Validate cache strategy configuration
   */
  validateCacheStrategy(strategy: CacheStrategy): boolean {
    return !!(
      strategy.key &&
      strategy.paths &&
      strategy.paths.length > 0 &&
      strategy.restoreKeys &&
      strategy.restoreKeys.length > 0
    );
  }
}