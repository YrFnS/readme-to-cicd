/**
 * Basic Test Worker Memory Monitor Tests
 * 
 * Simple tests to verify the basic functionality of test worker memory monitoring.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TestWorkerMemoryMonitor,
  type TestWorkerMemoryConfig
} from '../../../src/shared/test-worker-memory-monitor.js';

describe('TestWorkerMemoryMonitor - Basic Tests', () => {
  let monitor: TestWorkerMemoryMonitor;
  let originalProcessMemoryUsage: typeof process.memoryUsage;

  beforeEach(() => {
    // Mock process.memoryUsage with simple values
    originalProcessMemoryUsage = process.memoryUsage;
    process.memoryUsage = vi.fn(() => ({
      heapUsed: 100 * 1024 * 1024, // 100MB
      heapTotal: 150 * 1024 * 1024, // 150MB
      external: 10 * 1024 * 1024, // 10MB
      rss: 200 * 1024 * 1024, // 200MB
      arrayBuffers: 5 * 1024 * 1024 // 5MB
    }));

    // Create monitor with simple configuration
    const config: Partial<TestWorkerMemoryConfig> = {
      maxMemoryBytes: 512 * 1024 * 1024, // 512MB
      warningThreshold: 0.7,
      criticalThreshold: 0.85,
      monitoringInterval: 1000,
      enableAutoCleanup: false, // Disable for simpler tests
      enableDetailedLogging: false
    };

    monitor = new TestWorkerMemoryMonitor(config);
  });

  afterEach(() => {
    // Restore original function
    process.memoryUsage = originalProcessMemoryUsage;
    
    // Stop monitoring
    monitor.stopMonitoring();
  });

  it('should create monitor instance', () => {
    expect(monitor).toBeDefined();
    expect(monitor).toBeInstanceOf(TestWorkerMemoryMonitor);
  });

  it('should get current memory usage', () => {
    const usage = monitor.getCurrentMemoryUsage();
    
    expect(usage).toBeDefined();
    expect(usage.heapUsed).toBe(100 * 1024 * 1024);
    expect(usage.heapTotal).toBe(150 * 1024 * 1024);
    expect(usage.rss).toBe(200 * 1024 * 1024);
    expect(usage.external).toBe(10 * 1024 * 1024);
    expect(usage.formattedHeapUsed).toContain('MB');
    expect(usage.usagePercentage).toBeCloseTo(19.5, 1); // 100MB / 512MB * 100
    expect(usage.isWarning).toBe(false);
    expect(usage.isCritical).toBe(false);
    expect(usage.isOverLimit).toBe(false);
  });

  it('should start and stop monitoring', () => {
    expect(monitor['isMonitoring']).toBe(false);
    
    monitor.startMonitoring();
    expect(monitor['isMonitoring']).toBe(true);
    
    monitor.stopMonitoring();
    expect(monitor['isMonitoring']).toBe(false);
  });

  it('should check memory limits', () => {
    // Memory is within limits (100MB < 512MB)
    expect(monitor.isMemoryWithinLimits()).toBe(true);
  });

  it('should set and clear current test', () => {
    monitor.setCurrentTest('test-1');
    // Test name is stored internally
    
    monitor.clearCurrentTest();
    // Test cleared
  });

  it('should generate memory report', () => {
    const report = monitor.getMemoryReport();
    
    expect(report).toContain('Test Worker Memory Report');
    expect(report).toContain('Current Usage:');
    expect(report).toContain('100 MB');
    expect(report).toContain('Status:');
  });

  it('should register cleanup callbacks', async () => {
    const cleanupCallback = vi.fn();
    monitor.registerCleanupCallback(cleanupCallback);
    
    await monitor.forceCleanup();
    
    expect(cleanupCallback).toHaveBeenCalled();
  });

  it('should handle memory event handlers', () => {
    const eventHandler = vi.fn();
    monitor.onMemoryEvent(eventHandler);
    
    // Event handlers are registered
    expect(monitor['eventHandlers']).toHaveLength(1);
  });

  it('should collect memory history', () => {
    const usage1 = monitor.getCurrentMemoryUsage();
    const usage2 = monitor.getCurrentMemoryUsage();
    
    const history = monitor.getMemoryHistory();
    
    expect(history).toHaveLength(2);
    expect(history[0].heapUsed).toBe(usage1.heapUsed);
    expect(history[1].heapUsed).toBe(usage2.heapUsed);
  });
});