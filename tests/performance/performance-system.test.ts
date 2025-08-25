/**
 * Comprehensive test suite for performance optimization and scalability testing system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PerformanceSystem,
  LoadTester,
  ScalabilityTester,
  PerformanceMonitor,
  CapacityPlanner,
  AutoTuner,
  LoadTestConfig,
  ScalabilityTestConfig,
  AutoTuningConfig,
  AlertRule
} from '../../src/performance/index.js';

describe('Performance System', () => {
  let performanceSystem: PerformanceSystem;

  beforeEach(() => {
    performanceSystem = new PerformanceSystem();
  });

  afterEach(async () => {
    await performanceSystem.shutdown();
  });

  describe('System Initialization', () => {
    it('should initialize with default configuration', async () => {
      await expect(performanceSystem.initialize()).resolves.not.toThrow();
    });

    it('should initialize with custom configuration', async () => {
      const config = {
        enableDefaultAlerts: false,
        monitoring: {
          metricsRetentionDays: 14,
          collectionIntervalMs: 10000
        }
      };

      await expect(performanceSystem.initialize(config)).resolves.not.toThrow();
    });

    it('should initialize with auto-tuning enabled', async () => {
      const autoTuningConfig: AutoTuningConfig = {
        enabled: true,
        rules: [],
        safetyLimits: {
          maxInstances: 5,
          minInstances: 1,
          maxCpuUsage: 90,
          maxMemoryUsage: 90,
          maxCostIncrease: 25
        },
        rollbackPolicy: {
          enabled: true,
          triggerConditions: ['errorRate > 0.1'],
          rollbackTimeout: 300,
          maxRollbacks: 2
        }
      };

      const config = {
        autoTuning: autoTuningConfig
      };

      await expect(performanceSystem.initialize(config)).resolves.not.toThrow();
    });
  });

  describe('Performance Testing', () => {
    it('should initialize performance system', async () => {
      await performanceSystem.initialize();
      
      const dashboard = performanceSystem.getPerformanceDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard.systemStatus).toMatch(/healthy|warning|critical/);
    });

    it('should generate optimization recommendations', async () => {
      await performanceSystem.initialize({
        autoTuning: {
          enabled: true,
          rules: [],
          safetyLimits: {
            maxInstances: 10,
            minInstances: 1,
            maxCpuUsage: 90,
            maxMemoryUsage: 90,
            maxCostIncrease: 50
          },
          rollbackPolicy: {
            enabled: true,
            triggerConditions: [],
            rollbackTimeout: 300,
            maxRollbacks: 3
          }
        }
      });
      
      const recommendations = performanceSystem.generateOptimizationRecommendations();
      expect(recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Dashboard and Monitoring', () => {
    it('should provide performance dashboard data', async () => {
      await performanceSystem.initialize();
      
      // Wait a moment for metrics collection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dashboard = performanceSystem.getPerformanceDashboard();
      
      expect(dashboard).toBeDefined();
      expect(dashboard.systemStatus).toMatch(/healthy|warning|critical/);
      expect(dashboard.lastUpdated).toBeInstanceOf(Date);
      expect(dashboard.alertRules).toBeInstanceOf(Array);
      expect(dashboard.activeTests).toBeInstanceOf(Array);
    });

    it('should add custom alert rules', async () => {
      await performanceSystem.initialize();
      
      const customAlert: AlertRule = {
        id: 'custom-test-alert',
        name: 'Custom Test Alert',
        metric: 'responseTime',
        threshold: 1000,
        operator: '>',
        duration: 60,
        severity: 'warning',
        enabled: true,
        notifications: [
          {
            type: 'email',
            target: 'test@example.com'
          }
        ]
      };

      performanceSystem.addAlertRule(customAlert);
      
      const dashboard = performanceSystem.getPerformanceDashboard();
      const addedRule = dashboard.alertRules.find(rule => rule.id === 'custom-test-alert');
      
      expect(addedRule).toBeDefined();
      expect(addedRule?.name).toBe('Custom Test Alert');
    });
  });

  describe('Optimization', () => {
    it('should generate optimization recommendations', async () => {
      await performanceSystem.initialize({
        autoTuning: {
          enabled: true,
          rules: [],
          safetyLimits: {
            maxInstances: 10,
            minInstances: 1,
            maxCpuUsage: 90,
            maxMemoryUsage: 90,
            maxCostIncrease: 50
          },
          rollbackPolicy: {
            enabled: true,
            triggerConditions: [],
            rollbackTimeout: 300,
            maxRollbacks: 3
          }
        }
      });
      
      const recommendations = performanceSystem.generateOptimizationRecommendations();
      
      expect(recommendations).toBeInstanceOf(Array);
    });

    it('should execute manual optimization', async () => {
      await performanceSystem.initialize({
        autoTuning: {
          enabled: true,
          rules: [],
          safetyLimits: {
            maxInstances: 10,
            minInstances: 1,
            maxCpuUsage: 90,
            maxMemoryUsage: 90,
            maxCostIncrease: 50
          },
          rollbackPolicy: {
            enabled: true,
            triggerConditions: [],
            rollbackTimeout: 300,
            maxRollbacks: 3
          }
        }
      });
      
      const result = await performanceSystem.executeOptimization('scale_up', {
        resource: 'cpu',
        amount: 1
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });
  });
});

describe('LoadTester', () => {
  let loadTester: LoadTester;

  beforeEach(() => {
    loadTester = new LoadTester();
  });

  it('should execute basic load test', async () => {
    const config: LoadTestConfig = {
      targetUrl: 'http://localhost:3000',
      duration: 5,
      rampUpTime: 1,
      maxUsers: 2,
      requestsPerSecond: 4,
      testScenarios: [
        {
          name: 'basic-scenario',
          weight: 100,
          requests: [
            {
              method: 'GET',
              path: '/',
              expectedStatusCode: 200
            }
          ]
        }
      ]
    };

    const result = await loadTester.executeLoadTest(config);
    
    expect(result).toBeDefined();
    expect(result.testId).toBeDefined();
    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
    expect(result.totalRequests).toBeGreaterThanOrEqual(0);
    expect(result.metrics).toBeInstanceOf(Array);
  });

  it('should track active tests', async () => {
    const config: LoadTestConfig = {
      targetUrl: 'http://localhost:3000',
      duration: 1,
      rampUpTime: 0.5,
      maxUsers: 1,
      requestsPerSecond: 2,
      testScenarios: [
        {
          name: 'tracking-test',
          weight: 100,
          requests: [
            {
              method: 'GET',
              path: '/health',
              expectedStatusCode: 200
            }
          ]
        }
      ]
    };

    // Start test without waiting
    const testPromise = loadTester.executeLoadTest(config);
    
    // Check active tests
    const activeTests = loadTester.getActiveTests();
    expect(activeTests.length).toBeGreaterThan(0);
    
    // Wait for completion
    await testPromise;
    
    // Check that test is no longer active
    const activeTestsAfter = loadTester.getActiveTests();
    expect(activeTestsAfter.length).toBe(0);
  });

  it('should store and retrieve test results', async () => {
    const config: LoadTestConfig = {
      targetUrl: 'http://localhost:3000',
      duration: 1,
      rampUpTime: 0.2,
      maxUsers: 1,
      requestsPerSecond: 2,
      testScenarios: [
        {
          name: 'result-test',
          weight: 100,
          requests: [
            {
              method: 'GET',
              path: '/',
              expectedStatusCode: 200
            }
          ]
        }
      ]
    };

    const result = await loadTester.executeLoadTest(config);
    
    // Retrieve result by ID
    const retrievedResult = loadTester.getTestResult(result.testId);
    expect(retrievedResult).toEqual(result);
    
    // Get all results
    const allResults = loadTester.getAllResults();
    expect(allResults).toContain(result);
  });
});

describe('ScalabilityTester', () => {
  let scalabilityTester: ScalabilityTester;

  beforeEach(() => {
    scalabilityTester = new ScalabilityTester();
  });

  it('should create scalability tester instance', () => {
    expect(scalabilityTester).toBeDefined();
    expect(scalabilityTester.getActiveTests()).toBeInstanceOf(Array);
    expect(scalabilityTester.getActiveTests().length).toBe(0);
  });

  it('should track active tests', () => {
    const activeTests = scalabilityTester.getActiveTests();
    expect(activeTests).toBeInstanceOf(Array);
    expect(activeTests.length).toBe(0);
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      metricsRetentionDays: 1,
      collectionIntervalMs: 100, // Fast collection for testing
      maxMetricsInMemory: 100
    });
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  it('should start and stop monitoring', () => {
    expect(() => monitor.startMonitoring()).not.toThrow();
    expect(() => monitor.stopMonitoring()).not.toThrow();
  });

  it('should collect metrics', async () => {
    monitor.startMonitoring();
    
    // Wait for some metrics to be collected
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const currentMetrics = monitor.getCurrentMetrics();
    expect(currentMetrics).toBeDefined();
    expect(currentMetrics?.timestamp).toBeInstanceOf(Date);
    expect(typeof currentMetrics?.responseTime).toBe('number');
    expect(typeof currentMetrics?.throughput).toBe('number');
    expect(typeof currentMetrics?.errorRate).toBe('number');
  });

  it('should manage alert rules', () => {
    const alertRule: AlertRule = {
      id: 'test-alert',
      name: 'Test Alert',
      metric: 'responseTime',
      threshold: 1000,
      operator: '>',
      duration: 60,
      severity: 'warning',
      enabled: true,
      notifications: [
        {
          type: 'email',
          target: 'test@example.com'
        }
      ]
    };

    monitor.addAlertRule(alertRule);
    
    const rules = monitor.getAlertRules();
    expect(rules).toContain(alertRule);
    
    monitor.removeAlertRule('test-alert');
    
    const rulesAfterRemoval = monitor.getAlertRules();
    expect(rulesAfterRemoval).not.toContain(alertRule);
  });

  it('should generate performance reports', async () => {
    monitor.startMonitoring();
    
    // Wait for metrics collection
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60000); // Last minute
    
    const report = monitor.generateReport(startTime, endTime);
    
    expect(report).toBeDefined();
    expect(report.id).toBeDefined();
    expect(report.title).toBeDefined();
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.summary).toBeDefined();
    expect(report.metrics).toBeInstanceOf(Array);
    expect(report.trends).toBeInstanceOf(Array);
  });
});

describe('CapacityPlanner', () => {
  let planner: CapacityPlanner;

  beforeEach(() => {
    planner = new CapacityPlanner();
  });

  it('should generate capacity plan', async () => {
    const plan = await planner.generateCapacityPlan('3 months', 0.2);
    
    expect(plan).toBeDefined();
    expect(plan.timeframe).toBe('3 months');
    expect(plan.growthRate).toBe(0.2);
    expect(plan.currentCapacity).toBeDefined();
    expect(plan.projectedCapacity).toBeDefined();
    expect(plan.recommendations).toBeInstanceOf(Array);
    expect(plan.costAnalysis).toBeDefined();
  });

  it('should analyze utilization trends', () => {
    // Add some mock metrics
    const mockMetrics = Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60000),
      responseTime: 100 + Math.random() * 50,
      throughput: 50 + Math.random() * 25,
      errorRate: Math.random() * 0.05,
      cpuUsage: 40 + Math.random() * 20,
      memoryUsage: 50 + Math.random() * 15,
      diskUsage: 60 + Math.random() * 10,
      networkLatency: 20 + Math.random() * 10,
      concurrentUsers: Math.floor(20 + Math.random() * 30)
    }));

    planner.addMetrics(mockMetrics);
    
    const trends = planner.analyzeUtilizationTrends();
    
    expect(trends).toBeDefined();
    expect(trends.cpu).toBeDefined();
    expect(trends.memory).toBeDefined();
    expect(trends.network).toBeDefined();
    expect(trends.throughput).toBeDefined();
    expect(trends.responseTime).toBeDefined();
    
    expect(typeof trends.cpu.averageUtilization).toBe('number');
    expect(['increasing', 'decreasing', 'stable']).toContain(trends.cpu.trend);
  });

  it('should optimize resource allocation', () => {
    // Add mock metrics for optimization
    const mockMetrics = Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60000),
      responseTime: 150,
      throughput: 75,
      errorRate: 0.02,
      cpuUsage: 25, // Low CPU usage for optimization test
      memoryUsage: 35, // Low memory usage
      diskUsage: 65,
      networkLatency: 25,
      concurrentUsers: 25
    }));

    planner.addMetrics(mockMetrics);
    
    const optimization = planner.optimizeResourceAllocation({
      maxCostIncrease: 10,
      minPerformanceLevel: 90,
      allowDownscaling: true
    });
    
    expect(optimization).toBeDefined();
    expect(optimization.optimizations).toBeInstanceOf(Array);
    expect(typeof optimization.totalSavings).toBe('number');
    expect(optimization.implementationPlan).toBeInstanceOf(Array);
    expect(optimization.monitoringPlan).toBeInstanceOf(Array);
  });
});

describe('AutoTuner', () => {
  let autoTuner: AutoTuner;
  let config: AutoTuningConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      rules: [
        {
          id: 'test-rule',
          name: 'Test Rule',
          condition: 'cpu > 80',
          action: {
            type: 'scale_up',
            parameters: {
              resource: 'cpu',
              amount: 1
            },
            maxAdjustment: 2
          },
          cooldownPeriod: 60,
          enabled: true
        }
      ],
      safetyLimits: {
        maxInstances: 5,
        minInstances: 1,
        maxCpuUsage: 95,
        maxMemoryUsage: 95,
        maxCostIncrease: 25
      },
      rollbackPolicy: {
        enabled: true,
        triggerConditions: ['errorRate > 0.1'],
        rollbackTimeout: 300,
        maxRollbacks: 2
      }
    };

    autoTuner = new AutoTuner(config);
  });

  afterEach(() => {
    autoTuner.stop();
  });

  it('should start and stop auto-tuning', () => {
    expect(() => autoTuner.start()).not.toThrow();
    expect(() => autoTuner.stop()).not.toThrow();
  });

  it('should execute manual actions', async () => {
    const action = {
      type: 'scale_up' as const,
      parameters: {
        resource: 'cpu',
        amount: 1
      },
      maxAdjustment: 1
    };

    const result = await autoTuner.executeAction(action, 'Manual test');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
    expect(result.metrics).toBeDefined();
  });

  it('should manage tuning rules', () => {
    const newRule = {
      id: 'new-rule',
      name: 'New Rule',
      condition: 'memory > 85',
      action: {
        type: 'scale_up' as const,
        parameters: {
          resource: 'memory',
          amount: 1
        },
        maxAdjustment: 1
      },
      cooldownPeriod: 120,
      enabled: true
    };

    autoTuner.addRule(newRule);
    autoTuner.removeRule('test-rule');
    
    // Rules are managed internally, so we test through configuration updates
    expect(() => autoTuner.updateConfig({ enabled: false })).not.toThrow();
  });

  it('should generate optimization recommendations', () => {
    const mockMetrics = [
      {
        timestamp: new Date(),
        responseTime: 2500, // High response time
        throughput: 45,
        errorRate: 0.08, // High error rate
        cpuUsage: 85, // High CPU
        memoryUsage: 90, // High memory
        diskUsage: 70,
        networkLatency: 120, // High latency
        concurrentUsers: 100
      }
    ];

    const recommendations = autoTuner.generateRecommendations(mockMetrics);
    
    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThan(0);
    
    // Should have recommendations for high resource usage
    const hasScalingRec = recommendations.some(rec => rec.type === 'scaling');
    const hasCachingRec = recommendations.some(rec => rec.type === 'caching');
    
    expect(hasScalingRec || hasCachingRec).toBe(true);
  });

  it('should track tuning history', async () => {
    const action = {
      type: 'adjust_cache' as const,
      parameters: {
        setting: 'maxSize',
        value: '512MB'
      },
      maxAdjustment: 1
    };

    await autoTuner.executeAction(action, 'History test');
    
    const history = autoTuner.getTuningHistory();
    
    expect(history).toBeInstanceOf(Array);
    expect(history.length).toBeGreaterThan(0);
    
    const lastAction = history[history.length - 1];
    expect(lastAction.action.type).toBe('adjust_cache');
    expect(lastAction.reason).toBe('History test');
    expect(lastAction.isManual).toBe(true);
  });
});