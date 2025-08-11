# Cache Strategy Guide

## Overview

The CacheStrategyGenerator provides intelligent caching strategies for different programming languages, frameworks, and build tools. It generates optimized GitHub Actions cache configurations that significantly improve CI/CD pipeline performance.

## Supported Frameworks

### Node.js
- **npm**: Caches `~/.npm` directory with `package-lock.json` hash
- **yarn**: Caches `~/.yarn/cache` and `.yarn/cache` with `yarn.lock` hash  
- **pnpm**: Caches `~/.pnpm-store` with `pnpm-lock.yaml` hash
- **Build artifacts**: Caches `dist`, `build`, `.next/cache`, `.nuxt` directories

### Python
- **pip**: Caches `~/.cache/pip` with requirements files hash
- **poetry**: Caches `~/.cache/pypoetry` and `.venv` with `poetry.lock` hash
- **pipenv**: Caches `~/.cache/pipenv` with `Pipfile.lock` hash
- **conda**: Caches conda package directories with environment files hash
- **Bytecode**: Caches `__pycache__` and `.pyc` files

### Rust
- **Dependencies**: Caches `~/.cargo/registry` and `~/.cargo/git` with `Cargo.lock` hash
- **Build artifacts**: Caches `target` directory with source code hash for optimization

### Go
- **Modules**: Caches `~/go/pkg/mod` with `go.sum` hash
- **Build cache**: Caches `~/.cache/go-build` with source code hash

### Java
- **Maven**: Caches `~/.m2/repository` with `pom.xml` hash
- **Gradle**: Caches `~/.gradle/caches` and `~/.gradle/wrapper` with gradle files hash
- **Build outputs**: Caches `target` and `build` directories

### Docker
- **Buildx cache**: Caches `/tmp/.buildx-cache` for layer caching
- **Buildx state**: Caches `~/.docker/buildx` for builder state

## Usage Examples

### Basic Usage

```typescript
import { CacheStrategyGenerator } from './src/generator/utils/cache-utils';

const generator = new CacheStrategyGenerator();

// Generate Node.js npm caching
const npmStrategies = generator.generateNodeJSCaching('npm');

// Generate Python poetry caching  
const poetryStrategies = generator.generatePythonCaching('poetry');

// Generate cache configuration
const config = generator.generateCacheConfig('nodejs', 'npm');
```

### Integration with Workflows

```typescript
// Convert cache strategies to GitHub Actions steps
const cacheSteps = strategies.map(strategy => ({
  name: `Cache ${strategy.type}`,
  uses: 'actions/cache@v4',
  with: {
    path: strategy.paths.join('\n'),
    key: strategy.key,
    'restore-keys': strategy.restoreKeys.join('\n')
  }
}));
```

## Cache Key Structure

Cache keys follow a consistent pattern for optimal cache hit rates:

- **Format**: `{tool}-{os}-{hash}`
- **Example**: `npm-ubuntu-latest-abc123def456`
- **Restore keys**: Progressive fallback for partial cache hits

## Performance Benefits

- **80-90% faster** dependency installation on cache hits
- **50-70% faster** build times with build artifact caching
- **Reduced network usage** and CI/CD costs
- **Improved reliability** with offline-capable builds

## Best Practices

1. **Use specific lock files** for dependency caching
2. **Include OS in cache keys** for cross-platform projects  
3. **Implement progressive restore keys** for partial cache hits
4. **Cache build artifacts** separately from dependencies
5. **Validate cache strategies** before deployment

## Advanced Features

### Multi-Framework Projects
```typescript
// Handle monorepo with multiple package managers
const allStrategies = [
  ...generator.generateNodeJSCaching('npm'),
  ...generator.generatePythonCaching('poetry'),
  ...generator.generateDockerCaching()
];

const optimized = generator.optimizeCacheStrategies(allStrategies);
```

### Cache Optimization
```typescript
// Remove duplicates and optimize
const optimized = generator.optimizeCacheStrategies(strategies);

// Validate strategies
const isValid = generator.validateCacheStrategy(strategy);
```

## Troubleshooting

### Common Issues

1. **Cache misses**: Ensure lock files are committed and cache keys include proper hashes
2. **Large cache sizes**: Use selective caching paths and implement cache cleanup
3. **Cross-platform issues**: Include OS in cache keys for platform-specific dependencies
4. **Build failures**: Validate cache paths exist and have proper permissions

### Debug Tips

- Check cache key generation with different inputs
- Verify cache paths are accessible in the CI environment
- Monitor cache hit rates in GitHub Actions logs
- Test cache strategies with different dependency versions