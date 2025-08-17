/**
 * Logging Service
 * 
 * Centralized logging system with structured logging,
 * debugging capabilities, and troubleshooting support.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionConfiguration } from './types';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  operation: string;
  message: string;
  data?: any;
  error?: Error;
  correlationId?: string;
  userId?: string;
  sessionId: string;
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LoggingOptions {
  component: string;
  operation?: string;
  correlationId?: string;
  data?: any;
}

export interface LogFilter {
  level?: LogLevel;
  component?: string;
  operation?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
}

export class LoggingService {
  private logs: LogEntry[] = [];
  private outputChannel: vscode.OutputChannel;
  private logFile?: string;
  private sessionId: string;
  private currentCorrelationId?: string;

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: ExtensionConfiguration
  ) {
    this.outputChannel = vscode.window.createOutputChannel('README-to-CICD Logs');
    this.sessionId = this.generateSessionId();
    
    this.setupLogFile();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Log error message
   */
  error(message: string, options: LoggingOptions, error?: Error): void {
    this.log(LogLevel.ERROR, message, options, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, options: LoggingOptions): void {
    this.log(LogLevel.WARN, message, options);
  }

  /**
   * Log info message
   */
  info(message: string, options: LoggingOptions): void {
    this.log(LogLevel.INFO, message, options);
  }

  /**
   * Log debug message
   */
  debug(message: string, options: LoggingOptions): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  /**
   * Log trace message
   */
  trace(message: string, options: LoggingOptions): void {
    this.log(LogLevel.TRACE, message, options);
  }

  /**
   * Start operation logging with correlation ID
   */
  startOperation(operationName: string, component: string, data?: any): string {
    const correlationId = this.generateCorrelationId();
    this.currentCorrelationId = correlationId;

    this.info(`Starting operation: ${operationName}`, {
      component,
      operation: operationName,
      correlationId,
      data
    });

    return correlationId;
  }

  /**
   * End operation logging
   */
  endOperation(
    correlationId: string,
    operationName: string,
    component: string,
    success: boolean,
    duration: number,
    result?: any,
    error?: Error
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Operation ${operationName} ${success ? 'completed' : 'failed'} in ${duration}ms`;

    this.log(level, message, {
      component,
      operation: operationName,
      correlationId,
      data: { success, duration, result }
    }, error);

    if (this.currentCorrelationId === correlationId) {
      this.currentCorrelationId = undefined;
    }
  }

  /**
   * Log with automatic operation context
   */
  withOperation<T>(
    operationName: string,
    component: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.withOperationSync(operationName, component, operation);
  }

  /**
   * Log with automatic operation context (sync version)
   */
  async withOperationSync<T>(
    operationName: string,
    component: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const correlationId = this.startOperation(operationName, component);
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.endOperation(correlationId, operationName, component, true, duration, result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.endOperation(
        correlationId,
        operationName,
        component,
        false,
        duration,
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get logs with filtering
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level <= filter.level!);
      }

      if (filter.component) {
        filteredLogs = filteredLogs.filter(log => 
          log.component.toLowerCase().includes(filter.component!.toLowerCase())
        );
      }

      if (filter.operation) {
        filteredLogs = filteredLogs.filter(log => 
          log.operation.toLowerCase().includes(filter.operation!.toLowerCase())
        );
      }

      if (filter.timeRange) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.timeRange!.start && 
          log.timestamp <= filter.timeRange!.end
        );
      }

      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
        );
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get logs for specific operation
   */
  getOperationLogs(correlationId: string): LogEntry[] {
    return this.logs
      .filter(log => log.correlationId === correlationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Show logs in output channel
   */
  showLogs(filter?: LogFilter): void {
    const logs = this.getLogs(filter);
    
    this.outputChannel.clear();
    this.outputChannel.appendLine('=== README-to-CICD Logs ===\n');

    for (const log of logs) {
      this.outputChannel.appendLine(this.formatLogEntry(log));
    }

    this.outputChannel.show();
  }

  /**
   * Export logs to file
   */
  async exportLogs(filter?: LogFilter): Promise<string> {
    const logs = this.getLogs(filter);
    
    const exportData = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      version: this.context.extension.packageJSON.version,
      filter,
      logs: logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
        error: log.error ? {
          name: log.error.name,
          message: log.error.message,
          stack: log.error.stack
        } : undefined
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear old logs
   */
  clearLogs(olderThanDays: number = 7): number {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
    
    return initialCount - this.logs.length;
  }

  /**
   * Get logging statistics
   */
  getStatistics(): LoggingStatistics {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp > last24Hours);

    const byLevel = {
      error: recentLogs.filter(log => log.level === LogLevel.ERROR).length,
      warn: recentLogs.filter(log => log.level === LogLevel.WARN).length,
      info: recentLogs.filter(log => log.level === LogLevel.INFO).length,
      debug: recentLogs.filter(log => log.level === LogLevel.DEBUG).length,
      trace: recentLogs.filter(log => log.level === LogLevel.TRACE).length
    };

    const byComponent: Record<string, number> = {};
    for (const log of recentLogs) {
      byComponent[log.component] = (byComponent[log.component] || 0) + 1;
    }

    const operations = recentLogs
      .filter(log => log.correlationId)
      .reduce((acc, log) => {
        if (!acc[log.correlationId!]) {
          acc[log.correlationId!] = [];
        }
        acc[log.correlationId!].push(log);
        return acc;
      }, {} as Record<string, LogEntry[]>);

    return {
      totalLogs: this.logs.length,
      recentLogs: recentLogs.length,
      byLevel,
      byComponent,
      operationCount: Object.keys(operations).length,
      averageLogsPerOperation: Object.keys(operations).length > 0 
        ? recentLogs.filter(log => log.correlationId).length / Object.keys(operations).length 
        : 0,
      sessionId: this.sessionId,
      logFileSize: this.getLogFileSize()
    };
  }

  /**
   * Create debug package for troubleshooting
   */
  async createDebugPackage(): Promise<string> {
    const debugData = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      version: this.context.extension.packageJSON.version,
      configuration: this.sanitizeConfiguration(),
      statistics: this.getStatistics(),
      recentLogs: this.getLogs({
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        }
      }).slice(0, 1000), // Last 1000 logs
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        vscodeVersion: vscode.version
      }
    };

    return JSON.stringify(debugData, null, 2);
  }

  private log(level: LogLevel, message: string, options: LoggingOptions, error?: Error): void {
    // Check if we should log at this level
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component: options.component,
      operation: options.operation || 'unknown',
      message,
      data: options.data,
      error,
      correlationId: options.correlationId || this.currentCorrelationId,
      sessionId: this.sessionId
    };

    // Add to memory logs
    this.logs.push(entry);

    // Limit memory logs to prevent memory leaks
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000); // Keep last 5000
    }

    // Write to output channel
    this.outputChannel.appendLine(this.formatLogEntry(entry));

    // Write to file if configured
    if (this.logFile && this.configuration.enableFileLogging) {
      this.writeToFile(entry);
    }

    // Console logging for development
    if (this.configuration.debugMode) {
      this.writeToConsole(entry);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const configLevel = this.getConfiguredLogLevel();
    return level <= configLevel;
  }

  private getConfiguredLogLevel(): LogLevel {
    const levelString = this.configuration.logLevel || 'info';
    
    switch (levelString.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      case 'trace': return LogLevel.TRACE;
      default: return LogLevel.INFO;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const component = entry.component.padEnd(15);
    const operation = entry.operation.padEnd(20);
    const correlationId = entry.correlationId ? `[${entry.correlationId.substr(-8)}]` : '';
    
    let formatted = `${timestamp} ${level} ${component} ${operation} ${correlationId} ${entry.message}`;

    if (entry.data) {
      formatted += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      formatted += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += `\n  Stack: ${entry.error.stack}`;
      }
    }

    return formatted;
  }

  private writeToConsole(entry: LogEntry): void {
    const message = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.log(message);
        break;
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.logFile) return;

    try {
      const formatted = this.formatLogEntry(entry) + '\n';
      fs.appendFileSync(this.logFile, formatted);
    } catch (error) {
      // Avoid infinite recursion by not logging this error
      console.error('Failed to write to log file:', error);
    }
  }

  private setupLogFile(): void {
    if (!this.configuration.enableFileLogging) {
      return;
    }

    try {
      const logDir = path.join(this.context.globalStorageUri.fsPath, 'logs');
      
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFileName = `readme-to-cicd-${new Date().toISOString().split('T')[0]}.log`;
      this.logFile = path.join(logDir, logFileName);

      // Clean up old log files
      this.cleanupOldLogFiles(logDir);

    } catch (error) {
      console.error('Failed to setup log file:', error);
    }
  }

  private cleanupOldLogFiles(logDir: string): void {
    try {
      const files = fs.readdirSync(logDir);
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      for (const file of files) {
        if (file.startsWith('readme-to-cicd-') && file.endsWith('.log')) {
          const filePath = path.join(logDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoff) {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }

  private getLogFileSize(): number {
    if (!this.logFile || !fs.existsSync(this.logFile)) {
      return 0;
    }

    try {
      const stats = fs.statSync(this.logFile);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Capture unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.error('Unhandled promise rejection', {
        component: 'global',
        operation: 'unhandled-rejection',
        data: { promise: promise.toString() }
      }, reason instanceof Error ? reason : new Error(String(reason)));
    });

    // Capture uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.error('Uncaught exception', {
        component: 'global',
        operation: 'uncaught-exception'
      }, error);
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeConfiguration(): any {
    // Remove sensitive information from configuration
    const sanitized = { ...this.configuration };
    
    // Remove any potential secrets or sensitive data
    delete sanitized.apiKeys;
    delete sanitized.tokens;
    delete sanitized.credentials;
    
    return sanitized;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

// Additional interfaces
interface LoggingStatistics {
  totalLogs: number;
  recentLogs: number;
  byLevel: {
    error: number;
    warn: number;
    info: number;
    debug: number;
    trace: number;
  };
  byComponent: Record<string, number>;
  operationCount: number;
  averageLogsPerOperation: number;
  sessionId: string;
  logFileSize: number;
}