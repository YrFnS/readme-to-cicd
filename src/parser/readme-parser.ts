/**
 * Main README Parser implementation
 */

import { promises as fs } from 'fs';
import { marked, Token } from 'marked';
import { 
  ReadmeParser, 
  ParseResult, 
  ProjectInfo, 
  ParseError,
  ContentAnalyzer,
  ConfidenceScores
} from './types';
import { AnalyzerRegistry } from './analyzers/analyzer-registry';

/**
 * Main README Parser class that orchestrates content analysis
 */
export class ReadmeParserImpl implements ReadmeParser {
  private analyzerRegistry: AnalyzerRegistry;

  constructor() {
    this.analyzerRegistry = new AnalyzerRegistry();
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
    try {
      // Validate file path
      if (!filePath || typeof filePath !== 'string') {
        return this.createErrorResult('INVALID_PATH', 'File path is required and must be a string');
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      return await this.parseContent(content);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          return this.createErrorResult('FILE_NOT_FOUND', `File not found: ${filePath}`);
        }
        if (error.message.includes('EACCES')) {
          return this.createErrorResult('PERMISSION_DENIED', `Permission denied: ${filePath}`);
        }
        return this.createErrorResult('FILE_READ_ERROR', `Failed to read file: ${error.message}`);
      }
      return this.createErrorResult('UNKNOWN_ERROR', 'An unknown error occurred while reading the file');
    }
  }

  /**
   * Parse README content directly
   */
  async parseContent(content: string): Promise<ParseResult> {
    try {
      // Validate content
      if (typeof content !== 'string') {
        return this.createErrorResult('INVALID_CONTENT', 'Content must be a string');
      }

      if (content.trim().length === 0) {
        return this.createErrorResult('EMPTY_CONTENT', 'Content cannot be empty');
      }

      // Parse markdown to AST
      const ast = marked.lexer(content);
      
      // Run all analyzers
      const analyzers = this.analyzerRegistry.getAll();
      if (analyzers.length === 0) {
        return this.createErrorResult('NO_ANALYZERS', 'No analyzers registered');
      }

      // Execute analyzers in parallel
      const analysisPromises = analyzers.map(analyzer => 
        this.runAnalyzer(analyzer, ast, content)
      );

      const analysisResults = await Promise.allSettled(analysisPromises);
      
      // Aggregate results
      const projectInfo = this.aggregateResults(analysisResults);
      const errors = this.collectErrors(analysisResults);
      const warnings = this.collectWarnings(analysisResults);

      const result: ParseResult = {
        success: true,
        data: projectInfo
      };
      
      if (errors.length > 0) result.errors = errors;
      if (warnings.length > 0) result.warnings = warnings;
      
      return result;

    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResult('PARSE_ERROR', `Failed to parse content: ${error.message}`);
      }
      return this.createErrorResult('UNKNOWN_ERROR', 'An unknown error occurred during parsing');
    }
  }  /**
   * Run a single analyzer with error handling
   */
  private async runAnalyzer(
    analyzer: ContentAnalyzer, 
    ast: Token[], 
    content: string
  ): Promise<any> {
    try {
      return await analyzer.analyze(ast, content);
    } catch (error) {
      // Return error result that can be handled in aggregation
      return {
        analyzerName: analyzer.name,
        error: error instanceof Error ? error.message : 'Unknown analyzer error'
      };
    }
  }

  /**
   * Aggregate results from all analyzers into ProjectInfo
   */
  private aggregateResults(results: PromiseSettledResult<any>[]): ProjectInfo {
    // Initialize empty project info
    const projectInfo: ProjectInfo = {
      metadata: {},
      languages: [],
      dependencies: {
        packageFiles: [],
        installCommands: [],
        packages: []
      },
      commands: {
        build: [],
        test: [],
        run: [],
        install: [],
        other: []
      },
      testing: {
        frameworks: [],
        tools: [],
        configFiles: [],
        confidence: 0
      },
      confidence: {
        overall: 0,
        languages: 0,
        dependencies: 0,
        commands: 0,
        testing: 0,
        metadata: 0
      }
    };

    // TODO: Implement actual result aggregation logic
    // This will be implemented in later tasks when analyzers are created
    
    return projectInfo;
  }

  /**
   * Collect errors from analyzer results
   */
  private collectErrors(results: PromiseSettledResult<any>[]): ParseError[] {
    const errors: ParseError[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        errors.push({
          code: 'ANALYZER_ERROR',
          message: `Analyzer failed: ${result.reason}`,
          component: 'ReadmeParser',
          severity: 'error'
        });
      } else if (result.value?.error) {
        errors.push({
          code: 'ANALYZER_ERROR',
          message: result.value.error,
          component: result.value.analyzerName || 'Unknown',
          severity: 'error'
        });
      }
    });

    return errors;
  }

  /**
   * Collect warnings from analyzer results
   */
  private collectWarnings(results: PromiseSettledResult<any>[]): string[] {
    const warnings: string[] = [];
    
    // TODO: Implement warning collection from analyzer results
    // This will be expanded when analyzers provide warning information
    
    return warnings;
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