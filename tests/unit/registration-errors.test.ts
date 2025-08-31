/**
 * Unit Tests for Registration Error Classes
 * 
 * Tests all custom error classes, their properties, methods, and utility functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnalyzerRegistrationError,
  InterfaceValidationError,
  RegistrationStateError,
  DependencyResolutionError,
  RegistrationTimeoutError,
  createRegistrationError,
  isRegistrationError,
  extractErrorInfo
} from '../../src/parser/analyzers/registration-errors';
import { 
  ValidationStatus,
  RegistrationState 
} from '../../src/parser/analyzers/enhanced-analyzer-registry';

describe('Registration Error Classes', () => {
  describe('AnalyzerRegistrationError', () => {
    it('should create error with all required properties', () => {
      const cause = new Error('Underlying issue');
      const error = new AnalyzerRegistrationError(
        'Registration failed',
        'TestAnalyzer',
        'validation',
        cause
      );

      expect(error).toBeInstanceOf(AnalyzerRegistrationError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AnalyzerRegistrationError');
      expect(error.message).toContain('TestAnalyzer');
      expect(error.message).toContain('validation');
      expect(error.message).toContain('Registration failed');
      expect(error.analyzerName).toBe('TestAnalyzer');
      expect(error.registrationPhase).toBe('validation');
      expect(error.cause).toBe(cause);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.correlationId).toMatch(/^reg_\d+_[a-z0-9]+$/);
    });

    it('should create error without cause', () => {
      const error = new AnalyzerRegistrationError(
        'Simple failure',
        'SimpleAnalyzer',
        'setup'
      );

      expect(error.cause).toBeUndefined();
      expect(error.message).toContain('SimpleAnalyzer');
      expect(error.message).toContain('setup');
    });

    it('should provide recovery suggestions', () => {
      const error = new AnalyzerRegistrationError(
        'Test error',
        'TestAnalyzer',
        'registration'
      );

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('analyzer implementation'))).toBe(true);
      expect(suggestions.some(s => s.includes('dependencies'))).toBe(true);
    });

    it('should provide structured data for logging', () => {
      const cause = new Error('Root cause');
      const error = new AnalyzerRegistrationError(
        'Test error',
        'TestAnalyzer',
        'validation',
        cause
      );

      const data = error.getStructuredData();
      expect(data.errorType).toBe('AnalyzerRegistrationError');
      expect(data.analyzerName).toBe('TestAnalyzer');
      expect(data.registrationPhase).toBe('validation');
      expect(data.message).toContain('Test error');
      expect(data.timestamp).toBeDefined();
      expect(data.correlationId).toBeDefined();
      expect(data.cause).toBeDefined();
      expect(data.cause.name).toBe('Error');
      expect(data.cause.message).toBe('Root cause');
    });

    it('should include cause in stack trace', () => {
      const cause = new Error('Root cause');
      const error = new AnalyzerRegistrationError(
        'Test error',
        'TestAnalyzer',
        'validation',
        cause
      );

      expect(error.stack).toContain('Caused by:');
      expect(error.stack).toContain('Root cause');
    });
  });

  describe('InterfaceValidationError', () => {
    it('should create error with validation details', () => {
      const validationDetails = {
        interfaceCompliance: {
          isValid: false,
          missingMethods: ['analyze', 'getCapabilities'],
          invalidMethods: ['validateInterface'],
          complianceScore: 0.3,
          details: ['Missing analyze method', 'Invalid validateInterface']
        },
        dependencyValidation: {
          isValid: true,
          missingDependencies: [],
          circularDependencies: [],
          resolutionOrder: []
        },
        capabilityValidation: {
          isValid: true,
          issues: [],
          recommendations: []
        }
      };

      const error = new InterfaceValidationError(
        'Interface validation failed',
        'BadAnalyzer',
        ['analyze', 'getCapabilities'],
        ['validateInterface'],
        validationDetails
      );

      expect(error).toBeInstanceOf(InterfaceValidationError);
      expect(error.analyzerName).toBe('BadAnalyzer');
      expect(error.registrationPhase).toBe('interface-validation');
      expect(error.missingMethods).toEqual(['analyze', 'getCapabilities']);
      expect(error.invalidMethods).toEqual(['validateInterface']);
      expect(error.validationDetails).toBe(validationDetails);
    });

    it('should provide specific recovery suggestions for missing methods', () => {
      const error = new InterfaceValidationError(
        'Missing methods',
        'IncompleteAnalyzer',
        ['analyze', 'getCapabilities'],
        []
      );

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions.some(s => s.includes('analyze, getCapabilities'))).toBe(true);
      expect(suggestions.some(s => s.includes('Implement missing methods'))).toBe(true);
    });

    it('should provide specific recovery suggestions for invalid methods', () => {
      const error = new InterfaceValidationError(
        'Invalid methods',
        'BrokenAnalyzer',
        [],
        ['validateInterface', 'analyze']
      );

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions.some(s => s.includes('validateInterface, analyze'))).toBe(true);
      expect(suggestions.some(s => s.includes('Fix invalid method implementations'))).toBe(true);
    });

    it('should include validation details in structured data', () => {
      const validationDetails = {
        interfaceCompliance: {
          isValid: false,
          missingMethods: ['analyze'],
          invalidMethods: [],
          complianceScore: 0.5,
          details: ['Missing analyze method']
        },
        dependencyValidation: {
          isValid: true,
          missingDependencies: [],
          circularDependencies: [],
          resolutionOrder: []
        },
        capabilityValidation: {
          isValid: true,
          issues: [],
          recommendations: []
        }
      };

      const error = new InterfaceValidationError(
        'Test error',
        'TestAnalyzer',
        ['analyze'],
        [],
        validationDetails
      );

      const data = error.getStructuredData();
      expect(data.missingMethods).toEqual(['analyze']);
      expect(data.invalidMethods).toEqual([]);
      expect(data.validationDetails).toBeDefined();
      expect(data.validationDetails.interfaceCompliance).toBe(validationDetails.interfaceCompliance);
    });
  });

  describe('RegistrationStateError', () => {
    it('should create error with state information', () => {
      const currentState: RegistrationState = {
        registeredAnalyzers: new Map([['Analyzer1', {} as any]]),
        registrationOrder: ['Analyzer1'],
        failedRegistrations: [],
        registrationTimestamp: new Date(),
        validationStatus: ValidationStatus.VALID,
        options: {
          validateInterfaces: true,
          allowDuplicates: false,
          failOnError: true,
          registrationTimeout: 5000,
          enableLogging: true
        }
      };

      const expectedState = {
        validationStatus: ValidationStatus.INVALID
      };

      const error = new RegistrationStateError(
        'State inconsistency detected',
        currentState,
        expectedState
      );

      expect(error).toBeInstanceOf(RegistrationStateError);
      expect(error.analyzerName).toBe('registry');
      expect(error.registrationPhase).toBe('state-management');
      expect(error.currentState).toBe(currentState);
      expect(error.expectedState).toBe(expectedState);
    });

    it('should provide state management recovery suggestions', () => {
      const currentState: RegistrationState = {
        registeredAnalyzers: new Map(),
        registrationOrder: [],
        failedRegistrations: [],
        registrationTimestamp: new Date(),
        validationStatus: ValidationStatus.PENDING,
        options: {
          validateInterfaces: true,
          allowDuplicates: false,
          failOnError: true,
          registrationTimeout: 5000,
          enableLogging: true
        }
      };

      const error = new RegistrationStateError(
        'State error',
        currentState
      );

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions.some(s => s.includes('Clear the registry'))).toBe(true);
      expect(suggestions.some(s => s.includes('concurrent registration'))).toBe(true);
    });

    it('should include state summary in structured data', () => {
      const currentState: RegistrationState = {
        registeredAnalyzers: new Map([['A1', {} as any], ['A2', {} as any]]),
        registrationOrder: ['A1', 'A2'],
        failedRegistrations: [
          {
            analyzerName: 'Failed1',
            error: 'Test error',
            timestamp: new Date(),
            retryCount: 1
          }
        ],
        registrationTimestamp: new Date(),
        validationStatus: ValidationStatus.PARTIAL,
        options: {
          validateInterfaces: true,
          allowDuplicates: false,
          failOnError: true,
          registrationTimeout: 5000,
          enableLogging: true
        }
      };

      const error = new RegistrationStateError('Test error', currentState);
      const data = error.getStructuredData();

      expect(data.currentState.registeredAnalyzersCount).toBe(2);
      expect(data.currentState.registrationOrder).toEqual(['A1', 'A2']);
      expect(data.currentState.failedRegistrationsCount).toBe(1);
      expect(data.currentState.validationStatus).toBe(ValidationStatus.PARTIAL);
    });
  });

  describe('DependencyResolutionError', () => {
    it('should create error with dependency information', () => {
      const error = new DependencyResolutionError(
        'Dependency resolution failed',
        'DependentAnalyzer',
        ['MissingDep1', 'MissingDep2'],
        ['CircularA', 'CircularB']
      );

      expect(error).toBeInstanceOf(DependencyResolutionError);
      expect(error.analyzerName).toBe('DependentAnalyzer');
      expect(error.registrationPhase).toBe('dependency-resolution');
      expect(error.missingDependencies).toEqual(['MissingDep1', 'MissingDep2']);
      expect(error.circularDependencies).toEqual(['CircularA', 'CircularB']);
    });

    it('should provide dependency-specific recovery suggestions', () => {
      const error = new DependencyResolutionError(
        'Dependencies missing',
        'TestAnalyzer',
        ['Dep1', 'Dep2'],
        ['CircA', 'CircB']
      );

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions.some(s => s.includes('Dep1, Dep2'))).toBe(true);
      expect(suggestions.some(s => s.includes('CircA -> CircB'))).toBe(true);
      expect(suggestions.some(s => s.includes('dependency order'))).toBe(true);
    });

    it('should include dependency details in structured data', () => {
      const error = new DependencyResolutionError(
        'Test error',
        'TestAnalyzer',
        ['Missing1'],
        ['Circular1']
      );

      const data = error.getStructuredData();
      expect(data.missingDependencies).toEqual(['Missing1']);
      expect(data.circularDependencies).toEqual(['Circular1']);
    });
  });

  describe('RegistrationTimeoutError', () => {
    it('should create error with timeout information', () => {
      const error = new RegistrationTimeoutError(
        'Registration timed out',
        'SlowAnalyzer',
        5000,
        6000
      );

      expect(error).toBeInstanceOf(RegistrationTimeoutError);
      expect(error.analyzerName).toBe('SlowAnalyzer');
      expect(error.registrationPhase).toBe('timeout');
      expect(error.timeoutMs).toBe(5000);
      expect(error.elapsedMs).toBe(6000);
    });

    it('should provide timeout-specific recovery suggestions', () => {
      const error = new RegistrationTimeoutError(
        'Timeout occurred',
        'SlowAnalyzer',
        1000,
        1500
      );

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions.some(s => s.includes('timeout value'))).toBe(true);
      expect(suggestions.some(s => s.includes('blocking operations'))).toBe(true);
      expect(suggestions.some(s => s.includes('asynchronously'))).toBe(true);
    });

    it('should include timeout metrics in structured data', () => {
      const error = new RegistrationTimeoutError(
        'Test timeout',
        'TestAnalyzer',
        2000,
        3000
      );

      const data = error.getStructuredData();
      expect(data.timeoutMs).toBe(2000);
      expect(data.elapsedMs).toBe(3000);
      expect(data.timeoutRatio).toBe(1.5);
    });
  });

  describe('Error Factory Function', () => {
    it('should create AnalyzerRegistrationError for registration type', () => {
      const error = createRegistrationError('registration', 'Test message', {
        analyzerName: 'TestAnalyzer',
        phase: 'setup',
        cause: new Error('Root cause')
      });

      expect(error).toBeInstanceOf(AnalyzerRegistrationError);
      expect(error.analyzerName).toBe('TestAnalyzer');
    });

    it('should create InterfaceValidationError for interface type', () => {
      const error = createRegistrationError('interface', 'Interface error', {
        analyzerName: 'BadAnalyzer',
        missingMethods: ['analyze'],
        invalidMethods: ['validate']
      });

      expect(error).toBeInstanceOf(InterfaceValidationError);
      expect((error as InterfaceValidationError).missingMethods).toEqual(['analyze']);
    });

    it('should create RegistrationStateError for state type', () => {
      const currentState: RegistrationState = {
        registeredAnalyzers: new Map(),
        registrationOrder: [],
        failedRegistrations: [],
        registrationTimestamp: new Date(),
        validationStatus: ValidationStatus.PENDING,
        options: {
          validateInterfaces: true,
          allowDuplicates: false,
          failOnError: true,
          registrationTimeout: 5000,
          enableLogging: true
        }
      };

      const error = createRegistrationError('state', 'State error', {
        currentState
      });

      expect(error).toBeInstanceOf(RegistrationStateError);
      expect((error as RegistrationStateError).currentState).toBe(currentState);
    });

    it('should create DependencyResolutionError for dependency type', () => {
      const error = createRegistrationError('dependency', 'Dependency error', {
        analyzerName: 'DepAnalyzer',
        missingDependencies: ['Dep1'],
        circularDependencies: ['Circ1']
      });

      expect(error).toBeInstanceOf(DependencyResolutionError);
      expect((error as DependencyResolutionError).missingDependencies).toEqual(['Dep1']);
    });

    it('should create RegistrationTimeoutError for timeout type', () => {
      const error = createRegistrationError('timeout', 'Timeout error', {
        analyzerName: 'SlowAnalyzer',
        timeoutMs: 1000,
        elapsedMs: 1500
      });

      expect(error).toBeInstanceOf(RegistrationTimeoutError);
      expect((error as RegistrationTimeoutError).timeoutMs).toBe(1000);
    });

    it('should default to AnalyzerRegistrationError for unknown type', () => {
      const error = createRegistrationError('unknown' as any, 'Unknown error', {
        analyzerName: 'TestAnalyzer'
      });

      expect(error).toBeInstanceOf(AnalyzerRegistrationError);
    });

    it('should handle missing context gracefully', () => {
      const error = createRegistrationError('registration', 'Test error', {});

      expect(error).toBeInstanceOf(AnalyzerRegistrationError);
      expect(error.analyzerName).toBe('unknown');
    });
  });

  describe('Type Guard Function', () => {
    it('should identify registration errors correctly', () => {
      const regError = new AnalyzerRegistrationError('test', 'analyzer', 'phase');
      const intError = new InterfaceValidationError('test', 'analyzer', [], []);
      const genericError = new Error('generic');

      expect(isRegistrationError(regError)).toBe(true);
      expect(isRegistrationError(intError)).toBe(true);
      expect(isRegistrationError(genericError)).toBe(false);
    });

    it('should handle null and undefined values', () => {
      expect(isRegistrationError(null)).toBe(false);
      expect(isRegistrationError(undefined)).toBe(false);
      expect(isRegistrationError({})).toBe(false);
      expect(isRegistrationError('string')).toBe(false);
      expect(isRegistrationError(123)).toBe(false);
    });
  });

  describe('Error Info Extraction', () => {
    it('should extract structured data from registration errors', () => {
      const error = new AnalyzerRegistrationError(
        'Test error',
        'TestAnalyzer',
        'validation'
      );

      const info = extractErrorInfo(error);
      expect(info.errorType).toBe('AnalyzerRegistrationError');
      expect(info.analyzerName).toBe('TestAnalyzer');
      expect(info.registrationPhase).toBe('validation');
      expect(info.timestamp).toBeDefined();
    });

    it('should extract basic info from generic errors', () => {
      const error = new Error('Generic error message');
      error.name = 'CustomError';

      const info = extractErrorInfo(error);
      expect(info.errorType).toBe('CustomError');
      expect(info.message).toBe('Generic error message');
      expect(info.stack).toBeDefined();
      expect(info.timestamp).toBeDefined();
    });

    it('should handle non-error values', () => {
      const info1 = extractErrorInfo('string error');
      expect(info1.errorType).toBe('UnknownError');
      expect(info1.message).toBe('string error');

      const info2 = extractErrorInfo(null);
      expect(info2.errorType).toBe('UnknownError');
      expect(info2.message).toBe('null');

      const info3 = extractErrorInfo({ custom: 'object' });
      expect(info3.errorType).toBe('UnknownError');
      expect(info3.message).toBe('[object Object]');
    });
  });

  describe('Error Inheritance and Prototype Chain', () => {
    it('should maintain proper prototype chain for instanceof checks', () => {
      const regError = new AnalyzerRegistrationError('test', 'analyzer', 'phase');
      const intError = new InterfaceValidationError('test', 'analyzer', [], []);

      expect(regError instanceof AnalyzerRegistrationError).toBe(true);
      expect(regError instanceof Error).toBe(true);
      expect(intError instanceof InterfaceValidationError).toBe(true);
      expect(intError instanceof Error).toBe(true);

      // Cross-type checks should fail
      expect(regError instanceof InterfaceValidationError).toBe(false);
      expect(intError instanceof AnalyzerRegistrationError).toBe(false);
    });

    it('should have correct error names', () => {
      const errors = [
        new AnalyzerRegistrationError('test', 'analyzer', 'phase'),
        new InterfaceValidationError('test', 'analyzer', [], []),
        new RegistrationStateError('test', {} as any),
        new DependencyResolutionError('test', 'analyzer', [], []),
        new RegistrationTimeoutError('test', 'analyzer', 1000, 1500)
      ];

      const expectedNames = [
        'AnalyzerRegistrationError',
        'InterfaceValidationError',
        'RegistrationStateError',
        'DependencyResolutionError',
        'RegistrationTimeoutError'
      ];

      errors.forEach((error, index) => {
        expect(error.name).toBe(expectedNames[index]);
      });
    });
  });
});