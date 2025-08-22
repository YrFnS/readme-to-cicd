export { ErrorHandler } from './error-handler';
export type {
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
  ErrorPattern
} from '../types/errors';
export {
  NetworkError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  ProcessingError,
  ConfigurationError,
  TimeoutError,
  SecurityError
} from '../types/errors';