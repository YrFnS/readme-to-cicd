import winston from 'winston';
import { randomUUID } from 'crypto';

/**
 * Central Logger Interface
 * Provides structured logging with correlation ID support
 */
export interface ICentralLogger {
  error(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
  setCorrelationId(correlationId: string): void;
  getCorrelationId(): string | undefined;
}

/**
 * Logger Configuration Interface
 */
export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  outputs: ('console' | 'file')[];
  filePath?: string;
  enableCorrelationId?: boolean;
}

/**
 * Default logger configuration based on environment
 */
const getDefaultConfig = (): LoggerConfig => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return {
    level: isDevelopment ? 'debug' : 'info',
    format: isDevelopment ? 'simple' : 'json',
    outputs: isDevelopment ? ['console'] : ['console', 'file'],
    filePath: 'logs/application.log',
    enableCorrelationId: true
  };
};

/**
 * Central Logger Implementation
 * Winston-based logger with structured JSON output and correlation ID support
 */
export class CentralLogger implements ICentralLogger {
  private logger: winston.Logger;
  private correlationId?: string;
  private config: LoggerConfig;
  private fallbackToConsole: boolean = false;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...getDefaultConfig(), ...config };
    this.logger = this.createWinstonLogger();
  }

  /**
   * Create Winston logger instance with configuration
   */
  private createWinstonLogger(): winston.Logger {
    try {
      const transports: winston.transport[] = [];

      // Console transport
      if (this.config.outputs.includes('console')) {
        transports.push(new winston.transports.Console({
          format: this.getLogFormat()
        }));
      }

      // File transport
      if (this.config.outputs.includes('file') && this.config.filePath) {
        transports.push(new winston.transports.File({
          filename: this.config.filePath,
          format: this.getLogFormat()
        }));
      }

      return winston.createLogger({
        level: this.config.level,
        transports,
        exitOnError: false,
        handleExceptions: true,
        handleRejections: true
      });
    } catch (error) {
      // Fallback to console logging if Winston setup fails
      this.fallbackToConsole = true;
      console.warn('Winston logger setup failed, falling back to console logging:', error);
      
      // Return a minimal logger that won't throw errors
      return winston.createLogger({
        level: this.config.level,
        transports: [new winston.transports.Console()],
        exitOnError: false
      });
    }
  }

  /**
   * Get log format based on configuration
   */
  private getLogFormat(): winston.Logform.Format {
    const baseFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true })
    );

    if (this.config.format === 'json') {
      return winston.format.combine(
        baseFormat,
        winston.format.json()
      );
    } else {
      return winston.format.combine(
        baseFormat,
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const correlationPart = this.correlationId ? ` [${this.correlationId}]` : '';
          const metaPart = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}:${correlationPart} ${message}${metaPart}`;
        })
      );
    }
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    return this.correlationId;
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    const correlationId = randomUUID();
    this.setCorrelationId(correlationId);
    return correlationId;
  }

  /**
   * Create log entry with correlation ID and context
   */
  private createLogEntry(message: string, context?: Record<string, any>): Record<string, any> {
    const entry: Record<string, any> = {
      message,
      ...context
    };

    if (this.config.enableCorrelationId && this.correlationId) {
      entry.correlationId = this.correlationId;
    }

    return entry;
  }

  /**
   * Fallback console logging when Winston fails
   */
  private fallbackLog(level: string, message: string, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const correlationPart = this.correlationId ? ` [${this.correlationId}]` : '';
    const contextPart = context ? ` ${JSON.stringify(context)}` : '';
    
    console.log(`${timestamp} ${level.toUpperCase()}:${correlationPart} ${message}${contextPart}`);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>): void {
    try {
      if (this.fallbackToConsole) {
        this.fallbackLog('error', message, context);
        return;
      }
      
      const entry = this.createLogEntry(message, context);
      this.logger.error(entry);
    } catch (error) {
      // Ultimate fallback to console.error
      console.error('Logger error:', error);
      console.error('Original message:', message, context);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    try {
      if (this.fallbackToConsole) {
        this.fallbackLog('warn', message, context);
        return;
      }
      
      const entry = this.createLogEntry(message, context);
      this.logger.warn(entry);
    } catch (error) {
      console.warn('Logger error:', error);
      console.warn('Original message:', message, context);
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    try {
      if (this.fallbackToConsole) {
        this.fallbackLog('info', message, context);
        return;
      }
      
      const entry = this.createLogEntry(message, context);
      this.logger.info(entry);
    } catch (error) {
      console.info('Logger error:', error);
      console.info('Original message:', message, context);
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    try {
      if (this.fallbackToConsole) {
        this.fallbackLog('debug', message, context);
        return;
      }
      
      const entry = this.createLogEntry(message, context);
      this.logger.debug(entry);
    } catch (error) {
      console.debug('Logger error:', error);
      console.debug('Original message:', message, context);
    }
  }
}

/**
 * Default logger instance
 * Can be used throughout the application for consistent logging
 */
export const logger = new CentralLogger();

/**
 * Create a new logger instance with custom configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): ICentralLogger {
  return new CentralLogger(config);
}

/**
 * Logger factory for creating component-specific loggers
 */
export class LoggerFactory {
  private static instances: Map<string, ICentralLogger> = new Map();

  /**
   * Get or create a logger for a specific component
   */
  static getLogger(component: string, config?: Partial<LoggerConfig>): ICentralLogger {
    if (!this.instances.has(component)) {
      const componentConfig: Partial<LoggerConfig> = {
        ...config,
        // Add component name to all log entries
        format: 'json' as const // Force JSON for component loggers to include metadata
      };
      
      const componentLogger = new CentralLogger(componentConfig);
      this.instances.set(component, componentLogger);
    }

    return this.instances.get(component)!;
  }

  /**
   * Clear all cached logger instances
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}