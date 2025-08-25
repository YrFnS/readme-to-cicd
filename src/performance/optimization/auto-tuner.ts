/**
 * Automated performance optimization and tuning system
 */

import { EventEmitter } from 'events';
import {
  AutoTuningConfig,
  TuningRule,
  TuningAction,
  SafetyLimits,
  RollbackPolicy,
  PerformanceMetrics,
  OptimizationRecommendation
} from '../types/performance-types.js';

export class AutoTuner extends EventEmitter {
  private config: AutoTuningConfig;
  private isRunning = false;
  private tuningInterval?: NodeJS.Timeout;
  private actionHistory: TuningActionHistory[] = [];
  private rollbackQueue: RollbackItem[] = [];

  constructor(config: AutoTuningConfig) {
    super();
    this.config = config;
  }

  /**
   * Start automatic tuning
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.tuningInterval = setInterval(() => {
      this.performTuningCycle();
    }, 60000); // Run every minute

    this.emit('autoTuningStarted');
    console.log('Auto-tuning started');
  }

  /**
   * Stop automatic tuning
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.tuningInterval) {
      clearInterval(this.tuningInterval);
    }

    this.emit('autoTuningStopped');
    console.log('Auto-tuning stopped');
  }

  /**
   * Update tuning configuration
   */
  updateConfig(config: Partial<AutoTuningConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Add a tuning rule
   */
  addRule(rule: TuningRule): void {
    this.config.rules.push(rule);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove a tuning rule
   */
  removeRule(ruleId: string): void {
    this.config.rules = this.config.rules.filter(rule => rule.id !== ruleId);
    this.emit('ruleRemoved', ruleId);
  }

  /**
   * Execute manual tuning action
   */
  async executeAction(action: TuningAction, reason: string): Promise<TuningResult> {
    if (!this.config.enabled) {
      throw new Error('Auto-tuning is disabled');
    }

    const result = await this.performTuningAction(action, reason, true);
    this.emit('manualActionExecuted', { action, result });
    return result;
  }

  /**
   * Rollback last action
   */
  async rollbackLastAction(): Promise<void> {
    if (this.rollbackQueue.length === 0) {
      throw new Error('No actions to rollback');
    }

    const lastAction = this.rollbackQueue.pop()!;
    await this.performRollback(lastAction);
    this.emit('actionRolledBack', lastAction);
  }

  /**
   * Get tuning history
   */
  getTuningHistory(): TuningActionHistory[] {
    return [...this.actionHistory];
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(metrics: PerformanceMetrics[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (metrics.length === 0) return recommendations;

    const latestMetrics = metrics[metrics.length - 1];
    const avgMetrics = this.calculateAverageMetrics(metrics);

    // CPU optimization recommendations
    if (avgMetrics.cpuUsage > 80) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        title: 'Scale Up CPU Resources',
        description: `CPU usage averaging ${avgMetrics.cpuUsage.toFixed(1)}% over recent period`,
        expectedImpact: 'Reduce CPU bottlenecks and improve response times',
        implementationEffort: 'medium',
        estimatedPerformanceGain: 25
      });
    } else if (avgMetrics.cpuUsage < 30) {
      recommendations.push({
        type: 'scaling',
        priority: 'medium',
        title: 'Scale Down CPU Resources',
        description: `CPU usage averaging ${avgMetrics.cpuUsage.toFixed(1)}% - potential for cost savings`,
        expectedImpact: 'Reduce infrastructure costs without performance impact',
        implementationEffort: 'low',
        estimatedCostSavings: 20
      });
    }

    // Memory optimization recommendations
    if (avgMetrics.memoryUsage > 85) {
      recommendations.push({
        type: 'scaling',
        priority: 'critical',
        title: 'Increase Memory Allocation',
        description: `Memory usage averaging ${avgMetrics.memoryUsage.toFixed(1)}% - risk of out-of-memory errors`,
        expectedImpact: 'Prevent memory-related crashes and improve stability',
        implementationEffort: 'low',
        estimatedPerformanceGain: 30
      });
    }

    // Response time optimization
    if (avgMetrics.responseTime > 2000) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        title: 'Implement Response Caching',
        description: `Average response time ${avgMetrics.responseTime.toFixed(0)}ms exceeds acceptable threshold`,
        expectedImpact: 'Reduce response times by 40-60%',
        implementationEffort: 'medium',
        estimatedPerformanceGain: 50
      });
    }

    // Error rate optimization
    if (avgMetrics.errorRate > 0.05) {
      recommendations.push({
        type: 'code',
        priority: 'critical',
        title: 'Address High Error Rate',
        description: `Error rate ${(avgMetrics.errorRate * 100).toFixed(2)}% indicates system issues`,
        expectedImpact: 'Improve system reliability and user experience',
        implementationEffort: 'high',
        estimatedPerformanceGain: 40
      });
    }

    // Network optimization
    if (avgMetrics.networkLatency > 100) {
      recommendations.push({
        type: 'network',
        priority: 'medium',
        title: 'Optimize Network Performance',
        description: `Network latency averaging ${avgMetrics.networkLatency.toFixed(0)}ms`,
        expectedImpact: 'Reduce network-related delays',
        implementationEffort: 'medium',
        estimatedPerformanceGain: 15
      });
    }

    return recommendations;
  }

  private async performTuningCycle(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Get current metrics (in real implementation, this would come from monitoring)
      const currentMetrics = await this.getCurrentMetrics();
      
      // Evaluate all rules
      for (const rule of this.config.rules) {
        if (!rule.enabled) continue;

        const shouldExecute = await this.evaluateRule(rule, currentMetrics);
        if (shouldExecute && this.canExecuteAction(rule)) {
          await this.performTuningAction(rule.action, `Rule: ${rule.name}`, false);
          this.updateRuleCooldown(rule);
        }
      }

      // Process rollback queue
      await this.processRollbackQueue();

    } catch (error) {
      this.emit('tuningError', error);
      console.error('Error in tuning cycle:', error);
    }
  }

  private async evaluateRule(rule: TuningRule, metrics: PerformanceMetrics): Promise<boolean> {
    try {
      // Simple expression evaluation (in production, use a proper expression parser)
      const condition = rule.condition
        .replace(/cpu/g, metrics.cpuUsage.toString())
        .replace(/memory/g, metrics.memoryUsage.toString())
        .replace(/responseTime/g, metrics.responseTime.toString())
        .replace(/errorRate/g, metrics.errorRate.toString())
        .replace(/throughput/g, metrics.throughput.toString());

      // Basic evaluation (this is simplified - use a proper expression evaluator in production)
      return eval(condition);
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      return false;
    }
  }

  private canExecuteAction(rule: TuningRule): boolean {
    // Check cooldown period
    const lastExecution = this.actionHistory
      .filter(h => h.ruleId === rule.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (lastExecution) {
      const timeSinceLastExecution = Date.now() - lastExecution.timestamp.getTime();
      if (timeSinceLastExecution < rule.cooldownPeriod * 1000) {
        return false;
      }
    }

    return true;
  }

  private async performTuningAction(
    action: TuningAction,
    reason: string,
    isManual: boolean
  ): Promise<TuningResult> {
    const actionId = this.generateActionId();
    const startTime = new Date();

    try {
      // Validate against safety limits
      this.validateSafetyLimits(action);

      // Execute the action
      const result = await this.executeActionType(action);

      // Record successful action
      const history: TuningActionHistory = {
        id: actionId,
        action,
        reason,
        timestamp: startTime,
        result: 'success',
        isManual,
        ruleId: isManual ? undefined : this.findRuleIdForAction(action)
      };

      this.actionHistory.push(history);

      // Add to rollback queue if rollback is enabled
      if (this.config.rollbackPolicy.enabled) {
        this.rollbackQueue.push({
          actionId,
          action,
          timestamp: startTime,
          rollbackAction: this.createRollbackAction(action)
        });
      }

      this.emit('actionExecuted', { action, result });
      return result;

    } catch (error) {
      // Record failed action
      const history: TuningActionHistory = {
        id: actionId,
        action,
        reason,
        timestamp: startTime,
        result: 'failed',
        error: error instanceof Error ? error.message : String(error),
        isManual,
        ruleId: isManual ? undefined : this.findRuleIdForAction(action)
      };

      this.actionHistory.push(history);
      this.emit('actionFailed', { action, error });
      throw error;
    }
  }

  private validateSafetyLimits(action: TuningAction): void {
    const limits = this.config.safetyLimits;

    switch (action.type) {
      case 'scale_up':
        if (action.parameters.instances && action.parameters.instances > limits.maxInstances) {
          throw new Error(`Action would exceed maximum instances limit (${limits.maxInstances})`);
        }
        break;
      case 'scale_down':
        if (action.parameters.instances && action.parameters.instances < limits.minInstances) {
          throw new Error(`Action would go below minimum instances limit (${limits.minInstances})`);
        }
        break;
    }
  }

  private async executeActionType(action: TuningAction): Promise<TuningResult> {
    switch (action.type) {
      case 'scale_up':
        return this.executeScaleUp(action);
      case 'scale_down':
        return this.executeScaleDown(action);
      case 'adjust_cache':
        return this.executeAdjustCache(action);
      case 'optimize_query':
        return this.executeOptimizeQuery(action);
      case 'restart_service':
        return this.executeRestartService(action);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeScaleUp(action: TuningAction): Promise<TuningResult> {
    // Simulate scaling up
    console.log('Scaling up resources:', action.parameters);
    
    return {
      success: true,
      message: `Scaled up ${action.parameters.resource || 'instances'} by ${action.parameters.amount || 1}`,
      metrics: {
        before: await this.getCurrentMetrics(),
        after: await this.getCurrentMetrics() // In real implementation, wait and measure
      }
    };
  }

  private async executeScaleDown(action: TuningAction): Promise<TuningResult> {
    // Simulate scaling down
    console.log('Scaling down resources:', action.parameters);
    
    return {
      success: true,
      message: `Scaled down ${action.parameters.resource || 'instances'} by ${action.parameters.amount || 1}`,
      metrics: {
        before: await this.getCurrentMetrics(),
        after: await this.getCurrentMetrics()
      }
    };
  }

  private async executeAdjustCache(action: TuningAction): Promise<TuningResult> {
    // Simulate cache adjustment
    console.log('Adjusting cache settings:', action.parameters);
    
    return {
      success: true,
      message: `Adjusted cache ${action.parameters.setting} to ${action.parameters.value}`,
      metrics: {
        before: await this.getCurrentMetrics(),
        after: await this.getCurrentMetrics()
      }
    };
  }

  private async executeOptimizeQuery(action: TuningAction): Promise<TuningResult> {
    // Simulate query optimization
    console.log('Optimizing database queries:', action.parameters);
    
    return {
      success: true,
      message: `Optimized ${action.parameters.queryType || 'database'} queries`,
      metrics: {
        before: await this.getCurrentMetrics(),
        after: await this.getCurrentMetrics()
      }
    };
  }

  private async executeRestartService(action: TuningAction): Promise<TuningResult> {
    // Simulate service restart
    console.log('Restarting service:', action.parameters);
    
    return {
      success: true,
      message: `Restarted ${action.parameters.service || 'application'} service`,
      metrics: {
        before: await this.getCurrentMetrics(),
        after: await this.getCurrentMetrics()
      }
    };
  }

  private createRollbackAction(action: TuningAction): TuningAction {
    switch (action.type) {
      case 'scale_up':
        return {
          type: 'scale_down',
          parameters: action.parameters,
          maxAdjustment: action.maxAdjustment
        };
      case 'scale_down':
        return {
          type: 'scale_up',
          parameters: action.parameters,
          maxAdjustment: action.maxAdjustment
        };
      default:
        return action; // For actions that can't be easily rolled back
    }
  }

  private async performRollback(rollbackItem: RollbackItem): Promise<void> {
    console.log(`Rolling back action ${rollbackItem.actionId}`);
    await this.executeActionType(rollbackItem.rollbackAction);
  }

  private async processRollbackQueue(): Promise<void> {
    if (!this.config.rollbackPolicy.enabled) return;

    const now = Date.now();
    const rollbackTimeout = this.config.rollbackPolicy.rollbackTimeout * 1000;

    // Check for actions that need rollback due to timeout
    for (let i = this.rollbackQueue.length - 1; i >= 0; i--) {
      const item = this.rollbackQueue[i];
      const age = now - item.timestamp.getTime();

      if (age > rollbackTimeout) {
        // Check if rollback conditions are met
        const shouldRollback = await this.shouldRollbackAction(item);
        if (shouldRollback) {
          await this.performRollback(item);
          this.rollbackQueue.splice(i, 1);
        }
      }
    }
  }

  private async shouldRollbackAction(rollbackItem: RollbackItem): Promise<boolean> {
    // Check rollback trigger conditions
    const currentMetrics = await this.getCurrentMetrics();
    
    for (const condition of this.config.rollbackPolicy.triggerConditions) {
      try {
        const shouldRollback = this.evaluateRollbackCondition(condition, currentMetrics);
        if (shouldRollback) return true;
      } catch (error) {
        console.error('Error evaluating rollback condition:', error);
      }
    }

    return false;
  }

  private evaluateRollbackCondition(condition: string, metrics: PerformanceMetrics): boolean {
    // Simple condition evaluation (use proper expression parser in production)
    const evaluatedCondition = condition
      .replace(/cpu/g, metrics.cpuUsage.toString())
      .replace(/memory/g, metrics.memoryUsage.toString())
      .replace(/responseTime/g, metrics.responseTime.toString())
      .replace(/errorRate/g, metrics.errorRate.toString());

    return eval(evaluatedCondition);
  }

  private updateRuleCooldown(rule: TuningRule): void {
    // Cooldown is handled by checking execution history in canExecuteAction
  }

  private findRuleIdForAction(action: TuningAction): string | undefined {
    // Find which rule would trigger this action
    return this.config.rules.find(rule => 
      rule.action.type === action.type
    )?.id;
  }

  private async getCurrentMetrics(): Promise<PerformanceMetrics> {
    // Simulate current metrics (in real implementation, get from monitoring system)
    return {
      timestamp: new Date(),
      responseTime: 150 + Math.random() * 100,
      throughput: 100 + Math.random() * 50,
      errorRate: Math.random() * 0.05,
      cpuUsage: 50 + Math.random() * 30,
      memoryUsage: 60 + Math.random() * 20,
      diskUsage: 70 + Math.random() * 10,
      networkLatency: 20 + Math.random() * 30,
      concurrentUsers: Math.floor(50 + Math.random() * 100)
    };
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) {
      return {
        timestamp: new Date(),
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
        concurrentUsers: 0
      };
    }

    const sum = metrics.reduce((acc, metric) => ({
      timestamp: new Date(),
      responseTime: acc.responseTime + metric.responseTime,
      throughput: acc.throughput + metric.throughput,
      errorRate: acc.errorRate + metric.errorRate,
      cpuUsage: acc.cpuUsage + metric.cpuUsage,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      diskUsage: acc.diskUsage + metric.diskUsage,
      networkLatency: acc.networkLatency + metric.networkLatency,
      concurrentUsers: acc.concurrentUsers + metric.concurrentUsers
    }), {
      timestamp: new Date(),
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkLatency: 0,
      concurrentUsers: 0
    });

    const count = metrics.length;
    return {
      timestamp: new Date(),
      responseTime: sum.responseTime / count,
      throughput: sum.throughput / count,
      errorRate: sum.errorRate / count,
      cpuUsage: sum.cpuUsage / count,
      memoryUsage: sum.memoryUsage / count,
      diskUsage: sum.diskUsage / count,
      networkLatency: sum.networkLatency / count,
      concurrentUsers: sum.concurrentUsers / count
    };
  }

  private generateActionId(): string {
    return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Additional interfaces
interface TuningActionHistory {
  id: string;
  action: TuningAction;
  reason: string;
  timestamp: Date;
  result: 'success' | 'failed';
  error?: string;
  isManual: boolean;
  ruleId?: string;
}

interface RollbackItem {
  actionId: string;
  action: TuningAction;
  timestamp: Date;
  rollbackAction: TuningAction;
}

interface TuningResult {
  success: boolean;
  message: string;
  metrics: {
    before: PerformanceMetrics;
    after: PerformanceMetrics;
  };
}