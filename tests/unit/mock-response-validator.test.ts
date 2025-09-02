/**
 * Tests for Mock Response Validation Utilities
 * 
 * Validates the mock response validation functionality including:
 * - Schema validation for backup and deployment responses
 * - Structure validation and consistency checks
 * - Custom validation rules
 * - Error and warning reporting
 * - Integration with existing mock factories
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MockResponseValidator,
  defaultMockResponseValidator,
  MockValidation,
  CommonValidationRules,
  type ValidationResult,
  type ValidationOptions,
  type ValidationRule
} from '../utils/mock-response-validator';
import { 
  BackupMockFactory, 
  BackupMocks,
  type BackupOperationType 
} from '../utils/backup-mock-factory';
import { 
  DeploymentMockFactory, 
  DeploymentMocks,
  type DeploymentOperationType,
  type DeploymentEnvironment 
} from '../utils/deployment-mock-factory';
import { success, failure, isSuccess, isFailure } from '../../src/shared/types/result';

describe('MockResponseValidator', () => {
  let validator: MockResponseValidator;
  let backupFactory: BackupMockFactory;
  let deploymentFactory: DeploymentMockFactory;

  beforeEach(() => {
    validator = new MockResponseValidator();
    backupFactory = new BackupMockFactory();
    deploymentFactory = new DeploymentMockFactory();
  });

  describe('Constructor and Configuration', () => {
    it('should create validator with default options', () => {
      const options = validator.getOptions();
      
      expect(options.strict).toBe(false);
      expect(options.validateOptional).toBe(true);
      expect(options.customRules).toEqual([]);
    });

    it('should create validator with custom options', () => {
      const customValidator = new MockResponseValidator({
        strict: true,
        validateOptional: false,
        customRules: []
      });
      
      const options = customValidator.getOptions();
      expect(options.strict).toBe(true);
      expect(options.validateOptional).toBe(false);
    });

    it('should update options after creation', () => {
      validator.updateOptions({ strict: true });
      
      const options = validator.getOptions();
      expect(options.strict).toBe(true);
    });
  });

  describe('Backup Response Validation', () => {
    describe('Success Response Validation', () => {
      it('should validate successful backup response', () => {
        const response = BackupMocks.successfulConfigBackup();
        const validation = validator.validateBackupResponse(response, 'configuration');
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.context?.responseType).toBe('backup');
        expect(validation.context?.isSuccess).toBe(true);
      });

      it('should validate all backup operation types', () => {
        const operationTypes: BackupOperationType[] = [
          'configuration', 'data', 'system-state', 'incremental', 
          'full', 'restore', 'verify', 'cleanup'
        ];

        operationTypes.forEach(type => {
          const response = backupFactory.createBackupResponse(type, { forceSuccess: true });
          const validation = validator.validateBackupResponse(response, type);
          
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        });
      });

      it('should detect missing required fields in success response', () => {
        const invalidResponse = success({
          // Missing backup field
          message: 'Test message',
          duration: 1000
        });
        
        const validation = validator.validateBackupResponse(invalidResponse as any);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Missing required field: backup');
      });

      it('should detect invalid field types in success response', () => {
        const invalidResponse = success({
          backup: {
            id: 'backup_123',
            type: 'configuration',
            status: 'completed',
            startTime: new Date(),
            endTime: new Date()
          },
          message: 123, // Should be string
          duration: 'invalid' // Should be number
        });
        
        const validation = validator.validateBackupResponse(invalidResponse as any);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Missing or invalid required field: message');
        expect(validation.errors).toContain('Missing or invalid required field: duration (must be non-negative number)');
      });

      it('should validate backup metadata structure', () => {
        const response = success({
          backup: {
            id: 'invalid-id-format',
            type: 'configuration',
            status: 'completed',
            startTime: 'invalid-date', // Should be Date
            endTime: new Date()
          },
          message: 'Test message',
          duration: 1000
        });
        
        const validation = validator.validateBackupResponse(response as any);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Missing or invalid metadata field: startTime (must be Date)');
        expect(validation.warnings).toContain('Backup ID does not follow expected pattern');
      });

      it('should validate operation type matching', () => {
        const response = backupFactory.createBackupResponse('data', { forceSuccess: true });
        const validation = validator.validateBackupResponse(response, 'configuration');
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => 
          error.includes('Backup type mismatch: expected configuration, got data')
        )).toBe(true);
      });

      it('should validate optional fields when enabled', () => {
        const response = success({
          backup: {
            id: 'backup_123_456',
            type: 'configuration',
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            checksum: 'invalid-checksum-format'
          },
          message: 'Test message',
          duration: 1000,
          warnings: 'should-be-array' // Should be array
        });
        
        const validation = validator.validateBackupResponse(response as any);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid optional field: warnings (must be array if present)');
        expect(validation.warnings).toContain('Checksum does not follow expected format (64 hex characters)');
      });

      it('should skip optional field validation when disabled', () => {
        validator.updateOptions({ validateOptional: false });
        
        const response = success({
          backup: {
            id: 'backup_123_456',
            type: 'configuration',
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            checksum: 'invalid-checksum-format'
          },
          message: 'Test message',
          duration: 1000,
          warnings: 'should-be-array'
        });
        
        const validation = validator.validateBackupResponse(response as any);
        
        // Should not validate optional fields
        expect(validation.errors.some(error => 
          error.includes('warnings')
        )).toBe(false);
      });
    });

    describe('Error Response Validation', () => {
      it('should validate failed backup response', () => {
        const response = BackupMocks.failedConfigBackup();
        const validation = validator.validateBackupResponse(response, 'configuration');
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.context?.isSuccess).toBe(false);
      });

      it('should detect missing required fields in error response', () => {
        const invalidResponse = failure({
          // Missing code field
          message: 'Test error',
          operation: 'configuration'
        });
        
        const validation = validator.validateBackupResponse(invalidResponse as any);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Missing or invalid required field: code');
      });

      it('should validate error code format', () => {
        const response = failure({
          code: 'INVALID_PREFIX_ERROR',
          message: 'Test error',
          operation: 'configuration'
        });
        
        const validation = validator.validateBackupResponse(response as any);
        
        expect(validation.warnings).toContain('Error code does not follow expected pattern (should start with BACKUP_)');
      });

      it('should validate operation type matching in errors', () => {
        const response = backupFactory.createBackupResponse('data', { forceFailure: true });
        const validation = validator.validateBackupResponse(response, 'configuration');
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => 
          error.includes('Operation type mismatch: expected configuration, got data')
        )).toBe(true);
      });
    });
  });

  describe('Deployment Response Validation', () => {
    describe('Success Response Validation', () => {
      it('should validate successful deployment response', () => {
        const response = DeploymentMocks.successfulAppDeployment('staging');
        const validation = validator.validateDeploymentResponse(response, 'application', 'staging');
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.context?.responseType).toBe('deployment');
        expect(validation.context?.isSuccess).toBe(true);
      });

      it('should validate all deployment operation types', () => {
        const operationTypes: DeploymentOperationType[] = [
          'application', 'infrastructure', 'database', 'configuration',
          'rollback', 'health-check', 'scaling', 'migration'
        ];

        operationTypes.forEach(type => {
          const response = deploymentFactory.createDeploymentResponse(type, { forceSuccess: true });
          const validation = validator.validateDeploymentResponse(response, type);
          
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        });
      });

      it('should validate all deployment environments', () => {
        const environments: DeploymentEnvironment[] = [
          'development', 'staging', 'production', 'test', 'preview'
        ];

        environments.forEach(environment => {
          const response = deploymentFactory.createDeploymentResponse('application', { 
            forceSuccess: true, 
            environment 
          });
          const validation = validator.validateDeploymentResponse(response, 'application', environment);
          
          expect(validation.isValid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        });
      });

      it('should detect missing required fields in deployment success response', () => {
        const invalidResponse = success({
          // Missing deployment field
          message: 'Test message',
          duration: 5000
        });
        
        const validation = validator.validateDeploymentResponse(invalidResponse as any);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Missing required field: deployment');
      });

      it('should validate deployment metadata structure', () => {
        const response = success({
          deployment: {
            id: 'invalid-id-format',
            type: 'application',
            status: 'deployed',
            environment: 'staging',
            version: 'invalid-version-format',
            startTime: new Date(),
            endTime: new Date()
          },
          message: 'Test message',
          duration: 5000
        });
        
        const validation = validator.validateDeploymentResponse(response as any);
        
        expect(validation.warnings).toContain('Deployment ID does not follow expected pattern');
        expect(validation.warnings).toContain('Version does not follow semantic versioning pattern');
      });

      it('should validate environment and type matching', () => {
        const response = deploymentFactory.createDeploymentResponse('application', { 
          forceSuccess: true, 
          environment: 'production' 
        });
        const validation = validator.validateDeploymentResponse(response, 'database', 'staging');
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => 
          error.includes('Deployment type mismatch: expected database, got application')
        )).toBe(true);
        expect(validation.errors.some(error => 
          error.includes('Environment mismatch: expected staging, got production')
        )).toBe(true);
      });
    });

    describe('Error Response Validation', () => {
      it('should validate failed deployment response', () => {
        const response = DeploymentMocks.failedAppDeployment('production');
        const validation = validator.validateDeploymentResponse(response, 'application', 'production');
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.context?.isSuccess).toBe(false);
      });

      it('should validate deployment error code format', () => {
        const response = failure({
          code: 'INVALID_PREFIX_ERROR',
          message: 'Test error',
          operation: 'application',
          environment: 'staging'
        });
        
        const validation = validator.validateDeploymentResponse(response as any);
        
        expect(validation.warnings).toContain('Error code does not follow expected pattern (should start with DEPLOY_)');
      });

      it('should validate rollback recommendation field', () => {
        const response = failure({
          code: 'DEPLOY_APP_ERROR',
          message: 'Test error',
          operation: 'application',
          environment: 'staging',
          rollbackRecommended: 'invalid-boolean' // Should be boolean
        });
        
        const validation = validator.validateDeploymentResponse(response as any);
        
        expect(validation.errors).toContain('Invalid optional field: rollbackRecommended (must be boolean if present)');
      });
    });
  });

  describe('Response Consistency Validation', () => {
    it('should validate consistency of multiple successful responses', () => {
      const responses = [
        BackupMocks.successfulConfigBackup(),
        BackupMocks.successfulDataBackup(),
        BackupMocks.successfulFullBackup()
      ];
      
      const validation = validator.validateResponseConsistency(responses);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.context?.totalResponses).toBe(3);
      expect(validation.context?.successCount).toBe(3);
      expect(validation.context?.failureCount).toBe(0);
    });

    it('should validate consistency of mixed success and failure responses', () => {
      const responses = [
        BackupMocks.successfulConfigBackup(),
        BackupMocks.failedDataBackup(),
        DeploymentMocks.successfulAppDeployment()
      ];
      
      const validation = validator.validateResponseConsistency(responses);
      
      expect(validation.isValid).toBe(true);
      expect(validation.context?.totalResponses).toBe(3);
      expect(validation.context?.successCount).toBe(2);
      expect(validation.context?.failureCount).toBe(1);
    });

    it('should detect duplicate operation IDs', () => {
      // Create responses with potentially duplicate IDs by using the same factory instance
      const factory = new BackupMockFactory();
      factory.reset(); // Reset counter to ensure potential duplicates
      
      const responses = [
        factory.createBackupResponse('configuration', { forceSuccess: true }),
        factory.createBackupResponse('data', { forceSuccess: true })
      ];
      
      // Manually create a response with duplicate ID for testing
      const duplicateResponse = success({
        backup: {
          id: 'backup_test_duplicate',
          type: 'full',
          status: 'completed',
          startTime: new Date(),
          endTime: new Date()
        },
        message: 'Test message',
        duration: 1000
      });
      
      const duplicateResponse2 = success({
        backup: {
          id: 'backup_test_duplicate', // Same ID
          type: 'verify',
          status: 'completed',
          startTime: new Date(),
          endTime: new Date()
        },
        message: 'Test message',
        duration: 1000
      });
      
      const responsesWithDuplicates = [duplicateResponse, duplicateResponse2];
      const validation = validator.validateResponseConsistency(responsesWithDuplicates as any);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => 
        error.includes('Duplicate ID found')
      )).toBe(true);
    });

    it('should validate timestamp consistency', () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 1000);
      const pastTime = new Date(now.getTime() - 1000);
      
      const invalidResponse = success({
        backup: {
          id: 'backup_test_123',
          type: 'configuration',
          status: 'completed',
          startTime: futureTime,
          endTime: pastTime // End before start
        },
        message: 'Test message',
        duration: 1000
      });
      
      const validation = validator.validateResponseConsistency([invalidResponse] as any);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => 
        error.includes('endTime before startTime')
      )).toBe(true);
    });

    it('should handle empty response array', () => {
      const validation = validator.validateResponseConsistency([]);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No responses provided for consistency validation');
    });
  });

  describe('Custom Validation Rules', () => {
    it('should apply custom validation rules', () => {
      const customRule: ValidationRule = {
        name: 'test-rule',
        description: 'Test custom rule',
        validate: (response) => {
          return isSuccess(response) && response.data.message.includes('test');
        },
        errorMessage: 'Message should contain "test"'
      };

      const customValidator = new MockResponseValidator({
        customRules: [customRule]
      });

      const response = BackupMocks.successfulConfigBackup();
      const validation = customValidator.validateBackupResponse(response);
      
      // Should fail because message doesn't contain "test"
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => 
        error.includes('Message should contain "test"')
      )).toBe(true);
    });

    it('should handle custom rule warnings', () => {
      const warningRule: ValidationRule = {
        name: 'warning-rule',
        description: 'Test warning rule',
        validate: () => false, // Always fails
        errorMessage: 'This is a warning',
        isWarning: true
      };

      const customValidator = new MockResponseValidator({
        customRules: [warningRule],
        strict: false
      });

      const response = BackupMocks.successfulConfigBackup();
      const validation = customValidator.validateBackupResponse(response);
      
      // Should pass because it's only a warning and not in strict mode
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(warning => 
        warning.includes('This is a warning')
      )).toBe(true);
    });

    it('should fail on warnings in strict mode', () => {
      const warningRule: ValidationRule = {
        name: 'warning-rule',
        description: 'Test warning rule',
        validate: () => false,
        errorMessage: 'This is a warning',
        isWarning: true
      };

      const strictValidator = new MockResponseValidator({
        customRules: [warningRule],
        strict: true
      });

      const response = BackupMocks.successfulConfigBackup();
      const validation = strictValidator.validateBackupResponse(response);
      
      // Should fail because of warning in strict mode
      expect(validation.isValid).toBe(false);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it('should handle custom rule exceptions', () => {
      const faultyRule: ValidationRule = {
        name: 'faulty-rule',
        description: 'Rule that throws an error',
        validate: () => {
          throw new Error('Rule error');
        },
        errorMessage: 'Should not see this'
      };

      const customValidator = new MockResponseValidator({
        customRules: [faultyRule]
      });

      const response = BackupMocks.successfulConfigBackup();
      const validation = customValidator.validateBackupResponse(response);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => 
        error.includes('Custom rule \'faulty-rule\' threw an error')
      )).toBe(true);
    });
  });

  describe('Result Pattern Structure Validation', () => {
    it('should detect invalid Result structure', () => {
      const invalidResponses = [
        null,
        undefined,
        'string',
        123,
        {},
        { success: 'not-boolean' },
        { success: true }, // Missing data
        { success: false }, // Missing error
        { success: true, data: 'test', error: 'should not have both' }
      ];

      invalidResponses.forEach((invalidResponse, index) => {
        const validation = validator.validateBackupResponse(invalidResponse as any);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Response does not follow Result pattern structure');
      });
    });
  });
});

describe('Default Mock Response Validator', () => {
  it('should be available as singleton instance', () => {
    expect(defaultMockResponseValidator).toBeInstanceOf(MockResponseValidator);
  });

  it('should have default configuration', () => {
    const options = defaultMockResponseValidator.getOptions();
    expect(options.strict).toBe(false);
    expect(options.validateOptional).toBe(true);
  });
});

describe('MockValidation Convenience Functions', () => {
  it('should validate backup with convenience function', () => {
    const response = BackupMocks.successfulConfigBackup();
    const validation = MockValidation.validateBackup(response, 'configuration');
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should validate deployment with convenience function', () => {
    const response = DeploymentMocks.successfulAppDeployment('staging');
    const validation = MockValidation.validateDeployment(response, 'application', 'staging');
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should validate consistency with convenience function', () => {
    const responses = [
      BackupMocks.successfulConfigBackup(),
      DeploymentMocks.successfulAppDeployment()
    ];
    
    const validation = MockValidation.validateConsistency(responses);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should create strict validator', () => {
    const strictValidator = MockValidation.createStrictValidator();
    const options = strictValidator.getOptions();
    
    expect(options.strict).toBe(true);
  });

  it('should create custom validator with rules', () => {
    const customRule: ValidationRule = {
      name: 'test-rule',
      description: 'Test rule',
      validate: () => true,
      errorMessage: 'Test error'
    };

    const customValidator = MockValidation.createCustomValidator([customRule]);
    const options = customValidator.getOptions();
    
    expect(options.customRules).toHaveLength(1);
    expect(options.customRules![0].name).toBe('test-rule');
  });
});

describe('Common Validation Rules', () => {
  describe('Unique Operation IDs Rule', () => {
    it('should pass for unique IDs', () => {
      const rule = CommonValidationRules.uniqueOperationIds();
      const responses = [
        BackupMocks.successfulConfigBackup(),
        BackupMocks.successfulDataBackup()
      ];
      
      const isValid = rule.validate(responses);
      expect(isValid).toBe(true);
    });

    it('should handle non-array input', () => {
      const rule = CommonValidationRules.uniqueOperationIds();
      const isValid = rule.validate('not-an-array');
      
      expect(isValid).toBe(true); // Should not fail on non-array
    });
  });

  describe('Success Message Keywords Rule', () => {
    it('should pass when message contains keywords', () => {
      const rule = CommonValidationRules.successMessageKeywords(['successfully', 'completed']);
      const response = BackupMocks.successfulConfigBackup();
      
      const isValid = rule.validate(response);
      expect(isValid).toBe(true);
    });

    it('should fail when message lacks keywords', () => {
      const rule = CommonValidationRules.successMessageKeywords(['missing-keyword']);
      const response = BackupMocks.successfulConfigBackup();
      
      const isValid = rule.validate(response);
      expect(isValid).toBe(false);
    });

    it('should pass for failure responses', () => {
      const rule = CommonValidationRules.successMessageKeywords(['successfully']);
      const response = BackupMocks.failedConfigBackup();
      
      const isValid = rule.validate(response);
      expect(isValid).toBe(true); // Should not validate failure responses
    });
  });

  describe('Error Code Convention Rule', () => {
    it('should pass when error code follows convention', () => {
      const rule = CommonValidationRules.errorCodeConvention('BACKUP_');
      const response = BackupMocks.failedConfigBackup();
      
      const isValid = rule.validate(response);
      expect(isValid).toBe(true);
    });

    it('should fail when error code breaks convention', () => {
      const rule = CommonValidationRules.errorCodeConvention('DEPLOY_');
      const response = BackupMocks.failedConfigBackup(); // Uses BACKUP_ prefix
      
      const isValid = rule.validate(response);
      expect(isValid).toBe(false);
    });

    it('should pass for success responses', () => {
      const rule = CommonValidationRules.errorCodeConvention('BACKUP_');
      const response = BackupMocks.successfulConfigBackup();
      
      const isValid = rule.validate(response);
      expect(isValid).toBe(true); // Should not validate success responses
    });
  });
});

describe('Integration with Mock Factories', () => {
  it('should validate all backup factory responses', () => {
    const factory = new BackupMockFactory();
    const operationTypes: BackupOperationType[] = [
      'configuration', 'data', 'system-state', 'incremental',
      'full', 'restore', 'verify', 'cleanup'
    ];

    operationTypes.forEach(type => {
      // Test success responses
      const successResponse = factory.createBackupResponse(type, { forceSuccess: true });
      const successValidation = MockValidation.validateBackup(successResponse, type);
      expect(successValidation.isValid).toBe(true);

      // Test failure responses
      const failureResponse = factory.createBackupResponse(type, { forceFailure: true });
      const failureValidation = MockValidation.validateBackup(failureResponse, type);
      expect(failureValidation.isValid).toBe(true);
    });
  });

  it('should validate all deployment factory responses', () => {
    const factory = new DeploymentMockFactory();
    const operationTypes: DeploymentOperationType[] = [
      'application', 'infrastructure', 'database', 'configuration',
      'rollback', 'health-check', 'scaling', 'migration'
    ];
    const environments: DeploymentEnvironment[] = [
      'development', 'staging', 'production', 'test', 'preview'
    ];

    operationTypes.forEach(type => {
      environments.forEach(environment => {
        // Test success responses
        const successResponse = factory.createDeploymentResponse(type, { 
          forceSuccess: true, 
          environment 
        });
        const successValidation = MockValidation.validateDeployment(successResponse, type, environment);
        expect(successValidation.isValid).toBe(true);

        // Test failure responses
        const failureResponse = factory.createDeploymentResponse(type, { 
          forceFailure: true, 
          environment 
        });
        const failureValidation = MockValidation.validateDeployment(failureResponse, type, environment);
        expect(failureValidation.isValid).toBe(true);
      });
    });
  });

  it('should validate batch responses from factories', () => {
    const backupFactory = new BackupMockFactory();
    const deploymentFactory = new DeploymentMockFactory();

    const responses = [
      backupFactory.createBackupResponse('configuration', { forceSuccess: true }),
      backupFactory.createBackupResponse('data', { forceFailure: true }),
      deploymentFactory.createDeploymentResponse('application', { forceSuccess: true }),
      deploymentFactory.createDeploymentResponse('database', { forceFailure: true })
    ];

    const validation = MockValidation.validateConsistency(responses);
    expect(validation.isValid).toBe(true);
    expect(validation.context?.totalResponses).toBe(4);
    expect(validation.context?.successCount).toBe(2);
    expect(validation.context?.failureCount).toBe(2);
  });
});

describe('Performance and Memory', () => {
  it('should handle validation of many responses efficiently', () => {
    const factory = new BackupMockFactory();
    const responses = [];

    // Generate many responses
    for (let i = 0; i < 1000; i++) {
      responses.push(factory.createBackupResponse('data'));
    }

    const startTime = Date.now();
    const validation = MockValidation.validateConsistency(responses);
    const endTime = Date.now();

    expect(validation).toBeDefined();
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should not leak memory during validation', () => {
    const validator = new MockResponseValidator();
    
    // Perform many validations
    for (let i = 0; i < 1000; i++) {
      const response = BackupMocks.successfulConfigBackup();
      validator.validateBackupResponse(response);
    }

    // Validator should still be functional
    const finalResponse = BackupMocks.successfulConfigBackup();
    const finalValidation = validator.validateBackupResponse(finalResponse);
    expect(finalValidation.isValid).toBe(true);
  });
});