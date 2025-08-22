import {
  AgentHooksError,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  ErrorRecovery,
  RecoveryStrategy,
  EscalationLevel,
  RetryConfig,
  CircuitBreakerConfig,
  ErrorThreshold,
  ThresholdAction,
  ErrorMetrics,
  ErrorPattern,
  NetworkError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  ProcessingError,
  ConfigurationError,
  TimeoutError,
  SecurityError
} from '../types/errors';

export class ErrorHandler {
  private errors: Map<string, AgentHooksError> = new Map();
  private retryConfigs: Map<ErrorCategory, RetryConfig> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorThresholds: ErrorThreshold[] = [];
  private errorPatterns: Map<string, ErrorPattern> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Handle an error with comprehensive processing
   */
  async handleError(
    error: Error,
    context?: Partial<ErrorContext>
  ): Promise<ErrorRecovery> {
    const agentError = this.createAgentError(error, context);

    // Store the error
    this.errors.set(agentError.id, agentError);

    // Log the error
    this.logError(agentError);

    // Analyze patterns
    this.analyzeErrorPatterns(agentError);

    // Check thresholds
    await this.checkErrorThresholds(agentError);

    // Determine recovery strategy
    const recovery = this.determineRecoveryStrategy(agentError);

    // Apply recovery
    await this.applyRecoveryStrategy(agentError, recovery);

    return recovery;
  }

  /**
   * Create a structured AgentHooksError from a raw error
   */
  private createAgentError(
    error: Error,
    context?: Partial<ErrorContext>
  ): AgentHooksError {
    const category = this.categorizeError(error);
    const severity = this.assessSeverity(error, category);

    const result: AgentHooksError = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      category,
      severity,
      message: error.message,
      details: error
    };

    if (error.stack) {
      result.stackTrace = error.stack;
    }

    if (context) {
      result.context = {
        component: context.component || 'unknown',
        operation: context.operation || 'unknown',
        ...(context.repository && { repository: context.repository }),
        ...(context.userId && { userId: context.userId }),
        ...(context.webhookEventId && { webhookEventId: context.webhookEventId }),
        ...(context.ruleId && { ruleId: context.ruleId }),
        ...(context.jobId && { jobId: context.jobId }),
        ...(context.metadata && { metadata: context.metadata })
      };
    }

