import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import winston from 'winston';
import { 
  CentralLogger, 
  ICentralLogger, 
  LoggerConfig, 
  logger, 
  createLogger, 
  LoggerFactory 
} from '../../../../src/shared/logging/central-logger';

// Mock crypto module
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    randomUUID: vi.fn(() => 'mocked-uuid-123')
  };
});

// Mock Winston
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(),
    transports: {
      Console: vi.fn(),
      File: vi.fn()
    },
    format: {
      combine: vi.fn(() => ({ transform: vi.fn() })),
      timestamp: vi.fn(() => ({ transform: vi.fn() })),
      errors: vi.fn(() => ({ transform: vi.fn() })),
      json: vi.fn(() => ({ transform: vi.fn() })),
      colorize: vi.fn(() => ({ transform: vi.fn() })),
      printf: vi.fn(() => ({ transform: vi.fn() }))
    }
  }
}));

describe('CentralLogger', () => {
  let mockWinstonLogger: any;
  let consoleLogSpy: Mock;
  let consoleWarnSpy: Mock;
  let consoleErrorSpy: Mock;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock Winston logger instance
    mockWinstonLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn()
    };

    // Mock Winston createLogger to return our mock
    (winston.createLogger as Mock).mockReturnValue(mockWinstonLogger);

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Clear LoggerFactory instances
    LoggerFactory.clearInstances();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create logger with default configuration', () => {
      const centralLogger = new CentralLogger();
      
      expect(winston.createLogger).toHaveBeenCalled();
      expect(centralLogger).toBeInstanceOf(CentralLogger);
    });

    it('should create logger with custom configuration', () => {
      const config: Partial<LoggerConfig> = {
        level: 'error',
        format: 'json',
        outputs: ['console']
      };

      const centralLogger = new CentralLogger(config);
      
      expect(winston.createLogger).toHaveBeenCalled();
      expect(centralLogger).toBeInstanceOf(CentralLogger);
    });

    it('should use development defaults when NODE_ENV is not production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const centralLogger = new CentralLogger();
      
      expect(winston.createLogger).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should use production defaults when NODE_ENV is production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const centralLogger = new CentralLogger();
      
      expect(winston.createLogger).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Correlation ID Management', () => {
    let centralLogger: CentralLogger;

    beforeEach(() => {
      centralLogger = new CentralLogger();
    });

    it('should set and get correlation ID', () => {
      const correlationId = 'test-correlation-id';
      
      centralLogger.setCorrelationId(correlationId);
      
      expect(centralLogger.getCorrelationId()).toBe(correlationId);
    });

    it('should generate new correlation ID', () => {
      const correlationId = centralLogger.generateCorrelationId();
      
      expect(correlationId).toBe('mocked-uuid-123');
      expect(centralLogger.getCorrelationId()).toBe(correlationId);
    });

    it('should return undefined when no correlation ID is set', () => {
      expect(centralLogger.getCorrelationId()).toBeUndefined();
    });
  });

  describe('Logging Methods', () => {
    let centralLogger: CentralLogger;

    beforeEach(() => {
      centralLogger = new CentralLogger();
    });

    it('should log error messages', () => {
      const message = 'Test error message';
      const context = { userId: '123', action: 'test' };

      centralLogger.error(message, context);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith({
        message,
        ...context
      });
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';
      const context = { component: 'parser' };

      centralLogger.warn(message, context);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
        message,
        ...context
      });
    });

    it('should log info messages', () => {
      const message = 'Test info message';

      centralLogger.info(message);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message
      });
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';
      const context = { step: 'validation' };

      centralLogger.debug(message, context);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith({
        message,
        ...context
      });
    });

    it('should include correlation ID in log entries when set', () => {
      const correlationId = 'test-correlation-123';
      const message = 'Test message with correlation';
      
      centralLogger.setCorrelationId(correlationId);
      centralLogger.info(message);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message,
        correlationId
      });
    });

    it('should not include correlation ID when disabled in config', () => {
      const config: Partial<LoggerConfig> = {
        enableCorrelationId: false
      };
      const centralLogger = new CentralLogger(config);
      const message = 'Test message without correlation';
      
      centralLogger.setCorrelationId('test-id');
      centralLogger.info(message);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message
      });
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should fallback to console logging when Winston setup fails', () => {
      // Make Winston createLogger throw an error during constructor
      const originalCreateLogger = winston.createLogger;
      (winston.createLogger as Mock).mockImplementationOnce(() => {
        throw new Error('Winston setup failed');
      }).mockImplementationOnce(() => mockWinstonLogger); // Second call for fallback logger

      const centralLogger = new CentralLogger();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Winston logger setup failed, falling back to console logging:',
        expect.any(Error)
      );
      
      // Restore original implementation
      (winston.createLogger as Mock).mockImplementation(() => mockWinstonLogger);
    });

    it('should use console fallback for logging when Winston fails', () => {
      // Make Winston createLogger throw an error during constructor
      (winston.createLogger as Mock).mockImplementationOnce(() => {
        throw new Error('Winston setup failed');
      }).mockImplementationOnce(() => mockWinstonLogger); // Second call for fallback logger

      const centralLogger = new CentralLogger();
      const message = 'Test fallback message';
      const context = { test: 'data' };
      
      centralLogger.error(message, context);
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Test fallback message')
      );
      
      // Restore original implementation
      (winston.createLogger as Mock).mockImplementation(() => mockWinstonLogger);
    });

    it('should handle logging errors gracefully', () => {
      // Make Winston logger methods throw errors
      mockWinstonLogger.error.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const centralLogger = new CentralLogger();
      const message = 'Test error handling';
      
      // Should not throw an error
      expect(() => centralLogger.error(message)).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Logger error:', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledWith('Original message:', message, undefined);
    });

    it('should handle logging with context when Winston fails', () => {
      mockWinstonLogger.warn.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const centralLogger = new CentralLogger();
      const message = 'Test context handling';
      const context = { component: 'test' };
      
      expect(() => centralLogger.warn(message, context)).not.toThrow();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Logger error:', expect.any(Error));
      expect(consoleWarnSpy).toHaveBeenCalledWith('Original message:', message, context);
    });
  });

  describe('Factory Functions', () => {
    it('should create logger with createLogger function', () => {
      const config: Partial<LoggerConfig> = {
        level: 'warn',
        format: 'simple'
      };

      const createdLogger = createLogger(config);
      
      expect(createdLogger).toBeInstanceOf(CentralLogger);
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should provide default logger instance', () => {
      expect(logger).toBeInstanceOf(CentralLogger);
    });
  });

  describe('LoggerFactory', () => {
    it('should create component-specific loggers', () => {
      const componentName = 'parser';
      const componentLogger = LoggerFactory.getLogger(componentName);
      
      expect(componentLogger).toBeInstanceOf(CentralLogger);
    });

    it('should return same instance for same component name', () => {
      const componentName = 'generator';
      const logger1 = LoggerFactory.getLogger(componentName);
      const logger2 = LoggerFactory.getLogger(componentName);
      
      expect(logger1).toBe(logger2);
    });

    it('should create different instances for different components', () => {
      const logger1 = LoggerFactory.getLogger('component1');
      const logger2 = LoggerFactory.getLogger('component2');
      
      expect(logger1).not.toBe(logger2);
    });

    it('should clear all instances', () => {
      LoggerFactory.getLogger('test1');
      LoggerFactory.getLogger('test2');
      
      LoggerFactory.clearInstances();
      
      const newLogger1 = LoggerFactory.getLogger('test1');
      const newLogger2 = LoggerFactory.getLogger('test1');
      
      expect(newLogger1).toBe(newLogger2); // Should be same instance after clearing
    });

    it('should accept custom configuration for component loggers', () => {
      const config: Partial<LoggerConfig> = {
        level: 'error',
        format: 'json'
      };
      
      const componentLogger = LoggerFactory.getLogger('custom-component', config);
      
      expect(componentLogger).toBeInstanceOf(CentralLogger);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with correlation ID and context', () => {
      const centralLogger = new CentralLogger();
      const correlationId = 'integration-test-123';
      const message = 'Integration test message';
      const context = { 
        component: 'integration-test',
        operation: 'end-to-end',
        timestamp: Date.now()
      };

      centralLogger.setCorrelationId(correlationId);
      centralLogger.info(message, context);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message,
        correlationId,
        ...context
      });
      expect(centralLogger.getCorrelationId()).toBe(correlationId);
    });

    it('should handle multiple log levels in sequence', () => {
      const centralLogger = new CentralLogger();
      
      centralLogger.debug('Debug message');
      centralLogger.info('Info message');
      centralLogger.warn('Warning message');
      centralLogger.error('Error message');

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith({ message: 'Debug message' });
      expect(mockWinstonLogger.info).toHaveBeenCalledWith({ message: 'Info message' });
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith({ message: 'Warning message' });
      expect(mockWinstonLogger.error).toHaveBeenCalledWith({ message: 'Error message' });
    });

    it('should maintain correlation ID across multiple log calls', () => {
      const centralLogger = new CentralLogger();
      const correlationId = 'persistent-correlation-456';
      
      centralLogger.setCorrelationId(correlationId);
      
      centralLogger.info('First message');
      centralLogger.warn('Second message');
      centralLogger.error('Third message');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith({
        message: 'First message',
        correlationId
      });
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith({
        message: 'Second message',
        correlationId
      });
      expect(mockWinstonLogger.error).toHaveBeenCalledWith({
        message: 'Third message',
        correlationId
      });
    });
  });
});