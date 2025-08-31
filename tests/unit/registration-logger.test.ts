/**
 * Unit Tests for Registration Logger
 * 
 * Tests comprehensive logging functionality, diagnostics, and log management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  RegistrationLogger,
  LogLevel,
  RegistrationEvent,
  createRegistrationLogger
} from '../../src/parser/analyzers/registration-logger';
import {
  RegistrationResult,
  ValidationResult,
  ValidationIssue,
  RegistrationState,
  ValidationStatus
} from '../../src/parser/analyzers/enhanced-analyzer-registry';
import {
  AnalyzerRegistrationError,
  InterfaceValidationError
} from '../../src/parser/analyzers/registration-errors';

describe('Registration Logger', () => {
  let logger: RegistrationLogger;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    logger = createRegistrationLogger({
      enableConsoleOutput: false, // Disable for tests
      logLevel: LogLevel.DEBUG,
      maxLogEntries: 100
    });

    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    
    logger.clearLogs();
  });

  describe('Logger Configuration', () => {
    it('should create logger with default configuration', () => {
      const defaultLogger = createRegistrationLogger();
      expect(defaultLogger).toBeInstanceOf(RegistrationLogger);
    });

    it('should create logger with custom configuration', () => {
      const customLogger = createRegistrationLogger({
        enableConsoleOutput: true,
        logLevel: LogLevel.ERROR,
        maxLogEntries: 50,
        correlationIdPrefix: 'test'
      });

      expect(customLogger).toBeInstanceOf(RegistrationLogger);
    });
  });

  describe('Registration Event Logging', () => {
    it('should log registration start and return correlation ID', () => {
      const correlationId = logger.logRegistrationStart('TestAnalyzer');
      
      expect(correlationId).toMatch(/^reg_\d+_\d+$/);
      
      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.INFO);
      expect(entries[0].operation).toBe(RegistrationEvent.REGISTRATION_STARTED);
      expect(entries[0].correlationId).toBe(correlationId);
      expect(entries[0].data?.analyzerName).toBe('TestAnalyzer');
    });

    it('should log registration success with details', () => {
      const correlationId = 'test-correlation-id';
      const result: RegistrationResult = {
        success: true,
        analyzerName: 'SuccessAnalyzer',
        registrationTimestamp: new Date(),
        warnings: ['Minor warning']
      };

      logger.logRegistrationSuccess(result, correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.INFO);
      expect(entries[0].operation).toBe(RegistrationEvent.REGISTRATION_SUCCESS);
      expect(entries[0].correlationId).toBe(correlationId);
      expect(entries[0].data?.analyzerName).toBe('SuccessAnalyzer');
      expect(entries[0].data?.warnings).toEqual(['Minor warning']);
    });

    it('should log registration failure with error details', () => {
      const correlationId = 'test-correlation-id';
      const result: RegistrationResult = {
        success: false,
        analyzerName: 'FailedAnalyzer',
        error: 'Registration failed',
        registrationTimestamp: new Date()
      };
      const error = new AnalyzerRegistrationError(
        'Test error',
        'FailedAnalyzer',
        'validation'
      );

      logger.logRegistrationFailure(result, error, correlationId);

      const entries = logger.getLogEntries();
      expect(entries.length).toBeGreaterThanOrEqual(1);
      
      const failureEntry = entries.find(e => e.operation === RegistrationEvent.REGISTRATION_FAILED);
      expect(failureEntry).toBeDefined();
      expect(failureEntry?.level).toBe(LogLevel.ERROR);
      expect(failureEntry?.correlationId).toBe(correlationId);
      expect(failureEntry?.data?.analyzerName).toBe('FailedAnalyzer');
      expect(failureEntry?.error).toBeDefined();
    });

    it('should log recovery suggestions for registration errors', () => {
      const correlationId = 'test-correlation-id';
      const result: RegistrationResult = {
        success: false,
        analyzerName: 'FailedAnalyzer',
        error: 'Registration failed',
        registrationTimestamp: new Date()
      };
      const error = new InterfaceValidationError(
        'Interface validation failed',
        'FailedAnalyzer',
        ['analyze'],
        []
      );

      logger.logRegistrationFailure(result, error, correlationId);

      const entries = logger.getLogEntries();
      const recoveryEntry = entries.find(e => e.operation === RegistrationEvent.RECOVERY_ATTEMPTED);
      expect(recoveryEntry).toBeDefined();
      expect(recoveryEntry?.data?.suggestions).toBeInstanceOf(Array);
      expect(recoveryEntry?.data?.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Validation Event Logging', () => {
    it('should log validation start', () => {
      const correlationId = 'test-correlation-id';
      logger.logValidationStart('TestAnalyzer', correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.DEBUG);
      expect(entries[0].operation).toBe(RegistrationEvent.VALIDATION_STARTED);
      expect(entries[0].data?.analyzerName).toBe('TestAnalyzer');
    });

    it('should log validation completion with results', () => {
      const correlationId = 'test-correlation-id';
      const validationResult: ValidationResult = {
        isValid: true,
        totalAnalyzers: 5,
        validAnalyzers: 4,
        invalidAnalyzers: 1,
        issues: [],
        recommendations: ['Consider updating analyzer X']
      };

      logger.logValidationComplete('TestAnalyzer', validationResult, correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.INFO);
      expect(entries[0].operation).toBe(RegistrationEvent.VALIDATION_COMPLETED);
      expect(entries[0].data?.isValid).toBe(true);
      expect(entries[0].data?.totalAnalyzers).toBe(5);
    });

    it('should log validation completion as warning when invalid', () => {
      const correlationId = 'test-correlation-id';
      const validationResult: ValidationResult = {
        isValid: false,
        totalAnalyzers: 3,
        validAnalyzers: 1,
        invalidAnalyzers: 2,
        issues: [
          {
            analyzerName: 'BadAnalyzer',
            type: 'interface',
            severity: 'error',
            message: 'Missing methods'
          }
        ],
        recommendations: []
      };

      logger.logValidationComplete('TestAnalyzer', validationResult, correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.WARN);
      expect(entries[0].data?.isValid).toBe(false);
    });

    it('should log interface validation failures', () => {
      const correlationId = 'test-correlation-id';
      logger.logInterfaceValidationFailure(
        'BadAnalyzer',
        ['analyze', 'getCapabilities'],
        ['validateInterface'],
        correlationId
      );

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.ERROR);
      expect(entries[0].operation).toBe(RegistrationEvent.INTERFACE_VALIDATION_FAILED);
      expect(entries[0].data?.missingMethods).toEqual(['analyze', 'getCapabilities']);
      expect(entries[0].data?.invalidMethods).toEqual(['validateInterface']);
      expect(entries[0].data?.totalIssues).toBe(3);
    });

    it('should log dependency resolution failures', () => {
      const correlationId = 'test-correlation-id';
      logger.logDependencyResolutionFailure(
        'DependentAnalyzer',
        ['MissingDep1', 'MissingDep2'],
        ['CircularA', 'CircularB'],
        correlationId
      );

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.ERROR);
      expect(entries[0].operation).toBe(RegistrationEvent.DEPENDENCY_RESOLUTION_FAILED);
      expect(entries[0].data?.missingDependencies).toEqual(['MissingDep1', 'MissingDep2']);
      expect(entries[0].data?.circularDependencies).toEqual(['CircularA', 'CircularB']);
    });
  });

  describe('Registry State Logging', () => {
    it('should log registry state changes', () => {
      const correlationId = 'test-correlation-id';
      const previousState: RegistrationState = {
        registeredAnalyzers: new Map([['A1', {} as any]]),
        registrationOrder: ['A1'],
        failedRegistrations: [],
        registrationTimestamp: new Date(),
        validationStatus: ValidationStatus.VALID,
        options: {
          validateInterfaces: true,
          allowDuplicates: false,
          failOnError: true,
          registrationTimeout: 5000,
          enableLogging: true
        }
      };

      const newState: RegistrationState = {
        registeredAnalyzers: new Map([['A1', {} as any], ['A2', {} as any]]),
        registrationOrder: ['A1', 'A2'],
        failedRegistrations: [
          {
            analyzerName: 'Failed1',
            error: 'Test error',
            timestamp: new Date(),
            retryCount: 0
          }
        ],
        registrationTimestamp: new Date(),
        validationStatus: ValidationStatus.PARTIAL,
        options: {
          validateInterfaces: true,
          allowDuplicates: false,
          failOnError: true,
          registrationTimeout: 5000,
          enableLogging: true
        }
      };

      logger.logRegistryStateChange(previousState, newState, correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.DEBUG);
      expect(entries[0].operation).toBe(RegistrationEvent.REGISTRY_STATE_CHANGED);
      expect(entries[0].data?.previousAnalyzerCount).toBe(1);
      expect(entries[0].data?.newAnalyzerCount).toBe(2);
      expect(entries[0].data?.failedRegistrationsCount).toBe(1);
    });
  });

  describe('Validation Issues Logging', () => {
    it('should log validation issues with appropriate levels', () => {
      const correlationId = 'test-correlation-id';
      const issues: ValidationIssue[] = [
        {
          analyzerName: 'ErrorAnalyzer',
          type: 'interface',
          severity: 'error',
          message: 'Critical interface issue'
        },
        {
          analyzerName: 'WarnAnalyzer',
          type: 'dependency',
          severity: 'warning',
          message: 'Dependency warning'
        },
        {
          analyzerName: 'InfoAnalyzer',
          type: 'capability',
          severity: 'info',
          message: 'Capability info'
        }
      ];

      logger.logValidationIssues(issues, correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(3);
      
      const errorEntry = entries.find(e => e.data?.severity === 'error');
      const warnEntry = entries.find(e => e.data?.severity === 'warning');
      const infoEntry = entries.find(e => e.data?.severity === 'info');

      expect(errorEntry?.level).toBe(LogLevel.ERROR);
      expect(warnEntry?.level).toBe(LogLevel.WARN);
      expect(infoEntry?.level).toBe(LogLevel.INFO);
    });
  });

  describe('Recovery Logging', () => {
    it('should log recovery attempts', () => {
      const correlationId = 'test-correlation-id';
      logger.logRecoveryAttempt('FailedAnalyzer', 'retry-with-relaxed-validation', correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.INFO);
      expect(entries[0].operation).toBe(RegistrationEvent.RECOVERY_ATTEMPTED);
      expect(entries[0].data?.analyzerName).toBe('FailedAnalyzer');
      expect(entries[0].data?.recoveryStrategy).toBe('retry-with-relaxed-validation');
    });

    it('should log recovery success', () => {
      const correlationId = 'test-correlation-id';
      logger.logRecoverySuccess('RecoveredAnalyzer', 'interface-fix', correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.INFO);
      expect(entries[0].operation).toBe(RegistrationEvent.RECOVERY_SUCCESS);
      expect(entries[0].data?.analyzerName).toBe('RecoveredAnalyzer');
      expect(entries[0].data?.recoveryStrategy).toBe('interface-fix');
    });

    it('should log recovery failure with error details', () => {
      const correlationId = 'test-correlation-id';
      const error = new Error('Recovery failed');
      
      logger.logRecoveryFailure('FailedAnalyzer', 'attempted-fix', error, correlationId);

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.ERROR);
      expect(entries[0].operation).toBe(RegistrationEvent.RECOVERY_FAILED);
      expect(entries[0].data?.recoveryStrategy).toBe('attempted-fix');
      expect(entries[0].error).toBeDefined();
    });
  });

  describe('Log Management', () => {
    it('should retrieve all log entries', () => {
      logger.logRegistrationStart('Analyzer1');
      logger.logRegistrationStart('Analyzer2');

      const entries = logger.getLogEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].data?.analyzerName).toBe('Analyzer1');
      expect(entries[1].data?.analyzerName).toBe('Analyzer2');
    });

    it('should retrieve log entries by correlation ID', () => {
      const correlationId1 = logger.logRegistrationStart('Analyzer1');
      const correlationId2 = logger.logRegistrationStart('Analyzer2');

      const entries1 = logger.getLogEntriesByCorrelation(correlationId1);
      const entries2 = logger.getLogEntriesByCorrelation(correlationId2);

      expect(entries1).toHaveLength(1);
      expect(entries2).toHaveLength(1);
      expect(entries1[0].data?.analyzerName).toBe('Analyzer1');
      expect(entries2[0].data?.analyzerName).toBe('Analyzer2');
    });

    it('should retrieve log entries by level', () => {
      logger.logRegistrationStart('Analyzer1'); // INFO
      logger.logInterfaceValidationFailure('BadAnalyzer', [], [], 'test-id'); // ERROR

      const infoEntries = logger.getLogEntriesByLevel(LogLevel.INFO);
      const errorEntries = logger.getLogEntriesByLevel(LogLevel.ERROR);

      expect(infoEntries).toHaveLength(1);
      expect(errorEntries).toHaveLength(1);
      expect(infoEntries[0].data?.analyzerName).toBe('Analyzer1');
      expect(errorEntries[0].data?.analyzerName).toBe('BadAnalyzer');
    });

    it('should clear all log entries', () => {
      logger.logRegistrationStart('Analyzer1');
      logger.logRegistrationStart('Analyzer2');

      expect(logger.getLogEntries()).toHaveLength(2);

      logger.clearLogs();

      expect(logger.getLogEntries()).toHaveLength(0);
    });

    it('should limit log entries to maximum configured', () => {
      const limitedLogger = createRegistrationLogger({
        enableConsoleOutput: false,
        maxLogEntries: 3
      });

      // Add more entries than the limit
      for (let i = 0; i < 5; i++) {
        limitedLogger.logRegistrationStart(`Analyzer${i}`);
      }

      const entries = limitedLogger.getLogEntries();
      expect(entries).toHaveLength(3);
      
      // Should keep the most recent entries
      expect(entries[0].data?.analyzerName).toBe('Analyzer2');
      expect(entries[1].data?.analyzerName).toBe('Analyzer3');
      expect(entries[2].data?.analyzerName).toBe('Analyzer4');
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect log level configuration', () => {
      const errorOnlyLogger = createRegistrationLogger({
        enableConsoleOutput: false,
        logLevel: LogLevel.ERROR
      });

      errorOnlyLogger.logRegistrationStart('Analyzer1'); // INFO - should be filtered
      errorOnlyLogger.logInterfaceValidationFailure('BadAnalyzer', [], [], 'test-id'); // ERROR - should be logged

      const entries = errorOnlyLogger.getLogEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.ERROR);
    });

    it('should include all levels up to configured level', () => {
      const warnLogger = createRegistrationLogger({
        enableConsoleOutput: false,
        logLevel: LogLevel.WARN
      });

      warnLogger.logRegistrationStart('Analyzer1'); // INFO - should be filtered
      warnLogger.logValidationComplete('Analyzer1', { isValid: false } as any, 'test-id'); // WARN - should be logged
      warnLogger.logInterfaceValidationFailure('BadAnalyzer', [], [], 'test-id'); // ERROR - should be logged

      const entries = warnLogger.getLogEntries();
      expect(entries).toHaveLength(2);
      expect(entries.some(e => e.level === LogLevel.WARN)).toBe(true);
      expect(entries.some(e => e.level === LogLevel.ERROR)).toBe(true);
      expect(entries.some(e => e.level === LogLevel.INFO)).toBe(false);
    });
  });

  describe('Console Output', () => {
    it('should output to console when enabled', () => {
      const consoleLogger = createRegistrationLogger({
        enableConsoleOutput: true,
        logLevel: LogLevel.DEBUG
      });

      consoleLogger.logRegistrationStart('TestAnalyzer');
      consoleLogger.logInterfaceValidationFailure('BadAnalyzer', [], [], 'test-id');

      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should not output to console when disabled', () => {
      const silentLogger = createRegistrationLogger({
        enableConsoleOutput: false,
        logLevel: LogLevel.DEBUG
      });

      silentLogger.logRegistrationStart('TestAnalyzer');
      silentLogger.logInterfaceValidationFailure('BadAnalyzer', [], [], 'test-id');

      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Diagnostics Report Generation', () => {
    it('should generate comprehensive diagnostics report', () => {
      // Add various log entries
      logger.logRegistrationStart('Analyzer1');
      logger.logInterfaceValidationFailure('BadAnalyzer1', ['analyze'], [], 'test-id-1');
      logger.logDependencyResolutionFailure('BadAnalyzer2', ['Dep1'], [], 'test-id-2');
      logger.logRegistrationStart('Analyzer2');

      const report = logger.generateDiagnosticsReport();

      expect(report.totalLogEntries).toBe(4);
      expect(report.errorCount).toBe(2);
      expect(report.warningCount).toBe(0);
      expect(report.analyzersWithIssues).toContain('BadAnalyzer1');
      expect(report.analyzersWithIssues).toContain('BadAnalyzer2');
      expect(report.issuesByAnalyzer).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });

    it('should handle empty log entries', () => {
      const report = logger.generateDiagnosticsReport();

      expect(report.totalLogEntries).toBe(0);
      expect(report.errorCount).toBe(0);
      expect(report.warningCount).toBe(0);
      expect(report.analyzersWithIssues).toHaveLength(0);
    });

    it('should group issues by analyzer', () => {
      logger.logInterfaceValidationFailure('ProblematicAnalyzer', ['analyze'], [], 'test-id-1');
      logger.logDependencyResolutionFailure('ProblematicAnalyzer', ['Dep1'], [], 'test-id-2');
      logger.logInterfaceValidationFailure('AnotherBadAnalyzer', ['getCapabilities'], [], 'test-id-3');

      const report = logger.generateDiagnosticsReport();

      expect(report.analyzersWithIssues).toContain('ProblematicAnalyzer');
      expect(report.analyzersWithIssues).toContain('AnotherBadAnalyzer');
      expect(report.issuesByAnalyzer['ProblematicAnalyzer']).toHaveLength(2);
      expect(report.issuesByAnalyzer['AnotherBadAnalyzer']).toHaveLength(1);
    });
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = logger.logRegistrationStart('Analyzer1');
      const id2 = logger.logRegistrationStart('Analyzer2');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^reg_\d+_\d+$/);
      expect(id2).toMatch(/^reg_\d+_\d+$/);
    });

    it('should use custom correlation ID prefix', () => {
      const customLogger = createRegistrationLogger({
        enableConsoleOutput: false,
        correlationIdPrefix: 'custom'
      });

      const id = customLogger.logRegistrationStart('TestAnalyzer');
      expect(id).toMatch(/^custom_\d+_\d+$/);
    });
  });
});