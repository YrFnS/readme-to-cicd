/**
 * Example usage of the Backup Mock Factory
 * 
 * This file demonstrates how to use the backup mock factory
 * in various testing scenarios to ensure consistent mock behavior.
 */

import { 
  BackupMockFactory, 
  BackupMocks, 
  defaultBackupMockFactory,
  type BackupOperationType 
} from '../tests/utils/backup-mock-factory';
import { isSuccess, isFailure } from '../src/shared/types/result';

/**
 * Example 1: Basic usage with convenience functions
 */
export function exampleBasicUsage() {
  console.log('=== Basic Usage Example ===\n');

  // Use convenience functions for common scenarios
  const configBackup = BackupMocks.successfulConfigBackup();
  const dataBackup = BackupMocks.failedDataBackup();

  if (isSuccess(configBackup)) {
    console.log('✅ Configuration backup succeeded:');
    console.log(`   ID: ${configBackup.data.backup.id}`);
    console.log(`   Duration: ${configBackup.data.duration}ms`);
    console.log(`   Size: ${configBackup.data.backup.size} bytes`);
    console.log(`   Location: ${configBackup.data.backup.location}`);
  }

  if (isFailure(dataBackup)) {
    console.log('\n❌ Data backup failed:');
    console.log(`   Error: ${dataBackup.error.code}`);
    console.log(`   Message: ${dataBackup.error.message}`);
    console.log(`   Suggestions: ${dataBackup.error.suggestions?.join(', ')}`);
  }
}

/**
 * Example 2: Custom factory configuration
 */
export function exampleCustomConfiguration() {
  console.log('\n=== Custom Configuration Example ===\n');

  // Create factory with custom settings
  const factory = new BackupMockFactory({
    successRate: 0.7,           // 70% success rate
    durationRange: { min: 500, max: 1500 }, // 500-1500ms duration
    includeWarnings: true       // Include warnings in successful operations
  });

  // Test multiple operations
  const operations: BackupOperationType[] = ['configuration', 'data', 'full'];
  
  operations.forEach(type => {
    const result = factory.createBackupResponse(type);
    
    if (isSuccess(result)) {
      console.log(`✅ ${type} backup succeeded (${result.data.duration}ms)`);
      if (result.data.warnings && result.data.warnings.length > 0) {
        console.log(`   ⚠️  Warnings: ${result.data.warnings.join(', ')}`);
      }
    } else {
      console.log(`❌ ${type} backup failed: ${result.error.message}`);
    }
  });
}

/**
 * Example 3: Testing with custom metadata
 */
export function exampleCustomMetadata() {
  console.log('\n=== Custom Metadata Example ===\n');

  const customMetadata = {
    environment: 'test',
    requestId: 'req-12345',
    userId: 'user-67890',
    priority: 'high'
  };

  const result = BackupMocks.successfulConfigBackup(customMetadata);

  if (isSuccess(result)) {
    console.log('✅ Backup with custom metadata:');
    console.log(`   Environment: ${result.data.backup.metadata?.environment}`);
    console.log(`   Request ID: ${result.data.backup.metadata?.requestId}`);
    console.log(`   User ID: ${result.data.backup.metadata?.userId}`);
    console.log(`   Priority: ${result.data.backup.metadata?.priority}`);
  }
}

/**
 * Example 4: Error scenario testing
 */
export function exampleErrorScenarios() {
  console.log('\n=== Error Scenarios Example ===\n');

  // Configure custom error scenarios
  const factory = new BackupMockFactory({
    errorScenarios: {
      'data': {
        code: 'CUSTOM_DB_ERROR',
        message: 'Database connection pool exhausted',
        operation: 'data',
        suggestions: [
          'Increase database connection pool size',
          'Retry operation during off-peak hours'
        ]
      }
    }
  });

  const result = factory.createBackupResponse('data', { forceFailure: true });

  if (isFailure(result)) {
    console.log('❌ Custom error scenario:');
    console.log(`   Code: ${result.error.code}`);
    console.log(`   Message: ${result.error.message}`);
    console.log(`   Suggestions:`);
    result.error.suggestions?.forEach(suggestion => {
      console.log(`     - ${suggestion}`);
    });
  }
}

