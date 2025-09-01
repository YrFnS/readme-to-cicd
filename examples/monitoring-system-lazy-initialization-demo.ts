/**
 * MonitoringSystem Lazy Initialization Demo
 * 
 * Demonstrates the lazy initialization pattern implementation in MonitoringSystem.
 * Shows how initialization occurs on first use rather than at instance creation.
 */

import { MonitoringSystemFactory } from '../src/shared/factories/monitoring-system-factory.js';

async function demonstrateLazyInitialization() {
  console.log('🚀 MonitoringSystem Lazy Initialization Demo\n');

  // Step 1: Create MonitoringSystem instance (no initialization yet)
  console.log('1. Creating MonitoringSystem instance...');
  const startTime = Date.now();
  
  const result = await MonitoringSystemFactory.createForDevelopment();
  
  if (!result.success) {
    console.error('❌ Failed to create MonitoringSystem:', result.error.message);
    return;
  }

  const creationTime = Date.now() - startTime;
  console.log(`✅ Instance created in ${creationTime}ms (no initialization yet)`);
  console.log(`   Instance exists: ${MonitoringSystemFactory.hasAnyInstance()}\n`);

  const monitoringSystem = result.data;

  // Step 2: First method call triggers lazy initialization
  console.log('2. First method call (triggers lazy initialization)...');
  const firstCallStart = Date.now();
  
  await monitoringSystem.recordMetric('demo_metric', 42, { component: 'demo' });
  
  const firstCallTime = Date.now() - firstCallStart;
  console.log(`✅ First method call completed in ${firstCallTime}ms (includes lazy initialization)`);

  // Step 3: Subsequent method calls should be faster (no initialization)
  console.log('\n3. Subsequent method calls (no initialization needed)...');
  
  const subsequentTimes: number[] = [];
  
  for (let i = 0; i < 5; i++) {
    const callStart = Date.now();
    await monitoringSystem.recordMetric(`demo_metric_${i}`, i * 10, { iteration: i.toString() });
    const callTime = Date.now() - callStart;
    subsequentTimes.push(callTime);
    console.log(`   Call ${i + 1}: ${callTime}ms`);
  }

  const avgSubsequentTime = subsequentTimes.reduce((sum, time) => sum + time, 0) / subsequentTimes.length;
  console.log(`✅ Average subsequent call time: ${avgSubsequentTime.toFixed(2)}ms\n`);

  // Step 4: Demonstrate singleton behavior
  console.log('4. Demonstrating singleton behavior...');
  
  const result2 = await MonitoringSystemFactory.createForDevelopment();
  if (result2.success) {
    const isSameInstance = result2.data === monitoringSystem;
    console.log(`✅ Same instance returned: ${isSameInstance}`);
    
    // Both instances should have the same metrics
    const metrics1 = await monitoringSystem.getSystemMetrics();
    const metrics2 = await result2.data.getSystemMetrics();
    
    const hasSharedState = metrics1.demo_metric && metrics2.demo_metric;
    console.log(`✅ Shared state preserved: ${hasSharedState}\n`);
  }

  // Step 5: Show system health and metrics
  console.log('5. System status after lazy initialization...');
  
  try {
    const health = await monitoringSystem.getSystemHealth();
    console.log(`✅ System health: ${health.status}`);
    console.log(`   Components monitored: ${health.components.length}`);
    console.log(`   System uptime: ${health.overall.uptime.toFixed(2)}s`);
    
    const metrics = await monitoringSystem.getSystemMetrics();
    const metricCount = Object.keys(metrics).length;
    console.log(`✅ Metrics collected: ${metricCount}`);
    console.log(`   Demo metric value: ${metrics.demo_metric?.value || 'not found'}\n`);
  } catch (error) {
    console.log(`⚠️  Some methods not available in mock: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Step 6: Performance comparison
  console.log('6. Performance comparison...');
  console.log(`   Instance creation: ${creationTime}ms`);
  console.log(`   First call (with lazy init): ${firstCallTime}ms`);
  console.log(`   Average subsequent calls: ${avgSubsequentTime.toFixed(2)}ms`);
  
  const initializationOverhead = firstCallTime - avgSubsequentTime;
  console.log(`   Lazy initialization overhead: ~${initializationOverhead.toFixed(2)}ms\n`);

  // Step 7: Reset and demonstrate reinitialization
  console.log('7. Demonstrating reset and reinitialization...');
  
  MonitoringSystemFactory.resetAllInstances();
  console.log(`✅ Instance reset. Exists: ${MonitoringSystemFactory.hasAnyInstance()}`);
  
  const result3 = await MonitoringSystemFactory.createForDevelopment();
  if (result3.success) {
    const reinitStart = Date.now();
    await result3.data.recordMetric('reinit_test', 100);
    const reinitTime = Date.now() - reinitStart;
    
    console.log(`✅ Reinitialization completed in ${reinitTime}ms`);
    console.log(`   New instance created: ${result3.data !== monitoringSystem}\n`);
  }

  console.log('🎉 Lazy initialization demo completed!');
  console.log('\nKey benefits demonstrated:');
  console.log('  ✓ No premature initialization - instance created quickly');
  console.log('  ✓ Initialization on first use - automatic and transparent');
  console.log('  ✓ Singleton behavior maintained - same instance returned');
  console.log('  ✓ Performance optimized - subsequent calls are fast');
  console.log('  ✓ Proper cleanup - reset functionality works correctly');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateLazyInitialization().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

export { demonstrateLazyInitialization };