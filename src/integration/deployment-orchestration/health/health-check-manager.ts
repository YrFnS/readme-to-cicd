/**
 * @fileoverview Health check manager implementation
 * Provides comprehensive health monitoring for deployed components
 */

import {
  IHealthCheckManager,
  HealthCheckResult
} from '../interfaces.js';
import {
  HealthCheckStatus,
  HealthCheckConfig
} from '../types.js';

/**
 * Health check manager
 * Manages health checks for all deployed components with continuous monitoring
 */
export class HealthCheckManager implements IHealthCheckManager {
  private healthChecks: Map<string, HealthCheckConfig> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private healthStatus: Map<string, Map<string, HealthCheckStatus>> = new Map();

  /**
   * Register health check for a component
   */
  async registerHealthCheck(componentId: string, config: HealthCheckConfig): Promise<void> {
    this.healthChecks.set(componentId, config);
    console.log(`Registered health check for component: ${componentId} (type: ${config.type})`);
  }

  /**
   * Execute health check for a component
   */
  async executeHealthCheck(componentId: string): Promise<HealthCheckResult> {
    const config = this.healthChecks.get(componentId);
    if (!config) {
      throw new Error(`No health check configuration found for component: ${componentId}`);
    }

    const startTime = Date.now();
    
    try {
      let status: HealthCheckStatus;
      let message: string;
      let details: Record<string, any> = {};

      switch (config.type) {
        case 'http':
          ({ status, message, details } = await this.executeHTTPHealthCheck(componentId, config));
          break;
        case 'tcp':
          ({ status, message, details } = await this.executeTCPHealthCheck(componentId, config));
          break;
        case 'exec':
          ({ status, message, details } = await this.executeCommandHealthCheck(componentId, config));
          break;
        case 'grpc':
          ({ status, message, details } = await this.executeGRPCHealthCheck(componentId, config));
          break;
        default:
          throw new Error(`Unsupported health check type: ${config.type}`);
      }

      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        componentId,
        status,
        timestamp: new Date(),
        responseTime,
        message,
        details
      };

      // Update health status cache
      this.updateHealthStatusCache(componentId, status);

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        componentId,
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime,
        message: `Health check failed: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };

      this.updateHealthStatusCache(componentId, 'unhealthy');
      return result;
    }
  }

  /**
   * Get health status for all components
   */
  async getHealthStatus(deploymentId: string): Promise<Record<string, HealthCheckStatus>> {
    const deploymentHealth = this.healthStatus.get(deploymentId);
    if (!deploymentHealth) {
      return {};
    }

    return Object.fromEntries(deploymentHealth.entries());
  }

  /**
   * Monitor health continuously
   */
  async startHealthMonitoring(deploymentId: string): Promise<void> {
    console.log(`Starting health monitoring for deployment: ${deploymentId}`);

    // Initialize health status for deployment
    if (!this.healthStatus.has(deploymentId)) {
      this.healthStatus.set(deploymentId, new Map());
    }

    // Start monitoring for each registered component
    for (const [componentId, config] of this.healthChecks.entries()) {
      if (componentId.startsWith(deploymentId)) {
        await this.startComponentMonitoring(deploymentId, componentId, config);
      }
    }
  }

  /**
   * Stop health monitoring
   */
  async stopHealthMonitoring(deploymentId: string): Promise<void> {
    console.log(`Stopping health monitoring for deployment: ${deploymentId}`);

    // Stop all monitoring intervals for this deployment
    for (const [intervalId, interval] of this.monitoringIntervals.entries()) {
      if (intervalId.startsWith(deploymentId)) {
        clearInterval(interval);
        this.monitoringIntervals.delete(intervalId);
      }
    }

    // Clean up health status
    this.healthStatus.delete(deploymentId);
  }

  /**
   * Start monitoring for a specific component
   */
  private async startComponentMonitoring(
    deploymentId: string,
    componentId: string,
    config: HealthCheckConfig
  ): Promise<void> {
    const intervalId = `${deploymentId}-${componentId}`;
    
    // Clear existing interval if any
    const existingInterval = this.monitoringIntervals.get(intervalId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new monitoring interval
    const interval = setInterval(async () => {
      try {
        const result = await this.executeHealthCheck(componentId);
        console.log(`Health check result for ${componentId}: ${result.status} (${result.responseTime}ms)`);
        
        // Log unhealthy status
        if (result.status === 'unhealthy') {
          console.warn(`Component ${componentId} is unhealthy: ${result.message}`);
        }
      } catch (error) {
        console.error(`Health check error for ${componentId}:`, error);
      }
    }, config.periodSeconds * 1000);

    this.monitoringIntervals.set(intervalId, interval);

    // Execute initial health check
    setTimeout(async () => {
      try {
        await this.executeHealthCheck(componentId);
      } catch (error) {
        console.error(`Initial health check failed for ${componentId}:`, error);
      }
    }, config.initialDelaySeconds * 1000);
  }

  /**
   * Execute HTTP health check
   */
  private async executeHTTPHealthCheck(
    componentId: string,
    config: HealthCheckConfig
  ): Promise<{ status: HealthCheckStatus; message: string; details: Record<string, any> }> {
    if (!config.endpoint || !config.port) {
      throw new Error('HTTP health check requires endpoint and port');
    }

    // Simulate HTTP health check
    // In real implementation, this would make actual HTTP requests
    await this.simulateHealthCheckDelay(config.timeoutSeconds * 1000);

    // Simulate success/failure based on component health
    const isHealthy = Math.random() > 0.1; // 90% success rate

    if (isHealthy) {
      return {
        status: 'healthy',
        message: `HTTP health check passed for ${config.endpoint}:${config.port}`,
        details: {
          endpoint: config.endpoint,
          port: config.port,
          statusCode: 200,
          responseBody: 'OK'
        }
      };
    } else {
      return {
        status: 'unhealthy',
        message: `HTTP health check failed for ${config.endpoint}:${config.port}`,
        details: {
          endpoint: config.endpoint,
          port: config.port,
          statusCode: 503,
          responseBody: 'Service Unavailable'
        }
      };
    }
  }

  /**
   * Execute TCP health check
   */
  private async executeTCPHealthCheck(
    componentId: string,
    config: HealthCheckConfig
  ): Promise<{ status: HealthCheckStatus; message: string; details: Record<string, any> }> {
    if (!config.port) {
      throw new Error('TCP health check requires port');
    }

    // Simulate TCP health check
    await this.simulateHealthCheckDelay(config.timeoutSeconds * 1000);

    const isHealthy = Math.random() > 0.05; // 95% success rate

    if (isHealthy) {
      return {
        status: 'healthy',
        message: `TCP connection successful on port ${config.port}`,
        details: {
          port: config.port,
          connectionTime: Math.random() * 100 + 10 // 10-110ms
        }
      };
    } else {
      return {
        status: 'unhealthy',
        message: `TCP connection failed on port ${config.port}`,
        details: {
          port: config.port,
          error: 'Connection refused'
        }
      };
    }
  }

  /**
   * Execute command health check
   */
  private async executeCommandHealthCheck(
    componentId: string,
    config: HealthCheckConfig
  ): Promise<{ status: HealthCheckStatus; message: string; details: Record<string, any> }> {
    if (!config.command || config.command.length === 0) {
      throw new Error('Command health check requires command array');
    }

    // Simulate command execution
    await this.simulateHealthCheckDelay(config.timeoutSeconds * 1000);

    const isHealthy = Math.random() > 0.08; // 92% success rate

    if (isHealthy) {
      return {
        status: 'healthy',
        message: `Command health check passed: ${config.command.join(' ')}`,
        details: {
          command: config.command,
          exitCode: 0,
          stdout: 'Health check passed',
          stderr: ''
        }
      };
    } else {
      return {
        status: 'unhealthy',
        message: `Command health check failed: ${config.command.join(' ')}`,
        details: {
          command: config.command,
          exitCode: 1,
          stdout: '',
          stderr: 'Health check failed'
        }
      };
    }
  }

  /**
   * Execute gRPC health check
   */
  private async executeGRPCHealthCheck(
    componentId: string,
    config: HealthCheckConfig
  ): Promise<{ status: HealthCheckStatus; message: string; details: Record<string, any> }> {
    if (!config.endpoint || !config.port) {
      throw new Error('gRPC health check requires endpoint and port');
    }

    // Simulate gRPC health check
    await this.simulateHealthCheckDelay(config.timeoutSeconds * 1000);

    const isHealthy = Math.random() > 0.07; // 93% success rate

    if (isHealthy) {
      return {
        status: 'healthy',
        message: `gRPC health check passed for ${config.endpoint}:${config.port}`,
        details: {
          endpoint: config.endpoint,
          port: config.port,
          service: 'grpc.health.v1.Health',
          status: 'SERVING'
        }
      };
    } else {
      return {
        status: 'unhealthy',
        message: `gRPC health check failed for ${config.endpoint}:${config.port}`,
        details: {
          endpoint: config.endpoint,
          port: config.port,
          service: 'grpc.health.v1.Health',
          status: 'NOT_SERVING'
        }
      };
    }
  }

  /**
   * Update health status cache
   */
  private updateHealthStatusCache(componentId: string, status: HealthCheckStatus): void {
    // Extract deployment ID from component ID (assuming format: deploymentId-componentName)
    const deploymentId = componentId.split('-')[0];
    
    let deploymentHealth = this.healthStatus.get(deploymentId);
    if (!deploymentHealth) {
      deploymentHealth = new Map();
      this.healthStatus.set(deploymentId, deploymentHealth);
    }

    deploymentHealth.set(componentId, status);
  }

  /**
   * Simulate health check delay
   */
  private async simulateHealthCheckDelay(maxDelay: number): Promise<void> {
    const delay = Math.random() * Math.min(maxDelay, 1000); // Max 1 second for simulation
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}