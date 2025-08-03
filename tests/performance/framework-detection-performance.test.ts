import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrameworkDetectorImpl } from '../../src/detection/framework-detector';
import { ProjectInfo } from '../../src/detection/interfaces/framework-detector';
import { PerformanceMonitor, getPerformanceMonitor, resetPerformanceMonitor } from '../../src/detection/performance/performance-monitor';
import { getCacheManager, resetCacheManager } from '../../src/detection/performance/cache-manager';
import { getLazyLoader, resetLazyLoader } from '../../src/detection/performance/lazy-loader';

describe('Framework Detection Performance Tests', () => {
  let detector: FrameworkDetectorImpl;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    // Reset all singletons
    resetPerformanceMonitor();
    resetCacheManager();
    resetLazyLoader();
    
    // Initialize fresh instances
    detector = new FrameworkDetectorImpl();
    performanceMonitor = getPerformanceMonitor({
      enableMetrics: true,
      enableProfiling: true,
      enableOperationTiming: true
    });
  });

  afterEach(() => {
    performanceMonitor.stop();
  });

  describe('Detection Performance Benchmarks', () => {
    it('should detect Node.js React project within performance baseline', async () => {
      const projectInfo: ProjectInfo = {
        name: 'react-app',
        description: 'A React application',
        languages: ['JavaScript', 'TypeScript'],
        dependencies: ['react', 'react-dom', '@types/react'],
        buildCommands: ['npm run build', 'npm start'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json', 'tsconfig.json'],
        rawContent: 'React application with TypeScript'
      };

      const result = await performanceMonitor.benchmark(
        'nodejs-react-detection',
        () => detector.detectFrameworks(projectInfo),
        50
      );

      // Performance assertions
      expect(result.averageTime).toBeLessThan(100); // Should complete in under 100ms
      expect(result.operationsPerSecond).toBeGreaterThan(10); // Should handle at least 10 ops/sec
      expect(result.standardDeviation).toBeLessThan(50); // Should be consistent

      // Memory usage should be reasonable
      const memoryIncrease = result.memoryUsage.after.heapUsed - result.memoryUsage.before.heapUsed;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase

      console.log('Node.js React Detection Benchmark:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2),
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      });
    });

    it('should detect Python Django project within performance baseline', async () => {
      const projectInfo: ProjectInfo = {
        name: 'django-app',
        description: 'A Django web application',
        languages: ['Python'],
        dependencies: ['Django', 'psycopg2', 'gunicorn'],
        buildCommands: ['python manage.py collectstatic'],
        testCommands: ['python manage.py test'],
        installationSteps: ['pip install -r requirements.txt'],
        usageExamples: ['python manage.py runserver'],
        configFiles: ['requirements.txt', 'manage.py', 'settings.py'],
        rawContent: 'Django web application with PostgreSQL'
      };

      const result = await performanceMonitor.benchmark(
        'python-django-detection',
        () => detector.detectFrameworks(projectInfo),
        50
      );

      // Performance assertions
      expect(result.averageTime).toBeLessThan(150); // Should complete in under 150ms
      expect(result.operationsPerSecond).toBeGreaterThan(7); // Should handle at least 7 ops/sec
      expect(result.standardDeviation).toBeLessThan(75); // Should be reasonably consistent

      console.log('Python Django Detection Benchmark:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2)
      });
    });

    it('should detect multi-language project within performance baseline', async () => {
      const projectInfo: ProjectInfo = {
        name: 'fullstack-app',
        description: 'Full-stack application with React frontend and Node.js backend',
        languages: ['JavaScript', 'TypeScript', 'Python'],
        dependencies: ['react', 'express', 'Django', 'webpack'],
        buildCommands: ['npm run build', 'python manage.py collectstatic'],
        testCommands: ['npm test', 'python manage.py test'],
        installationSteps: ['npm install', 'pip install -r requirements.txt'],
        usageExamples: ['npm start', 'python manage.py runserver'],
        configFiles: ['package.json', 'requirements.txt', 'webpack.config.js', 'Dockerfile'],
        rawContent: 'Full-stack application with React, Express, Django, and Docker'
      };

      const result = await performanceMonitor.benchmark(
        'multi-language-detection',
        () => detector.detectFrameworks(projectInfo),
        30
      );

      // Performance assertions for complex projects
      expect(result.averageTime).toBeLessThan(300); // Should complete in under 300ms
      expect(result.operationsPerSecond).toBeGreaterThan(3); // Should handle at least 3 ops/sec
      expect(result.standardDeviation).toBeLessThan(150); // Allow more variance for complex projects

      console.log('Multi-language Detection Benchmark:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2)
      });
    });
  });

  describe('Cache Performance Tests', () => {
    it('should show significant performance improvement with caching', async () => {
      const projectInfo: ProjectInfo = {
        name: 'cached-test',
        description: 'Test project for cache performance',
        languages: ['JavaScript'],
        dependencies: ['react', 'webpack'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json'],
        rawContent: 'React application for cache testing'
      };

      // First run (no cache)
      const firstRun = await performanceMonitor.benchmark(
        'cache-first-run',
        () => detector.detectFrameworks(projectInfo),
        10
      );

      // Second run (with cache)
      const secondRun = await performanceMonitor.benchmark(
        'cache-second-run',
        () => detector.detectFrameworks(projectInfo),
        10
      );

      // Cache should provide significant speedup
      const speedupRatio = firstRun.averageTime / secondRun.averageTime;
      expect(speedupRatio).toBeGreaterThan(1.5); // At least 50% faster with cache

      console.log('Cache Performance Improvement:', {
        firstRun: `${firstRun.averageTime.toFixed(2)}ms`,
        secondRun: `${secondRun.averageTime.toFixed(2)}ms`,
        speedup: `${speedupRatio.toFixed(2)}x`
      });

      // Check cache statistics
      const cacheManager = getCacheManager();
      const cacheStats = cacheManager.getStats();
      expect(cacheStats.hitRate).toBeGreaterThan(0.5); // At least 50% hit rate
    });
  });

  describe('CI Pipeline Generation Performance', () => {
    it('should generate CI pipeline within performance baseline', async () => {
      const projectInfo: ProjectInfo = {
        name: 'ci-test',
        description: 'Test project for CI generation',
        languages: ['JavaScript', 'TypeScript'],
        dependencies: ['react', 'jest', 'webpack'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json', 'jest.config.js'],
        rawContent: 'React application with Jest testing'
      };

      // First detect frameworks
      const detectionResult = await detector.detectFrameworks(projectInfo);

      // Then benchmark CI generation
      const result = await performanceMonitor.benchmark(
        'ci-pipeline-generation',
        () => detector.suggestCISteps(detectionResult),
        30
      );

      // Performance assertions
      expect(result.averageTime).toBeLessThan(200); // Should complete in under 200ms
      expect(result.operationsPerSecond).toBeGreaterThan(5); // Should handle at least 5 ops/sec

      console.log('CI Pipeline Generation Benchmark:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2)
      });
    });
  });

  describe('Memory Usage Tests', () => {
    it('should maintain reasonable memory usage during repeated operations', async () => {
      const projectInfo: ProjectInfo = {
        name: 'memory-test',
        description: 'Test project for memory usage',
        languages: ['JavaScript'],
        dependencies: ['react'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json'],
        rawContent: 'React application for memory testing'
      };

      const initialMemory = performanceMonitor.takeMemorySnapshot();

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await detector.detectFrameworks(projectInfo);
      }

      const finalMemory = performanceMonitor.takeMemorySnapshot();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log('Memory Usage Test:', {
        initialMemory: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        finalMemory: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      });
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent detection requests efficiently', async () => {
      const projectInfos: ProjectInfo[] = [
        {
          name: 'react-app',
          description: 'React application',
          languages: ['JavaScript'],
          dependencies: ['react', 'react-dom'],
          buildCommands: ['npm run build'],
          testCommands: ['npm test'],
          installationSteps: ['npm install'],
          usageExamples: ['npm start'],
          configFiles: ['package.json'],
          rawContent: 'React application'
        },
        {
          name: 'vue-app',
          description: 'Vue application',
          languages: ['JavaScript'],
          dependencies: ['vue', '@vue/cli-service'],
          buildCommands: ['npm run build'],
          testCommands: ['npm test'],
          installationSteps: ['npm install'],
          usageExamples: ['npm run serve'],
          configFiles: ['package.json', 'vue.config.js'],
          rawContent: 'Vue application'
        },
        {
          name: 'angular-app',
          description: 'Angular application',
          languages: ['TypeScript'],
          dependencies: ['@angular/core', '@angular/cli'],
          buildCommands: ['ng build'],
          testCommands: ['ng test'],
          installationSteps: ['npm install'],
          usageExamples: ['ng serve'],
          configFiles: ['package.json', 'angular.json'],
          rawContent: 'Angular application'
        }
      ];

      const result = await performanceMonitor.benchmark(
        'concurrent-detection',
        async () => {
          const promises = projectInfos.map(info => detector.detectFrameworks(info));
          return Promise.all(promises);
        },
        20
      );

      // Concurrent operations should still be reasonably fast
      expect(result.averageTime).toBeLessThan(500); // Should complete in under 500ms
      expect(result.operationsPerSecond).toBeGreaterThan(2); // Should handle at least 2 concurrent ops/sec

      console.log('Concurrent Operations Benchmark:', {
        averageTime: `${result.averageTime.toFixed(2)}ms`,
        operationsPerSecond: result.operationsPerSecond.toFixed(2)
      });
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain performance baselines over time', async () => {
      // This test establishes baseline metrics that can be used to detect performance regressions
      const testCases = [
        {
          name: 'simple-nodejs',
          projectInfo: {
            name: 'simple-node',
            description: 'Simple Node.js app',
            languages: ['JavaScript'],
            dependencies: ['express'],
            buildCommands: ['npm run build'],
            testCommands: ['npm test'],
            installationSteps: ['npm install'],
            usageExamples: ['npm start'],
            configFiles: ['package.json'],
            rawContent: 'Simple Express application'
          },
          expectedMaxTime: 50 // 50ms baseline
        },
        {
          name: 'complex-fullstack',
          projectInfo: {
            name: 'complex-app',
            description: 'Complex full-stack application',
            languages: ['JavaScript', 'TypeScript', 'Python'],
            dependencies: ['react', 'express', 'Django', 'webpack', 'jest', 'pytest'],
            buildCommands: ['npm run build', 'python manage.py collectstatic'],
            testCommands: ['npm test', 'python manage.py test'],
            installationSteps: ['npm install', 'pip install -r requirements.txt'],
            usageExamples: ['npm start', 'python manage.py runserver'],
            configFiles: ['package.json', 'requirements.txt', 'webpack.config.js', 'Dockerfile'],
            rawContent: 'Complex full-stack application with multiple frameworks'
          },
          expectedMaxTime: 250 // 250ms baseline
        }
      ];

      for (const testCase of testCases) {
        const result = await performanceMonitor.benchmark(
          `baseline-${testCase.name}`,
          () => detector.detectFrameworks(testCase.projectInfo),
          25
        );

        // Check against baseline
        expect(result.averageTime).toBeLessThan(testCase.expectedMaxTime);
        
        console.log(`Baseline Test - ${testCase.name}:`, {
          averageTime: `${result.averageTime.toFixed(2)}ms`,
          baseline: `${testCase.expectedMaxTime}ms`,
          status: result.averageTime < testCase.expectedMaxTime ? 'PASS' : 'FAIL'
        });
      }
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should collect performance metrics during operations', async () => {
      const projectInfo: ProjectInfo = {
        name: 'metrics-test',
        description: 'Test project for metrics collection',
        languages: ['JavaScript'],
        dependencies: ['react'],
        buildCommands: ['npm run build'],
        testCommands: ['npm test'],
        installationSteps: ['npm install'],
        usageExamples: ['npm start'],
        configFiles: ['package.json'],
        rawContent: 'React application for metrics testing'
      };

      // Perform some operations
      for (let i = 0; i < 10; i++) {
        await detector.detectFrameworks(projectInfo);
      }

      // Check that metrics were collected
      const stats = performanceMonitor.getStats();
      expect(stats.operations.total).toBeGreaterThan(0);
      expect(stats.operations.successful).toBeGreaterThan(0);
      expect(stats.operations.averageDuration).toBeGreaterThan(0);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);

      console.log('Performance Metrics:', {
        totalOperations: stats.operations.total,
        successfulOperations: stats.operations.successful,
        averageDuration: `${stats.operations.averageDuration.toFixed(2)}ms`,
        metricsCollected: metrics.length
      });
    });
  });
});