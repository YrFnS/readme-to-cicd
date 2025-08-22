export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  PROCESSING = 'processing',
  CONFIGURATION = 'configuration',
  DEPENDENCY = 'dependency',
  SECURITY = 'security',
  RESOURCE = 'resource',
  TIMEOUT = 'timeout'
}

export interface AgentHooksError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  stackTrace?: string;
  context?: ErrorContext;
  recovery?: ErrorRecovery;
  correlationId?: string;
}

export interface ErrorContext {
  component: string;
  operation: string;
  repository?: string;
  userId?: string;
  webhookEventId?: string;
  ruleId?: string;
  jobId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorRecovery {
  strategy: RecoveryStrategy;
  retryCount: number;
  maxRetries: number;
  nextRetryTime?: Date;
  fallbackAction?: string;
  escalationRequired: boolean;
  escalationLevel?: EscalationLevel;
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  ESCALATE = 'escalate',
  IGNORE = 'ignore',
  CUSTOM = 'custom'
}

export enum EscalationLevel {
  TEAM = 'team',
  MANAGER = 'manager',
  ADMIN = 'admin',
  SECURITY = 'security'
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean; // Add randomness to avoid thundering herd
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
}

export interface ErrorThreshold {
  category: ErrorCategory;
  severity: ErrorSeverity;
  count: number;
  window: number; // milliseconds
  action: ThresholdAction;
}

export enum ThresholdAction {
  ALERT = 'alert',
  ESCALATE = 'escalate',
  DISABLE = 'disable',
  THROTTLE = 'throttle'
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: AgentHooksError[];
  topErrorPatterns: ErrorPattern[];
  recoverySuccessRate: number;
  averageResolutionTime: number;
}

export interface ErrorPattern {
  pattern: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  impact: ErrorSeverity;
  suggestedAction?: string;
}

// Specific error types
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory = ErrorCategory.NETWORK,
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory = ErrorCategory.AUTHENTICATION,
    public readonly severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly remainingRequests?: number,
    public readonly resetTime?: Date,
    public readonly category: ErrorCategory = ErrorCategory.RATE_LIMIT,
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    public readonly category: ErrorCategory = ErrorCategory.VALIDATION,
    public readonly severity: ErrorSeverity = ErrorSeverity.LOW
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly operation?: string,
    public readonly input?: any,
    public readonly category: ErrorCategory = ErrorCategory.PROCESSING,
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message);
    this.name = 'ProcessingError';
  }
}

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly configKey?: string,
    public readonly category: ErrorCategory = ErrorCategory.CONFIGURATION,
    public readonly severity: ErrorSeverity = ErrorSeverity.HIGH
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout?: number,
    public readonly category: ErrorCategory = ErrorCategory.TIMEOUT,
    public readonly severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public readonly threatType?: string,
    public readonly category: ErrorCategory = ErrorCategory.SECURITY,
    public readonly severity: ErrorSeverity = ErrorSeverity.CRITICAL
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}