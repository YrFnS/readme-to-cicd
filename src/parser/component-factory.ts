/**
 * Component Factory for Enhanced Integration
 * 
 * This factory creates and configures components with proper dependency injection
 * for the enhanced integration system, including language context inheritance
 * and confidence scoring capabilities.
 */

import { ReadmeParserImpl } from './readme-parser';
import { LanguageDetector } from './analyzers/language-detector';
import { CommandExtractor } from './analyzers/command-extractor';
import { DependencyExtractor } from './analyzers/dependency-extractor';
import { TestingDetector } from './analyzers/testing-detector';
import { MetadataExtractor } from './analyzers/metadata-extractor';
import { ResultAggregator } from './utils/result-aggregator';
import { ConfidenceCalculator } from './analyzers/confidence-calculator';
import { SourceTracker } from './analyzers/source-tracker';
import { ContextCollection } from '../shared/types/context-manager';
import { LanguageContext } from '../shared/types/language-context';
import { ContentAnalyzer, AnalysisResult } from './types';

/**
 * Configuration options for component initialization
 */
export interface ComponentConfig {
  /** Enable AST caching for performance */
  enableCaching?: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Confidence threshold for language detection */
  confidenceThreshold?: number;
  /** Maximum number of contexts to track */
  maxContexts?: number;
  /** Enable context inheritance */
  enableContextInheritance?: boolean;
  /** Custom analyzers to register */
  customAnalyzers?: ContentAnalyzer[];
}

/**
 * Dependency injection container for enhanced components
 */
export interface ComponentDependencies {
  /** Enhanced language detector with confidence scoring */
  languageDetector: LanguageDetector;
  /** Context-aware command extractor */
  commandExtractor: CommandExtractor;
  /** Dependency extractor */
  dependencyExtractor: DependencyExtractor;
  /** Testing framework detector */
  testingDetector: TestingDetector;
  /** Metadata extractor */
  metadataExtractor: MetadataExtractor;
  /** Result aggregator with integration capabilities */
  resultAggregator: ResultAggregator;
  /** Confidence calculator */
  confidenceCalculator: ConfidenceCalculator;
  /** Source tracker for evidence management */
  sourceTracker: SourceTracker;
  /** Context collection manager */
  contextCollection: ContextCollection;
}

/**
 * Enhanced component factory with dependency injection
 */
export class ComponentFactory {
  private static instance: ComponentFactory;
  private dependencies: ComponentDependencies | null = null;
  private config: ComponentConfig = {};

  private constructor() {}

  /**
   * Get singleton instance of the component factory
   */
  public static getInstance(): ComponentFactory {
    if (!ComponentFactory.instance) {
      ComponentFactory.instance = new ComponentFactory();
    }
    return ComponentFactory.instance;
  }

  /**
   * Initialize the factory with configuration
   */
  public initialize(config: ComponentConfig = {}): void {
    this.config = {
      enableCaching: true,
      enablePerformanceMonitoring: true,
      confidenceThreshold: 0.5,
      maxContexts: 100,
      enableContextInheritance: true,
      ...config
    };

    // Clear existing dependencies to force recreation
    this.dependencies = null;
  }

  /**
   * Create and configure all component dependencies
   */
  public createDependencies(): ComponentDependencies {
    if (this.dependencies) {
      return this.dependencies;
    }

    // Create core infrastructure components
    const confidenceCalculator = new ConfidenceCalculator();
    const sourceTracker = new SourceTracker();
    const contextCollection = new ContextCollection(this.config.confidenceThreshold);

    // Create enhanced language detector
    const languageDetector = new LanguageDetector();

    // Create context-aware command extractor
    const commandExtractor = new CommandExtractor();
    
    // Setup context inheritance if enabled
    if (this.config.enableContextInheritance) {
      this.setupContextInheritance(commandExtractor);
    }

    // Create other analyzers
    const dependencyExtractor = new DependencyExtractor();
    const testingDetector = new TestingDetector();
    const metadataExtractor = new MetadataExtractor();

    // Create enhanced result aggregator
    const resultAggregator = new ResultAggregator();

    this.dependencies = {
      languageDetector,
      commandExtractor,
      dependencyExtractor,
      testingDetector,
      metadataExtractor,
      resultAggregator,
      confidenceCalculator,
      sourceTracker,
      contextCollection
    };

    return this.dependencies;
  }

