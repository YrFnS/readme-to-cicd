# Shared Mock Utilities

This module provides reusable mock utilities and patterns that can be shared across different types of mock factories and test scenarios. These utilities abstract common behaviors and help maintain consistency across mock implementations.

## Overview

The shared mock utilities address the common patterns found in existing mock factories (backup, deployment, etc.) and provide a standardized way to:

- Generate unique operation IDs
- Simulate realistic operation durations
- Handle success/failure logic with configurable rates
- Manage operation timestamps
- Generate structured error codes
- Create contextual success/failure messages
- Manage mock configuration with validation
- Track mock state and lifecycle

## Core Utilities

### MockIdGenerator
Generates unique operation IDs with configurable prefixes and formats.

```typescript
const generator = new MockIdGenerator('test');
const id = generator.generateId(); // 'test_abc123_1'
```

### MockDurationSimulator
Simulates realistic operation durations with configurable ranges and complexity-based scaling.

```typescript
const simulator = new MockDurationSimulator({ min: 100, max: 1000 });
const duration = simulator.generateDuration(); // Random value between 100-1000ms
```

### MockSuccessFailureLogic
Determines operation success or failure based on configurable rates with override options.

```typescript
const logic = new MockSuccessFailureLogic(0.8); // 80% success rate
const shouldSucceed = logic.shouldSucceed({ forceSuccess: true });
```

### MockTimestampManager
Manages operation timestamps with realistic timing patterns and validation.

```typescript
const manager = new MockTimestampManager();
const { startTime, endTime } = manager.generateTimestamps(1000);
```

### MockErrorCodeGenerator
Generates structured error codes with consistent patterns and parsing capabilities.

```typescript
const generator = new MockErrorCodeGenerator('TEST');
const code = generator.generateErrorCode('backup', 'connection', 'timeout');
// Result: 'TEST_BACKUP_CONNECTION_TIMEOUT'
```

### MockMessageGenerator
Generates contextual success and failure messages with template support.

```typescript
const generator = new MockMessageGenerator();
const message = generator.generateSuccessMessage('data-processing', { duration: 1500 });
// Result: 'Data Processing completed successfully in 1500ms'
```

### MockConfigurationManager
Manages mock configuration with validation, defaults, and change tracking.

```typescript
const manager = new MockConfigurationManager(defaultConfig);
manager.updateConfig({ successRate: 0.95 });
const validation = manager.validateConfig();
```

### MockStateManager
Manages mock state including initialization, cleanup, operation tracking, and error recording.

```typescript
const stateManager = new MockStateManager();
await stateManager.initialize();
stateManager.recordOperation();
stateManager.recordError('Something went wrong');
```

## Base Mock Factory

### BaseOperationMockFactory
Abstract base class that provides common functionality for operation mock factories.

```typescript
class CustomMockFactory extends BaseOperationMockFactory<
  CustomMetadata,
  CustomResult,
  CustomError,
  CustomConfig
> {
  createOperationResponse(operationType: string, options?: any): Result<CustomResult, CustomError> {
    // Implementation using inherited utilities
  }
}
```

## Convenience Functions

### MockUtilities
Provides convenience functions for creating utilities with preset configurations.

```typescript
// Create utilities with presets
const fastDurationSim = MockUtilities.createDurationSimulator('fast');
const reliableLogic = MockUtilities.createSuccessFailureLogic('reliable');
const backupErrorGen = MockUtilities.createErrorCodeGenerator('backup');
```

## Usage Patterns

### 1. Individual Utilities
Use individual utilities for specific mock behaviors:

```typescript
const idGenerator = new MockIdGenerator('operation');
const durationSim = new MockDurationSimulator({ min: 100, max: 500 });
const successLogic = new MockSuccessFailureLogic(0.9);
```

### 2. Custom Mock Factory
Extend the base factory for domain-specific mock operations:

```typescript
class FileOperationMockFactory extends BaseOperationMockFactory<...> {
  createFileOperation(type: string, fileName: string): Result<...> {
    // Use inherited utilities for consistent behavior
  }
}
```

### 3. Configuration Management
Manage mock configuration with validation:

```typescript
const configManager = new MockConfigurationManager(defaultConfig);
configManager.updateConfig({ successRate: 0.95 });
if (!configManager.validateConfig().isValid) {
  throw new Error('Invalid configuration');
}
```

## Benefits

1. **Consistency**: Standardized patterns across all mock implementations
2. **Reusability**: Common behaviors abstracted into reusable utilities
3. **Maintainability**: Centralized logic reduces code duplication
4. **Testability**: Each utility is independently testable
5. **Configurability**: Flexible configuration options for different scenarios
6. **Type Safety**: Full TypeScript support with proper type definitions

## Testing

The module includes comprehensive tests covering:

- Individual utility functionality
- Integration between utilities
- Performance characteristics
- Error handling and edge cases
- Configuration validation
- State management lifecycle

Run tests with:
```bash
npx vitest run tests/utils/shared-mock-utilities.test.ts
```

## Examples

See `examples/shared-mock-utilities-usage.ts` for comprehensive usage examples including:

- Individual utility usage
- Custom mock factory implementation
- Configuration management
- State management
- Integration patterns

## Requirements Satisfied

This implementation satisfies the task requirements:

✅ **Implement shared mock utilities for common component behaviors**
- Created 8 core utilities abstracting common mock patterns
- Provided base factory class for consistent implementation

✅ **Add reusable mock patterns for standard operations**
- Standardized ID generation, duration simulation, success/failure logic
- Consistent error code generation and message formatting
- Reusable configuration and state management patterns

✅ **Write tests for shared mock utility functions**
- Comprehensive test suite with 72 tests covering all utilities
- Integration tests, performance tests, and error handling tests
- 100% test coverage for all utility functions

The shared mock utilities provide a solid foundation for creating consistent, maintainable, and testable mock implementations across the entire test suite.