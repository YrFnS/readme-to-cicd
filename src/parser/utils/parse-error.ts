/**
 * Comprehensive error handling classes and utilities for the README Parser
 */

import { ParseError, ErrorSeverity } from '../types';

/**
 * Enhanced ParseError class with categorized error types and detailed context
 */
export class ParseErrorImpl extends Error implements ParseError {
  public readonly code: string;
  public readonly component: string;
  public readonly severity: ErrorSeverity;
  public readonly details?: any;
  public readonly line?: number | undefined;
  public readonly column?: number | undefined;
  public readonly timestamp: string;
  public readonly category: ErrorCategory;

  constructor(
    code: string,
    message: string,
    component: string,
    severity: ErrorSeverity = 'error',
    options: {
      details?: any;
      line?: number;
      column?: number;
      category?: ErrorCategory;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'ParseError';
    this.code = code;
    this.component = component;
    this.severity = severity;
    this.details = options.details;
    this.line = options.line;
    this.column = options.column;
    this.timestamp = new Date().toISOString();
    this.category = options.category || this.categorizeError(code);

    // Maintain error stack trace
    if (options.cause) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ParseErrorImpl.prototype);
  }

  /**
   * Automatically categorize error based on error code
   */
  private categorizeError(code: string): ErrorCategory {
    if (code.includes('VALIDATION') || code.includes('INVALID')) {
      return 'validation';
    }
    if (code.includes('FILE') || code.includes('PATH') || code.includes('ACCESS')) {
      return 'file-system';
    }
    if (code.includes('PARSE') || code.includes('MARKDOWN') || code.includes('SYNTAX')) {
      return 'parsing';
    }
    if (code.includes('ANALYZER') || code.includes('DETECTION')) {
      return 'analysis';
    }
    if (code.includes('CONFIG') || code.includes('SETTING')) {
      return 'configuration';
    }
    if (code.includes('TIMEOUT') || code.includes('MEMORY') || code.includes('RESOURCE')) {
      return 'system';
    }
    return 'unknown';
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): ParseError {
    return {
      code: this.code,
      message: this.message,
      component: this.component,
      severity: this.severity,
      details: this.details,
      ...(this.line !== undefined && { line: this.line }),
      ...(this.column !== undefined && { column: this.column })
    };
  }

  /**
   * Create a user-friendly error message
   */
  toUserMessage(): string {
    let message = this.message;
    
    if (this.line !== undefined) {
      message += ` (line ${this.line}`;
      if (this.column !== undefined) {
        message += `, column ${this.column}`;
      }
      message += ')';
    }

    return message;
  }



  /**
   * Check if this error is recoverable
   */
  get isRecoverable(): boolean {
    return this.severity === 'warning' || 
           this.category === 'analysis' ||
           this.code.includes('PARTIAL');
  }
}

/**
 * Error categories for better error handling and recovery
 */
export type ErrorCategory = 
  | 'validation'      // Input validation errors
  | 'file-system'     // File access and I/O errors
  | 'parsing'         // Markdown parsing errors
  | 'analysis'        // Content analysis errors
  | 'configuration'   // Configuration and setup errors
  | 'system'          // System resource errors
  | 'unknown';        // Uncategorized errors

/**
 * Error factory for creating standardized errors
 */
export class ErrorFactory {
  /**
   * Create a validation error
   */
  static validation(
    code: string,
    message: string,
    component: string,
    details?: any
  ): ParseErrorImpl {
    return new ParseErrorImpl(code, message, component, 'error', {
      category: 'validation',
      details
    });
  }

  /**
   * Create a file system error
   */
  static fileSystem(
    code: string,
    message: string,
    component: string,
    filePath?: string,
    cause?: Error
  ): ParseErrorImpl {
    return new ParseErrorImpl(code, message, component, 'error', {
      category: 'file-system',
      details: { filePath },
      ...(cause && { cause })
    });
  }

  /**
   * Create a parsing error
   */
  static parsing(
    code: string,
    message: string,
    component: string,
    line?: number,
    column?: number,
    details?: any
  ): ParseErrorImpl {
    return new ParseErrorImpl(code, message, component, 'error', {
      category: 'parsing',
      ...(line !== undefined && { line }),
      ...(column !== undefined && { column }),
      details
    });
  }

  /**
   * Create an analysis error (usually recoverable)
   */
  static analysis(
    code: string,
    message: string,
    component: string,
    severity: ErrorSeverity = 'warning',
    details?: any
  ): ParseErrorImpl {
    return new ParseErrorImpl(code, message, component, severity, {
      category: 'analysis',
      details
    });
  }

  /**
   * Create a system error
   */
  static system(
    code: string,
    message: string,
    component: string,
    details?: any,
    cause?: Error
  ): ParseErrorImpl {
    return new ParseErrorImpl(code, message, component, 'error', {
      category: 'system',
      details,
      ...(cause && { cause })
    });
  }

  /**
   * Create a configuration error
   */
  static configuration(
    code: string,
    message: string,
    component: string,
    details?: any
  ): ParseErrorImpl {
    return new ParseErrorImpl(code, message, component, 'error', {
      category: 'configuration',
      details
    });
  }
}

