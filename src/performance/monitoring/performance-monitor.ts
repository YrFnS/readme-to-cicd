/**
 * Real-time performance monitoring with metrics collection and alerting
 */

import { EventEmitter } from 'events';
import {
  PerformanceMetrics,
  AlertRule,
  NotificationConfig,
  PerformanceReport,
  PerformanceSummary,
  TrendAnalysis
} from '../types/performance-types.js';

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private alertStates = new Map<string, AlertState>();

  constructor(private config: MonitoringConfig = {}) {
    super();
    this.config = {
      metricsRetentionDays: 7,
      collectionIntervalMs: 5000,
      maxMetricsInMemory: 10000,
      ...config
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      this.config.collectionIntervalMs
    );

    this.emit('monitoringStarted');
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.emit('monitoringStopped');
    console.log('Performance monitoring stopped');
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.alertStates.set(rule.id, {
      triggered: false,
      lastTriggered: null,
      triggerCount: 0
    });
    
    this.emit('alertRuleAdded', rule);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.alertStates.delete(ruleId);
    this.emit('alertRuleRemoved', ruleId);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics for a time range
   */
  getMetrics(startTime: Date, endTime: Date): PerformanceMetrics[] {
    return this.metrics.filter(
      metric => metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Generate performance report
   */
  generateReport(startTime: Date, endTime: Date): PerformanceReport {
    const metricsInRange = this.getMetrics(startTime, endTime);
    const summary = this.calculateSummary(metricsInRange);
    const trends = this.analyzeTrends(metricsInRange);

    return {
      id: `report-${Date.now()}`,
      title: `Performance Report - ${startTime.toISOString()} to ${endTime.toISOString()}`,
      generatedAt: new Date(),
      timeRange: { start: startTime, end: endTime },
      summary,
      metrics: metricsInRange,
      benchmarks: [], // Would be populated from benchmark results
      recommendations: [], // Would be generated based on analysis
      trends
    };
  }

  /**
   * Clear old metrics to manage memory
   */
  clearOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - (this.config.metricsRetentionDays! * 24 * 60 * 60 * 1000));
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
    
    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      console.log(`Cleared ${removedCount} old metrics`);
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        responseTime: await this.measureResponseTime(),
        throughput: await this.measureThroughput(),
        errorRate: await this.measureErrorRate(),
        cpuUsage: await this.measureCpuUsage(),
        memoryUsage: await this.measureMemoryUsage(),
        diskUsage: await this.measureDiskUsage(),
        networkLatency: await this.measureNetworkLatency(),
        concurrentUsers: await this.measureConcurrentUsers()
      };

      this.metrics.push(metrics);
      this.emit('metricsCollected', metrics);

      // Manage memory by keeping only recent metrics
      if (this.metrics.length > this.config.maxMetricsInMemory!) {
        this.metrics = this.metrics.slice(-this.config.maxMetricsInMemory!);
      }

      // Check alert rules
      await this.checkAlertRules(metrics);

    } catch (error) {
      this.emit('metricsCollectionError', error);
      console.error('Error collecting metrics:', error);
    }
  }

  private async measureResponseTime(): Promise<number> {
    // In a real implementation, this would measure actual response times
    // For now, simulate with some realistic values
    const baseTime = 100 + Math.random() * 200; // 100-300ms base
    const load = this.getCurrentLoad();
    return baseTime * (1 + load * 0.5); // Increase with load
  }

  private async measureThroughput(): Promise<number> {
    // Simulate throughput measurement (requests per second)
    const baseRate = 50 + Math.random() * 100; // 50-150 RPS base
    const load = this.getCurrentLoad();
    return baseRate * (1 - load * 0.3); // Decrease with high load
  }

  private async measureErrorRate(): Promise<number> {
    // Simulate error rate (0-1)
    const baseErrorRate = 0.01 + Math.random() * 0.02; // 1-3% base
    const load = this.getCurrentLoad();
    return Math.min(1, baseErrorRate * (1 + load * 2)); // Increase with load
  }

  private async measureCpuUsage(): Promise<number> {
    // Simulate CPU usage monitoring
    const usage = process.cpuUsage();
    // Convert to percentage (simplified)
    return Math.min(100, (usage.user + usage.system) / 10000);
  }

  private async measureMemoryUsage(): Promise<number> {
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  private async measureDiskUsage(): Promise<number> {
    // Simulate disk usage monitoring
    return 20 + Math.random() * 60; // 20-80%
  }

  private async measureNetworkLatency(): Promise<number> {
    // Simulate network latency measurement
    return 10 + Math.random() * 50; // 10-60ms
  }

  private async measureConcurrentUsers(): Promise<number> {
    // Simulate concurrent user measurement
    return Math.floor(10 + Math.random() * 100); // 10-110 users
  }

  private getCurrentLoad(): number {
    // Calculate current system load (0-1)
    if (this.metrics.length === 0) return 0;
    
    const recent = this.metrics.slice(-5); // Last 5 measurements
    const avgCpu = recent.reduce((sum, m) => sum + m.cpuUsage, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    
    return Math.max(avgCpu, avgMemory) / 100;
  }

  private async checkAlertRules(metrics: PerformanceMetrics): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      const alertState = this.alertStates.get(ruleId)!;
      const shouldTrigger = this.evaluateAlertCondition(rule, metrics);

      if (shouldTrigger && !alertState.triggered) {
        // Alert triggered
        alertState.triggered = true;
        alertState.lastTriggered = new Date();
        alertState.triggerCount++;

        await this.sendAlert(rule, metrics);
        this.emit('alertTriggered', { rule, metrics });

      } else if (!shouldTrigger && alertState.triggered) {
        // Alert resolved
        alertState.triggered = false;
        this.emit('alertResolved', { rule, metrics });
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, metrics: PerformanceMetrics): boolean {
    const metricValue = this.getMetricValue(metrics, rule.metric);
    
    switch (rule.operator) {
      case '>': return metricValue > rule.threshold;
      case '<': return metricValue < rule.threshold;
      case '>=': return metricValue >= rule.threshold;
      case '<=': return metricValue <= rule.threshold;
      case '==': return metricValue === rule.threshold;
      case '!=': return metricValue !== rule.threshold;
      default: return false;
    }
  }

  private getMetricValue(metrics: PerformanceMetrics, metricName: string): number {
    switch (metricName) {
      case 'responseTime': return metrics.responseTime;
      case 'throughput': return metrics.throughput;
      case 'errorRate': return metrics.errorRate;
      case 'cpuUsage': return metrics.cpuUsage;
      case 'memoryUsage': return metrics.memoryUsage;
      case 'diskUsage': return metrics.diskUsage;
      case 'networkLatency': return metrics.networkLatency;
      case 'concurrentUsers': return metrics.concurrentUsers;
      default: return 0;
    }
  }

  private async sendAlert(rule: AlertRule, metrics: PerformanceMetrics): Promise<void> {
    const alertMessage = this.formatAlertMessage(rule, metrics);
    
    for (const notification of rule.notifications) {
      try {
        await this.sendNotification(notification, alertMessage);
      } catch (error) {
        console.error(`Failed to send ${notification.type} notification:`, error);
      }
    }
  }

  private formatAlertMessage(rule: AlertRule, metrics: PerformanceMetrics): string {
    const metricValue = this.getMetricValue(metrics, rule.metric);
    
    return `🚨 ALERT: ${rule.name}
    
Metric: ${rule.metric}
Current Value: ${metricValue.toFixed(2)}
Threshold: ${rule.threshold}
Condition: ${rule.metric} ${rule.operator} ${rule.threshold}
Severity: ${rule.severity.toUpperCase()}
Time: ${metrics.timestamp.toISOString()}

System Status:
- Response Time: ${metrics.responseTime.toFixed(2)}ms
- Throughput: ${metrics.throughput.toFixed(2)} RPS
- Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%
- CPU Usage: ${metrics.cpuUsage.toFixed(1)}%
- Memory Usage: ${metrics.memoryUsage.toFixed(1)}%`;
  }

  private async sendNotification(config: NotificationConfig, message: string): Promise<void> {
    switch (config.type) {
      case 'email':
        await this.sendEmailNotification(config.target, message);
        break;
      case 'slack':
        await this.sendSlackNotification(config.target, message);
        break;
      case 'webhook':
        await this.sendWebhookNotification(config.target, message);
        break;
      case 'sms':
        await this.sendSmsNotification(config.target, message);
        break;
    }
  }

  private async sendEmailNotification(email: string, message: string): Promise<void> {
    // Simulate email sending
    console.log(`📧 Email sent to ${email}: ${message.substring(0, 100)}...`);
  }

  private async sendSlackNotification(webhook: string, message: string): Promise<void> {
    // Simulate Slack notification
    console.log(`💬 Slack notification sent: ${message.substring(0, 100)}...`);
  }

  private async sendWebhookNotification(url: string, message: string): Promise<void> {
    // Simulate webhook call
    console.log(`🔗 Webhook called ${url}: ${message.substring(0, 100)}...`);
  }

  private async sendSmsNotification(phone: string, message: string): Promise<void> {
    // Simulate SMS sending
    console.log(`📱 SMS sent to ${phone}: ${message.substring(0, 100)}...`);
  }

  private calculateSummary(metrics: PerformanceMetrics[]): PerformanceSummary {
    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        totalRequests: 0,
        errorRate: 0,
        availability: 0,
        throughput: 0,
        performanceScore: 0
      };
    }

    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    const totalRequests = Math.floor(avgThroughput * metrics.length * (this.config.collectionIntervalMs! / 1000));
    
    // Calculate availability (simplified)
    const availability = Math.max(0, 1 - avgErrorRate);
    
    // Calculate performance score (0-100)
    const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 10)); // Penalty for slow responses
    const errorRateScore = Math.max(0, 100 - (avgErrorRate * 1000)); // Penalty for errors
    const performanceScore = (responseTimeScore + errorRateScore) / 2;

    return {
      averageResponseTime: avgResponseTime,
      totalRequests,
      errorRate: avgErrorRate,
      availability,
      throughput: avgThroughput,
      performanceScore
    };
  }

  private analyzeTrends(metrics: PerformanceMetrics[]): TrendAnalysis[] {
    if (metrics.length < 2) return [];

    const trends: TrendAnalysis[] = [];
    const metricsToAnalyze = ['responseTime', 'throughput', 'errorRate', 'cpuUsage', 'memoryUsage'];

    for (const metricName of metricsToAnalyze) {
      const values = metrics.map(m => this.getMetricValue(m, metricName));
      const trend = this.calculateTrend(values);
      
      trends.push({
        metric: metricName,
        trend: trend.direction,
        changePercentage: trend.changePercentage,
        timeframe: `${metrics.length} measurements`
      });
    }

    return trends;
  }

  private calculateTrend(values: number[]): { direction: 'improving' | 'degrading' | 'stable'; changePercentage: number } {
    if (values.length < 2) return { direction: 'stable', changePercentage: 0 };

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    const changePercentage = ((secondAvg - firstAvg) / firstAvg) * 100;

    let direction: 'improving' | 'degrading' | 'stable';
    if (Math.abs(changePercentage) < 5) {
      direction = 'stable';
    } else if (changePercentage > 0) {
      direction = 'degrading'; // Generally, increasing metrics are bad (except throughput)
    } else {
      direction = 'improving';
    }

    return { direction, changePercentage: Math.abs(changePercentage) };
  }
}

interface MonitoringConfig {
  metricsRetentionDays?: number;
  collectionIntervalMs?: number;
  maxMetricsInMemory?: number;
}

interface AlertState {
  triggered: boolean;
  lastTriggered: Date | null;
  triggerCount: number;
}