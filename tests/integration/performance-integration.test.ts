import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrameworkDetectorImpl } from '../../src/detection/framework-detector';
import { ProjectInfo } from '../../src/detection/interfaces/framework-detector';
import { getCacheManager, resetCacheManager } from '../../src/detection/performance/cache-manager';
import { getPerformanceMonitor, resetPerformanceMonitor } from '../../src/detection/performance/performance-monitor';

describe('Performance Integration Tests', () => {
  let detector: FrameworkDetectorImpl;

  beforeEach(() => {
    // Reset all singletons
    resetPerformanceMonitor();
    resetCacheManager();
    
    // Initialize fresh instances
    detector = new FrameworkDetectorImpl();
  });

  afterEach(() => {
    const monitor = getPerformanceMonitor();
    monitor.stop();
  });

  it('should integrate caching, performance monitoring, and lazy loading', async () => {
    const projectInfo: ProjectInfo = {
      name: 'test-project',
      description: 'A test project',
      languages: ['JavaScript'],
      dependencies: ['react', 'webpack'],
      buildCommands: ['npm run build'],
      testCommands: ['npm test'],
      installationSteps: ['npm install'],
      usageExamples: ['npm start'],
      configFiles: ['package.json'],
      rawContent: 'React application for testing'
    };

    // First detection (should be slower, no cache)
    const start1 = Date.now();
    const result1 = await detector.detectFrameworks(projectInfo);
    const time1 = Date.now() - start1;

    expect(result1).toBeDefined();
    expect(result1.frameworks.length).toBeGreaterThan(0);

    // Second detection (should be faster, with cache)
    const start2 = Date.now();
    const result2 = await detector.detectFrameworks(projectInfo);
    const time2 = Date.now() - start2;

    expect(result2).toBeDefined();
    expect(result2.frameworks.length).toEqual(result1.frameworks.length);

    // Cache should make second call faster
    expect(time2).toBeLessThan(time1);

    // Check cache statistics
    const cacheManager = getCacheManager();
    const cacheStats = cacheManager.getStats();
    expect(cacheStats.hits).toBeGreaterThan(0);

    // Check performance monitoring
    const performanceMonitor = getPerformanceMonitor();
    const perfStats = performanceMonitor.getStats();
    expect(perfStats.operations.total).toBeGreaterThan(0);

    console.log('Performance Integration Test Results:', {
      firstDetection: `${time1}ms`,
      secondDetection: `${time2}ms`,
      speedup: `${(time1 / time2).toFixed(2)}x`,
      cacheHits: cacheStats.hits,
      totalOperations: perfStats.operations.total
    });
  });

  it('should handle CI pipeline generation with caching', async () => {
    const projectInfo: ProjectInfo = {
      name: 'ci-test-project',
      description: 'A test project for CI generation',
      languages: ['JavaScript'],
      dependencies: ['react', 'jest'],
      buildCommands: ['npm run build'],
      testCommands: ['npm test'],
      installationSteps: ['npm install'],
      usageExamples: ['npm start'],
      configFiles: ['package.json'],
      rawContent: 'React application with Jest testing'
    };

    // Detect frameworks first
    const detectionResult = await detector.detectFrameworks(projectInfo);

    // Generate CI pipeline (first time)
    const start1 = Date.now();
    const pipeline1 = await detector.suggestCISteps(detectionResult);
    const time1 = Date.now() - start1;

    expect(pipeline1).toBeDefined();
    expect(pipeline1.setup.length).toBeGreaterThan(0);

    // Generate CI pipeline (second time, should use cache)
    const start2 = Date.now();
    const pipeline2 = await detector.suggestCISteps(detectionResult);
    const time2 = Date.now() - start2;

    expect(pipeline2).toBeDefined();
    expect(pipeline2.setup.length).toEqual(pipeline1.setup.length);

    // Cache should make second call faster
    expect(time2).toBeLessThan(time1);

    console.log('CI Pipeline Caching Test Results:', {
      firstGeneration: `${time1}ms`,
      secondGeneration: `${time2}ms`,
      speedup: `${(time1 / time2).toFixed(2)}x`
    });
  });

  it('should provide performance statistics', async () => {
    const projectInfo: ProjectInfo = {
      name: 'stats-test-project',
      description: 'A test project for statistics',
      languages: ['JavaScript'],
      dependencies: ['react'],
      buildCommands: ['npm run build'],
      testCommands: ['npm test'],
      installationSteps: ['npm install'],
      usageExamples: ['npm start'],
      configFiles: ['package.json'],
      rawContent: 'React application for statistics testing'
    };

    // Perform some operations
    await detector.detectFrameworks(projectInfo);
    const detectionResult = await detector.detectFrameworks(projectInfo); // Second call for cache hit
    await detector.suggestCISteps(detectionResult);

    // Get performance statistics
    const stats = detector.getPerformanceStats();

    expect(stats).toBeDefined();
    expect(stats.cache).toBeDefined();
    expect(stats.performance).toBeDefined();
    expect(stats.plugins).toBeDefined();
    expect(stats.config).toBeDefined();

    // Cache should have some hits
    expect(stats.cache.hits).toBeGreaterThan(0);

    // Performance should have recorded operations
    expect(stats.performance.operations.total).toBeGreaterThan(0);

    console.log('Performance Statistics:', {
      cacheHitRate: stats.cache.hitRate.toFixed(2),
      totalOperations: stats.performance.operations.total,
      successfulOperations: stats.performance.operations.successful,
      averageDuration: `${stats.performance.operations.averageDuration.toFixed(2)}ms`
    });
  });

  it('should clear caches properly', async () => {
    const projectInfo: ProjectInfo = {
      name: 'clear-test-project',
      description: 'A test project for cache clearing',
      languages: ['JavaScript'],
      dependencies: ['react'],
      buildCommands: ['npm run build'],
      testCommands: ['npm test'],
      installationSteps: ['npm install'],
      usageExamples: ['npm start'],
      configFiles: ['package.json'],
      rawContent: 'React application for cache clearing testing'
    };

    // Perform operations to populate cache
    await detector.detectFrameworks(projectInfo);
    await detector.detectFrameworks(projectInfo); // Cache hit

    // Verify cache has entries
    let stats = detector.getPerformanceStats();
    expect(stats.cache.entries).toBeGreaterThan(0);
    expect(stats.cache.hits).toBeGreaterThan(0);

    // Clear caches
    detector.clearCaches();

    // Verify cache is cleared
    stats = detector.getPerformanceStats();
    expect(stats.cache.entries).toBe(0);
    expect(stats.cache.hits).toBe(0);

    console.log('Cache clearing test completed successfully');
  });
});