/**
 * Error recovery strategies and utilities
 */
export class ErrorRecovery {
  /**
   * Determine if parsing can continue after an error
   */
  static canRecover(error: ParseErrorImpl): boolean {
    // Always recoverable for warnings
    if (error.severity === 'warning') {
      return true;
    }

    // Recoverable error categories
    const recoverableCategories: ErrorCategory[] = ['analysis', 'parsing'];
    if (recoverableCategories.includes(error.category)) {
      return true;
    }

    // Specific recoverable error codes
    const recoverableCodes = [
      'PARTIAL_ANALYSIS',
      'ANALYZER_TIMEOUT',
      'MALFORMED_SECTION',
      'UNKNOWN_LANGUAGE',
      'MISSING_DEPENDENCY_INFO',
      'INCOMPLETE_COMMAND_EXTRACTION'
    ];

    return recoverableCodes.includes(error.code);
  }

  /**
   * Get recovery strategy for an error
   */
  static getRecoveryStrategy(error: ParseErrorImpl): RecoveryStrategy {
    if (!this.canRecover(error)) {
      return 'abort';
    }

    switch (error.category) {
      case 'analysis':
        return 'skip-analyzer';
      case 'parsing':
        return 'partial-parse';
      case 'validation':
        return 'sanitize-input';
      case 'file-system':
        return 'abort';
      case 'system':
        return 'abort';
      case 'configuration':
        return 'continue';
      default:
        return 'continue';
    }
  }

  /**
   * Apply recovery strategy
   */
  static applyRecovery(
    error: ParseErrorImpl,
    context: RecoveryContext
  ): RecoveryResult {
    const strategy = this.getRecoveryStrategy(error);

    switch (strategy) {
      case 'skip-analyzer':
        return {
          action: 'skip',
          message: `Skipping analyzer ${context.analyzerName} due to error: ${error.message}`,
          continueProcessing: true
        };

      case 'partial-parse':
        return {
          action: 'partial',
          message: `Continuing with partial results due to parsing error: ${error.message}`,
          continueProcessing: true
        };

      case 'sanitize-input':
        return {
          action: 'sanitize',
          message: `Sanitizing input and retrying due to validation error: ${error.message}`,
          continueProcessing: true
        };

      case 'continue':
        return {
          action: 'continue',
          message: `Continuing processing despite error: ${error.message}`,
          continueProcessing: true
        };

      case 'abort':
      default:
        return {
          action: 'abort',
          message: `Aborting processing due to unrecoverable error: ${error.message}`,
          continueProcessing: false
        };
    }
  }
}

/**
 * Recovery strategy types
 */
export type RecoveryStrategy = 
  | 'skip-analyzer'    // Skip the failing analyzer
  | 'partial-parse'    // Continue with partial results
  | 'sanitize-input'   // Clean input and retry
  | 'continue'         // Continue processing
  | 'abort';           // Stop processing

/**
 * Recovery context information
 */
export interface RecoveryContext {
  analyzerName?: string;
  filePath?: string;
  contentLength?: number;
  attemptNumber?: number;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  action: string;
  message: string;
  continueProcessing: boolean;
  retryData?: any;
}

/**
 * Error aggregation utilities
 */
export class ErrorAggregator {
  private errors: ParseErrorImpl[] = [];
  private warnings: ParseErrorImpl[] = [];

  /**
   * Add an error to the aggregator
   */
  addError(error: ParseErrorImpl): void {
    if (error.severity === 'warning') {
      this.warnings.push(error);
    } else {
      this.errors.push(error);
    }
  }

  /**
   * Add multiple errors
   */
  addErrors(errors: ParseErrorImpl[]): void {
    errors.forEach(error => this.addError(error));
  }

  /**
   * Get all errors
   */
  getErrors(): ParseErrorImpl[] {
    return [...this.errors];
  }

  /**
   * Get all warnings
   */
  getWarnings(): ParseErrorImpl[] {
    return [...this.warnings];
  }

  /**
   * Get all errors and warnings combined
   */
  getAll(): ParseErrorImpl[] {
    return [...this.errors, ...this.warnings];
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.errors.some(error => error.severity === 'error');
  }

  /**
   * Get error summary
   */
  getSummary(): ErrorSummary {
    const errorsByCategory = new Map<ErrorCategory, number>();
    const errorsBySeverity = new Map<ErrorSeverity, number>();

    this.getAll().forEach(error => {
      // Count by category
      const categoryCount = errorsByCategory.get(error.category) || 0;
      errorsByCategory.set(error.category, categoryCount + 1);

      // Count by severity
      const severityCount = errorsBySeverity.get(error.severity) || 0;
      errorsBySeverity.set(error.severity, severityCount + 1);
    });

    return {
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      errorsByCategory: Object.fromEntries(errorsByCategory),
      errorsBySeverity: Object.fromEntries(errorsBySeverity),
      hasRecoverableErrors: this.getAll().some(error => error.isRecoverable)
    };
  }

  /**
   * Clear all errors and warnings
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
  }
}

/**
 * Error summary interface
 */
export interface ErrorSummary {
  totalErrors: number;
  totalWarnings: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  hasRecoverableErrors: boolean;
}