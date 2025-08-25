/**
 * Capacity planning with resource forecasting and optimization recommendations
 */

import { EventEmitter } from 'events';
import {
  CapacityPlan,
  ResourceCapacity,
  ResourceMetric,
  CapacityRecommendation,
  CostAnalysis,
  CostBreakdownItem,
  PerformanceMetrics
} from '../types/performance-types.js';

export class CapacityPlanner extends EventEmitter {
  private historicalMetrics: PerformanceMetrics[] = [];
  private resourcePricing: ResourcePricing;

  constructor(pricing?: ResourcePricing) {
    super();
    this.resourcePricing = pricing || this.getDefaultPricing();
  }

  /**
   * Add historical metrics for capacity planning
   */
  addMetrics(metrics: PerformanceMetrics[]): void {
    this.historicalMetrics.push(...metrics);
    // Keep only last 30 days of data
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.historicalMetrics = this.historicalMetrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Generate capacity plan for a given timeframe
   */
  async generateCapacityPlan(
    timeframe: string,
    expectedGrowthRate: number = 0.2 // 20% growth by default
  ): Promise<CapacityPlan> {
    const currentCapacity = await this.getCurrentCapacity();
    const projectedCapacity = this.projectCapacity(currentCapacity, expectedGrowthRate, timeframe);
    const recommendations = this.generateRecommendations(currentCapacity, projectedCapacity);
    const costAnalysis = this.analyzeCosts(currentCapacity, projectedCapacity, recommendations);

    const plan: CapacityPlan = {
      currentCapacity,
      projectedCapacity,
      timeframe,
      growthRate: expectedGrowthRate,
      recommendations,
      costAnalysis
    };

    this.emit('capacityPlanGenerated', plan);
    return plan;
  }

  /**
   * Analyze resource utilization trends
   */
  analyzeUtilizationTrends(): UtilizationTrends {
    if (this.historicalMetrics.length < 10) {
      throw new Error('Insufficient historical data for trend analysis');
    }

    const trends: UtilizationTrends = {
      cpu: this.analyzeTrend('cpuUsage'),
      memory: this.analyzeTrend('memoryUsage'),
      network: this.analyzeTrend('networkLatency'),
      throughput: this.analyzeTrend('throughput'),
      responseTime: this.analyzeTrend('responseTime')
    };

    return trends;
  }

  /**
   * Forecast resource requirements
   */
  forecastResourceRequirements(
    targetMetrics: TargetMetrics,
    timeframe: string
  ): ResourceForecast {
    const trends = this.analyzeUtilizationTrends();
    const currentCapacity = this.getCurrentCapacitySync();
    
    // Calculate required capacity based on trends and targets
    const forecast: ResourceForecast = {
      timeframe,
      targetMetrics,
      requiredCapacity: this.calculateRequiredCapacity(currentCapacity, trends, targetMetrics),
      confidenceLevel: this.calculateConfidenceLevel(),
      assumptions: this.getAssumptions(trends),
      risks: this.identifyRisks(trends, targetMetrics)
    };

    return forecast;
  }

  /**
   * Optimize resource allocation
   */
  optimizeResourceAllocation(constraints: OptimizationConstraints): OptimizationResult {
    const currentCapacity = this.getCurrentCapacitySync();
    const utilizationTrends = this.analyzeUtilizationTrends();
    
    const optimizations: ResourceOptimization[] = [];

    // CPU optimization
    if (utilizationTrends.cpu.averageUtilization < 30) {
      optimizations.push({
        resource: 'cpu',
        currentAllocation: currentCapacity.cpu.current,
        recommendedAllocation: currentCapacity.cpu.current * 0.7,
        expectedSavings: this.calculateSavings('cpu', currentCapacity.cpu.current * 0.3),
        riskLevel: 'low',
        reasoning: 'CPU utilization consistently below 30%'
      });
    } else if (utilizationTrends.cpu.averageUtilization > 80) {
      optimizations.push({
        resource: 'cpu',
        currentAllocation: currentCapacity.cpu.current,
        recommendedAllocation: currentCapacity.cpu.current * 1.5,
        expectedSavings: -this.calculateCost('cpu', currentCapacity.cpu.current * 0.5),
        riskLevel: 'medium',
        reasoning: 'CPU utilization consistently above 80%'
      });
    }

    // Memory optimization
    if (utilizationTrends.memory.averageUtilization < 40) {
      optimizations.push({
        resource: 'memory',
        currentAllocation: currentCapacity.memory.current,
        recommendedAllocation: currentCapacity.memory.current * 0.8,
        expectedSavings: this.calculateSavings('memory', currentCapacity.memory.current * 0.2),
        riskLevel: 'low',
        reasoning: 'Memory utilization consistently below 40%'
      });
    }

    // Instance optimization
    const avgUtilization = (utilizationTrends.cpu.averageUtilization + utilizationTrends.memory.averageUtilization) / 2;
    if (avgUtilization < 50 && currentCapacity.instances > 2) {
      optimizations.push({
        resource: 'instances',
        currentAllocation: currentCapacity.instances,
        recommendedAllocation: Math.max(2, Math.ceil(currentCapacity.instances * 0.8)),
        expectedSavings: this.calculateSavings('instances', Math.floor(currentCapacity.instances * 0.2)),
        riskLevel: 'medium',
        reasoning: 'Overall resource utilization below 50%'
      });
    }

    return {
      optimizations,
      totalSavings: optimizations.reduce((sum, opt) => sum + opt.expectedSavings, 0),
      implementationPlan: this.createImplementationPlan(optimizations),
      monitoringPlan: this.createMonitoringPlan(optimizations)
    };
  }

  private async getCurrentCapacity(): Promise<ResourceCapacity> {
    // In a real implementation, this would query actual infrastructure
    return {
      cpu: {
        current: 4, // 4 vCPUs
        maximum: 16,
        utilization: this.getAverageUtilization('cpuUsage'),
        unit: 'vCPU'
      },
      memory: {
        current: 8, // 8 GB
        maximum: 64,
        utilization: this.getAverageUtilization('memoryUsage'),
        unit: 'GB'
      },
      storage: {
        current: 100, // 100 GB
        maximum: 1000,
        utilization: 60, // Simulated
        unit: 'GB'
      },
      network: {
        current: 1000, // 1 Gbps
        maximum: 10000,
        utilization: this.getAverageUtilization('networkLatency'),
        unit: 'Mbps'
      },
      instances: 3
    };
  }

  private getCurrentCapacitySync(): ResourceCapacity {
    return {
      cpu: {
        current: 4,
        maximum: 16,
        utilization: this.getAverageUtilization('cpuUsage'),
        unit: 'vCPU'
      },
      memory: {
        current: 8,
        maximum: 64,
        utilization: this.getAverageUtilization('memoryUsage'),
        unit: 'GB'
      },
      storage: {
        current: 100,
        maximum: 1000,
        utilization: 60,
        unit: 'GB'
      },
      network: {
        current: 1000,
        maximum: 10000,
        utilization: this.getAverageUtilization('networkLatency'),
        unit: 'Mbps'
      },
      instances: 3
    };
  }

  private projectCapacity(
    current: ResourceCapacity,
    growthRate: number,
    timeframe: string
  ): ResourceCapacity {
    const multiplier = 1 + growthRate;
    
    return {
      cpu: {
        ...current.cpu,
        current: Math.ceil(current.cpu.current * multiplier),
        utilization: Math.min(100, current.cpu.utilization * multiplier)
      },
      memory: {
        ...current.memory,
        current: Math.ceil(current.memory.current * multiplier),
        utilization: Math.min(100, current.memory.utilization * multiplier)
      },
      storage: {
        ...current.storage,
        current: Math.ceil(current.storage.current * multiplier),
        utilization: Math.min(100, current.storage.utilization * multiplier)
      },
      network: {
        ...current.network,
        current: Math.ceil(current.network.current * multiplier),
        utilization: Math.min(100, current.network.utilization * multiplier)
      },
      instances: Math.ceil(current.instances * multiplier)
    };
  }

  private generateRecommendations(
    current: ResourceCapacity,
    projected: ResourceCapacity
  ): CapacityRecommendation[] {
    const recommendations: CapacityRecommendation[] = [];

    // CPU recommendations
    if (projected.cpu.utilization > 80) {
      recommendations.push({
        resource: 'cpu',
        action: 'increase',
        currentValue: current.cpu.current,
        recommendedValue: Math.ceil(projected.cpu.current * 1.25),
        reasoning: 'Projected CPU utilization exceeds 80%',
        timeline: 'Next 30 days',
        cost: this.calculateCost('cpu', Math.ceil(projected.cpu.current * 0.25))
      });
    }

    // Memory recommendations
    if (projected.memory.utilization > 85) {
      recommendations.push({
        resource: 'memory',
        action: 'increase',
        currentValue: current.memory.current,
        recommendedValue: Math.ceil(projected.memory.current * 1.2),
        reasoning: 'Projected memory utilization exceeds 85%',
        timeline: 'Next 30 days',
        cost: this.calculateCost('memory', Math.ceil(projected.memory.current * 0.2))
      });
    }

    // Storage recommendations
    if (projected.storage.utilization > 90) {
      recommendations.push({
        resource: 'storage',
        action: 'increase',
        currentValue: current.storage.current,
        recommendedValue: Math.ceil(projected.storage.current * 1.5),
        reasoning: 'Projected storage utilization exceeds 90%',
        timeline: 'Next 60 days',
        cost: this.calculateCost('storage', Math.ceil(projected.storage.current * 0.5))
      });
    }

    // Instance scaling recommendations
    const avgUtilization = (projected.cpu.utilization + projected.memory.utilization) / 2;
    if (avgUtilization > 75) {
      recommendations.push({
        resource: 'instances',
        action: 'increase',
        currentValue: current.instances,
        recommendedValue: current.instances + 1,
        reasoning: 'Average resource utilization projected to exceed 75%',
        timeline: 'Next 30 days',
        cost: this.calculateCost('instances', 1)
      });
    }

    return recommendations;
  }

  private analyzeCosts(
    current: ResourceCapacity,
    projected: ResourceCapacity,
    recommendations: CapacityRecommendation[]
  ): CostAnalysis {
    const currentMonthlyCost = this.calculateTotalCost(current);
    const projectedMonthlyCost = this.calculateTotalCost(projected);
    
    // Calculate optimized cost based on recommendations
    let optimizedCapacity = { ...projected };
    for (const rec of recommendations) {
      if (rec.action === 'increase') {
        switch (rec.resource) {
          case 'cpu':
            optimizedCapacity.cpu.current = rec.recommendedValue;
            break;
          case 'memory':
            optimizedCapacity.memory.current = rec.recommendedValue;
            break;
          case 'storage':
            optimizedCapacity.storage.current = rec.recommendedValue;
            break;
          case 'instances':
            optimizedCapacity.instances = rec.recommendedValue;
            break;
        }
      }
    }
    
    const optimizedMonthlyCost = this.calculateTotalCost(optimizedCapacity);
    const potentialSavings = Math.max(0, projectedMonthlyCost - optimizedMonthlyCost);

    return {
      currentMonthlyCost,
      projectedMonthlyCost,
      optimizedMonthlyCost,
      potentialSavings,
      costBreakdown: [
        {
          category: 'Compute (CPU)',
          current: this.calculateCost('cpu', current.cpu.current),
          projected: this.calculateCost('cpu', projected.cpu.current),
          optimized: this.calculateCost('cpu', optimizedCapacity.cpu.current)
        },
        {
          category: 'Memory',
          current: this.calculateCost('memory', current.memory.current),
          projected: this.calculateCost('memory', projected.memory.current),
          optimized: this.calculateCost('memory', optimizedCapacity.memory.current)
        },
        {
          category: 'Storage',
          current: this.calculateCost('storage', current.storage.current),
          projected: this.calculateCost('storage', projected.storage.current),
          optimized: this.calculateCost('storage', optimizedCapacity.storage.current)
        },
        {
          category: 'Network',
          current: this.calculateCost('network', current.network.current),
          projected: this.calculateCost('network', projected.network.current),
          optimized: this.calculateCost('network', optimizedCapacity.network.current)
        }
      ]
    };
  }

  private getAverageUtilization(metric: keyof PerformanceMetrics): number {
    if (this.historicalMetrics.length === 0) return 50; // Default

    const values = this.historicalMetrics.map(m => m[metric] as number);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private analyzeTrend(metric: keyof PerformanceMetrics): TrendData {
    const values = this.historicalMetrics.map(m => m[metric] as number);
    
    if (values.length < 2) {
      return {
        averageUtilization: values[0] || 0,
        trend: 'stable',
        changeRate: 0,
        volatility: 0
      };
    }

    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate trend using linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / n;
    const volatility = Math.sqrt(variance);

    return {
      averageUtilization: average,
      trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      changeRate: slope,
      volatility
    };
  }

  private calculateRequiredCapacity(
    current: ResourceCapacity,
    trends: UtilizationTrends,
    targets: TargetMetrics
  ): ResourceCapacity {
    // Calculate required capacity to meet target metrics
    const cpuMultiplier = targets.maxCpuUtilization / Math.max(trends.cpu.averageUtilization, 1);
    const memoryMultiplier = targets.maxMemoryUtilization / Math.max(trends.memory.averageUtilization, 1);
    
    return {
      cpu: {
        ...current.cpu,
        current: Math.ceil(current.cpu.current / cpuMultiplier)
      },
      memory: {
        ...current.memory,
        current: Math.ceil(current.memory.current / memoryMultiplier)
      },
      storage: current.storage, // Storage requirements are more predictable
      network: current.network, // Network capacity is usually sufficient
      instances: Math.ceil(current.instances * Math.max(cpuMultiplier, memoryMultiplier))
    };
  }

  private calculateConfidenceLevel(): number {
    // Confidence based on amount of historical data
    const dataPoints = this.historicalMetrics.length;
    if (dataPoints < 100) return 0.6;
    if (dataPoints < 500) return 0.75;
    if (dataPoints < 1000) return 0.85;
    return 0.95;
  }

  private getAssumptions(trends: UtilizationTrends): string[] {
    return [
      'Current usage patterns will continue',
      'No major architectural changes',
      'Growth rate remains consistent',
      `CPU trend: ${trends.cpu.trend}`,
      `Memory trend: ${trends.memory.trend}`
    ];
  }

  private identifyRisks(trends: UtilizationTrends, targets: TargetMetrics): string[] {
    const risks: string[] = [];
    
    if (trends.cpu.volatility > 20) {
      risks.push('High CPU usage volatility may cause unpredictable scaling needs');
    }
    
    if (trends.memory.volatility > 15) {
      risks.push('High memory usage volatility may lead to out-of-memory errors');
    }
    
    if (trends.cpu.trend === 'increasing' && trends.cpu.changeRate > 1) {
      risks.push('Rapidly increasing CPU usage may require immediate scaling');
    }
    
    return risks;
  }

  private calculateTotalCost(capacity: ResourceCapacity): number {
    return (
      this.calculateCost('cpu', capacity.cpu.current) +
      this.calculateCost('memory', capacity.memory.current) +
      this.calculateCost('storage', capacity.storage.current) +
      this.calculateCost('network', capacity.network.current) +
      this.calculateCost('instances', capacity.instances)
    );
  }

  private calculateCost(resource: string, amount: number): number {
    const pricing = this.resourcePricing[resource];
    return pricing ? pricing * amount : 0;
  }

  private calculateSavings(resource: string, amount: number): number {
    return this.calculateCost(resource, amount);
  }

  private createImplementationPlan(optimizations: ResourceOptimization[]): ImplementationStep[] {
    return optimizations.map((opt, index) => ({
      step: index + 1,
      description: `${opt.resource === 'instances' ? 'Scale' : 'Resize'} ${opt.resource} from ${opt.currentAllocation} to ${opt.recommendedAllocation}`,
      estimatedDuration: opt.resource === 'instances' ? '15 minutes' : '30 minutes',
      riskLevel: opt.riskLevel,
      rollbackPlan: `Revert ${opt.resource} to ${opt.currentAllocation}`
    }));
  }

  private createMonitoringPlan(optimizations: ResourceOptimization[]): MonitoringStep[] {
    return optimizations.map(opt => ({
      metric: opt.resource === 'cpu' ? 'cpuUsage' : opt.resource === 'memory' ? 'memoryUsage' : 'instanceCount',
      threshold: opt.resource === 'cpu' ? 80 : opt.resource === 'memory' ? 85 : opt.recommendedAllocation * 0.9,
      duration: '24 hours',
      action: 'Alert if threshold exceeded for more than 10 minutes'
    }));
  }

  private getDefaultPricing(): ResourcePricing {
    return {
      cpu: 50, // $50 per vCPU per month
      memory: 25, // $25 per GB per month
      storage: 0.5, // $0.50 per GB per month
      network: 0.1, // $0.10 per Mbps per month
      instances: 100 // $100 per instance per month (base cost)
    };
  }
}

// Additional interfaces
interface ResourcePricing {
  [resource: string]: number;
}

interface UtilizationTrends {
  cpu: TrendData;
  memory: TrendData;
  network: TrendData;
  throughput: TrendData;
  responseTime: TrendData;
}

interface TrendData {
  averageUtilization: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  volatility: number;
}

interface TargetMetrics {
  maxCpuUtilization: number;
  maxMemoryUtilization: number;
  maxResponseTime: number;
  minThroughput: number;
}

interface ResourceForecast {
  timeframe: string;
  targetMetrics: TargetMetrics;
  requiredCapacity: ResourceCapacity;
  confidenceLevel: number;
  assumptions: string[];
  risks: string[];
}

interface OptimizationConstraints {
  maxCostIncrease: number;
  minPerformanceLevel: number;
  allowDownscaling: boolean;
}

interface ResourceOptimization {
  resource: string;
  currentAllocation: number;
  recommendedAllocation: number;
  expectedSavings: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

interface OptimizationResult {
  optimizations: ResourceOptimization[];
  totalSavings: number;
  implementationPlan: ImplementationStep[];
  monitoringPlan: MonitoringStep[];
}

interface ImplementationStep {
  step: number;
  description: string;
  estimatedDuration: string;
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan: string;
}

interface MonitoringStep {
  metric: string;
  threshold: number;
  duration: string;
  action: string;
}