/**
 * Base analyzer class with common functionality
 */

import { MarkdownAST } from '../../shared/markdown-parser';
import { AnalyzerResult, ParseError } from '../types';
import { Analyzer } from './registry';
import { AnalysisContext, ContextAwareAnalyzer } from '../../shared/types/analysis-context';

/**
 * Abstract base class for all analyzers with context sharing support
 */
export abstract class BaseAnalyzer<T> extends ContextAwareAnalyzer implements Analyzer<T> {
  abstract readonly name: string;

  constructor(config?: Partial<import('../../shared/types/analysis-context').ContextSharingConfig>) {
    super(config);
  }

  /**
   * Main analysis method that subclasses must implement
   */
  abstract analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult<T>>;

  /**
   * Get the analyzer name for context tracking
   */
  protected getAnalyzerName(): string {
    return this.name;
  }

  /**
   * Create a successful result
   */
  protected createSuccessResult(data: T, confidence: number, sources: string[] = []): AnalyzerResult<T> {
    return {
      success: true,
      data,
      confidence,
      sources
    };
  }

  /**
   * Create an error result
   */
  protected createErrorResult(error: ParseError, confidence: number = 0): AnalyzerResult<T> {
    return {
      success: false,
      confidence,
      errors: [error]
    };
  }

  /**
   * Create a parse error
   */
  protected createError(
    code: string,
    message: string,
    severity: 'error' | 'warning' | 'info' = 'error',
    details?: any
  ): ParseError {
    return {
      code,
      message,
      component: this.name,
      severity,
      details
    };
  }

  /**
   * Safely extract text from content with error handling
   */
  protected safeExtract<R>(
    operation: () => R,
    fallback: R,
    errorCode: string = 'EXTRACTION_ERROR'
  ): R {
    try {
      return operation();
    } catch (error) {
      console.warn(`${this.name}: ${errorCode}:`, error);
      return fallback;
    }
  }

  /**
   * Calculate confidence based on multiple factors
   */
  protected calculateConfidence(factors: { weight: number; score: number }[]): number {
    if (factors.length === 0) return 0;

    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = factors.reduce((sum, factor) => sum + (factor.weight * factor.score), 0);
    return Math.min(1, Math.max(0, weightedSum / totalWeight));
  }

  /**
   * Normalize confidence score to 0-1 range
   */
  protected normalizeConfidence(score: number): number {
    return Math.min(1, Math.max(0, score));
  }
}