/**
 * Telemetry Manager for CLI Operations
 * 
 * Tracks usage patterns, performance metrics, and success rates
 * for continuous improvement and monitoring
 */

export interface TelemetryEvent {
  eventType: 'command_executed' | 'fallback_triggered' | 'error_occurred' | 'performance_metric';
  timestamp: Date;
  sessionId: string;
  data: Record<string, any>;
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  stepTimes: {
    parsing: number;
    detection: number;
    generation: number;
    output: number;
  };
  fallbackUsed: boolean;
  filesGenerated: number;
  workflowTypes: string[];
  detectedLanguages: string[];
}

export interface UsageStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  fallbackUsage: number;
  averageExecutionTime: number;
  mostCommonLanguages: string[];
  mostCommonWorkflowTypes: string[];
}

export class TelemetryManager {
  private events: TelemetryEvent[] = [];
  private isEnabled: boolean = true;
  private maxEvents: number = 1000;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  /**
   * Record command execution telemetry
   */
  recordCommandExecution(
    command: string,
    success: boolean,
    executionTime: number,
    options: any,
    result: any
  ): void {
    if (!this.isEnabled) return;

    this.addEvent('command_executed', {
      command,
      success,
      executionTime,
      dryRun: options.dryRun || false,
      usedFallback: options.useFallback || false,
      timeout: options.timeout || 15,
      filesGenerated: result.generatedFiles?.length || 0,
      workflowTypes: result.summary?.workflowsGenerated || 0,
      detectedLanguages: result.summary?.frameworksDetected || [],
      errors: result.errors?.length || 0,
      warnings: result.warnings?.length || 0
    });
  }

  /**
   * Record fallback usage
   */
  recordFallbackUsage(
    reason: 'timeout' | 'error' | 'user_choice',
    originalError?: string,
    fallbackMethod?: string
  ): void {
    if (!this.isEnabled) return;

    this.addEvent('fallback_triggered', {
      reason,
      originalError,
      fallbackMethod,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    if (!this.isEnabled) return;

    this.addEvent('performance_metric', {
      ...metrics,
      efficiency: this.calculateEfficiency(metrics),
      performanceGrade: this.calculatePerformanceGrade(metrics.totalExecutionTime)
    });
  }

  /**
   * Record error occurrence
   */
  recordError(
    errorType: string,
    errorMessage: string,
    stackTrace?: string,
    context?: any
  ): void {
    if (!this.isEnabled) return;

    this.addEvent('error_occurred', {
      errorType,
      errorMessage: errorMessage.substring(0, 500), // Limit message length
      hasStackTrace: !!stackTrace,
      context: context ? JSON.stringify(context).substring(0, 1000) : undefined
    });
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats {
    const commandEvents = this.events.filter(e => e.eventType === 'command_executed');
    const fallbackEvents = this.events.filter(e => e.eventType === 'fallback_triggered');
    
    const totalCommands = commandEvents.length;
    const successfulCommands = commandEvents.filter(e => e.data.success).length;
    const failedCommands = totalCommands - successfulCommands;
    
    // Calculate average execution time
    const executionTimes = commandEvents.map(e => e.data.executionTime).filter(t => t > 0);
    const averageExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length 
      : 0;

    // Get most common languages and workflow types
    const languages = commandEvents.flatMap(e => e.data.detectedLanguages || []);
    const workflowTypes = commandEvents.flatMap(e => e.data.workflowTypes || []);

    return {
      totalCommands,
      successfulCommands,
      failedCommands,
      fallbackUsage: fallbackEvents.length,
      averageExecutionTime: Math.round(averageExecutionTime),
      mostCommonLanguages: this.getMostCommon(languages),
      mostCommonWorkflowTypes: this.getMostCommon(workflowTypes)
    };
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(): any {
    const performanceEvents = this.events.filter(e => e.eventType === 'performance_metric');
    
    if (performanceEvents.length === 0) {
      return { message: 'No performance data available yet' };
    }

    const avgTotalTime = this.average(performanceEvents.map(e => e.data.totalExecutionTime));
    const avgStepTimes = {
      parsing: this.average(performanceEvents.map(e => e.data.stepTimes?.parsing || 0)),
      detection: this.average(performanceEvents.map(e => e.data.stepTimes?.detection || 0)),
      generation: this.average(performanceEvents.map(e => e.data.stepTimes?.generation || 0)),
      output: this.average(performanceEvents.map(e => e.data.stepTimes?.output || 0))
    };

    const fallbackUsageRate = (performanceEvents.filter(e => e.data.fallbackUsed).length / performanceEvents.length) * 100;

    return {
      averageTotalTime: Math.round(avgTotalTime),
      averageStepTimes: {
        parsing: Math.round(avgStepTimes.parsing),
        detection: Math.round(avgStepTimes.detection),
        generation: Math.round(avgStepTimes.generation),
        output: Math.round(avgStepTimes.output)
      },
      fallbackUsageRate: Math.round(fallbackUsageRate),
      performanceGrade: this.calculatePerformanceGrade(avgTotalTime),
      recommendation: this.getPerformanceRecommendation(avgTotalTime, fallbackUsageRate)
    };
  }

  /**
   * Export telemetry data for analysis
   */
  exportTelemetryData(): { 
    events: TelemetryEvent[], 
    stats: UsageStats, 
    insights: any,
    exportedAt: Date 
  } {
    return {
      events: this.events.slice(),
      stats: this.getUsageStats(),
      insights: this.getPerformanceInsights(),
      exportedAt: new Date()
    };
  }

  /**
   * Clear telemetry data (for privacy/testing)
   */
  clearTelemetryData(): void {
    this.events = [];
  }

  /**
   * Add telemetry event
   */
  private addEvent(eventType: TelemetryEvent['eventType'], data: Record<string, any>): void {
    const event: TelemetryEvent = {
      eventType,
      timestamp: new Date(),
      sessionId: this.generateSessionId(),
      data
    };

    this.events.push(event);

    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `tel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiency(metrics: PerformanceMetrics): number {
    const baseScore = 100;
    const timeDeduction = Math.min(metrics.totalExecutionTime / 10, 50); // Max 50 point deduction
    const fallbackDeduction = metrics.fallbackUsed ? 10 : 0;
    
    return Math.max(baseScore - timeDeduction - fallbackDeduction, 0);
  }

  /**
   * Calculate performance grade
   */
  private calculatePerformanceGrade(executionTime: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (executionTime <= 100) return 'A';      // Excellent: <= 100ms
    if (executionTime <= 500) return 'B';      // Good: <= 500ms
    if (executionTime <= 2000) return 'C';     // Fair: <= 2s
    if (executionTime <= 10000) return 'D';    // Poor: <= 10s
    return 'F';                                 // Fail: > 10s
  }

  /**
   * Get performance recommendation
   */
  private getPerformanceRecommendation(avgTime: number, fallbackRate: number): string {
    if (avgTime <= 200 && fallbackRate <= 10) {
      return 'Excellent performance! System is running optimally.';
    }
    if (fallbackRate > 50) {
      return 'High fallback usage detected. Consider optimizing framework detection.';
    }
    if (avgTime > 2000) {
      return 'Slow execution times detected. Consider reducing timeout or improving detection efficiency.';
    }
    return 'Performance is within acceptable ranges.';
  }

  /**
   * Get most common items from array
   */
  private getMostCommon(items: string[]): string[] {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([item]) => item);
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }
}