    return result;
  }

  /**
   * Categorize an error based on its type and content
   */
  private categorizeError(error: Error): ErrorCategory {
    if (error instanceof NetworkError) return ErrorCategory.NETWORK;
    if (error instanceof AuthenticationError) return ErrorCategory.AUTHENTICATION;
    if (error instanceof RateLimitError) return ErrorCategory.RATE_LIMIT;
    if (error instanceof ValidationError) return ErrorCategory.VALIDATION;
    if (error instanceof ProcessingError) return ErrorCategory.PROCESSING;
    if (error instanceof ConfigurationError) return ErrorCategory.CONFIGURATION;
    if (error instanceof TimeoutError) return ErrorCategory.TIMEOUT;
    if (error instanceof SecurityError) return ErrorCategory.SECURITY;

    // Pattern-based categorization
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT;
    }

    if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('authentication')) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }

    if (message.includes('security') || message.includes('vulnerability')) {
      return ErrorCategory.SECURITY;
    }

    return ErrorCategory.PROCESSING; // Default category
  }

  /**
   * Assess the severity of an error
   */
  private assessSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    if (error instanceof SecurityError) return ErrorSeverity.CRITICAL;
    if (error instanceof AuthenticationError) return ErrorSeverity.HIGH;
    if (error instanceof ConfigurationError) return ErrorSeverity.HIGH;

    if (category === ErrorCategory.SECURITY) return ErrorSeverity.CRITICAL;
    if (category === ErrorCategory.AUTHENTICATION) return ErrorSeverity.HIGH;
    if (category === ErrorCategory.RATE_LIMIT) return ErrorSeverity.MEDIUM;
    if (category === ErrorCategory.TIMEOUT) return ErrorSeverity.MEDIUM;
    if (category === ErrorCategory.VALIDATION) return ErrorSeverity.LOW;

    return ErrorSeverity.MEDIUM; // Default severity
  }

  /**
   * Log an error with appropriate level
   */
  private logError(agentError: AgentHooksError): void {
    const logMessage = `[${agentError.category.toUpperCase()}] ${agentError.severity.toUpperCase()}: ${agentError.message}`;

    switch (agentError.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, agentError);
        break;
      case ErrorSeverity.HIGH:
        console.error(logMessage, agentError);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, agentError);
        break;
      case ErrorSeverity.LOW:
        console.info(logMessage, agentError);
        break;
    }
  }

  /**
   * Determine recovery strategy for an error
   */
  private determineRecoveryStrategy(agentError: AgentHooksError): ErrorRecovery {
    const retryConfig = this.retryConfigs.get(agentError.category);
    const circuitBreaker = this.getCircuitBreakerState(agentError.context?.component || 'default');

    // Check circuit breaker
    if (circuitBreaker && circuitBreaker.state === 'open') {
      return {
        strategy: RecoveryStrategy.ESCALATE,
        retryCount: 0,
        maxRetries: 0,
        escalationRequired: true,
        escalationLevel: EscalationLevel.TEAM
      };
    }

    // Determine strategy based on error category and severity
    let strategy: RecoveryStrategy;
    let maxRetries = 0;
    let escalationRequired = false;
    let escalationLevel: EscalationLevel | undefined;

    switch (agentError.category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        strategy = RecoveryStrategy.RETRY;
        maxRetries = retryConfig?.maxAttempts || 3;
        break;

      case ErrorCategory.RATE_LIMIT:
        strategy = RecoveryStrategy.RETRY;
        maxRetries = 5; // Higher retry count for rate limits
        break;

      case ErrorCategory.AUTHENTICATION:
        strategy = RecoveryStrategy.ESCALATE;
        escalationRequired = true;
        escalationLevel = EscalationLevel.ADMIN;
        break;

      case ErrorCategory.SECURITY:
        strategy = RecoveryStrategy.ESCALATE;
        escalationRequired = true;
        escalationLevel = EscalationLevel.SECURITY;
        break;

      case ErrorCategory.VALIDATION:
        strategy = RecoveryStrategy.FALLBACK;
        break;

      default:
        strategy = RecoveryStrategy.RETRY;
        maxRetries = retryConfig?.maxAttempts || 2;
        if (agentError.severity === ErrorSeverity.HIGH) {
          escalationRequired = true;
          escalationLevel = EscalationLevel.TEAM;
        }
    }

    return {
      strategy,
      retryCount: 0,
      maxRetries,
      escalationRequired,
      escalationLevel: escalationLevel!
    };
  }

  /**
   * Apply recovery strategy
   */
  private async applyRecoveryStrategy(
    agentError: AgentHooksError,
    recovery: ErrorRecovery
  ): Promise<void> {
    switch (recovery.strategy) {
      case RecoveryStrategy.RETRY:
        await this.scheduleRetry(agentError, recovery);
        break;

      case RecoveryStrategy.FALLBACK:
        await this.executeFallback(agentError);
        break;

      case RecoveryStrategy.ESCALATE:
        await this.escalateError(agentError, recovery);
        break;

      case RecoveryStrategy.IGNORE:
        // Do nothing
        break;

      default:
        console.warn(`Unknown recovery strategy: ${recovery.strategy}`);
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private async scheduleRetry(
    agentError: AgentHooksError,
    recovery: ErrorRecovery
  ): Promise<void> {
    const retryConfig = this.retryConfigs.get(agentError.category) || this.getDefaultRetryConfig();

    // Calculate delay with exponential backoff
    const delay = Math.min(
      retryConfig.initialDelay * Math.pow(retryConfig.backoffFactor, recovery.retryCount),
      retryConfig.maxDelay
    );

    // Add jitter if enabled
    const jitteredDelay = retryConfig.jitter
      ? delay * (0.5 + Math.random() * 0.5)
      : delay;

    recovery.nextRetryTime = new Date(Date.now() + jitteredDelay);

    console.log(`Scheduled retry for error ${agentError.id} in ${jitteredDelay}ms`);
  }

  /**
   * Execute fallback action
   */
  private async executeFallback(agentError: AgentHooksError): Promise<void> {
    // Implement fallback actions based on error type
    switch (agentError.category) {
      case ErrorCategory.VALIDATION:
        console.log(`Fallback: Using default values for validation error ${agentError.id}`);
        break;

      default:
        console.log(`Fallback: Graceful degradation for error ${agentError.id}`);
    }
  }

  /**
   * Escalate error to appropriate team
   */
  private async escalateError(
    agentError: AgentHooksError,
    recovery: ErrorRecovery
  ): Promise<void> {
    const escalationMessage = `ERROR ESCALATION [${recovery.escalationLevel?.toUpperCase()}]: ${agentError.message}`;

    console.error(escalationMessage, agentError);

    // Here you would integrate with notification systems
    // (Slack, email, pager duty, etc.)
  }

  /**
   * Analyze error patterns for recurring issues
   */
  private analyzeErrorPatterns(agentError: AgentHooksError): void {
    const patternKey = `${agentError.category}:${agentError.message.split(' ')[0]}`;

    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        pattern: patternKey,
        count: 0,
        firstSeen: agentError.timestamp,
        lastSeen: agentError.timestamp,
        impact: agentError.severity
      });
    }

    const pattern = this.errorPatterns.get(patternKey)!;
    pattern.count++;
    pattern.lastSeen = agentError.timestamp;

    // Generate suggested actions for recurring patterns
    if (pattern.count > 5) {
      pattern.suggestedAction = this.generatePatternSuggestion(pattern);
    }
  }

  /**
   * Check error thresholds and trigger actions
   */
  private async checkErrorThresholds(agentError: AgentHooksError): Promise<void> {
    const now = Date.now();

    for (const threshold of this.errorThresholds) {
      if (threshold.category === agentError.category && threshold.severity === agentError.severity) {
        // Count errors in the threshold window
        const recentErrors = Array.from(this.errors.values())
          .filter(error =>
            error.category === threshold.category &&
            error.severity === threshold.severity &&
            (now - error.timestamp.getTime()) < threshold.window
          );

        if (recentErrors.length >= threshold.count) {
          await this.triggerThresholdAction(threshold, recentErrors);
        }
      }
    }
  }

  /**
   * Trigger threshold action
   */
  private async triggerThresholdAction(
    threshold: ErrorThreshold,
    errors: AgentHooksError[]
  ): Promise<void> {
    switch (threshold.action) {
      case ThresholdAction.ALERT:
        console.warn(`Error threshold exceeded: ${threshold.category} ${threshold.severity} (${errors.length} errors)`);
        break;

      case ThresholdAction.ESCALATE:
        console.error(`Error threshold critical: Escalating ${threshold.category} ${threshold.severity}`);
        // Implement escalation logic
        break;

      case ThresholdAction.DISABLE:
        console.error(`Error threshold critical: Disabling component for ${threshold.category}`);
        // Implement component disabling logic
        break;

      case ThresholdAction.THROTTLE:
        console.warn(`Error threshold: Throttling operations for ${threshold.category}`);
        // Implement throttling logic
        break;
    }
  }

  // Circuit breaker implementation
  private getCircuitBreakerState(component: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(component);
  }

  // Helper methods
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true
    };
  }

  private generatePatternSuggestion(pattern: ErrorPattern): string {
    if (pattern.pattern.includes('rate limit')) {
      return 'Consider implementing request queuing or reducing API call frequency';
    }
    if (pattern.pattern.includes('timeout')) {
      return 'Consider increasing timeout values or implementing async processing';
    }
    if (pattern.pattern.includes('network')) {
      return 'Consider adding retry logic or checking network connectivity';
    }
    return 'Review error logs and consider implementing additional error handling';
  }

  private initializeDefaultConfigs(): void {
    // Default retry configurations
    this.retryConfigs.set(ErrorCategory.NETWORK, {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitter: true
    });

    this.retryConfigs.set(ErrorCategory.RATE_LIMIT, {
      maxAttempts: 5,
      initialDelay: 2000,
      maxDelay: 60000,
      backoffFactor: 2,
      jitter: true
    });

    // Default error thresholds
    this.errorThresholds = [
      {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        count: 10,
        window: 60000, // 1 minute
        action: ThresholdAction.ALERT
      },
      {
        category: ErrorCategory.SECURITY,
        severity: ErrorSeverity.HIGH,
        count: 1,
        window: 3600000, // 1 hour
        action: ThresholdAction.ESCALATE
      }
    ];
  }

  /**
   * Get error metrics
   */
  getMetrics(): ErrorMetrics {
    const recentErrors = Array.from(this.errors.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100);

    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = recentErrors.filter(e => e.category === category).length;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = recentErrors.filter(e => e.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    return {
      totalErrors: this.errors.size,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
      topErrorPatterns: Array.from(this.errorPatterns.values()).slice(0, 10),
      recoverySuccessRate: 0.85, // Placeholder - would be calculated from actual recovery data
      averageResolutionTime: 5000 // Placeholder - would be calculated from actual resolution times
    };
  }
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastStateChange: Date;
}