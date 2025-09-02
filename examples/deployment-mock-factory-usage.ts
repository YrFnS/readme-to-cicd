/**
 * Example usage of the Deployment Mock Factory
 * 
 * This file demonstrates how to use the deployment mock factory
 * in various testing scenarios to ensure consistent mock behavior.
 */

import { 
  DeploymentMockFactory, 
  DeploymentMocks, 
  defaultDeploymentMockFactory,
  type DeploymentOperationType,
  type DeploymentEnvironment 
} from '../tests/utils/deployment-mock-factory';
import { isSuccess, isFailure } from '../src/shared/types/result';

/**
 * Example 1: Basic usage with convenience functions
 */
export function exampleBasicUsage() {
  console.log('=== Basic Deployment Usage Example ===\n');

  // Use convenience functions for common scenarios
  const appDeployment = DeploymentMocks.successfulAppDeployment('production');
  const infraDeployment = DeploymentMocks.failedInfraDeployment('staging');

  if (isSuccess(appDeployment)) {
    console.log('✅ Application deployment succeeded:');
    console.log(`   ID: ${appDeployment.data.deployment.id}`);
    console.log(`   Environment: ${appDeployment.data.deployment.environment}`);
    console.log(`   Version: ${appDeployment.data.deployment.version}`);
    console.log(`   Duration: ${appDeployment.data.duration}ms`);
    console.log(`   URL: ${appDeployment.data.deployment.deploymentUrl}`);
    console.log(`   Health Check: ${appDeployment.data.deployment.healthCheckUrl}`);
  }

  if (isFailure(infraDeployment)) {
    console.log('\n❌ Infrastructure deployment failed:');
    console.log(`   Error: ${infraDeployment.error.code}`);
    console.log(`   Environment: ${infraDeployment.error.environment}`);
    console.log(`   Message: ${infraDeployment.error.message}`);
    console.log(`   Rollback Recommended: ${infraDeployment.error.rollbackRecommended}`);
    console.log(`   Suggestions: ${infraDeployment.error.suggestions?.join(', ')}`);
  }
}

/**
 * Example 2: Custom factory configuration for different environments
 */
