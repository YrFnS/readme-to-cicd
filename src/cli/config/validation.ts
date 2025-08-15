/**
 * Configuration Validation
 * 
 * Provides comprehensive validation for CLI configuration using AJV schema validation.
 * Includes detailed error messages and suggestions for common configuration issues.
 */

import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { CLIConfig, ConfigValidationResult, ConfigValidationError } from './types';

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// JSON Schema for CLI Configuration
const configSchema: JSONSchemaType<CLIConfig> = {
  type: 'object',
  properties: {
    defaults: {
      type: 'object',
      properties: {
        outputDirectory: { type: 'string', minLength: 1 },
        workflowTypes: {
          type: 'array',
          items: { type: 'string', enum: ['ci', 'cd', 'release'] },
          minItems: 1,
          uniqueItems: true
        },
        includeComments: { type: 'boolean' },
        optimizationLevel: { type: 'string', enum: ['basic', 'standard', 'aggressive'] }
      },
      required: ['outputDirectory', 'workflowTypes', 'includeComments', 'optimizationLevel'],
      additionalProperties: false
    },
    templates: {
      type: 'object',
      properties: {
        customTemplates: { type: 'string', nullable: true },
        templateOverrides: { type: 'object', nullable: true },
        organizationTemplates: { type: 'string', nullable: true }
      },
      required: [],
      additionalProperties: false
    },
    organization: {
      type: 'object',
      properties: {
        requiredSecurityScans: { type: 'boolean', nullable: true },
        mandatorySteps: {
          type: 'array',
          items: { type: 'string' },
          nullable: true
        },
        allowedActions: {
          type: 'array',
          items: { type: 'string' },
          nullable: true
        },
        enforceBranchProtection: { type: 'boolean', nullable: true },
        requireCodeReview: { type: 'boolean', nullable: true }
      },
      required: [],
      additionalProperties: false
    },
    output: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['yaml', 'json'] },
        indentation: { type: 'number', minimum: 1, maximum: 8 },
        includeMetadata: { type: 'boolean' },
        backupExisting: { type: 'boolean' }
      },
      required: ['format', 'indentation', 'includeMetadata', 'backupExisting'],
      additionalProperties: false
    },
    git: {
      type: 'object',
      properties: {
        autoCommit: { type: 'boolean' },
        commitMessage: { type: 'string', minLength: 1 },
        createPR: { type: 'boolean' },
        branchName: { type: 'string', nullable: true }
      },
      required: ['autoCommit', 'commitMessage', 'createPR'],
      additionalProperties: false
    },
    ui: {
      type: 'object',
      properties: {
        colorOutput: { type: 'boolean' },
        progressIndicators: { type: 'boolean' },
        verboseLogging: { type: 'boolean' },
        interactivePrompts: { type: 'boolean' }
      },
      required: ['colorOutput', 'progressIndicators', 'verboseLogging', 'interactivePrompts'],
      additionalProperties: false
    }
  },
  required: ['defaults', 'templates', 'organization', 'output', 'git', 'ui'],
  additionalProperties: false
};

const validateConfig = ajv.compile(configSchema);

/**
 * Validates a configuration object against the schema
 */
export function validateConfiguration(config: unknown): ConfigValidationResult {
  const isValid = validateConfig(config);
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationError[] = [];

  if (!isValid && validateConfig.errors) {
    for (const error of validateConfig.errors) {
      const suggestion = getSuggestion(error);
      const configError: ConfigValidationError = {
        path: error.instancePath || error.schemaPath,
        message: formatErrorMessage(error),
        value: error.data,
        ...(suggestion && { suggestion })
      };

      // Categorize as error or warning based on severity
      if (error.keyword === 'required' || error.keyword === 'type') {
        errors.push(configError);
      } else {
        warnings.push(configError);
      }
    }
  }

  return {
    isValid,
    errors,
    warnings
  };
}

/**
 * Formats AJV error messages to be more user-friendly
 */
function formatErrorMessage(error: any): string {
  const path = error.instancePath ? `at '${error.instancePath}'` : 'at root';
  
  switch (error.keyword) {
    case 'required':
      return `Missing required property '${error.params.missingProperty}' ${path}`;
    case 'type':
      return `Expected ${error.params.type} but got ${typeof error.data} ${path}`;
    case 'enum':
      return `Invalid value '${error.data}' ${path}. Must be one of: ${error.params.allowedValues.join(', ')}`;
    case 'minLength':
      return `Value ${path} must be at least ${error.params.limit} characters long`;
    case 'minimum':
      return `Value ${path} must be at least ${error.params.limit}`;
    case 'maximum':
      return `Value ${path} must be at most ${error.params.limit}`;
    case 'uniqueItems':
      return `Array ${path} must contain unique items`;
    case 'additionalProperties':
      return `Unknown property '${error.params.additionalProperty}' ${path}`;
    default:
      return `${error.message} ${path}`;
  }
}

/**
 * Provides helpful suggestions for common configuration errors
 */
function getSuggestion(error: any): string | undefined {
  switch (error.keyword) {
    case 'enum':
      if (error.instancePath.includes('workflowTypes')) {
        return 'Valid workflow types are: ci, cd, release';
      }
      if (error.instancePath.includes('optimizationLevel')) {
        return 'Valid optimization levels are: basic, standard, aggressive';
      }
      if (error.instancePath.includes('format')) {
        return 'Valid output formats are: yaml, json';
      }
      break;
    case 'required':
      if (error.params.missingProperty === 'outputDirectory') {
        return 'Try setting outputDirectory to ".github/workflows"';
      }
      if (error.params.missingProperty === 'workflowTypes') {
        return 'Try setting workflowTypes to ["ci", "cd"]';
      }
      break;
    case 'type':
      if (error.instancePath.includes('workflowTypes')) {
        return 'workflowTypes should be an array of strings, e.g., ["ci", "cd"]';
      }
      break;
    case 'additionalProperties':
      return `Remove the '${error.params.additionalProperty}' property or check for typos`;
  }
  return undefined;
}

/**
 * Validates specific configuration sections
 */
export function validateDefaults(defaults: unknown): ConfigValidationResult {
  // Create a minimal config object for validation
  const testConfig = {
    defaults,
    templates: {},
    organization: {},
    output: { format: 'yaml' as const, indentation: 2, includeMetadata: true, backupExisting: true },
    git: { autoCommit: false, commitMessage: 'test', createPR: false },
    ui: { colorOutput: true, progressIndicators: true, verboseLogging: false, interactivePrompts: true }
  };
  
  const result = validateConfiguration(testConfig);
  
  // Filter errors to only include those related to defaults
  return {
    isValid: result.errors.filter(e => e.path.startsWith('/defaults')).length === 0,
    errors: result.errors.filter(e => e.path.startsWith('/defaults')),
    warnings: result.warnings.filter(e => e.path.startsWith('/defaults'))
  };
}