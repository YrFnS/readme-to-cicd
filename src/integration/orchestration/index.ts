/**
 * Orchestration Layer
 * 
 * Unified orchestration system that provides centralized coordination,
 * configuration management, monitoring, and health management for the
 * entire README-to-CICD system.
 */

// Core orchestration engine
export { 
  OrchestrationEngine,
  type WorkflowRequest,
  type RequestContext,
  type WorkflowResult,
  type PerformanceMetrics,
  type ComponentOperation,
  type OperationResult,
  type SystemEvent,
  type OrchestrationConfig
} from './orchestration-engine';

// Health management
export {
  HealthManager,
  type HealthCheckConfig,
  type RecoveryAction,
  type RecoveryPolicy,
  type MaintenanceWindow,
  type MaintenanceAction,
  type RecoveryAttempt
} from './health-manager';

// Workflow orchestration
export {
  WorkflowOrchestrator,
  type WorkflowDefinition,
  type WorkflowStep,
  type WorkflowTrigger,
  type StepCondition,
  type WorkflowAction,
  type RetryPolicy,
  type ErrorHandlingPolicy,
  type NotificationConfig,
  type WorkflowExecutionContext,
  type StepResult,
  type DeploymentWorkflowConfig,
  type ValidationConfig,
  type HealthCheckConfig as WorkflowHealthCheckConfig,
  type PerformanceTestConfig,
  type SecurityScanConfig,
  type RollbackConfig,
  type RollbackTrigger,
  type ComponentUpdateConfig,
  type MaintenanceWorkflowConfig
} from './workflow-orchestrator';

// Configuration management
export {
  ConfigurationManager,
  type ConfigValue,
  type ConfigChangeCallback,
  type ValidationResult,
  type ConfigMigration,
  type Configuration,
  type SystemConfig,
  type ComponentConfigs,
  type DeploymentConfigs,
  type EnvironmentConfig,
  type SecurityConfig,
  type MonitoringConfig,
  type IntegrationConfigs,
  type WebhookEndpoint,
  type DatabaseConfig
} from '../configuration/configuration-manager';

// Monitoring system
export {
  MonitoringSystem,
  type Metric,
  type Alert,
  type NotificationChannel,
  type Dashboard,
  type DashboardPanel,
  type TimeRange,
  type HealthStatus,
  type ComponentHealth,
  type MonitoringConfig as MonitoringSystemConfig
} from '../monitoring/monitoring-system';

/**
 * Create a fully configured orchestration engine
 * 
 * @param config Optional configuration overrides
 * @returns Configured OrchestrationEngine instance
 * 
 * @example
 * ```typescript
 * import { createOrchestrationEngine } from './integration/orchestration';
 * 
 * const engine = createOrchestrationEngine({
 *   maxConcurrentWorkflows: 15,
 *   enableMetrics: true,
 *   enableHealthChecks: true
 * });
 * 
 * await engine.initialize();
 * 
 * // Process a workflow
 * const result = await engine.processWorkflow({
 *   id: 'readme-to-cicd-1',
 *   type: 'readme-to-cicd',
 *   payload: {
 *     readmePath: './README.md',
 *     outputDir: './.github/workflows'
 *   },
 *   context: {
 *     sessionId: 'session-123',
 *     timestamp: new Date(),
 *     source: 'cli',
 *     environment: 'production',
 *     traceId: 'trace-456'
 *   },
 *   priority: 'normal'
 * });
 * ```
 */
export function createOrchestrationEngine(config: Partial<import('./orchestration-engine').OrchestrationConfig> = {}): OrchestrationEngine {
  return new OrchestrationEngine(config);
}

/**
 * Create a standalone configuration manager
 * 
 * @param configPath Optional path to configuration file
 * @returns ConfigurationManager instance
 */
export function createConfigurationManager(configPath?: string): ConfigurationManager {
  const { Logger } = require('../../cli/lib/logger');
  const logger = new Logger('info');
  return new ConfigurationManager(logger, configPath);
}

/**
 * Create a standalone monitoring system
 * 
 * @param config Optional monitoring configuration
 * @returns MonitoringSystem instance
 */
