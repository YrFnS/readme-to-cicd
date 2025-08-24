/**
 * Performance optimization and scalability testing interfaces
 */

import {
  PerformanceMetrics,
  LoadTestConfig,
  LoadTestResult,
  ScalabilityTestConfig,
  ScalabilityTestResult,
  CapacityPlan,
  OptimizationRecommendation,
  PerformanceAlert,
  PerformanceDashboard
} from './types';

export interface IPerformanceBenchmark {
  /**
   * Execute load testing with specified configuration
   */
  executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult>;

  /**
   * Run scalability validation tests
   */
  executeScalabilityTest(config: ScalabilityTestConfig): Promise<ScalabilityTestResult>;

  /**
   * Generate performance benchmark report
   */
  generateBenchmarkReport(testIds: string[]): Promise<string>;

  /**
   * Compare performance between different test runs
   */
  comparePerformance(baselineId: string, currentId: string): Promise<any>;
}

export interface ICapacityPlanner {
  /**
   * Analyze current resource usage and capacity
   */
  analyzeCurrentCapacity(component: string): Promise<CapacityPlan>;

  /**
   * Generate demand forecasts based on historical data
   */
  forecastDemand(component: string, timeframe: string): Promise<CapacityPlan>;

  /**
   * Provide capacity optimization recommendations
   */
  generateCapacityRecommendations(component: string): Promise<OptimizationRecommendation[]>;

  /**
   * Calculate cost implications of capacity changes
   */
  analyzeCostImpact(recommendations: OptimizationRecommendation[]): Promise<any>;
}

export interface IPerformanceMonitor {
  /**
   * Start real-time performance monitoring
   */
  startMonitoring(components: string[]): Promise<void>;

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): Promise<void>;

  /**
   * Collect performance metrics
   */
  collectMetrics(component: string): Promise<PerformanceMetrics>;

  /**
   * Set up performance alerts
   */
  configureAlerts(component: string, thresholds: any): Promise<void>;

  /**
   * Get current performance status
   */
  getPerformanceStatus(): Promise<PerformanceAlert[]>;
}

export interface IOptimizationEngine {
  /**
   * Analyze system performance and generate recommendations
   */
  analyzePerformance(component: string): Promise<OptimizationRecommendation[]>;

  /**
   * Apply automated optimizations
   */
  applyOptimizations(recommendations: OptimizationRecommendation[]): Promise<void>;

  /**
   * Validate optimization effectiveness
   */
  validateOptimizations(optimizationIds: string[]): Promise<any>;

  /**
   * Rollback optimizations if needed
   */
  rollbackOptimizations(optimizationIds: string[]): Promise<void>;
}

export interface IScalabilityTester {
  /**
   * Execute stress testing to find breaking points
   */
  executeStressTest(component: string, config: any): Promise<ScalabilityTestResult>;

  /**
   * Perform breaking point analysis
   */
  analyzeBreakingPoint(component: string): Promise<any>;

  /**
   * Test horizontal scaling capabilities
   */
  testHorizontalScaling(component: string, config: any): Promise<ScalabilityTestResult>;

  /**
   * Test vertical scaling capabilities
   */
  testVerticalScaling(component: string, config: any): Promise<ScalabilityTestResult>;
}

export interface IPerformanceDashboard {
  /**
   * Create performance dashboard
   */
  createDashboard(config: any): Promise<PerformanceDashboard>;

  /**
   * Update dashboard configuration
   */
  updateDashboard(dashboardId: string, config: any): Promise<void>;

  /**
   * Get dashboard data
   */
  getDashboardData(dashboardId: string): Promise<any>;

  /**
   * Export dashboard configuration
   */
  exportDashboard(dashboardId: string): Promise<string>;
}

export interface IPerformanceReporter {
  /**
   * Generate performance reports
   */
  generateReport(type: string, config: any): Promise<string>;

  /**
   * Schedule automated reports
   */
  scheduleReport(config: any): Promise<void>;

  /**
   * Export performance data
   */
  exportData(format: string, filters: any): Promise<string>;

  /**
   * Create performance trends analysis
   */
  analyzeTrends(component: string, timeframe: string): Promise<any>;
}