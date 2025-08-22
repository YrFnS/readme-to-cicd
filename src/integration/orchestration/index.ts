/**
 * Orchestration module exports
 * 
 * This module provides the core orchestration engine for the Integration & Deployment system,
 * including workflow processing, component coordination, event handling, and error recovery.
 */

export { OrchestrationEngine } from './orchestration-engine';

// Re-export types for convenience
export type {
  WorkflowRequest,
  WorkflowResult,
  ComponentOperation,
  OperationResult,
  SystemEvent,
  RequestContext,
  PerformanceMetrics,
  HealthStatus
} from '../types';