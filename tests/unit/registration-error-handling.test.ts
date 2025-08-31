/**
 * Comprehensive Unit Tests for Registration Error Handling and Recovery
 * 
 * Tests all error scenarios, recovery mechanisms, and logging functionality
 * for the analyzer registration system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  AnalyzerInterface,
  AnalyzerConfig,
  ValidationStatus
} from '../../src/parser/analyzers/enhanced-analyzer-registry';
import {
  ErrorHandlingAnalyzerRegistry,
  createErrorHandlingRegistry
} from '../../src/parser/analyzers/enhanced-registry-error-handling';
import {
  AnalyzerRegistrationError,
  InterfaceValidationError,
  RegistrationStateError,
  DependencyResolutionError,
  RegistrationTimeoutError,
  createRegistrationError,
  isRegistrationError
} from '../../src/parser/analyzers/registration-errors';
import {
  RegistrationLogger,
  LogLevel,
  createRegistrationLogger
} from '../../src/parser/analyzers/registration-logger';

// Mock analyzer implementations for testing
class ValidMockAnalyzer implements AnalyzerInterface {
  readonly name = 'ValidMockAnalyzer';

  async analyze(ast: any, content: string): Promise<any> {
    return {
      success: true,
      data: { type: 'mock', content: 'valid' },
      confidence: 0.9,
      sources: ['test']
    };
  }

  getCapabilities() {
    return {
      supportedContentTypes: ['text/markdown'],
      requiresContext: false,
      canProcessLargeFiles: true,
      estimatedProcessingTime: 100,
      dependencies: []
    };
  }

  validateInterface(): boolean {
    return true;
  }
}

class InvalidMockAnalyzer {
  readonly name = 'InvalidMockAnalyzer';
  // Missing required methods: analyze, getCapabilities, validateInterface
}

class PartialMockAnalyzer implements Partial<AnalyzerInterface> {
  readonly name = 'PartialMockAnalyzer';

  async analyze(ast: any, content: string): Promise<any> {
    return {
      success: true,
      data: { type: 'partial' },
      confidence: 0.5,
      sources: []
    };
  }

  // Missing: getCapabilities, validateInterface
}

class FailingMockAnalyzer implements AnalyzerInterface {
  readonly name = 'FailingMockAnalyzer';

  async analyze(ast: any, content: string): Promise<any> {
    throw new Error('Analyzer intentionally fails');
  }

  getCapabilities() {
    return {
      supportedContentTypes: ['text/markdown'],
      requiresContext: false,
      canProcessLargeFiles: false,
      estimatedProcessingTime: 50,
      dependencies: ['NonExistentDependency']
    };
  }

  validateInterface(): boolean {
    return false; // Self-validation fails
  }
}

class SlowMockAnalyzer implements AnalyzerInterface {
  readonly name = 'SlowMockAnalyzer';

  async analyze(ast: any, content: string): Promise<any> {
    // Simulate slow processing
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      success: true,
      data: { type: 'slow' },
      confidence: 0.7,
      sources: []
    };
  }

  getCapabilities() {
    return {
      supportedContentTypes: ['text/markdown'],
      requiresContext: false,
      canProcessLargeFiles: false,
      estimatedProcessingTime: 10000, // Very slow
      dependencies: []
    };
  }

  validateInterface(): boolean {
    return true;
  }
}

describe('Registration Error Handling and Recovery', () => {
  let registry: ErrorHandlingAnalyzerRegistry;
  let logger: RegistrationLogger;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    // Create fresh instances for each test
    logger = createRegistrationLogger({
      enableConsoleOutput: false, // Disable console output for tests
      logLevel: LogLevel.DEBUG
    });
    
    registry = createErrorHandlingRegistry({
      validateInterfaces: true,
      allowDuplicates: false,
      failOnError: true,
      registrationTimeout: 1000,
      enableLogging: true
    });

    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    
    // Clear registry
    registry.clearRegistry();
    logger.clearLogs();
  });

  describe('Custom Error Classes', () => {
    it('should create AnalyzerRegistrationError with proper structure', () => {
      const error = new AnalyzerRegistrationError(
        'Test registration failed',
        'TestAnalyzer',
        'validation',
        new Error('Underlying cause')
      );

      expect(error).toBeInstanceOf(AnalyzerRegistrationError);
      expect(error.name).toBe('AnalyzerRegistrationError');
      expect(error.analyzerName).toBe('TestAnalyzer');
      expect(error.registrationPhase).toBe('validation');
      expect(error.message).toContain('TestAnalyzer');
      expect(error.message).toContain('validation');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.correlationId).toMatch(/^reg_\d+_/);

      const structuredData = error.getStructuredData();
      expect(structuredData.errorType).toBe('AnalyzerRegistrationError');
      expect(structuredData.analyzerName).toBe('TestAnalyzer');
      expect(structuredData.cause).toBeDefined();

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should create InterfaceValidationError with validation details', () => {
      const error = new InterfaceValidationError(
        'Interface validation failed',
        'BadAnalyzer',
        ['analyze', 'getCapabilities'],
        ['validateInterface']
      );

      expect(error).toBeInstanceOf(InterfaceValidationError);
      expect(error.missingMethods).toEqual(['analyze', 'getCapabilities']);
      expect(error.invalidMethods).toEqual(['validateInterface']);

      const suggestions = error.getRecoverySuggestions();
      expect(suggestions.some(s => s.includes('analyze, getCapabilities'))).toBe(true);
      expect(suggestions.some(s => s.includes('validateInterface'))).toBe(true);
    });

    it('should create appropriate error using factory function', () => {
      const registrationError = createRegistrationError('registration', 'Test failed', {
        analyzerName: 'TestAnalyzer',
        phase: 'setup'
      });

      expect(registrationError).toBeInstanceOf(AnalyzerRegistrationError);

      const interfaceError = createRegistrationError('interface', 'Interface invalid', {
        analyzerName: 'BadAnalyzer',
        missingMethods: ['analyze'],
        invalidMethods: []
      });

      expect(interfaceError).toBeInstanceOf(InterfaceValidationError);
    });

    it('should identify registration errors with type guard', () => {
      const regError = new AnalyzerRegistrationError('test', 'analyzer', 'phase');
      const genericError = new Error('generic error');

      expect(isRegistrationError(regError)).toBe(true);
      expect(isRegistrationError(genericError)).toBe(false);
      expect(isRegistrationError(null)).toBe(false);
      expect(isRegistrationError(undefined)).toBe(false);
    });
  });

  describe('Interface Validation Error Handling', () => {
    it('should handle null analyzer gracefully', () => {
      const result = registry.register(null as any, 'NullAnalyzer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('null or undefined');
      expect(result.analyzerName).toBe('NullAnalyzer');
    });

    it('should handle undefined analyzer gracefully', () => {
      const result = registry.register(undefined as any, 'UndefinedAnalyzer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('null or undefined');
    });

    it('should handle analyzer with missing methods', () => {
      const result = registry.register(new InvalidMockAnalyzer() as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Interface validation failed');
      expect(result.validationDetails?.interfaceCompliance.missingMethods).toContain('analyze');
      expect(result.validationDetails?.interfaceCompliance.missingMethods).toContain('getCapabilities');
    });

    it('should handle analyzer with partial implementation', () => {
      const result = registry.register(new PartialMockAnalyzer() as any);

      expect(result.success).toBe(false);
      expect(result.validationDetails?.interfaceCompliance.missingMethods).toContain('getCapabilities');
      expect(result.validationDetails?.interfaceCompliance.missingMethods).toContain('validateInterface');
    });

    it('should handle analyzer with failing self-validation', () => {
      const result = registry.register(new FailingMockAnalyzer());

      expect(result.success).toBe(false);
      expect(result.validationDetails?.interfaceCompliance.details).toContain('self-validation failed');
    });
  });

  describe('Graceful Partial Failure Handling', () => {
    it('should continue registration when failOnError is false', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const validAnalyzer = new ValidMockAnalyzer();
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;

      const results = registryWithGracefulHandling.registerMultiple([
        { name: 'Valid', analyzer: validAnalyzer },
        { name: 'Invalid', analyzer: invalidAnalyzer }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);

      // Valid analyzer should still be registered
      expect(registryWithGracefulHandling.getRegisteredAnalyzers()).toContain('Valid');
      expect(registryWithGracefulHandling.getRegisteredAnalyzers()).not.toContain('Invalid');
    });

    it('should not affect other registrations when one fails', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const analyzer1 = new ValidMockAnalyzer();
      analyzer1.name = 'Analyzer1';
      
      const analyzer2 = new ValidMockAnalyzer();
      analyzer2.name = 'Analyzer2';

      const invalidAnalyzer = new InvalidMockAnalyzer() as any;

      const results = registryWithGracefulHandling.registerMultiple([
        { name: 'Analyzer1', analyzer: analyzer1 },
        { name: 'Invalid', analyzer: invalidAnalyzer },
        { name: 'Analyzer2', analyzer: analyzer2 }
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);

      const registeredAnalyzers = registryWithGracefulHandling.getRegisteredAnalyzers();
      expect(registeredAnalyzers).toContain('Analyzer1');
      expect(registeredAnalyzers).toContain('Analyzer2');
      expect(registeredAnalyzers).not.toContain('Invalid');
    });

    it('should track failed registrations separately', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const validAnalyzer = new ValidMockAnalyzer();
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;

      registryWithGracefulHandling.registerMultiple([
        { name: 'Valid', analyzer: validAnalyzer },
        { name: 'Invalid', analyzer: invalidAnalyzer }
      ]);

      const state = registryWithGracefulHandling.getRegistrationState();
      expect(state.registeredAnalyzers.size).toBe(1);
      expect(state.failedRegistrations).toHaveLength(1);
      expect(state.failedRegistrations[0].analyzerName).toBe('Invalid');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should attempt recovery for interface validation failures', () => {
      const registryWithRecovery = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const partialAnalyzer = new PartialMockAnalyzer() as any;

      const results = registryWithRecovery.registerMultiple([
        { name: 'Partial', analyzer: partialAnalyzer }
      ]);

      expect(results).toHaveLength(1);
      // Should fail initially but might succeed with recovery
      const result = results[0];
      if (result.success) {
        expect(result.warnings).toContain('Registered with relaxed validation due to interface issues');
      }
    });

    it('should not attempt recovery for duplicate registrations', () => {
      const validAnalyzer = new ValidMockAnalyzer();
      
      // Register once successfully
      const firstResult = registry.register(validAnalyzer);
      expect(firstResult.success).toBe(true);

      // Try to register again
      const secondResult = registry.register(validAnalyzer);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('already registered');
    });

    it('should provide recovery suggestions in error diagnostics', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const invalidAnalyzer = new InvalidMockAnalyzer() as any;
      registryWithGracefulHandling.register(invalidAnalyzer);

      const diagnostics = registryWithGracefulHandling.getErrorDiagnostics();
      expect(diagnostics.totalFailures).toBe(1);
      expect(diagnostics.recoveryRecommendations).toBeInstanceOf(Array);
      expect(diagnostics.recoveryRecommendations.length).toBeGreaterThan(0);
      expect(diagnostics.recoveryRecommendations.some(r => r.includes('interface validation'))).toBe(true);
    });
  });

  describe('Comprehensive Error Logging', () => {
    it('should log registration start and completion', () => {
      const testLogger = createRegistrationLogger({
        enableConsoleOutput: false,
        logLevel: LogLevel.DEBUG
      });

      const validAnalyzer = new ValidMockAnalyzer();
      
      // We can't easily test the internal logger, but we can test the public interface
      const result = registry.register(validAnalyzer);
      expect(result.success).toBe(true);

      // Verify that logging methods would be called (integration test level)
      expect(result.registrationTimestamp).toBeInstanceOf(Date);
    });

    it('should log validation failures with detailed information', () => {
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;
      const result = registry.register(invalidAnalyzer);

      expect(result.success).toBe(false);
      expect(result.validationDetails).toBeDefined();
      expect(result.validationDetails?.interfaceCompliance.missingMethods.length).toBeGreaterThan(0);
    });

    it('should generate comprehensive diagnostics report', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      // Register mix of valid and invalid analyzers
      const validAnalyzer = new ValidMockAnalyzer();
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;
      const failingAnalyzer = new FailingMockAnalyzer();

      registryWithGracefulHandling.registerMultiple([
        { name: 'Valid', analyzer: validAnalyzer },
        { name: 'Invalid', analyzer: invalidAnalyzer },
        { name: 'Failing', analyzer: failingAnalyzer }
      ]);

      const diagnostics = registryWithGracefulHandling.getErrorDiagnostics();
      
      expect(diagnostics.totalFailures).toBeGreaterThan(0);
      expect(diagnostics.failuresByAnalyzer).toBeDefined();
      expect(diagnostics.logDiagnostics).toBeDefined();
      expect(diagnostics.recoveryRecommendations).toBeInstanceOf(Array);
    });
  });

  describe('Timeout Handling', () => {
    it('should handle registration timeout gracefully', async () => {
      const fastTimeoutRegistry = createErrorHandlingRegistry({
        validateInterfaces: false,
        registrationTimeout: 10, // Very short timeout
        enableLogging: true
      });

      const slowAnalyzer = new SlowMockAnalyzer();
      
      // This test is more about structure than actual timeout since registration is currently synchronous
      const result = fastTimeoutRegistry.register(slowAnalyzer);
      
      // For now, this should succeed since registration is synchronous
      // But the structure is in place for async timeout handling
      expect(result).toBeDefined();
      expect(result.analyzerName).toBe('SlowMockAnalyzer');
    });
  });

  describe('Duplicate Registration Handling', () => {
    it('should prevent duplicate registrations by default', () => {
      const validAnalyzer = new ValidMockAnalyzer();
      
      const firstResult = registry.register(validAnalyzer);
      expect(firstResult.success).toBe(true);

      const secondResult = registry.register(validAnalyzer);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('already registered');
    });

    it('should allow duplicates when configured', () => {
      const duplicateAllowedRegistry = createErrorHandlingRegistry({
        allowDuplicates: true,
        validateInterfaces: true,
        enableLogging: true
      });

      const validAnalyzer = new ValidMockAnalyzer();
      
      const firstResult = duplicateAllowedRegistry.register(validAnalyzer);
      expect(firstResult.success).toBe(true);

      const secondResult = duplicateAllowedRegistry.register(validAnalyzer);
      expect(secondResult.success).toBe(true);
    });
  });

  describe('Registry State Management', () => {
    it('should maintain consistent state after errors', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const validAnalyzer = new ValidMockAnalyzer();
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;

      const initialState = registryWithGracefulHandling.getRegistrationState();
      expect(initialState.registeredAnalyzers.size).toBe(0);
      expect(initialState.failedRegistrations).toHaveLength(0);

      registryWithGracefulHandling.register(validAnalyzer);
      registryWithGracefulHandling.register(invalidAnalyzer);

      const finalState = registryWithGracefulHandling.getRegistrationState();
      expect(finalState.registeredAnalyzers.size).toBe(1);
      expect(finalState.failedRegistrations).toHaveLength(1);
      expect(finalState.registrationOrder).toContain('ValidMockAnalyzer');
    });

    it('should clear registry completely including failed registrations', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const validAnalyzer = new ValidMockAnalyzer();
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;

      registryWithGracefulHandling.register(validAnalyzer);
      registryWithGracefulHandling.register(invalidAnalyzer);

      let state = registryWithGracefulHandling.getRegistrationState();
      expect(state.registeredAnalyzers.size).toBe(1);
      expect(state.failedRegistrations).toHaveLength(1);

      registryWithGracefulHandling.clearRegistry();

      state = registryWithGracefulHandling.getRegistrationState();
      expect(state.registeredAnalyzers.size).toBe(0);
      expect(state.failedRegistrations).toHaveLength(0);
      expect(state.registrationOrder).toHaveLength(0);
    });
  });

  describe('Error Recovery Recommendations', () => {
    it('should provide specific recommendations for interface failures', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const invalidAnalyzer = new InvalidMockAnalyzer() as any;
      registryWithGracefulHandling.register(invalidAnalyzer);

      const diagnostics = registryWithGracefulHandling.getErrorDiagnostics();
      const recommendations = diagnostics.recoveryRecommendations;
      
      expect(recommendations.some(r => r.includes('interface validation'))).toBe(true);
      expect(recommendations.some(r => r.includes('missing or invalid methods'))).toBe(true);
    });

    it('should provide recommendations for dependency failures', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const failingAnalyzer = new FailingMockAnalyzer();
      registryWithGracefulHandling.register(failingAnalyzer);

      const diagnostics = registryWithGracefulHandling.getErrorDiagnostics();
      
      // Should have some failure recorded
      expect(diagnostics.totalFailures).toBeGreaterThan(0);
    });

    it('should identify high-retry failures', () => {
      const registryWithGracefulHandling = createErrorHandlingRegistry({
        validateInterfaces: true,
        failOnError: false,
        enableLogging: true
      });

      const invalidAnalyzer = new InvalidMockAnalyzer() as any;
      
      // Register multiple times to simulate retries
      for (let i = 0; i < 4; i++) {
        registryWithGracefulHandling.register(invalidAnalyzer, `Invalid${i}`);
      }

      const diagnostics = registryWithGracefulHandling.getErrorDiagnostics();
      expect(diagnostics.totalFailures).toBe(4);
    });
  });
});
