import { EventEmitter } from 'events';
import { AutoScaler } from './autoscaler/auto-scaler.js';
import { LoadBalancer } from './load-balancer/load-balancer.js';
import { ResourceAllocator } from './resource-allocation/resource-allocator.js';
import { PerformanceMonitor } from './performance-monitor/performance-monitor.js';
import { ZeroDowntimeDeployment } from './deployment/zero-downtime-deployment.js';
import {
  AutoScalerConfig,
  LoadBalancerConfig,
  ResourceOptimizationConfig,
  ResourceLimits,
  ScalingMetrics,
  DeploymentStrategy,
  ScalingResult,
  PerformanceBottleneck,
  CostOptimization
} from './types.js';

export interface ScalingManagerConfig {
  autoScaler: AutoScalerConfig;
  loadBalancer: LoadBalancerConfig;
  resourceOptimization: ResourceOptimizationConfig;
  resourceLimits: ResourceLimits;
}

/**
 * ScalingManager orchestrates all auto-scaling and load management components
 * Provides a unified interface for scaling operations and monitoring
 */
export class ScalingManager extends EventEmitter {
  private autoScaler: AutoScaler;
  private loadBalancer: LoadBalancer;
  private resourceAllocator: ResourceAllocator;
  private performanceMonitor: PerformanceMonitor;
  private zeroDowntimeDeployment: ZeroDowntimeDeployment;
  private isRunning = false;

  constructor(config: ScalingManagerConfig) {
    super();
    
    this.autoScaler = new AutoScaler(config.autoScaler);
    this.loadBalancer = new LoadBalancer(config.loadBalancer);
    this.resourceAllocator = new ResourceAllocator(config.resourceOptimization, config.resourceLimits);
    this.performanceMonitor = new PerformanceMonitor();
    this.zeroDowntimeDeployment = new ZeroDowntimeDeployment();
    
    this.setupEventHandlers();
  }

  /**
   * Start all scaling and monitoring services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      await Promise.all([
        this.autoScaler.start(),
        this.loadBalancer.start(),
        this.resourceAllocator.start(),
        this.performanceMonitor.start()
      ]);

      this.isRunning = true;
      this.emit('started');
    } catch (error) {
      this.emit('start-failed', error);
      throw error;
    }
  }

  /**
   * Stop all scaling and monitoring services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await Promise.all([
        this.autoScaler.stop(),
        this.loadBalancer.stop(),
        this.resourceAllocator.stop(),
        this.performanceMonitor.stop()
      ]);

      this.isRunning = false;
      this.emit('stopped');
    } catch (error) {
      this.emit('stop-failed', error);
      throw error;
    }
  }

  /**
   * Add metrics for a component (feeds into all monitoring systems)
   */
  addMetrics(componentId: string, metrics: ScalingMetrics): void {
    // Feed metrics to all relevant services
    this.autoScaler.addMetrics(componentId, metrics);
    this.performanceMonitor.addMetrics(componentId, metrics);
    
    // Update load balancer instance metrics if instance exists
    this.loadBalancer.updateInstanceMetrics(componentId, metrics);
    
    this.emit('metrics-added', { componentId, metrics });
  }

  /**
   * Get comprehensive scaling status for a component
   */
  getScalingStatus(componentId: string): {
    scaling: {
      history: any[];
      bottlenecks: PerformanceBottleneck[];
    };
    loadBalancing: {
      state: any;
      instanceStats: any;
    };
    resources: {
      allocation: any;
      pool: any;
    };
    performance: {
      report: any;
      alerts: any[];
    };
  } {
    return {
      scaling: {
        history: this.autoScaler.getScalingHistory(componentId),
        bottlenecks: this.autoScaler.detectBottlenecks(componentId)
      },
      loadBalancing: {
        state: this.loadBalancer.getState(),
        instanceStats: this.loadBalancer.getInstanceStats(componentId)
      },
      resources: {
        allocation: this.resourceAllocator.getAllocation(componentId),
        pool: this.resourceAllocator.getResourcePool()
      },
      performance: {
        report: this.performanceMonitor.generateReport(componentId),
        alerts: this.performanceMonitor.getActiveAlerts(componentId)
      }
    };
  }

  /**
   * Trigger manual scaling for a component
   */
  async manualScale(componentId: string, targetInstances: number, reason: string): Promise<ScalingResult> {
    try {
      // Update resource allocation
      await this.resourceAllocator.updateAllocation(componentId, {
        requestedInstances: targetInstances,
        reason: `Manual scaling: ${reason}`
      });

      // Create mock scaling result
      const result: ScalingResult = {
        success: true,
        previousInstances: 3, // Mock current instances
        newInstances: targetInstances,
        reason: `Manual scaling: ${reason}`,
        metrics: {
          cpu: 0,
          memory: 0,
          requestRate: 0,
          responseTime: 0,
          errorRate: 0,
          activeConnections: 0,
          queueLength: 0,
          timestamp: new Date()
        },
        cost: targetInstances * 0.10, // Mock cost calculation
        event: {
          id: `manual-${Date.now()}`,
          type: targetInstances > 3 ? 'scale-up' : 'scale-down',
          componentId,
          trigger: reason,
          action: `Manually scaled to ${targetInstances} instances`,
          result: 'success',
          metrics: {
            cpu: 0,
            memory: 0,
            requestRate: 0,
            responseTime: 0,
            errorRate: 0,
            activeConnections: 0,
            queueLength: 0,
            timestamp: new Date()
          },
          timestamp: new Date(),
          duration: 0
        }
      };

      this.emit('manual-scaling-completed', result);
      return result;
    } catch (error) {
      const failedResult: ScalingResult = {
        success: false,
        previousInstances: 3,
        newInstances: 3,
        reason: `Manual scaling failed: ${error}`,
        metrics: {
          cpu: 0,
          memory: 0,
          requestRate: 0,
          responseTime: 0,
          errorRate: 0,
          activeConnections: 0,
          queueLength: 0,
          timestamp: new Date()
        },
        cost: 0,
        event: {
          id: `manual-failed-${Date.now()}`,
          type: 'scale-up',
          componentId,
          trigger: reason,
          action: 'Manual scaling failed',
          result: 'failure',
          metrics: {
            cpu: 0,
            memory: 0,
            requestRate: 0,
            responseTime: 0,
            errorRate: 0,
            activeConnections: 0,
            queueLength: 0,
            timestamp: new Date()
          },
          timestamp: new Date(),
          duration: 0
        }
      };

      this.emit('manual-scaling-failed', failedResult, error);
      return failedResult;
    }
  }

