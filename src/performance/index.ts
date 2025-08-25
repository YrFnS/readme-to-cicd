/**
 * Performance optimization and scalability testing system
 * Main entry point for all performance-related functionality
 */

export { LoadTester } from './benchmarking/load-tester.js';
export { ScalabilityTester } from './scalability/scalability-tester.js';
export { PerformanceMonitor } from './monitoring/performance-monitor.js';
export { CapacityPlanner } from './capacity/capacity-planner.js';
export { AutoTuner } from './optimization/auto-tuner.js';

export * from './types/performance-types.js';

import { LoadTester } from './benchmarking/load-tester.js';
import { ScalabilityTester } from './scalability/scalability-tester.js';
import { PerformanceMonitor } from './monitoring/performance-monitor.js';
import { CapacityPlanner } from './capacity/capacity-planner.js';
import { AutoTuner } from './optimization/auto-tuner.js';
import {
  LoadTestConfig,
  ScalabilityTestConfig,
  AutoTuningConfig,
  AlertRule,
  PerformanceReport
} from './types/performance-types.js';

/**
 * Comprehensive performance optimization and scalability testing system
 */
export class PerformanceSystem {
  private loadTester: LoadTester;
  private scalabilityTester: ScalabilityTester;
  private performanceMonitor: PerformanceMonitor;
  private capacityPlanner: CapacityPlanner;
  private autoTuner?: AutoTuner;

  constructor() {
    this.loadTester = new LoadTester();
    this.scalabilityTester = new ScalabilityTester();
    this.performanceMonitor = new PerformanceMonitor();
    this.capacityPlanner = new CapacityPlanner();
  }

  /**
   * Initialize the performance system with monitoring and auto-tuning
   */
  async initialize(config?: PerformanceSystemConfig): Promise<void> {
    // Start performance monitoring
    this.performanceMonitor.startMonitoring();

    // Set up default alert rules
    if (config?.enableDefaultAlerts !== false) {
      this.setupDefaultAlerts();
    }

    // Initialize auto-tuning if enabled
    if (config?.autoTuning) {
      this.autoTuner = new AutoTuner(config.autoTuning);
      this.autoTuner.start();
    }

    console.log('Performance system initialized');
  }

  /**
   * Shutdown the performance system
   */
  async shutdown(): Promise<void> {
    this.performanceMonitor.stopMonitoring();
    
    if (this.autoTuner) {
      this.autoTuner.stop();
    }

    console.log('Performance system shutdown');
  }

  /**
   * Execute a comprehensive performance test
   */
  async runPerformanceTest(config: LoadTestConfig): Promise<PerformanceTestResult> {
    console.log('Starting comprehensive performance test...');

    // Run load test
    const loadTestResult = await this.loadTester.executeLoadTest(config);

    // Run scalability test
    const scalabilityResult = await this.scalabilityTester.executeScalabilityTest({
      name: `Scalability Test - ${config.targetUrl}`,
      baselineUsers: 1,
      maxUsers: config.maxUsers * 2,
      userIncrement: Math.max(1, Math.floor(config.maxUsers / 10)),
      testDuration: 180,
      acceptableResponseTime: 2000,
      acceptableErrorRate: 0.05
    });

    // Generate capacity plan
    const capacityPlan = await this.capacityPlanner.generateCapacityPlan('3 months', 0.3);

    // Generate performance report
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const performanceReport = this.performanceMonitor.generateReport(startTime, endTime);

    return {
      loadTest: loadTestResult,
      scalabilityTest: scalabilityResult,
      capacityPlan,
      performanceReport,
      recommendations: this.generateComprehensiveRecommendations(
        loadTestResult,
        scalabilityResult,
        capacityPlan
      )
    };
  }

  /**
   * Run stress test to find breaking points
   */
  async runStressTest(baseConfig: LoadTestConfig): Promise<any> {
    return this.scalabilityTester.executeStressTest(baseConfig, baseConfig.maxUsers * 5);
  }

