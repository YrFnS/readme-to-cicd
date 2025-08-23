import { EventEmitter } from 'events';
import {
  ScalingMetrics,
  PerformanceBottleneck
} from '../types.js';

export interface PerformanceThreshold {
  metric: keyof ScalingMetrics;
  warning: number;
  critical: number;
  unit: string;
}

export interface PerformanceAlert {
  id: string;
  componentId: string;
  metric: keyof ScalingMetrics;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceReport {
  componentId: string;
  timeRange: { start: Date; end: Date };
  metrics: {
    avg: ScalingMetrics;
    min: ScalingMetrics;
    max: ScalingMetrics;
    p95: ScalingMetrics;
  };
  bottlenecks: PerformanceBottleneck[];
  alerts: PerformanceAlert[];
  recommendations: string[];
}

/**
 * PerformanceMonitor detects bottlenecks and provides automated resolution recommendations
 * Requirement 6.4: Identify and resolve scaling constraints
 */
export class PerformanceMonitor extends EventEmitter {
  private metricsHistory: Map<string, ScalingMetrics[]> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private bottlenecks: Map<string, PerformanceBottleneck[]> = new Map();
  private thresholds: PerformanceThreshold[] = [];
  private monitoringTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor() {
    super();
    this.initializeDefaultThresholds();
  }

  /**
   * Start performance monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.monitoringTimer = setInterval(
      () => this.performMonitoring(),
      30000 // Monitor every 30 seconds
    );

    this.emit('started');
  }

  /**
   * Stop performance monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    this.emit('stopped');
  }

  /**
   * Add performance metrics for a component
   */
  addMetrics(componentId: string, metrics: ScalingMetrics): void {
    if (!this.metricsHistory.has(componentId)) {
      this.metricsHistory.set(componentId, []);
    }

    const history = this.metricsHistory.get(componentId)!;
    history.push(metrics);

    // Keep only last 1000 metrics (approximately 8 hours at 30s intervals)
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    this.metricsHistory.set(componentId, history);
    this.checkThresholds(componentId, metrics);
  }

