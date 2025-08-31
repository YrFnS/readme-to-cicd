/**
 * Comprehensive Error Logging System for Analyzer Registration
 * 
 * Provides structured logging with correlation IDs, error categorization,
 * and detailed diagnostics for registration issues.
 */

import { 
  AnalyzerRegistrationBaseError, 
  extractErrorInfo, 
  isRegistrationError 
} from './registration-errors';
import { 
  RegistrationResult, 
  ValidationResult, 
  RegistrationState,
  ValidationIssue 
} from './enhanced-analyzer-registry';

/**
 * Log levels for registration events
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId: string;
  component: string;
  operation: string;
  data?: Record<string, any>;
  error?: Record<string, any>;
}

/**
 * Registration event types
 */
export enum RegistrationEvent {
  REGISTRATION_STARTED = 'registration_started',
  REGISTRATION_SUCCESS = 'registration_success',
  REGISTRATION_FAILED = 'registration_failed',
  VALIDATION_STARTED = 'validation_started',
  VALIDATION_COMPLETED = 'validation_completed',
  INTERFACE_VALIDATION_FAILED = 'interface_validation_failed',
  DEPENDENCY_RESOLUTION_FAILED = 'dependency_resolution_failed',
  REGISTRY_STATE_CHANGED = 'registry_state_changed',
  RECOVERY_ATTEMPTED = 'recovery_attempted',
  RECOVERY_SUCCESS = 'recovery_success',
  RECOVERY_FAILED = 'recovery_failed'
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  logLevel: LogLevel;
  includeStackTrace: boolean;
  maxLogEntries: number;
  correlationIdPrefix: string;
}

/**
 * Default logger configuration
 */
const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  enableConsoleOutput: true,
  enableFileOutput: false,
  logLevel: LogLevel.INFO,
  includeStackTrace: true,
  maxLogEntries: 1000,
  correlationIdPrefix: 'reg'
};

/**
 * Comprehensive registration logger
 */
