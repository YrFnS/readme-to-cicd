/**
 * Cost Analyzer Tests
 * Tests for cost analysis and optimization functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CostAnalyzer, 
  CostAnalyzerConfig, 
  CostOptimizer, 
  CostStorage,
  ResourceUsageData 
} from '../../../src/analytics/cost-analyzer';
import { OptimizationRecommendation, CostTrendMetrics } from '../../../src/analytics/types';

describe('CostAnalyzer', () => {
  let costAnalyzer: CostAnalyzer;
  let mockOptimizer: CostOptimizer;
  let mockStorage: CostStorage;
  let config: CostAnalyzerConfig;

  beforeEach(() => {
    mockOptimizer = {
      analyzeResourceUsage: vi.fn().mockResolvedValue([
        {
          id: 'rec_1',
          type: 'cost',
          priority: 'high',
          description: 'Reduce compute instances',
          potentialSavings: 500,
          implementationEffort: 'medium',
          impact: 'Significant cost reduction'
        }
      ]),
      calculatePotentialSavings: vi.fn().mockResolvedValue(1000),
      implementRecommendation: vi.fn().mockResolvedValue(undefined)
    };

    mockStorage = {
      storeCostData: vi.fn().mockResolvedValue(undefined),
      getCostData: vi.fn().mockResolvedValue([]),
      getCostTrends: vi.fn().mockResolvedValue({
        daily: [100, 110, 105, 120],
        weekly: [700, 750, 800],
        monthly: [3000, 3200],
        yearly: [36000]
      })
    };

    config = {
      enableRealTimeTracking: true,
      enableOptimizationRecommendations: true,
      costThresholds: {
        warning: 1000,
        critical: 2000,
        budget: 5000
      },
      analysisInterval: 60000,
      retentionDays: 90
    };

    costAnalyzer = new CostAnalyzer(config, mockOptimizer, mockStorage);
  });

  afterEach(async () => {
    await costAnalyzer.stop();
  });

  describe('Resource Usage Tracking', () => {
    it('should track resource usage and cost', async () => {
      await costAnalyzer.trackResourceUsage(
        'compute',
        'instance-1',
        100,
        50.25,
        { region: 'us-east-1', instanceType: 't3.medium' }
      );

      expect(mockStorage.storeCostData).toHaveBeenCalledWith([
        expect.objectContaining({
          resourceType: 'compute',
          resourceId: 'instance-1',
          usage: 100,
          cost: 50.25,
          metadata: { region: 'us-east-1', instanceType: 't3.medium' },
          timestamp: expect.any(Date)
        })
      ]);
    });

    it('should emit resource usage tracked event', async () => {
      const trackingSpy = vi.fn();
      costAnalyzer.on('resourceUsageTracked', trackingSpy);

      await costAnalyzer.trackResourceUsage('storage', 'bucket-1', 1000, 25.50);

      expect(trackingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'storage',
          resourceId: 'bucket-1',
          usage: 1000,
          cost: 25.50
        })
      );
    });

    it('should check cost thresholds', async () => {
      const thresholdSpy = vi.fn();
      costAnalyzer.on('costThresholdExceeded', thresholdSpy);

      await costAnalyzer.trackResourceUsage('compute', 'instance-1', 100, 1500);

      expect(thresholdSpy).toHaveBeenCalledWith({
        level: 'warning',
        resourceType: 'compute',
        cost: 1500,
        threshold: 1000
      });
    });

    it('should emit budget exceeded event', async () => {
      const budgetSpy = vi.fn();
      costAnalyzer.on('budgetExceeded', budgetSpy);

      await costAnalyzer.trackResourceUsage('compute', 'instance-1', 100, 6000);

      expect(budgetSpy).toHaveBeenCalledWith({
        resourceType: 'compute',
        cost: 6000,
        budget: 5000
      });
    });
  });

  describe('Cost Analytics', () => {
    it('should get comprehensive cost analytics', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockCostData: ResourceUsageData[] = [
        {
          timestamp: new Date('2024-01-15'),
          resourceType: 'compute',
          resourceId: 'instance-1',
          usage: 100,
          cost: 50
        },
        {
          timestamp: new Date('2024-01-16'),
          resourceType: 'storage',
          resourceId: 'bucket-1',
          usage: 1000,
          cost: 25
        }
      ];

      (mockStorage.getCostData as any).mockResolvedValue(mockCostData);

      const analytics = await costAnalyzer.getCostAnalytics(timeRange);

      expect(analytics).toHaveProperty('resourceCosts');
      expect(analytics).toHaveProperty('operationalCosts');
      expect(analytics).toHaveProperty('optimizationRecommendations');
      expect(analytics).toHaveProperty('costTrends');
      expect(analytics.optimizationRecommendations).toHaveLength(1);
    });

    it('should calculate cost breakdown by resource type', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockCostData: ResourceUsageData[] = [
        {
          timestamp: new Date('2024-01-15'),
          resourceType: 'compute',
          resourceId: 'instance-1',
          usage: 100,
          cost: 100
        },
        {
          timestamp: new Date('2024-01-16'),
          resourceType: 'compute',
          resourceId: 'instance-2',
          usage: 150,
          cost: 150
        },
        {
          timestamp: new Date('2024-01-17'),
          resourceType: 'storage',
          resourceId: 'bucket-1',
          usage: 1000,
          cost: 50
        }
      ];

      (mockStorage.getCostData as any).mockResolvedValue(mockCostData);

      const breakdown = await costAnalyzer.getCostBreakdown(timeRange);

      expect(breakdown).toHaveProperty('compute');
      expect(breakdown).toHaveProperty('storage');
      expect(breakdown.compute.current).toBe(150);
      expect(breakdown.storage.current).toBe(50);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should generate optimization recommendations', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockCostData: ResourceUsageData[] = [
        {
          timestamp: new Date('2024-01-15'),
          resourceType: 'compute',
          resourceId: 'instance-1',
          usage: 10, // Low usage
          cost: 100
        }
      ];

      (mockStorage.getCostData as any).mockResolvedValue(mockCostData);

      const recommendations = await costAnalyzer.generateOptimizationRecommendations(timeRange);

      expect(mockOptimizer.analyzeResourceUsage).toHaveBeenCalledWith(mockCostData);
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toMatchObject({
        id: 'rec_1',
        type: 'cost',
        priority: 'high',
        potentialSavings: 500
      });
    });

    it('should emit optimization recommendations generated event', async () => {
      const recommendationsSpy = vi.fn();
      costAnalyzer.on('optimizationRecommendationsGenerated', recommendationsSpy);

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      await costAnalyzer.generateOptimizationRecommendations(timeRange);

      expect(recommendationsSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'rec_1' })
        ])
      );
    });

    it('should calculate potential savings', async () => {
      const recommendations: OptimizationRecommendation[] = [
        {
          id: 'rec_1',
          type: 'cost',
          priority: 'high',
          description: 'Test recommendation',
          potentialSavings: 500,
          implementationEffort: 'low',
          impact: 'High impact'
        }
      ];

      const savings = await costAnalyzer.calculatePotentialSavings(recommendations);

      expect(mockOptimizer.calculatePotentialSavings).toHaveBeenCalledWith(recommendations);
      expect(savings).toBe(1000);
    });
  });

  describe('Cost Reporting', () => {
    it('should generate cost report', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockCostData: ResourceUsageData[] = [
        {
          timestamp: new Date('2024-01-15'),
          resourceType: 'compute',
          resourceId: 'instance-1',
          usage: 100,
          cost: 200
        }
      ];

      (mockStorage.getCostData as any).mockResolvedValue(mockCostData);

      const report = await costAnalyzer.generateCostReport(timeRange, true);

      expect(report).toMatchObject({
        id: expect.stringMatching(/^cost_report_\d+_[a-z0-9]+$/),
        timeRange,
        totalCost: expect.any(Number),
        resourceBreakdown: expect.any(Object),
        trends: expect.any(Object),
        budgetVariance: expect.any(Number),
        optimizationRecommendations: expect.any(Array),
        potentialSavings: expect.any(Number),
        generatedAt: expect.any(Date)
      });
    });

    it('should emit cost report generated event', async () => {
      const reportSpy = vi.fn();
      costAnalyzer.on('costReportGenerated', reportSpy);

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      await costAnalyzer.generateCostReport(timeRange);

      expect(reportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^cost_report_\d+_[a-z0-9]+$/)
        })
      );
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect cost anomalies', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockCostData: ResourceUsageData[] = [
        // Normal costs with more variation to create proper standard deviation
        { timestamp: new Date('2024-01-01'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 50 },
        { timestamp: new Date('2024-01-02'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 45 },
        { timestamp: new Date('2024-01-03'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 55 },
        { timestamp: new Date('2024-01-04'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 48 },
        { timestamp: new Date('2024-01-05'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 52 },
        // Anomalous cost - much higher than normal
        { timestamp: new Date('2024-01-06'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 150 }
      ];

      (mockStorage.getCostData as any).mockResolvedValue(mockCostData);

      const anomalies = await costAnalyzer.detectCostAnomalies(timeRange, 2.0);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]).toMatchObject({
        id: expect.stringMatching(/^anomaly_\d+_[a-z0-9]+$/),
        resourceType: 'compute',
        resourceId: 'instance-1',
        actualCost: 150,
        severity: expect.any(String)
      });
    });

    it('should emit cost anomalies detected event', async () => {
      const anomaliesSpy = vi.fn();
      costAnalyzer.on('costAnomaliesDetected', anomaliesSpy);

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      // Use the same data as the previous test to ensure anomaly detection
      const mockCostData: ResourceUsageData[] = [
        // Normal costs with more variation to create proper standard deviation
        { timestamp: new Date('2024-01-01'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 50 },
        { timestamp: new Date('2024-01-02'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 45 },
        { timestamp: new Date('2024-01-03'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 55 },
        { timestamp: new Date('2024-01-04'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 48 },
        { timestamp: new Date('2024-01-05'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 52 },
        // Anomalous cost - much higher than normal
        { timestamp: new Date('2024-01-06'), resourceType: 'compute', resourceId: 'instance-1', usage: 100, cost: 150 }
      ];

      (mockStorage.getCostData as any).mockResolvedValue(mockCostData);

      await costAnalyzer.detectCostAnomalies(timeRange);

      expect(anomaliesSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            resourceType: 'compute',
            resourceId: 'instance-1'
          })
        ])
      );
    });
  });

  describe('Budget Management', () => {
    it('should set cost budget and alerts', async () => {
      const budgetSpy = vi.fn();
      costAnalyzer.on('budgetSet', budgetSpy);

      await costAnalyzer.setCostBudget('compute', 10000, { warning: 8000, critical: 9500 });

      expect(budgetSpy).toHaveBeenCalledWith({
        resourceType: 'compute',
        budget: 10000,
        alertThresholds: { warning: 8000, critical: 9500 }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const error = new Error('Storage error');
      (mockStorage.storeCostData as any).mockRejectedValue(error);

      // Should not throw, but should handle gracefully
      await expect(
        costAnalyzer.trackResourceUsage('compute', 'instance-1', 100, 50)
      ).rejects.toThrow('Storage error');
    });

    it('should handle analysis errors', async () => {
      const error = new Error('Analysis error');
      (mockOptimizer.analyzeResourceUsage as any).mockRejectedValue(error);

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      await expect(
        costAnalyzer.generateOptimizationRecommendations(timeRange)
      ).rejects.toThrow('Analysis error');
    });
  });

  describe('Lifecycle', () => {
    it('should stop gracefully', async () => {
      const stoppedSpy = vi.fn();
      costAnalyzer.on('stopped', stoppedSpy);

      await costAnalyzer.stop();

      expect(stoppedSpy).toHaveBeenCalled();
    });
  });
});