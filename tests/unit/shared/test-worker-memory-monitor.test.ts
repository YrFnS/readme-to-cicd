/**
 * Test Worker Memory Monitor Tests
 * 
 * Tests for the TestWorkerMemoryMonitor class and related utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TestWorkerMemoryMonitor,
  getTestWorkerMemoryMonitor,
  initializeTestWorkerMemoryMonitoring,
  cleanupTestWorkerMemoryMonitoring,
  isTestWorkerMemoryWithinLimits,
  forceTestWorkerMemoryCleanup,
  getTestWorkerMemoryReport,
  type TestWorkerMemoryConfig,
  type TestWorkerMemoryUsage,
  type TestWorkerMemoryEvent
} from '../../../src/shared/test-worker-memory-monitor.js';

describe('TestWorkerMemoryMonitor', () => {
  let monitor: TestWorkerMemoryMonitor;
  let mockMemoryUsage: NodeJS.MemoryUsage;
  let originalProcessMemoryUsage: typeof process.memoryUsage;
  let originalGlobalGc: typeof global.gc;

  beforeEach(() => {
    // Mock process.memoryUsage
    mockMemoryUsage = {
      heapUsed: 100 * 1024 * 1024, // 100MB
      heapTotal: 150 * 1024 * 1024, // 150MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 200 * 1024 * 1024, // 200MB
      arrayBuffers: 5 * 1024 * 1024 // 5MB
    };

    originalProcessMemoryUsage = process.memoryUsage;
    process.memoryUsage = vi.fn(() => mockMemoryUsage);

    // Mock global.gc
    originalGlobalGc = global.gc;
    global.gc = vi.fn();

    // Create monitor with test configuration
    const config: Partial<TestWorkerMemoryConfig> = {
      maxMemoryBytes: 512 * 1024 * 1024, // 512MB
      warningThreshold: 0.7, // 70%
      criticalThreshold: 0.85, // 85%
      monitoringInterval: 1000, // 1 second for faster tests
      enableAutoCleanup: true,
      enableDetailedLogging: false
    };

    monitor = new TestWorkerMemoryMonitor(config);
  });

  afterEach(() => {
    // Restore original functions
    process.memoryUsage = originalProcessMemoryUsage;
    if (originalGlobalGc) {
      global.gc = originalGlobalGc;
    } else {
      delete global.gc;
    }

    // Stop monitoring
    monitor.stopMonitoring();
  });

  describe('constructor', () => {
    it('should create monitor with default configuration', () => {
      const defaultMonitor = new TestWorkerMemoryMonitor();
      expect(defaultMonitor).toBeDefined();
    });

    it('should create monitor with custom configuration', () => {
      const config: Partial<TestWorkerMemoryConfig> = {
        maxMemoryBytes: 256 * 1024 * 1024,
        warningThreshold: 0.6,
        criticalThreshold: 0.8
      };

      const customMonitor = new TestWorkerMemoryMonitor(config);
      expect(customMonitor).toBeDefined();
    });
  });

  describe('memory usage measurement', () => {
    it('should get current memory usage', () => {
      const usage = monitor.getCurrentMemoryUsage();

      expect(usage).toBeDefined();
      expect(usage.heapUsed).toBe(mockMemoryUsage.heapUsed);
      expect(usage.heapTotal).toBe(mockMemoryUsage.heapTotal);
      expect(usage.rss).toBe(mockMemoryUsage.rss);
      expect(usage.external).toBe(mockMemoryUsage.external);
      expect(usage.timestamp).toBeTypeOf('number');
      expect(usage.formattedHeapUsed).toContain('MB');
      expect(usage.formattedHeapTotal).toContain('MB');
      expect(usage.usagePercentage).toBeTypeOf('number');
    });

    it('should calculate usage percentage correctly', () => {
      const usage = monitor.getCurrentMemoryUsage();
      const expectedPercentage = (mockMemoryUsage.heapUsed / (512 * 1024 * 1024)) * 100;
      
      expect(usage.usagePercentage).toBeCloseTo(expectedPercentage, 1);
    });

    it('should detect warning threshold', () => {
      // Set memory usage to 80% of limit (above 70% warning threshold)
      mockMemoryUsage.heapUsed = 410 * 1024 * 1024; // 410MB of 512MB = 80%
      
      const usage = monitor.getCurrentMemoryUsage();
      
      expect(usage.isWarning).toBe(true);
      expect(usage.isCritical).toBe(false);
      expect(usage.isOverLimit).toBe(false);
    });

    it('should detect critical threshold', () => {
      // Set memory usage to 90% of limit (above 85% critical threshold)
      mockMemoryUsage.heapUsed = 460 * 1024 * 1024; // 460MB of 512MB = 90%
      
      const usage = monitor.getCurrentMemoryUsage();
      
      expect(usage.isWarning).toBe(true);
      expect(usage.isCritical).toBe(true);
      expect(usage.isOverLimit).toBe(false);
    });

    it('should detect over limit', () => {
      // Set memory usage above limit
      mockMemoryUsage.heapUsed = 600 * 1024 * 1024; // 600MB > 512MB limit
      
      const usage = monitor.getCurrentMemoryUsage();
      
      expect(usage.isWarning).toBe(true);
      expect(usage.isCritical).toBe(true);
      expect(usage.isOverLimit).toBe(true);
    });
  });

  describe('memory monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(monitor['isMonitoring']).toBe(false);
      
      monitor.startMonitoring();
      expect(monitor['isMonitoring']).toBe(true);
      
      monitor.stopMonitoring();
      expect(monitor['isMonitoring']).toBe(false);
    });

    it('should not start monitoring twice', () => {
      monitor.startMonitoring();
      const firstInterval = monitor['monitoringInterval'];
      
      monitor.startMonitoring(); // Should not create new interval
      const secondInterval = monitor['monitoringInterval'];
      
      expect(firstInterval).toBe(secondInterval);
      
      monitor.stopMonitoring();
    });

    it('should collect memory history', () => {
      const usage1 = monitor.getCurrentMemoryUsage();
      
      // Change memory usage
      mockMemoryUsage.heapUsed = 200 * 1024 * 1024;
      const usage2 = monitor.getCurrentMemoryUsage();
      
      const history = monitor.getMemoryHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].heapUsed).toBe(usage1.heapUsed);
      expect(history[1].heapUsed).toBe(usage2.heapUsed);
    });

    it('should limit memory history size', () => {
      // Generate more than 100 memory measurements
      for (let i = 0; i < 150; i++) {
        mockMemoryUsage.heapUsed = (100 + i) * 1024 * 1024;
        monitor.getCurrentMemoryUsage();
      }
      
      const history = monitor.getMemoryHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('event handling', () => {
    it('should register and call event handlers', async () => {
      const eventHandler = vi.fn();
      monitor.onMemoryEvent(eventHandler);
      
      // Trigger warning threshold
      mockMemoryUsage.heapUsed = 410 * 1024 * 1024; // 80% of limit
      monitor.getCurrentMemoryUsage();
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(eventHandler).toHaveBeenCalled();
      const event = eventHandler.mock.calls[0][0] as TestWorkerMemoryEvent;
      expect(event.type).toBe('warning');
    });

    it('should handle multiple event handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      monitor.onMemoryEvent(handler1);
      monitor.onMemoryEvent(handler2);
      
      // Trigger critical threshold
      mockMemoryUsage.heapUsed = 460 * 1024 * 1024; // 90% of limit
      monitor.getCurrentMemoryUsage();
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle event handler errors gracefully', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();
      
      monitor.onMemoryEvent(errorHandler);
      monitor.onMemoryEvent(goodHandler);
      
      // Trigger warning threshold
      mockMemoryUsage.heapUsed = 410 * 1024 * 1024;
      monitor.getCurrentMemoryUsage();
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
    });
  });

  describe('cleanup functionality', () => {
    it('should register and execute cleanup callbacks', async () => {
      const cleanupCallback = vi.fn();
      monitor.registerCleanupCallback(cleanupCallback);
      
      await monitor.forceCleanup();
      
      expect(cleanupCallback).toHaveBeenCalled();
    });

    it('should force garbage collection during cleanup', async () => {
      await monitor.forceCleanup();
      
      expect(global.gc).toHaveBeenCalled();
    });

    it('should handle cleanup callback errors', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Cleanup error');
      });
      const goodCallback = vi.fn();
      
      monitor.registerCleanupCallback(errorCallback);
      monitor.registerCleanupCallback(goodCallback);
      
      await monitor.forceCleanup();
      
      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('test context management', () => {
    it('should set and clear current test', () => {
      monitor.setCurrentTest('test-1');
      // Test name is stored internally, we can verify through memory usage
      const usage = monitor.getCurrentMemoryUsage();
      expect(usage).toBeDefined();
      
      monitor.clearCurrentTest();
      // Test cleared, should still work
      const usage2 = monitor.getCurrentMemoryUsage();
      expect(usage2).toBeDefined();
    });
  });

  describe('memory limits checking', () => {
    it('should return true when memory is within limits', () => {
      mockMemoryUsage.heapUsed = 100 * 1024 * 1024; // 100MB < 512MB limit
      
      expect(monitor.isMemoryWithinLimits()).toBe(true);
    });

    it('should return false when memory exceeds limits', () => {
      mockMemoryUsage.heapUsed = 600 * 1024 * 1024; // 600MB > 512MB limit
      
      expect(monitor.isMemoryWithinLimits()).toBe(false);
    });
  });

  describe('memory reporting', () => {
    it('should generate memory report', () => {
      monitor.setCurrentTest('test-report');
      const report = monitor.getMemoryReport();
      
      expect(report).toContain('Test Worker Memory Report');
      expect(report).toContain('Current Usage:');
      expect(report).toContain('Status:');
      expect(report).toContain('Current Test: test-report');
    });

    it('should include memory history in report', () => {
      // Generate some history
      monitor.getCurrentMemoryUsage();
      mockMemoryUsage.heapUsed = 200 * 1024 * 1024;
      monitor.getCurrentMemoryUsage();
      
      const report = monitor.getMemoryReport();
      
      expect(report).toContain('Growth:');
      expect(report).toContain('Peak:');
      expect(report).toContain('Average:');
    });
  });
});

describe('Global utility functions', () => {
  beforeEach(() => {
    // Clean up any existing global monitor
    cleanupTestWorkerMemoryMonitoring();
  });

  afterEach(() => {
    cleanupTestWorkerMemoryMonitoring();
  });

  describe('getTestWorkerMemoryMonitor', () => {
    it('should create and return global monitor instance', () => {
      const monitor1 = getTestWorkerMemoryMonitor();
      const monitor2 = getTestWorkerMemoryMonitor();
      
      expect(monitor1).toBe(monitor2); // Should be same instance
    });

    it('should accept configuration for new instance', () => {
      const config = { maxMemoryBytes: 256 * 1024 * 1024 };
      const monitor = getTestWorkerMemoryMonitor(config);
      
      expect(monitor).toBeDefined();
    });
  });

  describe('initializeTestWorkerMemoryMonitoring', () => {
    it('should initialize and start monitoring', () => {
      const monitor = initializeTestWorkerMemoryMonitoring();
      
      expect(monitor).toBeDefined();
      expect(monitor['isMonitoring']).toBe(true);
    });
  });

  describe('cleanupTestWorkerMemoryMonitoring', () => {
    it('should cleanup global monitor', () => {
      const monitor = initializeTestWorkerMemoryMonitoring();
      expect(monitor['isMonitoring']).toBe(true);
      
      cleanupTestWorkerMemoryMonitoring();
      
      expect(monitor['isMonitoring']).toBe(false);
    });
  });

  describe('utility functions', () => {
    beforeEach(() => {
      // Initialize monitoring for utility tests
      initializeTestWorkerMemoryMonitoring();
    });

    it('should check if memory is within limits', () => {
      const result = isTestWorkerMemoryWithinLimits();
      expect(typeof result).toBe('boolean');
    });

    it('should force memory cleanup', async () => {
      await expect(forceTestWorkerMemoryCleanup()).resolves.toBeUndefined();
    });

    it('should get memory report', () => {
      const report = getTestWorkerMemoryReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('Memory Report');
    });
  });

  describe('utility functions without initialization', () => {
    it('should handle isTestWorkerMemoryWithinLimits without monitor', () => {
      const result = isTestWorkerMemoryWithinLimits();
      expect(result).toBe(true); // Should default to true
    });

    it('should handle forceTestWorkerMemoryCleanup without monitor', async () => {
      await expect(forceTestWorkerMemoryCleanup()).resolves.toBeUndefined();
    });

    it('should handle getTestWorkerMemoryReport without monitor', () => {
      const report = getTestWorkerMemoryReport();
      expect(report).toContain('not initialized');
    });
  });
});