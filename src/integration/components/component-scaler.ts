import { EventEmitter } from 'events';
import { ScalingConfig, ScalingPolicy, ComponentMetrics, MetricValue } from './types';

/**
 * Component scaler handles auto-scaling and manual scaling operations
 */
export class ComponentScaler extends EventEmitter {
  private readonly scalingPolicies = new Map<string, ScalingPolicy>();
  private readonly currentReplicas = new Map<string, number>();
  private readonly autoScalingEnabled = new Map<string, boolean>();
  private readonly scalingTimers = new Map<string, NodeJS.Timeout>();
  private readonly metrics = new Map<string, ComponentMetrics>();
  
  private readonly scalingInterval = 30000; // 30 seconds
  private readonly scaleUpCooldown = 180000; // 3 minutes
  private readonly scaleDownCooldown = 300000; // 5 minutes
  private readonly lastScaleActions = new Map<string, { action: 'up' | 'down'; timestamp: number }>();

  constructor() {
    super();
    this.startMetricsCollection();
  }

  /**
   * Enable auto-scaling for a component
   */
  async enableAutoScaling(componentId: string, policy: ScalingPolicy): Promise<void> {
    this.scalingPolicies.set(componentId, policy);
    this.currentReplicas.set(componentId, policy.minReplicas);
    this.autoScalingEnabled.set(componentId, true);

    // Start auto-scaling loop
    const timer = setInterval(() => {
      this.evaluateScaling(componentId);
    }, this.scalingInterval);
    
    this.scalingTimers.set(componentId, timer);

    this.emit('autoScalingEnabled', { componentId, policy });
  }

  /**
   * Disable auto-scaling for a component
   */
  async disableAutoScaling(componentId: string): Promise<void> {
    this.autoScalingEnabled.set(componentId, false);
    
    const timer = this.scalingTimers.get(componentId);
    if (timer) {
      clearInterval(timer);
      this.scalingTimers.delete(componentId);
    }

    this.emit('autoScalingDisabled', { componentId });
  }

  /**
   * Manually scale a component
   */
  async scale(componentId: string, scaling: ScalingConfig): Promise<void> {
    const policy = this.scalingPolicies.get(componentId);
    if (!policy) {
      throw new Error(`No scaling policy found for component: ${componentId}`);
    }

    let targetReplicas: number;

    if (scaling.replicas !== undefined) {
      // Manual replica count
      targetReplicas = Math.max(policy.minReplicas, Math.min(policy.maxReplicas, scaling.replicas));
    } else {
      // Use current replicas
      targetReplicas = this.currentReplicas.get(componentId) || policy.minReplicas;
    }

    await this.scaleToReplicas(componentId, targetReplicas, 'manual');

    // Update policy if provided
    if (scaling.policy) {
      this.scalingPolicies.set(componentId, { ...policy, ...scaling.policy });
    }

    // Enable/disable auto-scaling if specified
    if (scaling.autoScaling !== undefined) {
      if (scaling.autoScaling) {
        await this.enableAutoScaling(componentId, this.scalingPolicies.get(componentId)!);
      } else {
        await this.disableAutoScaling(componentId);
      }
    }
  }

  /**
   * Update scaling policy for a component
   */
  async updateScalingPolicy(componentId: string, policy: ScalingPolicy): Promise<void> {
    const existingPolicy = this.scalingPolicies.get(componentId);
    if (!existingPolicy) {
      throw new Error(`No existing scaling policy found for component: ${componentId}`);
    }

    const updatedPolicy = { ...existingPolicy, ...policy };
    this.scalingPolicies.set(componentId, updatedPolicy);

    // Ensure current replicas are within new bounds
    const currentReplicas = this.currentReplicas.get(componentId) || updatedPolicy.minReplicas;
    const targetReplicas = Math.max(updatedPolicy.minReplicas, Math.min(updatedPolicy.maxReplicas, currentReplicas));
    
    if (targetReplicas !== currentReplicas) {
      await this.scaleToReplicas(componentId, targetReplicas, 'policy-update');
    }

    this.emit('scalingPolicyUpdated', { componentId, policy: updatedPolicy });
  }

  /**
   * Get current scaling status
   */
  getScalingStatus(componentId: string): {
    currentReplicas: number;
    policy: ScalingPolicy | null;
    autoScalingEnabled: boolean;
    lastScaleAction?: { action: 'up' | 'down'; timestamp: number };
  } {
    return {
      currentReplicas: this.currentReplicas.get(componentId) || 0,
      policy: this.scalingPolicies.get(componentId) || null,
      autoScalingEnabled: this.autoScalingEnabled.get(componentId) || false,
      lastScaleAction: this.lastScaleActions.get(componentId)
    };
  }

  /**
   * Update metrics for a component
   */
  updateMetrics(componentId: string, metrics: ComponentMetrics): void {
    this.metrics.set(componentId, metrics);
  }

