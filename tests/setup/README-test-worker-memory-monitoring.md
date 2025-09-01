# Test Worker Memory Monitoring

This document describes the test worker memory monitoring system implemented for the README-to-CICD project.

## Overview

The test worker memory monitoring system provides comprehensive memory tracking and management for test execution environments. It helps prevent memory exhaustion during test runs and provides detailed memory usage analytics.

## Components

### 1. TestWorkerMemoryMonitor

The core monitoring component that tracks memory usage in test worker processes.

**Features:**
- Real-time memory usage tracking
- Configurable memory thresholds (warning, critical, over-limit)
- Automatic cleanup triggers
- Memory usage history
- Event-based notifications
- Memory usage reporting

**Configuration:**
```typescript
const config = {
  maxMemoryBytes: 512 * 1024 * 1024, // 512MB limit
  warningThreshold: 0.7,              // 70% warning
  criticalThreshold: 0.85,            // 85% critical
  monitoringInterval: 5000,           // 5 second intervals
  enableAutoCleanup: true,            // Auto cleanup on thresholds
  enableDetailedLogging: false        // Detailed logging
};
```

### 2. TestMemoryTracker

Provides detailed memory tracking for individual tests and test suites.

**Features:**
- Per-test memory snapshots
- Test suite memory reporting
- Memory leak detection
- Memory growth analysis
- Comprehensive reporting

### 3. Test Setup Integration

Automatic integration with Vitest test environment through setup files.

**Setup Files:**
- `tests/setup/test-worker-memory-setup.ts` - Main integration
- `vitest.config.ts` - Configuration integration

## Usage

### Automatic Integration

The memory monitoring is automatically enabled for all tests through the Vitest setup configuration:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: [
      // ... other setup files
      './tests/setup/test-worker-memory-setup.ts'
    ]
  }
});
```

### Manual Usage in Tests

```typescript
import {
  getCurrentTestMemoryUsage,
  forceTestMemoryCleanup,
  getTestMemoryReport,
  isMemoryWithinLimits,
  monitorMemoryDuringOperation
} from '../../tests/setup/test-worker-memory-setup.js';

// Check current memory usage
const usage = getCurrentTestMemoryUsage();
console.log(`Memory usage: ${usage.formattedHeapUsed}`);

// Force cleanup if needed
if (!isMemoryWithinLimits()) {
  await forceTestMemoryCleanup();
}

// Monitor memory during specific operations
const result = await monitorMemoryDuringOperation('large-operation', async () => {
  // Your memory-intensive operation here
  const data = new Array(10000).fill('test-data');
  return data.length;
});
```

### Environment Variables

Configure memory monitoring through environment variables:

```bash
# Maximum memory limit in MB (default: 512)
TEST_WORKER_MAX_MEMORY=1024

# Warning threshold as percentage (default: 0.7)
TEST_WORKER_WARNING_THRESHOLD=0.8

# Critical threshold as percentage (default: 0.85)
TEST_WORKER_CRITICAL_THRESHOLD=0.9

# Monitoring interval in milliseconds (default: 5000)
TEST_WORKER_MONITORING_INTERVAL=3000

# Enable/disable auto cleanup (default: true)
TEST_WORKER_AUTO_CLEANUP=false

# Enable detailed logging (default: false)
TEST_WORKER_DETAILED_LOGGING=true
```

## Memory Events

The system emits various memory events:

### Event Types

- **normal**: Memory usage is within normal limits
- **warning**: Memory usage exceeds warning threshold
- **critical**: Memory usage exceeds critical threshold
- **overlimit**: Memory usage exceeds maximum limit
- **cleanup**: Memory cleanup was performed

### Event Handling

```typescript
import { getTestWorkerMemoryMonitor } from '../src/shared/test-worker-memory-monitor.js';

const monitor = getTestWorkerMemoryMonitor();

monitor.onMemoryEvent(async (event) => {
  switch (event.type) {
    case 'warning':
      console.warn(`Memory warning: ${event.message}`);
      break;
    case 'critical':
      console.error(`Critical memory usage: ${event.message}`);
      break;
    case 'overlimit':
      console.error(`Memory over limit: ${event.message}`);
      // Consider failing the test
      break;
  }
});
```

## Memory Leak Detection

The system includes automatic memory leak detection:

```typescript
import { getTestMemoryTracker } from '../src/shared/test-memory-tracking.js';

const tracker = getTestMemoryTracker();
const leakDetection = tracker.detectMemoryLeaks();

