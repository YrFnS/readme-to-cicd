# Central Logger

Winston-based structured logging system with correlation ID support and graceful console fallback.

## Features

- **Structured Logging**: JSON format for production, human-readable for development
- **Correlation ID Support**: Track requests across components
- **Environment-Specific Configuration**: Automatic dev/prod settings
- **Graceful Fallback**: Console logging when Winston fails
- **Component Loggers**: Factory pattern for component-specific loggers
- **Error Handling**: Comprehensive error handling with fallback mechanisms

## Usage

### Basic Logging

```typescript
import { logger } from './src/shared/logging';

// Basic logging
logger.info('Application started');
logger.error('Database connection failed', { 
  database: 'postgres',
  host: 'localhost' 
});

// With correlation ID
logger.setCorrelationId('req-123');
logger.info('Processing request', { userId: '456' });
```

### Component-Specific Loggers

```typescript
import { LoggerFactory } from './src/shared/logging';

const parserLogger = LoggerFactory.getLogger('parser');
const generatorLogger = LoggerFactory.getLogger('generator');

parserLogger.info('Parsing README file', { file: 'README.md' });
generatorLogger.info('Generating YAML workflow', { framework: 'Node.js' });
```

### Custom Configuration

```typescript
import { createLogger } from './src/shared/logging';

const customLogger = createLogger({
  level: 'debug',
  format: 'json',
  outputs: ['console', 'file'],
  filePath: 'logs/custom.log'
});
```

## Configuration

The logger automatically configures based on `NODE_ENV`:

### Development (NODE_ENV !== 'production')
- Level: `debug`
- Format: `simple` (human-readable)
- Outputs: `console`

### Production (NODE_ENV === 'production')
- Level: `info`
- Format: `json` (structured)
- Outputs: `console`, `file`
- File: `logs/application.log`

## Error Handling

The logger includes comprehensive error handling:

1. **Winston Setup Failure**: Falls back to console logging
2. **Logging Errors**: Catches and logs to console as fallback
3. **File System Issues**: Gracefully handles file write failures
4. **Configuration Errors**: Uses sensible defaults

## Correlation IDs

Correlation IDs help track requests across components:

```typescript
// Generate new correlation ID
const correlationId = logger.generateCorrelationId();

// Set existing correlation ID
logger.setCorrelationId('existing-id');

// Get current correlation ID
const currentId = logger.getCorrelationId();
```

## Integration with Existing Code

The logger is designed to work with existing detection utilities:

```typescript
// Before (old interface)
logger.debug('FrameworkDetection', output);

// After (new interface)
logger.debug(output, { component: 'FrameworkDetection' });
```

## Testing

The logger includes comprehensive unit and integration tests:

```bash
# Run logger tests
npm test tests/unit/shared/logging/
npm test tests/integration/logging/
```

## Performance

- Minimal overhead in production
- Lazy initialization of Winston transports
- Efficient JSON serialization
- Graceful degradation under load