/**
 * Structured logging utility for the README Parser with detailed debugging information
 */

import { ParseErrorImpl } from './parse-error';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  error?: Error;
  correlationId?: string;
  performance?: PerformanceMetrics;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  operationName: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  enablePerformanceTracking: boolean;
  enableMemoryTracking: boolean;
  maxLogEntries: number;
}

/**
 * Structured logger class with debugging capabilities
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logEntries: LogEntry[] = [];
  private performanceTrackers = new Map<string, PerformanceMetrics>();

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enablePerformanceTracking: true,
      enableMemoryTracking: false,
      maxLogEntries: 1000,
      ...config
    };
  }

  /**
   * Get singleton logger instance
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Log debug message
   */
  debug(component: string, message: string, data?: any, correlationId?: string): void {
    this.log(LogLevel.DEBUG, component, message, data, undefined, correlationId);
  }

  /**
   * Log info message
   */
  info(component: string, message: string, data?: any, correlationId?: string): void {
    this.log(LogLevel.INFO, component, message, data, undefined, correlationId);
  }

  /**
   * Log warning message
   */
  warn(component: string, message: string, data?: any, correlationId?: string): void {
    this.log(LogLevel.WARN, component, message, data, undefined, correlationId);
  }

  /**
   * Log error message
   */
  error(component: string, message: string, error?: Error, data?: any, correlationId?: string): void {
    this.log(LogLevel.ERROR, component, message, data, error, correlationId);
  }

  /**
   * Log fatal error message
   */
  fatal(component: string, message: string, error?: Error, data?: any, correlationId?: string): void {
    this.log(LogLevel.FATAL, component, message, data, error, correlationId);
  }

  /**
   * Log ParseError with full context
   */
  logParseError(parseError: ParseErrorImpl, correlationId?: string): void {
    const level = parseError.severity === 'error' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, parseError.component, parseError.message, {
      code: parseError.code,
      category: parseError.category,
      line: parseError.line,
      column: parseError.column,
      details: parseError.details,
      isRecoverable: parseError.isRecoverable()
    }, undefined, correlationId);
  }

  /**
   * Start performance tracking for an operation
   */
  startPerformanceTracking(operationName: string, correlationId?: string): string {
    if (!this.config.enablePerformanceTracking) {
      return operationName;
    }

    const trackingId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metrics: PerformanceMetrics = {
      startTime: Date.now(),
      operationName,
      memoryUsage: this.config.enableMemoryTracking ? process.memoryUsage() : undefined
    };

    this.performanceTrackers.set(trackingId, metrics);
    this.debug('PerformanceTracker', `Started tracking: ${operationName}`, { trackingId }, correlationId);
    
    return trackingId;
  }

  /**
   * End performance tracking and log results
   */
  endPerformanceTracking(trackingId: string, correlationId?: string): PerformanceMetrics | null {
    if (!this.config.enablePerformanceTracking) {
      return null;
    }

    const metrics = this.performanceTrackers.get(trackingId);
    if (!metrics) {
      this.warn('PerformanceTracker', `No tracking found for ID: ${trackingId}`, { trackingId }, correlationId);
      return null;
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    if (this.config.enableMemoryTracking) {
      const currentMemory = process.memoryUsage();
      metrics.memoryUsage = {
        rss: currentMemory.rss - (metrics.memoryUsage?.rss || 0),
        heapTotal: currentMemory.heapTotal - (metrics.memoryUsage?.heapTotal || 0),
        heapUsed: currentMemory.heapUsed - (metrics.memoryUsage?.heapUsed || 0),
        external: currentMemory.external - (metrics.memoryUsage?.external || 0),
        arrayBuffers: currentMemory.arrayBuffers - (metrics.memoryUsage?.arrayBuffers || 0)
      };
    }

    this.info('PerformanceTracker', `Completed: ${metrics.operationName}`, {
      trackingId,
      duration: metrics.duration,
      memoryDelta: metrics.memoryUsage
    }, correlationId);

    this.performanceTrackers.delete(trackingId);
    return metrics;
  }

  /**
   * Log analyzer execution details
   */
  logAnalyzerExecution(
    analyzerName: string,
    status: 'started' | 'completed' | 'failed',
    data?: any,
    correlationId?: string
  ): void {
    const message = `Analyzer ${analyzerName} ${status}`;
    
    switch (status) {
      case 'started':
        this.debug('AnalyzerExecution', message, { analyzerName, ...data }, correlationId);
        break;
      case 'completed':
        this.info('AnalyzerExecution', message, { analyzerName, ...data }, correlationId);
        break;
      case 'failed':
        this.error('AnalyzerExecution', message, data?.error, { analyzerName, ...data }, correlationId);
        break;
    }
  }

  /**
   * Log parsing workflow steps
   */
  logParsingStep(
    step: string,
    status: 'started' | 'completed' | 'skipped' | 'failed',
    data?: any,
    correlationId?: string
  ): void {
    const message = `Parsing step '${step}' ${status}`;
    
    switch (status) {
      case 'started':
        this.debug('ParsingWorkflow', message, { step, ...data }, correlationId);
        break;
      case 'completed':
        this.info('ParsingWorkflow', message, { step, ...data }, correlationId);
        break;
      case 'skipped':
        this.warn('ParsingWorkflow', message, { step, ...data }, correlationId);
        break;
      case 'failed':
        this.error('ParsingWorkflow', message, data?.error, { step, ...data }, correlationId);
        break;
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    data?: any,
    error?: Error,
    correlationId?: string
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      error,
      correlationId
    };

    // Add to in-memory log entries
    this.logEntries.push(entry);
    
    // Maintain max log entries limit
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // File output (if configured)
    if (this.config.enableFile && this.config.filePath) {
      this.outputToFile(entry);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const prefix = `[${entry.timestamp}] ${levelName} [${entry.component}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.error || entry.data || '');
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  /**
   * Output log entry to file (placeholder - would need file system implementation)
   */
  private outputToFile(entry: LogEntry): void {
    // File logging implementation would go here
    // For now, this is a placeholder
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logEntries.slice(-count);
  }

  /**
   * Get logs by component
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.logEntries.filter(entry => entry.component === component);
  }

  /**
   * Get logs by correlation ID
   */
  getLogsByCorrelationId(correlationId: string): LogEntry[] {
    return this.logEntries.filter(entry => entry.correlationId === correlationId);
  }

  /**
   * Get error logs only
   */
  getErrorLogs(): LogEntry[] {
    return this.logEntries.filter(entry => entry.level >= LogLevel.ERROR);
  }

  /**
   * Clear all log entries
   */
  clearLogs(): void {
    this.logEntries = [];
    this.performanceTrackers.clear();
  }

  /**
   * Get logger statistics
   */
  getStatistics(): LoggerStatistics {
    const levelCounts = new Map<LogLevel, number>();
    const componentCounts = new Map<string, number>();

    this.logEntries.forEach(entry => {
      // Count by level
      const levelCount = levelCounts.get(entry.level) || 0;
      levelCounts.set(entry.level, levelCount + 1);

      // Count by component
      const componentCount = componentCounts.get(entry.component) || 0;
      componentCounts.set(entry.component, componentCount + 1);
    });

    return {
      totalEntries: this.logEntries.length,
      levelCounts: Object.fromEntries(levelCounts),
      componentCounts: Object.fromEntries(componentCounts),
      activePerformanceTrackers: this.performanceTrackers.size,
      oldestEntry: this.logEntries.length > 0 ? this.logEntries[0].timestamp : null,
      newestEntry: this.logEntries.length > 0 ? this.logEntries[this.logEntries.length - 1].timestamp : null
    };
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate correlation ID for request tracking
   */
  static generateCorrelationId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Logger statistics interface
 */
export interface LoggerStatistics {
  totalEntries: number;
  levelCounts: Record<string, number>;
  componentCounts: Record<string, number>;
  activePerformanceTrackers: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

/**
 * Default logger instance
 */
export const logger = Logger.getInstance();