/**
 * Health Monitor
 * 
 * Monitors system health across all components and regions for disaster recovery.
 * Provides real-time health status, performance metrics, and alerting.
 */

import { EventEmitter } from 'events';
import {
  HealthStatus,
  HealthCheckConfig,
  ComponentStatus,
  HealthIssue,
  DisasterRecoveryStatus
} from './types.js';

export class HealthMonitor extends EventEmitter {
  private isInitialized = false;
  private healthChecks: Map<string, HealthCheckConfig> = new Map();
  private componentStatuses: Map<string, ComponentStatus> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private alertThresholds: Map<string, number> = new Map();
  private healthHistory: Map<string, HealthStatus[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultHealthChecks();
  }

  /**
   * Initialize the health monitor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Start health monitoring
      this.startMonitoring();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the health monitor
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Stop monitoring
      this.stopMonitoring();

      this.isInitialized = false;
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Add health check
   */
  async addHealthCheck(config: HealthCheckConfig): Promise<void> {
    try {
      this.healthChecks.set(config.name, config);
      
      // Initialize component status
      this.componentStatuses.set(config.name, {
        id: config.name,
        name: config.name,
        status: {
          status: 'unknown',
          score: 0,
          lastCheck: new Date(),
          issues: []
        },
        region: 'default',
        isPrimary: true
      });

      this.emit('health-check-added', config);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Remove health check
   */
  async removeHealthCheck(name: string): Promise<void> {
    try {
      this.healthChecks.delete(name);
      this.componentStatuses.delete(name);
      this.healthHistory.delete(name);

      this.emit('health-check-removed', { name });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get overall disaster recovery status
   */
  async getDisasterRecoveryStatus(): Promise<DisasterRecoveryStatus> {
    const components = Array.from(this.componentStatuses.values());
    const overallHealth = this.calculateOverallHealth(components);

    return {
      overall: overallHealth,
      components,
      lastBackup: {
        id: 'mock-backup',
        type: 'incremental',
        status: 'completed',
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        size: 1024 * 1024 * 100, // 100MB
        verification: { status: 'passed' }
      },
      replication: {
        targets: [],
        lag: 0,
        consistency: {
          level: 'strong',
          violations: [],
          lastCheck: new Date()
        },
        conflicts: []
      },
      tests: [],
      incidents: []
    };
  }

  /**
   * Get health metrics
   */
  async getMetrics(): Promise<Record<string, any>> {
    const components = Array.from(this.componentStatuses.values());
    const healthyComponents = components.filter(c => c.status.status === 'healthy').length;
    const degradedComponents = components.filter(c => c.status.status === 'degraded').length;
    const criticalComponents = components.filter(c => c.status.status === 'critical').length;

    const averageScore = components.length > 0 
      ? components.reduce((sum, c) => sum + c.status.score, 0) / components.length
      : 0;

    return {
      totalComponents: components.length,
      healthyComponents,
      degradedComponents,
      criticalComponents,
      averageHealthScore: averageScore,
      healthCheckCount: this.healthChecks.size,
      isMonitoring: !!this.monitoringInterval
    };
  }

  /**
   * Initialize default health checks
   */
  private initializeDefaultHealthChecks(): void {
    const defaultChecks: HealthCheckConfig[] = [
      {
        name: 'api-gateway',
        endpoint: 'http://localhost:3000/health',
        interval: 30,
        timeout: 5,
        retries: 3,
        expectedStatus: [200, 201]
      },
      {
        name: 'database',
        endpoint: 'http://localhost:5432/health',
        interval: 60,
        timeout: 10,
        retries: 2,
        expectedStatus: [200]
      },
      {
        name: 'cache',
        endpoint: 'http://localhost:6379/ping',
        interval: 30,
        timeout: 3,
        retries: 3,
        expectedStatus: [200]
      }
    ];

    for (const check of defaultChecks) {
      this.healthChecks.set(check.name, check);
      this.componentStatuses.set(check.name, {
        id: check.name,
        name: check.name,
        status: {
          status: 'unknown',
          score: 0,
          lastCheck: new Date(),
          issues: []
        },
        region: 'primary',
        isPrimary: true
      });
    }
  }

  /**
   * Start health monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performAllHealthChecks();
      } catch (error) {
        this.emit('error', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop health monitoring
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Perform all health checks
   */
  private async performAllHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.healthChecks.values()).map(async (check) => {
      try {
        const health = await this.performHealthCheck(check);
        this.updateComponentStatus(check.name, health);
        this.recordHealthHistory(check.name, health);
        
        // Check for alerts
        this.checkAlertConditions(check.name, health);
      } catch (error) {
        const failedHealth: HealthStatus = {
          status: 'critical',
          score: 0,
          lastCheck: new Date(),
          issues: [{
            severity: 'critical',
            component: check.name,
            message: (error as Error).message,
            timestamp: new Date()
          }]
        };
        
        this.updateComponentStatus(check.name, failedHealth);
        this.emit('health-check-failed', { component: check.name, error });
      }
    });

    await Promise.allSettled(checkPromises);
  }

  /**
   * Perform a single health check
   */
  private async performHealthCheck(check: HealthCheckConfig): Promise<HealthStatus> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < check.retries) {
      try {
        const result = await this.executeHealthCheck(check);
        return result;
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts < check.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
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
        component: check.name,
        message: lastError?.message || 'Health check failed',
        timestamp: new Date()
      }]
    };
  }

  /**
   * Execute a health check
   */
  private async executeHealthCheck(check: HealthCheckConfig): Promise<HealthStatus> {
    // Mock health check - in production would make actual HTTP requests
    const isHealthy = Math.random() > 0.05; // 95% healthy
    const responseTime = Math.random() * 1000; // 0-1000ms
    
    if (!isHealthy) {
      throw new Error(`Health check failed for ${check.name}`);
    }

    // Simulate timeout
    if (responseTime > check.timeout * 1000) {
      throw new Error(`Health check timeout for ${check.name}`);
    }

    const score = Math.max(0, 100 - (responseTime / 10)); // Score based on response time
    const issues: HealthIssue[] = [];

    if (score < 80) {
      issues.push({
        severity: score > 50 ? 'medium' : 'high',
        component: check.name,
        message: `Slow response time: ${responseTime.toFixed(0)}ms`,
        timestamp: new Date()
      });
    }

    return {
      status: score > 80 ? 'healthy' : score > 50 ? 'degraded' : 'critical',
      score,
      lastCheck: new Date(),
      issues
    };
  }

  /**
   * Update component status
   */
  private updateComponentStatus(componentName: string, health: HealthStatus): void {
    const component = this.componentStatuses.get(componentName);
    if (component) {
      component.status = health;
      this.componentStatuses.set(componentName, component);
      this.emit('component-status-updated', { componentName, health });
    }
  }

  /**
   * Record health history
   */
  private recordHealthHistory(componentName: string, health: HealthStatus): void {
    const history = this.healthHistory.get(componentName) || [];
    history.push(health);
    
    // Keep only last 100 records
    if (history.length > 100) {
      history.shift();
    }
    
    this.healthHistory.set(componentName, history);
  }

  /**
   * Check alert conditions
   */
  private checkAlertConditions(componentName: string, health: HealthStatus): void {
    const threshold = this.alertThresholds.get(componentName) || 50;
    
    if (health.score < threshold) {
      this.emit('health-alert', {
        component: componentName,
        score: health.score,
        threshold,
        status: health.status,
        issues: health.issues
      });
    }
  }

  /**
   * Calculate overall health from components
   */
  private calculateOverallHealth(components: ComponentStatus[]): HealthStatus {
    if (components.length === 0) {
      return {
        status: 'unknown',
        score: 0,
        lastCheck: new Date(),
        issues: []
      };
    }

    const averageScore = components.reduce((sum, c) => sum + c.status.score, 0) / components.length;
    const criticalComponents = components.filter(c => c.status.status === 'critical');
    const degradedComponents = components.filter(c => c.status.status === 'degraded');
    
    let overallStatus: HealthStatus['status'];
    if (criticalComponents.length > 0) {
      overallStatus = 'critical';
    } else if (degradedComponents.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const allIssues = components.flatMap(c => c.status.issues);

    return {
      status: overallStatus,
      score: averageScore,
      lastCheck: new Date(),
      issues: allIssues
    };
  }
}