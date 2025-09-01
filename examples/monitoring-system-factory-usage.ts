/**
 * MonitoringSystemFactory Usage Examples
 * 
 * This file demonstrates how to use the MonitoringSystemFactory
 * to create and configure MonitoringSystem instances for different environments.
 */

import { MonitoringSystemFactory } from '../src/shared/factories/monitoring-system-factory';
import { Logger } from '../src/cli/lib/logger';

// Example logger implementation
const logger: Logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || '')
};

/**
 * Example 1: Create a development MonitoringSystem
 */
async function createDevelopmentMonitoringSystem() {
  console.log('\n=== Development MonitoringSystem ===');
  
  const result = await MonitoringSystemFactory.createForDevelopment('integration');
  
  if (result.success) {
    console.log('✅ Development MonitoringSystem created successfully');
    
    // Initialize and use the monitoring system
    const monitoringSystem = result.data;
    
    // For integration MonitoringSystem, we can call initialize
    if ('initialize' in monitoringSystem) {
      const initResult = await monitoringSystem.initialize();
      if (initResult.success) {
        console.log('✅ MonitoringSystem initialized successfully');
        
        // Record some metrics
        await monitoringSystem.recordMetric('example_metric', 42, { environment: 'development' });
        console.log('✅ Metric recorded successfully');
        
        // Get system status
        const status = await monitoringSystem.getStatus();
        console.log('📊 System status:', status);
      }
    }
  } else {
    console.error('❌ Failed to create development MonitoringSystem:', result.error.message);
  }
}

/**
 * Example 2: Create a production MonitoringSystem
 */
async function createProductionMonitoringSystem() {
  console.log('\n=== Production MonitoringSystem ===');
  
  const result = await MonitoringSystemFactory.createForProduction('integration');
  
  if (result.success) {
    console.log('✅ Production MonitoringSystem created successfully');
    
    const monitoringSystem = result.data;
    
    if ('initialize' in monitoringSystem) {
      const initResult = await monitoringSystem.initialize();
      if (initResult.success) {
        console.log('✅ MonitoringSystem initialized for production');
        
        // Record production metrics
        await monitoringSystem.recordMetric('requests_per_second', 150, { service: 'api' });
        await monitoringSystem.recordMetric('error_rate', 0.02, { service: 'api' });
        
        // Get system health
        const health = await monitoringSystem.getSystemHealth();
        console.log('🏥 System health:', health.status);
      }
    }
  } else {
    console.error('❌ Failed to create production MonitoringSystem:', result.error.message);
  }
}

/**
 * Example 3: Create a test MonitoringSystem
 */
async function createTestMonitoringSystem() {
  console.log('\n=== Test MonitoringSystem ===');
  
  const result = await MonitoringSystemFactory.createForTesting('integration');
  
  if (result.success) {
    console.log('✅ Test MonitoringSystem created successfully');
    
    const monitoringSystem = result.data;
    
    if ('initialize' in monitoringSystem) {
      const initResult = await monitoringSystem.initialize();
      if (initResult.success) {
        console.log('✅ MonitoringSystem initialized for testing');
        
        // Test metrics recording
        await monitoringSystem.recordMetric('test_metric', 1, { test: 'example' });
        
        // Verify status
        const status = await monitoringSystem.getStatus();
        console.log('🧪 Test system status:', {
          initialized: status.initialized,
          metricsEnabled: status.metricsEnabled,
          metricsCount: status.metricsCount
        });
      }
    }
  } else {
    console.error('❌ Failed to create test MonitoringSystem:', result.error.message);
  }
}

/**
 * Example 4: Create a custom configured MonitoringSystem
 */
