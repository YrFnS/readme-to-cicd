/**
 * Orchestration and monitoring related types for the README-to-CICD system
 * These interfaces support the OrchestrationEngine and monitoring systems
 */

/**
 * System event interface for tracking system-wide events
 * Used by OrchestrationEngine.getEventHistory() method
 */
export interface SystemEvent {
  /** Unique identifier for the event */
  id: string;
  
  /** Event type (e.g., 'component.failure', 'workflow.started', 'system.alert') */
  type: string;
  
  /** Source component or system that generated the event */
  source: string;
  
  /** Event data - can contain any relevant information about the event */
  data: any;
  
  /** Timestamp when the event occurred */
  timestamp: Date;
  
  /** Severity level of the event */
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Circuit breaker status for monitoring component health
 * Used by OrchestrationEngine.getCircuitBreakerStatus() method
 */
export interface CircuitBreakerStatus {
  /** Current state of the circuit breaker */
  state: 'open' | 'closed' | 'half-open';
  
  /** Number of consecutive failures */
  failureCount: number;
  
  /** Timestamp of the last failure */
  lastFailure: Date | null;
}

/**
 * Queue status for monitoring workflow processing
 * Used by OrchestrationEngine.getQueueStatus() method
 */
export interface QueueStatus {
  /** Number of workflows pending processing */
  pending: number;
  
  /** Number of workflows currently being processed */
  processing: number;
  
  /** Number of workflows completed */
  completed: number;
  
  /** Number of workflows that failed */
  failed: number;
  
  /** Total number of workflows processed */
  totalProcessed: number;
}