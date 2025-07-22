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

/**
 * Main README Parser class that orchestrates content analysis
 */
export class ReadmeParserImpl implements ReadmeParser {
  private analyzerRegistry: AnalyzerRegistry;
  private fileReader: FileReader;
  private markdownParser: MarkdownParser;
  private resultAggregator: ResultAggregator;

  constructor() {
    this.analyzerRegistry = new AnalyzerRegistry();
    this.fileReader = new FileReader();
    this.markdownParser = new MarkdownParser();
    this.resultAggregator = new ResultAggregator();
  }

  /**
   * Register a content analyzer
   */
  registerAnalyzer(analyzer: ContentAnalyzer): void {
    this.analyzerRegistry.register(analyzer);
  }

  /**
   * Parse a README file from the filesystem
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    // Use FileReader to read the file
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

  /**
   * Parse README content directly
   */
  async parseContent(content: string): Promise<ParseResult> {
    // Use MarkdownParser to parse the content
    const parseResult = await this.markdownParser.parseContent(content);
    
    if (!parseResult.success) {
      return {
        success: false,
        errors: [parseResult.error]
      };
    }

    const { ast, rawContent } = parseResult.data;
    
    try {
      // Run all analyzers
      const analyzers = this.analyzerRegistry.getAll();
      if (analyzers.length === 0) {
        return this.createErrorResult('NO_ANALYZERS', 'No analyzers registered');
      }

      // Execute analyzers in parallel
      const analysisPromises = analyzers.map(async analyzer => {
        const result = await this.runAnalyzer(analyzer, ast, rawContent);
        return { analyzerName: analyzer.name, result };
      });

      const analysisResults = await Promise.allSettled(analysisPromises);
      
      // Prepare results map for aggregation
      const resultsMap = new Map<string, AnalysisResult>();
      
      for (const promiseResult of analysisResults) {
        if (promiseResult.status === 'fulfilled' && promiseResult.value.result) {
          resultsMap.set(promiseResult.value.analyzerName, promiseResult.value.result);
        }
      }
      
      // Aggregate results using ResultAggregator
      const projectInfo = await this.resultAggregator.aggregate(resultsMap);
      const errors = this.resultAggregator.getErrors();
      const warnings = this.resultAggregator.getWarnings();

      const result: ParseResult = {
        success: true,
        data: projectInfo
      };
      
      if (errors.length > 0) result.errors = errors;
      if (warnings.length > 0) result.warnings = warnings.map(w => w.message);
      
      return result;

    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResult('PARSE_ERROR', `Failed to analyze content: ${error.message}`);
      }
      return this.createErrorResult('UNKNOWN_ERROR', 'An unknown error occurred during analysis');
    }
  }  /**
   * Run a single analyzer with error handling
   */
  private async runAnalyzer(
    analyzer: ContentAnalyzer, 
    ast: Token[], 
    content: string
  ): Promise<AnalysisResult | null> {
    try {
      return await analyzer.analyze(ast, content);
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
          severity: 'error'
        }]
      };
    }
  }



  /**
   * Create a standardized error result
   */
  private createErrorResult(code: string, message: string): ParseResult {
    return {
      success: false,
      errors: [{
        code,
        message,
        component: 'ReadmeParser',
        severity: 'error'
      }]
    };
  }
}