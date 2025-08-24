/**
 * Orchestration System Usage Examples
 * 
 * Demonstrates how to use the OrchestrationEngine for system integration
 * and workflow coordination.
 */

import {
  createOrchestrationEngine,
  OrchestrationUtils,
  type WorkflowRequest,
  type ComponentOperation
} from '../src/integration/orchestration';

/**
 * Basic orchestration engine usage
 */
async function basicUsageExample() {
  console.log('=== Basic Orchestration Engine Usage ===');

  // Create and initialize the orchestration engine
  const engine = createOrchestrationEngine({
    maxConcurrentWorkflows: 5,
    enableMetrics: true,
    enableHealthChecks: true,
    healthCheckInterval: 30000 // 30 seconds
  });

  try {
    // Initialize the engine
    const initResult = await engine.initialize();
    if (!initResult.success) {
      throw new Error(`Initialization failed: ${initResult.error}`);
    }

    console.log('✅ OrchestrationEngine initialized successfully');

    // Get system status
    const status = await engine.getSystemStatus();
    console.log('📊 System Status:', {
      status: status.status,
      activeWorkflows: status.activeWorkflows,
      components: Object.keys(status.components).length
    });

    // Process a README-to-CICD workflow
    const workflowRequest: WorkflowRequest = {
      id: 'example-readme-to-cicd',
      type: 'readme-to-cicd',
      payload: {
        readmePath: './README.md',
        outputDir: './.github/workflows',
        options: {
          workflowType: ['ci', 'cd'],
          dryRun: false,
          interactive: false
        }
      },
      context: OrchestrationUtils.createRequestContext({
        source: 'cli',
        environment: 'development'
      }),
      priority: 'normal'
    };

    console.log('🚀 Processing README-to-CICD workflow...');
    const workflowResult = await engine.processWorkflow(workflowRequest);

    if (workflowResult.success) {
      console.log('✅ Workflow completed successfully');
      console.log('⏱️  Execution time:', OrchestrationUtils.formatExecutionTime(workflowResult.executionTime));
      console.log('💾 Memory usage:', OrchestrationUtils.formatMemoryUsage(workflowResult.metrics.memoryUsage));
    } else {
      console.log('❌ Workflow failed:', workflowResult.errors);
    }

  } finally {
    // Shutdown the engine
    await engine.shutdown();
    console.log('🔄 OrchestrationEngine shutdown completed');
  }
}

/**
 * Component management example
 */
async function componentManagementExample() {
  console.log('\n=== Component Management Example ===');

  const engine = createOrchestrationEngine();
  await engine.initialize();

  try {
    // Start a component
    const startOperation: ComponentOperation = {
      type: 'start',
      component: 'readme-parser',
      parameters: {
        enableCaching: true,
        cacheSize: 100
      }
    };

    console.log('🔧 Starting README parser component...');
    const startResult = await engine.manageComponents(startOperation);
    console.log('Result:', startResult.success ? '✅ Success' : '❌ Failed');

    // Configure a component
    const configOperation: ComponentOperation = {
      type: 'configure',
      component: 'framework-detector',
      parameters: {
        confidenceThreshold: 0.8,
        enableCustomRules: true
      }
    };

    console.log('⚙️  Configuring framework detector...');
    const configResult = await engine.manageComponents(configOperation);
    console.log('Result:', configResult.success ? '✅ Success' : '❌ Failed');

    // Health check all components
    const components = ['readme-parser', 'framework-detector', 'yaml-generator', 'cli-tool'];
    
    console.log('🏥 Performing health checks...');
    for (const component of components) {
      const healthOperation: ComponentOperation = {
        type: 'health-check',
        component
      };

      const healthResult = await engine.manageComponents(healthOperation);
      if (healthResult.success) {
        console.log(`  ${component}: ${healthResult.data.status} (${healthResult.data.responseTime}ms)`);
      }
    }

  } finally {
    await engine.shutdown();
  }
}

/**
 * Workflow orchestration example
 */
async function workflowOrchestrationExample() {
  console.log('\n=== Workflow Orchestration Example ===');

  const engine = createOrchestrationEngine({
    maxConcurrentWorkflows: 3,
    enableMetrics: true
  });

  await engine.initialize();

  try {
    // Process multiple workflows concurrently
    const workflows: Promise<any>[] = [];

    // Component update workflow
    workflows.push(engine.processWorkflow({
      id: 'component-update-1',
      type: 'component-update',
      payload: {
        component: 'yaml-generator',
        updateType: 'configuration',
        configuration: {
          templatePath: './new-templates',
          optimizationLevel: 'advanced'
        }
      },
      context: OrchestrationUtils.createRequestContext(),
      priority: 'high'
    }));

    // System maintenance workflow
    workflows.push(engine.processWorkflow({
      id: 'maintenance-1',
      type: 'system-maintenance',
      payload: {
        maintenanceType: 'cleanup',
        parameters: {
          cleanupType: 'cache',
          maxAge: 86400000 // 24 hours
        }
      },
      context: OrchestrationUtils.createRequestContext(),
      priority: 'low'
    }));

    // Health check workflow
    workflows.push(engine.processWorkflow({
      id: 'health-check-1',
      type: 'health-check',
      payload: {
        component: 'integration-pipeline'
      },
      context: OrchestrationUtils.createRequestContext(),
      priority: 'normal'
    }));

    console.log('🔄 Processing multiple workflows concurrently...');
    const results = await Promise.allSettled(workflows);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        console.log(`  Workflow ${index + 1}: ✅ Success (${OrchestrationUtils.formatExecutionTime(result.value.executionTime)})`);
      } else {
        console.log(`  Workflow ${index + 1}: ❌ Failed`);
      }
    });

  } finally {
    await engine.shutdown();
  }
}

