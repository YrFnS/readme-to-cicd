import { logger } from '../../shared/logging/central-logger';

/**
 * Structured logging system for framework detection
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
  executionTime?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStructured: boolean;
  sanitizeSecrets: boolean;
  maxContextSize: number;
}

/**
 * Default logger configuration
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: 'info',
  enableConsole: true,
  enableStructured: true,
  sanitizeSecrets: true,
  maxContextSize: 1000
};

/**
 * Structured logger for detection operations
 */
export class DetectionLogger {
  private config: LoggerConfig;
  private logEntries: LogEntry[] = [];
  private correlationId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    this.correlationId = this.generateCorrelationId();
  }

  /**
   * Log debug message
   */
  debug(component: string, message: string, context?: Record<string, any>): void {
    this.log('debug', component, message, context);
  }

  /**
   * Log info message
   */
  info(component: string, message: string, context?: Record<string, any>): void {
    this.log('info', component, message, context);
  }

  /**
   * Log warning message
   */
  warn(component: string, message: string, context?: Record<string, any>): void {
    this.log('warn', component, message, context);
  }

  /**
   * Log error message
   */
  error(component: string, message: string, error?: Error, context?: Record<string, any>): void {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : {};

    this.log('error', component, message, { ...context, ...errorContext });
  }

  /**
   * Log operation timing
   */
  time(component: string, operation: string, executionTime: number, context?: Record<string, any>): void {
    this.log('info', component, `${operation} completed`, {
      ...context,
      executionTime,
      operation
    });
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: Record<string, any>): DetectionLogger {
    const childLogger = new DetectionLogger(this.config);
    childLogger.correlationId = this.correlationId;
    
    // Override log method to include additional context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level, component, message, context) => {
      originalLog(level, component, message, { ...additionalContext, ...context });
    };

    return childLogger;
  }

  /**
   * Get all log entries
   */
  getLogEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Get log entries by level
   */
  getLogEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }

  /**
   * Get log entries by component
   */
  getLogEntriesByComponent(component: string): LogEntry[] {
    return this.logEntries.filter(entry => entry.component === component);
  }

  /**
   * Clear log entries
   */
  clearLogs(): void {
    this.logEntries = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, component: string, message: string, context?: Record<string, any>): void {
    // Check if log level is enabled
    if (!this.isLevelEnabled(level)) {
      return;
    }

    // Sanitize context
    const sanitizedContext = this.sanitizeContext(context);

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      correlationId: this.correlationId,
      ...(sanitizedContext && { context: sanitizedContext })
    };

    // Store log entry
    this.logEntries.push(logEntry);

    // Output to console if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }
  }

  /**
   * Check if log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) {return undefined;}

    const sanitized = { ...context };

    if (this.config.sanitizeSecrets) {
      // Remove or mask sensitive keys
      const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
      
      for (const [key, value] of Object.entries(sanitized)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'string' && value.length > this.config.maxContextSize) {
          sanitized[key] = value.substring(0, this.config.maxContextSize) + '...[TRUNCATED]';
        }
      }
    }

    return sanitized;
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(logEntry: LogEntry): void {
    if (this.config.enableStructured) {
      // Structured JSON output
      console.log(JSON.stringify(logEntry));
    } else {
      // Human-readable output
      const timestamp = logEntry.timestamp;
      const level = logEntry.level.toUpperCase().padEnd(5);
      const component = logEntry.component.padEnd(20);
      const message = logEntry.message;
      
      let output = `${timestamp} ${level} [${component}] ${message}`;
      
      if (logEntry.context) {
        output += ` ${JSON.stringify(logEntry.context)}`;
      }
      
      // Use appropriate console method
      switch (logEntry.level) {
        case 'debug':
          logger.debug('FrameworkDetection', output);
          break;
        case 'info':
          logger.info('FrameworkDetection', output);
          break;
        case 'warn':
          logger.warn('FrameworkDetection', output);
          break;
        case 'error':
          logger.error('FrameworkDetection', output);
          break;
      }
    }
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global logger instance
 */
let globalLogger: DetectionLogger | null = null;

/**
 * Get or create global logger instance
 */
export function getLogger(config?: Partial<LoggerConfig>): DetectionLogger {
  if (!globalLogger || config) {
    globalLogger = new DetectionLogger(config);
  }
  return globalLogger;
}

/**
 * Create a new logger instance
 */
export function createLogger(config?: Partial<LoggerConfig>): DetectionLogger {
  return new DetectionLogger(config);
}

/**
 * Utility function for timing operations
 */
export async function timeOperation<T>(
  logger: DetectionLogger,
  component: string,
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    logger.debug(component, `Starting ${operation}`, context);
    const result = await fn();
    const executionTime = Date.now() - startTime;
    
    logger.time(component, operation, executionTime, context);
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error(component, `${operation} failed after ${executionTime}ms`, error as Error, context);
    throw error;
  }
}

/**
 * Utility function for safe logging of objects
 */
export function safeStringify(obj: any, __maxDepth: number = 3): string {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}