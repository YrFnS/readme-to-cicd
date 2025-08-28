/**
 * Analyzer registry and base interfaces
 */

import { MarkdownAST } from '../../shared/markdown-parser';
import { AnalyzerResult } from '../types';

/**
 * Base analyzer interface that all analyzers must implement
 */
export interface Analyzer<T = any> {
  readonly name: string;
  analyze(ast: MarkdownAST, content: string, context?: import('../../shared/types/analysis-context').AnalysisContext): Promise<AnalyzerResult<T>>;
}

/**
 * Registry for managing analyzers
 */
export class AnalyzerRegistry {
  private analyzers = new Map<string, Analyzer>();

  /**
   * Register an analyzer
   */
  register(analyzer: Analyzer): void {
    this.analyzers.set(analyzer.name, analyzer);
  }

  /**
   * Get an analyzer by name
   */
  get(name: string): Analyzer | undefined {
    return this.analyzers.get(name);
  }

  /**
   * Get all registered analyzers
   */
  getAll(): Analyzer[] {
    return Array.from(this.analyzers.values());
  }

  /**
   * Check if an analyzer is registered
   */
  has(name: string): boolean {
    return this.analyzers.has(name);
  }

  /**
   * Unregister an analyzer
   */
  unregister(name: string): boolean {
    return this.analyzers.delete(name);
  }

  /**
   * Clear all analyzers
   */
  clear(): void {
    this.analyzers.clear();
  }
}

/**
 * Default analyzer registry instance
 */
export const defaultRegistry = new AnalyzerRegistry();