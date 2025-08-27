/**
 * Cost Analyzer
 * Cost analysis with resource usage tracking and optimization recommendations
 */

import { EventEmitter } from 'events';
import {
  CostAnalytics,
  ResourceCostMetrics,
  OperationalCostMetrics,
  OptimizationRecommendation,
  CostTrendMetrics,
  CostMetric
} from './types';

export interface CostAnalyzerConfig {
  enableRealTimeTracking: boolean;
  enableOptimizationRecommendations: boolean;
  costThresholds: CostThresholds;
  analysisInterval: number;
  retentionDays: number;
}

export interface CostThresholds {
  warning: number;
  critical: number;
  budget: number;
}

export interface ResourceUsageData {
  timestamp: Date;
  resourceType: 'compute' | 'storage' | 'network' | 'service';
  resourceId: string;
  usage: number;
  cost: number;
  metadata?: Record<string, any>;
}

export interface CostOptimizer {
  analyzeResourceUsage(data: ResourceUsageData[]): Promise<OptimizationRecommendation[]>;
  calculatePotentialSavings(recommendations: OptimizationRecommendation[]): Promise<number>;
  implementRecommendation(__recommendationId: string): Promise<void>;
}

export interface CostStorage {
  storeCostData(data: ResourceUsageData[]): Promise<void>;
  getCostData(timeRange: { start: Date; end: Date }): Promise<ResourceUsageData[]>;
  getCostTrends(timeRange: { start: Date; end: Date }): Promise<CostTrendMetrics>;
}

export class CostAnalyzer extends EventEmitter {
  private config: CostAnalyzerConfig;
  private optimizer: CostOptimizer;
  private storage: CostStorage;
  private analysisTimer?: NodeJS.Timeout;
  private currentCosts: Map<string, number> = new Map();

  constructor(
    config: CostAnalyzerConfig,
    optimizer: CostOptimizer,
    storage: CostStorage
  ) {
    super();
    this.config = config;
    this.optimizer = optimizer;
    this.storage = storage;

    if (this.config.enableRealTimeTracking) {
      this.startRealTimeTracking();
    }
  }

  /**
   * Track resource usage and cost
   */
  async trackResourceUsage(
    resourceType: 'compute' | 'storage' | 'network' | 'service',
    resourceId: string,
    usage: number,
    cost: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const usageData: ResourceUsageData = {
      timestamp: new Date(),
      resourceType,
      resourceId,
      usage,
      cost,
      metadata
    };

    await this.storage.storeCostData([usageData]);
    this.currentCosts.set(`${resourceType}:${resourceId}`, cost);

    // Check cost thresholds
    await this.checkCostThresholds(resourceType, cost);

    this.emit('resourceUsageTracked', usageData);
  }

