/**
 * Mock Response Validator Usage Examples
 * 
 * This file demonstrates how to use the mock response validation utilities
 * to ensure consistency and correctness of mock responses in tests.
 */

import { 
  MockResponseValidator,
  MockValidation,
  CommonValidationRules,
  type ValidationRule
} from '../tests/utils/mock-response-validator';
import { 
  BackupMockFactory, 
  BackupMocks 
} from '../tests/utils/backup-mock-factory';
import { 
  DeploymentMockFactory, 
  DeploymentMocks 
} from '../tests/utils/deployment-mock-factory';

// Example 1: Basic validation of individual responses
console.log('=== Example 1: Basic Response Validation ===');

// Validate a successful backup response
const backupResponse = BackupMocks.successfulConfigBackup();
const backupValidation = MockValidation.validateBackup(backupResponse, 'configuration');

console.log('Backup Response Validation:');
console.log(`Valid: ${backupValidation.isValid}`);
console.log(`Errors: ${backupValidation.errors.length}`);
console.log(`Warnings: ${backupValidation.warnings.length}`);

// Validate a successful deployment response
const deploymentResponse = DeploymentMocks.successfulAppDeployment('production');
const deploymentValidation = MockValidation.validateDeployment(
  deploymentResponse, 
  'application', 
  'production'
);

console.log('\nDeployment Response Validation:');
console.log(`Valid: ${deploymentValidation.isValid}`);
console.log(`Errors: ${deploymentValidation.errors.length}`);
console.log(`Warnings: ${deploymentValidation.warnings.length}`);

// Example 2: Batch validation for consistency
console.log('\n=== Example 2: Batch Consistency Validation ===');

const batchResponses = [
  BackupMocks.successfulConfigBackup(),
  BackupMocks.successfulDataBackup(),
  BackupMocks.failedFullBackup(),
  DeploymentMocks.successfulAppDeployment('staging'),
  DeploymentMocks.failedDbDeployment('production')
];

const consistencyValidation = MockValidation.validateConsistency(batchResponses);

console.log('Batch Consistency Validation:');
console.log(`Valid: ${consistencyValidation.isValid}`);
console.log(`Total Responses: ${consistencyValidation.context?.totalResponses}`);
console.log(`Success Count: ${consistencyValidation.context?.successCount}`);
console.log(`Failure Count: ${consistencyValidation.context?.failureCount}`);
console.log(`Errors: ${consistencyValidation.errors.length}`);
console.log(`Warnings: ${consistencyValidation.warnings.length}`);

// Example 3: Custom validation rules
console.log('\n=== Example 3: Custom Validation Rules ===');

// Create custom validation rules
const customRules: ValidationRule[] = [
  // Rule to ensure success messages are descriptive
  {
    name: 'descriptive-success-messages',
    description: 'Ensures success messages are descriptive enough',
    validate: (response) => {
      if (response.success && response.data.message) {
        return response.data.message.length >= 20; // At least 20 characters
      }
      return true; // Don't validate failure responses
    },
    errorMessage: 'Success messages should be at least 20 characters long',
    isWarning: true
  },
  
  // Rule to ensure error codes are properly formatted
  CommonValidationRules.errorCodeConvention('BACKUP_'),
  
  // Rule to ensure success messages contain key terms
  CommonValidationRules.successMessageKeywords(['successfully', 'completed', 'deployed'])
];

// Create validator with custom rules
const customValidator = MockValidation.createCustomValidator(customRules);

// Test with backup response
const customBackupValidation = customValidator.validateBackupResponse(
  BackupMocks.successfulConfigBackup()
);

console.log('Custom Backup Validation:');
console.log(`Valid: ${customBackupValidation.isValid}`);
console.log(`Errors: ${customBackupValidation.errors.length}`);
console.log(`Warnings: ${customBackupValidation.warnings.length}`);

if (customBackupValidation.warnings.length > 0) {
  console.log('Warnings:');
  customBackupValidation.warnings.forEach(warning => console.log(`  - ${warning}`));
}

// Example 4: Strict validation mode
console.log('\n=== Example 4: Strict Validation Mode ===');

const strictValidator = MockValidation.createStrictValidator();

// Test with a response that might have warnings
const strictValidation = strictValidator.validateBackupResponse(
  BackupMocks.successfulConfigBackup()
);

console.log('Strict Validation:');
console.log(`Valid: ${strictValidation.isValid}`);
console.log(`Errors: ${strictValidation.errors.length}`);
console.log(`Warnings: ${strictValidation.warnings.length}`);

// In strict mode, warnings cause validation to fail
if (!strictValidation.isValid && strictValidation.warnings.length > 0) {
  console.log('Validation failed due to warnings in strict mode');
}

