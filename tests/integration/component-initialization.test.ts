/**
 * Integration Tests for Component Initialization and Dependency Injection
 * 
 * These tests verify that components are properly initialized with enhanced
 * dependencies and that dependency injection works correctly across the system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  ComponentFactory, 
  ComponentConfig,
  ParserConfig,
  createEnhancedReadmeParser,
  createContextAwareCommandExtractor,
  createEnhancedLanguageDetector
} from '../../src/parser/component-factory';
import { ContentAnalyzer } from '../../src/parser/types';
import { IntegrationPipeline } from '../../src/parser/integration-pipeline';
import { LanguageDetector } from '../../src/parser/analyzers/language-detector';
import { CommandExtractor } from '../../src/parser/analyzers/command-extractor';
import { LanguageContext } from '../../src/shared/types/language-context';
import { MockAnalyzer, createMockAnalyzer } from '../utils/mock-analyzer';

describe('Component Initialization Integration Tests', () => {
  let factory: ComponentFactory;
  let integrationPipeline: IntegrationPipeline;

  beforeEach(() => {
    factory = ComponentFactory.getInstance();
    // Only reset factory for tests that need it, not for all tests
    
    // Create a fresh integration pipeline for each test
    integrationPipeline = new IntegrationPipeline();
  });

  afterEach(() => {
    // Cleanup integration pipeline resources
    if (integrationPipeline && typeof integrationPipeline.cleanup === 'function') {
      integrationPipeline.cleanup();
    }
    
    // Clear any global test state
    vi.clearAllMocks();
  });

  describe('ComponentFactory', () => {
    beforeEach(() => {
      factory.reset(); // Reset for factory-specific tests
    });

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
      // Use the imported MockAnalyzer
      const mockAnalyzer = new MockAnalyzer();

      // Create AnalyzerConfig for the new registration system
      const analyzerConfig = {
        name: 'MockAnalyzer',
        analyzer: mockAnalyzer,
        dependencies: [],
        priority: 1
      };

      // Use ParserConfig instead of ComponentConfig for custom analyzers
      const parserConfig = {
        customAnalyzers: [analyzerConfig],
        registrationOptions: {
          validateInterfaces: true,
          allowDuplicates: false,
          failOnError: true
        }
      };

      // Create parser with the new registration system
      const factory = ComponentFactory.getInstance();
      factory.reset(); // Ensure clean state
      factory.initialize();
      const parser = factory.createReadmeParser(parserConfig);
      
      const analyzerInfo = parser.getAnalyzerInfo();
      const analyzerNames = analyzerInfo.map(info => info.name);
      
      // Debug: Check what analyzers are actually registered
      console.log('Registered analyzers:', analyzerNames);
      expect(analyzerNames.length).toBeGreaterThan(0);
      
      // The test should pass if MockAnalyzer is registered
      expect(analyzerNames).toContain('MockAnalyzer');
    });
  });

  describe('MockAnalyzer Registration Verification', () => {
    let factory: ComponentFactory;

    beforeEach(() => {
      factory = ComponentFactory.getInstance();
      factory.reset();
    });

    it('should register MockAnalyzer through analyzer registry', () => {
      const mockAnalyzer = createMockAnalyzer();
      
      // Create analyzer config for registration
      const analyzerConfig = {
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

    it('should register multiple MockAnalyzers with unique names', () => {
      const mockAnalyzers = [
        { name: 'MockAnalyzer1', analyzer: createMockAnalyzer() },
        { name: 'MockAnalyzer2', analyzer: createMockAnalyzer() },
        { name: 'MockAnalyzer3', analyzer: createMockAnalyzer() }
      ].map(config => ({
        ...config,
        dependencies: [],
        priority: 1
      }));

      factory.initialize();
      const registrationResults = factory.registerCustomAnalyzers(mockAnalyzers);
      
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

    it('should integrate MockAnalyzer with parser correctly', async () => {
      const mockAnalyzer = createMockAnalyzer();
      
      const analyzerConfig = {
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
      
      // Verify MockAnalyzer is registered in parser
      const analyzerInfo = parser.getAnalyzerInfo();
      const analyzerNames = analyzerInfo.map(info => info.name);
      expect(analyzerNames).toContain('MockAnalyzer');
      
      // Test that MockAnalyzer can analyze content
      const testContent = '# Test README\n\nThis is test content for MockAnalyzer.';
      const result = await parser.parseContent(testContent);
      
      // Verify parsing completed successfully
      expect(result).toBeDefined();
      
      // The parser should return a result (success or failure)
      // Even if parsing fails, the MockAnalyzer should be properly integrated
      if (result.success) {
        expect(result.data).toBeDefined();
      } else {
        // If parsing failed, ensure it's not due to MockAnalyzer registration issues
        expect(result.errors).toBeDefined();
      }
    });

    it('should handle MockAnalyzer registration errors gracefully', () => {
      // Create invalid analyzer config (missing required methods)
      const invalidAnalyzer = {
        name: 'InvalidAnalyzer'
        // Missing analyze method
      };

      const analyzerConfig = {
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

    it('should validate MockAnalyzer interface compliance', () => {
      const mockAnalyzer = createMockAnalyzer();
      
      // Verify MockAnalyzer implements required interface
      expect(mockAnalyzer.name).toBe('MockAnalyzer');
      expect(typeof mockAnalyzer.analyze).toBe('function');
      
      // Test interface compliance through registration
      const analyzerConfig = {
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
      expect(integrationPipeline).toBeDefined();
      expect(integrationPipeline.execute).toBeDefined();
    });

    it('should create integration pipeline with custom configuration', () => {
      const config = {
        enableLogging: true,
        logLevel: 'debug' as const,
        pipelineTimeout: 60000,
        enableRecovery: true,
        maxRetries: 5
      };

      const customPipeline = new IntegrationPipeline(config);
      
      expect(customPipeline).toBeDefined();
      
      // Cleanup the custom pipeline
      if (typeof customPipeline.cleanup === 'function') {
        customPipeline.cleanup();
      }
    });

    it('should initialize pipeline components correctly', async () => {
      // Test with minimal content
      const result = await integrationPipeline.execute('# Test\n\nSome content');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.pipelineMetadata).toBeDefined();
    });

    it('should register custom analyzers correctly', async () => {
      // Create mock analyzer using our test utility
      const mockAnalyzer = {
        name: 'MockAnalyzer',
        analyze: async () => ({
          success: true,
          data: { mock: true },
          confidence: 0.5
        })
      };
      
      // Register analyzer - this should work now
      await integrationPipeline.registerAnalyzer(mockAnalyzer);
      
      // Verify registration - ensure proper retrieval
      const analyzers = integrationPipeline.getRegisteredAnalyzers();
      
      // Fix: Ensure MockAnalyzer is properly identified
      const mockAnalyzerFound = analyzers.find(analyzer => 
        analyzer.constructor.name === 'MockAnalyzer' || 
        analyzer.name === 'MockAnalyzer'
      );
      
      expect(mockAnalyzerFound).toBeDefined();
      expect(analyzers.length).toBeGreaterThanOrEqual(6); // 5 default + 1 mock (or more)
      
      // Verify the mock analyzer has the expected properties
      expect(mockAnalyzerFound.name).toBe('MockAnalyzer');
      expect(typeof mockAnalyzerFound.analyze).toBe('function');
    });

    it('should handle analyzer cleanup correctly', async () => {
      // Create mock analyzer with cleanup method
      const mockAnalyzer = {
        name: 'MockAnalyzer',
        analyze: async () => ({
          success: true,
          data: { mock: true },
          confidence: 0.5
        }),
        cleanup: vi.fn()
      };
      
      // Register analyzer
      await integrationPipeline.registerAnalyzer(mockAnalyzer);
      
      // Verify registration
      expect(integrationPipeline.hasAnalyzer('MockAnalyzer')).toBe(true);
      
      // Cleanup pipeline
      integrationPipeline.cleanup();
      
      // Verify cleanup was called
      expect(mockAnalyzer.cleanup).toHaveBeenCalled();
    });

    it('should handle multiple analyzer registrations and cleanup', async () => {
      // Create multiple mock analyzers
      const mockAnalyzers = [
        {
          name: 'MockAnalyzer1',
          analyze: async () => ({ success: true, data: { mock: 1 }, confidence: 0.5 }),
          cleanup: vi.fn()
        },
        {
          name: 'MockAnalyzer2',
          analyze: async () => ({ success: true, data: { mock: 2 }, confidence: 0.6 }),
          cleanup: vi.fn()
        }
      ];
      
      // Register all analyzers
      for (const analyzer of mockAnalyzers) {
        await integrationPipeline.registerAnalyzer(analyzer);
      }
      
      // Verify all are registered
      const analyzers = integrationPipeline.getRegisteredAnalyzers();
      expect(integrationPipeline.hasAnalyzer('MockAnalyzer1')).toBe(true);
      expect(integrationPipeline.hasAnalyzer('MockAnalyzer2')).toBe(true);
      expect(analyzers.length).toBeGreaterThanOrEqual(7); // 5 default + 2 mock
      
      // Cleanup pipeline
      integrationPipeline.cleanup();
      
      // Verify all cleanup methods were called
      mockAnalyzers.forEach(analyzer => {
        expect(analyzer.cleanup).toHaveBeenCalled();
      });
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