  /**
   * Get comprehensive cost analytics
   */
  async getCostAnalytics(timeRange: { start: Date; end: Date }): Promise<CostAnalytics> {
    const costData = await this.storage.getCostData(timeRange);
    
    const resourceCosts = await this.calculateResourceCosts(costData);
    const operationalCosts = await this.calculateOperationalCosts(costData);
    const costTrends = await this.storage.getCostTrends(timeRange);
    
    let optimizationRecommendations: OptimizationRecommendation[] = [];
    if (this.config.enableOptimizationRecommendations) {
      optimizationRecommendations = await this.optimizer.analyzeResourceUsage(costData);
    }

    return {
      resourceCosts,
      operationalCosts,
      optimizationRecommendations,
      costTrends
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  async generateOptimizationRecommendations(
    timeRange: { start: Date; end: Date }
  ): Promise<OptimizationRecommendation[]> {
    const costData = await this.storage.getCostData(timeRange);
    const recommendations = await this.optimizer.analyzeResourceUsage(costData);
    
    // Sort by potential savings
    recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
    
    this.emit('optimizationRecommendationsGenerated', recommendations);
    return recommendations;
  }

  /**
   * Calculate cost savings from optimization
   */
  async calculatePotentialSavings(
    recommendations: OptimizationRecommendation[]
  ): Promise<number> {
    return this.optimizer.calculatePotentialSavings(recommendations);
  }

  /**
   * Get cost breakdown by resource type
   */
  async getCostBreakdown(timeRange: { start: Date; end: Date }): Promise<Record<string, CostMetric>> {
    const costData = await this.storage.getCostData(timeRange);
    const breakdown: Record<string, CostMetric> = {};

    // Group by resource type
    const resourceGroups = new Map<string, ResourceUsageData[]>();
    costData.forEach(data => {
      const key = data.resourceType;
      if (!resourceGroups.has(key)) {
        resourceGroups.set(key, []);
      }
      resourceGroups.get(key)!.push(data);
    });

    // Calculate metrics for each resource type
    for (const [resourceType, data] of resourceGroups) {
      const costs = data.map(d => d.cost);
      const current = costs[costs.length - 1] || 0;
      const average = costs.reduce((a, b) => a + b, 0) / costs.length;
      breakdown[resourceType] = {
        current,
        projected: this.projectCost(costs),
        budget: this.config.costThresholds.budget,
        variance: ((current - average) / average) * 100,
        trend: this.calculateTrend(costs)
      };
    }

    return breakdown;
  }

  /**
   * Get cost trends over time
   */
  async getCostTrends(
    timeRange: { start: Date; end: Date },
    __interval: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<CostTrendMetrics> {
    return this.storage.getCostTrends(timeRange);
  }

  /**
   * Set cost budget and alerts
   */
  async setCostBudget(
    resourceType: string,
    budget: number,
    alertThresholds: { warning: number; critical: number }
  ): Promise<void> {
    // Store budget configuration
    this.config.costThresholds = {
      budget,
      warning: alertThresholds.warning,
      critical: alertThresholds.critical
    };

    this.emit('budgetSet', { resourceType, budget, alertThresholds });
  }

  /**
   * Generate cost report
   */
  async generateCostReport(
    timeRange: { start: Date; end: Date },
    includeRecommendations: boolean = true
  ): Promise<CostReport> {
    const analytics = await this.getCostAnalytics(timeRange);
    const breakdown = await this.getCostBreakdown(timeRange);
    const trends = await this.getCostTrends(timeRange);

    const report: CostReport = {
      id: this.generateReportId(),
      timeRange,
      totalCost: this.calculateTotalCost(analytics.resourceCosts, analytics.operationalCosts),
      resourceBreakdown: breakdown,
      trends,
      budgetVariance: this.calculateBudgetVariance(analytics),
      generatedAt: new Date()
    };

    if (includeRecommendations) {
      report.optimizationRecommendations = analytics.optimizationRecommendations;
      report.potentialSavings = await this.calculatePotentialSavings(analytics.optimizationRecommendations);
    }

    this.emit('costReportGenerated', report);
    return report;
  }

  /**
   * Monitor cost anomalies
   */
  async detectCostAnomalies(
    timeRange: { start: Date; end: Date },
    threshold: number = 2.0
  ): Promise<CostAnomaly[]> {
    const costData = await this.storage.getCostData(timeRange);
    const anomalies: CostAnomaly[] = [];

    // Group by resource
    const resourceGroups = new Map<string, ResourceUsageData[]>();
    costData.forEach(data => {
      const key = `${data.resourceType}:${data.resourceId}`;
      if (!resourceGroups.has(key)) {
        resourceGroups.set(key, []);
      }
      resourceGroups.get(key)!.push(data);
    });

    // Detect anomalies using statistical analysis
    for (const [resourceKey, data] of resourceGroups) {
      const costs = data.map(d => d.cost);
      const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
      const stdDev = Math.sqrt(
        costs.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / costs.length
      );

      // Find outliers
      data.forEach(usage => {
        const zScore = Math.abs((usage.cost - mean) / stdDev);
        if (zScore > threshold) {
          anomalies.push({
            id: this.generateAnomalyId(),
            timestamp: usage.timestamp,
            resourceType: usage.resourceType,
            resourceId: usage.resourceId,
            expectedCost: mean,
            actualCost: usage.cost,
            deviation: zScore,
            severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium'
          });
        }
      });
    }

    if (anomalies.length > 0) {
      this.emit('costAnomaliesDetected', anomalies);
    }

    return anomalies;
  }

  /**
   * Stop cost analyzer
   */
  async stop(): Promise<void> {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    this.emit('stopped');
  }

  private startRealTimeTracking(): void {
    this.analysisTimer = setInterval(async () => {
      try {
        const timeRange = {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          end: new Date()
        };
        
        await this.detectCostAnomalies(timeRange);
        
        if (this.config.enableOptimizationRecommendations) {
          await this.generateOptimizationRecommendations(timeRange);
        }
      } catch (error) {
        this.emit('analysisError', error);
      }
    }, this.config.analysisInterval);
  }

  private async checkCostThresholds(resourceType: string, cost: number): Promise<void> {
    const { warning, critical, budget } = this.config.costThresholds;
    
    if (cost > critical) {
      this.emit('costThresholdExceeded', {
        level: 'critical',
        resourceType,
        cost,
        threshold: critical
      });
    } else if (cost > warning) {
      this.emit('costThresholdExceeded', {
        level: 'warning',
        resourceType,
        cost,
        threshold: warning
      });
    }

    if (cost > budget) {
      this.emit('budgetExceeded', {
        resourceType,
        cost,
        budget
      });
    }
  }

  private async calculateResourceCosts(data: ResourceUsageData[]): Promise<ResourceCostMetrics> {
    const resourceGroups = new Map<string, ResourceUsageData[]>();
    data.forEach(item => {
      if (!resourceGroups.has(item.resourceType)) {
        resourceGroups.set(item.resourceType, []);
      }
      resourceGroups.get(item.resourceType)!.push(item);
    });

    const compute = this.calculateCostMetric(resourceGroups.get('compute') || []);
    const storage = this.calculateCostMetric(resourceGroups.get('storage') || []);
    const network = this.calculateCostMetric(resourceGroups.get('network') || []);
    
    const services: Record<string, CostMetric> = {};
    const serviceData = resourceGroups.get('service') || [];
    const serviceGroups = new Map<string, ResourceUsageData[]>();
    serviceData.forEach(item => {
      const serviceName = item.resourceId;
      if (!serviceGroups.has(serviceName)) {
        serviceGroups.set(serviceName, []);
      }
      serviceGroups.get(serviceName)!.push(item);
    });

    for (const [serviceName, serviceItems] of serviceGroups) {
      services[serviceName] = this.calculateCostMetric(serviceItems);
    }

    return { compute, storage, network, services };
  }

  private async calculateOperationalCosts(data: ResourceUsageData[]): Promise<OperationalCostMetrics> {
    // This would typically integrate with HR systems, licensing databases, etc.
    // For now, returning placeholder values
    return {
      personnel: { current: 0, projected: 0, budget: 0, variance: 0, trend: 'stable' },
      infrastructure: this.calculateCostMetric(data),
      licensing: { current: 0, projected: 0, budget: 0, variance: 0, trend: 'stable' },
      maintenance: { current: 0, projected: 0, budget: 0, variance: 0, trend: 'stable' }
    };
  }

  private calculateCostMetric(data: ResourceUsageData[]): CostMetric {
    if (data.length === 0) {
      return { current: 0, projected: 0, budget: 0, variance: 0, trend: 'stable' };
    }

    const costs = data.map(d => d.cost);
    const current = costs[costs.length - 1];
    const average = costs.reduce((a, b) => a + b, 0) / costs.length;
    const projected = this.projectCost(costs);
    const trend = this.calculateTrend(costs);

    return {
      current,
      projected,
      budget: this.config.costThresholds.budget,
      variance: ((current - average) / average) * 100,
      trend
    };
  }

  private projectCost(costs: number[]): number {
    if (costs.length < 2) {return costs[0] || 0;}
    
    // Simple linear projection
    const recent = costs.slice(-5); // Use last 5 data points
    const trend = (recent[recent.length - 1] - recent[0]) / recent.length;
    return costs[costs.length - 1] + trend;
  }

  private calculateTrend(costs: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (costs.length < 2) {return 'stable';}
    
    const recent = costs.slice(-5);
    const trend = recent[recent.length - 1] - recent[0];
    const threshold = recent[0] * 0.05; // 5% threshold
    
    if (trend > threshold) {return 'increasing';}
    if (trend < -threshold) {return 'decreasing';}
    return 'stable';
  }

  private calculateTotalCost(
    resourceCosts: ResourceCostMetrics,
    operationalCosts: OperationalCostMetrics
  ): number {
    const resourceTotal = resourceCosts.compute.current + 
                         resourceCosts.storage.current + 
                         resourceCosts.network.current +
                         Object.values(resourceCosts.services).reduce((sum, cost) => sum + cost.current, 0);
    
    const operationalTotal = operationalCosts.personnel.current +
                           operationalCosts.infrastructure.current +
                           operationalCosts.licensing.current +
                           operationalCosts.maintenance.current;
    
    return resourceTotal + operationalTotal;
  }

  private calculateBudgetVariance(analytics: CostAnalytics): number {
    const totalCost = this.calculateTotalCost(analytics.resourceCosts, analytics.operationalCosts);
    const budget = this.config.costThresholds.budget;
    return ((totalCost - budget) / budget) * 100;
  }

  private generateReportId(): string {
    return `cost_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface CostReport {
  id: string;
  timeRange: { start: Date; end: Date };
  totalCost: number;
  resourceBreakdown: Record<string, CostMetric>;
  trends: CostTrendMetrics;
  budgetVariance: number;
  optimizationRecommendations?: OptimizationRecommendation[];
  potentialSavings?: number;
  generatedAt: Date;
}

export interface CostAnomaly {
  id: string;
  timestamp: Date;
  resourceType: string;
  resourceId: string;
  expectedCost: number;
  actualCost: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}