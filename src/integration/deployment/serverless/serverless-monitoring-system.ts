/**
 * Serverless monitoring system with cold start tracking and performance analysis
 */

import {
  ServerlessManager,
  ServerlessFunctionMetrics,
  ServerlessMetricData,
  ServerlessMetricDataPoint,
  ServerlessCostMetrics,
  ServerlessConcurrencyMetrics,
  TimeRange,
  ServerlessAlarmConfig,
  ServerlessDashboardConfig,
  ServerlessCustomMetricConfig
} from '../types/serverless-types';

export interface ServerlessMonitoringConfig {
  providers: ServerlessProviderMonitoringConfig[];
  alerting: ServerlessAlertingConfig;
  dashboards: ServerlessDashboardConfig[];
  costTracking: ServerlessCostTrackingConfig;
  performanceThresholds: ServerlessPerformanceThresholds;
  coldStartTracking: ServerlessColdStartTrackingConfig;
}

export interface ServerlessProviderMonitoringConfig {
  provider: 'aws' | 'azure' | 'gcp';
  manager: ServerlessManager;
  functions: string[];
  metricsInterval: number; // in milliseconds
  enabled: boolean;
}

export interface ServerlessAlertingConfig {
  enabled: boolean;
  channels: ServerlessAlertChannel[];
  rules: ServerlessAlertRule[];
}

export interface ServerlessAlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
}

export interface ServerlessAlertRule {
  name: string;
  condition: ServerlessAlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
  cooldown: number; // in milliseconds
}

export interface ServerlessAlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // in milliseconds
}

export interface ServerlessCostTrackingConfig {
  enabled: boolean;
  budgets: ServerlessBudget[];
  alerts: ServerlessCostAlert[];
  optimization: ServerlessCostOptimizationConfig;
}

export interface ServerlessBudget {
  name: string;
  amount: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  scope: 'global' | 'provider' | 'function';
  target?: string; // provider or function name
}

export interface ServerlessCostAlert {
  name: string;
  threshold: number; // percentage of budget
  channels: string[];
}

export interface ServerlessCostOptimizationConfig {
  enabled: boolean;
  rightSizing: boolean;
  unusedFunctionDetection: boolean;
  coldStartOptimization: boolean;
  concurrencyOptimization: boolean;
}

export interface ServerlessPerformanceThresholds {
  maxDuration: number; // in milliseconds
  maxMemoryUtilization: number; // percentage
  maxErrorRate: number; // percentage
  maxColdStartRate: number; // percentage
  maxCost: number; // per invocation
}

export interface ServerlessColdStartTrackingConfig {
  enabled: boolean;
  trackingInterval: number; // in milliseconds
  optimizationEnabled: boolean;
  warmupSchedules: ServerlessWarmupSchedule[];
}

export interface ServerlessWarmupSchedule {
  functionId: string;
  schedule: string; // cron expression
  concurrency: number;
  enabled: boolean;
}

export interface ServerlessMonitoringReport {
  timestamp: Date;
  period: TimeRange;
  summary: ServerlessMonitoringSummary;
  functions: ServerlessFunctionReport[];
  costs: ServerlessCostReport;
  alerts: ServerlessAlert[];
  recommendations: ServerlessRecommendation[];
}

export interface ServerlessMonitoringSummary {
  totalInvocations: number;
  totalErrors: number;
  averageDuration: number;
  totalCost: number;
  coldStartRate: number;
  healthyFunctions: number;
  unhealthyFunctions: number;
}

export interface ServerlessFunctionReport {
  functionId: string;
  provider: string;
  metrics: ServerlessFunctionMetrics;
  health: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
}

export interface ServerlessCostReport {
  totalCost: number;
  costByProvider: Record<string, number>;
  costByFunction: Record<string, number>;
  budgetUtilization: Record<string, number>;
  projectedCost: number;
  savings: ServerlessCostSaving[];
}

export interface ServerlessCostSaving {
  type: 'rightsizing' | 'unused-function' | 'cold-start-optimization' | 'concurrency-optimization';
  description: string;
  potentialSaving: number;
  effort: 'low' | 'medium' | 'high';
}

export interface ServerlessAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  functionId?: string;
  provider?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface ServerlessRecommendation {
  type: 'performance' | 'cost' | 'reliability' | 'security';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  functionId?: string;
  provider?: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string[];
}