/**
 * Error handling and recovery example
 */
async function errorHandlingExample() {
  console.log('\n=== Error Handling and Recovery Example ===');

  const engine = createOrchestrationEngine({
    retryAttempts: 2,
    enableMetrics: true
  });

  await engine.initialize();

  try {
    // Simulate a workflow that might fail
    const faultyWorkflow: WorkflowRequest = {
      id: 'faulty-workflow',
      type: 'readme-to-cicd',
      payload: {
        readmePath: './non-existent-readme.md', // This will cause a failure
        outputDir: './output',
        options: {
          workflowType: ['ci'],
          dryRun: false,
          interactive: false
        }
      },
      context: OrchestrationUtils.createRequestContext(),
      priority: 'normal'
    };

    console.log('🧪 Testing error handling with faulty workflow...');
    const result = await engine.processWorkflow(faultyWorkflow);

    if (result.success) {
      console.log('✅ Workflow succeeded unexpectedly');
    } else {
      console.log('❌ Workflow failed as expected');
      console.log('   Errors:', result.errors);
      console.log('   Warnings:', result.warnings);
    }

    // Test component recovery
    console.log('🔧 Testing component recovery...');
    
    // Stop a component (simulate failure)
    await engine.manageComponents({
      type: 'stop',
      component: 'yaml-generator'
    });

    // Restart it (simulate recovery)
    const recoveryResult = await engine.manageComponents({
      type: 'restart',
      component: 'yaml-generator'
    });

    console.log('Recovery result:', recoveryResult.success ? '✅ Success' : '❌ Failed');

  } finally {
    await engine.shutdown();
  }
}

/**
 * System event handling example
 */
async function systemEventHandlingExample() {
  console.log('\n=== System Event Handling Example ===');

  const engine = createOrchestrationEngine();
  await engine.initialize();

  try {
    // Simulate various system events
    const events = [
      {
        id: 'info-event-1',
        type: 'component-started',
        source: 'health-manager',
        timestamp: new Date(),
        data: { component: 'readme-parser' },
        severity: 'info' as const
      },
      {
        id: 'warning-event-1',
        type: 'high-memory-usage',
        source: 'monitoring-system',
        timestamp: new Date(),
        data: { memoryUsage: '85%', threshold: '80%' },
        severity: 'warning' as const
      },
      {
        id: 'error-event-1',
        type: 'component-failure',
        source: 'health-manager',
        timestamp: new Date(),
        data: { component: 'framework-detector', error: 'Connection timeout' },
        severity: 'error' as const
      }
    ];

    console.log('📡 Handling system events...');
    for (const event of events) {
      await engine.handleSystemEvent(event);
      console.log(`  ${event.severity.toUpperCase()}: ${event.type} from ${event.source}`);
    }

  } finally {
    await engine.shutdown();
  }
}

/**
 * Performance monitoring example
 */
async function performanceMonitoringExample() {
  console.log('\n=== Performance Monitoring Example ===');

  const engine = createOrchestrationEngine({
    enableMetrics: true,
    enableHealthChecks: true
  });

  await engine.initialize();

  try {
    // Process several workflows to generate metrics
    console.log('📈 Generating performance metrics...');
    
    const startTime = Date.now();
    const workflows: Promise<any>[] = [];

    for (let i = 0; i < 5; i++) {
      workflows.push(engine.processWorkflow({
        id: `perf-test-${i}`,
        type: 'health-check',
        payload: { component: 'readme-parser' },
        context: OrchestrationUtils.createRequestContext(),
        priority: 'normal'
      }));
    }

    const results = await Promise.all(workflows);
    const totalTime = Date.now() - startTime;

    // Analyze results
    const successful = results.filter(r => r.success).length;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    const throughput = successful / (totalTime / 1000);

    console.log('📊 Performance Metrics:');
    console.log(`   Total workflows: ${results.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Success rate: ${(successful / results.length * 100).toFixed(1)}%`);
    console.log(`   Average execution time: ${OrchestrationUtils.formatExecutionTime(avgExecutionTime)}`);
    console.log(`   Throughput: ${throughput.toFixed(2)} workflows/second`);

    // Get system status
    const status = await engine.getSystemStatus();
    console.log(`   System status: ${status.status}`);
    console.log(`   Active workflows: ${status.activeWorkflows}`);

  } finally {
    await engine.shutdown();
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await basicUsageExample();
    await componentManagementExample();
    await workflowOrchestrationExample();
    await errorHandlingExample();
    await systemEventHandlingExample();
    await performanceMonitoringExample();

    console.log('\n🎉 All examples completed successfully!');

  } catch (error) {
    console.error('❌ Example execution failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  basicUsageExample,
  componentManagementExample,
  workflowOrchestrationExample,
  errorHandlingExample,
  systemEventHandlingExample,
  performanceMonitoringExample,
  runAllExamples
};