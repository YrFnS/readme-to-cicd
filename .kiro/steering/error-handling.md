---
inclusion: always
---

# Error Handling Standards

## Error Types & Classification

### Custom Error Classes
- Extend base `Error` class with specific error types
- Use descriptive error names: `ParseError`, `DetectionError`, `GenerationError`
- Include error codes for programmatic handling
- Provide contextual information in error messages

```typescript
class ParseError extends Error {
  constructor(message: string, public readonly filePath: string, public readonly line?: number) {
    super(`Parse failed in ${filePath}${line ? ` at line ${line}` : ''}: ${message}`);
    this.name = 'ParseError';
  }
}
```

### Error Categories
- **ValidationError**: Input validation failures, schema violations
- **ProcessingError**: Internal processing failures, algorithm errors
- **IntegrationError**: Component integration failures, interface mismatches
- **ConfigurationError**: Configuration issues, missing settings
- **SystemError**: File system access, network timeouts, resource limits

## Result Pattern Implementation

Use Result pattern for operations that can fail instead of throwing exceptions:

```typescript
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
const parseResult = await parseReadme(filePath);
if (!parseResult.success) {
  logger.error('Parse failed', { error: parseResult.error });
  return parseResult;
}
```

## Error Recovery Strategies

### Graceful Degradation
- Continue processing with reduced functionality when possible
- Provide fallback values for non-critical failures
- Skip problematic sections while processing remainder

### Retry Logic
- Implement exponential backoff for transient failures
- Maximum 3 retry attempts for external operations
- Different retry strategies for different error types

### Validation & Sanitization
- Validate all inputs at component boundaries
- Sanitize file paths to prevent directory traversal
- Use schema validation for configuration and API inputs

## Logging Requirements

### Structured Logging
- Use JSON format for all log entries
- Include correlation IDs for request tracking
- Log error context: component, operation, input parameters

### Log Levels
- **ERROR**: System failures, unrecoverable errors
- **WARN**: Recoverable issues, fallback usage
- **INFO**: Normal operation milestones
- **DEBUG**: Detailed execution flow (development only)

### Security Considerations
- Never log sensitive data (API keys, file contents, user data)
- Sanitize error messages before logging
- Use error codes instead of detailed messages in production

## Component-Specific Error Handling

### README Parser
- Handle malformed markdown gracefully
- Provide specific error locations (line numbers)
- Continue parsing after recoverable syntax errors

### Framework Detection
- Return confidence scores with detection results
- Handle unknown frameworks with generic fallbacks
- Validate detection results before proceeding

### YAML Generator
- Validate template inputs before rendering
- Check generated YAML syntax before output
- Provide detailed validation error messages

### CLI Tool
- Display user-friendly error messages
- Provide actionable suggestions for common errors
- Exit with appropriate status codes

## Testing Error Scenarios

### Unit Tests
- Test all error paths and edge cases
- Verify error message content and structure
- Test error recovery and fallback mechanisms

### Integration Tests
- Test error propagation between components
- Verify end-to-end error handling workflows
- Test system behavior under failure conditions