export class ServerlessMonitoringSystem {
  private readonly config: ServerlessMonitoringConfig;
  private readonly metricsCache: Map<string, ServerlessFunctionMetrics> = new Map();
  private readonly alertHistory: Map<string, ServerlessAlert[]> = new Map();
  private readonly monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly activeAlerts: Map<string, ServerlessAlert> = new Map();

  constructor(config: ServerlessMonitoringConfig) {
    this.config = config;
    this.startMonitoring();
  }

  async getMonitoringReport(timeRange: TimeRange): Promise<ServerlessMonitoringReport> {
    const functions = await this.getAllFunctionReports(timeRange);
    const summary = this.calculateSummary(functions);
    const costs = await this.getCostReport(timeRange);
    const alerts = this.getActiveAlerts();
    const recommendations = await this.generateRecommendations(functions, costs);

    return {
      timestamp: new Date(),
      period: timeRange,
      summary,
      functions,
      costs,
      alerts,
      recommendations
    };
  }

  async getFunctionMetrics(functionId: string, provider: string, timeRange: TimeRange): Promise<ServerlessFunctionMetrics> {
    const providerConfig = this.config.providers.find(p => p.provider === provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} not configured for monitoring`);
    }

    const metrics = await providerConfig.manager.getFunctionMetrics(functionId, timeRange);
    
    // Cache metrics
    const cacheKey = `${provider}:${functionId}`;
    this.metricsCache.set(cacheKey, metrics);

    return metrics;
  }

  async trackColdStarts(functionId: string, provider: string, timeRange: TimeRange): Promise<ServerlessColdStartAnalysis> {
    const metrics = await this.getFunctionMetrics(functionId, provider, timeRange);
    
    const totalInvocations = metrics.invocations.value;
    const coldStarts = metrics.coldStarts.value;
    const warmStarts = metrics.warmStarts.value;
    
    const coldStartRate = totalInvocations > 0 ? (coldStarts / totalInvocations) * 100 : 0;
    const averageColdStartDuration = this.calculateAverageColdStartDuration(metrics.coldStarts.dataPoints);
    const coldStartImpact = this.calculateColdStartImpact(coldStarts, averageColdStartDuration);

    return {
      functionId,
      provider,
      timeRange,
      totalInvocations,
      coldStarts,
      warmStarts,
      coldStartRate,
      averageColdStartDuration,
      coldStartImpact,
      recommendations: this.generateColdStartRecommendations(coldStartRate, averageColdStartDuration)
    };
  }

  async optimizeColdStarts(functionId: string, provider: string): Promise<ServerlessColdStartOptimization> {
    const analysis = await this.trackColdStarts(
      functionId,
      provider,
      { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }
    );

    const optimizations: ServerlessColdStartOptimizationAction[] = [];

    // Recommend provisioned concurrency if cold start rate is high
    if (analysis.coldStartRate > this.config.performanceThresholds.maxColdStartRate) {
      optimizations.push({
        type: 'provisioned-concurrency',
        description: 'Enable provisioned concurrency to reduce cold starts',
        estimatedImprovement: Math.min(analysis.coldStartRate * 0.8, 90), // Up to 90% improvement
        cost: this.estimateProvisionedConcurrencyCost(functionId, provider),
        implementation: [
          'Configure provisioned concurrency based on traffic patterns',
          'Monitor and adjust concurrency levels',
          'Consider scheduled scaling for predictable traffic'
        ]
      });
    }

    // Recommend memory optimization
    if (analysis.averageColdStartDuration > 1000) { // > 1 second
      optimizations.push({
        type: 'memory-optimization',
        description: 'Increase memory allocation to reduce cold start duration',
        estimatedImprovement: 30, // 30% improvement in cold start time
        cost: this.estimateMemoryOptimizationCost(functionId, provider),
        implementation: [
          'Increase function memory allocation',
          'Test and measure cold start improvements',
          'Balance memory cost vs performance gain'
        ]
      });
    }

    // Recommend warmup scheduling
    optimizations.push({
      type: 'warmup-scheduling',
      description: 'Schedule periodic warmup invocations',
      estimatedImprovement: 50, // 50% reduction in cold starts
      cost: this.estimateWarmupSchedulingCost(functionId, provider),
      implementation: [
        'Create scheduled warmup function',
        'Configure warmup frequency based on traffic patterns',
        'Monitor warmup effectiveness'
      ]
    });

    return {
      functionId,
      provider,
      analysis,
      optimizations,
      estimatedSavings: this.calculateColdStartSavings(analysis, optimizations)
    };
  }

  async analyzeConcurrency(functionId: string, provider: string, timeRange: TimeRange): Promise<ServerlessConcurrencyAnalysis> {
    const metrics = await this.getFunctionMetrics(functionId, provider, timeRange);
    
    const maxConcurrency = Math.max(...metrics.concurrentExecutions.dataPoints.map(dp => dp.value));
    const averageConcurrency = metrics.concurrentExecutions.statistics.average;
    const throttles = metrics.throttles.value;
    const throttleRate = metrics.invocations.value > 0 ? (throttles / metrics.invocations.value) * 100 : 0;

    return {
      functionId,
      provider,
      timeRange,
      maxConcurrency,
      averageConcurrency,
      throttles,
      throttleRate,
      recommendations: this.generateConcurrencyRecommendations(maxConcurrency, averageConcurrency, throttleRate)
    };
  }

  async generateCostOptimizationReport(timeRange: TimeRange): Promise<ServerlessCostOptimizationReport> {
    const costReport = await this.getCostReport(timeRange);
    const optimizations: ServerlessCostOptimization[] = [];

    // Analyze each function for cost optimization opportunities
    for (const providerConfig of this.config.providers) {
      for (const functionId of providerConfig.functions) {
        const metrics = await this.getFunctionMetrics(functionId, providerConfig.provider, timeRange);
        
        // Check for unused functions
        if (metrics.invocations.value === 0) {
          optimizations.push({
            type: 'unused-function',
            functionId,
            provider: providerConfig.provider,
            description: `Function ${functionId} has no invocations`,
            potentialSaving: this.estimateUnusedFunctionSaving(functionId, providerConfig.provider),
            recommendation: 'Consider removing or archiving this function'
          });
        }

        // Check for over-provisioned memory
        if (metrics.memoryUtilization.statistics.average < 50) { // Less than 50% memory utilization
          optimizations.push({
            type: 'memory-rightsizing',
            functionId,
            provider: providerConfig.provider,
            description: `Function ${functionId} is using only ${metrics.memoryUtilization.statistics.average.toFixed(1)}% of allocated memory`,
            potentialSaving: this.estimateMemoryRightsizingSaving(functionId, providerConfig.provider, metrics.memoryUtilization.statistics.average),
            recommendation: 'Reduce memory allocation to optimize costs'
          });
        }

        // Check for high cold start costs
        const coldStartAnalysis = await this.trackColdStarts(functionId, providerConfig.provider, timeRange);
        if (coldStartAnalysis.coldStartRate > 20) { // More than 20% cold starts
          optimizations.push({
            type: 'cold-start-optimization',
            functionId,
            provider: providerConfig.provider,
            description: `Function ${functionId} has ${coldStartAnalysis.coldStartRate.toFixed(1)}% cold start rate`,
            potentialSaving: this.estimateColdStartOptimizationSaving(coldStartAnalysis),
            recommendation: 'Implement cold start optimization strategies'
          });
        }
      }
    }

    const totalPotentialSaving = optimizations.reduce((sum, opt) => sum + opt.potentialSaving, 0);

    return {
      timeRange,
      currentCost: costReport.totalCost,
      optimizations,
      totalPotentialSaving,
      projectedCost: costReport.totalCost - totalPotentialSaving,
      savingsPercentage: costReport.totalCost > 0 ? (totalPotentialSaving / costReport.totalCost) * 100 : 0
    };
  }

  dispose(): void {
    // Clear all monitoring intervals
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
  }

  // Private methods
  private startMonitoring(): void {
    for (const providerConfig of this.config.providers) {
      if (!providerConfig.enabled) continue;

      const intervalId = setInterval(async () => {
        await this.collectMetrics(providerConfig);
      }, providerConfig.metricsInterval);

      this.monitoringIntervals.set(providerConfig.provider, intervalId);
    }
  }

  private async collectMetrics(providerConfig: ServerlessProviderMonitoringConfig): Promise<void> {
    const timeRange: TimeRange = {
      start: new Date(Date.now() - providerConfig.metricsInterval),
      end: new Date()
    };

    for (const functionId of providerConfig.functions) {
      try {
        const metrics = await providerConfig.manager.getFunctionMetrics(functionId, timeRange);
        const cacheKey = `${providerConfig.provider}:${functionId}`;
        this.metricsCache.set(cacheKey, metrics);

        // Check for alerts
        await this.checkAlerts(functionId, providerConfig.provider, metrics);
      } catch (error) {
        console.error(`Failed to collect metrics for ${functionId} on ${providerConfig.provider}:`, error);
      }
    }
  }

  private async checkAlerts(functionId: string, provider: string, metrics: ServerlessFunctionMetrics): Promise<void> {
    for (const rule of this.config.alerting.rules) {
      const alertKey = `${provider}:${functionId}:${rule.name}`;
      const metricValue = this.getMetricValue(metrics, rule.condition.metric);
      
      if (this.evaluateCondition(metricValue, rule.condition)) {
        // Check if alert is already active
        if (!this.activeAlerts.has(alertKey)) {
          const alert: ServerlessAlert = {
            id: alertKey,
            timestamp: new Date(),
            severity: rule.severity,
            title: `${rule.name} - ${functionId}`,
            description: `${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}`,
            functionId,
            provider,
            metric: rule.condition.metric,
            value: metricValue,
            threshold: rule.condition.threshold,
            resolved: false
          };

          this.activeAlerts.set(alertKey, alert);
          await this.sendAlert(alert, rule.channels);
        }
      } else {
        // Resolve alert if it was active
        const activeAlert = this.activeAlerts.get(alertKey);
        if (activeAlert && !activeAlert.resolved) {
          activeAlert.resolved = true;
          activeAlert.resolvedAt = new Date();
          this.activeAlerts.delete(alertKey);
        }
      }
    }
  }

  private getMetricValue(metrics: ServerlessFunctionMetrics, metricName: string): number {
    switch (metricName) {
      case 'invocations': return metrics.invocations.value;
      case 'duration': return metrics.duration.value;
      case 'errors': return metrics.errors.value;
      case 'throttles': return metrics.throttles.value;
      case 'coldStarts': return metrics.coldStarts.value;
      case 'memoryUtilization': return metrics.memoryUtilization.value;
      case 'concurrentExecutions': return metrics.concurrentExecutions.value;
      case 'cost': return metrics.costMetrics.totalCost;
      default: return 0;
    }
  }

  private evaluateCondition(value: number, condition: ServerlessAlertCondition): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      default: return false;
    }
  }

  private async sendAlert(alert: ServerlessAlert, channels: string[]): Promise<void> {
    // Mock implementation - send alert to configured channels
    console.log(`ALERT [${alert.severity.toUpperCase()}]: ${alert.title} - ${alert.description}`);
  }

  private async getAllFunctionReports(timeRange: TimeRange): Promise<ServerlessFunctionReport[]> {
    const reports: ServerlessFunctionReport[] = [];

    for (const providerConfig of this.config.providers) {
      for (const functionId of providerConfig.functions) {
        try {
          const metrics = await this.getFunctionMetrics(functionId, providerConfig.provider, timeRange);
          const health = this.assessFunctionHealth(metrics);
          const issues = this.identifyIssues(metrics);
          const recommendations = this.generateFunctionRecommendations(metrics);

          reports.push({
            functionId,
            provider: providerConfig.provider,
            metrics,
            health,
            issues,
            recommendations
          });
        } catch (error) {
          console.error(`Failed to get report for ${functionId} on ${providerConfig.provider}:`, error);
        }
      }
    }

    return reports;
  }

  private calculateSummary(functions: ServerlessFunctionReport[]): ServerlessMonitoringSummary {
    const totalInvocations = functions.reduce((sum, f) => sum + f.metrics.invocations.value, 0);
    const totalErrors = functions.reduce((sum, f) => sum + f.metrics.errors.value, 0);
    const totalDuration = functions.reduce((sum, f) => sum + f.metrics.duration.value, 0);
    const totalCost = functions.reduce((sum, f) => sum + f.metrics.costMetrics.totalCost, 0);
    const totalColdStarts = functions.reduce((sum, f) => sum + f.metrics.coldStarts.value, 0);
    
    const averageDuration = functions.length > 0 ? totalDuration / functions.length : 0;
    const coldStartRate = totalInvocations > 0 ? (totalColdStarts / totalInvocations) * 100 : 0;
    const healthyFunctions = functions.filter(f => f.health === 'healthy').length;
    const unhealthyFunctions = functions.length - healthyFunctions;

    return {
      totalInvocations,
      totalErrors,
      averageDuration,
      totalCost,
      coldStartRate,
      healthyFunctions,
      unhealthyFunctions
    };
  }

  private async getCostReport(timeRange: TimeRange): Promise<ServerlessCostReport> {
    // Mock implementation - calculate cost report
    return {
      totalCost: 100.50,
      costByProvider: { aws: 60.30, azure: 25.20, gcp: 15.00 },
      costByFunction: { 'function1': 40.00, 'function2': 35.50, 'function3': 25.00 },
      budgetUtilization: { 'monthly-budget': 75.5 },
      projectedCost: 120.60,
      savings: []
    };
  }

  private getActiveAlerts(): ServerlessAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  private async generateRecommendations(functions: ServerlessFunctionReport[], costs: ServerlessCostReport): Promise<ServerlessRecommendation[]> {
    const recommendations: ServerlessRecommendation[] = [];

    // Generate performance recommendations
    for (const func of functions) {
      if (func.health !== 'healthy') {
        recommendations.push(...this.generateFunctionRecommendations(func.metrics).map(rec => ({
          type: 'performance' as const,
          priority: 'medium' as const,
          title: rec,
          description: `Improve performance for ${func.functionId}`,
          functionId: func.functionId,
          provider: func.provider,
          impact: 'Improved response times and user experience',
          effort: 'medium' as const,
          implementation: ['Analyze function code', 'Optimize resource allocation', 'Monitor improvements']
        })));
      }
    }

    return recommendations;
  }

  private assessFunctionHealth(metrics: ServerlessFunctionMetrics): 'healthy' | 'warning' | 'critical' {
    const errorRate = metrics.invocations.value > 0 ? (metrics.errors.value / metrics.invocations.value) * 100 : 0;
    const coldStartRate = metrics.invocations.value > 0 ? (metrics.coldStarts.value / metrics.invocations.value) * 100 : 0;

    if (errorRate > this.config.performanceThresholds.maxErrorRate || 
        metrics.duration.value > this.config.performanceThresholds.maxDuration) {
      return 'critical';
    }

    if (coldStartRate > this.config.performanceThresholds.maxColdStartRate ||
        metrics.memoryUtilization.value > this.config.performanceThresholds.maxMemoryUtilization) {
      return 'warning';
    }

    return 'healthy';
  }

  private identifyIssues(metrics: ServerlessFunctionMetrics): string[] {
    const issues: string[] = [];

    const errorRate = metrics.invocations.value > 0 ? (metrics.errors.value / metrics.invocations.value) * 100 : 0;
    if (errorRate > this.config.performanceThresholds.maxErrorRate) {
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
    }

    if (metrics.duration.value > this.config.performanceThresholds.maxDuration) {
      issues.push(`High duration: ${metrics.duration.value}ms`);
    }

    const coldStartRate = metrics.invocations.value > 0 ? (metrics.coldStarts.value / metrics.invocations.value) * 100 : 0;
    if (coldStartRate > this.config.performanceThresholds.maxColdStartRate) {
      issues.push(`High cold start rate: ${coldStartRate.toFixed(1)}%`);
    }

    if (metrics.costMetrics.totalCost > this.config.performanceThresholds.maxCost * metrics.invocations.value) {
      issues.push(`High cost per invocation: $${(metrics.costMetrics.totalCost / metrics.invocations.value).toFixed(4)}`);
    }

    return issues;
  }

  private generateFunctionRecommendations(metrics: ServerlessFunctionMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.memoryUtilization.value < 50) {
      recommendations.push('Consider reducing memory allocation to optimize costs');
    }

    const coldStartRate = metrics.invocations.value > 0 ? (metrics.coldStarts.value / metrics.invocations.value) * 100 : 0;
    if (coldStartRate > 20) {
      recommendations.push('Implement cold start optimization strategies');
    }

    if (metrics.throttles.value > 0) {
      recommendations.push('Consider increasing concurrency limits or implementing queuing');
    }

    return recommendations;
  }

  // Additional helper methods for cold start analysis
  private calculateAverageColdStartDuration(dataPoints: ServerlessMetricDataPoint[]): number {
    if (dataPoints.length === 0) return 0;
    const sum = dataPoints.reduce((acc, dp) => acc + dp.value, 0);
    return sum / dataPoints.length;
  }

  private calculateColdStartImpact(coldStarts: number, averageDuration: number): number {
    return coldStarts * averageDuration; // Total time impact in milliseconds
  }

  private generateColdStartRecommendations(coldStartRate: number, averageDuration: number): string[] {
    const recommendations: string[] = [];

    if (coldStartRate > 20) {
      recommendations.push('Enable provisioned concurrency for frequently used functions');
    }

    if (averageDuration > 1000) {
      recommendations.push('Increase memory allocation to reduce cold start duration');
    }

    if (coldStartRate > 10) {
      recommendations.push('Implement function warming strategies');
    }

    return recommendations;
  }

  private estimateProvisionedConcurrencyCost(functionId: string, provider: string): number {
    // Mock cost estimation
    return 50.00; // $50/month for provisioned concurrency
  }

  private estimateMemoryOptimizationCost(functionId: string, provider: string): number {
    // Mock cost estimation
    return 10.00; // $10/month additional cost for increased memory
  }

  private estimateWarmupSchedulingCost(functionId: string, provider: string): number {
    // Mock cost estimation
    return 5.00; // $5/month for warmup invocations
  }

  private calculateColdStartSavings(analysis: ServerlessColdStartAnalysis, optimizations: ServerlessColdStartOptimizationAction[]): number {
    // Mock savings calculation
    return optimizations.reduce((sum, opt) => sum + (opt.cost * 0.1), 0); // 10% of optimization cost as savings
  }

  private estimateUnusedFunctionSaving(functionId: string, provider: string): number {
    // Mock savings estimation
    return 25.00; // $25/month savings from removing unused function
  }

  private estimateMemoryRightsizingSaving(functionId: string, provider: string, utilizationRate: number): number {
    // Mock savings estimation based on utilization
    const potentialReduction = (100 - utilizationRate) / 100;
    return 20.00 * potentialReduction; // Up to $20/month savings
  }

  private estimateColdStartOptimizationSaving(analysis: ServerlessColdStartAnalysis): number {
    // Mock savings estimation
    return analysis.coldStartRate * 0.5; // $0.50 per percentage point of cold start rate
  }
}

// Additional interfaces for cold start and concurrency analysis
export interface ServerlessColdStartAnalysis {
  functionId: string;
  provider: string;
  timeRange: TimeRange;
  totalInvocations: number;
  coldStarts: number;
  warmStarts: number;
  coldStartRate: number;
  averageColdStartDuration: number;
  coldStartImpact: number;
  recommendations: string[];
}

export interface ServerlessColdStartOptimization {
  functionId: string;
  provider: string;
  analysis: ServerlessColdStartAnalysis;
  optimizations: ServerlessColdStartOptimizationAction[];
  estimatedSavings: number;
}

export interface ServerlessColdStartOptimizationAction {
  type: 'provisioned-concurrency' | 'memory-optimization' | 'warmup-scheduling';
  description: string;
  estimatedImprovement: number; // percentage
  cost: number;
  implementation: string[];
}

export interface ServerlessConcurrencyAnalysis {
  functionId: string;
  provider: string;
  timeRange: TimeRange;
  maxConcurrency: number;
  averageConcurrency: number;
  throttles: number;
  throttleRate: number;
  recommendations: string[];
}

export interface ServerlessCostOptimizationReport {
  timeRange: TimeRange;
  currentCost: number;
  optimizations: ServerlessCostOptimization[];
  totalPotentialSaving: number;
  projectedCost: number;
  savingsPercentage: number;
}

export interface ServerlessCostOptimization {
  type: 'unused-function' | 'memory-rightsizing' | 'cold-start-optimization' | 'concurrency-optimization';
  functionId: string;
  provider: string;
  description: string;
  potentialSaving: number;
  recommendation: string;
}