// Example 5: Validating factory-generated responses
console.log('\n=== Example 5: Factory Response Validation ===');

const backupFactory = new BackupMockFactory({
  successRate: 0.8,
  includeWarnings: true
});

const deploymentFactory = new DeploymentMockFactory({
  successRate: 0.9,
  generateUrls: true
});

// Generate and validate multiple responses
const factoryResponses = [
  backupFactory.createBackupResponse('configuration'),
  backupFactory.createBackupResponse('data'),
  deploymentFactory.createDeploymentResponse('application', { environment: 'staging' }),
  deploymentFactory.createDeploymentResponse('database', { environment: 'production' })
];

console.log('Factory Response Validation:');
factoryResponses.forEach((response, index) => {
  let validation;
  
  if ('backup' in (response.success ? response.data : {})) {
    // It's a backup response
    validation = MockValidation.validateBackup(response as any);
  } else {
    // It's a deployment response
    validation = MockValidation.validateDeployment(response as any);
  }
  
  console.log(`Response ${index + 1}: Valid=${validation.isValid}, Errors=${validation.errors.length}, Warnings=${validation.warnings.length}`);
});

// Example 6: Error detection and reporting
console.log('\n=== Example 6: Error Detection and Reporting ===');

// Create an intentionally invalid response for testing
const invalidResponse = {
  success: true,
  data: {
    // Missing required 'backup' field
    message: 'Test', // Too short
    duration: -100 // Invalid negative duration
  }
};

const errorValidation = MockValidation.validateBackup(invalidResponse as any);

console.log('Invalid Response Validation:');
console.log(`Valid: ${errorValidation.isValid}`);
console.log('Errors found:');
errorValidation.errors.forEach(error => console.log(`  - ${error}`));

// Example 7: Performance testing with many responses
console.log('\n=== Example 7: Performance Testing ===');

const startTime = Date.now();

// Generate many responses for performance testing
const manyResponses = [];
for (let i = 0; i < 1000; i++) {
  manyResponses.push(BackupMocks.successfulConfigBackup());
}

// Validate all responses
const performanceValidation = MockValidation.validateConsistency(manyResponses);
const endTime = Date.now();

console.log('Performance Test Results:');
console.log(`Validated ${manyResponses.length} responses in ${endTime - startTime}ms`);
console.log(`Valid: ${performanceValidation.isValid}`);
console.log(`Average time per response: ${(endTime - startTime) / manyResponses.length}ms`);

// Example 8: Integration with test suites
console.log('\n=== Example 8: Test Suite Integration ===');

/**
 * Example of how to integrate validation into test suites
 */
function validateTestResponse(response: any, expectedType?: string): void {
  const validation = MockValidation.validateBackup(response, expectedType as any);
  
  if (!validation.isValid) {
    console.error('Mock response validation failed:');
    validation.errors.forEach(error => console.error(`  ERROR: ${error}`));
    validation.warnings.forEach(warning => console.warn(`  WARNING: ${warning}`));
    
    throw new Error(`Mock response validation failed with ${validation.errors.length} errors`);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Mock response validation warnings:');
    validation.warnings.forEach(warning => console.warn(`  WARNING: ${warning}`));
  }
}

// Example usage in a test
try {
  const testResponse = BackupMocks.successfulConfigBackup();
  validateTestResponse(testResponse, 'configuration');
  console.log('Test response validation passed ✓');
} catch (error) {
  console.error('Test response validation failed ✗');
}

console.log('\n=== Mock Response Validator Examples Complete ===');

/**
 * Best Practices for Using Mock Response Validation:
 * 
 * 1. **Validate Early**: Run validation on mock responses as soon as they're created
 * 2. **Use Appropriate Strictness**: Use strict mode for critical tests, relaxed for development
 * 3. **Custom Rules**: Create domain-specific validation rules for your use cases
 * 4. **Batch Validation**: Validate multiple responses together to catch consistency issues
 * 5. **Performance Monitoring**: Monitor validation performance for large test suites
 * 6. **Error Reporting**: Provide clear error messages to help developers fix issues quickly
 * 7. **Integration**: Integrate validation into your CI/CD pipeline to catch issues early
 * 
 * Common Validation Scenarios:
 * 
 * - **Unit Tests**: Validate individual mock responses match expected schemas
 * - **Integration Tests**: Validate response consistency across multiple operations
 * - **Performance Tests**: Ensure mock responses don't degrade under load
 * - **Regression Tests**: Catch changes in mock response structure over time
 * - **Development**: Provide immediate feedback on mock response quality
 */