/**
 * Configuration Validation Tests
 * 
 * Comprehensive test suite for configuration validation functionality.
 * Tests schema validation, error messages, and suggestions.
 */

import { describe, it, expect } from 'vitest';
import { validateConfiguration, validateDefaults } from '../../../src/cli/config/validation';
import { CLIConfig } from '../../../src/cli/config/types';
import { DEFAULT_CONFIG } from '../../../src/cli/config/default-config';

describe('Configuration Validation', () => {
  describe('validateConfiguration', () => {
    it('should validate correct configuration', () => {
      const validConfig: CLIConfig = {
        ...DEFAULT_CONFIG
      };

      const result = validateConfiguration(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing required sections', () => {
      const invalidConfig = {
        defaults: DEFAULT_CONFIG.defaults,
        // Missing other required sections
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('templates'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('organization'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('output'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('git'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('ui'))).toBe(true);
    });

    it('should validate defaults section', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          outputDirectory: '', // Invalid: empty string
          workflowTypes: [], // Invalid: empty array
          includeComments: 'not-boolean', // Invalid: wrong type
          optimizationLevel: 'invalid' // Invalid: not in enum
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('outputDirectory'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('workflowTypes'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('includeComments'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('optimizationLevel'))).toBe(true);
    });

    it('should validate workflow types enum', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          workflowTypes: ['ci', 'invalid-type', 'cd']
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      const workflowError = result.errors.find(e => e.message.includes('invalid-type'));
      expect(workflowError).toBeDefined();
      expect(workflowError?.suggestion).toContain('ci, cd, release');
    });

    it('should validate optimization level enum', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          optimizationLevel: 'super-aggressive'
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      const optimizationError = result.errors.find(e => e.message.includes('super-aggressive'));
      expect(optimizationError).toBeDefined();
      expect(optimizationError?.suggestion).toContain('basic, standard, aggressive');
    });

    it('should validate output section', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        output: {
          format: 'xml', // Invalid: not in enum
          indentation: 0, // Invalid: below minimum
          includeMetadata: 'yes', // Invalid: wrong type
          backupExisting: 1 // Invalid: wrong type
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('xml'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('indentation'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('includeMetadata'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('backupExisting'))).toBe(true);
    });

    it('should validate indentation range', () => {
      const invalidConfigLow = {
        ...DEFAULT_CONFIG,
        output: {
          ...DEFAULT_CONFIG.output,
          indentation: 0 // Below minimum
        }
      };

      const invalidConfigHigh = {
        ...DEFAULT_CONFIG,
        output: {
          ...DEFAULT_CONFIG.output,
          indentation: 10 // Above maximum
        }
      };

      const resultLow = validateConfiguration(invalidConfigLow);
      const resultHigh = validateConfiguration(invalidConfigHigh);
      
      expect(resultLow.isValid).toBe(false);
      expect(resultHigh.isValid).toBe(false);
      expect(resultLow.errors.some(e => e.message.includes('at least 1'))).toBe(true);
      expect(resultHigh.errors.some(e => e.message.includes('at most 8'))).toBe(true);
    });

    it('should validate git section', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        git: {
          autoCommit: 'yes', // Invalid: wrong type
          commitMessage: '', // Invalid: empty string
          createPR: 1 // Invalid: wrong type
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('autoCommit'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('commitMessage'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('createPR'))).toBe(true);
    });

    it('should validate organization section with optional properties', () => {
      const validConfig = {
        ...DEFAULT_CONFIG,
        organization: {
          requiredSecurityScans: true,
          mandatorySteps: ['security-scan', 'test'],
          allowedActions: ['actions/*', '@company/*'],
          enforceBranchProtection: false,
          requireCodeReview: true
        }
      };

      const result = validateConfiguration(validConfig);
      
      expect(result.isValid).toBe(true);
    });

    it('should validate templates section with optional properties', () => {
      const validConfig = {
        ...DEFAULT_CONFIG,
        templates: {
          customTemplates: './templates',
          templateOverrides: { 'ci.yaml': { timeout: 30 } },
          organizationTemplates: '@company/templates'
        }
      };

      const result = validateConfiguration(validConfig);
      
      expect(result.isValid).toBe(true);
    });

    it('should detect additional properties', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          unknownProperty: 'value'
        },
        unknownSection: {
          someProperty: 'value'
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('unknownProperty'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('unknownSection'))).toBe(true);
    });

    it('should provide suggestions for additional properties', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          unknownProperty: 'value'
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const additionalPropError = result.errors.find(e => e.message.includes('unknownProperty'));
      expect(additionalPropError?.suggestion).toContain('Remove');
    });

    it('should validate unique items in arrays', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          workflowTypes: ['ci', 'ci', 'cd'] // Duplicate items
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('unique'))).toBe(true);
    });

    it('should validate minimum array length', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          workflowTypes: [] // Empty array
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('workflowTypes'))).toBe(true);
    });
  });

  describe('validateDefaults', () => {
    it('should validate correct defaults section', () => {
      const validDefaults = {
        outputDirectory: '.github/workflows',
        workflowTypes: ['ci', 'cd'],
        includeComments: true,
        optimizationLevel: 'standard'
      };

      const result = validateDefaults(validDefaults);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid defaults section', () => {
      const invalidDefaults = {
        outputDirectory: '',
        workflowTypes: ['invalid'],
        includeComments: 'not-boolean',
        optimizationLevel: 'invalid'
      };

      const result = validateDefaults(invalidDefaults);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should only return errors related to defaults section', () => {
      const invalidDefaults = {
        outputDirectory: '',
        workflowTypes: ['invalid'],
        includeComments: true,
        optimizationLevel: 'standard'
      };

      const result = validateDefaults(invalidDefaults);
      
      // All errors should be related to defaults path
      result.errors.forEach(error => {
        expect(error.path).toContain('/defaults');
      });
    });
  });

  describe('error message formatting', () => {
    it('should format required property errors', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          // Missing required properties
          includeComments: true
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const requiredError = result.errors.find(e => e.message.includes('Missing required property'));
      expect(requiredError).toBeDefined();
      expect(requiredError?.message).toMatch(/Missing required property '\w+'/);
    });

    it('should format type mismatch errors', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          includeComments: 'not-boolean'
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const typeError = result.errors.find(e => e.message.includes('Expected boolean'));
      expect(typeError).toBeDefined();
    });

    it('should format enum errors with allowed values', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          optimizationLevel: 'invalid'
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const enumError = result.errors.find(e => e.message.includes('Must be one of'));
      expect(enumError).toBeDefined();
      expect(enumError?.message).toContain('basic, standard, aggressive');
    });

    it('should format minimum/maximum errors', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        output: {
          ...DEFAULT_CONFIG.output,
          indentation: 0
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const minError = result.errors.find(e => e.message.includes('must be at least'));
      expect(minError).toBeDefined();
    });
  });

  describe('suggestion generation', () => {
    it('should provide workflow type suggestions', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          workflowTypes: ['invalid-type']
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const workflowError = result.errors.find(e => e.message.includes('invalid-type'));
      expect(workflowError?.suggestion).toBe('Valid workflow types are: ci, cd, release');
    });

    it('should provide optimization level suggestions', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          optimizationLevel: 'invalid'
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const optimizationError = result.errors.find(e => e.message.includes('invalid'));
      expect(optimizationError?.suggestion).toBe('Valid optimization levels are: basic, standard, aggressive');
    });

    it('should provide format suggestions', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        output: {
          ...DEFAULT_CONFIG.output,
          format: 'xml'
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const formatError = result.errors.find(e => e.message.includes('xml'));
      expect(formatError?.suggestion).toBe('Valid output formats are: yaml, json');
    });

    it('should provide required property suggestions', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          includeComments: true,
          optimizationLevel: 'standard'
          // Missing outputDirectory and workflowTypes
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const outputDirError = result.errors.find(e => e.message.includes('outputDirectory'));
      const workflowTypesError = result.errors.find(e => e.message.includes('workflowTypes'));
      
      expect(outputDirError?.suggestion).toBe('Try setting outputDirectory to ".github/workflows"');
      expect(workflowTypesError?.suggestion).toBe('Try setting workflowTypes to ["ci", "cd"]');
    });

    it('should provide type mismatch suggestions', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          workflowTypes: 'not-array'
        }
      };

      const result = validateConfiguration(invalidConfig);
      
      const typeError = result.errors.find(e => e.message.includes('workflowTypes'));
      expect(typeError?.suggestion).toBe('workflowTypes should be an array of strings, e.g., ["ci", "cd"]');
    });
  });
});