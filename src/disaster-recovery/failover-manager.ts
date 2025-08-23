/**
 * Failover Manager
 * 
 * Handles automatic and manual failover operations, health monitoring,
 * and rollback procedures for high availability and disaster recovery.
 */

import { EventEmitter } from 'events';
import {
  FailoverStrategy,
  FailoverResult,
  FailoverTrigger,
  HealthCheckConfig,
  HealthStatus,
  RollbackPolicy
} from './types.js';

export class FailoverManager extends EventEmitter {
  private config: FailoverStrategy;
  private isInitialized = false;
  private healthChecks: Map<string, HealthCheckConfig> = new Map();
  private healthStatuses: Map<string, HealthStatus> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private triggerCooldowns: Map<string, number> = new Map();
  private currentPrimary: string = 'primary-region';
  private failoverHistory: FailoverRecord[] = [];
  private isFailoverInProgress = false;

  constructor(config: FailoverStrategy) {
    super();
    this.config = config;
    this.initializeHealthChecks();
  }

  /**
   * Initialize the failover manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Initialize trigger monitoring if automatic failover is enabled
      if (this.config.type === 'automatic' || this.config.type === 'hybrid') {
        this.startTriggerMonitoring();
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the failover manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Stop monitoring
      this.stopHealthMonitoring();
      
      // Wait for any ongoing failover to complete
      await this.waitForFailoverCompletion();

      this.isInitialized = false;
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Perform manual failover
   */
  async performFailover(targetRegion?: string): Promise<FailoverResult> {
    if (this.isFailoverInProgress) {
      throw new Error('Failover already in progress');
    }

    const failoverId = this.generateFailoverId();
    const startTime = new Date();
    const oldPrimary = this.currentPrimary;
    const newPrimary = targetRegion || this.selectBestTarget();

    try {
      this.isFailoverInProgress = true;
      this.emit('failover-started', { failoverId, oldPrimary, newPrimary });

      // Pre-failover validation
      await this.validateFailoverPreconditions(newPrimary);

      // Execute failover steps
      await this.executeFailoverSteps(oldPrimary, newPrimary);

      // Update current primary
      this.currentPrimary = newPrimary;

      // Post-failover validation
      await this.validateFailoverSuccess(newPrimary);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: FailoverResult = {
        success: true,
        failoverId,
        duration,
        newPrimary,
        oldPrimary
      };

      // Record failover in history
      this.recordFailover({
        id: failoverId,
        timestamp: startTime,
        oldPrimary,
        newPrimary,
        duration,
        trigger: 'manual',
        success: true
      });

      this.isFailoverInProgress = false;
      this.emit('failover-completed', result);
      return result;

    } catch (error) {
      this.isFailoverInProgress = false;
      
      const result: FailoverResult = {
        success: false,
        failoverId,
        duration: Date.now() - startTime.getTime(),
        newPrimary,
        oldPrimary,
        error: error.message
      };

      // Record failed failover
      this.recordFailover({
        id: failoverId,
        timestamp: startTime,
        oldPrimary,
        newPrimary,
        duration: result.duration,
        trigger: 'manual',
        success: false,
        error: error.message
      });

      this.emit('failover-failed', result);
      return result;
    }
  }

  /**
   * Perform rollback to previous primary
   */
  async performRollback(reason: string): Promise<FailoverResult> {
    if (this.isFailoverInProgress) {
      throw new Error('Cannot rollback while failover is in progress');
    }

    const lastFailover = this.getLastSuccessfulFailover();
    if (!lastFailover) {
      throw new Error('No previous failover to rollback to');
    }

    // Rollback is essentially a failover back to the old primary
    return await this.performFailover(lastFailover.oldPrimary);
  }

  /**
   * Check if failover can be performed
   */
  async canFailover(): Promise<boolean> {
    if (this.isFailoverInProgress) {
      return false;
    }

    // Check if we're in a cooldown period
    const lastFailover = this.getLastFailover();
    if (lastFailover) {
      const timeSinceLastFailover = Date.now() - lastFailover.timestamp.getTime();
      const cooldownPeriod = 300000; // 5 minutes
      
      if (timeSinceLastFailover < cooldownPeriod) {
        return false;
      }
    }

    // Check if there are healthy targets available
    const healthyTargets = await this.getHealthyTargets();
    return healthyTargets.length > 0;
  }

