/**
 * Comprehensive logging and debugging system for YAML generation
 */

import { GenerationError, GenerationStage } from '../errors/generation-errors';
import { DetectionResult } from '../interfaces';
import { WorkflowTemplate } from '../types';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  stage: GenerationStage;
  message: string;
  context: Record<string, any>;
  correlationId: string;
  sessionId: string;
  error?: GenerationError;
  duration?: number;
  metadata?: LogMetadata;
}

/**
 * Log metadata
 */
export interface LogMetadata {
  userId?: string;
  projectId?: string;
  workflowType?: string;
  frameworkCount?: number;
  templateName?: string;
  optimizationLevel?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryStart: number;
  memoryEnd?: number;
  memoryPeak: number;
  cpuStart: number;
  cpuEnd?: number;
  stageMetrics: Map<GenerationStage, StageMetrics>;
}

/**
 * Stage-specific metrics
 */
export interface StageMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage: number;
  errors: number;
  warnings: number;
  retries: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * Debug context
 */
export interface DebugContext {
  detectionResult?: DetectionResult;
  generationOptions?: Record<string, any>;
  templateHierarchy?: string[];
  fallbacksUsed?: string[];
  optimizationsApplied?: string[];
  validationResults?: Record<string, any>;
  partialResults?: Record<string, any>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  enableStructuredLogging: boolean;
  enablePerformanceTracking: boolean;
  enableDebugContext: boolean;
  logFilePath?: string;
  maxLogFileSize: number;
  maxLogFiles: number;
  correlationIdGenerator?: () => string;
  sessionIdGenerator?: () => string;
  sensitiveFields: string[];
  redactionPattern: string;
}

/**
 * Default logger configuration
 */
const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: 'info',
  enableConsoleOutput: true,
  enableFileOutput: false,
  enableStructuredLogging: true,
  enablePerformanceTracking: true,
  enableDebugContext: true,
  maxLogFileSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5,
  sensitiveFields: ['password', 'token', 'key', 'secret', 'credential'],
  redactionPattern: '[REDACTED]'
};

/**
 * Generation logger with comprehensive debugging capabilities
 */
