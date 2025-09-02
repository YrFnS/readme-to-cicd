# Backup Mock Factory Guide

## Overview

The Backup Mock Factory provides consistent, configurable mock responses for backup operations in the README-to-CICD system. It ensures reliable test behavior by standardizing success and failure response patterns across all backup-related tests.

## Features

- **Consistent Response Patterns**: Standardized success and failure responses
- **Configurable Behavior**: Customizable success rates, durations, and error scenarios
- **Multiple Operation Types**: Support for 8 different backup operation types
- **Result Pattern Integration**: Seamless integration with the system's Result pattern
- **Performance Optimized**: Efficient generation of mock responses
- **Memory Safe**: Proper state management and cleanup

## Installation

The backup mock factory is located in the test utilities:

```typescript
import { 
  BackupMockFactory, 
  BackupMocks, 
  defaultBackupMockFactory 
} from '../tests/utils/backup-mock-factory';
```

## Quick Start

### Basic Usage with Convenience Functions

```typescript
import { BackupMocks } from '../tests/utils/backup-mock-factory';
import { isSuccess, isFailure } from '../src/shared/types/result';

// Create successful backup responses
const configBackup = BackupMocks.successfulConfigBackup();
const dataBackup = BackupMocks.successfulDataBackup();
const fullBackup = BackupMocks.successfulFullBackup();

// Create failed backup responses
const failedConfig = BackupMocks.failedConfigBackup();
const failedRestore = BackupMocks.failedRestore();

// Handle responses using Result pattern
if (isSuccess(configBackup)) {
  console.log(`Backup completed: ${configBackup.data.backup.id}`);
}

if (isFailure(failedConfig)) {
  console.log(`Backup failed: ${failedConfig.error.message}`);
}
```

### Custom Factory Configuration

```typescript
import { BackupMockFactory } from '../tests/utils/backup-mock-factory';

const factory = new BackupMockFactory({
  successRate: 0.8,                    // 80% success rate
  durationRange: { min: 500, max: 2000 }, // 500-2000ms duration
  includeWarnings: true,               // Include warnings in responses
  errorScenarios: {                    // Custom error scenarios
    'data': {
      code: 'CUSTOM_DB_ERROR',
      message: 'Database connection failed',
      operation: 'data',
      suggestions: ['Check database connectivity']
    }
  }
});

// Generate responses with custom configuration
const result = factory.createBackupResponse('data');
```

## Supported Operation Types

The factory supports the following backup operation types:

| Type | Description | Typical Size | Use Case |
|------|-------------|--------------|----------|
| `configuration` | Configuration file backups | ~50KB | App settings, environment configs |
| `data` | Database/data backups | ~10MB | User data, application data |
| `system-state` | System state snapshots | ~5MB | Service states, runtime info |
| `incremental` | Incremental backups | ~2MB | Changed files since last backup |
| `full` | Complete system backups | ~50MB | Full system snapshots |
| `restore` | Restore operations | N/A | Restoring from backups |
| `verify` | Backup verification | N/A | Integrity checks |
| `cleanup` | Cleanup operations | N/A | Removing old backups |

## API Reference

### BackupMockFactory Class

#### Constructor

```typescript
constructor(config?: Partial<BackupMockConfig>)
```

Creates a new backup mock factory with optional configuration.

#### Methods

##### createBackupResponse()

```typescript
createBackupResponse(
  type: BackupOperationType,
  options?: {
    forceSuccess?: boolean;
    forceFailure?: boolean;
    customMetadata?: Record<string, any>;
  }
): Result<BackupResult, BackupError>
```

Generates a mock backup operation response.

**Parameters:**
- `type`: The type of backup operation
- `options.forceSuccess`: Force a successful response (overrides success rate)
- `options.forceFailure`: Force a failed response (overrides success rate)
- `options.customMetadata`: Additional metadata to include in the response

**Returns:** A Result containing either a BackupResult (success) or BackupError (failure)

##### updateConfig()

```typescript
updateConfig(newConfig: Partial<BackupMockConfig>): void
```

Updates the factory configuration.

##### reset()

```typescript
reset(): void
```

Resets the factory state and configuration to defaults.

##### getConfig()

```typescript
getConfig(): BackupMockConfig
```

Returns the current factory configuration.

### Configuration Options

```typescript
interface BackupMockConfig {
  successRate: number;                    // Success rate (0-1)
  durationRange: { min: number; max: number }; // Duration range in ms
  includeWarnings: boolean;               // Include warnings in responses
  errorScenarios?: Partial<Record<BackupOperationType, BackupError>>; // Custom errors
}
```

### Response Types

#### BackupResult (Success Response)

```typescript
interface BackupResult {
  backup: BackupMetadata;     // Operation metadata
  message: string;            // Success message
  duration: number;           // Operation duration in ms
  warnings?: string[];        // Optional warnings
}
```

#### BackupError (Failure Response)

```typescript
interface BackupError {
  code: string;               // Error code
  message: string;            // Error message
  operation: BackupOperationType; // Failed operation type
  context?: Record<string, any>;  // Error context
  suggestions?: string[];     // Recovery suggestions
}
```

#### BackupMetadata

```typescript
interface BackupMetadata {
  id: string;                 // Unique operation ID
  type: BackupOperationType;  // Operation type
  status: BackupStatus;       // Current status
  startTime: Date;            // Start timestamp
  endTime?: Date;             // End timestamp
  size?: number;              // Backup size in bytes
  location?: string;          // Storage location
  checksum?: string;          // Verification checksum
  metadata?: Record<string, any>; // Additional metadata
}
```

