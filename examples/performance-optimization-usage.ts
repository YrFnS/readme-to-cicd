/**
 * Performance optimization and scalability testing usage examples
 */

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
} from '../src/performance/index.js';

/**
 * Example 1: Basic Load Testing
 */
async function basicLoadTestExample() {
  console.log('=== Basic Load Testing Example ===');
  
  const loadTester = new LoadTester();
  
  const config: LoadTestConfig = {
    targetUrl: 'http://localhost:3000',
    duration: 300, // 5 minutes
    rampUpTime: 60, // 1 minute ramp-up
    maxUsers: 100,
    requestsPerSecond: 200,
    testScenarios: [
      {
        name: 'readme-processing-workflow',
        weight: 100,
        requests: [
          {
            method: 'POST',
            path: '/api/parse',
            headers: { 'Content-Type': 'application/json' },
            body: {
              readme: '# My Project\n\nThis is a Node.js project with TypeScript.'
            },
            expectedStatusCode: 200
          },
          {
            method: 'POST',
            path: '/api/detect',
            headers: { 'Content-Type': 'application/json' },
            body: {
              projectData: { /* parsed data */ }
            },
            expectedStatusCode: 200
          },
          {
            method: 'POST',
            path: '/api/generate',
            headers: { 'Content-Type': 'application/json' },
            body: {
              frameworks: ['nodejs', 'typescript']
            },
            expectedStatusCode: 200
          }
        ]
      }
    ]
  };

  try {
    console.log('Starting load test...');
    const result = await loadTester.executeLoadTest(config);
    
    console.log('Load Test Results:');
    console.log(`- Test ID: ${result.testId}`);
    console.log(`- Duration: ${(result.endTime.getTime() - result.startTime.getTime()) / 1000}s`);
    console.log(`- Total Requests: ${result.totalRequests}`);
    console.log(`- Successful Requests: ${result.successfulRequests}`);
    console.log(`- Failed Requests: ${result.failedRequests}`);
    console.log(`- Average Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
    console.log(`- 95th Percentile: ${result.p95ResponseTime.toFixed(2)}ms`);
    console.log(`- 99th Percentile: ${result.p99ResponseTime.toFixed(2)}ms`);
    console.log(`- Throughput: ${result.throughput.toFixed(2)} RPS`);
    console.log(`- Error Rate: ${(result.errorRate * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('Load test failed:', error);
  }
}

/**
 * Example 2: Scalability Testing
 */
async function scalabilityTestExample() {
  console.log('\n=== Scalability Testing Example ===');
  
  const scalabilityTester = new ScalabilityTester();
  
  const config: ScalabilityTestConfig = {
    name: 'README-to-CICD Scalability Test',
    baselineUsers: 10,
    maxUsers: 500,
    userIncrement: 25,
    testDuration: 180, // 3 minutes per step
    acceptableResponseTime: 2000, // 2 seconds
    acceptableErrorRate: 0.05 // 5%
  };

  try {
    console.log('Starting scalability test...');
    const result = await scalabilityTester.executeScalabilityTest(config);
    
    console.log('Scalability Test Results:');
    console.log(`- Test ID: ${result.testId}`);
    console.log(`- Test Steps: ${result.results.length}`);
    
    if (result.breakingPoint) {
      console.log('Breaking Point Analysis:');
      console.log(`- Maximum Users: ${result.breakingPoint.maxUsers}`);
      console.log(`- Maximum Throughput: ${result.breakingPoint.maxThroughput.toFixed(2)} RPS`);
      console.log(`- Degradation Point: ${result.breakingPoint.degradationPoint} users`);
    }
    
    console.log('\nRecommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title} (${rec.priority})`);
      console.log(`   ${rec.description}`);
      console.log(`   Expected Impact: ${rec.expectedImpact}`);
    });
    
  } catch (error) {
    console.error('Scalability test failed:', error);
  }
}

/**
 * Example 3: Performance Monitoring Setup
 */
async function performanceMonitoringExample() {
  console.log('\n=== Performance Monitoring Example ===');
  
  const monitor = new PerformanceMonitor({
    metricsRetentionDays: 30,
    collectionIntervalMs: 5000, // Collect every 5 seconds
    maxMetricsInMemory: 10000
  });

  // Set up alert rules
  const alertRules: AlertRule[] = [
    {
      id: 'critical-response-time',
      name: 'Critical Response Time Alert',
      metric: 'responseTime',
      threshold: 5000, // 5 seconds
      operator: '>',
      duration: 60, // Alert after 1 minute
      severity: 'critical',
      enabled: true,
      notifications: [
        {
          type: 'email',
          target: 'oncall@company.com'
        },
        {
          type: 'slack',
          target: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        }
      ]
    },
    {
      id: 'high-error-rate',
      name: 'High Error Rate Alert',
      metric: 'errorRate',
      threshold: 0.1, // 10%
      operator: '>',
      duration: 120, // Alert after 2 minutes
      severity: 'error',
      enabled: true,
      notifications: [
        {
          type: 'email',
          target: 'team@company.com'
        }
      ]
    },
    {
      id: 'resource-exhaustion',
      name: 'Resource Exhaustion Warning',
      metric: 'memoryUsage',
      threshold: 90, // 90%
      operator: '>',
      duration: 300, // Alert after 5 minutes
      severity: 'warning',
      enabled: true,
      notifications: [
        {
          type: 'email',
          target: 'devops@company.com'
        }
      ]
    }
  ];

  // Add alert rules
  alertRules.forEach(rule => monitor.addAlertRule(rule));

  // Set up event listeners
  monitor.on('metricsCollected', (metrics) => {
    console.log(`[${metrics.timestamp.toISOString()}] Metrics collected:`);
    console.log(`  Response Time: ${metrics.responseTime.toFixed(2)}ms`);
    console.log(`  Throughput: ${metrics.throughput.toFixed(2)} RPS`);
    console.log(`  Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`  CPU Usage: ${metrics.cpuUsage.toFixed(1)}%`);
    console.log(`  Memory Usage: ${metrics.memoryUsage.toFixed(1)}%`);
  });

  monitor.on('alertTriggered', ({ rule, metrics }) => {
    console.log(`🚨 ALERT TRIGGERED: ${rule.name}`);
    console.log(`   Metric: ${rule.metric} = ${metrics[rule.metric as keyof typeof metrics]}`);
    console.log(`   Threshold: ${rule.operator} ${rule.threshold}`);
    console.log(`   Severity: ${rule.severity.toUpperCase()}`);
  });

  monitor.on('alertResolved', ({ rule }) => {
    console.log(`✅ ALERT RESOLVED: ${rule.name}`);
  });

  // Start monitoring
  console.log('Starting performance monitoring...');
  monitor.startMonitoring();

  // Run for a short time for demonstration
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

  // Generate a performance report
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 30000); // Last 30 seconds
  const report = monitor.generateReport(startTime, endTime);

  console.log('\nPerformance Report:');
  console.log(`- Report ID: ${report.id}`);
  console.log(`- Time Range: ${report.timeRange.start.toISOString()} to ${report.timeRange.end.toISOString()}`);
  console.log(`- Average Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms`);
  console.log(`- Total Requests: ${report.summary.totalRequests}`);
  console.log(`- Availability: ${(report.summary.availability * 100).toFixed(2)}%`);
  console.log(`- Performance Score: ${report.summary.performanceScore.toFixed(1)}/100`);

  console.log('\nTrend Analysis:');
  report.trends.forEach(trend => {
    console.log(`- ${trend.metric}: ${trend.trend} (${trend.changePercentage.toFixed(1)}% change)`);
  });

  // Stop monitoring
  monitor.stopMonitoring();
}

/**
 * Example 4: Capacity Planning
 */
async function capacityPlanningExample() {
  console.log('\n=== Capacity Planning Example ===');
  
  const planner = new CapacityPlanner();

  // Simulate adding historical metrics
  const historicalMetrics = Array.from({ length: 1000 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 60000), // Every minute for the last ~16 hours
    responseTime: 100 + Math.random() * 200 + (i * 0.1), // Gradually increasing
    throughput: 100 - (i * 0.05) + Math.random() * 20, // Gradually decreasing
    errorRate: Math.random() * 0.02 + (i * 0.00001), // Slightly increasing
    cpuUsage: 40 + Math.random() * 30 + (i * 0.02), // Gradually increasing
    memoryUsage: 50 + Math.random() * 20 + (i * 0.015), // Gradually increasing
    diskUsage: 60 + Math.random() * 10,
    networkLatency: 20 + Math.random() * 30,
    concurrentUsers: Math.floor(50 + Math.random() * 100)
  }));

  planner.addMetrics(historicalMetrics);

  try {
    // Generate capacity plan for next 6 months with 30% expected growth
    console.log('Generating capacity plan...');
    const capacityPlan = await planner.generateCapacityPlan('6 months', 0.30);

    console.log('Capacity Planning Results:');
    console.log(`- Timeframe: ${capacityPlan.timeframe}`);
    console.log(`- Expected Growth Rate: ${(capacityPlan.growthRate * 100).toFixed(1)}%`);

    console.log('\nCurrent Capacity:');
    console.log(`- CPU: ${capacityPlan.currentCapacity.cpu.current} ${capacityPlan.currentCapacity.cpu.unit} (${capacityPlan.currentCapacity.cpu.utilization.toFixed(1)}% utilized)`);
    console.log(`- Memory: ${capacityPlan.currentCapacity.memory.current} ${capacityPlan.currentCapacity.memory.unit} (${capacityPlan.currentCapacity.memory.utilization.toFixed(1)}% utilized)`);
    console.log(`- Storage: ${capacityPlan.currentCapacity.storage.current} ${capacityPlan.currentCapacity.storage.unit} (${capacityPlan.currentCapacity.storage.utilization.toFixed(1)}% utilized)`);
    console.log(`- Instances: ${capacityPlan.currentCapacity.instances}`);

    console.log('\nProjected Capacity:');
    console.log(`- CPU: ${capacityPlan.projectedCapacity.cpu.current} ${capacityPlan.projectedCapacity.cpu.unit} (${capacityPlan.projectedCapacity.cpu.utilization.toFixed(1)}% utilized)`);
    console.log(`- Memory: ${capacityPlan.projectedCapacity.memory.current} ${capacityPlan.projectedCapacity.memory.unit} (${capacityPlan.projectedCapacity.memory.utilization.toFixed(1)}% utilized)`);
    console.log(`- Storage: ${capacityPlan.projectedCapacity.storage.current} ${capacityPlan.projectedCapacity.storage.unit} (${capacityPlan.projectedCapacity.storage.utilization.toFixed(1)}% utilized)`);
    console.log(`- Instances: ${capacityPlan.projectedCapacity.instances}`);

    console.log('\nCost Analysis:');
    console.log(`- Current Monthly Cost: $${capacityPlan.costAnalysis.currentMonthlyCost.toFixed(2)}`);
    console.log(`- Projected Monthly Cost: $${capacityPlan.costAnalysis.projectedMonthlyCost.toFixed(2)}`);
    console.log(`- Optimized Monthly Cost: $${capacityPlan.costAnalysis.optimizedMonthlyCost.toFixed(2)}`);
    console.log(`- Potential Savings: $${capacityPlan.costAnalysis.potentialSavings.toFixed(2)}`);

    console.log('\nRecommendations:');
    capacityPlan.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.resource.toUpperCase()}: ${rec.action} from ${rec.currentValue} to ${rec.recommendedValue}`);
      console.log(`   Reasoning: ${rec.reasoning}`);
      console.log(`   Timeline: ${rec.timeline}`);
      console.log(`   Cost Impact: $${rec.cost.toFixed(2)}/month`);
    });

    // Analyze utilization trends
    console.log('\nUtilization Trends:');
    const trends = planner.analyzeUtilizationTrends();
    Object.entries(trends).forEach(([metric, trend]) => {
      console.log(`- ${metric}: ${trend.trend} (avg: ${trend.averageUtilization.toFixed(1)}%, volatility: ${trend.volatility.toFixed(1)}%)`);
    });

  } catch (error) {
    console.error('Capacity planning failed:', error);
  }
}

/**
 * Example 5: Auto-Tuning Setup
 */
async function autoTuningExample() {
  console.log('\n=== Auto-Tuning Example ===');
  
  const autoTuningConfig: AutoTuningConfig = {
    enabled: true,
    rules: [
      {
        id: 'scale-up-cpu-high',
        name: 'Scale Up on High CPU Usage',
        condition: 'cpu > 80', // When CPU > 80%
        action: {
          type: 'scale_up',
          parameters: {
            resource: 'cpu',
            amount: 1
          },
          maxAdjustment: 2
        },
        cooldownPeriod: 300, // 5 minutes
        enabled: true
      },
      {
        id: 'scale-down-cpu-low',
        name: 'Scale Down on Low CPU Usage',
        condition: 'cpu < 30', // When CPU < 30%
        action: {
          type: 'scale_down',
          parameters: {
            resource: 'cpu',
            amount: 1
          },
          maxAdjustment: 1
        },
        cooldownPeriod: 600, // 10 minutes (longer cooldown for scale-down)
        enabled: true
      },
      {
        id: 'increase-memory-high-usage',
        name: 'Increase Memory on High Usage',
        condition: 'memory > 85', // When memory > 85%
        action: {
          type: 'scale_up',
          parameters: {
            resource: 'memory',
            amount: 2 // Add 2GB
          },
          maxAdjustment: 4
        },
        cooldownPeriod: 180, // 3 minutes
        enabled: true
      },
      {
        id: 'restart-on-high-error-rate',
        name: 'Restart Service on High Error Rate',
        condition: 'errorRate > 0.15', // When error rate > 15%
        action: {
          type: 'restart_service',
          parameters: {
            service: 'readme-to-cicd-api'
          },
          maxAdjustment: 1
        },
        cooldownPeriod: 900, // 15 minutes
        enabled: true
      }
    ],
    safetyLimits: {
      maxInstances: 20,
      minInstances: 2,
      maxCpuUsage: 95,
      maxMemoryUsage: 95,
      maxCostIncrease: 100 // Max 100% cost increase
    },
    rollbackPolicy: {
      enabled: true,
      triggerConditions: [
        'errorRate > 0.2', // Rollback if error rate > 20%
        'responseTime > 10000' // Rollback if response time > 10s
      ],
      rollbackTimeout: 1800, // 30 minutes
      maxRollbacks: 3
    }
  };

  const autoTuner = new AutoTuner(autoTuningConfig);

  // Set up event listeners
  autoTuner.on('autoTuningStarted', () => {
    console.log('🤖 Auto-tuning started');
  });

  autoTuner.on('actionExecuted', ({ action, result }) => {
    console.log(`🔧 Auto-tuning action executed: ${action.type}`);
    console.log(`   Parameters: ${JSON.stringify(action.parameters)}`);
    console.log(`   Result: ${result.message}`);
  });

  autoTuner.on('actionRolledBack', (rollbackItem) => {
    console.log(`↩️  Action rolled back: ${rollbackItem.actionId}`);
  });

  autoTuner.on('tuningError', (error) => {
    console.error('❌ Auto-tuning error:', error);
  });

  // Start auto-tuning
  console.log('Starting auto-tuning system...');
  autoTuner.start();

  // Simulate some manual actions
  console.log('\nExecuting manual optimization actions...');
  
  try {
    // Manual cache optimization
    const cacheResult = await autoTuner.executeAction({
      type: 'adjust_cache',
      parameters: {
        setting: 'maxSize',
        value: '2GB'
      },
      maxAdjustment: 1
    }, 'Manual cache size increase');
    
    console.log('Cache optimization result:', cacheResult.message);

    // Manual scaling action
    const scaleResult = await autoTuner.executeAction({
      type: 'scale_up',
      parameters: {
        resource: 'instances',
        amount: 1
      },
      maxAdjustment: 1
    }, 'Manual instance scaling');
    
    console.log('Scaling result:', scaleResult.message);

  } catch (error) {
    console.error('Manual action failed:', error);
  }

  // Generate optimization recommendations
  console.log('\nGenerating optimization recommendations...');
  const mockMetrics = [
    {
      timestamp: new Date(),
      responseTime: 2500, // High response time
      throughput: 45,
      errorRate: 0.08, // High error rate
      cpuUsage: 85, // High CPU
      memoryUsage: 90, // High memory
      diskUsage: 70,
      networkLatency: 120,
      concurrentUsers: 150
    }
  ];

  const recommendations = autoTuner.generateRecommendations(mockMetrics);
  console.log('Optimization Recommendations:');
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.title} (${rec.priority})`);
    console.log(`   Type: ${rec.type}`);
    console.log(`   Description: ${rec.description}`);
    console.log(`   Expected Impact: ${rec.expectedImpact}`);
    console.log(`   Implementation Effort: ${rec.implementationEffort}`);
    if (rec.estimatedPerformanceGain) {
      console.log(`   Performance Gain: ${rec.estimatedPerformanceGain}%`);
    }
    if (rec.estimatedCostSavings) {
      console.log(`   Cost Savings: ${rec.estimatedCostSavings}%`);
    }
  });

  // Show tuning history
  console.log('\nTuning History:');
  const history = autoTuner.getTuningHistory();
  history.slice(-5).forEach((action, index) => { // Show last 5 actions
    console.log(`${index + 1}. ${action.action.type} - ${action.result} (${action.isManual ? 'Manual' : 'Automatic'})`);
    console.log(`   Reason: ${action.reason}`);
    console.log(`   Timestamp: ${action.timestamp.toISOString()}`);
  });

  // Run for a short time then stop
  await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
  
  autoTuner.stop();
  console.log('Auto-tuning stopped');
}

/**
 * Example 6: Comprehensive Performance System
 */
async function comprehensivePerformanceSystemExample() {
  console.log('\n=== Comprehensive Performance System Example ===');
  
  const performanceSystem = new PerformanceSystem();

  // Initialize with full configuration
  await performanceSystem.initialize({
    enableDefaultAlerts: true,
    autoTuning: {
      enabled: true,
      rules: [
        {
          id: 'auto-scale-cpu',
          name: 'Auto Scale CPU',
          condition: 'cpu > 75',
          action: {
            type: 'scale_up',
            parameters: { resource: 'cpu', amount: 1 },
            maxAdjustment: 2
          },
          cooldownPeriod: 300,
          enabled: true
        }
      ],
      safetyLimits: {
        maxInstances: 10,
        minInstances: 2,
        maxCpuUsage: 90,
        maxMemoryUsage: 90,
        maxCostIncrease: 50
      },
      rollbackPolicy: {
        enabled: true,
        triggerConditions: ['errorRate > 0.1'],
        rollbackTimeout: 600,
        maxRollbacks: 2
      }
    },
    monitoring: {
      metricsRetentionDays: 7,
      collectionIntervalMs: 10000
    }
  });

  // Add custom alert
  performanceSystem.addAlertRule({
    id: 'custom-throughput-alert',
    name: 'Low Throughput Alert',
    metric: 'throughput',
    threshold: 50,
    operator: '<',
    duration: 300,
    severity: 'warning',
    enabled: true,
    notifications: [
      {
        type: 'email',
        target: 'performance-team@company.com'
      }
    ]
  });

  // Run comprehensive performance test
  const loadTestConfig: LoadTestConfig = {
    targetUrl: 'http://localhost:3000',
    duration: 120, // 2 minutes for demo
    rampUpTime: 30,
    maxUsers: 50,
    requestsPerSecond: 100,
    testScenarios: [
      {
        name: 'full-workflow',
        weight: 100,
        requests: [
          {
            method: 'POST',
            path: '/api/parse',
            headers: { 'Content-Type': 'application/json' },
            body: { readme: 'sample content' },
            expectedStatusCode: 200
          },
          {
            method: 'POST',
            path: '/api/generate',
            headers: { 'Content-Type': 'application/json' },
            body: { framework: 'nodejs' },
            expectedStatusCode: 200
          }
        ]
      }
    ]
  };

  console.log('Running comprehensive performance test...');
  const testResult = await performanceSystem.runPerformanceTest(loadTestConfig);

  console.log('Comprehensive Test Results:');
  console.log('===========================');
  
  // Load test results
  console.log('\nLoad Test Results:');
  console.log(`- Average Response Time: ${testResult.loadTest.averageResponseTime.toFixed(2)}ms`);
  console.log(`- Throughput: ${testResult.loadTest.throughput.toFixed(2)} RPS`);
  console.log(`- Error Rate: ${(testResult.loadTest.errorRate * 100).toFixed(2)}%`);
  
  // Scalability test results
  console.log('\nScalability Test Results:');
  if (testResult.scalabilityTest.breakingPoint) {
    console.log(`- Max Users: ${testResult.scalabilityTest.breakingPoint.maxUsers}`);
    console.log(`- Max Throughput: ${testResult.scalabilityTest.breakingPoint.maxThroughput.toFixed(2)} RPS`);
  }
  
  // Capacity planning results
  console.log('\nCapacity Planning:');
  console.log(`- Current Monthly Cost: $${testResult.capacityPlan.costAnalysis.currentMonthlyCost.toFixed(2)}`);
  console.log(`- Projected Monthly Cost: $${testResult.capacityPlan.costAnalysis.projectedMonthlyCost.toFixed(2)}`);
  console.log(`- Potential Savings: $${testResult.capacityPlan.costAnalysis.potentialSavings.toFixed(2)}`);
  
  // Performance report
  console.log('\nPerformance Summary:');
  console.log(`- Performance Score: ${testResult.performanceReport.summary.performanceScore.toFixed(1)}/100`);
  console.log(`- Availability: ${(testResult.performanceReport.summary.availability * 100).toFixed(2)}%`);
  
  // Recommendations
  console.log('\nTop Recommendations:');
  testResult.recommendations.slice(0, 5).forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.title} (${rec.priority})`);
    console.log(`   ${rec.description}`);
  });

  // Get real-time dashboard
  console.log('\nReal-time Dashboard:');
  const dashboard = performanceSystem.getPerformanceDashboard();
  console.log(`- System Status: ${dashboard.systemStatus.toUpperCase()}`);
  console.log(`- Active Tests: ${dashboard.activeTests.length}`);
  console.log(`- Alert Rules: ${dashboard.alertRules.length}`);
  
  if (dashboard.currentMetrics) {
    console.log(`- Current Response Time: ${dashboard.currentMetrics.responseTime.toFixed(2)}ms`);
    console.log(`- Current Throughput: ${dashboard.currentMetrics.throughput.toFixed(2)} RPS`);
    console.log(`- Current CPU Usage: ${dashboard.currentMetrics.cpuUsage.toFixed(1)}%`);
    console.log(`- Current Memory Usage: ${dashboard.currentMetrics.memoryUsage.toFixed(1)}%`);
  }

  // Generate and execute optimization recommendations
  console.log('\nExecuting Optimizations:');
  const optimizationRecs = performanceSystem.generateOptimizationRecommendations();
  
  if (optimizationRecs.length > 0) {
    try {
      const firstRec = optimizationRecs[0];
      console.log(`Executing: ${firstRec.title}`);
      
      // Execute a safe optimization (cache adjustment)
      const result = await performanceSystem.executeOptimization('adjust_cache', {
        setting: 'maxSize',
        value: '1GB'
      });
      
      console.log(`Optimization result: ${result.message}`);
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  }

  // Cleanup
  await performanceSystem.shutdown();
  console.log('\nPerformance system shutdown complete');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Performance Optimization and Scalability Testing Examples');
  console.log('============================================================');

  try {
    // Run all examples
    await basicLoadTestExample();
    await scalabilityTestExample();
    await performanceMonitoringExample();
    await capacityPlanningExample();
    await autoTuningExample();
    await comprehensivePerformanceSystemExample();
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  basicLoadTestExample,
  scalabilityTestExample,
  performanceMonitoringExample,
  capacityPlanningExample,
  autoTuningExample,
  comprehensivePerformanceSystemExample
};