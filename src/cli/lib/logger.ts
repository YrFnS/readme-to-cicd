/**
 * Structured Logger for CLI Tool
 * 
 * Implements structured logging with JSON format as specified in the error handling standards.
 * Supports different log levels and includes correlation IDs for request tracking.
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  context?: Record<string, any>;
}

export class Logger {
  private correlationId: string;
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
    this.correlationId = this.generateCorrelationId();
  }

  /**
   * Log error level messages
   */
  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  /**
   * Log warning level messages
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log info level messages
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log debug level messages
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Set the current log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Set the current log level (alias for setLogLevel)
   */
  setLevel(level: LogLevel): void {
    this.setLogLevel(level);
  }

  /**
   * Generate a new correlation ID for request tracking
   */
  generateCorrelationId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Internal logging method with structured JSON output
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      ...(context && { context })
    };

    // Output structured JSON for production, readable format for development
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`);
    }
  }

  /**
   * Check if a log level should be output based on current log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    return levels[level] <= levels[this.logLevel];
  }
}