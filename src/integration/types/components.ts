/**
 * Component Manager interfaces and types
 */

import { HealthStatus, PerformanceMetrics } from './index.js';
import { ResourceRequirements, HealthCheckConfig, DeploymentConfig, DeploymentResult } from './orchestration.js';

export interface ComponentManager {
  /**
   * Register a new component in the system
   */
  registerComponent(component: ComponentDefinition): Promise<void>;
  
  /**
   * Deploy a component with specified configuration
   */
  deployComponent(componentId: string, config: DeploymentConfig): Promise<DeploymentResult>;
  
  /**
   * Scale a component up or down
   */
  scaleComponent(componentId: string, scaling: ScalingConfig): Promise<void>;
  
  /**
   * Perform health check on a component
   */
  healthCheck(componentId: string): Promise<HealthStatus>;
  
  /**
   * Update a component to a new version
   */
  updateComponent(componentId: string, update: ComponentUpdate): Promise<void>;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  version: string;
  type: 'service' | 'function' | 'worker' | 'extension';
  dependencies: string[];
  resources: ResourceRequirements;
  healthCheck: HealthCheckConfig;
  scaling: ScalingPolicy;
}

export interface ScalingConfig {
  minReplicas: number;
  maxReplicas: number;
  targetReplicas?: number;
  metrics: ScalingMetric[];
}

export interface ScalingPolicy {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  targetCPU: number;
  targetMemory: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
}

export interface ScalingMetric {
  type: 'cpu' | 'memory' | 'requests' | 'custom';
  target: number;
  threshold: number;
}

export interface ComponentUpdate {
  version?: string;
  configuration?: Record<string, any>;
  resources?: ResourceRequirements;
  scaling?: ScalingPolicy;
}

export interface ComponentCommunication {
  messageQueue: MessageQueueConfig;
  eventBus: EventBusConfig;
  apiGateway: APIGatewayConfig;
  serviceDiscovery: ServiceDiscoveryConfig;
}

export interface MessageQueueConfig {
  provider: 'rabbitmq' | 'kafka' | 'sqs' | 'redis';
  connection: string;
  topics: string[];
  retryPolicy: RetryPolicy;
}

export interface EventBusConfig {
  provider: 'eventbridge' | 'pubsub' | 'kafka';
  connection: string;
  events: string[];
}

export interface APIGatewayConfig {
  provider: 'kong' | 'ambassador' | 'istio' | 'aws-api-gateway';
  endpoints: APIEndpoint[];
  authentication: AuthConfig;
  rateLimit: RateLimitConfig;
}

export interface ServiceDiscoveryConfig {
  provider: 'consul' | 'etcd' | 'kubernetes' | 'dns';
  connection: string;
  healthCheckInterval: number;
}

export interface APIEndpoint {
  path: string;
  method: string;
  handler: string;
  middleware: string[];
}

export interface AuthConfig {
  type: 'oauth' | 'jwt' | 'api-key' | 'basic';
  configuration: Record<string, any>;
}

export interface RateLimitConfig {
  requests: number;
  window: number;
  burst?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffTime: number;
}