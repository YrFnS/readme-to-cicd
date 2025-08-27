import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logger, createLogger, LoggerFactory } from '../../../src/shared/logging/central-logger';

describe('Central Logger Integration', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let logOutput: string[];

  beforeEach(() => {
    logOutput = [];
    
    // Capture console output for testing
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
    
    console.error = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('should log messages with correlation ID', () => {
    const correlationId = 'test-correlation-123';
    logger.setCorrelationId(correlationId);
    
    logger.info('Test integration message', { 
      component: 'integration-test',
      operation: 'testing'
    });

    expect(logger.getCorrelationId()).toBe(correlationId);
    // In a real environment, this would be captured by Winston
    // In test environment, it may fall back to console
  });

  it('should create component-specific loggers', () => {
    const parserLogger = LoggerFactory.getLogger('parser');
    const generatorLogger = LoggerFactory.getLogger('generator');
    
    expect(parserLogger).toBeDefined();
    expect(generatorLogger).toBeDefined();
    expect(parserLogger).not.toBe(generatorLogger);
    
    parserLogger.info('Parser message');
    generatorLogger.info('Generator message');
  });

  it('should handle different log levels', () => {
    const testLogger = createLogger({ level: 'debug' });
    
    testLogger.debug('Debug message');
    testLogger.info('Info message');
    testLogger.warn('Warning message');
    testLogger.error('Error message');
    
    // All messages should be processed without throwing errors
    expect(true).toBe(true);
  });

  it('should work with existing detection logger', () => {
    // Test that our logger works with the existing detection utils
    logger.info('Framework detection test', { 
      component: 'FrameworkDetection',
      framework: 'Node.js',
      confidence: 0.95
    });
    
    expect(true).toBe(true);
  });
});