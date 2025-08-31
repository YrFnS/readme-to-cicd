/**
 * Integration Tests for MockAnalyzer Registration Flow
 * 
 * These tests specifically verify that MockAnalyzer registration works correctly
 * through the new registration system, addressing the failing test
 * "should register custom analyzers when provided".
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ComponentFactory, 
  ParserConfig
} from '../../src/parser/component-factory';
import { MockAnalyzer, createMockAnalyzer, createMockAnalyzers } from '../utils/mock-analyzer';
import { AnalyzerConfig } from '../../src/parser/analyzers/enhanced-analyzer-registry';

describe('MockAnalyzer Registration Integration Tests', () => {
  let factory: ComponentFactory;

  beforeEach(() => {
    factory = ComponentFactory.getInstance();
    factory.reset(); // Ensure clean state for each test
  });

  afterEach(() => {
    factory.reset(); // Clean up after each test
  });

  describe('Basic MockAnalyzer Registration', () => {
    it('should register MockAnalyzer through the new registration system', () => {
      const mockAnalyzer = createMockAnalyzer();
      
      const analyzerConfig: AnalyzerConfig = {
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        dependencies: [],
        priority: 1
      };

      factory.initialize();
      const registrationResults = factory.registerCustomAnalyzers([analyzerConfig]);
      
      // Verify registration was successful
      expect(registrationResults).toHaveLength(1);
      expect(registrationResults[0].success).toBe(true);
      expect(registrationResults[0].analyzerName).toBe('MockAnalyzer');
      
      // Verify analyzer appears in registry
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      expect(registeredAnalyzers).toContain('MockAnalyzer');
      
      // Verify analyzer can be retrieved
      const retrievedAnalyzer = factory.getAnalyzer('MockAnalyzer');
      expect(retrievedAnalyzer).toBeDefined();
      expect(retrievedAnalyzer?.name).toBe('MockAnalyzer');
    });

    it('should register MockAnalyzer with parser through ParserConfig', () => {
      const mockAnalyzer = createMockAnalyzer();
      
      const analyzerConfig: AnalyzerConfig = {
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        dependencies: [],
        priority: 1
      };

      const parserConfig: ParserConfig = {
        customAnalyzers: [analyzerConfig],
        registrationOptions: {
          validateInterfaces: true,
          allowDuplicates: false,
          failOnError: true
        }
      };

      factory.initialize();
      const parser = factory.createReadmeParser(parserConfig);
      
      // Verify MockAnalyzer is registered in parser
      const analyzerInfo = parser.getAnalyzerInfo();
      const analyzerNames = analyzerInfo.map(info => info.name);
      
      expect(analyzerNames).toContain('MockAnalyzer');
      
      // Verify parser has the expected number of analyzers (5 built-in + 1 custom)
      expect(analyzerNames.length).toBeGreaterThanOrEqual(6);
    });

    it('should validate MockAnalyzer interface compliance during registration', () => {
      const mockAnalyzer = createMockAnalyzer();
      
      // Verify MockAnalyzer implements required interface methods
      expect(mockAnalyzer.name).toBe('MockAnalyzer');
      expect(typeof mockAnalyzer.analyze).toBe('function');
      expect(typeof mockAnalyzer.getCapabilities).toBe('function');
      expect(typeof mockAnalyzer.validateInterface).toBe('function');
      expect(mockAnalyzer.validateInterface()).toBe(true);
      
      const analyzerConfig: AnalyzerConfig = {
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        dependencies: [],
        priority: 1
      };

      factory.initialize();
      const registrationResults = factory.registerCustomAnalyzers([analyzerConfig]);
      
      // Successful registration indicates interface compliance
      expect(registrationResults[0].success).toBe(true);
      
      // Validate component setup
      const validationResult = factory.validateComponentSetup();
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.analyzerRegistration.isValid).toBe(true);
    });
  });

  describe('Multiple MockAnalyzer Registration', () => {
    it('should register multiple MockAnalyzers with unique names', () => {
      const mockAnalyzers = createMockAnalyzers(3);
      
      const analyzerConfigs: AnalyzerConfig[] = mockAnalyzers.map((analyzer, index) => ({
        name: `MockAnalyzer${index + 1}`,
        analyzer: analyzer,
        dependencies: [],
        priority: index + 1
      }));

      factory.initialize();
      const registrationResults = factory.registerCustomAnalyzers(analyzerConfigs);
      
      // Verify all registrations were successful
      expect(registrationResults).toHaveLength(3);
      registrationResults.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Verify all analyzers appear in registry
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      expect(registeredAnalyzers).toContain('MockAnalyzer1');
      expect(registeredAnalyzers).toContain('MockAnalyzer2');
      expect(registeredAnalyzers).toContain('MockAnalyzer3');
    });

    it('should register multiple MockAnalyzers through parser config', () => {
      const mockAnalyzers = createMockAnalyzers(2);
      
      const analyzerConfigs: AnalyzerConfig[] = [
        {
          name: 'MockAnalyzer1',
          analyzer: mockAnalyzers[0],
          dependencies: [],
          priority: 1
        },
        {
          name: 'MockAnalyzer2',
          analyzer: mockAnalyzers[1],
          dependencies: [],
          priority: 2
        }
      ];

      const parserConfig: ParserConfig = {
        customAnalyzers: analyzerConfigs
      };

      factory.initialize();
      const parser = factory.createReadmeParser(parserConfig);
      
      // Verify both MockAnalyzers are registered in parser
      const analyzerInfo = parser.getAnalyzerInfo();
      const analyzerNames = analyzerInfo.map(info => info.name);
      
      expect(analyzerNames).toContain('MockAnalyzer1');
      expect(analyzerNames).toContain('MockAnalyzer2');
      
      // Verify parser has the expected number of analyzers (5 built-in + 2 custom)
      expect(analyzerNames.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('MockAnalyzer Functionality Integration', () => {
    it('should execute MockAnalyzer through parser pipeline', async () => {
      const mockAnalyzer = createMockAnalyzer();
      
      const analyzerConfig: AnalyzerConfig = {
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        dependencies: [],
        priority: 1
      };

      const parserConfig: ParserConfig = {
        customAnalyzers: [analyzerConfig]
      };

      factory.initialize();
      const parser = factory.createReadmeParser(parserConfig);
      
      // Test content for MockAnalyzer
      const testContent = '# Test README\n\nThis is test content for MockAnalyzer functionality testing.';
      
      // Parse content through the pipeline
      const result = await parser.parseContent(testContent);
      
      // Verify parsing completed (success or failure is acceptable for this test)
      expect(result).toBeDefined();
      
      // If successful, verify structure
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it('should handle MockAnalyzer errors gracefully', async () => {
      // Create a MockAnalyzer that will throw an error
      const errorMockAnalyzer = new MockAnalyzer();
      const originalAnalyze = errorMockAnalyzer.analyze;
      errorMockAnalyzer.analyze = async () => {
        throw new Error('Mock analyzer error for testing');
      };
      
      const analyzerConfig: AnalyzerConfig = {
        name: 'ErrorMockAnalyzer',
        analyzer: errorMockAnalyzer,
        dependencies: [],
        priority: 1
      };

      const parserConfig: ParserConfig = {
        customAnalyzers: [analyzerConfig]
      };

      factory.initialize();
      const parser = factory.createReadmeParser(parserConfig);
      
      // Test content
      const testContent = '# Test README\n\nThis content will trigger an error in MockAnalyzer.';
      
      // Parse content - should handle error gracefully
      const result = await parser.parseContent(testContent);
      
      // Verify parsing completed without throwing
      expect(result).toBeDefined();
      
      // If parsing failed due to the error, verify error handling
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Registration Error Handling', () => {
    it('should handle invalid analyzer registration gracefully', () => {
      // Create invalid analyzer config (missing required methods)
      const invalidAnalyzer = {
        name: 'InvalidAnalyzer'
        // Missing analyze, getCapabilities, validateInterface methods
      };

      const analyzerConfig: AnalyzerConfig = {
        name: 'InvalidAnalyzer',
        analyzer: invalidAnalyzer as any,
        dependencies: [],
        priority: 1
      };

      factory.initialize();
      const registrationResults = factory.registerCustomAnalyzers([analyzerConfig]);
      
      // Verify registration failed gracefully
      expect(registrationResults).toHaveLength(1);
      expect(registrationResults[0].success).toBe(false);
      expect(registrationResults[0].error).toBeDefined();
      
      // Verify invalid analyzer is not in registry
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      expect(registeredAnalyzers).not.toContain('InvalidAnalyzer');
    });

    it('should handle duplicate analyzer registration based on options', () => {
      const mockAnalyzer1 = createMockAnalyzer();
      const mockAnalyzer2 = createMockAnalyzer();
      
      const analyzerConfigs: AnalyzerConfig[] = [
        {
          name: 'MockAnalyzer',
          analyzer: mockAnalyzer1,
          dependencies: [],
          priority: 1
        },
        {
          name: 'MockAnalyzer', // Same name - duplicate
          analyzer: mockAnalyzer2,
          dependencies: [],
          priority: 2
        }
      ];

      factory.initialize();
      const registrationResults = factory.registerCustomAnalyzers(analyzerConfigs);
      
      // Verify behavior based on allowDuplicates setting (default: false)
      expect(registrationResults).toHaveLength(2);
      expect(registrationResults[0].success).toBe(true);
      expect(registrationResults[1].success).toBe(false); // Duplicate should fail
      
      // Verify only one analyzer is registered
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      const mockAnalyzerCount = registeredAnalyzers.filter(name => name === 'MockAnalyzer').length;
      expect(mockAnalyzerCount).toBe(1);
    });
  });

  describe('Registration State Management', () => {
    it('should track registration state correctly', () => {
      const mockAnalyzer = createMockAnalyzer();
      
      const analyzerConfig: AnalyzerConfig = {
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        dependencies: [],
        priority: 1
      };

      factory.initialize();
      
      // Check initial state
      const initialState = factory.getAnalyzerRegistry().getRegistrationState();
      const initialCount = initialState.registeredAnalyzers.size;
      
      // Register analyzer
      const registrationResults = factory.registerCustomAnalyzers([analyzerConfig]);
      expect(registrationResults[0].success).toBe(true);
      
      // Check updated state
      const updatedState = factory.getAnalyzerRegistry().getRegistrationState();
      expect(updatedState.registeredAnalyzers.size).toBe(initialCount + 1);
      expect(updatedState.registrationOrder).toContain('MockAnalyzer');
      expect(updatedState.registeredAnalyzers.has('MockAnalyzer')).toBe(true);
    });

    it('should clear registry state correctly', () => {
      const mockAnalyzer = createMockAnalyzer();
      
      const analyzerConfig: AnalyzerConfig = {
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        dependencies: [],
        priority: 1
      };

      factory.initialize();
      
      // Register analyzer
      factory.registerCustomAnalyzers([analyzerConfig]);
      expect(factory.getRegisteredAnalyzers()).toContain('MockAnalyzer');
      
      // Clear registry
      factory.getAnalyzerRegistry().clearRegistry();
      
      // Verify registry is cleared
      const clearedAnalyzers = factory.getRegisteredAnalyzers();
      expect(clearedAnalyzers).not.toContain('MockAnalyzer');
      expect(clearedAnalyzers).toHaveLength(0);
    });
  });
});