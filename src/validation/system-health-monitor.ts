/**
 * System Health Monitor
 * 
 * Provides real-time system health monitoring with component status tracking,
 * performance metrics collection, and automated health scoring.
 */

import { logger } from '../shared/logging/central-logger';
import { ValidationResult, ValidationMetrics } from '../shared/types/validation';

/**
 * Component health status
 */
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  score: number; // 0-100
  lastCheck: Date;
  metrics: ComponentMetrics;
  issues: HealthIssue[];
  dependencies: string[];
}

/**
 * Component metrics
 */
export interface ComponentMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  availability: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

/**
 * Health issue
 */
export interface HealthIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  code: string;
  timestamp: Date;
  resolved: boolean;
}

/**
 * System health report
 */
export interface SystemHealthReport {
  overallScore: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: ComponentHealth[];
  criticalIssues: HealthIssue[];
  recommendations: string[];
  trends: HealthTrend[];
}

/**
 * Health trend data
 */
export interface HealthTrend {
  component: string;
  metric: string;
  values: { timestamp: Date; value: number }[];
  trend: 'improving' | 'stable' | 'degrading';
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  checkInterval: number; // milliseconds
  components: string[];
  thresholds: HealthThresholds;
  alerting: AlertingConfig;
}

/**
 * Health thresholds
 */
export interface HealthThresholds {
  responseTime: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  availability: { warning: number; critical: number };
  resourceUsage: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
  };
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  channels: string[];
  escalation: EscalationRule[];
}

/**
 * Escalation rule
 */
export interface EscalationRule {
  severity: string;
  delay: number;
  channels: string[];
}

/**
 * System Health Monitor implementation
 */
export class SystemHealthMonitor {
  private config: HealthMonitorConfig;
  private componentHealthMap: Map<string, ComponentHealth> = new Map();
  private healthHistory: SystemHealthReport[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(config: HealthMonitorConfig) {
    this.config = config;
    this.initializeComponents();
  }

  /**
   * Start health monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Health monitoring is already running');
      return;
    }

    logger.info('Starting system health monitoring', { 
      interval: this.config.checkInterval,
      components: this.config.components.length 
    });

    this.isMonitoring = true;
    
    // Perform initial health check
    await this.performHealthCheck();

    // Schedule periodic health checks
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }, this.config.checkInterval);

    logger.info('System health monitoring started successfully');
  }

  /**
   * Stop health monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.warn('Health monitoring is not running');
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.isMonitoring = false;
    logger.info('System health monitoring stopped');
  }

  /**
   * Get current system health report
   */
  public async getCurrentHealthReport(): Promise<SystemHealthReport> {
    if (!this.isMonitoring) {
      await this.performHealthCheck();
    }

    const components = Array.from(this.componentHealthMap.values());
    const overallScore = this.calculateOverallScore(components);
    const status = this.determineOverallStatus(overallScore);
    const criticalIssues = this.getCriticalIssues(components);

    const report: SystemHealthReport = {
      overallScore,
      status,
      timestamp: new Date(),
      components,
      criticalIssues,
      recommendations: this.generateRecommendations(components),
      trends: this.calculateTrends()
    };

    // Store in history
    this.healthHistory.push(report);
    
    // Keep only last 100 reports
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }

    return report;
  }

  /**
   * Get component health status
   */
  public getComponentHealth(componentName: string): ComponentHealth | undefined {
    return this.componentHealthMap.get(componentName);
  }

