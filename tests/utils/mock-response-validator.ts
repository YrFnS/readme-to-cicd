/**
 * Mock Response Validation Utilities
 * 
 * Provides validation utilities to ensure consistency and correctness of mock responses
 * across the test suite. This includes schema validation, structure validation, and
 * consistency checks for both backup and deployment mock responses.
 * 
 * These utilities help maintain reliable test behavior by validating that:
 * - Mock responses follow expected schemas
 * - Response structures are consistent across operation types
 * - Required fields are present and properly typed
 * - Error responses include appropriate recovery information
 */

import { Result, isSuccess, isFailure } from '../../src/shared/types/result';
import type { 
  BackupResult, 
  BackupError, 
  BackupOperationType,
  BackupStatus,
  BackupMetadata 
} from './backup-mock-factory';
import type { 
  DeploymentResult, 
  DeploymentError, 
  DeploymentOperationType,
  DeploymentStatus,
  DeploymentEnvironment,
  DeploymentMetadata 
} from './deployment-mock-factory';

/**
 * Validation result for mock responses
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  
  /** List of validation errors found */
  errors: string[];
  
  /** List of validation warnings */
  warnings: string[];
  
  /** Additional validation context */
  context?: Record<string, any>;
}

/**
 * Schema validation options
 */
export interface ValidationOptions {
  /** Whether to perform strict validation (fail on warnings) */
  strict: boolean;
  
  /** Whether to validate optional fields */
  validateOptional: boolean;
  
  /** Custom validation rules to apply */
  customRules?: ValidationRule[];
}

/**
 * Custom validation rule interface
 */
export interface ValidationRule {
  /** Name of the validation rule */
  name: string;
  
  /** Description of what the rule validates */
  description: string;
  
  /** Validation function that returns true if valid */
  validate: (data: any) => boolean;
  
  /** Error message to show if validation fails */
  errorMessage: string;
  
  /** Whether this rule is a warning (true) or error (false) */
  isWarning?: boolean;
}

/**
 * Default validation options
 */
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  strict: false,
  validateOptional: true,
  customRules: []
};

/**
 * Mock Response Validator Class
 * 
 * Provides comprehensive validation for mock responses to ensure consistency
 * and correctness across the test suite.
 */
