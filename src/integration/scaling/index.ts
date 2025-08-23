/**
 * Auto-scaling and Load Management System
 * 
 * This module provides comprehensive auto-scaling and load management capabilities
 * including demand-based scaling, intelligent load balancing, resource optimization,
 * performance monitoring, and zero-downtime deployments.
 */

// Main orchestrator
export { ScalingManager } from './scaling-manager.js';

// Core services
export { AutoScaler } from './autoscaler/auto-scaler.js';
export { LoadBalancer } from './load-balancer/load-balancer.js';
export { ResourceAllocator } from './resource-allocation/resource-allocator.js';
export { PerformanceMonitor } from './performance-monitor/performance-monitor.js';
export { ZeroDowntimeDeployment } from './deployment/zero-downtime-deployment.js';

// Types and interfaces
export * from './types.js';

// Additional types from services
export type {
  ResourceAllocation,
  ResourceRequest,
  ResourcePool
} from './resource-allocation/resource-allocator.js';

export type {
  PerformanceThreshold,
  PerformanceAlert,
  PerformanceReport
} from './performance-monitor/performance-monitor.js';

export type {
  DeploymentRequest,
  DeploymentStatus,
  DeploymentMetrics,
  ValidationResult,
  ValidationCheck
} from './deployment/zero-downtime-deployment.js';

export type {
  ScalingManagerConfig
} from './scaling-manager.js';