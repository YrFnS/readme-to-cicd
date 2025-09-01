/**
 * Memory Leak Detection Integration Tests
 * 
 * Integration tests for memory leak detection utilities with real memory
 * monitoring and test execution scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryLeakDetector,
  initializeMemoryLeakDetection,
  cleanupMemoryLeakDetection,
  takeMemorySnapshot,
  analyzeMemoryLeaks,
  getMemoryLeakSummary
} from '../../src/shared/memory-leak-detection.js';
import {
  TestWorkerMemoryMonitor,
  initializeTestWorkerMemoryMonitoring,
  cleanupTestWorkerMemoryMonitoring
} from '../../src/shared/test-worker-memory-monitor.js';
import {
  TestMemoryTracker,
  initializeTestMemoryTracking,
  cleanupTestMemoryTracking
} from '../../src/shared/test-memory-tracking.js';

describe('Memory Leak Detection Integration', () => {
  let memoryMonitor: TestWorkerMemoryMonitor;
  let memoryTracker: TestMemoryTracker;
  let leakDetector: MemoryLeakDetector;

  beforeEach(() => {
    // Initialize all memory monitoring components
    memoryMonitor = initializeTestWorkerMemoryMonitoring({
      maxMemoryBytes: 256 * 1024 * 1024, // 256MB
      warningThreshold: 0.7,
      criticalThreshold: 0.85,
      monitoringInterval: 1000,
      enableAutoCleanup: false,
      enableDetailedLogging: false
    });

    memoryTracker = initializeTestMemoryTracking(memoryMonitor);
    leakDetector = initializeMemoryLeakDetection({
      minSnapshots: 3,
      growthThreshold: 5 * 1024 * 1024, // 5MB
      enableDetailedLogging: false
    });
  });

  afterEach(() => {
    cleanupMemoryLeakDetection();
    cleanupTestMemoryTracking();
    cleanupTestWorkerMemoryMonitoring();
  });

  describe('Integration with TestWorkerMemoryMonitor', () => {
    it('should integrate with memory monitor for real-time detection', async () => {
      // Start monitoring
      memoryMonitor.startMonitoring();

      // Take initial snapshot
      const initialUsage = memoryMonitor.getCurrentMemoryUsage();
      takeMemorySnapshot({
        testName: 'integration-test',
        phase: 'before',
        suiteName: 'integration-suite'
      });

      // Simulate memory-intensive operation
      const largeArray: number[][] = [];
      for (let i = 0; i < 1000; i++) {
        largeArray.push(new Array(1000).fill(Math.random()));
      }

      // Take snapshot after memory allocation
      takeMemorySnapshot({
        testName: 'integration-test',
        phase: 'during',
        suiteName: 'integration-suite'
      });

      // Simulate more memory usage
      const anotherArray: string[] = [];
      for (let i = 0; i < 100000; i++) {
        anotherArray.push(`test-string-${i}-${Math.random()}`);
      }

      // Take final snapshot
      takeMemorySnapshot({
        testName: 'integration-test',
        phase: 'after',
        suiteName: 'integration-suite'
      });

      // Analyze for leaks
      const analysis = analyzeMemoryLeaks();

      expect(analysis).toBeDefined();
      expect(analysis!.statistics.measurementCount).toBe(3);
      expect(analysis!.statistics.totalGrowth).toBeGreaterThan(0);

      // Cleanup
      largeArray.length = 0;
      anotherArray.length = 0;
      memoryMonitor.stopMonitoring();
    });

    it('should detect memory events and correlate with snapshots', async () => {
      let memoryEvents: any[] = [];

      // Register event handler
      memoryMonitor.onMemoryEvent((event) => {
        memoryEvents.push(event);
        
        // Take snapshot on memory events
        if (event.type === 'warning' || event.type === 'critical') {
          takeMemorySnapshot({
            testName: event.testName || 'unknown',
            phase: 'during',
            description: `Memory event: ${event.type}`
          }, {
            eventType: event.type,
            eventMessage: event.message
          });
        }
      });

      memoryMonitor.startMonitoring();

      // Simulate memory growth that might trigger events
      const memoryHogs: any[] = [];
      for (let i = 0; i < 10; i++) {
        // Create large objects
        const largeObject = {
          data: new Array(50000).fill(`data-${i}`),
          metadata: new Array(10000).fill({ id: i, value: Math.random() })
        };
        memoryHogs.push(largeObject);

        // Take snapshot
        takeMemorySnapshot({
          testName: `memory-hog-test-${i}`,
          phase: 'during',
          suiteName: 'memory-event-suite'
        });

        // Small delay to allow monitoring
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze memory leaks
      const analysis = analyzeMemoryLeaks();

      expect(analysis).toBeDefined();
      expect(analysis!.statistics.measurementCount).toBeGreaterThan(5);

      // Check if we have memory events
      if (memoryEvents.length > 0) {
        expect(memoryEvents.some(e => e.type === 'warning' || e.type === 'critical')).toBe(true);
      }

      // Cleanup
      memoryHogs.length = 0;
      memoryMonitor.stopMonitoring();
    });
  });

  describe('Integration with TestMemoryTracker', () => {
    it('should integrate with memory tracker for test-level analysis', () => {
      // Start suite tracking
      memoryTracker.startSuite('leak-detection-suite');

      const testNames = ['test-1', 'test-2', 'test-3', 'test-4'];
      
      testNames.forEach((testName, index) => {
        // Start test tracking
        memoryTracker.startTest(testName);

        // Take leak detection snapshot
        takeMemorySnapshot({
          testName,
          phase: 'before',
          suiteName: 'leak-detection-suite'
        });

        // Simulate test execution with memory usage
        const testData: any[] = [];
        for (let i = 0; i < 1000 * (index + 1); i++) {
          testData.push({
            id: i,
            data: `test-data-${testName}-${i}`,
            metadata: new Array(10).fill(Math.random())
          });
        }

        // Take snapshot after test execution
        takeMemorySnapshot({
          testName,
          phase: 'after',
          suiteName: 'leak-detection-suite'
        });

        // End test tracking
        memoryTracker.endTest(testName, 'passed');

        // Keep reference to simulate memory leak
        if (index < 2) {
          // Don't clear testData for first two tests to simulate leak
        } else {
          testData.length = 0; // Clear for last two tests
        }
      });

      // End suite tracking
      const suiteReport = memoryTracker.endSuite('leak-detection-suite');

      // Analyze memory leaks
      const leakAnalysis = analyzeMemoryLeaks();

      expect(suiteReport).toBeDefined();
      expect(suiteReport.totalTests).toBe(4);
      expect(suiteReport.totalMemoryGrowth).toBeGreaterThan(0);

      expect(leakAnalysis).toBeDefined();
      expect(leakAnalysis!.statistics.measurementCount).toBe(8); // 4 tests × 2 snapshots
      
      // Should detect some pattern due to increasing memory usage
      if (leakAnalysis!.leakDetected) {
        expect(leakAnalysis!.patterns.length).toBeGreaterThan(0);
      }
    });

    it('should correlate memory tracker data with leak detection', () => {
      memoryTracker.startSuite('correlation-suite');

      // Create tests with known memory patterns
      const memoryPatterns = [
        { name: 'stable-test', growth: 0 },
        { name: 'small-growth-test', growth: 2 * 1024 * 1024 }, // 2MB
        { name: 'medium-growth-test', growth: 8 * 1024 * 1024 }, // 8MB
        { name: 'large-growth-test', growth: 20 * 1024 * 1024 } // 20MB
      ];

      const testData: any[] = [];

      memoryPatterns.forEach((pattern, index) => {
        memoryTracker.startTest(pattern.name);

        // Take before snapshot
        takeMemorySnapshot({
          testName: pattern.name,
          phase: 'before',
          suiteName: 'correlation-suite'
        });

        // Simulate memory usage based on pattern
        const dataSize = Math.floor(pattern.growth / 100); // Approximate data size
        for (let i = 0; i < dataSize; i++) {
          testData.push({
            testName: pattern.name,
            data: new Array(100).fill(`data-${i}`)
          });
        }

        // Take after snapshot
        takeMemorySnapshot({
          testName: pattern.name,
          phase: 'after',
          suiteName: 'correlation-suite'
        });

        memoryTracker.endTest(pattern.name, 'passed');
      });

      const suiteReport = memoryTracker.endSuite('correlation-suite');
      const leakAnalysis = analyzeMemoryLeaks();

      // Verify correlation between tracker and leak detector
      expect(suiteReport.totalMemoryGrowth).toBeGreaterThan(0);
      expect(leakAnalysis!.statistics.totalGrowth).toBeGreaterThan(0);

      // Both should detect the large growth test as suspicious
      const suspiciousTest = leakAnalysis!.suspiciousSnapshots.find(s => 
        s.snapshot.context.testName === 'large-growth-test'
      );
      
      if (leakAnalysis!.leakDetected) {
        expect(suspiciousTest).toBeDefined();
      }

      // Cleanup
      testData.length = 0;
    });
  });

  describe('Real Memory Leak Simulation', () => {
    it('should detect actual memory leak patterns', async () => {
      // Simulate a real memory leak scenario
      const leakyObjects: any[] = [];
      const eventListeners: any[] = [];

      memoryTracker.startSuite('real-leak-suite');

      for (let testIndex = 0; testIndex < 5; testIndex++) {
        const testName = `leaky-test-${testIndex}`;
        
        memoryTracker.startTest(testName);

        // Take before snapshot
        takeMemorySnapshot({
          testName,
          phase: 'before',
          suiteName: 'real-leak-suite'
        });

        // Simulate common memory leak patterns
        
        // 1. Growing array that's never cleared
        for (let i = 0; i < 1000; i++) {
          leakyObjects.push({
            id: `${testName}-${i}`,
            data: new Array(100).fill(Math.random()),
            timestamp: Date.now()
          });
        }

        // 2. Event listeners that accumulate
        const mockEventListener = {
          testName,
          callback: () => console.log(`Event from ${testName}`),
          data: new Array(50).fill('event-data')
        };
        eventListeners.push(mockEventListener);

        // 3. Closures that capture large objects
        const largeData = new Array(500).fill('closure-data');
        const closure = () => {
          return largeData.length; // Captures largeData
        };
        leakyObjects.push({ closure, testName });

        // Take after snapshot
        takeMemorySnapshot({
          testName,
          phase: 'after',
          suiteName: 'real-leak-suite'
        });

        memoryTracker.endTest(testName, 'passed');

        // Small delay to allow memory monitoring
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const suiteReport = memoryTracker.endSuite('real-leak-suite');
      const leakAnalysis = analyzeMemoryLeaks();

      // Verify leak detection
      expect(leakAnalysis!.leakDetected).toBe(true);
      expect(leakAnalysis!.confidence).toBeGreaterThan(0.5);
      expect(leakAnalysis!.patterns.length).toBeGreaterThan(0);
      
      // Should detect linear growth pattern
      const linearPattern = leakAnalysis!.patterns.find(p => p.type === 'linear_growth');
      expect(linearPattern).toBeDefined();
      expect(linearPattern?.confidence).toBeGreaterThan(0.3);

      // Should have suspicious snapshots
      expect(leakAnalysis!.suspiciousSnapshots.length).toBeGreaterThan(0);

      // Should provide recommendations
      expect(leakAnalysis!.recommendations.length).toBeGreaterThan(0);
      expect(leakAnalysis!.recommendations.some(r => 
        r.includes('cleanup') || r.includes('garbage collection')
      )).toBe(true);

      // Generate comprehensive report
      const summary = getMemoryLeakSummary();
      expect(summary).toContain('🚨 YES'); // Leak detected
      expect(summary).toContain('Detected Patterns');
      expect(summary).toContain('Recommendations');

      // Cleanup to prevent actual memory leaks in test
      leakyObjects.length = 0;
      eventListeners.length = 0;
    });

    it('should handle memory cleanup and verify leak resolution', async () => {
      const testObjects: any[] = [];

      // Phase 1: Create memory leak
      for (let i = 0; i < 3; i++) {
        takeMemorySnapshot({
          testName: `leak-phase-${i}`,
          phase: 'during',
          suiteName: 'cleanup-test-suite'
        });

        // Add objects that won't be cleaned up
        for (let j = 0; j < 1000; j++) {
          testObjects.push({
            id: `${i}-${j}`,
            data: new Array(100).fill(`leak-data-${i}-${j}`)
          });
        }
      }

      // Analyze leaks before cleanup
      const beforeCleanup = analyzeMemoryLeaks();

      // Phase 2: Cleanup memory
      testObjects.length = 0;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
        global.gc();
      }

      // Take snapshots after cleanup
      for (let i = 0; i < 3; i++) {
        takeMemorySnapshot({
          testName: `cleanup-phase-${i}`,
          phase: 'after',
          suiteName: 'cleanup-test-suite'
        });

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Analyze leaks after cleanup
      const afterCleanup = analyzeMemoryLeaks();

      // Verify that cleanup was detected
      expect(beforeCleanup!.statistics.totalGrowth).toBeGreaterThan(0);
      
      // The total growth might still be positive due to all snapshots,
      // but the recent growth should be lower
      const recentSnapshots = leakDetector.getSnapshotsInWindow(5000); // Last 5 seconds
      if (recentSnapshots.length >= 2) {
        const recentGrowth = recentSnapshots[recentSnapshots.length - 1].memoryUsage.heapUsed - 
                           recentSnapshots[0].memoryUsage.heapUsed;
        
        // Recent growth should be less than the initial growth
        expect(Math.abs(recentGrowth)).toBeLessThan(beforeCleanup!.statistics.totalGrowth);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of snapshots efficiently', () => {
      const startTime = Date.now();
      
      // Create many snapshots
      for (let i = 0; i < 100; i++) {
        takeMemorySnapshot({
          testName: `performance-test-${i}`,
          phase: 'during',
          suiteName: 'performance-suite'
        }, {
          iteration: i,
          batchSize: 100
        });
      }

      const snapshotTime = Date.now() - startTime;

      // Analyze performance
      const analysisStartTime = Date.now();
      const analysis = analyzeMemoryLeaks();
      const analysisTime = Date.now() - analysisStartTime;

      // Verify performance
      expect(snapshotTime).toBeLessThan(5000); // Should take less than 5 seconds
      expect(analysisTime).toBeLessThan(2000); // Analysis should take less than 2 seconds

      expect(analysis!.statistics.measurementCount).toBe(100);
      expect(analysis!.report).toContain('Memory Leak Analysis Report');
    });

    it('should manage memory usage of the detector itself', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many snapshots and analyses
      for (let batch = 0; batch < 10; batch++) {
        for (let i = 0; i < 50; i++) {
          takeMemorySnapshot({
            testName: `memory-management-test-${batch}-${i}`,
            phase: 'during',
            suiteName: 'memory-management-suite'
          });
        }

        // Analyze periodically
        analyzeMemoryLeaks();

        // Clear snapshots periodically to test cleanup
        if (batch % 3 === 0) {
          leakDetector.clearSnapshots();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const detectorMemoryUsage = finalMemory - initialMemory;

      // The detector itself shouldn't use excessive memory
      expect(detectorMemoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });
});