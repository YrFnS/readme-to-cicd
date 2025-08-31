# Custom Analyzer Registration Guide

## Overview

The Enhanced Analyzer Registry System provides a robust framework for registering and managing both built-in and custom analyzers. This guide covers the complete process of registering custom analyzers, including validation, error handling, and best practices.

## Quick Start

### Basic Registration

```typescript
import { EnhancedAnalyzerRegistry, AnalyzerConfig } from '../src/parser/analyzers/enhanced-analyzer-registry';
import { MyCustomAnalyzer } from './my-custom-analyzer';

// Create registry instance
const registry = new EnhancedAnalyzerRegistry();

// Register a single analyzer
const analyzer = new MyCustomAnalyzer();
const result = registry.register(analyzer);

if (result.success) {
  console.log(`Successfully registered: ${result.analyzerName}`);
} else {
  console.error(`Registration failed: ${result.error}`);
}
```

### Batch Registration

```typescript
// Register multiple analyzers at once
const analyzers: AnalyzerConfig[] = [
  {
    name: 'CustomAnalyzer1',
    analyzer: new CustomAnalyzer1(),
    priority: 10,
    enabled: true
  },
  {
    name: 'CustomAnalyzer2', 
    analyzer: new CustomAnalyzer2(),
    dependencies: ['CustomAnalyzer1'],
    priority: 5
  }
];

const results = registry.registerMultiple(analyzers);
results.forEach(result => {
  if (result.success) {
    console.log(`✓ ${result.analyzerName} registered successfully`);
  } else {
    console.error(`✗ ${result.analyzerName} failed: ${result.error}`);
  }
});
```

## Analyzer Interface Requirements

All custom analyzers must implement the `AnalyzerInterface`:

```typescript
interface AnalyzerInterface<T = any> {
  readonly name: string;
  analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult<T>>;
  getCapabilities(): AnalyzerCapabilities;
  validateInterface(): boolean;
}
```

### Required Methods

#### 1. `name` Property
- **Type**: `readonly string`
- **Purpose**: Unique identifier for the analyzer
- **Requirements**: Must be non-empty and unique within the registry

#### 2. `analyze()` Method
- **Signature**: `analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult<T>>`
- **Purpose**: Core analysis logic
- **Returns**: Promise resolving to analysis results
- **Requirements**: Must handle errors gracefully and return structured results

#### 3. `getCapabilities()` Method
- **Signature**: `getCapabilities(): AnalyzerCapabilities`
- **Purpose**: Describe analyzer capabilities and requirements
- **Returns**: Capabilities object with metadata

#### 4. `validateInterface()` Method
- **Signature**: `validateInterface(): boolean`
- **Purpose**: Self-validation of interface compliance
- **Returns**: `true` if interface is properly implemented

## Registration Configuration

### AnalyzerConfig Options

```typescript
interface AnalyzerConfig {
  name: string;                    // Analyzer identifier
  analyzer: AnalyzerInterface;     // Analyzer instance
  dependencies?: string[];         // Required dependencies
  priority?: number;               // Registration priority (higher = first)
  enabled?: boolean;               // Enable/disable analyzer
  metadata?: AnalyzerMetadata;     // Additional metadata
}
```

### Registration Options

```typescript
interface RegistrationOptions {
  validateInterfaces: boolean;     // Enable interface validation
  allowDuplicates: boolean;        // Allow duplicate registrations
  failOnError: boolean;           // Fail fast on errors
  registrationTimeout: number;     // Timeout in milliseconds
  enableLogging: boolean;         // Enable detailed logging
}

// Configure registry options
registry.setRegistrationOptions({
  validateInterfaces: true,
  failOnError: false,
  registrationTimeout: 10000
});
```

## Validation System

The registry performs comprehensive validation during registration:

### Interface Validation
- Checks all required methods exist
- Validates method signatures
- Ensures proper return types
- Calculates compliance score

### Dependency Validation
- Resolves dependency chains
- Detects circular dependencies
- Ensures dependencies are registered first
- Provides resolution order