export class MockResponseValidator {
  private options: ValidationOptions;

  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  }

  /**
   * Validate a backup mock response
   * 
   * @param response The backup mock response to validate
   * @param expectedType Optional expected operation type
   * @returns Validation result with errors and warnings
   */
  validateBackupResponse(
    response: Result<BackupResult, BackupError>,
    expectedType?: BackupOperationType
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Result structure
    if (!this.isValidResultStructure(response)) {
      errors.push('Response does not follow Result pattern structure');
      return { isValid: false, errors, warnings };
    }

    if (isSuccess(response)) {
      const validation = this.validateBackupSuccessResponse(response.data, expectedType);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    } else if (isFailure(response)) {
      const validation = this.validateBackupErrorResponse(response.error, expectedType);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    // Apply custom validation rules
    if (this.options.customRules) {
      const customValidation = this.applyCustomRules(response, this.options.customRules);
      errors.push(...customValidation.errors);
      warnings.push(...customValidation.warnings);
    }

    const isValid = errors.length === 0 && (!this.options.strict || warnings.length === 0);

    return {
      isValid,
      errors,
      warnings,
      context: {
        responseType: 'backup',
        isSuccess: isSuccess(response),
        expectedType
      }
    };
  }

  /**
   * Validate a deployment mock response
   * 
   * @param response The deployment mock response to validate
   * @param expectedType Optional expected operation type
   * @param expectedEnvironment Optional expected environment
   * @returns Validation result with errors and warnings
   */
  validateDeploymentResponse(
    response: Result<DeploymentResult, DeploymentError>,
    expectedType?: DeploymentOperationType,
    expectedEnvironment?: DeploymentEnvironment
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Result structure
    if (!this.isValidResultStructure(response)) {
      errors.push('Response does not follow Result pattern structure');
      return { isValid: false, errors, warnings };
    }

    if (isSuccess(response)) {
      const validation = this.validateDeploymentSuccessResponse(
        response.data, 
        expectedType, 
        expectedEnvironment
      );
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    } else if (isFailure(response)) {
      const validation = this.validateDeploymentErrorResponse(
        response.error, 
        expectedType, 
        expectedEnvironment
      );
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    // Apply custom validation rules
    if (this.options.customRules) {
      const customValidation = this.applyCustomRules(response, this.options.customRules);
      errors.push(...customValidation.errors);
      warnings.push(...customValidation.warnings);
    }

    const isValid = errors.length === 0 && (!this.options.strict || warnings.length === 0);

    return {
      isValid,
      errors,
      warnings,
      context: {
        responseType: 'deployment',
        isSuccess: isSuccess(response),
        expectedType,
        expectedEnvironment
      }
    };
  }

  /**
   * Validate multiple mock responses for consistency
   * 
   * @param responses Array of mock responses to validate
   * @returns Validation result for the entire set
   */
  validateResponseConsistency(
    responses: Array<Result<BackupResult | DeploymentResult, BackupError | DeploymentError>>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (responses.length === 0) {
      errors.push('No responses provided for consistency validation');
      return { isValid: false, errors, warnings };
    }

    // Check that all responses follow the same pattern
    const successCount = responses.filter(isSuccess).length;
    const failureCount = responses.filter(isFailure).length;

    if (successCount > 0 && failureCount > 0) {
      // Mixed results are okay, but validate structure consistency
      const structureValidation = this.validateStructureConsistency(responses);
      errors.push(...structureValidation.errors);
      warnings.push(...structureValidation.warnings);
    }

    // Validate ID uniqueness for successful responses
    const successResponses = responses.filter(isSuccess);
    if (successResponses.length > 1) {
      const idValidation = this.validateIdUniqueness(successResponses);
      errors.push(...idValidation.errors);
      warnings.push(...idValidation.warnings);
    }

    // Validate timestamp consistency
    const timestampValidation = this.validateTimestampConsistency(successResponses);
    errors.push(...timestampValidation.errors);
    warnings.push(...timestampValidation.warnings);

    const isValid = errors.length === 0 && (!this.options.strict || warnings.length === 0);

    return {
      isValid,
      errors,
      warnings,
      context: {
        totalResponses: responses.length,
        successCount,
        failureCount
      }
    };
  }

  /**
   * Validate backup success response structure and content
   */
  private validateBackupSuccessResponse(
    result: BackupResult,
    expectedType?: BackupOperationType
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!result.backup) {
      errors.push('Missing required field: backup');
    } else {
      const metadataValidation = this.validateBackupMetadata(result.backup, expectedType);
      errors.push(...metadataValidation.errors);
      warnings.push(...metadataValidation.warnings);
    }

    if (!result.message || typeof result.message !== 'string') {
      errors.push('Missing or invalid required field: message');
    }

    if (typeof result.duration !== 'number' || result.duration < 0) {
      errors.push('Missing or invalid required field: duration (must be non-negative number)');
    }

    // Validate optional fields if present
    if (this.options.validateOptional) {
      if (result.warnings && !Array.isArray(result.warnings)) {
        errors.push('Invalid optional field: warnings (must be array if present)');
      } else if (result.warnings && Array.isArray(result.warnings)) {
        result.warnings.forEach((warning, index) => {
          if (typeof warning !== 'string') {
            errors.push(`Invalid warning at index ${index}: must be string`);
          }
        });
      }
    }

    // Validate message content matches operation type
    if (expectedType && result.message) {
      if (!result.message.toLowerCase().includes('completed successfully')) {
        warnings.push('Success message does not contain expected success indicator');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate backup error response structure and content
   */
  private validateBackupErrorResponse(
    error: BackupError,
    expectedType?: BackupOperationType
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!error.code || typeof error.code !== 'string') {
      errors.push('Missing or invalid required field: code');
    } else if (!error.code.startsWith('BACKUP_')) {
      warnings.push('Error code does not follow expected pattern (should start with BACKUP_)');
    }

    if (!error.message || typeof error.message !== 'string') {
      errors.push('Missing or invalid required field: message');
    }

    if (!error.operation || typeof error.operation !== 'string') {
      errors.push('Missing or invalid required field: operation');
    } else if (expectedType && error.operation !== expectedType) {
      errors.push(`Operation type mismatch: expected ${expectedType}, got ${error.operation}`);
    }

    // Validate optional fields if present
    if (this.options.validateOptional) {
      if (error.context && typeof error.context !== 'object') {
        errors.push('Invalid optional field: context (must be object if present)');
      }

      if (error.suggestions) {
        if (!Array.isArray(error.suggestions)) {
          errors.push('Invalid optional field: suggestions (must be array if present)');
        } else {
          error.suggestions.forEach((suggestion, index) => {
            if (typeof suggestion !== 'string') {
              errors.push(`Invalid suggestion at index ${index}: must be string`);
            }
          });
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate deployment success response structure and content
   */
  private validateDeploymentSuccessResponse(
    result: DeploymentResult,
    expectedType?: DeploymentOperationType,
    expectedEnvironment?: DeploymentEnvironment
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!result.deployment) {
      errors.push('Missing required field: deployment');
    } else {
      const metadataValidation = this.validateDeploymentMetadata(
        result.deployment, 
        expectedType, 
        expectedEnvironment
      );
      errors.push(...metadataValidation.errors);
      warnings.push(...metadataValidation.warnings);
    }

    if (!result.message || typeof result.message !== 'string') {
      errors.push('Missing or invalid required field: message');
    }

    if (typeof result.duration !== 'number' || result.duration < 0) {
      errors.push('Missing or invalid required field: duration (must be non-negative number)');
    }

    // Validate optional fields if present
    if (this.options.validateOptional) {
      if (result.warnings && !Array.isArray(result.warnings)) {
        errors.push('Invalid optional field: warnings (must be array if present)');
      }

      if (result.artifacts && !Array.isArray(result.artifacts)) {
        errors.push('Invalid optional field: artifacts (must be array if present)');
      } else if (result.artifacts && Array.isArray(result.artifacts)) {
        result.artifacts.forEach((artifact, index) => {
          if (typeof artifact !== 'string') {
            errors.push(`Invalid artifact at index ${index}: must be string`);
          }
        });
      }
    }

    // Validate message content matches operation and environment
    if (expectedType && expectedEnvironment && result.message) {
      if (!result.message.toLowerCase().includes('successfully')) {
        warnings.push('Success message does not contain expected success indicator');
      }
      if (!result.message.toLowerCase().includes(expectedEnvironment)) {
        warnings.push(`Success message does not mention expected environment: ${expectedEnvironment}`);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate deployment error response structure and content
   */
  private validateDeploymentErrorResponse(
    error: DeploymentError,
    expectedType?: DeploymentOperationType,
    expectedEnvironment?: DeploymentEnvironment
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!error.code || typeof error.code !== 'string') {
      errors.push('Missing or invalid required field: code');
    } else if (!error.code.startsWith('DEPLOY_')) {
      warnings.push('Error code does not follow expected pattern (should start with DEPLOY_)');
    }

    if (!error.message || typeof error.message !== 'string') {
      errors.push('Missing or invalid required field: message');
    }

    if (!error.operation || typeof error.operation !== 'string') {
      errors.push('Missing or invalid required field: operation');
    } else if (expectedType && error.operation !== expectedType) {
      errors.push(`Operation type mismatch: expected ${expectedType}, got ${error.operation}`);
    }

    if (!error.environment || typeof error.environment !== 'string') {
      errors.push('Missing or invalid required field: environment');
    } else if (expectedEnvironment && error.environment !== expectedEnvironment) {
      errors.push(`Environment mismatch: expected ${expectedEnvironment}, got ${error.environment}`);
    }

    // Validate optional fields if present
    if (this.options.validateOptional) {
      if (error.context && typeof error.context !== 'object') {
        errors.push('Invalid optional field: context (must be object if present)');
      }

      if (error.suggestions) {
        if (!Array.isArray(error.suggestions)) {
          errors.push('Invalid optional field: suggestions (must be array if present)');
        } else {
          error.suggestions.forEach((suggestion, index) => {
            if (typeof suggestion !== 'string') {
              errors.push(`Invalid suggestion at index ${index}: must be string`);
            }
          });
        }
      }

      if (error.rollbackRecommended !== undefined && typeof error.rollbackRecommended !== 'boolean') {
        errors.push('Invalid optional field: rollbackRecommended (must be boolean if present)');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate backup metadata structure and content
   */
  private validateBackupMetadata(
    metadata: BackupMetadata,
    expectedType?: BackupOperationType
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!metadata.id || typeof metadata.id !== 'string') {
      errors.push('Missing or invalid metadata field: id');
    } else if (!metadata.id.match(/^backup_[a-z0-9]+_[a-z0-9]+$/)) {
      warnings.push('Backup ID does not follow expected pattern');
    }

    if (!metadata.type || typeof metadata.type !== 'string') {
      errors.push('Missing or invalid metadata field: type');
    } else if (expectedType && metadata.type !== expectedType) {
      errors.push(`Backup type mismatch: expected ${expectedType}, got ${metadata.type}`);
    }

    if (!metadata.status || typeof metadata.status !== 'string') {
      errors.push('Missing or invalid metadata field: status');
    }

    if (!metadata.startTime || !(metadata.startTime instanceof Date)) {
      errors.push('Missing or invalid metadata field: startTime (must be Date)');
    }

    // Validate optional fields if present
    if (this.options.validateOptional) {
      if (metadata.endTime && !(metadata.endTime instanceof Date)) {
        errors.push('Invalid metadata field: endTime (must be Date if present)');
      }

      if (metadata.endTime && metadata.startTime && metadata.endTime < metadata.startTime) {
        errors.push('Invalid metadata: endTime cannot be before startTime');
      }

      if (metadata.size !== undefined && (typeof metadata.size !== 'number' || metadata.size < 0)) {
        errors.push('Invalid metadata field: size (must be non-negative number if present)');
      }

      if (metadata.location && typeof metadata.location !== 'string') {
        errors.push('Invalid metadata field: location (must be string if present)');
      }

      if (metadata.checksum && typeof metadata.checksum !== 'string') {
        errors.push('Invalid metadata field: checksum (must be string if present)');
      } else if (metadata.checksum && !metadata.checksum.match(/^[0-9a-f]{64}$/)) {
        warnings.push('Checksum does not follow expected format (64 hex characters)');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate deployment metadata structure and content
   */
  private validateDeploymentMetadata(
    metadata: DeploymentMetadata,
    expectedType?: DeploymentOperationType,
    expectedEnvironment?: DeploymentEnvironment
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!metadata.id || typeof metadata.id !== 'string') {
      errors.push('Missing or invalid metadata field: id');
    } else if (!metadata.id.match(/^deploy_[a-z0-9]+_[a-z0-9]+$/)) {
      warnings.push('Deployment ID does not follow expected pattern');
    }

    if (!metadata.type || typeof metadata.type !== 'string') {
      errors.push('Missing or invalid metadata field: type');
    } else if (expectedType && metadata.type !== expectedType) {
      errors.push(`Deployment type mismatch: expected ${expectedType}, got ${metadata.type}`);
    }

    if (!metadata.status || typeof metadata.status !== 'string') {
      errors.push('Missing or invalid metadata field: status');
    }

    if (!metadata.environment || typeof metadata.environment !== 'string') {
      errors.push('Missing or invalid metadata field: environment');
    } else if (expectedEnvironment && metadata.environment !== expectedEnvironment) {
      errors.push(`Environment mismatch: expected ${expectedEnvironment}, got ${metadata.environment}`);
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Missing or invalid metadata field: version');
    } else if (!metadata.version.match(/^\d+\.\d+\.\d+$/)) {
      warnings.push('Version does not follow semantic versioning pattern');
    }

    if (!metadata.startTime || !(metadata.startTime instanceof Date)) {
      errors.push('Missing or invalid metadata field: startTime (must be Date)');
    }

    // Validate optional fields if present
    if (this.options.validateOptional) {
      if (metadata.endTime && !(metadata.endTime instanceof Date)) {
        errors.push('Invalid metadata field: endTime (must be Date if present)');
      }

      if (metadata.endTime && metadata.startTime && metadata.endTime < metadata.startTime) {
        errors.push('Invalid metadata: endTime cannot be before startTime');
      }

      if (metadata.buildId && typeof metadata.buildId !== 'string') {
        errors.push('Invalid metadata field: buildId (must be string if present)');
      } else if (metadata.buildId && !metadata.buildId.match(/^[a-f0-9]{8}$/)) {
        warnings.push('Build ID does not follow expected format (8 hex characters)');
      }

      if (metadata.deploymentUrl && typeof metadata.deploymentUrl !== 'string') {
        errors.push('Invalid metadata field: deploymentUrl (must be string if present)');
      } else if (metadata.deploymentUrl && !metadata.deploymentUrl.startsWith('https://')) {
        warnings.push('Deployment URL should use HTTPS');
      }

      if (metadata.healthCheckUrl && typeof metadata.healthCheckUrl !== 'string') {
        errors.push('Invalid metadata field: healthCheckUrl (must be string if present)');
      } else if (metadata.healthCheckUrl && !metadata.healthCheckUrl.startsWith('https://')) {
        warnings.push('Health check URL should use HTTPS');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate that a response follows the Result pattern structure
   */
  private isValidResultStructure(response: any): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    if (typeof response.success !== 'boolean') {
      return false;
    }

    if (response.success) {
      return response.data !== undefined && response.error === undefined;
    } else {
      return response.error !== undefined && response.data === undefined;
    }
  }

  /**
   * Apply custom validation rules to a response
   */
  private applyCustomRules(
    response: any,
    rules: ValidationRule[]
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    rules.forEach(rule => {
      try {
        const isValid = rule.validate(response);
        if (!isValid) {
          if (rule.isWarning) {
            warnings.push(`${rule.name}: ${rule.errorMessage}`);
          } else {
            errors.push(`${rule.name}: ${rule.errorMessage}`);
          }
        }
      } catch (error) {
        errors.push(`Custom rule '${rule.name}' threw an error: ${error}`);
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate structure consistency across multiple responses
   */
  private validateStructureConsistency(
    responses: Array<Result<any, any>>
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check that all responses have consistent structure
    const firstResponse = responses[0];
    const firstIsSuccess = isSuccess(firstResponse);

    responses.forEach((response, index) => {
      if (!this.isValidResultStructure(response)) {
        errors.push(`Response at index ${index} does not follow Result pattern`);
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate ID uniqueness across successful responses
   */
  private validateIdUniqueness(
    responses: Array<{ success: true; data: any }>
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const ids = new Set<string>();
    const duplicateIds = new Set<string>();

    responses.forEach((response, index) => {
      const data = response.data;
      let id: string | undefined;

      // Extract ID from backup or deployment metadata
      if (data.backup?.id) {
        id = data.backup.id;
      } else if (data.deployment?.id) {
        id = data.deployment.id;
      }

      if (id) {
        if (ids.has(id)) {
          duplicateIds.add(id);
          errors.push(`Duplicate ID found at index ${index}: ${id}`);
        } else {
          ids.add(id);
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Validate timestamp consistency across responses
   */
  private validateTimestampConsistency(
    responses: Array<{ success: true; data: any }>
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    responses.forEach((response, index) => {
      const data = response.data;
      let startTime: Date | undefined;
      let endTime: Date | undefined;

      // Extract timestamps from backup or deployment metadata
      if (data.backup) {
        startTime = data.backup.startTime;
        endTime = data.backup.endTime;
      } else if (data.deployment) {
        startTime = data.deployment.startTime;
        endTime = data.deployment.endTime;
      }

      if (startTime && endTime && endTime < startTime) {
        errors.push(`Response at index ${index} has endTime before startTime`);
      }

      // Check if timestamps are reasonable (not too far in the future or past)
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      if (startTime && (startTime < oneHourAgo || startTime > oneHourFromNow)) {
        warnings.push(`Response at index ${index} has startTime outside reasonable range`);
      }
    });

    return { errors, warnings };
  }

  /**
   * Update validation options
   */
  updateOptions(newOptions: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current validation options
   */
  getOptions(): ValidationOptions {
    return { ...this.options };
  }
}

/**
 * Default instance of the mock response validator
 * Can be used directly for simple validation scenarios
 */
export const defaultMockResponseValidator = new MockResponseValidator();

/**
 * Convenience functions for common validation scenarios
 */
export const MockValidation = {
  /**
   * Validate a backup response with default settings
   */
  validateBackup: (response: Result<BackupResult, BackupError>, expectedType?: BackupOperationType) =>
    defaultMockResponseValidator.validateBackupResponse(response, expectedType),

  /**
   * Validate a deployment response with default settings
   */
  validateDeployment: (
    response: Result<DeploymentResult, DeploymentError>,
    expectedType?: DeploymentOperationType,
    expectedEnvironment?: DeploymentEnvironment
  ) => defaultMockResponseValidator.validateDeploymentResponse(response, expectedType, expectedEnvironment),

  /**
   * Validate response consistency with default settings
   */
  validateConsistency: (
    responses: Array<Result<BackupResult | DeploymentResult, BackupError | DeploymentError>>
  ) => defaultMockResponseValidator.validateResponseConsistency(responses),

  /**
   * Create a strict validator (fails on warnings)
   */
  createStrictValidator: () => new MockResponseValidator({ strict: true }),

  /**
   * Create a validator with custom rules
   */
  createCustomValidator: (rules: ValidationRule[]) => 
    new MockResponseValidator({ customRules: rules })
};

/**
 * Common validation rules that can be reused
 */
export const CommonValidationRules = {
  /**
   * Rule to ensure operation IDs are unique within a batch
   */
  uniqueOperationIds: (): ValidationRule => ({
    name: 'unique-operation-ids',
    description: 'Ensures operation IDs are unique within a batch of responses',
    validate: (responses: any[]) => {
      if (!Array.isArray(responses)) return true;
      
      const ids = new Set<string>();
      for (const response of responses) {
        if (isSuccess(response)) {
          const id = response.data.backup?.id || response.data.deployment?.id;
          if (id) {
            if (ids.has(id)) return false;
            ids.add(id);
          }
        }
      }
      return true;
    },
    errorMessage: 'Duplicate operation IDs found in response batch'
  }),

  /**
   * Rule to ensure success messages contain expected keywords
   */
  successMessageKeywords: (keywords: string[]): ValidationRule => ({
    name: 'success-message-keywords',
    description: 'Ensures success messages contain expected keywords',
    validate: (response: any) => {
      if (!isSuccess(response)) return true;
      
      const message = response.data.message?.toLowerCase() || '';
      return keywords.some(keyword => message.includes(keyword.toLowerCase()));
    },
    errorMessage: `Success message should contain one of: ${keywords.join(', ')}`,
    isWarning: true
  }),

  /**
   * Rule to ensure error codes follow naming conventions
   */
  errorCodeConvention: (prefix: string): ValidationRule => ({
    name: 'error-code-convention',
    description: `Ensures error codes start with ${prefix}`,
    validate: (response: any) => {
      if (!isFailure(response)) return true;
      
      return response.error.code?.startsWith(prefix) || false;
    },
    errorMessage: `Error codes should start with ${prefix}`,
    isWarning: true
  })
};