export function createMonitoringSystem(config: Partial<import('../monitoring/monitoring-system').MonitoringConfig> = {}): MonitoringSystem {
  const { Logger } = require('../../cli/lib/logger');
  const logger = new Logger('info');
  return new MonitoringSystem(logger, config);
}

/**
 * Create a standalone health manager
 * 
 * @param monitoringSystem MonitoringSystem instance
 * @returns HealthManager instance
 */
export function createHealthManager(monitoringSystem: MonitoringSystem): HealthManager {
  const { Logger } = require('../../cli/lib/logger');
  const logger = new Logger('info');
  return new HealthManager(logger, monitoringSystem);
}

/**
 * Create a standalone workflow orchestrator
 * 
 * @returns WorkflowOrchestrator instance
 */
export function createWorkflowOrchestrator(): WorkflowOrchestrator {
  const { Logger } = require('../../cli/lib/logger');
  const { ErrorHandler } = require('../../cli/lib/error-handler');
  const logger = new Logger('info');
  const errorHandler = new ErrorHandler(logger);
  return new WorkflowOrchestrator(logger, errorHandler);
}

/**
 * Orchestration system constants
 */
export const OrchestrationConstants = {
  // Default configuration values
  DEFAULT_MAX_CONCURRENT_WORKFLOWS: 10,
  DEFAULT_TIMEOUT: 300000, // 5 minutes
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  
  // Workflow types
  WORKFLOW_TYPES: [
    'readme-to-cicd',
    'component-update',
    'system-maintenance',
    'health-check'
  ] as const,
  
  // Component names
  COMPONENT_NAMES: [
    'readme-parser',
    'framework-detector',
    'yaml-generator',
    'cli-tool',
    'integration-pipeline'
  ] as const,
  
  // Priority levels
  PRIORITY_LEVELS: [
    'low',
    'normal',
    'high',
    'critical'
  ] as const,
  
  // Health status values
  HEALTH_STATUS_VALUES: [
    'healthy',
    'degraded',
    'unhealthy'
  ] as const,
  
  // Operation types
  OPERATION_TYPES: [
    'start',
    'stop',
    'restart',
    'configure',
    'health-check'
  ] as const,
  
  // Event severity levels
  EVENT_SEVERITY_LEVELS: [
    'info',
    'warning',
    'error',
    'critical'
  ] as const
};

/**
 * Utility functions for orchestration
 */