  /**
   * Create a fully configured README parser with enhanced dependencies
   */
  public createReadmeParser(): ReadmeParserImpl {
    const dependencies = this.createDependencies();
    
    // Create parser with enhanced configuration
    const parser = new ReadmeParserImpl({
      enableCaching: this.config.enableCaching ?? true,
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring ?? true
    });

    // Clear existing analyzers and register enhanced ones
    parser.clearAnalyzers();
    
    // Register enhanced analyzers with proper adapters
    parser.registerAnalyzer(new EnhancedLanguageDetectorAdapter(dependencies.languageDetector));
    parser.registerAnalyzer(new EnhancedCommandExtractorAdapter(dependencies.commandExtractor));
    parser.registerAnalyzer(new EnhancedDependencyExtractorAdapter(dependencies.dependencyExtractor));
    parser.registerAnalyzer(new EnhancedTestingDetectorAdapter(dependencies.testingDetector));
    parser.registerAnalyzer(new EnhancedMetadataExtractorAdapter(dependencies.metadataExtractor));

    // Register custom analyzers if provided
    if (this.config.customAnalyzers) {
      this.config.customAnalyzers.forEach(analyzer => {
        parser.registerAnalyzer(analyzer);
      });
    }

    return parser;
  }

  /**
   * Create a context-aware command extractor with language context inheritance
   */
  public createContextAwareCommandExtractor(languageContexts?: LanguageContext[]): CommandExtractor {
    const dependencies = this.createDependencies();
    const commandExtractor = dependencies.commandExtractor;

    // Set language contexts if provided
    if (languageContexts) {
      commandExtractor.setLanguageContexts(languageContexts);
    }

    return commandExtractor;
  }

  /**
   * Create an enhanced language detector with confidence scoring
   */
  public createEnhancedLanguageDetector(): LanguageDetector {
    const dependencies = this.createDependencies();
    return dependencies.languageDetector;
  }

  /**
   * Create an integrated result aggregator
   */
  public createIntegratedResultAggregator(): ResultAggregator {
    const dependencies = this.createDependencies();
    return dependencies.resultAggregator;
  }

  /**
   * Get current dependencies (creates them if they don't exist)
   */
  public getDependencies(): ComponentDependencies {
    return this.createDependencies();
  }

  /**
   * Reset the factory (useful for testing)
   */
  public reset(): void {
    this.dependencies = null;
    this.config = {};
  }

  /**
   * Setup context inheritance rules for command extractor
   */
  private setupContextInheritance(commandExtractor: CommandExtractor): void {
    // Add default inheritance rules
    commandExtractor.addInheritanceRule({
      condition: 'no-child-context',
      action: 'inherit',
      priority: 1,
      description: 'Inherit parent context when no specific context is available'
    });

    commandExtractor.addInheritanceRule({
      condition: 'high-confidence',
      action: 'override',
      priority: 2,
      description: 'Use child context when confidence is high'
    });

    commandExtractor.addInheritanceRule({
      condition: 'low-confidence',
      action: 'merge',
      priority: 3,
      description: 'Merge contexts when child has low confidence'
    });
  }
}

/**
 * Enhanced adapter for language detector with context generation
 */
class EnhancedLanguageDetectorAdapter implements ContentAnalyzer {
  readonly name = 'EnhancedLanguageDetector';
  
  constructor(private detector: LanguageDetector) {}
  
  async analyze(ast: any, rawContent: string): Promise<AnalysisResult> {
    try {
      const result = await this.detector.analyze(ast, rawContent);
      
      // Store contexts for other components to use
      const contexts = this.detector.getAllContexts();
      
      return {
        data: result.success ? result.data : null,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.success ? [] : (result.errors || [])
      };
    } catch (error) {
      return {
        data: null,
        confidence: 0,
        sources: [],
        errors: [{
          code: 'ENHANCED_LANGUAGE_DETECTION_ERROR',
          message: `Enhanced language detection failed: ${(error as Error).message}`,
          component: 'EnhancedLanguageDetector',
          severity: 'error'
        }]
      };
    }
  }
}

