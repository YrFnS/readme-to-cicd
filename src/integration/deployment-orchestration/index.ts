/**
 * @fileoverview Deployment orchestration system main exports
 * Provides comprehensive deployment orchestration with multiple strategies and validation
 */

// Main orchestrator
export { DeploymentOrchestrator } from './deployment-orchestrator.js';

// Deployment strategies
export { BlueGreenStrategy } from './strategies/blue-green-strategy.js';
export { CanaryStrategy } from './strategies/canary-strategy.js';
export { RollingStrategy } from './strategies/rolling-strategy.js';

// Validation and health management
export { DeploymentValidator } from './validation/deployment-validator.js';
export { HealthCheckManager } from './health/health-check-manager.js';

// Rollback and approval management
export { RollbackManager } from './rollback/rollback-manager.js';
export { ApprovalManager } from './approval/approval-manager.js';

// Analytics and promotion management
export { AnalyticsManager } from './analytics/analytics-manager.js';
export { PromotionManager } from './promotion/promotion-manager.js';

// Interfaces and types
export * from './interfaces.js';
export * from './types.js';

// Re-export for convenience
export type {
  IDeploymentOrchestrator,
  IDeploymentStrategy,
  IBlueGreenStrategy,
  ICanaryStrategy,
  IRollingStrategy,
  IDeploymentValidator,
  IHealthCheckManager,
  IRollbackManager,
  IApprovalManager,
  IAnalyticsManager,
  IPromotionManager
} from './interfaces.js';

export type {
  DeploymentConfig,
  DeploymentResult,
  ValidationResult,
  DeploymentExecution,
  DeploymentMetrics,
  HealthCheckStatus,
  DeploymentStatus,
  DeploymentEnvironment,
  BlueGreenStrategyConfig,
  CanaryStrategyConfig,
  RollingStrategyConfig
} from './types.js';