  /**
   * Evaluate scaling decision for a component
   */
  private async evaluateScaling(componentId: string): Promise<void> {
    if (!this.autoScalingEnabled.get(componentId)) {
      return;
    }

    const policy = this.scalingPolicies.get(componentId);
    const currentReplicas = this.currentReplicas.get(componentId);
    const metrics = this.metrics.get(componentId);

    if (!policy || !currentReplicas || !metrics) {
      return;
    }

    try {
      const scalingDecision = this.makeScalingDecision(componentId, policy, currentReplicas, metrics);
      
      if (scalingDecision.shouldScale) {
        await this.scaleToReplicas(componentId, scalingDecision.targetReplicas, 'auto');
      }

    } catch (error) {
      this.emit('scalingError', { 
        componentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Make scaling decision based on metrics and policy
   */
  private makeScalingDecision(
    componentId: string,
    policy: ScalingPolicy,
    currentReplicas: number,
    metrics: ComponentMetrics
  ): { shouldScale: boolean; targetReplicas: number; reason: string } {
    
    const lastAction = this.lastScaleActions.get(componentId);
    const now = Date.now();

    // Check cooldown periods
    if (lastAction) {
      const timeSinceLastAction = now - lastAction.timestamp;
      const cooldownPeriod = lastAction.action === 'up' ? this.scaleUpCooldown : this.scaleDownCooldown;
      
      if (timeSinceLastAction < cooldownPeriod) {
        return { shouldScale: false, targetReplicas: currentReplicas, reason: 'cooldown' };
      }
    }

    // Evaluate CPU utilization
    let shouldScaleUp = false;
    let shouldScaleDown = false;
    let reason = '';

    if (policy.targetCPUUtilization) {
      const cpuUtilization = metrics.cpu.current;
      const targetCPU = policy.targetCPUUtilization;

      if (cpuUtilization > targetCPU * 1.1) { // 10% buffer
        shouldScaleUp = true;
        reason = `CPU utilization ${cpuUtilization}% > target ${targetCPU}%`;
      } else if (cpuUtilization < targetCPU * 0.7) { // 30% buffer
        shouldScaleDown = true;
        reason = `CPU utilization ${cpuUtilization}% < target ${targetCPU}%`;
      }
    }

    // Evaluate memory utilization
    if (policy.targetMemoryUtilization) {
      const memoryUtilization = this.calculateMemoryUtilization(metrics.memory);
      const targetMemory = policy.targetMemoryUtilization;

      if (memoryUtilization > targetMemory * 1.1) {
        shouldScaleUp = true;
        reason = `Memory utilization ${memoryUtilization}% > target ${targetMemory}%`;
      } else if (memoryUtilization < targetMemory * 0.7 && !shouldScaleUp) {
        shouldScaleDown = true;
        reason = `Memory utilization ${memoryUtilization}% < target ${targetMemory}%`;
      }
    }

    // Evaluate custom metrics
    if (policy.customMetrics) {
      for (const customMetric of policy.customMetrics) {
        const metricValue = metrics.custom?.[customMetric.name];
        if (metricValue) {
          if (metricValue.current > customMetric.targetValue * 1.1) {
            shouldScaleUp = true;
            reason = `${customMetric.name} ${metricValue.current} > target ${customMetric.targetValue}`;
            break;
          } else if (metricValue.current < customMetric.targetValue * 0.7 && !shouldScaleUp) {
            shouldScaleDown = true;
            reason = `${customMetric.name} ${metricValue.current} < target ${customMetric.targetValue}`;
          }
        }
      }
    }

    // Calculate target replicas
    let targetReplicas = currentReplicas;

    if (shouldScaleUp && currentReplicas < policy.maxReplicas) {
      // Scale up calculation
      const scaleUpPolicy = policy.scaleUpPolicy;
      if (scaleUpPolicy && scaleUpPolicy.policies.length > 0) {
        const scalePolicy = scaleUpPolicy.policies[0]; // Use first policy for simplicity
        if (scalePolicy.type === 'Percent') {
          targetReplicas = Math.ceil(currentReplicas * (1 + scalePolicy.value / 100));
        } else {
          targetReplicas = currentReplicas + scalePolicy.value;
        }
      } else {
        targetReplicas = Math.min(currentReplicas + 1, policy.maxReplicas);
      }
      targetReplicas = Math.min(targetReplicas, policy.maxReplicas);
    } else if (shouldScaleDown && currentReplicas > policy.minReplicas) {
      // Scale down calculation
      const scaleDownPolicy = policy.scaleDownPolicy;
      if (scaleDownPolicy && scaleDownPolicy.policies.length > 0) {
        const scalePolicy = scaleDownPolicy.policies[0]; // Use first policy for simplicity
        if (scalePolicy.type === 'Percent') {
          targetReplicas = Math.floor(currentReplicas * (1 - scalePolicy.value / 100));
        } else {
          targetReplicas = currentReplicas - scalePolicy.value;
        }
      } else {
        targetReplicas = Math.max(currentReplicas - 1, policy.minReplicas);
      }
      targetReplicas = Math.max(targetReplicas, policy.minReplicas);
    }

    return {
      shouldScale: targetReplicas !== currentReplicas,
      targetReplicas,
      reason
    };
  }

  /**
   * Scale component to target replica count
   */
  private async scaleToReplicas(componentId: string, targetReplicas: number, trigger: string): Promise<void> {
    const currentReplicas = this.currentReplicas.get(componentId) || 0;
    
    if (targetReplicas === currentReplicas) {
      return;
    }

    const action = targetReplicas > currentReplicas ? 'up' : 'down';
    
    this.emit('scalingStarted', {
      componentId,
      currentReplicas,
      targetReplicas,
      action,
      trigger
    });

    try {
      // Simulate scaling operation
      await this.performScaling(componentId, targetReplicas);
      
      // Update state
      this.currentReplicas.set(componentId, targetReplicas);
      this.lastScaleActions.set(componentId, { action, timestamp: Date.now() });

      this.emit('scalingCompleted', {
        componentId,
        previousReplicas: currentReplicas,
        currentReplicas: targetReplicas,
        action,
        trigger
      });

    } catch (error) {
      this.emit('scalingFailed', {
        componentId,
        targetReplicas,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Perform the actual scaling operation
   */
  private async performScaling(componentId: string, targetReplicas: number): Promise<void> {
    // Simulate scaling delay
    await this.sleep(2000);
    
    // In a real implementation, this would interact with the deployment system
    console.log(`Scaling component ${componentId} to ${targetReplicas} replicas`);
  }

  /**
   * Calculate memory utilization percentage
   */
  private calculateMemoryUtilization(memory: MetricValue): number {
    // This is a simplified calculation
    // In a real implementation, this would calculate actual memory utilization
    return (memory.current / memory.peak) * 100;
  }

  /**
   * Start metrics collection simulation
   */
  private startMetricsCollection(): void {
    // Simulate metrics collection every 15 seconds
    setInterval(() => {
      this.simulateMetrics();
    }, 15000);
  }

  /**
   * Simulate metrics for testing
   */
  private simulateMetrics(): void {
    for (const [componentId, _] of this.scalingPolicies) {
      if (this.autoScalingEnabled.get(componentId)) {
        const simulatedMetrics: ComponentMetrics = {
          cpu: {
            current: Math.random() * 100,
            average: 50 + Math.random() * 30,
            peak: 80 + Math.random() * 20,
            unit: 'percent',
            timestamp: new Date()
          },
          memory: {
            current: 100 + Math.random() * 400, // MB
            average: 200 + Math.random() * 200,
            peak: 400 + Math.random() * 200,
            unit: 'MB',
            timestamp: new Date()
          },
          network: {
            bytesIn: {
              current: Math.random() * 1000000,
              average: 500000,
              peak: 2000000,
              unit: 'bytes/sec',
              timestamp: new Date()
            },
            bytesOut: {
              current: Math.random() * 800000,
              average: 400000,
              peak: 1600000,
              unit: 'bytes/sec',
              timestamp: new Date()
            },
            packetsIn: {
              current: Math.random() * 1000,
              average: 500,
              peak: 2000,
              unit: 'packets/sec',
              timestamp: new Date()
            },
            packetsOut: {
              current: Math.random() * 800,
              average: 400,
              peak: 1600,
              unit: 'packets/sec',
              timestamp: new Date()
            }
          },
          requests: {
            total: Math.floor(Math.random() * 10000),
            rate: Math.random() * 100,
            latency: {
              p50: 50 + Math.random() * 50,
              p95: 100 + Math.random() * 100,
              p99: 200 + Math.random() * 200,
              mean: 75 + Math.random() * 75,
              unit: 'ms'
            },
            statusCodes: {
              '200': Math.floor(Math.random() * 8000),
              '404': Math.floor(Math.random() * 100),
              '500': Math.floor(Math.random() * 50)
            }
          },
          errors: {
            total: Math.floor(Math.random() * 100),
            rate: Math.random() * 5,
            types: {
              'timeout': Math.floor(Math.random() * 30),
              'connection': Math.floor(Math.random() * 20),
              'validation': Math.floor(Math.random() * 10)
            }
          }
        };

        this.updateMetrics(componentId, simulatedMetrics);
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown scaler
   */
  async shutdown(): Promise<void> {
    // Clear all timers
    for (const timer of this.scalingTimers.values()) {
      clearInterval(timer);
    }
    this.scalingTimers.clear();
    
    this.removeAllListeners();
  }
}