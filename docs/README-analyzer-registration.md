# Analyzer Registration Documentation

## Overview

This documentation provides comprehensive guidance for working with the Enhanced Analyzer Registry System in the README-to-CICD project. The system enables robust registration and management of both built-in and custom analyzers with advanced validation, error handling, and recovery capabilities.

## Documentation Structure

### 📚 Core Documentation

1. **[Custom Analyzer Registration Guide](./custom-analyzer-registration-guide.md)**
   - Quick start guide for registering analyzers
   - Interface requirements and validation
   - Configuration options and best practices
   - State management and monitoring

2. **[Analyzer Implementation Examples](./analyzer-implementation-examples.md)**
   - Complete MockAnalyzer implementation
   - Real-world analyzer examples (Language Detection, Framework Detection)
   - Factory functions and utilities
   - Comprehensive testing examples

3. **[Troubleshooting Guide](./analyzer-registration-troubleshooting.md)**
   - Common registration failures and solutions
   - Interface validation issues
   - Dependency resolution problems
   - Performance optimization tips

4. **[Developer Extension Guide](./custom-analyzer-developer-guide.md)**
   - Advanced architecture patterns
   - Plugin system integration
   - Performance optimization strategies
   - Deployment and distribution guidelines

## Quick Reference

### Essential Interfaces

```typescript
// Core analyzer interface that all custom analyzers must implement
interface AnalyzerInterface<T = any> {
  readonly name: string;
  analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult<T>>;
  getCapabilities(): AnalyzerCapabilities;
  validateInterface(): boolean;
}

// Registry for managing analyzer lifecycle
interface AnalyzerRegistry {
  register(analyzer: AnalyzerInterface, name?: string): RegistrationResult;
  registerMultiple(analyzers: AnalyzerConfig[]): RegistrationResult[];
  getRegisteredAnalyzers(): string[];
  getAnalyzer(name: string): AnalyzerInterface | null;
  validateRegistration(): ValidationResult;
}
```

### Basic Usage

```typescript
import { EnhancedAnalyzerRegistry, MockAnalyzer } from '@readme-to-cicd/core';

// Create registry and analyzer
const registry = new EnhancedAnalyzerRegistry();
const mockAnalyzer = new MockAnalyzer();

// Register analyzer
const result = registry.register(mockAnalyzer);

if (result.success) {
  console.log('✓ MockAnalyzer registered successfully');
} else {
  console.error('✗ Registration failed:', result.error);
}
```

## Key Features

### ✅ Robust Registration System
- **Interface Validation**: Comprehensive validation of analyzer implementations
- **Dependency Resolution**: Automatic dependency ordering and circular dependency detection
- **Error Recovery**: Graceful handling of registration failures with recovery strategies
- **Batch Registration**: Efficient registration of multiple analyzers with partial failure support

### ✅ Advanced Error Handling
- **Structured Errors**: Detailed error information with recovery suggestions
- **Correlation IDs**: Request tracking for debugging complex registration flows
- **Diagnostic Reports**: Comprehensive error analysis and recommendations
- **Graceful Degradation**: Continue operation even with partial registration failures

### ✅ State Management
- **Registration Tracking**: Complete audit trail of registration attempts and results
- **Status Monitoring**: Real-time status information for all analyzers
- **Performance Metrics**: Registration statistics and performance monitoring
- **Configuration Management**: Flexible configuration options for different environments

### ✅ Testing Support
- **MockAnalyzer**: Comprehensive test analyzer with configurable behavior
- **Test Utilities**: Factory functions and helpers for testing scenarios
- **Integration Testing**: End-to-end testing support for registration workflows
- **Performance Testing**: Tools for validating registration performance

## Implementation Requirements

### Required Methods

All custom analyzers must implement these methods:

1. **`name`** (readonly string): Unique identifier for the analyzer
2. **`analyze()`**: Core analysis method that processes markdown content
3. **`getCapabilities()`**: Returns analyzer metadata and requirements
4. **`validateInterface()`**: Self-validation of interface compliance

### Capabilities Declaration

```typescript
interface AnalyzerCapabilities {
  supportedContentTypes: string[];    // ['text/markdown', 'text/plain']
  requiresContext: boolean;           // Whether analyzer needs analysis context
  canProcessLargeFiles: boolean;      // Support for large file processing
  estimatedProcessingTime: number;    // Expected processing time in milliseconds
  dependencies: string[];             // Required analyzer dependencies
}
```

