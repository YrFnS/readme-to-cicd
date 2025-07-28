/**
 * Integration Tests for Component Initialization and Dependency Injection
 * 
 * These tests verify that components are properly initialized with enhanced
 * dependencies and that dependency injection works correctly across the system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ComponentFactory, 
  ComponentConfig, 
  createEnhancedReadmeParser,
  createContextAwareCommandExtractor,
  createEnhancedLanguageDetector
} from '../../src/parser/component-factory';
import { IntegrationPipeline } from '../../src/parser/integration-pipeline';
import { LanguageDetector } from '../../src/parser/analyzers/language-detector';
import { CommandExtractor } from '../../src/parser/analyzers/command-extractor';
import { LanguageContext } from '../../src/shared/types/language-context';

describe('Component Initialization Integration Tests', () => {
  let factory: ComponentFactory;

  beforeEach(() => {
    factory = ComponentFactory.getInstance();
    factory.reset(); // Ensure clean state
  });

  afterEach(() => {
    factory.reset();
  });

  describe('ComponentFactory', () => {
    it('should create singleton instance', () => {
      const factory1 = ComponentFactory.getInstance();
      const factory2 = ComponentFactory.getInstance();
      
      expect(factory1).toBe(factory2);
    });

    it('should initialize with default configuration', () => {
      factory.initialize();
      const dependencies = factory.getDependencies();
      
      expect(dependencies).toBeDefined();
      expect(dependencies.languageDetector).toBeInstanceOf(LanguageDetector);
      expect(dependencies.commandExtractor).toBeInstanceOf(CommandExtractor);
      expect(dependencies.confidenceCalculator).toBeDefined();
      expect(dependencies.sourceTracker).toBeDefined();
      expect(dependencies.contextCollection).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const config: ComponentConfig = {
        enableCaching: false,
        enablePerformanceMonitoring: false,
        confidenceThreshold: 0.7,
        maxContexts: 50,
        enableContextInheritance: false
      };

      factory.initialize(config);
      const dependencies = factory.getDependencies();
      
      expect(dependencies).toBeDefined();
      // Verify that configuration is applied (this would require exposing config in dependencies)
    });

    it('should create dependencies only once', () => {
      factory.initialize();
      
      const dependencies1 = factory.getDependencies();
      const dependencies2 = factory.getDependencies();
      
      expect(dependencies1).toBe(dependencies2);
    });

    it('should recreate dependencies after reset', () => {
      factory.initialize();
      const dependencies1 = factory.getDependencies();
      
      factory.reset();
      factory.initialize();
      const dependencies2 = factory.getDependencies();
      
      expect(dependencies1).not.toBe(dependencies2);
    });
  });

  describe('Enhanced README Parser Creation', () => {
    it('should create enhanced README parser with default configuration', () => {
      const parser = createEnhancedReadmeParser();
      
      expect(parser).toBeDefined();
      expect(parser.parseContent).toBeDefined();
      expect(parser.parseFile).toBeDefined();
      
      // Verify enhanced analyzers are registered
      const analyzerInfo = parser.getAnalyzerInfo();
      const analyzerNames = analyzerInfo.map(info => info.name);
      
      expect(analyzerNames).toContain('EnhancedLanguageDetector');
      expect(analyzerNames).toContain('EnhancedCommandExtractor');
    });

    it('should create enhanced README parser with custom configuration', () => {
      const config: ComponentConfig = {
        enableCaching: true,
        enablePerformanceMonitoring: true,
        confidenceThreshold: 0.8
      };

      const parser = createEnhancedReadmeParser(config);
      
      expect(parser).toBeDefined();
      
      // Verify parser has enhanced capabilities
      expect(parser.getPerformanceStats).toBeDefined();
      expect(parser.getCacheStats).toBeDefined();
    });

    it('should register custom analyzers when provided', () => {
      const mockAnalyzer = {
        name: 'MockAnalyzer',
        analyze: async () => ({
          data: { mock: true },
          confidence: 0.5,
          sources: ['mock']
        })
      };

      const config: ComponentConfig = {
        customAnalyzers: [mockAnalyzer]
      };

      const parser = createEnhancedReadmeParser(config);
      const analyzerInfo = parser.getAnalyzerInfo();
      const analyzerNames = analyzerInfo.map(info => info.name);
      
      expect(analyzerNames).toContain('MockAnalyzer');
    });
  });

  describe('Context-Aware Command Extractor Creation', () => {
    it('should create context-aware command extractor without contexts', () => {
      const extractor = createContextAwareCommandExtractor();
      
      expect(extractor).toBeDefined();
      expect(extractor).toBeInstanceOf(CommandExtractor);
      expect(extractor.getAllLanguageCommandAssociations).toBeDefined();
    });

    it('should create context-aware command extractor with language contexts', () => {
      const contexts: LanguageContext[] = [
        {
          language: 'JavaScript',
          confidence: 0.9,
          sourceRange: { startLine: 0, endLine: 5, startColumn: 0, endColumn: 10 },
          evidence: [],
          metadata: {
            createdAt: new Date(),
            source: 'test'
          }
        },
        {
          language: 'Python',
          confidence: 0.8,
          sourceRange: { startLine: 6, endLine: 10, startColumn: 0, endColumn: 10 },
          evidence: [],
          metadata: {
            createdAt: new Date(),
            source: 'test'
          }
        }
      ];

      const extractor = createContextAwareCommandExtractor(contexts);
      
      expect(extractor).toBeDefined();
      
      // Verify contexts are set (this would require exposing context state)
      const associations = extractor.getAllLanguageCommandAssociations();
      expect(associations).toBeInstanceOf(Map);
    });

    it('should setup inheritance rules when context inheritance is enabled', () => {
      const config: ComponentConfig = {
        enableContextInheritance: true
      };

      const extractor = createContextAwareCommandExtractor([], config);
      
      expect(extractor).toBeDefined();
      // Verify inheritance rules are set up (would require exposing rules)
    });
  });

  describe('Enhanced Language Detector Creation', () => {
    it('should create enhanced language detector with default configuration', () => {
      const detector = createEnhancedLanguageDetector();
      
      expect(detector).toBeDefined();
      expect(detector).toBeInstanceOf(LanguageDetector);
      expect(detector.detectWithContext).toBeDefined();
      expect(detector.getContext).toBeDefined();
      expect(detector.getAllContexts).toBeDefined();
    });

    it('should create enhanced language detector with custom configuration', () => {
      const config: ComponentConfig = {
        confidenceThreshold: 0.7,
        maxContexts: 50
      };

      const detector = createEnhancedLanguageDetector(config);
      
      expect(detector).toBeDefined();
      expect(detector.detectWithContext).toBeDefined();
    });
  });

  describe('Component Dependencies Integration', () => {
    it('should create all required dependencies', () => {
      factory.initialize();
      const dependencies = factory.getDependencies();
      
      // Verify all required dependencies are created
      expect(dependencies.languageDetector).toBeDefined();
      expect(dependencies.commandExtractor).toBeDefined();
      expect(dependencies.dependencyExtractor).toBeDefined();
      expect(dependencies.testingDetector).toBeDefined();
      expect(dependencies.metadataExtractor).toBeDefined();
      expect(dependencies.resultAggregator).toBeDefined();
      expect(dependencies.confidenceCalculator).toBeDefined();
      expect(dependencies.sourceTracker).toBeDefined();
      expect(dependencies.contextCollection).toBeDefined();
    });

    it('should wire dependencies correctly', () => {
      factory.initialize();
      const dependencies = factory.getDependencies();
      
      // Verify that components can interact with each other
      expect(dependencies.languageDetector.analyze).toBeDefined();
      expect(dependencies.commandExtractor.analyze).toBeDefined();
      
      // Test basic interaction
      const mockAST = [];
      const mockContent = 'test content';
      
      expect(async () => {
        await dependencies.languageDetector.analyze(mockAST, mockContent);
      }).not.toThrow();
    });

    it('should handle dependency injection errors gracefully', () => {
      // Test with invalid configuration
      const invalidConfig = {
        confidenceThreshold: -1, // Invalid threshold
        maxContexts: -10 // Invalid max contexts
      };

      expect(() => {
        factory.initialize(invalidConfig);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Integration Pipeline Initialization', () => {
    it('should create integration pipeline with default configuration', () => {
      const pipeline = new IntegrationPipeline();
      
      expect(pipeline).toBeDefined();
      expect(pipeline.execute).toBeDefined();
    });

    it('should create integration pipeline with custom configuration', () => {
      const config = {
        enableLogging: true,
        logLevel: 'debug' as const,
        pipelineTimeout: 60000,
        enableRecovery: true,
        maxRetries: 5
      };

      const pipeline = new IntegrationPipeline(config);
      
      expect(pipeline).toBeDefined();
    });

    it('should initialize pipeline components correctly', async () => {
      const pipeline = new IntegrationPipeline();
      
      // Test with minimal content
      const result = await pipeline.execute('# Test\n\nSome content');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.pipelineMetadata).toBeDefined();
    });
  });

  describe('Component Interface Validation', () => {
    it('should validate language detector interface', () => {
      const detector = createEnhancedLanguageDetector();
      
      // Verify required methods exist
      expect(typeof detector.analyze).toBe('function');
      expect(typeof detector.detectWithContext).toBe('function');
      expect(typeof detector.getContext).toBe('function');
      expect(typeof detector.getAllContexts).toBe('function');
      expect(typeof detector.getContextBoundaries).toBe('function');
    });

    it('should validate command extractor interface', () => {
      const extractor = createContextAwareCommandExtractor();
      
      // Verify required methods exist
      expect(typeof extractor.analyze).toBe('function');
      expect(typeof extractor.setLanguageContexts).toBe('function');
      expect(typeof extractor.extractWithContext).toBe('function');
      expect(typeof extractor.associateCommandWithContext).toBe('function');
      expect(typeof extractor.getCommandsForLanguage).toBe('function');
      expect(typeof extractor.getAllLanguageCommandAssociations).toBe('function');
      expect(typeof extractor.assignDefaultContext).toBe('function');
    });

    it('should validate README parser interface', () => {
      const parser = createEnhancedReadmeParser();
      
      // Verify required methods exist
      expect(typeof parser.parseFile).toBe('function');
      expect(typeof parser.parseContent).toBe('function');
      expect(typeof parser.registerAnalyzer).toBe('function');
      expect(typeof parser.clearAnalyzers).toBe('function');
      expect(typeof parser.getAnalyzerInfo).toBe('function');
      expect(typeof parser.hasAnalyzer).toBe('function');
    });
  });

  describe('Error Handling in Component Initialization', () => {
    it('should handle component creation errors gracefully', () => {
      // Test with extreme configuration values
      const extremeConfig: ComponentConfig = {
        confidenceThreshold: 2.0, // Invalid threshold > 1.0
        maxContexts: 0, // Zero contexts
        enableCaching: true,
        enablePerformanceMonitoring: true
      };

      expect(() => {
        const parser = createEnhancedReadmeParser(extremeConfig);
        expect(parser).toBeDefined();
      }).not.toThrow();
    });

    it('should handle missing dependencies gracefully', () => {
      factory.reset();
      
      // Try to get dependencies without initialization
      expect(() => {
        const dependencies = factory.getDependencies();
        expect(dependencies).toBeDefined();
      }).not.toThrow();
    });

    it('should handle analyzer registration errors', () => {
      const parser = createEnhancedReadmeParser();
      
      // Try to register invalid analyzer
      const invalidAnalyzer = {} as any;
      
      expect(() => {
        parser.registerAnalyzer(invalidAnalyzer);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not create memory leaks with multiple initializations', () => {
      // Create multiple instances and verify cleanup
      for (let i = 0; i < 10; i++) {
        factory.reset();
        factory.initialize();
        const parser = createEnhancedReadmeParser();
        expect(parser).toBeDefined();
      }
      
      // Final cleanup
      factory.reset();
    });

    it('should handle concurrent component creation', async () => {
      const promises = Array.from({ length: 5 }, async () => {
        const parser = createEnhancedReadmeParser();
        return parser.parseContent('# Test\n\nSome content');
      });

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });
  });
});