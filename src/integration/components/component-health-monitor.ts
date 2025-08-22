import { EventEmitter } from 'events';
import { ComponentDefinition, HealthStatus, HealthCheck, ComponentMetrics } from './types';

/**
 * Component health monitor performs health checks and tracks component status
 */
export class ComponentHealthMonitor extends EventEmitter {
  private readonly components = new Map<string, ComponentDefinition>();
  private readonly healthStatus = new Map<string, HealthStatus>();
  private readonly healthTimers = new Map<string, NodeJS.Timeout>();
  private readonly metrics = new Map<string, ComponentMetrics>();
  
  constructor() {
    super();
  }

  /**
   * Add a component to health monitoring
   */
  async addComponent(component: ComponentDefinition): Promise<void> {
    this.components.set(component.id, component);
    
    // Initialize health status
    const initialStatus: HealthStatus = {
      status: 'healthy',
      checks: [],
      lastUpdated: new Date(),
      uptime: 0,
      version: component.version
    };
    
    this.healthStatus.set(component.id, initialStatus);
    
    this.emit('componentAdded', { componentId: component.id });
  }

  /**
   * Start monitoring a component
   */
  async startMonitoring(componentId: string): Promise<void> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    // Start health check timer
    const timer = setInterval(async () => {
      await this.performHealthCheck(componentId);
    }, component.healthCheck.periodSeconds * 1000);

    this.healthTimers.set(componentId, timer);

    // Perform initial health check after initial delay
    setTimeout(async () => {
      await this.performHealthCheck(componentId);
    }, component.healthCheck.initialDelaySeconds * 1000);

