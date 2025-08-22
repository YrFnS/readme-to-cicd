/**
 * Component Management System
 * 
 * This module provides comprehensive component lifecycle management including:
 * - Component registration with dependency resolution and validation
 * - Deployment with health checking and rollback capabilities
 * - Auto-scaling with policies and resource management
 * - Inter-component communication with message queuing and service discovery
 */

// Core component manager
export { ComponentManager } from './component-manager';

// Supporting services
export { ComponentRegistryImpl } from './component-registry';
export { DependencyResolverImpl } from './dependency-resolver';
export { ComponentDeployer } from './component-deployer';
export { ComponentScaler } from './component-scaler';
export { ComponentHealthMonitor } from './component-health-monitor';
export { ComponentCommunicationManager } from './component-communication-manager';

// Types and interfaces
export * from './types';

// Re-export commonly used interfaces for convenience
export type {
  ComponentDefinition,
  DeploymentConfig,
  DeploymentResult,
  ScalingConfig,
  HealthStatus,
  ComponentUpdate,
  ComponentCommunication,
  ComponentMetrics,
  ValidationResult
} from './types';