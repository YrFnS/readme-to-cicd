/**
 * Unit tests for Registration State Management functionality
 * Tests the enhanced state management methods in EnhancedAnalyzerRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  EnhancedAnalyzerRegistry,
  AnalyzerInterface,
  AnalyzerConfig,
  AnalyzerCapabilities,
  ValidationStatus
} from '../../src/parser/analyzers/enhanced-analyzer-registry';
import { MarkdownAST } from '../../src/shared/markdown-parser';
import { AnalyzerResult } from '../../src/parser/types';

// Mock analyzer implementations for testing
class MockAnalyzer implements AnalyzerInterface {
  constructor(
    public readonly name: string,
    private capabilities: AnalyzerCapabilities = {
      supportedContentTypes: ['markdown'],
      requiresContext: false,
      canProcessLargeFiles: true,
      estimatedProcessingTime: 100,
      dependencies: []
    }
  ) {}

  async analyze(ast: MarkdownAST, content: string): Promise<AnalyzerResult<any>> {
    return {
      success: true,
      data: { mockResult: true },
      metadata: {
        processingTime: 50,
        confidence: 0.9,
        version: '1.0.0'
      }
    };
  }

  getCapabilities(): AnalyzerCapabilities {
    return this.capabilities;
  }

  validateInterface(): boolean {
    return true;
  }
}

class MockAnalyzerWithDependencies extends MockAnalyzer {
  constructor(name: string, dependencies: string[] = []) {
    super(name, {
      supportedContentTypes: ['markdown'],
      requiresContext: false,
      canProcessLargeFiles: true,
      estimatedProcessingTime: 100,
      dependencies
    });
  }
}

describe('Registration State Management', () => {
  let registry: EnhancedAnalyzerRegistry;

  beforeEach(() => {
    registry = new EnhancedAnalyzerRegistry({
      validateInterfaces: true,
      allowDuplicates: false,
      failOnError: false,
      registrationTimeout: 1000,
      enableLogging: false
    });
  });

  describe('isAnalyzerRegistered', () => {
    it('should return false for unregistered analyzer', () => {
      expect(registry.isAnalyzerRegistered('NonExistentAnalyzer')).toBe(false);
    });

    it('should return true for registered analyzer', () => {
      const analyzer = new MockAnalyzer('TestAnalyzer');
      registry.register(analyzer);
      
      expect(registry.isAnalyzerRegistered('TestAnalyzer')).toBe(true);
    });

    it('should return false after analyzer is cleared', () => {
      const analyzer = new MockAnalyzer('TestAnalyzer');
      registry.register(analyzer);
      registry.clearRegistry();
      
      expect(registry.isAnalyzerRegistered('TestAnalyzer')).toBe(false);
    });
  });

  describe('getAnalyzerStatus', () => {
    it('should return null for unknown analyzer', () => {
      const status = registry.getAnalyzerStatus('UnknownAnalyzer');
      expect(status).toBeNull();
    });

    it('should return correct status for registered analyzer', () => {
      const analyzer = new MockAnalyzer('TestAnalyzer');
      registry.register(analyzer);
      
      const status = registry.getAnalyzerStatus('TestAnalyzer');
      
      expect(status).not.toBeNull();
      expect(status!.name).toBe('TestAnalyzer');
      expect(status!.isRegistered).toBe(true);
      expect(status!.status).toBe('registered');
      expect(status!.registrationOrder).toBe(0);
      expect(status!.retryCount).toBe(0);
    });

    it('should return correct status for failed analyzer', () => {
      // Create an analyzer that will fail validation
      const badAnalyzer = {
        name: 'BadAnalyzer',
        // Missing required methods
      } as any;
      
      const result = registry.register(badAnalyzer);
      const status = registry.getAnalyzerStatus('BadAnalyzer');
      
      expect(status).not.toBeNull();
      expect(status!.name).toBe('BadAnalyzer');
      expect(status!.isRegistered).toBe(true); // Still registered but with warnings
      expect(status!.status).toBe('registered');
      expect(result.warnings).toBeDefined(); // Should have warnings
    });

    it('should include dependency information', () => {
      const analyzer = new MockAnalyzerWithDependencies('TestAnalyzer', ['Dependency1']);
      registry.register(analyzer);
      
      const status = registry.getAnalyzerStatus('TestAnalyzer');
      
      expect(status!.dependencies).toEqual(['Dependency1']);
    });
  });

  describe('getRegistrationOrder', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.getRegistrationOrder()).toEqual([]);
    });

    it('should return analyzers in registration order', () => {
      const analyzer1 = new MockAnalyzer('FirstAnalyzer');
      const analyzer2 = new MockAnalyzer('SecondAnalyzer');
      const analyzer3 = new MockAnalyzer('ThirdAnalyzer');
      
      registry.register(analyzer1);
      registry.register(analyzer2);
      registry.register(analyzer3);
      
      const order = registry.getRegistrationOrder();
      expect(order).toEqual(['FirstAnalyzer', 'SecondAnalyzer', 'ThirdAnalyzer']);
    });

    it('should include all registrations in order', () => {
      const goodAnalyzer = new MockAnalyzer('GoodAnalyzer');
      const badAnalyzer = { name: 'BadAnalyzer' } as any;
      
      registry.register(goodAnalyzer);
      registry.register(badAnalyzer);
      
      const order = registry.getRegistrationOrder();
      expect(order).toEqual(['GoodAnalyzer', 'BadAnalyzer']);
    });
  });

  describe('getDependencyOrder', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.getDependencyOrder()).toEqual([]);
    });

    it('should return analyzers in dependency order', () => {
      const baseAnalyzer = new MockAnalyzer('BaseAnalyzer');
      const dependentAnalyzer = new MockAnalyzerWithDependencies('DependentAnalyzer', ['BaseAnalyzer']);
      
      // Register in reverse dependency order
      registry.register(dependentAnalyzer);
      registry.register(baseAnalyzer);
      
      const order = registry.getDependencyOrder();
      expect(order).toEqual(['BaseAnalyzer', 'DependentAnalyzer']);
    });

    it('should handle complex dependency chains', () => {
      const analyzer1 = new MockAnalyzer('Analyzer1');
      const analyzer2 = new MockAnalyzerWithDependencies('Analyzer2', ['Analyzer1']);
      const analyzer3 = new MockAnalyzerWithDependencies('Analyzer3', ['Analyzer2']);
      
      registry.register(analyzer3);
      registry.register(analyzer1);
      registry.register(analyzer2);
      
      const order = registry.getDependencyOrder();
      expect(order).toEqual(['Analyzer1', 'Analyzer2', 'Analyzer3']);
    });
  });

  describe('getAvailableAnalyzers', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.getAvailableAnalyzers()).toEqual([]);
    });

    it('should return all successfully registered analyzers', () => {
      const analyzer1 = new MockAnalyzer('Analyzer1');
      const analyzer2 = new MockAnalyzer('Analyzer2');
      
      registry.register(analyzer1);
      registry.register(analyzer2);
      
      const available = registry.getAvailableAnalyzers();
      expect(available).toContain('Analyzer1');
      expect(available).toContain('Analyzer2');
      expect(available).toHaveLength(2);
    });

    it('should include all registered analyzers', () => {
      const goodAnalyzer = new MockAnalyzer('GoodAnalyzer');
      const badAnalyzer = { name: 'BadAnalyzer' } as any;
      
      registry.register(goodAnalyzer);
      registry.register(badAnalyzer);
      
      const available = registry.getAvailableAnalyzers();
      expect(available).toContain('GoodAnalyzer');
      expect(available).toContain('BadAnalyzer');
    });
  });

  describe('getFailedAnalyzers', () => {
    it('should return empty array when no failures', () => {
      const analyzer = new MockAnalyzer('GoodAnalyzer');
      registry.register(analyzer);
      
      expect(registry.getFailedAnalyzers()).toEqual([]);
    });

    it('should return names of analyzers with validation failures', () => {
      const goodAnalyzer = new MockAnalyzer('GoodAnalyzer');
      const badAnalyzer = { name: 'BadAnalyzer' } as any;
      
      registry.register(goodAnalyzer);
      registry.register(badAnalyzer);
      
      const failed = registry.getFailedAnalyzers();
      // BadAnalyzer should be in failed list due to validation issues
      expect(failed).toContain('BadAnalyzer');
      expect(failed).not.toContain('GoodAnalyzer');
    });
  });

  describe('getRegistrationStatistics', () => {
    it('should return correct statistics for empty registry', () => {
      const stats = registry.getRegistrationStatistics();
      
      expect(stats.totalAnalyzers).toBe(0);
      expect(stats.registeredAnalyzers).toBe(0);
      expect(stats.failedAnalyzers).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should return correct statistics with mixed results', () => {
      const goodAnalyzer1 = new MockAnalyzer('GoodAnalyzer1');
      const goodAnalyzer2 = new MockAnalyzer('GoodAnalyzer2');
      const badAnalyzer = { name: 'BadAnalyzer' } as any;
      
      registry.register(goodAnalyzer1);
      registry.register(goodAnalyzer2);
      registry.register(badAnalyzer);
      
      const stats = registry.getRegistrationStatistics();
      
      expect(stats.totalAnalyzers).toBeGreaterThanOrEqual(3);
      expect(stats.registeredAnalyzers).toBeGreaterThanOrEqual(3); // All are registered
      expect(stats.failedAnalyzers).toBeGreaterThanOrEqual(1); // But one has validation failures
      expect(stats.successRate).toBeGreaterThan(0); // Success rate based on validation
    });

    it('should calculate dependency chain length', () => {
      const analyzer1 = new MockAnalyzer('Analyzer1');
      const analyzer2 = new MockAnalyzerWithDependencies('Analyzer2', ['Analyzer1']);
      const analyzer3 = new MockAnalyzerWithDependencies('Analyzer3', ['Analyzer2']);
      
      registry.register(analyzer1);
      registry.register(analyzer2);
      registry.register(analyzer3);
      
      const stats = registry.getRegistrationStatistics();
      expect(stats.dependencyChainLength).toBe(3);
    });
  });

  describe('resolveDependencies', () => {
    it('should return empty array for empty input', () => {
      const order = registry.resolveDependencies([]);
      expect(order).toEqual([]);
    });

    it('should handle analyzers with no dependencies', () => {
      const configs: AnalyzerConfig[] = [
        { name: 'Analyzer1', analyzer: new MockAnalyzer('Analyzer1') },
        { name: 'Analyzer2', analyzer: new MockAnalyzer('Analyzer2') }
      ];
      
      const order = registry.resolveDependencies(configs);
      expect(order).toHaveLength(2);
      expect(order).toContain('Analyzer1');
      expect(order).toContain('Analyzer2');
    });

    it('should resolve simple dependencies', () => {
      const configs: AnalyzerConfig[] = [
        { 
          name: 'DependentAnalyzer', 
          analyzer: new MockAnalyzer('DependentAnalyzer'),
          dependencies: ['BaseAnalyzer']
        },
        { 
          name: 'BaseAnalyzer', 
          analyzer: new MockAnalyzer('BaseAnalyzer')
        }
      ];
      
      const order = registry.resolveDependencies(configs);
      expect(order).toEqual(['BaseAnalyzer', 'DependentAnalyzer']);
    });

    it('should resolve complex dependency chains', () => {
      const configs: AnalyzerConfig[] = [
        { 
          name: 'Level3', 
          analyzer: new MockAnalyzer('Level3'),
          dependencies: ['Level2']
        },
        { 
          name: 'Level1', 
          analyzer: new MockAnalyzer('Level1')
        },
        { 
          name: 'Level2', 
          analyzer: new MockAnalyzer('Level2'),
          dependencies: ['Level1']
        }
      ];
      
      const order = registry.resolveDependencies(configs);
      expect(order).toEqual(['Level1', 'Level2', 'Level3']);
    });

    it('should handle multiple independent chains', () => {
      const configs: AnalyzerConfig[] = [
        { name: 'ChainA2', analyzer: new MockAnalyzer('ChainA2'), dependencies: ['ChainA1'] },
        { name: 'ChainB1', analyzer: new MockAnalyzer('ChainB1') },
        { name: 'ChainA1', analyzer: new MockAnalyzer('ChainA1') },
        { name: 'ChainB2', analyzer: new MockAnalyzer('ChainB2'), dependencies: ['ChainB1'] }
      ];
      
      const order = registry.resolveDependencies(configs);
      
      // Should have all analyzers
      expect(order).toHaveLength(4);
      
      // Check dependency constraints
      expect(order.indexOf('ChainA1')).toBeLessThan(order.indexOf('ChainA2'));
      expect(order.indexOf('ChainB1')).toBeLessThan(order.indexOf('ChainB2'));
    });

    it('should handle circular dependencies gracefully', () => {
      const configs: AnalyzerConfig[] = [
        { 
          name: 'Analyzer1', 
          analyzer: new MockAnalyzer('Analyzer1'),
          dependencies: ['Analyzer2']
        },
        { 
          name: 'Analyzer2', 
          analyzer: new MockAnalyzer('Analyzer2'),
          dependencies: ['Analyzer1']
        }
      ];
      
      const order = registry.resolveDependencies(configs);
      
      // Should return partial result and log warning
      expect(order.length).toBeLessThan(2);
    });
  });

  describe('integration with existing functionality', () => {
    it('should maintain state consistency across operations', () => {
      const analyzer1 = new MockAnalyzer('Analyzer1');
      const analyzer2 = new MockAnalyzer('Analyzer2');
      
      // Initial state
      expect(registry.getRegistrationStatistics().totalAnalyzers).toBe(0);
      
      // Register first analyzer
      registry.register(analyzer1);
      expect(registry.isAnalyzerRegistered('Analyzer1')).toBe(true);
      expect(registry.getRegistrationStatistics().registeredAnalyzers).toBe(1);
      
      // Register second analyzer
      registry.register(analyzer2);
      expect(registry.getAvailableAnalyzers()).toHaveLength(2);
      expect(registry.getRegistrationOrder()).toEqual(['Analyzer1', 'Analyzer2']);
      
      // Clear registry
      registry.clearRegistry();
      expect(registry.getRegistrationStatistics().totalAnalyzers).toBe(0);
      expect(registry.isAnalyzerRegistered('Analyzer1')).toBe(false);
    });

    it('should handle batch registration with state tracking', () => {
      // Create a registry without recovery to avoid duplicate entries
      const testRegistry = new EnhancedAnalyzerRegistry({
        validateInterfaces: true,
        allowDuplicates: false,
        failOnError: false,
        registrationTimeout: 1000,
        enableLogging: false
      });
      
      const configs: AnalyzerConfig[] = [
        { name: 'Analyzer1', analyzer: new MockAnalyzer('Analyzer1') },
        { name: 'Analyzer2', analyzer: new MockAnalyzer('Analyzer2') },
        { name: 'BadAnalyzer', analyzer: { name: 'BadAnalyzer' } as any }
      ];
      
      const results = testRegistry.registerMultiple(configs);
      
      // Check registration results
      expect(results).toHaveLength(3);
      
      // Check state consistency
      const stats = testRegistry.getRegistrationStatistics();
      expect(stats.totalAnalyzers).toBeGreaterThanOrEqual(3);
      expect(stats.registeredAnalyzers).toBeGreaterThanOrEqual(3); // All registered
      expect(stats.failedAnalyzers).toBeGreaterThanOrEqual(1); // But one has validation failures
      
      // Check individual statuses
      expect(testRegistry.getAnalyzerStatus('Analyzer1')?.status).toBe('registered');
      expect(testRegistry.getAnalyzerStatus('BadAnalyzer')?.status).toBe('registered');
    });
  });
});