/**
 * Enhanced adapter for command extractor with context inheritance
 */
class EnhancedCommandExtractorAdapter implements ContentAnalyzer {
  readonly name = 'EnhancedCommandExtractor';
  
  constructor(private extractor: CommandExtractor) {}
  
  async analyze(ast: any, rawContent: string): Promise<AnalysisResult> {
    try {
      const result = await this.extractor.analyze(ast, rawContent);
      
      return {
        data: result.success ? result.data : null,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.success ? [] : (result.errors || [])
      };
    } catch (error) {
      return {
        data: null,
        confidence: 0,
        sources: [],
        errors: [{
          code: 'ENHANCED_COMMAND_EXTRACTION_ERROR',
          message: `Enhanced command extraction failed: ${(error as Error).message}`,
          component: 'EnhancedCommandExtractor',
          severity: 'error'
        }]
      };
    }
  }
}

/**
 * Enhanced adapter for dependency extractor
 */
class EnhancedDependencyExtractorAdapter implements ContentAnalyzer {
  readonly name = 'EnhancedDependencyExtractor';
  
  constructor(private extractor: DependencyExtractor) {}
  
  async analyze(ast: any, rawContent: string): Promise<AnalysisResult> {
    const result = await this.extractor.analyze(ast, rawContent);
    return this.convertResult(result);
  }

  private convertResult(result: any): AnalysisResult {
    if (result.success) {
      return {
        data: result.data,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.errors
      };
    } else {
      return {
        data: null,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.errors
      };
    }
  }
}

/**
 * Enhanced adapter for testing detector
 */
class EnhancedTestingDetectorAdapter implements ContentAnalyzer {
  readonly name = 'EnhancedTestingDetector';
  
  constructor(private detector: TestingDetector) {}
  
  async analyze(ast: any, rawContent: string): Promise<AnalysisResult> {
    const result = await this.detector.analyze(ast, rawContent);
    return this.convertResult(result);
  }

  private convertResult(result: any): AnalysisResult {
    if (result.success) {
      return {
        data: result.data,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.errors
      };
    } else {
      return {
        data: null,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.errors
      };
    }
  }
}

/**
 * Enhanced adapter for metadata extractor
 */
class EnhancedMetadataExtractorAdapter implements ContentAnalyzer {
  readonly name = 'EnhancedMetadataExtractor';
  
  constructor(private extractor: MetadataExtractor) {}
  
  async analyze(ast: any, rawContent: string): Promise<AnalysisResult> {
    const result = await this.extractor.analyze(ast, rawContent);
    return this.convertResult(result);
  }

  private convertResult(result: any): AnalysisResult {
    if (result.success) {
      return {
        data: result.data,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.errors
      };
    } else {
      return {
        data: null,
        confidence: result.confidence,
        sources: result.sources || [],
        errors: result.errors
      };
    }
  }
}

/**
 * Factory function to create a README parser with enhanced integration
 */
export function createEnhancedReadmeParser(config?: ComponentConfig): ReadmeParserImpl {
  const factory = ComponentFactory.getInstance();
  factory.initialize(config);
  return factory.createReadmeParser();
}

/**
 * Factory function to create context-aware command extractor
 */
export function createContextAwareCommandExtractor(
  languageContexts?: LanguageContext[],
  config?: ComponentConfig
): CommandExtractor {
  const factory = ComponentFactory.getInstance();
  factory.initialize(config);
  return factory.createContextAwareCommandExtractor(languageContexts);
}

/**
 * Factory function to create enhanced language detector
 */
export function createEnhancedLanguageDetector(config?: ComponentConfig): LanguageDetector {
  const factory = ComponentFactory.getInstance();
  factory.initialize(config);
  return factory.createEnhancedLanguageDetector();
}