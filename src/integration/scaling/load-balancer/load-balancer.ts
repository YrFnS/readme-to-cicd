import { EventEmitter } from 'events';
import {
  LoadBalancerConfig,
  ServiceInstance,
  LoadBalancerState,
  HealthCheckConfig,
  ScalingMetrics
} from '../types.js';

/**
 * LoadBalancer implements intelligent traffic distribution and health checking
 * Supports multiple load balancing algorithms and automatic health monitoring
 */
export class LoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private instances: Map<string, ServiceInstance> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private requestCounter = 0;
  private connectionCounter = 0;
  private lastRequestTime = new Map<string, number>();

  constructor(config: LoadBalancerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the load balancer and health checking
   */
  async start(): Promise<void> {
    if (this.config.healthCheck.enabled) {
      this.startHealthChecking();
    }
    this.emit('started');
  }

  /**
   * Stop the load balancer
   */
  async stop(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    this.emit('stopped');
  }

  /**
   * Register a service instance
   */
  registerInstance(instance: ServiceInstance): void {
    this.instances.set(instance.id, instance);
    this.emit('instance-registered', instance);
  }

  /**
   * Unregister a service instance
   */
  unregisterInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      this.instances.delete(instanceId);
      this.emit('instance-unregistered', instance);
    }
  }

  /**
   * Get the next available instance based on load balancing algorithm
   */
  getNextInstance(clientId?: string): ServiceInstance | null {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.healthy);

    if (healthyInstances.length === 0) {
      return null;
    }

    switch (this.config.algorithm) {
      case 'round-robin':
        return this.roundRobinSelection(healthyInstances);
      case 'least-connections':
        return this.leastConnectionsSelection(healthyInstances);
      case 'weighted':
        return this.weightedSelection(healthyInstances);
      case 'ip-hash':
        return this.ipHashSelection(healthyInstances, clientId);
      default:
        return this.roundRobinSelection(healthyInstances);
    }
  }

  /**
   * Update instance metrics
   */
  updateInstanceMetrics(instanceId: string, metrics: ScalingMetrics): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.metrics = metrics;
      this.instances.set(instanceId, instance);
    }
  }

  /**
   * Get current load balancer state
   */
  getState(): LoadBalancerState {
    return {
      instances: Array.from(this.instances.values()),
      totalRequests: this.requestCounter,
      activeConnections: this.connectionCounter,
      algorithm: this.config.algorithm,
      lastUpdate: new Date()
    };
  }

  /**
   * Handle incoming request
   */
  async handleRequest(clientId?: string): Promise<ServiceInstance | null> {
    this.requestCounter++;
    this.connectionCounter++;

    const instance = this.getNextInstance(clientId);
    if (instance) {
      this.lastRequestTime.set(instance.id, Date.now());
      this.emit('request-routed', { instance, clientId });
    } else {
      this.emit('no-healthy-instances');
    }

    return instance;
  }

  /**
   * Handle request completion
   */
  completeRequest(instanceId: string): void {
    this.connectionCounter = Math.max(0, this.connectionCounter - 1);
    this.emit('request-completed', instanceId);
  }

  /**
   * Perform health check on all instances
   */
  private async performHealthCheck(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(instance =>
      this.checkInstanceHealth(instance)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Check health of a single instance
   */
  private async checkInstanceHealth(instance: ServiceInstance): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Mock health check - in real implementation, this would make HTTP request
      const isHealthy = await this.mockHealthCheck(instance);
      const responseTime = Date.now() - startTime;

      const wasHealthy = instance.healthy;
      instance.healthy = isHealthy;
      instance.lastHealthCheck = new Date();

      // Update metrics with health check response time
      if (instance.metrics) {
        instance.metrics.responseTime = responseTime;
      }

      // Emit events for health state changes
      if (wasHealthy && !isHealthy) {
        this.emit('instance-unhealthy', instance);
      } else if (!wasHealthy && isHealthy) {
        this.emit('instance-healthy', instance);
      }

      this.instances.set(instance.id, instance);
    } catch (error) {
      instance.healthy = false;
      instance.lastHealthCheck = new Date();
      this.instances.set(instance.id, instance);
      this.emit('health-check-failed', instance, error);
    }
  }

  /**
   * Start health checking timer
   */
  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheck.interval * 1000
    );
  }

  /**
   * Round-robin load balancing algorithm
   */
  private roundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    // Use a separate counter for round-robin to ensure consistent ordering
    const index = (this.requestCounter - 1) % instances.length;
    return instances[index];
  }

  /**
   * Least connections load balancing algorithm
   */
  private leastConnectionsSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((least, current) => {
      const leastConnections = least.metrics?.activeConnections || 0;
      const currentConnections = current.metrics?.activeConnections || 0;
      return currentConnections < leastConnections ? current : least;
    });
  }

  /**
   * Weighted load balancing algorithm
   */
  private weightedSelection(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= instance.weight;
      if (random <= 0) {
        return instance;
      }
    }

    return instances[0]; // Fallback
  }

  /**
   * IP hash load balancing algorithm
   */
  private ipHashSelection(instances: ServiceInstance[], clientId?: string): ServiceInstance {
    if (!clientId) {
      return this.roundRobinSelection(instances);
    }

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      const char = clientId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const index = Math.abs(hash) % instances.length;
    return instances[index];
  }

  /**
   * Mock health check implementation
   */
  private async mockHealthCheck(instance: ServiceInstance): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Mock health check logic - 95% success rate
    return Math.random() > 0.05;
  }

  /**
   * Get instance statistics
   */
  getInstanceStats(instanceId: string): {
    requests: number;
    lastRequest: Date | null;
    health: boolean;
    metrics: ScalingMetrics | null;
  } | null {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return null;
    }

    const lastRequestTime = this.lastRequestTime.get(instanceId);
    return {
      requests: this.getInstanceRequestCount(instanceId),
      lastRequest: lastRequestTime ? new Date(lastRequestTime) : null,
      health: instance.healthy,
      metrics: instance.metrics || null
    };
  }

  /**
   * Get request count for an instance (mock implementation)
   */
  private getInstanceRequestCount(instanceId: string): number {
    // In real implementation, this would track actual request counts
    return Math.floor(Math.random() * 1000);
  }

  /**
   * Update load balancer configuration
   */
  updateConfig(config: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart health checking if configuration changed
    if (config.healthCheck && this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      if (this.config.healthCheck.enabled) {
        this.startHealthChecking();
      }
    }

    this.emit('config-updated', this.config);
  }

  /**
   * Get healthy instance count
   */
  getHealthyInstanceCount(): number {
    return Array.from(this.instances.values())
      .filter(instance => instance.healthy).length;
  }

  /**
   * Get total instance count
   */
  getTotalInstanceCount(): number {
    return this.instances.size;
  }
}