export function exampleEnvironmentConfiguration() {
  console.log('\n=== Environment Configuration Example ===\n');

  // Create factory with production-like settings (higher success rate, longer duration)
  const productionFactory = new DeploymentMockFactory({
    successRate: 0.95,           // 95% success rate for production
    durationRange: { min: 10000, max: 45000 }, // 10-45 seconds for production deployments
    includeWarnings: true,       // Include warnings for production deployments
    defaultEnvironment: 'production',
    generateUrls: true
  });

  // Create factory with development settings (faster, more failures for testing)
  const devFactory = new DeploymentMockFactory({
    successRate: 0.7,            // 70% success rate for dev (more failures to test error handling)
    durationRange: { min: 2000, max: 8000 }, // 2-8 seconds for dev deployments
    includeWarnings: false,      // No warnings for dev
    defaultEnvironment: 'development',
    generateUrls: false          // No URLs for dev
  });

  // Test production deployment
  const prodResult = productionFactory.createDeploymentResponse('application');
  if (isSuccess(prodResult)) {
    console.log(`✅ Production deployment: ${prodResult.data.deployment.environment} (${prodResult.data.duration}ms)`);
    if (prodResult.data.warnings && prodResult.data.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${prodResult.data.warnings.join(', ')}`);
    }
  }

  // Test development deployment
  const devResult = devFactory.createDeploymentResponse('application');
  if (isSuccess(devResult)) {
    console.log(`✅ Development deployment: ${devResult.data.deployment.environment} (${devResult.data.duration}ms)`);
  } else {
    console.log(`❌ Development deployment failed: ${devResult.error.message}`);
  }
}

/**
 * Example 3: Testing with custom metadata and versions
 */
export function exampleCustomMetadata() {
  console.log('\n=== Custom Metadata Example ===\n');

  const customMetadata = {
    deployedBy: 'john.doe@company.com',
    buildNumber: '1234',
    gitCommit: 'abc123def456',
    releaseNotes: 'Bug fixes and performance improvements',
    approvedBy: 'jane.smith@company.com'
  };

  const result = DeploymentMocks.successfulAppDeployment('production', customMetadata);

  if (isSuccess(result)) {
    console.log('✅ Deployment with custom metadata:');
    console.log(`   Deployed By: ${result.data.deployment.metadata?.deployedBy}`);
    console.log(`   Build Number: ${result.data.deployment.metadata?.buildNumber}`);
    console.log(`   Git Commit: ${result.data.deployment.metadata?.gitCommit}`);
    console.log(`   Release Notes: ${result.data.deployment.metadata?.releaseNotes}`);
    console.log(`   Approved By: ${result.data.deployment.metadata?.approvedBy}`);
    console.log(`   Artifacts: ${result.data.artifacts?.join(', ')}`);
  }
}

/**
 * Example 4: Error scenario testing with custom error configurations
 */
export function exampleErrorScenarios() {
  console.log('\n=== Error Scenarios Example ===\n');

  // Configure custom error scenarios for specific deployment types
  const factory = new DeploymentMockFactory({
    errorScenarios: {
      'database': {
        code: 'CUSTOM_DB_MIGRATION_CONFLICT',
        message: 'Database migration failed due to conflicting schema changes from parallel deployment',
        operation: 'database',
        environment: 'production',
        suggestions: [
          'Coordinate with other teams to avoid parallel schema changes',
          'Use database migration locks to prevent conflicts',
          'Roll back to previous schema version and retry'
        ],
        rollbackRecommended: true
      },
      'application': {
        code: 'CUSTOM_CONTAINER_REGISTRY_ERROR',
        message: 'Failed to pull container image from registry due to authentication failure',
        operation: 'application',
        environment: 'production',
        suggestions: [
          'Verify container registry credentials',
          'Check network connectivity to registry',
          'Ensure image exists and is accessible'
        ],
        rollbackRecommended: true
      }
    }
  });

  // Test custom database error
  const dbResult = factory.createDeploymentResponse('database', { 
    forceFailure: true, 
    environment: 'production' 
  });

  if (isFailure(dbResult)) {
    console.log('❌ Custom database error scenario:');
    console.log(`   Code: ${dbResult.error.code}`);
    console.log(`   Message: ${dbResult.error.message}`);
    console.log(`   Rollback Recommended: ${dbResult.error.rollbackRecommended}`);
    console.log(`   Suggestions:`);
    dbResult.error.suggestions?.forEach(suggestion => {
      console.log(`     - ${suggestion}`);
    });
  }

  // Test custom application error
  const appResult = factory.createDeploymentResponse('application', { 
    forceFailure: true, 
    environment: 'production' 
  });

  if (isFailure(appResult)) {
    console.log('\n❌ Custom application error scenario:');
    console.log(`   Code: ${appResult.error.code}`);
    console.log(`   Message: ${appResult.error.message}`);
  }
}

/**
 * Example 5: Batch testing across different deployment types and environments
 */
export function exampleBatchTesting() {
  console.log('\n=== Batch Testing Example ===\n');

  const deploymentTypes: DeploymentOperationType[] = [
    'application', 'infrastructure', 'database', 'configuration', 
    'rollback', 'health-check', 'scaling', 'migration'
  ];

  const environments: DeploymentEnvironment[] = [
    'development', 'staging', 'production'
  ];

  let successCount = 0;
  let failureCount = 0;

  deploymentTypes.forEach(type => {
    environments.forEach(environment => {
      // Test both success and failure scenarios
      const successResult = defaultDeploymentMockFactory.createDeploymentResponse(type, { 
        forceSuccess: true, 
        environment 
      });
      const failureResult = defaultDeploymentMockFactory.createDeploymentResponse(type, { 
        forceFailure: true, 
        environment 
      });

      if (isSuccess(successResult)) {
        successCount++;
        console.log(`✅ ${type} (${environment}): ${successResult.data.message}`);
      }

      if (isFailure(failureResult)) {
        failureCount++;
        console.log(`❌ ${type} (${environment}): ${failureResult.error.code}`);
      }
    });
  });

  console.log(`\nSummary: ${successCount} successes, ${failureCount} failures across ${deploymentTypes.length * environments.length} scenarios each`);
}

/**
 * Example 6: Performance testing for high-volume deployment scenarios
 */
export function examplePerformanceTesting() {
  console.log('\n=== Performance Testing Example ===\n');

  const factory = new DeploymentMockFactory();
  const startTime = Date.now();
  const operationCount = 1000;

  // Generate many mock deployment responses
  for (let i = 0; i < operationCount; i++) {
    const type: DeploymentOperationType = ['application', 'database', 'configuration'][i % 3] as DeploymentOperationType;
    const environment: DeploymentEnvironment = ['development', 'staging', 'production'][i % 3] as DeploymentEnvironment;
    factory.createDeploymentResponse(type, { environment });
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const operationsPerSecond = Math.round((operationCount / duration) * 1000);

  console.log(`Generated ${operationCount} mock deployment responses in ${duration}ms`);
  console.log(`Performance: ${operationsPerSecond} operations/second`);
}

/**
 * Example 7: Integration with deployment service testing
 */
export function exampleServiceIntegration() {
  console.log('\n=== Service Integration Example ===\n');

  // Simulate a deployment service that uses the mock factory for testing
  class DeploymentService {
    async deployApplication(
      version: string, 
      environment: DeploymentEnvironment
    ): Promise<any> {
      // In real implementation, this would perform actual deployment
      // In tests, we use the mock factory
      return defaultDeploymentMockFactory.createDeploymentResponse('application', {
        version,
        environment
      });
    }

    async rollbackApplication(environment: DeploymentEnvironment): Promise<any> {
      return defaultDeploymentMockFactory.createDeploymentResponse('rollback', {
        environment
      });
    }

    async checkHealth(environment: DeploymentEnvironment): Promise<any> {
      return defaultDeploymentMockFactory.createDeploymentResponse('health-check', {
        environment
      });
    }
  }

  // Test the service
  const service = new DeploymentService();
  
  const testCases = [
    { method: 'deployApplication', args: ['2.1.0', 'staging'] },
    { method: 'rollbackApplication', args: ['production'] },
    { method: 'checkHealth', args: ['development'] }
  ];
  
  testCases.forEach(async (testCase) => {
    try {
      const result = await (service as any)[testCase.method](...testCase.args);
      
      if (isSuccess(result)) {
        console.log(`✅ Service test passed for ${testCase.method}: ${result.data.message}`);
      } else {
        console.log(`❌ Service test failed for ${testCase.method}: ${result.error.message}`);
      }
    } catch (error) {
      console.log(`💥 Service test threw error for ${testCase.method}: ${error}`);
    }
  });
}

/**
 * Example 8: Deployment pipeline simulation
 */
export function exampleDeploymentPipeline() {
  console.log('\n=== Deployment Pipeline Example ===\n');

  // Simulate a complete deployment pipeline
  const pipeline = [
    { type: 'health-check' as DeploymentOperationType, description: 'Pre-deployment health check' },
    { type: 'database' as DeploymentOperationType, description: 'Database migration' },
    { type: 'application' as DeploymentOperationType, description: 'Application deployment' },
    { type: 'configuration' as DeploymentOperationType, description: 'Configuration update' },
    { type: 'health-check' as DeploymentOperationType, description: 'Post-deployment health check' }
  ];

  const environment: DeploymentEnvironment = 'staging';
  let pipelineSuccess = true;

  console.log(`Starting deployment pipeline for ${environment} environment...\n`);

  pipeline.forEach((step, index) => {
    const result = defaultDeploymentMockFactory.createDeploymentResponse(step.type, { environment });
    
    if (isSuccess(result)) {
      console.log(`✅ Step ${index + 1}: ${step.description} - SUCCESS (${result.data.duration}ms)`);
    } else {
      console.log(`❌ Step ${index + 1}: ${step.description} - FAILED: ${result.error.message}`);
      pipelineSuccess = false;
      
      if (result.error.rollbackRecommended) {
        console.log(`   🔄 Rollback recommended for ${step.type} deployment`);
        
        // Simulate rollback
        const rollbackResult = defaultDeploymentMockFactory.createDeploymentResponse('rollback', { environment });
        if (isSuccess(rollbackResult)) {
          console.log(`   ✅ Rollback completed successfully`);
        } else {
          console.log(`   ❌ Rollback failed: ${rollbackResult.error.message}`);
        }
      }
      
      return; // Stop pipeline on failure
    }
  });

  console.log(`\n${pipelineSuccess ? '✅ Pipeline completed successfully' : '❌ Pipeline failed'}`);
}

/**
 * Example 9: Factory state management and reset
 */
export function exampleStateManagement() {
  console.log('\n=== State Management Example ===\n');

  const factory = new DeploymentMockFactory();

  // Generate some deployments
  console.log('Generating deployments...');
  for (let i = 0; i < 5; i++) {
    const result = factory.createDeploymentResponse('application', { 
      forceSuccess: true, 
      environment: 'development' 
    });
    if (isSuccess(result)) {
      console.log(`  Deployment ${i + 1}: ${result.data.deployment.id} (v${result.data.deployment.version})`);
    }
  }

  // Reset factory state
  console.log('\nResetting factory state...');
  factory.reset();

  // Generate more deployments (IDs should start fresh)
  console.log('Generating deployments after reset...');
  for (let i = 0; i < 3; i++) {
    const result = factory.createDeploymentResponse('database', { 
      forceSuccess: true, 
      environment: 'staging' 
    });
    if (isSuccess(result)) {
      console.log(`  Deployment ${i + 1}: ${result.data.deployment.id} (v${result.data.deployment.version})`);
    }
  }
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log('🚀 Deployment Mock Factory Usage Examples\n');
  console.log('==========================================\n');

  exampleBasicUsage();
  exampleEnvironmentConfiguration();
  exampleCustomMetadata();
  exampleErrorScenarios();
  exampleBatchTesting();
  examplePerformanceTesting();
  exampleServiceIntegration();
  exampleDeploymentPipeline();
  exampleStateManagement();

  console.log('\n✅ All deployment examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}