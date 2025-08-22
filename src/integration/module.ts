/**
 * Integration & Deployment Module Exports
 * 
 * This file provides clean exports for the Integration & Deployment system components
 * for use by other parts of the application.
 */

// Core orchestration engine
export { OrchestrationEngine } from './orchestration/orchestration-engine';

// Type definitions
export type {
  WorkflowRequest,
  WorkflowResult,
  ComponentOperation,
  OperationResult,
  SystemEvent,
  RequestContext,
  PerformanceMetrics,
  HealthStatus
} from './types';

// Orchestration module exports
export * from './orchestration';