/**
 * Example: Using Shared Mock Utilities
 * 
 * This example demonstrates how to use the shared mock utilities to create
 * consistent mock behaviors across different types of operations and test scenarios.
 */

import {
  MockIdGenerator,
  MockDurationSimulator,
  MockSuccessFailureLogic,
  MockTimestampManager,
  MockErrorCodeGenerator,
  MockMessageGenerator,
  MockConfigurationManager,
  MockStateManager,
  BaseOperationMockFactory,
  MockUtilities,
  BaseMockConfig,
  BaseOperationMetadata,
  BaseOperationResult,
  BaseOperationError
} from '../tests/utils/shared-mock-utilities';
import { Result, success, failure, isSuccess, isFailure } from '../src/shared/types/result';

// Example 1: Using individual utilities
console.log('=== Example 1: Individual Utilities ===');

// ID Generation
const idGenerator = new MockIdGenerator('example');
console.log('Generated IDs:', idGenerator.generateIds(3));

// Duration Simulation
const durationSimulator = new MockDurationSimulator({ min: 100, max: 500 });
console.log('Generated durations:', durationSimulator.generateDurations(3));

// Success/Failure Logic
const successFailureLogic = new MockSuccessFailureLogic(0.7);
const results = successFailureLogic.generateResults(10);
console.log('Success results:', results);
console.log('Success rate:', successFailureLogic.calculateSuccessRate(results));

// Timestamp Management
const timestampManager = new MockTimestampManager();
const timestamps = timestampManager.generateMultipleTimestamps([1000, 2000, 500]);
console.log('Generated timestamps:', timestamps.map(t => ({
  start: t.startTime.toISOString(),
  end: t.endTime.toISOString(),
  duration: timestampManager.calculateDuration(t.startTime, t.endTime)
})));

// Error Code Generation
const errorCodeGenerator = new MockErrorCodeGenerator('EXAMPLE');
console.log('Error codes:', {
  basic: errorCodeGenerator.generateErrorCode('parsing', 'syntax'),
  detailed: errorCodeGenerator.generateErrorCode('validation', 'schema', 'missing_field')
});

// Message Generation
const messageGenerator = new MockMessageGenerator();
console.log('Messages:', {
  success: messageGenerator.generateSuccessMessage('data-processing', { duration: 1500 }),
  failure: messageGenerator.generateFailureMessage('data-processing', 'invalid format', {
    suggestion: 'Check input data structure'
  })
});

// Example 2: Using MockUtilities convenience functions
console.log('\n=== Example 2: MockUtilities Convenience Functions ===');

const fastDurationSim = MockUtilities.createDurationSimulator('fast');
const reliableLogic = MockUtilities.createSuccessFailureLogic('reliable');
const backupErrorGen = MockUtilities.createErrorCodeGenerator('backup');

console.log('Fast durations:', fastDurationSim.generateDurations(3));
console.log('Reliable success rate:', reliableLogic.getSuccessRate());
console.log('Backup error code:', backupErrorGen.generateErrorCode('restore', 'checksum'));

// Example 3: Creating a custom mock factory
console.log('\n=== Example 3: Custom Mock Factory ===');

// Define custom interfaces
interface FileOperationMetadata extends BaseOperationMetadata {
  fileName: string;
  fileSize: number;
}

interface FileOperationResult extends BaseOperationResult<FileOperationMetadata> {
  bytesProcessed: number;
  checksum: string;
}

interface FileOperationError extends BaseOperationError {
  fileName: string;
  errorType: 'permission' | 'not_found' | 'corrupted' | 'size_limit';
}

interface FileOperationConfig extends BaseMockConfig {
  maxFileSize: number;
  supportedFormats: string[];
}

// Implement custom mock factory
class FileOperationMockFactory extends BaseOperationMockFactory<
  FileOperationMetadata,
  FileOperationResult,
  FileOperationError,
  FileOperationConfig