if (leakDetection.leakDetected) {
  console.warn(`Memory leak detected with ${leakDetection.confidence * 100}% confidence`);
  console.warn(`Suspicious tests:`, leakDetection.suspiciousTests);
  console.warn(`Recommendations:`, leakDetection.recommendations);
}
```

## Reporting

### Memory Usage Report

```typescript
import { getTestMemoryReport } from '../../tests/setup/test-worker-memory-setup.js';

const report = getTestMemoryReport();
console.log(report);
```

### Comprehensive Memory Report

```typescript
import { generateTestMemoryReport } from '../src/shared/test-memory-tracking.js';

const comprehensiveReport = generateTestMemoryReport();
console.log(comprehensiveReport);
```

## Best Practices

### 1. Memory-Intensive Tests

For tests that use significant memory:

```typescript
it('should handle large data processing', async () => {
  // Monitor memory during the test
  const result = await monitorMemoryDuringOperation('large-data-test', async () => {
    const largeData = new Array(100000).fill('data');
    
    // Process the data
    const processed = largeData.map(item => item.toUpperCase());
    
    // Clean up
    largeData.length = 0;
    
    return processed.length;
  });
  
  expect(result).toBe(100000);
});
```

### 2. Manual Cleanup

For tests that create large objects:

```typescript
it('should cleanup after large object creation', async () => {
  const largeObject = createLargeTestObject();
  
  try {
    // Test logic here
    expect(largeObject).toBeDefined();
  } finally {
    // Manual cleanup
    largeObject.cleanup();
    await forceTestMemoryCleanup();
  }
});
```

### 3. Memory Assertions

Add memory usage assertions to critical tests:

```typescript
it('should not exceed memory limits', async () => {
  const initialUsage = getCurrentTestMemoryUsage();
  
  // Test logic that might use memory
  performMemoryIntensiveOperation();
  
  const finalUsage = getCurrentTestMemoryUsage();
  const memoryGrowth = finalUsage.heapUsed - initialUsage.heapUsed;
  
  // Assert memory growth is reasonable
  expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
  expect(isMemoryWithinLimits()).toBe(true);
});
```

## Troubleshooting

### High Memory Usage

If tests are failing due to high memory usage:

1. **Check Memory Reports**: Use `getTestMemoryReport()` to identify memory usage patterns
2. **Enable Detailed Logging**: Set `TEST_WORKER_DETAILED_LOGGING=true`
3. **Reduce Memory Limits**: Lower `TEST_WORKER_MAX_MEMORY` to catch issues earlier
4. **Force Cleanup**: Add manual cleanup calls in test teardown
5. **Use Memory Monitoring**: Wrap memory-intensive operations with `monitorMemoryDuringOperation()`

### Memory Leaks

If memory leaks are detected:

1. **Review Suspicious Tests**: Check tests identified by leak detection
2. **Add Cleanup**: Ensure proper cleanup in test teardown
3. **Use Smaller Fixtures**: Replace large test data with smaller alternatives
4. **Enable Garbage Collection**: Run tests with `--expose-gc` flag

### Performance Issues

If memory monitoring affects test performance:

1. **Increase Monitoring Interval**: Set higher `TEST_WORKER_MONITORING_INTERVAL`
2. **Disable Detailed Logging**: Set `TEST_WORKER_DETAILED_LOGGING=false`
3. **Reduce History Size**: Memory history is automatically limited to prevent leaks

## Implementation Details

### Files

- `src/shared/test-worker-memory-monitor.ts` - Core monitoring functionality
- `src/shared/test-memory-tracking.ts` - Memory tracking and analysis
- `tests/setup/test-worker-memory-setup.ts` - Test environment integration
- `tests/unit/shared/test-worker-memory-*.test.ts` - Unit tests
- `tests/integration/test-worker-memory-integration.test.ts` - Integration tests

### Architecture

The system uses a singleton pattern for global memory monitoring with the following flow:

1. **Initialization**: Memory monitor is created during test setup
2. **Monitoring**: Periodic memory measurements are taken
3. **Event Processing**: Memory events are emitted based on thresholds
4. **Cleanup**: Automatic cleanup is triggered when thresholds are exceeded
5. **Reporting**: Memory usage data is collected and reported

### Memory Thresholds

- **Warning (70%)**: Log warning message, optional cleanup
- **Critical (85%)**: Log error message, force cleanup
- **Over Limit (100%)**: Log error message, aggressive cleanup, consider test failure

The system is designed to be non-intrusive while providing comprehensive memory management for test environments.