async function createCustomMonitoringSystem() {
  console.log('\n=== Custom MonitoringSystem ===');
  
  const customConfig = {
    type: 'integration' as const,
    logger,
    config: {
      enableMetrics: true,
      enableHealthChecks: true,
      metricsPort: 9095,
      metricsPath: '/custom-metrics',
      healthCheckInterval: 45000,
      alertingEnabled: true,
      retentionPeriod: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
  };
  
  const result = await MonitoringSystemFactory.create(customConfig);
  
  if (result.success) {
    console.log('✅ Custom MonitoringSystem created successfully');
    
    const monitoringSystem = result.data;
    
    if ('initialize' in monitoringSystem) {
      const initResult = await monitoringSystem.initialize();
      if (initResult.success) {
        console.log('✅ Custom MonitoringSystem initialized');
        
        // Use custom configuration
        await monitoringSystem.recordMetric('custom_metric', 100, { type: 'custom' });
        
        const status = await monitoringSystem.getStatus();
        console.log('⚙️ Custom system configuration active:', {
          metricsEnabled: status.metricsEnabled,
          alertsEnabled: status.alertsEnabled
        });
      }
    }
  } else {
    console.error('❌ Failed to create custom MonitoringSystem:', result.error.message);
  }
}

/**
 * Example 5: Configuration templates
 */
function demonstrateConfigurationTemplates() {
  console.log('\n=== Configuration Templates ===');
  
  // Get configuration templates
  const agentHooksTemplate = MonitoringSystemFactory.getConfigTemplate('agent-hooks');
  const integrationTemplate = MonitoringSystemFactory.getConfigTemplate('integration');
  
  console.log('📋 Agent-Hooks template structure:');
  console.log('  - metrics:', Object.keys(agentHooksTemplate.metrics || {}));
  console.log('  - alerts:', Object.keys(agentHooksTemplate.alerts || {}));
  console.log('  - healthChecks:', Object.keys(agentHooksTemplate.healthChecks || {}));
  console.log('  - tracing:', Object.keys(agentHooksTemplate.tracing || {}));
  console.log('  - logging:', Object.keys(agentHooksTemplate.logging || {}));
  
  console.log('\n📋 Integration template structure:');
  console.log('  - enableMetrics:', integrationTemplate.enableMetrics);
  console.log('  - metricsPort:', integrationTemplate.metricsPort);
  console.log('  - healthCheckInterval:', integrationTemplate.healthCheckInterval);
  console.log('  - alertingEnabled:', integrationTemplate.alertingEnabled);
}

/**
 * Example 6: Instance management
 */
function demonstrateInstanceManagement() {
  console.log('\n=== Instance Management ===');
  
  // Check if any instances exist
  console.log('🔍 Any instances exist?', MonitoringSystemFactory.hasAnyInstance());
  
  // Reset all instances
  MonitoringSystemFactory.resetAllInstances();
  console.log('🔄 All instances reset');
  
  // Check again
  console.log('🔍 Any instances exist after reset?', MonitoringSystemFactory.hasAnyInstance());
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 MonitoringSystemFactory Usage Examples');
  console.log('==========================================');
  
  try {
    // Run all examples
    await createDevelopmentMonitoringSystem();
    
    // Reset between examples to demonstrate different configurations
    MonitoringSystemFactory.resetAllInstances();
    await createProductionMonitoringSystem();
    
    MonitoringSystemFactory.resetAllInstances();
    await createTestMonitoringSystem();
    
    MonitoringSystemFactory.resetAllInstances();
    await createCustomMonitoringSystem();
    
    // Demonstrate configuration templates
    demonstrateConfigurationTemplates();
    
    // Demonstrate instance management
    demonstrateInstanceManagement();
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  } finally {
    // Clean up
    MonitoringSystemFactory.resetAllInstances();
    console.log('\n🧹 Cleanup completed');
  }
}

// Export for use in other files
export {
  createDevelopmentMonitoringSystem,
  createProductionMonitoringSystem,
  createTestMonitoringSystem,
  createCustomMonitoringSystem,
  demonstrateConfigurationTemplates,
  demonstrateInstanceManagement
};

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}