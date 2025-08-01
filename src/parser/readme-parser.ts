/**
 * Main README Parser implementation
 */

import { Token } from 'marked';
import { 
  ReadmeParser, 
  ParseResult, 
  ProjectInfo, 
  ParseError,
  ContentAnalyzer,
  ConfidenceScores,
  AnalysisResult
} from './types';
import { AnalyzerRegistry } from './analyzers/analyzer-registry';
import { FileReader } from './utils/file-reader';
import { MarkdownParser } from './utils/markdown-parser';
import { ResultAggregator } from './utils/result-aggregator';
import { 
  LanguageDetectorAdapter,
  DependencyExtractorAdapter,
  CommandExtractorAdapter,
  TestingDetectorAdapter
} from './analyzers/analyzer-adapters';
import { MetadataExtractor } from './analyzers/metadata-extractor';
import { ASTCache, globalASTCache } from './utils/ast-cache';
import { PerformanceMonitor, globalPerformanceMonitor } from './utils/performance-monitor';
import { StreamingFileReader } from './utils/streaming-file-reader';

/**
 * Main README Parser implementation that orchestrates content analysis across multiple analyzers.
 * 
 * This class provides the primary interface for parsing README files and extracting structured
 * project information including languages, dependencies, commands, testing frameworks, and metadata.
 * 
 * @example
 * ```typescript
 * const parser = new ReadmeParserImpl();
 * 
 * // Parse from file
 * const result = await parser.parseFile('README.md');
 * if (result.success) {
 *   console.log('Languages:', result.data.languages);
 *   console.log('Dependencies:', result.data.dependencies);
 * }
 * 
 * // Parse from content
 * const contentResult = await parser.parseContent(readmeContent);
 * ```
 */
export class ReadmeParserImpl implements ReadmeParser {
  private analyzerRegistry: AnalyzerRegistry;
  private fileReader: FileReader;
  private streamingFileReader: StreamingFileReader;
  private markdownParser: MarkdownParser;
  private resultAggregator: ResultAggregator;
  private astCache: ASTCache;
  private performanceMonitor: PerformanceMonitor;
  private integrationPipeline?: any; // IntegrationPipeline
  private useIntegrationPipeline: boolean;

  constructor(options?: {
    enableCaching?: boolean;
    enablePerformanceMonitoring?: boolean;
    cacheOptions?: any;
    performanceOptions?: any;
    useIntegrationPipeline?: boolean;
  }) {
    this.analyzerRegistry = new AnalyzerRegistry();
    this.fileReader = new FileReader();
    this.streamingFileReader = new StreamingFileReader();
    this.markdownParser = new MarkdownParser();
    this.resultAggregator = new ResultAggregator();
    
    // Initialize performance features
    this.astCache = options?.enableCaching !== false ? 
      (options?.cacheOptions ? new ASTCache(options.cacheOptions) : globalASTCache) : 
      new ASTCache({ maxEntries: 0 }); // Disabled cache
      
    this.performanceMonitor = options?.enablePerformanceMonitoring !== false ?
      (options?.performanceOptions ? new PerformanceMonitor(options.performanceOptions) : globalPerformanceMonitor) :
      new PerformanceMonitor({ enabled: false });
    
    // Initialize integration pipeline by default for proper component integration
    this.useIntegrationPipeline = options?.useIntegrationPipeline ?? true;
    if (this.useIntegrationPipeline) {
      // Lazy import to avoid circular dependencies
      this.initializeIntegrationPipeline();
    }
    
    // Auto-register default analyzers
    this.registerDefaultAnalyzers();
  }

  /**
   * Initialize IntegrationPipeline for enhanced processing
   */
  private async initializeIntegrationPipeline(): Promise<void> {
    try {
      const { IntegrationPipeline } = await import('./integration-pipeline');
      this.integrationPipeline = new IntegrationPipeline({
        enableLogging: true,
        logLevel: 'info',
        enablePerformanceMonitoring: true
      });
    } catch (error) {
      console.warn('Failed to initialize IntegrationPipeline, falling back to standard analyzers:', error);
      this.useIntegrationPipeline = false;
    }
  }

  /**
   * Register default analyzers that should always be available
   */
  private registerDefaultAnalyzers(): void {
    this.analyzerRegistry.register(new LanguageDetectorAdapter());
    this.analyzerRegistry.register(new DependencyExtractorAdapter());
    this.analyzerRegistry.register(new CommandExtractorAdapter());
    this.analyzerRegistry.register(new TestingDetectorAdapter());
    this.analyzerRegistry.register(new MetadataExtractor());
  }