export class GenerationLogger {
  private config: LoggerConfig;
  private logEntries: LogEntry[] = [];
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private debugContext: Map<string, DebugContext> = new Map();
  private currentCorrelationId: string = '';
  private currentSessionId: string = '';

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
    this.currentSessionId = this.generateSessionId();
  }

  /**
   * Start a new generation session
   */
  startSession(correlationId?: string): string {
    this.currentCorrelationId = correlationId || this.generateCorrelationId();
    this.currentSessionId = this.generateSessionId();
    
    this.info('generation-session', 'initialization', 'Generation session started', {
      correlationId: this.currentCorrelationId,
      sessionId: this.currentSessionId
    });

    if (this.config.enablePerformanceTracking) {
      this.startPerformanceTracking(this.currentCorrelationId);
    }

    return this.currentCorrelationId;
  }

  /**
   * End the current generation session
   */
  endSession(success: boolean, result?: any): void {
    if (this.config.enablePerformanceTracking) {
      this.endPerformanceTracking(this.currentCorrelationId);
    }

    this.info('generation-session', 'output', 'Generation session ended', {
      success,
      correlationId: this.currentCorrelationId,
      sessionId: this.currentSessionId,
      totalLogEntries: this.logEntries.length,
      result: this.sanitizeForLogging(result)
    });
  }

  /**
   * Log debug message
   */
  debug(component: string, stage: GenerationStage, message: string, context: Record<string, any> = {}): void {
    this.log('debug', component, stage, message, context);
  }

  /**
   * Log info message
   */
  info(component: string, stage: GenerationStage, message: string, context: Record<string, any> = {}): void {
    this.log('info', component, stage, message, context);
  }

  /**
   * Log warning message
   */
  warn(component: string, stage: GenerationStage, message: string, context: Record<string, any> = {}): void {
    this.log('warn', component, stage, message, context);
  }

  /**
   * Log error message
   */
  error(component: string, stage: GenerationStage, message: string, error?: GenerationError, context: Record<string, any> = {}): void {
    this.log('error', component, stage, message, context, error);
  }

  /**
   * Log trace message for detailed debugging
   */
  trace(component: string, stage: GenerationStage, message: string, context: Record<string, any> = {}): void {
    this.log('trace', component, stage, message, context);
  }

  /**
   * Log stage start
   */
  stageStart(component: string, stage: GenerationStage, context: Record<string, any> = {}): void {
    this.info(component, stage, `Stage '${stage}' started`, context);
    
    if (this.config.enablePerformanceTracking) {
      this.startStageTracking(this.currentCorrelationId, stage);
    }
  }

  /**
   * Log stage end
   */
  stageEnd(component: string, stage: GenerationStage, success: boolean, context: Record<string, any> = {}): void {
    const message = `Stage '${stage}' ${success ? 'completed' : 'failed'}`;
    
    if (success) {
      this.info(component, stage, message, context);
    } else {
      this.warn(component, stage, message, context);
    }

    if (this.config.enablePerformanceTracking) {
      this.endStageTracking(this.currentCorrelationId, stage, success);
    }
  }

  /**
   * Log template fallback usage
   */
  templateFallback(
    component: string, 
    originalTemplate: string, 
    fallbackTemplate: string, 
    reason: string,
    context: Record<string, any> = {}
  ): void {
    this.warn(component, 'template-loading', 'Template fallback used', {
      originalTemplate,
      fallbackTemplate,
      reason,
      ...context
    });

    // Update debug context
    this.updateDebugContext(this.currentCorrelationId, {
      fallbacksUsed: [...(this.getDebugContext(this.currentCorrelationId)?.fallbacksUsed || []), 
                      `${originalTemplate} -> ${fallbackTemplate}`]
    });
  }

  /**
   * Log optimization application
   */
  optimizationApplied(
    component: string,
    optimizationType: string,
    impact: string,
    context: Record<string, any> = {}
  ): void {
    this.info(component, 'optimization', 'Optimization applied', {
      optimizationType,
      impact,
      ...context
    });

    // Update debug context
    this.updateDebugContext(this.currentCorrelationId, {
      optimizationsApplied: [...(this.getDebugContext(this.currentCorrelationId)?.optimizationsApplied || []), 
                            `${optimizationType}: ${impact}`]
    });
  }

  /**
   * Log validation results
   */
  validationResult(
    component: string,
    validationType: string,
    isValid: boolean,
    errors: string[],
    warnings: string[],
    context: Record<string, any> = {}
  ): void {
    const level = isValid ? 'info' : 'warn';
    const message = `Validation '${validationType}' ${isValid ? 'passed' : 'failed'}`;
    
    this.log(level, component, 'validation', message, {
      validationType,
      isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors.slice(0, 5), // Limit to first 5 errors
      warnings: warnings.slice(0, 5), // Limit to first 5 warnings
      ...context
    });

    // Update debug context
    this.updateDebugContext(this.currentCorrelationId, {
      validationResults: {
        ...this.getDebugContext(this.currentCorrelationId)?.validationResults,
        [validationType]: { isValid, errorCount: errors.length, warningCount: warnings.length }
      }
    });
  }

  /**
   * Log partial generation result
   */
  partialGeneration(
    component: string,
    completedStages: GenerationStage[],
    failedStage: GenerationStage,
    isUsable: boolean,
    context: Record<string, any> = {}
  ): void {
    this.warn(component, failedStage, 'Partial generation completed', {
      completedStages,
      failedStage,
      isUsable,
      completionPercentage: (completedStages.length / (completedStages.length + 1)) * 100,
      ...context
    });

    // Update debug context
    this.updateDebugContext(this.currentCorrelationId, {
      partialResults: {
        completedStages,
        failedStage,
        isUsable
      }
    });
  }

  /**
   * Log cache hit/miss
   */
  cacheEvent(component: string, cacheType: string, hit: boolean, key: string, context: Record<string, any> = {}): void {
    this.debug(component, 'template-loading', `Cache ${hit ? 'hit' : 'miss'}`, {
      cacheType,
      hit,
      key,
      ...context
    });

    if (this.config.enablePerformanceTracking) {
      this.recordCacheEvent(this.currentCorrelationId, 'template-loading', hit);
    }
  }

  /**
   * Log retry attempt
   */
  retryAttempt(
    component: string,
    stage: GenerationStage,
    attempt: number,
    maxAttempts: number,
    reason: string,
    context: Record<string, any> = {}
  ): void {
    this.warn(component, stage, `Retry attempt ${attempt}/${maxAttempts}`, {
      attempt,
      maxAttempts,
      reason,
      ...context
    });

    if (this.config.enablePerformanceTracking) {
      this.recordRetry(this.currentCorrelationId, stage);
    }
  }

  /**
   * Set debug context for the current session
   */
  setDebugContext(context: Partial<DebugContext>): void {
    this.updateDebugContext(this.currentCorrelationId, context);
  }

  /**
   * Get debug context for a correlation ID
   */
  getDebugContext(correlationId: string): DebugContext | undefined {
    return this.debugContext.get(correlationId);
  }

  /**
   * Get performance metrics for a correlation ID
   */
  getPerformanceMetrics(correlationId: string): PerformanceMetrics | undefined {
    return this.performanceMetrics.get(correlationId);
  }

  /**
   * Get all log entries for the current session
   */
  getSessionLogs(): LogEntry[] {
    return this.logEntries.filter(entry => entry.sessionId === this.currentSessionId);
  }

  /**
   * Get log entries by correlation ID
   */
  getCorrelationLogs(correlationId: string): LogEntry[] {
    return this.logEntries.filter(entry => entry.correlationId === correlationId);
  }

  /**
   * Get log entries by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    totalErrors: number;
    errorsByStage: Record<GenerationStage, number>;
    errorsByComponent: Record<string, number>;
    criticalErrors: GenerationError[];
  } {
    const errorEntries = this.logEntries.filter(entry => entry.level === 'error');
    const errorsByStage: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};
    const criticalErrors: GenerationError[] = [];

    errorEntries.forEach(entry => {
      errorsByStage[entry.stage] = (errorsByStage[entry.stage] || 0) + 1;
      errorsByComponent[entry.component] = (errorsByComponent[entry.component] || 0) + 1;
      
      if (entry.error && !entry.error.recoverable) {
        criticalErrors.push(entry.error);
      }
    });

    return {
      totalErrors: errorEntries.length,
      errorsByStage: errorsByStage as Record<GenerationStage, number>,
      errorsByComponent,
      criticalErrors
    };
  }

  /**
   * Export logs in various formats
   */
  exportLogs(format: 'json' | 'csv' | 'text' = 'json'): string {
    const logs = this.getSessionLogs();
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      case 'csv':
        return this.logsToCSV(logs);
      case 'text':
        return this.logsToText(logs);
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Clear logs (keep only recent entries)
   */
  clearLogs(keepRecent: number = 1000): void {
    if (this.logEntries.length > keepRecent) {
      this.logEntries = this.logEntries.slice(-keepRecent);
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    component: string,
    stage: GenerationStage,
    message: string,
    context: Record<string, any> = {},
    error?: GenerationError
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      component,
      stage,
      message,
      context: this.sanitizeForLogging(context),
      correlationId: this.currentCorrelationId,
      sessionId: this.currentSessionId,
      ...(error && { error }),
      metadata: this.collectMetadata()
    };

    this.logEntries.push(logEntry);

    if (this.config.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }

    if (this.config.enableFileOutput && this.config.logFilePath) {
      this.outputToFile(logEntry);
    }
  }

  /**
   * Check if we should log at this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      trace: 0, debug: 1, info: 2, warn: 3, error: 4
    };
    return levels[level] >= levels[this.config.level];
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeForLogging(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.config.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        (sanitized as any)[key] = this.config.redactionPattern;
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeForLogging(value);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    if (this.config.enableStructuredLogging) {
      console.log(JSON.stringify(entry));
    } else {
      const timestamp = entry.timestamp.toISOString();
      const level = entry.level.toUpperCase().padEnd(5);
      const component = entry.component.padEnd(20);
      const stage = entry.stage.padEnd(15);
      
      console.log(`${timestamp} ${level} [${component}] [${stage}] ${entry.message}`);
      
      if (Object.keys(entry.context).length > 0) {
        console.log('  Context:', entry.context);
      }
      
      if (entry.error) {
        console.log('  Error:', entry.error.toLogFormat());
      }
    }
  }

  /**
   * Output log entry to file
   */
  private outputToFile(entry: LogEntry): void {
    // File output implementation would go here
    // For now, just a placeholder
  }

  /**
   * Start performance tracking
   */
  private startPerformanceTracking(correlationId: string): void {
    const metrics: PerformanceMetrics = {
      startTime: Date.now(),
      memoryStart: this.getMemoryUsage(),
      memoryPeak: this.getMemoryUsage(),
      cpuStart: this.getCPUUsage(),
      stageMetrics: new Map()
    };
    
    this.performanceMetrics.set(correlationId, metrics);
  }

  /**
   * End performance tracking
   */
  private endPerformanceTracking(correlationId: string): void {
    const metrics = this.performanceMetrics.get(correlationId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.memoryEnd = this.getMemoryUsage();
      metrics.cpuEnd = this.getCPUUsage();
    }
  }

  /**
   * Start stage tracking
   */
  private startStageTracking(correlationId: string, stage: GenerationStage): void {
    const metrics = this.performanceMetrics.get(correlationId);
    if (metrics) {
      const stageMetrics: StageMetrics = {
        startTime: Date.now(),
        memoryUsage: this.getMemoryUsage(),
        errors: 0,
        warnings: 0,
        retries: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
      
      metrics.stageMetrics.set(stage, stageMetrics);
      
      // Update peak memory
      if (stageMetrics.memoryUsage > metrics.memoryPeak) {
        metrics.memoryPeak = stageMetrics.memoryUsage;
      }
    }
  }

  /**
   * End stage tracking
   */
  private endStageTracking(correlationId: string, stage: GenerationStage, success: boolean): void {
    const metrics = this.performanceMetrics.get(correlationId);
    if (metrics) {
      const stageMetrics = metrics.stageMetrics.get(stage);
      if (stageMetrics) {
        stageMetrics.endTime = Date.now();
        stageMetrics.duration = stageMetrics.endTime - stageMetrics.startTime;
        
        if (!success) {
          stageMetrics.errors++;
        }
      }
    }
  }

  /**
   * Record cache event
   */
  private recordCacheEvent(correlationId: string, stage: GenerationStage, hit: boolean): void {
    const metrics = this.performanceMetrics.get(correlationId);
    if (metrics) {
      const stageMetrics = metrics.stageMetrics.get(stage);
      if (stageMetrics) {
        if (hit) {
          stageMetrics.cacheHits++;
        } else {
          stageMetrics.cacheMisses++;
        }
      }
    }
  }

  /**
   * Record retry
   */
  private recordRetry(correlationId: string, stage: GenerationStage): void {
    const metrics = this.performanceMetrics.get(correlationId);
    if (metrics) {
      const stageMetrics = metrics.stageMetrics.get(stage);
      if (stageMetrics) {
        stageMetrics.retries++;
      }
    }
  }

  /**
   * Update debug context
   */
  private updateDebugContext(correlationId: string, context: Partial<DebugContext>): void {
    const existing = this.debugContext.get(correlationId) || {};
    this.debugContext.set(correlationId, { ...existing, ...context });
  }

  /**
   * Collect metadata
   */
  private collectMetadata(): LogMetadata {
    return {
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage()
    };
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Get CPU usage
   */
  private getCPUUsage(): number {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return usage.user + usage.system;
    }
    return 0;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    if (this.config.correlationIdGenerator) {
      return this.config.correlationIdGenerator();
    }
    return `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    if (this.config.sessionIdGenerator) {
      return this.config.sessionIdGenerator();
    }
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert logs to CSV format
   */
  private logsToCSV(logs: LogEntry[]): string {
    const headers = ['timestamp', 'level', 'component', 'stage', 'message', 'correlationId'];
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.component,
      log.stage,
      log.message.replace(/"/g, '""'),
      log.correlationId
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Convert logs to text format
   */
  private logsToText(logs: LogEntry[]): string {
    return logs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const component = log.component.padEnd(20);
      const stage = log.stage.padEnd(15);
      
      let text = `${timestamp} ${level} [${component}] [${stage}] ${log.message}`;
      
      if (Object.keys(log.context).length > 0) {
        text += `\n  Context: ${JSON.stringify(log.context)}`;
      }
      
      if (log.error) {
        text += `\n  Error: ${log.error.message}`;
      }
      
      return text;
    }).join('\n\n');
  }
}