  /**
   * Get health history
   */
  public getHealthHistory(limit: number = 10): SystemHealthReport[] {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Check if system is healthy
   */
  public async isSystemHealthy(): Promise<boolean> {
    const report = await this.getCurrentHealthReport();
    return report.status === 'healthy' && report.overallScore >= 80;
  }

  /**
   * Initialize component health tracking
   */
  private initializeComponents(): void {
    for (const componentName of this.config.components) {
      this.componentHealthMap.set(componentName, {
        name: componentName,
        status: 'unknown',
        score: 0,
        lastCheck: new Date(),
        metrics: {
          responseTime: 0,
          errorRate: 0,
          throughput: 0,
          availability: 0,
          resourceUsage: { cpu: 0, memory: 0, disk: 0 }
        },
        issues: [],
        dependencies: []
      });
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    logger.debug('Performing system health check');

    const checkPromises = this.config.components.map(async (componentName) => {
      try {
        const health = await this.checkComponentHealth(componentName);
        this.componentHealthMap.set(componentName, health);
      } catch (error) {
        logger.error('Component health check failed', { 
          component: componentName,
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        // Update component with error status
        const existingHealth = this.componentHealthMap.get(componentName);
        if (existingHealth) {
          existingHealth.status = 'unhealthy';
          existingHealth.score = 0;
          existingHealth.lastCheck = new Date();
          existingHealth.issues.push({
            severity: 'critical',
            message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'HEALTH_CHECK_FAILED',
            timestamp: new Date(),
            resolved: false
          });
        }
      }
    });

    await Promise.all(checkPromises);
    logger.debug('System health check completed');
  }

  /**
   * Check individual component health
   */
  private async checkComponentHealth(componentName: string): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    // Get existing health data
    const existingHealth = this.componentHealthMap.get(componentName) || {
      name: componentName,
      status: 'unknown' as const,
      score: 0,
      lastCheck: new Date(),
      metrics: {
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        availability: 0,
        resourceUsage: { cpu: 0, memory: 0, disk: 0 }
      },
      issues: [],
      dependencies: []
    };

    try {
      // Perform component-specific health checks
      const metrics = await this.collectComponentMetrics(componentName);
      const issues = this.analyzeComponentIssues(componentName, metrics);
      const score = this.calculateComponentScore(metrics, issues);
      const status = this.determineComponentStatus(score, issues);

      const responseTime = Date.now() - startTime;

      return {
        name: componentName,
        status,
        score,
        lastCheck: new Date(),
        metrics: {
          ...metrics,
          responseTime
        },
        issues,
        dependencies: existingHealth.dependencies
      };

    } catch (error) {
      return {
        ...existingHealth,
        status: 'unhealthy',
        score: 0,
        lastCheck: new Date(),
        issues: [
          ...existingHealth.issues,
          {
            severity: 'critical',
            message: `Component check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'COMPONENT_CHECK_FAILED',
            timestamp: new Date(),
            resolved: false
          }
        ]
      };
    }
  }

  /**
   * Collect component-specific metrics
   */
  private async collectComponentMetrics(componentName: string): Promise<ComponentMetrics> {
    // This would be implemented with actual component monitoring
    // For now, return simulated metrics based on component type
    
    const baseMetrics: ComponentMetrics = {
      responseTime: 0,
      errorRate: 0,
      throughput: 0,
      availability: 99.9,
      resourceUsage: { cpu: 0, memory: 0, disk: 0 }
    };

    switch (componentName) {
      case 'readme-parser':
        return {
          ...baseMetrics,
          responseTime: Math.random() * 100 + 50, // 50-150ms
          errorRate: Math.random() * 2, // 0-2%
          throughput: Math.random() * 100 + 50, // 50-150 ops/sec
          resourceUsage: {
            cpu: Math.random() * 20 + 10, // 10-30%
            memory: Math.random() * 100 + 50, // 50-150MB
            disk: Math.random() * 10 + 5 // 5-15MB
          }
        };

      case 'framework-detection':
        return {
          ...baseMetrics,
          responseTime: Math.random() * 200 + 100, // 100-300ms
          errorRate: Math.random() * 1, // 0-1%
          throughput: Math.random() * 50 + 25, // 25-75 ops/sec
          resourceUsage: {
            cpu: Math.random() * 30 + 15, // 15-45%
            memory: Math.random() * 150 + 75, // 75-225MB
            disk: Math.random() * 15 + 10 // 10-25MB
          }
        };

      case 'yaml-generator':
        return {
          ...baseMetrics,
          responseTime: Math.random() * 150 + 75, // 75-225ms
          errorRate: Math.random() * 0.5, // 0-0.5%
          throughput: Math.random() * 75 + 40, // 40-115 ops/sec
          resourceUsage: {
            cpu: Math.random() * 25 + 10, // 10-35%
            memory: Math.random() * 80 + 40, // 40-120MB
            disk: Math.random() * 20 + 10 // 10-30MB
          }
        };

      case 'integration-pipeline':
        return {
          ...baseMetrics,
          responseTime: Math.random() * 300 + 200, // 200-500ms
          errorRate: Math.random() * 3, // 0-3%
          throughput: Math.random() * 30 + 15, // 15-45 ops/sec
          resourceUsage: {
            cpu: Math.random() * 40 + 20, // 20-60%
            memory: Math.random() * 200 + 100, // 100-300MB
            disk: Math.random() * 25 + 15 // 15-40MB
          }
        };

      default:
        return baseMetrics;
    }
  }

  /**
   * Analyze component issues based on metrics
   */
  private analyzeComponentIssues(componentName: string, metrics: ComponentMetrics): HealthIssue[] {
    const issues: HealthIssue[] = [];
    const thresholds = this.config.thresholds;

    // Check response time
    if (metrics.responseTime > thresholds.responseTime.critical) {
      issues.push({
        severity: 'critical',
        message: `Response time (${metrics.responseTime}ms) exceeds critical threshold (${thresholds.responseTime.critical}ms)`,
        code: 'HIGH_RESPONSE_TIME_CRITICAL',
        timestamp: new Date(),
        resolved: false
      });
    } else if (metrics.responseTime > thresholds.responseTime.warning) {
      issues.push({
        severity: 'medium',
        message: `Response time (${metrics.responseTime}ms) exceeds warning threshold (${thresholds.responseTime.warning}ms)`,
        code: 'HIGH_RESPONSE_TIME_WARNING',
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check error rate
    if (metrics.errorRate > thresholds.errorRate.critical) {
      issues.push({
        severity: 'critical',
        message: `Error rate (${metrics.errorRate}%) exceeds critical threshold (${thresholds.errorRate.critical}%)`,
        code: 'HIGH_ERROR_RATE_CRITICAL',
        timestamp: new Date(),
        resolved: false
      });
    } else if (metrics.errorRate > thresholds.errorRate.warning) {
      issues.push({
        severity: 'medium',
        message: `Error rate (${metrics.errorRate}%) exceeds warning threshold (${thresholds.errorRate.warning}%)`,
        code: 'HIGH_ERROR_RATE_WARNING',
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check availability
    if (metrics.availability < thresholds.availability.critical) {
      issues.push({
        severity: 'critical',
        message: `Availability (${metrics.availability}%) below critical threshold (${thresholds.availability.critical}%)`,
        code: 'LOW_AVAILABILITY_CRITICAL',
        timestamp: new Date(),
        resolved: false
      });
    } else if (metrics.availability < thresholds.availability.warning) {
      issues.push({
        severity: 'medium',
        message: `Availability (${metrics.availability}%) below warning threshold (${thresholds.availability.warning}%)`,
        code: 'LOW_AVAILABILITY_WARNING',
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check resource usage
    const { cpu, memory, disk } = metrics.resourceUsage;
    
    if (cpu > thresholds.resourceUsage.cpu.critical) {
      issues.push({
        severity: 'critical',
        message: `CPU usage (${cpu}%) exceeds critical threshold (${thresholds.resourceUsage.cpu.critical}%)`,
        code: 'HIGH_CPU_USAGE_CRITICAL',
        timestamp: new Date(),
        resolved: false
      });
    }

    if (memory > thresholds.resourceUsage.memory.critical) {
      issues.push({
        severity: 'critical',
        message: `Memory usage (${memory}MB) exceeds critical threshold (${thresholds.resourceUsage.memory.critical}MB)`,
        code: 'HIGH_MEMORY_USAGE_CRITICAL',
        timestamp: new Date(),
        resolved: false
      });
    }

    return issues;
  }

  /**
   * Calculate component health score
   */
  private calculateComponentScore(metrics: ComponentMetrics, issues: HealthIssue[]): number {
    let score = 100;

    // Deduct points for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Adjust based on metrics
    const thresholds = this.config.thresholds;
    
    // Response time impact
    if (metrics.responseTime > thresholds.responseTime.warning) {
      const impact = Math.min(20, (metrics.responseTime - thresholds.responseTime.warning) / 100);
      score -= impact;
    }

    // Error rate impact
    if (metrics.errorRate > thresholds.errorRate.warning) {
      const impact = Math.min(30, metrics.errorRate * 5);
      score -= impact;
    }

    // Availability impact
    if (metrics.availability < thresholds.availability.warning) {
      const impact = (thresholds.availability.warning - metrics.availability) * 2;
      score -= impact;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine component status based on score and issues
   */
  private determineComponentStatus(score: number, issues: HealthIssue[]): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;

    if (criticalIssues > 0 || score < 50) {
      return 'unhealthy';
    }

    if (highIssues > 0 || score < 80) {
      return 'degraded';
    }

    if (score >= 80) {
      return 'healthy';
    }

    return 'unknown';
  }

  /**
   * Calculate overall system score
   */
  private calculateOverallScore(components: ComponentHealth[]): number {
    if (components.length === 0) {
      return 0;
    }

    const totalScore = components.reduce((sum, component) => sum + component.score, 0);
    return totalScore / components.length;
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(score: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (score >= 85) return 'healthy';
    if (score >= 70) return 'degraded';
    return 'unhealthy';
  }

  /**
   * Get critical issues across all components
   */
  private getCriticalIssues(components: ComponentHealth[]): HealthIssue[] {
    const criticalIssues: HealthIssue[] = [];
    
    for (const component of components) {
      criticalIssues.push(...component.issues.filter(issue => 
        issue.severity === 'critical' && !issue.resolved
      ));
    }

    return criticalIssues;
  }

  /**
   * Generate recommendations based on component health
   */
  private generateRecommendations(components: ComponentHealth[]): string[] {
    const recommendations: string[] = [];
    
    for (const component of components) {
      if (component.status === 'unhealthy') {
        recommendations.push(`Investigate and resolve critical issues in ${component.name}`);
      }
      
      if (component.metrics.responseTime > this.config.thresholds.responseTime.warning) {
        recommendations.push(`Optimize performance for ${component.name} - response time is elevated`);
      }
      
      if (component.metrics.errorRate > this.config.thresholds.errorRate.warning) {
        recommendations.push(`Review error handling in ${component.name} - error rate is high`);
      }
      
      if (component.metrics.resourceUsage.cpu > this.config.thresholds.resourceUsage.cpu.warning) {
        recommendations.push(`Monitor CPU usage for ${component.name} - consider optimization`);
      }
    }

    // Remove duplicates
    return Array.from(new Set(recommendations));
  }

  /**
   * Calculate health trends
   */
  private calculateTrends(): HealthTrend[] {
    const trends: HealthTrend[] = [];
    
    // This would analyze historical data to determine trends
    // For now, return empty array as we need more historical data
    
    return trends;
  }
}

/**
 * Default health monitor configuration
 */
export const defaultHealthMonitorConfig: HealthMonitorConfig = {
  checkInterval: 30000, // 30 seconds
  components: [
    'readme-parser',
    'framework-detection', 
    'yaml-generator',
    'integration-pipeline'
  ],
  thresholds: {
    responseTime: { warning: 1000, critical: 3000 },
    errorRate: { warning: 2, critical: 5 },
    availability: { warning: 99.5, critical: 99.0 },
    resourceUsage: {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 512, critical: 1024 },
      disk: { warning: 1024, critical: 2048 }
    }
  },
  alerting: {
    enabled: true,
    channels: ['console', 'log'],
    escalation: [
      { severity: 'critical', delay: 0, channels: ['console', 'log'] },
      { severity: 'high', delay: 300000, channels: ['log'] }, // 5 minutes
      { severity: 'medium', delay: 900000, channels: ['log'] } // 15 minutes
    ]
  }
};