    this.emit('monitoringStarted', { componentId });
  }

  /**
   * Stop monitoring a component
   */
  async stopMonitoring(componentId: string): Promise<void> {
    const timer = this.healthTimers.get(componentId);
    if (timer) {
      clearInterval(timer);
      this.healthTimers.delete(componentId);
    }

    this.emit('monitoringStopped', { componentId });
  }

  /**
   * Remove a component from monitoring
   */
  async removeComponent(componentId: string): Promise<void> {
    await this.stopMonitoring(componentId);
    
    this.components.delete(componentId);
    this.healthStatus.delete(componentId);
    this.metrics.delete(componentId);

    this.emit('componentRemoved', { componentId });
  }

  /**
   * Update component configuration
   */
  async updateComponent(componentId: string, component: ComponentDefinition): Promise<void> {
    const existingComponent = this.components.get(componentId);
    if (!existingComponent) {
      throw new Error(`Component not found: ${componentId}`);
    }

    this.components.set(componentId, component);

    // Restart monitoring if health check configuration changed
    if (JSON.stringify(existingComponent.healthCheck) !== JSON.stringify(component.healthCheck)) {
      await this.stopMonitoring(componentId);
      await this.startMonitoring(componentId);
    }

    this.emit('componentUpdated', { componentId });
  }

  /**
   * Perform health check for a component
   */
  async checkHealth(componentId: string): Promise<HealthStatus> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    const checks: HealthCheck[] = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Perform health check based on type
      const check = await this.performHealthCheckByType(component);
      checks.push(check);

      // Determine overall status
      if (check.status === 'fail') {
        overallStatus = 'unhealthy';
      } else if (check.status === 'warn') {
        overallStatus = 'degraded';
      }

      // Additional checks
      const additionalChecks = await this.performAdditionalChecks(componentId);
      checks.push(...additionalChecks);

      // Update overall status based on all checks
      const hasFailures = checks.some(c => c.status === 'fail');
      const hasWarnings = checks.some(c => c.status === 'warn');

      if (hasFailures) {
        overallStatus = 'unhealthy';
      } else if (hasWarnings) {
        overallStatus = 'degraded';
      }

    } catch (error) {
      checks.push({
        name: 'health-check-error',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date()
      });
      overallStatus = 'unhealthy';
    }

    const currentStatus = this.healthStatus.get(componentId);
    const uptime = currentStatus ? Date.now() - currentStatus.lastUpdated.getTime() + (currentStatus.uptime || 0) : 0;

    const healthStatus: HealthStatus = {
      status: overallStatus,
      checks,
      lastUpdated: new Date(),
      uptime,
      version: component.version
    };

    this.healthStatus.set(componentId, healthStatus);

    // Emit health change event if status changed
    if (currentStatus && currentStatus.status !== overallStatus) {
      this.emit('healthChanged', componentId, healthStatus);
    }

    return healthStatus;
  }

  /**
   * Get current health status
   */
  getHealthStatus(componentId: string): HealthStatus | null {
    return this.healthStatus.get(componentId) || null;
  }

  /**
   * Get metrics for a component
   */
  async getMetrics(componentId: string): Promise<ComponentMetrics | null> {
    return this.metrics.get(componentId) || null;
  }

  /**
   * Update metrics for a component
   */
  updateMetrics(componentId: string, metrics: ComponentMetrics): void {
    this.metrics.set(componentId, metrics);
  }

  /**
   * Get all monitored components
   */
  getMonitoredComponents(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get health summary for all components
   */
  getHealthSummary(): { [componentId: string]: HealthStatus } {
    const summary: { [componentId: string]: HealthStatus } = {};
    
    for (const [componentId, status] of this.healthStatus) {
      summary[componentId] = status;
    }
    
    return summary;
  }

  /**
   * Perform health check based on component type
   */
  private async performHealthCheckByType(component: ComponentDefinition): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      switch (component.healthCheck.type) {
        case 'http':
          return await this.performHttpHealthCheck(component);
        case 'tcp':
          return await this.performTcpHealthCheck(component);
        case 'exec':
          return await this.performExecHealthCheck(component);
        case 'grpc':
          return await this.performGrpcHealthCheck(component);
        default:
          throw new Error(`Unsupported health check type: ${component.healthCheck.type}`);
      }
    } catch (error) {
      return {
        name: `${component.healthCheck.type}-health-check`,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Health check failed',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Perform HTTP health check
   */
  private async performHttpHealthCheck(component: ComponentDefinition): Promise<HealthCheck> {
    const startTime = Date.now();
    
    // Simulate HTTP health check
    await this.sleep(Math.random() * 100 + 50); // 50-150ms
    
    const success = Math.random() > 0.1; // 90% success rate
    const duration = Date.now() - startTime;
    
    return {
      name: 'http-health-check',
      status: success ? 'pass' : 'fail',
      message: success ? 'HTTP endpoint is responding' : 'HTTP endpoint is not responding',
      duration,
      timestamp: new Date()
    };
  }

  /**
   * Perform TCP health check
   */
  private async performTcpHealthCheck(component: ComponentDefinition): Promise<HealthCheck> {
    const startTime = Date.now();
    
    // Simulate TCP health check
    await this.sleep(Math.random() * 50 + 25); // 25-75ms
    
    const success = Math.random() > 0.05; // 95% success rate
    const duration = Date.now() - startTime;
    
    return {
      name: 'tcp-health-check',
      status: success ? 'pass' : 'fail',
      message: success ? 'TCP port is accessible' : 'TCP port is not accessible',
      duration,
      timestamp: new Date()
    };
  }

  /**
   * Perform exec health check
   */
  private async performExecHealthCheck(component: ComponentDefinition): Promise<HealthCheck> {
    const startTime = Date.now();
    
    // Simulate exec health check
    await this.sleep(Math.random() * 200 + 100); // 100-300ms
    
    const success = Math.random() > 0.15; // 85% success rate
    const duration = Date.now() - startTime;
    
    return {
      name: 'exec-health-check',
      status: success ? 'pass' : 'fail',
      message: success ? 'Command executed successfully' : 'Command execution failed',
      duration,
      timestamp: new Date()
    };
  }

  /**
   * Perform gRPC health check
   */
  private async performGrpcHealthCheck(component: ComponentDefinition): Promise<HealthCheck> {
    const startTime = Date.now();
    
    // Simulate gRPC health check
    await this.sleep(Math.random() * 80 + 40); // 40-120ms
    
    const success = Math.random() > 0.08; // 92% success rate
    const duration = Date.now() - startTime;
    
    return {
      name: 'grpc-health-check',
      status: success ? 'pass' : 'fail',
      message: success ? 'gRPC service is healthy' : 'gRPC service is unhealthy',
      duration,
      timestamp: new Date()
    };
  }

  /**
   * Perform additional health checks
   */
  private async performAdditionalChecks(componentId: string): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // Resource usage check
    const resourceCheck = await this.checkResourceUsage(componentId);
    checks.push(resourceCheck);
    
    // Dependency check
    const dependencyCheck = await this.checkDependencies(componentId);
    checks.push(dependencyCheck);
    
    return checks;
  }

  /**
   * Check resource usage
   */
  private async checkResourceUsage(componentId: string): Promise<HealthCheck> {
    const metrics = this.metrics.get(componentId);
    
    if (!metrics) {
      return {
        name: 'resource-usage',
        status: 'warn',
        message: 'No metrics available',
        timestamp: new Date()
      };
    }

    // Check CPU usage
    if (metrics.cpu.current > 90) {
      return {
        name: 'resource-usage',
        status: 'warn',
        message: `High CPU usage: ${metrics.cpu.current}%`,
        timestamp: new Date()
      };
    }

    // Check memory usage (simplified)
    const memoryUsagePercent = (metrics.memory.current / metrics.memory.peak) * 100;
    if (memoryUsagePercent > 90) {
      return {
        name: 'resource-usage',
        status: 'warn',
        message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
        timestamp: new Date()
      };
    }

    return {
      name: 'resource-usage',
      status: 'pass',
      message: 'Resource usage is normal',
      timestamp: new Date()
    };
  }

  /**
   * Check component dependencies
   */
  private async checkDependencies(componentId: string): Promise<HealthCheck> {
    const component = this.components.get(componentId);
    
    if (!component || component.dependencies.length === 0) {
      return {
        name: 'dependencies',
        status: 'pass',
        message: 'No dependencies to check',
        timestamp: new Date()
      };
    }

    // Check if dependencies are healthy
    const unhealthyDeps: string[] = [];
    
    for (const depId of component.dependencies) {
      const depStatus = this.healthStatus.get(depId);
      if (!depStatus || depStatus.status === 'unhealthy') {
        unhealthyDeps.push(depId);
      }
    }

    if (unhealthyDeps.length > 0) {
      return {
        name: 'dependencies',
        status: 'warn',
        message: `Unhealthy dependencies: ${unhealthyDeps.join(', ')}`,
        timestamp: new Date()
      };
    }

    return {
      name: 'dependencies',
      status: 'pass',
      message: 'All dependencies are healthy',
      timestamp: new Date()
    };
  }

  /**
   * Perform health check for a component (internal)
   */
  private async performHealthCheck(componentId: string): Promise<void> {
    try {
      await this.checkHealth(componentId);
    } catch (error) {
      this.emit('healthCheckError', {
        componentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown health monitor
   */
  async shutdown(): Promise<void> {
    // Stop all health check timers
    for (const timer of this.healthTimers.values()) {
      clearInterval(timer);
    }
    this.healthTimers.clear();
    
    this.removeAllListeners();
  }
}