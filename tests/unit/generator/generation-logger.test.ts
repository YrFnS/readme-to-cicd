/**
 * Tests for comprehensive logging and debugging system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GenerationLogger,
  LoggerConfig,
  LogLevel,
  LogEntry,
  PerformanceMetrics,
  DebugContext
} from '../../../src/generator/logging/generation-logger';
import { GenerationError, TemplateLoadError, GenerationStage } from '../../../src/generator/errors/generation-errors';

// Mock process for memory and CPU usage
const mockProcess = {
  memoryUsage: vi.fn(() => ({ heapUsed: 1024 * 1024 })),
  cpuUsage: vi.fn(() => ({ user: 1000, system: 500 }))
};

// @ts-ignore
global.process = mockProcess;

describe('GenerationLogger', () => {
  let logger: GenerationLogger;
  let consoleSpy: any;

  beforeEach(() => {
    logger = new GenerationLogger();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Management', () => {
    it('should start a new session with correlation ID', () => {
      const correlationId = logger.startSession();

      expect(correlationId).toMatch(/^gen-\d+-[a-z0-9]+$/);
      
      const logs = logger.getSessionLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Generation session started');
      expect(logs[0].correlationId).toBe(correlationId);
    });

    it('should use provided correlation ID', () => {
      const customId = 'custom-correlation-id';
      const correlationId = logger.startSession(customId);

      expect(correlationId).toBe(customId);
      
      const logs = logger.getSessionLogs();
      expect(logs[0].correlationId).toBe(customId);
    });

    it('should end session with success status', () => {
      const correlationId = logger.startSession();
      logger.endSession(true, { result: 'success' });

      const logs = logger.getSessionLogs();
      const endLog = logs.find(log => log.message === 'Generation session ended');
      
      expect(endLog).toBeDefined();
      expect(endLog?.context.success).toBe(true);
      expect(endLog?.context.result).toEqual({ result: 'success' });
    });

    it('should track performance metrics during session', () => {
      const correlationId = logger.startSession();
      logger.endSession(true);

      const metrics = logger.getPerformanceMetrics(correlationId);
      
      expect(metrics).toBeDefined();
      expect(metrics?.startTime).toBeDefined();
      expect(metrics?.endTime).toBeDefined();
      expect(metrics?.duration).toBeGreaterThan(0);
    });
  });

  describe('Logging Levels', () => {
    it('should log debug messages', () => {
      logger.debug('test-component', 'initialization', 'Debug message', { key: 'value' });

      const logs = logger.getSessionLogs();
      const debugLog = logs.find(log => log.level === 'debug');
      
      expect(debugLog).toBeDefined();
      expect(debugLog?.message).toBe('Debug message');
      expect(debugLog?.context.key).toBe('value');
    });

    it('should log info messages', () => {
      logger.info('test-component', 'template-loading', 'Info message');

      const logs = logger.getSessionLogs();
      const infoLog = logs.find(log => log.level === 'info');
      
      expect(infoLog).toBeDefined();
      expect(infoLog?.message).toBe('Info message');
    });

    it('should log warning messages', () => {
      logger.warn('test-component', 'optimization', 'Warning message');

      const logs = logger.getSessionLogs();
      const warnLog = logs.find(log => log.level === 'warn');
      
      expect(warnLog).toBeDefined();
      expect(warnLog?.message).toBe('Warning message');
    });

    it('should log error messages with error objects', () => {
      const error = new TemplateLoadError('test-template', '/path/to/template');
      logger.error('test-component', 'template-loading', 'Error message', error);

      const logs = logger.getSessionLogs();
      const errorLog = logs.find(log => log.level === 'error');
      
      expect(errorLog).toBeDefined();
      expect(errorLog?.message).toBe('Error message');
      expect(errorLog?.error).toBe(error);
    });

    it('should log trace messages', () => {
      logger.trace('test-component', 'rendering', 'Trace message');

      const logs = logger.getSessionLogs();
      const traceLog = logs.find(log => log.level === 'trace');
      
      expect(traceLog).toBeDefined();
      expect(traceLog?.message).toBe('Trace message');
    });

    it('should respect log level configuration', () => {
      const warnLogger = new GenerationLogger({ level: 'warn' });
      
      warnLogger.debug('test', 'initialization', 'Debug message');
      warnLogger.info('test', 'initialization', 'Info message');
      warnLogger.warn('test', 'initialization', 'Warn message');
      warnLogger.error('test', 'initialization', 'Error message');

      const logs = warnLogger.getSessionLogs();
      
      expect(logs.filter(log => log.level === 'debug')).toHaveLength(0);
      expect(logs.filter(log => log.level === 'info')).toHaveLength(0);
      expect(logs.filter(log => log.level === 'warn')).toHaveLength(1);
      expect(logs.filter(log => log.level === 'error')).toHaveLength(1);
    });
  });

  describe('Stage Tracking', () => {
    it('should track stage start and end', () => {
      const correlationId = logger.startSession();
      
      logger.stageStart('template-manager', 'template-loading', { templateName: 'test' });
      logger.stageEnd('template-manager', 'template-loading', true, { result: 'success' });

      const logs = logger.getSessionLogs();
      const startLog = logs.find(log => log.message.includes("Stage 'template-loading' started"));
      const endLog = logs.find(log => log.message.includes("Stage 'template-loading' completed"));
      
      expect(startLog).toBeDefined();
      expect(endLog).toBeDefined();
      expect(startLog?.context.templateName).toBe('test');
      expect(endLog?.context.result).toBe('success');
    });

    it('should track stage performance metrics', () => {
      const correlationId = logger.startSession();
      
      logger.stageStart('template-manager', 'template-loading');
      logger.stageEnd('template-manager', 'template-loading', true);

      const metrics = logger.getPerformanceMetrics(correlationId);
      const stageMetrics = metrics?.stageMetrics.get('template-loading');
      
      expect(stageMetrics).toBeDefined();
      expect(stageMetrics?.startTime).toBeDefined();
      expect(stageMetrics?.endTime).toBeDefined();
      expect(stageMetrics?.duration).toBeGreaterThan(0);
    });

    it('should track stage failures', () => {
      const correlationId = logger.startSession();
      
      logger.stageStart('template-manager', 'template-loading');
      logger.stageEnd('template-manager', 'template-loading', false);

      const logs = logger.getSessionLogs();
      const failLog = logs.find(log => log.message.includes("Stage 'template-loading' failed"));
      
      expect(failLog).toBeDefined();
      expect(failLog?.level).toBe('warn');
    });
  });

  describe('Specialized Logging', () => {
    it('should log template fallback usage', () => {
      logger.templateFallback(
        'template-manager',
        'original-template',
        'fallback-template',
        'Original not found'
      );

      const logs = logger.getSessionLogs();
      const fallbackLog = logs.find(log => log.message === 'Template fallback used');
      
      expect(fallbackLog).toBeDefined();
      expect(fallbackLog?.context.originalTemplate).toBe('original-template');
      expect(fallbackLog?.context.fallbackTemplate).toBe('fallback-template');
      expect(fallbackLog?.context.reason).toBe('Original not found');
    });

    it('should log optimization application', () => {
      logger.optimizationApplied(
        'optimizer',
        'caching',
        '30% faster builds'
      );

      const logs = logger.getSessionLogs();
      const optimizationLog = logs.find(log => log.message === 'Optimization applied');
      
      expect(optimizationLog).toBeDefined();
      expect(optimizationLog?.context.optimizationType).toBe('caching');
      expect(optimizationLog?.context.impact).toBe('30% faster builds');
    });

    it('should log validation results', () => {
      logger.validationResult(
        'validator',
        'schema-validation',
        false,
        ['Missing required field'],
        ['Deprecated syntax'],
        { schemaVersion: '2.0' }
      );

      const logs = logger.getSessionLogs();
      const validationLog = logs.find(log => log.message.includes('Validation'));
      
      expect(validationLog).toBeDefined();
      expect(validationLog?.level).toBe('warn');
      expect(validationLog?.context.isValid).toBe(false);
      expect(validationLog?.context.errorCount).toBe(1);
      expect(validationLog?.context.warningCount).toBe(1);
    });

    it('should log partial generation', () => {
      logger.partialGeneration(
        'generator',
        ['initialization', 'template-loading'],
        'step-generation',
        true
      );

      const logs = logger.getSessionLogs();
      const partialLog = logs.find(log => log.message === 'Partial generation completed');
      
      expect(partialLog).toBeDefined();
      expect(partialLog?.context.completedStages).toEqual(['initialization', 'template-loading']);
      expect(partialLog?.context.failedStage).toBe('step-generation');
      expect(partialLog?.context.isUsable).toBe(true);
    });

    it('should log cache events', () => {
      const correlationId = logger.startSession();
      
      logger.cacheEvent('template-manager', 'template-cache', true, 'nodejs-template');
      logger.cacheEvent('template-manager', 'template-cache', false, 'react-template');

      const logs = logger.getSessionLogs();
      const hitLog = logs.find(log => log.message === 'Cache hit');
      const missLog = logs.find(log => log.message === 'Cache miss');
      
      expect(hitLog).toBeDefined();
      expect(missLog).toBeDefined();
      expect(hitLog?.context.key).toBe('nodejs-template');
      expect(missLog?.context.key).toBe('react-template');
    });

    it('should log retry attempts', () => {
      const correlationId = logger.startSession();
      
      logger.retryAttempt(
        'template-manager',
        'template-loading',
        2,
        3,
        'Network timeout'
      );

      const logs = logger.getSessionLogs();
      const retryLog = logs.find(log => log.message.includes('Retry attempt'));
      
      expect(retryLog).toBeDefined();
      expect(retryLog?.context.attempt).toBe(2);
      expect(retryLog?.context.maxAttempts).toBe(3);
      expect(retryLog?.context.reason).toBe('Network timeout');
    });
  });

  describe('Debug Context Management', () => {
    it('should set and get debug context', () => {
      const correlationId = logger.startSession();
      
      const context: Partial<DebugContext> = {
        detectionResult: {
          frameworks: [],
          languages: [],
          buildTools: [],
          packageManagers: [],
          testingFrameworks: [],
          deploymentTargets: [],
          projectMetadata: { name: 'test' }
        },
        templateHierarchy: ['primary', 'fallback']
      };
      
      logger.setDebugContext(context);
      const retrievedContext = logger.getDebugContext(correlationId);
      
      expect(retrievedContext).toBeDefined();
      expect(retrievedContext?.templateHierarchy).toEqual(['primary', 'fallback']);
    });

    it('should update debug context incrementally', () => {
      const correlationId = logger.startSession();
      
      logger.setDebugContext({ templateHierarchy: ['primary'] });
      logger.templateFallback('manager', 'primary', 'fallback', 'Not found');
      
      const context = logger.getDebugContext(correlationId);
      
      expect(context?.templateHierarchy).toEqual(['primary']);
      expect(context?.fallbacksUsed).toContain('primary -> fallback');
    });
  });

  describe('Performance Tracking', () => {
    it('should track memory usage', () => {
      const correlationId = logger.startSession();
      logger.endSession(true);

      const metrics = logger.getPerformanceMetrics(correlationId);
      
      expect(metrics?.memoryStart).toBe(1024 * 1024);
      expect(metrics?.memoryEnd).toBe(1024 * 1024);
      expect(metrics?.memoryPeak).toBeGreaterThanOrEqual(1024 * 1024);
    });

    it('should track CPU usage', () => {
      const correlationId = logger.startSession();
      logger.endSession(true);

      const metrics = logger.getPerformanceMetrics(correlationId);
      
      expect(metrics?.cpuStart).toBe(1500); // user + system
      expect(metrics?.cpuEnd).toBe(1500);
    });

    it('should track cache statistics', () => {
      const correlationId = logger.startSession();
      
      logger.stageStart('template-manager', 'template-loading');
      logger.cacheEvent('template-manager', 'template-cache', true, 'key1');
      logger.cacheEvent('template-manager', 'template-cache', false, 'key2');
      logger.cacheEvent('template-manager', 'template-cache', true, 'key3');
      logger.stageEnd('template-manager', 'template-loading', true);

      const metrics = logger.getPerformanceMetrics(correlationId);
      const stageMetrics = metrics?.stageMetrics.get('template-loading');
      
      expect(stageMetrics?.cacheHits).toBe(2);
      expect(stageMetrics?.cacheMisses).toBe(1);
    });

    it('should track retry statistics', () => {
      const correlationId = logger.startSession();
      
      logger.stageStart('template-manager', 'template-loading');
      logger.retryAttempt('template-manager', 'template-loading', 1, 3, 'Error');
      logger.retryAttempt('template-manager', 'template-loading', 2, 3, 'Error');
      logger.stageEnd('template-manager', 'template-loading', true);

      const metrics = logger.getPerformanceMetrics(correlationId);
      const stageMetrics = metrics?.stageMetrics.get('template-loading');
      
      expect(stageMetrics?.retries).toBe(2);
    });

    it('should disable performance tracking when configured', () => {
      const noPerformanceLogger = new GenerationLogger({
        enablePerformanceTracking: false
      });

      const correlationId = noPerformanceLogger.startSession();
      noPerformanceLogger.endSession(true);

      const metrics = noPerformanceLogger.getPerformanceMetrics(correlationId);
      
      expect(metrics).toBeUndefined();
    });
  });

  describe('Log Querying and Analysis', () => {
    beforeEach(() => {
      const correlationId = logger.startSession();
      
      logger.debug('component1', 'initialization', 'Debug message');
      logger.info('component2', 'template-loading', 'Info message');
      logger.warn('component3', 'optimization', 'Warning message');
      logger.error('component4', 'validation', 'Error message', new TemplateLoadError('test', '/path'));
    });

    it('should get logs by level', () => {
      const errorLogs = logger.getLogsByLevel('error');
      const warnLogs = logger.getLogsByLevel('warn');
      
      expect(errorLogs).toHaveLength(1);
      expect(warnLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error message');
    });

    it('should get logs by correlation ID', () => {
      const correlationId = logger.startSession('test-correlation');
      logger.info('test', 'initialization', 'Test message');
      
      const correlationLogs = logger.getCorrelationLogs('test-correlation');
      
      expect(correlationLogs.length).toBeGreaterThan(0);
      expect(correlationLogs.every(log => log.correlationId === 'test-correlation')).toBe(true);
    });

    it('should provide error summary', () => {
      const summary = logger.getErrorSummary();
      
      expect(summary.totalErrors).toBe(1);
      expect(summary.errorsByStage['validation']).toBe(1);
      expect(summary.errorsByComponent['component4']).toBe(1);
      expect(summary.criticalErrors).toHaveLength(0); // TemplateLoadError is recoverable
    });
  });

  describe('Log Export', () => {
    beforeEach(() => {
      logger.startSession();
      logger.info('test', 'initialization', 'Test message', { key: 'value' });
      logger.warn('test', 'optimization', 'Warning message');
    });

    it('should export logs as JSON', () => {
      const jsonExport = logger.exportLogs('json');
      const parsed = JSON.parse(jsonExport);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('timestamp');
      expect(parsed[0]).toHaveProperty('level');
      expect(parsed[0]).toHaveProperty('message');
    });

    it('should export logs as CSV', () => {
      const csvExport = logger.exportLogs('csv');
      const lines = csvExport.split('\n');
      
      expect(lines[0]).toContain('timestamp');
      expect(lines[0]).toContain('level');
      expect(lines[0]).toContain('message');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should export logs as text', () => {
      const textExport = logger.exportLogs('text');
      
      expect(textExport).toContain('INFO');
      expect(textExport).toContain('Test message');
      expect(textExport).toContain('WARN');
      expect(textExport).toContain('Warning message');
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive data in context', () => {
      logger.info('test', 'initialization', 'Test message', {
        username: 'user',
        password: 'secret123',
        apiKey: 'key123',
        normalField: 'value'
      });

      const logs = logger.getSessionLogs();
      const testLog = logs.find(log => log.message === 'Test message');
      
      expect(testLog?.context.username).toBe('user');
      expect(testLog?.context.password).toBe('[REDACTED]');
      expect(testLog?.context.apiKey).toBe('[REDACTED]');
      expect(testLog?.context.normalField).toBe('value');
    });

    it('should sanitize nested sensitive data', () => {
      logger.info('test', 'initialization', 'Test message', {
        config: {
          database: {
            password: 'dbsecret',
            host: 'localhost'
          },
          api: {
            token: 'apitoken123'
          }
        }
      });

      const logs = logger.getSessionLogs();
      const testLog = logs.find(log => log.message === 'Test message');
      
      expect(testLog?.context.config.database.password).toBe('[REDACTED]');
      expect(testLog?.context.config.database.host).toBe('localhost');
      expect(testLog?.context.config.api.token).toBe('[REDACTED]');
    });

    it('should use custom redaction pattern', () => {
      const customLogger = new GenerationLogger({
        redactionPattern: '***HIDDEN***'
      });

      customLogger.startSession();
      customLogger.info('test', 'initialization', 'Test message', {
        secret: 'topsecret'
      });

      const logs = customLogger.getSessionLogs();
      const testLog = logs.find(log => log.message === 'Test message');
      
      expect(testLog?.context.secret).toBe('***HIDDEN***');
    });
  });

  describe('Console Output', () => {
    it('should output structured logs when enabled', () => {
      const structuredLogger = new GenerationLogger({
        enableStructuredLogging: true,
        enableConsoleOutput: true
      });

      structuredLogger.startSession();
      structuredLogger.info('test', 'initialization', 'Test message');

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls.find(call => 
        call[0].includes('"message":"Test message"')
      );
      expect(logCall).toBeDefined();
    });

    it('should output formatted logs when structured logging is disabled', () => {
      const formattedLogger = new GenerationLogger({
        enableStructuredLogging: false,
        enableConsoleOutput: true
      });

      formattedLogger.startSession();
      formattedLogger.info('test', 'initialization', 'Test message');

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls.find(call => 
        call[0].includes('INFO') && call[0].includes('Test message')
      );
      expect(logCall).toBeDefined();
    });

    it('should not output to console when disabled', () => {
      const noConsoleLogger = new GenerationLogger({
        enableConsoleOutput: false
      });

      noConsoleLogger.startSession();
      noConsoleLogger.info('test', 'initialization', 'Test message');

      // Should only have been called for session start, not for the info message
      const infoCalls = consoleSpy.mock.calls.filter(call => 
        call[0].includes('Test message')
      );
      expect(infoCalls).toHaveLength(0);
    });
  });

  describe('Log Management', () => {
    it('should clear old logs when limit is reached', () => {
      // Add many logs
      for (let i = 0; i < 1500; i++) {
        logger.info('test', 'initialization', `Message ${i}`);
      }

      logger.clearLogs(1000);
      const logs = logger.getSessionLogs();
      
      expect(logs.length).toBeLessThanOrEqual(1000);
    });

    it('should maintain recent logs after clearing', () => {
      logger.info('test', 'initialization', 'Old message');
      
      // Add many logs
      for (let i = 0; i < 100; i++) {
        logger.info('test', 'initialization', `Recent message ${i}`);
      }

      logger.clearLogs(50);
      const logs = logger.getSessionLogs();
      
      expect(logs.some(log => log.message === 'Old message')).toBe(false);
      expect(logs.some(log => log.message.includes('Recent message'))).toBe(true);
    });
  });

  describe('Custom Configuration', () => {
    it('should use custom correlation ID generator', () => {
      const customLogger = new GenerationLogger({
        correlationIdGenerator: () => 'custom-id-123'
      });

      const correlationId = customLogger.startSession();
      
      expect(correlationId).toBe('custom-id-123');
    });

    it('should use custom session ID generator', () => {
      const customLogger = new GenerationLogger({
        sessionIdGenerator: () => 'custom-session-456'
      });

      customLogger.startSession();
      const logs = customLogger.getSessionLogs();
      
      expect(logs[0].sessionId).toBe('custom-session-456');
    });

    it('should use custom sensitive fields list', () => {
      const customLogger = new GenerationLogger({
        sensitiveFields: ['customSecret', 'privateData']
      });

      customLogger.startSession();
      customLogger.info('test', 'initialization', 'Test', {
        customSecret: 'secret',
        privateData: 'private',
        password: 'password', // Default sensitive field
        normalField: 'normal'
      });

      const logs = customLogger.getSessionLogs();
      const testLog = logs.find(log => log.message === 'Test');
      
      expect(testLog?.context.customSecret).toBe('[REDACTED]');
      expect(testLog?.context.privateData).toBe('[REDACTED]');
      expect(testLog?.context.password).toBe('password'); // Not in custom list
      expect(testLog?.context.normalField).toBe('normal');
    });
  });
});