/**
 * Example 5: Batch testing with different operation types
 */
export function exampleBatchTesting() {
  console.log('\n=== Batch Testing Example ===\n');

  const operationTypes: BackupOperationType[] = [
    'configuration', 'data', 'system-state', 'incremental', 
    'full', 'restore', 'verify', 'cleanup'
  ];

  let successCount = 0;
  let failureCount = 0;

  operationTypes.forEach(type => {
    // Test both success and failure scenarios
    const successResult = defaultBackupMockFactory.createBackupResponse(type, { forceSuccess: true });
    const failureResult = defaultBackupMockFactory.createBackupResponse(type, { forceFailure: true });

    if (isSuccess(successResult)) {
      successCount++;
      console.log(`✅ ${type}: ${successResult.data.message}`);
    }

    if (isFailure(failureResult)) {
      failureCount++;
      console.log(`❌ ${type}: ${failureResult.error.code}`);
    }
  });

  console.log(`\nSummary: ${successCount} successes, ${failureCount} failures`);
}

/**
 * Example 6: Performance testing
 */
export function examplePerformanceTesting() {
  console.log('\n=== Performance Testing Example ===\n');

  const factory = new BackupMockFactory();
  const startTime = Date.now();
  const operationCount = 1000;

  // Generate many mock responses
  for (let i = 0; i < operationCount; i++) {
    const type: BackupOperationType = ['configuration', 'data', 'full'][i % 3] as BackupOperationType;
    factory.createBackupResponse(type);
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const operationsPerSecond = Math.round((operationCount / duration) * 1000);

  console.log(`Generated ${operationCount} mock responses in ${duration}ms`);
  console.log(`Performance: ${operationsPerSecond} operations/second`);
}

/**
 * Example 7: Integration with test suites
 */
export function exampleTestIntegration() {
  console.log('\n=== Test Integration Example ===\n');

  // Simulate a test suite that needs consistent backup mocks
  class BackupService {
    async performBackup(type: BackupOperationType): Promise<any> {
      // In real implementation, this would perform actual backup
      // In tests, we use the mock factory
      return defaultBackupMockFactory.createBackupResponse(type);
    }
  }

  // Test the service
  const service = new BackupService();
  
  const testCases: BackupOperationType[] = ['configuration', 'data', 'full'];
  
  testCases.forEach(async (type) => {
    const result = await service.performBackup(type);
    
    if (isSuccess(result)) {
      console.log(`✅ Service test passed for ${type} backup`);
    } else {
      console.log(`❌ Service test failed for ${type} backup: ${result.error.message}`);
    }
  });
}

/**
 * Example 8: Factory reset and state management
 */
export function exampleStateManagement() {
  console.log('\n=== State Management Example ===\n');

  const factory = new BackupMockFactory();

  // Generate some operations
  console.log('Generating operations...');
  for (let i = 0; i < 5; i++) {
    const result = factory.createBackupResponse('configuration', { forceSuccess: true });
    if (isSuccess(result)) {
      console.log(`  Operation ${i + 1}: ${result.data.backup.id}`);
    }
  }

  // Reset factory state
  console.log('\nResetting factory state...');
  factory.reset();

  // Generate more operations (IDs should start fresh)
  console.log('Generating operations after reset...');
  for (let i = 0; i < 3; i++) {
    const result = factory.createBackupResponse('data', { forceSuccess: true });
    if (isSuccess(result)) {
      console.log(`  Operation ${i + 1}: ${result.data.backup.id}`);
    }
  }
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log('🔧 Backup Mock Factory Usage Examples\n');
  console.log('=====================================\n');

  exampleBasicUsage();
  exampleCustomConfiguration();
  exampleCustomMetadata();
  exampleErrorScenarios();
  exampleBatchTesting();
  examplePerformanceTesting();
  exampleTestIntegration();
  exampleStateManagement();

  console.log('\n✅ All examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}