> {
  constructor() {
    const config: FileOperationConfig = {
      successRate: 0.85,
      durationRange: { min: 200, max: 3000 },
      includeWarnings: true,
      maxFileSize: 1024 * 1024 * 10, // 10MB
      supportedFormats: ['.txt', '.json', '.csv', '.xml']
    };
    super(config, 'file_op', 'FILE');
  }

  createFileOperationResponse(
    operationType: 'read' | 'write' | 'delete' | 'copy',
    fileName: string,
    fileSize: number,
    options: {
      forceSuccess?: boolean;
      forceFailure?: boolean;
    } = {}
  ): Result<FileOperationResult, FileOperationError> {
    const duration = this.durationSimulator.generateDuration();
    const shouldSucceed = this.successFailureLogic.shouldSucceed(options);

    if (shouldSucceed) {
      const metadata: FileOperationMetadata = {
        ...this.generateBaseMetadata(operationType, 'completed', duration),
        fileName,
        fileSize
      };

      const result: FileOperationResult = {
        ...this.generateSuccessResult(metadata, duration, {
          customMessage: `File ${operationType} operation completed for ${fileName}`
        }),
        bytesProcessed: fileSize,
        checksum: this.generateMockChecksum()
      };

      return success(result);
    } else {
      const errorType = this.selectRandomErrorType();
      const error: FileOperationError = {
        ...this.generateErrorResult(operationType, errorType, `File ${operationType} failed`),
        fileName,
        errorType
      };

      return failure(error);
    }
  }

  // Required abstract method implementations
  createOperationResponse(operationType: string, options: any = {}): Result<FileOperationResult, FileOperationError> {
    return this.createFileOperationResponse(
      operationType as any,
      options.fileName || 'test.txt',
      options.fileSize || 1024,
      options
    );
  }

  protected generateWarnings(operationType: string): string[] {
    const warnings = [
      `${operationType} operation took longer than expected`,
      'File system cache may need clearing',
      'Consider optimizing file access patterns'
    ];
    return warnings.slice(0, Math.floor(Math.random() * 3));
  }

  protected getDefaultSuggestions(operationType: string, errorCategory: string): string[] {
    const suggestions: Record<string, string[]> = {
      permission: ['Check file permissions', 'Run with elevated privileges'],
      not_found: ['Verify file path exists', 'Check file name spelling'],
      corrupted: ['Restore from backup', 'Run file system check'],
      size_limit: ['Reduce file size', 'Increase size limits']
    };
    return suggestions[errorCategory] || ['Contact system administrator'];
  }

  private generateMockChecksum(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private selectRandomErrorType(): 'permission' | 'not_found' | 'corrupted' | 'size_limit' {
    const types: Array<'permission' | 'not_found' | 'corrupted' | 'size_limit'> = 
      ['permission', 'not_found', 'corrupted', 'size_limit'];
    return types[Math.floor(Math.random() * types.length)];
  }
}

// Example usage of custom factory
async function demonstrateCustomFactory() {
  const factory = new FileOperationMockFactory();
  await factory.initialize();

  console.log('File operation examples:');

  // Successful file read
  const readResult = factory.createFileOperationResponse('read', 'document.txt', 2048, { forceSuccess: true });
  if (isSuccess(readResult)) {
    console.log('✅ Read success:', {
      file: readResult.data.operation.fileName,
      duration: readResult.data.duration,
      checksum: readResult.data.checksum
    });
  }

  // Failed file write
  const writeResult = factory.createFileOperationResponse('write', 'output.json', 5120, { forceFailure: true });
  if (isFailure(writeResult)) {
    console.log('❌ Write failure:', {
      file: writeResult.error.fileName,
      errorType: writeResult.error.errorType,
      suggestions: writeResult.error.suggestions
    });
  }

  // Random operations
  console.log('\nRandom operations:');
  for (let i = 0; i < 5; i++) {
    const operations: Array<'read' | 'write' | 'delete' | 'copy'> = ['read', 'write', 'delete', 'copy'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const fileName = `file_${i + 1}.txt`;
    const fileSize = Math.floor(Math.random() * 10000) + 1000;
    
    const result = factory.createFileOperationResponse(operation, fileName, fileSize);
    const message = isSuccess(result) ? 'Success' : result.error.message;
    console.log(`${isSuccess(result) ? '✅' : '❌'} ${operation} ${fileName}: ${message}`);
  }

  // Factory statistics
  const stats = factory.getStatistics();
  console.log('\nFactory statistics:', {
    operationCount: stats.operationCount,
    successRate: stats.config.successRate,
    isInitialized: stats.isInitialized
  });

  factory.cleanup();
}

// Example 4: Configuration management
console.log('\n=== Example 4: Configuration Management ===');

interface CustomConfig extends BaseMockConfig {
  customSetting: string;
  numericSetting: number;
}

const defaultConfig: CustomConfig = {
  successRate: 0.8,
  durationRange: { min: 100, max: 1000 },
  includeWarnings: false,
  customSetting: 'default',
  numericSetting: 42
};

const configManager = new MockConfigurationManager(defaultConfig);

console.log('Initial config:', configManager.getConfig());

// Update configuration
configManager.updateConfig({ 
  successRate: 0.95, 
  customSetting: 'updated',
  durationRange: { min: 50, max: 500 }
});

console.log('Updated config:', configManager.getConfig());
console.log('Config diff from defaults:', configManager.getConfigDiff());

// Validate configuration
const validation = configManager.validateConfig();
console.log('Config validation:', validation);

// Example 5: State management
console.log('\n=== Example 5: State Management ===');

async function demonstrateStateManagement() {
  const stateManager = new MockStateManager();
  
  console.log('Initial state:', stateManager.getState());
  
  await stateManager.initialize();
  console.log('After initialization:', stateManager.getState());
  
  // Record some operations
  for (let i = 0; i < 3; i++) {
    stateManager.recordOperation();
    if (i === 1) {
      stateManager.recordError('Simulated error during operation 2');
    }
  }
  
  console.log('After operations:', stateManager.getState());
  
  stateManager.cleanup();
  console.log('After cleanup:', stateManager.getState());
}

// Run all examples
async function runExamples() {
  try {
    await demonstrateCustomFactory();
    await demonstrateStateManagement();
    console.log('\n🎉 All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export for use in other files
export {
  FileOperationMockFactory,
  demonstrateCustomFactory,
  demonstrateStateManagement,
  runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}