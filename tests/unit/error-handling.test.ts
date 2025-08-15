/**
 * Comprehensive tests for error handling and validation components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ParseErrorImpl, 
  ErrorFactory, 
  ErrorRecovery, 
  ErrorAggregator,
  ErrorCategory,
  RecoveryStrategy 
} from '../../src/parser/utils/parse-error';
import { InputValidator, ValidationResult } from '../../src/parser/utils/input-validator';
import { Logger, LogLevel, logger } from '../../src/parser/utils/logger';
import { validateParserInputs } from '../../src/parser/utils/validation';

describe('ParseErrorImpl', () => {
  it('should create error with all properties', () => {
    const error = new ParseErrorImpl(
      'TEST_ERROR',
      'Test error message',
      'TestComponent',
      'error',
      {
        details: { key: 'value' },
        line: 10,
        column: 5,
        category: 'validation'
      }
    );

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
    expect(error.component).toBe('TestComponent');
    expect(error.severity).toBe('error');
    expect(error.details).toEqual({ key: 'value' });
    expect(error.line).toBe(10);
    expect(error.column).toBe(5);
    expect(error.category).toBe('validation');
    expect(error.timestamp).toBeDefined();
  });

  it('should auto-categorize errors based on code', () => {
    const validationError = new ParseErrorImpl('INVALID_INPUT', 'Invalid input', 'Test');
    expect(validationError.category).toBe('validation');

    const fileError = new ParseErrorImpl('FILE_NOT_FOUND', 'File not found', 'Test');
    expect(fileError.category).toBe('file-system');

    const parseError = new ParseErrorImpl('PARSE_FAILED', 'Parse failed', 'Test');
    expect(parseError.category).toBe('parsing');

    const analyzerError = new ParseErrorImpl('ANALYZER_TIMEOUT', 'Analyzer timeout', 'Test');
    expect(analyzerError.category).toBe('analysis');
  });

  it('should determine if error is recoverable', () => {
    const warningError = new ParseErrorImpl('TEST_WARNING', 'Warning', 'Test', 'warning');
    expect(warningError.isRecoverable).toBe(true);

    const analysisError = new ParseErrorImpl('ANALYZER_FAILED', 'Analysis failed', 'Test', 'error', {
      category: 'analysis'
    });
    expect(analysisError.isRecoverable).toBe(true);

    const fileError = new ParseErrorImpl('FILE_NOT_FOUND', 'File not found', 'Test', 'error', {
      category: 'file-system'
    });
    expect(fileError.isRecoverable).toBe(false);
  });

  it('should convert to JSON correctly', () => {
    const error = new ParseErrorImpl('TEST_ERROR', 'Test message', 'Test', 'error', {
      line: 5,
      column: 10,
      details: { test: true }
    });

    const json = error.toJSON();
    expect(json).toEqual({
      code: 'TEST_ERROR',
      message: 'Test message',
      component: 'Test',
      severity: 'error',
      line: 5,
      column: 10,
      details: { test: true }
    });
  });

  it('should create user-friendly messages', () => {
    const error = new ParseErrorImpl('TEST_ERROR', 'Test message', 'Test', 'error', {
      line: 5,
      column: 10
    });

    expect(error.toUserMessage()).toBe('Test message (line 5, column 10)');

    const errorNoColumn = new ParseErrorImpl('TEST_ERROR', 'Test message', 'Test', 'error', {
      line: 5
    });

    expect(errorNoColumn.toUserMessage()).toBe('Test message (line 5)');
  });
});

describe('ErrorFactory', () => {
  it('should create validation errors', () => {
    const error = ErrorFactory.validation('INVALID_INPUT', 'Invalid input', 'Test', { input: 'test' });
    
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.category).toBe('validation');
    expect(error.severity).toBe('error');
    expect(error.details).toEqual({ input: 'test' });
  });

  it('should create file system errors', () => {
    const originalError = new Error('Original error');
    const error = ErrorFactory.fileSystem('FILE_ERROR', 'File error', 'Test', '/path/to/file', originalError);
    
    expect(error.code).toBe('FILE_ERROR');
    expect(error.category).toBe('file-system');
    expect(error.details).toEqual({ filePath: '/path/to/file' });
    expect(error.stack).toContain('Caused by:');
  });

  it('should create parsing errors with line/column info', () => {
    const error = ErrorFactory.parsing('PARSE_ERROR', 'Parse error', 'Test', 10, 5, { context: 'test' });
    
    expect(error.code).toBe('PARSE_ERROR');
    expect(error.category).toBe('parsing');
    expect(error.line).toBe(10);
    expect(error.column).toBe(5);
    expect(error.details).toEqual({ context: 'test' });
  });

  it('should create analysis errors with configurable severity', () => {
    const warningError = ErrorFactory.analysis('ANALYSIS_WARNING', 'Warning', 'Test', 'warning');
    expect(warningError.severity).toBe('warning');

    const errorError = ErrorFactory.analysis('ANALYSIS_ERROR', 'Error', 'Test', 'error');
    expect(errorError.severity).toBe('error');
  });
});

describe('ErrorRecovery', () => {
  it('should determine if errors can be recovered', () => {
    const warningError = new ParseErrorImpl('TEST_WARNING', 'Warning', 'Test', 'warning');
    expect(ErrorRecovery.canRecover(warningError)).toBe(true);

    const analysisError = new ParseErrorImpl('ANALYZER_FAILED', 'Analysis failed', 'Test', 'error', {
      category: 'analysis'
    });
    expect(ErrorRecovery.canRecover(analysisError)).toBe(true);

    const fatalError = new ParseErrorImpl('FATAL_ERROR', 'Fatal error', 'Test', 'error', {
      category: 'system'
    });
    expect(ErrorRecovery.canRecover(fatalError)).toBe(false);
  });

  it('should provide appropriate recovery strategies', () => {
    const analysisError = new ParseErrorImpl('ANALYZER_FAILED', 'Analysis failed', 'Test', 'error', {
      category: 'analysis'
    });
    expect(ErrorRecovery.getRecoveryStrategy(analysisError)).toBe('skip-analyzer');

    const parseError = new ParseErrorImpl('PARSE_ERROR', 'Parse error', 'Test', 'error', {
      category: 'parsing'
    });
    expect(ErrorRecovery.getRecoveryStrategy(parseError)).toBe('partial-parse');

    const validationError = new ParseErrorImpl('VALIDATION_ERROR', 'Validation error', 'Test', 'warning', {
      category: 'validation'
    });
    expect(ErrorRecovery.getRecoveryStrategy(validationError)).toBe('sanitize-input');
  });

  it('should apply recovery strategies correctly', () => {
    const analysisError = new ParseErrorImpl('ANALYZER_FAILED', 'Analysis failed', 'Test', 'error', {
      category: 'analysis'
    });

    const result = ErrorRecovery.applyRecovery(analysisError, { analyzerName: 'TestAnalyzer' });
    
    expect(result.action).toBe('skip');
    expect(result.continueProcessing).toBe(true);
    expect(result.message).toContain('TestAnalyzer');
  });
});

describe('ErrorAggregator', () => {
  let aggregator: ErrorAggregator;

  beforeEach(() => {
    aggregator = new ErrorAggregator();
  });

  it('should add and categorize errors', () => {
    const error = new ParseErrorImpl('TEST_ERROR', 'Error', 'Test', 'error');
    const warning = new ParseErrorImpl('TEST_WARNING', 'Warning', 'Test', 'warning');

    aggregator.addError(error);
    aggregator.addError(warning);

    expect(aggregator.getErrors()).toHaveLength(1);
    expect(aggregator.getWarnings()).toHaveLength(1);
    expect(aggregator.getAll()).toHaveLength(2);
  });

  it('should detect critical errors', () => {
    const warning = new ParseErrorImpl('TEST_WARNING', 'Warning', 'Test', 'warning');
    aggregator.addError(warning);
    expect(aggregator.hasCriticalErrors()).toBe(false);

    const error = new ParseErrorImpl('TEST_ERROR', 'Error', 'Test', 'error');
    aggregator.addError(error);
    expect(aggregator.hasCriticalErrors()).toBe(true);
  });

  it('should provide error summary', () => {
    const validationError = new ParseErrorImpl('VALIDATION_ERROR', 'Validation error', 'Test', 'error', {
      category: 'validation'
    });
    const analysisWarning = new ParseErrorImpl('ANALYSIS_WARNING', 'Analysis warning', 'Test', 'warning', {
      category: 'analysis'
    });

    aggregator.addErrors([validationError, analysisWarning]);

    const summary = aggregator.getSummary();
    expect(summary.totalErrors).toBe(1);
    expect(summary.totalWarnings).toBe(1);
    expect(summary.errorsByCategory).toEqual({
      validation: 1,
      analysis: 1
    });
    expect(summary.errorsBySeverity).toEqual({
      error: 1,
      warning: 1
    });
  });

  it('should clear all errors', () => {
    const error = new ParseErrorImpl('TEST_ERROR', 'Error', 'Test', 'error');
    aggregator.addError(error);
    
    expect(aggregator.getAll()).toHaveLength(1);
    
    aggregator.clear();
    expect(aggregator.getAll()).toHaveLength(0);
  });
});

describe('InputValidator', () => {
  describe('validateFilePath', () => {
    it('should validate correct file paths', () => {
      const result = InputValidator.validateFilePath('README.md');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid file path types', () => {
      const result = InputValidator.validateFilePath(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_PATH_TYPE');
    });

    it('should reject empty file paths', () => {
      const result = InputValidator.validateFilePath('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('EMPTY_PATH');
    });

    it('should reject unsafe file paths', () => {
      const result = InputValidator.validateFilePath('../../../etc/passwd');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('UNSAFE_PATH');
    });

    it('should warn about non-README files', () => {
      const result = InputValidator.validateFilePath('config.json');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('NON_README_FILE');
    });

    it('should reject paths that are too long', () => {
      const longPath = 'a'.repeat(300);
      const result = InputValidator.validateFilePath(longPath);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PATH_TOO_LONG');
    });
  });

  describe('validateContent', () => {
    it('should validate correct content', () => {
      const content = '# Test README\n\nThis is a test.';
      const result = InputValidator.validateContent(content);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-string content', () => {
      const result = InputValidator.validateContent(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should handle empty content as warning', () => {
      const result = InputValidator.validateContent('');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('EMPTY_CONTENT');
    });

    it('should reject content that is too large', () => {
      const largeContent = 'a'.repeat(6 * 1024 * 1024); // 6MB
      const result = InputValidator.validateContent(largeContent);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('CONTENT_TOO_LARGE');
    });

    it('should reject binary content', () => {
      const binaryContent = 'Hello\0World';
      const result = InputValidator.validateContent(binaryContent);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BINARY_CONTENT');
    });

    it('should warn about control characters', () => {
      const contentWithControlChars = 'Hello\x01World';
      const result = InputValidator.validateContent(contentWithControlChars);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some(w => w.code === 'CONTROL_CHARACTERS')).toBe(true);
    });

    it('should detect malformed code blocks', () => {
      const malformedContent = '```javascript\nconsole.log("test");\n'; // Missing closing ```
      const result = InputValidator.validateContent(malformedContent);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MALFORMED_CODE_BLOCKS');
    });

    it('should warn about long lines', () => {
      const longLine = 'a'.repeat(1500);
      const result = InputValidator.validateContent(`# Title\n${longLine}\n`);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LONG_LINES');
    });

    it('should sanitize content', () => {
      const dirtyContent = 'Hello World\r\n\r\nTest\x01\x02'; // Remove null byte to avoid early return
      const result = InputValidator.validateContent(dirtyContent);
      expect(result.sanitizedValue).toBe('Hello World\n\nTest');
    });
  });

  describe('validateAnalyzerConfig', () => {
    it('should validate correct analyzer config', () => {
      const config = {
        timeout: 5000,
        confidenceThreshold: 0.8
      };
      const result = InputValidator.validateAnalyzerConfig(config);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid config types', () => {
      const result = InputValidator.validateAnalyzerConfig('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_ANALYZER_CONFIG');
    });

    it('should reject invalid timeout values', () => {
      const config = { timeout: -1 };
      const result = InputValidator.validateAnalyzerConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TIMEOUT');
    });

    it('should warn about high timeout values', () => {
      const config = { timeout: 120000 }; // 2 minutes
      const result = InputValidator.validateAnalyzerConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.warnings[0].code).toBe('HIGH_TIMEOUT');
    });

    it('should reject invalid confidence thresholds', () => {
      const config = { confidenceThreshold: 1.5 };
      const result = InputValidator.validateAnalyzerConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_CONFIDENCE_THRESHOLD');
    });
  });
});

describe('Logger', () => {
  let testLogger: Logger;

  beforeEach(() => {
    // Create a fresh logger instance for testing
    (Logger as any).instance = undefined; // Reset singleton
    testLogger = Logger.getInstance({ 
      level: LogLevel.DEBUG,
      enableConsole: false,
      maxLogEntries: 100
    });
    testLogger.clearLogs();
  });

  afterEach(() => {
    testLogger.clearLogs();
    (Logger as any).instance = undefined; // Reset singleton
  });

  it('should log messages at different levels', () => {
    testLogger.debug('Test', 'Debug message');
    testLogger.info('Test', 'Info message');
    testLogger.warn('Test', 'Warning message');
    testLogger.error('Test', 'Error message');

    const logs = testLogger.getRecentLogs();
    expect(logs).toHaveLength(4);
    expect(logs[0].level).toBe(LogLevel.DEBUG);
    expect(logs[1].level).toBe(LogLevel.INFO);
    expect(logs[2].level).toBe(LogLevel.WARN);
    expect(logs[3].level).toBe(LogLevel.ERROR);
  });

  it('should filter logs by level', () => {
    testLogger.updateConfig({ level: LogLevel.WARN });
    
    testLogger.debug('Test', 'Debug message');
    testLogger.info('Test', 'Info message');
    testLogger.warn('Test', 'Warning message');
    testLogger.error('Test', 'Error message');

    const logs = testLogger.getRecentLogs();
    expect(logs).toHaveLength(2); // Only WARN and ERROR
  });

  it('should track performance', () => {
    const trackingId = testLogger.startPerformanceTracking('testOperation');
    expect(trackingId).toBeDefined();

    // Simulate some work
    const metrics = testLogger.endPerformanceTracking(trackingId);
    expect(metrics).toBeDefined();
    expect(metrics!.duration).toBeGreaterThanOrEqual(0);
    expect(metrics!.operationName).toBe('testOperation');
  });

  it('should log parse errors', () => {
    const parseError = new ParseErrorImpl('TEST_ERROR', 'Test error', 'Test', 'error');
    testLogger.logParseError(parseError);

    const logs = testLogger.getRecentLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe(LogLevel.ERROR);
    expect(logs[0].message).toBe('Test error');
  });

  it('should provide statistics', () => {
    testLogger.debug('Component1', 'Debug message');
    testLogger.info('Component1', 'Info message');
    testLogger.error('Component2', 'Error message');

    const stats = testLogger.getStatistics();
    expect(stats.totalEntries).toBe(3);
    expect(stats.levelCounts[LogLevel.DEBUG]).toBe(1);
    expect(stats.levelCounts[LogLevel.INFO]).toBe(1);
    expect(stats.levelCounts[LogLevel.ERROR]).toBe(1);
    expect(stats.componentCounts['Component1']).toBe(2);
    expect(stats.componentCounts['Component2']).toBe(1);
  });

  it('should generate correlation IDs', () => {
    const correlationId = Logger.generateCorrelationId();
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe('string');
    expect(correlationId.length).toBeGreaterThan(0);
  });
});

describe('validateParserInputs', () => {
  it('should validate all inputs comprehensively', () => {
    const result = validateParserInputs(
      'README.md',
      '# Test README\n\nThis is a test.',
      'utf8'
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitizedInputs).toBeDefined();
  });

  it('should collect errors from all inputs', () => {
    const result = validateParserInputs(
      '../unsafe/path',
      'Binary\0content',
      'unsupported-encoding' as any
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Should have errors from path, content, and encoding validation
    const errorCodes = result.errors.map(e => e.code);
    expect(errorCodes).toContain('UNSAFE_PATH');
    expect(errorCodes).toContain('BINARY_CONTENT');
    expect(errorCodes).toContain('UNSUPPORTED_ENCODING');
  });

  it('should provide sanitized inputs when possible', () => {
    const result = validateParserInputs(
      '  README.md  ',
      'Content\r\nwith\r\nwindows\r\nline\r\nendings'
    );

    expect(result.isValid).toBe(true);
    expect(result.sanitizedInputs?.filePath).toBe('README.md');
    expect(result.sanitizedInputs?.content).toBe('Content\nwith\nwindows\nline\nendings');
  });
});