  /**
   * Check if automatic failover should be triggered
   */
  async shouldTriggerFailover(component: string, health: HealthStatus): Promise<boolean> {
    if (this.config.type === 'manual') {
      return false;
    }

    if (this.isFailoverInProgress) {
      return false;
    }

    // Check trigger conditions
    for (const trigger of this.config.triggers) {
      if (await this.evaluateTrigger(trigger, component, health)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update failover configuration
   */
  async updateConfig(newConfig: FailoverStrategy): Promise<void> {
    try {
      this.config = newConfig;
      
      // Reinitialize health checks
      this.initializeHealthChecks();
      
      // Restart monitoring with new configuration
      if (this.isInitialized) {
        this.stopHealthMonitoring();
        this.startHealthMonitoring();
        
        if (this.config.type === 'automatic' || this.config.type === 'hybrid') {
          this.startTriggerMonitoring();
        }
      }
      
      this.emit('config-updated', newConfig);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get failover metrics
   */
  async getMetrics(): Promise<Record<string, any>> {
    const totalFailovers = this.failoverHistory.length;
    const successfulFailovers = this.failoverHistory.filter(f => f.success).length;
    const failedFailovers = totalFailovers - successfulFailovers;
    const averageFailoverTime = totalFailovers > 0 
      ? this.failoverHistory.reduce((sum, f) => sum + f.duration, 0) / totalFailovers 
      : 0;

    const lastFailover = this.getLastFailover();
    const healthyTargets = await this.getHealthyTargets();

    return {
      currentPrimary: this.currentPrimary,
      totalFailovers,
      successfulFailovers,
      failedFailovers,
      successRate: totalFailovers > 0 ? (successfulFailovers / totalFailovers) * 100 : 0,
      averageFailoverTime,
      lastFailoverTime: lastFailover?.timestamp || null,
      healthyTargets: healthyTargets.length,
      isFailoverInProgress: this.isFailoverInProgress,
      canFailover: await this.canFailover()
    };
  }

  /**
   * Get current health status of all components
   */
  async getHealthStatuses(): Promise<Map<string, HealthStatus>> {
    return new Map(this.healthStatuses);
  }

  /**
   * Initialize health checks
   */
  private initializeHealthChecks(): void {
    this.healthChecks.clear();
    
    for (const healthCheck of this.config.healthChecks) {
      this.healthChecks.set(healthCheck.name, healthCheck);
      this.healthStatuses.set(healthCheck.name, {
        status: 'unknown',
        score: 0,
        lastCheck: new Date(),
        issues: []
      });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.emit('error', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Start trigger monitoring for automatic failover
   */
  private startTriggerMonitoring(): void {
    this.on('health-check-failed', async (component: string, health: HealthStatus) => {
      if (await this.shouldTriggerFailover(component, health)) {
        try {
          await this.performFailover();
        } catch (error) {
          this.emit('automatic-failover-failed', error);
        }
      }
    });
  }

  /**
   * Perform all health checks
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.healthChecks.values()).map(async (healthCheck) => {
      try {
        const health = await this.performHealthCheck(healthCheck);
        this.healthStatuses.set(healthCheck.name, health);
        
        if (health.status === 'critical') {
          this.emit('health-check-failed', healthCheck.name, health);
        }
      } catch (error) {
        const failedHealth: HealthStatus = {
          status: 'critical',
          score: 0,
          lastCheck: new Date(),
          issues: [{
            severity: 'critical',
            component: healthCheck.name,
            message: error.message,
            timestamp: new Date()
          }]
        };
        
        this.healthStatuses.set(healthCheck.name, failedHealth);
        this.emit('health-check-failed', healthCheck.name, failedHealth);
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Perform a single health check
   */
  private async performHealthCheck(healthCheck: HealthCheckConfig): Promise<HealthStatus> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < healthCheck.retries) {
      try {
        const result = await this.executeHealthCheck(healthCheck);
        return result;
      } catch (error) {
        lastError = error;
        attempts++;
        
        if (attempts < healthCheck.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
        }
      }
    }

    // All retries failed
    return {
      status: 'critical',
      score: 0,
      lastCheck: new Date(),
      issues: [{
        severity: 'critical',
        component: healthCheck.name,
        message: lastError?.message || 'Health check failed',
        timestamp: new Date()
      }]
    };
  }

  /**
   * Execute a health check
   */
  private async executeHealthCheck(healthCheck: HealthCheckConfig): Promise<HealthStatus> {
    // Mock health check - in production would make actual HTTP requests
    const isHealthy = Math.random() > 0.05; // 95% healthy
    const responseTime = Math.random() * 1000; // 0-1000ms
    
    if (!isHealthy) {
      throw new Error(`Health check failed for ${healthCheck.name}`);
    }

    const score = Math.max(0, 100 - (responseTime / 10)); // Score based on response time

    return {
      status: score > 80 ? 'healthy' : score > 50 ? 'degraded' : 'critical',
      score,
      lastCheck: new Date(),
      issues: score < 80 ? [{
        severity: score > 50 ? 'medium' : 'high',
        component: healthCheck.name,
        message: `Slow response time: ${responseTime.toFixed(0)}ms`,
        timestamp: new Date()
      }] : []
    };
  }

  /**
   * Evaluate if a trigger condition is met
   */
  private async evaluateTrigger(trigger: FailoverTrigger, component: string, health: HealthStatus): Promise<boolean> {
    const now = Date.now();
    const triggerKey = `${trigger.type}-${component}`;
    
    // Check cooldown
    const lastTrigger = this.triggerCooldowns.get(triggerKey) || 0;
    if (now - lastTrigger < trigger.cooldown * 1000) {
      return false;
    }

    let shouldTrigger = false;

    switch (trigger.type) {
      case 'health-check':
        shouldTrigger = health.score < trigger.threshold;
        break;
      case 'performance':
        shouldTrigger = health.score < trigger.threshold;
        break;
      case 'manual':
        // Manual triggers are handled separately
        shouldTrigger = false;
        break;
      case 'scheduled':
        // Scheduled triggers would be handled by a scheduler
        shouldTrigger = false;
        break;
    }

    if (shouldTrigger) {
      this.triggerCooldowns.set(triggerKey, now);
    }

    return shouldTrigger;
  }

  /**
   * Validate failover preconditions
   */
  private async validateFailoverPreconditions(targetRegion: string): Promise<void> {
    // Check if target region is healthy
    const targetHealth = await this.checkTargetHealth(targetRegion);
    if (targetHealth.status === 'critical') {
      throw new Error(`Target region ${targetRegion} is not healthy`);
    }

    // Check if target has sufficient capacity
    const hasCapacity = await this.checkTargetCapacity(targetRegion);
    if (!hasCapacity) {
      throw new Error(`Target region ${targetRegion} does not have sufficient capacity`);
    }

    // Check if data is synchronized
    const isSynchronized = await this.checkDataSynchronization(targetRegion);
    if (!isSynchronized) {
      throw new Error(`Data is not synchronized with target region ${targetRegion}`);
    }
  }

  /**
   * Execute failover steps
   */
  private async executeFailoverSteps(oldPrimary: string, newPrimary: string): Promise<void> {
    // Step 1: Drain traffic from old primary
    await this.drainTraffic(oldPrimary);
    
    // Step 2: Promote new primary
    await this.promoteRegion(newPrimary);
    
    // Step 3: Update DNS/load balancer
    await this.updateRouting(newPrimary);
    
    // Step 4: Start services in new primary
    await this.startServices(newPrimary);
    
    // Step 5: Verify services are running
    await this.verifyServices(newPrimary);
  }

  /**
   * Validate failover success
   */
  private async validateFailoverSuccess(newPrimary: string): Promise<void> {
    // Check if new primary is responding
    const health = await this.checkTargetHealth(newPrimary);
    if (health.status === 'critical') {
      throw new Error(`Failover validation failed: ${newPrimary} is not healthy`);
    }

    // Check if services are accessible
    const servicesHealthy = await this.checkServicesHealth(newPrimary);
    if (!servicesHealthy) {
      throw new Error(`Failover validation failed: Services in ${newPrimary} are not healthy`);
    }
  }

  /**
   * Select the best target for failover
   */
  private selectBestTarget(): string {
    // Mock target selection - in production would consider health, capacity, latency, etc.
    const availableTargets = ['secondary-region-1', 'secondary-region-2'];
    return availableTargets[Math.floor(Math.random() * availableTargets.length)];
  }

  /**
   * Get healthy targets
   */
  private async getHealthyTargets(): Promise<string[]> {
    const targets = ['secondary-region-1', 'secondary-region-2'];
    const healthyTargets = [];

    for (const target of targets) {
      const health = await this.checkTargetHealth(target);
      if (health.status !== 'critical') {
        healthyTargets.push(target);
      }
    }

    return healthyTargets;
  }

  /**
   * Check target health
   */
  private async checkTargetHealth(target: string): Promise<HealthStatus> {
    // Mock health check
    const isHealthy = Math.random() > 0.1; // 90% healthy
    
    return {
      status: isHealthy ? 'healthy' : 'critical',
      score: isHealthy ? 95 : 10,
      lastCheck: new Date(),
      issues: []
    };
  }

  /**
   * Check target capacity
   */
  private async checkTargetCapacity(target: string): Promise<boolean> {
    // Mock capacity check
    return Math.random() > 0.1; // 90% have capacity
  }

  /**
   * Check data synchronization
   */
  private async checkDataSynchronization(target: string): Promise<boolean> {
    // Mock synchronization check
    return Math.random() > 0.05; // 95% synchronized
  }

  /**
   * Drain traffic from region
   */
  private async drainTraffic(region: string): Promise<void> {
    console.log(`Draining traffic from ${region}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Promote region to primary
   */
  private async promoteRegion(region: string): Promise<void> {
    console.log(`Promoting ${region} to primary`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Update routing to new primary
   */
  private async updateRouting(region: string): Promise<void> {
    console.log(`Updating routing to ${region}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Start services in region
   */
  private async startServices(region: string): Promise<void> {
    console.log(`Starting services in ${region}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * Verify services are running
   */
  private async verifyServices(region: string): Promise<void> {
    console.log(`Verifying services in ${region}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Check services health
   */
  private async checkServicesHealth(region: string): Promise<boolean> {
    // Mock services health check
    return Math.random() > 0.05; // 95% healthy
  }

  /**
   * Record failover in history
   */
  private recordFailover(record: FailoverRecord): void {
    this.failoverHistory.push(record);
    
    // Keep only last 100 records
    if (this.failoverHistory.length > 100) {
      this.failoverHistory.shift();
    }
  }

  /**
   * Get last failover record
   */
  private getLastFailover(): FailoverRecord | null {
    return this.failoverHistory.length > 0 
      ? this.failoverHistory[this.failoverHistory.length - 1] 
      : null;
  }

  /**
   * Get last successful failover
   */
  private getLastSuccessfulFailover(): FailoverRecord | null {
    for (let i = this.failoverHistory.length - 1; i >= 0; i--) {
      if (this.failoverHistory[i].success) {
        return this.failoverHistory[i];
      }
    }
    return null;
  }

  /**
   * Wait for failover completion
   */
  private async waitForFailoverCompletion(): Promise<void> {
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();

    while (this.isFailoverInProgress && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.isFailoverInProgress) {
      console.warn('Failover still in progress after shutdown timeout');
    }
  }

  /**
   * Generate unique failover ID
   */
  private generateFailoverId(): string {
    return `failover-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface FailoverRecord {
  id: string;
  timestamp: Date;
  oldPrimary: string;
  newPrimary: string;
  duration: number;
  trigger: string;
  success: boolean;
  error?: string;
}