export const OrchestrationUtils = {
  /**
   * Generate a unique trace ID
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate a unique execution ID
   */
  generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Create a request context with defaults
   */
  createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
    return {
      sessionId: this.generateSessionId(),
      timestamp: new Date(),
      source: 'cli',
      environment: 'development',
      traceId: this.generateTraceId(),
      ...overrides
    };
  },

  /**
   * Validate workflow request
   */
  validateWorkflowRequest(request: WorkflowRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.id) {
      errors.push('Workflow request ID is required');
    }

    if (!OrchestrationConstants.WORKFLOW_TYPES.includes(request.type as any)) {
      errors.push(`Invalid workflow type: ${request.type}`);
    }

    if (!request.payload) {
      errors.push('Workflow request payload is required');
    }

    if (!request.context) {
      errors.push('Workflow request context is required');
    } else {
      if (!request.context.sessionId) {
        errors.push('Request context sessionId is required');
      }
      if (!request.context.traceId) {
        errors.push('Request context traceId is required');
      }
    }

    if (!OrchestrationConstants.PRIORITY_LEVELS.includes(request.priority as any)) {
      errors.push(`Invalid priority level: ${request.priority}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate component operation
   */
  validateComponentOperation(operation: ComponentOperation): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!OrchestrationConstants.OPERATION_TYPES.includes(operation.type as any)) {
      errors.push(`Invalid operation type: ${operation.type}`);
    }

    if (!operation.component) {
      errors.push('Component name is required');
    } else if (!OrchestrationConstants.COMPONENT_NAMES.includes(operation.component as any)) {
      errors.push(`Invalid component name: ${operation.component}`);
    }

    if (operation.timeout && operation.timeout <= 0) {
      errors.push('Timeout must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Calculate workflow priority score
   */
  calculatePriorityScore(priority: 'low' | 'normal' | 'high' | 'critical'): number {
    const scores = {
      low: 1,
      normal: 2,
      high: 3,
      critical: 4
    };
    return scores[priority];
  },

  /**
   * Format execution time for display
   */
  formatExecutionTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.floor((milliseconds % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  },

  /**
   * Format memory usage for display
   */
  formatMemoryUsage(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }
};

/**
 * Type guards for orchestration types
 */
export const OrchestrationTypeGuards = {
  /**
   * Check if a value is a valid workflow request
   */
  isWorkflowRequest(value: any): value is WorkflowRequest {
    return (
      value &&
      typeof value.id === 'string' &&
      typeof value.type === 'string' &&
      OrchestrationConstants.WORKFLOW_TYPES.includes(value.type) &&
      value.payload &&
      value.context &&
      typeof value.priority === 'string' &&
      OrchestrationConstants.PRIORITY_LEVELS.includes(value.priority)
    );
  },

  /**
   * Check if a value is a valid component operation
   */
  isComponentOperation(value: any): value is ComponentOperation {
    return (
      value &&
      typeof value.type === 'string' &&
      OrchestrationConstants.OPERATION_TYPES.includes(value.type) &&
      typeof value.component === 'string' &&
      OrchestrationConstants.COMPONENT_NAMES.includes(value.component)
    );
  },

  /**
   * Check if a value is a valid system event
   */
  isSystemEvent(value: any): value is SystemEvent {
    return (
      value &&
      typeof value.id === 'string' &&
      typeof value.type === 'string' &&
      typeof value.source === 'string' &&
      value.timestamp instanceof Date &&
      value.data &&
      typeof value.severity === 'string' &&
      OrchestrationConstants.EVENT_SEVERITY_LEVELS.includes(value.severity)
    );
  }
};

/**
 * Default orchestration configuration
 */
export const DEFAULT_ORCHESTRATION_CONFIG: import('./orchestration-engine').OrchestrationConfig = {
  maxConcurrentWorkflows: OrchestrationConstants.DEFAULT_MAX_CONCURRENT_WORKFLOWS,
  defaultTimeout: OrchestrationConstants.DEFAULT_TIMEOUT,
  retryAttempts: OrchestrationConstants.DEFAULT_RETRY_ATTEMPTS,
  enableMetrics: true,
  enableHealthChecks: true,
  healthCheckInterval: OrchestrationConstants.DEFAULT_HEALTH_CHECK_INTERVAL
};

/**
 * Export all types for external use
 */
export type {
  // Core types
  WorkflowRequest,
  RequestContext,
  WorkflowResult,
  PerformanceMetrics,
  ComponentOperation,
  OperationResult,
  SystemEvent,
  OrchestrationConfig,
  
  // Health management types
  HealthCheckConfig,
  RecoveryAction,
  RecoveryPolicy,
  MaintenanceWindow,
  MaintenanceAction,
  RecoveryAttempt,
  
  // Workflow orchestration types
  WorkflowDefinition,
  WorkflowStep,
  WorkflowTrigger,
  StepCondition,
  WorkflowAction,
  RetryPolicy,
  ErrorHandlingPolicy,
  NotificationConfig,
  WorkflowExecutionContext,
  StepResult,
  DeploymentWorkflowConfig,
  ValidationConfig,
  PerformanceTestConfig,
  SecurityScanConfig,
  RollbackConfig,
  RollbackTrigger,
  ComponentUpdateConfig,
  MaintenanceWorkflowConfig,
  
  // Configuration management types
  ConfigValue,
  ConfigChangeCallback,
  ValidationResult as ConfigValidationResult,
  ConfigMigration,
  Configuration,
  SystemConfig,
  ComponentConfigs,
  DeploymentConfigs,
  EnvironmentConfig,
  SecurityConfig,
  MonitoringConfig,
  IntegrationConfigs,
  WebhookEndpoint,
  DatabaseConfig,
  
  // Monitoring system types
  Metric,
  Alert,
  NotificationChannel,
  Dashboard,
  DashboardPanel,
  TimeRange,
  HealthStatus,
  ComponentHealth
} from './orchestration-engine';