  /**
   * Detect performance bottlenecks for a component
   */
  detectBottlenecks(componentId: string): PerformanceBottleneck[] {
    const metrics = this.metricsHistory.get(componentId);
    if (!metrics || metrics.length < 5) {
      return [];
    }

    const bottlenecks: PerformanceBottleneck[] = [];
    const recentMetrics = metrics.slice(-10); // Last 10 measurements
    const latestMetrics = metrics[metrics.length - 1];

    // CPU bottleneck detection
    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
    if (avgCpu > 80) {
      bottlenecks.push({
        type: 'cpu',
        severity: avgCpu > 95 ? 'critical' : avgCpu > 90 ? 'high' : 'medium',
        description: `Sustained high CPU usage: ${avgCpu.toFixed(1)}% average`,
        affectedComponents: [componentId],
        recommendations: this.getCpuRecommendations(avgCpu),
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Memory bottleneck detection
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;
    if (avgMemory > 85) {
      bottlenecks.push({
        type: 'memory',
        severity: avgMemory > 95 ? 'critical' : avgMemory > 90 ? 'high' : 'medium',
        description: `High memory usage: ${avgMemory.toFixed(1)}% average`,
        affectedComponents: [componentId],
        recommendations: this.getMemoryRecommendations(avgMemory),
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Response time bottleneck detection
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    if (avgResponseTime > 2000) {
      bottlenecks.push({
        type: 'network',
        severity: avgResponseTime > 5000 ? 'critical' : avgResponseTime > 3000 ? 'high' : 'medium',
        description: `High response time: ${avgResponseTime.toFixed(0)}ms average`,
        affectedComponents: [componentId],
        recommendations: this.getResponseTimeRecommendations(avgResponseTime),
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Error rate bottleneck detection
    if (latestMetrics.errorRate > 5) {
      bottlenecks.push({
        type: 'network',
        severity: latestMetrics.errorRate > 15 ? 'critical' : latestMetrics.errorRate > 10 ? 'high' : 'medium',
        description: `High error rate: ${latestMetrics.errorRate.toFixed(1)}%`,
        affectedComponents: [componentId],
        recommendations: this.getErrorRateRecommendations(latestMetrics.errorRate),
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Queue length bottleneck detection
    if (latestMetrics.queueLength > 100) {
      bottlenecks.push({
        type: 'queue',
        severity: latestMetrics.queueLength > 500 ? 'critical' : latestMetrics.queueLength > 250 ? 'high' : 'medium',
        description: `High queue length: ${latestMetrics.queueLength} items`,
        affectedComponents: [componentId],
        recommendations: this.getQueueRecommendations(latestMetrics.queueLength),
        detectedAt: new Date(),
        resolved: false
      });
    }

    // Store bottlenecks
    this.bottlenecks.set(componentId, bottlenecks);

    // Emit events for new bottlenecks
    bottlenecks.forEach(bottleneck => {
      this.emit('bottleneck-detected', bottleneck);
    });

    return bottlenecks;
  }

  /**
   * Generate performance report for a component
   */
  generateReport(componentId: string, timeRange?: { start: Date; end: Date }): PerformanceReport | null {
    const metrics = this.metricsHistory.get(componentId);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    let filteredMetrics = metrics;
    if (timeRange) {
      filteredMetrics = metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    if (filteredMetrics.length === 0) {
      return null;
    }

    const report: PerformanceReport = {
      componentId,
      timeRange: timeRange || {
        start: filteredMetrics[0].timestamp,
        end: filteredMetrics[filteredMetrics.length - 1].timestamp
      },
      metrics: this.calculateMetricsSummary(filteredMetrics),
      bottlenecks: this.bottlenecks.get(componentId) || [],
      alerts: Array.from(this.alerts.values()).filter(alert => alert.componentId === componentId),
      recommendations: this.generateRecommendations(componentId, filteredMetrics)
    };

    return report;
  }

  /**
   * Get active alerts for a component
   */
  getActiveAlerts(componentId?: string): PerformanceAlert[] {
    const alerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    return componentId ? alerts.filter(alert => alert.componentId === componentId) : alerts;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(alertId, alert);
      this.emit('alert-resolved', alert);
    }
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(thresholds: PerformanceThreshold[]): void {
    this.thresholds = thresholds;
    this.emit('thresholds-updated', thresholds);
  }

  /**
   * Get current performance thresholds
   */
  getThresholds(): PerformanceThreshold[] {
    return [...this.thresholds];
  }

  // Private helper methods

  private initializeDefaultThresholds(): void {
    this.thresholds = [
      { metric: 'cpu', warning: 70, critical: 90, unit: '%' },
      { metric: 'memory', warning: 80, critical: 95, unit: '%' },
      { metric: 'responseTime', warning: 1000, critical: 3000, unit: 'ms' },
      { metric: 'errorRate', warning: 2, critical: 5, unit: '%' },
      { metric: 'queueLength', warning: 50, critical: 100, unit: 'items' }
    ];
  }

  private async performMonitoring(): Promise<void> {
    for (const [componentId] of this.metricsHistory) {
      this.detectBottlenecks(componentId);
    }
  }

  private checkThresholds(componentId: string, metrics: ScalingMetrics): void {
    for (const threshold of this.thresholds) {
      const value = metrics[threshold.metric];
      
      if (value >= threshold.critical) {
        this.createAlert(componentId, threshold.metric, value, threshold.critical, 'critical');
      } else if (value >= threshold.warning) {
        this.createAlert(componentId, threshold.metric, value, threshold.warning, 'warning');
      }
    }
  }

  private createAlert(
    componentId: string,
    metric: keyof ScalingMetrics,
    value: number,
    threshold: number,
    severity: 'warning' | 'critical'
  ): void {
    const alertId = `${componentId}-${metric}-${Date.now()}`;
    const alert: PerformanceAlert = {
      id: alertId,
      componentId,
      metric,
      value,
      threshold,
      severity,
      message: `${metric} is ${value} (threshold: ${threshold})`,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(alertId, alert);
    this.emit('alert-created', alert);
  }

  private calculateMetricsSummary(metrics: ScalingMetrics[]): PerformanceReport['metrics'] {
    const keys: (keyof ScalingMetrics)[] = ['cpu', 'memory', 'requestRate', 'responseTime', 'errorRate', 'activeConnections', 'queueLength'];
    
    const avg = {} as ScalingMetrics;
    const min = {} as ScalingMetrics;
    const max = {} as ScalingMetrics;
    const p95 = {} as ScalingMetrics;

    for (const key of keys) {
      const values = metrics.map(m => m[key] as number).sort((a, b) => a - b);
      
      avg[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      min[key] = values[0];
      max[key] = values[values.length - 1];
      p95[key] = values[Math.floor(values.length * 0.95)];
    }

    // Set timestamp for the summary metrics
    const timestamp = new Date();
    avg.timestamp = timestamp;
    min.timestamp = timestamp;
    max.timestamp = timestamp;
    p95.timestamp = timestamp;

    return { avg, min, max, p95 };
  }

  private generateRecommendations(componentId: string, metrics: ScalingMetrics[]): string[] {
    const recommendations: string[] = [];
    const latest = metrics[metrics.length - 1];
    const avg = this.calculateAverage(metrics);

    if (avg.cpu > 70) {
      recommendations.push('Consider scaling up CPU resources or optimizing CPU-intensive operations');
    }

    if (avg.memory > 80) {
      recommendations.push('Consider increasing memory allocation or optimizing memory usage');
    }

    if (avg.responseTime > 1000) {
      recommendations.push('Optimize response time by implementing caching or scaling up instances');
    }

    if (latest.errorRate > 2) {
      recommendations.push('Investigate and fix errors to improve system reliability');
    }

    if (latest.queueLength > 50) {
      recommendations.push('Scale up processing capacity to reduce queue backlog');
    }

    return recommendations;
  }

  private calculateAverage(metrics: ScalingMetrics[]): ScalingMetrics {
    const sum = metrics.reduce((acc, m) => ({
      cpu: acc.cpu + m.cpu,
      memory: acc.memory + m.memory,
      requestRate: acc.requestRate + m.requestRate,
      responseTime: acc.responseTime + m.responseTime,
      errorRate: acc.errorRate + m.errorRate,
      activeConnections: acc.activeConnections + m.activeConnections,
      queueLength: acc.queueLength + m.queueLength,
      timestamp: new Date()
    }), {
      cpu: 0, memory: 0, requestRate: 0, responseTime: 0,
      errorRate: 0, activeConnections: 0, queueLength: 0,
      timestamp: new Date()
    });

    const count = metrics.length;
    return {
      cpu: sum.cpu / count,
      memory: sum.memory / count,
      requestRate: sum.requestRate / count,
      responseTime: sum.responseTime / count,
      errorRate: sum.errorRate / count,
      activeConnections: sum.activeConnections / count,
      queueLength: sum.queueLength / count,
      timestamp: new Date()
    };
  }

  private getCpuRecommendations(avgCpu: number): string[] {
    const recommendations = ['Scale up CPU resources'];
    
    if (avgCpu > 95) {
      recommendations.push('Immediate action required - system at critical CPU usage');
      recommendations.push('Consider emergency scaling or load shedding');
    }
    
    recommendations.push('Profile application for CPU bottlenecks');
    recommendations.push('Optimize algorithms and reduce computational complexity');
    
    return recommendations;
  }

  private getMemoryRecommendations(avgMemory: number): string[] {
    const recommendations = ['Increase memory allocation'];
    
    if (avgMemory > 95) {
      recommendations.push('Critical memory usage - risk of out-of-memory errors');
    }
    
    recommendations.push('Implement memory caching strategies');
    recommendations.push('Review memory leaks and optimize garbage collection');
    
    return recommendations;
  }

  private getResponseTimeRecommendations(avgResponseTime: number): string[] {
    const recommendations = ['Optimize response time'];
    
    if (avgResponseTime > 5000) {
      recommendations.push('Critical response time affecting user experience');
    }
    
    recommendations.push('Implement caching layers');
    recommendations.push('Optimize database queries');
    recommendations.push('Consider CDN for static content');
    recommendations.push('Scale up instances to handle load');
    
    return recommendations;
  }

  private getErrorRateRecommendations(errorRate: number): string[] {
    const recommendations = ['Investigate and fix application errors'];
    
    if (errorRate > 15) {
      recommendations.push('Critical error rate affecting system reliability');
    }
    
    recommendations.push('Review error logs and fix root causes');
    recommendations.push('Implement better error handling and retry mechanisms');
    recommendations.push('Add monitoring and alerting for specific error types');
    
    return recommendations;
  }

  private getQueueRecommendations(queueLength: number): string[] {
    const recommendations = ['Increase processing capacity'];
    
    if (queueLength > 500) {
      recommendations.push('Critical queue backlog - risk of request timeouts');
    }
    
    recommendations.push('Scale up worker instances');
    recommendations.push('Optimize queue processing algorithms');
    recommendations.push('Consider queue partitioning or sharding');
    
    return recommendations;
  }
}