## Common Use Cases

### 1. Simple Custom Analyzer
For basic content analysis without dependencies:
- Implement `AnalyzerInterface`
- Focus on single responsibility
- Handle errors gracefully
- Return structured results

### 2. Context-Aware Analyzer
For analyzers that need project context:
- Set `requiresContext: true` in capabilities
- Use context information for enhanced analysis
- Handle missing context gracefully

### 3. Dependent Analyzer
For analyzers that build on other analyzer results:
- Declare dependencies in capabilities
- Register dependencies first or use batch registration
- Handle dependency failures gracefully

### 4. High-Performance Analyzer
For analyzers processing large files:
- Set `canProcessLargeFiles: true`
- Implement streaming or chunked processing
- Use appropriate timeout values
- Consider worker thread usage

## Best Practices

### 🎯 Design Principles
- **Single Responsibility**: Each analyzer should focus on one specific analysis task
- **Error Resilience**: Handle all error conditions gracefully without throwing
- **Performance Awareness**: Set realistic processing time estimates
- **Context Sensitivity**: Use analysis context when available for better results

### 🔧 Implementation Guidelines
- **Interface Compliance**: Always implement all required methods correctly
- **Validation Logic**: Include comprehensive input validation
- **Structured Results**: Return consistent, well-structured analysis results
- **Resource Management**: Clean up resources and handle timeouts appropriately

### 🧪 Testing Strategy
- **Unit Testing**: Test analyzer implementation in isolation
- **Integration Testing**: Test registration and pipeline integration
- **Error Testing**: Test all error conditions and edge cases
- **Performance Testing**: Validate processing time estimates

### 📊 Monitoring and Debugging
- **Enable Logging**: Use detailed logging for debugging registration issues
- **Check Results**: Always verify registration results before proceeding
- **Monitor Performance**: Track registration statistics and performance metrics
- **Use Diagnostics**: Leverage diagnostic tools for troubleshooting

## Migration Guide

### From Legacy Systems
If migrating from older analyzer systems:

1. **Update Interface**: Implement new `AnalyzerInterface` methods
2. **Add Capabilities**: Implement `getCapabilities()` method
3. **Update Registration**: Use new registry API
4. **Handle Results**: Process `RegistrationResult` objects
5. **Update Tests**: Use new testing patterns and utilities

### Breaking Changes
- Method signatures may have changed
- Registration API is different
- Error handling patterns updated
- Configuration options modified

## Support and Resources

### 📖 Documentation
- [Custom Analyzer Registration Guide](./custom-analyzer-registration-guide.md) - Complete registration process
- [Implementation Examples](./analyzer-implementation-examples.md) - Code examples and patterns
- [Troubleshooting Guide](./analyzer-registration-troubleshooting.md) - Common issues and solutions
- [Developer Guide](./custom-analyzer-developer-guide.md) - Advanced development patterns

### 🔧 Tools and Utilities
- **MockAnalyzer**: Reference implementation for testing
- **Registry Diagnostics**: Error analysis and recovery tools
- **Validation Tools**: Interface and dependency validation
- **Performance Monitoring**: Registration statistics and metrics

### 🐛 Debugging Resources
- **Structured Logging**: Detailed registration logs with correlation IDs
- **Error Diagnostics**: Comprehensive error analysis and suggestions
- **State Inspection**: Registry state and analyzer status monitoring
- **Recovery Tools**: Automatic and manual recovery strategies

## Contributing

When contributing new analyzers or improvements:

1. **Follow Patterns**: Use established design patterns and interfaces
2. **Add Tests**: Include comprehensive unit and integration tests
3. **Document Changes**: Update documentation for new features
4. **Performance**: Consider performance impact of changes
5. **Backward Compatibility**: Maintain compatibility when possible

## Version Compatibility

This documentation applies to:
- **Enhanced Analyzer Registry**: v2.0+
- **README-to-CICD Core**: v1.0+
- **MockAnalyzer**: v1.0+

For older versions, refer to legacy documentation or consider upgrading to the latest version for improved features and stability.

---

*This documentation is part of the README-to-CICD project. For the latest updates and additional resources, visit the project repository.*