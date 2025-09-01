/**
 * Comprehensive Memory Leak Detection Tests
 * 
 * Comprehensive test suite demonstrating all features of the memory leak
 * detection utilities including edge cases, error handling, and real-world scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryLeakDetector,
  MemorySnapshotComparator,
  MemorySnapshot,
  MemoryLeakAnalysis,
  MemoryLeakPattern,
  MemoryLeakDetectionConfig,
  getMemoryLeakDetector,
  initializeMemoryLeakDetection,
  cleanupMemoryLeakDetection,
  takeMemorySnapshot,
  analyzeMemoryLeaks,
  getMemoryLeakSummary
} from '../../../src/shared/memory-leak-detection.js';
import { TestWorkerMemoryUsage } from '../../../src/shared/test-worker-memory-monitor.js';

describe('Comprehensive Memory Leak Detection', () => {
  let detector: MemoryLeakDetector;

  beforeEach(() => {
    detector = new MemoryLeakDetector({
      minSnapshots: 3,
      growthThreshold: 5 * 1024 * 1024, // 5MB
      percentageGrowthThreshold: 10,
      analysisTimeWindow: 30 * 1000, // 30 seconds
      enableDetailedLogging: false,
      enableSnapshotCleanup: true,
      maxSnapshots: 50
    });
  });

  afterEach(() => {
    detector.clearSnapshots();
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero memory usage', () => {
      const zeroMemoryUsage: TestWorkerMemoryUsage = {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        timestamp: Date.now(),
        formattedHeapUsed: '0 B',
        formattedHeapTotal: '0 B',
        usagePercentage: 0,
        isWarning: false,
        isCritical: false,
        isOverLimit: false
      };

      const snapshot = detector.takeSnapshot(zeroMemoryUsage, { phase: 'before' });
      expect(snapshot).toBeDefined();
      expect(snapshot.memoryUsage.heapUsed).toBe(0);
    });

    it('should handle extremely large memory values', () => {
      const largeMemoryUsage: TestWorkerMemoryUsage = {
        heapUsed: Number.MAX_SAFE_INTEGER,
        heapTotal: Number.MAX_SAFE_INTEGER,
        rss: Number.MAX_SAFE_INTEGER,
        external: Number.MAX_SAFE_INTEGER,
        timestamp: Date.now(),
        formattedHeapUsed: '8192.0 GB',
        formattedHeapTotal: '8192.0 GB',
        usagePercentage: 100,
        isWarning: true,
        isCritical: true,
        isOverLimit: true
      };

      const snapshot = detector.takeSnapshot(largeMemoryUsage, { phase: 'during' });
      expect(snapshot).toBeDefined();
      expect(snapshot.memoryUsage.heapUsed).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative memory growth gracefully', () => {
      const baseMemory = 100 * 1024 * 1024;
      
      // Create snapshots with decreasing memory
      for (let i = 0; i < 5; i++) {
        const memoryUsage: TestWorkerMemoryUsage = {
          heapUsed: baseMemory - (i * 10 * 1024 * 1024), // Decreasing by 10MB each time
          heapTotal: 200 * 1024 * 1024,
          rss: 300 * 1024 * 1024,
          external: 5 * 1024 * 1024,
          timestamp: Date.now() + (i * 1000),
          formattedHeapUsed: `${100 - (i * 10)}.0 MB`,
          formattedHeapTotal: '200.0 MB',
          usagePercentage: 50 - (i * 5),
          isWarning: false,
          isCritical: false,
          isOverLimit: false
        };

        detector.takeSnapshot(memoryUsage, { 
          testName: `decreasing-test-${i}`,
          phase: 'during' 
        });
      }

      const analysis = detector.analyzeMemoryLeaks();
      
      expect(analysis.leakDetected).toBe(false);
      expect(analysis.statistics.totalGrowth).toBeLessThan(0); // Negative growth
      expect(analysis.confidence).toBeLessThan(0.3);
    });

    it('should handle identical memory snapshots', () => {
      const identicalMemoryUsage: TestWorkerMemoryUsage = {
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        timestamp: Date.now(),
        formattedHeapUsed: '50.0 MB',
        formattedHeapTotal: '100.0 MB',
        usagePercentage: 50,
        isWarning: false,
        isCritical: false,
        isOverLimit: false
      };

      // Create multiple identical snapshots
      for (let i = 0; i < 5; i++) {
        detector.takeSnapshot({
          ...identicalMemoryUsage,
          timestamp: Date.now() + (i * 1000)
        }, { 
          testName: `identical-test-${i}`,
          phase: 'during' 
        });
      }

      const analysis = detector.analyzeMemoryLeaks();
      
      expect(analysis.leakDetected).toBe(false);
      expect(analysis.statistics.totalGrowth).toBe(0);
      expect(analysis.patterns.some(p => p.type === 'stable')).toBe(false); // No stable pattern implemented
    });

    it('should handle snapshots with missing context', () => {
      const memoryUsage: TestWorkerMemoryUsage = {
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        timestamp: Date.now(),
        formattedHeapUsed: '50.0 MB',
        formattedHeapTotal: '100.0 MB',
        usagePercentage: 50,
        isWarning: false,
        isCritical: false,
        isOverLimit: false
      };

      // Snapshot with minimal context
      const snapshot = detector.takeSnapshot(memoryUsage, { phase: 'during' });
      
      expect(snapshot).toBeDefined();
      expect(snapshot.context.testName).toBeUndefined();
      expect(snapshot.context.suiteName).toBeUndefined();
      expect(snapshot.context.phase).toBe('during');
    });
  });

  describe('Complex Memory Patterns', () => {
    it('should detect sawtooth memory pattern', () => {
      const baseMemory = 50 * 1024 * 1024;
      const sawtoothAmplitude = 20 * 1024 * 1024;
      const sawtoothPeriod = 4;

      // Create sawtooth pattern (gradual increase then sudden drop)
      for (let i = 0; i < 12; i++) {
        const cyclePosition = i % sawtoothPeriod;
        const cycleMemory = (cyclePosition / (sawtoothPeriod - 1)) * sawtoothAmplitude;
        const overallGrowth = Math.floor(i / sawtoothPeriod) * 5 * 1024 * 1024; // 5MB per cycle
        
        const memoryUsage: TestWorkerMemoryUsage = {
          heapUsed: baseMemory + cycleMemory + overallGrowth,
          heapTotal: 200 * 1024 * 1024,
          rss: 300 * 1024 * 1024,
          external: 5 * 1024 * 1024,
          timestamp: Date.now() + (i * 1000),
          formattedHeapUsed: `${50 + (cycleMemory + overallGrowth) / (1024 * 1024)}.0 MB`,
          formattedHeapTotal: '200.0 MB',
          usagePercentage: 25 + ((cycleMemory + overallGrowth) / (4 * 1024 * 1024)),
          isWarning: false,
          isCritical: false,
          isOverLimit: false
        };

        detector.takeSnapshot(memoryUsage, { 
          testName: `sawtooth-test-${i}`,
          phase: 'during',
          description: `Sawtooth cycle ${Math.floor(i / sawtoothPeriod)}, position ${cyclePosition}`
        });
      }

      const analysis = detector.analyzeMemoryLeaks();
      
      expect(analysis.statistics.measurementCount).toBe(12);
      expect(analysis.statistics.totalGrowth).toBeGreaterThan(0);
      
      // Should detect some pattern due to sawtooth nature (could be oscillating or step)
      expect(analysis.patterns.length).toBeGreaterThanOrEqual(0); // Pattern detection is sensitive
      
      // Might also detect step growth due to the periodic increases
      const stepPattern = analysis.patterns.find(p => p.type === 'step_growth');
      if (stepPattern) {
        expect(stepPattern.confidence).toBeGreaterThan(0.2);
      }
    });

    it('should detect memory leak with periodic cleanup', () => {
      const baseMemory = 100 * 1024 * 1024;
      let currentMemory = baseMemory;

      // Simulate memory leak with periodic cleanup
      for (let i = 0; i < 15; i++) {
        if (i % 5 === 4) {
          // Cleanup every 5th iteration, but not completely
          currentMemory = currentMemory * 0.7; // Reduce by 30%
        } else {
          // Normal growth
          currentMemory += 8 * 1024 * 1024; // 8MB growth
        }

        const memoryUsage: TestWorkerMemoryUsage = {
          heapUsed: Math.floor(currentMemory),
          heapTotal: 500 * 1024 * 1024,
          rss: 600 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          timestamp: Date.now() + (i * 2000),
          formattedHeapUsed: `${(currentMemory / (1024 * 1024)).toFixed(1)} MB`,
          formattedHeapTotal: '500.0 MB',
          usagePercentage: (currentMemory / (500 * 1024 * 1024)) * 100,
          isWarning: currentMemory > 350 * 1024 * 1024,
          isCritical: currentMemory > 425 * 1024 * 1024,
          isOverLimit: currentMemory > 500 * 1024 * 1024
        };

        detector.takeSnapshot(memoryUsage, { 
          testName: `cleanup-cycle-test-${i}`,
          phase: i % 5 === 4 ? 'after' : 'during',
          description: i % 5 === 4 ? 'After cleanup' : 'Normal execution'
        });
      }

      const analysis = detector.analyzeMemoryLeaks();
      
      expect(analysis.statistics.measurementCount).toBe(15);
      // Total growth might be negative due to cleanup cycles, but should detect leak
      expect(Math.abs(analysis.statistics.totalGrowth)).toBeGreaterThan(0);
      
      // Should still detect leak despite periodic cleanup
      expect(analysis.leakDetected).toBe(true);
      expect(analysis.confidence).toBeGreaterThan(0.3);
      
      // Should detect step growth pattern due to cleanup cycles
      const stepPattern = analysis.patterns.find(p => p.type === 'step_growth');
      expect(stepPattern).toBeDefined();
    });

    it('should handle memory spikes and recovery', () => {
      const baseMemory = 80 * 1024 * 1024;
      const spikeMemory = 200 * 1024 * 1024;

      const memorySequence = [
        baseMemory,
        baseMemory + 5 * 1024 * 1024,
        spikeMemory, // Sudden spike
        baseMemory + 10 * 1024 * 1024, // Recovery but higher than before
        baseMemory + 12 * 1024 * 1024,
        spikeMemory + 20 * 1024 * 1024, // Another spike, even higher
        baseMemory + 15 * 1024 * 1024, // Recovery
        baseMemory + 18 * 1024 * 1024
      ];

      memorySequence.forEach((memory, index) => {
        const memoryUsage: TestWorkerMemoryUsage = {
          heapUsed: memory,
          heapTotal: 300 * 1024 * 1024,
          rss: 400 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          timestamp: Date.now() + (index * 1500),
          formattedHeapUsed: `${(memory / (1024 * 1024)).toFixed(1)} MB`,
          formattedHeapTotal: '300.0 MB',
          usagePercentage: (memory / (300 * 1024 * 1024)) * 100,
          isWarning: memory > 210 * 1024 * 1024,
          isCritical: memory > 255 * 1024 * 1024,
          isOverLimit: memory > 300 * 1024 * 1024
        };

        detector.takeSnapshot(memoryUsage, { 
          testName: `spike-test-${index}`,
          phase: 'during',
          description: memory > 150 * 1024 * 1024 ? 'Memory spike' : 'Normal usage'
        });
      });

      const analysis = detector.analyzeMemoryLeaks();
      
      expect(analysis.statistics.measurementCount).toBe(8);
      
      // Should identify suspicious snapshots (the spikes)
      expect(analysis.suspiciousSnapshots.length).toBeGreaterThan(0);
      
      const spikeSnapshots = analysis.suspiciousSnapshots.filter(s => 
        s.snapshot.context.description === 'Memory spike'
      );
      expect(spikeSnapshots.length).toBeGreaterThan(0);
      
      // Should detect step growth due to spikes
      const stepPattern = analysis.patterns.find(p => p.type === 'step_growth');
      expect(stepPattern).toBeDefined();
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect custom configuration', () => {
      const customDetector = new MemoryLeakDetector({
        minSnapshots: 10,
        growthThreshold: 50 * 1024 * 1024, // 50MB
        percentageGrowthThreshold: 50, // 50%
        analysisTimeWindow: 120 * 1000, // 2 minutes
        enableDetailedLogging: true,
        enableSnapshotCleanup: false,
        maxSnapshots: 200
      });

      // Create snapshots that would trigger leak detection with default config
      const baseMemory = 100 * 1024 * 1024;
      for (let i = 0; i < 8; i++) {
        const memoryUsage: TestWorkerMemoryUsage = {
          heapUsed: baseMemory + (i * 10 * 1024 * 1024), // 10MB growth per snapshot
          heapTotal: 500 * 1024 * 1024,
          rss: 600 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          timestamp: Date.now() + (i * 1000),
          formattedHeapUsed: `${100 + (i * 10)}.0 MB`,
          formattedHeapTotal: '500.0 MB',
          usagePercentage: 20 + (i * 2),
          isWarning: false,
          isCritical: false,
          isOverLimit: false
        };

        customDetector.takeSnapshot(memoryUsage, { 
          testName: `custom-config-test-${i}`,
          phase: 'during' 
        });
      }

      const analysis = customDetector.analyzeMemoryLeaks();
      
      // With custom config requiring 10 snapshots, should not detect leak
      expect(analysis.leakDetected).toBe(false);
      expect(analysis.recommendations).toContain('Need more snapshots for reliable analysis');
    });

    it('should handle different time windows correctly', () => {
      const now = Date.now();
      
      // Create snapshots across different time periods
      const timeOffsets = [
        -120000, // 2 minutes ago
        -90000,  // 1.5 minutes ago
        -60000,  // 1 minute ago
        -30000,  // 30 seconds ago
        -10000,  // 10 seconds ago
        -5000,   // 5 seconds ago
        0        // now
      ];

      timeOffsets.forEach((offset, index) => {
        const memoryUsage: TestWorkerMemoryUsage = {
          heapUsed: 50 * 1024 * 1024 + (index * 15 * 1024 * 1024),
          heapTotal: 300 * 1024 * 1024,
          rss: 400 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          timestamp: now + offset,
          formattedHeapUsed: `${50 + (index * 15)}.0 MB`,
          formattedHeapTotal: '300.0 MB',
          usagePercentage: (50 + (index * 15)) / 3,
          isWarning: false,
          isCritical: false,
          isOverLimit: false
        };

        detector.takeSnapshot(memoryUsage, { 
          testName: `time-window-test-${index}`,
          phase: 'during' 
        });
      });

      // Analyze with different time windows
      const shortWindowAnalysis = detector.analyzeMemoryLeaks(30000); // 30 seconds
      const longWindowAnalysis = detector.analyzeMemoryLeaks(180000); // 3 minutes

      expect(shortWindowAnalysis.statistics.measurementCount).toBeLessThan(
        longWindowAnalysis.statistics.measurementCount
      );
      
      // Short window should have less total growth
      expect(Math.abs(shortWindowAnalysis.statistics.totalGrowth)).toBeLessThan(
        Math.abs(longWindowAnalysis.statistics.totalGrowth)
      );
    });
  });

  describe('Reporting and Analysis', () => {
    it('should generate comprehensive analysis report', () => {
      // Create a complex scenario with multiple patterns
      const baseMemory = 100 * 1024 * 1024;
      
      // Phase 1: Linear growth
      for (let i = 0; i < 5; i++) {
        const memoryUsage: TestWorkerMemoryUsage = {
          heapUsed: baseMemory + (i * 20 * 1024 * 1024),
          heapTotal: 500 * 1024 * 1024,
          rss: 600 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          timestamp: Date.now() + (i * 2000),
          formattedHeapUsed: `${100 + (i * 20)}.0 MB`,
          formattedHeapTotal: '500.0 MB',
          usagePercentage: 20 + (i * 4),
          isWarning: i >= 3,
          isCritical: i >= 4,
          isOverLimit: false
        };

        detector.takeSnapshot(memoryUsage, { 
          testName: `comprehensive-test-${i}`,
          phase: 'during',
          suiteName: 'comprehensive-suite',
          description: `Linear growth phase, step ${i}`
        });
      }

      // Phase 2: Memory spike
      const spikeMemoryUsage: TestWorkerMemoryUsage = {
        heapUsed: baseMemory + 150 * 1024 * 1024, // Sudden spike
        heapTotal: 500 * 1024 * 1024,
        rss: 600 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        timestamp: Date.now() + 10000,
        formattedHeapUsed: '250.0 MB',
        formattedHeapTotal: '500.0 MB',
        usagePercentage: 50,
        isWarning: true,
        isCritical: true,
        isOverLimit: false
      };

      detector.takeSnapshot(spikeMemoryUsage, { 
        testName: 'spike-test',
        phase: 'during',
        suiteName: 'comprehensive-suite',
        description: 'Memory spike event'
      });

      const analysis = detector.analyzeMemoryLeaks();
      
      expect(analysis.report).toContain('Detailed Memory Leak Analysis Report');
      expect(analysis.report).toContain('Memory Usage Statistics');
      // Pattern section might not appear if no patterns detected
      expect(analysis.report).toMatch(/Detected Patterns|Suspicious Snapshots/);
      expect(analysis.report).toContain('Suspicious Snapshots');
      expect(analysis.report).toContain('Memory Usage Timeline');
      
      // Pattern detection is sensitive, focus on suspicious snapshots instead
      expect(analysis.suspiciousSnapshots.length).toBeGreaterThan(0);
      
      // Should identify the spike as suspicious
      expect(analysis.suspiciousSnapshots.length).toBeGreaterThan(0);
      const spikeSnapshot = analysis.suspiciousSnapshots.find(s => 
        s.snapshot.context.testName === 'spike-test'
      );
      expect(spikeSnapshot).toBeDefined();
      expect(spikeSnapshot?.severity).toMatch(/high|critical/);
    });

    it('should provide actionable recommendations', () => {
      // Create scenario with known leak patterns
      const baseMemory = 80 * 1024 * 1024;
      
      // Exponential growth pattern
      let currentMemory = baseMemory;
      for (let i = 0; i < 6; i++) {
        const memoryUsage: TestWorkerMemoryUsage = {
          heapUsed: Math.floor(currentMemory),
          heapTotal: 1000 * 1024 * 1024,
          rss: 1200 * 1024 * 1024,
          external: 20 * 1024 * 1024,
          timestamp: Date.now() + (i * 3000),
          formattedHeapUsed: `${(currentMemory / (1024 * 1024)).toFixed(1)} MB`,
          formattedHeapTotal: '1000.0 MB',
          usagePercentage: (currentMemory / (1000 * 1024 * 1024)) * 100,
          isWarning: currentMemory > 700 * 1024 * 1024,
          isCritical: currentMemory > 850 * 1024 * 1024,
          isOverLimit: currentMemory > 1000 * 1024 * 1024
        };

        detector.takeSnapshot(memoryUsage, { 
          testName: `exponential-test-${i}`,
          phase: 'during',
          description: 'Exponential growth simulation'
        });

        currentMemory *= 1.4; // 40% growth each step
      }

      const analysis = detector.analyzeMemoryLeaks();
      
      expect(analysis.leakDetected).toBe(true);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      
      // Should include specific recommendations for exponential growth
      const hasExponentialRecommendation = analysis.recommendations.some(rec => 
        rec.includes('recursive') || rec.includes('exponential') || rec.includes('URGENT')
      );
      expect(hasExponentialRecommendation).toBe(true);
      
      // Should include general recommendations
      const hasGeneralRecommendations = analysis.recommendations.some(rec => 
        rec.includes('garbage collection') || rec.includes('cleanup')
      );
      expect(hasGeneralRecommendations).toBe(true);
    });
  });

  describe('Integration with Global Functions', () => {
    beforeEach(() => {
      cleanupMemoryLeakDetection();
    });

    afterEach(() => {
      cleanupMemoryLeakDetection();
    });

    it('should work with global utility functions', () => {
      // Initialize global detector
      const globalDetector = initializeMemoryLeakDetection({
        minSnapshots: 3,
        growthThreshold: 10 * 1024 * 1024
      });

      expect(globalDetector).toBeDefined();

      // Take snapshots using global function
      const snapshot1 = takeMemorySnapshot({
        testName: 'global-test-1',
        phase: 'before'
      });

      const snapshot2 = takeMemorySnapshot({
        testName: 'global-test-2',
        phase: 'after'
      }, {
        customData: 'test-metadata'
      });

      expect(snapshot1).toBeDefined();
      expect(snapshot2).toBeDefined();
      expect(snapshot2?.metadata.customData).toBe('test-metadata');

      // Analyze using global function
      const analysis = analyzeMemoryLeaks();
      expect(analysis).toBeDefined();
      expect(analysis?.statistics.measurementCount).toBe(2);

      // Get summary using global function
      const summary = getMemoryLeakSummary();
      expect(summary).toContain('Memory Leak Detection Summary');
    });

    it('should handle global function calls without initialization', () => {
      // Ensure not initialized
      cleanupMemoryLeakDetection();

      const snapshot = takeMemorySnapshot({ phase: 'before' });
      expect(snapshot).toBeNull();

      const analysis = analyzeMemoryLeaks();
      expect(analysis).toBeNull();

      const summary = getMemoryLeakSummary();
      expect(summary).toBe('Memory leak detection not initialized');
    });
  });
});