  /**
   * Get real-time performance dashboard data
   */
  getPerformanceDashboard(): PerformanceDashboard {
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    const alertRules = this.performanceMonitor.getAlertRules();
    const activeTests = [
      ...this.loadTester.getActiveTests(),
      ...this.scalabilityTester.getActiveTests()
    ];

    return {
      currentMetrics,
      alertRules,
      activeTests,
      systemStatus: this.calculateSystemStatus(currentMetrics),
      lastUpdated: new Date()
    };
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.performanceMonitor.addAlertRule(rule);
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(): any[] {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour
    const metrics = this.performanceMonitor.getMetrics(startTime, endTime);

    if (this.autoTuner) {
      return this.autoTuner.generateRecommendations(metrics);
    }

    return [];
  }

  /**
   * Execute manual optimization action
   */
  async executeOptimization(actionType: string, parameters: any): Promise<any> {
    if (!this.autoTuner) {
      throw new Error('Auto-tuner not initialized');
    }

    const action = {
      type: actionType as any,
      parameters,
      maxAdjustment: 1
    };

    return this.autoTuner.executeAction(action, 'Manual optimization');
  }

  private setupDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      {
        id: 'high-response-time',
        name: 'High Response Time',
        metric: 'responseTime',
        threshold: 2000,
        operator: '>',
        duration: 300,
        severity: 'warning',
        enabled: true,
        notifications: [
          {
            type: 'email',
            target: 'admin@example.com'
          }
        ]
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'errorRate',
        threshold: 0.05,
        operator: '>',
        duration: 180,
        severity: 'error',
        enabled: true,
        notifications: [
          {
            type: 'email',
            target: 'admin@example.com'
          }
        ]
      },
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        metric: 'cpuUsage',
        threshold: 85,
        operator: '>',
        duration: 600,
        severity: 'warning',
        enabled: true,
        notifications: [
          {
            type: 'email',
            target: 'admin@example.com'
          }
        ]
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        metric: 'memoryUsage',
        threshold: 90,
        operator: '>',
        duration: 300,
        severity: 'error',
        enabled: true,
        notifications: [
          {
            type: 'email',
            target: 'admin@example.com'
          }
        ]
      }
    ];

    defaultAlerts.forEach(alert => this.performanceMonitor.addAlertRule(alert));
  }

  private generateComprehensiveRecommendations(
    loadTest: any,
    scalabilityTest: any,
    capacityPlan: any
  ): any[] {
    const recommendations = [];

    // Add load test recommendations
    if (loadTest.averageResponseTime > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Optimize Response Time',
        description: `Average response time of ${loadTest.averageResponseTime}ms exceeds recommended threshold`,
        expectedImpact: 'Improve user experience and system efficiency'
      });
    }

    // Add scalability recommendations
    if (scalabilityTest.recommendations) {
      recommendations.push(...scalabilityTest.recommendations);
    }

    // Add capacity planning recommendations
    if (capacityPlan.recommendations) {
      recommendations.push(...capacityPlan.recommendations);
    }

    return recommendations;
  }

  private calculateSystemStatus(metrics: any): 'healthy' | 'warning' | 'critical' {
    if (!metrics) return 'warning';

    const issues = [];
    
    if (metrics.responseTime > 2000) issues.push('high-response-time');
    if (metrics.errorRate > 0.05) issues.push('high-error-rate');
    if (metrics.cpuUsage > 85) issues.push('high-cpu');
    if (metrics.memoryUsage > 90) issues.push('high-memory');

    if (issues.length === 0) return 'healthy';
    if (issues.some(issue => issue.includes('error') || issue.includes('memory'))) return 'critical';
    return 'warning';
  }
}

// Configuration interfaces
export interface PerformanceSystemConfig {
  enableDefaultAlerts?: boolean;
  autoTuning?: AutoTuningConfig;
  monitoring?: {
    metricsRetentionDays?: number;
    collectionIntervalMs?: number;
  };
}

export interface PerformanceTestResult {
  loadTest: any;
  scalabilityTest: any;
  capacityPlan: any;
  performanceReport: PerformanceReport;
  recommendations: any[];
}

export interface PerformanceDashboard {
  currentMetrics: any;
  alertRules: AlertRule[];
  activeTests: string[];
  systemStatus: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
}