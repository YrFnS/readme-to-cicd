import { EventEmitter } from 'events';
import {
  AutoScalerConfig,
  ScalingMetrics,
  ScalingPolicy,
  ScalingResult,
  ScalingEvent,
  PerformanceBottleneck,
  CostOptimization
} from '../types.js';

/**
 * AutoScaler implements demand-based scaling policies and resource optimization
 * Requirement 6.1: Automatically scale components based on demand
 * Requirement 6.2: Implement intelligent resource allocation
 */
export class AutoScaler extends EventEmitter {
  private config: AutoScalerConfig;
  private metricsHistory: Map<string, ScalingMetrics[]> = new Map();
  private scalingEvents: ScalingEvent[] = [];
  private evaluationTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: AutoScalerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the auto-scaling engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.evaluationTimer = setInterval(
      () => this.evaluateScaling(),
      this.config.evaluationInterval * 1000
    );

    this.emit('started');
  }

  /**
   * Stop the auto-scaling engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }

    this.emit('stopped');
  }

  /**
   * Add metrics for a component
   */
  addMetrics(componentId: string, metrics: ScalingMetrics): void {
    if (!this.metricsHistory.has(componentId)) {
      this.metricsHistory.set(componentId, []);
    }

    const history = this.metricsHistory.get(componentId)!;
    history.push(metrics);

    // Keep only metrics within the window
    const cutoff = new Date(Date.now() - this.config.metricsWindow * 1000);
    const filtered = history.filter(m => m.timestamp >= cutoff);
    this.metricsHistory.set(componentId, filtered);
  }

  /**
   * Evaluate scaling decisions for all components
   */
  private async evaluateScaling(): Promise<void> {
    for (const [componentId, metrics] of this.metricsHistory) {
      if (metrics.length === 0) continue;

      const latestMetrics = metrics[metrics.length - 1];
      
      for (const policy of this.config.policies) {
        if (!policy.enabled) continue;

        const decision = this.evaluatePolicy(policy, latestMetrics, componentId);
        if (decision) {
          await this.executeScaling(componentId, decision, policy, latestMetrics);
        }
      }
    }
  }

  /**
   * Evaluate a single scaling policy
   */
  private evaluatePolicy(
    policy: ScalingPolicy,
    metrics: ScalingMetrics,
    componentId: string
  ): 'scale-up' | 'scale-down' | null {
    const metricValue = metrics[policy.targetMetric];
    
    // Check if we're in cooldown period
    const lastEvent = this.getLastScalingEvent(componentId, policy.id);
    if (lastEvent && this.isInCooldown(lastEvent, policy.cooldownPeriod)) {
      return null;
    }

    if (metricValue > policy.scaleUpThreshold) {
      return 'scale-up';
    } else if (metricValue < policy.scaleDownThreshold) {
      return 'scale-down';
    }

    return null;
  }

  /**
   * Execute scaling action
   */
  private async executeScaling(
    componentId: string,
    action: 'scale-up' | 'scale-down',
    policy: ScalingPolicy,
    metrics: ScalingMetrics
  ): Promise<ScalingResult> {
    const startTime = Date.now();
    
    try {
      // Get current instance count (mock implementation)
      const currentInstances = await this.getCurrentInstances(componentId);
      
      let newInstances: number;
      if (action === 'scale-up') {
        newInstances = Math.min(
          currentInstances + policy.scaleUpStep,
          policy.maxInstances
        );
      } else {
        newInstances = Math.max(
          currentInstances - policy.scaleDownStep,
          policy.minInstances
        );
      }

      // Execute the scaling (mock implementation)
      await this.scaleComponent(componentId, newInstances);

      const event: ScalingEvent = {
        id: this.generateEventId(),
        type: action,
        componentId,
        trigger: `${policy.targetMetric} ${action === 'scale-up' ? 'above' : 'below'} threshold`,
        action: `Scaled from ${currentInstances} to ${newInstances} instances`,
        result: 'success',
        metrics,
        timestamp: new Date(),
        duration: Date.now() - startTime
      };

      this.scalingEvents.push(event);
      this.emit('scaled', event);

      return {
        success: true,
        previousInstances: currentInstances,
        newInstances,
        reason: event.trigger,
        metrics,
        cost: this.calculateCost(newInstances),
        event
      };
    } catch (error) {
      const event: ScalingEvent = {
        id: this.generateEventId(),
        type: action,
        componentId,
        trigger: `${policy.targetMetric} threshold`,
        action: `Failed to scale component`,
        result: 'failure',
        metrics,
        timestamp: new Date(),
        duration: Date.now() - startTime
      };

      this.scalingEvents.push(event);
      this.emit('scaling-failed', event, error);

      return {
        success: false,
        previousInstances: await this.getCurrentInstances(componentId),
        newInstances: await this.getCurrentInstances(componentId),
        reason: `Scaling failed: ${error}`,
        metrics,
        cost: 0,
        event
      };
    }
  }

  /**
   * Detect performance bottlenecks
   * Requirement 6.4: Identify and resolve scaling constraints
   */
  detectBottlenecks(componentId: string): PerformanceBottleneck[] {
    const metrics = this.metricsHistory.get(componentId);
    if (!metrics || metrics.length === 0) {
      return [];
    }

    const bottlenecks: PerformanceBottleneck[] = [];
    const latestMetrics = metrics[metrics.length - 1];

    // CPU bottleneck
    if (latestMetrics.cpu > 80) {
      bottlenecks.push({
        type: 'cpu',
        severity: latestMetrics.cpu >= 95 ? 'critical' : 'high',
        description: `High CPU usage: ${latestMetrics.cpu}%`,
        affectedComponents: [componentId],
        recommendations: [
          'Scale up instances',
          'Optimize CPU-intensive operations',
          'Consider vertical scaling'
        ],
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Memory bottleneck
    if (latestMetrics.memory > 85) {
      bottlenecks.push({
        type: 'memory',
        severity: latestMetrics.memory > 95 ? 'critical' : 'high',
        description: `High memory usage: ${latestMetrics.memory}%`,
        affectedComponents: [componentId],
        recommendations: [
          'Scale up instances',
          'Optimize memory usage',
          'Implement memory caching strategies'
        ],
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Response time bottleneck
    if (latestMetrics.responseTime > 2000) {
      bottlenecks.push({
        type: 'network',
        severity: latestMetrics.responseTime > 5000 ? 'critical' : 'medium',
        description: `High response time: ${latestMetrics.responseTime}ms`,
        affectedComponents: [componentId],
        recommendations: [
          'Scale up instances',
          'Optimize database queries',
          'Implement caching',
          'Review network configuration'
        ],
        detectedAt: new Date(),
        resolved: false
      });
    }

    return bottlenecks;
  }

  /**
   * Generate cost optimization recommendations
   * Requirement 6.3: Provide cost tracking and optimization recommendations
   */
  generateCostOptimization(componentId: string): CostOptimization {
    const metrics = this.metricsHistory.get(componentId);
    const currentInstances = 3; // Mock current instances
    const currentCost = this.calculateCost(currentInstances);

    const recommendations = [];
    let projectedSavings = 0;

    // Analyze usage patterns
    if (metrics && metrics.length > 0) {
      const avgCpu = metrics.reduce((sum, m) => sum + m.cpu, 0) / metrics.length;
      const avgMemory = metrics.reduce((sum, m) => sum + m.memory, 0) / metrics.length;

      // Recommend downsizing if consistently low usage
      if (avgCpu < 30 && avgMemory < 40) {
        const savings = currentCost * 0.3;
        projectedSavings += savings;
        recommendations.push({
          type: 'downsize' as const,
          description: 'Reduce instance size due to low resource utilization',
          estimatedSavings: savings,
          impact: 'low' as const
        });
      }

      // Recommend scheduled scaling for predictable patterns
      const hasPattern = this.detectUsagePattern(metrics);
      if (hasPattern) {
        const savings = currentCost * 0.15;
        projectedSavings += savings;
        recommendations.push({
          type: 'schedule' as const,
          description: 'Implement scheduled scaling based on usage patterns',
          estimatedSavings: savings,
          impact: 'medium' as const
        });
      }
    }

    return {
      currentCost,
      projectedCost: currentCost - projectedSavings,
      savings: projectedSavings,
      recommendations
    };
  }

  /**
   * Get scaling history for a component
   */
  getScalingHistory(componentId: string): ScalingEvent[] {
    return this.scalingEvents.filter(event => event.componentId === componentId);
  }

  /**
   * Update scaling policy
   */
  updatePolicy(policy: ScalingPolicy): void {
    const index = this.config.policies.findIndex(p => p.id === policy.id);
    if (index >= 0) {
      this.config.policies[index] = policy;
    } else {
      this.config.policies.push(policy);
    }
  }

  // Private helper methods

  private getLastScalingEvent(componentId: string, policyId: string): ScalingEvent | null {
    const events = this.scalingEvents
      .filter(e => e.componentId === componentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return events[0] || null;
  }

  private isInCooldown(event: ScalingEvent, cooldownPeriod: number): boolean {
    const elapsed = (Date.now() - event.timestamp.getTime()) / 1000;
    return elapsed < cooldownPeriod;
  }

  private async getCurrentInstances(componentId: string): Promise<number> {
    // Mock implementation - in real system, this would query the orchestrator
    return 3;
  }

  private async scaleComponent(componentId: string, instances: number): Promise<void> {
    // Mock implementation - in real system, this would call the orchestrator
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private calculateCost(instances: number): number {
    // Mock cost calculation - $0.10 per instance per hour
    return instances * 0.10;
  }

  private detectUsagePattern(metrics: ScalingMetrics[]): boolean {
    // Simple pattern detection - check for regular peaks/valleys
    if (metrics.length < 24) return false;
    
    const hourlyAvg = [];
    for (let i = 0; i < metrics.length; i += 6) { // 6 metrics per hour (10min intervals)
      const slice = metrics.slice(i, i + 6);
      const avg = slice.reduce((sum, m) => sum + m.cpu, 0) / slice.length;
      hourlyAvg.push(avg);
    }

    // Check for consistent patterns (simplified)
    const variance = this.calculateVariance(hourlyAvg);
    return variance > 100; // Threshold for pattern detection
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private generateEventId(): string {
    return `scale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}