export class RegistrationLogger {
  private config: LoggerConfig;
  private logEntries: LogEntry[] = [];
  private correlationCounter = 0;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
  }

  /**
   * Log registration start event
   */
  logRegistrationStart(analyzerName: string, correlationId?: string): string {
    const id = correlationId || this.generateCorrelationId();
    
    this.log(LogLevel.INFO, RegistrationEvent.REGISTRATION_STARTED, {
      message: `Starting registration for analyzer: ${analyzerName}`,
      correlationId: id,
      data: { analyzerName }
    });

    return id;
  }

  /**
   * Log successful registration
   */
  logRegistrationSuccess(result: RegistrationResult, correlationId: string): void {
    this.log(LogLevel.INFO, RegistrationEvent.REGISTRATION_SUCCESS, {
      message: `Successfully registered analyzer: ${result.analyzerName}`,
      correlationId,
      data: {
        analyzerName: result.analyzerName,
        registrationTimestamp: result.registrationTimestamp?.toISOString(),
        warnings: result.warnings,
        validationDetails: result.validationDetails
      }
    });
  }

  /**
   * Log registration failure
   */
  logRegistrationFailure(
    result: RegistrationResult, 
    error: Error | AnalyzerRegistrationBaseError, 
    correlationId: string
  ): void {
    const errorInfo = extractErrorInfo(error);
    
    this.log(LogLevel.ERROR, RegistrationEvent.REGISTRATION_FAILED, {
      message: `Failed to register analyzer: ${result.analyzerName}`,
      correlationId,
      data: {
        analyzerName: result.analyzerName,
        registrationError: result.error,
        validationDetails: result.validationDetails
      },
      error: errorInfo
    });

    // Log recovery suggestions if available
    if (isRegistrationError(error)) {
      const suggestions = error.getRecoverySuggestions();
      this.log(LogLevel.INFO, RegistrationEvent.RECOVERY_ATTEMPTED, {
        message: `Recovery suggestions for ${result.analyzerName}`,
        correlationId,
        data: { 
          analyzerName: result.analyzerName,
          suggestions 
        }
      });
    }
  }

  /**
   * Log validation start
   */
  logValidationStart(analyzerName: string, correlationId: string): void {
    this.log(LogLevel.DEBUG, RegistrationEvent.VALIDATION_STARTED, {
      message: `Starting validation for analyzer: ${analyzerName}`,
      correlationId,
      data: { analyzerName }
    });
  }

  /**
   * Log validation completion
   */
  logValidationComplete(
    analyzerName: string, 
    validationResult: ValidationResult, 
    correlationId: string
  ): void {
    const level = validationResult.isValid ? LogLevel.INFO : LogLevel.WARN;
    
    this.log(level, RegistrationEvent.VALIDATION_COMPLETED, {
      message: `Validation completed for analyzer: ${analyzerName}`,
      correlationId,
      data: {
        analyzerName,
        isValid: validationResult.isValid,
        totalAnalyzers: validationResult.totalAnalyzers,
        validAnalyzers: validationResult.validAnalyzers,
        invalidAnalyzers: validationResult.invalidAnalyzers,
        issues: validationResult.issues,
        recommendations: validationResult.recommendations
      }
    });
  }

  /**
   * Log interface validation failure
   */
  logInterfaceValidationFailure(
    analyzerName: string, 
    missingMethods: string[], 
    invalidMethods: string[],
    correlationId: string
  ): void {
    this.log(LogLevel.ERROR, RegistrationEvent.INTERFACE_VALIDATION_FAILED, {
      message: `Interface validation failed for analyzer: ${analyzerName}`,
      correlationId,
      data: {
        analyzerName,
        missingMethods,
        invalidMethods,
        totalIssues: missingMethods.length + invalidMethods.length
      }
    });
  }

  /**
   * Log dependency resolution failure
   */
  logDependencyResolutionFailure(
    analyzerName: string,
    missingDependencies: string[],
    circularDependencies: string[],
    correlationId: string
  ): void {
    this.log(LogLevel.ERROR, RegistrationEvent.DEPENDENCY_RESOLUTION_FAILED, {
      message: `Dependency resolution failed for analyzer: ${analyzerName}`,
      correlationId,
      data: {
        analyzerName,
        missingDependencies,
        circularDependencies,
        totalIssues: missingDependencies.length + circularDependencies.length
      }
    });
  }

  /**
   * Log registry state change
   */
  logRegistryStateChange(
    previousState: RegistrationState,
    newState: RegistrationState,
    correlationId: string
  ): void {
    this.log(LogLevel.DEBUG, RegistrationEvent.REGISTRY_STATE_CHANGED, {
      message: 'Registry state changed',
      correlationId,
      data: {
        previousAnalyzerCount: previousState.registeredAnalyzers.size,
        newAnalyzerCount: newState.registeredAnalyzers.size,
        previousValidationStatus: previousState.validationStatus,
        newValidationStatus: newState.validationStatus,
        failedRegistrationsCount: newState.failedRegistrations.length
      }
    });
  }

  /**
   * Log validation issues with detailed diagnostics
   */
  logValidationIssues(issues: ValidationIssue[], correlationId: string): void {
    issues.forEach(issue => {
      const level = issue.severity === 'error' ? LogLevel.ERROR : 
                   issue.severity === 'warning' ? LogLevel.WARN : LogLevel.INFO;
      
      this.log(level, `validation_issue_${issue.type}`, {
        message: `Validation issue for ${issue.analyzerName}: ${issue.message}`,
        correlationId,
        data: {
          analyzerName: issue.analyzerName,
          issueType: issue.type,
          severity: issue.severity,
          details: issue.details
        }
      });
    });
  }

  /**
   * Log recovery attempt
   */
  logRecoveryAttempt(
    analyzerName: string,
    recoveryStrategy: string,
    correlationId: string
  ): void {
    this.log(LogLevel.INFO, RegistrationEvent.RECOVERY_ATTEMPTED, {
      message: `Attempting recovery for analyzer: ${analyzerName}`,
      correlationId,
      data: {
        analyzerName,
        recoveryStrategy
      }
    });
  }

  /**
   * Log recovery success
   */
  logRecoverySuccess(
    analyzerName: string,
    recoveryStrategy: string,
    correlationId: string
  ): void {
    this.log(LogLevel.INFO, RegistrationEvent.RECOVERY_SUCCESS, {
      message: `Recovery successful for analyzer: ${analyzerName}`,
      correlationId,
      data: {
        analyzerName,
        recoveryStrategy
      }
    });
  }

  /**
   * Log recovery failure
   */
  logRecoveryFailure(
    analyzerName: string,
    recoveryStrategy: string,
    error: Error,
    correlationId: string
  ): void {
    this.log(LogLevel.ERROR, RegistrationEvent.RECOVERY_FAILED, {
      message: `Recovery failed for analyzer: ${analyzerName}`,
      correlationId,
      data: {
        analyzerName,
        recoveryStrategy
      },
      error: extractErrorInfo(error)
    });
  }

  /**
   * Get all log entries
   */
  getLogEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Get log entries by correlation ID
   */
  getLogEntriesByCorrelation(correlationId: string): LogEntry[] {
    return this.logEntries.filter(entry => entry.correlationId === correlationId);
  }

  /**
   * Get log entries by level
   */
  getLogEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }

  /**
   * Clear log entries
   */
  clearLogs(): void {
    this.logEntries = [];
  }

  /**
   * Generate registration diagnostics report
   */
  generateDiagnosticsReport(): RegistrationDiagnosticsReport {
    const errorEntries = this.getLogEntriesByLevel(LogLevel.ERROR);
    const warningEntries = this.getLogEntriesByLevel(LogLevel.WARN);
    
    const analyzerIssues = new Map<string, LogEntry[]>();
    
    [...errorEntries, ...warningEntries].forEach(entry => {
      const analyzerName = entry.data?.analyzerName || 'unknown';
      if (!analyzerIssues.has(analyzerName)) {
        analyzerIssues.set(analyzerName, []);
      }
      analyzerIssues.get(analyzerName)!.push(entry);
    });

    return {
      totalLogEntries: this.logEntries.length,
      errorCount: errorEntries.length,
      warningCount: warningEntries.length,
      analyzersWithIssues: Array.from(analyzerIssues.keys()),
      issuesByAnalyzer: Object.fromEntries(analyzerIssues),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Core logging method
   */
  log(level: LogLevel, operation: string, params: {
    message: string;
    correlationId: string;
    data?: Record<string, any>;
    error?: Record<string, any>;
  }): void {
    // Check if we should log this level
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message: params.message,
      timestamp: new Date().toISOString(),
      correlationId: params.correlationId,
      component: 'AnalyzerRegistry',
      operation,
      data: params.data,
      error: params.error
    };

    // Add to log entries
    this.logEntries.push(entry);

    // Trim log entries if needed
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }

    // Output to console if enabled
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Check if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.correlationId}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.data, entry.error);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
    }
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId(): string {
    return `${this.config.correlationIdPrefix}_${Date.now()}_${++this.correlationCounter}`;
  }
}

/**
 * Registration diagnostics report
 */
export interface RegistrationDiagnosticsReport {
  totalLogEntries: number;
  errorCount: number;
  warningCount: number;
  analyzersWithIssues: string[];
  issuesByAnalyzer: Record<string, LogEntry[]>;
  generatedAt: string;
}

/**
 * Default logger instance
 */
export const registrationLogger = new RegistrationLogger();

/**
 * Factory function to create a logger with custom configuration
 */
export function createRegistrationLogger(config?: Partial<LoggerConfig>): RegistrationLogger {
  return new RegistrationLogger(config);
}