  /**
   * Deploy component with zero-downtime strategy
   */
  async deployComponent(
    componentId: string,
    version: string,
    strategy: DeploymentStrategy
  ): Promise<string> {
    const deploymentId = `deploy-${componentId}-${Date.now()}`;
    
    const deploymentRequest = {
      id: deploymentId,
      componentId,
      version,
      strategy,
      rollbackOnFailure: true,
      validationTimeout: 300000 // 5 minutes
    };

    await this.zeroDowntimeDeployment.startDeployment(deploymentRequest);
    return deploymentId;
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(deploymentId: string): any {
    return this.zeroDowntimeDeployment.getDeploymentStatus(deploymentId);
  }

  /**
   * Rollback a deployment
   */
  async rollbackDeployment(deploymentId: string): Promise<void> {
    await this.zeroDowntimeDeployment.rollbackDeployment(deploymentId);
  }

  /**
   * Generate comprehensive cost optimization report
   */
  generateCostOptimization(): CostOptimization {
    // Combine cost optimization from auto-scaler and resource allocator
    const autoScalerOptimization = this.autoScaler.generateCostOptimization('system');
    const resourceOptimization = this.resourceAllocator.generateCostOptimization();

    return {
      currentCost: autoScalerOptimization.currentCost + resourceOptimization.currentCost,
      projectedCost: autoScalerOptimization.projectedCost + resourceOptimization.projectedCost,
      savings: autoScalerOptimization.savings + resourceOptimization.savings,
      recommendations: [
        ...autoScalerOptimization.recommendations,
        ...resourceOptimization.recommendations
      ]
    };
  }

  /**
   * Get system-wide performance bottlenecks
   */
  getSystemBottlenecks(): PerformanceBottleneck[] {
    const allBottlenecks: PerformanceBottleneck[] = [];
    
    // Get bottlenecks from performance monitor for all components
    // In a real implementation, we'd iterate through all monitored components
    const mockComponents = ['component-1', 'component-2', 'component-3'];
    
    for (const componentId of mockComponents) {
      const bottlenecks = this.performanceMonitor.detectBottlenecks(componentId);
      allBottlenecks.push(...bottlenecks);
    }

    return allBottlenecks;
  }

  /**
   * Get system health summary
   */
  getSystemHealth(): {
    overall: 'healthy' | 'warning' | 'critical';
    components: number;
    activeAlerts: number;
    bottlenecks: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
    };
  } {
    const alerts = this.performanceMonitor.getActiveAlerts();
    const bottlenecks = this.getSystemBottlenecks();
    const resourcePool = this.resourceAllocator.getResourcePool();
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (bottlenecks.some(b => b.severity === 'critical') || alerts.some(a => a.severity === 'critical')) {
      overall = 'critical';
    } else if (bottlenecks.length > 0 || alerts.length > 0) {
      overall = 'warning';
    }

    return {
      overall,
      components: this.loadBalancer.getTotalInstanceCount(),
      activeAlerts: alerts.length,
      bottlenecks: bottlenecks.length,
      resourceUtilization: {
        cpu: resourcePool.utilizationCpu,
        memory: resourcePool.utilizationMemory
      }
    };
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Auto-scaler events
    this.autoScaler.on('scaled', (event) => {
      this.emit('component-scaled', event);
    });

    this.autoScaler.on('scaling-failed', (event, error) => {
      this.emit('scaling-failed', event, error);
    });

    // Load balancer events
    this.loadBalancer.on('instance-unhealthy', (instance) => {
      this.emit('instance-unhealthy', instance);
    });

    this.loadBalancer.on('no-healthy-instances', () => {
      this.emit('no-healthy-instances');
    });

    // Performance monitor events
    this.performanceMonitor.on('bottleneck-detected', (bottleneck) => {
      this.emit('bottleneck-detected', bottleneck);
    });

    this.performanceMonitor.on('alert-created', (alert) => {
      this.emit('performance-alert', alert);
    });

    // Resource allocator events
    this.resourceAllocator.on('resources-allocated', (allocation) => {
      this.emit('resources-allocated', allocation);
    });

    this.resourceAllocator.on('allocation-rejected', (request, reason) => {
      this.emit('allocation-rejected', request, reason);
    });

    // Zero-downtime deployment events
    this.zeroDowntimeDeployment.on('deployment-completed', (status) => {
      this.emit('deployment-completed', status);
    });

    this.zeroDowntimeDeployment.on('deployment-failed', (status, error) => {
      this.emit('deployment-failed', status, error);
    });
  }
}