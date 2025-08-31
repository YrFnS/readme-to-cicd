/**
 * Unit tests for Enhanced Analyzer Registry System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EnhancedAnalyzerRegistry,
  RegistrationValidator,
  AnalyzerInterface,
  AnalyzerConfig,
  RegistrationResult,
  ValidationStatus,
  createAnalyzerRegistry,
  createAnalyzerConfig
} from '../../src/parser/analyzers/enhanced-analyzer-registry';
import { AnalyzerResult } from '../../src/parser/types';

// Mock analyzer for testing
class MockAnalyzer implements AnalyzerInterface {
  readonly name = 'MockAnalyzer';

  async analyze(ast: any, content: string, context?: any): Promise<AnalyzerResult> {
    return {
      success: true,
      data: { mock: true },
      confidence: 0.9
    };
  }

  getCapabilities() {
    return {
      supportedContentTypes: ['markdown'],
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

// Invalid analyzer for testing validation
class InvalidAnalyzer {
  readonly name = 'InvalidAnalyzer';
  // Missing required methods
}

// Analyzer with invalid method signatures
class BadSignatureAnalyzer implements Partial<AnalyzerInterface> {
  readonly name = 'BadSignatureAnalyzer';

  // Wrong signature - should be async and return Promise<AnalyzerResult>
  analyze(oneParam: any) {
    return { data: 'bad' };
  }

  getCapabilities() {
    return null; // Invalid return type
  }

  validateInterface() {
    return 'not a boolean'; // Wrong return type
  }
}

describe('EnhancedAnalyzerRegistry', () => {
  let registry: EnhancedAnalyzerRegistry;
  let mockAnalyzer: MockAnalyzer;

  beforeEach(() => {
    registry = new EnhancedAnalyzerRegistry();
    mockAnalyzer = new MockAnalyzer();
  });

  describe('constructor', () => {
    it('should create registry with default options', () => {
      const newRegistry = new EnhancedAnalyzerRegistry();
      const state = newRegistry.getRegistrationState();
      
      expect(state.registeredAnalyzers.size).toBe(0);
      expect(state.registrationOrder).toEqual([]);
      expect(state.failedRegistrations).toEqual([]);
      expect(state.validationStatus).toBe(ValidationStatus.PENDING);
      expect(state.options.validateInterfaces).toBe(true);
      expect(state.options.allowDuplicates).toBe(false);
    });

    it('should create registry with custom options', () => {
      const customRegistry = new EnhancedAnalyzerRegistry({
        validateInterfaces: false,
        allowDuplicates: true,
        enableLogging: false
      });
      const state = customRegistry.getRegistrationState();
      
      expect(state.options.validateInterfaces).toBe(false);
      expect(state.options.allowDuplicates).toBe(true);
      expect(state.options.enableLogging).toBe(false);
    });
  });

  describe('register', () => {
    it('should successfully register a valid analyzer', () => {
      const result = registry.register(mockAnalyzer);
      
      expect(result.success).toBe(true);
      expect(result.analyzerName).toBe('MockAnalyzer');
      expect(result.error).toBeUndefined();
      expect(result.registrationTimestamp).toBeInstanceOf(Date);
      expect(result.validationDetails).toBeDefined();
    });

    it('should register analyzer with custom name', () => {
      const result = registry.register(mockAnalyzer, 'CustomName');
      
      expect(result.success).toBe(true);
      expect(result.analyzerName).toBe('CustomName');
      expect(registry.getRegisteredAnalyzers()).toContain('CustomName');
    });

    it('should prevent duplicate registration by default', () => {
      registry.register(mockAnalyzer);
      const result = registry.register(mockAnalyzer);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('should allow duplicate registration when enabled', () => {
      registry.setRegistrationOptions({ allowDuplicates: true });
      
      registry.register(mockAnalyzer);
      const result = registry.register(mockAnalyzer);
      
      expect(result.success).toBe(true);
    });

    it('should handle registration errors gracefully', () => {
      const faultyAnalyzer = {
        name: 'FaultyAnalyzer',
        analyze: () => { throw new Error('Test error'); },
        getCapabilities: () => { throw new Error('Capability error'); },
        validateInterface: () => { throw new Error('Validation error'); }
      };

      const result = registry.register(faultyAnalyzer as any);
      
      // Should still register but with warnings
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
    });

    it('should fail registration with failOnError option', () => {
      registry.setRegistrationOptions({ failOnError: true });
      const invalidAnalyzer = new InvalidAnalyzer();
      
      const result = registry.register(invalidAnalyzer as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Interface validation failed');
    });
  });

  describe('registerMultiple', () => {
    it('should register multiple analyzers successfully', () => {
      const analyzer1 = new MockAnalyzer();
      const analyzer2 = { ...new MockAnalyzer(), name: 'MockAnalyzer2' };
      
      const configs: AnalyzerConfig[] = [
        createAnalyzerConfig(analyzer1),
        createAnalyzerConfig(analyzer2 as AnalyzerInterface)
      ];
      
      const results = registry.registerMultiple(configs);
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(registry.getRegisteredAnalyzers()).toHaveLength(2);
    });

    it('should respect priority ordering', () => {
      const analyzer1 = new MockAnalyzer();
      const analyzer2 = { ...new MockAnalyzer(), name: 'HighPriorityAnalyzer' };
      
      const configs: AnalyzerConfig[] = [
        createAnalyzerConfig(analyzer1, { priority: 1 }),
        createAnalyzerConfig(analyzer2 as AnalyzerInterface, { priority: 10 })
      ];
      
      const results = registry.registerMultiple(configs);
      const state = registry.getRegistrationState();
      
      // Higher priority should be registered first
      expect(state.registrationOrder[0]).toBe('HighPriorityAnalyzer');
      expect(state.registrationOrder[1]).toBe('MockAnalyzer');
    });

    it('should skip disabled analyzers', () => {
      const analyzer1 = new MockAnalyzer();
      const analyzer2 = { ...new MockAnalyzer(), name: 'DisabledAnalyzer' };
      
      const configs: AnalyzerConfig[] = [
        createAnalyzerConfig(analyzer1),
        createAnalyzerConfig(analyzer2 as AnalyzerInterface, { enabled: false })
      ];
      
      const results = registry.registerMultiple(configs);
      
      expect(results).toHaveLength(1);
      expect(registry.getRegisteredAnalyzers()).toHaveLength(1);
      expect(registry.getRegisteredAnalyzers()).not.toContain('DisabledAnalyzer');
    });
  });

  describe('getRegisteredAnalyzers', () => {
    it('should return empty array when no analyzers registered', () => {
      expect(registry.getRegisteredAnalyzers()).toEqual([]);
    });

    it('should return list of registered analyzer names', () => {
      registry.register(mockAnalyzer);
      registry.register(mockAnalyzer, 'CustomName');
      
      const names = registry.getRegisteredAnalyzers();
      expect(names).toContain('MockAnalyzer');
      expect(names).toContain('CustomName');
      expect(names).toHaveLength(2);
    });
  });

  describe('getAnalyzer', () => {
    it('should return null for non-existent analyzer', () => {
      expect(registry.getAnalyzer('NonExistent')).toBeNull();
    });

    it('should return analyzer instance for registered analyzer', () => {
      registry.register(mockAnalyzer);
      
      const retrieved = registry.getAnalyzer('MockAnalyzer');
      expect(retrieved).toBe(mockAnalyzer);
    });
  });

  describe('validateRegistration', () => {
    it('should validate empty registry', () => {
      const result = registry.validateRegistration();
      
      expect(result.isValid).toBe(true);
      expect(result.totalAnalyzers).toBe(0);
      expect(result.validAnalyzers).toBe(0);
      expect(result.recommendations).toContain('No analyzers registered');
    });

    it('should validate registry with valid analyzers', () => {
      registry.register(mockAnalyzer);
      
      const result = registry.validateRegistration();
      
      expect(result.isValid).toBe(true);
      expect(result.totalAnalyzers).toBe(1);
      expect(result.validAnalyzers).toBe(1);
      expect(result.invalidAnalyzers).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify invalid analyzers', () => {
      registry.setRegistrationOptions({ failOnError: false });
      registry.register(new InvalidAnalyzer() as any);
      
      const result = registry.validateRegistration();
      
      expect(result.isValid).toBe(false);
      expect(result.totalAnalyzers).toBe(1);
      expect(result.validAnalyzers).toBe(0);
      expect(result.invalidAnalyzers).toBe(1);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('clearRegistry', () => {
    it('should clear all registered analyzers', () => {
      registry.register(mockAnalyzer);
      expect(registry.getRegisteredAnalyzers()).toHaveLength(1);
      
      registry.clearRegistry();
      
      expect(registry.getRegisteredAnalyzers()).toHaveLength(0);
      const state = registry.getRegistrationState();
      expect(state.registrationOrder).toEqual([]);
      expect(state.failedRegistrations).toEqual([]);
      expect(state.validationStatus).toBe(ValidationStatus.PENDING);
    });
  });

  describe('setRegistrationOptions', () => {
    it('should update registration options', () => {
      registry.setRegistrationOptions({
        validateInterfaces: false,
        allowDuplicates: true
      });
      
      const state = registry.getRegistrationState();
      expect(state.options.validateInterfaces).toBe(false);
      expect(state.options.allowDuplicates).toBe(true);
      // Other options should remain unchanged
      expect(state.options.failOnError).toBe(false);
    });
  });
});

describe('RegistrationValidator', () => {
  let validator: RegistrationValidator;
  let mockAnalyzer: MockAnalyzer;

  beforeEach(() => {
    validator = new RegistrationValidator();
    mockAnalyzer = new MockAnalyzer();
  });

  describe('validateAnalyzerInterface', () => {
    it('should validate correct analyzer interface', () => {
      const result = validator.validateAnalyzerInterface(mockAnalyzer);
      
      expect(result.isValid).toBe(true);
      expect(result.missingMethods).toEqual([]);
      expect(result.invalidMethods).toEqual([]);
      expect(result.complianceScore).toBe(1);
      expect(result.details).toEqual([]);
    });

    it('should detect missing methods', () => {
      const invalidAnalyzer = new InvalidAnalyzer();
      const result = validator.validateAnalyzerInterface(invalidAnalyzer);
      
      expect(result.isValid).toBe(false);
      expect(result.missingMethods).toContain('analyze');
      expect(result.missingMethods).toContain('getCapabilities');
      expect(result.missingMethods).toContain('validateInterface');
      expect(result.complianceScore).toBeLessThan(1);
    });

    it('should detect invalid method signatures', () => {
      const badAnalyzer = new BadSignatureAnalyzer();
      const result = validator.validateAnalyzerInterface(badAnalyzer);
      
      expect(result.isValid).toBe(false);
      expect(result.details.some(d => d.includes('validateInterface'))).toBe(true);
    });

    it('should validate name property', () => {
      const noNameAnalyzer = {
        analyze: async () => ({ success: true, data: {}, confidence: 1 }),
        getCapabilities: () => ({}),
        validateInterface: () => true
      };
      
      const result = validator.validateAnalyzerInterface(noNameAnalyzer);
      
      expect(result.isValid).toBe(false);
      expect(result.details.some(d => d.includes('Missing required property: name'))).toBe(true);
    });

    it('should validate analyze method parameter count', () => {
      const badAnalyzer = {
        name: 'BadAnalyzer',
        analyze: async (oneParam: any) => ({ success: true, data: {}, confidence: 1 }),
        getCapabilities: () => ({}),
        validateInterface: () => true
      };
      
      const result = validator.validateAnalyzerInterface(badAnalyzer);
      
      expect(result.isValid).toBe(false);
      expect(result.details.some(d => d.includes('analyze method must accept at least 2 parameters'))).toBe(true);
    });
  });

  describe('validateDependencies', () => {
    it('should validate analyzer with no dependencies', () => {
      const result = validator.validateDependencies(mockAnalyzer);
      
      expect(result.isValid).toBe(true);
      expect(result.missingDependencies).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
    });

    it('should handle analyzer without getCapabilities method', () => {
      const noCapsAnalyzer = {
        name: 'NoCapsAnalyzer',
        analyze: async () => ({ success: true, data: {}, confidence: 1 }),
        validateInterface: () => true
      };
      
      const result = validator.validateDependencies(noCapsAnalyzer);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle analyzer with dependencies', () => {
      const depAnalyzer = {
        name: 'DepAnalyzer',
        analyze: async () => ({ success: true, data: {}, confidence: 1 }),
        getCapabilities: () => ({
          supportedContentTypes: ['markdown'],
          requiresContext: false,
          canProcessLargeFiles: true,
          estimatedProcessingTime: 100,
          dependencies: ['dep1', 'dep2']
        }),
        validateInterface: () => true
      };
      
      const result = validator.validateDependencies(depAnalyzer);
      
      expect(result.resolutionOrder).toContain('dep1');
      expect(result.resolutionOrder).toContain('dep2');
    });
  });

  describe('validateCapabilities', () => {
    it('should validate correct capabilities', () => {
      const result = validator.validateCapabilities(mockAnalyzer);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should detect missing getCapabilities method', () => {
      const noCapsAnalyzer = {
        name: 'NoCapsAnalyzer',
        analyze: async () => ({ success: true, data: {}, confidence: 1 }),
        validateInterface: () => true
      };
      
      const result = validator.validateCapabilities(noCapsAnalyzer);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('getCapabilities method is not implemented');
    });

    it('should detect invalid capability structure', () => {
      const badCapsAnalyzer = {
        name: 'BadCapsAnalyzer',
        analyze: async () => ({ success: true, data: {}, confidence: 1 }),
        getCapabilities: () => ({
          supportedContentTypes: 'not an array',
          requiresContext: 'not a boolean',
          canProcessLargeFiles: 'not a boolean',
          estimatedProcessingTime: 'not a number'
        }),
        validateInterface: () => true
      };
      
      const result = validator.validateCapabilities(badCapsAnalyzer);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('supportedContentTypes must be an array');
      expect(result.issues).toContain('requiresContext must be a boolean');
      expect(result.issues).toContain('canProcessLargeFiles must be a boolean');
      expect(result.issues).toContain('estimatedProcessingTime must be a number');
    });

    it('should provide performance recommendations', () => {
      const slowAnalyzer = {
        name: 'SlowAnalyzer',
        analyze: async () => ({ success: true, data: {}, confidence: 1 }),
        getCapabilities: () => ({
          supportedContentTypes: [],
          requiresContext: false,
          canProcessLargeFiles: true,
          estimatedProcessingTime: 10000, // 10 seconds
          dependencies: []
        }),
        validateInterface: () => true
      };
      
      const result = validator.validateCapabilities(slowAnalyzer);
      
      expect(result.isValid).toBe(true);
      expect(result.recommendations).toContain('Consider optimizing analyzer for better performance (>5s processing time)');
      expect(result.recommendations).toContain('Consider specifying supported content types for better optimization');
    });

    it('should handle null capabilities', () => {
      const nullCapsAnalyzer = {
        name: 'NullCapsAnalyzer',
        analyze: async () => ({ success: true, data: {}, confidence: 1 }),
        getCapabilities: () => null,
        validateInterface: () => true
      };
      
      const result = validator.validateCapabilities(nullCapsAnalyzer);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('getCapabilities method returned null or undefined');
    });
  });
});

describe('Utility Functions', () => {
  describe('createAnalyzerRegistry', () => {
    it('should create registry with custom options', () => {
      const registry = createAnalyzerRegistry({
        validateInterfaces: false,
        allowDuplicates: true
      });
      
      const state = registry.getRegistrationState();
      expect(state.options.validateInterfaces).toBe(false);
      expect(state.options.allowDuplicates).toBe(true);
    });
  });

  describe('createAnalyzerConfig', () => {
    it('should create analyzer config with defaults', () => {
      const mockAnalyzer = new MockAnalyzer();
      const config = createAnalyzerConfig(mockAnalyzer);
      
      expect(config.name).toBe('MockAnalyzer');
      expect(config.analyzer).toBe(mockAnalyzer);
      expect(config.priority).toBe(0);
      expect(config.enabled).toBe(true);
    });

    it('should create analyzer config with custom options', () => {
      const mockAnalyzer = new MockAnalyzer();
      const config = createAnalyzerConfig(mockAnalyzer, {
        name: 'CustomName',
        priority: 10,
        enabled: false,
        metadata: {
          version: '1.0.0',
          author: 'Test Author',
          isCustom: true
        }
      });
      
      expect(config.name).toBe('CustomName');
      expect(config.priority).toBe(10);
      expect(config.enabled).toBe(false);
      expect(config.metadata?.version).toBe('1.0.0');
      expect(config.metadata?.isCustom).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  it('should handle complete registration workflow', async () => {
    const registry = createAnalyzerRegistry({
      validateInterfaces: true,
      enableLogging: false
    });

    // Register multiple analyzers
    const analyzer1 = new MockAnalyzer();
    
    // Create second analyzer with different name
    class MockAnalyzer2 extends MockAnalyzer {
      readonly name = 'MockAnalyzer2';
    }
    const analyzer2 = new MockAnalyzer2();
    
    const configs = [
      createAnalyzerConfig(analyzer1, { priority: 5 }),
      createAnalyzerConfig(analyzer2, { priority: 10 })
    ];

    const results = registry.registerMultiple(configs);
    
    // Verify registration results
    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
    
    // Verify registry state
    expect(registry.getRegisteredAnalyzers()).toHaveLength(2);
    expect(registry.getAnalyzer('MockAnalyzer')).toBe(analyzer1);
    expect(registry.getAnalyzer('MockAnalyzer2')).toBe(analyzer2);
    
    // Validate registry
    const validation = registry.validateRegistration();
    expect(validation.isValid).toBe(true);
    expect(validation.totalAnalyzers).toBe(2);
    expect(validation.validAnalyzers).toBe(2);
    
    // Test analyzer functionality
    const retrievedAnalyzer = registry.getAnalyzer('MockAnalyzer');
    expect(retrievedAnalyzer).not.toBeNull();
    
    if (retrievedAnalyzer) {
      const result = await retrievedAnalyzer.analyze([], '# Test');
      expect(result.success).toBe(true);
    }
  });

  it('should handle mixed valid and invalid analyzers', () => {
    const registry = createAnalyzerRegistry({
      validateInterfaces: true,
      failOnError: false,
      enableLogging: false
    });

    const validAnalyzer = new MockAnalyzer();
    const invalidAnalyzer = new InvalidAnalyzer();
    
    const validResult = registry.register(validAnalyzer);
    const invalidResult = registry.register(invalidAnalyzer as any);
    
    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(true); // Should succeed with warnings when failOnError is false
    expect(invalidResult.warnings).toBeDefined();
    
    const validation = registry.validateRegistration();
    expect(validation.isValid).toBe(false); // Overall invalid due to invalid analyzer
    expect(validation.totalAnalyzers).toBe(2);
    expect(validation.validAnalyzers).toBe(1);
    expect(validation.invalidAnalyzers).toBe(1);
  });
});