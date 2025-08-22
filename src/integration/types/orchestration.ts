/**
 * Orchestration Engine interfaces and types
 */

import { WorkflowRequest, WorkflowResult, ComponentOperation, OperationResult, SystemEvent } from './index.js';

export interface OrchestrationEngine {
  /**
   * Process a workflow request through the system
   */
  processWorkflow(request: WorkflowRequest): Promise<WorkflowResult>;
  
  /**
   * Manage component operations (deploy, scale, update, etc.)
   */
  manageComponents(operation: ComponentOperation): Promise<OperationResult>;
  
  /**
   * Coordinate deployment across multiple components
   */
  coordinateDeployment(deployment: DeploymentConfig): Promise<DeploymentResult>;
  
  /**
   * Handle system events and trigger appropriate responses
   */
  handleSystemEvent(event: SystemEvent): Promise<void>;
}

export interface DeploymentConfig {
  strategy: 'blue-green' | 'canary' | 'rolling' | 'recreate';
  environment: 'development' | 'staging' | 'production';
  components: ComponentDeploymentConfig[];
  validation: ValidationConfig;
  rollback: RollbackConfig;
}

export interface DeploymentResult {
  deploymentId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  components: ComponentDeploymentResult[];
  startTime: Date;
  endTime?: Date;
  metrics: DeploymentMetrics;
}

export interface ComponentDeploymentConfig {
  componentId: string;
  version: string;
  replicas: number;
  resources: ResourceRequirements;
  healthCheck: HealthCheckConfig;
}

export interface ComponentDeploymentResult {
  componentId: string;
  status: 'pending' | 'deploying' | 'healthy' | 'failed';
  message?: string;
  deployedAt?: Date;
}

export interface ValidationConfig {
  healthChecks: boolean;
  smokeTests: boolean;
  performanceTests: boolean;
  timeout: number;
}

export interface RollbackConfig {
  enabled: boolean;
  automaticTriggers: string[];
  timeout: number;
}

export interface DeploymentMetrics {
  totalDuration: number;
  componentMetrics: Record<string, ComponentMetrics>;
  resourceUsage: ResourceUsage;
}

export interface ComponentMetrics {
  deploymentTime: number;
  healthCheckTime: number;
  resourceAllocation: ResourceRequirements;
}

export interface ResourceRequirements {
  cpu: string;
  memory: string;
  storage?: string;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  network: number;
  storage?: number;
}

export interface HealthCheckConfig {
  path: string;
  port: number;
  interval: number;
  timeout: number;
  retries: number;
}