  /**
   * Register a content analyzer
   */
  registerAnalyzer(analyzer: ContentAnalyzer): void {
    this.analyzerRegistry.register(analyzer);
  }

  /**
   * Clear all registered analyzers (primarily for testing)
   */
  clearAnalyzers(): void {
    this.analyzerRegistry.clear();
  }

  /**
   * Parse a README file from the filesystem and extract structured project information.
   * 
   * @param filePath - Absolute or relative path to the README file
   * @returns Promise resolving to ParseResult with extracted project information or errors
   * 
   * @example
   * ```typescript
   * const result = await parser.parseFile('./README.md');
   * if (result.success) {
   *   console.log('Project name:', result.data.metadata.name);
   *   console.log('Languages found:', result.data.languages.map(l => l.name));
   *   console.log('Overall confidence:', result.data.confidence.overall);
   * } else {
   *   console.error('Parse errors:', result.errors);
   * }
   * ```
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    return this.performanceMonitor.timeOperation('parseFile', async () => {
      // Check if we should use streaming for large files
      const shouldStream = await this.streamingFileReader.shouldUseStreaming(filePath);
      
      if (shouldStream) {
        // Use streaming file reader for large files
        const readResult = await this.streamingFileReader.readFileStreaming(filePath);
        
        if (!readResult.success) {
          return {
            success: false,
            errors: [readResult.error]
          };
        }

        // Parse the content using the file content
        return await this.parseContent(readResult.data.content);
      } else {
        // Use regular FileReader for small files
        const readResult = await this.fileReader.readFile(filePath);
        
        if (!readResult.success) {
          return {
            success: false,
            errors: [readResult.error]
          };
        }

        // Parse the content using the file content
        return await this.parseContent(readResult.data.content);
      }
    }, { filePath });
  }

  /**
   * Parse README content directly from a string and extract structured project information.
   * 
   * @param content - Raw README content as a string
   * @returns Promise resolving to ParseResult with extracted project information or errors
   * 
   * @example
   * ```typescript
   * const readmeContent = `
   * # My Project
   * A Node.js application built with TypeScript.
   * 
   * ## Installation
   * \`\`\`bash
   * npm install
   * npm test
   * \`\`\`
   * `;
   * 
   * const result = await parser.parseContent(readmeContent);
   * if (result.success) {
   *   console.log('Languages:', result.data.languages); // [{ name: 'JavaScript', confidence: 0.8, ... }]
   *   console.log('Commands:', result.data.commands.install); // [{ command: 'npm install', ... }]
   * }
   * ```
   */
  async parseContent(content: string): Promise<ParseResult> {
    return this.performanceMonitor.timeOperation('parseContent', async () => {
      // Validate input
      if (typeof content !== 'string') {
        return this.createErrorResult('INVALID_INPUT', 'Content must be a string');
      }

      if (content.trim().length === 0) {
        // Empty content should be treated as an error
        return this.createErrorResult('EMPTY_CONTENT', 'Content cannot be empty or contain only whitespace');
      }

      // Check cache first
      const cachedEntry = this.astCache.get(content);
      let ast: Token[];
      let rawContent: string;
      let parseTime: number;

      if (cachedEntry) {
        // Use cached AST
        ast = cachedEntry.ast;
        rawContent = cachedEntry.rawContent;
        parseTime = 0; // No parsing time since we used cache
      } else {
        // Parse content and cache result
        const parseResult = await this.performanceMonitor.timeOperation('markdownParse', async () => {
          return this.markdownParser.parseContent(content);
        });
        
        if (!parseResult.success) {
          return {
            success: false,
            errors: [parseResult.error]
          };
        }

        ast = parseResult.data.ast;
        rawContent = parseResult.data.rawContent;
        parseTime = parseResult.data.processingTime;

        // Cache the parsed AST
        this.astCache.set(content, ast, parseTime);
      }
    
    try {
      // Use IntegrationPipeline if available and enabled
      if (this.useIntegrationPipeline && this.integrationPipeline) {
        const pipelineResult = await this.integrationPipeline.execute(content);
        
        if (pipelineResult.success && pipelineResult.data) {
          return {
            success: true,
            data: pipelineResult.data
          };
        } else {
          // If pipeline fails, fall back to standard analyzers
          console.warn('IntegrationPipeline failed, falling back to standard analyzers:', pipelineResult.errors);
        }
      }
      
      // Get all registered analyzers
      const analyzers = this.analyzerRegistry.getAll();
      if (analyzers.length === 0) {
        return this.createErrorResult('NO_ANALYZERS', 'No analyzers registered');
      }

      // Execute analyzers in parallel with optimized timeout and error isolation
      const analysisPromises = analyzers.map(async analyzer => {
        return this.performanceMonitor.timeOperation(`analyzer_${analyzer.name}`, async () => {
          try {
            // Reduced timeout for better performance (5 seconds instead of 10)
            const timeoutPromise = new Promise<AnalysisResult>((_, reject) => {
              setTimeout(() => reject(new Error('Analyzer timeout')), 5000);
            });

            const analysisPromise = this.runAnalyzer(analyzer, ast, rawContent);
            const result = await Promise.race([analysisPromise, timeoutPromise]);
            
            return { 
              analyzerName: analyzer.name, 
              result,
              success: true 
            };
          } catch (error) {
            // Create error result for failed analyzer
            const errorResult: AnalysisResult = {
              data: null,
              confidence: 0,
              sources: [],
              errors: [{
                code: 'ANALYZER_EXECUTION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown analyzer error',
                component: analyzer.name,
                severity: 'error'
              }]
            };
            
            return { 
              analyzerName: analyzer.name, 
              result: errorResult,
              success: false 
            };
          }
        }, { analyzerName: analyzer.name });
      });

      // Wait for all analyzers to complete (or fail)
      const analysisResults = await Promise.allSettled(analysisPromises);
      
      // Prepare results map for aggregation
      const resultsMap = new Map<string, AnalysisResult>();
      const analyzerErrors: ParseError[] = [];
      let successfulAnalyzers = 0;
      
      for (const promiseResult of analysisResults) {
        if (promiseResult.status === 'fulfilled') {
          const { analyzerName, result, success } = promiseResult.value;
          
          if (result) {
            resultsMap.set(analyzerName, result);
            if (success && result.data !== null) {
              successfulAnalyzers++;
            }
            
            // Collect analyzer-specific errors
            if (result.errors) {
              analyzerErrors.push(...result.errors);
            }
          }
        } else {
          // Promise was rejected
          analyzerErrors.push({
            code: 'ANALYZER_PROMISE_REJECTED',
            message: `Analyzer promise rejected: ${promiseResult.reason}`,
            component: 'ReadmeParser',
            severity: 'error'
          });
        }
      }
      
      // Check if we have any successful results
      if (successfulAnalyzers === 0) {
        return {
          success: false,
          errors: [
            {
              code: 'ALL_ANALYZERS_FAILED',
              message: 'All analyzers failed to process the content',
              component: 'ReadmeParser',
              severity: 'error'
            },
            ...analyzerErrors
          ]
        };
      }
      
      // Aggregate results using ResultAggregator
      const projectInfo = await this.performanceMonitor.timeOperation('resultAggregation', async () => {
        return this.resultAggregator.aggregate(resultsMap);
      });
      const aggregatorErrors = this.resultAggregator.getErrors();
      const aggregatorWarnings = this.resultAggregator.getWarnings();

      // Combine all errors
      const allErrors = [...analyzerErrors, ...aggregatorErrors];
      const allWarnings = aggregatorWarnings.map(w => w.message);

      // Add performance metadata
      const performanceInfo = {
        analyzersRun: analyzers.length,
        analyzersSuccessful: successfulAnalyzers,
        analyzersFailed: analyzers.length - successfulAnalyzers
      };

      const result: ParseResult = {
        success: true,
        data: {
          ...projectInfo,
          // Add performance metadata to confidence scores
          confidence: {
            ...projectInfo.confidence,
            // Adjust overall confidence based on analyzer success rate
            overall: projectInfo.confidence.overall * (successfulAnalyzers / analyzers.length)
          }
        }
      };
      
      // Add errors and warnings if they exist
      if (allErrors.length > 0) {
        result.errors = allErrors;
      }
      if (allWarnings.length > 0) {
        result.warnings = allWarnings;
      }
      
      return result;

    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResult('PARSE_ERROR', `Failed to analyze content: ${error.message}`);
      }
      return this.createErrorResult('UNKNOWN_ERROR', 'An unknown error occurred during analysis');
    }
    }, { contentLength: content ? content.length : 0 });
  }  /**
   * Run a single analyzer with comprehensive error handling
   */
  private async runAnalyzer(
    analyzer: ContentAnalyzer, 
    ast: Token[], 
    content: string
  ): Promise<AnalysisResult> {
    try {
      // Validate analyzer
      if (!analyzer || typeof analyzer.analyze !== 'function') {
        throw new Error('Invalid analyzer: missing analyze method');
      }

      // Validate inputs
      if (!Array.isArray(ast)) {
        throw new Error('Invalid AST: must be an array of tokens');
      }

      if (typeof content !== 'string') {
        throw new Error('Invalid content: must be a string');
      }

      // Execute analyzer
      const result = await analyzer.analyze(ast, content);
      
      // Validate result structure
      if (!result || typeof result !== 'object') {
        throw new Error('Analyzer returned invalid result structure');
      }

      // Ensure required properties exist
      const validatedResult: AnalysisResult = {
        data: result.data ?? null,
        confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0,
        sources: Array.isArray(result.sources) ? result.sources : [],
        errors: Array.isArray(result.errors) ? result.errors : []
      };

      return validatedResult;

    } catch (error) {
      // Return error result that can be handled in aggregation
      return {
        data: null,
        confidence: 0,
        sources: [],
        errors: [{
          code: 'ANALYZER_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown analyzer error',
          component: analyzer.name,
          severity: 'error',
          details: {
            analyzerName: analyzer.name,
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            timestamp: new Date().toISOString()
          }
        }]
      };
    }
  }



  /**
   * Get information about registered analyzers
   */
  getAnalyzerInfo(): { name: string; registered: boolean }[] {
    return this.analyzerRegistry.getAll().map(analyzer => ({
      name: analyzer.name,
      registered: true
    }));
  }

  /**
   * Check if a specific analyzer is registered
   */
  hasAnalyzer(analyzerName: string): boolean {
    return this.analyzerRegistry.getAll().some(analyzer => analyzer.name === analyzerName);
  }

  /**
   * Parse content with specific analyzers only
   */
  async parseContentWithAnalyzers(content: string, analyzerNames: string[]): Promise<ParseResult> {
    // Temporarily store current analyzers
    const originalAnalyzers = this.analyzerRegistry.getAll();
    
    try {
      // Clear and register only specified analyzers
      this.analyzerRegistry.clear();
      
      for (const analyzerName of analyzerNames) {
        const analyzer = originalAnalyzers.find(a => a.name === analyzerName);
        if (analyzer) {
          this.analyzerRegistry.register(analyzer);
        }
      }
      
      // Parse with limited analyzers
      const result = await this.parseContent(content);
      
      return result;
      
    } finally {
      // Restore original analyzers
      this.analyzerRegistry.clear();
      originalAnalyzers.forEach(analyzer => this.analyzerRegistry.register(analyzer));
    }
  }

  /**
   * Validate README content before parsing
   */
  validateContent(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || typeof content !== 'string') {
      errors.push('Content must be a non-empty string');
    } else {
      if (content.trim().length === 0) {
        errors.push('Content cannot be empty');
      }

      if (content.length > 1024 * 1024) { // 1MB limit
        errors.push('Content exceeds maximum size limit (1MB)');
      }

      // Check for basic markdown structure
      if (!content.includes('#') && !content.includes('*') && !content.includes('-')) {
        errors.push('Content does not appear to contain markdown formatting');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get parser statistics and health information
   */
  getParserInfo(): {
    analyzersRegistered: number;
    analyzerNames: string[];
    version: string;
    capabilities: string[];
    performance: any;
    cache: any;
  } {
    const analyzers = this.analyzerRegistry.getAll();
    
    return {
      analyzersRegistered: analyzers.length,
      analyzerNames: analyzers.map(a => a.name),
      version: '1.0.0', // Could be imported from package.json
      capabilities: [
        'language-detection',
        'dependency-extraction', 
        'command-extraction',
        'testing-detection',
        'metadata-extraction',
        'parallel-processing',
        'error-recovery',
        'confidence-scoring',
        'ast-caching',
        'performance-monitoring',
        'streaming-support'
      ],
      performance: this.performanceMonitor.getAllStats(),
      cache: this.astCache.getStats()
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return this.performanceMonitor.getAllStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.astCache.getStats();
  }

  /**
   * Clear performance and cache data
   */
  clearPerformanceData(): void {
    this.performanceMonitor.clear();
    this.astCache.clear();
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): string {
    return this.performanceMonitor.getFormattedMemoryUsage();
  }

  /**
   * Create a standardized error result
   */
  private createErrorResult(code: string, message: string, details?: any): ParseResult {
    return {
      success: false,
      errors: [{
        code,
        message,
        component: 'ReadmeParser',
        severity: 'error',
        details: details ? { ...details, timestamp: new Date().toISOString() } : undefined
      }]
    };
  }
}