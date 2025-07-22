/**
 * Base analyzer interface and utilities
 */

import { ContentAnalyzer, AnalysisResult, ParseError, MarkdownAST } from '../types';

/**
 * Abstract base class for content analyzers
 * Provides common functionality and enforces interface compliance
 */
export abstract class BaseAnalyzer implements ContentAnalyzer {
  abstract readonly name: string;

  /**
   * Analyze markdown content and return structured results
   */
  abstract analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult>;

  /**
   * Create a standardized error for this analyzer
   */
  protected createError(
    code: string, 
    message: string, 
    details?: any,
    line?: number
  ): ParseError {
    const error: ParseError = {
      code,
      message,
      component: this.name,
      severity: 'error'
    };
    
    if (details !== undefined) error.details = details;
    if (line !== undefined) error.line = line;
    
    return error;
  }

  /**
   * Create a standardized warning for this analyzer
   */
  protected createWarning(
    code: string, 
    message: string, 
    details?: any,
    line?: number
  ): ParseError {
    const warning: ParseError = {
      code,
      message,
      component: this.name,
      severity: 'warning'
    };
    
    if (details !== undefined) warning.details = details;
    if (line !== undefined) warning.line = line;
    
    return warning;
  }

  /**
   * Create a successful analysis result
   */
  protected createResult(
    data: any, 
    confidence: number, 
    sources: string[] = [],
    errors: ParseError[] = []
  ): AnalysisResult {
    return {
      data,
      confidence: Math.max(0, Math.min(1, confidence)), // Clamp between 0-1
      sources,
      errors
    };
  }
}