### Capability Validation
- Validates capability declarations
- Checks for consistency
- Provides recommendations

## Error Handling

### Registration Results

Every registration operation returns a `RegistrationResult`:

```typescript
interface RegistrationResult {
  success: boolean;
  analyzerName: string;
  error?: string;
  validationDetails?: ValidationDetails;
  registrationTimestamp?: Date;
  warnings?: string[];
}
```

### Error Recovery

The registry supports graceful error handling:

```typescript
// Enable graceful failure handling
registry.setRegistrationOptions({
  failOnError: false  // Continue registration even if some analyzers fail
});

// Check registration status
const status = registry.getAnalyzerStatus('MyAnalyzer');
if (status?.status === 'failed') {
  console.log(`Analyzer failed: ${status.lastError}`);
  console.log(`Retry count: ${status.retryCount}`);
}
```

## State Management

### Query Registration State

```typescript
// Get all registered analyzers
const registered = registry.getRegisteredAnalyzers();
console.log('Registered analyzers:', registered);

// Get failed registrations
const failed = registry.getFailedAnalyzers();
console.log('Failed analyzers:', failed);

// Get comprehensive statistics
const stats = registry.getRegistrationStatistics();
console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
```

### Registry Validation

```typescript
// Validate entire registry
const validation = registry.validateRegistration();

if (validation.isValid) {
  console.log('Registry is valid');
} else {
  console.log('Registry has issues:');
  validation.issues.forEach(issue => {
    console.log(`- ${issue.analyzerName}: ${issue.message}`);
  });
}
```

## Integration with Component Factory

### Using with ComponentFactory

```typescript
import { ComponentFactory } from '../src/parser/component-factory';

// Create component factory with custom analyzers
const factory = new ComponentFactory();

// Register custom analyzers
const customAnalyzers: AnalyzerConfig[] = [
  {
    name: 'MockAnalyzer',
    analyzer: new MockAnalyzer(),
    enabled: true
  }
];

const results = factory.registerCustomAnalyzers(customAnalyzers);

// Create parser with registered analyzers
const parser = factory.createReadmeParser({
  customAnalyzers,
  enabledAnalyzers: ['MockAnalyzer', 'LanguageDetector']
});
```

## Best Practices

### 1. Analyzer Design
- Keep analyzers focused on single responsibilities
- Implement proper error handling
- Use meaningful names and descriptions
- Document capabilities accurately

### 2. Registration Strategy
- Register dependencies before dependents
- Use priority ordering for critical analyzers
- Enable validation in development
- Handle registration failures gracefully

### 3. Testing
- Test analyzer interface compliance
- Validate registration scenarios
- Test error conditions
- Verify integration with pipeline

### 4. Performance
- Implement efficient analysis algorithms
- Set realistic processing time estimates
- Handle large files appropriately
- Clean up resources properly

## Monitoring and Diagnostics

### Error Diagnostics

```typescript
// Get comprehensive error diagnostics
const diagnostics = registry.getErrorDiagnostics();

console.log(`Total failures: ${diagnostics.totalFailures}`);
console.log('Recovery recommendations:');
diagnostics.recoveryRecommendations.forEach(rec => {
  console.log(`- ${rec}`);
});
```

### Logging

The registry provides structured logging for debugging:

```typescript
// Enable detailed logging
registry.setRegistrationOptions({
  enableLogging: true
});

// Logs include:
// - Registration attempts and results
// - Validation details
// - Error information with correlation IDs
// - Recovery attempts
// - State changes
```

## Migration Guide

### From Legacy Registry

If migrating from an older registry system:

1. Update analyzer implementations to use `AnalyzerInterface`
2. Add required methods (`getCapabilities`, `validateInterface`)
3. Update registration calls to use new API
4. Handle registration results properly
5. Update tests to use new validation system

### Compatibility

The new registry maintains backward compatibility where possible, but some breaking changes may require updates to existing analyzers.