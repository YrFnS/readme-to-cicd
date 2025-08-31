/**
 * Unit tests for Component Factory Analyzer Registration
 * 
 * Tests the enhanced analyzer registration functionality in ComponentFactory,
 * including custom analyzer registration, validation, and integration with
 * the EnhancedAnalyzerRegistry system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFactory } from '../../src/parser/component-factory';
import { 
  AnalyzerInterface, 
  AnalyzerConfig, 
  AnalyzerCapabilities,
  RegistrationResult 
} from '../../src/parser/analyzers/enhanced-analyzer-registry';
import { MarkdownAST } from '../../src/shared/markdown-parser';
import { AnalyzerResult } from '../../src/parser/types';

/**
 * Mock analyzer for testing registration functionality
 */
class MockAnalyzer implements AnalyzerInterface {
  readonly name = 'MockAnalyzer';
  
  async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult<any>> {
    return {
      success: true,
      data: { mockData: 'test' },
      confidence: 0.9,
      sources: ['mock-source'],
      errors: []
    };
  }
  
  getCapabilities(): AnalyzerCapabilities {
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

/**
 * Invalid mock analyzer for testing validation
 */
class InvalidMockAnalyzer {
  readonly name = 'InvalidMockAnalyzer';
  
  // Missing required methods to test validation
}

/**
 * Another mock analyzer for testing multiple registrations
 */
class SecondMockAnalyzer implements AnalyzerInterface {
  readonly name = 'SecondMockAnalyzer';
  
  async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult<any>> {
    return {
      success: true,
      data: { secondMockData: 'test2' },
      confidence: 0.8,
      sources: ['second-mock-source'],
      errors: []
    };
  }
  
  getCapabilities(): AnalyzerCapabilities {
    return {
      supportedContentTypes: ['text/markdown'],
      requiresContext: true,
      canProcessLargeFiles: false,
      estimatedProcessingTime: 200,
      dependencies: ['MockAnalyzer']
    };
  }
  
  validateInterface(): boolean {
    return true;
  }
}

describe('ComponentFactory Analyzer Registration', () => {
  let factory: ComponentFactory;
  
  beforeEach(() => {
    // Get fresh factory instance and reset it
    factory = ComponentFactory.getInstance();
    factory.reset();
    factory.initialize({
      enableCaching: true,
      enablePerformanceMonitoring: true,
      confidenceThreshold: 0.5
    });
  });

  describe('registerCustomAnalyzers', () => {
    it('should register a single custom analyzer successfully', () => {
      // Arrange
      const mockAnalyzer = new MockAnalyzer();
      const analyzerConfigs: AnalyzerConfig[] = [{
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        enabled: true,
        priority: 1
      }];

      // Act
      const results = factory.registerCustomAnalyzers(analyzerConfigs);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].analyzerName).toBe('MockAnalyzer');
      expect(results[0].error).toBeUndefined();
      
      // Verify analyzer is registered
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      expect(registeredAnalyzers).toContain('MockAnalyzer');
    });

    it('should register multiple custom analyzers successfully', () => {
      // Arrange
      const mockAnalyzer1 = new MockAnalyzer();
      const mockAnalyzer2 = new SecondMockAnalyzer();
      const analyzerConfigs: AnalyzerConfig[] = [
        {
          name: 'MockAnalyzer',
          analyzer: mockAnalyzer1,
          enabled: true,
          priority: 1
        },
        {
          name: 'SecondMockAnalyzer',
          analyzer: mockAnalyzer2,
          enabled: true,
          priority: 2
        }
      ];

      // Act
      const results = factory.registerCustomAnalyzers(analyzerConfigs);

      // Assert
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      expect(registeredAnalyzers).toContain('MockAnalyzer');
      expect(registeredAnalyzers).toContain('SecondMockAnalyzer');
    });

    it('should handle registration failure for invalid analyzer', () => {
      // Arrange
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;
      const analyzerConfigs: AnalyzerConfig[] = [{
        name: 'InvalidMockAnalyzer',
        analyzer: invalidAnalyzer,
        enabled: true
      }];

      // Act
      const results = factory.registerCustomAnalyzers(analyzerConfigs);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].analyzerName).toBe('InvalidMockAnalyzer');
      expect(results[0].error).toBeDefined();
      
      // Verify analyzer is not registered
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      expect(registeredAnalyzers).not.toContain('InvalidMockAnalyzer');
    });

    it('should handle empty analyzer list', () => {
      // Act
      const results = factory.registerCustomAnalyzers([]);

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should handle null/undefined analyzer list', () => {
      // Act
      const results1 = factory.registerCustomAnalyzers(null as any);
      const results2 = factory.registerCustomAnalyzers(undefined as any);

      // Assert
      expect(results1).toHaveLength(0);
      expect(results2).toHaveLength(0);
    });

    it('should not register disabled analyzers', () => {
      // Arrange
      const mockAnalyzer = new MockAnalyzer();
      const analyzerConfigs: AnalyzerConfig[] = [{
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        enabled: false
      }];

      // Act
      const results = factory.registerCustomAnalyzers(analyzerConfigs);

      // Assert
      expect(results).toHaveLength(0);
      
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      expect(registeredAnalyzers).not.toContain('MockAnalyzer');
    });

    it('should handle duplicate analyzer registration', () => {
      // Arrange
      const mockAnalyzer1 = new MockAnalyzer();
      const mockAnalyzer2 = new MockAnalyzer();
      const analyzerConfigs: AnalyzerConfig[] = [
        {
          name: 'MockAnalyzer',
          analyzer: mockAnalyzer1,
          enabled: true
        },
        {
          name: 'MockAnalyzer',
          analyzer: mockAnalyzer2,
          enabled: true
        }
      ];

      // Act
      const results = factory.registerCustomAnalyzers(analyzerConfigs);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('already registered');
    });
  });

  describe('getAnalyzerRegistry', () => {
    it('should return the analyzer registry instance', () => {
      // Act
      const registry = factory.getAnalyzerRegistry();

      // Assert
      expect(registry).toBeDefined();
      expect(typeof registry.register).toBe('function');
      expect(typeof registry.getRegisteredAnalyzers).toBe('function');
    });
  });

  describe('getRegisteredAnalyzers', () => {
    it('should return empty list when no analyzers are registered', () => {
      // Act
      const analyzers = factory.getRegisteredAnalyzers();

      // Assert
      expect(analyzers).toEqual([]);
    });

    it('should return list of registered analyzer names', () => {
      // Arrange
      const mockAnalyzer = new MockAnalyzer();
      factory.registerCustomAnalyzers([{
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        enabled: true
      }]);

      // Act
      const analyzers = factory.getRegisteredAnalyzers();

      // Assert
      expect(analyzers).toContain('MockAnalyzer');
    });
  });

  describe('getAnalyzer', () => {
    it('should return null for non-existent analyzer', () => {
      // Act
      const analyzer = factory.getAnalyzer('NonExistentAnalyzer');

      // Assert
      expect(analyzer).toBeNull();
    });

    it('should return analyzer instance for registered analyzer', () => {
      // Arrange
      const mockAnalyzer = new MockAnalyzer();
      factory.registerCustomAnalyzers([{
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        enabled: true
      }]);

      // Act
      const analyzer = factory.getAnalyzer('MockAnalyzer');

      // Assert
      expect(analyzer).toBe(mockAnalyzer);
      expect(analyzer?.name).toBe('MockAnalyzer');
    });
  });

  describe('validateComponentSetup', () => {
    it('should validate component setup with no analyzers', () => {
      // Act
      const validation = factory.validateComponentSetup();

      // Assert
      expect(validation).toBeDefined();
      expect(validation.dependenciesCreated).toBe(true);
      expect(validation.configurationValid).toBe(true);
    });

    it('should validate component setup with registered analyzers', () => {
      // Arrange
      const mockAnalyzer = new MockAnalyzer();
      factory.registerCustomAnalyzers([{
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        enabled: true
      }]);

      // Act
      const validation = factory.validateComponentSetup();

      // Assert
      expect(validation).toBeDefined();
      expect(validation.dependenciesCreated).toBe(true);
      expect(validation.configurationValid).toBe(true);
      expect(validation.analyzerRegistration).toBeDefined();
    });

    it('should detect invalid configuration', () => {
      // Arrange
      factory.initialize({
        confidenceThreshold: -1 // Invalid threshold
      });

      // Act
      const validation = factory.validateComponentSetup();

      // Assert
      expect(validation.configurationValid).toBe(false);
    });
  });

  describe('createReadmeParser with custom analyzers', () => {
    it('should create parser with custom analyzers from config', () => {
      // Arrange
      const mockAnalyzer = new MockAnalyzer();
      const parserConfig = {
        customAnalyzers: [{
          name: 'MockAnalyzer',
          analyzer: mockAnalyzer,
          enabled: true
        }]
      };

      // Act
      const parser = factory.createReadmeParser(parserConfig);

      // Assert
      expect(parser).toBeDefined();
      
      // Verify analyzer was registered
      const registeredAnalyzers = factory.getRegisteredAnalyzers();
      expect(registeredAnalyzers).toContain('MockAnalyzer');
    });

    it('should create parser without custom analyzers', () => {
      // Act
      const parser = factory.createReadmeParser();

      // Assert
      expect(parser).toBeDefined();
    });

    it('should handle registration failures gracefully in parser creation', () => {
      // Arrange
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;
      const parserConfig = {
        customAnalyzers: [{
          name: 'InvalidMockAnalyzer',
          analyzer: invalidAnalyzer,
          enabled: true
        }]
      };

      // Act & Assert - Should not throw
      expect(() => {
        const parser = factory.createReadmeParser(parserConfig);
        expect(parser).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('integration with analyzer registry', () => {
    it('should properly integrate with enhanced analyzer registry', () => {
      // Arrange
      const mockAnalyzer = new MockAnalyzer();
      const analyzerConfigs: AnalyzerConfig[] = [{
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        enabled: true,
        metadata: {
          version: '1.0.0',
          author: 'test',
          description: 'Test analyzer',
          isCustom: true
        }
      }];

      // Act
      const results = factory.registerCustomAnalyzers(analyzerConfigs);
      const registry = factory.getAnalyzerRegistry();
      const validation = registry.validateRegistration();

      // Assert
      expect(results[0].success).toBe(true);
      expect(validation.isValid).toBe(true);
      expect(validation.totalAnalyzers).toBe(1);
      expect(validation.validAnalyzers).toBe(1);
    });

    it('should handle analyzer interface validation', () => {
      // Arrange
      const mockAnalyzer = new MockAnalyzer();
      
      // Act
      const results = factory.registerCustomAnalyzers([{
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        enabled: true
      }]);

      // Assert
      expect(results[0].success).toBe(true);
      expect(results[0].validationDetails).toBeDefined();
      expect(results[0].validationDetails?.interfaceCompliance.isValid).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle exceptions during registration', () => {
      // Arrange
      const faultyAnalyzer = {
        name: 'FaultyAnalyzer',
        analyze: () => { throw new Error('Test error'); },
        getCapabilities: () => { throw new Error('Capabilities error'); },
        validateInterface: () => { throw new Error('Validation error'); }
      } as any;

      // Act
      const results = factory.registerCustomAnalyzers([{
        name: 'FaultyAnalyzer',
        analyzer: faultyAnalyzer,
        enabled: true
      }]);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it('should provide detailed error messages', () => {
      // Arrange
      const invalidAnalyzer = new InvalidMockAnalyzer() as any;

      // Act
      const results = factory.registerCustomAnalyzers([{
        name: 'InvalidMockAnalyzer',
        analyzer: invalidAnalyzer,
        enabled: true
      }]);

      // Assert
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('validation failed');
      expect(results[0].validationDetails).toBeDefined();
    });
  });
});