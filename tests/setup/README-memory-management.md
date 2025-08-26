# Memory Management System

This directory contains a comprehensive memory management system for the test suite to prevent memory crashes and optimize test execution.

## Components

### 1. TestMemoryManager (`memory-management.ts`)
- **Purpose**: Monitor memory usage and trigger cleanup when thresholds are exceeded
- **Features**:
  - Real-time memory monitoring
  - Configurable memory thresholds (warning, critical, cleanup)
  - Automatic garbage collection triggers
  - Memory usage reporting and history
  - Singleton pattern for consistent usage across tests

### 2. TestResourceCleaner (`memory-management.ts`)
- **Purpose**: Comprehensive cleanup of test resources to free memory
- **Features**:
  - Clear test caches and global state
  - Clear Node.js module cache for test files
  - Force garbage collection with proper timing
  - Cleanup verification to ensure effectiveness
  - Configurable cleanup strategies

### 3. Memory Setup (`memory-setup.ts`)
- **Purpose**: Global memory monitoring hooks for all tests
- **Features**:
  - Automatic setup/teardown for every test
  - Memory usage tracking and reporting
  - Automatic cleanup triggers when thresholds exceeded
  - Process event handlers for memory-related issues
  - Configurable monitoring behavior

### 4. Error Handling (`memory-errors.ts`)
- **Purpose**: Custom error classes and recovery strategies for memory failures
- **Features**:
  - Specialized error types for different memory issues
  - Automatic recovery strategies for common problems
  - Graceful degradation when memory limits approached
  - Detailed error reporting and recovery suggestions

## Configuration

The memory management system is configured in `vitest.config.ts`:

```typescript
{
  setupFiles: [
    './tests/setup/vitest-setup.ts',
    './tests/setup/memory-setup.ts'  // Memory monitoring
  ],
  pool: 'threads',
  poolOptions: {
    threads: {
      maxThreads: 2,  // Reduced for memory management
      minThreads: 1
    }
  },
  testTimeout: 30000,  // Increased for memory-intensive operations
  env: {
    NODE_OPTIONS: '--max-old-space-size=2048 --expose-gc'
  }
}
```

## Usage

### Automatic Usage
The memory management system works automatically when tests run:
- Memory is monitored before/after each test
- Cleanup is triggered when thresholds are exceeded
- Garbage collection runs automatically
- Memory reports are generated

### Manual Usage in Tests
```typescript
import { 
  checkAndCleanupMemory, 
  getCurrentMemoryUsage,
  triggerMemoryCleanup 
} from '../setup/memory-setup';

// Check memory and cleanup if needed
const report = checkAndCleanupMemory();

// Get current memory usage
const usage = getCurrentMemoryUsage();

// Manually trigger cleanup
await triggerMemoryCleanup();
```

### Environment Variables
- `MEMORY_DEBUG=true` - Enable detailed memory logging
- `NODE_OPTIONS="--expose-gc"` - Enable garbage collection
- `CI=true` - Disable memory reporting in CI environments

## Memory Thresholds

Default thresholds (configurable):
- **Cleanup**: 300MB - Trigger routine cleanup
- **Warning**: 400MB - Log warning about high usage
- **Critical**: 600MB - Trigger aggressive cleanup and error handling

## Running Tests with Memory Management

```bash
# Run with garbage collection enabled (recommended)
npm test -- --expose-gc

# Run with memory debugging
MEMORY_DEBUG=true npm test

# Run with increased memory limit
NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" npm test
```

## Troubleshooting

### High Memory Usage
1. Check if `--expose-gc` flag is enabled
2. Reduce test concurrency in `vitest.config.ts`
3. Enable memory debugging to identify problematic tests
4. Review test cleanup procedures

### Memory Crashes
1. Increase Node.js memory limit: `--max-old-space-size=4096`
2. Enable memory monitoring: `MEMORY_DEBUG=true`
3. Check for memory leaks in test fixtures
4. Ensure proper async/await usage in tests

### Slow Tests
1. Memory cleanup can slow down tests temporarily
2. Adjust memory thresholds if cleanup is too aggressive
3. Use `isolate: false` in vitest config for faster execution (with caution)

## Implementation Details

The system uses:
- **Singleton Pattern**: Consistent memory manager across all tests
- **Event-Driven Cleanup**: Automatic triggers based on memory usage
- **Graceful Degradation**: Reduce functionality when memory is low
- **Error Recovery**: Automatic recovery from memory-related failures
- **Comprehensive Logging**: Detailed memory usage tracking and reporting

This system should significantly reduce memory-related test failures and provide better visibility into memory usage patterns during test execution.