## Usage Patterns

### Test Suite Integration

```typescript
describe('Backup Service Tests', () => {
  let backupService: BackupService;
  let mockFactory: BackupMockFactory;

  beforeEach(() => {
    mockFactory = new BackupMockFactory({ successRate: 1.0 }); // Always succeed
    backupService = new BackupService(mockFactory);
  });

  it('should handle successful configuration backup', async () => {
    const result = await backupService.backupConfiguration();
    
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.backup.type).toBe('configuration');
      expect(result.data.backup.status).toBe('completed');
    }
  });

  it('should handle backup failures gracefully', async () => {
    mockFactory.updateConfig({ successRate: 0 }); // Always fail
    
    const result = await backupService.backupData();
    
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.operation).toBe('data');
      expect(result.error.suggestions).toBeDefined();
    }
  });
});
```

### Custom Metadata Testing

```typescript
it('should include custom metadata in backup responses', () => {
  const customMetadata = {
    environment: 'test',
    requestId: 'req-12345',
    priority: 'high'
  };

  const result = BackupMocks.successfulConfigBackup(customMetadata);
  
  if (isSuccess(result)) {
    expect(result.data.backup.metadata).toMatchObject(customMetadata);
  }
});
```

### Error Scenario Testing

```typescript
it('should simulate specific error conditions', () => {
  const factory = new BackupMockFactory({
    errorScenarios: {
      'data': {
        code: 'DB_CONNECTION_TIMEOUT',
        message: 'Database connection timed out after 30 seconds',
        operation: 'data',
        suggestions: [
          'Check database server status',
          'Increase connection timeout',
          'Retry during off-peak hours'
        ]
      }
    }
  });

  const result = factory.createBackupResponse('data', { forceFailure: true });
  
  if (isFailure(result)) {
    expect(result.error.code).toBe('DB_CONNECTION_TIMEOUT');
    expect(result.error.suggestions).toHaveLength(3);
  }
});
```

### Performance Testing

```typescript
it('should handle high-volume mock generation', () => {
  const factory = new BackupMockFactory();
  const results: any[] = [];

  // Generate 1000 mock responses
  for (let i = 0; i < 1000; i++) {
    const result = factory.createBackupResponse('configuration');
    results.push(result);
  }

  expect(results).toHaveLength(1000);
  
  // Verify all responses are valid
  results.forEach(result => {
    expect(result).toHaveProperty('success');
  });
});
```

## Best Practices

### 1. Use Convenience Functions for Simple Cases

```typescript
// Good: Simple and readable
const result = BackupMocks.successfulConfigBackup();

// Avoid: Unnecessary complexity for simple cases
const factory = new BackupMockFactory();
const result = factory.createBackupResponse('configuration', { forceSuccess: true });
```

### 2. Configure Factory for Test Suites

```typescript
// Good: Configure once per test suite
describe('Backup Tests', () => {
  let factory: BackupMockFactory;

  beforeEach(() => {
    factory = new BackupMockFactory({
      successRate: 0.9,
      includeWarnings: true
    });
  });

  // Use factory in tests...
});
```

### 3. Test Both Success and Failure Scenarios

```typescript
// Good: Test both paths
it('should handle backup success', () => {
  const result = BackupMocks.successfulDataBackup();
  // Test success path
});

it('should handle backup failure', () => {
  const result = BackupMocks.failedDataBackup();
  // Test failure path
});
```

### 4. Use Custom Metadata for Context

```typescript
// Good: Include test context
const result = BackupMocks.successfulConfigBackup({
  testCase: 'large-config-files',
  environment: 'test'
});
```

### 5. Reset Factory State Between Tests

```typescript
afterEach(() => {
  factory.reset(); // Prevent state leakage between tests
});
```

## Integration with Result Pattern

The backup mock factory is designed to work seamlessly with the system's Result pattern:

```typescript
import { isSuccess, isFailure } from '../src/shared/types/result';

const result = BackupMocks.successfulConfigBackup();

// Type-safe result handling
if (isSuccess(result)) {
  // TypeScript knows this is BackupResult
  console.log(result.data.backup.id);
  console.log(result.data.message);
  console.log(result.data.duration);
}

if (isFailure(result)) {
  // TypeScript knows this is BackupError
  console.log(result.error.code);
  console.log(result.error.message);
  console.log(result.error.suggestions);
}
```

## Troubleshooting

### Common Issues

1. **Inconsistent Test Results**: Ensure you're using `forceSuccess` or `forceFailure` for deterministic tests
2. **Memory Leaks**: Call `factory.reset()` in test cleanup to prevent state accumulation
3. **Type Errors**: Import the correct types from the factory module
4. **Performance Issues**: Use the default factory for simple cases instead of creating new instances

### Debugging

Enable verbose logging to debug mock responses:

```typescript
const result = factory.createBackupResponse('data', { forceSuccess: true });
console.log('Mock response:', JSON.stringify(result, null, 2));
```

## Contributing

When extending the backup mock factory:

1. Add new operation types to the `BackupOperationType` union
2. Update the metadata generation methods for new types
3. Add appropriate error messages and suggestions
4. Include tests for new functionality
5. Update this documentation

## Related Documentation

- [Result Pattern Guide](./result-pattern-guide.md)
- [Testing Standards](./testing-standards.md)
- [Error Handling Guide](./error-handling-guide.md)
- [Production Readiness Requirements](../specs/production-readiness/requirements.md)